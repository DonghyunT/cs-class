"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Lightbulb,
  MousePointer2,
  Pause,
  Play,
  Sparkles,
  Waypoints,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ideas = [
  {
    word: "왜 그럴까?",
    result: "질문 하나로, 새로운 시작.",
    label: "궁금해하기",
  },
  {
    word: "이렇게 해 볼까?",
    result: "다른 방법으로, 새로운 가능성.",
    label: "시도하기",
  },
  {
    word: "아, 그렇구나!",
    result: "내가 찾아서, 더 특별한 발견.",
    label: "발견하기",
  },
];

export function IdeaPlayground() {
  const [idea, setIdea] = useState(0);
  return (
    <div className="idea-playground">
      <div className="playground-heading">
        <span>
          <span className="live-dot" /> THOUGHT PLAYGROUND
        </span>
        <span>생각 놀이터</span>
      </div>
      <div className="idea-canvas" data-idea={idea}>
        <div className="canvas-grid" aria-hidden="true" />
        <svg
          className="idea-wires"
          viewBox="0 0 540 390"
          fill="none"
          aria-hidden="true"
        >
          <path d="M120 75V126Q120 142 140 142H251Q270 142 270 160V212" />
          <path d="M432 88V126Q432 142 412 142H289Q270 142 270 160" />
          <path d="M270 212V277Q270 298 293 298H425" />
          <path d="M270 212V277Q270 298 247 298H112" />
        </svg>
        <div className="idea-scrap scrap-question">
          작은 질문 <span>?</span>
        </div>
        <div className="idea-scrap scrap-try">
          <Waypoints size={18} /> 나만의 방법
        </div>
        <div className="idea-core" key={idea}>
          <Lightbulb size={36} strokeWidth={1.5} />
          <strong>{ideas[idea].word}</strong>
          <span>생각을 연결하는 중</span>
        </div>
        <div className="idea-output">
          <Sparkles size={20} />
          <span>새로운 발견</span>
          <ArrowUpRight size={20} />
        </div>
        <div className="idea-cursor" aria-hidden="true">
          <MousePointer2 size={20} fill="currentColor" />
          <span>나의 호기심</span>
        </div>
        <div className="idea-orbit" aria-hidden="true">
          ✳
        </div>
        <span className="canvas-coordinate" aria-hidden="true">
          x: curiosity / y: possibility
        </span>
      </div>
      <div className="idea-controls">
        <span>생각의 스위치를 눌러 봐요.</span>
        <div role="group" aria-label="생각 놀이터">
          {ideas.map((item, index) => (
            <button
              key={item.word}
              aria-pressed={idea === index}
              onClick={() => setIdea(index)}
            >
              <span>0{index + 1}</span>
              {item.label}
            </button>
          ))}
        </div>
        <p aria-live="polite">{ideas[idea].result}</p>
      </div>
    </div>
  );
}

const steps = [
  {
    title: "궁금한 게 생겼다면,",
    accent: "이미 시작한 거예요.",
    text: "당연했던 일상에 작은 물음표 하나. 정보 시간에는 그 질문이 멋진 아이디어가 돼요.",
    tag: "THINK",
    icon: "?",
  },
  {
    title: "머릿속 생각을",
    accent: "직접 움직여 봐요.",
    text: "순서를 바꾸고, 방법을 연결하고. 한 번의 시도마다 내 생각이 조금 더 선명해져요.",
    tag: "TRY",
    icon: "↗",
  },
  {
    title: "틀려도 괜찮아요.",
    accent: "발견은 남으니까.",
    text: "어디서 달라졌는지 살펴보고 다시 한 번. 내가 찾은 방법으로 다음 걸음을 내디뎌요.",
    tag: "DISCOVER",
    icon: "✳",
  },
];

export function LearningJourney() {
  const region = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const nodes =
      region.current?.querySelectorAll<HTMLElement>(".journey-step");
    if (!nodes) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.find((item) => item.isIntersecting);
        if (entry)
          setActive(Number((entry.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-35% 0px -40% 0px", threshold: 0 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
  return (
    <section
      className="journey"
      id="experience"
      ref={region}
      aria-label="우리가 배우는 방법"
    >
      <div className="journey-sticky">
        <span className="section-kicker">01 / THE WAY WE LEARN</span>
        <h2>
          생각의 다음 장을
          <br />
          함께 열어요.
        </h2>
        <div className="journey-art" data-step={active} aria-hidden="true">
          <div className="journey-rings" />
          <span className="journey-label">A LITTLE IDEA BECOMES…</span>
          <div className="journey-seed">?</div>
          <div className="journey-line line-a" />
          <div className="journey-node node-a">생각</div>
          <div className="journey-line line-b" />
          <div className="journey-node node-b">시도</div>
          <div className="journey-line line-c" />
          <div className="journey-discovery">✳</div>
          <div className="journey-caption">
            {
              [
                "모든 발견은 물음표에서.",
                "연결할수록 선명해지는 생각.",
                "나만의 발견, 다음 질문으로.",
              ][active]
            }
          </div>
        </div>
        <div className="journey-dots" aria-hidden="true">
          {steps.map((s, i) => (
            <span key={s.tag} className={active === i ? "active" : ""} />
          ))}
        </div>
      </div>
      <div className="journey-steps">
        {steps.map((step, index) => (
          <article className="journey-step" data-step={index} key={step.tag}>
            <span className="journey-number">
              0{index + 1}
              <span>{step.tag}</span>
            </span>
            <h3>
              {step.title}
              <br />
              <em>{step.accent}</em>
            </h3>
            <p>{step.text}</p>
            <span className="step-symbol" aria-hidden="true">
              {step.icon}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ClassroomPreview() {
  const [role, setRole] = useState<"student" | "teacher">("student");
  return (
    <section className="room-preview" id="classrooms">
      <div className="room-intro">
        <span className="section-kicker">03 / YOUR OWN SPACE</span>
        <h2>
          같은 교실,
          <br />
          각자의 자리에서.
        </h2>
        <p>
          학생은 오늘의 수업에 집중하고,
          <br />
          선생님은 반의 흐름을 살펴보세요.
        </p>
        <div className="role-switch" role="group" aria-label="공간 미리보기">
          <button
            aria-pressed={role === "student"}
            onClick={() => setRole("student")}
          >
            학생의 공간
          </button>
          <button
            aria-pressed={role === "teacher"}
            onClick={() => setRole("teacher")}
          >
            선생님의 공간
          </button>
        </div>
        <Link href={`/login/${role}`} className="room-entry">
          {role === "student" ? "내 교실로 입장" : "선생님 공간으로"}
          <ArrowUpRight size={18} />
        </Link>
      </div>
      <div className="room-window">
        <div className="room-window-top">
          <span />
          <span />
          <span />
          <p>CS Class / {role === "student" ? "내 교실" : "우리 반 관리"}</p>
          <span className="preview-tag">화면 예시</span>
        </div>
        <div className="room-window-body" aria-live="polite">
          <div className="mini-sidebar" aria-hidden="true">
            <span>{"{ }"}</span>
            <i />
            <i />
            <i />
          </div>
          <div className="mini-workspace">
            {role === "student" ? (
              <>
                <span className="mini-greeting">
                  반가워, 오늘도 함께 해 보자.
                </span>
                <h3>나의 다음 발견은?</h3>
                <div className="mini-course">
                  <div>
                    <small>이번 수업</small>
                    <strong>생각을 잇는 순서도</strong>
                    <span>
                      수업으로 가기 <ArrowRight size={13} />
                    </span>
                  </div>
                  <Waypoints size={65} strokeWidth={1} />
                </div>
                <div className="mini-tiles">
                  <div>
                    <span>내 수업</span>
                    <strong>열린 수업을 한눈에</strong>
                  </div>
                  <div>
                    <span>지난 활동</span>
                    <strong>하던 곳에서 이어서</strong>
                  </div>
                </div>
              </>
            ) : (
              <>
                <span className="mini-greeting">선생님, 반갑습니다.</span>
                <h3>우리 반의 오늘을 한눈에.</h3>
                <div className="mini-class-tabs">
                  <b>1반</b>
                  <span>2반</span>
                  <span>3반</span>
                  <span>…</span>
                </div>
                <div className="mini-roster">
                  <div>
                    <span>학생</span>
                    <span>계정 관리</span>
                  </div>
                  {["20101", "20102", "20103"].map((id) => (
                    <div key={id}>
                      <strong>
                        <span>{id.slice(-2)}</span>
                        {id}
                      </strong>
                      <span>
                        비밀번호 초기화 <ArrowRight size={12} />
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// Motion enhances visible server-rendered content; it never gates navigation or reading.
export function LandingMotion() {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".home-experience");
    if (!root) return;
    root.dataset.motion = paused ? "paused" : "on";
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const stopMotion = () => {
      if (paused || reduced.matches)
        root
          .getAnimations({ subtree: true })
          .forEach((animation) => animation.cancel());
    };
    stopMotion();
    reduced.addEventListener("change", stopMotion);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (!reduced.matches && !paused)
            entry.target.animate(
              [
                { opacity: 0.35, transform: "translateY(24px)" },
                { opacity: 1, transform: "translateY(0)" },
              ],
              { duration: 650, easing: "cubic-bezier(.2,.7,.2,1)" },
            );
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15 },
    );
    root
      .querySelectorAll("[data-reveal]")
      .forEach((node) => observer.observe(node));
    return () => {
      observer.disconnect();
      reduced.removeEventListener("change", stopMotion);
    };
  }, [paused]);
  return (
    <Button
      variant="ghost"
      className="motion-toggle"
      aria-pressed={paused}
      onClick={() => setPaused(!paused)}
    >
      {paused ? <Play size={13} /> : <Pause size={13} />}{" "}
      {paused ? "움직임 켜기" : "움직임 줄이기"}
    </Button>
  );
}
