import { missions, level2Walkthrough } from "./flowchart-data.mjs";
import type { FlowchartProject, FlowNode } from "./project";
export function puzzleGraph(id: string, placed: Record<string, string>) {
  const mission = missions.find(item => String(item.id) === id)!;
  const positions: Record<string, [number, number]> = { s1: [280, 30], s2: [280, 160], s3: [280, 300], s4: [280, 440], s4_yes: [180, 460], s4_no: [580, 460], s5: [280, 650] };
  const nodes: FlowNode[] = mission.slots.map(slot => { const block = mission.palette.find(item => item.id === placed[slot.id]); return { id: slot.id, shape: (block?.shape || slot.shape) as FlowNode["shape"], text: slot.fixed ? slot.label! : block?.text || "빈 기호", x: positions[slot.id][0], y: positions[slot.id][1] }; });
  const edges: FlowchartProject["edges"] = id === "1" ? ["s1", "s2", "s3", "s4"].map((from, i) => ({ from, to: ["s2", "s3", "s4", "s5"][i], label: "" })) : [{ from: "s1", to: "s2", label: "" }, { from: "s2", to: "s3", label: "" }, { from: "s3", to: "s4_yes", label: "예" }, { from: "s3", to: "s4_no", label: "아니오" }, { from: "s4_yes", to: "s5", label: "" }, { from: "s4_no", to: id === "3" ? "s2" : "s5", label: "" }];
  return { nodes, edges };
}
export function puzzleExecutionGraph(id: string, placed: Record<string, string>) {
  const graph = puzzleGraph(id, placed);
  const expressions: Record<string, string> = { "b-m2-1": "키 입력", "b-m2-2": "키 >= 150", "b-m3-chk": "비밀번호 == 7777" };
  return {
    ...graph,
    unavailable: graph.nodes.some(node => node.text === "빈 기호") ? "빈 기호를 먼저 채워 주세요." : "",
    nodes: graph.nodes.map(node => expressions[placed[node.id]] ? { ...node, text: expressions[placed[node.id]] } : node),
    textInputs: graph.nodes.filter(node => placed[node.id] === "b-m3-in").map(node => node.id),
    textComparisons: Object.fromEntries(graph.nodes.filter(node => placed[node.id] === "b-m3-chk").map(node => [node.id, { variable: "비밀번호", expected: "7777" }]))
  };
}
export function guideGraph(step: number): Pick<FlowchartProject, "nodes" | "edges"> {
  const steps = level2Walkthrough.steps;
  const all: FlowNode[] = [{ id: "start", shape: "terminal", text: "시작", x: 280, y: 20 }, { id: "time", shape: "io", text: steps[0].blockText, x: 280, y: 150 }, { id: "wash", shape: "process", text: steps[1].blockText, x: 280, y: 280 }, { id: "check", shape: "decision", text: "7시 30분 이전인가요?", x: 280, y: 410 }, { id: "yes", shape: "process", text: steps[2].yesBlockText!, x: 120, y: 540 }, { id: "no", shape: "process", text: steps[2].noBlockText!, x: 580, y: 540 }, { id: "bus", shape: "process", text: steps[3].blockText, x: 280, y: 660 }, { id: "end", shape: "terminal", text: "종료", x: 280, y: 790 }];
  const nodes = all.slice(0, [1, 2, 3, 6, 8][Math.min(4, step)]);
  const edges: FlowchartProject["edges"] = [{ from: "start", to: "time", label: "" }, { from: "time", to: "wash", label: "" }, { from: "wash", to: "check", label: "" }, { from: "check", to: "yes", label: "예" }, { from: "check", to: "no", label: "아니오" }, { from: "yes", to: "bus", label: "" }, { from: "no", to: "bus", label: "" }, { from: "bus", to: "end", label: "" }];
  return { nodes, edges: edges.filter(edge => nodes.some(n => n.id === edge.from) && nodes.some(n => n.id === edge.to)) };
}
