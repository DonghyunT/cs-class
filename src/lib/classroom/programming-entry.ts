import { buildNameProject } from "../prototype/name-entry";

export const programmingMissions = [
  { id: "name", title: "강아지 이름 짓기", goal: "이름을 묻고, 입력한 이름을 말하게 해주세요.", hint: "질문 다음에 말하기를 연결하고, 말하기 안에 ‘대답’을 넣어 보세요.", experiment: "초코와 보리처럼 서로 다른 이름으로 두 번 실행해 보세요." },
  { id: "multiply", title: "곱셈 계산기", goal: "두 수를 A와 B에 기억하고, 두 수의 곱을 말하게 해주세요.", hint: "첫 질문의 대답을 A에 저장한 뒤 두 번째 수를 물어보세요. B를 물으면 ‘대답’이 바뀌어요.", experiment: "6과 4, 3과 7을 입력해 보세요. 입력을 바꾸면 결과도 달라지나요?" },
  { id: "move", title: "시작 버튼으로 움직이기", goal: "시작하기 버튼을 누르면 강아지가 오른쪽으로 10만큼 움직이게 해주세요.", hint: "시작하기 아래에 이동 블록을 연결해 보세요. 오른쪽 방향은 90°예요.", experiment: "실행 → 중지 → 다시 실행해 보세요. 시작 위치와 이동 결과를 비교해요." },
  { id: "keys", title: "방향키로 움직임 개선", goal: "앞 작품에 코드를 더해, 네 방향키로 강아지를 각 방향으로 10만큼 움직이게 해주세요.", hint: "‘키를 눌렀을 때’ 아래에 방향을 정하고 움직여요. 위 0°·오른쪽 90°·아래 180°·왼쪽 270°예요.", experiment: "실행 후 무대를 클릭하고 네 방향키를 눌러 보세요. 기존 시작 버튼의 움직임도 남겨주세요." },
  { id: "average", title: "도전 · 평균 계산기", goal: "두 수를 입력받아 (A + B) ÷ 2를 말하게 해주세요.", hint: "덧셈 블록을 나눗셈 블록 안에 넣어, 두 수를 먼저 더한 뒤 2로 나눠요.", experiment: "6과 4의 평균은 5예요. -2와 5를 넣으면 어떻게 될까요?", optional: true },
] as const;
export type ProgrammingMission = (typeof programmingMissions)[number];
export type EntryNode = { id?: string; type: string; params: unknown[]; x?: number; y?: number };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export const missionById = (id: string) => programmingMissions.find((m) => m.id === id);

export function buildProgrammingProject(threads?: EntryNode[][]): string {
  const p = JSON.parse(buildNameProject()!);
  p.variables.push(...["A", "B"].map((name, i) => ({ id: `cs-${name}`, name, variableType: "variable", value: 0, visible: false, x: -210, y: 130 - i * 30, object: null, isCloud: false, isRealTime: false })));
  if (threads) p.objects[0].script = threads;
  return JSON.stringify(p);
}

// The editor's media, objects and variables are fixed. Preserve incomplete
// literal inputs here; validity for execution is checked separately below.
export function parseProgrammingProject(raw: unknown): { project: Record<string, unknown>; key: string; threads: EntryNode[][]; order: string[] } | null {
  if (typeof raw !== "string" || raw.length > 80_000) return null;
  try {
    const p = JSON.parse(raw);
    if (!object(p) || !Array.isArray(p.objects) || p.objects.length !== 1 || !object(p.objects[0])) return null;
    const script = typeof p.objects[0].script === "string" ? JSON.parse(p.objects[0].script) : p.objects[0].script;
    if (!Array.isArray(script) || script.length > 16) return null;
    let count = 0;
    function clean(value: unknown, expression = false, depth = 0): EntryNode {
      if (!object(value) || typeof value.type !== "string" || !Array.isArray(value.params) || ++count > 160 || depth > 8) throw Error();
      const { type, params } = value;
      const expr = (v: unknown) => clean(v, true, depth + 1);
      let next: unknown[];
      if (expression && ["text", "number", "angle"].includes(type) && ["string", "number"].includes(typeof params[0]) && String(params[0]).length <= 180) next = [params[0]];
      else if (expression && type === "get_canvas_input_value") next = [null];
      else if (expression && type === "get_variable" && ["cs-A", "cs-B"].includes(String(params[0]))) next = [params[0]];
      else if (expression && type === "combine_something") next = [null, expr(params[1]), null, expr(params[3]), null];
      else if (expression && type === "calc_basic" && ["PLUS", "MINUS", "MULTI", "DIVIDE"].includes(String(params[1]))) next = [expr(params[0]), params[1], expr(params[2])];
      else if (!expression && type === "when_run_button_click") next = [null];
      else if (!expression && type === "when_some_key_pressed" && /^\d{1,3}$/.test(String(params[1])) && Number(params[1]) <= 255) next = [null, String(params[1])];
      else if (!expression && type === "ask_and_wait") next = [expr(params[0]), null];
      else if (!expression && type === "set_variable" && ["cs-A", "cs-B"].includes(String(params[0]))) next = [params[0], expr(params[1]), null];
      else if (!expression && ["move_direction", "direction_absolute"].includes(type)) next = [expr(params[0]), null];
      else if (!expression && type === "dialog_time" && ["speak", "think"].includes(String(params[2]))) next = [expr(params[0]), expr(params[1]), params[2], null];
      else throw Error();
      return { type, params: next, ...(typeof value.id === "string" && /^[\w-]{1,80}$/.test(value.id) ? { id: value.id } : {}), ...(typeof value.x === "number" && Number.isFinite(value.x) ? { x: Math.max(-2000, Math.min(2000, value.x)) } : {}), ...(typeof value.y === "number" && Number.isFinite(value.y) ? { y: Math.max(-2000, Math.min(2000, value.y)) } : {}) };
    }
    const reporters = ["text", "number", "angle", "get_canvas_input_value", "get_variable", "combine_something", "calc_basic"];
    const threads: EntryNode[][] = script.map((t: unknown) => { if (!Array.isArray(t) || t.length > 40) throw Error(); return t.map((n) => clean(n, object(n) && reporters.includes(String(n.type)))); });
    const semantic = (n: EntryNode): unknown => ({ type: n.type, params: n.params.map((v) => object(v) && typeof v.type === "string" ? semantic(v as EntryNode) : v) });
    const project = JSON.parse(buildProgrammingProject(threads));
    return { project, threads, order: threads.flat().map((n) => n.type), key: JSON.stringify(threads.map((t) => t.map(semantic))) };
  } catch { return null; }
}

export function programmingProjectMatches(a: unknown, b: unknown) {
  const current = parseProgrammingProject(a), saved = parseProgrammingProject(b);
  return !!current && !!saved && current.key === saved.key;
}

export function programmingProjectLines(raw: unknown): string[] {
  const expression = (n: EntryNode): string => n.type === "get_canvas_input_value" ? "대답" : n.type === "get_variable" ? String(n.params[0]).replace("cs-", "변수 ") : n.type === "combine_something" ? `${expression(n.params[1] as EntryNode)} + ${expression(n.params[3] as EntryNode)}` : n.type === "calc_basic" ? `(${expression(n.params[0] as EntryNode)} ${({ PLUS: "+", MINUS: "−", MULTI: "×", DIVIDE: "÷" })[n.params[1] as "PLUS"]} ${expression(n.params[2] as EntryNode)})` : String(n.params[0]);
  return parseProgrammingProject(raw)?.threads.flatMap((thread) => thread.map((n) => {
    if (n.type === "when_run_button_click") return "시작하기 버튼을 클릭했을 때";
    if (n.type === "when_some_key_pressed") return `${({ "37": "왼쪽", "38": "위쪽", "39": "오른쪽", "40": "아래쪽" })[n.params[1] as "37"] ?? `${n.params[1]}번`} 키를 눌렀을 때`;
    if (n.type === "ask_and_wait") return `${expression(n.params[0] as EntryNode)} · 묻고 대답 기다리기`;
    if (n.type === "set_variable") return `${String(n.params[0]).replace("cs-", "변수 ")}에 ${expression(n.params[1] as EntryNode)} 저장하기`;
    if (n.type === "dialog_time") return `${expression(n.params[0] as EntryNode)} · ${expression(n.params[1] as EntryNode)}초 동안 ${n.params[2] === "speak" ? "말하기" : "생각하기"}`;
    if (n.type === "direction_absolute") return `이동 방향을 ${expression(n.params[0] as EntryNode)}°로 정하기`;
    if (n.type === "move_direction") return `이동 방향으로 ${expression(n.params[0] as EntryNode)}만큼 움직이기`;
    return `${expression(n)} · 아직 연결하지 않은 블록`;
  })) ?? ["작품을 읽지 못했어요. 저장된 원문은 보존돼요."];
}

// Deterministic interpreter for this lesson's bounded, straight-line blocks.
// It never runs submitted JavaScript or accepts a client's claimed result.
export function checkProgrammingMission(id: string, raw: unknown): { passed: boolean; message: string } {
  const p = parseProgrammingProject(raw), mission = missionById(id);
  const fail = (message: string) => ({ passed: false, message });
  if (!p || !mission) return fail("작품을 읽지 못했어요. 입력한 블록은 유지하고 다시 확인해 주세요.");
  function run(signal: string, inputs: string[]) {
    const lines = p!.threads.filter((t) => signal === "click" ? t[0]?.type === "when_run_button_click" : t[0]?.type === "when_some_key_pressed" && t[0].params[1] === signal);
    if (lines.length !== 1) throw Error("시작 신호마다 한 줄의 코드를 연결해 주세요.");
    type Value = { value: string | number; input: boolean; computed?: number };
    const variables: Record<string, Value> = { "cs-A": { value: 0, input: false }, "cs-B": { value: 0, input: false } };
    let answer = "", asks = 0, x = 0, y = 0, direction = 90, speech = "", speaksInput = false, speechComputed: number | undefined;
    const number = (v: unknown) => { if (String(v).trim() === "" || !Number.isFinite(Number(v)) || Math.abs(Number(v)) > 1e6) throw Error("실행할 숫자 입력을 확인해 주세요."); return Number(v); };
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
      if (n.type === "ask_and_wait") { if (asks >= inputs.length) throw Error("이번 목표에 필요한 질문을 차례로 연결해 주세요."); answer = inputs[asks++]; }
      else if (n.type === "set_variable") variables[String(n.params[0])] = evaluate(n.params[1] as EntryNode);
      else if (n.type === "dialog_time") { const value = evaluate(n.params[0] as EntryNode); const seconds = number(evaluate(n.params[1] as EntryNode).value); if (seconds < 0 || seconds > 10) throw Error("말하기 시간은 0~10초로 정해 주세요."); if (n.params[2] === "speak") { speech = String(value.value); speaksInput = value.input; speechComputed = value.computed; } }
      else if (n.type === "direction_absolute") direction = number(evaluate(n.params[0] as EntryNode).value);
      else if (n.type === "move_direction") { const distance = number(evaluate(n.params[0] as EntryNode).value); x += Math.sin(direction * Math.PI / 180) * distance; y += Math.cos(direction * Math.PI / 180) * distance; }
      else throw Error("시작 블록은 맨 위에 두고 동작을 아래로 연결해 주세요.");
    }
    return { variables, asks, x, y, speech, speaksInput, speechComputed };
  }
  try {
    let passed: boolean;
    if (id === "name") passed = ["초코", "보리"].every((value) => { const r = run("click", [value]); return r.asks === 1 && r.speaksInput && r.speech.includes(value); });
    else if (id === "multiply" || id === "average") passed = [[6, 4], [3, 7], [-2, 5], [0, 9]].every(([a, b]) => {
      const r = run("click", [String(a), String(b)]), expected = id === "multiply" ? a * b : (a + b) / 2;
      const values = r.speech.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      return r.asks === 2 && r.variables["cs-A"].input && r.variables["cs-B"].input && Number(r.variables["cs-A"].value) === a && Number(r.variables["cs-B"].value) === b && r.speechComputed !== undefined && Math.abs(r.speechComputed - expected) < 0.0001 && values.some((v) => Math.abs(v - expected) < 0.0001);
    });
    else {
      const move = (signal: string, x: number, y: number) => { const r = run(signal, []); return Math.abs(r.x - x) < 0.0001 && Math.abs(r.y - y) < 0.0001; };
      passed = move("click", 10, 0) && (id === "move" || [["38", 0, 10], ["39", 10, 0], ["40", 0, -10], ["37", -10, 0]].every(([key, x, y]) => move(String(key), Number(x), Number(y))));
    }
    return passed ? { passed: true, message: "목표 조건을 확인했어요. 작품을 제출하면 이 미션이 완료돼요." } : fail(mission.hint);
  } catch (error) { return fail(error instanceof Error ? error.message : mission.hint); }
}
