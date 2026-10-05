"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { classroomApi } from "@/lib/classroom/client";
import { abstractionPresets } from "@/lib/classroom/review/abstraction-data.mjs";
import { missions, level2Walkthrough } from "@/lib/classroom/review/flowchart-data.mjs";
import { basicReviewCheck, initialReviewProject, sameReviewProject, type AbstractionProject, type FlowchartProject, type FlowNode } from "@/lib/classroom/review/project";
import { guideGraph, puzzleGraph, puzzleExecutionGraph } from "@/lib/classroom/review/flow-experience";
import { createFlowRun, stepFlowRun } from "@/lib/classroom/review/flow-runner.mjs";
import { FlowDiagram } from "./flow-diagram";
import { ReviewSubmit, useReviewAi, type ReviewController } from "./shared";
import styles from "./review.module.css";

type Graph = Pick<FlowchartProject, "nodes" | "edges"> & { unavailable?: string };
function FlowExecution({ graph }: { graph: Graph }) {
  const [run, setRun] = useState<ReturnType<typeof createFlowRun> | null>(null), [automatic, setAutomatic] = useState(false), [answer, setAnswer] = useState("");
  const waitingInput = useRef<HTMLInputElement>(null), choice = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (run?.waiting?.kind === "input") waitingInput.current?.focus(); else if (run?.waiting?.kind === "choice") choice.current?.focus(); }, [run?.waiting?.kind]);
  useEffect(() => { if (!automatic || !run || run.done || run.error || run.waiting) return; const timer = setTimeout(() => setRun(stepFlowRun(graph, run)), 500); return () => clearTimeout(timer); }, [automatic, graph, run]);
  const step = (value?: string) => { if (run) setRun(stepFlowRun(graph, run, value)); setAnswer(""); };
  return <section className={styles.panel} aria-label="순서도 실행">
    <h3>실행하며 흐름 관찰하기</h3>
    <p className={styles.muted}>실제 화살표를 따라가요. 자연어 조건은 예·아니오를 직접 선택하고, 변수 = 식과 비교식은 계산해요.</p>
    <div className={styles.actions}>
      <Button onClick={() => { const initial = createFlowRun(graph); setRun(graph.unavailable ? { ...initial, error: graph.unavailable } : initial); setAutomatic(false); }}>실행 준비 / 다시 시작</Button>
      <Button variant="outline" disabled={!run || run.done || !!run.error || !!run.waiting} onClick={() => step()}>한 단계 실행</Button>
      <Button variant="outline" disabled={!run || run.done || !!run.error} onClick={() => setAutomatic(value => !value)}>{automatic ? "자동 실행 일시정지" : "자동 실행"}</Button>
      <Button variant="outline" disabled={!run} onClick={() => { setRun(null); setAutomatic(false); }}>실행 중지</Button>
    </div>
    {run && <>
      <p role="status">{run.done ? "종료에 도달했어요!" : run.error || `현재 기호: ${graph.nodes.find(node => node.id === run.current)?.text} · ${run.steps}단계`}</p>{run.waiting?.kind === "input" && <form onSubmit={event => { event.preventDefault(); step(answer); }} className={styles.actions}>
        <label className={styles.field}>{run.waiting.name} 입력값<input ref={waitingInput} aria-label={`${run.waiting.name} 입력값`} value={answer} onChange={event => setAnswer(event.target.value)} inputMode={run.waiting.inputMode ?? "decimal"} />
        </label>
        <Button type="submit">입력값 적용</Button>
      </form>}{run.waiting?.kind === "choice" && <div className={styles.actions}>
        <Button ref={choice} onClick={() => step("예")}>예로 진행</Button>
        <Button variant="outline" onClick={() => step("아니오")}>아니오로 진행</Button>
      </div>}<dl className={styles.ingredients}>{Object.entries(run.vars).map(([key, value]) => <div key={key}>
        <dt>{key}</dt>
        <dd>{String(value)}</dd>
      </div>)}</dl>
      <ol className={styles.log}>{run.log.map((line, i) => <li key={i}>{line}</li>)}</ol>
    </>}
  </section>;
}
export function Flowchart({ controller }: { controller: ReviewController }) {
  const project = controller.draft.reviewProject, ai = useReviewAi(controller), { clear } = ai;
  const [selected, setSelected] = useState(""), [from, setFrom] = useState("start"), [to, setTo] = useState("end"), [branch, setBranch] = useState<"" | "예" | "아니오">(""), [imported, setImported] = useState<AbstractionProject | null>(null), [sourceError, setSourceError] = useState(""), [reading, setReading] = useState(false), [sourceKind, setSourceKind] = useState<"draft" | "submission">("submission");
  const [history, setHistory] = useState<FlowchartProject[]>([]);
  const heading = useRef<HTMLHeadingElement>(null), [focus, setFocus] = useState(0), fieldId = useId();
  const missionId = project?.type === "flowchart" ? project.mission : null;
  useEffect(() => { clear(); }, [clear, missionId]);
  useEffect(() => { if (focus) heading.current?.focus(); }, [focus]);
  if (project?.type !== "flowchart") return null;
  const p = project, locked = controller.busy || controller.aiBusy;
  function edit(fields: Partial<FlowchartProject>, remember = true) {
    const draft = controller.getDraft(); if (draft.reviewProject?.type !== "flowchart") return;
    if (remember) { const previous = draft.reviewProject; setHistory(items => [...items, previous].slice(-30)); }
    controller.update({ ...draft, reviewProject: { ...draft.reviewProject, ...fields } });
  }
  function add(shape: FlowNode["shape"]) { const id = crypto.randomUUID(); edit({ nodes: [...p.nodes, { id, shape, text: shape === "terminal" ? "종료" : "내용 입력", x: 60 + p.nodes.length % 4 * 200, y: 100 + Math.floor(p.nodes.length / 4) * 130 }] }); setSelected(id); }
  function move(id: string, x: number, y: number) { const latest = controller.getDraft().reviewProject; if (latest?.type === "flowchart") edit({ nodes: latest.nodes.map(n => n.id === id ? { ...n, x: Math.max(0, Math.min(9500, x)), y: Math.max(0, Math.min(9500, y)) } : n) }); }
  const field = (label: string, key: "current" | "goal" | "conditions" | "core", multiline = false) => <div className={styles.field}>
    <label htmlFor={`${fieldId}-${key}`}>{label}</label>{multiline ? <textarea id={`${fieldId}-${key}`} disabled={controller.busy} value={(p[key] as string[]).join("\n")} maxLength={1000} onChange={e => edit({ [key]: e.target.value.split("\n") })} /> : <input id={`${fieldId}-${key}`} disabled={controller.busy} value={p[key] as string} maxLength={1000} onChange={e => edit({ [key]: e.target.value })} />}</div>;
  async function readAbstraction() {
    setReading(true); setSourceError(""); setImported(null);
    try { const work = await classroomApi.work("review-abstraction"), source = sourceKind === "submission" ? work.submission?.reviewProject : work.draft.reviewProject; if (source?.type !== "abstraction") throw Error("선택한 추상화 기록이 없어요. 예시나 직접 작성으로 시작할 수 있어요."); setImported(source); }
    catch (error) { setSourceError(error instanceof Error ? error.message : "추상화 기록을 읽지 못했어요."); } finally { setReading(false); }
  }
  const mission = missions.find(item => String(item.id) === p.mission), selectedNode = p.nodes.find(node => node.id === selected);
  const graph = mission ? puzzleGraph(p.mission, p.placements[p.mission] ?? {}) : guideGraph(p.guideStep);
  return <>
    <nav className={styles.stepNav} aria-label="순서도 실습">{["1", "2", "3", "guide", "free"].map((id, index) => <button key={id} disabled={locked} aria-pressed={p.mission === id} onClick={() => { edit({ mission: id as FlowchartProject["mission"] }, false); setFocus(n => n + 1); }}>{["1. 순차 퍼즐", "2. 선택 퍼즐", "3. 반복 퍼즐", "예시 공방 (선택)", "자유 캔버스"][index]}{controller.work.missions?.[id]?.submission ? " · 제출 기록 있음" : ""}</button>)}</nav>
    {mission ? <>
      <h3 ref={heading} tabIndex={-1}>{mission.title}</h3>
      <p>{mission.desc}</p>
      <div className={styles.columns}>
        <section className={styles.panel}>
          <h3>기호 보관함에서 배치하기</h3>{mission.slots.filter(slot => !slot.fixed).map(slot => <div key={slot.id} className={styles.field}>
            <label htmlFor={`${fieldId}-${slot.id}`}>{slot.hint}</label>
            <select id={`${fieldId}-${slot.id}`} disabled={locked} value={p.placements[p.mission]?.[slot.id] ?? ""} onChange={event => edit({ placements: { ...p.placements, [p.mission]: { ...p.placements[p.mission], [slot.id]: event.target.value } } })}>
              <option value="">빈 기호</option>{mission.palette.map(block => <option key={block.id} value={block.id}>{block.shape === "decision" ? "◇" : block.shape === "io" ? "▱" : "▭"} {block.text}</option>)}</select>
          </div>)}<Button variant="outline" disabled={locked} onClick={() => void ai.ask("flow-puzzle", "현재 배치에서 고칠 부분의 이유와 힌트를 알려 주세요.", p.mission)}>AI 오류 설명과 힌트</Button>{ai.error && <p className={styles.error} role="alert">{ai.error}</p>}{ai.result && <p className={styles.feedback} role="status">{ai.result.message}</p>}<ReviewSubmit controller={controller} missionId={p.mission} />
        </section>
        <FlowDiagram {...graph} />
      </div>
      <FlowExecution key={JSON.stringify([p.nodes.map(({ id, shape, text }) => ({ id, shape, text })), p.edges, p.placements, p.mission])} graph={puzzleExecutionGraph(p.mission, p.placements[p.mission] ?? {})} />
    </> : p.mission === "guide" ? <>
      <h3 ref={heading} tabIndex={-1}>{level2Walkthrough.title.replace(/^[^지]+/, "")}</h3>
      <p>예시 공방은 선택 연습이에요. 카드를 차례로 열며 기호와 분기 연결이 만들어지는 모습을 살펴보세요.</p>
      <div className={styles.columns}>
        <section className={styles.panel}>{level2Walkthrough.steps.map(step => <div key={step.stepIdx}>
          <Button variant="outline" disabled={locked} onClick={() => edit({ guideStep: step.stepIdx })}>{step.cardTitle}</Button>{p.guideStep >= step.stepIdx && <p className={styles.feedback}>{step.naturalText || `${step.condition} · 예: ${step.yesAction} / 아니오: ${step.noAction}`}<br />{step.symbolShapeName} · {step.explanation}</p>}</div>)}<Button variant="outline" onClick={() => edit({ guideStep: 0 })}>공방 다시 보기</Button>
          <Button disabled={locked} onClick={() => { const full = guideGraph(4); edit({ ...full, mission: "free" }); setFocus(n => n + 1); }}>공방 기호를 자유 캔버스에 복사</Button>
        </section>
        <FlowDiagram {...graph} />
      </div>
    </> : <>
      <h3 ref={heading} tabIndex={-1}>내 생각을 연결하는 자유 캔버스</h3>
      <details className={styles.panel}>
        <summary>추상화 기록이나 예시에서 시작하기</summary>
        <p className={styles.muted}>선택한 정의만 복사해요. 이후 두 작품은 따로 저장돼요. 현재 기획서와 기호는 유지돼요.</p>
        <label className={styles.field}>가져올 추상화 기록<select value={sourceKind} onChange={e => { setSourceKind(e.target.value as typeof sourceKind); setImported(null); }}>
          <option value="submission">최근 제출본</option>
          <option value="draft">현재 작성본</option>
        </select>
        </label>
        <Button variant="outline" disabled={reading || locked} onClick={() => void readAbstraction()}>{reading ? "기록을 읽는 중…" : "추상화 기록 살펴보기"}</Button>{sourceError && <p role="alert" className={styles.error}>{sourceError}</p>}{imported && <>
          <p>{imported.current} → {imported.goal}</p>
          <p>조건: {imported.conditions.join(" / ")}</p>
          <Button disabled={locked} onClick={() => { edit({ current: imported.current, goal: imported.goal, conditions: [...imported.conditions], core: [...imported.core] }); setImported(null); }}>이 정의를 내 작품에 복사</Button>
        </>}<div className={styles.actions}>{abstractionPresets.map(preset => <Button key={preset.topic} variant="outline" disabled={locked} onClick={() => edit({ current: preset.currentStatus, goal: preset.goalStatus, conditions: [...preset.conditions], core: [...preset.coreVariables] })}>{preset.topic}</Button>)}</div>
      </details>
      <div className={styles.columns}>
        <section className={styles.panel}>
          <h3>문제 정의와 자연어 기획서</h3>{field("현재 상태", "current")}{field("목표 상태", "goal")}{field("필수 조건", "conditions", true)}{field("핵심 요소", "core", true)}<Button variant="outline" disabled={locked || !p.current.trim() || !p.goal.trim()} onClick={() => void ai.ask("flow-plan", "조건에 맞는 자연어 설계 카드를 제안해 주세요.", "free")}>AI 기획서 제안 받기</Button>{ai.error && <p role="alert" className={styles.error}>{ai.error}</p>}{ai.result && <p role="status" className={styles.feedback}>{ai.result.message}</p>}{!!ai.result?.cards.length && <>
            <ol>{ai.result.cards.map(card => <li key={card.id}>{card.text}</li>)}</ol>
            <Button disabled={locked} onClick={() => { if (ai.result) edit({ cards: ai.result.cards.map(card => ({ ...card, id: crypto.randomUUID() })) }); }}>제안 기획서 채택</Button>
          </>}
          {p.cards.map((card, i) => <fieldset key={card.id} className={styles.card}>
            <legend>기획서 {i + 1}</legend>
            <label className={styles.field}>구조<select value={card.type} disabled={locked} onChange={e => edit({ cards: p.cards.map(c => c.id === card.id ? { ...c, type: e.target.value as typeof card.type } : c) })}>
              <option value="sequence">순차</option>
              <option value="selection">선택</option>
              <option value="loop">반복</option>
            </select>
            </label>{(["text", ...(card.type === "sequence" ? [] : ["yes", "no"])] as ("text" | "yes" | "no")[]).map(key => <div className={styles.field} key={key}>
              <label htmlFor={`${fieldId}-${card.id}-${key}`}>{key === "text" ? "계획 / 판단 조건" : key === "yes" ? "예일 때 행동" : "아니오일 때 행동"}</label>
              <textarea id={`${fieldId}-${card.id}-${key}`} maxLength={1000} disabled={controller.busy} value={card[key]} onChange={e => edit({ cards: p.cards.map(c => c.id === card.id ? { ...c, [key]: e.target.value } : c) })} />
            </div>)}<div className={styles.actions}>
              <Button variant="outline" disabled={locked || i === 0} onClick={() => { const cards = [...p.cards];[cards[i - 1], cards[i]] = [cards[i], cards[i - 1]]; edit({ cards }); }}>계획 위로</Button>
              <Button variant="outline" disabled={locked || i === p.cards.length - 1} onClick={() => { const cards = [...p.cards];[cards[i], cards[i + 1]] = [cards[i + 1], cards[i]]; edit({ cards }); }}>계획 아래로</Button>
              <Button variant="outline" disabled={locked} onClick={() => edit({ cards: p.cards.filter(c => c.id !== card.id) })}>계획 삭제</Button>
            </div>
          </fieldset>)}<Button variant="outline" disabled={locked || p.cards.length >= 50} onClick={() => edit({ cards: [...p.cards, { id: crypto.randomUUID(), type: "sequence", text: "", yes: "", no: "" }] })}>계획 카드 추가</Button>
        </section>
        <section className={styles.panel}>
          <h3>기호와 연결 편집</h3>
          <div className={styles.actions}>{(["terminal", "io", "process", "decision"] as const).map(shape => <Button key={shape} variant="outline" disabled={locked || p.nodes.length >= 200} onClick={() => add(shape)}>{shape === "terminal" ? "시작·종료" : shape === "io" ? "입출력" : shape === "process" ? "처리" : "판단"} 기호 추가</Button>)}</div>
          <p className={styles.muted}>기호를 끌어 이동하거나 초점을 놓고 방향키로 이동해요. 선택하면 아래에서 내용을 고칠 수 있어요.</p>
          <FlowDiagram nodes={p.nodes} edges={p.edges} selected={selected} pan={p.pan} select={setSelected} move={locked ? undefined : move} />
          <label className={styles.field}>편집할 기호<select value={selectedNode?.id ?? ""} onChange={e => setSelected(e.target.value)}>
            <option value="">기호 선택</option>{p.nodes.map(n => <option value={n.id} key={n.id}>{n.text || "빈 기호"}</option>)}</select>
          </label>{selectedNode && <>
            <div className={styles.field}>
              <label htmlFor={`${fieldId}-node`}>기호 내용</label>
              <textarea id={`${fieldId}-node`} maxLength={1000} disabled={controller.busy} value={selectedNode.text} onChange={e => edit({ nodes: p.nodes.map(n => n.id === selected ? { ...n, text: e.target.value } : n) })} />
            </div>
            <Button variant="outline" disabled={locked} onClick={() => { edit({ nodes: p.nodes.filter(n => n.id !== selected), edges: p.edges.filter(e => e.from !== selected && e.to !== selected) }); setSelected(""); }}>선택 기호와 연결 삭제</Button>
          </>}
          <div className={styles.actions}>
            <Button variant="outline" disabled={locked || !history.length} onClick={() => { const previous = history.at(-1); setHistory(history.slice(0, -1)); if (previous) edit(previous, false); }}>편집 되돌리기</Button>
            <Button variant="outline" disabled={locked} onClick={() => { const { nodes, edges, pan } = initialReviewProject("flowchart") as FlowchartProject; edit({ nodes, edges, pan }); setSelected(""); setFrom("start"); setTo("end"); }}>캔버스 초기화</Button>
            <Button variant="outline" disabled={locked} onClick={() => edit({ pan: { x: Math.min(10000, p.pan.x + 200), y: p.pan.y } }, false)}>화면 오른쪽</Button>
            <Button variant="outline" disabled={locked} onClick={() => edit({ pan: { x: p.pan.x, y: Math.min(10000, p.pan.y + 200) } }, false)}>화면 아래쪽</Button>
            <Button variant="outline" disabled={locked} onClick={() => edit({ pan: { x: 0, y: 0 } }, false)}>화면 원점</Button>
          </div>
          <h4>화살표 연결</h4>{[["출발 기호", from, setFrom], ["도착 기호", to, setTo]].map(([label, value, setter]) => <label className={styles.field} key={label as string}>{label as string}<select value={value as string} disabled={locked} onChange={e => (setter as (value: string) => void)(e.target.value)}>{p.nodes.map(n => <option key={n.id} value={n.id}>{n.text || "빈 기호"}</option>)}</select>
          </label>)}<label className={styles.field}>갈래<select value={branch} disabled={locked} onChange={e => setBranch(e.target.value as typeof branch)}>
            <option value="">다음</option>
            <option value="예">예</option>
            <option value="아니오">아니오</option>
          </select>
          </label>
          <Button variant="outline" disabled={locked || p.edges.length >= 400 || !p.nodes.some(n => n.id === from) || !p.nodes.some(n => n.id === to)} onClick={() => edit({ edges: [...p.edges.filter(e => !(e.from === from && e.label === branch)), { from, to, label: branch }] })}>이 화살표 연결</Button>
          <ul className={styles.suggestions}>{p.edges.map((edge, i) => <li key={`${i}-${edge.from}`}>
            <p>{p.nodes.find(n => n.id === edge.from)?.text} → {edge.label || "다음"} → {p.nodes.find(n => n.id === edge.to)?.text}</p>
            <Button variant="outline" disabled={locked} onClick={() => edit({ edges: p.edges.filter((_, index) => i !== index) })}>화살표 삭제</Button>
          </li>)}</ul>
        </section>
      </div>
      <FlowExecution key={JSON.stringify([p.nodes.map(({ id, shape, text }) => ({ id, shape, text })), p.edges, p.placements, p.mission])} graph={p} />
      <section className={styles.panel}>
        <h3>설계 리뷰</h3>
        <p className={styles.muted}>목표·조건·실제 연결을 검토해요. 타당한 단계 묶음이나 배치 차이는 개선 의견으로 안내해요.</p>
        <Button disabled={locked || !basicReviewCheck(p, "free").passed} onClick={() => void ai.ask("flow-review", "목표·필수 조건·실제 연결을 검토해 주세요.", "free")}>AI 설계 리뷰 받기</Button>{controller.work.aiReview && <p className={styles.feedback}>{sameReviewProject(p, controller.work.aiReview.project, "free") ? "현재 작품 리뷰: " : "이전 작품 리뷰: "}{controller.work.aiReview.message}</p>}{ai.remaining !== null && <p className={styles.muted}>오늘 AI 도움 {ai.remaining}회 남음</p>}<ReviewSubmit controller={controller} missionId="free" />
      </section>
    </>}
  </>;
}
