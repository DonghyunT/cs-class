"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { LessonMode } from "../work-controller";
import { PracticeGuidance } from "../practice-guidance";
import { Button } from "@/components/ui/button";
import { TUT_SCENARIOS } from "@/lib/classroom/review/abstraction-data.mjs";
import { abstractionSchema, basicReviewCheck, type AbstractionProject } from "@/lib/classroom/review/project";
import type { AiResult, AiTask } from "@/lib/classroom/review/ai";
import { ReviewSubmit, type ReviewController } from "./shared";
import base from "./review.module.css";
import studio from "./studio.module.css";
import layout from "./abstraction.module.css";
const styles = { ...base, ...studio };
type DoctorTurn = { id: string; input: string; task: AiTask; result?: AiResult; error?: string; pending?: boolean };

export function Abstraction({ controller, practiceFocused = false, mode = "student" }: { controller: ReviewController; practiceFocused?: boolean; mode?: LessonMode }) {
  const project = controller.draft.reviewProject;
  const fieldId = useId();
  const [chats, setChats] = useState<Record<number, string>>({}), [copied, setCopied] = useState(""), [adoptionError, setAdoptionError] = useState("");
  const [history, setHistory] = useState<Record<number, DoctorTurn[]>>({}), [remaining, setRemaining] = useState<number | null>(null);
  const pending = useRef(false), active = useRef(true), conversation = useRef<HTMLDivElement>(null), followConversation = useRef(true);
  const step = project?.type === "abstraction" ? project.step : 1;
  const turns = history[step] ?? [];
  const heading = useRef<HTMLHeadingElement>(null), [focus, setFocus] = useState(0);
  const focusTarget = useRef<string | HTMLElement | null>(null);
  useEffect(() => { if (focus) { const target = focusTarget.current; if (typeof target === "string") document.getElementById(target)?.focus(); else (target ?? heading.current)?.focus(); } }, [focus]);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { if (followConversation.current) conversation.current?.scrollTo({ top: conversation.current.scrollHeight }); }, [history, step]);
  if (project?.type !== "abstraction") return null;
  const p = project, locked = controller.busy || controller.aiBusy || turns.some(turn => turn.pending), chat = chats[step] ?? "";
  const recommendationTask: AiTask = p.step === 4 ? "abstraction-plan" : "abstraction-help";
  const hasRecommendation = turns.some(turn => turn.task === recommendationTask && !!turn.result?.options.length) || p.adopted.some(({ kind }) => p.step === 1 ? kind === "state" : p.step === 2 ? kind === "condition" : p.step === 3 ? kind === "core" || kind === "noise" : kind === "plan");
  const recommendationLabel = (hasRecommendation ? ["현재·목표 후보 다시 받기", "조건 다시 추천 받기", "생각 다이어트 단어 다시 받기", "해결 계획 다시 추천 받기"] : ["현재·목표 후보 받기", "조건 추천 받기", "생각 다이어트 단어 받기", "해결 계획 추천 받기"])[p.step - 1];
  const change = (fields: Partial<AbstractionProject>) => {
    const draft = controller.getDraft(); if (draft.reviewProject?.type !== "abstraction") return false;
    const next = { ...draft.reviewProject, ...fields };
    if (!abstractionSchema.safeParse(next).success || new TextEncoder().encode(JSON.stringify({ ...draft, reviewProject: next })).length > 160000) {
      setAdoptionError("제안이 저장 한도를 넘어요. 기존 내용을 보존했어요. 필요한 항목을 정리한 뒤 다시 채택해 주세요."); return false;
    }
    controller.update({ ...draft, reviewProject: next }); setAdoptionError(""); return true;
  };
  const focusAfterUpdate = (target: string | HTMLElement | null = null) => { focusTarget.current = target; setFocus(n => n + 1); };
  const move = (fields: Partial<AbstractionProject>) => { if (change(fields)) focusAfterUpdate(); };
  function adopt(kind: AbstractionProject["adopted"][number]["kind"], input: string | string[]) {
    const current = controller.getDraft().reviewProject; if (current?.type !== "abstraction") return;
    const incoming = (Array.isArray(input) ? input : [input]).filter(value => value.trim());
    const adopted = [...current.adopted.filter(item => item.kind !== kind || !incoming.includes(item.value)), ...incoming.map(value => ({ kind, value }))].slice(-100);
    if (kind === "state") { const pair = /^현재:\s*(.+)\s*\/\s*목표:\s*(.+)$/.exec(incoming[0] ?? ""); if (pair) change({ current: pair[1].trim(), goal: pair[2].trim(), adopted }); }
    else {
      const field = kind === "condition" ? "conditions" : kind === "plan" ? "plans" : kind;
      const values = [...current[field], ...incoming.filter(value => !current[field].includes(value))];
      change({ [field]: values, ...(kind === "core" ? { noise: current.noise.filter(item => !incoming.includes(item)) } : kind === "noise" ? { core: current.core.filter(item => !incoming.includes(item)) } : {}), adopted });
    }
  }
  async function ask(task: AiTask, input: string) {
    if (mode === "preview" || locked || controller.actionBlocked || pending.current) return;
    pending.current = true;
    const requestedStep = p.step, id = crypto.randomUUID();
    followConversation.current = true;
    setHistory(previous => ({ ...previous, [requestedStep]: [...previous[requestedStep] ?? [], { id, input, task, pending: true }] }));
    const finish = (fields: Partial<DoctorTurn>) => { if (active.current) setHistory(previous => ({ ...previous, [requestedStep]: (previous[requestedStep] ?? []).map(turn => turn.id === id ? { ...turn, ...fields, pending: false } : turn) })); };
    try {
      const reply = await controller.requestAi(task, input);
      if (reply) { finish({ result: reply.result }); if (active.current) setRemaining(reply.remaining); }
      else finish({ error: "작품이 바뀌었거나 저장을 완료하지 못했어요. 현재 입력을 확인하고 다시 요청해 주세요." });
    } catch (error) { finish({ error: error instanceof Error ? error.message : "AI 도움을 받지 못했어요. 입력과 이전 제안은 보존됩니다." }); }
    finally { pending.current = false; }
  }
  function listEditor(key: "conditions" | "plans") {
    const label = key === "conditions" ? "조건" : "실천 계획";
    return <><ol className={layout.itemList} aria-label={key === "conditions" ? "조건 목록" : "실천 계획"}>{p[key].map((value, index) => <li key={index}>
      <span className={layout.number} aria-hidden="true">{index + 1}</span>
      <div className={styles.field}><label htmlFor={`${fieldId}-${key}-${index}`}>{label} {index + 1}</label><textarea id={`${fieldId}-${key}-${index}`} rows={2} maxLength={1000} disabled={controller.busy} value={value} onChange={event => change({ [key]: p[key].map((item, i) => i === index ? event.target.value : item) })} placeholder={key === "conditions" ? "반드시 지킬 기준을 적어요" : "실제로 할 일을 적어요"} /><p className={layout.printText}>{value || "작성 중"}</p></div>
      <Button className={layout.remove} variant="ghost" aria-label={`${label} ${index + 1} 삭제`} disabled={locked} onClick={() => { if (change({ [key]: p[key].filter((_, i) => i !== index) })) focusAfterUpdate(p[key].length > 1 ? `${fieldId}-${key}-${Math.min(index, p[key].length - 2)}` : `${fieldId}-${key}-add`); }}>삭제</Button>
    </li>)}</ol><Button id={`${fieldId}-${key}-add`} variant="outline" disabled={locked} onClick={() => { if (change({ [key]: [...p[key], ""] })) focusAfterUpdate(`${fieldId}-${key}-${p[key].length}`); }}>{key === "conditions" ? "조건 추가" : "실천 단계 추가"}</Button></>;
  }
  const field = (label: string, key: "current" | "goal" | "topic" | "conditions" | "core" | "noise" | "plans", multiline = false) => <div className={styles.field} data-tone={key === "current" || key === "noise" ? "rose" : key === "conditions" ? "amber" : key === "core" ? "green" : "violet"}>
    <label htmlFor={`${fieldId}-${key}`}>{label}</label>{multiline ? <>
      <textarea id={`${fieldId}-${key}`} maxLength={1000} value={(p[key] as string[]).join("\n")} disabled={controller.busy} onChange={event => change({ [key]: event.target.value.split("\n") })} />
      <small className={styles.muted}>직접 입력은 1,000자 이내예요. 한 줄에 한 항목씩 적어요.</small>
    </> : key === "topic" ? <input id={`${fieldId}-${key}`} maxLength={1000} value={p[key] as string} disabled={controller.busy} onChange={event => change({ [key]: event.target.value })} /> : <textarea rows={2} id={`${fieldId}-${key}`} maxLength={1000} value={p[key] as string} disabled={controller.busy} onChange={event => change({ [key]: event.target.value })} />}</div>;
  const scenario = TUT_SCENARIOS[p.tutorialScenario];
  const prescription = `[추상화 처방전]\n현재: ${p.current}\n목표: ${p.goal}\n조건: ${p.conditions.join(" / ")}\n핵심: ${p.core.join(" / ")}\n버린 노이즈: ${p.noise.join(" / ")}\n계획:\n${p.plans.map((text, i) => `${i + 1}. ${text}`).join("\n")}`;
  return <div className={`${styles.studio} ${layout.root}`} data-practice="abstraction">
    <nav className={styles.stepNav} aria-label="추상화 활동">
      <button disabled={locked} aria-pressed={p.view === "tutorial"} onClick={() => move({ view: "tutorial" })}>30초 맛보기</button>
      <button disabled={locked} aria-pressed={p.view === "workbook"} onClick={() => move({ view: "workbook" })}>실전 워크북</button>
    </nav>
    {p.view === "tutorial" ? <div className={`${styles.columns} ${layout.columns}`}><section className={`${styles.panel} ${styles.workbook}`}>
      <h3 ref={heading} tabIndex={-1}>맛보기 {p.tutorialStep}/4 · {p.tutorialStep === 1 ? "현재와 목표" : p.tutorialStep === 2 ? "지킬 조건" : p.tutorialStep === 3 ? "생각 다이어트" : "나만의 문제로 출발"}</h3>
      <p className={styles.muted}>맛보기는 추천 활동이에요. 실전 워크북은 언제든 열 수 있어요.</p>
      <label className={styles.field}>맛보기 상황<select value={p.tutorialScenario} disabled={locked} onChange={event => change({ tutorialScenario: event.target.value as AbstractionProject["tutorialScenario"], tutorialNoise: [] })}>{Object.values(TUT_SCENARIOS).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      </label>
      {p.tutorialStep === 1 && <div className={styles.stack}>
        <div className={styles.definition} data-tone="rose"><strong>📍 현재 상태 · 출발점</strong><p>{scenario.current}</p></div>
        <div className={styles.definition} data-tone="violet"><strong>🎯 목표 상태 · 도착점</strong><p>{scenario.goal}</p></div>
        <p>목표는 해결 뒤 도달할 상태예요. 방법과 구분해 보세요.</p>
      </div>}
      {p.tutorialStep === 2 && <div className={styles.stack}>{scenario.conditions.map(item => <div className={styles.definition} data-tone="amber" key={item.text}><strong>🛡 {item.text}</strong><p>{item.desc}</p></div>)}</div>}
      {p.tutorialStep === 3 && <>
        <p>목표 달성에 필요 없는 정보만 버려 보세요. 다시 누르면 돌려놓아요.</p>
        <div className={styles.tags}>{[...scenario.coreTags, ...scenario.noiseTags].map(tag => <button key={tag} disabled={locked} aria-pressed={p.tutorialNoise.includes(tag)} onClick={() => change({ tutorialNoise: p.tutorialNoise.includes(tag) ? p.tutorialNoise.filter(value => value !== tag) : [...p.tutorialNoise, tag] })}>{p.tutorialNoise.includes(tag) ? "버림 · " : "남김 · "}{tag}</button>)}</div>
        <p role="status">{p.tutorialNoise.some(tag => scenario.coreTags.includes(tag)) ? "현재 시각이나 기준처럼 문제 해결에 필요한 정보는 다시 남겨 보세요." : scenario.noiseTags.every(tag => p.tutorialNoise.includes(tag)) ? "핵심 정보만 남겼어요!" : "문제의 조건을 다시 읽고 핵심과 노이즈를 구분해 보세요."}</p>
      </>}
      {p.tutorialStep === 4 && <>
        <p className={styles.feedback}>현재 → 목표 → 조건 → 핵심 요소를 정리했어요. 이제 내 문제를 정의해 볼까요?</p>
        <Button onClick={() => move({ tutorialDone: true, view: "workbook" })}>나의 실전 워크북 시작</Button>
      </>}
      <div className={styles.actions}>
        <Button variant="outline" disabled={locked || p.tutorialStep === 1} onClick={() => move({ tutorialStep: p.tutorialStep - 1 })}>맛보기 이전</Button>
        <Button disabled={locked || p.tutorialStep === 4} onClick={() => move({ tutorialStep: p.tutorialStep + 1 })}>맛보기 다음</Button>
      </div>
    </section><PracticeGuidance focused={practiceFocused} label="상황 예시와 코치 안내"><aside className={styles.panel} aria-label="맛보기 튜토리얼 코치"><header className={styles.stageHeader}><span className={styles.avatar} aria-hidden="true">🎓</span><div><small className={styles.eyebrow}>Tutorial Coach</small><h3>맛보기 튜토리얼 코치</h3></div></header><p className={styles.feedback}>일상의 고민으로 추상화를 연습해 볼까요? 상황 카드를 골라 왼쪽에서 현재·목표·조건·핵심을 살펴보세요.</p><div className={styles.scenarioCards}>{Object.values(TUT_SCENARIOS).map(item => <button key={item.id} className={styles.scenarioCard} disabled={locked} aria-pressed={p.tutorialScenario === item.id} onClick={() => change({ tutorialScenario: item.id as AbstractionProject["tutorialScenario"], tutorialNoise: [] })}><span aria-hidden="true">{item.icon}</span><strong>{item.name}</strong><small>{item.current}</small></button>)}</div><p className={styles.muted}>맛보기를 마치지 않아도 실전 워크북을 열 수 있어요.</p></aside></PracticeGuidance></div> : <>
      <nav className={styles.stepNav} aria-label="워크북 단계">{["상태", "조건", "생각 다이어트", "처방전"].map((name, index) => <button key={name} disabled={locked} aria-pressed={p.step === index + 1} onClick={() => move({ step: index + 1 })}>{index + 1}. {name}</button>)}</nav>
      <div className={`${styles.columns} ${layout.columns}`}>
        <section className={`${styles.panel} ${styles.workbook}`}>
          <span className={styles.badge}>💡 Step {p.step}/4 · 나의 문제 해결 워크북</span>
          <h3 ref={heading} tabIndex={-1}>{["현재와 목표를 정의하기", "지킬 조건 찾기", "핵심과 노이즈 구분하기", "나의 추상화 처방전"][p.step - 1]}</h3>
          {p.step === 1 && <><div className={styles.categoryCards}>{[["📚", "학습·공부계획"], ["💌", "연애·친구"], ["🏫", "학교·행사"], ["🏠", "일상·습관"]].map(([icon,name]) => <button key={name} disabled={locked} onClick={() => change({ topic: name })}><span aria-hidden="true">{icon}</span>{name}</button>)}</div>{field("고민 키워드", "topic")}{field("현재 상태", "current")}{field("목표 상태", "goal")}<p className={styles.muted}>지금 어떤 상태인가요? 해결 뒤 어떤 상태에 도달하고 싶은가요?</p>
          </>}
          {p.step === 2 && <><p className={styles.muted}>시간·안전·관계처럼 반드시 지킬 기준을 등록해요. 닥터의 추천을 선택하거나 직접 추가하세요.</p>
            {listEditor("conditions")}
            <details className={layout.bulkEditor}><summary>조건 한 번에 편집</summary>{field("지킬 조건", "conditions", true)}</details>
          </>}
          {p.step === 3 && <><p className={styles.muted}>후보 단어를 눌러 불필요한 정보는 버리고, 다시 누르면 되돌려요.</p>
            <div className={layout.candidates} aria-label="생각 다이어트 후보 단어">{[...new Set([...p.core, ...p.noise].filter(Boolean))].map(value => <button key={value} disabled={locked} aria-pressed={p.noise.includes(value)} onClick={event => {
              const discard = !p.noise.includes(value);
              if (change({ core: discard ? p.core.filter(item => item !== value) : p.core.includes(value) ? p.core : [...p.core, value], noise: discard ? [...p.noise, value] : p.noise.filter(item => item !== value) })) focusAfterUpdate(event.currentTarget);
            }}>{p.noise.includes(value) ? "버림 · " : "남김 · "}{value}</button>)}</div>
            <div className={styles.dietColumns}><section className={styles.definition} data-tone="green" aria-label="남길 핵심"><h4>🔑 남길 핵심</h4><div className={layout.tags}>{p.core.filter(Boolean).map((value,index) => <span key={index}>{value}</span>)}</div></section><section className={styles.definition} data-tone="rose" aria-label="버릴 노이즈"><h4>🗑 버릴 노이즈</h4><div className={layout.tags}>{p.noise.filter(Boolean).map((value,index) => <span key={index}>{value}</span>)}</div></section></div>
            <details className={layout.bulkEditor}><summary>후보 단어 직접 편집</summary>{field("핵심 요소", "core", true)}{field("버릴 노이즈", "noise", true)}</details>
          </>}
          {p.step === 4 && <><section className={layout.prescription} aria-label="추상화 처방전">
            <h4>1. 문제 상태 정의</h4><div className={layout.stateSummary}>{[["현재 상태", p.current], ["지킬 조건", p.conditions.filter(Boolean).join("\n")], ["목표 상태", p.goal]].map(([label,value], index) => <div key={label} data-tone={["rose", "amber", "violet"][index]}><strong>{label}</strong><p>{value || "아직 작성하지 않았어요"}</p></div>)}</div>
            <h4>2. 생각 다이어트 결과</h4><div className={styles.dietColumns}><section className={styles.definition} data-tone="rose"><h5>🗑 버린 노이즈</h5><div className={layout.tags}>{p.noise.filter(Boolean).map((value,index) => <span key={index}>{value}</span>)}</div>{!p.noise.some(Boolean) && <p>없음</p>}</section><section className={styles.definition} data-tone="green"><h5>🔑 남긴 핵심 요소</h5><div className={layout.tags}>{p.core.filter(Boolean).map((value,index) => <span key={index}>{value}</span>)}</div>{!p.core.some(Boolean) && <p>핵심 요소를 먼저 정리해 주세요.</p>}</section></div>
            <h4>3. 핵심 요소를 활용한 실천 알고리즘</h4>{!p.plans.length && <p className={styles.muted}>내 계획을 직접 추가하거나 닥터에게 추천받아 선택하세요.</p>}{listEditor("plans")}
          </section>
            <details className={layout.bulkEditor}><summary>실천 계획 한 번에 편집</summary>{field("해결 계획", "plans", true)}</details>
            <div className={`${styles.actions} ${layout.tools}`}>
              <Button variant="outline" onClick={() => { void navigator.clipboard.writeText(prescription).then(() => setCopied("처방전을 복사했어요."), () => setCopied("복사하지 못했어요. ‘복사용 처방전 텍스트’를 열어 내용을 선택해 주세요.")); }}>처방전 복사</Button>
              <Button variant="outline" onClick={() => window.print()}>인쇄 / PDF</Button>
              <Button variant="outline" disabled={mode === "preview" || locked || controller.actionBlocked || !basicReviewCheck(p).passed} onClick={() => void ask("abstraction-review", "처방전의 상태·조건·계획을 검토해 주세요.")}>AI 처방전 리뷰</Button>
            </div>
            <p role="status">{copied}</p>
            <details className={layout.bulkEditor}><summary>복사용 처방전 텍스트</summary><pre className={styles.prescription}>{prescription}</pre></details>
            <ReviewSubmit mode={mode} controller={controller} />
          </>}
          <div className={`${styles.actions} ${styles.wizardFooter}`}><Button variant="outline" disabled={locked || p.step === 1} onClick={() => move({ step: p.step - 1 })}>이전 단계</Button><Button disabled={locked || p.step === 4} onClick={() => move({ step: p.step + 1 })}>다음 단계 →</Button></div>
        </section>
        <aside className={`${styles.panel} ${layout.doctor}`} aria-label="추상화 닥터">
          <header className={styles.stageHeader}><span className={styles.doctorIcon} aria-hidden="true">{p.step === 4 ? "💬" : "💡"}</span><div><small className={styles.eyebrow}>{p.step}단계 전용 코치</small><h3>{p.step === 4 ? "솔루션 액션 파트너" : "추상화 닥터"}</h3>{mode === "preview" && <p>AI 추천은 실제 수업에서 사용할 수 있어요. 여기서는 직접 입력과 기본 검증을 체험해요.</p>}</div><Button variant="ghost" disabled={locked || !turns.length} onClick={() => setHistory(previous => ({ ...previous, [p.step]: [] }))}>대화 비우기</Button></header>
          <PracticeGuidance focused={practiceFocused} label="추천 사용 안내"><p className={styles.muted}>추천은 직접 골라 채택해요. 내 말로 수정해도 좋아요.</p></PracticeGuidance>
          <Button disabled={mode === "preview" || locked || controller.actionBlocked || p.step === 1 && !p.topic.trim()} onClick={() => void ask(recommendationTask, p.topic)}>{locked ? "닥터가 생각 중…" : recommendationLabel}</Button>
          {adoptionError && <p role="alert" className={styles.error}>{adoptionError}</p>}
          <div ref={conversation} role="region" tabIndex={0} aria-label="닥터 대화" className={layout.conversation} onScroll={event => { const element = event.currentTarget; followConversation.current = element.scrollHeight - element.scrollTop - element.clientHeight < 32; }}>
          <div className={styles.robotBubble}><strong>💡 닥터의 한마디</strong><p>{["고민 키워드를 적고 현재·목표 후보를 받아 보세요. 마음에 드는 카드를 선택하거나 내 말로 적어도 좋아요.", "시간·예산·관계처럼 해결 과정에서 반드시 지킬 조건을 생각해 보세요.", "목표를 이루는 데 꼭 필요한 정보와 필요 없는 정보를 구분해 보세요.", "정의한 문제에 맞춰 실천 계획을 세워 볼까요? 처방전을 보며 궁금한 점도 물어보세요."][p.step - 1]}</p></div>
          {turns.map(turn => <article key={turn.id} className={layout.turn}>
            <p className={styles.studentBubble}>{turn.input || (p.step === 2 ? "조건을 추천해 주세요." : p.step === 3 ? "생각 다이어트 단어를 추천해 주세요." : "해결 계획을 추천해 주세요.")}</p>
            {turn.pending && <p role="status" className={styles.feedback}>닥터가 생각 중이에요. 현재 입력과 이전 제안은 유지돼요.</p>}
            {turn.error && <><p role="alert" className={styles.error}>{turn.error}</p><Button variant="outline" disabled={mode === "preview" || locked || controller.actionBlocked} onClick={() => void ask(turn.task, turn.input)}>이 요청 다시 시도</Button></>}
            {turn.result && <><p role="status" className={styles.feedback}>{turn.result.message}</p>
            {turn.task === "abstraction-plan" && !!turn.result.options.length && <Button disabled={locked} variant="outline" onClick={() => adopt("plan", turn.result!.options)}>추천 계획 모두 채택</Button>}
            {p.step === 3 && !!turn.result.options.length && <Button disabled={locked} variant="outline" onClick={() => adopt("core", turn.result!.options)}>후보 단어 모두 가져오기</Button>}
            <ul className={styles.suggestions}>{turn.result.options.map((value, index) => <li key={`${index}-${value}`}>
              <p>{value}</p>
              <div className={styles.actions}>{p.step === 3 ? <>
                <Button disabled={locked} variant="outline" onClick={() => adopt("core", value)}>핵심으로 남기기</Button>
                <Button disabled={locked} variant="outline" onClick={() => adopt("noise", value)}>노이즈로 버리기</Button>
              </> : <Button disabled={locked} variant="outline" onClick={() => adopt(p.step === 1 ? "state" : p.step === 2 ? "condition" : "plan", value)}>이 제안 채택</Button>}</div>
            </li>)}</ul>
          </>}</article>)}
          </div>
          <form className={layout.chatForm} onSubmit={event => { event.preventDefault(); if (chat.trim()) void ask(p.step === 4 ? "abstraction-chat" : "abstraction-help", chat); }}>
            <div className={styles.field}><label htmlFor={`${fieldId}-doctor-${p.step}`}>{p.step === 4 ? "처방전 상담 질문" : "닥터에게 보낼 고민"}</label><textarea id={`${fieldId}-doctor-${p.step}`} maxLength={1000} value={chat} disabled={controller.busy} onChange={event => setChats(previous => ({ ...previous, [p.step]: event.target.value }))} /></div>
            <Button type="submit" variant="outline" disabled={mode === "preview" || locked || controller.actionBlocked || !chat.trim()}>{p.step === 4 ? "처방전 상담하기" : "전송"}</Button>
          </form>
          {p.step === 4 && <p className={styles.muted}>상담 내용은 서버에 보관하지 않아요. 도움받은 내용은 해결 계획에 직접 반영해 주세요.</p>}
          {remaining !== null && <p className={styles.muted}>오늘 AI 도움 {remaining}회 남음</p>}
        </aside>
      </div>
    </>}
  </div>;
}
