"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, ArrowDown, ArrowUp, BookOpen, Check, CheckCircle2, CloudCheck, Layers3, Lightbulb, LoaderCircle, RotateCcw, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { classroomApi } from "@/lib/classroom/client";
import { practiceMatches, progressFor } from "@/lib/classroom/progress";
import { parseEntryProject } from "@/lib/classroom/entry-project";
import type { Lesson, Question, Stage, StudentDashboard, Work, WorkAction, WorkDraft } from "@/lib/classroom/types";
import { LearningStatus, ProgressSummary } from "./progress-summary";
import { EntryPracticeWorkspace } from "./entry-practice-workspace";
import { useWork } from "./use-work";
import { ProgrammingLearningStage } from "./programming-lesson";
import { parseProgrammingProject, programmingMissions } from "@/lib/classroom/programming-entry";
import { isReviewType } from "@/lib/classroom/review/project";
import { Sandwich } from "./review/sandwich";
import { Abstraction } from "./review/abstraction";
import { Flowchart } from "./review/flowchart";
import { ReviewConcepts } from "./review/concepts";
import reviewStyles from "./review/review.module.css";
import styles from "./student.module.css";

const stages = [{ id: "concept", label: "개념", icon: BookOpen }, { id: "quiz", label: "퀴즈", icon: CheckCircle2 }, { id: "practice", label: "실습", icon: Layers3 }] as const;
const timeLabel = (time: number) => new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(time);

function AnswerChoices({ question, answer, disabled, onChange, titleId }: { question: Question; answer?: string; disabled: boolean; onChange: (answer: string) => void; titleId?: string }) {
  return <fieldset className={styles.answers} disabled={disabled} aria-labelledby={titleId}><legend className={titleId ? styles.srOnly : undefined}>{question.prompt}</legend>
    {question.options.map((option) => <label key={option.id} className={answer === option.id ? styles.selectedAnswer : ""}>
      <input type="radio" name={`answer-${question.id}`} value={option.id} checked={answer === option.id} onChange={() => onChange(option.id)} />
      <span>{option.label}</span>
    </label>)}
  </fieldset>;
}

function Hint({ hint }: { hint: string }) {
  return <details className={styles.hint}><summary><Lightbulb size={16} aria-hidden="true" />힌트 보기</summary><p>{hint}</p></details>;
}

type WorkspaceView = { workspaceWide: boolean; onWorkspaceWideChange: (wide: boolean) => void; onWorkspaceStageChange: (stage: Stage) => void };

export function LessonWorkspace({ lesson, uid, workspaceWide, onWorkspaceWideChange, onWorkspaceStageChange }: { lesson: Lesson; uid: string } & WorkspaceView) {
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
  return <WorkEditor lesson={lesson} initial={initial} uid={uid} otherCurrent={otherCurrent} workspaceWide={workspaceWide} onWorkspaceWideChange={onWorkspaceWideChange} onWorkspaceStageChange={onWorkspaceStageChange} />;
}

function DraftComparison({ lesson, draft }: { lesson: Lesson; draft: WorkDraft }) {
  const label = (question: Question, answer?: string) => question.options.find((option) => option.id === answer)?.label ?? "미응답";
  return <ul className={styles.comparisonList}>
    <li><strong>이어갈 단계</strong>{stages.find((stage) => stage.id === draft.stage)?.label}</li>
    {lesson.concepts.map((concept, i) => <li key={concept.id}><strong>개념 {i + 1}</strong>{label(concept.question, draft.conceptAnswers[concept.id])}</li>)}
    {lesson.quiz.map((question, i) => <li key={question.id}><strong>퀴즈 {i + 1}</strong>{label(question, draft.quizAnswers[question.id])}</li>)}
    {lesson.practice.type === "programming" && programmingMissions.map((mission) => <li key={mission.id}><strong>{mission.title}</strong>{draft.programming?.projects[mission.id] ? `${parseProgrammingProject(draft.programming.projects[mission.id])?.order.length ?? 0}개 블록` : "아직 시작하지 않았어요"}</li>)}
    {draft.reviewProject && <li><strong>복습 작품</strong>{draft.reviewProject.type === "sandwich" ? `${draft.reviewProject.commands.length}개 명령 · 작성 중: ${draft.reviewProject.input}` : draft.reviewProject.type === "abstraction" ? `${draft.reviewProject.current} → ${draft.reviewProject.goal}` : `${draft.reviewProject.nodes.length}개 기호 · ${draft.reviewProject.edges.length}개 연결`}</li>}
    <li><strong>{lesson.practice.type === "entryjs" ? "엔트리 블록" : "실습 순서"}</strong>{lesson.practice.type === "entryjs" ? `${draft.practiceOrder.length}개 블록 조립됨` : draft.practiceOrder.map((id) => lesson.practice.blocks.find((block) => block.id === id)?.label).filter(Boolean).join(" → ")}</li>
  </ul>;
}

function WorkEditor({ lesson, initial, uid, otherCurrent, workspaceWide, onWorkspaceWideChange, onWorkspaceStageChange }: { lesson: Lesson; initial: Work; uid: string; otherCurrent?: Lesson } & WorkspaceView) {
  const entryExport = useRef<(() => Promise<string | null>) | null>(null);
  const readEditorDraft = useCallback(async (current: WorkDraft) => {
    if (!entryExport.current) return current;
    const serialized = await entryExport.current();
    const project = lesson.practice.type === "programming" ? parseProgrammingProject(serialized) : parseEntryProject(serialized);
    if (!serialized || !project) throw new Error("작품을 확인하지 못했어요. 블록과 입력값을 확인하고 다시 시도해 주세요.");
    if (lesson.practice.type === "programming" && current.programming) return { ...current, programming: { ...current.programming, projects: { ...current.programming.projects, [current.programming.mission]: JSON.stringify(project.project) } } };
    return { ...current, entryProject: serialized, practiceOrder: project.order };
  }, [lesson.practice.type]);
  const controller = useWork(initial, uid, lesson.practice.type === "entryjs" || lesson.practice.type === "programming" ? readEditorDraft : undefined);
  const { work, draft, busy, update, perform, saveState, error } = controller;
  const progress = progressFor(lesson, work);
  const reviewType = lesson.practice.type === "sandwich" || lesson.practice.type === "abstraction" || lesson.practice.type === "flowchart" ? lesson.practice.type : null;
  const [moveMessage, setMoveMessage] = useState("");
  const [switching, setSwitching] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{ id: string; preventScroll?: boolean } | null>(null);
  const [conceptId, setConceptId] = useState(() => lesson.concepts.find((item) => !initial.conceptSolved.includes(item.id))?.id ?? lesson.concepts[0]?.id);
  const [quizQuestionId, setQuizQuestionId] = useState(() => initial.quizRoundIds.find((id) => initial.quizRoundGraded ? !initial.quizFeedback[id]?.correct : !initial.draft.quizAnswers[id]) ?? initial.quizRoundIds[0] ?? lesson.quiz[0]?.id);
  const [experienceVersion, setExperienceVersion] = useState(0);
  const reviewViewToggle = useRef<HTMLButtonElement>(null), manualReviewFocus = useRef(false);
  useEffect(() => {
    if (manualReviewFocus.current) { reviewViewToggle.current?.focus({ preventScroll: true }); manualReviewFocus.current = false; }
  }, [workspaceWide]);
  useEffect(() => { onWorkspaceStageChange(draft.stage); }, [draft.stage, onWorkspaceStageChange]);
  function setReviewWide(wide: boolean) { manualReviewFocus.current = true; onWorkspaceWideChange(wide); }
  useEffect(() => {
    // Focus after React commits the new feedback or enabled controls, not on the next animation frame.
    if (focusRequest) document.getElementById(focusRequest.id)?.focus({ preventScroll: focusRequest.preventScroll });
  }, [focusRequest]);
  const locked = busy || switching;
  const draftMatchesValidation = work.validation?.passed && practiceMatches(draft, work.validation);
  const draftMatchesSubmission = practiceMatches(draft, work.submission);
  const quizQuestions = work.quizRoundIds.map((id) => lesson.quiz.find((question) => question.id === id)).filter((question): question is Question => !!question);
  const unanswered = quizQuestions.filter((question) => !draft.quizAnswers[question.id]).length;
  const quizComplete = progress.quiz.percent === 100;
  const quizQuestion = quizQuestions.find((question) => question.id === quizQuestionId) ?? quizQuestions[0];
  const quizPosition = quizQuestions.indexOf(quizQuestion);
  function moveQuestion(id: string) { setQuizQuestionId(id); setFocusRequest({ id: "quiz-question-title" }); }
  const entryPractice = draft.stage === "practice" && (lesson.practice.type === "entryjs" || lesson.practice.type === "programming");
  const saveLabel = controller.conflict ? "저장 기록 충돌" : saveState === "saved" ? work.updatedAt ? "저장 완료" : "아직 학습 기록이 없어요" : saveState === "saving" ? "저장 중…" : saveState === "failed" ? "저장 확인 필요" : "변경 내용 저장 대기";
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
    if (await perform(action)) {
      if (action.type === "retry-quiz") setQuizQuestionId(lesson.quiz.find((question) => !work.quizSolved.includes(question.id))?.id ?? lesson.quiz[0]?.id);
      setFocusRequest({ id: focusId });
    }
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
  return <div className={styles.workspace} data-workspace-wide={workspaceWide}>
    <div className={styles.workspaceTop}><Link href="/student" className={styles.back}><ArrowLeft size={17} />대시보드로</Link>
      <details className={styles.lessonProgress}><summary>자세한 학습 진행</summary><div><p>{lesson.description}</p><ProgressSummary lesson={lesson} work={{ ...work, validation: draftMatchesValidation ? work.validation : null }} /></div></details>
      <span className={styles.saveState} role={entryPractice ? undefined : "status"}>{saveState === "saving" ? <LoaderCircle size={16} className={styles.spin} /> : saveState === "saved" ? <CloudCheck size={17} /> : <Save size={16} />}{saveLabel}</span>
    </div>
    {otherCurrent && <div className={styles.notice} role="status"><div><strong>선생님이 지정한 이번 수업은 ‘{otherCurrent.title}’이에요.</strong><p>하던 학습을 계속하거나 저장한 뒤 이동할 수 있어요.</p></div><Button variant="outline" nativeButton={false} render={<Link href={`/classroom/${otherCurrent.id}`} />}>이번 수업으로<ArrowRight size={16} /></Button></div>}
    <header className={styles.lessonHeader}><div><span className={styles.eyebrow}>{lesson.category ?? "알고리즘 · 순차 구조"}</span><h1>{lesson.title}</h1></div><LearningStatus lesson={lesson} work={work} /></header>
    {lesson.mode === "review" && <p className={reviewStyles.notice}>새 사이트에서 다시 해 본 활동을 기록해요. 성적에는 반영하지 않아요.</p>}
    {error && <section id="work-save-error" tabIndex={-1} className={styles.errorPanel} role="alert"><strong>{controller.conflict ? "저장 기록이 서로 달라요." : "요청을 완료하지 못했어요."}</strong><p>{error}</p><p>현재 입력은 이 화면에 유지하고 있어요. 확인 전에는 창을 닫지 마세요.</p><Button variant="outline" disabled={busy} onClick={() => void (controller.conflict ? controller.compare() : controller.retry())}>{controller.conflict ? "서버 기록과 비교" : "저장 다시 확인"}</Button></section>}
    {controller.remote && <section className={styles.conflictPanel} aria-label="저장 충돌 비교"><h2>어떤 입력으로 이어갈까요?</h2><p>서버의 완료·제출 기록은 유지돼요. 입력 내용은 아래에서 직접 선택하세요.</p><div className={styles.comparisonGrid}><div><h3>이 화면의 입력</h3><DraftComparison lesson={lesson} draft={draft} /></div><div><h3>서버에 저장된 입력</h3><DraftComparison lesson={lesson} draft={controller.remote.draft} /></div></div><div className={styles.actions}><Button disabled={busy} onClick={() => void controller.resolve(true)}>현재 입력을 새 버전으로 저장</Button><Button variant="outline" disabled={busy} onClick={() => void controller.resolve(false)}>서버 기록으로 이어하기</Button></div></section>}
    <div className={styles.tabs} role="tablist" aria-label="수업 단계">{stages.map((stage, index) => <button key={stage.id} id={`tab-${stage.id}`} type="button" role="tab" aria-selected={draft.stage === stage.id} aria-controls={`panel-${stage.id}`} tabIndex={draft.stage === stage.id ? 0 : -1} disabled={locked} onKeyDown={(event) => tabKey(event, index)} onClick={() => void switchStage(stage.id, true)}><stage.icon size={18} /><span>{stage.label}</span><span className={styles.tabPercent}>{progress[stage.id].percent}%</span></button>)}</div>

    {lesson.practice.type === "programming" && <ProgrammingLearningStage lesson={lesson} controller={controller} locked={locked} exportRef={entryExport} runAction={runAction} focus={(id) => setFocusRequest({ id })} next={(stage) => void switchStage(stage)} conceptId={conceptId} quizQuestionId={quizQuestionId} onConceptChange={setConceptId} onQuizQuestionChange={setQuizQuestionId} workspaceWide={workspaceWide} onWorkspaceWideChange={onWorkspaceWideChange} saveLabel={saveLabel} />}

    {lesson.practice.type !== "programming" && draft.stage === "concept" && <section id="panel-concept" role="tabpanel" aria-labelledby="tab-concept" tabIndex={0} className={`${styles.stagePanel} ${styles.conceptPanel}`}>
      <div className={styles.stageHeading}><div><h2 id="stage-heading-concept" tabIndex={-1}>설명을 읽고 바로 확인해요</h2><p>개념 확인 문제를 해결하면 자동으로 완료돼요.</p></div><span>{progress.concept.completed} / {progress.concept.total}개 완료</span></div>
      <nav className={styles.learningNav} aria-label="개념 목록">{lesson.concepts.map((concept, index) => <button key={concept.id} type="button" disabled={locked} aria-current={conceptId === concept.id ? "step" : undefined} onClick={() => { setConceptId(concept.id); setFocusRequest({ id: `concept-title-${concept.id}` }); }}><span>{work.conceptSolved.includes(concept.id) ? "✓ 완료" : String(index + 1).padStart(2, "0")}</span>{concept.title}</button>)}</nav>
      <div className={styles.conceptBody}>{lesson.concepts.filter((concept) => concept.id === conceptId).map((concept) => {
        const index = lesson.concepts.indexOf(concept);
        const solved = work.conceptSolved.includes(concept.id);
        const feedback = work.conceptFeedback[concept.id];
        const feedbackCurrent = draft.conceptAnswers[concept.id] === work.draft.conceptAnswers[concept.id];
        return <article className={styles.concept} key={concept.id} id={`concept-${concept.id}`}><div className={styles.conceptTitle}><span>{String(index + 1).padStart(2, "0")}</span><h3 id={`concept-title-${concept.id}`} tabIndex={-1}>{concept.title}</h3>{solved && <span className={styles.solved}><Check size={15} />완료</span>}</div><p className={styles.explanation}>{concept.explanation}</p><div className={styles.example}><span>예를 들어 볼까요?</span><p>{concept.example}</p></div>
          {reviewType && <div className={styles.experienceBlock} data-concept-experience><header className={styles.experienceHeading}><strong>개념 체험</strong><Button variant="ghost" onClick={() => setExperienceVersion((value) => value + 1)}><RotateCcw size={16} aria-hidden="true" />체험 초기화</Button></header><ReviewConcepts key={`${concept.id}-${experienceVersion}`} type={reviewType} conceptId={concept.id} /></div>}
          <div className={styles.checkArea}><AnswerChoices question={concept.question} answer={draft.conceptAnswers[concept.id]} disabled={locked || solved} onChange={(answer) => update({ ...draft, conceptAnswers: { ...draft.conceptAnswers, [concept.id]: answer } })} /><Hint hint={concept.question.hint} />
            {feedback && feedbackCurrent && <p id={`concept-feedback-${concept.id}`} tabIndex={-1} role="status" className={feedback.correct ? styles.feedbackGood : styles.feedbackRetry}>{feedback.correct && <Check size={16} />}{feedback.message}</p>}
            {!solved && <Button disabled={locked || !draft.conceptAnswers[concept.id]} onClick={() => void runAction({ type: "check-concept", conceptId: concept.id }, `concept-feedback-${concept.id}`)}>{busy ? "확인 중…" : "정답 확인"}</Button>}
          </div><div className={styles.conceptActions}><Button variant="ghost" disabled={locked || index === 0} onClick={() => { const id = lesson.concepts[index - 1].id; setConceptId(id); setFocusRequest({ id: `concept-title-${id}` }); }}><ArrowLeft size={16} />이전 개념</Button><Button variant="ghost" disabled={locked || index === lesson.concepts.length - 1} onClick={() => { const id = lesson.concepts[index + 1].id; setConceptId(id); setFocusRequest({ id: `concept-title-${id}` }); }}>다음 개념<ArrowRight size={16} /></Button></div></article>;
      })}</div>
      <div className={styles.stageFooter}><p>{progress.concept.percent === 100 ? "개념을 모두 확인했어요. 퀴즈에서 다시 적용해 볼까요?" : "필요할 때 개념을 다시 살펴볼 수 있어요."}</p><Button disabled={locked} onClick={() => void switchStage("quiz")}>퀴즈로 이동<ArrowRight size={16} /></Button></div>
    </section>}

    {lesson.practice.type !== "programming" && draft.stage === "quiz" && <section id="panel-quiz" role="tabpanel" aria-labelledby="tab-quiz" tabIndex={0} className={styles.stagePanel}>
      <div className={styles.stageHeading}><div><h2 id="stage-heading-quiz" tabIndex={-1}>{quizComplete ? "모든 문제를 해결했어요" : work.quizRound > 1 ? `틀린 문제에 다시 도전해요 · ${work.quizRound}회차` : "배운 내용을 확인해요"}</h2><p>{quizComplete ? "해결한 기록은 남아 있어요. 실습으로 이어가세요." : "한 바퀴를 마치면 틀린 문제만 다시 풀어요. 필요할 때 힌트를 열어 보세요."}</p></div><span>{progress.quiz.completed} / {progress.quiz.total}문항 해결</span></div>
      <div className={styles.quizBody}>
        <nav className={styles.learningNav} aria-label="퀴즈 문항 목록">{quizQuestions.map((question) => <button key={question.id} type="button" disabled={locked} aria-current={quizQuestion.id === question.id ? "step" : undefined} onClick={() => moveQuestion(question.id)}>문제 {lesson.quiz.indexOf(question) + 1}<span>{work.quizRoundGraded ? work.quizFeedback[question.id]?.correct ? "해결" : "재도전" : draft.quizAnswers[question.id] ? "답변" : "미답변"}</span></button>)}</nav>
        {quizQuestion && <article key={`${work.quizRound}-${quizQuestion.id}`} className={styles.quizCard}><div className={styles.questionNumber}>문제 {lesson.quiz.indexOf(quizQuestion) + 1}<span>{quizPosition + 1} / {quizQuestions.length} · 이번 회차</span></div><h3 id="quiz-question-title" tabIndex={-1}>{quizQuestion.prompt}</h3><AnswerChoices titleId="quiz-question-title" question={quizQuestion} answer={draft.quizAnswers[quizQuestion.id]} disabled={locked || work.quizRoundGraded} onChange={(answer) => update({ ...draft, quizAnswers: { ...draft.quizAnswers, [quizQuestion.id]: answer } })} /><Hint hint={quizQuestion.hint} />{work.quizRoundGraded && work.quizFeedback[quizQuestion.id] && <p role="status" className={work.quizFeedback[quizQuestion.id].correct ? styles.feedbackGood : styles.feedbackRetry}>{work.quizFeedback[quizQuestion.id].correct && <Check size={16} />}{work.quizFeedback[quizQuestion.id].message}</p>}
          <div className={styles.conceptActions}><Button variant="ghost" disabled={locked || quizPosition === 0} onClick={() => moveQuestion(quizQuestions[quizPosition - 1].id)}><ArrowLeft size={16} />이전 문제</Button><Button variant="outline" disabled={locked || quizPosition === quizQuestions.length - 1} onClick={() => moveQuestion(quizQuestions[quizPosition + 1].id)}>다음 문제<ArrowRight size={16} /></Button></div>
        </article>}
        <div id={work.quizRoundGraded ? "quiz-round-result" : undefined} tabIndex={-1} className={styles.stageFooter}><div><p>{quizComplete ? "퀴즈 100% 완료" : work.quizRoundGraded ? `전체 ${progress.quiz.completed}/${progress.quiz.total}문항 해결 · ${lesson.quiz.length - work.quizSolved.length}문항에 다시 도전해요.` : unanswered ? `${unanswered}문항을 더 선택하면 결과를 확인할 수 있어요.` : "모든 답을 선택했어요. 결과를 확인해 보세요."}</p>
          {!work.quizRoundGraded && unanswered > 0 && <Button variant="outline" disabled={locked} onClick={() => moveQuestion(quizQuestions.find((question) => !draft.quizAnswers[question.id])!.id)}>답하지 않은 문제로 이동</Button>}
          {!quizComplete && (!work.quizRoundGraded ? <Button disabled={locked || unanswered > 0} onClick={() => void runAction({ type: "grade-quiz" }, "quiz-round-result")}>{busy ? "확인 중…" : "이번 문제 결과 확인"}</Button> : <><nav className={styles.learningNav} aria-label="재도전 문항 바로가기">{quizQuestions.filter((question) => !work.quizFeedback[question.id]?.correct).map((question) => <button key={question.id} type="button" disabled={locked} onClick={() => moveQuestion(question.id)}>문제 {lesson.quiz.indexOf(question) + 1} 해설 보기</button>)}</nav><Button disabled={locked} onClick={() => void runAction({ type: "retry-quiz" }, "quiz-question-title")}><RotateCcw size={16} />틀린 문제만 다시 풀기</Button></>)}</div><Button variant={quizComplete ? "default" : "outline"} disabled={locked} onClick={() => void switchStage("practice")}>{quizComplete ? "실습으로 이동" : "먼저 실습하기"}<ArrowRight size={16} /></Button></div>
      </div>
    </section>}

    {isReviewType(lesson.practice.type) && draft.stage === "practice" && <section id="panel-practice" role="tabpanel" aria-labelledby="tab-practice" className={reviewStyles.workspace}><header className={reviewStyles.practiceHeader}><h2 id="stage-heading-practice" tabIndex={-1}>{lesson.practice.title}</h2><Button ref={reviewViewToggle} variant="outline" aria-pressed={workspaceWide} onClick={() => setReviewWide(!workspaceWide)} onKeyDown={event => { if (event.key === "Escape" && workspaceWide) { event.preventDefault(); setReviewWide(false); } }}>{workspaceWide ? "기본 크기로 돌아가기" : "작업실 넓게 보기"}</Button></header>{lesson.practice.type === "sandwich" ? <Sandwich controller={controller} /> : lesson.practice.type === "abstraction" ? <Abstraction controller={controller} /> : <Flowchart controller={controller} />}</section>}
    {lesson.practice.type !== "programming" && !isReviewType(lesson.practice.type) && draft.stage === "practice" && (
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
            exportRef={entryExport}
            lesson={lesson}
            work={work}
            draft={draft}
            locked={locked}
            busy={busy}
            update={update}
            runAction={runAction}
            saveLabel={saveLabel}
            saveState={saveState}
            workspaceWide={workspaceWide}
            onWorkspaceWideChange={onWorkspaceWideChange}
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
