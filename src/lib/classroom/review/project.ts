import { z } from "zod";
import { replaySandwich, sandwichActions } from "./sandwich-engine.mjs";
import { validateFlowGraph } from "./flow-graph.mjs";
import { missions } from "./flowchart-data.mjs";

const text = z.string().max(1000);
// A 1,000-character multiline editor can contain 1,001 empty/incomplete lines.
const list = z.array(text).max(1001);
export const abstractionSchema = z.object({ type: z.literal("abstraction"), step: z.number().int().min(1).max(4), tutorialStep: z.number().int().min(1).max(4), tutorialDone: z.boolean(), view: z.enum(["tutorial", "workbook"]).default("tutorial"), tutorialScenario: z.enum(["chat", "late", "game"]).default("chat"), tutorialNoise: list.default([]), topic: text.default(""), adopted: z.array(z.object({ kind: z.enum(["state", "condition", "core", "noise", "plan"]), value: text }).strict()).max(100).default([]), current: text, goal: text, conditions: list, core: list, noise: list, plans: list }).strict();
export const sandwichSchema = z.object({ type: z.literal("sandwich"), runId: z.string().max(80), input: text, commands: z.array(z.object({ id: z.string().max(80), text, actions: z.array(z.enum(sandwichActions as [string, ...string[]])).max(30), source: z.enum(["solar", "rules"]), proof: z.string().max(100) }).strict()).max(150) }).strict();
export const flowNodeSchema = z.object({ id: z.string().max(80), shape: z.enum(["terminal", "io", "process", "decision"]), text, x: z.number().finite().min(-10000).max(10000), y: z.number().finite().min(-10000).max(10000) }).strict();
export const flowCardSchema = z.object({ id: z.string().max(80), type: z.enum(["sequence", "selection", "loop"]), text, yes: text, no: text }).strict();
const flowPort = z.enum(["top", "right", "bottom", "left"]).optional();
export const flowchartSchema = z.object({ type: z.literal("flowchart"), mission: z.enum(["1", "2", "3", "guide", "free"]), placements: z.record(z.string().max(4), z.record(z.string().max(80), z.string().max(80))), cards: z.array(flowCardSchema).max(50), nodes: z.array(flowNodeSchema).max(200), edges: z.array(z.object({ from: z.string().max(80), to: z.string().max(80), label: z.enum(["", "예", "아니오"]), fromPort: flowPort, toPort: flowPort }).strict()).max(400), current: text, goal: text, conditions: list, core: list, pan: z.object({ x: z.number().finite().min(-10000).max(10000), y: z.number().finite().min(-10000).max(10000) }).strict(), guideStep: z.number().int().min(0).max(30) }).strict();
export const reviewProjectSchema = z.discriminatedUnion("type", [abstractionSchema, sandwichSchema, flowchartSchema]);
export type ReviewProject = z.infer<typeof reviewProjectSchema>;
export type AbstractionProject = z.infer<typeof abstractionSchema>;
export type SandwichProject = z.infer<typeof sandwichSchema>;
export type FlowchartProject = z.infer<typeof flowchartSchema>;
export type FlowNode = z.infer<typeof flowNodeSchema>;
export type FlowCard = z.infer<typeof flowCardSchema>;
export const isReviewType = (type?: string) => ["abstraction", "sandwich", "flowchart"].includes(type ?? "");
export const reviewMissionIds = ["1", "2", "3", "free"];
export function initialReviewProject(type: string): ReviewProject {
  if (type === "abstraction") return abstractionSchema.parse({ type, step: 1, tutorialStep: 1, tutorialDone: false, current: "", goal: "", conditions: [], core: [], noise: [], plans: [] });
  if (type === "sandwich") return { type, runId: "initial", input: "", commands: [] };
  return { type: "flowchart", mission: "1", placements: {}, cards: [], nodes: [{ id: "start", shape: "terminal", text: "시작", x: 80, y: 60 }, { id: "end", shape: "terminal", text: "종료", x: 80, y: 300 }], edges: [], current: "", goal: "", conditions: [], core: [], pan: { x: 0, y: 0 }, guideStep: 0 };
}
// Only learning content invalidates verification; moving symbols or changing tabs does not.
export function projectSnapshot(project: ReviewProject, missionId?: string): ReviewProject {
  if (project.type === "abstraction") return { ...project, step: 1, tutorialStep: 1, tutorialDone: false, view: "workbook", tutorialScenario: "chat", tutorialNoise: [], adopted: [] };
  if (project.type === "sandwich") return { ...project, input: "" };
  if (missionId && missionId !== "free") return { ...initialReviewProject("flowchart") as FlowchartProject, mission: missionId as FlowchartProject["mission"], placements: { [missionId]: project.placements[missionId] ?? {} }, nodes: [] };
  return { ...project, mission: "free", placements: {}, guideStep: 0, pan: { x: 0, y: 0 }, nodes: project.nodes.map(node => ({ ...node, x: 0, y: 0 })).sort((a, b) => a.id.localeCompare(b.id)), edges: project.edges.map(({ from, to, label }) => ({ from, to, label })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) };
}
export function sameReviewProject(a?: ReviewProject, b?: ReviewProject, missionId?: string) { return !!a && !!b && JSON.stringify(projectSnapshot(a, missionId)) === JSON.stringify(projectSnapshot(b, missionId)); }
export function frozenReviewProject(project: ReviewProject, missionId?: string): ReviewProject {
  const snapshot = projectSnapshot(project, missionId);
  if (snapshot.type === "abstraction" && project.type === "abstraction") return { ...snapshot, adopted: structuredClone(project.adopted) };
  return snapshot.type === "flowchart" && snapshot.mission === "free" && project.type === "flowchart" ? { ...snapshot, nodes: structuredClone(project.nodes), edges: structuredClone(project.edges), pan: { ...project.pan } } : structuredClone(snapshot);
}
export function basicReviewCheck(project: ReviewProject, missionId?: string) {
  if (project.type === "sandwich") {
    const run = replaySandwich(project.commands);
    return { passed: run.state.completed && run.review.isFlawless, message: run.state.completed ? run.review.review : "명령을 실행해 두 빵과 속 재료를 완성해 주세요." };
  }
  if (project.type === "abstraction") {
    const passed = [project.current, project.goal].every(value => value.trim()) && [project.conditions, project.core, project.plans].every(values => values.some(value => value.trim()));
    return { passed, message: passed ? "필수 작성 내용을 확인했어요. 처방전을 제출하거나 AI와 더 다듬을 수 있어요." : "현재 상태·목표·조건·핵심 요소·해결 계획을 채워 주세요." };
  }
  if (missionId && missionId !== "free") {
    const mission = missions.find(item => String(item.id) === missionId);
    const passed = !!mission && mission.validate(project.placements[missionId] ?? {});
    return { passed, message: passed ? "기호와 흐름을 확인했어요." : "기호의 역할과 예·아니오, 돌아가는 연결을 확인해 주세요." };
  }
  const graph = validateFlowGraph(project.nodes, project.edges.map(edge => ({ ...edge, fromPort: edge.label === "예" ? "yes" : edge.label === "아니오" ? "no" : "out" })));
  const labels = project.edges.every(edge => project.nodes.find(node => node.id === edge.from)?.shape === "decision" ? edge.label !== "" : edge.label === "");
  const activity = project.nodes.some(node => node.shape === "io" || node.shape === "process");
  const complete = !!project.current.trim() && !!project.goal.trim() && project.conditions.some(value => value.trim()) && project.cards.length > 0 && project.cards.every(card => card.text.trim() && (card.type === "sequence" || (card.yes.trim() && (card.type === "loop" || card.no.trim()))));
  return { passed: graph.valid && labels && activity && complete, message: !graph.valid ? graph.issues.map((issue: { message: string }) => issue.message).join(" ") : !labels ? "예·아니오는 판단 기호의 연결에만 붙여 주세요." : !activity ? "활동을 나타내는 입출력이나 처리 기호를 연결해 주세요." : complete ? "기본 구조를 확인했어요. AI가 계획과 연결 흐름을 비교해요." : "현재 상태·목표·조건과 자연어 기획서를 채워 주세요." };
}
