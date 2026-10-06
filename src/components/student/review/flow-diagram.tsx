"use client";
import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { FlowchartProject, FlowNode } from "@/lib/classroom/review/project";
import styles from "./review.module.css";
export function FlowDiagram({ nodes, edges, selected, active, pan = { x: 0, y: 0 }, select, move, drop }: Pick<FlowchartProject, "nodes" | "edges"> & { selected?: string; active?: string; pan?: { x: number; y: number }; select?: (id: string) => void; move?: (id: string, x: number, y: number) => void; drop?: (id: string, block: string) => void }) {
  const marker = useId().replace(/:/g, "");
  const viewport = useRef<HTMLDivElement>(null), centered = useRef(false);
  const startLocation = useRef<{ x: number; label: string } | null>(null);
  const manuallyViewed = useRef(Boolean(pan.x || pan.y)), previousPan = useRef(pan);
  function showStart() { const start = nodes.find(n => n.shape === "terminal" && /^(시작|출발)/.test(n.text)), element = viewport.current; if (start && element) { manuallyViewed.current = false; element.scrollLeft = Math.max(0, start.x - pan.x - (element.clientWidth - 160) / 2); element.scrollTop = Math.max(0, start.y - pan.y - 20); } }
  useEffect(() => {
    if (previousPan.current.x !== pan.x || previousPan.current.y !== pan.y) manuallyViewed.current = true;
    previousPan.current = { x: pan.x, y: pan.y };
    const element = viewport.current, start = nodes.find(n => n.shape === "terminal" && /^(시작|출발)/.test(n.text));
    startLocation.current = start ? { x: start.x - pan.x, label: `시작·종료 기호: ${start.text}` } : null;
    if (!centered.current && element && start) { element.scrollLeft = Math.max(0, start.x - pan.x - (element.clientWidth - 160) / 2); centered.current = true; }
  }, [nodes, pan.x, pan.y]);
  useEffect(() => {
    const element = viewport.current; if (!element) return;
    let previousWidth = element.clientWidth, previousLeft = element.scrollLeft;
    const rememberScroll = () => { if (element.clientWidth === previousWidth) previousLeft = element.scrollLeft; };
    element.addEventListener("scroll", rememberScroll);
    // Use the pre-resize scroll position; the browser may already have clamped it.
    const observer = new ResizeObserver(() => {
      const width = element.clientWidth;
      if (previousWidth > 0 && width > 0) {
        let left = Math.max(0, previousLeft + (previousWidth - width) / 2);
        const start = startLocation.current;
        const editingOtherNode = element.contains(document.activeElement) && document.activeElement?.getAttribute("aria-label") !== start?.label;
        if (start && !manuallyViewed.current && !editingOtherNode && width >= 160 && start.x >= previousLeft && start.x + 160 <= previousLeft + previousWidth) {
          // Keep a fully visible start visible without pulling a manually panned view back.
          left = Math.max(start.x + 160 - width, Math.min(left, start.x));
        }
        element.scrollLeft = Math.max(0, left);
      }
      previousWidth = width; previousLeft = element.scrollLeft;
    });
    observer.observe(element);
    return () => { observer.disconnect(); element.removeEventListener("scroll", rememberScroll); };
  }, []);
  const width = Math.max(1000, ...nodes.map(n => n.x + 350)), height = Math.max(800, ...nodes.map(n => n.y + 200));
  const renderShape = (node: FlowNode) => node.shape === "terminal" ? <ellipse cx="80" cy="42" rx="78" ry="40" /> : node.shape === "decision" ? <polygon points="80,0 160,42 80,84 0,42" /> : node.shape === "io" ? <polygon points="20,0 160,0 140,84 0,84" /> : <rect width="160" height="84" rx="8" />;
  return <div className={styles.canvas}>
    <Button variant="outline" onClick={showStart}>시작으로 보기</Button>
    <div ref={viewport} className={styles.diagram} aria-label="실제 순서도 연결" onWheel={() => { manuallyViewed.current = true; }} onPointerDown={() => { manuallyViewed.current = true; }} onKeyDown={event => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) manuallyViewed.current = true; }}>
      <svg style={{ width, height }} viewBox={`${pan.x} ${pan.y} ${width} ${height}`} role={select ? "group" : "img"} aria-label="기호와 화살표로 연결한 순서도">
        <defs>
          <marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#5278bc" />
          </marker>
        </defs>
        {edges.map((edge, i) => {
          const from = nodes.find(n => n.id === edge.from), to = nodes.find(n => n.id === edge.to); if (!from || !to) return null; const sx = from.x + (edge.label === "아니오" ? 160 : 80), sy = from.y + (edge.label === "아니오" ? 42 : 84), tx = to.x + 80, ty = to.y; const detour = Math.max(from.x, to.x) + 220; return <g key={`${edge.from}-${edge.to}-${edge.label}-${i}`}>
            <path d={ty > sy && edge.label !== "아니오" ? `M${sx},${sy} L${sx},${(sy + ty) / 2} L${tx},${(sy + ty) / 2} L${tx},${ty}` : `M${sx},${sy} L${detour},${sy} L${detour},${ty - 20} L${tx},${ty - 20} L${tx},${ty}`} stroke="#5278bc" strokeWidth="2" fill="none" markerEnd={`url(#${marker})`} />
            <text x={sx + 8} y={sy + 18}>{edge.label}</text>
          </g>;
        })}
        {nodes.map(node => <g key={node.id} transform={`translate(${node.x},${node.y})`} data-shape={node.shape} data-empty={node.text === "빈 기호"} data-selected={selected === node.id} data-active={active === node.id} role={select ? "button" : undefined} tabIndex={select ? 0 : undefined} aria-label={`${node.shape === "terminal" ? "시작·종료" : node.shape === "io" ? "입출력" : node.shape === "decision" ? "판단" : "처리"} 기호: ${node.text}`} onDragOver={event => { if (drop) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; } }} onDrop={event => { if (drop) { event.preventDefault(); drop(node.id,event.dataTransfer.getData("text/plain")); } }} onClick={() => select?.(node.id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select?.(node.id); } if (move && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) { event.preventDefault(); select?.(node.id); move(node.id, node.x + (event.key === "ArrowRight" ? 20 : event.key === "ArrowLeft" ? -20 : 0), node.y + (event.key === "ArrowDown" ? 20 : event.key === "ArrowUp" ? -20 : 0)); } }} onPointerDown={event => { if (!move) return; event.currentTarget.setPointerCapture(event.pointerId); select?.(node.id); }} onPointerMove={event => { if (!move || !event.currentTarget.hasPointerCapture(event.pointerId)) return; const svg = event.currentTarget.ownerSVGElement!, box = svg.getBoundingClientRect(); move(node.id, Math.round((event.clientX - box.left) * width / box.width + pan.x - 80), Math.round((event.clientY - box.top) * height / box.height + pan.y - 42)); }} onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}>
          {renderShape(node)}<title>{node.text}</title>{(node.text.match(/.{1,12}/g) ?? [""]).slice(0, 3).map((line, index, lines) => <text key={index} x="80" y={48 - (lines.length - 1) * 8 + index * 16} textAnchor="middle">{line}{index === 2 && node.text.length > 36 ? "…" : ""}</text>)}
        </g>)}
      </svg>
    </div>
  </div>;
}
