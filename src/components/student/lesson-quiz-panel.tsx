"use client";

import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { progressFor } from "@/lib/classroom/progress";
import type { Question } from "@/lib/classroom/types";
import { AnswerChoices, Hint, type LessonPanelProps } from "./lesson-concept-panel";
import styles from "./student.module.css";

export function LessonQuizPanel({ lesson, controller, mode, locked, actionLocked, runAction, switchStage, quizQuestionId, moveQuestion }: LessonPanelProps & {
  quizQuestionId: string | undefined;
  moveQuestion: (id: string) => void;
}) {
  const { work, draft, busy, update } = controller;
  const progress = progressFor(lesson, work);
  const quizQuestions = work.quizRoundIds.map((id) => lesson.quiz.find((question) => question.id === id)).filter((question): question is Question => !!question);
  const unanswered = quizQuestions.filter((question) => !draft.quizAnswers[question.id]).length;
  const quizComplete = progress.quiz.percent === 100;
  const quizQuestion = quizQuestions.find((question) => question.id === quizQuestionId) ?? quizQuestions[0];
  const quizPosition = quizQuestions.indexOf(quizQuestion);
  return <section id="panel-quiz" role="tabpanel" aria-labelledby="tab-quiz" tabIndex={0} className={styles.stagePanel}>
  <div className={styles.quizBody}>
    <div className={styles.quizTop}>
      <div className={styles.quizPosition}><h2 id="stage-heading-quiz" tabIndex={-1}><span className={styles.srOnly}>{quizComplete ? "모든 문제를 해결했어요" : work.quizRound > 1 ? `틀린 문제에 다시 도전해요 · ${work.quizRound}회차` : "배운 내용을 확인해요"} · </span>문제 {lesson.quiz.indexOf(quizQuestion) + 1}</h2><span>{quizPosition + 1} / {quizQuestions.length} · 이번 회차</span></div>
      <nav className={styles.learningNav} aria-label="퀴즈 문항 목록">{quizQuestions.map((question) => {
        const number = lesson.quiz.indexOf(question) + 1;
        const state = work.quizRoundGraded ? work.quizFeedback[question.id]?.correct ? "해결" : "재도전" : draft.quizAnswers[question.id] ? "답변" : "미답변";
        return <button key={question.id} type="button" disabled={locked} aria-label={`문제 ${number} · ${state}`} aria-current={quizQuestion.id === question.id ? "step" : undefined} onClick={() => moveQuestion(question.id)}>{number}<span>{state}</span></button>;
      })}</nav>
    </div>
    {quizQuestion && <>
      <article key={`${work.quizRound}-${quizQuestion.id}`} className={styles.quizCard}><h3 id="quiz-question-title" tabIndex={-1}>{quizQuestion.prompt}</h3>{quizQuestion.scene && <div className={styles.quizScene} role="group" aria-label="읽어 볼 코드">{quizQuestion.scene.map((line) => <code key={line}>{line}</code>)}</div>}<AnswerChoices titleId="quiz-question-title" question={quizQuestion} answer={draft.quizAnswers[quizQuestion.id]} disabled={locked || work.quizRoundGraded} onChange={(answer) => update({ ...draft, quizAnswers: { ...draft.quizAnswers, [quizQuestion.id]: answer } })} />{work.quizRoundGraded && work.quizFeedback[quizQuestion.id] && <p role="status" className={work.quizFeedback[quizQuestion.id].correct ? styles.feedbackGood : styles.feedbackRetry}>{work.quizFeedback[quizQuestion.id].correct && <Check size={16} />}<span><strong>채점 당시 답안 결과</strong><br />{work.quizFeedback[quizQuestion.id].message}</span></p>}</article>
      <div key={`${work.quizRound}-${quizQuestion.id}-actions`} className={styles.quizActions}><Hint hint={quizQuestion.hint} /><div>
        <Button variant="ghost" disabled={locked || quizPosition === 0} onClick={() => moveQuestion(quizQuestions[quizPosition - 1].id)}><ArrowLeft size={16} />이전 문제</Button>
        {!work.quizRoundGraded && quizPosition === quizQuestions.length - 1 ? unanswered > 0 ? <Button disabled={locked} onClick={() => moveQuestion(quizQuestions.find((question) => !draft.quizAnswers[question.id])!.id)}>답하지 않은 문제로 이동</Button> : <Button disabled={actionLocked} onClick={() => void runAction({ type: "grade-quiz" }, "quiz-round-result")}>{busy ? "확인 중…" : "이번 회차 결과 확인"}</Button> : <Button variant="outline" disabled={locked || quizPosition === quizQuestions.length - 1} onClick={() => moveQuestion(quizQuestions[quizPosition + 1].id)}>다음 문제<ArrowRight size={16} /></Button>}
      </div></div>
    </>}
    {!work.quizRoundGraded ? <div className={styles.quizRoundNote}><p>{unanswered ? `${unanswered}문항을 더 선택하면 결과를 확인할 수 있어요.` : "모든 답을 선택했어요. 결과를 확인해 보세요."}</p><div>
      {unanswered > 0 && quizPosition !== quizQuestions.length - 1 && <Button variant="ghost" disabled={locked} onClick={() => moveQuestion(quizQuestions.find((question) => !draft.quizAnswers[question.id])!.id)}>답하지 않은 문제로 이동</Button>}
      {(quizPosition !== quizQuestions.length - 1 || unanswered > 0) && <Button variant="outline" disabled={actionLocked || unanswered > 0} onClick={() => void runAction({ type: "grade-quiz" }, "quiz-round-result")}>{busy ? "확인 중…" : "이번 회차 결과 확인"}</Button>}
      <Button variant="ghost" disabled={actionLocked} onClick={() => void switchStage("practice")}>먼저 실습하기<ArrowRight size={16} /></Button>
    </div></div> : <div id="quiz-round-result" tabIndex={-1} className={styles.quizResult}><div><p>{mode === "preview" ? "이번 회차 결과는 이 창에서 체험한 답안 기준이에요." : "이번 회차 결과는 채점할 때 저장된 답안 기준이에요."}</p><p>{quizComplete ? "퀴즈 100% 완료" : `전체 ${progress.quiz.completed}/${progress.quiz.total}문항 해결 · ${lesson.quiz.length - work.quizSolved.length}문항에 다시 도전해요.`}</p>
      {!quizComplete && <nav className={styles.learningNav} aria-label="재도전 문항 바로가기">{quizQuestions.filter((question) => !work.quizFeedback[question.id]?.correct).map((question) => <button key={question.id} type="button" disabled={locked} onClick={() => moveQuestion(question.id)}>문제 {lesson.quiz.indexOf(question) + 1} 해설 보기</button>)}</nav>}
    </div><div className={styles.quizResultActions}>{!quizComplete && <Button disabled={actionLocked} onClick={() => void runAction({ type: "retry-quiz" }, "quiz-question-title")}><RotateCcw size={16} />틀린 문제만 다시 풀기</Button>}<Button variant={quizComplete ? "default" : "outline"} disabled={actionLocked} onClick={() => void switchStage("practice")}>{quizComplete ? "실습으로 이동" : "먼저 실습하기"}<ArrowRight size={16} /></Button></div></div>}
    <p className={styles.quizGuidance}>{quizComplete ? mode === "preview" ? "이 창에서 해결한 체험 기록은 유지해요. 실습으로 이어가세요." : "해결한 기록은 남아 있어요. 실습으로 이어가세요." : "한 바퀴를 마치면 틀린 문제만 다시 풀어요. 필요할 때 힌트를 열어 보세요."}</p>
  </div>
</section>;
}
