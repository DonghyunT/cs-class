"use client";
import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { FlowchartProject, FlowNode } from "@/lib/classroom/review/project";
import styles from "./review.module.css";
export function FlowDiagram({ nodes, edges, selected, active, pan = { x: 0, y: 0 }, select, move }: Pick<FlowchartProject, "nodes" | "edges"> & { selected?: string; active?: string; pan?: { x: number; y: number }; select?: (id: string) => void; move?: (id: string, x: number, y: number) => void }) {
  const marker = useId().replace(/:/g, "");
  const viewport = useRef<HTMLDivElement>(null), centered = useRef(false);
  function showStart() { const start = nodes.find(n => n.shape === "terminal" && /^(시작|출발)/.test(n.text)), element = viewport.current; if (start && element) { element.scrollLeft = Math.max(0, start.x - pan.x - (element.clientWidth - 160) / 2); element.scrollTop = Math.max(0, start.y - pan.y - 20); } }
  useEffect(() => { const element = viewport.current, start = nodes.find(n => n.shape === "terminal" && /^(시작|출발)/.test(n.text)); if (!centered.current && element && start) { element.scrollLeft = Math.max(0, start.x - pan.x - (element.clientWidth - 160) / 2); centered.current = true; } }, [nodes, pan.x]);
  const width = Math.max(1000, ...nodes.map(n => n.x + 350)), height = Math.max(800, ...nodes.map(n => n.y + 200));
  const renderShape = (node: FlowNode) => node.shape === "terminal" ? <ellipse cx="80" cy="42" rx="78" ry="40" /> : node.shape === "decision" ? <polygon points="80,0 160,42 80,84 0,42" /> : node.shape === "io" ? <polygon points="20,0 160,0 140,84 0,84" /> : <rect width="160" height="84" rx="8" />;
  return <div className={styles.canvas}>
    <Button variant="outline" onClick={showStart}>시작으로 보기</Button>
    <div ref={viewport} className={styles.diagram} aria-label="실제 순서도 연결">
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
        {nodes.map(node => <g key={node.id} transform={`translate(${node.x},${node.y})`} data-selected={selected === node.id} data-active={active === node.id} role={select ? "button" : undefined} tabIndex={select ? 0 : undefined} aria-label={`${node.shape === "terminal" ? "시작·종료" : node.shape === "io" ? "입출력" : node.shape === "decision" ? "판단" : "처리"} 기호: ${node.text}`} onClick={() => select?.(node.id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select?.(node.id); } if (move && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) { event.preventDefault(); select?.(node.id); move(node.id, node.x + (event.key === "ArrowRight" ? 20 : event.key === "ArrowLeft" ? -20 : 0), node.y + (event.key === "ArrowDown" ? 20 : event.key === "ArrowUp" ? -20 : 0)); } }} onPointerDown={event => { if (!move) return; event.currentTarget.setPointerCapture(event.pointerId); select?.(node.id); }} onPointerMove={event => { if (!move || !event.currentTarget.hasPointerCapture(event.pointerId)) return; const svg = event.currentTarget.ownerSVGElement!, box = svg.getBoundingClientRect(); move(node.id, Math.round((event.clientX - box.left) * width / box.width + pan.x - 80), Math.round((event.clientY - box.top) * height / box.height + pan.y - 42)); }} onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}>
          {renderShape(node)}<title>{node.text}</title>{(node.text.match(/.{1,12}/g) ?? [""]).slice(0, 3).map((line, index, lines) => <text key={index} x="80" y={48 - (lines.length - 1) * 8 + index * 16} textAnchor="middle">{line}{index === 2 && node.text.length > 36 ? "…" : ""}</text>)}
        </g>)}
      </svg>
    </div>
  </div>;
}
