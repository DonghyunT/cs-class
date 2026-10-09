import Link from "next/link";
import type { ClassSettings, Lesson } from "@/lib/classroom/types";
import styles from "./class-preparation-table.module.css";

export function ClassPreparationTable({ classrooms, lessons }: { classrooms: readonly ClassSettings[]; lessons: readonly Lesson[] }) {
  return <section className={styles.panel} aria-labelledby="class-preparation-heading">
    <h2 id="class-preparation-heading">담당 반 수업 준비</h2>
    <p>조회된 담당 반의 공개 설정이에요. 반별 설정을 열어 이번 수업을 준비해 주세요.</p>
    <table className={styles.table}>
      <caption className="sr-only">담당 반 수업 준비</caption>
      <thead><tr><th scope="col">반</th><th scope="col">이번 수업</th><th scope="col">열린 수업</th><th scope="col">설정</th></tr></thead>
      <tbody>{[...classrooms].sort((a, b) => a.id.localeCompare(b.id, "ko", { numeric: true })).map(classroom => <tr key={classroom.id}>
        <th scope="row">{classroom.name}</th>
        <td>{classroom.currentLessonId ? lessons.find(lesson => lesson.id === classroom.currentLessonId)?.title ?? "수업 정보 확인 필요" : "미지정"}</td>
        <td>{classroom.openedLessonIds.length}개</td>
        <td><Link className={styles.settings} href={`/teacher/classes?${new URLSearchParams({ classId: classroom.id, manage: "1" })}`} aria-label={`${classroom.name} 설정 열기`}>설정 열기</Link></td>
      </tr>)}</tbody>
    </table>
  </section>;
}
