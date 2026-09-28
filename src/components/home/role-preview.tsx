"use client";

import { useState } from "react";
import { BookOpen, GraduationCap, Play, RotateCcw, SlidersHorizontal } from "lucide-react";
import { ReactiveSurface } from "./reactive-surface";

export function RolePreview() {
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [classId, setClassId] = useState(1);
  return (
    <section className="landing-roles landing-container">
      <div className="landing-section-title" id="classrooms">
        <span className="landing-eyebrow">학생과 교사 공간</span>
        <h2>
          수업에 필요한 것만,
          <br />
          각자의 공간에.
        </h2>
        <p>학생은 수업을 확인하고, 선생님은 반별 수업을 준비해요.</p>
      </div>
      <div
        className="landing-role-switch"
        role="group"
        aria-label="공간 미리보기"
      >
        <button
          aria-pressed={role === "student"}
          onClick={() => setRole("student")}
        >
          <BookOpen size={18} />
          학생 공간
        </button>
        <button
          aria-pressed={role === "teacher"}
          onClick={() => setRole("teacher")}
        >
          <GraduationCap size={20} />
          교사 공간
        </button>
      </div>
      <ReactiveSurface className="role-surface">
        <div className="role-description" key={role}>
          <span className="landing-badge">
            {role === "student" ? "학생 공간" : "교사 공간"}
          </span>
          <h3>
            {role === "student" ? (
              <>
                이번 수업과
                <br />
                지난 활동을 확인해요.
              </>
            ) : (
              <>
                반별 수업을 열고,
                <br />
                이번 수업을 지정해요.
              </>
            )}
          </h3>
        </div>
        <div className="role-detail">
          <span className="example-label">화면 예시</span>
          {role === "student" ? (
            <div className="student-shortcuts">
              <div>
                <span className="shortcut-icon blue">
                  <Play size={20} />
                </span>
                <div>
                  <strong>이번 수업</strong>
                  <span>오늘 시작할 수업을 먼저 확인해요.</span>
                </div>
              </div>
              <div>
                <span className="shortcut-icon lilac">
                  <BookOpen size={20} />
                </span>
                <div>
                  <strong>열린 수업</strong>
                  <span>선생님이 열어 둔 수업을 살펴봐요.</span>
                </div>
              </div>
              <div>
                <span className="shortcut-icon apricot">
                  <RotateCcw size={20} />
                </span>
                <div>
                  <strong>지난 활동</strong>
                  <span>이전에 하던 활동을 다시 열어요.</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="teacher-example">
              <div
                className="class-choices"
                role="group"
                aria-label="예시 반 선택"
              >
                {[1, 2, 3].map((id) => (
                  <button
                    key={id}
                    aria-pressed={id === classId}
                    onClick={() => setClassId(id)}
                  >
                    {id}반
                  </button>
                ))}
              </div>
              <p>
                <SlidersHorizontal size={17} />
                {classId}반 수업 설정
              </p>
              <div>
                <span>이번 수업</span>
                <strong>정보의 표현과 디지털 부호</strong>
              </div>
              <div>
                <span>열린 수업</span>
                <strong>컴퓨터의 기본 구조</strong>
              </div>
            </div>
          )}
        </div>
      </ReactiveSurface>
    </section>
  );
}
