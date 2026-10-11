"use client";
import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import type { FlowchartProject, FlowNode } from "@/lib/classroom/review/project";
import canvas from "./flow-diagram.module.css";

const shapeName = (shape: FlowNode["shape"]) => shape === "terminal" ? "시작·종료" : shape === "io" ? "입출력" : shape === "decision" ? "판단" : "처리";
const shapeBadge = (shape: FlowNode["shape"]) => shape === "terminal" ? "⬭ 단말" : shape === "io" ? "▱ 입출력" : shape === "decision" ? "◇ 판단" : "▭ 처리";
type Branch = "" | "예" | "아니오";
type Port = "top" | "right" | "bottom" | "left";
type Ports = { fromPort?: Port; toPort?: Port };
type RoutedEdge = FlowchartProject["edges"][number] & Ports;
type Props = Pick<FlowchartProject, "nodes" | "edges"> & {
  fit?: boolean; activeEdge?: { from: string; to: string; label: string }; interaction?: ReactNode; output?: { nodeId: string; text: string };
  clearNode?: (id: string) => void; clearableNodes?: string[]; emptyNodes?: string[];
  selected?: string; active?: string; grid?: boolean; compactNotice?: boolean; pan?: { x: number; y: number }; viewportRef?: RefObject<HTMLDivElement | null>; trashRef?: RefObject<HTMLElement | null>;
  select?: (id: string) => void; move?: (id: string, x: number, y: number) => void; drop?: (id: string, block: string) => void;
  changeText?: (id: string, text: string) => void; connect?: (from: string, to: string, label: Branch, ports?: Ports) => void;
  disconnect?: (from: string, to: string, label: Branch) => void;
  add?: (shape: FlowNode["shape"], x: number, y: number) => void; panView?: (pan: { x: number; y: number }) => void;
  remove?: (id: string) => void; align?: () => void;
};

function flowNodeLayout(node: Pick<FlowNode, "shape"> & { text?: string }) {
  const advance = (char: string) => /[\u0000-\u007f]/.test(char) ? /[MW@%]/.test(char) ? 12 : 8.5 : 14.5;
  const paragraphs = (node.text ?? "").replace(/\r/g, "").split("\n");
  const longest = Math.max(...paragraphs.map(line => [...line].reduce((sum, char) => sum + advance(char), 0)));
  const minimum = node.shape === "terminal" ? 200 : node.shape === "process" ? 210 : 220;
  const width = Math.min(280, Math.max(minimum, Math.ceil(node.shape === "decision" ? longest * 2 + 16 : longest + (node.shape === "io" ? 64 : 48))));
  const inset = node.shape === "decision" ? width / 4 + 4 : node.shape === "io" ? 28 : 20, available = width - inset * 2;
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    let line = "", length = 0;
    for (const char of paragraph) {
      if (line && length + advance(char) > available) { lines.push(line); line = ""; length = 0; }
      line += char; length += advance(char);
    }
    lines.push(line);
  }
  const height = node.shape === "decision" ? Math.max(120, 2 * (lines.length * 20 + 24) + 16) : Math.max(80, lines.length * 20 + 50);
  return { width, height, inset, lines, contentTop: node.shape === "decision" ? height / 4 + 28 : 36 };
}
export function flowNodeSize(node: Pick<FlowNode, "shape"> & { text?: string }) { const { width, height } = flowNodeLayout(node); return { width, height }; }
function portPoint(node: FlowNode, side: Port) {
  const { width, height } = flowNodeSize(node);
  return { x: node.x + (side === "left" ? 0 : side === "right" ? width : width / 2), y: node.y + (side === "top" ? 0 : side === "bottom" ? height : height / 2) };
}
function nodePorts(node: FlowNode): Port[] {
  const start = node.shape === "terminal" && /^(시작|출발)/.test(node.text), end = node.shape === "terminal" && /^(종료|끝|마침|도착)/.test(node.text);
  return [...(!start ? ["top" as const] : []), ...(!end ? ["bottom" as const] : []), "left", "right"];
}
function portLabel(node: FlowNode, side: Port): Branch { return node.shape !== "decision" || side === "top" ? "" : side === "bottom" ? "예" : "아니오"; }
function receivesConnection(node: FlowNode, side: Port) { return side !== "bottom" && !(node.shape === "terminal" && /^(시작|출발)/.test(node.text)); }
function pathBetween(source: { x: number; y: number }, fromPort: Port, target: { x: number; y: number }, toPort: Port) {
  const { x: x1, y: y1 } = source, { x: x2, y: y2 } = target, start = `M${x1},${y1}`, loop = y2 <= y1 + 14;
  // V1's orthogonal routing, using the persisted side rather than changing the graph.
  if (fromPort === "bottom") {
    if (toPort === "top") {
      if (loop) { const x = x2 < x1 - 30 ? Math.min(x1 - 40, x2 - 55) : Math.max(x1 + 40, x2 + 55); return `${start} V${y1 + 16} H${x} V${y2 - 20} H${x2} V${y2}`; }
      return `${start} V${(y1 + y2) / 2} H${x2} V${y2}`;
    }
    if (toPort === "left") return x2 < x1 ? `${start} V${(y1 + y2) / 2} H${x2 - 25} V${y2} H${x2}` : `${start} V${y2} H${x2}`;
    if (toPort === "right") return x2 > x1 ? `${start} V${(y1 + y2) / 2} H${x2 + 25} V${y2} H${x2}` : `${start} V${y2} H${x2}`;
    return `${start} V${Math.max(y1, y2) + 25} H${x2} V${y2}`;
  }
  if (fromPort === "right" || fromPort === "left") {
    const sign = fromPort === "right" ? 1 : -1, ahead = sign * (x2 - x1) > 25, outside = sign > 0 ? Math.max : Math.min;
    if (toPort === "top") {
      if (loop) return sign * (x2 - x1) < -25 ? `${start} H${x1 + sign * 22} V${Math.min(y1, y2) - 22} H${x2} V${y2}` : `${start} H${outside(x1 + sign * 35, x2 + sign * 55)} V${y2 - 20} H${x2} V${y2}`;
      return ahead ? `${start} H${x2} V${y2}` : `${start} H${outside(x1 + sign * 35, x2 + sign * 45)} V${(y1 + y2) / 2} H${x2} V${y2}`;
    }
    if (toPort === (sign > 0 ? "left" : "right")) return ahead ? `${start} H${(x1 + x2) / 2} V${y2} H${x2}` : `${start} H${x1 + sign * 35} V${(y1 + y2) / 2} H${x2 - sign * 25} V${y2} H${x2}`;
    if (toPort === fromPort) return `${start} H${outside(x1, x2) + sign * 45} V${y2} H${x2}`;
    return `${start} H${x2} V${y2}`;
  }
  return toPort === "top" ? `${start} V${Math.min(y1, y2) - 25} H${x2} V${y2}` : `${start} V${y1 - 20} H${(x1 + x2) / 2} V${y2} H${x2}`;
}

function EditableLabel({ node, change, done }: { node: FlowNode; change: (text: string) => void; done: (restore: boolean) => void }) {
  const editor = useRef<HTMLDivElement>(null), mounted = useRef(false), composing = useRef(false), { width, height, inset, contentTop, lines } = flowNodeLayout(node);
  useEffect(() => {
    const element = editor.current; if (!element) return;
    // Keep the composing DOM intact; useWork remains the only owner of saved text.
    if (!mounted.current) {
      element.textContent = node.text; element.focus();
      const range = document.createRange(); range.selectNodeContents(element); const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range); mounted.current = true;
    } else if (document.activeElement !== element) element.textContent = node.text;
  }, [node.text]);
  function save(element: HTMLDivElement) { const text = element.innerText.replace(/\r/g, "").slice(0, 1000); if (element.innerText.length > 1000) element.textContent = text; change(text); }
  return <foreignObject x={inset} y={contentTop - 4} width={width - inset * 2} height={Math.max(lines.length * 20 + 8, node.shape === "decision" ? height / 2 - 28 : height - contentTop - 10)}>
    <div ref={editor} className={canvas.nodeEditor} contentEditable="plaintext-only" suppressContentEditableWarning role="textbox" aria-label={`${shapeName(node.shape)} 기호 문구 직접 편집`} aria-multiline="true"
      onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}
      onCompositionStart={() => { composing.current = true; }} onCompositionEnd={event => { composing.current = false; save(event.currentTarget); }}
      onInput={event => { if (!composing.current) save(event.currentTarget); }} onBlur={event => { save(event.currentTarget); done(false); }}
      onKeyDown={event => {
        event.stopPropagation(); if (event.nativeEvent.isComposing || composing.current || event.keyCode === 229) return;
        if ((event.key === "Enter" && !event.shiftKey) || event.key === "Escape") { event.preventDefault(); save(event.currentTarget); done(true); }
      }} />
  </foreignObject>;
}

function FlowPorts({ node, source, target, register, choose, pointer, cancel }: {
  node: FlowNode; source?: string; target?: string; register: (side: Port, element: SVGGElement | null) => void;
  choose: (side: Port, pointerClick?: boolean) => void; pointer: (event: PointerEvent<SVGGElement>, side: Port) => void; cancel: () => void;
}) {
  return nodePorts(node).map(side => {
    const p = portPoint({ ...node, x: 0, y: 0 }, side), label = portLabel(node, side);
    const title = side === "top" ? "상단 연결점" : side === "bottom" ? node.shape === "decision" ? "[예] 분기점 (하단)" : "하단 연결점" : side === "left" ? node.shape === "decision" ? "[아니오] 분기점 (좌측)" : "좌측 연결점" : node.shape === "decision" ? "[아니오] 분기점 (우측)" : "우측 연결점";
    const name = `${node.text || "빈 기호"} ${side === "top" ? "연결 받기" : side === "bottom" ? `${label || "다음"} 연결점` : side === "right" && node.shape === "decision" ? "아니오 연결점" : `${side === "left" ? "왼쪽" : "오른쪽"} 연결점`}`;
    return <g key={side} ref={element => register(side, element)} className={canvas.port} data-flow-controls data-flow-input={node.id} data-flow-port={side} data-direction={side === "top" ? "input" : side === "bottom" ? "output" : "both"} data-branch={label} data-valid={receivesConnection(node, side) && !!source && source !== node.id} data-target={target === `${node.id}:${side}`} role="button" tabIndex={0} aria-label={name} transform={`translate(${p.x},${p.y})`}
      onPointerDown={event => pointer(event, side)} onClick={event => { event.stopPropagation(); choose(side, true); }} onKeyDown={event => { event.stopPropagation(); if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(side); } if (event.key === "Escape") cancel(); }}>
      <title>{title}</title><circle className={canvas.portHit} r="22" /><circle className={canvas.portDot} r="7" />
    </g>;
  });
}

export function FlowDiagram({ nodes, edges, selected, active, fit = false, activeEdge, interaction, output, clearNode, clearableNodes = [], emptyNodes = [], grid: controlledGrid, compactNotice = false, pan = { x: 0, y: 0 }, select, move, drop, changeText, connect, disconnect, add, panView, remove, align, viewportRef, trashRef }: Props) {
  const marker = useId().replace(/:/g, ""), localViewport = useRef<HTMLDivElement>(null), resolvedViewportRef = viewportRef ?? localViewport;
  const svgRef = useRef<SVGSVGElement>(null), trash = useRef<HTMLButtonElement>(null), centered = useRef(false);
  const nodeElements = useRef(new Map<string, SVGGElement>()), portElements = useRef(new Map<string, SVGGElement>()), restoreFocus = useRef<string | null>(null);
  const startLocation = useRef<{ x: number; width: number; label: string } | null>(null), manuallyViewed = useRef(Boolean(pan.x || pan.y)), previousPan = useRef(pan);
  const gesture = useRef<{ kind: "move" | "pan" | "connect"; id?: string; label?: Branch; side?: Port; x: number; y: number; originX: number; originY: number } | null>(null), completedLink = useRef<{ node: string; side: Port } | null>(null);
  const [editing, setEditing] = useState(""), [grid, setGrid] = useState(true), [notice, setNotice] = useState("");
  const [moving, setMoving] = useState<{ id: string; x: number; y: number } | null>(null), [viewPan, setViewPan] = useState<{ x: number; y: number } | null>(null), [trashActive, setTrashActive] = useState(false);
  const resolvedTrash = trashRef ?? trash;
  useEffect(() => { const element = resolvedTrash.current; element?.setAttribute("data-active", String(trashActive)); return () => element?.removeAttribute("data-active"); }, [resolvedTrash, trashActive]);
  const [connection, setConnection] = useState<{ from: string; label: Branch; side: Port; x: number; y: number; target?: string; targetSide?: Port } | null>(null);
  const effectivePan = viewPan ?? pan, displayedNodes = moving ? nodes.map(node => node.id === moving.id ? { ...node, x: moving.x, y: moving.y } : node) : nodes;
  const viewOrigin = fit ? { x: (displayedNodes.length ? Math.min(...displayedNodes.map(n => n.x)) : 0) - 24, y: (displayedNodes.length ? Math.min(...displayedNodes.map(n => n.y)) : 0) - 24 } : effectivePan;
  const width = fit ? Math.max(280, ...displayedNodes.map(n => n.x + flowNodeSize(n).width + 24 - viewOrigin.x)) : Math.max(1000, ...displayedNodes.map(n => n.x + flowNodeSize(n).width + 150));
  const height = fit ? Math.max(160, ...displayedNodes.map(n => n.y + flowNodeSize(n).height + 40 - viewOrigin.y)) : Math.max(800, ...displayedNodes.map(n => n.y + flowNodeSize(n).height + 120));
  function showStart() {
    const start = nodes.find(n => n.shape === "terminal" && /^(시작|출발)/.test(n.text)), element = resolvedViewportRef.current; if (!start || !element) return;
    manuallyViewed.current = false; const size = flowNodeSize(start);
    if (panView) { element.scrollLeft = 0; element.scrollTop = 0; panView({ x: Math.round(start.x - (element.clientWidth - size.width) / 2), y: start.y - 32 }); }
    else { element.scrollLeft = Math.max(0, start.x - viewOrigin.x - (element.clientWidth - size.width) / 2); element.scrollTop = Math.max(0, start.y - viewOrigin.y - 20); }
  }
  useEffect(() => {
    if (previousPan.current.x !== pan.x || previousPan.current.y !== pan.y) manuallyViewed.current = true;
    previousPan.current = { x: pan.x, y: pan.y };
    const element = resolvedViewportRef.current, start = nodes.find(n => n.shape === "terminal" && /^(시작|출발)/.test(n.text));
    startLocation.current = start ? { x: start.x - viewOrigin.x, width: flowNodeSize(start).width, label: `시작·종료 기호: ${start.text}` } : null;
    if (!centered.current && element && start) { if (!fit) element.scrollLeft = Math.max(0, start.x - pan.x - (element.clientWidth - flowNodeSize(start).width) / 2); centered.current = true; }
    if (restoreFocus.current) { const id = restoreFocus.current; restoreFocus.current = null; if (id === "canvas") element?.focus({ preventScroll: true }); else nodeElements.current.get(id)?.focus({ preventScroll: true }); }
  }, [nodes, pan.x, pan.y, viewOrigin.x, editing, edges, resolvedViewportRef, fit]);
  useEffect(() => {
    const element = resolvedViewportRef.current; if (!element) return;
    let previousWidth = element.clientWidth, previousLeft = element.scrollLeft;
    const rememberScroll = () => { if (element.clientWidth === previousWidth) previousLeft = element.scrollLeft; };
    element.addEventListener("scroll", rememberScroll);
    const observer = new ResizeObserver(() => {
      const newWidth = element.clientWidth;
      if (previousWidth > 0 && newWidth > 0) {
        let left = Math.max(0, previousLeft + (previousWidth - newWidth) / 2); const start = startLocation.current;
        const editingOtherNode = element.contains(document.activeElement) && document.activeElement?.getAttribute("aria-label") !== start?.label;
        if (start && !manuallyViewed.current && !editingOtherNode && newWidth >= start.width && start.x >= previousLeft && start.x + start.width <= previousLeft + previousWidth) left = Math.max(start.x + start.width - newWidth, Math.min(left, start.x));
        element.scrollLeft = Math.max(0, left);
      }
      previousWidth = newWidth; previousLeft = element.scrollLeft;
    }); observer.observe(element);
    return () => { observer.disconnect(); element.removeEventListener("scroll", rememberScroll); };
  }, [resolvedViewportRef]);
  function point(clientX: number, clientY: number) { const box = svgRef.current!.getBoundingClientRect(); return { x: (clientX - box.left) * width / box.width + viewOrigin.x, y: (clientY - box.top) * height / box.height + viewOrigin.y }; }
  function overTrash(x: number, y: number) { const box = resolvedTrash.current?.getBoundingClientRect(); return !!box && x >= box.left && x <= box.right && y >= box.top && y <= box.bottom; }
  function deleteNode(id: string) { if (!remove) return; restoreFocus.current = "canvas"; remove(id); setEditing(""); setConnection(null); }
  function editNode(node: FlowNode) { if (!changeText) return; select?.(node.id); setConnection(null); setEditing(node.id); }
  function cancelConnection() { setConnection(null); setNotice("연결을 취소했어요."); }
  function startConnection(node: FlowNode, side: Port) {
    if (!connect) return;
    if (side === "top") { setNotice("상단은 입력 연결점이에요. 출발 기호의 하단이나 측면 연결점을 먼저 고르세요."); return; }
    if (node.shape === "terminal" && /^(종료|끝|마침|도착)/.test(node.text)) { setNotice("종료 기호에서는 다른 기호로 연결할 수 없어요. 출발 기호의 연결점을 먼저 고르세요."); return; }
    const label = portLabel(node, side), location = portPoint(node, side); setConnection({ from: node.id, label, side, x: location.x + (side === "right" ? 50 : side === "left" ? -50 : 0), y: location.y + (side === "bottom" ? 50 : 0) });
    setNotice(`${node.text}에서 ${label || "다음"}으로 이어질 기호의 연결점을 고르세요.`);
  }
  function finishConnection(to: string, toPort: Port, from = connection?.from, label = connection?.label, fromPort = connection?.side) {
    if (!from || from === to || label === undefined || !connect) return;
    const target = nodes.find(node => node.id === to);
    if (!target || !receivesConnection(target, toPort)) { setNotice("화살표를 받을 기호의 상단이나 측면 입력 연결점을 고르세요."); return; }
    connect(from, to, label, { fromPort, toPort }); setConnection(null); setNotice("연결할 기호를 골랐어요.");
  }
  function nearestPort(clientX: number, clientY: number, source: string) {
    const frame = resolvedViewportRef.current?.getBoundingClientRect(); if (!frame || clientX < frame.left || clientX > frame.right || clientY < frame.top || clientY > frame.bottom) return;
    let nearest: { node: FlowNode; side: Port; point: { x: number; y: number }; distance: number } | undefined;
    for (const node of displayedNodes) if (node.id !== source) for (const side of nodePorts(node).filter(side => receivesConnection(node, side))) {
      const box = portElements.current.get(`${node.id}:${side}`)?.getBoundingClientRect(); if (!box) continue;
      const distance = Math.hypot(clientX - (box.left + box.width / 2), clientY - (box.top + box.height / 2));
      if (distance < 36 && (!nearest || distance < nearest.distance)) nearest = { node, side, point: portPoint(node, side), distance };
    }
    return nearest;
  }
  const renderShape = (node: FlowNode) => {
    const { width: w, height: h } = flowNodeSize(node), common = { className: canvas.nodeBody, "data-flow-shape": true };
    return node.shape === "terminal" ? <rect {...common} x="2" y="2" width={w - 4} height={h - 4} rx={Math.min(38, (h - 4) / 2)} /> : node.shape === "decision" ? <polygon {...common} points={`${w / 2},4 ${w - 4},${h / 2} ${w / 2},${h - 4} 4,${h / 2}`} /> : node.shape === "io" ? <polygon {...common} points={`22,2 ${w - 2},2 ${w - 22},${h - 2} 2,${h - 2}`} /> : <rect {...common} x="2" y="2" width={w - 4} height={h - 4} rx="6" />;
  };
  const anchorNode = displayedNodes.find(node => node.id === (interaction ? active : output?.nodeId));
  const overlay = interaction || (output && <div role="status" className={canvas.outputBubble}><strong>출력 결과</strong><p>{output.text}</p></div>);
  return <div className={canvas.canvas} data-flow-canvas data-fit={fit}>
    <div className={canvas.canvasTools} data-flow-toolbar>
      <Button variant="outline" onClick={showStart}>시작으로 보기</Button>
      {panView && <Button variant="outline" disabled={!nodes.length} onClick={() => { const element = resolvedViewportRef.current; if (!element) return; element.scrollLeft = 0; element.scrollTop = 0; panView({ x: Math.round((Math.min(...nodes.map(n => n.x)) + Math.max(...nodes.map(n => n.x + flowNodeSize(n).width)) - element.clientWidth) / 2), y: Math.round((Math.min(...nodes.map(n => n.y)) + Math.max(...nodes.map(n => n.y + flowNodeSize(n).height)) - element.clientHeight) / 2) }); }}>화면 중앙</Button>}
      {align && <Button variant="outline" disabled={nodes.length < 2} onClick={align}>기호 세로 정렬</Button>}
      {remove && <Button ref={trash} className={canvas.trash} data-active={trashActive} variant="outline" disabled={!selected && !moving} aria-label="선택 기호 휴지통" onClick={() => { if (selected) deleteNode(selected); }}>휴지통</Button>}
      {changeText && <label className={canvas.gridControl}><input type="checkbox" checked={grid} onChange={event => setGrid(event.target.checked)} />모눈</label>}
    </div>
    {connect && (!compactNotice || notice || connection) && <div className={canvas.connectionNotice} data-compact={compactNotice} role="status"><span>{notice || "기호 안의 글을 눌러 고치고, 파란 점을 끌어 연결해요. 연결선은 두 번 눌러 지울 수 있어요."}</span><Button variant="ghost" disabled={!connection} onClick={cancelConnection}>연결 취소</Button></div>}
    <div ref={resolvedViewportRef} className={canvas.diagram} tabIndex={panView ? 0 : undefined} data-grid={controlledGrid ?? grid} aria-label="실제 순서도 연결" onWheel={() => { manuallyViewed.current = true; }} onKeyDown={event => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) manuallyViewed.current = true; if (event.key === "Escape" && connection) { event.preventDefault(); cancelConnection(); } }}
        onClick={event => { if (!(event.target as Element).closest("[data-flow-node],[data-flow-edge],[data-flow-interaction]")) select?.(""); }}
        onDragOver={event => { if (add) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; } }} onDrop={event => { if (!add) return; event.preventDefault(); const shape = event.dataTransfer.getData("application/x-cs-flow-shape"); if (!["terminal", "io", "process", "decision"].includes(shape)) return; const location = point(event.clientX, event.clientY), size = flowNodeSize({ shape: shape as FlowNode["shape"] }); add(shape as FlowNode["shape"], Math.round(location.x - size.width / 2), Math.round(location.y - size.height / 2)); }}
        onPointerDown={event => { manuallyViewed.current = true; if (!panView || event.button !== 0 || (event.target as Element).closest("[data-flow-node],[data-flow-edge],[data-flow-interaction]")) return; event.preventDefault(); gesture.current = { kind: "pan", x: event.clientX, y: event.clientY, originX: pan.x, originY: pan.y }; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={event => {
          const action = gesture.current; if (!action) return;
          if (action.kind === "pan") setViewPan({ x: Math.max(-10000, Math.min(10000, Math.round(action.originX - event.clientX + action.x))), y: Math.max(-10000, Math.min(10000, Math.round(action.originY - event.clientY + action.y))) });
          else if (action.kind === "move") { const location = point(event.clientX, event.clientY); setMoving({ id: action.id!, x: Math.round(action.originX + location.x - action.x), y: Math.round(action.originY + location.y - action.y) }); setTrashActive(overTrash(event.clientX, event.clientY)); }
          else { const snapped = nearestPort(event.clientX, event.clientY, action.id!), location = snapped?.point ?? point(event.clientX, event.clientY); setConnection({ from: action.id!, label: action.label!, side: action.side!, ...location, target: snapped?.node.id, targetSide: snapped?.side }); }
        }} onPointerUp={event => {
          const action = gesture.current; if (!action) return; gesture.current = null;
          if (action.kind === "pan") { if (viewPan) panView?.(viewPan); setViewPan(null); }
          else if (action.kind === "move") { if (overTrash(event.clientX, event.clientY)) deleteNode(action.id!); else if (moving) move?.(moving.id, moving.x, moving.y); setMoving(null); setTrashActive(false); }
          else { const snapped = nearestPort(event.clientX, event.clientY, action.id!); if (snapped) { finishConnection(snapped.node.id, snapped.side, action.id, action.label, action.side); completedLink.current = { node: action.id!, side: action.side! }; } }
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }} onPointerCancel={event => { gesture.current = null; setMoving(null); setViewPan(null); setConnection(null); setTrashActive(false); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}>
      <div className={canvas.surface} style={{ width, height }}>
      <svg ref={svgRef} style={{ width, height }} viewBox={`${viewOrigin.x} ${viewOrigin.y} ${width} ${height}`} role={select ? "group" : "img"} aria-label="기호와 화살표로 연결한 순서도">
        <defs>{(["", "예", "아니오"] as const).map((label, index) => <marker key={label} id={`${marker}-${index}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={label === "예" ? "#10b981" : label === "아니오" ? "#f59e0b" : "#475569"} /></marker>)}</defs>
        {edges.map((saved, i) => {
          const edge = saved as RoutedEdge, from = displayedNodes.find(n => n.id === edge.from), to = displayedNodes.find(n => n.id === edge.to); if (!from || !to) return null;
          const fromPort = edge.fromPort ?? (edge.label === "아니오" ? "right" : "bottom"), toPort = edge.toPort ?? "top", source = portPoint(from, fromPort), target = portPoint(to, toPort), path = pathBetween(source, fromPort, target, toPort);
          const deleteEdge = () => { if (!disconnect) return; restoreFocus.current = "canvas"; disconnect(edge.from, edge.to, edge.label); setNotice("화살표를 지웠어요."); };
          return <g key={`${edge.from}-${edge.to}-${edge.label}-${i}`} className={canvas.edge} data-flow-edge data-branch={edge.label} data-active={activeEdge?.from === edge.from && activeEdge.to === edge.to && activeEdge.label === edge.label} role={disconnect ? "button" : undefined} tabIndex={disconnect ? 0 : undefined} aria-label={disconnect ? `${from.text}에서 ${to.text} ${edge.label || "다음"} 연결선 삭제` : undefined} onPointerDown={event => event.stopPropagation()} onDoubleClick={event => { event.stopPropagation(); deleteEdge(); }} onKeyDown={event => { if (["Delete", "Backspace", "Enter", " "].includes(event.key)) { event.preventDefault(); event.stopPropagation(); deleteEdge(); } }}>
            <title>{disconnect ? "두 번 눌러 연결선 삭제" : `${from.text} → ${to.text}`}</title><path className={canvas.edgeHit} data-flow-controls d={path} /><path className={canvas.edgeLine} d={path} markerEnd={`url(#${marker}-${edge.label === "예" ? 1 : edge.label === "아니오" ? 2 : 0})`} /><text className={canvas.edgeLabel} x={source.x + (fromPort === "left" ? -24 : 12)} y={source.y + (fromPort === "top" ? -12 : 22)}>{edge.label}</text>
          </g>;
        })}
        {connection && (() => { const source = displayedNodes.find(n => n.id === connection.from); return source ? <path className={canvas.pendingEdge} data-flow-controls data-pending-edge d={pathBetween(portPoint(source, connection.side), connection.side, connection, connection.targetSide ?? "top")} markerEnd={`url(#${marker}-0)`} /> : null; })()}
        {displayedNodes.map(node => {
          const { width: w, height: h, inset, lines, contentTop } = flowNodeLayout(node), headerY = node.shape === "decision" ? h / 4 + 12 : 24;
          return <g key={node.id} ref={element => { if (element) nodeElements.current.set(node.id, element); else nodeElements.current.delete(node.id); }} transform={`translate(${node.x},${node.y})`} data-flow-node={node.id} data-shape={node.shape} data-empty={node.text === "빈 기호" || emptyNodes.includes(node.id)} data-selected={selected === node.id} data-active={active === node.id} role={select ? "button" : undefined} tabIndex={select ? 0 : undefined} aria-label={`${shapeName(node.shape)} 기호: ${node.text}`}
            onDragOver={event => { if (drop) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } }} onDrop={event => { if (drop) { event.preventDefault(); event.stopPropagation(); drop(node.id, event.dataTransfer.getData("text/plain")); } }} onClick={() => select?.(node.id)} onDoubleClick={() => editNode(node)}
            onKeyDown={event => {
              if (event.target !== event.currentTarget || event.nativeEvent.isComposing || event.keyCode === 229) return;
              if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select?.(node.id); }
              if (changeText && event.key === "F2") { event.preventDefault(); editNode(node); }
              if (remove && (event.key === "Delete" || event.key === "Backspace")) { event.preventDefault(); deleteNode(node.id); }
              if (move && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) { event.preventDefault(); select?.(node.id); move(node.id, node.x + (event.key === "ArrowRight" ? 20 : event.key === "ArrowLeft" ? -20 : 0), node.y + (event.key === "ArrowDown" ? 20 : event.key === "ArrowUp" ? -20 : 0)); }
            }} onPointerDown={event => { if (!move || event.button !== 0 || (event.target as Element).closest('[contenteditable],[data-flow-edit],[data-flow-delete]')) return; event.stopPropagation(); select?.(node.id); const location = point(event.clientX, event.clientY); gesture.current = { kind: "move", id: node.id, ...location, originX: node.x, originY: node.y }; event.currentTarget.setPointerCapture(event.pointerId); }}>
            {renderShape(node)}<title>{node.text}</title>
            {changeText && <>
              <text className={canvas.shapeLabel} x={inset} y={headerY}>{shapeBadge(node.shape)}</text>
              <g className={canvas.nodeAction} data-flow-controls data-flow-edit role="button" tabIndex={0} aria-label={`${node.text} 기호 문구 편집`} transform={`translate(${w - inset - (remove ? 28 : 0)},${headerY - 4})`} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); editNode(node); }} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); editNode(node); } }}><circle r="16" /><text textAnchor="middle" y="4">✎</text></g>
              {remove && <g className={`${canvas.nodeAction} ${canvas.deleteAction}`} data-flow-controls data-flow-delete role="button" tabIndex={0} aria-label={`${node.text} 기호 삭제`} transform={`translate(${w - inset},${headerY - 4})`} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); deleteNode(node.id); }} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); deleteNode(node.id); } }}><circle r="16" /><text textAnchor="middle" y="5">×</text></g>}
            </>}
            {clearNode && clearableNodes.includes(node.id) && <g className={`${canvas.nodeAction} ${canvas.deleteAction}`} data-flow-controls data-flow-delete role="button" tabIndex={0} aria-label={`${node.text} 기호 제거`} transform={`translate(${w - 16},16)`} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); restoreFocus.current = node.id; clearNode(node.id); }} onKeyDown={event => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); event.stopPropagation(); restoreFocus.current = node.id; clearNode(node.id); } }}><circle r="16" /><text textAnchor="middle" y="5">×</text></g>}
            {editing === node.id && changeText ? <EditableLabel node={node} change={text => changeText(node.id, text)} done={restore => { if (restore) restoreFocus.current = node.id; setEditing(""); }} /> : <g data-flow-edit={changeText ? true : undefined} className={changeText ? canvas.editableText : undefined} onPointerDown={event => { if (changeText) event.stopPropagation(); }} onClick={event => { if (changeText) { event.stopPropagation(); editNode(node); } }}>
              {changeText && <rect className={canvas.textHit} data-flow-controls x={inset} y={contentTop - 4} width={w - inset * 2} height={lines.length * 20 + 8} />}
              {lines.map((line, index) => <text className={canvas.nodeText} data-flow-label key={index} x={w / 2} y={(changeText ? contentTop + 12 : h / 2 + 5 - (lines.length - 1) * 10) + index * 20} textAnchor="middle" xmlSpace="preserve">{line}</text>)}
            </g>}
            {connect && <FlowPorts node={node} source={connection?.from} target={connection?.target && connection.targetSide ? `${connection.target}:${connection.targetSide}` : undefined}
              register={(side, element) => { const key = `${node.id}:${side}`; if (element) portElements.current.set(key, element); else portElements.current.delete(key); }}
              choose={(side, pointerClick) => { const completed = completedLink.current; completedLink.current = null; if (pointerClick && completed?.node === node.id && completed.side === side) return; if (connection && connection.from !== node.id) finishConnection(node.id, side); else startConnection(node, side); }}
              pointer={(event, side) => { event.stopPropagation(); if (event.button !== 0 || side === "top" || (connection && connection.from !== node.id) || (node.shape === "terminal" && /^(종료|끝|마침|도착)/.test(node.text))) return; completedLink.current = null; startConnection(node, side); gesture.current = { kind: "connect", id: node.id, label: portLabel(node, side), side, x: event.clientX, y: event.clientY, originX: node.x, originY: node.y }; event.currentTarget.setPointerCapture(event.pointerId); }} cancel={cancelConnection} />}
          </g>;
        })}
      </svg>
      {anchorNode && overlay && <div className={canvas.interaction} data-flow-interaction data-node-id={anchorNode.id} style={{ left: Math.max(8, anchorNode.x - viewOrigin.x + flowNodeSize(anchorNode).width / 2 - 144), top: anchorNode.y - viewOrigin.y + flowNodeSize(anchorNode).height + 12 }} onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>{overlay}</div>}
      </div>
    </div>
  </div>;
}
