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
import { Brand } from "@/components/visuals";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session-provider";
import { useNavigationGuard } from "@/components/navigation-provider";

export function AppShell({
  children,
  title,
  teacher = false,
}: {
  children: ReactNode;
  title: string;
  teacher?: boolean;
}) {
  const { session, logout, loading, configured, error, refresh } = useSession();
  const { beforeLeave } = useNavigationGuard();
  const [logoutError, setLogoutError] = useState("");
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
    : session?.role === "student" && !session.mustChangePassword;
  if (loading) return <main id="main-content" className="access-state" aria-busy="true"><Brand /><h1>교실을 준비하고 있어요.</h1></main>;
  if (!valid)
    return (
      <>
        <main id="main-content" className="access-state">
          <Brand />
          <span className="form-icon">
            <GraduationCap />
          </span>
          <h1>
            {session?.mustChangePassword
              ? "먼저 비밀번호를 바꿔 주세요."
              : "교실에 입장해 주세요."}
          </h1>
          <p role={error ? "alert" : undefined}>{error || (!configured ? "로그인 서비스를 연결하고 있어요. 선생님께 알려 주세요." : "본인의 계정으로 로그인하면 저장한 수업을 이어갈 수 있어요.")}</p>
          {error && <Button variant="outline" onClick={() => void refresh()}>접속 다시 확인</Button>}
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
            {teacher ? "선생님 공간" : "우리 반 교실"}
          </div>
          <nav aria-label="교실 메뉴">
            <Link
              className={path === home ? "active" : ""}
              href={home}
              onClick={() => setMobileNav(false)}
            >
              <Home size={19} />
              {teacher ? "수업 현황" : "대시보드"}
              <ChevronRight size={15} />
            </Link>
            <Link
              href={`${home}#${teacher ? "students" : "lessons"}`}
              onClick={() => setMobileNav(false)}
            >
              {teacher ? <Users size={19} /> : <BookOpen size={19} />}
              {teacher ? "학생 관리" : "열린 수업"}
            </Link>
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-tip"><strong>{teacher ? "수업 운영" : "저장하고 이어가기"}</strong><p>{teacher ? "담당 반의 수업과 학생 기록을 확인해요." : "저장 완료를 확인하면 다음에도 이어갈 수 있어요."}</p></div>
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
                {teacher ? "선생님 공간" : `${session?.classId?.split("-")[0]}학년 ${session?.classId?.split("-")[1]}반`}
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
          <main id="main-content" tabIndex={-1} className="dashboard-main">
            {logoutError && <p role="alert" className="app-error">{logoutError}</p>}
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
