"use client";

import { useState } from "react";
import { ArrowLeft, Check, Lightbulb, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { blockLabels, missions, signalLabels, type Block, type Inputs, type RunResult } from "@/lib/prototype/programming";
import styles from "./programming.module.css";

const snapshotValueLabels: Record<string, string> = { ...signalLabels, name: "이름", a: "A의 값", b: "B의 값", answer: "내 이름은 [대답]", multiply: "A × B", average: "(A + B) ÷ 2" };

export type HelpContext = { mission: number; program: Block[]; inputs: Inputs; result: RunResult | null };
export type HelpRequest = HelpContext & { expected: string; observed: string; status: "requested" | "replied" | "resolved"; reply: string };

export function HelpPanel({ open, context, request, setRequest, close, teacher, focus }: { open: boolean; context: HelpContext | null; request: HelpRequest | null; setRequest: (request: HelpRequest) => void; close: () => void; teacher: () => void; focus: (id: string) => void }) {
  const [drafts, setDrafts] = useState<Record<number, { expected: string; observed: string }>>({});
  if (!context || !open) return null;
  const mission = missions[context.mission];
  const draft = drafts[context.mission] ?? { expected: mission.goal, observed: context.result?.error || context.result?.frames.at(-1)?.message || "실행하기 전부터 어디에 연결할지 모르겠어요." };
  const currentRequest = request?.mission === context.mission ? request : null;
  return <aside className={styles.helpPanel} aria-labelledby="help-title"><div className={styles.helpTop}><div><span className={styles.eyebrow}>도움 주고받기 · 체험</span><h2 id="help-title" tabIndex={-1}><Lightbulb size={21} />같이 다음 한 걸음을 찾자</h2></div><button type="button" aria-label="도움 닫기" className={styles.iconButton} onClick={close}><X size={20} /></button></div>
    <p>현재 미션과 코드를 함께 볼 수 있어요. 이 체험의 요청은 실제 선생님에게 전송되지 않아요. 요청·답변은 새로고침하면 사라져요.</p>
    <details className={styles.hint}><summary><Lightbulb size={17} />먼저 해볼 작은 실험</summary><p>{mission.hint}</p><p>블록 하나를 바꾸고 다시 실행해 보세요. 실행 발자국에서 값이 바뀌는 순간을 찾을 수 있어요.</p></details>
    {currentRequest ? <div className={styles.helpConversation}>
      <span className={currentRequest.status === "resolved" ? styles.goodBadge : styles.retryBadge}>{currentRequest.status === "resolved" ? "내가 해결 표시함" : currentRequest.status === "replied" ? "교사 체험에서 답변을 남김" : "요청 예시가 준비됨"}</span>
      <p><strong>내가 원한 결과</strong>{currentRequest.expected}</p><p><strong>지금 생긴 일</strong>{currentRequest.observed}</p>
      {currentRequest.reply && <div className={styles.teacherReply}><MessageCircle size={18} /><div><strong>선생님 피드백 · 체험</strong><p>{currentRequest.reply}</p></div></div>}
      {currentRequest.status === "replied" && <Button variant="outline" onClick={() => { setRequest({ ...currentRequest, status: "resolved" }); focus("help-title"); }}><Check size={16} />다시 해보고 해결했어요</Button>}
      <Button variant="ghost" onClick={teacher}>요청받은 선생님 화면 보기</Button>
    </div> : <form onSubmit={(e) => { e.preventDefault(); setRequest({ ...context, ...draft, status: "requested", reply: "" }); focus("help-title"); }}>
      <label>어떻게 되면 좋겠어?<textarea required maxLength={200} value={draft.expected} onChange={(e) => setDrafts({ ...drafts, [context.mission]: { ...draft, expected: e.target.value } })} /></label><label>지금은 어떤 일이 생겼어?<textarea required maxLength={200} value={draft.observed} onChange={(e) => setDrafts({ ...drafts, [context.mission]: { ...draft, observed: e.target.value } })} /></label><p className={styles.smallText}>도움을 연 순간의 블록 {context.program.length}개와 실행 기록이 함께 붙어요.</p><Button type="submit"><Send size={16} />도움 요청 체험하기</Button>
    </form>}
  </aside>;
}

export function TeacherView({ request, setRequest, currentProgram, student, focus }: { request: HelpRequest | null; setRequest: (request: HelpRequest) => void; currentProgram: Block[]; student: () => void; focus: (id: string) => void }) {
  const [reply, setReply] = useState("");
  const mission = request ? missions[request.mission] : null;
  return <div className={styles.teacherView}><div className={styles.sectionHeading}><span className={styles.eyebrow}>TEACHER VIEW · 현재 체험의 요청 {request ? 1 : 0}건</span><h2 id="teacher-title" tabIndex={-1}>학생이 해본 것부터 살펴봐요</h2><p>학생 화면에서 만든 요청을 함께 보는 체험이에요. 실제 반이나 학생 기록을 조회하지 않아요. 요청·답변은 새로고침하면 사라져요.</p></div>
    {!request ? <div className={styles.emptyTeacher}><MessageCircle size={52} /><h3>아직 도움 요청이 없어요</h3><p>실습에서 ‘막혔어요’를 눌러 요청을 만든 뒤 이 화면을 살펴보세요.</p><Button onClick={student}><ArrowLeft size={16} />학생 체험으로 돌아가기</Button></div> : <>
      <div className={styles.teacherContext}><section><span className={styles.retryBadge}>{request.status === "resolved" ? "학생이 해결 표시함" : request.status === "replied" ? "피드백을 남긴 요청" : "도움이 필요한 요청"}</span><h3>{mission?.title}</h3><p><strong>원한 결과</strong>{request.expected}</p><p><strong>생긴 일</strong>{request.observed}</p><div className={styles.snapshotInputs}><span>이름: {request.inputs.name}</span><span>A: {request.inputs.a} · B: {request.inputs.b}</span></div></section><section><h3>요청 당시의 코드</h3>{JSON.stringify(currentProgram) !== JSON.stringify(request.program) && <p className={styles.feedback}>요청 뒤 학생이 코드를 바꿨어요. 아래는 요청 당시의 작업이에요.</p>}<ol className={styles.snapshotBlocks}>{request.program.map((b) => <li key={b.id} data-kind={b.kind}><strong>{blockLabels[b.kind]}</strong><span>{b.kind === "direction" ? `${b.value}°` : b.kind === "move" ? (b.value.trim() ? `${b.value}만큼` : "입력 중") : snapshotValueLabels[b.value] ?? b.value}</span></li>)}</ol><h4>마지막 실행</h4><p>{request.result?.error || request.result?.frames.at(-1)?.message || "아직 실행 기록이 없어요."}</p><details className={styles.trace}><summary>실행 발자국 보기</summary><ol>{request.result?.frames.map((step, i) => <li key={`${step.blockId}-${i}`}><span>{i + 1}</span>{step.message}</li>)}</ol></details></section></div>
      <form className={styles.teacherFeedback} onSubmit={(e) => { e.preventDefault(); if (reply.trim()) { setRequest({ ...request, reply: reply.trim(), status: "replied" }); focus("teacher-feedback-result"); } }}><label htmlFor="teacher-reply">다음에 해볼 행동을 짧게 남겨주세요</label><textarea id="teacher-reply" required maxLength={300} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="예: A를 묻는 블록 바로 아래에 A에 저장하기를 넣어보자. 그다음 B를 물어봐." /><div><Button variant="outline" type="button" onClick={() => setReply(mission?.hint ?? "")}>피드백 예시 넣기</Button><Button type="submit" disabled={!reply.trim()}><Send size={16} />학생 화면에 피드백 남기기</Button></div>{request.reply && <p id="teacher-feedback-result" tabIndex={-1} role="status" className={styles.good}>이 체험의 학생 화면에 피드백을 남겼어요.</p>}</form><div className={styles.footer}><Button variant="outline" onClick={student}><ArrowLeft size={16} />학생이 받은 피드백 보기</Button></div>
    </>}
  </div>;
}
