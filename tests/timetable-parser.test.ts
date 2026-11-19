import { expect, test } from "@playwright/test";
import { createCipheriv, createHash, createHmac } from "node:crypto";
import { parseTimetableWeek } from "../src/lib/classroom/timetable";
import { decryptPayload, deobfuscate, extractPayload, readFieldCipher, readSchoolCodeDivisor, readTimetableFields } from "../src/lib/server/timetable-protocol";
import { timetableWeek } from "../scripts/timetable-fixture.mjs";

test.describe("시간표 파서 (v1 및 v2 프로토콜 규격)", () => {
  test("v1 형식: 11개 반 정보 교시 추출 · 변경 및 열람제한 · 잘못된 구조 거부", () => {
    const source = timetableWeek("2026-10-12", true);
    const parsed = parseTimetableWeek(source);
    expect(parsed.end).toBe("2026-10-17");
    expect(parsed.items).toHaveLength(11);
    expect(parsed.items.find((item) => item.classId === "2-1")).toMatchObject({
      date: "2026-10-14",
      period: 2,
      startsAt: "09:55",
      changed: true,
    });
    expect(new Set(parsed.items.map((item) => item.id)).size).toBe(11);
    expect(JSON.stringify(parsed)).not.toContain("fixture-teacher");

    source.열람제한일 = "2026-10-13";
    expect(parseTimetableWeek(source).items).toHaveLength(10);
    expect(() => parseTimetableWeek({ ...source, 자료147: [] })).toThrow();
    expect(() => parseTimetableWeek({ ...source, 시작일: "2026-02-30" })).toThrow();
    expect(() => parseTimetableWeek({ ...source, 학급수: [31, 9, 10, 11] })).toThrow();
    expect(() => parseTimetableWeek({ ...source, 열람제한일: "1899-12-30", 일과시간: ["1(25:60)", "2(09:55)"] })).toThrow();

    const missing = timetableWeek("2026-10-12");
    missing.자료492[25] = "수학";
    expect(() => parseTimetableWeek(missing)).toThrow();

    const empty = timetableWeek("2026-10-12");
    const grid = empty.자료147[2] as unknown as number[][][];
    for (let classroom = 1; classroom <= 11; classroom++) grid[classroom][1][1] = 0;
    expect(parseTimetableWeek(empty).items).toEqual([]);

    const legacy: Record<string, unknown> = timetableWeek("2026-10-12");
    legacy.변경알림 = 0;
    legacy.자료481 = structuredClone(legacy.자료147);
    (legacy.자료147 as (string | number)[][][][])[2][1][1][1] = "25001";
    expect(parseTimetableWeek(legacy).items[0].changed).toBe(false);
    (legacy.자료481 as (string | number)[][][][])[2][1][1][1] = 0;
    expect(parseTimetableWeek(legacy).items[0].changed).toBe(true);
  });

  test("v2 형식: 화면 코드가 알려 준 항목 이름으로 과목·변경 감지", () => {
    const fields = { subjects: "자료185", current: "자료169", original: "자료186" };
    const buildGrade = (withChanged: boolean) => {
      const grade: unknown[] = [0];
      for (let c = 1; c <= 11; c++) {
        const days: (number | string)[][] = [[]];
        for (let d = 1; d <= 6; d++) days.push([8, ...Array(8).fill(0)]);
        if (withChanged && c === 1) {
          days[3][2] = ">25059";
        } else {
          days[1][1] = 25059;
        }
        grade.push(days);
      }
      return grade;
    };

    const v2Source = {
      시작일: "2026-10-12",
      자료150: "2026-10-12 13:00:00",
      학년도: 2026,
      학급수: [31, 9, 11, 11],
      가상학급수: [0, 0, 0, 0],
      자료185: (() => {
        const s = Array(26).fill("");
        s[0] = 0;
        s[25] = "정보";
        return s;
      })(),
      자료169: [0, [], buildGrade(true), []],
      자료186: [0, [], buildGrade(false), []],
      일과시간: ["1(09:00)", "2(09:55)", "3(10:50)", "4(11:45)", "5(13:30)", "6(14:25)", "7(15:20)", "8(16:15)"],
      열람제한일: "1899-12-30",
      변경알림: 1,
      분리: 1000,
      일자자료: [[1, "26-10-12 ~ 26-10-17"], [2, "26-10-19 ~ 26-10-24"]] as [number, string][],
    };

    const parsed = parseTimetableWeek(v2Source, fields);
    expect(parsed.end).toBe("2026-10-17");
    expect(parsed.updatedAt).toBe("2026-10-12 13:00:00");
    expect(parsed.items).toHaveLength(11);
    expect(parsed.items.find((item) => item.classId === "2-1")).toMatchObject({
      date: "2026-10-14",
      period: 2,
      startsAt: "09:55",
      changed: true,
    });
    expect(parsed.items.find((item) => item.classId === "2-2")).toMatchObject({
      date: "2026-10-12",
      period: 1,
      startsAt: "09:00",
      changed: false,
    });

    // 구조적 거부 검증
    expect(() => parseTimetableWeek(v2Source)).toThrow();
    expect(() => parseTimetableWeek({ ...v2Source, 자료169: [] }, fields)).toThrow();
    expect(() => parseTimetableWeek({ ...v2Source, 자료150: undefined }, fields)).toThrow();
    expect(() => parseTimetableWeek({ ...v2Source, 변경알림: 0, 자료186: undefined }, fields)).toThrow();

    const missing = structuredClone(v2Source);
    (missing.자료185 as (string | number)[])[25] = "수학";
    expect(() => parseTimetableWeek(missing, fields)).toThrow();
  });

  test("v2 화면 코드: 난독화 해제와 항목 이름 읽기", () => {
    const key = 83;
    const hidden = "원자료=Q자료(자료.자료186[학년][반][요일][교시]);일일자료=Q자료(자료.자료169[학년]);";
    const encoded = [...hidden].map((char, i) => (char.charCodeAt(0) ^ ((key + i * 13) & 255)).toString(16).padStart(4, "0")).join("");
    const source = `/* hour-obfuscated-v2 */(function(a,k){})([[0,"${encoded}"],[1,"과목명=Q과목명(자료.자료185[sb]);"]],${key});`;
    const payload = extractPayload(source, "/* hour-obfuscated-v2 */");
    expect(payload?.key).toBe(key);
    const client = deobfuscate(payload!.array, payload!.key);
    expect(client).toBe(`${hidden}과목명=Q과목명(자료.자료185[sb]);`);
    expect(readTimetableFields(client)).toEqual({ subjects: "자료185", original: "자료186", current: "자료169" });
    expect(readTimetableFields("원자료=0;")).toBeNull();
    expect(extractPayload("표시 없음", "/* hour-obfuscated-v2 */")).toBeNull();
  });

  test("값마다 한 겹 더 숨긴 형식: 화면 코드의 키로 시작일·과목·주 목록·갱신 시각을 연다", () => {
    const key = [43, 53, 90, 113];
    const hide = (bytes: Buffer) => Buffer.from(bytes.map((byte, i) => byte ^ key[i % key.length])).toString("base64");
    const ascii = (text: string) => hide(Buffer.from(text, "latin1"));
    const ajax = `function QnmsbChange(암호문) { var 키=String.fromCharCode(${key.join(",")}); return 암호문; }`;
    const client = "var 시작일=new Date(QnmsbChange(자료.자료185));p+=\"<td class='교시'>\"+자료.자료199[교시-1];"
      + "일자설정하기(H시간표.자료180,r2);원자료=Q자료(자료.자료103[학년]);일일자료=Q자료(자료.자료189[학년]);과목명=Q과목명(자료.자료190[sb]);"
      + "var r=Math.floor(학교명단[i][0]/6347)+2;";
    const decode = readFieldCipher(ajax)!;
    const fields = readTimetableFields(client)!;
    expect(fields).toEqual({ subjects: "자료190", original: "자료103", current: "자료189", start: "자료185", times: "자료199", weeks: "자료180" });
    expect(readSchoolCodeDivisor(client)).toBe(6347);
    expect(readFieldCipher("function HChange(data) {}")).toBeNull();
    expect(readSchoolCodeDivisor("var r=2;")).toBeNull();
    expect(decode(ascii("74022"))).toBe("74022");
    expect(() => decode("평문")).toThrow();

    const grade: unknown[] = [0];
    for (let c = 1; c <= 11; c++) grade.push([[], [8, 25059, ...Array(7).fill(0)], ...Array(5).fill([8, ...Array(8).fill(0)])]);
    const subjects: (string | number)[] = [0, ...Array(24).fill(""), hide(Buffer.from([0xc1, 0xa4, 0xba, 0xb8]))]; // "정보" in EUC-KR
    const source = {
      자료185: ascii("2026-11-09"), 자료135: ascii("2026-11-13 16:17:02"), 학년도: 2026, 학급수: [31, 9, 11, 11], 가상학급수: [0, 0, 0, 0],
      자료190: subjects, 자료189: [0, [], grade, []], 자료103: [0, [], grade, []], 자료105: [0, ascii("fixture-teacher")],
      자료199: ["1(09:00)", "2(09:55)"], 열람제한일: "1899-12-30", 변경알림: 1, 분리: 1000,
      자료180: [[1, ascii("26-11-09 ~ 26-11-14")], [2, ascii("26-11-16 ~ 26-11-21")]],
    };
    const parsed = parseTimetableWeek(source, fields, decode);
    expect(parsed).toMatchObject({ start: "2026-11-09", end: "2026-11-14", updatedAt: "2026-11-13 16:17:02" });
    expect(parsed.weeks).toEqual([[1, "26-11-09 ~ 26-11-14"], [2, "26-11-16 ~ 26-11-21"]]);
    expect(parsed.items).toHaveLength(11);
    expect(parsed.items[0]).toMatchObject({ classId: "2-1", date: "2026-11-09", period: 1, startsAt: "09:00", changed: false });
    expect(JSON.stringify(parsed)).not.toContain("fixture-teacher");
    // Without the key the hidden values are not dates or subjects, so nothing is guessed.
    expect(() => parseTimetableWeek(source, fields)).toThrow();
    expect(() => parseTimetableWeek({ ...source, 자료185: "2026-11-09" }, fields, decode)).toThrow();
  });

  test("v2 응답: 복호화·변조 거부", () => {
    const aesKey = Buffer.alloc(32, 7);
    const iv = Buffer.alloc(16, 9);
    const cipher = createCipheriv("aes-256-cbc", aesKey, iv);
    const body = Buffer.concat([cipher.update('{"학교검색":[]}', "utf8"), cipher.final()]).toString("base64");
    const head = `enc5:${iv.toString("base64")}:${body}`;
    const tag = createHmac("sha256", createHash("sha256").update(aesKey).digest()).update(head).digest("base64");
    expect(decryptPayload(`${head}:${tag}\0\0`, aesKey)).toBe('{"학교검색":[]}');
    expect(() => decryptPayload(`${head}:${tag}x`, aesKey)).toThrow("TIMETABLE_AUTH");
    expect(() => decryptPayload(`${head}:${tag}`)).toThrow("TIMETABLE_CRYPTO");
    expect(decryptPayload('{"평문":1}\0')).toBe('{"평문":1}');
  });
});
