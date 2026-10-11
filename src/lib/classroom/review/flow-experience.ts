import { missions, level2Walkthrough } from "./flowchart-data.mjs";
import type { FlowchartProject, FlowNode } from "./project";

export function puzzlePalette(id: string, attempt = 0) {
  const blocks = [...(missions.find(item => String(item.id) === id)?.palette ?? [])];
  // A repeatable shuffle keeps the tray still during edits, navigation and hydration.
  let seed = Number(id) * 997 + attempt * 131 + 17;
  for (let index = blocks.length - 1; index > 0; index--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const other = seed % (index + 1);
    [blocks[index], blocks[other]] = [blocks[other], blocks[index]];
  }
  const original = missions.find(item => String(item.id) === id)?.palette;
  if (blocks.length > 1 && blocks.every((block, index) => block.id === original?.[index].id)) blocks.push(blocks.shift()!);
  return blocks;
}

export function placePuzzleBlock(id: string, placed: Record<string, string>, slotId: string, blockId: string) {
  const mission = missions.find(item => String(item.id) === id);
  if (!mission?.slots.some(slot => slot.id === slotId && !slot.fixed) || (blockId !== "" && !mission.palette.some(block => block.id === blockId))) return placed;
  const next = { ...placed };
  // Only this explicit placement moves a piece. Loading an older duplicate answer never rewrites it.
  if (blockId) for (const [slot, block] of Object.entries(next)) if (block === blockId) next[slot] = "";
  next[slotId] = blockId;
  return next;
}

export function puzzleGraph(id: string, placed: Record<string, string>) {
  const mission = missions.find(item => String(item.id) === id)!;
  const center = id === "1" ? 30 : 180;
  const positions: Record<string, [number, number]> = { s1: [center, 24], s2: [center, 150], s3: [center, 290], s4: [center, 445], s4_yes: [30, 485], s4_no: [330, 485], s5: [center, id === "1" ? 590 : 645] };
  const nodes: FlowNode[] = mission.slots.map(slot => { const block = mission.palette.find(item => item.id === placed[slot.id]); return { id: slot.id, shape: (block?.shape || slot.shape) as FlowNode["shape"], text: slot.fixed ? slot.label! : block?.text || slot.hint || "빈 기호", x: positions[slot.id][0], y: positions[slot.id][1] }; });
  const edges: FlowchartProject["edges"] = id === "1" ? ["s1", "s2", "s3", "s4"].map((from, i) => ({ from, to: ["s2", "s3", "s4", "s5"][i], label: "" })) : [{ from: "s1", to: "s2", label: "" }, { from: "s2", to: "s3", label: "" }, { from: "s3", to: "s4_yes", label: "예" }, { from: "s3", to: "s4_no", label: "아니오" }, { from: "s4_yes", to: "s5", label: "" }, { from: "s4_no", to: id === "3" ? "s2" : "s5", label: "" }];
  return { nodes, edges };
}
export function puzzleExecutionGraph(id: string, placed: Record<string, string>) {
  const graph = puzzleGraph(id, placed);
  const mission = missions.find(item => String(item.id) === id)!;
  const complete = mission.slots.every(slot => slot.fixed || mission.palette.some(block => block.id === placed[slot.id]));
  const check = complete ? mission.validate(placed) : null;
  const expressions: Record<string, string> = { "b-m2-1": "키 입력", "b-m2-2": "키 >= 150", "b-m3-chk": "비밀번호 == 7777" };
  return {
    ...graph,
    unavailable: !complete ? "빈 기호를 먼저 채워 주세요." : !check ? "배치를 다시 확인해 주세요. 기호의 순서와 갈래가 미션의 조건에 맞아야 실행할 수 있어요." : "",
    nodes: graph.nodes.map(node => expressions[placed[node.id]] ? { ...node, text: expressions[placed[node.id]] } : node),
    textInputs: graph.nodes.filter(node => placed[node.id] === "b-m3-in").map(node => node.id),
    textComparisons: Object.fromEntries(graph.nodes.filter(node => placed[node.id] === "b-m3-chk").map(node => [node.id, { variable: "비밀번호", expected: "7777" }]))
  };
}
export function guideGraph(step: number): Pick<FlowchartProject, "nodes" | "edges"> {
  const steps = level2Walkthrough.steps;
  const all: FlowNode[] = [{ id: "start", shape: "terminal", text: "시작", x: 250, y: 20 }, { id: "time", shape: "io", text: steps[0].blockText, x: 240, y: 140 }, { id: "wash", shape: "process", text: steps[1].blockText, x: 245, y: 260 }, { id: "check", shape: "decision", text: "7시 30분이거나 그 이전인가요?", x: 240, y: 380 }, { id: "yes", shape: "process", text: steps[2].yesBlockText!, x: 80, y: 560 }, { id: "no", shape: "process", text: steps[2].noBlockText!, x: 410, y: 560 }, { id: "bus", shape: "process", text: steps[3].blockText, x: 245, y: 680 }, { id: "end", shape: "terminal", text: "종료", x: 250, y: 800 }];
  const nodes = all.slice(0, [1, 2, 3, 6, 8][Math.min(4, step)]);
  const edges: FlowchartProject["edges"] = [{ from: "start", to: "time", label: "" }, { from: "time", to: "wash", label: "" }, { from: "wash", to: "check", label: "" }, { from: "check", to: "yes", label: "예" }, { from: "check", to: "no", label: "아니오" }, { from: "yes", to: "bus", label: "" }, { from: "no", to: "bus", label: "" }, { from: "bus", to: "end", label: "" }];
  return { nodes, edges: edges.filter(edge => nodes.some(n => n.id === edge.from) && nodes.some(n => n.id === edge.to)) };
}
