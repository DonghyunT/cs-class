"use client";

import Link from "next/link";
import { useEffect, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, ArrowDown, ArrowUp, BookOpen, Check, CheckCircle2, CloudCheck, Layers3, Lightbulb, LoaderCircle, RotateCcw, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { classroomApi } from "@/lib/classroom/client";
import { progressFor } from "@/lib/classroom/progress";
import type { Lesson, Question, Stage, StudentDashboard, Work, WorkAction, WorkDraft } from "@/lib/classroom/types";
import { LearningStatus, ProgressSummary } from "./progress-summary";
import { EntryPracticeWorkspace } from "./entry-practice-workspace";
import { useWork } from "./use-work";
import styles from "./student.module.css";

const stages = [{ id: "concept", label: "개념", icon: BookOpen }, { id: "quiz", label: "퀴즈", icon: CheckCircle2 }, { id: "practice", label: "실습", icon: Layers3 }] as const;
const timeLabel = (time: number) => new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(time);

function AnswerChoices({ question, answer, disabled, onChange }: { question: Question; answer?: string; disabled: boolean; onChange: (answer: string) => void }) {
  return <fieldset className={styles.answers} disabled={disabled}><legend>{question.prompt}</legend>
    {question.options.map((option) => <label key={option.id} className={answer === option.id ? styles.selectedAnswer : ""}>
      <input type="radio" name={`answer-${question.id}`} value={option.id} checked={answer === option.id} onChange={() => onChange(option.id)} />
      <span>{option.label}</span>
    </label>)}
  </fieldset>;
}

function Hint({ hint }: { hint: string }) {
  return <details className={styles.hint}><summary><Lightbulb size={16} aria-hidden="true" />힌트 보기</summary><p>{hint}</p></details>;
}

export function LessonWorkspace({ lesson, uid }: { lesson: Lesson; uid: string }) {
  const [initial, setInitial] = useState<Work | null>(null);
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void classroomApi.work(lesson.id).then((work) => { if (!cancelled) { setInitial(work); setError(""); } }).catch((problem) => { if (!cancelled) setError(problem instanceof Error ? problem.message : "수업을 불러오지 못했어요."); });
    return () => { cancelled = true; };
  }, [attempt, lesson.id]);
  useEffect(() => {
    let cancelled = false;
    let fetching = false;
    const refresh = async () => {
      if (fetching || document.visibilityState !== "visible") return;
      fetching = true;
      try { const value = await classroomApi.student(); if (!cancelled) setDashboard(value); }
      catch { /* Work requests show actionable errors; a failed announcement refresh does not replace an editor. */ }
      finally { fetching = false; }
    };
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 30_000);
    const focused = () => { void refresh(); };
    window.addEventListener("focus", focused);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener("focus", focused); };
  }, []);
  if (!initial) return <div className={styles.workspace}><Link href="/student" className={styles.back}><ArrowLeft size={17} />대시보드로</Link>{error ? <div className={styles.empty} role="alert"><h1>수업에 들어가지 못했어요.</h1><p>{error}</p><Button onClick={() => setAttempt((value) => value + 1)}>다시 불러오기</Button></div> : <div className={styles.loading} role="status"><BookOpen />저장된 학습을 불러오고 있어요.</div>}</div>;
  const otherCurrent = dashboard?.lessons.find((item) => item.id === dashboard.classroom.currentLessonId && item.id !== lesson.id);
  return <WorkEditor lesson={lesson} initial={initial} uid={uid} otherCurrent={otherCurrent} />;
}

function DraftComparison({ lesson, draft }: { lesson: Lesson; draft: WorkDraft }) {
  const label = (question: Question, answer?: string) => question.options.find((option) => option.id === answer)?.label ?? "미응답";
  return <ul className={styles.comparisonList}>
    <li><strong>이어갈 단계</strong>{stages.find((stage) => stage.id === draft.stage)?.label}</li>
    {lesson.concepts.map((concept, i) => <li key={concept.id}><strong>개념 {i + 1}</strong>{label(concept.question, draft.conceptAnswers[concept.id])}</li>)}
    {lesson.quiz.map((question, i) => <li key={question.id}><strong>퀴즈 {i + 1}</strong>{label(question, draft.quizAnswers[question.id])}</li>)}
    <li><strong>{lesson.practice.type === "entryjs" ? "엔트리 블록" : "실습 순서"}</strong>{lesson.practice.type === "entryjs" ? `${draft.practiceOrder.length}개 블록 조립됨` : draft.practiceOrder.map((id) => lesson.practice.blocks.find((block) => block.id === id)?.label).filter(Boolean).join(" → ")}</li>
  </ul>;
}

function WorkEditor({ lesson, initial, uid, otherCurrent }: { lesson: Lesson; initial: Work; uid: string; otherCurrent?: Lesson }) {
  const controller = useWork(initial, uid);
  const { work, draft, busy, update, perform, saveState, error } = controller;
  const progress = progressFor(lesson, work);
  const [moveMessage, setMoveMessage] = useState("");
  const [switching, setSwitching] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{ id: string; preventScroll?: boolean } | null>(null);
  useEffect(() => {
    // Focus after React commits the new feedback or enabled controls, not on the next animation frame.
    if (focusRequest) document.getElementById(focusRequest.id)?.focus({ preventScroll: focusRequest.preventScroll });
  }, [focusRequest]);
  const locked = busy || switching;
  const draftMatchesValidation = work.validation?.passed && JSON.stringify(work.validation.order) === JSON.stringify(draft.practiceOrder);
  const draftMatchesSubmission = work.submission && JSON.stringify(work.submission.order) === JSON.stringify(draft.practiceOrder);
  const quizQuestions = work.quizRoundIds.map((id) => lesson.quiz.find((question) => question.id === id)).filter((question): question is Question => !!question);
  const unanswered = quizQuestions.filter((question) => !draft.quizAnswers[question.id]).length;
  const quizComplete = progress.quiz.percent === 100;
  async function switchStage(stage: Stage, focusTab = false) {
    if (switching || busy) return;
    setSwitching(true);
    try { if (await controller.switchStage(stage)) setFocusRequest({ id: focusTab ? `tab-${stage}` : `stage-heading-${stage}` }); }
    finally { setSwitching(false); }
  }
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % stages.length;
    else if (event.key === "ArrowLeft") next = (index + stages.length - 1) % stages.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = stages.length - 1;
    else return;
    event.preventDefault(); void switchStage(stages[next].id, true);
  }
  async function runAction(action: WorkAction, focusId: string) {
    if (await perform(action)) setFocusRequest({ id: focusId });
  }
  function moveBlock(id: string, delta: number) {
    const index = draft.practiceOrder.indexOf(id);
    const destination = index + delta;
    if (destination < 0 || destination >= draft.practiceOrder.length) return;
    const order = [...draft.practiceOrder]; [order[index], order[destination]] = [order[destination], order[index]];
    update({ ...draft, practiceOrder: order });
    setMoveMessage(`${lesson.practice.blocks.find((block) => block.id === id)?.label}, ${destination + 1}번째로 이동했어요.`);
    const direction = destination === 0 ? "down" : destination === order.length - 1 ? "up" : delta < 0 ? "up" : "down";
    setFocusRequest({ id: `move-${id}-${direction}`, preventScroll: true });
  }
  return <div className={styles.workspace}>
    <div className={styles.workspaceTop}><Link href="/student" className={styles.back}><ArrowLeft size={17} />대시보드로</Link>
      <span className={styles.saveState} role="status">{saveState === "saving" ? <LoaderCircle size={16} className={styles.spin} /> : saveState === "saved" ? <CloudCheck size={17} /> : <Save size={16} />}{saveState === "saved" ? work.updatedAt ? "저장 완료" : "아직 학습 기록이 없어요" : saveState === "saving" ? "저장 중…" : saveState === "failed" ? "저장 확인 필요" : "변경 내용 저장 대기"}</span>
    </div>
    {otherCurrent && <div className={styles.notice} role="status"><div><strong>선생님이 지정한 이번 수업은 ‘{otherCurrent.title}’이에요.</strong><p>하던 학습을 계속하거나 저장한 뒤 이동할 수 있어요.</p></div><Button variant="outline" nativeButton={false} render={<Link href={`/classroom/${otherCurrent.id}`} />}>이번 수업으로<ArrowRight size={16} /></Button></div>}
    <header className={styles.lessonHeader}><div><span className={styles.eyebrow}>{lesson.category ?? "알고리즘 · 순차 구조"}</span><h1>{lesson.title}</h1><p>{lesson.description}</p></div><LearningStatus lesson={lesson} work={work} /></header>
    <div className={styles.lessonProgress}><ProgressSummary lesson={lesson} work={{ ...work, validation: draftMatchesValidation ? work.validation : null }} /></div>
    {error && <section className={styles.errorPanel} role="alert"><strong>{controller.conflict ? "저장 기록이 서로 달라요." : "요청을 완료하지 못했어요."}</strong><p>{error}</p><p>현재 입력은 이 화면에 유지하고 있어요. 확인 전에는 창을 닫지 마세요.</p><Button variant="outline" disabled={busy} onClick={() => void (controller.conflict ? controller.compare() : controller.retry())}>{controller.conflict ? "서버 기록과 비교" : "저장 다시 확인"}</Button></section>}
    {controller.remote && <section className={styles.conflictPanel} aria-label="저장 충돌 비교"><h2>어떤 입력으로 이어갈까요?</h2><p>서버의 완료·제출 기록은 유지돼요. 입력 내용은 아래에서 직접 선택하세요.</p><div className={styles.comparisonGrid}><div><h3>이 화면의 입력</h3><DraftComparison lesson={lesson} draft={draft} /></div><div><h3>서버에 저장된 입력</h3><DraftComparison lesson={lesson} draft={controller.remote.draft} /></div></div><div className={styles.actions}><Button disabled={busy} onClick={() => void controller.resolve(true)}>현재 입력을 새 버전으로 저장</Button><Button variant="outline" disabled={busy} onClick={() => void controller.resolve(false)}>서버 기록으로 이어하기</Button></div></section>}
    <div className={styles.tabs} role="tablist" aria-label="수업 단계">{stages.map((stage, index) => <button key={stage.id} id={`tab-${stage.id}`} type="button" role="tab" aria-selected={draft.stage === stage.id} aria-controls={`panel-${stage.id}`} tabIndex={draft.stage === stage.id ? 0 : -1} disabled={locked} onKeyDown={(event) => tabKey(event, index)} onClick={() => void switchStage(stage.id, true)}><stage.icon size={18} /><span>{stage.label}</span><span className={styles.tabPercent}>{progress[stage.id].percent}%</span></button>)}</div>

    {draft.stage === "concept" && <section id="panel-concept" role="tabpanel" aria-labelledby="tab-concept" tabIndex={0} className={styles.stagePanel}>
      <div className={styles.stageHeading}><div><h2 id="stage-heading-concept" tabIndex={-1}>설명을 읽고 바로 확인해요</h2><p>개념 확인 문제를 해결하면 자동으로 완료돼요.</p></div><span>{progress.concept.completed} / {progress.concept.total}개 완료</span></div>
      {lesson.concepts.map((concept, index) => {
        const solved = work.conceptSolved.includes(concept.id);
        const feedback = work.conceptFeedback[concept.id];
        const feedbackCurrent = draft.conceptAnswers[concept.id] === work.draft.conceptAnswers[concept.id];
        return <article className={styles.concept} key={concept.id} id={`concept-${concept.id}`}><div className={styles.conceptTitle}><span>{String(index + 1).padStart(2, "0")}</span><h3>{concept.title}</h3>{solved && <span className={styles.solved}><Check size={15} />완료</span>}</div><p className={styles.explanation}>{concept.explanation}</p><div className={styles.example}><span>예를 들어 볼까요?</span><p>{concept.example}</p></div>
          <div className={styles.checkArea}><AnswerChoices question={concept.question} answer={draft.conceptAnswers[concept.id]} disabled={locked || solved} onChange={(answer) => update({ ...draft, conceptAnswers: { ...draft.conceptAnswers, [concept.id]: answer } })} /><Hint hint={concept.question.hint} />
            {feedback && feedbackCurrent && <p id={`concept-feedback-${concept.id}`} tabIndex={-1} role="status" className={feedback.correct ? styles.feedbackGood : styles.feedbackRetry}>{feedback.correct && <Check size={16} />}{feedback.message}</p>}
            {!solved && <Button disabled={locked || !draft.conceptAnswers[concept.id]} onClick={() => void runAction({ type: "check-concept", conceptId: concept.id }, `concept-feedback-${concept.id}`)}>{busy ? "확인 중…" : "정답 확인"}</Button>}
          </div></article>;
      })}
      <div className={styles.stageFooter}><p>{progress.concept.percent === 100 ? "개념을 모두 확인했어요. 퀴즈에서 다시 적용해 볼까요?" : "필요할 때 개념을 다시 살펴볼 수 있어요."}</p><Button disabled={locked} onClick={() => void switchStage("quiz")}>퀴즈로 이동<ArrowRight size={16} /></Button></div>
    </section>}

    {draft.stage === "quiz" && <section id="panel-quiz" role="tabpanel" aria-labelledby="tab-quiz" tabIndex={0} className={styles.stagePanel}>
      <div className={styles.stageHeading}><div><h2 id="stage-heading-quiz" tabIndex={-1}>{quizComplete ? "모든 문제를 해결했어요" : work.quizRound > 1 ? `틀린 문제에 다시 도전해요 · ${work.quizRound}회차` : "배운 내용을 확인해요"}</h2><p>{quizComplete ? "해결한 기록은 남아 있어요. 실습으로 이어가세요." : "한 바퀴를 마치면 틀린 문제만 다시 풀어요. 필요할 때 힌트를 열어 보세요."}</p></div><span>{progress.quiz.completed} / {progress.quiz.total}문항 해결</span></div>
      <div className={styles.quizGrid}>{quizQuestions.map((question, index) => <article key={`${work.quizRound}-${question.id}`} className={styles.quizCard}><div className={styles.questionNumber}>문제 {lesson.quiz.findIndex((item) => item.id === question.id) + 1}<span>{index + 1} / {quizQuestions.length}</span></div><AnswerChoices question={question} answer={draft.quizAnswers[question.id]} disabled={locked || work.quizRoundGraded} onChange={(answer) => update({ ...draft, quizAnswers: { ...draft.quizAnswers, [question.id]: answer } })} /><Hint hint={question.hint} />{work.quizRoundGraded && work.quizFeedback[question.id] && <p role="status" className={work.quizFeedback[question.id].correct ? styles.feedbackGood : styles.feedbackRetry}>{work.quizFeedback[question.id].correct && <Check size={16} />}{work.quizFeedback[question.id].message}</p>}</article>)}</div>
      <div className={styles.stageFooter}><div><p>{quizComplete ? "퀴즈 100% 완료" : work.quizRoundGraded ? `${lesson.quiz.length - work.quizSolved.length}문항을 다시 풀면 퀴즈가 완료돼요.` : unanswered ? `${unanswered}문항을 더 선택하면 결과를 확인할 수 있어요.` : "모든 답을 선택했어요. 결과를 확인해 보세요."}</p>{!quizComplete && (!work.quizRoundGraded ? <Button disabled={locked || unanswered > 0} onClick={() => void runAction({ type: "grade-quiz" }, "stage-heading-quiz")}>{busy ? "확인 중…" : "이번 문제 결과 확인"}</Button> : <Button disabled={locked} onClick={() => void runAction({ type: "retry-quiz" }, "stage-heading-quiz")}><RotateCcw size={16} />틀린 문제만 다시 풀기</Button>)}</div><Button variant={quizComplete ? "default" : "outline"} disabled={locked} onClick={() => void switchStage("practice")}>{quizComplete ? "실습으로 이동" : "먼저 실습하기"}<ArrowRight size={16} /></Button></div>
    </section>}

    {draft.stage === "practice" && (
      <section id="panel-practice" role="tabpanel" aria-labelledby="tab-practice" tabIndex={0} className={styles.stagePanel}>
        <div className={styles.stageHeading}>
          <div>
            <h2 id="stage-heading-practice" tabIndex={-1}>{lesson.practice.title}</h2>
            <p>{lesson.practice.description}</p>
          </div>
          <span>{lesson.practice.type === "entryjs" ? "엔트리 실습" : "기본 실습"}</span>
        </div>

        {lesson.practice.type === "entryjs" ? (
          <EntryPracticeWorkspace
            lesson={lesson}
            work={work}
            draft={draft}
            locked={locked}
            busy={busy}
            update={update}
            runAction={runAction}
          />
        ) : (
          <>
            {work.submission && (
              <div className={styles.submissionNotice}>
                <CheckCircle2 size={20} />
                <div>
                  <strong id="submitted-heading" tabIndex={-1}>제출한 작품이 있어요.</strong>
                  <p>{timeLabel(work.submission.submittedAt)} 제출 · 수정하는 동안에도 이전 제출본과 완료 기록은 유지돼요.</p>
                  <details>
                    <summary>제출한 순서 보기</summary>
                    <ol>
                      {work.submission.order.map((id) => (
                        <li key={id}>{lesson.practice.blocks.find((block) => block.id === id)?.label}</li>
                      ))}
                    </ol>
                  </details>
                </div>
              </div>
            )}
            <div className={styles.practiceGrid}>
              <section className={styles.orderPanel} aria-label="순서 배열 작업">
                <div className={styles.orderHeading}>
                  <h3>{work.submission ? "수정 중인 작업" : "나의 알고리즘"}</h3>
                  <span>위·아래 버튼으로 순서를 바꿔요</span>
                </div>
                <ol className={styles.orderList}>
                  {draft.practiceOrder.map((id, index) => {
                    const block = lesson.practice.blocks.find((item) => item.id === id);
                    if (!block) return null;
                    return (
                      <li key={id}>
                        <span className={styles.orderIndex}>{index + 1}</span>
                        <span className={styles.blockLabel}>{block.label}</span>
                        <div className={styles.moveButtons}>
                          <button
                            id={`move-${id}-up`}
                            type="button"
                            disabled={locked || index === 0}
                            aria-label={`${block.label} 위로 이동`}
                            onClick={() => moveBlock(id, -1)}
                          >
                            <ArrowUp size={17} />
                          </button>
                          <button
                            id={`move-${id}-down`}
                            type="button"
                            disabled={locked || index === draft.practiceOrder.length - 1}
                            aria-label={`${block.label} 아래로 이동`}
                            onClick={() => moveBlock(id, 1)}
                          >
                            <ArrowDown size={17} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <span className={styles.srOnly} role="status">{moveMessage}</span>
              </section>
              <aside className={styles.validationPanel}>
                <span className={styles.iconTile}><CheckCircle2 size={24} /></span>
                <h3>검증하고 제출해요</h3>
                <p>순서를 완성하면 조건을 확인하세요. 검증을 통과한 작품을 제출하면 실습이 완료돼요.</p>
                <ul>
                  <li><Check size={15} />시작과 종료의 위치</li>
                  <li><Check size={15} />올바른 순차 실행 흐름</li>
                </ul>
                <Button disabled={locked} onClick={() => void runAction({ type: "validate-practice" }, "practice-feedback")}>
                  {busy ? "처리 중…" : "순서 검증"}
                </Button>
                {work.validation && JSON.stringify(work.validation.order) === JSON.stringify(draft.practiceOrder) && (
                  <p id="practice-feedback" tabIndex={-1} role="status" className={work.validation.passed ? styles.feedbackGood : styles.feedbackRetry}>
                    {work.validation.passed && <Check size={16} />}
                    {work.validation.message}
                  </p>
                )}
                {work.validation && JSON.stringify(work.validation.order) !== JSON.stringify(draft.practiceOrder) && (
                  <p className={styles.feedbackRetry}>작업이 바뀌었어요. 제출 전에 다시 검증해 주세요.</p>
                )}
                <Button
                  variant="outline"
                  disabled={locked || !draftMatchesValidation || !!draftMatchesSubmission}
                  onClick={() => void runAction({ type: "submit-practice" }, "submitted-heading")}
                >
                  <Send size={16} />
                  {draftMatchesSubmission ? "이 작품 제출 완료" : work.submission ? "수정한 작품 제출" : "작품 제출"}
                </Button>
                {!work.submission && draftMatchesValidation && (
                  <p className={styles.smallNote}>검증 통과 · 아직 제출 전이에요.</p>
                )}
              </aside>
            </div>
          </>
        )}
        <div className={styles.stageFooter}>
          <p>{progress.status === "completed" ? "필수 활동을 모두 마쳤어요. 이 수업은 완료예요." : "실습을 제출해도 남은 개념과 퀴즈는 이어서 풀 수 있어요."}</p>
          <Button variant="outline" disabled={locked} onClick={() => void switchStage(progress.concept.percent < 100 ? "concept" : "quiz")}>
            {progress.concept.percent < 100 ? "개념 확인하러 가기" : "퀴즈 돌아보기"}<ArrowRight size={16} />
          </Button>
        </div>
      </section>
    )}
  </div>;
}
