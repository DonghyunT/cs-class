"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { initialSandwich, replaySandwich } from "@/lib/classroom/review/sandwich-engine.mjs";
import { ReviewSubmit, useReviewAi, type ReviewController } from "./shared";
import styles from "./review.module.css";

export function Sandwich({ controller }: { controller: ReviewController }) {
  const project = controller.draft.reviewProject;
  const [replay, setReplay] = useState<number | null>(null);
  const ai = useReviewAi(controller);
  const commands = project?.type === "sandwich" ? project.commands : [], run = replaySandwich(commands), steps = run.steps;
  useEffect(() => { if (replay === null) return; const timer = setTimeout(() => setReplay(replay >= steps.length ? null : replay + 1), 650); return () => clearTimeout(timer); }, [replay, steps.length]);
  if (project?.type !== "sandwich") return null;
  const state = replay === null ? run.state : replay === 0 ? initialSandwich() : steps[replay - 1]?.state ?? run.state;
  const message = replay === null ? steps.at(-1)?.msg : replay === 0 ? "명령을 처음부터 다시 실행해요." : steps[replay - 1]?.msg;
  const change = (input: string) => controller.update({ ...controller.getDraft(), reviewProject: { ...project, input } });
  function reset() { setReplay(null); controller.update({ ...controller.getDraft(), reviewProject: { type: "sandwich", runId: crypto.randomUUID(), input: "", commands: [] } }); }
  return <div className={styles.columns}>
    <section className={styles.panel}><h3>샌드위치 로봇의 주방</h3><p className={styles.muted}>로봇은 말한 행동만 해요. 준비가 빠졌다면 오류를 관찰하고 다음 명령으로 고쳐 보세요.</p>
      <div className={styles.stage}><svg viewBox="0 0 460 320" role="img" aria-label={`접시에 빵 ${state.breadOnPlate}장. ${state.completed ? run.review.title : "아직 조립 중"}`}>
        <ellipse cx="230" cy="240" rx="195" ry="55" fill="#e2e8f0"/><rect x="25" y="35" width="65" height="85" rx="12" fill={state.bagOpened ? "#fef3c7" : "#94a3b8"}/><text x="32" y="140" fontSize="13" fill="currentColor">빵 봉지 {state.bagOpened ? "열림" : "닫힘"}</text>
        <rect x="128" y="35" width="65" height="65" rx="12" fill="#e11d48"/><text x="128" y="125" fontSize="13" fill="currentColor">잼 {state.jamOpened ? "열림" : "닫힘"}</text>
        <rect x="240" y="35" width="65" height="65" rx="12" fill="#b45309"/><text x="229" y="125" fontSize="13" fill="currentColor">버터 {state.pbOpened ? "열림" : "닫힘"}</text>
        <rect x="350" y="35" width="65" height="65" rx="5" fill="#facc15" stroke={state.cheeseUnwrapped ? "transparent" : "#94a3b8"} strokeWidth="7"/><text x="340" y="125" fontSize="13" fill="currentColor">치즈 {state.cheeseUnwrapped ? "포장 제거" : "포장 있음"}</text>
        {[1, 2].map(number => <g key={number} opacity={state.breadOnPlate >= number ? 1 : 0.12} transform={`translate(${state.completed && number === 2 ? 151 : number === 1 ? 85 : 260},${state.completed && number === 2 ? 172 : 177})`}>
          <rect width="115" height="78" rx="16" fill="#ffedc7" stroke="#b77939" strokeWidth="6"/>
          {(number === 1 ? state.bread1Spread : state.bread2Spread) !== "none" && <rect x="10" y="10" width="95" height="58" rx="10" fill={(number === 1 ? state.bread1Spread : state.bread2Spread).startsWith("jam") ? "#e85c82" : "#b98147"} opacity={(number === 1 ? state.bread1Spread : state.bread2Spread).endsWith("edge") ? 0.3 : 0.9}/>}
          {state.cheeseOnBread === number && <rect x="17" y="17" width="81" height="44" fill="#facc15" stroke={state.cheesePlasticIncluded ? "#94a3b8" : "transparent"} strokeWidth="6"/>}
          {!state.completed && <text x="40" y="105" fontSize="14" fill="currentColor">식빵 {number}</text>}
        </g>)}
        <text x="105" y="310" fontSize="14" fill="currentColor">칼: {state.knifeHolding === "none" ? "깨끗함" : state.knifeHolding === "jam" ? "딸기잼" : "땅콩버터"}</text>
      </svg></div>
      <dl className={styles.ingredients}>{[["빵 봉지", state.bagOpened ? "열림" : "닫힘"], ["딸기잼", state.jamOpened ? "열림" : "닫힘"], ["땅콩버터", state.pbOpened ? "열림" : "닫힘"], ["치즈 포장", state.cheeseUnwrapped ? "제거함" : "남아 있음"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <p className={styles.feedback} role="status">{message || "어떤 재료로 샌드위치를 만들까요? 첫 명령을 내려 보세요."}</p>
      {state.completed && <div className={styles.notice}><strong>{run.review.title}</strong><p>{run.review.review}</p></div>}
      <div className={styles.actions}><Button variant="outline" disabled={!steps.length || controller.aiBusy} onClick={() => setReplay(replay === null ? 0 : null)}>{replay === null ? "명령 다시 실행" : "다시 실행 멈추기"}</Button><Button variant="outline" disabled={!commands.length || controller.busy || controller.aiBusy} onClick={() => controller.update({ ...controller.getDraft(), reviewProject: { ...project, commands: commands.slice(0, -1) } })}>마지막 명령 되돌리기</Button><Button variant="outline" disabled={controller.busy || controller.aiBusy} onClick={reset}>새 레시피 만들기</Button></div>
    </section>
    <section className={styles.panel}><h3>로봇에게 명령하기</h3><label className={styles.field}>자연어 명령<textarea value={project.input} maxLength={1000} disabled={controller.busy} onChange={event => change(event.target.value)} placeholder="예: 빵 봉지를 열어" /></label><div className={styles.actions}><Button disabled={controller.busy || controller.aiBusy || !project.input.trim()} onClick={() => void ai.ask("sandwich-command", project.input)}>{controller.aiBusy ? "명령을 해석하고 있어요…" : "AI로 명령 실행"}</Button><Button variant="outline" disabled={controller.busy || controller.aiBusy || !project.input.trim()} onClick={() => void ai.ask("sandwich-rules", project.input)}>규칙 해석으로 실행</Button></div><p className={styles.muted}>규칙 해석은 AI를 대신하는 제한된 해석기예요. 구체적인 동작을 한 문장씩 쓰면 좋아요.</p>{ai.error && <p className={styles.error} role="alert">{ai.error}</p>}{ai.result && <p className={styles.feedback} role="status">{ai.result.message}</p>}{ai.remaining !== null && <p className={styles.muted}>오늘 AI 도움 {ai.remaining}회 남음</p>}
      <h3>알고리즘 실행 기록</h3><ol className={styles.log}>{commands.map(command => <li key={command.id}><strong>{command.text}</strong><small>{command.source === "rules" ? "규칙 해석" : "AI 해석"}</small>{command.actions.map((action, i) => { const index = commands.slice(0, commands.indexOf(command)).reduce((sum, c) => sum + c.actions.length, 0) + i, step = steps[index]; return <small key={i}>{step.success ? "✓" : "!"} {step.name} · {step.msg}</small>; })}</li>)}</ol>{!commands.length && <p className={styles.muted}>실행한 명령이 여기에 남아요.</p>}
      <ReviewSubmit controller={controller} />
    </section>
  </div>;
}
