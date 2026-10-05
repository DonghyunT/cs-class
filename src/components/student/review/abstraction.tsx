"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { TUT_SCENARIOS } from "@/lib/classroom/review/abstraction-data.mjs";
import { abstractionSchema, basicReviewCheck, type AbstractionProject } from "@/lib/classroom/review/project";
import { ReviewSubmit, useReviewAi, type ReviewController } from "./shared";
import base from "./review.module.css";
import studio from "./studio.module.css";
const styles = { ...base, ...studio };

export function Abstraction({ controller }: { controller: ReviewController }) {
  const project = controller.draft.reviewProject;
  const fieldId = useId();
  const ai = useReviewAi(controller), [chat, setChat] = useState(""), [copied, setCopied] = useState(""), [adoptionError, setAdoptionError] = useState("");
  const { clear } = ai, step = project?.type === "abstraction" ? project.step : null;
  const heading = useRef<HTMLHeadingElement>(null), [focus, setFocus] = useState(0);
  useEffect(() => { if (focus) heading.current?.focus(); }, [focus]);
  useEffect(() => { clear(); }, [step, clear]);
  if (project?.type !== "abstraction") return null;
  const p = project, locked = controller.busy || controller.aiBusy;
  const change = (fields: Partial<AbstractionProject>) => {
    const draft = controller.getDraft(); if (draft.reviewProject?.type === "abstraction") controller.update({ ...draft, reviewProject: { ...draft.reviewProject, ...fields } });
  };
  const move = (fields: Partial<AbstractionProject>) => { change(fields); setFocus(n => n + 1); };
  function adopt(kind: AbstractionProject["adopted"][number]["kind"], value: string) {
    const adopted = [...p.adopted.filter(item => item.value !== value || item.kind !== kind), { kind, value }].slice(-100);
    if (kind === "state") { const pair = /^현재:\s*(.+)\s*\/\s*목표:\s*(.+)$/.exec(value); if (pair) change({ current: pair[1].trim(), goal: pair[2].trim(), adopted }); }
    else {
      const field = kind === "condition" ? "conditions" : kind === "plan" ? "plans" : kind;
      const values = p[field].includes(value) ? p[field] : [...p[field], value];
      const fields = { [field]: values, ...(kind === "core" ? { noise: p.noise.filter(item => item !== value) } : kind === "noise" ? { core: p.core.filter(item => item !== value) } : {}), adopted };
      const next = { ...p, ...fields };
      if (!abstractionSchema.safeParse(next).success || new TextEncoder().encode(JSON.stringify({ ...controller.getDraft(), reviewProject: next })).length > 160000) {
        setAdoptionError("제안이 저장 한도를 넘어요. 기존 내용을 보존했어요. 필요한 항목을 정리한 뒤 다시 채택해 주세요."); return;
      }
      change(fields);
    }
    setAdoptionError("");
  }
  const field = (label: string, key: "current" | "goal" | "topic" | "conditions" | "core" | "noise" | "plans", multiline = false) => <div className={styles.field} data-tone={key === "current" || key === "noise" ? "rose" : key === "conditions" ? "amber" : key === "core" ? "green" : "violet"}>
    <label htmlFor={`${fieldId}-${key}`}>{label}</label>{multiline ? <>
      <textarea id={`${fieldId}-${key}`} maxLength={1000} value={(p[key] as string[]).join("\n")} disabled={controller.busy} onChange={event => change({ [key]: event.target.value.split("\n") })} />
      <small className={styles.muted}>직접 입력은 1,000자 이내예요. 한 줄에 한 항목씩 적어요.</small>
    </> : key === "topic" ? <input id={`${fieldId}-${key}`} maxLength={1000} value={p[key] as string} disabled={controller.busy} onChange={event => change({ [key]: event.target.value })} /> : <textarea rows={2} id={`${fieldId}-${key}`} maxLength={1000} value={p[key] as string} disabled={controller.busy} onChange={event => change({ [key]: event.target.value })} />}</div>;
  const scenario = TUT_SCENARIOS[p.tutorialScenario];
  const prescription = `[추상화 처방전]\n현재: ${p.current}\n목표: ${p.goal}\n조건: ${p.conditions.join(" / ")}\n핵심: ${p.core.join(" / ")}\n버린 노이즈: ${p.noise.join(" / ")}\n계획:\n${p.plans.map((text, i) => `${i + 1}. ${text}`).join("\n")}`;
  return <div className={styles.studio} data-practice="abstraction">
    <nav className={styles.stepNav} aria-label="추상화 활동">
      <button disabled={locked} aria-pressed={p.view === "tutorial"} onClick={() => move({ view: "tutorial" })}>30초 맛보기</button>
      <button disabled={locked} aria-pressed={p.view === "workbook"} onClick={() => move({ view: "workbook" })}>실전 워크북</button>
    </nav>
    {p.view === "tutorial" ? <div className={styles.columns}><section className={`${styles.panel} ${styles.workbook}`}>
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
    </section><aside className={styles.panel} aria-label="맛보기 튜토리얼 코치"><header className={styles.stageHeader}><span className={styles.avatar} aria-hidden="true">🎓</span><div><small className={styles.eyebrow}>Tutorial Coach</small><h3>맛보기 튜토리얼 코치</h3></div></header><p className={styles.feedback}>일상의 고민으로 추상화를 연습해 볼까요? 상황 카드를 골라 왼쪽에서 현재·목표·조건·핵심을 살펴보세요.</p><div className={styles.scenarioCards}>{Object.values(TUT_SCENARIOS).map(item => <button key={item.id} className={styles.scenarioCard} disabled={locked} aria-pressed={p.tutorialScenario === item.id} onClick={() => change({ tutorialScenario: item.id as AbstractionProject["tutorialScenario"], tutorialNoise: [] })}><span aria-hidden="true">{item.icon}</span><strong>{item.name}</strong><small>{item.current}</small></button>)}</div><p className={styles.muted}>맛보기를 마치지 않아도 실전 워크북을 열 수 있어요.</p></aside></div> : <>
      <nav className={styles.stepNav} aria-label="워크북 단계">{["상태", "조건", "생각 다이어트", "처방전"].map((name, index) => <button key={name} disabled={locked} aria-pressed={p.step === index + 1} onClick={() => move({ step: index + 1 })}>{index + 1}. {name}</button>)}</nav>
      <div className={styles.columns}>
        <section className={`${styles.panel} ${styles.workbook}`}>
          <span className={styles.badge}>💡 Step {p.step}/4 · 나의 문제 해결 워크북</span>
          <h3 ref={heading} tabIndex={-1}>{["현재와 목표를 정의하기", "지킬 조건 찾기", "핵심과 노이즈 구분하기", "나의 추상화 처방전"][p.step - 1]}</h3>
          {p.step === 1 && <><div className={styles.categoryCards}>{[["📚", "학습·공부계획"], ["💌", "연애·친구"], ["🏫", "학교·행사"], ["🏠", "일상·습관"]].map(([icon,name]) => <button key={name} disabled={locked} onClick={() => change({ topic: name })}><span aria-hidden="true">{icon}</span>{name}</button>)}</div>{field("고민 키워드", "topic")}{field("현재 상태", "current")}{field("목표 상태", "goal")}<p className={styles.muted}>지금 어떤 상태인가요? 해결 뒤 어떤 상태에 도달하고 싶은가요?</p>
          </>}
          {p.step === 2 && <>{field("지킬 조건", "conditions", true)}<p className={styles.muted}>시간·안전·관계처럼 반드시 지켜야 하는 기준을 한 줄씩 적어요.</p>
          </>}
          {p.step === 3 && <><p className={styles.feedback}>🧠 생각 다이어트! 문제 해결에 꼭 필요한 정보는 남기고, 군더더기는 버려 보세요.</p><div className={styles.dietColumns}><section className={styles.definition} data-tone="green" aria-label="남길 핵심"><h4>🔑 남길 핵심</h4>{field("핵심 요소", "core", true)}<div className={styles.tags}>{p.core.filter(Boolean).map((value,i) => <button key={i} disabled={locked} title="노이즈로 옮기기" onClick={() => adopt("noise",value)}>🔑 {value}</button>)}</div></section><section className={styles.definition} data-tone="rose" aria-label="버릴 노이즈"><h4>🗑 버릴 노이즈</h4>{field("버릴 노이즈", "noise", true)}<div className={styles.tags}>{p.noise.filter(Boolean).map((value,i) => <button key={i} disabled={locked} title="핵심으로 되돌리기" onClick={() => adopt("core",value)}>🗑 {value}</button>)}</div></section></div><p className={styles.muted}>단어를 누르면 다른 상자로 옮겨요. 추천 단어를 채택하거나 직접 작성할 수 있어요.</p>
          </>}
          {p.step === 4 && <>{field("해결 계획", "plans", true)}<pre className={styles.prescription}>{prescription}</pre>
            <div className={styles.actions}>
              <Button variant="outline" onClick={() => { void navigator.clipboard.writeText(prescription).then(() => setCopied("처방전을 복사했어요."), () => setCopied("복사하지 못했어요. 처방전 내용을 선택해 복사해 주세요.")); }}>처방전 복사</Button>
              <Button variant="outline" disabled={locked || !basicReviewCheck(p).passed} onClick={() => void ai.ask("abstraction-review", "처방전의 상태·조건·계획을 검토해 주세요.")}>AI 처방전 리뷰</Button>
            </div>
            <p role="status">{copied}</p>
            <ReviewSubmit controller={controller} />
          </>}
          <div className={`${styles.actions} ${styles.wizardFooter}`}><Button variant="outline" disabled={locked || p.step === 1} onClick={() => move({ step: p.step - 1 })}>이전 단계</Button><Button disabled={locked || p.step === 4} onClick={() => move({ step: p.step + 1 })}>다음 단계 →</Button></div>
        </section>
        <aside className={styles.panel} aria-label="추상화 닥터">
          <header className={styles.stageHeader}><span className={styles.doctorIcon} aria-hidden="true">💡</span><div><small className={styles.eyebrow}>{p.step}단계 전용 코치</small><h3>추상화 닥터</h3></div></header>
          <p className={styles.muted}>추천은 직접 골라 채택해요. 내 말로 수정해도 좋아요.</p>
          <Button disabled={locked || p.step === 1 && !p.topic.trim()} onClick={() => void ai.ask(p.step === 4 ? "abstraction-plan" : "abstraction-help", p.topic)}>{locked ? "닥터가 생각 중…" : p.step === 1 ? "현재·목표 후보 받기" : p.step === 2 ? "조건 추천 받기" : p.step === 3 ? "생각 다이어트 단어 받기" : "해결 계획 추천 받기"}</Button>
          {!ai.result && !controller.aiBusy && <div className={styles.robotBubble}><strong>💡 닥터의 한마디</strong><p>{["고민 키워드를 적고 현재·목표 후보를 받아 보세요. 마음에 드는 카드를 선택하거나 내 말로 적어도 좋아요.", "시간·예산·관계처럼 해결 과정에서 반드시 지킬 조건을 생각해 보세요.", "목표를 이루는 데 꼭 필요한 정보와 필요 없는 정보를 구분해 보세요.", "정의한 문제에 맞춰 실천 계획을 세워 볼까요? 처방전을 검토하고 상담할 수 있어요."][p.step - 1]}</p></div>}
          {adoptionError && <p role="alert" className={styles.error}>{adoptionError}</p>}{ai.error && <p role="alert" className={styles.error}>{ai.error}</p>}{ai.result && <>
            <p role="status" className={styles.feedback}>{ai.result.message}</p>
            <ul className={styles.suggestions}>{ai.result.options.map((value, index) => <li key={`${index}-${value}`}>
              <p>{value}</p>
              <div className={styles.actions}>{p.step === 3 ? <>
                <Button disabled={locked} variant="outline" onClick={() => adopt("core", value)}>핵심으로 남기기</Button>
                <Button disabled={locked} variant="outline" onClick={() => adopt("noise", value)}>노이즈로 버리기</Button>
              </> : <Button disabled={locked} variant="outline" onClick={() => adopt(p.step === 1 ? "state" : p.step === 2 ? "condition" : "plan", value)}>이 제안 채택</Button>}</div>
            </li>)}</ul>
          </>}
          {p.step === 4 && <>
            <label className={styles.field}>처방전 상담 질문<textarea maxLength={1000} value={chat} onChange={event => setChat(event.target.value)} />
            </label>
            <Button variant="outline" disabled={locked || !chat.trim()} onClick={() => void ai.ask("abstraction-chat", chat)}>처방전 상담하기</Button>
            <p className={styles.muted}>상담 내용은 서버에 보관하지 않아요. 도움받은 내용은 해결 계획에 직접 반영해 주세요.</p>
          </>}
          {ai.remaining !== null && <p className={styles.muted}>오늘 AI 도움 {ai.remaining}회 남음</p>}
        </aside>
      </div>
    </>}
  </div>;
}
