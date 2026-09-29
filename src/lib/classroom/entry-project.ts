export type EntryBlockType = "when_run_button_click" | "move_direction" | "dialog_time";
export const MAX_ENTRY_BLOCKS = 50;
export type EntryInstruction =
  | { type: "when_run_button_click" }
  | { type: "move_direction"; amount: number }
  | { type: "dialog_time"; text: string; seconds: number; mode: "speak" | "think" };

export function entryInstructionLabel(block: EntryInstruction): string {
  if (block.type === "when_run_button_click") return "시작하기 버튼을 클릭했을 때";
  if (block.type === "move_direction") return `이동 방향으로 ${block.amount}만큼 움직이기`;
  return `‘${block.text}’을(를) ${block.seconds}초 동안 ${block.mode === "speak" ? "말하기" : "생각하기"}`;
}

type JsonObject = Record<string, unknown>;
export interface EntryProgram {
  project: JsonObject;
  threads: EntryInstruction[][];
  order: EntryBlockType[];
}

function starterProject(scripts: JsonObject[][]): JsonObject {
  const media = "/entryjs/vendor/entry/images/media/";
  return {
    scenes: [{ id: "scene1", name: "장면 1" }],
    objects: [{
      id: "entrybot", name: "엔트리봇", script: scripts,
      objectType: "sprite", rotateMethod: "free", scene: "scene1",
      selectedPictureId: "bot1", lock: false,
      sprite: { sounds: [], pictures: [{
        id: "bot1", name: "엔트리봇", imageType: "svg",
        fileurl: `${media}entrybot1.svg`, thumbUrl: `${media}entrybot1.svg`,
        dimension: { width: 144, height: 246 },
      }] },
      entity: { x: 0, y: 0, regX: 72, regY: 123, scaleX: 0.5128205128205128,
        scaleY: 0.5128205128205128, rotation: 0, direction: 90, width: 144, height: 246, visible: true },
    }],
    variables: [
      { id: "timer", name: "초시계", variableType: "timer", visible: false, value: "0", x: 134, y: -70, object: null, isCloud: false },
      { id: "answer", name: "대답", variableType: "answer", visible: false, value: "0", x: 150, y: -100, object: null, isCloud: false },
    ], messages: [], functions: [], tables: [], speed: 60,
    expansionBlocks: [], aiUtilizeBlocks: [], externalModules: [], externalModulesLite: [],
    interface: { menuWidth: 230, canvasWidth: 320, object: "entrybot" },
  };
}

export function buildEntryProject(blocks: EntryBlockType[] = ["when_run_button_click"]): string {
  return JSON.stringify(starterProject([blocks.map((type, index) => ({
    id: `block${index}`, type, x: index === 0 ? 40 : 0, y: index === 0 ? 50 : 0,
    params: type === "move_direction" ? [{ type: "number", params: [10] }, null]
      : type === "dialog_time" ? [{ type: "text", params: ["안녕!"] }, { type: "number", params: [2] }, "speak", null] : [null],
  }))]));
}

function isRecord(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function literal(value: unknown): string | number | null {
  if (isRecord(value)) {
    if (!["number", "text"].includes(String(value.type)) || !Array.isArray(value.params) || value.params.length !== 1) return null;
    value = value.params[0];
  }
  return typeof value === "string" || typeof value === "number" ? value : null;
}

function position(block: JsonObject): JsonObject {
  return {
    ...(typeof block.id === "string" && /^[\w-]{1,30}$/.test(block.id) ? { id: block.id } : {}),
    x: typeof block.x === "number" && Number.isFinite(block.x) ? Math.max(-2000, Math.min(2000, block.x)) : 0,
    y: typeof block.y === "number" && Number.isFinite(block.y) ? Math.max(-2000, Math.min(2000, block.y)) : 0,
  };
}

function inputBlock(value: unknown, type: "number" | "text", parsed: string | number): JsonObject {
  return { ...(isRecord(value) ? position(value) : {}), type, params: [parsed] };
}

// Read native EntryJS array or JSON-string scripts. Only this exercise's three
// blocks and literal inputs enter the iframe; media, add-ons and stage are fixed.
// The old preview's small project is readable without discarding its code.
export function parseEntryProject(serialized: string | null | undefined): EntryProgram | null {
  if (typeof serialized !== "string" || new TextEncoder().encode(JSON.stringify(serialized)).length > 28000) return null;
  try {
    const project: unknown = JSON.parse(serialized);
    if (!isRecord(project) || !Array.isArray(project.objects) || project.objects.length !== 1 || !isRecord(project.objects[0])) return null;
    const script: unknown = typeof project.objects[0].script === "string" ? JSON.parse(project.objects[0].script) : project.objects[0].script;
    if (!Array.isArray(script) || script.length > MAX_ENTRY_BLOCKS) return null;
    const threads: EntryInstruction[][] = [];
    const nativeThreads: JsonObject[][] = [];
    let count = 0;
    for (const thread of script) {
      if (!Array.isArray(thread)) return null;
      const instructions: EntryInstruction[] = [];
      const native: JsonObject[] = [];
      for (const block of thread) {
        if (!isRecord(block) || ++count > MAX_ENTRY_BLOCKS ||
          (block.statements !== undefined && (!Array.isArray(block.statements) || block.statements.length !== 0))) return null;
        const params = block.params ?? (block.type === "when_run_button_click" ? [] : null);
        if (!Array.isArray(params)) return null;
        const base = position(block);
        if (block.type === "when_run_button_click") {
          instructions.push({ type: block.type });
          native.push({ ...base, type: block.type, params: [null] });
        } else if (block.type === "move_direction") {
          const value = literal(params[0]);
          const amount = value === null ? NaN : Number(value);
          if (!Number.isFinite(amount) || Math.abs(amount) > 1000) return null;
          instructions.push({ type: block.type, amount });
          native.push({ ...base, type: block.type, params: [inputBlock(params[0], "number", amount), null] });
        } else if (block.type === "dialog_time" || block.type === "dialog" && !project.objects[0].sprite) {
          const legacy = block.type === "dialog";
          const value = literal(params[0]);
          const time = literal(params[legacy ? 2 : 1]);
          const seconds = time === null ? NaN : Number(time);
          const mode = legacy && params[1] === "say" ? "speak" : params[legacy ? 1 : 2];
          if (value === null || String(value).length > 80 || !Number.isFinite(seconds) || seconds < 0 || seconds > 10 || !["speak", "think"].includes(String(mode))) return null;
          instructions.push({ type: "dialog_time", text: String(value), seconds, mode: mode as "speak" | "think" });
          native.push({ ...base, type: "dialog_time", params: [inputBlock(params[0], "text", String(value)), inputBlock(params[legacy ? 2 : 1], "number", seconds), mode, null] });
        } else return null;
      }
      if (instructions.length) { threads.push(instructions); nativeThreads.push(native); }
    }
    return { project: starterProject(nativeThreads), threads, order: threads.flat().map((block) => block.type) };
  } catch { return null; }
}

export function runnableEntryBlocks(project: string | null | undefined): EntryInstruction[] {
  const threads = parseEntryProject(project)?.threads;
  if (!threads || threads.length !== 1 || threads[0][0]?.type !== "when_run_button_click" ||
    threads[0].filter((block) => block.type === "when_run_button_click").length !== 1) return [];
  return threads[0];
}
