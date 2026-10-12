import type { Stage } from "@/lib/classroom/types";
import { buildNameProject, parseNameProject } from "../classroom/name-entry";
import { concepts, conceptOrder, questions } from "../classroom/programming-data";

export const LEGACY_STORAGE_KEY = "cs-class-programming-prototype-v1";
export const STORAGE_KEY = "cs-class-programming-prototype-v2";
export const MAX_PROTOTYPE_SIZE = 500_000;

export type BlockKind = "start" | "ask" | "store" | "say" | "calculate" | "direction" | "move";
export type Block = { id: string; kind: BlockKind; value: string };
export type Inputs = { name: string; a: string; b: string };
export type Signal = "click" | "ArrowUp" | "ArrowRight" | "ArrowDown" | "ArrowLeft";
export type Frame = { blockId: string; message: string; answer: string; variables: Partial<Record<"A" | "B", number>>; speech: string; x: number; y: number; direction: number };
export type RunResult = { frames: Frame[]; error: string; triggered: boolean };
export type PrototypeState = {
  version: 2; nameEntryProject: string; nameImportFailed: boolean; nameImportRaw?: string; stage: Stage; concept: number; conceptDone: number[]; conceptAnswers: Record<string, number>;
  quiz: { round: number; ids: string[]; index: number; answers: Record<string, number>; solved: string[]; graded: boolean };
  mission: number; programs: Block[][]; inputs: Inputs; completed: number[]; reflection: string;
};
export type PrototypeUpdate = (next: PrototypeState | ((previous: PrototypeState) => PrototypeState)) => void;
export const signalLabels: Record<Signal, string> = { click: "시작 버튼", ArrowUp: "위쪽 키", ArrowRight: "오른쪽 키", ArrowDown: "아래쪽 키", ArrowLeft: "왼쪽 키" };
export const blockLabels: Record<BlockKind, string> = { start: "시작 신호", ask: "묻고 대답 기다리기", store: "대답을 변수에 저장하기", say: "대답 말하기", calculate: "계산해서 말하기", direction: "이동 방향 정하기", move: "이동 방향으로 움직이기" };
export const missions = [
  { title: "강아지 이름 짓기", description: "이름을 물어보고 입력한 이름을 말하게 해주세요. 인사 문장은 자유롭게 꾸며도 좋아요.", goal: "이름 입력 → 대답 → 이름 말하기", kinds: ["start", "ask", "say"] as BlockKind[], hint: "먼저 이름을 물어야 ‘대답’에 이름이 생겨요. 말하기는 그 아래에 연결해 보세요." },
  { title: "곱셈 계산기", description: "두 수를 A와 B에 기억한 뒤 두 수의 곱을 말하게 해주세요.", goal: "A 입력·저장 → B 입력·저장 → A × B 출력", kinds: ["start", "ask", "store", "calculate"] as BlockKind[], hint: "A를 물은 바로 다음에 A에 저장해 보세요. B를 물으면 ‘대답’이 새 값으로 바뀌어요." },
  { title: "방향키로 강아지 움직이기", description: "오른쪽 키를 누르면 강아지가 오른쪽으로 움직이도록 만들어주세요. 다른 키도 더해볼 수 있어요.", goal: "오른쪽 키 → 방향 90° → 10만큼 이동", kinds: ["start", "direction", "move"] as BlockKind[], hint: "오른쪽 키 시작 신호를 골랐나요? 이동하기 전에 방향을 90°로 정해 보세요." },
  { title: "도전 · 평균 계산기", description: "곱셈 계산기를 응용해 두 수의 평균을 구해보세요. 기본 미션을 마친 뒤 도전해도 좋아요.", goal: "두 수 입력·저장 → (A + B) ÷ 2 출력", kinds: ["start", "ask", "store", "calculate"] as BlockKind[], hint: "평균은 두 수를 더한 뒤 2로 나눈 값이에요. 계산 블록에서 연산을 바꿔 보세요." },
];
export const blankFrame: Frame = { blockId: "", message: "블록을 연결하고 실행해 보세요.", answer: "", variables: {}, speech: "", x: 0, y: 0, direction: 90 };
export function newBlock(kind: BlockKind, id: string): Block {
  return { id, kind, value: { start: "click", ask: "name", store: "A", say: "answer", calculate: "multiply", direction: "90", move: "10" }[kind] };
}
export function initialState(): PrototypeState {
  return {
    version: 2, nameEntryProject: buildNameProject()!, nameImportFailed: false, stage: "concept", concept: conceptOrder[0], conceptDone: [], conceptAnswers: {},
    quiz: { round: 1, ids: questions.map((q) => q.id), index: 0, answers: {}, solved: [], graded: false },
    mission: 0, programs: [0, 1, 2, 3].map((i) => [newBlock("start", `start-${i}`)]),
    inputs: { name: "초코", a: "6", b: "4" }, completed: [], reflection: "",
  };
}
const values: Record<BlockKind, readonly string[] | null> = { start: Object.keys(signalLabels), ask: ["name", "a", "b"], store: ["A", "B"], say: ["answer"], calculate: ["multiply", "average"], direction: ["0", "90", "180", "270"], move: null };
function validBlock(value: unknown): value is Block {
  if (!value || typeof value !== "object") return false;
  const b = value as Block;
  // A draft may contain a temporarily empty or invalid number; restoring it must not discard the lesson.
  return typeof b.id === "string" && b.id.length > 0 && b.id.length < 80 && Object.hasOwn(values, b.kind) && typeof b.value === "string" && (values[b.kind]?.includes(b.value) ?? b.value.length <= 40);
}
export function restoreState(raw: string | null): PrototypeState | null {
  if (!raw || raw.length > MAX_PROTOTYPE_SIZE) return null;
  try {
    const s = JSON.parse(raw) as PrototypeState;
    const ints = (v: unknown, max: number): v is number[] => Array.isArray(v) && v.length <= max && new Set(v).size === v.length && v.every((n) => Number.isInteger(n) && n >= 0 && n < max);
    const ids = (v: unknown): v is string[] => Array.isArray(v) && v.length <= questions.length && new Set(v).size === v.length && v.every((id) => questions.some((q) => q.id === id));
    const answers = (v: unknown, keys: string[], sizes: number[]): boolean => !!v && typeof v === "object" && !Array.isArray(v) && Object.entries(v).every(([key, n]) => keys.includes(key) && Number.isInteger(n) && Number(n) >= 0 && Number(n) < sizes[keys.indexOf(key)]);
    const version = (s as { version: number }).version;
    if (!s || ![1, 2].includes(version) || !["concept", "quiz", "practice"].includes(s.stage) || !Number.isInteger(s.concept) || s.concept < 0 || s.concept >= concepts.length || !ints(s.conceptDone, concepts.length) || !answers(s.conceptAnswers, concepts.map((_, i) => String(i)), concepts.map((c) => c.options.length))) return null;
    if (!s.quiz || !ids(s.quiz.ids) || !s.quiz.ids.length || !ids(s.quiz.solved) || !Number.isInteger(s.quiz.index) || s.quiz.index < 0 || s.quiz.index >= s.quiz.ids.length || !Number.isSafeInteger(s.quiz.round) || s.quiz.round < 1 || s.quiz.round > 1000 || typeof s.quiz.graded !== "boolean" || !answers(s.quiz.answers, questions.map((q) => q.id), questions.map((q) => q.options.length))) return null;
    if (s.quiz.graded && s.quiz.ids.some((id) => s.quiz.answers[id] === undefined)) return null;
    if (s.quiz.solved.some((id) => s.quiz.answers[id] !== questions.find((q) => q.id === id)?.correct) || s.conceptDone.some((i) => s.conceptAnswers[i] !== concepts[i].correct)) return null;
    if (!Number.isInteger(s.mission) || s.mission < 0 || s.mission > 3 || !ints(s.completed, 4) || !Array.isArray(s.programs) || s.programs.length !== 4 || s.programs.some((p) => !Array.isArray(p) || p.length > 32 || !p.every(validBlock) || new Set(p.map((b) => b.id)).size !== p.length)) return null;
    if (!s.inputs || ![s.inputs.name, s.inputs.a, s.inputs.b].every((v) => typeof v === "string" && v.length <= 40) || typeof s.reflection !== "string" || s.reflection.length > 500) return null;
    if (version === 1) {
      const converted = buildNameProject(s.programs[0]);
      return { ...s, version: 2, nameEntryProject: converted ?? buildNameProject()!, nameImportFailed: !converted };
    }
    if (typeof s.nameImportFailed !== "boolean" || typeof s.nameEntryProject !== "string" || s.nameEntryProject.length > 100_000 || (s.nameImportRaw !== undefined && (typeof s.nameImportRaw !== "string" || s.nameImportRaw.length > 100_000))) return null;
    if (!parseNameProject(s.nameEntryProject)) return { ...s, nameEntryProject: buildNameProject()!, nameImportRaw: s.nameEntryProject, nameImportFailed: true };
    return s;
  } catch { return null; }
}
export function runProgram(blocks: Block[], inputs: Inputs, signal: Signal = "click", position = { x: 0, y: 0 }): RunResult {
  const frames: Frame[] = [];
  let current: Frame = { ...blankFrame, ...position, variables: {} };
  let enabled = false;
  let triggered = false;
  let error = "";
  if (!blocks.length || blocks.length > 32 || !blocks.every((b) => validBlock(b) && (b.kind !== "move" || (Number.isFinite(Number(b.value)) && Number(b.value) >= 1 && Number(b.value) <= 100)))) return { frames, error: "블록의 입력값을 확인해 주세요. 이동 거리는 1~100으로 정해요.", triggered };
  for (const b of blocks) {
    if (b.kind === "start") { enabled = b.value === signal; if (enabled) triggered = true; }
    if (!enabled) continue;
    let message = "";
    if (b.kind === "start") message = `${signalLabels[signal]} 신호를 받았어요.`;
    if (b.kind === "ask") {
      const answer = inputs[b.value as keyof Inputs].trim();
      if (!answer) { error = "질문에 사용할 입력값을 먼저 적어 주세요."; break; }
      current = { ...current, answer }; message = `${b.value === "name" ? "이름" : b.value.toUpperCase()}을 물었어요. 대답: ${answer}`;
    }
    if (b.kind === "store") {
      const n = Number(current.answer);
      if (!current.answer || !Number.isFinite(n) || Math.abs(n) > 1000) { error = `${b.value}에 저장할 숫자 대답이 없어요. 먼저 숫자를 묻고, -1000~1000 사이의 수를 입력해 주세요.`; break; }
      current = { ...current, variables: { ...current.variables, [b.value]: n } }; message = `${b.value}에 ${n}을 저장했어요.`;
    }
    if (b.kind === "say") {
      if (!current.answer) { error = "아직 대답이 없어요. 말하기 앞에 이름을 묻는 블록을 연결해 보세요."; break; }
      current = { ...current, speech: `내 이름은 ${current.answer}!` }; message = current.speech;
    }
    if (b.kind === "calculate") {
      const { A, B } = current.variables;
      if (A === undefined || B === undefined) { error = "계산하려면 A와 B에 각각 숫자가 있어야 해요. 묻기 다음에 저장하기가 있는지 살펴보세요."; break; }
      const answer = b.value === "average" ? (A + B) / 2 : A * B;
      current = { ...current, speech: b.value === "average" ? `A와 B의 평균 = ${answer}` : `A × B = ${answer}` }; message = current.speech;
    }
    if (b.kind === "direction") { current = { ...current, direction: Number(b.value) }; message = `방향을 ${b.value}°로 정했어요.`; }
    if (b.kind === "move") {
      const d = Number(b.value);
      const x = current.x + (current.direction === 90 ? d : current.direction === 270 ? -d : 0);
      const y = current.y + (current.direction === 0 ? d : current.direction === 180 ? -d : 0);
      if (Math.abs(x) > 180 || Math.abs(y) > 100) { error = "무대 가장자리에 도착했어요. 무대를 처음 위치로 돌려 다시 실험해 보세요."; break; }
      current = { ...current, x, y }; message = `(${x}, ${y})로 움직였어요.`;
    }
    current = { ...current, blockId: b.id, message };
    frames.push(current);
  }
  if (!triggered) error = `${signalLabels[signal]}에 반응하는 시작 블록이 없어요. 시작 신호를 확인해 보세요.`;
  return { frames, error, triggered };
}
export function checkMission(mission: number, blocks: Block[]): { passed: boolean; message: string } {
  const signal = mission === 2 ? "ArrowRight" : "click";
  // This small prototype checks the named task with varied inputs, not arbitrary programs.
  const cases = [{ name: "초코", a: "6", b: "4" }, { name: "보리", a: "3", b: "8" }, { name: "두부", a: "-2", b: "0" }];
  const passed = cases.every((inputs) => {
    const result = runProgram(blocks, inputs, signal);
    const last = result.frames.at(-1);
    if (result.error || !last) return false;
    if (mission === 0) return last.speech === `내 이름은 ${inputs.name}!`;
    if (mission === 2) {
      const direction = result.frames.findIndex((frame) => blocks.some((b) => b.id === frame.blockId && b.kind === "direction" && b.value === "90"));
      const movement = result.frames.findIndex((frame) => blocks.some((b) => b.id === frame.blockId && b.kind === "move"));
      return last.x === 10 && last.y === 0 && last.direction === 90 && direction >= 0 && movement > direction;
    }
    const A = Number(inputs.a), B = Number(inputs.b);
    return last.variables.A === A && last.variables.B === B && last.speech === (mission === 3 ? `A와 B의 평균 = ${(A + B) / 2}` : `A × B = ${A * B}`);
  });
  return { passed, message: passed ? "서로 다른 입력으로도 목표를 확인했어요. 내 작업에 완료 표시를 남길 수 있어요." : missions[mission].hint };
}
