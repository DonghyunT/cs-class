"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  PanelLeftClose,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Brand, DemoBanner } from "@/components/visuals";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/components/demo-provider";

export function AppShell({
  children,
  title,
  teacher = false,
}: {
  children: ReactNode;
  title: string;
  teacher?: boolean;
}) {
  const { session, logout } = useDemo();
  const router = useRouter();
  const path = usePathname();
  const [mobileNav, setMobileNav] = useState(false);
  const navToggle = useRef<HTMLButtonElement>(null);
  const mobileClose = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!mobileNav) return;
    mobileClose.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = matchMedia("(min-width: 601px)");
    const onResize = () => {
      if (desktop.matches) setMobileNav(false);
    };
    desktop.addEventListener("change", onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", onResize);
    };
  }, [mobileNav]);
  function closeNav() {
    setMobileNav(false);
    requestAnimationFrame(() => navToggle.current?.focus());
  }
  const valid = teacher
    ? session && session.role !== "student"
    : session?.role === "student" && !session.mustChange;
  if (!valid)
    return (
      <>
        <DemoBanner />
        <main id="main-content" className="access-state">
          <Brand />
          <span className="form-icon">
            <GraduationCap />
          </span>
          <h1>
            {session?.mustChange
              ? "먼저 비밀번호를 바꿔 주세요."
              : "교실에 입장해 주세요."}
          </h1>
          <p>새로고침하면 화면 체험의 로그인 상태가 초기화됩니다.</p>
          <Button
            nativeButton={false}
            render={<Link href={`/login/${teacher ? "teacher" : "student"}`} />}
          >
            입장 화면으로 <ChevronRight size={16} />
          </Button>
        </main>
      </>
    );
  const home = teacher ? "/teacher" : "/student";
  return (
    <>
      <DemoBanner />
      <div className="app-layout">
        <aside
          role={mobileNav ? "dialog" : undefined}
          aria-modal={mobileNav || undefined}
          aria-label={mobileNav ? "교실 탐색 메뉴" : undefined}
          className={`app-sidebar ${mobileNav ? "is-open" : ""}`}
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
          <div className="sidebar-brand">
            <Brand />
            <Button
              ref={mobileClose}
              variant="ghost"
              size="icon"
              className="mobile-only"
              aria-label="메뉴 닫기"
              onClick={closeNav}
            >
              <X />
            </Button>
          </div>
          <div className="workspace-label">
            {teacher ? "TEACHER WORKSPACE" : "MY CLASSROOM"}
          </div>
          <nav aria-label="교실 메뉴">
            <Link
              className={path === home ? "active" : ""}
              href={home}
              onClick={() => setMobileNav(false)}
            >
              <Home size={19} />
              {teacher ? "우리 반 관리" : "내 교실"}
              <ChevronRight size={15} />
            </Link>
            <Link
              href={`${home}#${teacher ? "students" : "lessons"}`}
              onClick={() => setMobileNav(false)}
            >
              {teacher ? <Users size={19} /> : <BookOpen size={19} />}
              {teacher ? "학생 목록" : "내 수업"}
            </Link>
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-tip">
              <span className="tiny-asterisk">✦</span>
              <strong>
                {teacher ? "함께 만드는 배움" : "생각은 자유롭게,"}
              </strong>
              <p>
                {teacher
                  ? "작은 발견도 놓치지 않도록.\n오늘의 교실을 살펴보세요."
                  : "틀려도 괜찮아요.\n다시 해 보면 되니까요."}
              </p>
            </div>
            <Link href="/" className="sidebar-home">
              <PanelLeftClose size={16} /> 공개 홈 둘러보기
            </Link>
          </div>
        </aside>
        {mobileNav && (
          <button
            className="sidebar-scrim"
            tabIndex={-1}
            aria-label="메뉴 닫기"
            onClick={closeNav}
          />
        )}
        <div className="app-content" inert={mobileNav}>
          <header className="app-topbar">
            <div>
              <Button
                ref={navToggle}
                variant="ghost"
                size="icon"
                className="mobile-only"
                aria-label="메뉴 열기"
                aria-expanded={mobileNav}
                onClick={() => setMobileNav(true)}
              >
                <Menu />
              </Button>
              <span className="breadcrumb">
                {teacher ? "선생님 공간" : `2학년 ${session?.classId}반`}
                <ChevronRight size={14} />
                <strong>{title}</strong>
              </span>
            </div>
            <div className="account-actions">
              <span className="user-avatar">
                {teacher ? "T" : session?.studentId?.slice(-2)}
              </span>
              <span className="user-name">
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
                onClick={() => {
                  logout();
                  router.push("/");
                }}
              >
                <LogOut size={18} />
              </Button>
            </div>
          </header>
          <main id="main-content" tabIndex={-1} className="dashboard-main">
            {children}
          </main>
          <footer className="app-footer">
            CS Class <span>생각하고, 시도하고, 발견하는 즐거움.</span>
          </footer>
        </div>
      </div>
    </>
  );
}
