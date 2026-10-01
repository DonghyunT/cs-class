"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Eye, EyeOff, GraduationCap, KeyRound, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/visuals";
import { LoadingState } from "@/components/ui/loading-state";
import { useSession } from "@/components/session-provider";
import { api, classroomApi } from "@/lib/classroom/client";
import { googleLogin, prepareGoogleLogin } from "@/lib/classroom/google-login";
import styles from "./login-screen.module.css";

export function LoginScreen({ role }: { role: "student" | "teacher" }) {
  const { session, acceptSession, loading, configured, error: sessionError } = useSession();
  const router = useRouter();
  const [studentId, setStudentId] = useState(""); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [visible, setVisible] = useState(false); const [instructor, setInstructor] = useState(false);
  const [guestEnabled, setGuestEnabled] = useState(false);
  const [guestRole, setGuestRole] = useState<"student" | "teacher" | null>(null);
  const changing = role === "student" && session?.role === "student" && session.mustChangePassword;
  useEffect(() => {
    let alive = true;
    void api<{ guestLoginEnabled?: boolean }>("auth/config").then((value) => { if (alive) setGuestEnabled(value.guestLoginEnabled === true); }).catch(() => undefined);
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (role === "teacher") void prepareGoogleLogin().catch(() => undefined); }, [role]);
  useEffect(() => {
    if (session && !session.mustChangePassword) router.replace(session.role === "student" ? "/student" : "/teacher");
  }, [session, router]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setError("");
    if (changing) {
      if (password.length < 6 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) { setError("영문과 숫자를 포함해 6자 이상으로 만들어 주세요."); return; }
      if (password !== confirm) { setError("두 비밀번호가 달라요. 다시 확인해 주세요."); return; }
    }
    setBusy(true);
    try {
      const result = changing ? await classroomApi.changePassword(password) : await classroomApi.login(role === "student" ? "student" : "instructor", role === "student" ? studentId.trim() : "", password);
      acceptSession(result.session); setPassword(""); setConfirm(""); setVisible(false);
      if (!result.session.mustChangePassword) router.replace(result.session.role === "student" ? "/student" : "/teacher");
    } catch (problem) { setError(problem instanceof Error ? problem.message : "로그인하지 못했어요. 다시 시도해 주세요."); }
    finally { setBusy(false); }
  }
  async function google() {
    if (busy) return; setError(""); setBusy(true);
    try { const result = await googleLogin(); acceptSession(result.session); router.replace("/teacher"); }
    catch (problem) {
      const code = (problem as { code?: string }).code;
      setError(code === "auth/popup-closed-by-user" ? "로그인 창이 닫혔어요. 준비되면 다시 눌러 주세요." : code === "auth/unauthorized-domain" ? "이 주소의 Google 로그인 설정을 확인해야 해요." : code?.startsWith("auth/") ? "Google 로그인 창을 열지 못했어요. 팝업 설정과 연결을 확인해 주세요." : problem instanceof Error ? problem.message : "Google 로그인을 다시 시도해 주세요.");
    } finally { setBusy(false); }
  }
  async function guest(role: "student" | "teacher") {
    if (busy) return; setError(""); setBusy(true); setGuestRole(role);
    try {
      const result = await classroomApi.guest(role);
      acceptSession(result.session); setPassword(""); setConfirm(""); setVisible(false);
      router.replace(result.session.mustChangePassword ? "/login/student" : result.session.role === "student" ? "/student" : "/teacher");
    } catch (problem) { setError(problem instanceof Error ? problem.message : "게스트로 입장하지 못했어요. 다시 시도해 주세요."); }
    finally { setBusy(false); setGuestRole(null); }
  }
  const message = error || sessionError;
  return <div className={styles.page}>
    <header className={styles.header}><Brand /><Link href="/" className={styles.back}><ArrowLeft size={16} /> 홈으로</Link></header>
    <main id="main-content" className={styles.main}>
      <div className={styles.intro}><span className={styles.kicker}>CS CLASS</span><h1>{changing ? "나만의 비밀번호를 만들어요" : role === "student" ? "우리 반 교실로 입장해요" : "선생님, 수업을 준비해요"}</h1><p>{changing ? "앞으로 사용할 비밀번호예요. 다른 사람에게 알려주지 마세요." : role === "student" ? "선생님께 받은 학번과 비밀번호를 입력해 주세요." : "등록된 계정으로 담당 반의 수업과 학생을 확인하세요."}</p></div>
      <section className={styles.card} aria-label={changing ? "비밀번호 변경" : "로그인"}>
        <div className={styles.cardTitle}><span className={`${styles.icon} ${role === "teacher" ? styles.teacherIcon : ""}`} aria-hidden="true">{changing ? <KeyRound /> : role === "student" ? <BookOpen size={25} strokeWidth={1.6} /> : <GraduationCap size={27} strokeWidth={1.6} />}</span><div><h2>{changing ? "첫 입장 · 비밀번호 변경" : role === "student" ? "학생 로그인" : instructor ? "교사 비밀번호 로그인" : "교사 로그인"}</h2><p>{changing ? `${session?.studentId} 학생` : "저장한 수업은 다음에도 이어갈 수 있어요."}</p></div></div>
        {!configured && !loading && <p className={styles.notice} role="status">로그인 서비스 연결을 준비하고 있어요. 선생님께 알려 주세요.</p>}
        {loading && <LoadingState>로그인 상태를 확인하고 있어요. 잠시만 기다려 주세요.</LoadingState>}
        {message && <p id="login-error" className={styles.error} role="alert">{message}</p>}
        {role === "teacher" && !instructor ? <>
          <div className={styles.loginMethods}>
            <Button className={styles.primary} size="lg" autoFocus disabled={busy || loading || !configured} onClick={() => void google()}>{busy ? <LoaderCircle className={styles.spinner} size={18} /> : <span className={styles.google} aria-hidden="true">G</span>} Google 계정으로 로그인</Button>
            <Button className={`${styles.primary} ${styles.passwordLogin}`} size="lg" disabled={busy || loading || !configured} onClick={() => { setInstructor(true); setError(""); }}><KeyRound size={18} />교사 비밀번호 로그인</Button>
          </div>
          <p className={styles.helper}>사전에 등록된 선생님 계정만 입장할 수 있어요.</p>
        </> : <form onSubmit={submit} aria-describedby={message ? "login-error" : undefined}>
          {role === "student" && !changing && <div className={styles.field}><Label htmlFor="student-id">학번</Label><Input id="student-id" name="username" inputMode="numeric" autoComplete="username" placeholder="학번 5자리" maxLength={5} pattern="2[0-9]{4}" required value={studentId} onChange={(event) => setStudentId(event.target.value)} autoFocus /></div>}
          <div className={styles.field}><Label htmlFor="password">{changing ? "새 비밀번호" : "비밀번호"}</Label><div className={styles.password}><Input id="password" name="password" autoFocus={instructor} type={visible ? "text" : "password"} autoComplete={changing ? "new-password" : "current-password"} placeholder={changing ? "영문과 숫자를 포함해 6자 이상" : "비밀번호를 입력해 주세요"} required maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
          {changing && <div className={styles.field}><Label htmlFor="confirm-password">새 비밀번호 확인</Label><Input id="confirm-password" name="confirmPassword" type={visible ? "text" : "password"} autoComplete="new-password" placeholder="한 번 더 입력해 주세요" required maxLength={128} value={confirm} onChange={(event) => setConfirm(event.target.value)} /></div>}
          <Button type="submit" size="lg" className={styles.primary} disabled={busy || loading || !configured}>{busy && <LoaderCircle size={18} className={styles.spinner} />}{busy ? "확인하고 있어요" : changing ? "비밀번호 저장하고 입장" : "교실 입장"}{!busy && <ArrowRight size={17} />}</Button>
          <p className={styles.helper}>{changing ? "처음 받은 비밀번호는 다시 사용할 수 없어요." : "비밀번호를 잊었다면 선생님께 초기화를 요청해 주세요."}</p>
          {instructor && <button className={styles.textButton} type="button" disabled={busy} onClick={() => { setInstructor(false); setError(""); setPassword(""); }}>교사 Google 로그인으로 돌아가기</button>}
        </form>}
        {guestEnabled && !changing && <section className={styles.guest} aria-label="로컬 게스트 입장">
          <h3>빠르게 체험하기</h3><p>테스트 계정으로 바로 입장해 보세요.</p>
          <div className={styles.guestButtons}>
            <Button variant="outline" type="button" disabled={busy || loading || !configured} onClick={() => void guest("student")}>{guestRole === "student" ? <LoaderCircle size={16} className={styles.spinner} /> : <BookOpen size={16} />}게스트 학생</Button>
            <Button variant="outline" type="button" disabled={busy || loading || !configured} onClick={() => void guest("teacher")}>{guestRole === "teacher" ? <LoaderCircle size={16} className={styles.spinner} /> : <GraduationCap size={16} />}게스트 교사</Button>
          </div><p>테스트 기록은 로컬 서버를 종료하면 사라져요.</p>
        </section>}
      </section>
      <Link className={styles.switchRole} href={`/login/${role === "student" ? "teacher" : "student"}`}>{role === "student" ? "선생님으로 입장하기" : "학생으로 입장하기"} <ArrowRight size={14} /></Link>
    </main><footer className={styles.footer}>CS Class · 즐거운 정보 교실</footer>
  </div>;
}
