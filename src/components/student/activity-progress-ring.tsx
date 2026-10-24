"use client";

import { useEffect, useId, useState } from "react";
import type { Stage } from "@/lib/classroom/types";
import styles from "./activity-progress-ring.module.css";

type ActivityPart = { stage: Stage; label: string; completed: number; total: number; percent: number };

const pointAt = (degrees: number, radius: number) => `${90 + radius * Math.sin(degrees * Math.PI / 180)},${90 - radius * Math.cos(degrees * Math.PI / 180)}`;
const sectorPath = (index: number) => `M ${pointAt(index * 120, 78)} A 78 78 0 0 1 ${pointAt((index + 1) * 120, 78)}`;
// Clip rounded caps at shared edges so completed colors join without overlap.
const sectorClip = (index: number) => `M 90,90 L ${pointAt(index * 120, 90)} A 90 90 0 0 1 ${pointAt((index + 1) * 120, 90)} Z`;

export function ActivityProgressRing({ parts, label = "전체 필수 활동 완료율", size = "normal", interactive = true }: {
  parts: readonly ActivityPart[];
  label?: string;
  size?: "normal" | "compact";
  interactive?: boolean;
}) {
  const tooltipId = useId();
  const [hovered, setHovered] = useState<Stage | null>(null);
  const [focused, setFocused] = useState<Stage | null>(null);
  const completed = parts.reduce((sum, part) => sum + part.completed, 0);
  const total = parts.reduce((sum, part) => sum + part.total, 0);
  const percent = total ? Math.round(completed / total * 100) : 0;
  const detail = interactive ? parts.find(part => part.stage === (hovered ?? focused)) : undefined;
  const detailOpen = total > 0 && Boolean(detail);
  useEffect(() => {
    if (!detailOpen) return;
    const dismiss = (event: KeyboardEvent) => { if (event.key === "Escape") { setHovered(null); setFocused(null); } };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [detailOpen]);
  if (!total) return null;
  return <div className={styles.widget} data-size={size} onPointerLeave={() => setHovered(null)}>
    <div className={styles.ring}>
      <svg viewBox="0 0 180 180" aria-hidden="true"><defs>{parts.map((part, index) => <clipPath key={part.stage} id={`${tooltipId}-${part.stage}`}><path d={sectorClip(index)} /></clipPath>)}</defs>{parts.map((part, index) => <g key={part.stage} className={styles[part.stage]} onPointerEnter={interactive ? () => setHovered(part.stage) : undefined}>
        <path className={styles.track} data-stage={part.stage} d={sectorPath(index)} />
        {part.percent > 0 && <path className={styles.fill} d={sectorPath(index)} pathLength="100" strokeDasharray={`${part.percent} 100`} clipPath={`url(#${tooltipId}-${part.stage})`} />}
        {/* At 0% every stage shows a half-circle start: a near-zero arc whose round cap the sector clip cuts in half. */}
        {completed === 0 && <path data-start-marker="true" className={styles.startMarker} d={`M ${pointAt(index * 120, 78)} A 78 78 0 0 1 ${pointAt(index * 120 + 0.1, 78)}`} clipPath={`url(#${tooltipId}-${part.stage})`} />}
      </g>)}</svg>
      <div className={styles.value} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`필수 활동 ${completed}/${total}개 완료`}><strong aria-hidden="true">{percent}<small>%</small></strong>{size === "normal" && <span aria-hidden="true">전체 진도</span>}</div>
      {detail && <div id={tooltipId} role="tooltip" className={`${styles.tooltip} ${styles[detail.stage]}`}><span>{detail.label}</span><strong>{detail.completed}/{detail.total}개 완료</strong><span>{detail.percent}%</span></div>}
    </div>
    {interactive && <div className={styles.legend} aria-label="단계별 진도 확인">{parts.map(part => <button key={part.stage} type="button" className={styles[part.stage]} aria-label={`${part.label} 진도: ${part.completed}/${part.total}개 완료, ${part.percent}%`} aria-describedby={detail?.stage === part.stage ? tooltipId : undefined} onPointerEnter={event => { if (event.pointerType !== "touch") setHovered(part.stage); }} onFocus={() => { setHovered(null); setFocused(part.stage); }} onBlur={() => setFocused(null)} onClick={() => setFocused(part.stage)}><span className={styles.dot} aria-hidden="true" />{part.label}</button>)}</div>}
  </div>;
}
