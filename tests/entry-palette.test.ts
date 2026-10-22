import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { LEGACY_INPUTS } from "./entry-legacy-inputs";
import legacyKeys from "./fixtures/entry-legacy-keys.json";
import { sameWorkContent } from "../src/components/student/work-draft";
import { readEntryDraft } from "../src/components/student/read-editor-draft";
import { BLOCK_LABELS, ENTRY_PALETTE, MISSION_BLOCKS, blockLabel } from "../src/lib/classroom/entry-palette";
import { PROGRAMMING_MISSIONS, buildProgrammingProject, entryBlockCategory, entryObjectModel, formatEntryNode, missionBlockIssue, missionById, newAddedObject, parseProgrammingProject, programmingProjectLines, programmingProjectMatches, type AddedObject, type EntryNode } from "../src/lib/classroom/programming-entry";
import { checkProgrammingMission } from "../src/lib/server/programming-grader";
import { PROGRAMMING_LESSON } from "../src/lib/classroom/programming-lesson";
import { CONDITIONALS_LESSON } from "../src/lib/classroom/conditionals-lesson";
import { LOOPS_LESSON } from "../src/lib/classroom/loops-lesson";
import { emptyWork } from "../src/lib/classroom/progress";
import type { WorkDraft } from "../src/lib/classroom/types";

test("처음 여는 수업의 첫 미션 작품은 수업 유형에 맞는 시작 작품이다", () => {
  const first = (lesson: Parameters<typeof emptyWork>[0]) => { const { mission, projects } = emptyWork(lesson).draft.programming!; return parseProgrammingProject(projects[mission])!; };
  expect(first(PROGRAMMING_LESSON).free).toBe(false);
  for (const lesson of [CONDITIONALS_LESSON, LOOPS_LESSON]) expect(first(lesson).free, lesson.id).toBe(true);
});

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

test("힌트가 ‘ ’로 인용한 블록 이름은 그 미션의 검증 블록이고, 이름 미션 힌트는 ‘( )초 동안 말하기’를 말한다", () => {
  expect(missionById("name")!.hint).toContain(`‘${blockLabel("dialog_time")}’`);
  for (const mission of PROGRAMMING_MISSIONS) {
    for (const [, quoted] of mission.hint.matchAll(/‘([^’]+)’/g)) {
      const types = Object.keys(BLOCK_LABELS).filter((type) => BLOCK_LABELS[type] === quoted);
      if (types.length) expect(types.some((type) => MISSION_BLOCKS[mission.id]?.has(type)), `${mission.id}: ${quoted}`).toBe(true);
    }
  }
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

// Selection missions: `if_else` keeps its two inner lists, comparisons follow EntryJS (numeric strings compare as numbers).
const text = (v: string) => node("text", v);
const compare = (left: EntryNode, op: string, right: EntryNode) => node("boolean_basic_operator", left, op, right);
const ifElse = (condition: EntryNode, yes: EntryNode[], no: EntryNode[]): EntryNode => ({ ...node("if_else", condition, null, null), statements: [yes, no] });
const speak = (v: string) => node("dialog", text(v), "speak", null);
const passProgram = (op = "GREATER_OR_EQUAL", yes = "합격", no = "불합격") => [start(), ask(), ifElse(compare(answer(), op, number("60")), [speak(yes)], [speak(no)])];
const freeThrow = (first = "8") => [start(), ask(), ifElse(compare(answer(), "GREATER_OR_EQUAL", number(first)), [speak("훌륭해요!")], [ifElse(compare(answer(), "GREATER_OR_EQUAL", number("5")), [speak("잘했어요!")], [speak("더 연습해 보자!")])])];
const escapeProgram = (condition: EntryNode) => [start(), ask(), node("set_variable", "cs-A", answer(), null), ask(), node("set_variable", "cs-B", answer(), null), ifElse(condition, [speak("탈출 성공!")], [speak("탈출 실패")])];
const solved = (id: string) => compare(node("get_variable", id), "EQUAL", number("1"));

test("선택 구조 미션은 실제 내보내기 모양의 조건문을 실행해 정확한 말을 확인한다", () => {
  expect(checkProgrammingMission("pass", exported([passProgram()]))).toEqual({ passed: true, message: "목표 조건을 확인했어요. 작품을 제출하면 이 미션이 완료돼요." });
  // 60 is a pass; ‘불합격’ must not count as ‘합격’; constant answers fail.
  expect(checkProgrammingMission("pass", exported([passProgram("GREATER")])).passed).toBe(false);
  expect(checkProgrammingMission("pass", exported([passProgram("GREATER_OR_EQUAL", "불합격", "불합격")])).passed).toBe(false);
  expect(checkProgrammingMission("pass", exported([[start(), ask(), speak("합격")]])).passed).toBe(false);
  // Answers that only cover the shown inputs fail the unseen ones.
  const shownOnly = [start(), ask(), ...[["59", "불합격"], ["60", "합격"], ["100", "합격"], ["0", "불합격"]].map(([v, word]) => ({ ...node("_if", compare(answer(), "EQUAL", number(v)), null), statements: [[speak(word)]] }))];
  expect(checkProgrammingMission("pass", exported([shownOnly])).passed).toBe(false);
  expect(checkProgrammingMission("pass", exported([[start(), ask(), ifElse(compare(answer(), "GREATER_OR_EQUAL", number("60")), [node("dialog_time", text("합격!"), number("1"), "speak", null)], [speak("불합격")])]])).passed).toBe(true);
  expect(checkProgrammingMission("freethrow", exported([freeThrow()])).passed).toBe(true);
  expect(checkProgrammingMission("freethrow", exported([freeThrow("9")])).passed).toBe(false);
});

test("방탈출은 A·B에 저장한 값을 ‘또는’으로 판단해야 통과한다", () => {
  const or = node("boolean_and_or", solved("cs-A"), "OR", solved("cs-B"));
  expect(checkProgrammingMission("escape", exported([escapeProgram(or)])).passed).toBe(true);
  expect(checkProgrammingMission("escape", exported([escapeProgram(node("boolean_and_or", solved("cs-A"), "AND", solved("cs-B")))])).passed).toBe(false);
  // Nested conditions give the right words but skip the ‘또는’ the mission practices.
  const nested = [...escapeProgram(solved("cs-A")).slice(0, 5), ifElse(solved("cs-A"), [speak("탈출 성공!")], [ifElse(solved("cs-B"), [speak("탈출 성공!")], [speak("탈출 실패")])])];
  expect(checkProgrammingMission("escape", exported([nested])).passed).toBe(false);
  // A ‘또는’ that never looks at A·B does not count.
  expect(checkProgrammingMission("escape", exported([escapeProgram(node("boolean_and_or", node("False", null), "OR", node("boolean_and_or", solved("cs-A"), "AND", node("True", null))))])).passed).toBe(false);
});

test("몫·나머지는 엔트리처럼 버림 나눗셈으로 계산하고, 미션 규칙이 없는 ID는 통과시키지 않는다", () => {
  const mod = (a: string) => [start(), ask(), ifElse(compare(node("quotient_and_mod", null, answer(), null, number("2"), null, "MOD"), "EQUAL", number(a)), [speak("합격")], [speak("불합격")])];
  expect(checkProgrammingMission("pass", exported([mod("0")])).passed).toBe(false);
  expect(checkProgrammingMission("unknown", exported([passProgram()])).passed).toBe(false);
});

// Loop missions follow EntryJS movement (direction + rotation) and must draw inside a loop.
const loopOf = (count: EntryNode, inner: EntryNode[]): EntryNode => ({ ...node("repeat_basic", count, null), statements: [inner] });
const forward = (distance: EntryNode) => node("move_direction", distance, null);
const turn = (angle: EntryNode, type = "direction_relative") => node(type, angle, null);
const square = (type = "direction_relative") => [start(), node("start_drawing", null), loopOf(number("4"), [forward(number("100")), turn(node("angle", "90"), type), node("wait_second", number("1"), null)])];
const polygon = (angle: EntryNode = node("calc_basic", number("360"), "DIVIDE", answer())) => [start(), node("ask_and_wait", text("변의 수는?"), null), node("start_drawing", null), loopOf(answer(), [forward(number("60")), turn(angle)])];
const until = (condition: EntryNode, mode = "until"): EntryNode => ({ ...node("repeat_while_true", condition, mode, null), statements: [[node("ask_and_wait", text("비밀번호는?"), null)]] });
const forever = (inner: EntryNode[]): EntryNode => ({ ...node("repeat_inf", null, null), statements: [inner] });

test("정사각형·정다각형은 반복 안에서 그린 닫힌 정다각형인지 확인한다", () => {
  expect(checkProgrammingMission("square", exported([square()])).passed).toBe(true);
  // ‘방향을 회전하기’ also turns the moving direction in EntryJS.
  expect(checkProgrammingMission("square", exported([square("rotate_relative")])).passed).toBe(true);
  // Four separate moves draw the square without the loop the mission practices.
  const unrolled = [start(), node("start_drawing", null), ...Array.from({ length: 4 }, () => [forward(number("100")), turn(node("angle", "90"))]).flat()];
  expect(checkProgrammingMission("square", exported([unrolled])).passed).toBe(false);
  expect(checkProgrammingMission("square", exported([[start(), loopOf(number("4"), [forward(number("100")), turn(node("angle", "90"))])]])).passed).toBe(false);
  expect(checkProgrammingMission("square", exported([[start(), node("start_drawing", null), loopOf(number("4"), [forward(number("80")), turn(node("angle", "90"))])]])).passed).toBe(false);
  expect(checkProgrammingMission("polygon", exported([polygon()])).passed).toBe(true);
  expect(checkProgrammingMission("polygon", exported([polygon(node("angle", "72"))])).passed).toBe(false);
});

test("비밀번호 금고는 맞힐 때까지 반복해 묻고, 반복은 예산 안에서만 돈다", () => {
  const opened = speak("금고가 열렸어요!");
  expect(checkProgrammingMission("safe", exported([[start(), until(compare(answer(), "EQUAL", number("1234"))), opened]])).passed).toBe(true);
  // ‘인 동안’ with ≠ means the same; stopping a forever loop also works.
  expect(checkProgrammingMission("safe", exported([[start(), until(compare(answer(), "NOT_EQUAL", number("1234")), "while"), opened]])).passed).toBe(true);
  expect(checkProgrammingMission("safe", exported([[start(), forever([node("ask_and_wait", text("?"), null), { ...node("_if", compare(answer(), "EQUAL", number("1234")), null), statements: [[opened, node("stop_repeat", null)]] }])]])).passed).toBe(true);
  // Asking a fixed number of times fails when the number of tries changes.
  expect(checkProgrammingMission("safe", exported([[start(), node("ask_and_wait", text("?"), null), node("ask_and_wait", text("?"), null), opened]])).passed).toBe(false);
  expect(checkProgrammingMission("safe", exported([[start(), forever([opened])]]))).toEqual({ passed: false, message: "말하기가 너무 많아요." });
  expect(checkProgrammingMission("safe", exported([[start(), forever([])]]))).toEqual({ passed: false, message: "실행이 너무 길어요. 반복이나 조건을 다시 확인해 주세요." });
  const nested = loopOf(number("1000"), [loopOf(number("1000"), [loopOf(number("1000"), [forward(number("1"))])])]);
  const began = Date.now();
  expect(checkProgrammingMission("square", exported([[start(), nested]])).passed).toBe(false);
  expect(Date.now() - began).toBeLessThan(1000);
  expect(checkProgrammingMission("square", exported([[start(), loopOf(number("1001"), [forward(number("1"))])]])).message).toBe("반복 횟수는 1000번까지만 확인해요.");
});

// Objects added before shapes existed keep their saved keys and normalized projects.
import legacyObjects from "./fixtures/entry-legacy-objects.json";
import { LEGACY_OBJECT_INPUTS } from "./entry-legacy-objects";
import { missionStarter } from "../src/lib/classroom/programming-entry";

test("모양 기능 전에 오브젝트를 추가한 작품은 키·정규화·교사 문장이 그대로다", () => {
  const frozen: Record<string, { key: string; project: string; lines: string[] }> = legacyObjects;
  expect(Object.keys(LEGACY_OBJECT_INPUTS).sort()).toEqual(Object.keys(frozen).sort());
  for (const [id, raw] of Object.entries(LEGACY_OBJECT_INPUTS)) {
    const parsed = parseProgrammingProject(raw)!;
    expect(parsed.key, id).toBe(frozen[id].key);
    expect(JSON.stringify(parsed.project), id).toBe(frozen[id].project);
    expect(programmingProjectLines(raw), id).toEqual(frozen[id].lines);
  }
});

// Tree mission: the starter's tree grows one shape per five clicks, like the official material.
const grow = (count: string) => ({ ...node("_if", compare(node("get_variable", "cs-clicks"), "EQUAL", number(count)), null), statements: [[node("change_to_next_shape", "next", null), ...(count === "25" ? [speak("성공~!")] : [])]] });
const treeCode = (body: EntryNode[], event = "mouse_clicked") => [[node(event, null), node("change_variable", "cs-clicks", text("1"), null), ...body]];
const withTree = (threads: EntryNode[][], canThreads: EntryNode[][] = []) => {
  const p = parseProgrammingProject(missionStarter("tree"))!;
  return buildProgrammingProject(undefined, p.added.map((o) => o.id === "tree" ? { ...o, threads } : o.id === "can" ? { ...o, threads: canThreads } : o), p.mainIndex, true);
};

test("나무 키우기 시작 작품은 모양 6개·물뿌리개·클릭 수 변수를 갖고 다시 읽어도 같다", () => {
  const p = parseProgrammingProject(missionStarter("tree"))!;
  expect(p.added.map((o) => [o.id, o.sprite])).toEqual([["can", "watering-can"], ["tree", "tree-growth"], ["soil", "soil"]]);
  const tree = (p.project.objects as { id: string; sprite: { pictures: { id: string; fileurl: string }[] } }[]).find((o) => o.id === "tree")!;
  expect(tree.sprite.pictures.map((pic) => pic.id)).toEqual(["tree-pic", "tree-pic2", "tree-pic3", "tree-pic4", "tree-pic5", "tree-pic6"]);
  expect((p.project.variables as { id: string }[]).map((v) => v.id)).toContain("cs-clicks");
  expect(parseProgrammingProject(JSON.stringify(p.project))!.key).toBe(p.key);
  // A picture from another sprite or outside the list is refused; the shown shape is kept.
  const forged = structuredClone(p.project) as { objects: { id: string; selectedPictureId: string; sprite: { pictures: { fileurl: string }[] } }[] };
  forged.objects.find((o) => o.id === "tree")!.sprite.pictures[1].fileurl = "/entryjs/sprites/watering-can-1.png";
  expect(parseProgrammingProject(JSON.stringify(forged))).toBeNull();
  const shown = structuredClone(p.project) as typeof forged;
  shown.objects.find((o) => o.id === "tree")!.selectedPictureId = "tree-pic3";
  expect(parseProgrammingProject(JSON.stringify(shown))!.added.find((o) => o.id === "tree")!.picture).toBe(2);
  expect(programmingProjectLines(withTree(treeCode([grow("5")])))).toContain("[나무] └ 다음 모양으로 바꾸기");
});

test("나무 키우기는 클릭할 때만 한 단계씩 자라고 다 자라면 말해야 통과한다", () => {
  const correct = treeCode(["5", "10", "15", "20", "25"].map(grow));
  expect(checkProgrammingMission("tree", withTree(correct))).toEqual({ passed: true, message: "목표 조건을 확인했어요. 작품을 제출하면 이 미션이 완료돼요." });
  // Clicking the tree itself also counts; the watering can may follow the mouse in a forever loop.
  const follow = [[start(), { ...node("repeat_inf", null, null), statements: [[node("locate", "mouse", null), { ...node("if_else", node("is_clicked", null), null, null), statements: [[node("change_to_some_shape", node("get_pictures", "can-pic"), null)], [node("change_to_some_shape", node("get_pictures", "can-pic2"), null)]] }]] }]];
  expect(checkProgrammingMission("tree", withTree(treeCode(["5", "10", "15", "20", "25"].map(grow), "when_object_click"), follow)).passed).toBe(true);
  // A forever loop that picks the shape from the count is fine too.
  const watch = [[start(), { ...node("repeat_inf", null, null), statements: [[...[["25", "tree-pic6"], ["20", "tree-pic5"], ["15", "tree-pic4"], ["10", "tree-pic3"], ["5", "tree-pic2"]].reduceRight<EntryNode[]>((rest, [count, pic]) => [{ ...node("if_else", compare(node("get_variable", "cs-clicks"), "GREATER_OR_EQUAL", number(count)), null, null), statements: [[node("change_to_some_shape", node("get_pictures", pic), null), ...(count === "25" ? [{ ...node("_if", compare(node("get_variable", "cs-clicks"), "EQUAL", number("25")), null), statements: [[speak("다 자랐어요!")]] }] : [])], rest] }], [])]] }], [node("mouse_clicked", null), node("change_variable", "cs-clicks", text("1"), null)]];
  expect(checkProgrammingMission("tree", withTree(watch)).passed).toBe(true);
  // Growing on every click, skipping a stage, growing without clicks or never speaking all fail.
  expect(checkProgrammingMission("tree", withTree(treeCode([node("change_to_next_shape", "next", null)]))).passed).toBe(false);
  expect(checkProgrammingMission("tree", withTree(treeCode(["5", "15", "20", "25"].map(grow)))).passed).toBe(false);
  expect(checkProgrammingMission("tree", withTree([[start(), { ...node("repeat_inf", null, null), statements: [[node("change_to_next_shape", "next", null)]] }]])).passed).toBe(false);
  // Grown but silent.
  const silent = treeCode(["5", "10", "15", "20", "25"].map((count) => ({ ...grow(count), statements: [[node("change_to_next_shape", "next", null)]] })));
  expect(checkProgrammingMission("tree", withTree(silent)).passed).toBe(false);
  // Changing to another object's shape is refused with a message.
  expect(checkProgrammingMission("tree", withTree(treeCode([node("change_to_some_shape", node("get_pictures", "can-pic2"), null)]))).message).toBe("이 오브젝트의 모양을 골라 주세요.");
  const noTree = buildProgrammingProject(undefined, parseProgrammingProject(missionStarter("tree"))!.added.filter((o) => o.id !== "tree"), 1, true);
  expect(checkProgrammingMission("tree", noTree).message).toContain("나무 오브젝트가 없어요");
});

// Dog-free lessons (conditionals, loops) start with the official Entrybot and grade whichever object owns the start line.
import library from "../src/lib/classroom/entry-library.json";
import { ENTRYBOT_SPRITE, LIBRARY_CATEGORIES, MAX_FREE_OBJECTS } from "../src/lib/classroom/entry-palette";
import { existsSync, statSync } from "node:fs";
const freeProject = (objects: { sprite: string; threads?: EntryNode[][] }[]) => buildProgrammingProject(undefined, objects.map((o, i) => ({ id: `o${i}`, name: `오브젝트${i}`, sprite: o.sprite, rotateMethod: "free" as const, threads: o.threads ?? [], entity: { x: 0, y: 0, scaleX: 0.4, scaleY: 0.4, rotation: 0, direction: 90, visible: true } })), -1);
const pen = library.find((s) => s.name === "연필(1)")!.id;

test("조건·반복 수업은 강아지 없이 엔트리봇으로 시작하고, 기초 수업은 그대로 강아지로 시작한다", () => {
  for (const id of ["average", "pass", "freethrow", "escape", "square", "polygon", "safe"]) {
    const p = parseProgrammingProject(missionStarter(id))!;
    expect(p.free, id).toBe(true);
    expect(p.added.map((o) => o.sprite), id).toEqual([ENTRYBOT_SPRITE]);
    expect(parseProgrammingProject(JSON.stringify(p.project))!.key, id).toBe(p.key);
  }
  expect(parseProgrammingProject(missionStarter("tree"))!.free).toBe(true);
  for (const id of ["name", "multiply", "move", "keys"]) expect(parseProgrammingProject(missionStarter(id))!.free, id).toBe(false);
});

test("강아지 없는 작품은 시작 줄을 가진 한 오브젝트로 채점하고, 두 오브젝트에 나뉘면 안내하며 막는다", () => {
  expect(checkProgrammingMission("square", freeProject([{ sprite: ENTRYBOT_SPRITE }, { sprite: pen, threads: [square()] }])).passed).toBe(true);
  expect(checkProgrammingMission("square", freeProject([{ sprite: ENTRYBOT_SPRITE, threads: [square()] }])).passed).toBe(true);
  const split = freeProject([{ sprite: ENTRYBOT_SPRITE, threads: [[start(), speak("안녕")]] }, { sprite: pen, threads: [square()] }]);
  expect(missionBlockIssue("square", split)).toContain("한 오브젝트에만");
  expect(checkProgrammingMission("square", split).passed).toBe(false);
  // Decorations on other events are not graded.
  const decorated = freeProject([{ sprite: ENTRYBOT_SPRITE, threads: [[node("when_object_click", null), speak("완성!")]] }, { sprite: pen, threads: [square()] }]);
  expect(missionBlockIssue("square", decorated)).toBeNull();
  expect(checkProgrammingMission("square", decorated).passed).toBe(true);
  const pass = [start(), node("ask_and_wait", text("점수는?"), null), { ...node("if_else", compare(answer(), "GREATER_OR_EQUAL", number("60")), null, null), statements: [[speak("합격")], [speak("불합격")]] }];
  expect(checkProgrammingMission("pass", freeProject([{ sprite: pen }, { sprite: ENTRYBOT_SPRITE, threads: [pass] }])).passed).toBe(true);
  expect(checkProgrammingMission("pass", freeProject([{ sprite: pen }])).passed).toBe(false);
});

test("강아지 없는 작품은 오브젝트 수·그림을 검사하고 중복 모양은 한 번만 남긴다", () => {
  expect(parseProgrammingProject(freeProject(Array.from({ length: MAX_FREE_OBJECTS }, () => ({ sprite: pen })))!)).not.toBeNull();
  expect(parseProgrammingProject(freeProject(Array.from({ length: MAX_FREE_OBJECTS + 1 }, () => ({ sprite: pen })))!)).toBeNull();
  const raw = JSON.parse(freeProject([{ sprite: ENTRYBOT_SPRITE }]));
  raw.objects[0].sprite.pictures.push({ ...raw.objects[0].sprite.pictures[0], id: "copy" });
  expect(parseProgrammingProject(JSON.stringify(raw))!.key).toBe(parseProgrammingProject(freeProject([{ sprite: ENTRYBOT_SPRITE }]))!.key);
  raw.objects[0].sprite.pictures[0].fileurl = "https://example.com/x.png";
  raw.objects[0].selectedPictureId = raw.objects[0].sprite.pictures[0].id;
  // A lone object with an unknown picture is read as the dog, as before objects could be added; the picture is never kept.
  expect(JSON.stringify(parseProgrammingProject(JSON.stringify(raw))!.project)).not.toContain("example.com");
  expect(parseProgrammingProject(JSON.stringify(raw))!.free).toBe(false);
  raw.objects.push(JSON.parse(freeProject([{ sprite: pen }])).objects[0]);
  expect(parseProgrammingProject(JSON.stringify(raw))).toBeNull();
  expect(parseProgrammingProject(exported([[start()]]))!.free).toBe(false);
});

test("엔트리 오브젝트 묶음은 파일·분류·크기가 맞고 위험한 SVG가 없다", () => {
  const categories = new Set<string>(LIBRARY_CATEGORIES.map(([id]) => id));
  expect(library.length).toBeGreaterThanOrEqual(200);
  expect(library.some((s) => s.id === ENTRYBOT_SPRITE)).toBe(true);
  for (const sprite of library) {
    expect(categories.has(sprite.category), sprite.name).toBe(true);
    expect(sprite.pictures.length, sprite.name).toBeLessThanOrEqual(10);
    for (const file of [sprite.thumb, ...sprite.pictures.map((p) => p.file)]) {
      const path = `public${file}`;
      expect(existsSync(path), path).toBe(true);
      expect(statSync(path).size, path).toBeLessThanOrEqual(2_000_000);
      if (file.endsWith(".svg")) expect(readFileSync(path, "utf8"), path).not.toMatch(/<script|<foreignObject|\son\w+\s*=|javascript:/i);
    }
  }
});
