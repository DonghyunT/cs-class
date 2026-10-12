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

function calcNodeSize(node: { shape: FlowNode["shape"]; text: string }) {
  const advance = (char: string) => /[\u0000-\u007f]/.test(char) ? /[MW@%]/.test(char) ? 12 : 8.5 : 14.5;
  const paragraphs = (node.text ?? "").replace(/\r/g, "").split("\n");
  const longest = Math.max(...paragraphs.map(line => [...line].reduce((sum, char) => sum + advance(char), 0)));
  const minimum = node.shape === "terminal" ? 200 : node.shape === "process" ? 210 : 220;
  const width = Math.min(280, Math.max(minimum, Math.ceil(node.shape === "decision" ? longest * 2 + 16 : longest + (node.shape === "io" ? 64 : 48))));
  const height = node.shape === "decision" ? Math.max(120, 2 * (paragraphs.length * 20 + 24) + 16) : Math.max(80, paragraphs.length * 20 + 50);
  return { width, height };
}

function slotPlaceholder(id: string, slotId: string, hint?: string): string {
  if (id === "1") {
    return hint || "빈 기호";
  }
  if (id === "2") {
    if (slotId === "s2") return "입출력 ▱ (키 입력받기)";
    if (slotId === "s3") return "판단 ◇ (조건 검사)";
    if (slotId === "s4_yes") return "출력 ▱ [예] (결과 안내)";
    if (slotId === "s4_no") return "출력 ▱ [아니오] (결과 안내)";
  } else if (id === "3") {
    if (slotId === "s2") return "입출력 ▱ (비밀번호 입력받기)";
    if (slotId === "s3") return "판단 ◇ (조건 검사)";
    if (slotId === "s4_yes") return "출력 ▱ [예] (성공 안내)";
    if (slotId === "s4_no") return "처리 ▭ [아니오] (불일치 처리)";
  }
  return hint || "빈 기호";
}

export function puzzleGraph(id: string, placed: Record<string, string>) {
  const mission = missions.find(item => String(item.id) === id)!;
  const rawNodes = mission.slots.map(slot => {
    const block = mission.palette.find(item => item.id === placed[slot.id]);
    const shape = (block?.shape || slot.shape) as FlowNode["shape"];
    const text = slot.fixed ? slot.label! : block?.text || slotPlaceholder(id, slot.id, slot.hint);
    const size = calcNodeSize({ shape, text });
    return { id: slot.id, shape, text, size };
  });

  let centerXs: Record<string, number> = {};
  let positionsY: Record<string, number> = {};

  if (id === "1") {
    const cx = 240;
    centerXs = { s1: cx, s2: cx, s3: cx, s4: cx, s5: cx };
    positionsY = { s1: 24, s2: 144, s3: 264, s4: 384, s5: 504 };
  } else if (id === "2") {
    const cx = 360;
    centerXs = { s1: cx, s2: cx, s3: cx, s4_yes: 150, s4_no: 570, s5: cx };
    positionsY = { s1: 24, s2: 140, s3: 260, s4_yes: 430, s4_no: 430, s5: 600 };
  } else {
    const cx = 260;
    centerXs = { s1: cx, s2: cx, s3: cx, s4_yes: cx, s4_no: 540, s5: cx };
    positionsY = { s1: 24, s2: 140, s3: 260, s4_yes: 420, s4_no: 260, s5: 560 };
  }

  const nodes: FlowNode[] = rawNodes.map(node => {
    const cx = centerXs[node.id] ?? 200;
    const y = positionsY[node.id] ?? 0;
    return {
      id: node.id,
      shape: node.shape,
      text: node.text,
      x: Math.round(cx - node.size.width / 2),
      y
    };
  });

  const edges: FlowchartProject["edges"] = id === "1"
    ? ["s1", "s2", "s3", "s4"].map((from, i) => ({ from, to: ["s2", "s3", "s4", "s5"][i], label: "" }))
    : id === "2"
    ? [
        { from: "s1", to: "s2", label: "" },
        { from: "s2", to: "s3", label: "" },
        { from: "s3", to: "s4_yes", label: "예", fromPort: "left", toPort: "top" },
        { from: "s3", to: "s4_no", label: "아니오", fromPort: "right", toPort: "top" },
        { from: "s4_yes", to: "s5", label: "", fromPort: "bottom", toPort: "top" },
        { from: "s4_no", to: "s5", label: "", fromPort: "bottom", toPort: "top" }
      ]
    : [
        { from: "s1", to: "s2", label: "" },
        { from: "s2", to: "s3", label: "" },
        { from: "s3", to: "s4_yes", label: "예", fromPort: "bottom", toPort: "top" },
        { from: "s3", to: "s4_no", label: "아니오", fromPort: "right", toPort: "left" },
        { from: "s4_yes", to: "s5", label: "" },
        { from: "s4_no", to: "s2", label: "", fromPort: "top", toPort: "right" }
      ];

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
  const all: FlowNode[] = [{ id: "start", shape: "terminal", text: "시작", x: 250, y: 20 }, { id: "time", shape: "io", text: steps[0].blockText, x: 240, y: 140 }, { id: "wash", shape: "process", text: steps[1].blockText, x: 245, y: 260 }, { id: "check", shape: "decision", text: "7시 30분이거나 그 이전인가요?", x: 240, y: 380 }, { id: "yes", shape: "process", text: steps[2].yesBlockText!, x: 80, y: 560 }, { id: "no", shape: "process", text: steps[2].noBlockText!, x: 470, y: 560 }, { id: "bus", shape: "process", text: steps[3].blockText, x: 245, y: 680 }, { id: "end", shape: "terminal", text: "종료", x: 250, y: 800 }];
  const nodes = all.slice(0, [1, 2, 3, 6, 8][Math.min(4, step)]);
  const edges: FlowchartProject["edges"] = [{ from: "start", to: "time", label: "" }, { from: "time", to: "wash", label: "" }, { from: "wash", to: "check", label: "" }, { from: "check", to: "yes", label: "예" }, { from: "check", to: "no", label: "아니오" }, { from: "yes", to: "bus", label: "" }, { from: "no", to: "bus", label: "" }, { from: "bus", to: "end", label: "" }];
  return { nodes, edges: edges.filter(edge => nodes.some(n => n.id === edge.from) && nodes.some(n => n.id === edge.to)) };
}
