"use client";
import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { classroomApi } from "@/lib/classroom/client";
import { basicReviewCheck, initialReviewProject, sameReviewProject, type AbstractionProject, type FlowCard, type FlowchartProject, type FlowNode } from "@/lib/classroom/review/project";
import { validateFlowGraph } from "@/lib/classroom/review/flow-graph.mjs";
import type { LessonMode } from "../work-controller";
import { FlowDiagram, flowNodeSize } from "./flow-diagram";
import { FlowExecution } from "./flow-execution";
import { flowchartPresets, flowchartQuickIdeas } from "./flowchart-presets";
import { flowchartPortfolio } from "./flowchart-export";
import { ReviewSubmit, useReviewAi, type ReviewController } from "./shared";
import styles from "./flowchart.module.css";
import dialogStyles from "./flowchart-dialogs.module.css";

type Recipe = Pick<FlowchartProject, "current" | "goal" | "conditions" | "core" | "cards">;
type Ports = Pick<FlowchartProject["edges"][number], "fromPort" | "toPort">;
const recipeOf = (p: FlowchartProject): Recipe => ({ current: p.current, goal: p.goal, conditions: [...p.conditions], core: [...p.core], cards: structuredClone(p.cards) });
const clamp = (value: number) => Math.max(-9500, Math.min(9500, Math.round(value)));

function NaturalCard({ card, index, count, prefix, disabled, change, remove, reorder }: { card: FlowCard; index: number; count: number; prefix: string; disabled: boolean; change: (card: FlowCard) => void; remove: () => void; reorder: (direction: -1 | 1) => void }) {
  const field = (key: "text" | "yes" | "no", label: string) => <label className={styles.field} htmlFor={`${prefix}-${card.id}-${key}`}>{label}<textarea id={`${prefix}-${card.id}-${key}`} aria-label={label} rows={2} maxLength={1000} disabled={disabled} value={card[key]} onChange={event => change({ ...card, [key]: event.target.value })} /></label>;
  return <fieldset className={styles.planCard} data-structure={card.type}>
    <legend className={styles.srOnly}>기획서 {index + 1}</legend>
    <div className={styles.cardHeader}><strong>{index + 1}.</strong><label><span className={styles.srOnly}>구조</span><select aria-label="구조" disabled={disabled} value={card.type} onChange={event => change({ ...card, type: event.target.value as FlowCard["type"] })}><option value="sequence">순차</option><option value="selection">선택</option><option value="loop">반복</option></select></label><Button variant="ghost" aria-label="계획 삭제" disabled={disabled} onClick={remove}>×</Button></div>
    {field("text", card.type === "loop" ? "반복 지속 조건" : card.type === "selection" ? "판단 조건" : "실행 계획")}
    {card.type !== "sequence" && field("yes", card.type === "loop" ? "반복할 행동" : "예일 때 행동")}
    {card.type === "selection" && field("no", "아니오일 때 행동")}
    {card.type === "loop" && <details><summary>반복이 끝난 뒤 (선택)</summary>{field("no", "반복이 끝난 뒤의 행동")}</details>}
    <div className={styles.tools}><Button id={`${prefix}-${card.id}-up`} variant="ghost" aria-label="계획 위로" disabled={disabled || index === 0} onClick={() => reorder(-1)}>↑ 위로</Button><Button id={`${prefix}-${card.id}-down`} variant="ghost" aria-label="계획 아래로" disabled={disabled || index === count - 1} onClick={() => reorder(1)}>↓ 아래로</Button></div>
  </fieldset>;
}

export function FlowchartStudio({ controller, mode }: { controller: ReviewController; mode: LessonMode }) {
  const project = controller.draft.reviewProject;
  const p = project?.type === "flowchart" ? project : initialReviewProject("flowchart") as FlowchartProject;
  const locked = controller.busy || controller.aiBusy, ai = useReviewAi(controller, mode), prefix = useId();
  const [selected, setSelected] = useState(""), [from, setFrom] = useState("start"), [to, setTo] = useState("end"), [branch, setBranch] = useState<"" | "예" | "아니오">("");
  const [plannerCollapsed, setPlannerCollapsed] = useState(false), [debuggerCollapsed, setDebuggerCollapsed] = useState(true), [history, setHistory] = useState<FlowchartProject[]>([]), [activeNode, setActiveNode] = useState<string | undefined>();
  const [recipeOpen, setRecipeOpen] = useState(false), [reviewOpen, setReviewOpen] = useState(false), [exportOpen, setExportOpen] = useState(false), [clearOpen, setClearOpen] = useState(false), [grid, setGrid] = useState(true);
  const [recipe, setRecipe] = useState<Recipe>(() => recipeOf(p)), recipeRef = useRef(recipe), [resetCanvas, setResetCanvas] = useState(false), [recipeError, setRecipeError] = useState("");
  const [recipeTab, setRecipeTab] = useState<"recommended" | "custom">("recommended"), [chosenPreset, setChosenPreset] = useState(""), [recipeGenerated, setRecipeGenerated] = useState(false), [studioNotice, setStudioNotice] = useState("");
  const [sourceKind, setSourceKind] = useState<"draft" | "submission">("submission"), [imported, setImported] = useState<AbstractionProject | null>(null), [reading, setReading] = useState(false);
  const [exportBusy, setExportBusy] = useState(false), [exportError, setExportError] = useState(""), [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [barPosition, setBarPosition] = useState({ x: 0, y: 0 }), barDrag = useRef<{ x: number; y: number; start: typeof barPosition } | null>(null);
  const canvas = useRef<HTMLDivElement>(null), canvasBody = useRef<HTMLDivElement>(null), trash = useRef<HTMLButtonElement>(null), plannerToggle = useRef<HTMLButtonElement>(null), debuggerToggle = useRef<HTMLButtonElement>(null), inspector = useRef<HTMLDetailsElement>(null);
  const recipeTrigger = useRef<HTMLElement | null>(null), reviewTrigger = useRef<HTMLElement | null>(null), exportTrigger = useRef<HTMLElement | null>(null), clearTrigger = useRef<HTMLElement | null>(null);
  const recipeTitle = useRef<HTMLHeadingElement>(null), reviewTitle = useRef<HTMLHeadingElement>(null), exportTitle = useRef<HTMLHeadingElement>(null), clearTitle = useRef<HTMLHeadingElement>(null);
  const pendingFocus = useRef<string | null>(null), restorePlanner = useRef(false), restoreDebugger = useRef(false), mounted = useRef(true), exportRequest = useRef(0), recipeVisible = useRef(false), recipeGeneration = useRef(0), recipeEdited = useRef(false);
  const reviewNodeFocus = useRef(false);
  const recipeTabFocus = useRef(false);
  const recipeFieldFocus = useRef<string | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => () => { if (image) URL.revokeObjectURL(image.url); }, [image]);
  useEffect(() => { if (pendingFocus.current) { document.getElementById(pendingFocus.current)?.focus(); pendingFocus.current = null; } }, [project]);
  useEffect(() => { if (restorePlanner.current) { plannerToggle.current?.focus(); restorePlanner.current = false; } }, [plannerCollapsed]);
  useEffect(() => { if (restoreDebugger.current) { debuggerToggle.current?.focus(); restoreDebugger.current = false; } }, [debuggerCollapsed]);
  useEffect(() => { if (recipeTabFocus.current) { document.getElementById(`${prefix}-recipe-tab-${recipeTab}`)?.focus(); recipeTabFocus.current = false; } }, [prefix, recipeTab]);
  useEffect(() => { if (recipeFieldFocus.current) { document.getElementById(recipeFieldFocus.current)?.focus(); recipeFieldFocus.current = null; } }, [recipe]);

  function edit(fields: Partial<FlowchartProject>, remember = true) {
    const draft = controller.getDraft(); if (draft.reviewProject?.type !== "flowchart") return;
    if (remember) setHistory(items => [...items, structuredClone(draft.reviewProject as FlowchartProject)].slice(-30));
    controller.update({ ...draft, reviewProject: { ...draft.reviewProject, ...fields } });
  }
  function current() { const latest = controller.getDraft().reviewProject; return latest?.type === "flowchart" ? latest : null; }
  function add(shape: FlowNode["shape"], x?: number, y?: number) {
    const latest = current(); if (!latest || latest.nodes.length >= 200 || locked) return;
    let text = "내용 입력";
    if (shape === "terminal") {
      const terminals = latest.nodes.filter(node => node.shape === "terminal");
      if (!terminals.some(node => /^(시작|출발)/.test(node.text.trim()))) text = "시작";
      else if (!terminals.some(node => /^(종료|끝|마침|도착)/.test(node.text.trim()))) text = "종료";
      else { setStudioNotice("시작과 종료 기호가 이미 있어요. 기존 기호를 수정하거나 삭제한 뒤 추가해 주세요."); return; }
    }
    const id = crypto.randomUUID(), size = flowNodeSize({ shape, text }), offset = latest.nodes.length % 5 * 20;
    edit({ nodes: [...latest.nodes, { id, shape, text, x: clamp(x ?? latest.pan.x + (canvas.current?.scrollLeft ?? 0) + (canvas.current?.clientWidth ?? 600) / 2 - size.width / 2 + offset), y: clamp(y ?? latest.pan.y + (canvas.current?.scrollTop ?? 0) + (canvas.current?.clientHeight ?? 420) / 2 - size.height / 2 + offset) }] }); setSelected(id); setStudioNotice(`${text === "내용 입력" ? "새" : text} 기호를 추가했어요.`);
  }
  function move(id: string, x: number, y: number) { const latest = current(); if (latest) edit({ nodes: latest.nodes.map(node => node.id === id ? { ...node, x: clamp(x), y: clamp(y) } : node) }); }
  function changeText(id: string, text: string) { const latest = current(); if (latest && latest.nodes.find(node => node.id === id)?.text !== text) edit({ nodes: latest.nodes.map(node => node.id === id ? { ...node, text } : node) }); }
  function connectNodes(source: string, target: string, label: "" | "예" | "아니오", ports: Ports = {}) {
    const latest = current(); if (!latest || locked || source === target || !latest.nodes.some(node => node.id === source) || !latest.nodes.some(node => node.id === target)) return;
    const node = latest.nodes.find(item => item.id === source)!;
    if (node.shape === "decision" ? !label : Boolean(label)) { setStudioNotice(node.shape === "decision" ? "판단 기호는 예 또는 아니오 갈래를 선택해 주세요." : "이 기호는 다음 갈래로 연결해 주세요."); return; }
    const occupied = latest.edges.find(edge => edge.from === source && edge.label === label);
    if (occupied) { setStudioNotice(occupied.to === target ? "같은 화살표가 이미 연결되어 있어요." : "이 출구에는 이미 화살표가 있어요. 연결을 바꾸려면 기존 화살표를 먼저 삭제해 주세요."); return; }
    if (latest.edges.length >= 400) return;
    edit({ edges: [...latest.edges, { from: source, to: target, label, ...ports }] }); setStudioNotice("화살표를 연결했어요.");
  }
  function disconnect(source: string, target: string, label: "" | "예" | "아니오") { const latest = current(); if (latest) { edit({ edges: latest.edges.filter(edge => !(edge.from === source && edge.to === target && edge.label === label)) }); setStudioNotice("화살표를 삭제했어요. 새 도착 기호로 연결할 수 있어요."); } }
  function removeNode(id: string) { const latest = current(); if (latest) { edit({ nodes: latest.nodes.filter(node => node.id !== id), edges: latest.edges.filter(edge => edge.from !== id && edge.to !== id) }); if (selected === id) setSelected(""); } }
  function align() {
    const latest = current(); if (!latest?.nodes.length) return;
    const center = latest.nodes.reduce((sum, node) => sum + node.x + flowNodeSize(node).width / 2, 0) / latest.nodes.length;
    const columnWidth = Math.max(...latest.nodes.map(node => flowNodeSize(node).width)) + 60;
    let x = clamp(center - columnWidth / 2), y = 60;
    edit({ nodes: latest.nodes.map(node => { const size = flowNodeSize(node); if (y + size.height > 9400) { x += columnWidth; y = 60; } const next = { ...node, x: clamp(x + (columnWidth - size.width) / 2), y }; y += size.height + 70; return next; }) });
  }
  function center() {
    const latest = current(); if (!latest?.nodes.length) return;
    const left = Math.min(...latest.nodes.map(node => node.x)), right = Math.max(...latest.nodes.map(node => node.x + flowNodeSize(node).width));
    const top = Math.min(...latest.nodes.map(node => node.y));
    edit({ pan: { x: clamp((left + right - (canvas.current?.clientWidth ?? 600)) / 2), y: clamp(top - 60) } }, false);
    canvas.current?.scrollTo({ left: 0, top: 0 });
  }
  function changeCard(card: FlowCard) { const latest = current(); if (latest) edit({ cards: latest.cards.map(item => item.id === card.id ? card : item) }); }
  function addCard(type: FlowCard["type"]) { const latest = current(); if (!latest || latest.cards.length >= 50) return; const id = crypto.randomUUID(); pendingFocus.current = `${prefix}-${id}-text`; edit({ cards: [...latest.cards, { id, type, text: "", yes: "", no: "" }] }); }
  function reorder(index: number, direction: -1 | 1) { const latest = current(); if (!latest || !latest.cards[index + direction]) return; const cards = [...latest.cards], card = cards[index]; [cards[index], cards[index + direction]] = [cards[index + direction], cards[index]]; pendingFocus.current = `${prefix}-${card.id}-${index + direction === 0 ? "down" : index + direction === cards.length - 1 ? "up" : direction === -1 ? "up" : "down"}`; edit({ cards }); }
  function removeCard(index: number) { const latest = current(); if (!latest) return; const next = latest.cards[index + 1] ?? latest.cards[index - 1]; pendingFocus.current = next ? `${prefix}-${next.id}-text` : `${prefix}-add-card`; edit({ cards: latest.cards.filter((_, position) => position !== index) }); }
  function changeRecipe(value: Recipe) { recipeEdited.current = true; recipeRef.current = value; setRecipe(value); }
  function showRecipe(trigger: HTMLElement) { const latest = current(); if (!latest) return; recipeTrigger.current = trigger; if (!recipeEdited.current) { recipeRef.current = recipeOf(latest); setRecipe(recipeRef.current); setResetCanvas(false); } setImported(null); recipeGeneration.current++; recipeVisible.current = true; setRecipeOpen(true); }
  function showReview(trigger: HTMLElement) { reviewNodeFocus.current = false; reviewTrigger.current = trigger; setReviewOpen(true); }
  function inspectNode(id: string) { const node = p.nodes.find(item => item.id === id); if (!node) return; setSelected(id); if (inspector.current) inspector.current.open = true; reviewNodeFocus.current = true; edit({ pan: { x: clamp(node.x - 80), y: clamp(node.y - 80) } }, false); setReviewOpen(false); }
  async function readAbstraction() {
    if (mode === "preview") return;
    setReading(true); setRecipeError(""); setImported(null);
    try { const work = await classroomApi.work("review-abstraction"), source = sourceKind === "submission" ? work.submission?.reviewProject : work.draft.reviewProject; if (source?.type !== "abstraction") throw Error("선택한 추상화 기록이 없어요. 예시나 직접 작성으로 시작할 수 있어요."); if (mounted.current && recipeVisible.current) setImported(source); }
    catch (error) { if (mounted.current) setRecipeError(error instanceof Error ? error.message : "추상화 기록을 읽지 못했어요."); } finally { if (mounted.current) setReading(false); }
  }
  async function recommend() {
    const snapshot = structuredClone(recipeRef.current), signature = JSON.stringify(snapshot), generation = recipeGeneration.current; setRecipeError("");
    const { current, goal, conditions, core } = snapshot;
    try { const reply = await controller.requestAi("flow-plan", "조건에 맞는 자연어 설계 카드를 제안해 주세요.", "free", crypto.randomUUID(), { current, goal, conditions, core }); if (!mounted.current || !recipeVisible.current || generation !== recipeGeneration.current) return; if (reply && JSON.stringify(recipeRef.current) === signature) { changeRecipe({ ...snapshot, ...reply.result.definition, cards: reply.result.cards.map(card => ({ ...card, id: crypto.randomUUID() })) }); setRecipeGenerated(true); } else setRecipeError("작성 내용이 바뀌었거나 저장을 완료하지 못했어요. 현재 입력을 확인하고 다시 요청해 주세요."); }
    catch (error) { if (mounted.current && recipeVisible.current && generation === recipeGeneration.current) setRecipeError(error instanceof Error ? error.message : "AI 제안을 받지 못했어요. 입력은 보존됩니다."); }
  }
  async function exportImage(trigger: HTMLElement) {
    exportTrigger.current = trigger; setExportOpen(true); setExportBusy(true); setExportError(""); setImage(null); const request = ++exportRequest.current;
    try {
      if (!await controller.flush()) throw Error("저장을 완료하지 못했어요. 현재 작품을 보존하고 저장 후 다시 내보내 주세요.");
      const latest = current(), svg = canvas.current?.querySelector("svg"); if (!latest || !svg) throw Error("캔버스를 준비한 뒤 다시 시도해 주세요.");
      const validation = controller.work.missions?.free?.validation, review = controller.work.aiReview;
      const status = validation && sameReviewProject(latest, validation.reviewProject, "free") ? validation.passed ? "현재 작품 검증 통과" : "현재 작품 수정 필요" : "현재 작품 미검증";
      const message = review ? `${sameReviewProject(latest, review.project, "free") ? "현재 작품" : "이전 작품"} AI 의견: ${review.message}` : "AI 설계 점검 전";
      const blob = await flowchartPortfolio(latest, svg, { status, message }); if (mounted.current && request === exportRequest.current) setImage({ blob, url: URL.createObjectURL(blob) });
    }
    catch (error) { if (mounted.current && request === exportRequest.current) setExportError(error instanceof Error ? error.message : "이미지를 만들지 못했어요."); } finally { if (mounted.current && request === exportRequest.current) setExportBusy(false); }
  }
  async function copyImage() { if (!image) return; try { await navigator.clipboard.write([new ClipboardItem({ "image/png": image.blob })]); setExportError("이미지를 복사했어요."); } catch { setExportError("이 브라우저에서 이미지 복사를 허용하지 않았어요. PNG 다운로드를 사용할 수 있어요."); } }
  function dragBar(event: PointerEvent<HTMLButtonElement>) { if (!barDrag.current) return; const bounds = canvasBody.current?.getBoundingClientRect(), bar = event.currentTarget.parentElement?.getBoundingClientRect(); if (!bounds || !bar) return; const next = { x: barDrag.current.start.x + event.clientX - barDrag.current.x, y: barDrag.current.start.y + event.clientY - barDrag.current.y }; setBarPosition({ x: Math.max(-(bounds.width - bar.width) / 2, Math.min((bounds.width - bar.width) / 2, next.x)), y: Math.max(-(bounds.height - bar.height - 20), Math.min(0, next.y)) }); }
  const selectedNode = p.nodes.find(node => node.id === selected);
  const structure = validateFlowGraph(p.nodes, p.edges.map(edge => ({ ...edge, fromPort: edge.label === "예" ? "yes" : edge.label === "아니오" ? "no" : "out" })));


  const recipeField = (key: "current" | "goal" | "conditions" | "core", label: string) => <label className={styles.field}>{label}<textarea aria-label={label} rows={2} maxLength={1000} disabled={controller.busy} value={Array.isArray(recipe[key]) ? recipe[key].join("\n") : recipe[key]} onChange={event => changeRecipe({ ...recipeRef.current, [key]: key === "conditions" || key === "core" ? event.target.value.split("\n") : event.target.value })} /></label>;
  return <>
    <FlowExecution graph={{ ...p, inputPolicy: "auto" }} onActive={setActiveNode} monitorVisible={!debuggerCollapsed} consoleOnly>{(controls, monitor, status, runtime) => <div className={styles.freeWorkspace} data-planner-collapsed={plannerCollapsed} data-debugger-collapsed={debuggerCollapsed}>
      <section className={styles.planner} aria-label="자연어 기획서"><header><h3>✍️ 자연어 기획서</h3><Button ref={plannerToggle} variant="ghost" aria-expanded={!plannerCollapsed} aria-label={plannerCollapsed ? "기획서 펼치기" : "기획서 접기"} onClick={() => { restorePlanner.current = true; setPlannerCollapsed(value => !value); }}>{plannerCollapsed ? "»" : "«"}</Button></header><div hidden={plannerCollapsed} className={styles.plannerContent}>
        <div className={styles.plannerActions}><Button id={`${prefix}-add-card`} variant="ghost" aria-label="계획 카드 추가" disabled={locked || p.cards.length >= 50} onClick={() => addCard("sequence")}>+ 순차</Button><Button variant="ghost" aria-label="선택 카드 추가" disabled={locked || p.cards.length >= 50} onClick={() => addCard("selection")}>+ 선택</Button><Button variant="ghost" aria-label="반복 카드 추가" disabled={locked || p.cards.length >= 50} onClick={() => addCard("loop")}>+ 반복</Button></div>
        <div className={styles.cardList}>{!p.cards.length && <div className={styles.empty}><p>아직 기획서가 없어요.<br />처방전을 채우거나 위에서 카드를 추가해 보세요.</p><Button variant="outline" onClick={event => showRecipe(event.currentTarget)}>처방전에서 시작하기</Button></div>}{p.cards.map((card, index) => <NaturalCard key={card.id} card={card} index={index} count={p.cards.length} prefix={prefix} disabled={controller.busy} change={changeCard} remove={() => removeCard(index)} reorder={direction => reorder(index, direction)} />)}</div>
        <footer className={styles.plannerFooter}><Button disabled={locked} onClick={event => showReview(event.currentTarget)}>✨ AI 설계 점검</Button></footer>
      </div></section>
      <section className={styles.paletteRail} aria-label="자유 기호 보관함"><h3>기호 보관함</h3>{(["terminal", "io", "decision", "process"] as const).map(shape => <button key={shape} data-shape={shape} disabled={locked || p.nodes.length >= 200} draggable={!locked && p.nodes.length < 200} aria-label={`${shape === "terminal" ? "시작·종료" : shape === "io" ? "입출력" : shape === "decision" ? "판단" : "처리"} 기호 추가`} onDragStart={event => { event.dataTransfer.setData("application/x-cs-flow-shape", shape); event.dataTransfer.effectAllowed = "copy"; }} onClick={() => add(shape)}><span aria-hidden="true"><strong>{shape === "terminal" ? "단말" : shape === "io" ? "자료" : shape === "decision" ? "판단" : "처리"}</strong><small>{shape === "terminal" ? "시작 · 끝" : shape === "io" ? "입력 · 출력" : shape === "decision" ? "조건 분기" : "명령 · 동작"}</small></span></button>)}<small>끌어서<br />추가하기</small></section>
      <section className={styles.freeCanvas} aria-label="순서도 자유 캔버스"><header className={styles.canvasHeader}><h3>📐 순서도 캔버스</h3><div className={styles.tools}><Button variant="ghost" disabled={locked} onClick={event => showRecipe(event.currentTarget)}>🩺 처방전 채우기</Button><Button variant="ghost" disabled={locked} onClick={center}>⌖ 화면 중앙</Button><Button variant="ghost" aria-label="기호 세로 정렬" disabled={locked} onClick={align}>☷ 정렬</Button><Button variant="ghost" aria-label="캔버스 초기화" disabled={locked} onClick={event => { clearTrigger.current = event.currentTarget; setClearOpen(true); }}>▧ 비우기</Button><Button variant="ghost" disabled={locked} onClick={event => showReview(event.currentTarget)}>✨ AI 검사 후 제출</Button><Button variant="ghost" disabled={locked || exportBusy} onClick={event => void exportImage(event.currentTarget)}>↗ 작품 내보내기</Button></div></header><p role="status" className={`${styles.canvasHint} ${dialogStyles.studioNotice}`}>{studioNotice || "기호를 클릭해 내용을 수정하고 파란 포트 점을 끌어 화살표를 연결하세요. 화살표를 더블클릭하면 삭제돼요."}</p>{status}<div ref={canvasBody} className={styles.canvasBody}>
        <FlowDiagram {...runtime} nodes={p.nodes} edges={p.edges} selected={selected} active={activeNode} pan={p.pan} viewportRef={canvas} trashRef={trash} grid={grid} compactNotice select={setSelected} move={locked ? undefined : move} changeText={controller.busy ? undefined : changeText} connect={locked ? undefined : connectNodes} disconnect={locked ? undefined : disconnect} add={locked ? undefined : add} panView={locked ? undefined : pan => edit({ pan: { x: clamp(pan.x), y: clamp(pan.y) } }, false)} remove={locked ? undefined : removeNode} align={locked ? undefined : align} />
        <div className={styles.floatingBar} style={{ transform: `translate(calc(-50% + ${barPosition.x}px), ${barPosition.y}px)` }}><button className={styles.barGrip} aria-label="실행 제어 이동" title="실행 도구를 끌어 이동" onDoubleClick={() => setBarPosition({ x: 0, y: 0 })} onPointerDown={event => { if (event.button !== 0) return; barDrag.current = { x: event.clientX, y: event.clientY, start: barPosition }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={dragBar} onPointerUp={() => { barDrag.current = null; }} onPointerCancel={() => { barDrag.current = null; }} onKeyDown={event => { const delta = event.shiftKey ? 20 : 5; if (event.key === "Home") setBarPosition({ x: 0, y: 0 }); if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home"].includes(event.key)) { event.preventDefault(); if (event.key !== "Home") setBarPosition(value => ({ x: Math.max(-100, Math.min(100, value.x + (event.key === "ArrowLeft" ? -delta : event.key === "ArrowRight" ? delta : 0))), y: Math.max(-200, Math.min(0, value.y + (event.key === "ArrowUp" ? -delta : event.key === "ArrowDown" ? delta : 0))) })); } }}>⠿</button>{controls}</div>
        <Button ref={trash} className={styles.canvasTrash} variant="outline" aria-label="기호를 끌어 삭제" disabled={locked || !selectedNode} onClick={() => { if (selectedNode) removeNode(selectedNode.id); }}>🗑️</Button>
      </div></section>
      <aside className={styles.debugger}><Button ref={debuggerToggle} className={styles.debuggerToggle} variant="ghost" aria-expanded={!debuggerCollapsed} aria-label={debuggerCollapsed ? "실행 과정 펼치기" : "실행 과정 접기"} onClick={() => { restoreDebugger.current = true; setDebuggerCollapsed(value => !value); }}>{debuggerCollapsed ? "« 실행 과정" : "» 실행 과정"}</Button>{!debuggerCollapsed && monitor}</aside>
    </div>}</FlowExecution>
    <details ref={inspector} className={styles.inspector}><summary>키보드 편집 · 기호와 연결 설정</summary><div className={styles.tools}><Button variant="outline" disabled={locked || !history.length} onClick={() => { const previous = history.at(-1); setHistory(items => items.slice(0, -1)); if (previous) edit(previous, false); }}>편집 되돌리기</Button><Button variant="outline" disabled={locked} onClick={() => edit({ pan: { x: 0, y: 0 } }, false)}>화면 원점</Button><Button variant="outline" disabled={locked} onClick={() => { const start = p.nodes.find(node => node.shape === "terminal" && /^(시작|출발)/.test(node.text)); if (start) { edit({ pan: { x: clamp(start.x - 40), y: clamp(start.y - 40) } }, false); canvas.current?.scrollTo({ left: 0, top: 0 }); } }}>시작으로 보기</Button><label className={styles.check}><input type="checkbox" checked={grid} onChange={event => setGrid(event.target.checked)} />모눈 표시</label></div><label className={styles.field}>편집할 기호<select aria-label="편집할 기호" id={`${prefix}-node-picker`} value={selectedNode?.id ?? ""} onChange={event => setSelected(event.target.value)}><option value="">기호 선택</option>{p.nodes.map(node => <option key={node.id} value={node.id}>{node.text || "빈 기호"}</option>)}</select></label>{selectedNode && <><label className={styles.field}>기호 내용<textarea id={`${prefix}-node-content`} aria-label="기호 내용" maxLength={1000} disabled={controller.busy} value={selectedNode.text} onChange={event => changeText(selected, event.target.value)} /></label><Button variant="outline" disabled={locked} onClick={() => { pendingFocus.current = `${prefix}-node-picker`; removeNode(selected); }}>선택 기호와 연결 삭제</Button></>}
      <h4>화살표 연결</h4><div className={styles.recipeFields}>{[["출발 기호", from, setFrom], ["도착 기호", to, setTo]].map(([label, value, setter]) => <label key={label as string} className={styles.field}>{label as string}<select aria-label={label as string} value={value as string} disabled={locked} onChange={event => (setter as (value: string) => void)(event.target.value)}>{p.nodes.map(node => <option key={node.id} value={node.id}>{node.text || "빈 기호"}</option>)}</select></label>)}<label className={styles.field}>갈래<select aria-label="갈래" value={branch} disabled={locked} onChange={event => setBranch(event.target.value as typeof branch)}><option value="">다음</option><option value="예">예</option><option value="아니오">아니오</option></select></label></div><Button variant="outline" disabled={locked || p.edges.length >= 400 || from === to || !p.nodes.some(node => node.id === from) || !p.nodes.some(node => node.id === to)} onClick={() => connectNodes(from, to, branch)}>이 화살표 연결</Button><ul>{p.edges.map((edge, index) => <li key={`${index}-${edge.from}`}><span>{p.nodes.find(node => node.id === edge.from)?.text} → {edge.label || "다음"} → {p.nodes.find(node => node.id === edge.to)?.text}</span> <Button variant="ghost" disabled={locked} onClick={() => disconnect(edge.from, edge.to, edge.label)}>화살표 삭제</Button></li>)}</ul>
    </details>
    <Dialog open={recipeOpen} onOpenChange={open => { recipeVisible.current = open; setRecipeOpen(open); }}><DialogContent className={`${styles.modal} ${styles.modalWide}`} initialFocus={recipeTitle} finalFocus={() => recipeTrigger.current?.isConnected ? recipeTrigger.current : plannerToggle.current}>
      <DialogTitle ref={recipeTitle} tabIndex={-1}>🩺 추상화 처방전 · 자연어 기획서 채우기</DialogTitle>
      <DialogDescription>문제를 고르거나 직접 정의한 뒤, 처방전을 검토하고 내 기획서로 채택해 보세요.</DialogDescription>
      <div className={dialogStyles.tabs} role="tablist" aria-label="처방전 문제 선택">
        {([['recommended', '추천 문제'], ['custom', '나만의 문제']] as const).map(([tab, label]) => <button key={tab} type="button" role="tab" id={`${prefix}-recipe-tab-${tab}`} aria-selected={recipeTab === tab} aria-controls={`${prefix}-recipe-panel-${tab}`} tabIndex={recipeTab === tab ? 0 : -1} onClick={() => setRecipeTab(tab)} onKeyDown={event => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return; event.preventDefault(); const next = event.key === "Home" ? "recommended" : event.key === "End" ? "custom" : tab === "recommended" ? "custom" : "recommended"; recipeTabFocus.current = true; setRecipeTab(next); }}>{label}</button>)}
      </div>
      <div role="tabpanel" id={`${prefix}-recipe-panel-recommended`} aria-labelledby={`${prefix}-recipe-tab-recommended`} hidden={recipeTab !== "recommended"}>
        <p className={dialogStyles.intro}>익숙한 문제 하나를 고르세요. 목표·변수·조건을 읽고 내 상황에 맞게 수정할 수 있어요.</p>
        <div className={dialogStyles.presets}>{flowchartPresets.map(preset => <button type="button" key={preset.id} className={dialogStyles.preset} aria-pressed={chosenPreset === preset.id} disabled={locked} onClick={() => { const { current, goal, conditions, core, cards } = preset; setChosenPreset(preset.id); setRecipeGenerated(false); setRecipeError(""); changeRecipe({ current, goal, conditions: [...conditions], core: [...core], cards: cards.map(card => ({ ...card, id: crypto.randomUUID() })) }); }}><strong>{preset.title}</strong><span>{preset.current}</span><small><b>핵심 변수</b> {preset.core.join(" · ")}</small><small><b>조건</b> {preset.conditions.join(" · ")}</small></button>)}</div>
      </div>
      <div role="tabpanel" id={`${prefix}-recipe-panel-custom`} aria-labelledby={`${prefix}-recipe-tab-custom`} hidden={recipeTab !== "custom"}>
        <p className={dialogStyles.intro}>어떤 상태에서 시작해 무엇을 이루고 싶은가요? 아래에서 직접 적거나 빠른 시작을 골라 보세요.</p>
        <div className={dialogStyles.quickIdeas} aria-label="나만의 문제 빠른 시작">{flowchartQuickIdeas.map(idea => <Button key={idea.id} variant="outline" disabled={locked} onClick={() => { setChosenPreset(""); setRecipeGenerated(false); setRecipeError(""); changeRecipe({ current: idea.current, goal: idea.goal, conditions: [], core: [], cards: [] }); }}>{idea.title}</Button>)}</div>
      </div>
      <section className={dialogStyles.result} aria-label="처방전 결과 검토">
        <header><h3>처방전 결과 검토</h3><p>내 기획서에 반영하기 전에 문제 정의와 번호순 계획을 확인하세요.</p></header>
        <div className={styles.recipeFields}>{recipeField("current", "현재 상태")}{recipeField("goal", "목표 상태")}{recipeField("conditions", "필수 조건")}{recipeField("core", "핵심 요소")}</div>
        <Button disabled={mode === "preview" || locked || controller.actionBlocked || !recipe.current.trim()} onClick={() => void recommend()}>{controller.aiBusy ? "기획서를 제안하는 중…" : `✨ AI 기획서 제안 받기${recipeError ? " · 다시 시도" : recipeGenerated ? " · 다시 생성" : ""}`}</Button>
        {mode === "preview" && <p className={styles.muted}>교사 미리보기에서는 예시와 직접 작성을 체험해요. AI와 학생 기록 가져오기는 사용하지 않아요.</p>}
        {recipeError && <p role="alert" className={styles.error}>{recipeError}</p>}
        <details><summary>추상화 기록에서 가져오기</summary><label className={styles.field}>가져올 추상화 기록<select aria-label="가져올 추상화 기록" disabled={reading} value={sourceKind} onChange={event => { setSourceKind(event.target.value as typeof sourceKind); setImported(null); }}><option value="submission">최근 제출본</option><option value="draft">현재 작성본</option></select></label><Button variant="outline" disabled={mode === "preview" || reading || locked} onClick={() => void readAbstraction()}>{reading ? "기록을 읽는 중…" : "추상화 기록 살펴보기"}</Button>{imported && <><p>{imported.current} → {imported.goal}</p><Button onClick={() => { changeRecipe({ ...recipeRef.current, current: imported.current, goal: imported.goal, conditions: [...imported.conditions], core: [...imported.core] }); setImported(null); }}>이 정의를 내 작품에 복사</Button></>}</details>
        <h3>번호순 실천 계획</h3><div className={styles.tools}>{(["sequence", "selection", "loop"] as const).map(type => <Button key={type} id={`${prefix}-recipe-add-${type}`} variant="outline" disabled={locked || recipe.cards.length >= 50} onClick={() => { const id = crypto.randomUUID(); recipeFieldFocus.current = `${prefix}-recipe-${id}-text`; changeRecipe({ ...recipeRef.current, cards: [...recipeRef.current.cards, { id, type, text: "", yes: "", no: "" }] }); }}>+ {type === "sequence" ? "순차" : type === "selection" ? "선택" : "반복"} 계획</Button>)}</div>
        <div className={styles.recipeCards}>{!recipe.cards.length && <p>추천 문제를 고르거나 계획을 추가하면 여기에 순서대로 보여요.</p>}{recipe.cards.map((card, index) => <NaturalCard key={card.id} card={card} index={index} count={recipe.cards.length} prefix={`${prefix}-recipe`} disabled={controller.busy} change={value => changeRecipe({ ...recipeRef.current, cards: recipeRef.current.cards.map(item => item.id === card.id ? value : item) })} remove={() => { const next = recipeRef.current.cards[index + 1] ?? recipeRef.current.cards[index - 1]; recipeFieldFocus.current = next ? `${prefix}-recipe-${next.id}-text` : `${prefix}-recipe-add-sequence`; changeRecipe({ ...recipeRef.current, cards: recipeRef.current.cards.filter(item => item.id !== card.id) }); }} reorder={direction => { const cards = [...recipeRef.current.cards]; [cards[index], cards[index + direction]] = [cards[index + direction], cards[index]]; recipeFieldFocus.current = `${prefix}-recipe-${card.id}-${index + direction === 0 ? "down" : index + direction === cards.length - 1 ? "up" : direction === -1 ? "up" : "down"}`; changeRecipe({ ...recipeRef.current, cards }); }} />)}</div>
      </section>
      <label className={styles.check}><input type="checkbox" disabled={locked} checked={resetCanvas} onChange={event => setResetCanvas(event.target.checked)} />기호와 화살표도 처음부터 다시 만들기 (이전 제출 기록은 유지)</label>
      <div className={styles.dialogActions}><Button variant="outline" aria-label="처방전 닫기" onClick={() => { recipeVisible.current = false; setRecipeOpen(false); }}>닫기</Button><Button disabled={locked || !recipe.current.trim() || !recipe.goal.trim()} onClick={() => { const initial = initialReviewProject("flowchart") as FlowchartProject; recipeEdited.current = false; edit({ ...recipeRef.current, ...(resetCanvas ? { nodes: initial.nodes, edges: initial.edges, pan: initial.pan } : {}) }); recipeVisible.current = false; setRecipeOpen(false); }}>처방전으로 초안 채우기</Button></div>
    </DialogContent></Dialog>
    <Dialog open={reviewOpen} onOpenChange={setReviewOpen}><DialogContent className={styles.modal} initialFocus={reviewTitle} finalFocus={() => reviewNodeFocus.current ? document.getElementById(`${prefix}-node-content`) : reviewTrigger.current?.isConnected ? reviewTrigger.current : plannerToggle.current}>
      <DialogTitle ref={reviewTitle} tabIndex={-1}>✨ Solar AI 설계 점검</DialogTitle><DialogDescription>기본 구조를 먼저 확인하고 목표·조건과 실제 연결에 대한 AI 의견을 요청할 수 있어요.</DialogDescription>
      <section className={dialogStyles.structure} aria-label="기본 구조 점검"><h3>기본 구조 점검</h3><dl className={dialogStyles.metrics}><div><dt>기호</dt><dd>{p.nodes.length}개</dd></div><div><dt>화살표</dt><dd>{p.edges.length}개</dd></div><div><dt>판단 기호</dt><dd>{p.nodes.filter(node => node.shape === "decision").length}개</dd></div><div><dt>반복 계획</dt><dd>{p.cards.filter(card => card.type === "loop").length}개</dd></div></dl>
        <p>{structure.valid ? "시작·종료와 연결 구조를 확인했어요. 목표와 조건에 맞는지는 실제 실행과 설계 점검으로 살펴보세요." : "아래 항목을 선택하면 해당 기호로 이동해 수정할 수 있어요."}</p>
        {!structure.valid && <ul className={dialogStyles.issues}>{structure.issues.map((issue, index) => <li key={index}>{issue.blockId && p.nodes.some(node => node.id === issue.blockId) ? <Button variant="ghost" onClick={() => inspectNode(issue.blockId!)}>{issue.message} →</Button> : issue.message}</li>)}</ul>}
      </section>
      <Button disabled={mode === "preview" || locked || controller.actionBlocked || !basicReviewCheck(p, "free").passed} onClick={() => void ai.ask("flow-review", "목표·필수 조건·실제 연결을 검토해 주세요.", "free")}>{controller.work.aiReview ? "AI 설계 다시 점검" : "AI 설계 리뷰 받기"}</Button>{ai.error && <p role="alert" className={styles.error}>{ai.error}</p>}
      {controller.work.aiReview && <div className={styles.reviewMessage} role="status"><strong>{sameReviewProject(p, controller.work.aiReview.project, "free") ? "현재 작품 리뷰" : "이전 작품 리뷰"}</strong><p>{controller.work.aiReview.message}</p></div>}{ai.remaining !== null && <p>오늘 AI 도움 {ai.remaining}회 남음</p>}<ReviewSubmit controller={controller} mode={mode} missionId="free" />
    </DialogContent></Dialog>

    <Dialog open={exportOpen} onOpenChange={open => { setExportOpen(open); if (!open) { exportRequest.current++; setExportBusy(false); } }}><DialogContent className={`${styles.modal} ${styles.modalWide}`} initialFocus={exportTitle} finalFocus={() => exportTrigger.current?.isConnected ? exportTrigger.current : plannerToggle.current}><DialogTitle ref={exportTitle} tabIndex={-1}>🖼️ 내 알고리즘 작품 내보내기</DialogTitle><DialogDescription>문제 정의·자연어 기획서·순서도를 한 장의 이미지로 담아요.</DialogDescription>{exportBusy && <p role="status">이미지를 만드는 중…</p>}{exportError && <p role="status">{exportError}</p>}{image && <><div className={styles.exportPreview}>{ /* A local Blob preview cannot use the Next image optimizer. */ }
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={image.url} alt="문제 정의와 자연어 기획서, 순서도를 담은 작품 이미지" /></div><div className={styles.dialogActions}><Button onClick={() => void copyImage()}>이미지 복사</Button><a href={image.url} download="나의-순서도-작품.png">PNG 다운로드</a></div></>}</DialogContent></Dialog>
    <Dialog open={clearOpen} onOpenChange={setClearOpen}><DialogContent className={styles.modal} initialFocus={clearTitle} finalFocus={() => clearTrigger.current?.isConnected ? clearTrigger.current : plannerToggle.current}><DialogTitle ref={clearTitle} tabIndex={-1}>캔버스를 비울까요?</DialogTitle><DialogDescription>현재 기호와 화살표를 시작·종료 기호로 되돌립니다. 기획서와 이전 제출 기록은 유지돼요.</DialogDescription><div className={styles.dialogActions}><Button variant="outline" onClick={() => setClearOpen(false)}>취소</Button><Button disabled={locked} onClick={() => { const { nodes, edges, pan } = initialReviewProject("flowchart") as FlowchartProject; edit({ nodes, edges, pan }); setSelected(""); setClearOpen(false); }}>기호와 화살표 비우기</Button></div></DialogContent></Dialog>
  </>;
}
