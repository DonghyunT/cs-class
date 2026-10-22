"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { FlowchartProject } from "@/lib/classroom/review/project";
import { createFlowRun, stepFlowRun } from "@/lib/classroom/review/flow-runner.mjs";
import styles from "./flowchart.module.css";

type Run = ReturnType<typeof createFlowRun>;
type Graph = Pick<FlowchartProject, "nodes" | "edges"> & { unavailable?: string; inputPolicy?: "auto"; textInputs?: string[]; textComparisons?: Record<string, { variable: string; expected: string }> };
type RuntimeView = { activeEdge: Run["activeEdge"]; interaction: ReactNode; output: Run["output"] };
export function FlowExecution({ graph, onActive, onWaiting, onPrepare, onComplete, onCancel, onReset, resetLabel = "실행 준비 / 다시 시작", startDisabled = false, monitorVisible = true, consoleOnly = false, variant = "standard", missionSummary, completionText, completionAction, choiceLabels, children }: { graph: Graph; onActive?: (id: string | undefined) => void; onWaiting?: () => void; onPrepare?: () => void; onComplete?: () => void; onCancel?: () => void; onReset?: () => void; resetLabel?: string; startDisabled?: boolean; monitorVisible?: boolean; consoleOnly?: boolean; variant?: "standard" | "floating"; missionSummary?: string; completionText?: string; completionAction?: ReactNode; choiceLabels?: { 예: string; 아니오: string }; children?: (controls: ReactNode, monitor: ReactNode, status: ReactNode, runtime: RuntimeView) => ReactNode }) {
  const [run, setRun] = useState<Run | null>(null), [automatic, setAutomatic] = useState(false), [answer, setAnswer] = useState(""), [speed, setSpeed] = useState("1");
  const input = useRef<HTMLInputElement>(null), choice = useRef<HTMLButtonElement>(null), reset = useRef<HTMLButtonElement>(null), next = useRef<HTMLButtonElement>(null), play = useRef<HTMLButtonElement>(null), restore = useRef(false), answered = useRef(false);
  const speedId = useId();
  const [clearedThrough, setClearedThrough] = useState(0);
  const completed = useRef(false);
  const statusMessage = useRef<HTMLParagraphElement>(null);
  const graphKey = JSON.stringify([graph.nodes.map(({ id, shape, text }) => ({ id, shape, text })), graph.edges.map(({ from, to, label }) => ({ from, to, label })), graph.unavailable, graph.inputPolicy, graph.textInputs, graph.textComparisons]);
  const [loadedGraph, setLoadedGraph] = useState(graphKey);
  // Reset only the execution, preserving the canvas DOM and a composing editor.
  if (loadedGraph !== graphKey) { setLoadedGraph(graphKey); setRun(null); setAutomatic(false); setAnswer(""); setClearedThrough(0); }
  const activeId = run?.current;
  useEffect(() => {
    if (!run) completed.current = false;
    else if (run.done && !run.error && !run.waiting && !completed.current) { completed.current = true; onComplete?.(); }
  }, [run, onComplete]);
  useEffect(() => { onActive?.(activeId ?? undefined); }, [onActive, activeId]);
  useEffect(() => { if (restore.current) { (reset.current?.disabled ? statusMessage.current : reset.current)?.focus(); restore.current = false; } else if (run?.waiting) { onWaiting?.(); if (children || monitorVisible) { if (run.waiting.kind === "input") input.current?.focus(); else choice.current?.focus(); } } else if (answered.current) { (next.current?.disabled ? play.current : next.current)?.focus(); answered.current = false; } else if ((run?.done || run?.error) && document.activeElement === next.current) play.current?.focus(); }, [run, onWaiting, monitorVisible, children]);
  useEffect(() => { if (!automatic || !run || run.done || run.error || run.waiting) return; const timer = setTimeout(() => setRun(stepFlowRun(graph, run)), 500 / Number(speed)); return () => clearTimeout(timer); }, [automatic, graph, run, speed]);
  const initial = () => { completed.current = false; onPrepare?.(); const value = createFlowRun(graph); return graph.unavailable ? { ...value, error: graph.unavailable } : value; };
  const step = (value?: string) => { const current = run ?? initial(); if (value !== undefined) answered.current = true; const result = stepFlowRun(graph, current, value); setRun(result); if (!result.error) setAnswer(""); };
  const finished = !!run?.done || !!run?.error && !run.waiting;
  const running = automatic && !finished && !run?.error;
  const status = <p ref={statusMessage} tabIndex={-1} role="status" className={styles.runStatus}>{run ? run.done ? "종료에 도달했어요!" : run.error || `현재 기호: ${graph.nodes.find(node => node.id === run.current)?.text} · ${run.steps}단계` : "실행을 눌러 실제 화살표를 따라가 보세요."}</p>;
  const controls = <div className={styles.runControls} role="toolbar" aria-label="순서도 실행 제어">
    <Button ref={play} className={styles.runButton} disabled={startDisabled} aria-label={finished ? "다시 실행" : running ? "자동 실행 일시정지" : "자동 실행"} onClick={() => { if (!run || finished) { setRun(initial()); setAnswer(""); setClearedThrough(0); setAutomatic(true); } else setAutomatic(value => !value); }}>{finished ? "↻ 다시 실행" : running ? "Ⅱ 일시정지" : "▶ 자동 실행"}</Button>
    <Button ref={next} variant="ghost" aria-label="한 단계 실행" disabled={startDisabled || !!run?.done || !!run?.error || !!run?.waiting} onClick={() => { setAutomatic(false); step(); }}>⏭ 한 단계</Button>
    <Button ref={reset} variant="ghost" aria-label={resetLabel} title={onReset ? "실행과 공방 조립을 처음부터 다시 보기" : "시뮬레이션 초기화"} disabled={startDisabled} onClick={() => { setRun(onReset ? null : initial()); onReset?.(); setAutomatic(false); setAnswer(""); setClearedThrough(0); }}>↶{onReset && ` ${resetLabel}`}</Button>
    {variant === "floating" ? <Button variant="ghost" className={styles.speedChip} aria-label={`실행 속도 ${speed}배, 눌러 변경`} title="실행 속도: 1× → 2× → 0.5×" onClick={() => setSpeed(value => value === "1" ? "2" : value === "2" ? "0.5" : "1")}>{speed}×</Button> : <label htmlFor={speedId} className={styles.speed}><span className={styles.srOnly}>실행 속도</span><select aria-label="실행 속도" id={speedId} value={speed} onChange={event => setSpeed(event.target.value)}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></label>}
    <span>{run?.error ? "확인 필요" : run?.waiting ? "입력 대기" : run?.done ? "완료" : running ? "실행 중" : "대기 중"}</span>
    {run && <Button variant="ghost" aria-label="실행 중지" onClick={() => { onCancel?.(); restore.current = true; setRun(null); setAutomatic(false); setClearedThrough(0); }}>■</Button>}
  </div>;
  const visibleLog = run?.log.slice(clearedThrough) ?? [];
  const interaction = run?.waiting ? <div className={styles.nodeInteraction}>
    {run.waiting.kind === "input" ? <form onSubmit={event => { event.preventDefault(); step(answer); }}><label className={styles.field}>{run.waiting.name} 입력값<input ref={input} aria-label={`${run.waiting.name} 입력값`} value={answer} onChange={event => setAnswer(event.target.value)} inputMode={run.waiting.inputMode ?? "decimal"} onKeyDown={event => { if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault(); }} /></label><Button type="submit">입력값 적용</Button></form> : <div className={styles.choices}><p>{run.waiting.name}</p><Button ref={choice} onClick={() => step("예")}>{choiceLabels?.예 ?? "예로 진행"}</Button><Button variant="outline" onClick={() => step("아니오")}>{choiceLabels?.아니오 ?? "아니오로 진행"}</Button></div>}
    {run.error && <p role="alert" className={styles.error}>{run.error}</p>}
  </div> : null;
  const monitor = <div className={styles.monitor}>
    {missionSummary && <p className={styles.missionDescription}>{missionSummary}</p>}
    {!children && interaction}
    <section className={styles.variablePanel}><h4>변수 살펴보기</h4><div className={styles.variableValues} role="region" aria-label="변수표 값" tabIndex={0}><table className={styles.variables} aria-label="변수 살펴보기"><thead><tr><th>변수</th><th>현재값</th><th>직전값</th></tr></thead><tbody>{Object.entries(run?.vars ?? {}).map(([key, value]) => <tr key={key}><th>{key}</th><td>{String(value)}</td><td>{run?.previousVars[key] === undefined ? "—" : String(run.previousVars[key])}</td></tr>)}</tbody></table>{!Object.keys(run?.vars ?? {}).length && <p className={styles.variableEmpty}>기호를 실행하면 변수가 나타나요.</p>}</div></section>
    <section className={styles.consolePanel} aria-label="출력 콘솔"><h4 className={styles.monitorHeading}><span>출력 콘솔</span><Button variant="ghost" aria-label="출력 콘솔 지우기" onClick={() => setClearedThrough(run?.log.length ?? 0)}>지우기</Button></h4><div className={styles.output}>{visibleLog.filter(line => line.startsWith("출력:")).at(-1)?.replace(/^출력:\s*/, "") ?? (run?.done ? "실행이 완료됐어요." : "대기 중…")}</div>
    {!consoleOnly && <h4>실시간 데이터 흐름</h4>}<ol className={styles.tracer} aria-label="실시간 데이터 흐름" tabIndex={0}>{visibleLog.map((line, index) => <li key={index}>{line}</li>)}</ol></section>
    {run?.done && completionText && <div className={styles.completion}><p>{completionText}</p>{completionAction}</div>}
    {run?.error && !run.waiting && <p role="alert" className={styles.error}>{run.error}</p>}
  </div>;
  return children ? children(controls, monitor, status, { activeEdge: run?.activeEdge, interaction, output: run?.output }) : <section className={styles.puzzleExecution} aria-label="순서도 실행"><small>입출력과 실행</small><h3>실행 검증 &amp; 입출력</h3>{status}{controls}{monitor}</section>;
}
