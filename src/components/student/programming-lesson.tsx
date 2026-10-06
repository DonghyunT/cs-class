"use client";

import { useState, type RefObject } from "react";
import { ArrowLeft, ArrowRight, Check, Lightbulb, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Concept } from "@/components/prototype/programming/concept";
import { initialState, questions } from "@/lib/prototype/programming";
import { buildProgrammingProject, missionById, programmingMissions } from "@/lib/classroom/programming-entry";
import type { Lesson, WorkAction, WorkDraft } from "@/lib/classroom/types";
import { EntryPracticeWorkspace } from "./entry-practice-workspace";
import type { useWork } from "./use-work";
import styles from "./programming-lesson.module.css";

type Props = { lesson: Lesson; controller: ReturnType<typeof useWork>; locked: boolean; runAction: (action: WorkAction, focusId: string) => Promise<void>; focus: (id: string) => void; next: (stage: WorkDraft["stage"]) => void; exportRef: RefObject<(() => Promise<string | null>) | null>; workspaceWide: boolean; onWorkspaceWideChange: (wide: boolean) => void; saveLabel: string; conceptId: string; quizQuestionId: string; onConceptChange: (id: string) => void; onQuizQuestionChange: (id: string) => void };

export function ProgrammingLearningStage(props: Props) {
  const { controller, locked } = props;
  const { draft } = controller;
  return <section id={`panel-${draft.stage}`} role="tabpanel" aria-labelledby={`tab-${draft.stage}`} className={styles.panel}>
    <h2 id={`stage-heading-${draft.stage}`} tabIndex={-1} className={styles.srOnly}>{draft.stage === "concept" ? "직접 실험하고 생각해요" : draft.stage === "quiz" ? "배운 내용을 적용해요" : "네 가지 미션에 도전해요"}</h2>
    {draft.stage === "concept" ? <ProgrammingConcept {...props} /> : draft.stage === "quiz" ? <ProgrammingQuiz {...props} /> : <ProgrammingPractice {...props} />}
    {draft.stage === "practice" && <div className={styles.reflection}><label htmlFor="programming-reflection">오늘 발견한 것을 한 줄로 남겨볼까요?</label><textarea id="programming-reflection" maxLength={500} disabled={locked} placeholder="예: 첫 대답을 A에 저장해야 두 번째 질문 뒤에도 남아요." value={draft.programming?.reflection ?? ""} onChange={(e) => { const current = controller.getDraft(); if (current.programming) controller.update({ ...current, programming: { ...current.programming, reflection: e.target.value } }); }} /><p>내 작품과 함께 저장돼요. 다음 수업에도 이어갈 수 있어요.</p></div>}
  </section>;
}

function ProgrammingConcept({ lesson, controller, locked, focus, runAction, next, conceptId, onConceptChange }: Props) {
  const { work, draft, update } = controller;
  const [base] = useState(initialState);
  const index = Math.max(0, lesson.concepts.findIndex((concept) => concept.id === conceptId));
  const id = lesson.concepts[index].id;
  const state = { ...base, concept: index, conceptDone: [0, 1, 2, 3].filter((i) => work.conceptSolved.includes(`pc${i}`)), conceptAnswers: Object.fromEntries(Object.entries(draft.conceptAnswers).map(([key, answer]) => [Number(key.slice(2)), Number(answer)])) };
  return <Concept state={state} locked={locked} focus={focus} next={() => next("quiz")} update={(value) => {
    if (locked) return;
    onConceptChange(lesson.concepts[value.concept].id);
    if (JSON.stringify(value.conceptAnswers) !== JSON.stringify(state.conceptAnswers)) update({ ...controller.getDraft(), conceptAnswers: Object.fromEntries(Object.entries(value.conceptAnswers).map(([key, answer]) => [`pc${key}`, String(answer)])) });
  }} onCheck={() => void runAction({ type: "check-concept", conceptId: id }, "concept-feedback")} serverFeedback={draft.conceptAnswers[id] === work.draft.conceptAnswers[id] ? work.conceptFeedback[id]?.message : undefined} />;
}

function ProgrammingQuiz({ lesson, controller, locked, runAction, next, focus, quizQuestionId, onQuizQuestionChange }: Props) {
  const { work, draft, update } = controller;
  const ids = work.quizRoundIds;
  const position = Math.max(0, ids.indexOf(quizQuestionId));
  const q = lesson.quiz.find((question) => question.id === ids[position])!;
  const scene = questions.find((question) => question.id === q.id);
  const complete = work.quizSolved.length === lesson.quiz.length;
  const remaining = ids.filter((id) => !draft.quizAnswers[id]).length;
  const move = (value: number) => { onQuizQuestionChange(ids[value]); focus("programming-question"); };
  return <div className={styles.quiz}>
    <nav className={styles.questionNav} aria-label="퀴즈 문항 목록">{ids.map((id, i) => <button key={id} type="button" disabled={locked} aria-current={i === position ? "step" : undefined} onClick={() => move(i)}>문제 {lesson.quiz.findIndex((question) => question.id === id) + 1}<span>{work.quizRoundGraded ? work.quizFeedback[id]?.correct ? "해결" : "재도전" : draft.quizAnswers[id] ? "답변" : "미답변"}</span></button>)}</nav>
    <div className={styles.heading}><div><span>QUIZ · {position + 1} / {ids.length}</span><h3 id="programming-question" tabIndex={-1}>{q.prompt}</h3></div><strong>{work.quizSolved.length}/{lesson.quiz.length} 해결</strong></div>
    <div className={styles.scene}>{scene?.scene.map((line) => <code key={line}>{line}</code>)}</div>
    <fieldset disabled={locked || work.quizRoundGraded} className={styles.choices}><legend className={styles.srOnly}>{q.prompt}</legend>{q.options.map((option) => <label key={option.id} data-selected={draft.quizAnswers[q.id] === option.id}><input type="radio" name={`programming-${q.id}`} checked={draft.quizAnswers[q.id] === option.id} onChange={() => update({ ...controller.getDraft(), quizAnswers: { ...controller.getDraft().quizAnswers, [q.id]: option.id } })} /><span>{option.label}</span></label>)}</fieldset>
    <details key={`${work.quizRound}-${q.id}`} className={styles.hint}><summary><Lightbulb size={17} />작은 힌트</summary><p>{q.hint}</p></details>
    {work.quizRoundGraded && <p role="status" className={styles.feedback}>{work.quizFeedback[q.id]?.correct && <Check size={16} />}{work.quizFeedback[q.id]?.message}</p>}
    <div className={styles.footer}><Button variant="ghost" disabled={locked || position === 0} onClick={() => move(position - 1)}><ArrowLeft size={16} />이전 문제</Button><Button disabled={locked || position === ids.length - 1} variant="outline" onClick={() => move(position + 1)}>다음 문제<ArrowRight size={16} /></Button></div>
    {!work.quizRoundGraded && <div className={styles.result}><p>{remaining ? `${remaining}문항이 미답변이에요.` : "모든 답을 선택했어요."}</p><div>{remaining > 0 && <Button variant="outline" disabled={locked} onClick={() => move(ids.findIndex((id) => !draft.quizAnswers[id]))}>답하지 않은 문제로 이동</Button>}<Button disabled={locked || remaining > 0} onClick={() => void runAction({ type: "grade-quiz" }, "programming-quiz-result")}>이번 문제 결과 확인</Button></div></div>}
    {work.quizRoundGraded && <div id="programming-quiz-result" tabIndex={-1} className={styles.result}><strong>{complete ? "모든 문제를 해결했어요!" : `전체 ${work.quizSolved.length}/${lesson.quiz.length}문항 해결 · ${lesson.quiz.length - work.quizSolved.length}문제에 다시 도전해요.`}</strong><nav className={styles.questionNav} aria-label="재도전 문항 바로가기">{ids.filter((id) => !work.quizFeedback[id]?.correct).map((id) => <button key={id} type="button" disabled={locked} onClick={() => move(ids.indexOf(id))}>문제 {lesson.quiz.findIndex((question) => question.id === id) + 1} 해설 보기</button>)}</nav><div>{!complete && <Button variant="outline" disabled={locked} onClick={() => void runAction({ type: "retry-quiz" }, "programming-question")}><RotateCcw size={16} />틀린 문제만 다시 풀기</Button>}<Button disabled={locked} onClick={() => next("practice")}>실습으로 이동<ArrowRight size={16} /></Button></div></div>}
    {!work.quizRoundGraded && <Button variant="ghost" disabled={locked} onClick={() => next("practice")}>먼저 실습해 보기<ArrowRight size={16} /></Button>}
  </div>;
}

function ProgrammingPractice({ lesson, controller, locked, runAction, focus, exportRef, workspaceWide, onWorkspaceWideChange, saveLabel }: Props) {
  const { work, draft, update } = controller;
  const [switching, setSwitching] = useState(false);
  const mission = missionById(draft.programming?.mission ?? "name")!;
  const current = work.missions?.[mission.id] ?? { validation: null, submission: null };
  const raw = draft.programming?.projects[mission.id] ?? buildProgrammingProject();
  async function select(id: string) {
    if (locked || switching || id === mission.id) return;
    setSwitching(true);
    try {
      if (!await controller.flush(true)) return;
      const current = controller.getDraft();
      if (!current.programming) return;
      const projects = { ...current.programming.projects };
      if (!projects[id]) projects[id] = id === "keys" ? projects.move ?? buildProgrammingProject() : buildProgrammingProject();
      update({ ...current, programming: { ...current.programming, mission: id, projects } });
      if (await controller.flush()) focus("programming-mission-title");
    } finally { setSwitching(false); }
  }
  return <div className={styles.practice}>
    <nav className={styles.missions} aria-label="실습 미션">{programmingMissions.map((m, i) => <button key={m.id} type="button" aria-current={m.id === mission.id ? "step" : undefined} disabled={locked || switching} onClick={() => void select(m.id)}><span>{work.missions?.[m.id]?.submission ? <Check size={17} /> : "optional" in m ? "＋" : `0${i + 1}`}</span><strong>{m.title}</strong><small>{work.missions?.[m.id]?.submission ? "제출 완료" : "optional" in m ? "선택 도전" : m.id === "keys" ? "앞 작품에 추가" : "독립 작품"}</small></button>)}</nav>
    <div className={styles.heading}><div><span>{"optional" in mission ? "선택 도전 · 기본 완료 조건에 포함되지 않아요" : `MISSION 0${programmingMissions.findIndex((m) => m.id === mission.id) + 1}`}</span><h3 id="programming-mission-title" tabIndex={-1}>{mission.title}</h3><p>{mission.goal}</p></div></div>
    {mission.id === "keys" && <p className={styles.carry}>앞 미션의 작품이 있으면 처음 시작할 때 가져와요. 아직 없다면 시작 블록에서 만들 수 있어요. 각 미션의 저장본과 제출본은 따로 유지돼요.</p>}
    <details className={styles.hint}><summary><Lightbulb size={17} />먼저 해볼 작은 실험</summary><p>{mission.experiment}</p><p>{mission.hint}</p></details>
    <EntryPracticeWorkspace key={mission.id} mission={mission} lesson={lesson} work={{ ...work, validation: current.validation, submission: current.submission }} draft={{ ...draft, entryProject: raw, practiceOrder: [] }} locked={locked || switching} busy={controller.busy} exportRef={exportRef} runAction={runAction} workspaceWide={workspaceWide} onWorkspaceWideChange={onWorkspaceWideChange} saveLabel={saveLabel} saveState={controller.saveState} update={(next) => {
      const current = controller.getDraft();
      if (current.programming && next.entryProject) update({ ...current, programming: { ...current.programming, projects: { ...current.programming.projects, [mission.id]: next.entryProject } } });
    }} />
    <div className={styles.footer}><p>다른 미션으로 이동하기 전에 현재 작품의 저장을 확인해요.</p>{mission.id !== "average" && <Button variant="outline" disabled={locked || switching} onClick={() => void select(programmingMissions[programmingMissions.findIndex((m) => m.id === mission.id) + 1].id)}>다음 미션<ArrowRight size={16} /></Button>}</div>
  </div>;
}
