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
export function LessonShell({ lesson, returnOrigin, workspaceWide, saveLabel, learningStatus, navigation, information, focusRequest, children }: {
  lesson: Lesson; returnOrigin: LessonOrigin; workspaceWide: boolean; saveLabel: string;
  learningStatus?: ReactNode; navigation?: ReactNode; information?: ReactNode; focusRequest?: { id: string; preventScroll?: boolean } | null; children: ReactNode;
}) {
  const { session, logout } = useSession();
  const { beforeLeave } = useNavigationGuard();
  const router = useRouter();
  const menu = useRef<HTMLDetailsElement>(null), menuToggle = useRef<HTMLElement>(null), logoutButton = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false), [leaving, setLeaving] = useState(false), [logoutError, setLogoutError] = useState("");
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
  return <div className={styles.shell} data-workspace-wide={workspaceWide} data-lesson-shell>
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link className={styles.leave} href={returnOrigin === "dashboard" ? "/student" : "/student/lessons"}><ArrowLeft size={18} aria-hidden="true" />수업 나가기</Link>
        <div className={styles.title}><h1>{lesson.title}</h1><div className={styles.lessonState}>{learningStatus}{lesson.mode === "review" && <span>성적에 반영하지 않아요</span>}</div></div>
        <span className={styles.save} role="status">{saveLabel === "저장 완료" ? <CloudCheck size={17} aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}{saveLabel}</span>
        <HelpButton lessonId={lesson.id} />
        <details ref={menu} className={styles.account} onToggle={event => setOpen(event.currentTarget.open)} onKeyDown={event => {
          if (event.key === "Escape" && menu.current?.open) { event.preventDefault(); event.stopPropagation(); menu.current.open = false; menuToggle.current?.focus({ preventScroll: true }); }
        }}>
          <summary ref={menuToggle} role="button" aria-label="학생 메뉴" aria-expanded={open}>{session?.studentId ?? "학생"}<ChevronDown size={16} aria-hidden="true" /></summary>
          <div className={styles.accountPanel}><p>{session?.studentId} 학생으로 학습 중</p><Button ref={logoutButton} variant="ghost" disabled={leaving} onClick={() => void leaveAccount()}><LogOut size={17} aria-hidden="true" />{leaving ? "저장 확인 중…" : "로그아웃"}</Button></div>
        </details>
      </div>
    </header>
    <main id="main-content" tabIndex={-1} className={styles.main}>
      <div className={styles.navigation}>{navigation}{information && <details className={styles.information}><summary>수업 안내 · 자세한 학습 진행</summary><div><p>{lesson.description}</p>{information}</div></details>}</div>
      {logoutError && <p role="alert" className={styles.error}>{logoutError}</p>}
      {children}
    </main>
  </div>;
}
