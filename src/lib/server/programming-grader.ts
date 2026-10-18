import { missionBlockIssue, missionById, parseProgrammingProject, type EntryNode } from "../classroom/programming-entry";

// Server-side grading. Kept out of the client bundle so fixed test inputs are not shipped to students.
class MissionError extends Error {}

// Deterministic interpreter for this lesson's bounded, straight-line blocks.
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
    type Value = { value: string | number; input: boolean; computed?: number };
    const variables: Record<string, Value> = { "cs-A": { value: 0, input: false }, "cs-B": { value: 0, input: false } };
    let answer = "", asks = 0, x = 0, y = 0, direction = 90, speech = "", speaksInput = false, speechComputed: number | undefined;
    const number = (v: unknown) => { if (String(v).trim() === "" || !Number.isFinite(Number(v)) || Math.abs(Number(v)) > 1e6) throw new MissionError("실행할 숫자 입력을 확인해 주세요."); return Number(v); };
    function evaluate(n: EntryNode): Value {
      if (["text", "number", "angle"].includes(n.type)) return { value: n.params[0] as string | number, input: false };
      if (n.type === "get_canvas_input_value") return { value: answer, input: asks > 0 };
      if (n.type === "get_variable") return variables[String(n.params[0])];
      const left = evaluate(n.params[n.type === "combine_something" ? 1 : 0] as EntryNode), right = evaluate(n.params[n.type === "combine_something" ? 3 : 2] as EntryNode);
      if (n.type === "combine_something") return { value: String(left.value) + String(right.value), input: left.input || right.input, computed: left.computed === undefined ? right.computed : right.computed === undefined ? left.computed : undefined };
      const a = number(left.value), b = number(right.value);
      const result = n.params[1] === "PLUS" ? a + b : n.params[1] === "MINUS" ? a - b : n.params[1] === "MULTI" ? a * b : a / b;
      return { value: number(result), input: left.input || right.input, computed: left.input || right.input ? result : undefined };
    }
    for (const n of lines[0].slice(1)) {
      if (n.type === "ask_and_wait") { if (asks >= inputs.length) throw new MissionError("이번 목표에 필요한 질문을 차례로 연결해 주세요."); answer = inputs[asks++]; }
      else if (n.type === "set_variable") variables[String(n.params[0])] = evaluate(n.params[1] as EntryNode);
      else if (n.type === "dialog_time") { const value = evaluate(n.params[0] as EntryNode); const seconds = number(evaluate(n.params[1] as EntryNode).value); if (seconds < 0 || seconds > 10) throw new MissionError("말하기 시간은 0~10초로 정해 주세요."); if (n.params[2] === "speak") { speech = String(value.value); speaksInput = value.input; speechComputed = value.computed; } }
      else if (n.type === "direction_absolute") direction = number(evaluate(n.params[0] as EntryNode).value);
      else if (n.type === "move_direction") { const distance = number(evaluate(n.params[0] as EntryNode).value); x += Math.sin(direction * Math.PI / 180) * distance; y += Math.cos(direction * Math.PI / 180) * distance; }
      else throw new MissionError("시작 블록은 맨 위에 두고 동작을 아래로 연결해 주세요.");
    }
    return { variables, asks, x, y, speech, speaksInput, speechComputed };
  }
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
    else {
      const move = (signal: string, x: number, y: number) => { const r = run(signal, []); return Math.abs(r.x - x) < 0.0001 && Math.abs(r.y - y) < 0.0001; };
      // The keys mission grades only the four arrow keys; the carried-over start line is optional.
      passed = id === "move" ? move("click", 10, 0) : [["38", 0, 10], ["39", 10, 0], ["40", 0, -10], ["37", -10, 0]].every(([key, x, y]) => move(String(key), Number(x), Number(y)));
    }
    return passed ? { passed: true, message: "목표 조건을 확인했어요. 작품을 제출하면 이 미션이 완료돼요." } : fail(mission.hint);
  } catch (error) { return fail(error instanceof MissionError ? error.message : mission.hint); }
}
