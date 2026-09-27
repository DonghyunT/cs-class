"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand, DemoBanner, FlowArt } from "@/components/visuals";
import { useDemo } from "@/components/demo-provider";
import { DEMO_PASSWORD, INSTRUCTOR_PASSWORD } from "@/lib/demo-data";

export function LoginScreen({ role }: { role: "student" | "teacher" }) {
  const demo = useDemo();
  const router = useRouter();
  const [id, setId] = useState("20101");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const changing =
    role === "student" &&
    demo.session?.role === "student" &&
    demo.session.mustChange;
  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (changing) {
      if (password.length < 8 || password === DEMO_PASSWORD) {
        setError(
          "초기 비밀번호와 다른 8자 이상의 시안용 비밀번호를 입력해 주세요.",
        );
        return;
      }
      if (password !== confirm) {
        setError("두 비밀번호가 달라요. 한 번 더 확인해 주세요.");
        return;
      }
      demo.changePassword(password);
      setPassword("");
      setConfirm("");
      router.push("/student");
      return;
    }
    if (role === "student") {
      const message = demo.loginStudent(id.trim(), password);
      if (message) {
        setError(message);
        return;
      }
      const account = demo.accounts[id.trim()];
      setPassword("");
      if (account && !account.mustChange) router.push("/student");
    } else {
      if (password !== INSTRUCTOR_PASSWORD) {
        setError("시안 비밀번호를 확인해 주세요.");
        return;
      }
      demo.loginStaff("instructor");
      setPassword("");
      router.push("/teacher");
    }
  }
  return (
    <>
      <DemoBanner />
      <div className="login-layout">
        <aside className="login-story">
          <Brand />
          <div>
            <span className="eyebrow">WELCOME TO YOUR CLASS</span>
            <h2>
              오늘은 어떤
              <br />
              발견을 해 볼까요?
            </h2>
            <p>
              한 번의 작은 시도가
              <br />
              새로운 생각의 시작이 될 거예요.
            </p>
          </div>
          <FlowArt />
          <small>CS Class · 즐거운 정보 교실</small>
        </aside>
        <main id="main-content" className="login-main">
          <Link href="/" className="back-link">
            <ArrowLeft size={17} /> 홈으로 돌아가기
          </Link>
          <div className="login-form-wrap">
            <span className="form-icon">
              {changing ? <KeyRound /> : <ShieldCheck />}
            </span>
            <span className="eyebrow">
              {changing
                ? "FIRST STEP"
                : role === "student"
                  ? "STUDENT"
                  : "TEACHER"}
            </span>
            <h1>
              {changing
                ? "나만의 비밀번호 만들기"
                : role === "student"
                  ? "반가워요, 교실로 가 볼까요?"
                  : "선생님, 반갑습니다."}
            </h1>
            <p className="form-intro">
              {changing
                ? `${demo.session?.studentId} 학생, 처음 입장할 때 한 번만 바꾸면 돼요.`
                : role === "student"
                  ? "학번으로 로그인하면 우리 반이 바로 보여요."
                  : "오늘의 수업과 우리 반 학생들을 만나 보세요."}
            </p>
            {role === "teacher" && (
              <>
                <Button
                  variant="outline"
                  className="google-button"
                  onClick={() => {
                    demo.loginStaff("teacher");
                    router.push("/teacher");
                  }}
                >
                  <span className="google-g">G</span> Google 로그인 화면 체험
                </Button>
                <p className="google-note">
                  시안에서는 Google 연결 없이 관리자 화면으로 이동합니다.
                </p>
                <div className="form-divider">
                  <span />
                  강사님 입장
                  <span />
                </div>
              </>
            )}
            <form onSubmit={submit} className="login-form">
              {role === "student" && !changing && (
                <div className="field">
                  <Label htmlFor="student-id">학번</Label>
                  <Input
                    id="student-id"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={5}
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    required
                    aria-describedby="demo-help"
                  />
                </div>
              )}
              <div className="field">
                <Label htmlFor="password">
                  {changing ? "새 비밀번호" : "비밀번호"}
                </Label>
                <div className="password-input">
                  <Input
                    id="password"
                    type={visible ? "text" : "password"}
                    autoComplete="off"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      changing
                        ? "8자 이상 입력해 주세요"
                        : "시안 비밀번호를 입력해 주세요"
                    }
                    required
                    aria-invalid={!!error}
                    aria-describedby={error ? "login-error" : "demo-help"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Button>
                </div>
              </div>
              {changing && (
                <div className="field">
                  <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="off"
                    required
                  />
                </div>
              )}
              {error && (
                <p role="alert" id="login-error" className="form-error">
                  {error}
                </p>
              )}
              <Button type="submit" size="lg" className="full-width">
                {changing
                  ? "변경하고 교실로 가기"
                  : role === "student"
                    ? "내 교실로 입장"
                    : "강사님으로 입장"}
                <ArrowRight size={18} />
              </Button>
            </form>
            <div className="demo-help" id="demo-help">
              <strong>화면 체험 안내</strong>
              <p>
                {changing ? (
                  "실제 사용 중인 비밀번호는 입력하지 마세요. 입력값은 이 화면 체험 중에만 사용돼요."
                ) : role === "student" ? (
                  <>
                    학번 <code>20101</code> · 비밀번호{" "}
                    <code>{DEMO_PASSWORD}</code>
                    <br />
                    11반의 빈 교실은 <code>21101</code>로 체험할 수 있어요.
                  </>
                ) : (
                  <>
                    강사 시안 비밀번호 <code>{INSTRUCTOR_PASSWORD}</code>
                    <br />
                    10·11반 관리 화면만 볼 수 있습니다.
                  </>
                )}
              </p>
            </div>
            {role === "student" && !changing && (
              <p className="login-footnote">
                비밀번호가 기억나지 않으면 선생님께 알려 주세요.
              </p>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
