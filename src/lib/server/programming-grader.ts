import { missionBlockIssue, missionById, parseProgrammingProject, type EntryNode } from "../classroom/programming-entry";

// Server-side grading. Kept out of the client bundle so fixed test inputs are not shipped to students.
class MissionError extends Error {}

// One run may evaluate at most this many blocks, keep this long a text and say this many lines.
const MAX_STEPS = 20_000, MAX_TEXT = 500, MAX_SPEECH = 50;
// Speech is compared without spaces and closing marks, so ‘불합격’ never counts as ‘합격’.
const spoken = (text: string) => text.replace(/[\s!.?~'"‘’“”]/g, "");

// Deterministic interpreter for the lessons' bounded blocks, following EntryJS 4.0.23 semantics.
// It never runs submitted JavaScript or accepts a client's claimed result.
export function checkProgrammingMission(id: string, raw: unknown): { passed: boolean; message: string } {
  const p = parseProgrammingProject(raw), mission = missionById(id);
  const fail = (message: string) => ({ passed: false, message });
  if (!p || !mission) return fail("작품을 읽지 못했어요. 입력한 블록은 유지하고 다시 확인해 주세요.");
  const issue = missionBlockIssue(id, raw);
  if (issue) return fail(issue);
  function run(signal: string, inputs: string[]) {
    const lines = p!.threads.filter((t) => signal === "click" ? t[0]?.type === "when_run_button_click" : t[0]?.type === "when_some_key_pressed" && t[0].params[1] === signal);
    if (lines.length !== 1) throw new MissionError("시작 신호마다 한 줄의 코드를 연결해 주세요.");
    type Value = { value: string | number | boolean; input: boolean; computed?: number };
    const variables: Record<string, Value> = { "cs-A": { value: 0, input: false }, "cs-B": { value: 0, input: false } };
    let answer = "", asks = 0, x = 0, y = 0, direction = 90, speech = "", speaksInput = false, speechComputed: number | undefined;
    let steps = 0, speeches = 0, usedOr = false;
    const step = () => { if (++steps > MAX_STEPS) throw new MissionError("실행이 너무 길어요. 반복이나 조건을 다시 확인해 주세요."); };
    const number = (v: unknown) => { if (String(v).trim() === "" || !Number.isFinite(Number(v)) || Math.abs(Number(v)) > 1e6) throw new MissionError("실행할 숫자 입력을 확인해 주세요."); return Number(v); };
    // EntryJS compares a non-empty numeric string as a number.
    const comparable = (v: string | number | boolean) => typeof v === "string" && v.length && !Number.isNaN(Number(v)) ? Number(v) : v;
    const usesAB = (n: unknown): boolean => !!n && typeof n === "object" && ((n as EntryNode).type === "get_variable" && ["cs-A", "cs-B"].includes(String((n as EntryNode).params[0])) || (n as EntryNode).params.some(usesAB));
    function evaluate(n: EntryNode): Value {
      step();
      if (["text", "number", "angle"].includes(n.type)) return { value: n.params[0] as string | number, input: false };
      if (n.type === "True" || n.type === "False") return { value: n.type === "True", input: false };
      if (n.type === "get_canvas_input_value") return { value: answer, input: asks > 0 };
      if (n.type === "get_variable") return variables[String(n.params[0])];
      if (n.type === "boolean_not") return { value: !evaluate(n.params[1] as EntryNode).value, input: false };
      if (n.type === "quotient_and_mod") {
        const a = number(evaluate(n.params[1] as EntryNode).value), b = number(evaluate(n.params[3] as EntryNode).value);
        if (b === 0) throw new MissionError("0으로 나눌 수 없어요.");
        return { value: n.params[5] === "QUOTIENT" ? Math.floor(a / b) : a - b * Math.floor(a / b), input: false };
      }
      const left = evaluate(n.params[n.type === "combine_something" ? 1 : 0] as EntryNode), right = evaluate(n.params[n.type === "combine_something" ? 3 : 2] as EntryNode);
      if (n.type === "combine_something") {
        const text = String(left.value) + String(right.value);
        if (text.length > MAX_TEXT) throw new MissionError("글자가 너무 길어요.");
        return { value: text, input: left.input || right.input, computed: left.computed === undefined ? right.computed : right.computed === undefined ? left.computed : undefined };
      }
      if (n.type === "boolean_and_or") {
        if (n.params[1] === "OR" && usesAB(n)) usedOr = true;
        return { value: n.params[1] === "OR" ? Boolean(left.value) || Boolean(right.value) : Boolean(left.value) && Boolean(right.value), input: false };
      }
      if (n.type === "boolean_basic_operator") {
        const a = comparable(left.value), b = comparable(right.value);
        const result = ({ EQUAL: a === b, NOT_EQUAL: a != b, GREATER: a > b, LESS: a < b, GREATER_OR_EQUAL: a >= b, LESS_OR_EQUAL: a <= b } as Record<string, boolean>)[String(n.params[1])];
        if (result === undefined) throw new MissionError("비교 기호를 확인해 주세요.");
        return { value: result, input: false };
      }
      const a = number(left.value), b = number(right.value);
      const result = n.params[1] === "PLUS" ? a + b : n.params[1] === "MINUS" ? a - b : n.params[1] === "MULTI" ? a * b : a / b;
      return { value: number(result), input: left.input || right.input, computed: left.input || right.input ? result : undefined };
    }
    const say = (value: Value) => {
      if (++speeches > MAX_SPEECH) throw new MissionError("말하기가 너무 많아요.");
      speech = String(value.value); speaksInput = value.input; speechComputed = value.computed;
    };
    function exec(list: EntryNode[]) {
      for (const n of list) {
        step();
        if (n.type === "ask_and_wait") { if (asks >= inputs.length) throw new MissionError("이번 목표에 필요한 질문을 차례로 연결해 주세요."); answer = inputs[asks++]; }
        else if (n.type === "set_variable") variables[String(n.params[0])] = evaluate(n.params[1] as EntryNode);
        else if (n.type === "dialog_time") { const value = evaluate(n.params[0] as EntryNode); const seconds = number(evaluate(n.params[1] as EntryNode).value); if (seconds < 0 || seconds > 10) throw new MissionError("말하기 시간은 0~10초로 정해 주세요."); if (n.params[2] === "speak") say(value); }
        else if (n.type === "dialog") { const value = evaluate(n.params[0] as EntryNode); if (n.params[1] !== "think") say(value); }
        else if (n.type === "_if") { if (evaluate(n.params[0] as EntryNode).value) exec(n.statements?.[0] ?? []); }
        else if (n.type === "if_else") exec(n.statements?.[evaluate(n.params[0] as EntryNode).value ? 0 : 1] ?? []);
        else if (n.type === "direction_absolute") direction = number(evaluate(n.params[0] as EntryNode).value);
        else if (n.type === "move_direction") { const distance = number(evaluate(n.params[0] as EntryNode).value); x += Math.sin(direction * Math.PI / 180) * distance; y += Math.cos(direction * Math.PI / 180) * distance; }
        else throw new MissionError("시작 블록은 맨 위에 두고 동작을 아래로 연결해 주세요.");
      }
    }
    exec(lines[0].slice(1));
    return { variables, asks, x, y, speech, speaksInput, speechComputed, usedOr };
  }
  // Every case asks once and must say exactly the expected words.
  const says = (cases: [number, string][]) => cases.every(([input, expected]) => { const r = run("click", [String(input)]); return r.asks === 1 && spoken(r.speech) === spoken(expected); });
  try {
    let passed: boolean;
    if (id === "name") passed = ["초코", "보리"].every((value) => { const r = run("click", [value]); return r.asks === 1 && r.speaksInput && r.speech.includes(value); });
    else if (id === "multiply" || id === "average") passed = [[6, 4], [3, 7], [-2, 5], [0, 9]].every(([a, b]) => {
      const r = run("click", [String(a), String(b)]), expected = id === "multiply" ? a * b : (a + b) / 2;
      const values = r.speech.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      // A and B must hold the two inputs, in either order: asking for B first is also correct.
      const stored = [Number(r.variables["cs-A"].value), Number(r.variables["cs-B"].value)];
      const inOrder = stored[0] === a && stored[1] === b, swapped = stored[0] === b && stored[1] === a;
      return r.asks === 2 && r.variables["cs-A"].input && r.variables["cs-B"].input && (inOrder || swapped) && r.speechComputed !== undefined && Math.abs(r.speechComputed - expected) < 0.0001 && values.some((v) => Math.abs(v - expected) < 0.0001);
    });
    else if (id === "pass") passed = says([59, 60, 100, 0, 61, 35].map((score) => [score, score >= 60 ? "합격" : "불합격"]));
    else if (id === "freethrow") passed = says([9, 8, 7, 5, 4, 10, 6, 0, 2].map((count) => [count, count >= 8 ? "훌륭해요!" : count >= 5 ? "잘했어요!" : "더 연습해 보자!"]));
    else if (id === "escape") passed = [[1, 1], [1, 0], [0, 1], [0, 0]].every(([a, b]) => {
      const r = run("click", [String(a), String(b)]);
      const stored = [Number(r.variables["cs-A"].value), Number(r.variables["cs-B"].value)];
      return r.asks === 2 && (stored[0] === a && stored[1] === b || stored[0] === b && stored[1] === a) && r.usedOr && spoken(r.speech) === spoken(a || b ? "탈출 성공!" : "탈출 실패");
    });
    else if (id === "move" || id === "keys") {
      const move = (signal: string, x: number, y: number) => { const r = run(signal, []); return Math.abs(r.x - x) < 0.0001 && Math.abs(r.y - y) < 0.0001; };
      // The keys mission grades only the four arrow keys; the carried-over start line is optional.
      passed = id === "move" ? move("click", 10, 0) : [["38", 0, 10], ["39", 10, 0], ["40", 0, -10], ["37", -10, 0]].every(([key, x, y]) => move(String(key), Number(x), Number(y)));
    }
    // A mission without its own rule never passes.
    else passed = false;
    return passed ? { passed: true, message: "목표 조건을 확인했어요. 작품을 제출하면 이 미션이 완료돼요." } : fail(mission.hint);
  } catch (error) { return fail(error instanceof MissionError ? error.message : mission.hint); }
}
