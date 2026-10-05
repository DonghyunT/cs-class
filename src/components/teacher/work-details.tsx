"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session-provider";
import { classroomApi } from "@/lib/classroom/client";
import type { Lesson, Work } from "@/lib/classroom/types";
import type { ReviewProject } from "@/lib/classroom/review/project";
import { parseEntryProject, entryInstructionLabel } from "@/lib/classroom/entry-project";
import { programmingMissions, programmingProjectLines } from "@/lib/classroom/programming-entry";
import { replaySandwich } from "@/lib/classroom/review/sandwich-engine.mjs";
import { missions } from "@/lib/classroom/review/flowchart-data.mjs";
import { FlowDiagram } from "@/components/student/review/flow-diagram";
import { dateLabel, problemMessage } from "./presentation";
import styles from "./teacher.module.css";

export function ReviewProjectPreview({ project }: { project: ReviewProject }) {
  if (project.type === "sandwich") {
    const run = replaySandwich(project.commands);
    return <><h3>{run.state.completed ? run.review.title : "샌드위치 실행 기록"}</h3><ol>{project.commands.map(command => <li key={command.id}>{command.text} · {command.source === "rules" ? "규칙 해석" : "AI 해석"}<ul>{command.actions.map((action, i) => <li key={i}>{action}</li>)}</ul></li>)}</ol><p>{run.state.completed && run.review.review}</p></>;
  }
  if (project.type === "abstraction") return <dl>{[["현재 상태", project.current], ["목표", project.goal], ["조건", project.conditions.join(" / ")], ["핵심", project.core.join(" / ")], ["덜어낸 정보", project.noise.join(" / ")], ["해결 계획", project.plans.join(" → ")]].map(([label, value]) => <div key={label}><dt><strong>{label}</strong></dt><dd>{value}</dd></div>)}</dl>;
  if (project.mission !== "free") {
    const mission = missions.find(m => String(m.id) === project.mission);
    return <ol>{mission?.slots.map(slot => <li key={slot.id}>{slot.fixed ? slot.label : mission.palette.find(block => block.id === project.placements[project.mission]?.[slot.id])?.text || "빈 기호"}</li>)}</ol>;
  }
  return <><p>현재: {project.current} / 목표: {project.goal}</p><p>조건: {project.conditions.join(" / ")}</p><h4>기획서</h4><ol>{project.cards.map(card => <li key={card.id}>{card.text}{card.type !== "sequence" && ` · 예: ${card.yes} / 아니오: ${card.no}`}</li>)}</ol><h4>실제 기호와 연결</h4><FlowDiagram nodes={project.nodes} edges={project.edges} /><ol>{project.nodes.map(node => <li key={node.id}>{node.shape} · {node.text}<ul>{project.edges.filter(edge => edge.from === node.id).map((edge, i) => <li key={i}>{edge.label || "다음"} → {project.nodes.find(n => n.id === edge.to)?.text}</li>)}</ul></li>)}</ol></>;
}
export function WorkDetails({ uid, lesson }: { uid: string; lesson: Lesson }) {
  const { session } = useSession();
  const [work, setWork] = useState<Work | null>(null), [error, setError] = useState(""), [attempt, setAttempt] = useState(0), [saving, setSaving] = useState(false), [message, setMessage] = useState("");
  useEffect(() => { let active = true; void classroomApi.detail(uid, lesson.id).then(value => { if (active) { setWork(value); setError(""); } }).catch(error => { if (active) setError(problemMessage(error)); }); return () => { active = false; }; }, [attempt, lesson.id, uid]);
  async function decide(decision: "approve" | "changes") {
    if (!work?.review) return;
    setSaving(true); setError("");
    try { setWork(await classroomApi.decideReview(uid, lesson.id, work.review.id, decision, message, session?.uid)); }
    catch (error) { setError(problemMessage(error)); }
    finally { setSaving(false); }
  }
  const submissions = work ? [...(work.submission ? [{ id: "main", title: lesson.practice.title, submission: work.submission }] : []), ...Object.entries(work.missions ?? {}).flatMap(([id, record]) => record.submission ? [{ id, title: lesson.practice.type === "flowchart" ? id === "free" ? "자유 작품" : missions.find(m => String(m.id) === id)?.title || id : programmingMissions.find(m => m.id === id)?.title || id, submission: record.submission }] : [])] : [];
  return <>
    {error && <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => setAttempt(value => value + 1)}>다시 불러오기</Button></div>}
    {!work && !error && <p role="status">작품 상세를 불러오고 있어요.</p>}
    {work?.review && <section><h3>{work.review.status === "pending" ? "선생님 확인 요청" : work.review.status === "approved" ? "승인한 요청" : work.review.status === "changes" ? "수정 안내" : "대체된 요청"}</h3><p>{dateLabel(work.review.requestedAt)} 요청 · {work.review.message}</p><ReviewProjectPreview project={work.review.project} />{work.review.status === "pending" && <><label className={styles.dialogField}>학생에게 안내<textarea value={message} maxLength={1000} disabled={saving} onChange={event => setMessage(event.target.value)} /></label><div className="flex flex-wrap gap-2"><Button disabled={saving} onClick={() => void decide("approve")}>요청본 승인</Button><Button variant="outline" disabled={saving || !message.trim()} onClick={() => void decide("changes")}>수정 안내 보내기</Button></div><p>학생의 현재 수정본은 유지하고 요청 당시 작품을 처리해요.</p></>}</section>}
    {submissions.map(({ id, title, submission }) => <details key={id} open={submissions.length === 1}><summary>{title} · {dateLabel(submission.submittedAt)} 제출</summary>{submission.reviewProject ? <ReviewProjectPreview project={submission.reviewProject} /> : <ol className={styles.submission}>{(lesson.practice.type === "programming" ? programmingProjectLines(submission.entryProject) : submission.entryProject ? parseEntryProject(submission.entryProject)?.threads.flat().map(entryInstructionLabel) ?? [] : submission.order.map(id => lesson.practice.blocks.find(block => block.id === id)?.label || id)).map((line, i) => <li key={i}><span>{i + 1}</span>{line}</li>)}</ol>}</details>)}
    {!!submissions.length && <p className={styles.dialogNote}>서버에 저장된 최근 제출본이에요. 학생이 수정 중인 내용은 다시 제출하기 전까지 여기에 반영되지 않아요.</p>}
  </>;
}
