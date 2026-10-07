"use client";

import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { dateLabel } from "./presentation";
import styles from "./teacher-toolbar.module.css";

export function TeacherToolbar({ classId, classrooms, onClassChange, onRefresh, refreshing = false, updatedAt, children }: {
  classId?: string | null;
  classrooms: readonly { id: string; name: string }[];
  onClassChange: (id: string) => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
  refreshing?: boolean;
  updatedAt?: number | null;
  children?: ReactNode;
}) {
  return <div className={styles.toolbar}>
    <label className={styles.picker}><span>담당 반</span><Select label="담당 반" value={classId ?? ""} onValueChange={onClassChange} disabled={!classrooms.length} options={classrooms.length ? classrooms.map(classroom => ({ value: classroom.id, label: classroom.name })) : [{ value: "", label: "반 정보 확인 중" }]} /></label>
    <div className={styles.tools}>
      <span className={styles.updated} role="status">{refreshing ? "확인 중…" : updatedAt ? `${dateLabel(updatedAt)} 확인` : "저장된 기록 확인"}</span>
      <Button variant="ghost" className={styles.refreshButton} aria-label="수업 새로고침" title="수업 새로고침" disabled={refreshing} onClick={onRefresh}><RefreshCw size={17} aria-hidden="true" /></Button>
      {children}
    </div>
  </div>;
}
