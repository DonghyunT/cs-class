"use client";

import { ArrowLeft, ArrowRight, Check, Lightbulb, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lesson, Question, Stage, WorkAction } from "@/lib/classroom/types";
import type { LessonMode, WorkController } from "./work-controller";
import { ConceptVisual } from "./concept-visual";
import { ReviewConcepts } from "./review/concepts";
import styles from "./student.module.css";
import conceptStyles from "@/components/ui/concept-layout.module.css";

export type LessonPanelProps = {
  lesson: Lesson;
  controller: WorkController;
  mode: LessonMode;
  locked: boolean;
  actionLocked: boolean;
  runAction: (action: WorkAction, focusId: string | readonly string[]) => Promise<void>;
  switchStage: (stage: Stage) => Promise<void>;
};

export function AnswerChoices({ question, answer, disabled, onChange, titleId }: { question: Question; answer?: string; disabled: boolean; onChange: (answer: string) => void; titleId?: string }) {
  return <fieldset className={styles.answers} disabled={disabled} aria-labelledby={titleId}><legend className={titleId ? styles.srOnly : undefined}>{question.prompt}</legend>
    {question.options.map((option) => <label key={option.id} className={answer === option.id ? styles.selectedAnswer : ""}>
      <input type="radio" name={`answer-${question.id}`} value={option.id} checked={answer === option.id} onChange={() => onChange(option.id)} />
      <span>{option.label}</span>
    </label>)}
  </fieldset>;
}

export function Hint({ hint }: { hint: string }) {
  return <details className={styles.hint}><summary><Lightbulb size={16} aria-hidden="true" />힌트 보기</summary><p>{hint}</p></details>;
}

export function LessonConceptPanel({ lesson, controller, mode, locked, actionLocked, runAction, switchStage, conceptId, experienceVersion, onResetExperience, onSelectConcept }: LessonPanelProps & {
  conceptId: string | undefined;
  experienceVersion: number;
  onResetExperience: () => void;
  onSelectConcept: (id: string) => void;
}) {
  const { work, draft, busy, update } = controller;
  const reviewType = lesson.practice.type === "sandwich" || lesson.practice.type === "abstraction" || lesson.practice.type === "flowchart" ? lesson.practice.type : null;
  return <section id="panel-concept" role="tabpanel" aria-labelledby="tab-concept" tabIndex={0} className={styles.stagePanel}>
  <h2 id="stage-heading-concept" tabIndex={-1} className={styles.srOnly}>설명을 읽고 바로 확인해요</h2>
  <div className={conceptStyles.layout}>
  <nav className={conceptStyles.nav} aria-label="개념 목록">{lesson.concepts.map((concept, index) => {
    const solved = work.conceptSolved.includes(concept.id);
    return <button key={concept.id} type="button" disabled={locked} aria-current={conceptId === concept.id ? "step" : undefined} onClick={() => onSelectConcept(concept.id)}><span>{solved ? <Check size={16} aria-hidden="true" /> : String(index + 1).padStart(2, "0")}</span><div><strong>{concept.title}</strong><small>{solved ? "확인 완료" : work.conceptFeedback[concept.id]?.correct === false ? "다시 생각해 보기" : conceptId === concept.id ? "지금 보는 개념" : "확인 전"}</small></div></button>;
  })}<p>{reviewType ? <>직접 바꾸고, 결과를 보고,<br />한 번 더 생각해 보세요.</> : <>예시를 읽고 결과를 예상한 뒤,<br />확인 문제로 점검해 보세요.</>}</p></nav>
  <div className={conceptStyles.content}>{lesson.concepts.filter((concept) => concept.id === conceptId).map((concept) => {
    const index = lesson.concepts.indexOf(concept);
    const solved = work.conceptSolved.includes(concept.id);
    const feedback = work.conceptFeedback[concept.id];
    const feedbackCurrent = draft.conceptAnswers[concept.id] === work.draft.conceptAnswers[concept.id];
    return <article key={concept.id} id={`concept-${concept.id}`}><header className={conceptStyles.heading}><div className={conceptStyles.meta}><span className={conceptStyles.eyebrow}>개념 {String(index + 1).padStart(2, "0")} / {String(lesson.concepts.length).padStart(2, "0")}</span>{solved && <span className={styles.solved}><Check size={15} aria-hidden="true" />완료</span>}</div><h3 id={`concept-title-${concept.id}`} tabIndex={-1}>{concept.title}</h3><p className={styles.explanation}>{concept.explanation}</p></header><div className={conceptStyles.surface}><ConceptVisual conceptId={concept.id} /><div className={styles.example}><span>예를 들어 볼까요?</span><p>{concept.example}</p></div>
      {reviewType && <div className={styles.experienceBlock} data-concept-experience><header className={styles.experienceHeading}><strong>개념 체험</strong><Button id="concept-experience-reset" variant="ghost" aria-label="체험 초기화" title="체험값만 초기화 · 답안과 완료 기록 유지" onClick={onResetExperience}><RotateCcw size={16} aria-hidden="true" />체험 초기화</Button></header><ReviewConcepts key={`${concept.id}-${experienceVersion}`} type={reviewType} conceptId={concept.id} mode={mode} /></div>}
      </div><div className={`${styles.checkArea} ${conceptStyles.check}`}><AnswerChoices question={concept.question} answer={draft.conceptAnswers[concept.id]} disabled={locked || solved} onChange={(answer) => update({ ...draft, conceptAnswers: { ...draft.conceptAnswers, [concept.id]: answer } })} /><Hint hint={concept.question.hint} />
        {feedback && feedbackCurrent && <p id={`concept-feedback-${concept.id}`} tabIndex={-1} role="status" className={feedback.correct ? styles.feedbackGood : styles.feedbackRetry}>{feedback.correct && <Check size={16} />}<span><strong>{feedback.correct ? "맞았어요." : "다시 생각해 보기"}</strong> {feedback.message}</span></p>}
        {feedback && feedbackCurrent && <p className={styles.smallNote}>{mode === "preview" ? "확인 결과는 이 창에만 남아요." : "확인 결과는 저장 버튼 없이 바로 저장돼요."}</p>}
        {!solved && <Button disabled={actionLocked || !draft.conceptAnswers[concept.id]} onClick={() => void runAction({ type: "check-concept", conceptId: concept.id }, [`concept-next-${concept.id}`, `concept-feedback-${concept.id}`])}>{busy ? "확인 중…" : "정답 확인"}</Button>}
      </div><div className={conceptStyles.footer}><Button variant="ghost" disabled={locked || index === 0} onClick={() => onSelectConcept(lesson.concepts[index - 1].id)}><ArrowLeft size={16} />이전 개념</Button>{index < lesson.concepts.length - 1 ? <Button id={solved ? `concept-next-${concept.id}` : undefined} aria-describedby={solved && feedback && feedbackCurrent ? `concept-feedback-${concept.id}` : undefined} variant={solved ? "default" : "ghost"} disabled={locked} onClick={() => onSelectConcept(lesson.concepts[index + 1].id)}>다음 개념<ArrowRight size={16} /></Button> : <Button id={solved ? `concept-next-${concept.id}` : undefined} aria-describedby={solved && feedback && feedbackCurrent ? `concept-feedback-${concept.id}` : undefined} disabled={actionLocked} onClick={() => void switchStage("quiz")}>퀴즈로 이동<ArrowRight size={16} /></Button>}</div></article>;
  })}</div>
  </div>
</section>;
}
