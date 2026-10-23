"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Check, CheckCircle2, PartyPopper, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BadgeId } from "@/lib/classroom/achievements";
import { progressFor } from "@/lib/classroom/progress";
import type { Lesson, Work } from "@/lib/classroom/types";
import type { LessonMode } from "./work-controller";
import { BadgeChip } from "./badges";
import styles from "./lesson-complete.module.css";

const STAGES = [["concept", "개념"], ["quiz", "퀴즈"], ["practice", "실습"]] as const;

// A quiet line that stays on top of a finished lesson, so a returning student knows nothing is left.
export function CompletionBanner({ lesson, mode }: { lesson: Lesson; mode: LessonMode }) {
  return <div className={styles.banner} data-completion-banner>
    <CheckCircle2 size={20} aria-hidden="true" />
    <p><strong>{mode === "preview" ? "이 창에서 필수 활동을 모두 마쳤어요." : lesson.mode === "review" ? "이 복습은 모두 마쳤어요." : "이 수업은 완료했어요."}</strong>{mode !== "preview" && <span>완료 기록은 그대로 남아요.</span>}</p>
  </div>;
}

// Shown once, right when the last required activity is done; it never takes focus or blocks the page.
export function CompletionCelebration({ lesson, work, badges, mode, onClose }: { lesson: Lesson; work: Work; badges: BadgeId[]; mode: LessonMode; onClose: (returnFocus: boolean) => void }) {
  const progress = progressFor(lesson, work);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented && !document.querySelector("[role=dialog], [role=alertdialog]")) onClose(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose]);
  return <section className={styles.card} aria-labelledby="lesson-complete-heading" data-lesson-complete>
    <button type="button" className={styles.close} aria-label="완료 안내 닫기" onClick={() => onClose(true)}><X size={18} aria-hidden="true" /></button>
    <span className={styles.burst} aria-hidden="true"><PartyPopper size={28} /></span>
    <h2 id="lesson-complete-heading">{mode === "preview" ? "체험으로 필수 활동을 모두 마쳤어요!" : lesson.mode === "review" ? "이 복습을 모두 마쳤어요!" : "이 수업을 모두 마쳤어요!"}</h2>
    <ul className={styles.stages} aria-label="단계별 완료">{STAGES.map(([stage, label]) => <li key={stage}><Check size={15} aria-hidden="true" />{label} {progress[stage].completed}/{progress[stage].total}</li>)}</ul>
    {badges.length > 0 && <div className={styles.badges}><h3>{mode === "preview" ? "이번 체험으로 오른 배지" : "이번에 오른 배지"}</h3><ul>{badges.map(id => <li key={id}><BadgeChip id={id} /></li>)}</ul></div>}
    <div className={styles.actions}>
      {mode === "student" && <Button nativeButton={false} render={<Link href="/student/badges" />}>내 배지 보기</Button>}
      <Button variant="outline" onClick={() => onClose(true)}>계속 둘러보기</Button>
    </div>
  </section>;
}
