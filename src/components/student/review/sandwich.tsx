"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { initialSandwich, replaySandwich, reviewSandwich } from "@/lib/classroom/review/sandwich-engine.mjs";
import { ReviewSubmit, useReviewAi, type ReviewController } from "./shared";
import { SandwichStage } from "./sandwich-stage";
import base from "./review.module.css";
import studio from "./studio.module.css";
const styles = { ...base, ...studio };
type LocalReply = { id: string; text: string; source: string; message: string; failed: boolean; after: number };

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
  const followChat = useRef(true);
  const [request, setRequest] = useState<{ text: string; source: string; after: number } | null>(null);
  const [replies, setReplies] = useState<LocalReply[]>([]);
  // 이전 대화를 읽는 동안에는 새 응답이 와도 읽던 위치를 유지한다.
  useEffect(() => { if (followChat.current) chat.current?.scrollTo({ top: chat.current.scrollHeight }); }, [commands.length, controller.aiBusy, ai.error, ai.result]);
  useEffect(() => { if (replay === null) return; const timer = setTimeout(() => setReplay(replay >= steps.length ? null : replay + 1), 650); return () => clearTimeout(timer); }, [replay, steps.length]);
  if (project?.type !== "sandwich") return null;
  const state = replay === null ? run.state : replay === 0 ? initialSandwich() : steps[replay - 1]?.state ?? run.state;
  const step = replay === null ? steps.at(-1) : replay === 0 ? undefined : steps[replay - 1];
  const message = replay === 0 ? "명령을 처음부터 다시 실행해요." : step?.msg;
  const review = reviewSandwich(state), locked = controller.busy || controller.aiBusy || replay !== null;
  const change = (input: string) => { const draft = controller.getDraft(); if (draft.reviewProject?.type === "sandwich") controller.update({ ...draft, reviewProject: { ...draft.reviewProject, input } }); };
  const ask = (task: "sandwich-command" | "sandwich-rules") => {
    // 실행이 없는 확인 질문·연결 실패는 다음 요청이 시작돼도 대화에 남긴다.
    if (request && (ai.error || ai.result && !ai.result.actions.length)) setReplies(previous => [...previous, { ...request, id: crypto.randomUUID(), message: ai.error || ai.result!.message, failed: !!ai.error }]);
    setRequest({ text: project.input, source: task === "sandwich-rules" ? "규칙 해석" : "AI 해석", after: commands.length });
    void ai.ask(task, project.input);
  };
  function reset() { setReplay(null); ai.clear(); setReplies([]); setRequest(null); followChat.current = true; controller.update({ ...controller.getDraft(), reviewProject: { type: "sandwich", runId: crypto.randomUUID(), input: "", commands: [] } }); }
  const repliesAfter = (after: number) => replies.filter(reply => reply.after === after).map(reply => <div key={reply.id} className={styles.chatTurn}>
    <div className={styles.studentBubble}><small>나의 명령</small><p>{reply.text}</p></div>
    <div className={styles.robotBubble} data-error={reply.failed}><small>🤖 샌드위치 로봇 · {reply.source}</small><p>{reply.message}</p></div>
  </div>);
  const actionOffsets = [0];
  for (const command of commands) actionOffsets.push(actionOffsets.at(-1)! + command.actions.length);
  const turns = commands.map((command, index) => {
    const commandSteps = steps.slice(actionOffsets[index], actionOffsets[index + 1]);
    return <Fragment key={command.id}><div data-command-id={command.id} className={styles.chatTurn}>
      <div className={styles.studentBubble}><small>나의 명령</small><p>{command.text}</p></div>
      <div className={styles.robotBubble} data-error={commandSteps.some(item => !item.success)}><small>🤖 샌드위치 로봇 · {command.source === "rules" ? "규칙 해석" : "AI 해석"}</small>{commandSteps.map((item, i) => <p key={i} data-error={!item.success}>{item.success ? "✓" : "!"} {item.msg}</p>)}{index === commands.length - 1 && ai.result?.actions.length ? <p role="status">{ai.result.message}</p> : null}</div>
    </div>{repliesAfter(index + 1)}</Fragment>;
  });
  const status = [
    ["식빵 봉지", state.bagOpened ? "🔓 열림" : "🔒 닫힘", state.bagOpened], ["접시 위 빵", `${state.breadOnPlate} 장`, state.breadOnPlate > 0],
    ["딸기잼 뚜껑", state.jamOpened ? "🔓 열림" : "🔒 닫힘", state.jamOpened], ["땅콩버터", state.pbOpened ? "🔓 열림" : "🔒 닫힘", state.pbOpened],
    ["치즈 비닐", state.cheeseUnwrapped ? "제거됨" : "밀봉상태", state.cheeseUnwrapped], ["칼 상태", state.knifeHolding === "none" ? "깨끗함" : state.knifeHolding === "jam" ? "딸기잼" : "땅콩버터", state.knifeHolding !== "none"],
    ["도포 상태", state.bread1Spread !== "none" || state.bread2Spread !== "none" ? "도포됨" : "아직 없음", state.bread1Spread !== "none" || state.bread2Spread !== "none"], ["완성 상태", state.completed ? "🥪 완성" : "조립 대기", state.completed],
  ];
  return <div className={styles.studio} data-practice="sandwich"><div className={styles.sandwichColumns}>
    <section className={styles.panel} aria-label="샌드위치 로봇의 주방">
      <header className={styles.stageHeader}><span className={styles.avatar} aria-hidden="true">🤖</span><div><small className={styles.eyebrow}>Live Visual Stage</small><h3>샌드위치 로봇의 주방</h3></div><span className={styles.badge} data-tone={!step?.success && step ? "rose" : state.completed ? "green" : "amber"}>{controller.aiBusy ? "해석 중" : replay !== null ? "다시 실행 중" : step && !step.success ? "오류 관찰" : state.completed ? "조립 완료" : "지시 대기"}</span></header>
      <div className={styles.kitchen} data-error={!!step && !step.success}><SandwichStage state={state} review={review} error={!!step && !step.success} action={replay !== null ? step?.action : undefined} /><p className={styles.caption} role="status">{message || "조리대 위에 재료들이 준비되어 있어요. 첫 명령을 내려 보세요!"}</p></div>
      <ul className={styles.statusCards} aria-label="재료와 조리 상태">{status.map(([label,value,ready]) => <li key={label as string} data-ready={ready}><span>{label as string}</span><strong>{value as string}</strong></li>)}</ul>
      {state.completed && <div className={styles.recipe} role="status"><span aria-hidden="true">🥪</span><div><h3>{review.title}</h3><p>{review.review}</p></div></div>}
    </section>
    <section className={`${styles.panel} ${styles.console}`} aria-label="로봇에게 명령하기" data-empty={!commands.length}>
      <header className={styles.stageHeader}><span className={styles.chatAvatar} aria-hidden="true">🤖</span><div><h3>로봇에게 명령하기</h3></div></header>
      <div ref={chat} className={styles.chat} role="region" tabIndex={0} aria-label="로봇과의 대화" onScroll={event => { const element = event.currentTarget; followChat.current = element.scrollHeight - element.scrollTop - element.clientHeight < 32; }}>
        <div className={styles.robotBubble}><small>🤖 샌드위치 로봇</small><p>재료 준비가 끝났어요! 첫 명령은 ‘빵 봉지를 열어’로 시작해 보세요. 결과를 보고 다음 명령을 내려 주세요.</p></div>
        {repliesAfter(0)}
        {commands.length > 1 && <section className={styles.chatHistory} aria-label="이전 명령 기록">{turns.slice(0, -1)}</section>}
        <section className={styles.latestResult} aria-label="최신 명령 결과">
          {turns.at(-1)}
          {(controller.aiBusy && (!request || commands.length <= request.after) || ai.error || ai.result && !ai.result.actions.length) && <div className={styles.chatTurn}>
            {request && <div className={styles.studentBubble}><small>나의 명령</small><p>{request.text}</p></div>}
            <div className={styles.robotBubble} data-error={!!ai.error}><small>🤖 샌드위치 로봇{request && ` · ${request.source}`}</small>{controller.aiBusy && <p role="status">명령을 해석하고 있어요. 다음 입력을 작성해도 유지돼요.</p>}{ai.error && <p role="alert">{ai.error}</p>}{!controller.aiBusy && !ai.error && ai.result && <p role="status">{ai.result.message}</p>}</div>
          </div>}
        </section>
      </div>
      <form className={styles.composer} onSubmit={event => { event.preventDefault(); if (!locked && project.input.trim()) ask("sandwich-command"); }}>
        <label htmlFor="sandwich-command-input">자연어 명령</label>
        <div className={styles.commandRow}><textarea id="sandwich-command-input" value={project.input} maxLength={1000} rows={2} disabled={controller.busy} onChange={event => change(event.target.value)} placeholder="예: 빵 봉지를 열어" /><Button type="submit" disabled={locked || !project.input.trim()}>{controller.aiBusy ? "명령을 해석하고 있어요…" : "AI로 명령 실행"}</Button></div>
        <div className={styles.commandTools}><Button variant="outline" disabled={locked || !project.input.trim()} onClick={() => ask("sandwich-rules")}>규칙 해석으로 실행</Button><details className={styles.commandHelp}><summary>실행 안내</summary><p className={styles.muted}>구체적인 동작을 한 문장씩 쓰면 좋아요. 규칙 해석은 AI를 대신하는 제한된 해석기예요.</p></details></div>
        {ai.remaining !== null && <small className={styles.muted}>오늘 AI 도움 {ai.remaining}회 남음</small>}
      </form>
    </section>
    <section className={`${styles.panel} ${styles.executionPanel}`}><header className={styles.stageHeader}><h3>알고리즘 실행 기록</h3><small>{steps.length}개 단계 실행됨</small></header><div className={styles.actions}><Button variant="outline" disabled={!steps.length || controller.aiBusy || controller.busy} onClick={() => setReplay(replay === null ? 0 : null)}>{replay === null ? "명령 다시 실행" : "다시 실행 멈추기"}</Button><Button variant="outline" disabled={!commands.length || locked} onClick={() => { ai.clear(); setRequest(null); setReplies(previous => previous.filter(reply => reply.after < commands.length)); controller.update({ ...controller.getDraft(), reviewProject: { ...project, commands: commands.slice(0, -1) } }); }}>마지막 명령 되돌리기</Button><Button variant="outline" disabled={locked} onClick={reset}>새 레시피 만들기</Button></div><ol className={styles.queue} aria-label="누적 알고리즘 파이프라인">{steps.map((item,index) => <li key={index} data-error={!item.success} data-active={replay === index + 1}><span>{index + 1}</span><strong>{item.success ? "✓" : "!"} {item.name}</strong><small>{stepTexts[index]}</small><small>{item.msg}</small></li>)}</ol>{!commands.length && <p className={styles.muted}>명령을 내리면 실행한 단계가 순서대로 쌓여요.</p>}</section>
  </div><ReviewSubmit controller={controller} /></div>;
}
