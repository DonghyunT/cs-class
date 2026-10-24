"use client";

import { useState, type RefObject } from "react";
import { ArrowLeft, ArrowRight, Check, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgrammingConcept as ProgrammingConceptView } from "./programming-concept";
import { concepts } from "@/lib/classroom/programming-data";
import { PALETTE_TEXT, blockLabel, missionBlockTypes } from "@/lib/classroom/entry-palette";
import { entryBlockCategory, hintParts, missionStarter, missionsFor } from "@/lib/classroom/programming-entry";
import { practiceMatches } from "@/lib/classroom/progress";
import type { Lesson, WorkAction, WorkDraft } from "@/lib/classroom/types";
import { EntryPracticeWorkspace } from "./entry-practice-workspace";
import { PracticeGuidance } from "./practice-guidance";
import type { WorkController, LessonMode } from "./work-controller";
import styles from "./programming-lesson.module.css";

type Props = { lesson: Lesson; controller: WorkController; mode?: LessonMode; locked: boolean; runAction: (action: WorkAction, focusId: string | readonly string[]) => Promise<void>; focus: (id: string) => void; next: (stage: WorkDraft["stage"]) => void; exportRef: RefObject<(() => Promise<string | null>) | null>; workspaceWide: boolean; practiceFocused: boolean; onWorkspaceWideChange: (wide: boolean) => void; saveLabel: string; conceptId: string; onConceptChange: (id: string) => void; onEditorReady?: (ready: boolean) => void };

// Hint text with its block chips coloured by Entry category; screen readers read the chips as plain words.
// ▾ has a wide glyph box, so it gets a trimmed span to read ‘A▾를’ as one word.
const HintText = ({ text }: { text: string }) => <>{hintParts(text).map((part, i) => typeof part === "string" ? part.split("▾").flatMap((plain, k) => k ? [<span key={`${i}-${k}`} className={styles.caret}>▾</span>, plain] : [plain]) : <span key={i} className={styles.blockChip} data-category={entryBlockCategory(part.type)}>{part.text}</span>)}</>;

// The first programming lesson keeps its hands-on concept screen; its quiz and later lessons use the shared panels.
export const hasCustomLearning = (lesson: Lesson) => lesson.id === "programming-13";

export function ProgrammingLearningStage(props: Props) {
  const { controller, locked, lesson } = props;
  const { draft } = controller;
  if (draft.stage === "quiz" || draft.stage === "concept" && !hasCustomLearning(lesson)) return null;
  return <section id={`panel-${draft.stage}`} role="tabpanel" aria-labelledby={`tab-${draft.stage}`} className={styles.panel}>
    <h2 id={`stage-heading-${draft.stage}`} tabIndex={-1} className={styles.srOnly}>{draft.stage === "concept" ? "직접 실험하고 생각해요" : "실습 미션에 도전해요"}</h2>
    {draft.stage === "concept" ? <ProgrammingConcept {...props} /> : <ProgrammingPractice {...props} />}
    {draft.stage === "practice" && <div className={styles.reflection}><label htmlFor="programming-reflection">오늘 발견한 것을 한 줄로 남겨볼까요?</label><textarea id="programming-reflection" maxLength={500} disabled={locked} placeholder="예: 첫 대답을 A에 저장해야 두 번째 질문 뒤에도 남아요." value={draft.programming?.reflection ?? ""} onChange={(e) => { const current = controller.getDraft(); if (current.programming) controller.update({ ...current, programming: { ...current.programming, reflection: e.target.value } }); }} /><p>{props.mode === "preview" ? "이 창의 체험에만 남아요." : "내 작품과 함께 저장돼요. 다음 수업에도 이어갈 수 있어요."}</p></div>}
  </section>;
}

function ProgrammingConcept({ lesson, controller, locked, focus, runAction, next, conceptId, onConceptChange, mode = "student" }: Props) {
  const { work, draft, update } = controller;
  const id = lesson.concepts.find((concept) => concept.id === conceptId)?.id ?? lesson.concepts[0].id;
  const index = Number(id.slice(2));
  const state = {
    concept: index,
    conceptDone: concepts.map((_, i) => i).filter((i) => work.conceptSolved.includes(`pc${i}`)),
    conceptAnswers: Object.fromEntries(Object.entries(draft.conceptAnswers).map(([key, answer]) => [Number(key.slice(2)), Number(answer)])),
  };
  return <ProgrammingConceptView mode={mode} state={state} locked={locked} actionsBlocked={controller.actionBlocked} focus={focus} next={() => next("quiz")} update={(value) => {
    if (locked) return;
    onConceptChange(`pc${value.concept}`);
    if (JSON.stringify(value.conceptAnswers) !== JSON.stringify(state.conceptAnswers)) update({ ...controller.getDraft(), conceptAnswers: Object.fromEntries(Object.entries(value.conceptAnswers).map(([key, answer]) => [`pc${key}`, String(answer)])) });
  }} onCheck={() => void runAction({ type: "check-concept", conceptId: id }, ["concept-next", "concept-feedback"])} serverFeedback={draft.conceptAnswers[id] === work.draft.conceptAnswers[id] ? work.conceptFeedback[id]?.message : undefined} serverCorrect={work.conceptFeedback[id]?.correct} retryConcepts={concepts.map((_, i) => i).filter((i) => !work.conceptSolved.includes(`pc${i}`) && work.conceptFeedback[`pc${i}`]?.correct === false)} />;
}

function ProgrammingPractice({ lesson, controller, locked, runAction, focus, exportRef, workspaceWide, practiceFocused, onWorkspaceWideChange, saveLabel, mode = "student", onEditorReady }: Props) {
  const { work, draft, update } = controller;
  const [switching, setSwitching] = useState(false);
  const missions = missionsFor(lesson.id);
  // A mission that left this lesson (or an unknown id) opens the first one instead.
  const mission = missions.find((item) => item.id === draft.programming?.mission) ?? missions[0];
  const current = work.missions?.[mission.id] ?? { validation: null, submission: null };
  const raw = draft.programming?.projects[mission.id] ?? missionStarter(mission.id);
  const position = missions.indexOf(mission);
  const previousMission = missions[position - 1], nextMission = missions[position + 1];
  const submitted = practiceMatches({ ...draft, entryProject: raw, practiceOrder: [] }, current.submission);
  const moveMessage = submitted
    ? nextMission ? `${mode === "preview" ? "체험 제출 확인" : "제출 완료"}! 다음 미션에도 도전해 보세요.`
      : `${mode === "preview" ? "이 미션의 체험 제출을 확인했어요" : "이 미션의 작품을 제출했어요"}. 이전 미션을 돌아보거나 아래에 발견한 점을 남겨 보세요.`
    : mode === "preview" ? "이동하기 전 입력은 이 창에 유지돼요." : "이동하기 전 입력은 이 화면에 유지돼요. 서버에 남기려면 저장을 눌러주세요.";
  function runPracticeAction(action: WorkAction, focusId: string) {
    return runAction(action, action.type === "submit-practice" ? nextMission ? "programming-next-mission" : "programming-mission-complete" : focusId);
  }
  async function select(id: string) {
    if (locked || switching || controller.capturing || id === mission.id) return;
    setSwitching(true);
    try {
      await controller.captureDraft();
      const current = controller.getDraft();
      if (!current.programming) return;
      const projects = { ...current.programming.projects };
      if (!projects[id]) projects[id] = missionStarter(id);
      update({ ...current, programming: { ...current.programming, mission: id, projects } });
      focus("programming-mission-title");
    } catch { /* captureDraft keeps the current editor and reports the failure. */ }
    finally { setSwitching(false); }
  }
  return <div className={styles.practice} data-practice-focused={practiceFocused}>
    <PracticeGuidance focused={practiceFocused} label="미션 바꾸기"><nav className={styles.missions} aria-label="실습 미션">{missions.map((m, i) => <button key={m.id} type="button" aria-current={m.id === mission.id ? "step" : undefined} disabled={locked || switching || controller.capturing || controller.actionBlocked} onClick={() => void select(m.id)}><span>{work.missions?.[m.id]?.submission ? <Check size={17} /> : m.optional ? "＋" : `0${i + 1}`}</span><strong>{m.title}</strong><small>{work.missions?.[m.id]?.submission ? mode === "preview" ? "체험 제출 확인" : "제출 완료" : m.optional ? "선택 도전" : "독립 작품"}</small></button>)}</nav></PracticeGuidance>
    <div className={styles.practiceLayout}>
      <aside className={styles.missionBrief} aria-labelledby="programming-mission-title">
        <div className={styles.heading}><div><span>{mission.optional ? "선택 도전 · 기본 완료 조건에 포함되지 않아요" : `미션 0${position + 1}`}</span><h3 id="programming-mission-title" tabIndex={-1}>{mission.title}</h3><p>{mission.goal}</p></div></div>
        <PracticeGuidance focused={practiceFocused} label="블록 연결 힌트·만든 뒤 확인"><details key={mission.id} className={styles.hint}><summary>블록 연결 힌트 보기</summary><div className={styles.hintBody}><div><p><HintText text={mission.hint} /></p><ol aria-label="조립 순서">{mission.steps.map((step) => <li key={step}><HintText text={step} /></li>)}</ol></div><div>{mission.tip && <p className={styles.tip}><span aria-hidden="true">💡 </span><HintText text={mission.tip} /></p>}<details className={styles.hintBlocks}><summary>이 미션에서 쓸 수 있는 블록</summary><ul>{missionBlockTypes(mission.id).map((type) => <li key={type} className={styles.blockChip} data-category={entryBlockCategory(type)}>{PALETTE_TEXT[type] ?? blockLabel(type)}</li>)}</ul></details></div></div></details>
        <div className={styles.experiment}><h4><Lightbulb size={17} aria-hidden="true" />만든 뒤 확인하기</h4><p>{mission.experiment}</p></div></PracticeGuidance>
      </aside>
      <div className={styles.workArea}>
        <EntryPracticeWorkspace mode={mode} key={mission.id} mission={mission} lesson={lesson} work={{ ...work, validation: current.validation, submission: current.submission }} draft={{ ...draft, entryProject: raw, practiceOrder: [] }} locked={locked || switching || controller.capturing} busy={controller.busy} exportRef={exportRef} onSave={mode === "student" ? controller.save : undefined} onReadyChange={onEditorReady} runAction={runPracticeAction} workspaceWide={workspaceWide} practiceFocused={practiceFocused} onWorkspaceWideChange={onWorkspaceWideChange} saveLabel={saveLabel} saveState={controller.saveState} actionsBlocked={controller.actionBlocked} update={(next) => {
          const current = controller.getDraft();
          if (current.programming && next.entryProject) update({ ...current, programming: { ...current.programming, projects: { ...current.programming.projects, [mission.id]: next.entryProject } } });
        }} />
        <nav className={styles.footer} aria-label="미션 앞뒤 이동" data-submitted={submitted}>
          <Button variant="outline" disabled={locked || switching || controller.capturing || controller.actionBlocked || !previousMission} onClick={() => previousMission && void select(previousMission.id)}><ArrowLeft size={18} aria-hidden="true" />이전 미션</Button>
          <p id="programming-mission-complete" tabIndex={-1} role="status">{moveMessage}</p>
          {nextMission && <Button id="programming-next-mission" className={styles.nextMission} aria-describedby="programming-mission-complete" disabled={locked || switching || controller.capturing || controller.actionBlocked} onClick={() => void select(nextMission.id)}>다음 미션<ArrowRight size={18} aria-hidden="true" /></Button>}
        </nav>
      </div>
    </div>
  </div>;
}
