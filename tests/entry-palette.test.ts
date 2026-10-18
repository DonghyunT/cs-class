import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { LEGACY_INPUTS } from "./entry-legacy-inputs";
import legacyKeys from "./fixtures/entry-legacy-keys.json";
import { sameWorkContent } from "../src/components/student/work-draft";
import { readEntryDraft } from "../src/components/student/read-editor-draft";
import { ENTRY_PALETTE } from "../src/lib/classroom/entry-palette";
import { buildProgrammingProject, entryBlockCategory, entryObjectModel, formatEntryNode, missionBlockIssue, newAddedObject, parseProgrammingProject, programmingProjectLines, programmingProjectMatches, type AddedObject, type EntryNode } from "../src/lib/classroom/programming-entry";
import { checkProgrammingMission } from "../src/lib/server/programming-grader";
import { PROGRAMMING_LESSON } from "../src/lib/classroom/programming-lesson";
import { emptyWork } from "../src/lib/classroom/progress";
import type { WorkDraft } from "../src/lib/classroom/types";

const legacy: Record<string, { key: string | null; order: string[] | null; project: string | null; lines: string[]; checks: Record<string, { passed: boolean; message: string }> }> = legacyKeys;

test("기존 미션 블록만 쓴 작품은 키·순서·정규화·채점 결과가 바뀌지 않는다", () => {
  expect(Object.keys(LEGACY_INPUTS).sort()).toEqual(Object.keys(legacy).sort());
  for (const [id, raw] of Object.entries(LEGACY_INPUTS)) {
    const parsed = parseProgrammingProject(raw);
    const frozen = legacy[id];
    expect(parsed?.key ?? null, id).toBe(frozen.key);
    expect(parsed?.order ?? null, id).toEqual(frozen.order);
    expect(parsed ? JSON.stringify(parsed.project) : null, id).toBe(frozen.project);
    expect(programmingProjectLines(raw), id).toEqual(frozen.lines);
    // A line built for another mission now names the block it cannot grade.
    for (const [mission, result] of Object.entries(frozen.checks)) {
      const checked = checkProgrammingMission(mission, raw);
      if (missionBlockIssue(mission, raw)) expect(checked.passed, `${id} → ${mission}`).toBe(false);
      else expect(checked, `${id} → ${mission}`).toEqual(result);
    }
  }
});

const node = (type: string, ...params: unknown[]): EntryNode => ({ type, params });
const number = (v: string) => node("number", v);
const answer = () => node("get_canvas_input_value", null);
const start = () => node("when_run_button_click", null);
const ask = () => node("ask_and_wait", node("text", "숫자는?"), null);
const multiply = (extra: EntryNode[] = []) => [start(), ask(), node("set_variable", "cs-A", answer(), null), ask(), node("set_variable", "cs-B", answer(), null), ...extra, node("dialog_time", node("calc_basic", node("get_variable", "cs-A"), "MULTI", node("get_variable", "cs-B")), number("0.2"), "speak", null)];
const project = (threads: EntryNode[][]) => buildProgrammingProject(threads);
const repeat = (count: string, inner: EntryNode[]): EntryNode => ({ ...node("repeat_basic", number(count), null), statements: [inner] });

// EntryJS 4.0.23 export shape: metadata on every block, `statements: []` on plain
// blocks, `[[...]]` on repeat/if and `[[...], [...]]` on if-else.
const meta = { movable: null, deletable: 1, emphasized: false, readOnly: null, copyable: true, assemble: true, extensions: [] };
function native(n: EntryNode, id: string): Record<string, unknown> {
  return { id, x: 0, y: 0, ...meta, type: n.type,
    params: n.params.map((p, i) => p && typeof p === "object" && "type" in p ? native(p as EntryNode, `${id}p${i}`) : p),
    statements: (n.statements ?? []).map((t, i) => t.map((b, j) => native(b, `${id}s${i}${j}`))) };
}
function exported(threads: EntryNode[][]) {
  const p = JSON.parse(buildProgrammingProject());
  p.objects[0].script = JSON.stringify(threads.map((t, i) => t.map((b, j) => ({ ...native(b, `t${i}b${j}`), ...(j ? {} : { x: 40, y: 50 + i * 90 }) }))));
  return JSON.stringify(p);
}
const rich = [
  [start(), repeat("2", [node("move_direction", number("5"), null), { ...node("if_else", node("True", null), null, null), statements: [[node("set_color", node("color", "#FF0000"), null)], []] }]), node("wait_until_true", node("boolean_basic_operator", node("text", "10"), "EQUAL", node("text", 10)), null), node("locate", null, null), node("change_variable", null, node("text", "10"), null)],
  [node("when_object_click", null), node("create_clone", "self", null)],
  [node("calc_rand", null, number("0"), null, number("10"), null)],
];

test("workspace.js의 팔레트 복사본은 공유 목록과 같다", () => {
  const source = readFileSync("public/entryjs/workspace.js", "utf8");
  const literal = source.match(/const PROGRAMMING_PALETTE = (\[[\s\S]*?\n\]);/)?.[1];
  expect(literal).toBeTruthy();
  expect(new Function(`return ${literal}`)()).toEqual(ENTRY_PALETTE.map((group) => ({ category: group.category, blocks: [...group.blocks] })));
});

test("팔레트 블록·반복 안쪽·값 블록·미완성 드롭다운을 저장하고 다시 읽어도 같다", () => {
  const raw = exported(rich);
  const parsed = parseProgrammingProject(raw);
  expect(parsed).toBeTruthy();
  const saved = JSON.stringify(parsed!.project);
  const again = parseProgrammingProject(saved);
  expect(again?.key).toBe(parsed!.key);
  expect(JSON.stringify(again!.project)).toBe(saved);
  const loop = parsed!.threads[0][1];
  expect(loop.statements?.[0].map((b) => b.type)).toEqual(["move_direction", "if_else"]);
  expect(loop.statements?.[0][1].statements?.map((t) => t.map((b) => b.type))).toEqual([["set_color"], []]);
  expect(parsed!.threads[0][3].statements).toBeUndefined();
  expect(parsed!.threads[0][4].params[0]).toBeNull();
  expect(parsed!.order).toEqual(["when_run_button_click", "repeat_basic", "move_direction", "if_else", "set_color", "wait_until_true", "locate", "change_variable", "when_object_click", "create_clone", "calc_rand"]);
  expect(saved.length).toBeLessThan(raw.length);
});

test("팔레트 밖 블록·안쪽 목록 수·상한을 어기면 읽지 않는다", () => {
  const withBlock = (block: EntryNode) => exported([[start(), block]]);
  expect(parseProgrammingProject(withBlock(node("sound_something_with_block", null, null)))).toBeNull();
  expect(parseProgrammingProject(withBlock(node("message_cast", null, null)))).toBeNull();
  expect(parseProgrammingProject(withBlock({ ...node("if_else", node("True", null), null, null), statements: [[]] }))).toBeNull();
  expect(parseProgrammingProject(withBlock(node("move_x", true, null)))).toBeNull();
  let deep: EntryNode = node("move_x", number("1"), null);
  for (let i = 0; i < 9; i++) deep = repeat("1", [deep]);
  expect(parseProgrammingProject(withBlock(deep))).toBeNull();
  const line = () => Array.from({ length: 40 }, () => node("move_x", number("1"), null));
  expect(parseProgrammingProject(exported([[start(), ...line().slice(1)], line(), line(), line()]))).toBeNull();
  const big = JSON.parse(project([[start()]])); big.padding = "x".repeat(250_001);
  expect(parseProgrammingProject(JSON.stringify(big))).toBeNull();
});

test("채점 줄의 미션 밖 블록은 이름으로 안내하고 떨어진 블록·다른 이벤트는 무시한다", () => {
  expect(checkProgrammingMission("multiply", project([multiply()])).passed).toBe(true);
  const bFirst = multiply(); [bFirst[2].params[0], bFirst[4].params[0]] = ["cs-B", "cs-A"];
  expect(checkProgrammingMission("multiply", project([bFirst])).passed).toBe(true);
  const sameTwice = multiply(); sameTwice[2].params[0] = "cs-B";
  expect(checkProgrammingMission("multiply", project([sameTwice])).passed).toBe(false);
  const loose = project([multiply(), [node("wait_second", number("2"), null)], [node("when_object_click", null), node("move_x", number("10"), null)], [node("calc_rand", null, number("0"), null, number("10"), null)]]);
  expect(checkProgrammingMission("multiply", loose).passed).toBe(true);
  expect(checkProgrammingMission("multiply", project([multiply([node("wait_second", number("2"), null)])]))).toEqual({ passed: false, message: "이번 미션은 기본 블록으로 확인해요. ‘( )초 기다리기’ 블록을 빼고 다시 검증해 주세요." });
  expect(checkProgrammingMission("move", project([[start(), repeat("2", [node("move_direction", number("5"), null)])]])).message).toContain("‘( )번 반복하기’");
  expect(checkProgrammingMission("name", project([[start(), node("dialog_time", node("calc_rand", null, number("0"), null, number("10"), null), number("1"), "speak", null)]])).message).toContain("‘( )부터 ( ) 사이의 무작위 수’");
  const otherKey = project([[start(), node("direction_absolute", node("angle", "90"), null), node("move_direction", number("10"), null)], [node("when_some_key_pressed", null, "81"), node("wait_second", number("1"), null)]]);
  expect(missionBlockIssue("keys", otherKey)).toBeNull();
  const arrows = [["38", "0"], ["39", "90"], ["40", "180"], ["37", "270"]].map(([key, angle]) => [node("when_some_key_pressed", null, key), node("direction_absolute", node("angle", angle), null), node("move_direction", number("10"), null)]);
  expect(checkProgrammingMission("keys", project(arrows)).passed).toBe(true);
  expect(checkProgrammingMission("keys", project(arrows.slice(1))).passed).toBe(false);
});

test("반복 안쪽만 바꿔도 저장 비교와 미저장 판정이 바뀜을 알아챈다", () => {
  const before = project([[start(), repeat("2", [node("move_direction", number("5"), null)])]]);
  const after = project([[start(), repeat("2", [node("move_direction", number("6"), null)])]]);
  expect(programmingProjectMatches(before, after)).toBe(false);
  const draft = (raw: string): WorkDraft => ({ ...emptyWork(PROGRAMMING_LESSON).draft, programming: { mission: "move", projects: { move: raw }, reflection: "" } });
  expect(sameWorkContent(draft(before), draft(after))).toBe(false);
  expect(sameWorkContent(draft(before), draft(before))).toBe(true);
});

test("교사 작품 보기는 팔레트 블록 입력값과 반복 안쪽을 들여 보여 준다", () => {
  expect(programmingProjectLines(exported(rich))).toEqual([
    "시작하기 버튼을 클릭했을 때",
    "2번 반복하기",
    "└ 이동 방향으로 5만큼 움직이기",
    "└ 만일 참(이)라면 / 아니면",
    "  └ 그리기 색을 #FF0000(으)로 정하기",
    "  아니면",
    "(10 = 10)이(가) 될 때까지 기다리기",
    "( ) 위치로 이동하기",
    "변수에 10만큼 더하기",
    "오브젝트를 클릭했을 때",
    "복제본 만들기",
    "0부터 10 사이의 무작위 수 · 아직 연결하지 않은 블록",
  ]);
  expect(formatEntryNode(node("locate", "mouse", null))).toBe("마우스 포인터 위치로 이동하기");
  expect(formatEntryNode(node("add_effect_amount", "color", number("10"), null))).toBe("색깔 효과를 10만큼 주기");
  expect(formatEntryNode(node("move_xy_time", number("2"), number("10"), number("-20"), null))).toBe("2초 동안 x: 10 y: -20만큼 움직이기");
  expect(formatEntryNode(node("locate_xy", number("50"), number("80"), null))).toBe("x: 50 y: 80 위치로 이동하기");
  expect(formatEntryNode(node("dialog", node("text", "반가워"), "think", null))).toBe("반가워을(를) 생각하기");
  expect(formatEntryNode(node("change_variable", "cs-A", number("5"), null))).toBe("변수 A에 5만큼 더하기");
  expect(formatEntryNode(node("quotient_and_mod", null, number("10"), null, number("3"), null, "MOD"))).toBe("10 / 3의 나머지 · 아직 연결하지 않은 블록");
  expect(formatEntryNode(node("calc_operation", null, number("9"), null, "root"))).toBe("9의 제곱근 · 아직 연결하지 않은 블록");
  expect(formatEntryNode(node("boolean_basic_operator", number("3"), "LESS", number("5")))).toBe("(3 < 5) · 아직 연결하지 않은 블록");
  expect(formatEntryNode(node("boolean_basic_operator", number("3"), "LESS_OR_EQUAL", number("5")))).toBe("(3 ≤ 5) · 아직 연결하지 않은 블록");
  expect(formatEntryNode(node("change_object_index", "FORWARD", null))).toBe("앞으로 보내기");
  expect(formatEntryNode(node("is_type", node("text", "가나다"), null, "ko"))).toBe("가나다이(가) 한글인가? · 아직 연결하지 않은 블록");
  expect(formatEntryNode(node("stop_object", "thisThread", null))).toBe("이 코드 멈추기");
  expect(entryBlockCategory("when_run_button_click")).toBe("start");
  expect(entryBlockCategory("repeat_basic")).toBe("flow");
  expect(entryBlockCategory("set_variable")).toBe("variable");
});

// Entry puts a newly added object first in its list, so the dog is not always objects[0].
const ball = (threads: EntryNode[][] = [], change: Partial<AddedObject> = {}): AddedObject => ({ ...newAddedObject("ball", 0)!, id: "obj-ball", threads, ...change });
const withObjects = (main: EntryNode[][], added: AddedObject[], mainIndex = added.length) => buildProgrammingProject(main, added, mainIndex);

test("추가한 오브젝트는 순서·이름·위치·코드를 저장하고 강아지는 id로 찾는다", () => {
  const raw = withObjects([multiply()], [ball([[start(), node("move_x", number("30"), null)]], { name: "축구공", entity: { ...ball().entity, x: 150 } })]);
  const parsed = parseProgrammingProject(raw)!;
  expect(parsed.mainIndex).toBe(1);
  expect(parsed.threads).toEqual(parseProgrammingProject(project([multiply()]))!.threads);
  expect(parsed.added.map((o) => [o.id, o.name, o.sprite, o.entity.x])).toEqual([["obj-ball", "축구공", "ball", 150]]);
  const objects = (parsed.project.objects as { id: string; sprite: { pictures: { fileurl: string }[] } }[]);
  expect(objects.map((o) => o.id)).toEqual(["obj-ball", "entrybot"]);
  expect(objects[0].sprite.pictures[0].fileurl).toBe("/entryjs/sprites/ball.svg");
  const again = parseProgrammingProject(JSON.stringify(parsed.project))!;
  expect(again.key).toBe(parsed.key);
  expect(parsed.key).not.toBe(parseProgrammingProject(project([multiply()]))!.key);
  expect(parsed.order).toContain("move_x");
  expect(programmingProjectMatches(raw, withObjects([multiply()], [ball([[start(), node("move_x", number("30"), null)]], { name: "축구공", entity: { ...ball().entity, x: 151 } })]))).toBe(false);
  const draft = (value: string): WorkDraft => ({ ...emptyWork(PROGRAMMING_LESSON).draft, programming: { mission: "multiply", projects: { multiply: value }, reflection: "" } });
  expect(sameWorkContent(draft(raw), draft(withObjects([multiply()], [ball([[start(), node("move_x", number("30"), null)]], { name: "축구공", entity: { ...ball().entity, x: 160 } })])))).toBe(false);
  expect(programmingProjectLines(raw).slice(-2)).toEqual(["[축구공] 시작하기 버튼을 클릭했을 때", "[축구공] x 좌표를 30만큼 바꾸기"]);
});

test("허용 밖 그림·중복 id·강아지 없음·오브젝트 수 초과는 읽지 않는다", () => {
  const base = JSON.parse(withObjects([[start()]], [ball()]));
  const variant = (change: (p: { objects: Record<string, unknown>[] }) => void) => { const p = structuredClone(base); change(p); return parseProgrammingProject(JSON.stringify(p)); };
  expect(variant(() => {})).not.toBeNull();
  expect(variant((p) => { (p.objects[0].sprite as { pictures: { fileurl: string }[] }).pictures[0].fileurl = "https://example.com/x.svg"; })).toBeNull();
  expect(variant((p) => { p.objects.unshift(structuredClone(p.objects[0])); })).toBeNull();
  expect(variant((p) => { p.objects[1].id = "dog"; })).toBeNull();
  expect(variant((p) => { p.objects.push(structuredClone(p.objects[1])); })).toBeNull();
  const many = Array.from({ length: 6 }, (_, i) => ball([], { id: `obj-${i}` }));
  expect(parseProgrammingProject(withObjects([[start()]], many))).toBeNull();
  expect(parseProgrammingProject(withObjects([[start()]], many.slice(1)))).not.toBeNull();
  const odd = variant((p) => { Object.assign(p.objects[0].entity as object, { x: 99999, scaleX: 50 }); p.objects[0].name = "  "; })!;
  expect([odd.added[0].entity.x, odd.added[0].entity.scaleX, odd.added[0].name]).toEqual([1000, 5, "공"]);
  expect(entryObjectModel(odd.added[0])).toMatchObject({ id: "obj-ball", selectedPictureId: "obj-ball-pic" });
});

test("채점은 강아지 코드만 보고 다른 오브젝트의 블록은 무시한다", () => {
  const raw = withObjects([multiply()], [ball([[start(), node("wait_second", number("1"), null), node("dialog_time", node("text", "99"), number("1"), "speak", null)]])]);
  expect(missionBlockIssue("multiply", raw)).toBeNull();
  expect(checkProgrammingMission("multiply", raw).passed).toBe(true);
});

test("원래 블록이 자기 조건에 맞지 않으면 일반 규칙으로 넘어가지 않고 거부한다", () => {
  const with_ = (block: EntryNode) => project([[start(), block]]);
  expect(parseProgrammingProject(with_(node("dialog_time", null, null, "x", null)))).toBeNull();
  expect(parseProgrammingProject(with_(node("set_variable", "cs-Z", node("text", "1"), null)))).toBeNull();
  expect(parseProgrammingProject(with_(node("dialog_time", node("calc_basic", node("number", "1"), null, node("number", "2")), node("number", "1"), "speak", null)))).toBeNull();
  expect(parseProgrammingProject(project([[node("get_variable", "cs-Z")]]))).toBeNull();
  expect(parseProgrammingProject(with_(node("move_x", ...Array.from({ length: 9 }, () => null))))).toBeNull();
});

test("정규화는 한 번에 수렴하고 뒤집힌 크기의 부호를 유지한다", () => {
  const twice = (raw: string) => { const once = parseProgrammingProject(raw)!; const again = parseProgrammingProject(JSON.stringify(once.project))!; return [once, again] as const; };
  const named = JSON.parse(withObjects([[start()]], [ball()]));
  named.objects[0].name = "가".repeat(19) + " 나";
  named.objects[0].entity.scaleX = -0.7;
  for (const raw of [exported(rich), JSON.stringify(named), withObjects([multiply()], [ball([[start(), repeat("2", [node("move_x", number("3"), null)])]])])]) {
    const [once, again] = twice(raw);
    expect(again.key).toBe(once.key);
    expect(JSON.stringify(again.project)).toBe(JSON.stringify(once.project));
  }
  const [once] = twice(JSON.stringify(named));
  expect([once.added[0].name, once.added[0].entity.scaleX]).toEqual(["가".repeat(19), -0.7]);
  expect(once.bytes).toBeGreaterThan(0);
});

test("이름 실행 기록용 채점 키는 다른 오브젝트를 옮겨도 그대로다", () => {
  const a = parseProgrammingProject(withObjects([multiply()], [ball()]))!;
  const b = parseProgrammingProject(withObjects([multiply()], [ball([], { entity: { ...ball().entity, x: 0 } })]))!;
  expect(a.key).not.toBe(b.key);
  expect(a.gradeKey).toBe(b.gradeKey);
  expect(a.gradeKey).toBe(parseProgrammingProject(project([multiply()]))!.key);
});

test("비슷한 블록과 다른 오브젝트에 만든 시작 줄을 구체적으로 안내한다", () => {
  expect(missionBlockIssue("name", project([[start(), node("ask_and_wait", node("text", "?"), null), node("dialog", node("text", "안녕"), "speak", null)]]))).toBe("이번 미션은 ‘( )을(를) 말하기’ 대신 ‘( )을(를) ( )초 동안 말하기’ 블록으로 확인해요. 바꿔서 다시 검증해 주세요.");
  expect(missionBlockIssue("move", project([[start(), node("move_x", number("10"), null)]]))).toContain("대신 ‘이동 방향으로 ( )만큼 움직이기’");
  const wrongObject = withObjects([[]], [ball([[start(), node("move_direction", number("10"), null)]], { name: "축구공" })]);
  expect(checkProgrammingMission("move", wrongObject).message).toBe("강아지가 아니라 ‘축구공’에 시작하기 줄이 있어요. 오브젝트 목록에서 강아지를 고른 뒤 코드를 만들어 주세요.");
});

test("저장할 때 다른 미션에 남은 엔트리 원문도 정규화해 서버 한도 안으로 보낸다", async () => {
  const bulky = exported([[start(), ...Array.from({ length: 30 }, () => node("move_x", number("1"), null))], ...Array.from({ length: 2 }, () => Array.from({ length: 30 }, () => node("move_y", number("1"), null)))]);
  expect(bulky.length).toBeGreaterThan(30_000);
  const current: WorkDraft = { ...emptyWork(PROGRAMMING_LESSON).draft, programming: { mission: "move", projects: { name: bulky, move: project([[start()]]) }, reflection: "" } };
  const saved = await readEntryDraft(PROGRAMMING_LESSON, current, async () => exported([[start(), node("move_direction", number("10"), null)]]));
  const name = saved.programming!.projects.name;
  expect(name).toBe(JSON.stringify(parseProgrammingProject(bulky)!.project));
  expect(name.length).toBeLessThan(bulky.length / 3);
  expect(parseProgrammingProject(name)!.key).toBe(parseProgrammingProject(bulky)!.key);
  expect(parseProgrammingProject(saved.programming!.projects.move)!.order).toEqual(["when_run_button_click", "move_direction"]);
});
