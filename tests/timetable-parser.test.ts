import { expect, test } from "@playwright/test";
import { parseTimetableWeek } from "../src/lib/classroom/timetable";
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

  test("v2 형식: 자료115·자료162·자료178·자료189 필드 매핑 및 분리 100 기준 과목·변경 감지", () => {
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
      자료115: "2026-10-12 13:00:00",
      학년도: 2026,
      학급수: [31, 9, 11, 11],
      가상학급수: [0, 0, 0, 0],
      자료162: (() => {
        const s = Array(26).fill("");
        s[0] = 0;
        s[25] = "정보";
        return s;
      })(),
      자료178: [0, [], buildGrade(true), []],
      자료189: [0, [], buildGrade(false), []],
      일과시간: ["1(09:00)", "2(09:55)", "3(10:50)", "4(11:45)", "5(13:30)", "6(14:25)", "7(15:20)", "8(16:15)"],
      열람제한일: "1899-12-30",
      변경알림: 1,
      분리: 100,
      일자자료: [[1, "26-10-12 ~ 26-10-17"], [2, "26-10-19 ~ 26-10-24"]] as [number, string][],
    };

    const parsed = parseTimetableWeek(v2Source);
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
    expect(() => parseTimetableWeek({ ...v2Source, 자료178: [] })).toThrow();
    expect(() => parseTimetableWeek({ ...v2Source, 자료115: undefined })).toThrow();

    const missing = structuredClone(v2Source);
    (missing.자료162 as (string | number)[])[25] = "수학";
    expect(() => parseTimetableWeek(missing)).toThrow();
  });
});
