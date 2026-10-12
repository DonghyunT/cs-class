"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronDown, CloudCheck, LogOut, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session-provider";
import { useNavigationGuard } from "@/components/navigation-provider";
import type { Lesson } from "@/lib/classroom/types";
import styles from "./lesson-shell.module.css";
import { HelpButton } from "@/components/classroom/help-button";

export type LessonOrigin = "dashboard" | "lessons";
export function LessonShell({ lesson, returnOrigin, workspaceWide, practiceFocused = false, practiceActive = false, onPracticeFocusedChange, preview, saveLabel, learningStatus, navigation, otherCurrent, focusRequest, children }: {
  lesson: Lesson; returnOrigin: LessonOrigin; workspaceWide: boolean; practiceFocused?: boolean; practiceActive?: boolean; onPracticeFocusedChange?: (focused: boolean) => void; saveLabel: string;
  preview?: { classId: string; controls: ReactNode };
  learningStatus?: ReactNode; navigation?: ReactNode; otherCurrent?: Lesson; focusRequest?: { id: string; preventScroll?: boolean } | null; children: ReactNode;
}) {
  const { session, logout } = useSession();
  const { beforeLeave } = useNavigationGuard();
  const router = useRouter();
  const menu = useRef<HTMLDetailsElement>(null), menuToggle = useRef<HTMLElement>(null), logoutButton = useRef<HTMLButtonElement>(null);
  const focusToggle = useRef<HTMLButtonElement>(null), manualFocus = useRef(false);
  const canFocus = practiceActive && lesson.practice.type !== "ordering" && !!lesson.practice.type;
  const reviewFocused = practiceFocused && ["sandwich", "abstraction", "flowchart"].includes(lesson.practice.type ?? "");
  const [open, setOpen] = useState(false), [leaving, setLeaving] = useState(false), [logoutError, setLogoutError] = useState("");
  useEffect(() => { if (manualFocus.current) { focusToggle.current?.focus({ preventScroll: true }); manualFocus.current = false; } }, [practiceFocused]);
  function changeFocus(focused: boolean) { manualFocus.current = true; onPracticeFocusedChange?.(focused); }
  useEffect(() => {
    // Stage controls and activity feedback have committed before their focus request is applied.
    if (focusRequest) document.getElementById(focusRequest.id)?.focus({ preventScroll: focusRequest.preventScroll });
  }, [focusRequest]);
  useEffect(() => {
    if (!open) return;
    logoutButton.current?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !menu.current?.contains(event.target) && menu.current) menu.current.open = false; };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  async function leaveAccount() {
    if (leaving) return;
    setLeaving(true); setLogoutError("");
    try { if (await beforeLeave()) { await logout(); router.replace("/login/student"); } }
    catch (error) { setLogoutError(error instanceof Error ? error.message : "로그아웃하지 못했어요. 다시 시도해 주세요."); }
    finally { setLeaving(false); }
  }
  return <div className={styles.shell} data-practice-type={lesson.practice.type} data-workspace-wide={workspaceWide || reviewFocused} data-practice-focused={practiceFocused} data-lesson-shell onKeyDown={event => {
    if (event.key !== "Escape" || event.defaultPrevented || !practiceFocused) return;
    const details = event.target instanceof Element ? event.target.closest("details[open]") : null;
    if (details instanceof HTMLDetailsElement) { event.preventDefault(); details.open = false; details.querySelector("summary")?.focus(); return; }
    event.preventDefault(); changeFocus(false);
  }}>
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link className={styles.leave} href={preview ? `/teacher/classes?classId=${encodeURIComponent(preview.classId)}` : returnOrigin === "dashboard" ? "/student" : "/student/lessons"}><ArrowLeft size={18} aria-hidden="true" />{preview ? "수업 관리로 돌아가기" : "수업 나가기"}</Link>
        <div className={styles.title}><h1>{lesson.title}</h1><div className={styles.lessonState}>{learningStatus}{lesson.mode === "review" && <span>성적에 반영하지 않아요</span>}{otherCurrent && <Link className={styles.currentLesson} href={`/classroom/${otherCurrent.id}?from=${returnOrigin}`}>이번 수업: {otherCurrent.title} · 이동</Link>}</div></div>
        <span className={styles.save} role="status">{saveLabel === "저장 완료" ? <CloudCheck size={17} aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}{saveLabel}</span>
        {canFocus && <Button ref={focusToggle} className={styles.focusToggle} variant="outline" aria-pressed={practiceFocused} onClick={() => changeFocus(!practiceFocused)}>{practiceFocused ? "실습 집중 모드 끝내기" : "실습 집중 모드"}</Button>}
        {!preview && <HelpButton lessonId={lesson.id} />}
        {!preview && <details ref={menu} className={styles.account} onToggle={event => setOpen(event.currentTarget.open)} onKeyDown={event => {
          if (event.key === "Escape" && menu.current?.open) { event.preventDefault(); event.stopPropagation(); menu.current.open = false; menuToggle.current?.focus({ preventScroll: true }); }
        }}>
          <summary ref={menuToggle} role="button" aria-label="학생 메뉴" aria-expanded={open}>{session?.studentId ?? "학생"}<ChevronDown size={16} aria-hidden="true" /></summary>
          <div className={styles.accountPanel}><p>{session?.studentId} 학생으로 학습 중</p><Button ref={logoutButton} variant="ghost" disabled={leaving} onClick={() => void leaveAccount()}><LogOut size={17} aria-hidden="true" />{leaving ? "저장 확인 중…" : "로그아웃"}</Button></div>
        </details>}
      </div>
      {preview && <div className={styles.previewToolbar}><strong>교사 미리보기 · 이 창에서만 체험</strong><p>체험 내용은 새로고침·수업 변경·나가기 때 사라집니다. 학생 기록에는 반영되지 않아요.</p>{preview.controls}</div>}
    </header>
    <main id="main-content" tabIndex={-1} className={styles.main}>
      <div className={styles.navigation}><details className={styles.stagePicker} data-focused={practiceFocused} open={!practiceFocused}><summary>단계 바꾸기</summary>{navigation}</details></div>
      {logoutError && <p role="alert" className={styles.error}>{logoutError}</p>}
      {children}
    </main>
  </div>;
}
