"use client";

import { useEffect, useRef, useState } from "react";
import { Settings2 } from "lucide-react";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ApiError, classroomApi } from "@/lib/classroom/client";
import type { ClassSettings, Lesson, StudentRow, TeacherDashboard } from "@/lib/classroom/types";
import { WorkDetails } from "./work-details";
import { problemMessage } from "./presentation";
import styles from "./teacher.module.css";

export function ManageLessons({ classroom, lessons, onSaved, onLock, onRefresh, initialOpen = false, onClosed }: {
  classroom: ClassSettings; lessons: Lesson[]; onSaved: (value: ClassSettings) => void; onLock: (value: boolean) => void; onRefresh: () => Promise<TeacherDashboard | null>; initialOpen?: boolean; onClosed?: () => void;
}) {
  const { session } = useSession();
  const [open, setOpen] = useState(initialOpen);
  const requestConsumed = useRef(initialOpen);
  const trigger = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState(classroom);
  const [baseline, setBaseline] = useState(classroom);
  const pending = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const [reloading, setReloading] = useState(false);
  const newlyOpened = lessons.filter(lesson => draft.openedLessonIds.includes(lesson.id) && !baseline.openedLessonIds.includes(lesson.id));
  const currentLesson = lessons.find(lesson => lesson.id === draft.currentLessonId);
  useEffect(() => {
    if (!initialOpen) { requestConsumed.current = false; return; }
    if (requestConsumed.current) return;
    requestConsumed.current = true;
    const snapshot = { ...classroom, openedLessonIds: [...classroom.openedLessonIds] };
    setDraft(snapshot); setBaseline(snapshot); setError(""); setConflict(false); setRefreshed(false); setOpen(true);
  }, [classroom, initialOpen]);
  function close() { setOpen(false); onClosed?.(); }

  async function save() {
    if (pending.current || conflict) return;
    pending.current = true;
    setSaving(true); setError(""); onLock(true);
    try {
      const result = await classroomApi.updateClass(classroom.id, draft.revision, draft.currentLessonId, draft.openedLessonIds, session?.uid);
      onLock(false); onSaved(result); close();
    } catch (problem) { setError(problemMessage(problem)); setConflict(problem instanceof ApiError && problem.status === 409); }
    finally { pending.current = false; setSaving(false); onLock(false); }
  }

  async function refreshSettings() {
    if (pending.current) return;
    pending.current = true;
    setReloading(true);
    try {
      const latest = await onRefresh();
      if (latest && latest.classroom.id === classroom.id) {
        setBaseline({ ...latest.classroom, openedLessonIds: [...latest.classroom.openedLessonIds] });
        setDraft((previous) => ({ ...previous, revision: latest.classroom.revision, openedLessonIds: [...new Set([...latest.classroom.openedLessonIds, ...previous.openedLessonIds])] }));
        setConflict(false); setError(""); setRefreshed(true);
      }
    } finally { pending.current = false; setReloading(false); }
  }

  return <Dialog open={open} onOpenChange={(next) => {
    if (pending.current) return;
    if (next) { const snapshot = { ...classroom, openedLessonIds: [...classroom.openedLessonIds] }; setDraft(snapshot); setBaseline(snapshot); setError(""); setConflict(false); setRefreshed(false); }
    if (next) setOpen(true); else close();
  }}>
    <DialogTrigger render={<Button ref={trigger} />}><Settings2 size={16} aria-hidden="true" />수업 관리</DialogTrigger>
    <DialogContent className={styles.dialog} showCloseButton={!saving && !reloading} finalFocus={trigger}>
      <DialogHeader><DialogTitle>{classroom.name} 수업 관리</DialogTitle><DialogDescription>학생에게 열어 줄 수업과 이번 수업을 정해 주세요. 이미 열린 수업과 학생 작업은 유지돼요.</DialogDescription></DialogHeader>
      <fieldset className={styles.lessonOptions} disabled={saving || reloading}><legend>열린 수업</legend>
        {lessons.length === 0 && <p>지금은 공개할 수업이 없어요.</p>}
        {lessons.map((lesson) => <label key={lesson.id}><input type="checkbox" checked={draft.openedLessonIds.includes(lesson.id)} disabled={baseline.openedLessonIds.includes(lesson.id)} onChange={(event) => { const checked = event.currentTarget.checked; setDraft((previous) => ({ ...previous, openedLessonIds: checked ? [...previous.openedLessonIds, lesson.id] : previous.openedLessonIds.filter((id) => id !== lesson.id), currentLessonId: !checked && previous.currentLessonId === lesson.id ? null : previous.currentLessonId })); }} /><span><strong>{lesson.title}</strong><small>{baseline.openedLessonIds.includes(lesson.id) ? "이미 열린 수업 · 복습 가능" : "저장하면 학생에게 공개돼요"}</small></span></label>)}
      </fieldset>
      {/* Reset only the choice menu when its options change; Base UI otherwise falls back to its old initial value. */}
      <label className={styles.dialogField}>이번 수업<Select key={draft.openedLessonIds.join(":")} label="이번 수업" value={draft.currentLessonId ?? ""} disabled={saving || reloading} onValueChange={(value) => setDraft((previous) => ({ ...previous, currentLessonId: value || null }))} options={[{ value: "", label: "지정하지 않음" }, ...lessons.filter((lesson) => draft.openedLessonIds.includes(lesson.id)).map((lesson) => ({ value: lesson.id, label: lesson.title }))]} /></label>
      <section className={styles.publishSummary} aria-label="저장할 수업 설정">
        <h3>{newlyOpened.length ? `새로 공개할 수업 ${newlyOpened.length}개` : "새로 공개할 수업이 없어요."}</h3>
        {newlyOpened.length > 0 && <ul>{newlyOpened.map(lesson => <li key={lesson.id}>{lesson.title}</li>)}</ul>}
        <p>{!draft.currentLessonId ? "이번 수업 미지정" : `이번 수업 ${draft.currentLessonId === baseline.currentLessonId ? "유지" : "변경"}: ${currentLesson?.title ?? draft.currentLessonId}`}</p>
        {newlyOpened.length > 0 && <p className={styles.dialogNote}>저장 후에는 이 화면에서 공개를 취소할 수 없어요.</p>}
      </section>
      {error && <p role="alert" className={styles.dialogError}>{error}</p>}
      {conflict && <Button variant="outline" disabled={reloading} onClick={() => void refreshSettings()}>{reloading ? "확인 중…" : "최신 설정 확인 후 다시 적용"}</Button>}
      {refreshed && <p role="status" className={styles.dialogNote}>최신 공개 목록을 반영했어요. 선택한 이번 수업을 확인하고 다시 저장해 주세요.</p>}
      <DialogFooter><Button variant="outline" disabled={saving || reloading} onClick={close}>취소</Button><Button disabled={saving || reloading || conflict} onClick={() => void save()}>{saving ? "저장 중…" : "설정 저장"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

export function SubmissionViewer({ student, lesson, lessons, onLock, onComplete, onClose, finalFocus }: {
  student: StudentRow; lesson: Lesson; lessons: Lesson[]; onLock: (value: boolean) => void; onComplete: () => void; onClose: () => void; finalFocus: () => HTMLElement | null | false;
}) {
  const [saving, setSaving] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [viewed, setViewed] = useState(lesson);
  const busy = useRef(false);
  const closeWorkspaceRef = useRef<(() => void) | null>(null);
  function lock(value: boolean) { busy.current = value; setSaving(value); onLock(value); }
  return <Dialog open onOpenChange={(next) => { if (!next && !busy.current) onClose(); }}>
    <DialogContent className={`${styles.dialog} ${styles.submissionDialog}`} data-workspace-open={workspaceOpen ? "true" : "false"} showCloseButton={!saving} finalFocus={finalFocus}><DialogHeader><DialogTitle>{student.studentId} 학생의 제출 작품</DialogTitle><DialogDescription>{viewed.title} · {viewed.practice.title}</DialogDescription></DialogHeader>
      {lessons.length > 1 && <label className={styles.submissionLessonPicker}>볼 수업<Select label="볼 수업" value={viewed.id} disabled={saving} onValueChange={(value) => { const next = lessons.find(item => item.id === value); if (next && !busy.current) setViewed(next); }} options={lessons.map(item => ({ value: item.id, label: item.title }))} /></label>}
      {/* 다른 수업은 그 학생의 작품 문서 하나만 열 때 읽고, 확인 요청은 서버의 최신 요청을 기준으로 해요. */}
      <WorkDetails key={viewed.id} uid={student.uid} lesson={viewed} expectedRequestId={viewed.id === lesson.id ? student.work?.review?.id : undefined} adoptLatestRequest={viewed.id !== lesson.id} onLock={lock} onComplete={viewed.id === lesson.id ? onComplete : () => undefined} onWorkspaceOpenChange={setWorkspaceOpen} registerCloseWorkspace={(close) => { closeWorkspaceRef.current = close; }} />
    </DialogContent>
  </Dialog>;
}

export function ResetPassword({ student, onLock, onComplete, onClose, finalFocus }: {
  student: StudentRow; onLock: (value: boolean) => void; onComplete: () => void; onClose: () => void; finalFocus: () => HTMLElement | null | false;
}) {
  const { session } = useSession();
  const [open, setOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [credential, setCredential] = useState<{ password: string; expiresAt: number } | null>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const mounted = useRef(false);
  const operation = useRef(0);
  const locked = useRef<((value: boolean) => void) | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; operation.current += 1; const release = locked.current; locked.current = null; release?.(false); };
  }, [student.uid]);
  async function reset() {
    if (locked.current) return;
    const version = ++operation.current;
    locked.current = onLock;
    setSaving(true); setError(""); onLock(true);
    try {
      const result = await classroomApi.resetPassword(student.uid, session?.uid);
      if (!mounted.current || version !== operation.current) return;
      setCredential(result); setOpen(false);
      const release = locked.current; locked.current = null; release?.(false);
      onComplete();
    } catch (problem) { if (mounted.current && version === operation.current) setError(problemMessage(problem)); }
    finally { if (mounted.current && version === operation.current) { setSaving(false); const release = locked.current; locked.current = null; release?.(false); } }
  }
  function closeResult() { setCredential(null); onClose(); }
  return <><AlertDialog open={open} onOpenChange={(next) => { if (locked.current) return; if (!next) { setOpen(false); if (!credential) onClose(); } }}>
    <AlertDialogContent className={styles.dialog} initialFocus={cancel} finalFocus={() => credential ? false : finalFocus()}>
      <AlertDialogHeader><AlertDialogTitle>{student.studentId} 학생의 비밀번호를 초기화할까요?</AlertDialogTitle><AlertDialogDescription>학습 기록과 제출 작품은 그대로 유지돼요. 기존 접속을 종료하고 이 학생만 사용할 임시 비밀번호를 발급해요. 학생은 30분 안에 입장해 새 비밀번호를 설정해야 해요.</AlertDialogDescription></AlertDialogHeader>
      {error && <p role="alert" className={styles.dialogError}>{error}</p>}
      <AlertDialogFooter><AlertDialogCancel ref={cancel} disabled={saving}>취소</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={() => void reset()}>{saving ? "초기화 중…" : "초기화하기"}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog><Dialog open={credential !== null} onOpenChange={(next) => { if (!next) closeResult(); }}>
    <DialogContent className={styles.dialog} initialFocus={passwordInput} finalFocus={finalFocus}>
      <DialogHeader><DialogTitle>{student.studentId} 학생의 임시 비밀번호</DialogTitle><DialogDescription>이 학생에게만 전달해 주세요. 새 비밀번호를 설정하면 사용할 수 없어요. 이 창을 닫으면 다시 표시하지 않아요.</DialogDescription></DialogHeader>
      {credential && <><label className={styles.dialogField}>임시 비밀번호<input ref={passwordInput} readOnly value={credential.password} onFocus={(event) => event.target.select()} autoComplete="off" spellCheck={false} /></label><p className={styles.dialogNote}>{new Date(credential.expiresAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" })}까지 사용 가능 · 30분 안에 비밀번호 변경</p></>}
      <DialogFooter><Button onClick={closeResult}>전달 완료</Button></DialogFooter>
    </DialogContent>
  </Dialog></>;
}
