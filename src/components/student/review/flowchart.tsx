"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LessonMode } from "../work-controller";
import { Button } from "@/components/ui/button";
import { missions, level2Walkthrough } from "@/lib/classroom/review/flowchart-data.mjs";
import type { FlowchartProject } from "@/lib/classroom/review/project";
import { guideGraph, placePuzzleBlock, puzzleGraph, puzzleExecutionGraph, puzzlePalette } from "@/lib/classroom/review/flow-experience";
import { FlowDiagram } from "./flow-diagram";
import { FlowExecution } from "./flow-execution";
import { FlowchartStudio } from "./flowchart-studio";
import { ReviewSubmit, useReviewAi, type ReviewController } from "./shared";
import styles from "./flowchart.module.css";

const steps: FlowchartProject["mission"][] = ["1", "2", "3", "guide", "free"];
const stepNames = ["🍜 1. 순차 (라면)", "🎡 2. 선택 (놀이기구)", "🔒 3. 반복 (비밀번호)", "🛠️ 4. 예시 공방", "🚀 5. 나만의 백지"];
const missionFeedback: Record<string, { summary: string; completion: string; next: string }> = {
  "1": { summary: "입력 자료: 물 500ml · 물을 끓인 뒤 면과 스프를 넣고 4분 끓여요.", completion: "🍜 라면이 완성됐어요! 물 붓기 → 끓이기 → 면과 스프 넣기를 순서대로 실행하는 순차 구조예요.", next: "다음 미션: 선택 구조" },
  "2": { summary: "입력 자료: 키(cm) · 150cm 이상이면 탑승할 수 있어요. 150cm도 포함해요.", completion: "🎡 선택 구조 실행을 마쳤어요. 입력한 키가 150cm 이상인지에 따라 예 또는 아니오 한 갈래만 실행돼요.", next: "다음 미션: 반복 구조" },
  "3": { summary: "입력 자료: 비밀번호 · 정답 7777을 입력할 때까지 반복해요.", completion: "🔒 로그인에 성공했어요! 비밀번호가 틀리면 입력으로 돌아가고 맞으면 끝나는 반복 구조예요.", next: "다음 단계: 예시 공방" },
};

export function Flowchart({ controller, practiceFocused = false, mode = "student" }: { controller: ReviewController; practiceFocused?: boolean; mode?: LessonMode }) {
  const project = controller.draft.reviewProject, ai = useReviewAi(controller, mode), { clear } = ai;
  const [paletteBlock, setPaletteBlock] = useState(""), [active, setActive] = useState<string | undefined>(), [collapsed, setCollapsed] = useState(false), [focus, setFocus] = useState(0), [monitorOpen, setMonitorOpen] = useState(false);
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const openMonitor = useCallback(() => setMonitorOpen(true), []);
  const practice = useRef<HTMLDivElement>(null), heading = useRef<HTMLHeadingElement>(null), plannerToggle = useRef<HTMLButtonElement>(null), restorePlanner = useRef(false);
  const missionId = project?.type === "flowchart" ? project.mission : null;
  useEffect(() => { clear(); }, [clear, missionId]);
  useEffect(() => { if (focus) heading.current?.focus(); }, [focus]);
  useEffect(() => { if (restorePlanner.current) { plannerToggle.current?.focus(); restorePlanner.current = false; } }, [collapsed]);
  useEffect(() => {
    const element = practice.current; if (!element) return;
    const measure = () => {
      const stage = element.querySelector("[data-flow-canvas]")?.parentElement?.closest("section")?.parentElement;
      if (stage) element.style.setProperty("--workspace-height", `${Math.max(300, window.innerHeight - Math.max(12, stage.getBoundingClientRect().top) - 20)}px`);
    };
    measure(); window.addEventListener("resize", measure);
    const observer = new ResizeObserver(measure), shell = element.closest("[data-lesson-shell]");
    for (const header of shell?.querySelectorAll("header, [role='tablist'], [data-focused] > summary") ?? []) if (!element.contains(header)) observer.observe(header);
    const nav = element.querySelector("nav"); if (nav) observer.observe(nav);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [missionId, practiceFocused]);
  if (project?.type !== "flowchart") return null;
  const p = project, locked = controller.busy || controller.aiBusy;
  function edit(fields: Partial<FlowchartProject>) {
    const draft = controller.getDraft();
    if (draft.reviewProject?.type === "flowchart") controller.update({ ...draft, reviewProject: { ...draft.reviewProject, ...fields } });
  }
  function navigate(mission: FlowchartProject["mission"]) { if (locked) return; edit({ mission }); setPaletteBlock(""); setActive(undefined); setFocus(value => value + 1); }
  function place(slotId: string, blockId: string) {
    if (locked) return;
    const draft = controller.getDraft();
    if (draft.reviewProject?.type !== "flowchart") return;
    const current = draft.reviewProject, placed = current.placements[current.mission] ?? {};
    const next = placePuzzleBlock(current.mission, placed, slotId, blockId);
    if (next === placed) return;
    controller.update({ ...draft, reviewProject: { ...current, placements: { ...current.placements, [current.mission]: next } } });
    setPaletteBlock("");
  }
  const mission = missions.find(item => String(item.id) === p.mission);
  const graph = mission ? puzzleGraph(p.mission, p.placements[p.mission] ?? {}) : guideGraph(p.guideStep);
  const placements = p.placements[p.mission] ?? {}, used = new Set(Object.values(placements));
  const clearable = mission?.slots.filter(slot => !slot.fixed && mission.palette.some(block => block.id === placements[slot.id])).map(slot => slot.id) ?? [];
  const empty = mission?.slots.filter(slot => !slot.fixed && !clearable.includes(slot.id)).map(slot => slot.id) ?? [];
  const feedback = missionFeedback[p.mission];
  return <div ref={practice} className={styles.practice} data-practice="flowchart" data-focused={practiceFocused}>
    <nav className={styles.stepNav} aria-label="순서도 실습">{steps.map((id, index) => <button key={id} disabled={locked} aria-pressed={p.mission === id} onClick={() => navigate(id)}>{stepNames[index]}{controller.work.missions?.[id]?.submission ? " ✓" : ""}</button>)}</nav>
    <h3 ref={heading} tabIndex={-1} className={styles.srOnly}>{mission?.title ?? (p.mission === "guide" ? "선생님과 함께하는 예시 공방" : "내 생각을 연결하는 자유 캔버스")}</h3>
    {mission ? <FlowExecution key={p.mission} onActive={setActive} graph={puzzleExecutionGraph(p.mission, placements)} missionSummary={feedback.summary} completionText={feedback.completion} completionAction={<Button disabled={locked} onClick={() => navigate(steps[Number(p.mission)])}>{feedback.next}</Button>}>
      {(controls, monitor, status, runtime) => <div className={styles.puzzleColumns}>
        <section className={styles.puzzlePalette} aria-label="순서도 기호 보관함">
          <small>Symbol Palette</small><h3>순서도 기호 보관함</h3>
          <p>기호를 빈칸으로 끌어 놓아요. 클릭하거나 Enter로 고른 뒤 빈칸을 눌러도 좋아요. 각 기호는 한 칸에만 놓을 수 있어요.</p>
          <div className={styles.palette}>{puzzlePalette(p.mission, attempts[p.mission] ?? 0).map(block => <button key={block.id} className={styles.symbolBlock} data-shape={block.shape} data-used={used.has(block.id)} aria-label={block.text} aria-pressed={paletteBlock === block.id} disabled={locked || used.has(block.id)} draggable={!locked && !used.has(block.id)} onDragStart={event => { event.dataTransfer.setData("text/plain", block.id); event.dataTransfer.effectAllowed = "move"; setPaletteBlock(block.id); }} onClick={() => setPaletteBlock(block.id)}><span>{block.text}</span>{used.has(block.id) && <small>배치됨</small>}</button>)}</div>
          <p role="status">{paletteBlock ? `선택: ${mission.palette.find(block => block.id === paletteBlock)?.text} · 놓을 기호를 누르세요.` : "배치한 기호의 ×를 누르면 보관함으로 돌아와요."}</p>
          <div className={styles.symbolGuide}><strong>💡 표준 기호 가이드</strong><p>⬭ 단말: 시작과 종료<br />▱ 입출력: 데이터 입력·출력<br />▭ 처리: 연산·명령 실행<br />◇ 판단: 조건 검사·분기</p></div>
          <details><summary>목록으로 배치하기</summary>{mission.slots.filter(slot => !slot.fixed).map(slot => <label key={slot.id} className={styles.field}>{slot.hint}<select aria-label={slot.hint} disabled={locked} value={placements[slot.id] ?? ""} onChange={event => place(slot.id, event.target.value)}><option value="">빈 기호</option>{mission.palette.map(block => <option key={block.id} value={block.id}>{block.text}{used.has(block.id) && placements[slot.id] !== block.id ? " (이 칸으로 이동)" : ""}</option>)}</select></label>)}</details>
        </section>
        <section className={styles.puzzleCanvas}>
          <header><div><small>Mission {p.mission} of 3</small><h3>{mission.title}</h3></div><Button variant="ghost" disabled={locked} onClick={() => { edit({ placements: { ...p.placements, [p.mission]: {} } }); setPaletteBlock(""); setAttempts(value => ({ ...value, [p.mission]: (value[p.mission] ?? 0) + 1 })); }}>↶ 다시 조립</Button></header>
          <p className={styles.missionDescription}>{mission.desc}</p>
          <FlowDiagram {...graph} {...runtime} fit active={active} emptyNodes={empty} clearableNodes={clearable} clearNode={slotId => place(slotId, "")} select={slotId => { if (paletteBlock) place(slotId, paletteBlock); }} drop={place} />
        </section>
        <div className={styles.puzzleMonitor}>
          <section className={styles.puzzleExecution} aria-label="순서도 실행"><small>I/O &amp; Simulation</small><h3>실행 검증 &amp; 입출력</h3>{status}{controls}{monitor}</section>
          <section className={styles.diagnosis}><h3>🤖 Solar AI 순서도 진단기</h3><p>순서도를 실행해 보고, 필요한 경우 오류 설명과 힌트를 받아 보세요.</p><Button variant="outline" disabled={mode === "preview" || locked || controller.actionBlocked} onClick={() => void ai.ask("flow-puzzle", "현재 배치에서 고칠 부분의 이유와 힌트를 알려 주세요.", p.mission)}>AI 오류 설명과 힌트</Button>{ai.error && <p className={styles.error} role="alert">{ai.error}</p>}{ai.result && <p role="status">{ai.result.message}</p>}<ReviewSubmit mode={mode} controller={controller} missionId={p.mission} /></section>
        </div>
      </div>}
    </FlowExecution> : p.mission === "guide" ? <div className={styles.guideWorkspace} data-planner-collapsed={collapsed}>
      <section className={styles.planner} aria-label="예시 자연어 기획서">
        <header><h3>📝 자연어 단계별 조립</h3><Button ref={plannerToggle} variant="ghost" aria-expanded={!collapsed} aria-label={collapsed ? "기획서 펼치기" : "기획서 접기"} onClick={() => { restorePlanner.current = true; setCollapsed(value => !value); }}>{collapsed ? "»" : "«"}</Button></header>
        <div hidden={collapsed} className={styles.cardList}><p>카드를 클릭하면 오른쪽 순서도에 기호가 연결돼요. 앞 카드를 다시 읽어도 완성한 기호는 남아요.</p>{level2Walkthrough.steps.map(step => <button className={styles.guideCard} key={step.stepIdx} disabled={locked} data-revealed={p.guideStep >= step.stepIdx} data-active={step.stepIdx === (active === "time" ? 1 : active === "wash" ? 2 : ["check", "yes", "no"].includes(active ?? "") ? 3 : ["bus", "end"].includes(active ?? "") ? 4 : 0)} onClick={() => { if (step.stepIdx > p.guideStep) edit({ guideStep: step.stepIdx }); }}><strong>{step.cardTitle}</strong><p>{step.naturalText || `${step.condition} · 예: ${step.yesAction} / 아니오: ${step.noAction}`}</p><small>{p.guideStep >= step.stepIdx ? `${step.symbolShapeName} · ${step.explanation}` : "클릭해 순서도로 바꾸기"}</small></button>)}<span>진행: {p.guideStep} / 4</span></div>
      </section>
      <section className={styles.guideCanvas}>
        <FlowExecution onActive={setActive} onWaiting={openMonitor} monitorVisible={monitorOpen} onPrepare={() => { if (p.guideStep < 4) edit({ guideStep: 4 }); }} graph={guideGraph(4)} missionSummary="현재 시각을 07:30과 비교해 보세요. 07:30도 예 갈래에 포함돼요." choiceLabels={{ "예": "07:20 · 예로 진행", "아니오": "07:45 · 아니오로 진행" }}>
          {(controls, monitor, status, runtime) => <>
            <header><h3>📐 표준 순서도 다이어그램</h3><div className={styles.tools}><Button variant="ghost" disabled={locked} onClick={() => edit({ guideStep: 0 })}>↶ 공방 다시 보기</Button><Button variant="ghost" disabled={locked} onClick={() => edit({ guideStep: 4 })}>⚡ 전체 완성</Button><Button disabled={locked} onClick={() => navigate("free")}>나만의 백지로 이동</Button></div>{controls}</header>
            {status}<FlowDiagram {...graph} {...runtime} fit active={active} />
            <details open={monitorOpen} onToggle={event => setMonitorOpen(event.currentTarget.open)}><summary>실행 과정</summary>{monitor}</details>
          </>}
        </FlowExecution>
      </section>
    </div> : <FlowchartStudio controller={controller} mode={mode} />}
  </div>;
}
