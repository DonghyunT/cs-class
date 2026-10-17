import { buildEntryProject } from "./entry-project";

type NameBlock = { id: string; kind: "start" | "ask" | "store" | "say" | "calculate" | "direction" | "move"; value: string };

type Node = { id?: string; type: string; params: unknown[]; x?: number; y?: number };
export type NameStep = { kind: "ask" | "answer" | "say"; value: string };
export type NameRun = { id: string; key: string; reason: string; steps: NameStep[] };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (value: string): Node => ({ type: "text", params: [value] });
const answer = (): Node => ({ type: "get_canvas_input_value", params: [null] });
const join = (left: unknown, right: unknown): Node => ({ type: "combine_something", params: [null, left, null, right, null] });

function base() {
  const project = JSON.parse(buildEntryProject()) as Record<string, unknown>;
  const object = (project.objects as Record<string, unknown>[])[0];
  object.name = "강아지";
  object.sprite = { sounds: [], pictures: [{ id: "dog1", name: "강아지", imageType: "svg", fileurl: "/entryjs/name-dog.svg", thumbUrl: "/entryjs/name-dog.svg", dimension: { width: 144, height: 144 } }] };
  object.selectedPictureId = "dog1";
  object.entity = { ...(object.entity as object), regX: 72, regY: 72, width: 144, height: 144, scaleX: 0.65, scaleY: 0.65 };
  return project;
}

export function buildNameProject(blocks: NameBlock[] = [{ id: "start", kind: "start", value: "click" }]): string | null {
  const threads: Node[][] = [];
  const keys: Record<string, string> = { ArrowUp: "38", ArrowRight: "39", ArrowDown: "40", ArrowLeft: "37" };
  for (const [index, b] of blocks.entries()) {
    let node: Node;
    if (b.kind === "start") {
      node = b.value === "click" ? { type: "when_run_button_click", params: [null] } : { type: "when_some_key_pressed", params: [null, keys[b.value]] };
      if (b.value !== "click" && !keys[b.value]) return null;
    } else if (b.kind === "ask") {
      const prompt = { name: "강아지 이름은?", a: "A의 값은?", b: "B의 값은?" }[b.value];
      if (!prompt) return null;
      node = { type: "ask_and_wait", params: [text(prompt), null] };
    } else if (b.kind === "say") node = { type: "dialog_time", params: [join(join(text("내 이름은 "), answer()), text("!")), { type: "number", params: [2] }, "speak", null] };
    else return null;
    if (b.kind === "start" || !threads.length) threads.push([]);
    threads.at(-1)!.push({ ...node, id: `legacy${index}`, x: 40, y: 50 + threads.length * 90 });
  }
  const project = base();
  (project.objects as Record<string, unknown>[])[0].script = threads;
  return JSON.stringify(project);
}

// Only this pilot's native blocks enter its iframe. Keep editable literals,
// including empty fields; execution checks must not erase an unfinished draft.
export function parseNameProject(raw: unknown): { project: Record<string, unknown>; key: string; threads: Node[][] } | null {
  if (typeof raw !== "string" || raw.length > 100_000) return null;
  try {
    const p = JSON.parse(raw);
    if (!record(p) || !Array.isArray(p.objects) || p.objects.length !== 1 || !record(p.objects[0])) return null;
    const scripts = typeof p.objects[0].script === "string" ? JSON.parse(p.objects[0].script) : p.objects[0].script;
    if (!Array.isArray(scripts) || scripts.length > 32) return null;
    let count = 0;
    const clean = (value: unknown, expression = false, depth = 0): Node => {
      if (!record(value) || typeof value.type !== "string" || !Array.isArray(value.params) || depth > 8 || ++count > 160) throw Error();
      const { type, params } = value;
      let next: unknown[];
      if (["text", "number"].includes(type) && expression) {
        if (params.length !== 1 || !["string", "number"].includes(typeof params[0]) || String(params[0]).length > 180) throw Error();
        next = [params[0]];
      } else if (type === "get_canvas_input_value" && expression) next = [null];
      else if (type === "combine_something" && expression) next = [null, clean(params[1], true, depth + 1), null, clean(params[3], true, depth + 1), null];
      else if (type === "when_run_button_click" && !expression) next = [null];
      else if (type === "when_some_key_pressed" && !expression && /^\d{1,3}$/.test(String(params[1])) && Number(params[1]) <= 255) next = [null, String(params[1])];
      else if (type === "ask_and_wait" && !expression) next = [clean(params[0], true, depth + 1), null];
      else if (type === "dialog_time" && !expression && ["speak", "think"].includes(String(params[2]))) next = [clean(params[0], true, depth + 1), clean(params[1], true, depth + 1), params[2], null];
      else throw Error();
      return { type, params: next, ...(typeof value.id === "string" && /^[\w-]{1,80}$/.test(value.id) ? { id: value.id } : {}), ...(typeof value.x === "number" && Number.isFinite(value.x) ? { x: Math.max(-2000, Math.min(2000, value.x)) } : {}), ...(typeof value.y === "number" && Number.isFinite(value.y) ? { y: Math.max(-2000, Math.min(2000, value.y)) } : {}) };
    };
    const threads = scripts.map((thread: unknown) => { if (!Array.isArray(thread) || thread.length > 32) throw Error(); return thread.map((b) => clean(b)); });
    const semantic = (n: Node): unknown => ({ type: n.type, params: n.params.map((v) => record(v) && typeof v.type === "string" ? semantic(v as Node) : v) });
    const project = base();
    (project.objects as Record<string, unknown>[])[0].script = threads;
    return { project, threads, key: JSON.stringify(threads.map((t) => t.map(semantic))) };
  } catch { return null; }
}

// The lesson passes its own parser so run keys match the keys it recorded.
export function checkNameMission(raw: string, runs: NameRun[], parse: (raw: unknown) => { key: string; threads: Node[][] } | null = parseNameProject): { passed: boolean; message: string; issue: "project" | "structure" | "runs" | null; validNames: 0 | 1 | 2 } {
  const fail = (issue: "project" | "structure", message: string) => ({ passed: false, message, issue, validNames: 0 as const });
  const p = parse(raw);
  if (!p) return fail("project", "작품을 읽지 못했어요. 입력한 작품을 보존하고 다시 확인해 주세요.");
  const threads = p.threads.filter((t) => t[0]?.type === "when_run_button_click");
  if (threads.length !== 1) return fail("structure", "시작하기 버튼 아래 한 줄로 질문과 말하기를 연결해 주세요.");
  const program = threads[0].slice(1);
  const evaluate = (node: Node, value: string): string => node.type === "get_canvas_input_value" ? value : node.type === "combine_something" ? evaluate(node.params[1] as Node, value) + evaluate(node.params[3] as Node, value) : String(node.params[0]);
  const depends = (node: Node): boolean => node.type === "get_canvas_input_value" || (node.type === "combine_something" && (depends(node.params[1] as Node) || depends(node.params[3] as Node)));
  const question = program.findIndex(node => node.type === "ask_and_wait");
  if (program.filter(node => node.type === "ask_and_wait").length !== 1 || !program.some((node, index) => index > question && node.type === "dialog_time" && node.params[2] === "speak" && depends(node.params[0] as Node)) || program.some(node => !["ask_and_wait", "dialog_time"].includes(node.type))) {
    return fail("structure", "시작하기 아래에 질문 하나와 말하기를 연결하고, 말하기 안에 ‘대답’을 넣어 주세요.");
  }
  // EntryJS dialog_time rounds numeric decimal text to three places.
  const spoken = (value: string): string => value.trim() && !Number.isNaN(Number(value)) && /\d+\.{1}\d+$/.test(value) ? String(Number(`${Math.round(Number(`${value}e3`))}e-3`)) : value;
  const names = new Set<string>();
  const ids = new Set<string>();
  for (const run of runs) {
    if (run.key !== p.key || run.reason !== "finished" || ids.has(run.id)) continue;
    ids.add(run.id);
    let cursor = 0, value = "", observedName = "", valid = true;
    for (const node of program) {
      if (node.type === "ask_and_wait") {
        const ask = run.steps[cursor++], reply = run.steps[cursor++];
        if (ask?.kind !== "ask" || reply?.kind !== "answer" || !reply.value.trim()) { valid = false; break; }
        value = reply.value;
      } else if (node.type === "dialog_time") {
        const speech = run.steps[cursor++];
        if (speech?.kind !== "say" || speech.value !== spoken(evaluate(node.params[0] as Node, value))) { valid = false; break; }
        if (value && depends(node.params[0] as Node) && node.params[2] === "speak") observedName = value;
      } else { valid = false; break; }
    }
    if (valid && observedName && cursor === run.steps.length) names.add(observedName);
  }
  const validNames = Math.min(names.size, 2) as 0 | 1 | 2;
  return validNames === 2 ? { passed: true, message: "서로 다른 이름으로 질문과 대답·말하기를 확인했어요. 완료 표시를 남길 수 있어요.", issue: null, validNames } : { passed: false, message: validNames === 1 ? "서로 다른 이름으로 한 번 더 실행을 마쳐 주세요. 같은 이름은 한 번만 세요." : "서로 다른 이름으로 두 번 실행을 마쳐 주세요. 질문에 답하고 말하기가 끝날 때까지 기다려요.", issue: "runs", validNames };
}
