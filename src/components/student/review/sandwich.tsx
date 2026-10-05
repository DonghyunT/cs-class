"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { initialSandwich, replaySandwich, reviewSandwich } from "@/lib/classroom/review/sandwich-engine.mjs";
import { ReviewSubmit, useReviewAi, type ReviewController } from "./shared";
import { SandwichStage } from "./sandwich-stage";
import base from "./review.module.css";
import studio from "./studio.module.css";
const styles = { ...base, ...studio };

export function Sandwich({ controller }: { controller: ReviewController }) {
  const project = controller.draft.reviewProject, ai = useReviewAi(controller);
  const [replay, setReplay] = useState<number | null>(null);
  const commands = project?.type === "sandwich" ? project.commands : [], run = replaySandwich(commands);
  const steps = run.steps as { action: string; success: boolean; name: string; msg: string; state: ReturnType<typeof initialSandwich> }[];
  const [stepCount,setStepCount] = useState(steps.length);
  // A newly accepted command animates only its new actions; existing saved commands stay restored.
  if (stepCount !== steps.length) { setStepCount(steps.length); setReplay(steps.length > stepCount ? stepCount : null); }
  const stepTexts = commands.flatMap(command => command.actions.map(() => command.text));
  const chat = useRef<HTMLDivElement>(null);
  useEffect(() => { chat.current?.scrollTo({ top: chat.current.scrollHeight }); }, [commands.length, ai.error, ai.result]);
  useEffect(() => { if (replay === null) return; const timer = setTimeout(() => setReplay(replay >= steps.length ? null : replay + 1), 650); return () => clearTimeout(timer); }, [replay, steps.length]);
  if (project?.type !== "sandwich") return null;
  const state = replay === null ? run.state : replay === 0 ? initialSandwich() : steps[replay - 1]?.state ?? run.state;
  const step = replay === null ? steps.at(-1) : replay === 0 ? undefined : steps[replay - 1];
  const message = replay === 0 ? "명령을 처음부터 다시 실행해요." : step?.msg;
  const review = reviewSandwich(state), locked = controller.busy || controller.aiBusy || replay !== null;
  const change = (input: string) => { const draft = controller.getDraft(); if (draft.reviewProject?.type === "sandwich") controller.update({ ...draft, reviewProject: { ...draft.reviewProject, input } }); };
  function reset() { setReplay(null); ai.clear(); controller.update({ ...controller.getDraft(), reviewProject: { type: "sandwich", runId: crypto.randomUUID(), input: "", commands: [] } }); }
  const status = [
    ["식빵 봉지", state.bagOpened ? "🔓 열림" : "🔒 닫힘", state.bagOpened], ["접시 위 빵", `${state.breadOnPlate} 장`, state.breadOnPlate > 0],
    ["딸기잼 뚜껑", state.jamOpened ? "🔓 열림" : "🔒 닫힘", state.jamOpened], ["땅콩버터", state.pbOpened ? "🔓 열림" : "🔒 닫힘", state.pbOpened],
    ["치즈 비닐", state.cheeseUnwrapped ? "제거됨" : "밀봉상태", state.cheeseUnwrapped], ["칼 상태", state.knifeHolding === "none" ? "깨끗함" : state.knifeHolding === "jam" ? "딸기잼" : "땅콩버터", state.knifeHolding !== "none"],
    ["도포 상태", state.bread1Spread !== "none" || state.bread2Spread !== "none" ? "도포됨" : "아직 없음", state.bread1Spread !== "none" || state.bread2Spread !== "none"], ["완성 상태", state.completed ? "🥪 완성" : "조립 대기", state.completed],
  ];
  return <div className={styles.studio} data-practice="sandwich"><div className={styles.sandwichColumns}>
    <div className={styles.stack}><section className={styles.panel} aria-label="샌드위치 로봇의 주방">
      <header className={styles.stageHeader}><span className={styles.avatar} aria-hidden="true">🤖</span><div><small className={styles.eyebrow}>Live Visual Stage</small><h3>샌드위치 로봇의 주방</h3></div><span className={styles.badge} data-tone={!step?.success && step ? "rose" : state.completed ? "green" : "amber"}>{controller.aiBusy ? "해석 중" : replay !== null ? "다시 실행 중" : step && !step.success ? "오류 관찰" : state.completed ? "조립 완료" : "지시 대기"}</span></header>
      <div className={styles.kitchen} data-error={!!step && !step.success}><SandwichStage state={state} review={review} error={!!step && !step.success} action={replay !== null ? step?.action : undefined} /><p className={styles.caption} role="status">{message || "조리대 위에 재료들이 준비되어 있어요. 첫 명령을 내려 보세요!"}</p></div>
      <ul className={styles.statusCards} aria-label="재료와 조리 상태">{status.map(([label,value,ready]) => <li key={label as string} data-ready={ready}><span>{label as string}</span><strong>{value as string}</strong></li>)}</ul>
      <div className={styles.actions}><Button variant="outline" disabled={!steps.length || controller.aiBusy || controller.busy} onClick={() => setReplay(replay === null ? 0 : null)}>{replay === null ? "명령 다시 실행" : "다시 실행 멈추기"}</Button><Button variant="outline" disabled={!commands.length || locked} onClick={() => { ai.clear(); controller.update({ ...controller.getDraft(), reviewProject: { ...project, commands: commands.slice(0, -1) } }); }}>마지막 명령 되돌리기</Button><Button variant="outline" disabled={locked} onClick={reset}>새 레시피 만들기</Button></div>
      {state.completed && <div className={styles.recipe} role="status"><span aria-hidden="true">🥪</span><div><h3>{review.title}</h3><p>{review.review}</p></div></div>}
    </section><section className={styles.panel}><header className={styles.stageHeader}><h3>알고리즘 실행 기록</h3><small>{steps.length}개 단계 실행됨</small></header><ol className={styles.queue} aria-label="누적 알고리즘 파이프라인">{steps.map((item,index) => <li key={index} data-error={!item.success} data-active={replay === index + 1}><span>{index + 1}</span><strong>{item.success ? "✓" : "!"} {item.name}</strong><small>{stepTexts[index]}</small><small>{item.msg}</small></li>)}</ol>{!commands.length && <p className={styles.muted}>명령을 내리면 실행한 단계가 순서대로 쌓여요.</p>}</section></div>
    <section className={`${styles.panel} ${styles.console}`} aria-label="로봇에게 명령하기"><header className={styles.stageHeader}><h3>⌨ 명령어 입력 및 디버그</h3></header><div ref={chat} className={styles.chat}>
      <div className={styles.robotBubble}><strong>🤖 로봇 셰프 준비 완료</strong><p>딸기잼, 땅콩버터, 치즈를 조합해 자유롭게 샌드위치를 설계해 보세요!</p><p>💡 로봇은 말한 행동만 해요. 준비가 빠졌다면 오류를 관찰하고 다음 명령으로 고쳐 보세요.</p></div>
      {commands.map((command,index) => <div key={command.id} className={styles.chatTurn}><p className={styles.studentBubble}>{command.text}</p><div className={styles.robotBubble}><small>{command.source === "rules" ? "규칙 해석" : "AI 해석"}</small>{steps.slice(commands.slice(0,index).reduce((n,c) => n + c.actions.length,0),commands.slice(0,index + 1).reduce((n,c) => n + c.actions.length,0)).map((item,i) => <p key={i} data-error={!item.success}>{item.success ? "✓" : "❌"} {item.msg}</p>)}</div></div>)}
      {controller.aiBusy && <p role="status" className={styles.robotBubble}>🤖 명령을 해석하고 있어요…</p>}{ai.error && <p className={styles.error} role="alert">{ai.error}</p>}{ai.result && <p className={styles.robotBubble} role="status">{ai.result.message}</p>}
    </div><form className={styles.composer} onSubmit={event => { event.preventDefault(); if (!locked && project.input.trim()) void ai.ask("sandwich-command", project.input); }}>
      <label className={styles.field}>자연어 명령<textarea value={project.input} maxLength={1000} rows={2} disabled={controller.busy} onChange={event => change(event.target.value)} placeholder="예: 빵 봉지를 열어" /></label><Button type="submit" disabled={locked || !project.input.trim()}>{controller.aiBusy ? "명령을 해석하고 있어요…" : "AI로 명령 실행"}</Button>
      <p className={styles.muted}>규칙 해석은 AI를 대신하는 제한된 해석기예요. 구체적인 동작을 한 문장씩 쓰면 좋아요.</p><Button variant="outline" disabled={locked || !project.input.trim()} onClick={() => void ai.ask("sandwich-rules", project.input)}>규칙 해석으로 실행</Button>{ai.remaining !== null && <small className={styles.muted}>오늘 AI 도움 {ai.remaining}회 남음</small>}
    </form></section>
  </div><ReviewSubmit controller={controller} /></div>;
}
