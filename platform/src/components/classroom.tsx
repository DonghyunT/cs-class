"use client";
import Link from "next/link";
import { ArrowLeft, Check, Construction } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useDemo } from "@/components/demo-provider";
import { Button } from "@/components/ui/button";
import { LessonArt } from "@/components/visuals";
import { lessons } from "@/lib/demo-data";
export function Classroom({ lesson }: { lesson: (typeof lessons)[number] }) {
  const { session, classes, visited, visitLesson } = useDemo();
  const available =
    session?.classId && classes[session.classId].opened.includes(lesson.id);
  const seen = (visited[session?.studentId ?? ""] ?? []).includes(lesson.id);
  return (
    <AppShell title="수업 공간">
      <Button
        variant="ghost"
        nativeButton={false}
        render={<Link href="/student" />}
      >
        <ArrowLeft size={16} /> 내 교실로
      </Button>
      {available ? (
        <section className="classroom-placeholder">
          <div className={`detail-art ${lesson.color}`}>
            <LessonArt kind={lesson.id} />
          </div>
          <span className="eyebrow">{lesson.category}</span>
          <h1>{lesson.title}</h1>
          <p>{lesson.subtitle}</p>
          <div className="preparation-note">
            <Construction size={22} />
            <div>
              <strong>이곳에 수업이 채워질 거예요.</strong>
              <p>
                지금은 교실의 이동 흐름을 체험하고 있어요.
                <br />
                실제 학습·제출 기능은 아직 준비 중이에요.
              </p>
            </div>
          </div>
          <Button
            size="lg"
            disabled={seen}
            onClick={() => visitLesson(lesson.id)}
          >
            {seen ? (
              <>
                <Check size={18} /> 둘러보기 기록됨
              </>
            ) : (
              "둘러보기 기록 남기기"
            )}
          </Button>
          <small>기록은 이번 화면 체험 중에만 유지돼요.</small>
        </section>
      ) : (
        <div className="empty-panel">
          <h1>아직 우리 반에 열리지 않은 수업이에요.</h1>
          <p>내 교실에서 열린 수업을 확인해 주세요.</p>
        </div>
      )}
    </AppShell>
  );
}
