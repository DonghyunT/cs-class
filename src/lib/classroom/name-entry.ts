import { buildEntryProject } from "./entry-project";

type NameBlock = { id: string; kind: "start" | "ask" | "store" | "say" | "calculate" | "direction" | "move"; value: string };

type Node = { id?: string; type: string; params: unknown[]; x?: number; y?: number };
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
