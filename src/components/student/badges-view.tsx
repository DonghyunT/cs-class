"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session-provider";
import { classroomApi } from "@/lib/classroom/client";
import type { StudentDashboard } from "@/lib/classroom/types";
import { StudentBadges } from "./badges";
import styles from "./student.module.css";

// Reads the student's records once on entry; there is no polling here.
export function StudentBadgesView() {
  const { session } = useSession();
  const [data, setData] = useState<StudentDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);
  const busy = useRef(false);
  const load = useCallback(async () => {
    // One request at a time, so an older failure cannot cover newer data.
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try { const result = await classroomApi.student(); if (alive.current) { setData(result); setError(""); } }
    catch (problem) { if (alive.current) setError(problem instanceof Error ? problem.message : "배지를 불러오지 못했어요."); }
    finally { busy.current = false; if (alive.current) setLoading(false); }
  }, []);
  useEffect(() => {
    alive.current = true;
    queueMicrotask(() => { if (alive.current) void load(); });
    return () => { alive.current = false; };
  }, [load]);
  return <div className={styles.dashboard}>
    <header className={styles.heading}>
      <div><span className={styles.eyebrow}>{data ? `${data.classroom.name} · ` : ""}{session?.studentId} 학생</span><h1>내 배지를 모아 봐요.</h1><p>배지마다 받는 방법과 받은 수업을 보여 줘요.</p></div>
    </header>
    {error && <div className={styles.notice} role="alert"><p>{error}</p><Button variant="outline" aria-disabled={loading} onClick={() => void load()}>다시 불러오기</Button></div>}
    <StudentBadges data={data} loading={loading} />
  </div>;
}
