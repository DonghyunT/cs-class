import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { LEGACY_INPUTS } from "./entry-legacy-inputs";
import legacyKeys from "./fixtures/entry-legacy-keys.json";
import functionExport from "./fixtures/entry-function-export.json";
import { sameWorkContent } from "../src/components/student/work-draft";
import { readEntryDraft } from "../src/components/student/read-editor-draft";
import { CONTAINER_BLOCKS, ENTRY_PALETTE, FUNCTION_PALETTE, MISSION_BLOCKS, ROBOT_PALETTE, PALETTE_BLOCKS, PALETTE_TEXT, VALUE_BLOCKS, blockLabel, missionBlockTypes } from "../src/lib/classroom/entry-palette";
import { MAX_FUNCTIONS, functionCallId, MAX_PROJECT_BYTES, PROGRAMMING_MISSIONS, buildProgrammingProject, missionsFor, entryBlockCategory, entryObjectModel, formatEntryNode, functionNamesOf, hintParts, hintPlain, missionBlockIssue, missionById, newAddedObject, parseProgrammingProject, programmingProjectLines, programmingProjectMatches, type AddedObject, type EntryNode, type ProgramFunction } from "../src/lib/classroom/programming-entry";
import { checkProgrammingMission, wordingMessage } from "../src/lib/server/programming-grader";
import { PROGRAMMING_LESSON } from "../src/lib/classroom/programming-lesson";
import { CONDITIONALS_LESSON } from "../src/lib/classroom/conditionals-lesson";
import { LOOPS_LESSON } from "../src/lib/classroom/loops-lesson";
import { FUNCTIONS_LESSON } from "../src/lib/classroom/functions-lesson";
import { BRICK_BREAKER_LESSON } from "../src/lib/classroom/brick-breaker-lesson";

import { emptyWork } from "../src/lib/classroom/progress";
import type { WorkDraft } from "../src/lib/classroom/types";

test("처음 여는 수업의 첫 미션 작품은 수업 유형에 맞는 시작 작품이다", () => {
  const first = (lesson: Parameters<typeof emptyWork>[0]) => { const { mission, projects } = emptyWork(lesson).draft.programming!; return parseProgrammingProject(projects[mission])!; };
  expect(first(PROGRAMMING_LESSON).free).toBe(false);
  for (const lesson of [CONDITIONALS_LESSON, LOOPS_LESSON, FUNCTIONS_LESSON, BRICK_BREAKER_LESSON]) expect(first(lesson).free, lesson.id).toBe(true);
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
  const functions = source.match(/const FUNCTION_PALETTE = (\{.*\});/)?.[1];
  expect(functions).toBeTruthy();
  expect(new Function(`return ${functions}`)()).toEqual({ category: FUNCTION_PALETTE.category, blocks: [...FUNCTION_PALETTE.blocks] });
  const robot = source.match(/const ROBOT_PALETTE = (\{.*\});/)?.[1];
  expect(robot).toBeTruthy();
  expect(new Function(`return ${robot}`)()).toEqual({ category: ROBOT_PALETTE.category, blocks: [...ROBOT_PALETTE.blocks] });
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
  // Waits are harmless in every mission now; a block that changes the run is still named.
  expect(checkProgrammingMission("multiply", project([multiply([node("wait_second", number("2"), null)])])).passed).toBe(true);
  expect(checkProgrammingMission("multiply", project([multiply([node("bounce_wall", null)])]))).toEqual({ passed: false, message: "이번 미션은 기본 블록으로 확인해요. ‘화면 끝에 닿으면 튕기기’ 블록을 빼고 다시 검증해 주세요." });
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
  expect(formatEntryNode(node("stop_object", "thisOnly", null))).toBe("자신의 코드 멈추기");
  expect(formatEntryNode(node("stop_object", "otherThread", null))).toBe("자신의 다른 코드 멈추기");
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
  expect(parseProgrammingProject(with_(node("set_variable", "변수 Z!", node("text", "1"), null)))).toBeNull();
  expect(parseProgrammingProject(with_(node("dialog_time", node("calc_basic", node("number", "1"), null, node("number", "2")), node("number", "1"), "speak", null)))).toBeNull();
  expect(parseProgrammingProject(project([[node("get_variable", null)]]))).toBeNull();
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
  // Plain ‘말하기’ and ‘x 좌표를 바꾸기’ are graded now; absolute position and the object's rotation are not the same.
  expect(missionBlockIssue("name", project([[start(), node("ask_and_wait", node("text", "?"), null), node("dialog", node("text", "안녕"), "speak", null)]]))).toBeNull();
  expect(missionBlockIssue("move", project([[start(), node("move_x", number("10"), null)]]))).toBeNull();
  expect(missionBlockIssue("move", project([[start(), node("locate_x", number("10"), null)]]))).toBe("이번 미션은 ‘x: ( ) 위치로 이동하기’ 대신 ‘x 좌표를 ( )만큼 바꾸기’ 블록으로 확인해요. 바꿔서 다시 검증해 주세요.");
  expect(missionBlockIssue("keys", project([[node("when_some_key_pressed", null, "38"), node("rotate_absolute", node("angle", "0"), null), node("move_direction", number("10"), null)]]))).toContain("대신 ‘이동 방향을 ( )(으)로 정하기’");
  const wrongObject = withObjects([[]], [ball([[start(), node("move_direction", number("10"), null)]], { name: "축구공" })]);
  expect(checkProgrammingMission("move", wrongObject).message).toBe("강아지가 아니라 ‘축구공’에 시작하기 줄이 있어요. 오브젝트 목록에서 강아지를 고른 뒤 코드를 만들어 주세요.");
});

// Words each chip must keep so students can find that one block on the palette (and not its look-alike).
const CHIP_WORDS: Record<string, RegExp> = {
  hamsterlite_move_forward_for_secs: /^앞으로 \d+초 이동하기$/, hamsterlite_move_backward_for_secs: /^뒤로 \d+초 이동하기$/, hamsterlite_set_led_to: /LED를 .+으로 정하기$/, hamsterlite_clear_led: /LED 끄기$/, hamsterlite_beep: /^삐 소리내기$/,
  when_run_button_click: /^시작하기 버튼을 클릭했을 때$/, when_some_key_pressed: /^.+ 키를 눌렀을 때$/, mouse_clicked: /^마우스를 클릭했을 때$/, ask_and_wait: /^.+[을를] 묻고 대답 기다리기$/,
  dialog: /^.+[을를] 말하기$/, set_variable: /^[AB]를 .+로 정하기$/, change_variable: /^.+에 \d+만큼 더하기$/, calc_basic: / [+\-x/] /, combine_something: /^.+ 과\(와\) .+ 을\(를\) 합친 값$/, boolean_basic_operator: /^.+ (=|!=|>|<|≥|≤) .+$/,
  boolean_and_or: /^참 (그리고|또는) /, if_else: /^만일 .+라면 아니면$/, _if: /^만일 .+라면$/, repeat_basic: /^.+번 반복하기$/, repeat_while_true: /될 때까지 반복하기$/,
  move_direction: /^\d+만큼 움직이기$/, direction_relative: /^.+° 회전하기$/, direction_absolute: /^이동 방향을 \d+°로 정하기$/,
  move_x: /^x 좌표를 -?\d+만큼 바꾸기$/, start_drawing: /^그리기 시작하기$/, stop_drawing: /^그리기 멈추기$/, locate_xy: /^x: -?\d+ y: -?\d+ 위치로 이동하기$/, change_to_next_shape: /^다음 모양으로 바꾸기$/,
  when_object_click: /^오브젝트를 클릭했을 때$/, repeat_inf: /^계속 반복하기$/, locate_x: /^x: .+ 위치로 이동하기$/, coordinate_mouse: /^마우스 [xy] 좌푯값$/, bounce_wall: /^화면 끝에 닿으면 튕기기$/, reach_something: /^.+에 닿았는가\?$/, stop_object: /^.+ 멈추기$/, hide: /^모양 숨기기$/,
};
// Functions come first: students make a function before they call it.
const walkProject = (raw: string, walk: (v: unknown) => void) => { const p = JSON.parse(raw); walk(p.functions ?? []); walk({ ...p, functions: [] }); };
const missionText = (id: string) => { const m = missionById(id)!; return [m.hint, ...m.steps, m.tip ?? ""]; };

test("힌트 칩은 그 미션이 받는 블록이고 팔레트의 고정 낱말을 지키며, 힌트는 짧고 칩 표기가 새지 않는다", () => {
  for (const mission of PROGRAMMING_MISSIONS) {
    const texts = missionText(mission.id);
    const chips = texts.flatMap(hintParts).filter((part) => typeof part !== "string");
    expect(chips.length, mission.id).toBeGreaterThan(0);
    for (const { type, text } of chips) {
      expect(MISSION_BLOCKS[mission.id].has(type), `${mission.id}: ${type} ${text}`).toBe(true);
      expect(CHIP_WORDS[type], `${type}: add the words its chip must keep`).toBeTruthy();
      expect(text, `${mission.id}: ${type}`).toMatch(CHIP_WORDS[type]);
    }
    // No broken chip, template slot or duplicated palette note reaches the screen.
    for (const plain of texts.map(hintPlain)) expect(plain, mission.id).not.toMatch(/`|\( \)|팔레트에서는/);
    // One summary line, at most five one-line steps and one short 💡 line (1,024px: one line; 222px column: four lines).
    expect(mission.steps.length, mission.id).toBeGreaterThanOrEqual(2);
    expect(mission.steps.length, mission.id).toBeLessThanOrEqual(5);
    expect(hintPlain(mission.hint).length, mission.id).toBeLessThanOrEqual(45);
    for (const step of mission.steps) expect(hintPlain(step).length, `${mission.id}: ${step}`).toBeLessThanOrEqual(45);
    expect(hintPlain(mission.tip ?? "").length, mission.id).toBeLessThanOrEqual(40);
    // The grader's failure text is plain: hint chips never leak into validation feedback.
    expect(mission.failure, mission.id).not.toMatch(/`/);
  }
  // The palette shows ‘x’ for multiply, so the hint does too; plain ‘말하기’ counts for the name mission now.
  expect(hintPlain(missionById("multiply")!.steps.join(" "))).toContain("A 값 x B 값");
  expect(hintParts(missionById("name")!.steps.join(" "))).toContainEqual({ type: "dialog", text: "대답을 말하기" });
  expect(hintParts("a `dialog: 안녕을 말하기` b")).toEqual(["a ", { type: "dialog", text: "안녕을 말하기" }, " b"]);
  expect(hintPlain("a `dialog: 안녕을 말하기` b")).toBe("a 안녕을 말하기 b");
});

test("미션 블록 목록은 팔레트 순서·표기로 보이고 표기가 빠진 블록이 없다", () => {
  for (const id of Object.keys(MISSION_BLOCKS)) for (const type of missionBlockTypes(id)) expect(PALETTE_TEXT[type], `${id}: ${type}`).toBeTruthy();
  expect(missionBlockTypes("multiply").slice(0, 2)).toEqual(["when_run_button_click", "dialog_time"]);
  expect(Object.keys(PALETTE_TEXT).every((type) => PALETTE_BLOCKS.has(type))).toBe(true);
  expect(blockLabel("combine_something")).toBe("( )과(와) ( )을(를) 합친 값");
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
const rideProgram = (condition: EntryNode) => [start(), ask(), node("set_variable", "cs-A", answer(), null), ask(), node("set_variable", "cs-B", answer(), null), ifElse(condition, [speak("탈 수 있어요")], [speak("탈 수 없어요")])];
const atLeast = (id: string, limit: string, op = "GREATER_OR_EQUAL") => compare(node("get_variable", id), op, number(limit));

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

test("놀이기구 탑승은 A·B에 저장한 키와 나이를 논리 블록으로 바르게 판단해야 통과한다", () => {
  const and = node("boolean_and_or", atLeast("cs-A", "130"), "AND", atLeast("cs-B", "10"));
  expect(checkProgrammingMission("ride", exported([rideProgram(and)])).passed).toBe(true);
  expect(checkProgrammingMission("ride", exported([rideProgram(node("boolean_and_or", atLeast("cs-A", "130"), "OR", atLeast("cs-B", "10")))])).passed).toBe(false);
  // 130cm and 10 years old can ride: ‘>’ misses the limits.
  expect(checkProgrammingMission("ride", exported([rideProgram(node("boolean_and_or", atLeast("cs-A", "130", "GREATER"), "AND", atLeast("cs-B", "10", "GREATER")))])).passed).toBe(false);
  // The same meaning with ‘또는’·‘아니다’ also passes: not (A < 130 or B < 10).
  const short = node("boolean_and_or", atLeast("cs-A", "130", "LESS"), "OR", atLeast("cs-B", "10", "LESS"));
  expect(checkProgrammingMission("ride", exported([rideProgram(node("boolean_not", null, short, null))])).passed).toBe(true);
  // Nested conditions give the right words but skip the logic block the mission practices.
  const nested = [...rideProgram(atLeast("cs-A", "130")).slice(0, 5), ifElse(atLeast("cs-A", "130"), [ifElse(atLeast("cs-B", "10"), [speak("탈 수 있어요")], [speak("탈 수 없어요")])], [speak("탈 수 없어요")])];
  expect(checkProgrammingMission("ride", exported([nested])).passed).toBe(false);
  // A ‘그리고’ that ignores the age does not count.
  expect(checkProgrammingMission("ride", exported([rideProgram(node("boolean_and_or", atLeast("cs-A", "130"), "AND", node("True", null)))])).passed).toBe(false);
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
  for (const id of ["average", "pass", "freethrow", "ride", "square", "polygon", "safe"]) {
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

const withBrickObjects = (missionId: string, byObject: Record<string, EntryNode[][]>) => {
  const p = parseProgrammingProject(missionStarter(missionId))!;
  return buildProgrammingProject(undefined, p.added.map((o) => byObject[o.id] ? { ...o, threads: byObject[o.id] } : o), -1, false, p.variables, p.functions);
};
const withBrickThreads = (missionId: string, objectId: string, threads: EntryNode[][]) => withBrickObjects(missionId, { [objectId]: threads });
const touchOf = (target: string) => node("reach_something", null, target, null);
const stopAllOf = () => node("stop_object", "all", null);
const objectClick = () => node("when_object_click", null);
const brickBallSteps = () => [forward(number("4")), node("bounce_wall", null), { ...node("_if", touchOf("paddle"), null), statements: [[node("func_pbounce", null)]] }, { ...node("_if", touchOf("wall_down"), null), statements: [[stopAllOf()]] }];
const BRICK_SOLUTIONS = {
  paddle: withBrickThreads("paddle", "paddle", [[start(), forever([node("locate_x", node("coordinate_mouse", null, "x", null), null)])]]),
  ball: withBrickThreads("ball", "ball", [[objectClick(), forever(brickBallSteps())]]),
  brick: withBrickObjects("brick", { brick1: [[start(), forever([{ ...node("_if", touchOf("ball"), null), statements: [[node("change_variable", "score", number("1"), null), node("hide", null)]] }])]], youwin: [[start(), forever([{ ...node("_if", compare(node("get_variable", "score"), "EQUAL", number("3")), null), statements: [[node("show", null), stopAllOf()]] }])]] }),
  "brick-bounce": withBrickThreads("brick-bounce", "ball", [[objectClick(), forever([...brickBallSteps(), ...(["brick1", "brick2", "brick3"] as const).map((bid) => ({ ...node("_if", touchOf(bid), null), statements: [[turn(node("angle", "180"))]] }))])]]),
};
// Solutions built in the order of each mission's `steps` (plan appendix D); guidance and grading must agree.
test("조립 순서대로 만든 미션 해답(정사각형은 두 회전 블록 모두)은 채점을 통과한다", () => {
  const sayTimed = (value: EntryNode) => node("dialog_time", value, number("2"), "speak", null);
  const variable = (id: string) => node("get_variable", `cs-${id}`);
  const store = (id: string) => [ask(), node("set_variable", `cs-${id}`, answer(), null)];
  const calc = (left: EntryNode, op: string, right: EntryNode) => node("calc_basic", left, op, right);
  const solutions: [string, string][] = [
    ["name", project([[start(), node("ask_and_wait", text("이름이 뭐니?"), null), speak2(answer())]])],
    ["multiply", project([[start(), ...store("A"), ...store("B"), sayTimed(calc(variable("A"), "MULTI", variable("B")))]])],
    ["move", project([[start(), node("direction_absolute", node("angle", "90"), null), forward(number("10"))]])],
    ["keys", project([["38", "0"], ["39", "90"], ["40", "180"], ["37", "270"]].map(([key, angle]) => [node("when_some_key_pressed", null, key), node("direction_absolute", node("angle", angle), null), forward(number("10"))]))],
    ["average", exported([[start(), ...store("A"), ...store("B"), speak2(calc(calc(variable("A"), "PLUS", variable("B")), "DIVIDE", number("2")))]])],
    ["pass", exported([passProgram()])],
    ["freethrow", exported([freeThrow()])],
    ["change", exported([[start(), ...store("A"), ...store("B"), speak2(join(text("거스름돈은 "), join(calc(variable("A"), "MINUS", variable("B")), text("원"))))]])],
    ["ride", exported([rideProgram(node("boolean_and_or", atLeast("cs-A", "130"), "AND", atLeast("cs-B", "10")))])],
    ["square", exported([[start(), node("start_drawing", null), loopOf(number("4"), [forward(number("100")), turn(node("angle", "90"))])]])],
    ["square", exported([[start(), node("start_drawing", null), loopOf(number("4"), [forward(number("100")), turn(node("angle", "90"), "rotate_relative")])]])],
    ["polygon", exported([[start(), node("ask_and_wait", text("변의 수는?"), null), node("start_drawing", null), loopOf(answer(), [forward(number("70")), turn(calc(number("360"), "DIVIDE", answer()))]), node("stop_drawing", null), node("locate_xy", number("-150"), number("0"), null)]])],
    ["tree", withTree(treeCode(["5", "10", "15", "20", "25"].map(grow)))],
    ["safe", exported([[start(), until(compare(answer(), "EQUAL", number("1234"))), speak("금고가 열렸어요!")]])],
    ["cat-walk", oneObject([keyLine("39", moveX("10"), callOf("step")), keyLine("37", moveX("-10"), callOf("step"))], [{ id: "step", name: "고양이 걸음", body: [node("change_to_next_shape", "next", null)] }], CAT)],
    ["windows", oneObject([[start(), callOf("win"), moveX("100"), callOf("win")]], [{ id: "win", name: "창문 그리기", body: penBody(4) }])],
    ["fix-shapes", repairedShapes()],
    ["flower", oneObject([[start(), loopOf(number("6"), [callOf("petal"), turn(node("angle", "60"))])]], [{ id: "petal", name: "꽃잎", body: penBody(4) }])],
    ["paddle", BRICK_SOLUTIONS.paddle],
    ["ball", BRICK_SOLUTIONS.ball],
    ["brick", BRICK_SOLUTIONS.brick],
    ["brick-bounce", BRICK_SOLUTIONS["brick-bounce"]],
    ["robot-go", oneObject([[start(), node("hamsterlite_move_forward_for_secs", text("1"), null), node("hamsterlite_move_backward_for_secs", text("1"), null)]], [])],
    ["robot-signal", oneObject([[start(), node("hamsterlite_set_led_to", "BOTH", "2", null), node("hamsterlite_move_forward_for_secs", text("1"), null), node("hamsterlite_beep", null), node("hamsterlite_clear_led", "BOTH", null)]], [])],
  ];
  // Every mission a lesson still offers has a solution; retired ones (escape) are no longer graded.
  expect(new Set(solutions.map(([id]) => id))).toEqual(new Set(["programming-13", "conditionals", "loops", "functions", "brick-breaker", "hamster-robot"].flatMap((lesson) => missionsFor(lesson).map((mission) => mission.id))));
  // The steps name the values and slots these solutions use.
  expect(hintPlain(missionById("polygon")!.steps[1])).toContain("70만큼 움직이기");
  // After drawing, the pen lifts and Entrybot steps aside so it does not hide the shape.
  expect(hintPlain(missionById("polygon")!.steps.join(" "))).toContain("그리기 멈추기");
  expect(hintPlain(missionById("polygon")!.steps.join(" "))).toContain("x: -150 y: 0");
  // Following the steps gives the solution: each block it uses is a hint chip, or (for asking, saying,
  // answers and variable values written in plain words) named by its word. Alternatives (the second square) are skipped.
  const MENTION: Record<string, string> = { ask_and_wait: "묻", dialog: "말하기", dialog_time: "말하기", get_canvas_input_value: "대답", get_variable: " 값" };
  const typesIn = (raw: string) => { const out = new Set<string>(); const walk = (v: unknown): void => { if (typeof v === "string" && v.startsWith("[")) { try { walk(JSON.parse(v)); } catch { /* plain text */ } } else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") { const t = (v as { type?: unknown }).type; if (typeof t === "string" && PALETTE_BLOCKS.has(t)) out.add(t); Object.values(v).forEach(walk); } }; walkProject(raw, walk); return out; };
  // Values each solution uses, as the hint writes them (palette symbols; Entry key codes 37–40 as key names).
  const SYMBOL: Record<string, string> = { GREATER_OR_EQUAL: "≥", EQUAL: "=", MULTI: "x", DIVIDE: "/", PLUS: "+", MINUS: "-" }, KEY: Record<string, string> = { 37: "왼쪽", 38: "위쪽", 39: "오른쪽", 40: "아래쪽" };
  const VARIABLE: Record<string, string> = { "cs-A": "A", "cs-B": "B", "cs-clicks": "클릭 수", score: "점수" };
  // The tree's later thresholds are written in words instead of four more chips.
  const VALUE_IN_WORDS: Record<string, RegExp> = { "brick 점수 값 = 3": /99를 3으로/, "tree 클릭 수 값 = 10": /5를 10으로/, ...Object.fromEntries(["15", "20", "25"].map((n) => [`tree 클릭 수 값 = ${n}`, /15·20·25도/])) };
  const LOGIC: Record<string, string> = { AND: "그리고", OR: "또는" };
  const valuesIn = (raw: string) => {
    const out: string[] = [], lit = (v: unknown) => { const n = v as EntryNode | null; return n && typeof n === "object" && ["number", "angle", "text"].includes(n.type) ? String(n.params[0]) : undefined; };
    const symbol = (op: unknown) => { expect(SYMBOL[op as string], `operator ${op}`).toBeTruthy(); return SYMBOL[op as string]; };
    // An operand as the chip writes it: ‘대답’, ‘A 값’, or a nested calculation in brackets.
    const term = (v: unknown): string => { const n = v as EntryNode; return lit(n) ?? (n.type === "get_canvas_input_value" ? "대답" : n.type === "get_variable" ? `${VARIABLE[n.params[0] as string]} 값` : `(${term(n.params[0])} ${symbol(n.params[1])} ${term(n.params[2])})`); };
    const walk = (v: unknown): void => {
      if (typeof v === "string" && v.startsWith("[")) { try { walk(JSON.parse(v)); } catch { /* plain text */ } return; }
      if (Array.isArray(v)) return v.forEach(walk);
      if (!v || typeof v !== "object") return;
      const { type, params = [] } = v as EntryNode, [p0, p1, p2] = params;
      if (type === "repeat_basic" && lit(p0)) out.push(`${lit(p0)}번`);
      const amount = lit(type === "move_direction" ? p0 : type === "change_variable" ? p1 : undefined);
      if (amount) out.push(`${amount}만큼`);
      if ((type === "direction_relative" || type === "direction_absolute") && lit(p0)) out.push(`${lit(p0)}°`);
      if (type === "locate_xy") out.push(`x: ${lit(p0)} y: ${lit(p1)}`);
      // The stored value (‘A를 대답으로’, not a constant) and the logic word (‘또는’, not ‘그리고’).
      if (type === "set_variable") out.push(`${VARIABLE[p0 as string]}를 ${term(p1)}`);
      if (type === "boolean_and_or") { expect(LOGIC[p1 as string], `logic ${p1}`).toBeTruthy(); out.push(`참 ${LOGIC[p1 as string]}`); }
      // A said text appears as its chip, ‘합격을 말하기’ (을 after a final consonant, else 를).
      if ((type === "dialog" || type === "dialog_time") && (p0 as EntryNode | null)?.type === "text") { const said = lit(p0)!, last = [...said].reverse().find((c) => c >= "가" && c <= "힣")!; out.push(`${said}${(last.charCodeAt(0) - 0xac00) % 28 ? "을" : "를"} 말하기`); }
      if (type === "when_some_key_pressed") out.push(KEY[p1 as string]);
      if (type === "boolean_basic_operator" || type === "calc_basic") out.push(`${term(p0)} ${symbol(p1)} ${term(p2)}`);
      Object.values(v).forEach(walk);
    };
    walkProject(raw, walk); return out;
  };
  for (const [id, raw] of solutions.filter(([id], i) => solutions.findIndex(([other]) => other === id) === i)) {
    const texts = missionText(id), chipTypes = new Set(texts.flatMap(hintParts).flatMap((part) => typeof part === "string" ? [] : [part.type])), plain = texts.map(hintPlain).join(" ");
    // Blocks and values the starter already places need no chip (lesson 1 students never dragged the start block in;
    // the broken-shapes starter holds the code to repair).
    const starterTypes = typesIn(missionStarter(id)), starterValues = valuesIn(missionStarter(id));
    for (const type of typesIn(raw)) if (!starterTypes.has(type)) expect(chipTypes.has(type) || (MENTION[type] !== undefined && plain.includes(MENTION[type])), `${id}: ${type}`).toBe(true);
    // ...and with the solution's values: a right block with a wrong threshold, count or symbol still misleads.
    const pattern = (value: string) => VALUE_IN_WORDS[`${id} ${value}`] ?? new RegExp(`${/^[\d가-힣-]/.test(value) ? "(?<![\\d\\-가-힣])" : ""}${value.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}`);
    for (const value of valuesIn(raw)) if (!starterValues.includes(value)) expect(pattern(value).test(plain), `${id}: ${value}`).toBe(true);
    // A function the solution calls (and the starter does not) is named in the steps.
    const callsIn = (text: string) => new Set([...text.matchAll(/\\*"type\\*":\\*"func_([\w-]+)/g)].map((m) => m[1]));
    const starterCalls = callsIn(missionStarter(id)), names = functionNamesOf(parseProgrammingProject(raw)!.functions);
    for (const callee of callsIn(raw)) if (!starterCalls.has(callee)) expect(plain, `${id}: ${names[callee]}`).toContain(names[callee]);
    // ...in the solution's order within the steps, so a swapped threshold, branch or key angle fails too (the tree's word-form list is skipped).
    const steps = missionById(id)!.steps.map(hintPlain).join(" "), at = [...new Set(valuesIn(raw))].filter((value) => !VALUE_IN_WORDS[`${id} ${value}`] && !starterValues.includes(value)).map((value) => [value, steps.search(pattern(value))] as const).filter(([, i]) => i >= 0);
    at.forEach(([value, i], k) => expect(i, `${id}: ${value} comes after ${at[k - 1]?.[0]}`).toBeGreaterThanOrEqual(at[k - 1]?.[1] ?? 0));
    // ...and each block's first chip follows the solution's block order, so swapped steps fail too. Nesting words (안에·아래(바깥)) are not checked.
    const chipOrder = missionById(id)!.steps.flatMap(hintParts).flatMap((part) => typeof part === "string" ? [] : [part.type]), firsts = [...typesIn(raw)].map((type) => [type, chipOrder.indexOf(type)] as const).filter(([, i]) => i >= 0);
    firsts.forEach(([type, i], k) => expect(i, `${id}: ${type} chip comes after ${firsts[k - 1]?.[0]}`).toBeGreaterThanOrEqual(firsts[k - 1]?.[1] ?? 0));
  }
  // From (0, 0) facing right and turning clockwise, side 70 keeps triangles to hexagons inside the 480×270 stage.
  for (const sides of [3, 5, 6]) {
    let x = 0, y = 0, heading = 90;
    for (let i = 0; i < sides; i++) { x += 70 * Math.sin(heading * Math.PI / 180); y += 70 * Math.cos(heading * Math.PI / 180); heading += 360 / sides; expect(y, `${sides}`).toBeGreaterThanOrEqual(-135); expect(Math.abs(x), `${sides}`).toBeLessThanOrEqual(240); }
  }
  expect(missionById("multiply")!.steps[2]).toContain("말하기 안에");
  expect(missionById("average")!.steps[2]).toContain("말하기 안에");
  for (const [id, raw] of solutions) expect(checkProgrammingMission(id, raw), id).toEqual({ passed: true, message: "목표 조건을 확인했어요. 작품을 제출하면 이 미션이 완료돼요." });
});
const speak2 = (value: EntryNode) => node("dialog", value, "speak", null);
// Grading follows what the student sees: same-meaning blocks, harmless extras, the result's key word.
const OK = { passed: true, message: "목표 조건을 확인했어요. 작품을 제출하면 이 미션이 완료돼요." };
const THINKING = "말풍선이 ‘생각하기’로 되어 있어요. 말하기 블록에서 ‘생각하기’를 ‘말하기’로 바꿔 주세요.";
const say = (value: EntryNode, mode = "speak") => node("dialog", value, mode, null);
const sayFor = (value: EntryNode, mode = "speak") => node("dialog_time", value, number("1"), mode, null);
const v = (id: string) => node("get_variable", `cs-${id}`);
const setTo = (id: string, value: EntryNode) => node("set_variable", `cs-${id}`, value, null);
const store = (id: string) => [ask(), setTo(id, answer())];
const calc = (left: EntryNode, op: string, right: EntryNode) => node("calc_basic", left, op, right);
const join = (left: EntryNode, right: EntryNode) => node("combine_something", null, left, null, right, null);
const wait = () => node("wait_second", number("1"), null);
const both = [start(), ...store("A"), ...store("B")];
const scored = (yes: EntryNode[], no: EntryNode[], condition = compare(answer(), "GREATER_OR_EQUAL", number("60"))) => [start(), ask(), ifElse(condition, yes, no)];
const throwsOf = (top: string, middle: string, low: string) => [start(), ask(), ifElse(compare(answer(), "GREATER_OR_EQUAL", number("8")), [speak(top)], [ifElse(compare(answer(), "GREATER_OR_EQUAL", number("5")), [speak(middle)], [speak(low)])])];
const rideSays = (yes: string, no: string, condition = node("boolean_and_or", atLeast("cs-A", "130"), "AND", atLeast("cs-B", "10"))) => [...both, ifElse(condition, [speak(yes)], [speak(no)])];
const drawn = (inner: EntryNode[], count = "4") => [start(), node("start_drawing", null), loopOf(number(count), inner)];
const right90 = () => turn(node("angle", "90"));
const opened = (line = "금고가 열렸어요!") => speak(line);
const tries = (inner: EntryNode[] = []) => ({ ...node("repeat_while_true", compare(answer(), "EQUAL", number("1234")), "until", null), statements: [[node("ask_and_wait", text("비밀번호는?"), null), ...inner]] });
const arrows = (move: (dx: number, dy: number) => EntryNode) => [["38", 0, 10], ["39", 10, 0], ["40", 0, -10], ["37", -10, 0]].map(([key, dx, dy]) => [node("when_some_key_pressed", null, String(key)), move(Number(dx), Number(dy))]);
const xOrY = (dx: number, dy: number) => dx ? node("move_x", number(String(dx)), null) : node("move_y", number(String(dy)), null);
const facing = (dx: number, dy: number) => [node("direction_absolute", node("angle", String(dx ? (dx > 0 ? 90 : -90) : dy > 0 ? 0 : 180)), null), forward(number("10"))];
const arrowLines = (body: (dx: number, dy: number) => EntryNode[]) => [["38", 0, 10], ["39", 10, 0], ["40", 0, -10], ["37", -10, 0]].map(([key, dx, dy]) => [node("when_some_key_pressed", null, String(key)), ...body(Number(dx), Number(dy))]);
const hintOf = (id: string) => missionById(id)!.failure;
const when = (condition: EntryNode, inner: EntryNode[]): EntryNode => ({ ...node("_if", condition, null), statements: [inner] });
const SAFE_STOP = "1234를 맞힌 뒤에도 또 물어요. 맞히면 반복이 멈추도록 ‘반복 중단하기’나 반복 조건을 확인해 주세요.";

const MUST_PASS: [string, string, EntryNode[][]][] = [
  ["name", "일반 말하기", [[start(), ask(), say(answer())]]],
  ["name", "인사 뒤 질문, 이름과 인사말 합치기", [[start(), sayFor(text("안녕!")), ask(), say(join(answer(), text("야 반가워")))]]],
  ["name", "이름 뒤 마무리 말", [[start(), ask(), sayFor(answer()), say(text("좋은 이름이야"))]]],
  ["name", "기다리기·말풍선 지우기", [[start(), ask(), wait(), say(answer()), wait(), node("remove_dialog", null)]]],
  ["multiply", "일반 말하기", [[...both, say(calc(v("A"), "MULTI", v("B")))]]],
  ["multiply", "곱 뒤 마무리 말", [[...both, sayFor(calc(v("A"), "MULTI", v("B"))), say(text("끝"))]]],
  ["multiply", "곱을 A에 저장해 말하기", [[...both, setTo("A", calc(v("A"), "MULTI", v("B"))), say(v("A"))]]],
  ["multiply", "‘+’로 글자와 곱 잇기", [[...both, say(calc(text("곱은 "), "PLUS", calc(v("A"), "MULTI", v("B"))))]]],
  ["average", "‘+’로 글자와 평균 잇기", [[...both, say(calc(text("평균은 "), "PLUS", calc(calc(v("A"), "PLUS", v("B")), "DIVIDE", number("2"))))]]],
  ["average", "평균을 A에 저장해 말하기, 기다리기", [[...both, setTo("A", calc(calc(v("A"), "PLUS", v("B")), "DIVIDE", number("2"))), wait(), say(v("A"))]]],
  ["pass", "합격이에요!·불합격이에요", [scored([speak("합격이에요!")], [speak("불합격이에요")])]],
  ["pass", "이모지·인사·마무리 말", [[start(), speak("점수를 알려 줘"), ask(), ifElse(compare(answer(), "GREATER_OR_EQUAL", number("60")), [speak("축하해요, 합격! 🎉")], [speak("아쉽지만 불합격 😢")]), speak("수고했어")]]],
  ["pass", "대답을 A에 저장해 비교", [[start(), ask(), setTo("A", answer()), ifElse(compare(v("A"), "GREATER_OR_EQUAL", number("60")), [speak("합격")], [speak("불합격")])]]],
  ["freethrow", "더 연습하자!·이모지·느낌표 없음", [throwsOf("훌륭해요!👍", "잘했어요", "더 연습하자!")]],
  ["ride", "탈 수 있어요!·이모지", [rideSays("탈 수 있어요! 🎢", "아쉽지만 탈 수 없어요")]],
  ["ride", "(A < 130 또는 B < 10)이면 못 탐", [rideSays("탈 수 없어요", "탈 수 있어요", node("boolean_and_or", atLeast("cs-A", "130", "LESS"), "OR", atLeast("cs-B", "10", "LESS")))]],
  ["change", "거스름돈은 ○원", [[...both, say(join(text("거스름돈은 "), join(calc(v("A"), "MINUS", v("B")), text("원"))))]]],
  ["change", "거스름돈을 A에 저장해 말하기", [[...both, setTo("A", calc(v("A"), "MINUS", v("B"))), say(join(v("A"), text("원")))]]],
  ["square", "변을 50씩 나누어 그리기", [drawn([forward(number("50")), forward(number("50")), right90()])]],
  ["square", "한 바퀴 더 돌기", [drawn([forward(number("100")), right90()], "5")]],
  ["square", "( )초 동안 회전하기 두 가지", [drawn([forward(number("100")), node("rotate_by_time", number("1"), node("angle", "45"), null), node("direction_relative_duration", number("1"), node("angle", "45"), null)])]],
  ["square", "붓 꾸미기와 도장, 인사, ( )초 동안 회전하기", [[start(), speak("정사각형을 그릴게"), node("start_drawing", null), node("set_random_color", null), node("change_thickness", number("2"), null), loopOf(number("4"), [forward(number("100")), node("brush_stamp", null), node("rotate_by_time", number("1"), node("angle", "90"), null)])]]],
  ["polygon", "변의 수를 A에 저장", [[start(), ask(), setTo("A", answer()), node("start_drawing", null), loopOf(v("A"), [forward(number("60")), turn(calc(number("360"), "DIVIDE", v("A")))])]]],
  ["polygon", "인사 뒤 두 바퀴", [[start(), sayFor(text("도형을 그려요")), node("ask_and_wait", text("변의 수는?"), null), node("start_drawing", null), loopOf(calc(answer(), "MULTI", number("2")), [forward(number("60")), turn(calc(number("360"), "DIVIDE", answer()))])]]],
  ["safe", "열렸다!·틀린 번호 안내·마무리 말", [[start(), tries([{ ...node("_if", compare(answer(), "NOT_EQUAL", number("1234")), null), statements: [[speak("안 열렸어요")]] }]), opened("금고가 열렸다!"), speak("축하해요")]]],
  ["safe", "먼저 묻고, 틀리면 반복 안에서 다시 묻기", [[start(), ask(), { ...node("repeat_while_true", compare(answer(), "EQUAL", number("1234")), "until", null), statements: [[speak("틀렸어"), ask()]] }, opened()]]],
  // A line said before the first question cannot depend on the answer, so its words do not count.
  ["pass", "질문 전에 ‘합격 기준은 60점이야’", [[start(), speak("합격 기준은 60점이야"), ...scored([speak("합격")], [speak("불합격")]).slice(1)]]],
  ["freethrow", "질문 전에 ‘자유투 연습 결과를 알려 줄게’", [[start(), speak("자유투 연습 결과를 알려 줄게"), ...throwsOf("훌륭해요!", "잘했어요!", "더 연습해 보자!").slice(1)]]],
  ["ride", "질문 전에 ‘놀이기구를 탈 수 있는지 알아볼게’", [[start(), speak("놀이기구를 탈 수 있는지 알아볼게"), ...rideSays("탈 수 있어요", "탈 수 없어요").slice(1)]]],
  ["move", "x 좌표 바꾸기", [[start(), node("move_x", number("10"), null)]]],
  ["move", "( )초 동안 x·y만큼 움직이기", [[start(), node("move_xy_time", number("1"), number("10"), number("0"), null)]]],
  ["move", "90 방향으로 움직이기", [[start(), node("move_to_angle", node("angle", "90"), number("10"), null)]]],
  ["move", "5씩 두 번, 사이에 기다리기", [[start(), forward(number("5")), wait(), forward(number("5"))]]],
  ["keys", "x·y 좌표 바꾸기", arrows(xOrY)],
  ["keys", "키마다 방향을 정하고 움직이기", arrowLines(facing)],
];
const MUST_FAIL: [string, string, EntryNode[][], string?][] = [
  ["name", "정해 둔 이름", [[start(), ask(), say(text("초코"))]]],
  ["name", "생각하기로만 말함", [[start(), ask(), say(answer(), "think")]], THINKING],
  ["name", "질문 없음", [[start(), say(answer())]]],
  ["multiply", "정해 둔 답", [[...both, say(number("24"))]]],
  ["multiply", "덧셈", [[...both, say(calc(v("A"), "PLUS", v("B")))]]],
  ["multiply", "두 번 묻고 나서 저장", [[start(), ask(), ask(), setTo("A", answer()), setTo("B", answer()), say(calc(v("A"), "MULTI", v("B")))]]],
  ["multiply", "곱 뒤에 합을 말함", [[...both, say(calc(v("A"), "MULTI", v("B"))), say(calc(v("A"), "PLUS", v("B")))]]],
  ["average", "A + B ÷ 2", [[...both, say(calc(v("A"), "PLUS", calc(v("B"), "DIVIDE", number("2"))))]]],
  ["pass", "60점에 불합격", [scored([speak("합격")], [speak("불합격")], compare(answer(), "GREATER", number("60")))], hintOf("pass")],
  ["pass", "두 결과를 차례로 말함", [scored([speak("합격"), speak("불합격")], [speak("불합격")])]],
  ["pass", "한 줄에 두 결과", [scored([speak("합격 아니면 불합격")], [speak("불합격")])]],
  ["pass", "늘 합격", [[start(), ask(), speak("합격")]]],
  ["pass", "생각하기로만 말함", [scored([say(text("합격"), "think")], [sayFor(text("불합격"), "think")])], THINKING],
  ["freethrow", "5부터 확인", [[start(), ask(), ifElse(compare(answer(), "GREATER_OR_EQUAL", number("5")), [speak("잘했어요!")], [ifElse(compare(answer(), "GREATER_OR_EQUAL", number("8")), [speak("훌륭해요!")], [speak("더 연습해 보자!")])])]]],
  ["freethrow", "한 줄에 두 결과", [throwsOf("훌륭해요! 잘했어요!", "잘했어요!", "더 연습해 보자!")]],
  ["ride", "논리 블록 없이 만일 두 번", [[...both, ifElse(atLeast("cs-A", "130"), [ifElse(atLeast("cs-B", "10"), [speak("탈 수 있어요")], [speak("탈 수 없어요")])], [speak("탈 수 없어요")])]]],
  ["ride", "늘 탈 수 있어요", [[...both, speak("탈 수 있어요")]]],
  ["change", "물건값에서 낸 돈을 뺌", [[...both, say(join(calc(v("B"), "MINUS", v("A")), text("원")))]]],
  ["change", "‘원’ 없이 숫자만", [[...both, say(calc(v("A"), "MINUS", v("B")))]]],
  ["change", "정해 둔 답", [[...both, say(text("1800원"))]]],
  ["square", "반복 없이 네 변", [[start(), node("start_drawing", null), ...Array.from({ length: 4 }, () => [forward(number("100")), right90()]).flat()]]],
  ["square", "정사각형 대신 정팔각형", [drawn([forward(number("100")), turn(node("angle", "45"))], "8")]],
  ["square", "변마다 옆으로 비켜 감", [drawn([forward(number("100")), right90(), node("move_x", number("10"), null)])]],
  // A loop that never repeats is not repetition.
  ["square", "1번 반복 안에 네 변을 풀어 씀", [drawn(Array.from({ length: 4 }, () => [forward(number("100")), right90()]).flat(), "1")]],
  ["square", "1번 반복 안에 x·y 위치로 네 번 이동", [drawn([[100, 0], [100, -100], [0, -100], [0, 0]].map(([px, py]) => node("locate_xy", number(String(px)), number(String(py)), null)), "1")]],
  ["square", "변마다 1번 반복", [[start(), node("start_drawing", null), ...[[100, 0], [0, -100], [-100, 0], [0, 100]].map(([dx, dy]) => loopOf(number("1"), [xOrY(dx, dy)]))]]],
  // Every side must come from a loop that repeats, not only one piece of one side.
  ["square", "1번 반복 안에 세 변, 남은 변은 50씩 2번 반복", [[start(), node("start_drawing", null), loopOf(number("1"), Array.from({ length: 3 }, () => [forward(number("100")), right90()]).flat()), loopOf(number("2"), [forward(number("50"))])]]],
  ["square", "1번 반복 안에 x·y 위치로 세 번, 남은 변은 y 50씩 2번 반복", [[start(), node("start_drawing", null), loopOf(number("1"), [[100, 0], [100, -100], [0, -100]].map(([px, py]) => node("locate_xy", number(String(px)), number(String(py)), null))), loopOf(number("2"), [node("move_y", number("50"), null)])]]],
  ["square", "세 변은 3번 반복, 남은 변은 1번 반복", [[start(), node("start_drawing", null), loopOf(number("3"), [forward(number("100")), right90()]), loopOf(number("1"), [forward(number("100"))])]]],
  ["square", "2번 반복 안에 네 변을 풀어 씀(같은 선을 다시 그림)", [drawn(Array.from({ length: 4 }, () => [forward(number("100")), right90()]).flat(), "2")]],
  ["polygon", "나선(변이 점점 길어짐)", [[start(), node("ask_and_wait", text("변의 수는?"), null), setTo("A", number("40")), node("start_drawing", null), loopOf(answer(), [forward(v("A")), turn(calc(number("360"), "DIVIDE", answer())), setTo("A", calc(v("A"), "PLUS", number("10")))])]]],
  // The repeat count must come from the answer: only whole extra laps are drawn over.
  ["polygon", "반복 10번 고정", [[start(), node("ask_and_wait", text("변의 수는?"), null), node("start_drawing", null), loopOf(number("10"), [forward(number("60")), turn(calc(number("360"), "DIVIDE", answer()))])]]],
  ["polygon", "반복 120번 고정", [[start(), node("ask_and_wait", text("변의 수는?"), null), node("start_drawing", null), loopOf(number("120"), [forward(number("60")), turn(calc(number("360"), "DIVIDE", answer()))])]]],
  ["polygon", "한 변 더 그림(대답 + 1)", [[start(), node("ask_and_wait", text("변의 수는?"), null), node("start_drawing", null), loopOf(calc(answer(), "PLUS", number("1")), [forward(number("60")), turn(calc(number("360"), "DIVIDE", answer()))])]]],
  ["polygon", "회전각 72로 고정",[[start(), node("ask_and_wait", text("변의 수는?"), null), node("start_drawing", null), loopOf(answer(), [forward(number("60")), turn(node("angle", "72"))])]]],
  ["safe", "반복 없이 정해 둔 횟수만 물음", [[start(), node("ask_and_wait", text("?"), null), node("ask_and_wait", text("?"), null), opened()]]],
  ["safe", "묻기 전에 열렸다고 말함", [[start(), opened(), tries()]]],
  ["safe", "시도마다 열렸다고 말함", [[start(), tries([opened()]), opened()]]],
  ["move", "x: 10 위치로 이동(절대 위치)", [[start(), node("locate_x", number("10"), null)]]],
  ["move", "x·y 위치로 이동(절대 위치)", [[start(), node("locate_xy", number("10"), number("0"), null)]]],
  ["move", "y 좌표를 바꿈(방향 틀림)", [[start(), node("move_y", number("10"), null)]]],
  ["keys", "( )초 동안 x·y 위치로 이동(절대 위치)", arrows((dx, dy) => node("locate_xy_time", number("1"), number(String(dx)), number(String(dy)), null))],
  // The keys are pressed one after another: → that relies on the starting direction 90 goes up after ↑.
  ["keys", "→ 키만 방향을 정하지 않음", arrowLines((dx, dy) => dx > 0 ? [forward(number("10"))] : facing(dx, dy))],
  // Right branches with mixed-in result words get the wording message, not the block hint.
  ["pass", "불합격 뒤 ‘다음엔 꼭 합격하자’", [scored([speak("합격")], [speak("불합격"), speak("다음엔 꼭 합격하자")])], wordingMessage("pass")],
  ["freethrow", "‘연습 잘했어’", [throwsOf("훌륭해요!", "연습 잘했어", "더 연습해 보자!")], wordingMessage("freethrow")],
  ["freethrow", "질문 뒤에 ‘자유투 연습 결과는’", [[start(), ask(), speak("자유투 연습 결과는"), ...throwsOf("훌륭해요!", "잘했어요!", "더 연습해 보자!").slice(2)]], wordingMessage("freethrow")],
  ["ride", "‘탈 수 없어요, 다음엔 탈 수 있어요’", [rideSays("탈 수 있어요", "탈 수 없어요, 다음엔 탈 수 있어요")], wordingMessage("ride")],
  ["ride", "마무리 ‘키가 크면 다시 와요, 그땐 탈 수 있어요’", [[...rideSays("탈 수 있어요", "탈 수 없어요"), speak("키가 크면 다시 와요, 그땐 탈 수 있어요")]], wordingMessage("ride")],
  // Wrong or missing branches still get the mission's hint.
  ["pass", "늘 합격·불합격을 둘 다 말함", [[start(), ask(), speak("합격"), speak("불합격")]], hintOf("pass")],
  ["pass", "‘아니면’ 없이 합격만", [[start(), ask(), { ...node("_if", compare(answer(), "GREATER_OR_EQUAL", number("60")), null), statements: [[speak("합격")]] }]], hintOf("pass")],
  // The wording message only follows branches that split the cases by result: a result line said in
  // cases expecting different results, or an answer echoed with every result word, gets the hint.
  ["freethrow", "만일 세 개를 따로(9개면 두 결과)", [[start(), ask(), when(compare(answer(), "GREATER_OR_EQUAL", number("8")), [speak("훌륭해요!")]), when(compare(answer(), "GREATER_OR_EQUAL", number("5")), [speak("잘했어요!")]), when(compare(answer(), "LESS", number("5")), [speak("더 연습해 보자!")])]], hintOf("freethrow")],
  ["pass", "만일 없이 대답과 두 결과를 한 줄로", [[start(), ask(), say(join(answer(), text("점이면 합격일까 불합격일까")))]], hintOf("pass")],
  ["freethrow", "만일 없이 대답과 세 결과를 한 줄로", [[start(), ask(), say(join(answer(), text("개! 훌륭? 잘했? 연습?")))]], hintOf("freethrow")],
  ["pass", "50점 기준에 두 결과를 섞은 말", [scored([speak("불합격이 아니라 합격이야!")], [speak("합격이 아니라 불합격이야")], compare(answer(), "GREATER_OR_EQUAL", number("50")))], hintOf("pass")],
  ["pass", "결과를 서로 바꿔 말함", [scored([speak("불합격")], [speak("합격")])], hintOf("pass")],
  ["freethrow", "8개 이상에 ‘정말 잘했어’를 더 말함", [[start(), ask(), ifElse(compare(answer(), "GREATER_OR_EQUAL", number("8")), [speak("훌륭해요!"), speak("정말 잘했어")], [ifElse(compare(answer(), "GREATER_OR_EQUAL", number("5")), [speak("잘했어요!")], [speak("더 연습해 보자!")])])]], wordingMessage("freethrow")],
  ["pass", "대답을 말한 뒤 바른 갈래, ‘다음엔 꼭 합격하자’", [[start(), ask(), say(join(answer(), text("점이에요"))), ifElse(compare(answer(), "GREATER_OR_EQUAL", number("60")), [speak("합격")], [speak("불합격"), speak("다음엔 꼭 합격하자")])]], wordingMessage("pass")],
  // A side drawn again outside the loop is still drawn outside it, and a loop must draw on two passes.
  ["square", "4번 반복 뒤 반복 밖에서 첫 변을 한 번 더", [[...drawn([forward(number("100")), right90()]), forward(number("100"))]]],
  ["square", "2번 반복 안에 네 변을 풀어 쓰고 맨 아래에서 그리기 시작", [[start(), loopOf(number("2"), [...Array.from({ length: 4 }, () => [forward(number("100")), right90()]).flat(), node("start_drawing", null)])]]],
  ["safe", "계속 반복에 ‘반복 중단하기’ 없음", [[start(), { ...node("repeat_inf", null, null), statements: [[node("ask_and_wait", text("비밀번호는?"), null), when(compare(answer(), "EQUAL", number("1234")), [opened()])]] }]], SAFE_STOP],
];

test("채점 표: 같은 뜻으로 만든 작품은 통과하고, 결과가 틀리거나 다른 결과를 말하거나 고정 답이면 떨어진다", () => {
  for (const [id, label, threads] of MUST_PASS) expect(checkProgrammingMission(id, exported(threads)), `${id}: ${label}`).toEqual(OK);
  for (const [id, label, threads, message] of MUST_FAIL) {
    const result = checkProgrammingMission(id, exported(threads));
    expect(result.passed, `${id}: ${label}`).toBe(false);
    if (message) expect(result.message, `${id}: ${label}`).toBe(message);
  }
  // A start line split in two or missing is named as the palette shows it (‘위쪽 화살표’).
  expect(checkProgrammingMission("multiply", exported([both, [start(), say(calc(v("A"), "MULTI", v("B")))]])).message).toBe("‘시작하기 버튼을 클릭했을 때’ 줄이 여러 개예요. 한 줄로 이어 붙여 주세요.");
  expect(checkProgrammingMission("keys", exported([...arrows(xOrY), [node("when_some_key_pressed", null, "38"), wait()]])).message).toBe("‘위쪽 화살표 키를 눌렀을 때’ 줄이 여러 개예요. 키마다 한 줄로 이어 붙여 주세요.");
  expect(checkProgrammingMission("multiply", exported([both.slice(1)])).message).toBe("‘시작하기 버튼을 클릭했을 때’ 아래에 블록을 연결해 주세요.");
  expect(checkProgrammingMission("average", missionStarter("average")).message).toBe("‘시작하기 버튼을 클릭했을 때’ 아래에 블록을 연결해 주세요.");
  expect(checkProgrammingMission("keys", exported(arrows(xOrY).slice(1))).message).toBe("‘위쪽 화살표 키를 눌렀을 때’ 아래에 블록을 연결해 주세요.");
  // The wording message quotes the whole result phrases students say, in two short sentences.
  expect(wordingMessage("freethrow")).toBe("조건은 맞게 나눴어요. 결과를 말할 때 ‘훌륭해요’·‘잘했어요’·‘더 연습해 보자’ 중 맞는 말 하나만 넣어 주세요.");
  expect(wordingMessage("pass")).toContain("‘합격’·‘불합격’");
  expect(wordingMessage("ride")).toContain("‘탈 수 있어요’·‘탈 수 없어요’");
  // Harmless extras run in the tree mission too, and the block list shown to students leaves them out.
  const grown = treeCode(["5", "10", "15", "20", "25"].map(grow));
  expect(checkProgrammingMission("tree", withTree([[...grown[0], node("change_scale_size", number("1"), null), node("show", null)]]))).toEqual(OK);
  expect(missionBlockTypes("square")).not.toContain("brush_stamp");
  // Same-meaning extras are accepted but not listed, so the list keeps the blocks the mission is about.
  expect(MISSION_BLOCKS.square.has("rotate_by_time")).toBe(true);
  expect(missionBlockTypes("square")).not.toContain("rotate_by_time");
  // Drawing missions accept speech but do not list it.
  for (const id of ["square", "polygon"]) for (const type of ["dialog", "dialog_time"]) {
    expect(MISSION_BLOCKS[id].has(type), id).toBe(true);
    expect(missionBlockTypes(id), id).not.toContain(type);
  }
  expect(missionBlockTypes("square")).toEqual(expect.arrayContaining(["move_direction", "direction_relative", "repeat_basic", "start_drawing"]));
});

// Every block a mission accepts must run in the interpreter; an unknown one falls to the
// misleading ‘시작 블록은 맨 위에…’ message.
test("미션이 받는 모든 동작 블록은 해석기에서 실행된다", () => {
  // Robot missions are graded from their blocks in programming-grader.ts; the interpreter never runs them.
  const STARTS = new Set(["when_run_button_click", "when_some_key_pressed", "mouse_clicked", "when_object_click"]);
  const REPORTERS = new Set(["get_canvas_input_value", "get_variable", "combine_something", "calc_basic", "boolean_basic_operator", "boolean_and_or", "boolean_not", "quotient_and_mod", "is_clicked", "reach_something", "coordinate_mouse", "coordinate_object", "calc_rand"]);
  const n = number("1"), color = node("color", "#FF0000"), yes = node("True", null);
  const DEFAULTS: Record<string, unknown[]> = {
    ask_and_wait: [text("?"), null], dialog_time: [text("안녕"), n, "speak", null], dialog: [text("안녕"), "speak", null], set_variable: ["cs-A", n, null],
    move_direction: [n, null], bounce_wall: [null], move_x: [n, null], move_y: [n, null], move_xy_time: [n, n, n, null], locate_x: [n, null], locate_xy_time: [n, n, n, null], move_to_angle: [n, n, null], locate_xy: [n, n, null], locate: ["mouse", null],
    direction_absolute: [n, null], direction_relative: [n, null], rotate_relative: [n, null], rotate_absolute: [n, null], rotate_by_time: [n, n, null], direction_relative_duration: [n, n, null],
    start_drawing: [null], stop_drawing: [null], brush_erase_all: [null], repeat_basic: [n, null], repeat_while_true: [yes, "until", null], repeat_inf: [null, null], stop_repeat: [null], stop_object: ["all", null], _if: [yes, null], if_else: [yes, null, null],
    change_variable: ["cs-clicks", n, null], change_to_next_shape: ["next", null], change_to_some_shape: [node("get_pictures", "tree-pic2"), null],
    wait_second: [n, null], remove_dialog: [null], show: [null], hide: [null], set_visible_answer: ["HIDE", null], show_variable: ["cs-A", null], hide_variable: ["cs-A", null],
    set_color: [color, null], change_thickness: [n, null], set_thickness: [n, null], set_random_color: [null], set_fill_color: [color, null], start_fill: [null], stop_fill: [null],
    change_brush_transparency: [n, null], set_brush_tranparency: [n, null], brush_stamp: [null], add_effect_amount: ["color", n, null], change_effect_amount: ["color", n, null], erase_all_effects: [null],
    change_scale_size: [n, null], set_scale_size: [n, null], stretch_scale_size: ["WIDTH", n, null], reset_scale_size: [null], flip_x: [null], flip_y: [null], change_object_index: ["FRONT", null],
  };
  for (const [id, allowed] of Object.entries(MISSION_BLOCKS).filter(([mission]) => !missionById(mission)?.robot)) {
    for (const type of [...allowed].filter((t) => !STARTS.has(t) && !REPORTERS.has(t) && !VALUE_BLOCKS.has(t))) {
      expect(DEFAULTS[type], `${type}: add its Entry default params here`).toBeTruthy();
      const lists = CONTAINER_BLOCKS[type];
      const block: EntryNode = { ...node(type, ...DEFAULTS[type]), ...(lists ? { statements: Array.from({ length: lists }, () => []) } : {}) };
      const raw = id === "tree" ? withTree([[node("mouse_clicked", null), block]]) : exported([[id === "keys" ? node("when_some_key_pressed", null, "38") : start(), block]]);
      expect(missionBlockIssue(id, raw), `${id}: ${type}`).toBeNull();
      expect(checkProgrammingMission(id, raw).message, `${id}: ${type}`).not.toBe("시작 블록은 맨 위에 두고 동작을 아래로 연결해 주세요.");
    }
  }
});

// Variables students make in the attribute tab, as Entry 4.0.23 exports them (newest first).
const studentVariable = (id: string, name: string, extra: Record<string, unknown> = {}) => ({ name, id, visible: true, value: 0, variableType: "variable", isCloud: false, isRealTime: false, cloudDate: false, object: null, x: -230, y: -32, ...extra });
const withVariables = (raw: string, variables: Record<string, unknown>[]) => { const p = JSON.parse(raw); p.variables.unshift(...variables); return JSON.stringify(p); };

test("학생이 만든 변수는 저장되고 기존 변수 키·채점은 그대로다", () => {
  const plain = project([multiply()]);
  const raw = withVariables(plain, [studentVariable("tcgg", " 속도 ", { object: "entrybot", value: "5", isCloud: true }), studentVariable("syrt", "점수")]);
  const parsed = parseProgrammingProject(raw)!;
  expect(parsed.variables).toEqual([
    { id: "tcgg", name: "속도", value: 5, visible: true, x: -230, y: -32, object: "entrybot" },
    { id: "syrt", name: "점수", value: 0, visible: true, x: -230, y: -32, object: null },
  ]);
  expect((parsed.project.variables as { id: string; isCloud: boolean }[]).filter((v) => !["timer", "answer", "cs-A", "cs-B"].includes(v.id)).map((v) => [v.id, v.isCloud])).toEqual([["tcgg", false], ["syrt", false]]);
  // Adding a variable is a change to save; a reload that lists variables in another order is not.
  expect(parsed.key).not.toBe(parseProgrammingProject(plain)!.key);
  const reordered = JSON.parse(JSON.stringify(parsed.project)); reordered.variables.reverse();
  expect(parseProgrammingProject(JSON.stringify(reordered))!.key).toBe(parsed.key);
  const again = parseProgrammingProject(JSON.stringify(parsed.project))!;
  expect([again.key, JSON.stringify(again.project)]).toEqual([parsed.key, JSON.stringify(parsed.project)]);
  // Without student variables the key is the one saved work already has.
  expect(parseProgrammingProject(plain)!.key).toBe(parseProgrammingProject(plain)!.gradeKey);
  expect(checkProgrammingMission("multiply", raw).passed).toBe(true);
});

test("엔트리가 만들 수 있는 학생 변수는 받고, 너무 많거나 없는 오브젝트 것이면 거부한다", () => {
  const plain = project([[start()]]);
  // Entry numbers a copied 10-character name past 10 (`abcdefghij1`), and ‘클릭 수’ is free outside the tree mission.
  expect(parseProgrammingProject(withVariables(plain, [studentVariable("aaaa", "abcdefghij"), studentVariable("bbbb", "abcdefghij1"), studentVariable("cccc", "클릭 수")]))!.variables.map((v) => v.name)).toEqual(["abcdefghij", "abcdefghij1", "클릭 수"]);
  // Copying an object copies its own variables past the add panel's limit of 10 (ten local variables, three copies);
  // only the saved size limits them.
  const many = parseProgrammingProject(withVariables(plain, Array.from({ length: 40 }, (_, i) => studentVariable(`v${i}`, `변수${i}`))))!;
  expect([many.variables.length, many.bytes < MAX_PROJECT_BYTES]).toEqual([40, true]);
  // ‘1e309’ would load as Infinity, which the saved project cannot hold.
  expect(parseProgrammingProject(withVariables(plain, [studentVariable("aaaa", "큰 수", { value: "1e309" })]))).toBeNull();
  expect(parseProgrammingProject(withVariables(plain, [studentVariable("aaaa", "점수"), studentVariable("aaaa", "점수2")]))).toBeNull();
  expect(parseProgrammingProject(withVariables(plain, [studentVariable("aaaa", "속도", { object: "obj-gone" })]))).toBeNull();
  expect(parseProgrammingProject(withVariables(plain, [studentVariable("aaaa", "  ")]))).toBeNull();
  expect(parseProgrammingProject(withVariables(plain, [studentVariable("aaaa", "점수", { value: { x: 1 } })]))).toBeNull();
});

test("학생 변수로 결과를 담거나 기준값을 두어도 채점이 엔트리와 같다", () => {
  const say = (value: EntryNode) => node("dialog", value, "speak", null);
  const product = withVariables(project([[start(), ask(), node("set_variable", "cs-A", answer(), null), ask(), node("set_variable", "cs-B", answer(), null),
    node("set_variable", "gopp", node("calc_basic", node("get_variable", "cs-A"), "MULTI", node("get_variable", "cs-B")), null), say(node("get_variable", "gopp"))]]), [studentVariable("gopp", "곱")]);
  expect(checkProgrammingMission("multiply", product)).toEqual({ passed: true, message: "목표 조건을 확인했어요. 작품을 제출하면 이 미션이 완료돼요." });
  // A variable starts at its saved value: 기준 = 60 decides 합격.
  const pass = (limit: number | string) => withVariables(buildProgrammingProject(undefined, parseProgrammingProject(missionStarter("pass"))!.added.map((o) => ({ ...o, threads: [[start(), node("ask_and_wait", node("text", "점수는?"), null),
    { ...node("if_else", node("boolean_basic_operator", answer(), "GREATER_OR_EQUAL", node("get_variable", "gijn")), null), statements: [[say(node("text", "합격"))], [say(node("text", "불합격"))]] }]] })), -1), [studentVariable("gijn", "기준", { value: limit })]);
  expect(checkProgrammingMission("pass", pass(60)).passed).toBe(true);
  expect(checkProgrammingMission("pass", pass("60")).passed).toBe(true);
  expect(checkProgrammingMission("pass", pass(50)).passed).toBe(false);
});

test("지운 변수를 가리키는 블록은 저장되고 교사 화면과 채점이 ‘대상 없음’으로 알린다", () => {
  const raw = withVariables(project([[start(), node("set_variable", "gone", number("1"), null), node("change_variable", "syrt", number("2"), null)]]), [studentVariable("syrt", "점수")]);
  expect(programmingProjectLines(raw)).toEqual(["시작하기 버튼을 클릭했을 때", "대상 없음에 1 저장하기", "점수에 2만큼 더하기"]);
  const missing = "변수 블록에 ‘대상 없음’이 있어요. ▾를 눌러 변수를 다시 골라 주세요.";
  expect(checkProgrammingMission("multiply", project([multiply([node("set_variable", "gone", number("1"), null)])])).message).toBe(missing);
  expect(checkProgrammingMission("multiply", project([[...multiply().slice(0, -1), node("dialog", node("get_variable", "gone"), "speak", null)]])).message).toBe(missing);
  expect(formatEntryNode(node("get_variable", "toString"))).toBe("대상 없음 · 아직 연결하지 않은 블록");
});

test("학생 변수만 바꿔도 저장할 변경으로 보고, 순서만 바뀐 것은 변경이 아니다", () => {
  const plain = project([multiply()]);
  const draft = (raw: string): WorkDraft => ({ ...emptyWork(PROGRAMMING_LESSON).draft, programming: { mission: "multiply", projects: { multiply: raw }, reflection: "" } });
  const one = withVariables(plain, [studentVariable("aaaa", "점수", { value: 1 }), studentVariable("bbbb", "속도")]);
  expect(sameWorkContent(draft(plain), draft(one))).toBe(false);
  expect(sameWorkContent(draft(one), draft(withVariables(plain, [studentVariable("aaaa", "점수", { value: 99 }), studentVariable("bbbb", "속도")])))).toBe(false);
  expect(sameWorkContent(draft(one), draft(withVariables(plain, [studentVariable("bbbb", "속도"), studentVariable("aaaa", "점수", { value: 1 })])))).toBe(true);
});

test("놀이기구 탑승은 A·B를 학생 변수에 옮겨 담아 판단해도 통과한다", () => {
  const copies = [...rideProgram(node("True", null)).slice(0, 5), node("set_variable", "kiii", node("get_variable", "cs-A"), null), node("set_variable", "naii", node("get_variable", "cs-B"), null)];
  const ride = (op: string) => withVariables(exported([[...copies, ifElse(node("boolean_and_or", atLeast("kiii", "130"), op, atLeast("naii", "10")), [speak("탈 수 있어요")], [speak("탈 수 없어요")])]]), [studentVariable("kiii", "키"), studentVariable("naii", "나이")]);
  expect(checkProgrammingMission("ride", ride("AND")).passed).toBe(true);
  expect(checkProgrammingMission("ride", ride("OR")).passed).toBe(false);
});

test("학생 변수 기본값은 엔트리가 다시 불러온 값으로 저장해 새로고침 뒤에도 검증 기록이 맞는다", () => {
  const plain = project([multiply()]);
  const value = (v: unknown) => parseProgrammingProject(withVariables(plain, [studentVariable("gijn", "기준", { value: v })]))!;
  // Entry.parseNumber: numeric text becomes a number unless it starts with 0, and an empty value is 0.
  expect([60, "60", "-2.5", "6e2", "007", "0", "", "1,000", " 60"].map((v) => value(v).variables[0].value)).toEqual([60, 60, -2.5, 600, "007", "0", 0, "1,000", " 60"]);
  expect(programmingProjectMatches(withVariables(plain, [studentVariable("gijn", "기준", { value: "60" })]), withVariables(plain, [studentVariable("gijn", "기준", { value: 60 })]))).toBe(true);
});

// A real Entry 4.0.23 export: function `창문 그리기` (id win1) called twice from the start line.
const functionRaw = JSON.stringify(functionExport);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- edits raw Entry export JSON
type RawJson = any;
const withFunctionEdit = (change: (project: RawJson, fn: RawJson, head: RawJson) => void) => {
  const p = JSON.parse(functionRaw), fn = p.functions[0], content = JSON.parse(fn.content);
  change(p, fn, content[0][0]);
  fn.content = JSON.stringify(content);
  return JSON.stringify(p);
};
const startLine = (raw: string) => parseProgrammingProject(raw)!.added[0].threads[0].map((n) => n.type);

test("함수 정의와 호출을 저장하고 다시 읽어도 같다", () => {
  const parsed = parseProgrammingProject(functionRaw)!;
  expect(parsed.functions).toHaveLength(1);
  expect(parsed.functions[0]).toMatchObject({ id: "win1", name: "창문 그리기" });
  expect(parsed.functions[0].body.map((n) => n.type)).toEqual(["start_drawing", "repeat_basic", "stop_drawing"]);
  expect(startLine(functionRaw)).toEqual(["when_run_button_click", "func_win1", "move_x", "func_win1"]);
  const again = parseProgrammingProject(JSON.stringify(parsed.project))!;
  expect(again.key).toBe(parsed.key);
  expect(again.functions).toEqual(parsed.functions);
});

test("함수가 없는 작품의 키에는 함수가 들어가지 않는다", () => {
  const plain = withFunctionEdit((p) => {
    p.functions = [];
    p.objects[0].script = JSON.stringify(JSON.parse(p.objects[0].script).map((t: { type: string }[]) => t.filter((b) => !b.type.startsWith("func_"))));
  });
  const parsed = parseProgrammingProject(plain)!;
  expect(parsed.functions).toEqual([]);
  expect(parsed.key).not.toContain("functions");
  expect(JSON.stringify(parsed.project)).toContain("\"functions\":[]");
});

test("값 반환 함수·매개변수·지역 변수·상한 초과 함수는 읽지 않는다", () => {
  expect(parseProgrammingProject(withFunctionEdit((_, fn) => { fn.type = "value"; }))).toBeNull();
  expect(parseProgrammingProject(withFunctionEdit((_, __, head) => { head.params[0].params[1] = { type: "function_field_string", params: [{ type: "stringParam_ab12", params: [] }, null] }; }))).toBeNull();
  expect(parseProgrammingProject(withFunctionEdit((_, fn) => { fn.useLocalVariables = true; }))).toBeNull();
  expect(parseProgrammingProject(withFunctionEdit((_, fn) => { fn.localVariables = [{ id: "lv1", name: "지역", value: 0 }]; }))).toBeNull();
  const copies = (count: number) => withFunctionEdit((p, fn) => { p.functions = Array.from({ length: count }, (_, i) => ({ ...fn, id: `f${i}` })); });
  expect(parseProgrammingProject(copies(10))?.functions).toHaveLength(10);
  expect(parseProgrammingProject(copies(MAX_FUNCTIONS + 1))).toBeNull();
  // Long names are trimmed and cut like student variable names, not refused.
  expect(parseProgrammingProject(withFunctionEdit((_, __, head) => { head.params[0].params[0] = ` ${"가".repeat(25)} `; }))!.functions[0].name).toBe("가".repeat(20));
});

test("없는 함수를 부르는 블록은 빼고 읽고, 이름이 같은 함수는 id로 구분한다", () => {
  // Entry drops calls to a deleted function on load, so the parser does the same.
  const deleted = withFunctionEdit((p) => { p.functions = []; });
  expect(startLine(deleted)).toEqual(["when_run_button_click", "move_x"]);
  expect(parseProgrammingProject(JSON.stringify(parseProgrammingProject(deleted)!.project))!.key).toBe(parseProgrammingProject(deleted)!.key);
  const twins = withFunctionEdit((p, fn) => {
    p.functions.push({ ...fn, id: "win2" });
    const script = JSON.parse(p.objects[0].script);
    script[0].push({ ...script[0][1], id: "call2", type: "func_win2" });
    p.objects[0].script = JSON.stringify(script);
  });
  const parsed = parseProgrammingProject(twins)!;
  expect(parsed.functions.map((f) => [f.id, f.name])).toEqual([["win1", "창문 그리기"], ["win2", "창문 그리기"]]);
  expect(startLine(twins).at(-1)).toBe("func_win2");
  expect(functionCallId("func_win2")).toBe("win2");
  expect(functionCallId("move_x")).toBeNull();
});

test("교사 작품 보기는 함수 정의와 호출을 보여 준다", () => {
  const lines = programmingProjectLines(functionRaw);
  expect(lines[0]).toBe("함수 ‘창문 그리기’");
  expect(lines[1].startsWith("└ ")).toBe(true);
  expect(lines.filter((line) => line.includes("‘창문 그리기’ 부르기"))).toHaveLength(2);
  const call = parseProgrammingProject(functionRaw)!.added[0].threads[0][1];
  expect(formatEntryNode(call, {}, { win1: "창문 그리기" })).toBe("‘창문 그리기’ 부르기");
});

test("채점 줄에서 부르는 함수 본문도 미션 블록으로 검사한다", () => {
  const ask = { type: "ask_and_wait", params: [{ type: "text", params: ["몇 개?"] }, null] };
  const asking = withFunctionEdit((_, __, head) => { head.statements[0].push(ask); });
  expect(missionBlockIssue("square", asking)).toContain("묻고 대답 기다리기");
  // A function no graded line calls is not checked.
  const uncalled = withFunctionEdit((p, _, head) => {
    head.statements[0].push(ask);
    p.objects[0].script = JSON.stringify(JSON.parse(p.objects[0].script).map((t: { type: string }[]) => t.filter((b) => !b.type.startsWith("func_"))));
  });
  expect(missionBlockIssue("square", uncalled)).toBeNull();
  // Functions calling each other are each checked once.
  const mutual = withFunctionEdit((p, fn, head) => {
    head.statements[0].push({ type: "func_win2", params: [null] });
    const other = JSON.parse(fn.content);
    other[0][0].statements[0] = [{ type: "func_win1", params: [null] }];
    p.functions.push({ ...fn, id: "win2", content: JSON.stringify(other) });
  });
  expect(missionBlockIssue("square", mutual)).toBeNull();
});

test("함수 본문만 바꿔도 미저장으로 본다", () => {
  const wider = withFunctionEdit((_, __, head) => { head.statements[0][1].statements[0][0].params[0].params = ["80"]; });
  expect(programmingProjectMatches(functionRaw, wider)).toBe(false);
  const draft = (raw: string): WorkDraft => ({ ...emptyWork(LOOPS_LESSON).draft, programming: { mission: "square", projects: { square: raw }, reflection: "" } });
  expect(sameWorkContent(draft(functionRaw), draft(wider))).toBe(false);
  expect(sameWorkContent(draft(functionRaw), draft(functionRaw))).toBe(true);
});

// Function lesson grading. Free projects with one object; functions are named by id.
const fnOf = (id: string, body: EntryNode[]): ProgramFunction => ({ id, name: id, body });
const callOf = (id: string) => node(`func_${id}`, null);
const moveX = (v: string) => node("move_x", number(v), null);
const penBody = (sides: number, length = 50, angle = 360 / sides) => [node("start_drawing", null), loopOf(number(String(sides)), [forward(number(String(length))), turn(node("angle", String(angle)))]), node("stop_drawing", null)];
const CAT = "e55e8ef04e443a90e6afe5e6d";
const oneObject = (threads: EntryNode[][], functions: ProgramFunction[], sprite = ENTRYBOT_SPRITE) => buildProgrammingProject(undefined, [{ ...newAddedObject(sprite, 0, true)!, id: "actor", threads }], -1, false, [], functions);
const keyLine = (key: string, ...body: EntryNode[]) => [node("when_some_key_pressed", null, key), ...body];

test("창문 두 개는 같은 함수의 서로 다른 두 호출이 닿지 않는 정사각형을 하나씩 그려야 통과한다", () => {
  const win = fnOf("win", penBody(4));
  const pass = (raw: string) => checkProgrammingMission("windows", raw).passed;
  expect(pass(oneObject([[start(), callOf("win"), moveX("100"), callOf("win")]], [win]))).toBe(true);
  const unrolled = fnOf("win", [node("start_drawing", null), ...Array.from({ length: 4 }, () => [forward(number("50")), turn(node("angle", "90"))]).flat(), node("stop_drawing", null)]);
  expect(pass(oneObject([[start(), callOf("win"), moveX("100"), callOf("win")]], [unrolled]))).toBe(true);
  // Wrapping the calls in another function still counts each window call.
  expect(pass(oneObject([[start(), callOf("house")]], [win, fnOf("house", [callOf("win"), moveX("100"), callOf("win")])]))).toBe(true);
  const message = (raw: string) => checkProgrammingMission("windows", raw).message;
  const outsideSquare = [node("start_drawing", null), loopOf(number("4"), [forward(number("50")), turn(node("angle", "90"))])];
  expect(message(oneObject([[start(), callOf("win"), callOf("win"), moveX("100"), ...outsideSquare]], [win]))).toContain("함수 밖에서");
  expect(message(oneObject([[start(), callOf("win")]], [win]))).toContain("한 번 더 불러");
  expect(message(oneObject([[start(), callOf("win"), moveX("50"), callOf("win")]], [win]))).toContain("더 멀리");
  // A call to a deleted function is dropped like Entry does, leaving one call.
  expect(message(oneObject([[start(), callOf("win"), moveX("100"), callOf("gone")]], [win]))).toContain("한 번 더 불러");
  expect(message(oneObject([[start(), callOf("again")]], [fnOf("again", [callOf("again")])]))).toContain("자기 자신");
});

test("고양이 걸음은 두 방향키가 같은 함수 안에서 모양을 바꿔야 통과한다", () => {
  const step = fnOf("step", [node("change_to_next_shape", "next", null)]);
  const check = (threads: EntryNode[][], functions: ProgramFunction[]) => checkProgrammingMission("cat-walk", oneObject(threads, functions, CAT));
  expect(check([keyLine("39", moveX("10"), callOf("step")), keyLine("37", moveX("-10"), callOf("step"))], [step]).passed).toBe(true);
  expect(check([keyLine("39", callOf("right")), keyLine("37", moveX("-10"), callOf("step"))], [step, fnOf("right", [moveX("10"), callOf("step")])]).passed).toBe(true);
  expect(check([keyLine("39", moveX("10"), node("change_to_next_shape", "next", null)), keyLine("37", moveX("-10"), callOf("step"))], [step]).message).toContain("함수 안으로");
  expect(check([keyLine("39", moveX("10"), callOf("step")), keyLine("37", moveX("-10"), callOf("other"))], [step, fnOf("other", [node("change_to_next_shape", "next", null)])]).message).toContain("같은");
  expect(check([keyLine("39", moveX("10"), callOf("step")), keyLine("37", moveX("10"), callOf("step"))], [step]).passed).toBe(false);
});

// The broken-shapes starter with both bugs fixed: the pentagon turns 72° and the hexagon is called.
function repairedShapes() {
  const p = parseProgrammingProject(missionStarter("fix-shapes"))!, [, pentagon, hexagon] = p.functions;
  return buildProgrammingProject(undefined, [{ ...p.added[0], threads: [[...p.added[0].threads[0], callOf(hexagon.id)]] }], -1, false, [], p.functions.map((f) => f === pentagon ? { ...f, body: penBody(5) } : f));
}

test("고장 난 도형 시작 작품은 오각형 90°와 육각형 호출 누락만 고치면 통과한다", () => {
  const starter = missionStarter("fix-shapes");
  expect(checkProgrammingMission("fix-shapes", starter).passed).toBe(false);
  const p = parseProgrammingProject(starter)!;
  expect(p.functions.map((f) => f.name)).toEqual(["사각형 그리기", "오각형 그리기", "육각형 그리기"]);
  expect(p.bytes).toBeLessThan(MAX_PROJECT_BYTES / 4);
  const pentagon = p.functions[1], hexagon = p.functions[2];
  const fixed = p.functions.map((f) => f === pentagon ? { ...f, body: penBody(5) } : f);
  const main = p.added[0].threads[0];
  expect(main.filter((n) => functionCallId(n.type))).toHaveLength(2);
  const repaired = buildProgrammingProject(undefined, [{ ...p.added[0], threads: [[...main, callOf(hexagon.id)]] }], -1, false, [], fixed);
  expect(checkProgrammingMission("fix-shapes", repaired).passed).toBe(true);
  // Fixing only one of the two bugs is not enough.
  expect(checkProgrammingMission("fix-shapes", buildProgrammingProject(undefined, [{ ...p.added[0], threads: [[...main, callOf(hexagon.id)]] }], -1, false, [], p.functions)).passed).toBe(false);
});

test("꽃 피우기는 반복 안에서 부른 같은 함수가 60°씩 돌아간 정사각형 여섯 개를 그려야 통과한다", () => {
  const petal = fnOf("petal", penBody(4));
  const pass = (threads: EntryNode[][], functions: ProgramFunction[]) => checkProgrammingMission("flower", oneObject(threads, functions)).passed;
  const bloom = [loopOf(number("6"), [callOf("petal"), turn(node("angle", "60"))])];
  expect(pass([[start(), ...bloom]], [petal])).toBe(true);
  expect(pass([[start(), callOf("bloom")]], [petal, fnOf("bloom", bloom)])).toBe(true);
  expect(pass([[start(), ...Array.from({ length: 6 }, () => [callOf("petal"), turn(node("angle", "60"))]).flat()]], [petal])).toBe(false);
  expect(pass([[start(), loopOf(number("6"), [callOf("petal"), turn(node("angle", "45"))])]], [petal])).toBe(false);
});

test("QA: 창문이 닿는지는 오브젝트의 저장된 방향으로 그린 모양으로 판단한다", () => {
  const win = fnOf("win", penBody(4));
  // Turned 45°, a side-50 square is a diamond about 70.7 wide: 60 apart they cross, 100 apart they do not.
  const turned = (gap: string) => buildProgrammingProject(undefined, [{ ...newAddedObject(ENTRYBOT_SPRITE, 0, true)!, id: "actor", threads: [[start(), callOf("win"), moveX(gap), callOf("win")]], entity: { ...newAddedObject(ENTRYBOT_SPRITE, 0, true)!.entity, direction: 45 } }], -1, false, [], [win]);
  expect(checkProgrammingMission("windows", turned("60")).passed).toBe(false);
  expect(checkProgrammingMission("windows", turned("100")).passed).toBe(true);
});

test("QA: 고양이 걸음은 방향키 줄을 가진 오브젝트를 채점하고 다른 키의 꾸미기 줄은 무시한다", () => {
  const step = fnOf("step", [node("change_to_next_shape", "next", null)]);
  const decoration = { ...newAddedObject("e667cf0989776a4d6c183825d", 0, true)!, id: "deco", threads: [keyLine("32", node("change_to_next_shape", "next", null))] };
  const cat = { ...newAddedObject(CAT, 1, true)!, id: "cat", threads: [keyLine("39", moveX("10"), callOf("step")), keyLine("37", moveX("-10"), callOf("step"))] };
  expect(checkProgrammingMission("cat-walk", buildProgrammingProject(undefined, [decoration, cat], -1, false, [], [step])).passed).toBe(true);
});

test("QA: 객체 원형 이름과 겹치는 함수 id는 읽지 않는다", () => {
  for (const id of ["__proto__", "constructor", "toString"]) {
    const raw = withFunctionEdit((p, fn) => {
      fn.id = id;
      p.objects[0].script = p.objects[0].script.replaceAll("func_win1", `func_${id}`);
    });
    expect(parseProgrammingProject(raw), id).toBeNull();
  }
});

test("QA: 이름 칸을 비운 함수는 기본 이름 ‘함수’로 읽는다", () => {
  const blank = withFunctionEdit((_, __, head) => { head.params[0].params[0] = "  "; });
  expect(parseProgrammingProject(blank)!.functions[0].name).toBe("함수");
});

test("QA: 고장 난 도형 미션은 이미 있는 함수를 여는 방법을 알려 준다", () => {
  expect(missionById("fix-shapes")!.tip).toContain("두 번");
});

test("QA2: 고양이 걸음은 고양이의 저장된 방향으로 움직임을 판단한다", () => {
  const step = fnOf("step", [node("change_to_next_shape", "next", null)]);
  const cat = (direction: number) => buildProgrammingProject(undefined, [{ ...newAddedObject(CAT, 0, true)!, id: "cat", threads: [keyLine("39", forward(number("10")), callOf("step")), keyLine("37", forward(number("-10")), callOf("step"))], entity: { ...newAddedObject(CAT, 0, true)!.entity, direction } }], -1, false, [], [step]);
  expect(checkProgrammingMission("cat-walk", cat(90)).passed).toBe(true);
  // Facing 45°, Entry moves the cat diagonally, about 7.07 on each axis.
  expect(checkProgrammingMission("cat-walk", cat(45)).passed).toBe(false);
});

test("QA2: 회전 방식이 자유가 아니면 ‘방향 회전’은 그리는 방향을 바꾸지 않는다", () => {
  const spinning = fnOf("win", [node("start_drawing", null), loopOf(number("4"), [forward(number("50")), turn(node("angle", "90"), "rotate_relative")]), node("stop_drawing", null)]);
  const windowsWith = (rotateMethod: AddedObject["rotateMethod"]) => buildProgrammingProject(undefined, [{ ...newAddedObject(ENTRYBOT_SPRITE, 0, true)!, id: "actor", rotateMethod, threads: [[start(), callOf("win"), moveX("100"), callOf("win")]] }], -1, false, [], [spinning]);
  expect(checkProgrammingMission("windows", windowsWith("free")).passed).toBe(true);
  expect(checkProgrammingMission("windows", windowsWith("none")).passed).toBe(false);
  expect(checkProgrammingMission("windows", windowsWith("vertical")).passed).toBe(false);
});

test("QA2: func_로 시작하는 함수 id는 읽지 않는다", () => {
  const raw = withFunctionEdit((p, fn) => { fn.id = "func_a"; p.objects[0].script = p.objects[0].script.replaceAll("func_win1", "func_func_a"); });
  expect(parseProgrammingProject(raw)).toBeNull();
});


test("벽돌 깨기 4개 미션은 시작 작품 구조·변수·채점 조건을 정확히 검사한다", () => {
  for (const id of ["paddle", "ball", "brick", "brick-bounce"]) {
    const starter = missionStarter(id);
    const parsed = parseProgrammingProject(starter)!;
    expect(parsed.free, id).toBe(true);
    expect(new Set(parsed.added.map((o) => o.id)), id).toEqual(new Set(["paddle", "ball", "brick1", "brick2", "brick3", "youwin"]));
    expect(parsed.variables.map((v) => [v.id, v.name, v.value]), id).toEqual([["score", "점수", 0]]);
    expect(checkProgrammingMission(id, starter).passed, id).toBe(false);
    expect(parsed.added.find((o) => o.id === "ball")!.entity.direction, id).toBe(160);
    expect(parsed.added.find((o) => o.id === "youwin")!.entity.visible, id).toBe(false);
  }
  expect(JSON.stringify(parseProgrammingProject(missionStarter("brick"))!.added.find((o) => o.id === "youwin")!.threads)).toContain('"99"');
  expect(parseProgrammingProject(missionStarter("ball"))!.functions.map((f) => f.name)).toEqual(["막대에서 튕기기"]);
  const withObjectThreads = (missionId: string, objectId: string, threads: EntryNode[][]) => {
    const p = parseProgrammingProject(missionStarter(missionId))!;
    return buildProgrammingProject(undefined, p.added.map((o) => o.id === objectId ? { ...o, threads } : o), -1, false, p.variables, p.functions);
  };
  const mouseX = () => node("coordinate_mouse", null, "x", null);
  const mouseY = () => node("coordinate_mouse", null, "y", null);
  expect(checkProgrammingMission("paddle", BRICK_SOLUTIONS.paddle).passed).toBe(true);
  expect(checkProgrammingMission("paddle", withObjectThreads("paddle", "paddle", [[start(), node("locate_x", mouseX(), null)]])).passed).toBe(false);
  expect(checkProgrammingMission("paddle", withObjectThreads("paddle", "paddle", [[start(), forever([node("locate_x", number("10"), null)])]])).passed).toBe(false);
  expect(checkProgrammingMission("paddle", withObjectThreads("paddle", "paddle", [[start(), forever([node("locate_x", mouseY(), null)])]])).passed).toBe(false);
  expect(checkProgrammingMission("paddle", withObjectThreads("paddle", "paddle", [[start(), forever([node("locate_xy", mouseX(), mouseY(), null)])]])).passed).toBe(false);
  expect(missionBlockIssue("paddle", withObjectThreads("paddle", "paddle", [[start(), forever([node("move_x", number("10"), null)])]]))).toContain("대신 ‘x: ( ) 위치로 이동하기’");

  expect(checkProgrammingMission("ball", BRICK_SOLUTIONS.ball).passed).toBe(true);
  const touch = (target: string) => node("reach_something", null, target, null);
  const stopAll = () => node("stop_object", "all", null);
  expect(checkProgrammingMission("ball", withObjectThreads("ball", "ball", [[node("when_object_click", null), forever([forward(number("10")), node("bounce_wall", null), when(touch("paddle"), [turn(node("angle", "180"))]), when(touch("wall_down"), [stopAll()])])]])).passed).toBe(true);
  expect(checkProgrammingMission("ball", withObjectThreads("ball", "ball", [[start(), forever([forward(number("10")), when(touch("paddle"), [turn(node("angle", "90"))]), when(touch("wall_down"), [stopAll()])])]])).passed).toBe(false);
  expect(checkProgrammingMission("ball", withObjectThreads("ball", "ball", [[start(), forever([forward(number("10")), node("bounce_wall", null), turn(node("angle", "90")), when(touch("wall_down"), [stopAll()])])]])).passed).toBe(false);
  expect(checkProgrammingMission("ball", withObjectThreads("ball", "ball", [[start(), forever([forward(number("10")), node("bounce_wall", null), when(touch("paddle"), [turn(node("angle", "90"))]), when(touch("wall_up"), [stopAll()])])]])).passed).toBe(false);

  expect(checkProgrammingMission("brick", BRICK_SOLUTIONS.brick).passed).toBe(true);
  const addScore = () => node("change_variable", "score", number("1"), null);
  const hide = () => node("hide", null);
  const scoreEq = (op: string, val: string) => compare(node("get_variable", "score"), op, number(val));
  // A win check nested in brick1's touch check only fires when brick1 breaks last, so it does not meet the mission.
  expect(checkProgrammingMission("brick", withObjectThreads("brick", "brick1", [[start(), forever([when(touch("ball"), [addScore(), hide(), when(scoreEq("EQUAL", "3"), [speak("You win!"), stopAll()])])])]])).passed).toBe(false);
  expect(checkProgrammingMission("brick", withObjectThreads("brick", "brick1", [[start(), forever([when(touch("ball"), [addScore(), hide()])])]])).passed, "You win! still says 99").toBe(false);
  const winAt = (target: string) => [[start(), forever([when(scoreEq("EQUAL", "3"), [node("show", null), node("stop_object", target, null)])])]];
  // The teacher's own brick stops its line after hiding, and that must still pass.
  expect(checkProgrammingMission("brick", withBrickObjects("brick", { brick1: [[start(), forever([when(touch("ball"), [addScore(), hide(), node("stop_object", "thisThread", null)])])]], youwin: winAt("all") })).passed, "brick stops its own line").toBe(true);
  for (const target of ["thisOnly", "thisThread", "otherThread", "other_objects"]) {
    expect(checkProgrammingMission("ball", withObjectThreads("ball", "ball", [[start(), forever([forward(number("3")), node("bounce_wall", null), when(touch("paddle"), [turn(node("angle", "90"))]), when(touch("wall_down"), [node("stop_object", target, null)])])]])).passed, target).toBe(false);
    expect(checkProgrammingMission("brick", withBrickObjects("brick", { brick1: [[start(), forever([when(touch("ball"), [addScore(), hide()])])]], youwin: winAt(target) })).passed, target).toBe(false);
  }
  expect(checkProgrammingMission("ball", withObjectThreads("ball", "ball", [[start(), forever([forward(number("3")), node("bounce_wall", null), when(touch("paddle"), [turn(node("angle", "90"))]), when(touch("wall_down"), [node("stop_repeat", null)])])]])).passed, "stop_repeat").toBe(false);
  expect(checkProgrammingMission("brick", withObjectThreads("brick", "brick1", [[start(), forever([when(touch("ball"), [addScore()]), when(scoreEq("EQUAL", "3"), [speak("성공!"), stopAll()])])]])).passed).toBe(false);
  expect(checkProgrammingMission("brick", withObjectThreads("brick", "brick1", [[start(), forever([when(touch("ball"), [addScore(), hide()]), when(scoreEq("GREATER", "3"), [speak("성공!"), stopAll()])])]])).passed).toBe(false);
  expect(checkProgrammingMission("brick", withObjectThreads("brick", "brick1", [[start(), forever([when(touch("ball"), [addScore(), hide()]), when(scoreEq("EQUAL", "1"), [speak("성공!"), stopAll()])])]])).passed).toBe(false);

  expect(checkProgrammingMission("brick-bounce", BRICK_SOLUTIONS["brick-bounce"]).passed).toBe(true);
  const onlyTwoBricks = [[start(), forever([forward(number("10")), node("bounce_wall", null), when(touch("paddle"), [turn(node("angle", "90"))]), when(touch("wall_down"), [stopAll()]), when(touch("brick1"), [turn(node("angle", "180"))]), when(touch("brick2"), [turn(node("angle", "180"))])])]];
  expect(checkProgrammingMission("brick-bounce", withObjectThreads("brick-bounce", "ball", onlyTwoBricks)).passed).toBe(false);
});
