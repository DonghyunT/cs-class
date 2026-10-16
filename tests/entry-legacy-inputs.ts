import { buildProgrammingProject, type EntryNode } from "../src/lib/classroom/programming-entry";

// Projects that only use the blocks the lesson supported before the full palette.
// Their parsed key, order and normalized project are frozen in
// fixtures/entry-legacy-keys.json so saved validations and submissions keep matching.
const node = (type: string, ...params: unknown[]): EntryNode => ({ type, params });
const number = (v: string | number) => node("number", String(v));
const answer = () => node("get_canvas_input_value", null);
const variable = (id: string) => node("get_variable", `cs-${id}`);
const start = () => node("when_run_button_click", null);
const ask = (text = "숫자는?") => node("ask_and_wait", node("text", text), null);
const say = (value: EntryNode) => node("dialog_time", value, number(0.2), "speak", null);
const movement = (direction: number, amount = "10") => [node("direction_absolute", node("angle", String(direction)), null), node("move_direction", number(amount), null)];
const math = (average = false) => [[start(), ask(), node("set_variable", "cs-A", answer(), null), ask(), node("set_variable", "cs-B", answer(), null), say(average ? node("calc_basic", node("calc_basic", variable("A"), "PLUS", variable("B")), "DIVIDE", number(2)) : node("calc_basic", variable("A"), "MULTI", variable("B")))]];

// EntryJS 4.0.23 adds these fields to every exported block, including `statements: []`.
const meta = { movable: null, deletable: 1, emphasized: false, readOnly: null, copyable: true, assemble: true, extensions: [] };
function exported(value: EntryNode, index: number): Record<string, unknown> {
  return {
    id: `b${index}${value.type.length}`, x: 0, y: 0, ...value, statements: [], ...meta,
    params: value.params.map((param, i) => param && typeof param === "object" && "type" in param ? exported(param as EntryNode, index * 10 + i) : param),
  };
}
function asExported(threads: EntryNode[][]) {
  const project = JSON.parse(buildProgrammingProject(threads));
  project.objects[0].script = JSON.stringify(threads.map((thread, t) => thread.map((block, i) => ({ ...exported(block, t * 100 + i), ...(i === 0 ? { x: 40, y: 50 + t * 90 } : {}) }))));
  return JSON.stringify(project);
}

const threads: Record<string, EntryNode[][]> = {
  name: [[start(), ask("이름은?"), say(node("combine_something", null, node("text", "내 이름은 "), null, answer(), null))]],
  multiply: math(),
  average: math(true),
  move: [[start(), ...movement(90)]],
  keys: [[start(), ...movement(90)], ...[["38", 0], ["39", 90], ["40", 180], ["37", 270]].map(([key, direction]) => [node("when_some_key_pressed", null, String(key)), ...movement(Number(direction))])],
  blank: [[start(), ...movement(90, "")], [variable("A")]],
  keyDraft: [[node("when_some_key_pressed", null, "81"), ...movement(90)]],
  loose: [[start(), say(answer())], [node("calc_basic", number(1), "PLUS", number(2))], [ask()]],
};

export const LEGACY_INPUTS: Record<string, string> = Object.fromEntries(Object.entries(threads).flatMap(([id, value]) => [
  [id, buildProgrammingProject(value)],
  [`${id}:exported`, asExported(value)],
]));
