"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useDemo } from "@/components/demo-provider";
import { LessonArt } from "@/components/visuals";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { lessons } from "@/lib/demo-data";

export default function StudentHome() {
  const { session, classes, visited } = useDemo();
  const state = classes[session?.classId ?? 1];
  const current = lessons.find((item) => item.id === state.current);
  const opened = lessons.filter((item) => state.opened.includes(item.id));
  const recent = (visited[session?.studentId ?? ""] ?? []).filter((id) =>
    state.opened.includes(id),
  );
  const [filter, setFilter] = useState<"all" | "visited">("all");
  const shown =
    filter === "visited"
      ? opened.filter((lesson) => recent.includes(lesson.id))
      : opened;
  return (
    <AppShell title="내 교실">
      <div className="page-heading">
        <div>
          <span className="eyebrow">READY FOR A NEW DISCOVERY?</span>
          <h1>
            반가워, {session?.studentId ?? ""} 학생{" "}
            <span className="greeting-spark">✦</span>
          </h1>
          <p>오늘도 네 생각을 펼쳐 봐. 작은 시도도 좋은 시작이야.</p>
        </div>
        <span className="class-badge">2학년 {session?.classId}반</span>
      </div>
      <div className="student-top-grid">
        <section
          className={`current-lesson ${!current ? "empty-current" : ""}`}
        >
          <div className="current-copy">
            <span className="current-label">
              <span /> 이번 수업
            </span>
            {current ? (
              <>
                <h2>{current.title}</h2>
                <p>
                  {current.subtitle}
                  <br />
                  선생님이 우리 반을 위해 열어 둔 수업이야.
                </p>
                <Button
                  size="lg"
                  nativeButton={false}
                  render={<Link href={`/classroom/${current.id}`} />}
                >
                  수업으로 가기 <ArrowRight size={18} />
                </Button>
              </>
            ) : (
              <>
                <h2>다음 수업을 기다리는 중!</h2>
                <p>
                  선생님이 이번 수업을 정하면 여기에 보여 줄게.
                  <br />
                  열린 수업이 있다면 먼저 둘러봐도 좋아.
                </p>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="#lessons" />}
                >
                  열린 수업 보기 <ArrowRight size={16} />
                </Button>
              </>
            )}
          </div>
          <div className="current-art">
            <LessonArt kind={current?.id ?? "flow"} />
          </div>
        </section>
        <Card className="student-overview">
          <div className="overview-heading">
            <GraduationCap size={18} />
            나의 교실
          </div>
          <div className="overview-class">2학년 {session?.classId}반</div>
          <div className="overview-numbers">
            <div>
              <span>열린 수업</span>
              <strong>
                {opened.length}
                <small>개</small>
              </strong>
            </div>
            <div>
              <span>둘러본 수업</span>
              <strong>
                {recent.length}
                <small>개</small>
              </strong>
            </div>
          </div>
          <p className="overview-note">
            우리 반에 열린 수업은
            <br />
            언제든 다시 만날 수 있어.
          </p>
        </Card>
      </div>
      <section id="lessons" className="dashboard-section student-library">
        <div className="section-heading">
          <div>
            <h2>
              내 수업 <span className="count-pill">{opened.length}</span>
            </h2>
            <p>우리 반에 열린 수업은 언제든 다시 볼 수 있어.</p>
          </div>
          <div className="lesson-tools" role="group" aria-label="수업 보기">
            <button
              aria-pressed={filter === "all"}
              onClick={() => setFilter("all")}
            >
              전체
            </button>
            <button
              aria-pressed={filter === "visited"}
              onClick={() => setFilter("visited")}
            >
              둘러본 수업
            </button>
          </div>
        </div>
        {shown.length ? (
          <div className="lesson-grid student-lessons">
            {shown.map((lesson) => (
              <Link
                href={`/classroom/${lesson.id}`}
                className={`explore-card ${lesson.color}`}
                key={lesson.id}
              >
                <div className="explore-art">
                  <span className="art-index">{lesson.number}</span>
                  <LessonArt kind={lesson.id} />
                </div>
                <div className="explore-copy">
                  <span className="category">{lesson.category}</span>
                  <h3>
                    {lesson.title}
                    <ArrowRight size={18} />
                  </h3>
                  <p>{lesson.subtitle}</p>
                  <span className="lesson-state">
                    {recent.includes(lesson.id)
                      ? "둘러본 수업"
                      : "시작해 볼까?"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-panel" role="status">
            <BookOpen size={30} />
            <h3>
              {filter === "visited"
                ? "아직 둘러본 수업이 없어."
                : "곧 새로운 수업이 열릴 거야."}
            </h3>
            <p>
              {filter === "visited"
                ? "전체 수업에서 궁금한 수업을 찾아봐."
                : "아직 열린 수업이 없어. 선생님의 안내를 기다려 줘."}
            </p>
            {filter === "visited" && (
              <Button variant="outline" onClick={() => setFilter("all")}>
                전체 수업 보기
              </Button>
            )}
          </div>
        )}
      </section>
      <div className="student-bottom">
        <section className="dashboard-section" id="recent">
          <div className="section-heading">
            <div>
              <h2>지난 활동</h2>
              <p>마지막으로 둘러본 수업에서 다시 시작해 봐.</p>
            </div>
          </div>
          {recent.length ? (
            recent.map((id) => (
              <Link href={`/classroom/${id}`} className="recent-row" key={id}>
                <span className="recent-icon">
                  <Clock3 size={20} />
                </span>
                <div>
                  <strong>
                    {lessons.find((item) => item.id === id)?.title}
                  </strong>
                  <p>수업 공간 둘러봄 · 이번 화면 체험</p>
                </div>
                <span>
                  이어 보기 <ArrowRight size={16} />
                </span>
              </Link>
            ))
          ) : (
            <div className="recent-empty">
              <Clock3 size={21} />
              <p>아직 지난 활동이 없어. 첫 수업을 둘러보면 여기에 남을 거야.</p>
            </div>
          )}
        </section>
        <Card className="class-guide">
          <span className="guide-icon">
            <Sparkles size={23} />
          </span>
          <h2>우리 교실의 약속</h2>
          <p>
            정답보다 중요한 건<br />
            <strong>스스로 생각하는 과정.</strong>
          </p>
          <ul>
            <li>
              <Check size={15} /> 궁금하면 한 번 해 보기
            </li>
            <li>
              <Check size={15} /> 틀려도 다시 시도하기
            </li>
            <li>
              <Check size={15} /> 내 생각을 소중히 하기
            </li>
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
