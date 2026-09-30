import type { ReactNode } from "react";
import styles from "./loading-state.module.css";

export function LoadingState({ children }: { children: ReactNode }) {
  return <div className={styles.status} role="status"><span className={styles.spinner} aria-hidden="true" />{children}</div>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`${styles.skeleton} ${className}`} aria-hidden="true" />;
}

export function LoadingSpinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}
