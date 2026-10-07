"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { useSession } from "@/components/session-provider";
import { useNavigationGuard } from "@/components/navigation-provider";
import { api } from "@/lib/classroom/client";
import type { Session } from "@/lib/classroom/types";
import styles from "./settings.module.css";

type Profile = { session: Session; nickname: string; passwordProvider: "password" | "google" | "unavailable" };

export function SettingsScreen({ teacher = false }: { teacher?: boolean }) {
  const { session } = useSession();
  return <AppShell title="설정" teacher={teacher}>{session && !session.mustChangePassword && (teacher ? session.role !== "student" : session.role === "student") && <Settings key={session.uid} session={session} />}</AppShell>;
}

function Settings({ session }: { session: Session }) {
  const { refresh } = useSession();
  const { register } = useNavigationGuard();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [nickname, setNickname] = useState(session.nickname ?? "");
  const [savedNickname, setSavedNickname] = useState(session.nickname ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState<"nickname" | "password" | null>(null);
  const [nicknameError, setNicknameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [nicknameStatus, setNicknameStatus] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [guardError, setGuardError] = useState("");
  const alive = useRef(true);
  const dirty = nickname !== savedNickname || Boolean(currentPassword || password || confirmation);
  const pending = useRef({ dirty, busy });
  useEffect(() => { pending.current = { dirty, busy }; }, [dirty, busy]);
  const accountLabel = [session.studentId && `학번 ${session.studentId}`, session.classId && `${session.classId.split("-")[0]}학년 ${session.classId.split("-")[1]}반`].filter(Boolean).join(" · ");
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    let active = true;
    void api<Profile>("auth/profile", undefined, "GET", session.uid).then(value => {
      if (!active) return;
      setProfile(value); setNickname(value.nickname); setSavedNickname(value.nickname); setLoadError("");
    }).catch(error => { if (active) setLoadError(error instanceof Error ? error.message : "설정을 확인하지 못했어요."); });
    return () => { active = false; };
  }, [session.uid, attempt]);
  useEffect(() => register({
    isDirty: () => pending.current.dirty || Boolean(pending.current.busy),
    flush: async () => {
      if (!pending.current.dirty && !pending.current.busy) return true;
      setGuardError("변경한 내용을 저장하거나 입력을 되돌린 뒤 이동해 주세요.");
      return false;
    },
  }), [register]);

  async function saveNickname(event: FormEvent) {
    event.preventDefault();
    if (busy || !profile) return;
    const value = nickname.trim();
    if (value.length > 20 || /\p{Cc}/u.test(nickname)) { setNicknameError("닉네임은 20자 이내로 입력해 주세요. 줄바꿈과 제어 문자는 사용할 수 없어요."); return; }
    setBusy("nickname"); setNicknameError(""); setNicknameStatus("");
    try {
      const result = await api<{ session: Session }>("auth/profile", { nickname: value }, "POST", session.uid);
      if (!alive.current) return;
      const saved = result.session.nickname ?? "";
      setNickname(saved); setSavedNickname(saved); setProfile({ ...profile, nickname: saved, session: result.session });
      setNicknameStatus("닉네임을 저장했어요."); setGuardError("");
      await refresh();
    } catch (error) { if (alive.current) setNicknameError(error instanceof Error ? error.message : "닉네임을 저장하지 못했어요."); }
    finally { if (alive.current) setBusy(null); }
  }
  async function savePassword(event: FormEvent) {
    event.preventDefault();
    if (busy || profile?.passwordProvider !== "password") return;
    if (!currentPassword) { setPasswordError("현재 비밀번호를 입력해 주세요."); return; }
    if (password.length < 8 || password.length > 128 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) { setPasswordError("영문과 숫자를 포함해 8자 이상으로 만들어 주세요."); return; }
    if (password !== confirmation) { setPasswordError("새 비밀번호 확인이 일치하지 않아요."); return; }
    setBusy("password"); setPasswordError(""); setPasswordStatus("");
    try {
      await api<{ session: Session }>("auth/password-self", { currentPassword, password }, "POST", session.uid);
      if (!alive.current) return;
      setCurrentPassword(""); setPassword(""); setConfirmation(""); setGuardError("");
      setPasswordStatus("비밀번호를 변경했어요. 학습 기록과 현재 접속은 유지돼요.");
      await refresh();
    } catch (error) { if (alive.current) setPasswordError(error instanceof Error ? error.message : "비밀번호를 변경하지 못했어요."); }
    finally { if (alive.current) setBusy(null); }
  }
  return <div className={styles.page}>
    <header className={styles.heading}><span>{session.role === "student" ? "학생" : session.role === "instructor" ? "관리자" : "선생님"} 설정</span><h1>내 계정을 관리해요.</h1><p>{accountLabel && `${accountLabel} · `}닉네임과 비밀번호를 관리할 수 있어요. 계정과 학습 기록은 그대로 유지돼요.</p></header>
    {guardError && <p className={styles.error} role="alert">{guardError}</p>}
    {loadError ? <div className={styles.error} role="alert"><p>{loadError}</p><Button variant="outline" onClick={() => setAttempt(value => value + 1)}>다시 불러오기</Button></div> : !profile && <LoadingState>계정 설정을 확인하고 있어요.</LoadingState>}
    {profile && <div className={styles.panels}>
      <section className={styles.panel} aria-labelledby="nickname-heading"><h2 id="nickname-heading">닉네임</h2><p>교실에서 표시할 이름이에요. 비워 두면 기본 이름을 사용해요.</p><form noValidate onSubmit={event => void saveNickname(event)}><label htmlFor="settings-nickname">닉네임</label><input id="settings-nickname" type="text" autoComplete="nickname" maxLength={20} value={nickname} readOnly={Boolean(busy)} onChange={event => { setNickname(event.target.value); setNicknameStatus(""); setGuardError(""); }} aria-describedby="nickname-help" /><small id="nickname-help">최대 20자 · 학번과 반은 바뀌지 않아요.</small><div className={styles.actions}><Button type="submit" aria-disabled={Boolean(busy)}>{busy === "nickname" ? "저장 중" : "저장"}</Button><Button type="button" variant="ghost" aria-disabled={Boolean(busy)} onClick={() => { if (busy) return; setNickname(savedNickname); setNicknameError(""); setNicknameStatus(""); setGuardError(""); }}>되돌리기</Button></div>{nicknameError && <p className={styles.error} role="alert">{nicknameError}</p>}<p className={styles.status} role="status">{nicknameStatus}</p></form></section>
      <section className={styles.panel} aria-labelledby="password-heading"><h2 id="password-heading">비밀번호</h2>{profile.passwordProvider === "password" ? <><p>현재 비밀번호를 확인한 뒤 새 비밀번호로 바꿔요.</p><form noValidate onSubmit={event => void savePassword(event)}>{([
        ["settings-current-password", "현재 비밀번호", currentPassword, setCurrentPassword, "current-password"],
        ["settings-password", "새 비밀번호", password, setPassword, "new-password"],
        ["settings-password-confirmation", "새 비밀번호 확인", confirmation, setConfirmation, "new-password"],
      ] as const).map(([id, label, value, setter, autocomplete]) => <div key={id} className={styles.field}><label htmlFor={id}>{label}</label><input id={id} type="password" autoComplete={autocomplete} maxLength={128} value={value} readOnly={Boolean(busy)} onChange={event => { setter(event.target.value); setPasswordStatus(""); setGuardError(""); }} aria-describedby="password-help" /></div>)}<small id="password-help">영문과 숫자를 포함해 8자 이상으로 만들어 주세요.</small><div className={styles.actions}><Button type="submit" aria-disabled={Boolean(busy)}>{busy === "password" ? "변경 중" : "변경"}</Button><Button type="button" variant="ghost" aria-disabled={Boolean(busy)} onClick={() => { if (busy) return; setCurrentPassword(""); setPassword(""); setConfirmation(""); setPasswordError(""); setPasswordStatus(""); setGuardError(""); }}>비우기</Button></div>{passwordError && <p className={styles.error} role="alert">{passwordError}</p>}<p className={styles.status} role="status">{passwordStatus}</p></form></> : <p>{profile.passwordProvider === "google" ? "Google 계정에서 관리하는 비밀번호예요. 변경은 Google 계정 설정에서 해주세요." : "이 계정은 앱에서 비밀번호를 변경할 수 없어요. 로그인 계정의 제공 서비스에서 확인해 주세요."}</p>}</section>
    </div>}
  </div>;
}
