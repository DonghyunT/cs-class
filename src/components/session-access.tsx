"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, GraduationCap } from "lucide-react";
import { Brand } from "@/components/visuals";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { useSession } from "@/components/session-provider";
import styles from "./session-access.module.css";

// Presentation shared by both frames; session and server authorization stay in their existing owners.
export function SessionAccess({ teacher = false, children }: { teacher?: boolean; children: ReactNode }) {
  const { session, loading, configured, error, refresh } = useSession();
  const valid = teacher ? session && session.role !== "student" : session?.role === "student" && !session.mustChangePassword;
  if (loading) return <main id="main-content" className={styles.accessState}><Brand /><h1>교실을 준비하고 있어요.</h1><LoadingState>로그인 상태를 확인하고 있어요.</LoadingState><Link href="/">공개 홈 둘러보기</Link></main>;
  if (!valid) return <main id="main-content" className={styles.accessState}>
    <Brand /><span className={styles.formIcon}><GraduationCap /></span>
    <h1>{session?.mustChangePassword ? "먼저 비밀번호를 바꿔 주세요." : "교실에 입장해 주세요."}</h1>
    <p role={error ? "alert" : undefined}>{error || (!configured ? "로그인 서비스를 연결하고 있어요. 선생님께 알려 주세요." : "본인의 계정으로 로그인하면 저장한 수업을 이어갈 수 있어요.")}</p>
    {error && <Button variant="outline" onClick={() => void refresh()}>접속 다시 확인</Button>}
    <Button nativeButton={false} render={<Link href={`/login/${teacher ? "teacher" : "student"}`} />}>입장 화면으로<ChevronRight size={16} /></Button>
  </main>;
  return children;
}
