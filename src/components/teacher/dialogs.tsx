"use client";

import { useRef, useState } from "react";
import { CheckCircle2, ClipboardCheck, KeyRound, Settings2 } from "lucide-react";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ApiError, classroomApi } from "@/lib/classroom/client";
import type { ClassSettings, Lesson, StudentRow, TeacherDashboard } from "@/lib/classroom/types";
import { dateLabel, problemMessage } from "./presentation";
import styles from "./teacher.module.css";

export function ManageLessons({ classroom, lessons, onSaved, onLock, onRefresh }: {
  classroom: ClassSettings; lessons: Lesson[]; onSaved: (value: ClassSettings) => void; onLock: (value: boolean) => void; onRefresh: () => Promise<TeacherDashboard | null>;
}) {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(classroom);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const [reloading, setReloading] = useState(false);

  async function save() {
    setSaving(true); setError(""); onLock(true);
    try {
      const result = await classroomApi.updateClass(classroom.id, draft.revision, draft.currentLessonId, draft.openedLessonIds, session?.uid);
      onLock(false); onSaved(result); setOpen(false);
    } catch (problem) { setError(problemMessage(problem)); setConflict(problem instanceof ApiError && problem.status === 409); }
    finally { setSaving(false); onLock(false); }
  }

  async function refreshSettings() {
    setReloading(true);
    const latest = await onRefresh();
    if (latest && latest.classroom.id === classroom.id) {
      setDraft((previous) => ({ ...previous, revision: latest.classroom.revision, openedLessonIds: [...new Set([...latest.classroom.openedLessonIds, ...previous.openedLessonIds])] }));
      setConflict(false); setError(""); setRefreshed(true);
    }
    setReloading(false);
  }

  return <Dialog open={open} onOpenChange={(next) => {
    if (saving || reloading) return;
    if (next) { setDraft({ ...classroom, openedLessonIds: [...classroom.openedLessonIds] }); setError(""); setConflict(false); setRefreshed(false); }
    setOpen(next);
  }}>
    <DialogTrigger render={<Button />}><Settings2 size={16} aria-hidden="true" />수업 관리</DialogTrigger>
    <DialogContent className={styles.dialog} showCloseButton={!saving && !reloading}>
      <DialogHeader><DialogTitle>{classroom.name} 수업 관리</DialogTitle><DialogDescription>학생에게 열어 줄 수업과 이번 수업을 정해 주세요. 이미 열린 수업과 학생 작업은 유지돼요.</DialogDescription></DialogHeader>
      <fieldset className={styles.lessonOptions} disabled={saving || reloading}><legend>열린 수업</legend>
        {lessons.length === 0 && <p>지금은 공개할 수업이 없어요.</p>}
        {lessons.map((lesson) => <label key={lesson.id}><input type="checkbox" checked={draft.openedLessonIds.includes(lesson.id)} disabled={classroom.openedLessonIds.includes(lesson.id)} onChange={(event) => setDraft((previous) => ({ ...previous, openedLessonIds: event.target.checked ? [...previous.openedLessonIds, lesson.id] : previous.openedLessonIds.filter((id) => id !== lesson.id), currentLessonId: !event.target.checked && previous.currentLessonId === lesson.id ? null : previous.currentLessonId }))} /><span><strong>{lesson.title}</strong><small>{classroom.openedLessonIds.includes(lesson.id) ? "이미 열린 수업 · 복습 가능" : "선택하면 학생에게 공개돼요"}</small></span></label>)}
      </fieldset>
      <label className={styles.dialogField}>이번 수업<select value={draft.currentLessonId ?? ""} disabled={saving || reloading} onChange={(event) => setDraft((previous) => ({ ...previous, currentLessonId: event.target.value || null }))}><option value="">지정하지 않음</option>{lessons.filter((lesson) => draft.openedLessonIds.includes(lesson.id)).map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></label>
      {error && <p role="alert" className={styles.dialogError}>{error}</p>}
      {conflict && <Button variant="outline" disabled={reloading} onClick={() => void refreshSettings()}>{reloading ? "확인 중…" : "최신 설정 확인 후 다시 적용"}</Button>}
      {refreshed && <p role="status" className={styles.dialogNote}>최신 공개 목록을 반영했어요. 선택한 이번 수업을 확인하고 다시 저장해 주세요.</p>}
      <DialogFooter><Button variant="outline" disabled={saving || reloading} onClick={() => setOpen(false)}>취소</Button><Button disabled={saving || reloading || conflict} onClick={() => void save()}>{saving ? "저장 중…" : "설정 저장"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

export function SubmissionViewer({ student, lesson }: { student: StudentRow; lesson: Lesson }) {
  const submission = student.work?.submission;
  const labels = new Map(lesson.practice.blocks.map((block) => [block.id, block.label]));
  return <Dialog>
    <DialogTrigger render={<Button variant="outline" disabled={!submission} aria-label={`${student.studentId} 제출 작품 보기`} />}><ClipboardCheck size={15} aria-hidden="true" />{submission ? "제출 작품" : "미제출"}</DialogTrigger>
    <DialogContent className={styles.dialog}><DialogHeader><DialogTitle>{student.studentId} 학생의 제출 작품</DialogTitle><DialogDescription>{lesson.title} · {lesson.practice.title}</DialogDescription></DialogHeader>
      {submission && <><p className={styles.submittedTime}><CheckCircle2 size={16} aria-hidden="true" />{dateLabel(submission.submittedAt)} 제출</p><ol className={styles.submission}>{submission.order.map((id, index) => <li key={`${id}-${index}`}><span>{index + 1}</span>{labels.get(id) ?? id}</li>)}</ol>{submission.entryProject && <p className={styles.dialogNote}>엔트리 블록 코딩 프로젝트가 보존되어 있어요.</p>}<p className={styles.dialogNote}>서버에 저장된 최근 제출본이에요. 학생이 수정 중인 내용은 다시 제출하기 전까지 여기에 반영되지 않아요.</p></>}
    </DialogContent>
  </Dialog>;
}

export function ResetPassword({ student, onLock, onComplete }: { student: StudentRow; onLock: (value: boolean) => void; onComplete: () => void }) {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const cancel = useRef<HTMLButtonElement>(null);
  async function reset() {
    setSaving(true); setError(""); onLock(true);
    try { await classroomApi.resetPassword(student.uid, session?.uid); onComplete(); setOpen(false); }
    catch (problem) { setError(problemMessage(problem)); }
    finally { setSaving(false); onLock(false); }
  }
  return <AlertDialog open={open} onOpenChange={(next) => { if (saving) return; setError(""); setOpen(next); }}>
    <AlertDialogTrigger render={<Button variant="ghost" aria-label={`${student.studentId} 비밀번호 초기화`} />}><KeyRound size={15} aria-hidden="true" />비밀번호 초기화</AlertDialogTrigger>
    <AlertDialogContent className={styles.dialog} initialFocus={cancel}>
      <AlertDialogHeader><AlertDialogTitle>{student.studentId} 학생의 비밀번호를 초기화할까요?</AlertDialogTitle><AlertDialogDescription>학습 기록과 제출 작품은 그대로 유지돼요. 학생의 기존 접속은 종료되고, 다음 입장 시 초기화용 공통 비밀번호로 로그인한 뒤 새 비밀번호를 설정해야 해요.</AlertDialogDescription></AlertDialogHeader>
      {error && <p role="alert" className={styles.dialogError}>{error}</p>}
      <AlertDialogFooter><AlertDialogCancel ref={cancel} disabled={saving}>취소</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={() => void reset()}>{saving ? "초기화 중…" : "초기화하기"}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
