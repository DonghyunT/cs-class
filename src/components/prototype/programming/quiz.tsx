"use client";

import { ArrowLeft, ArrowRight, Check, Lightbulb, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { questions, type PrototypeState } from "@/lib/prototype/programming";
import styles from "./programming.module.css";

export function Quiz({ state, update, focus, next }: { state: PrototypeState; update: (next: PrototypeState) => void; focus: (id: string) => void; next: () => void }) {
  const quiz = state.quiz;
  const question = questions.find((q) => q.id === quiz.ids[quiz.index])!;
  const complete = quiz.solved.length === questions.length;
  function move(index: number) { update({ ...state, quiz: { ...quiz, index } }); focus("quiz-title"); }
  function grade() {
    const solved = [...new Set([...quiz.solved, ...quiz.ids.filter((id) => quiz.answers[id] === questions.find((q) => q.id === id)?.correct)])];
    update({ ...state, quiz: { ...quiz, solved, graded: true } }); focus("quiz-result");
  }
  function retry() {
    const ids = questions.filter((q) => !quiz.solved.includes(q.id)).map((q) => q.id);
    const answers = Object.fromEntries(Object.entries(quiz.answers).filter(([id]) => quiz.solved.includes(id)));
    update({ ...state, quiz: { ...quiz, ids, answers, index: 0, graded: false, round: quiz.round + 1 } }); focus("quiz-title");
  }
  return <div className={styles.quizLayout}>
    <div className={styles.sectionHeading}><span className={styles.eyebrow}>QUIZ · {quiz.round === 1 ? "첫 번째 도전" : `다시 도전 · ${quiz.round}회차`}</span><h2 id="quiz-title" tabIndex={-1}>{quiz.graded ? complete ? "다섯 가지 생각을 연결했어요" : "헷갈렸던 부분을 찾아볼까요?" : "이번에는 네가 판단할 차례"}</h2><p>{quiz.graded ? "해설을 보고 필요한 개념으로 돌아가도 좋아요." : "다섯 문제를 풀고 결과를 확인해요. 틀린 문제는 다시 도전할 수 있어요."}</p></div>
    {quiz.graded ? <section className={styles.quizResult}>
      <div className={styles.resultHero}><div className={styles.resultRing}>{quiz.solved.length}<small>/ {questions.length}</small></div><div><span className={styles.eyebrow}>지금까지 해결한 문제</span><h3 id="quiz-result" tabIndex={-1}>{complete ? "실습할 준비가 됐어요!" : `${questions.length - quiz.solved.length}문제, 한 번 더 생각해봐요`}</h3><p>{complete ? "배운 내용을 내 프로그램으로 만들어 보세요." : "맞힌 문제는 남겨두고, 틀린 문제만 다시 풀어요."}</p></div></div>
      <div className={styles.reviewList}>{quiz.ids.map((id) => { const q = questions.find((q) => q.id === id)!; const correct = quiz.answers[id] === q.correct; return <article key={id}><span className={correct ? styles.goodBadge : styles.retryBadge}>{correct ? <Check size={15} /> : <RotateCcw size={15} />}{correct ? "해결" : "다시 생각"}</span><div><h4>{q.prompt}</h4><p>내 선택: {q.options[quiz.answers[id]]}</p><strong>{q.explanation}</strong></div></article>; })}</div>
      <div className={styles.footer}>{!complete && <Button onClick={retry}><RotateCcw size={16} />틀린 문제만 다시 풀기</Button>}<Button variant={complete ? "default" : "outline"} onClick={next}>실습으로 이동<ArrowRight size={16} /></Button></div>
    </section> : <>
      <nav className={styles.questionDots} aria-label="퀴즈 문항">{quiz.ids.map((id, index) => <button type="button" key={id} aria-label={`${index + 1}번 문제${quiz.answers[id] !== undefined ? " · 선택 완료" : ""}`} aria-current={index === quiz.index ? "step" : undefined} data-answered={quiz.answers[id] !== undefined} onClick={() => move(index)}>{quiz.answers[id] !== undefined ? <Check size={17} /> : String(index + 1).padStart(2, "0")}</button>)}<span>{quiz.index + 1} / {quiz.ids.length} · {question.topic}</span></nav>
      <article className={styles.questionCard} key={question.id}><div className={styles.questionScene}>{question.scene.map((line, i) => <div key={line}><span>{String(i + 1).padStart(2, "0")}</span><code>{line}</code></div>)}</div>
        <fieldset><legend>{question.prompt}</legend><div className={styles.quizOptions}>{question.options.map((option, i) => <label key={option} data-selected={quiz.answers[question.id] === i}><input type="radio" name={question.id} checked={quiz.answers[question.id] === i} onChange={() => update({ ...state, quiz: { ...quiz, answers: { ...quiz.answers, [question.id]: i } } })} /><span className={styles.optionLetter}>{String.fromCharCode(65 + i)}</span><strong>{option}</strong><span className={styles.selectedCheck} aria-hidden="true">{quiz.answers[question.id] === i && <Check size={18} />}</span></label>)}</div></fieldset>
        <details className={styles.hint}><summary><Lightbulb size={17} />작은 힌트</summary><p>{question.hint}</p></details>
      </article>
      <div className={styles.footer}><Button variant="ghost" disabled={quiz.index === 0} onClick={() => move(quiz.index - 1)}><ArrowLeft size={16} />이전 문제</Button>{quiz.index < quiz.ids.length - 1 ? <Button disabled={quiz.answers[question.id] === undefined} onClick={() => move(quiz.index + 1)}>다음 문제<ArrowRight size={16} /></Button> : <Button disabled={quiz.ids.some((id) => quiz.answers[id] === undefined)} onClick={grade}>이번 도전 결과 보기<Check size={16} /></Button>}</div>
    </>}
  </div>;
}
