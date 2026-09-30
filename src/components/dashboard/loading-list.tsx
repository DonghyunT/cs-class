import { LoadingState, Skeleton } from "@/components/ui/loading-state";
import styles from "./dashboard.module.css";

export function LoadingList({ label, checklist = false }: { label: string; checklist?: boolean }) {
  return <div><LoadingState>{label}</LoadingState><div className={styles.loadingList} aria-hidden="true">{[0, 1, 2].map((row) => <div key={row} className={styles.loadingRow}>{checklist && <Skeleton className={styles.loadingCheck} />}<div><Skeleton /><Skeleton className={styles.loadingShort} /></div></div>)}</div></div>;
}
