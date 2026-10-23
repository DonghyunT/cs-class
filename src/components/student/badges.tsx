import { Award, BookCheck, Compass, Flame, Footprints, Puzzle, Target, Trophy, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/loading-state";
import { badgesFor, badgeTitle, type BadgeId } from "@/lib/classroom/achievements";
import type { StudentDashboard } from "@/lib/classroom/types";
import styles from "./badges.module.css";

const ICONS: Record<BadgeId, LucideIcon> = { "first-step": Footprints, concepts: Compass, "perfect-quiz": Target, missions: Puzzle, challenge: Flame, "lesson-complete": Trophy, "review-complete": BookCheck };

export function BadgeChip({ id }: { id: BadgeId }) {
  const Icon = ICONS[id];
  return <span className={styles.chip} data-badge={id}><Icon size={16} aria-hidden="true" />{badgeTitle(id)}</span>;
}

export function StudentBadges({ data, loading }: { data: StudentDashboard | null; loading: boolean }) {
  const badges = data ? badgesFor(data.lessons, data.work) : [];
  const earned = badges.filter(badge => badge.earned).length;
  return <section id="badges" className={styles.panel} aria-labelledby="badges-heading" aria-describedby="badges-scope">
    <div className={styles.heading}><h2 id="badges-heading"><span className={styles.icon}><Award size={20} aria-hidden="true" /></span>내 배지</h2>{badges.length > 0 && <span className={styles.total}>{badges.length}종 중 {earned}종 받음</span>}</div>
    <p id="badges-scope" className={styles.scope}>지금 열린 수업의 기록으로 받아요. 친구에게는 보이지 않아요.</p>
    {loading && !data && <div className={styles.loading} aria-hidden="true"><Skeleton /><Skeleton /></div>}
    {!loading && !data && <p className={styles.empty}>수업 기록을 확인하면 배지가 보여요.</p>}
    {data && !badges.length && <p className={styles.empty}>수업이 열리면 받을 수 있는 배지가 보여요.</p>}
    {badges.length > 0 && <ul className={styles.grid}>{badges.map(badge => {
      const Icon = ICONS[badge.id];
      const count = badge.id === "first-step" ? badge.earned ? "받음" : "아직" : badge.id === "challenge" ? `도전 미션 ${badge.total}개 중 ${badge.count}개 제출` : `${badge.total}개 수업 중 ${badge.count}개${badge.earned ? "에서 받음" : ""}`;
      return <li key={badge.id} className={styles.badge} data-badge={badge.id} data-earned={badge.earned}>
        <span className={styles.medal}><Icon size={22} aria-hidden="true" /></span>
        <div><h3>{badge.title}<span className="sr-only">{badge.earned ? " · 받은 배지" : " · 아직 받지 않은 배지"}</span></h3><strong>{count}</strong><p>{badge.how}</p></div>
      </li>;
    })}</ul>}
  </section>;
}
