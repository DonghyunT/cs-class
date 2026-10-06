"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Home,
  LogOut,
  Menu,
  PanelLeftClose,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Brand } from "@/components/visuals";
import { Button } from "@/components/ui/button";
import { SessionAccess } from "@/components/session-access";
import { useSession } from "@/components/session-provider";
import { useNavigationGuard } from "@/components/navigation-provider";
import styles from "./app-shell.module.css";

const desktopQuery = "(min-width: 821px)";

export function AppShell({
  children,
  title,
  teacher = false,
  workspaceWide = false,
}: {
  children: ReactNode;
  title: string;
  teacher?: boolean;
  workspaceWide?: boolean;
}) {
  const { session, logout, teacherClassId } = useSession();
  const { beforeLeave } = useNavigationGuard();
  const [logoutError, setLogoutError] = useState("");
  const router = useRouter();
  const path = usePathname();
  const [mobileNav, setMobileNav] = useState(false);
  const navToggle = useRef<HTMLButtonElement>(null);
  const mobileClose = useRef<HTMLButtonElement>(null);
  const dashboardLink = useRef<HTMLAnchorElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const sidebarFocused = useRef(false);
  const returnToWorkspace = useRef(false);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (mobileNav) {
      mobileClose.current?.focus();
      document.body.style.overflow = "hidden";
    }
    const desktop = matchMedia(desktopQuery);
    const onResize = () => {
      const focusWasInSidebar = sidebar.current?.contains(document.activeElement)
        || (sidebarFocused.current && document.activeElement === document.body);
      if (desktop.matches && mobileNav) {
        returnToWorkspace.current = workspaceWide;
        setMobileNav(false);
        if (!workspaceWide) dashboardLink.current?.focus();
      } else if (!desktop.matches && focusWasInSidebar) {
        navToggle.current?.focus();
      }
      // A delayed desktop media event must preserve newly focused sidebar links.
      sidebarFocused.current = sidebar.current?.contains(document.activeElement) ?? false;
    };
    desktop.addEventListener("change", onResize);
    return () => {
      if (mobileNav) document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", onResize);
    };
  }, [mobileNav, workspaceWide]);
  useEffect(() => {
    if (!mobileNav && returnToWorkspace.current) {
      returnToWorkspace.current = false;
      document.getElementById("main-content")?.focus();
    }
  }, [mobileNav]);
  useEffect(() => {
    if (workspaceWide && !mobileNav && matchMedia(desktopQuery).matches && (sidebar.current?.contains(document.activeElement) || sidebarFocused.current && document.activeElement === document.body)) {
      document.getElementById("main-content")?.focus({ preventScroll: true });
      sidebarFocused.current = false;
    }
  }, [workspaceWide, mobileNav]);
  function closeNav() {
    setMobileNav(false);
    requestAnimationFrame(() => navToggle.current?.focus());
  }
  const home = teacher ? "/teacher" : "/student";
  const classLink = (href: string) => teacher && teacherClassId ? `${href}?${new URLSearchParams({ classId: teacherClassId })}` : href;
  return (
    <SessionAccess teacher={teacher}>
      <div className={styles.layout} data-workspace-wide={workspaceWide}>
        <aside
          ref={sidebar}
          onFocusCapture={() => { sidebarFocused.current = true; }}
          onBlurCapture={(event) => {
            // CSS can hide the sidebar and blur it before the media event fires.
            if (event.relatedTarget || matchMedia(desktopQuery).matches && !workspaceWide) sidebarFocused.current = false;
          }}
          role={mobileNav ? "dialog" : undefined}
          aria-modal={mobileNav || undefined}
          aria-label={mobileNav ? "교실 탐색 메뉴" : undefined}
          className={`${styles.appSidebar} ${mobileNav ? styles.isOpen : ""}`}
          onKeyDown={(e) => {
            if (e.key === "Escape") closeNav();
            if (mobileNav && e.key === "Tab") {
              const items = [
                ...e.currentTarget.querySelectorAll<HTMLElement>(
                  "a[href],button:not([disabled])",
                ),
              ].filter((item) => item.offsetParent !== null);
              const first = items[0],
                last = items[items.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
              }
            }
          }}
        >
          <div className={styles.sidebarBrand}>
            <Brand />
            <Button
              ref={mobileClose}
              variant="ghost"
              size="icon"
              className={styles.mobileOnly}
              aria-label="메뉴 닫기"
              onClick={closeNav}
            >
              <X />
            </Button>
          </div>
          <div className={styles.workspaceLabel}>
            {teacher ? "선생님 공간" : "우리 반 교실"}
          </div>
          <nav aria-label="교실 메뉴">
            <Link
              ref={dashboardLink}
              className={path === home ? styles.active : ""}
              aria-current={path === home ? "page" : undefined}
              href={classLink(home)}
              onClick={() => setMobileNav(false)}
            >
              <Home size={19} />
              대시보드
            </Link>
            <Link
              className={path === `${home}/${teacher ? "students" : "lessons"}` ? styles.active : ""}
              aria-current={path === `${home}/${teacher ? "students" : "lessons"}` ? "page" : undefined}
              href={classLink(`${home}/${teacher ? "students" : "lessons"}`)}
              onClick={() => setMobileNav(false)}
            >
              {teacher ? <Users size={19} /> : <BookOpen size={19} />}
              {teacher ? "학생 현황·계정" : "열린 수업"}
            </Link>
            {teacher && <Link className={path === "/teacher/classes" ? styles.active : ""} aria-current={path === "/teacher/classes" ? "page" : undefined} href={classLink("/teacher/classes")} onClick={() => setMobileNav(false)}><BookOpen size={19} />수업 관리</Link>}
            <Link className={path === `${home}/schedule` ? styles.active : ""} aria-current={path === `${home}/schedule` ? "page" : undefined} href={classLink(`${home}/schedule`)} onClick={() => setMobileNav(false)}><CalendarDays size={19} />반 일정</Link>
          </nav>
          <div className={styles.sidebarBottom}>
            <div className={styles.sidebarTip}><strong>{teacher ? "수업 운영" : "저장하고 이어가기"}</strong><p>{teacher ? "담당 반의 수업과 학생 기록을 확인해요." : "저장 완료를 확인하면 다음에도 이어갈 수 있어요."}</p></div>
            <Link href="/" className={styles.sidebarHome}>
              <PanelLeftClose size={16} /> 공개 홈 둘러보기
            </Link>
          </div>
        </aside>
        {mobileNav && (
          <button
            className={styles.sidebarScrim}
            tabIndex={-1}
            aria-label="메뉴 닫기"
            onClick={closeNav}
          />
        )}
        <div className={styles.appContent} inert={mobileNav}>
          <header className={styles.appTopbar}>
            <div>
              <Button
                ref={navToggle}
                variant="ghost"
                size="icon"
                className={styles.mobileOnly}
                aria-label="메뉴 열기"
                aria-expanded={mobileNav}
                onClick={() => setMobileNav(true)}
              >
                <Menu />
              </Button>
              <span className={styles.breadcrumb}>
                {teacher ? "선생님 공간" : `${session?.classId?.split("-")[0]}학년 ${session?.classId?.split("-")[1]}반`}
                <ChevronRight size={14} />
                <strong>{title}</strong>
              </span>
            </div>
            <div className={styles.accountActions}>
              <span className={styles.userAvatar}>
                {teacher ? "T" : session?.studentId?.slice(-2)}
              </span>
              <span className={styles.userName}>
                {teacher
                  ? session?.role === "instructor"
                    ? "강사님"
                    : "선생님"
                  : `${session?.studentId} 학생`}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="로그아웃"
                onClick={async () => {
                  setLogoutError("");
                  try {
                    if (!(await beforeLeave())) return;
                    await logout();
                    router.replace(`/login/${teacher ? "teacher" : "student"}`);
                  } catch (problem) { setLogoutError(problem instanceof Error ? problem.message : "로그아웃하지 못했어요. 다시 시도해 주세요."); }
                }}
              >
                <LogOut size={18} />
              </Button>
            </div>
          </header>
          <main id="main-content" tabIndex={-1} className={styles.dashboardMain}>
            {logoutError && <p role="alert" className={styles.appError}>{logoutError}</p>}
            {children}
          </main>
          <footer className={styles.appFooter}>
            CS Class <span>즐거운 정보 교실</span>
          </footer>
        </div>
      </div>
    </SessionAccess>
  );
}
