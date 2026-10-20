"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Settings2 } from "lucide-react";
import { useSession } from "@/components/session-provider";
import { useNavigationGuard } from "@/components/navigation-provider";
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
  const closing = lessons.filter(lesson => baseline.openedLessonIds.includes(lesson.id) && !draft.openedLessonIds.includes(lesson.id));
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
        // Apply only this teacher's own changes onto the latest list, so another teacher's opening or closing is kept.
        setDraft((previous) => {
          const added = previous.openedLessonIds.filter((id) => !baseline.openedLessonIds.includes(id));
          const closed = baseline.openedLessonIds.filter((id) => !previous.openedLessonIds.includes(id));
          const openedLessonIds = [...new Set([...latest.classroom.openedLessonIds, ...added])].filter((id) => !closed.includes(id));
          return { ...previous, revision: latest.classroom.revision, openedLessonIds, currentLessonId: previous.currentLessonId && openedLessonIds.includes(previous.currentLessonId) ? previous.currentLessonId : null };
        });
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
      <DialogHeader><DialogTitle>{classroom.name} 수업 관리</DialogTitle><DialogDescription>학생에게 열어 줄 수업과 이번 수업을 정해 주세요. 수업을 닫아도 학생 작업은 지워지지 않아요.</DialogDescription></DialogHeader>
      <fieldset className={styles.lessonOptions} disabled={saving || reloading}><legend>열린 수업</legend>
        {lessons.length === 0 && <p>지금은 공개할 수업이 없어요.</p>}
        {lessons.map((lesson) => <label key={lesson.id}><input type="checkbox" checked={draft.openedLessonIds.includes(lesson.id)} onChange={(event) => { const checked = event.currentTarget.checked; setDraft((previous) => ({ ...previous, openedLessonIds: checked ? [...previous.openedLessonIds, lesson.id] : previous.openedLessonIds.filter((id) => id !== lesson.id), currentLessonId: !checked && previous.currentLessonId === lesson.id ? null : previous.currentLessonId })); }} /><span><strong>{lesson.title}</strong><small>{baseline.openedLessonIds.includes(lesson.id) ? (draft.openedLessonIds.includes(lesson.id) ? "열린 수업 · 체크를 풀면 닫혀요" : "저장하면 학생 화면에서 닫혀요") : "저장하면 학생에게 공개돼요"}</small></span></label>)}
      </fieldset>
      {/* Reset only the choice menu when its options change; Base UI otherwise falls back to its old initial value. */}
      <label className={styles.dialogField}>이번 수업<Select key={draft.openedLessonIds.join(":")} label="이번 수업" value={draft.currentLessonId ?? ""} disabled={saving || reloading} onValueChange={(value) => setDraft((previous) => ({ ...previous, currentLessonId: value || null }))} options={[{ value: "", label: "지정하지 않음" }, ...lessons.filter((lesson) => draft.openedLessonIds.includes(lesson.id)).map((lesson) => ({ value: lesson.id, label: lesson.title }))]} /></label>
      <section className={styles.publishSummary} aria-label="저장할 수업 설정">
        <h3>{newlyOpened.length ? `새로 공개할 수업 ${newlyOpened.length}개` : "새로 공개할 수업이 없어요."}</h3>
        {newlyOpened.length > 0 && <ul>{newlyOpened.map(lesson => <li key={lesson.id}>{lesson.title}</li>)}</ul>}
        <p>{!draft.currentLessonId ? "이번 수업 미지정" : `이번 수업 ${draft.currentLessonId === baseline.currentLessonId ? "유지" : "변경"}: ${currentLesson?.title ?? draft.currentLessonId}`}</p>
        {closing.length > 0 && <><h3>닫을 수업 {closing.length}개</h3><ul>{closing.map(lesson => <li key={lesson.id}>{lesson.title}</li>)}</ul><p className={styles.dialogNote}>닫으면 학생 목록에서 사라지고, 그 수업을 열어 둔 학생은 더 저장할 수 없어요. 작업은 남아 있어 다시 열면 이어서 할 수 있어요.</p></>}
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
  student: StudentRow; onLock: (value: boolean) => void; onComplete: (expiresAt: number) => void; onClose: () => void; finalFocus: () => HTMLElement | null | false;
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
      onComplete(result.expiresAt);
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

type Issued = { uid: string; studentId: string; password?: string; expiresAt?: number; error?: string };
const RECENT_MS = 10 * 60_000;

export function BulkIssuePasswords({ classroomName, students, checkedAt, onLock, onComplete, onClose }: {
  classroomName: string; students: StudentRow[]; checkedAt: number; onLock: (value: boolean) => void; onComplete: (issued: { uid: string; expiresAt: number }[]) => void; onClose: () => void;
}) {
  const { session } = useSession();
  const candidates = students.filter(student => student.mustChangePassword).sort((a, b) => a.studentId.localeCompare(b.studentId));
  // 최근 접속했거나 아직 쓸 수 있는 임시값을 받은 학생은 기본으로 빼서 이미 준 쪽지를 무효로 만들지 않아요.
  const fresh = (student: StudentRow) => (!student.lastActiveAt || checkedAt - student.lastActiveAt >= RECENT_MS) && !(student.temporaryExpiresAt && student.temporaryExpiresAt > checkedAt);
  const [selected, setSelected] = useState(() => new Set(candidates.filter(fresh).map(student => student.uid)));
  const [results, setResults] = useState<Issued[] | null>(null);
  const [running, setRunning] = useState(false);
  const [shown, setShown] = useState(false);
  const [leaveBlocked, setLeaveBlocked] = useState(false);
  const { register } = useNavigationGuard();
  const busy = useRef(false);
  const holding = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (busy.current) onLock(false); }; }, [onLock]);
  // 발급 중이거나 아직 전달하지 않은 값이 있으면 새로고침·뒤로 가기로 값을 잃지 않게 막아요.
  useEffect(() => register({ isDirty: () => busy.current || holding.current, flush: async () => { setLeaveBlocked(true); return false; } }), [register]);
  async function issue() {
    if (busy.current || !selected.size) return;
    busy.current = true; setRunning(true); setResults([]); onLock(true);
    const issued: Issued[] = [];
    // 한 명씩 차례로 발급해 Firebase 계정 변경 한도를 넘지 않게 해요.
    for (const student of candidates.filter(item => selected.has(item.uid))) {
      if (!mounted.current) return;
      try { issued.push({ uid: student.uid, studentId: student.studentId, ...await classroomApi.resetPassword(student.uid, session?.uid, true) }); }
      catch (problem) { issued.push({ uid: student.uid, studentId: student.studentId, error: problemMessage(problem) }); }
      if (issued.at(-1)?.password) holding.current = true;
      setResults([...issued]);
    }
    busy.current = false; onLock(false);
    if (!mounted.current) return;
    setRunning(false);
    onComplete(issued.flatMap(item => item.expiresAt ? [{ uid: item.uid, expiresAt: item.expiresAt }] : []));
  }
  const done = results?.filter(item => item.password) ?? [];
  const expiry = (time: number) => new Date(time).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" });
  return <Dialog open disablePointerDismissal={!!results} onOpenChange={(next) => { if (!next && !busy.current) onClose(); }}>
    <DialogContent className={styles.dialog} showCloseButton={!running}>
      <DialogHeader><DialogTitle>{classroomName} 임시 비밀번호 한꺼번에 발급</DialogTitle><DialogDescription>{results ? "학생마다 자기 값만 전달해 주세요. 이 창을 닫으면 다시 표시하지 않아요." : "아직 자기 비밀번호를 정하지 않은 학생만 보여요. 오지 않은 학생이나 없는 번호는 체크를 빼 주세요. 이미 받은 임시값이 남아 있는 학생은 기본으로 빠져 있어요. 프로젝터를 끄고 진행해 주세요."}</DialogDescription></DialogHeader>
      {!results ? candidates.length ? <fieldset className={styles.bulkPick}><legend className="sr-only">발급할 학생</legend>{candidates.map(student => <label key={student.uid}><input type="checkbox" checked={selected.has(student.uid)} onChange={event => setSelected(previous => { const next = new Set(previous); if (event.target.checked) next.add(student.uid); else next.delete(student.uid); return next; })} />{student.studentId}{student.lastActiveAt && checkedAt - student.lastActiveAt < RECENT_MS ? <small>최근 접속</small> : student.temporaryExpiresAt && student.temporaryExpiresAt > checkedAt ? <small>{expiry(student.temporaryExpiresAt)}까지 발급됨</small> : null}</label>)}</fieldset> : <p className={styles.dialogNote}>비밀번호를 새로 정해야 하는 학생이 없어요.</p>
        : <><p role="status" className={styles.dialogNote}>{running ? `발급 중 ${results.length}/${selected.size}명` : `${done.length}명 발급 · ${results.length - done.length}명 건너뜀`}{done[0]?.expiresAt && ` · ${expiry(done[0].expiresAt)}까지 사용 가능`}</p>
          <div className={styles.bulkScroll}><table className={styles.bulkResult}><thead><tr><th scope="col">학번</th><th scope="col">임시 비밀번호</th></tr></thead><tbody>{results.map(item => <tr key={item.uid}><th scope="row">{item.studentId}</th><td>{item.password ? <code>{shown ? item.password : "••••••••"}</code> : <span className={styles.dialogError}>{item.error}</span>}</td></tr>)}</tbody></table></div>
          {done.length > 0 && createPortal(<div className={styles.printSlips} aria-hidden="true">{done.map(item => <div key={item.uid}><strong>{classroomName} · {item.studentId}</strong><code>{item.password}</code><small>{expiry(item.expiresAt!)}까지 · 처음 로그인하면 내 비밀번호로 바꿔요.</small></div>)}</div>, document.body)}</>}
      {leaveBlocked && <p role="alert" className={styles.dialogError}>{running ? "발급이 끝날 때까지 이 화면에 머물러 주세요." : "임시 비밀번호를 전달한 뒤 `전달 완료`로 창을 닫아 주세요."}</p>}
      <DialogFooter>{!results ? <><Button variant="outline" onClick={onClose}>취소</Button><Button disabled={!selected.size} onClick={() => void issue()}>{selected.size}명 발급하기</Button></> : <><Button variant="outline" disabled={running || !done.length} aria-pressed={shown} onClick={() => setShown(value => !value)}>{shown ? "비밀번호 숨기기" : "비밀번호 보이기"}</Button><Button variant="outline" disabled={running || !done.length} onClick={() => window.print()}>쪽지 인쇄</Button><Button disabled={running} onClick={onClose}>전달 완료</Button></>}</DialogFooter>
    </DialogContent>
  </Dialog>;
}

export function FirstEntry({ classroomId, classroomName, students, onRefresh, onClose }: {
  classroomId: string; classroomName: string; students: StudentRow[]; onRefresh: () => Promise<TeacherDashboard | null>; onClose: () => void;
}) {
  const { session } = useSession();
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // 연 순간 비밀번호를 아직 정하지 않았던 학생 중 지금 정한 학생이 이번에 입장한 학생이에요.
  const [waiting, setWaiting] = useState<string[]>([]);
  const opened = useRef(false);
  const pending = students.filter(student => student.mustChangePassword).map(student => student.studentId).sort();
  const entered = waiting.filter(id => !pending.includes(id));
  const open = expiresAt !== null && expiresAt > now;
  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);
  // 창을 닫거나 다른 화면으로 가면 코드를 바로 닫아요. 실패해도 10분 뒤에는 서버에서 만료돼요.
  useEffect(() => () => { if (opened.current) void classroomApi.firstEntry(classroomId, "close", session?.uid).catch(() => undefined); }, [classroomId, session?.uid]);
  async function run(action: "open" | "extend") {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await classroomApi.firstEntry(classroomId, action, session?.uid);
      if (action === "open") { opened.current = true; setCode(result.code); setWaiting(previous => [...new Set([...previous, ...pending])]); }
      setExpiresAt(result.expiresAt); setNow(Date.now());
    } catch (problem) { setError(problemMessage(problem)); }
    finally { setBusy(false); }
  }
  async function refresh() {
    if (busy) return;
    setBusy(true); setError("");
    try { await onRefresh(); } finally { setBusy(false); }
  }
  const left = open ? Math.ceil((expiresAt - now) / 1000) : 0;
  return <Dialog open onOpenChange={(next) => { if (!next && !busy) onClose(); }}>
    <DialogContent className={styles.dialog} showCloseButton={!busy}>
      <DialogHeader><DialogTitle>{classroomName} 첫 입장</DialogTitle><DialogDescription>{code ? "학생은 학생 로그인에서 자기 학번과 아래 코드를 비밀번호 칸에 넣고, 바로 자기 비밀번호를 정해요." : "아직 자기 비밀번호를 정하지 않은 학생이 반 공통 코드로 처음 입장해요. 열면 10분 동안 쓸 수 있고, 이 창을 닫으면 바로 닫혀요."}</DialogDescription></DialogHeader>
      {code && <>
        <p className={styles.entryCode} aria-label={`입장 코드 ${code.split("").join(" ")}`}>{code}</p>
        <p role="status" className={styles.dialogNote}>{open ? `남은 시간 ${Math.floor(left / 60)}분 ${String(left % 60).padStart(2, "0")}초` : "입장 시간이 끝났어요. 다시 열면 새 코드가 나와요."}</p>
        <div className={styles.entryGroups}>
          <section><h3>이번에 입장한 학생 {entered.length}명</h3><p>{entered.join(", ") || "아직 없어요."}</p></section>
          <section><h3>아직 비밀번호를 정하지 않은 학생 {pending.length}명</h3><p>{pending.join(", ") || "모두 정했어요."}</p></section>
        </div>
        <p className={styles.dialogNote}>오지 않은 학생 번호가 입장 학생에 있으면, 학생 목록에서 그 학생의 비밀번호를 초기화해 주세요. 현황은 새로고침을 눌러야 바뀌어요.</p>
      </>}
      {!code && <p className={styles.dialogNote}>비밀번호를 정해야 하는 학생 {pending.length}명</p>}
      {error && <p role="alert" className={styles.dialogError}>{error}</p>}
      <DialogFooter>{!code || !open ? <><Button variant="outline" disabled={busy} onClick={onClose}>닫기</Button><Button disabled={busy || !pending.length} onClick={() => void run("open")}>{code ? "새 코드로 다시 열기" : "첫 입장 열기"}</Button></> : <><Button variant="outline" disabled={busy} onClick={() => void refresh()}>입장 현황 새로고침</Button><Button variant="outline" disabled={busy} onClick={() => void run("extend")}>10분 연장</Button><Button disabled={busy} onClick={onClose}>첫 입장 닫기</Button></>}</DialogFooter>
    </DialogContent>
  </Dialog>;
}
