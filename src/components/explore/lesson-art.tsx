import { Database, Fingerprint, GitBranch } from "lucide-react";
import type { LessonId } from "@/lib/demo-data";
import styles from "./explore.module.css";

export function LessonArt({ kind }: { kind: LessonId }) {
  if (kind === "flow")
    return (
      <div className={styles["mini-flow"]} aria-hidden="true">
        <span className={styles["mini-pill"]} />
        <i />
        <span className={styles["mini-diamond"]} />
        <i />
        <div>
          <span />
          <span />
        </div>
        <GitBranch size={22} className={styles["art-corner"]} />
      </div>
    );
  if (kind === "data")
    return (
      <div className={styles["data-art"]} aria-hidden="true">
        <div className={styles["data-bars"]}>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <Database size={24} className={styles["art-corner"]} />
        <div className={styles["data-spark"]}>✧</div>
      </div>
    );
  return (
    <div className={styles["digital-art"]} aria-hidden="true">
      <div className={styles["digital-orbit"]} />
      <div className={[styles["digital-orbit"], styles["second"]].join(" ")} />
      <Fingerprint size={62} strokeWidth={1.3} />
      <span className={styles["orbit-point"]} />
      <span className={[styles["orbit-point"], styles["second"]].join(" ")} />
    </div>
  );
}
