import { test, expect } from "@playwright/test";
import { basicReviewCheck, initialReviewProject, sameReviewProject, flowchartSchema, type FlowchartProject } from "../src/lib/classroom/review/project";
import { aiResultSchema } from "../src/lib/classroom/review/ai";

test("기획 AI의 정의 후보는 이전 응답과 호환되고 저장 작품의 필드를 늘리지 않는다", () => {
  const old = { message: "기획 후보", options: [], actions: [], cards: [], verdict: "uncertain" };
  expect(aiResultSchema.safeParse(old).success).toBe(true);
  const candidate = { ...old, definition: { goal: "안전한 등교", conditions: ["횡단보도를 이용"], core: ["신호등"] } };
  expect(aiResultSchema.safeParse(candidate).success).toBe(true);
  expect(aiResultSchema.safeParse({ ...candidate, definition: { ...candidate.definition, unexpected: "값" } }).success).toBe(false);
  expect(flowchartSchema.safeParse({ ...initialReviewProject("flowchart"), definition: candidate.definition }).success).toBe(false);
});
test("반복 기획서는 지속 조건과 반복 행동으로 완성되고 기존 세 필드를 보존한다", () => {
  const project = initialReviewProject("flowchart") as FlowchartProject;
  Object.assign(project, { mission: "free", current: "준비 전", goal: "준비 완료", conditions: ["매일 준비"], cards: [{ id: "loop", type: "loop", text: "준비가 끝나지 않은 동안", yes: "준비물을 챙긴다", no: "" }], nodes: [{ id: "start", shape: "terminal", text: "시작", x: 10, y: 10 }, { id: "ready", shape: "process", text: "준비물을 챙긴다", x: 10, y: 100 }, { id: "end", shape: "terminal", text: "종료", x: 10, y: 200 }], edges: [{ from: "start", to: "ready", label: "" }, { from: "ready", to: "end", label: "" }] });
  expect(basicReviewCheck(project, "free").passed).toBe(true);
  const previous = structuredClone(project); previous.cards[0].no = "등교한다";
  expect(flowchartSchema.parse(previous).cards[0]).toEqual(previous.cards[0]);
  const moved = structuredClone(previous); moved.nodes[1].x += 90; moved.pan.y = 40;
  expect(sameReviewProject(previous, moved, "free")).toBe(true);
  const directed = structuredClone(previous); directed.edges[0].fromPort = "right"; directed.edges[0].toPort = "left";
  expect(flowchartSchema.parse(directed).edges[0]).toEqual(directed.edges[0]);
  expect(sameReviewProject(previous, directed, "free")).toBe(true);
  expect(basicReviewCheck(directed, "free").passed).toBe(true);
  directed.edges[0].to = "end";
  expect(sameReviewProject(previous, directed, "free")).toBe(false);
  moved.cards[0].yes = "옷을 입는다";
  expect(sameReviewProject(previous, moved, "free")).toBe(false);
  project.cards[0].type = "selection";
  expect(basicReviewCheck(project, "free").passed).toBe(false);
});
