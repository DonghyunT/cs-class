"use client";

import { Fragment, type ReactNode } from "react";
import { ArrowLeftRight, GitFork, Play, RotateCcw, Shapes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { assembledIds, BLOCK_PARTS, blockText } from "@/lib/classroom/assemble";
import type { Question } from "@/lib/classroom/types";
import styles from "./concept-visual.module.css";

type Kind = NonNullable<Question["assemble"]>["blocks"][number]["kind"];
const ICONS: Record<Kind, ReactNode> = { flow: <GitFork size={15} />, moving: <ArrowLeftRight size={15} />, looks: <Shapes size={15} />, variable: <b>?</b> };

// A block label's marks become Entry's own parts: number circle, dropdown, condition hexagon, value pill.
function BlockParts({ label }: { label: string }) {
  const out: ReactNode[] = [];
  let at = 0;
  for (const m of label.matchAll(BLOCK_PARTS)) {
    if (m.index > at) out.push(<span key={at}>{label.slice(at, m.index).trim()}</span>);
    if (m[1]) out.push(<span key={m.index} className={styles.ebNumber}>{m[1]}</span>);
    else if (m[2]) out.push(<span key={m.index} className={styles.ebDrop}>{m[2]} ▾</span>);
    else if (m[3]) out.push(<span key={m.index} className={styles.ebHex}><span className={styles.ebDrop}>{m[3]} ▾</span><span>{m[4]}</span></span>);
    else out.push(<span key={m.index} className={styles.ebValue}><span>{m[5]}</span><span className={styles.ebDrop}>{m[6]} ▾</span><span>{m[7]}</span></span>);
    at = m.index + m[0].length;
  }
  if (at < label.length) out.push(<span key={at}>{label.slice(at).trim()}</span>);
  return <>{out}</>;
}

const EntryBlock = ({ kind, label }: { kind: Kind; label: string }) =>
  <span className={styles.eb} data-kind={kind}><BlockParts label={label} /><span className={styles.ebIcon} aria-hidden="true">{ICONS[kind]}</span></span>;

// Draws code like Entry: a slot followed by deeper slots is a container, wrapped around them.
export function BlockCode({ head, slots, kindOf, renderSlot }: { head: string; slots: number[]; kindOf: (index: number) => Kind | "empty"; renderSlot: (index: number) => ReactNode }) {
  const code = (from: number, to: number): ReactNode[] => {
    const out: ReactNode[] = [];
    for (let i = from; i < to;) {
      let end = i + 1;
      while (end < to && slots[end] > slots[i]) end++;
      out.push(end > i + 1
        ? <div key={i} className={styles.ebWrap} data-kind={kindOf(i)}>{renderSlot(i)}<div className={styles.ebBody}>{code(i + 1, end)}</div><div className={styles.ebFoot} /></div>
        : <Fragment key={i}>{renderSlot(i)}</Fragment>);
      i = end;
    }
    return out;
  };
  return <div className={styles.ebCode} role="group" aria-label="코드">
    <span className={styles.ebHat}><span className={styles.ebPlay} aria-hidden="true"><Play size={14} fill="currentColor" /></span>{head}</span>
    {code(0, slots.length)}
  </div>;
}

// A concept check answered by building the code: press a scattered block to put it in the next slot, press it again to take it out.
export function ConceptAssemble({ question, answer, disabled, solved, onChange }: { question: Question; answer?: string; disabled: boolean; solved: boolean; onChange: (answer: string) => void }) {
  const { head, blocks, slots } = question.assemble!;
  const placed = assembledIds(answer), full = placed.length >= slots.length;
  const blockOf = (id: string) => blocks.find((block) => block.id === id)!;
  const trayId = (id: string) => `assemble-${question.id}-${id}`;
  const focusTray = (id: string) => document.getElementById(trayId(id))?.focus();
  const toggle = (id: string) => onChange((placed.includes(id) ? placed.filter((item) => item !== id) : [...placed, id]).join(","));
  const slot = (index: number) => {
    const id = placed[index];
    return id
      ? <button type="button" disabled={disabled} aria-label={`${index + 1}번 칸의 ${blockText(blockOf(id).label)} 빼기`} onClick={() => { focusTray(id); toggle(id); }}><EntryBlock kind={blockOf(id).kind} label={blockOf(id).label} /></button>
      : <span className={styles.ebEmpty}>{index + 1}번 칸</span>;
  };
  return <div className={styles.assemble}>
    <p className={styles.assemblePrompt}>{question.prompt}</p>
    <div role="group" aria-label="조립 칸"><BlockCode head={head} slots={slots} kindOf={(i) => placed[i] ? blockOf(placed[i]).kind : "empty"} renderSlot={slot} /></div>
    {!solved && <>
      <p className={styles.assembleGuide}>시작 블록 바로 아래가 1번 칸이에요. 아래 블록을 누르면 빈칸에 차례로 들어가고, 넣은 블록을 다시 누르면 빠져요.</p>
      <div className={styles.assembleTray} role="group" aria-label="블록 모음">{blocks.map((block) => {
        const used = placed.includes(block.id);
        return <button key={block.id} id={trayId(block.id)} type="button" aria-label={blockText(block.label)} aria-pressed={used} disabled={disabled || (!used && full)} onClick={() => toggle(block.id)}><EntryBlock kind={block.kind} label={block.label} /></button>;
      })}</div>
      {placed.length > 0 && <Button variant="ghost" disabled={disabled} onClick={() => { focusTray(placed[0]); onChange(""); }}><RotateCcw size={16} aria-hidden="true" />모두 빼기</Button>}
    </>}
  </div>;
}
