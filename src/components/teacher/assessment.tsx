"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Gauge, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useSession, useTeacherClass } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { ASSESSMENT_STAGES, assessmentCsv, assessmentScore, rowPercent, stageTotals } from "@/lib/classroom/assessment";
import { classroomApi } from "@/lib/classroom/client";
import type { TeacherAssessment } from "@/lib/classroom/types";
import { problemMessage } from "./presentation";
import { TeacherToolbar } from "./teacher-toolbar";
import teacher from "./teacher.module.css";
import styles from "./assessment.module.css";

export function TeacherAssessmentView({ classId }: { classId?: string }) {
  const { session } = useSession();
  return <AppShell title="수행평가 진행률" teacher>{session && session.role !== "student" && (session.classIds.length ? <Assessment key={`${session.uid}:${classId}`} classId={classId} /> : <div className={teacher.empty}><Users size={28} aria-hidden="true" /><h1>아직 담당 반이 없어요.</h1><p>담당 반이 연결되면 수행평가 진행률을 확인할 수 있어요.</p></div>)}</AppShell>;
}

function Assessment({ classId }: { classId?: string }) {
  const { classId: selectedClassId, setClassId } = useTeacherClass(classId);
  const [data, setData] = useState<TeacherAssessment | null>(null);
  // Starts as the class's open lessons, the ones its students' dashboards add up.
  const [chosen, setChosen] = useState<string[] | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  // Names start hidden so the table can be opened in front of a class.
  const [showNames, setShowNames] = useState(false);
  const [unfinishedOnly, setUnfinishedOnly] = useState(false);
  const request = useRef(0);

  // Callers mark the request as fetching; the effect below starts from the initial fetching state.
  const load = useCallback((lessonIds?: string[]) => {
    const version = ++request.current;
    return classroomApi.assessment(selectedClassId, lessonIds).then((result) => {
      if (version !== request.current) return;
      setData(result); setError("");
      setChosen((previous) => previous ?? result.lessons.filter((lesson) => lesson.opened).map((lesson) => lesson.id));
    }, (problem: unknown) => {
      if (version === request.current) setError(problemMessage(problem));
    }).finally(() => { if (version === request.current) setFetching(false); });
  }, [selectedClassId]);

  useEffect(() => {
    void load();
    return () => { request.current += 1; };
  }, [load]);

  function selectClass(next: string) {
    if (!data?.classrooms.some((item) => item.id === next) || next === selectedClassId) return;
    request.current += 1; setData(null); setChosen(null); setError(""); setFetching(true); setClassId(next);
  }
  function reload(lessonIds?: string[]) {
    setFetching(true); void load(lessonIds);
  }

  const report = data?.report ?? null;
  const reportLessons = report ? report.lessonIds.map((id) => data!.lessons.find((lesson) => lesson.id === id)!) : [];
  const stale = !!report && !!chosen && (chosen.length !== report.lessonIds.length || chosen.some((id) => !report.lessonIds.includes(id)));
  const scored = report?.rows.map((row, index) => ({ row, index, percent: rowPercent(row, report.lessonIds) })) ?? [];
  const shown = unfinishedOnly ? scored.filter((item) => item.percent < 100) : scored;

  function download() {
    if (!data || !report) return;
    const url = URL.createObjectURL(new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), assessmentCsv(data.classroom.name, reportLessons, report.rows)], { type: "text/csv;charset=utf-8" }));
    const stamp = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Seoul" }).format(report.checkedAt).replace(/\D/g, "");
    const link = document.createElement("a");
    link.href = url; link.download = `수행평가-진행률-${data.classroom.name}-${stamp}.csv`;
    // Attached for the click: some browsers (older Firefox) ignore clicks on a detached link.
    document.body.append(link);
    try { link.click(); } finally { link.remove(); URL.revokeObjectURL(url); }
  }

  return <div className={teacher.page}>
    <div className={teacher.heading}>
      <div><p className={teacher.kicker}>선생님 공간</p><h1>수행평가 진행률</h1><p>개념·퀴즈·실습을 1/3씩 반영한 전체 진행률로 점수를 계산해요. 100%면 30점, 5%가 모자랄 때마다 2점씩 내려가 최저 6점이에요.</p></div>
    </div>
    <TeacherToolbar classId={selectedClassId ?? data?.classroom.id} classrooms={data?.classrooms ?? []} onClassChange={selectClass} onRefresh={() => reload(report?.lessonIds)} refreshing={fetching} updatedAt={report?.checkedAt ?? null} />
    {error && <div className={teacher.error} role="alert"><p>{error}</p><Button variant="outline" disabled={fetching} onClick={() => reload(report?.lessonIds)}>다시 불러오기</Button></div>}
    {!data && !error && <div className={teacher.loading} role="status"><span className={teacher.loadingBar} /><p>반 정보를 불러오고 있어요.</p></div>}
    {data && chosen && <section className={styles.lessons} aria-labelledby="assessment-lessons-title">
      <div className={teacher.sectionHeading}><div><h2 id="assessment-lessons-title">평가할 수업</h2><p>처음에는 지금 열린 정규 수업을 골라 두었어요. 복습 수업은 성적에 넣지 않아요.</p></div></div>
      {data.lessons.length ? <fieldset className={styles.lessonChoices}><legend className="sr-only">평가할 수업</legend>{data.lessons.map((lesson) => <label key={lesson.id} className={teacher.pendingFilter}>
        <input type="checkbox" checked={chosen.includes(lesson.id)} onChange={(event) => setChosen(event.target.checked ? [...chosen, lesson.id] : chosen.filter((id) => id !== lesson.id))} />
        <span>{lesson.title}</span><small>{lesson.opened ? "열림" : "닫힘"}</small>
      </label>)}</fieldset> : <p className={teacher.inlineNote}>평가할 정규 수업이 아직 없어요.</p>}
      <div className={styles.loadRow}>
        <Button disabled={fetching || !chosen.length} onClick={() => reload(data.lessons.filter((lesson) => chosen.includes(lesson.id)).map((lesson) => lesson.id))}><Gauge size={16} aria-hidden="true" />{report ? "진행률 다시 불러오기" : "진행률 불러오기"}</Button>
        <span>{stale ? "고른 수업이 바뀌었어요. 다시 불러와야 표에 반영돼요." : "버튼을 누를 때만 학생 기록을 읽어요."}</span>
      </div>
    </section>}
    {data && report && <section className={teacher.students} aria-labelledby="assessment-table-title">
      <div className={teacher.sectionHeading}><div><h2 id="assessment-table-title">학생별 진행률과 점수</h2><p>{reportLessons.map((lesson) => lesson.title).join(" · ")} 기준이에요.</p></div></div>
      <div className={teacher.summary}>
        <div><Users size={19} aria-hidden="true" /><span>등록 학생</span><strong>{scored.length}<small>명</small></strong></div>
        <div><CheckCircle2 size={19} aria-hidden="true" /><span>100% (30점)</span><strong>{scored.filter((item) => item.percent === 100).length}<small>명</small></strong></div>
        <div><Gauge size={19} aria-hidden="true" /><span>100% 미만</span><strong>{scored.filter((item) => item.percent < 100).length}<small>명</small></strong></div>
      </div>
      <div className={teacher.listToolbar}><span>{data.classroom.name}</span><div className={teacher.filters}>
        <label className={teacher.pendingFilter}><input type="checkbox" checked={showNames} onChange={(event) => setShowNames(event.target.checked)} />학번·닉네임 보기</label>
        <label className={teacher.pendingFilter}><input type="checkbox" checked={unfinishedOnly} onChange={(event) => setUnfinishedOnly(event.target.checked)} />100% 미만만</label>
        <Button variant="outline" disabled={!scored.length} onClick={download}><Download size={15} aria-hidden="true" />CSV 내려받기</Button>
      </div></div>
      <p className={teacher.resultCount} role="status">{shown.length}명 표시 · 전체 {scored.length}명</p>
      {!scored.length ? <div className={teacher.empty}><Users size={28} aria-hidden="true" /><h3>등록된 학생이 없어요.</h3></div> : !shown.length ? <div className={teacher.empty}><CheckCircle2 size={28} aria-hidden="true" /><h3>모든 학생이 100%예요.</h3></div> : <div className={styles.tableScroll}>
        <table className={teacher.table}><caption className="sr-only">{data.classroom.name} 수행평가 진행률</caption>
          <thead><tr><th scope="col">학생</th><th scope="col">전체 진행률</th><th scope="col">점수</th>{ASSESSMENT_STAGES.map(({ label }) => <th key={label} scope="col">{label}</th>)}<th scope="col">남은 활동</th></tr></thead>
          <tbody>{shown.map(({ row, index, percent }) => {
            const totals = stageTotals(row, report.lessonIds);
            // One chip per unfinished lesson, so the list grows with lessons rather than stages.
            const remaining = reportLessons.flatMap((lesson) => {
              const value = row.progress[lesson.id];
              const missing = ASSESSMENT_STAGES.filter(({ stage }) => value[stage].completed < value[stage].total);
              if (!missing.length) return [];
              return [ASSESSMENT_STAGES.every(({ stage }) => !value[stage].completed) ? `${lesson.title} · 시작 전` : `${lesson.title} · ${missing.map(({ stage, label }) => `${label} ${value[stage].completed}/${value[stage].total}`).join(" · ")}`];
            });
            return <tr key={row.uid}>
              <th scope="row">{showNames ? <>{row.studentId}{row.nickname && <small className={styles.nickname}>{row.nickname}</small>}</> : `학생 ${index + 1}`}</th>
              <td className={styles.number}>{percent}%</td>
              <td className={styles.number}><strong>{assessmentScore(percent)}점</strong></td>
              {ASSESSMENT_STAGES.map(({ stage }) => <td key={stage} className={styles.number}>{totals[stage].completed}/{totals[stage].total}</td>)}
              <td>{remaining.length ? <ul className={styles.remaining}>{remaining.map((item) => <li key={item}>{item}</li>)}</ul> : <span className={teacher.noRecord}>없음</span>}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
    </section>}
  </div>;
}
