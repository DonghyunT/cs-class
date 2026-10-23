import Link from "next/link";
import { ArrowRight, Award, BookCheck, Compass, Crown, Flame, Footprints, Lock, Palette, Puzzle, Sprout, Stamp, Target, Trophy, Zap, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/loading-state";
import { badgeKey, badgesFor, badgeTitle, lessonBadgesFor, STAMPS, type Badge, type BadgeId } from "@/lib/classroom/achievements";
import type { Lesson, StudentDashboard, Work } from "@/lib/classroom/types";
import styles from "./badges.module.css";

const ICONS: Record<BadgeId, LucideIcon> = { "first-step": Footprints, "first-work": Palette, concepts: Compass, "perfect-quiz": Target, missions: Puzzle, challenge: Flame, "lesson-complete": Trophy, "review-complete": BookCheck, stamps: Stamp, "all-clear": Crown, comeback: Sprout, streak: Zap };
const STAMP_LABELS: Record<(typeof STAMPS)[number], string> = { concepts: "개념", "perfect-quiz": "첫 회차 만점", missions: "미션", "lesson-complete": "완주" };

export function BadgeChip({ id }: { id: BadgeId }) {
  const Icon = ICONS[id];
  return <span className={styles.chip} data-badge={id}><Icon size={16} aria-hidden="true" />{badgeTitle(id)}</span>;
}

function Stars({ count }: { count: number }) {
  return <span className={styles.stars} role="img" aria-label={`별 5개 중 ${count}개`}>{[1, 2, 3, 4, 5].map(step => <span key={step} aria-hidden="true" data-on={step <= count}>★</span>)}</span>;
}

function StampRow({ lesson, work }: { lesson: Lesson; work: Work | undefined }) {
  const earned = lessonBadgesFor(lesson, work);
  return <ul className={styles.stamps} aria-label={`${lesson.title} 도장`}>{STAMPS.map(id => {
    const Icon = ICONS[id], on = earned.includes(id);
    return <li key={id} data-badge={id} data-earned={on}><span className={styles.stamp}><Icon size={18} aria-hidden="true" /></span>{STAMP_LABELS[id]}<span className="sr-only">{on ? " · 찍음" : " · 아직"}</span></li>;
  })}</ul>;
}

function BadgeCard({ badge, fresh }: { badge: Badge; fresh: boolean }) {
  const Icon = badge.kind === "rare" && !badge.earned ? Lock : ICONS[badge.id];
  const hidden = badge.kind === "rare" && !badge.earned;
  const count = badge.kind === "rare" ? badge.earned ? badge.id === "streak" ? "받음" : `${badge.count}개 수업에서 받음` : badge.teaser
    : badge.kind === "common" ? badge.earned ? "받음" : "아직"
    : badge.id === "challenge" ? `도전 미션 ${badge.count}개 제출` : badge.id === "stamps" ? `도장 ${badge.count}개` : `${badge.count}개 수업`;
  const step = badge.next === null ? null : badge.next - badge.count;
  return <li className={styles.badge} data-badge={badge.id} data-kind={badge.kind} data-earned={badge.earned} data-stars={badge.stars} data-fresh={fresh || undefined}>
    <span className={styles.medal}><Icon size={22} aria-hidden="true" /></span>
    <div>
      {fresh && <span className={styles.fresh}>새로 받음</span>}
      <h4>{hidden ? "???" : badge.title}<span className="sr-only">{hidden ? " · 아직 받지 않은 희귀 배지" : badge.earned ? " · 받은 배지" : " · 아직 받지 않은 배지"}</span></h4>
      {(badge.kind === "tiered" || badge.kind === "level") && <Stars count={badge.stars} />}
      <strong>{count}</strong>
      {(badge.kind === "tiered" || badge.kind === "level") && <span className={styles.next}><span className={styles.bar} aria-hidden="true"><span style={{ width: `${step === null ? 100 : Math.round(badge.count / badge.next! * 100)}%` }} /></span>{step === null ? "최고 단계" : `다음 별까지 ${step}개`}</span>}
      {!hidden && <p>{badge.how}</p>}
      {!hidden && badge.lessons.length > 0 && <p className={styles.where}>{badge.id === "first-step" ? "개념을 확인한 수업" : "받은 수업"}: {badge.lessons.join(", ")}</p>}
    </div>
  </li>;
}

// The dashboard shows this lesson's stamps; the badge page shows the whole collection.
export function StudentBadges({ data, loading, summary = false, fresh = [] }: { data: StudentDashboard | null; loading: boolean; summary?: boolean; fresh?: readonly string[] }) {
  const badges = data ? badgesFor(data.lessons, data.work) : [];
  const earned = badges.filter(badge => badge.earned).length;
  const regular = data ? data.lessons.filter(lesson => lesson.mode !== "review") : [];
  const target = regular.find(lesson => lesson.id === data?.classroom.currentLessonId) ?? regular.at(-1);
  const level = badges.find(badge => badge.id === "stamps"), rare = badges.filter(badge => badge.kind === "rare");
  const group = (kind: Badge["kind"]) => badges.filter(badge => badge.kind === kind);
  const list = (items: Badge[]) => <ul className={styles.grid}>{items.map(badge => <BadgeCard key={badge.id} badge={badge} fresh={fresh.includes(badgeKey(badge))} />)}</ul>;
  const rows = (lessons: Lesson[]) => <div className={styles.board}>{lessons.map(lesson => <div key={lesson.id} className={styles.boardRow}><span>{lesson.title}</span><StampRow lesson={lesson} work={data!.work[lesson.id]} /></div>)}</div>;
  const newest = [...regular].reverse();
  return <section id="badges" className={styles.panel} aria-labelledby="badges-heading" aria-describedby="badges-scope">
    <div className={styles.heading}><h2 id="badges-heading"><span className={styles.icon}><Award size={20} aria-hidden="true" /></span>{summary ? "내 배지" : "배지 모음"}</h2>{badges.length > 0 && <span className={styles.total}>{badges.length}종 중 {earned}종 받음</span>}{summary && <Link className={styles.all} href="/student/badges">모두 보기<ArrowRight size={15} aria-hidden="true" /></Link>}</div>
    <p id="badges-scope" className={styles.scope}>지금 열린 수업의 기록으로 받아요. 친구에게는 보이지 않아요.</p>
    {loading && !data && <div className={styles.loading} aria-hidden="true"><Skeleton /><Skeleton /></div>}
    {!loading && !data && <p className={styles.empty}>수업 기록을 확인하면 배지가 보여요.</p>}
    {data && !badges.length && <p className={styles.empty}>수업이 열리면 받을 수 있는 배지가 보여요.</p>}
    {summary && data && badges.length > 0 && !target && <p className={styles.empty}>정규 수업이 열리면 이번 수업 도장이 보여요.</p>}
    {summary && data && target && <div className={styles.today}>
      <h3>이번 수업 도장 <small>{target.title}</small></h3>
      <StampRow lesson={target} work={data.work[target.id]} />
      <p className={styles.tally}>{level && <>도장 {level.count}개 · <Stars count={level.stars} /></>}{rare.length > 0 && <> · 희귀 배지 {rare.filter(badge => badge.earned).length}/{rare.length}</>}</p>
    </div>}
    {!summary && badges.length > 0 && <>
      {level && <div className={styles.level}>{list([level])}</div>}
      {rare.length > 0 && <><h3 className={styles.section}>희귀 배지</h3>{list(rare)}</>}
      {group("tiered").length > 0 && <><h3 className={styles.section}>단계 배지</h3>{list(group("tiered"))}</>}
      {regular.length > 0 && <><h3 className={styles.section}>수업별 도장판</h3>
        {/* Newest first; older lessons fold away so the board stays short as lessons pile up. */}
        {rows(newest.slice(0, 6))}
        {newest.length > 6 && <details className={styles.older}><summary>지난 수업 {newest.length - 6}개 더 보기</summary>{rows(newest.slice(6))}</details>}
      </>}
      {group("common").length > 0 && <><h3 className={styles.section}>기본 배지</h3>{list(group("common"))}</>}
    </>}
  </section>;
}
