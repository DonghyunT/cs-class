"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  ChevronRight,
  GraduationCap,
  Lightbulb,
  Mouse,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Brand, DemoBanner } from "@/components/visuals";
import { HomeArt } from "@/components/home-art";
import { HomeEntry } from "@/components/home-entry";

const PIN_QUERY = "(min-width: 960px) and (min-height: 680px)";
function subscribePin(callback: () => void) {
  const media = window.matchMedia(PIN_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const pinSnapshot = () => window.matchMedia(PIN_QUERY).matches;
const serverSnapshot = () => false;

// Pointer decoration stays outside React state, with at most one write per frame.
function ReactiveSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  function move(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || !matchMedia("(hover: hover)").matches)
      return;
    const node = event.currentTarget;
    if (node.closest('[data-motion="reduced"]')) return;
    const rect = node.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / rect.width),
    );
    const y = Math.max(
      0,
      Math.min(1, (event.clientY - rect.top) / rect.height),
    );
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      node.style.setProperty("--tilt-x", `${(0.5 - y) * 3}deg`);
      node.style.setProperty("--tilt-y", `${(x - 0.5) * 3}deg`);
      node.style.setProperty("--light-x", `${x * 100}%`);
      node.style.setProperty("--light-y", `${y * 100}%`);
    });
  }
  function reset(event: PointerEvent<HTMLDivElement>) {
    cancelAnimationFrame(frame.current);
    event.currentTarget.style.removeProperty("--tilt-x");
    event.currentTarget.style.removeProperty("--tilt-y");
  }
  return (
    <div
      className={`landing-reactive ${className}`}
      onPointerMove={move}
      onPointerLeave={reset}
    >
      {children}
    </div>
  );
}

const scenes = [
  {
    id: "lesson",
    label: "이번 수업",
    title: (
      <>
        이번 수업을
        <br />
        확인해요.
      </>
    ),
    description: "선생님이 열어 둔 수업을 확인하고 시작하세요.",
    eyebrow: "내 교실에서 시작해요",
    color: "blue",
  },
  {
    id: "concept",
    label: "개념학습",
    title: (
      <>
        설명과 예시로
        <br />
        개념을 익혀요.
      </>
    ),
    description: "낯선 개념도 예시와 함께 하나씩 살펴봐요.",
    eyebrow: "수업 구성 예시 · 개념학습",
    color: "sky",
  },
  {
    id: "quiz",
    label: "퀴즈",
    title: (
      <>
        배운 내용을
        <br />
        확인해요.
      </>
    ),
    description: "답을 고르고 설명을 읽으며 이해한 내용을 확인해요.",
    eyebrow: "수업 구성 예시 · 퀴즈",
    color: "lilac",
  },
  {
    id: "practice",
    label: "실습",
    title: (
      <>
        직접 바꾸고,
        <br />
        결과를 봐요.
      </>
    ),
    description: "스위치를 누를 때마다 달라지는 숫자를 살펴보세요.",
    eyebrow: "수업 구성 예시 · 실습",
    color: "apricot",
  },
  {
    id: "continue",
    label: "이어하기",
    title: (
      <>
        지난 활동을
        <br />
        이어가요.
      </>
    ),
    description: "지난 시간에 하던 활동을 다시 열어 보세요.",
    eyebrow: "다음 수업에서도",
    color: "blue",
  },
] as const;

function ConceptExample() {
  const [on, setOn] = useState(true);
  return (
    <>
      <div className="lesson-panel-heading">
        <span className="landing-badge">개념학습</span>
        <h3>컴퓨터가 사용하는 두 가지 신호</h3>
        <p>비트는 정보를 표현하는 가장 작은 단위예요.</p>
      </div>
      <button
        className="signal-demo"
        aria-label="비트 신호"
        aria-pressed={on}
        onClick={() => setOn(!on)}
        data-on={on}
      >
        <span className="signal-bulb">
          <Lightbulb size={56} strokeWidth={1.4} />
        </span>
        <span className="signal-number">{on ? "1" : "0"}</span>
        <span className="signal-switch" aria-hidden="true">
          <i />
        </span>
        <span>{on ? "켜짐 · ON" : "꺼짐 · OFF"}</span>
      </button>
      <p className="panel-footnote">스위치를 눌러 0과 1을 바꿔 보세요.</p>
    </>
  );
}

function QuizExample() {
  const [answer, setAnswer] = useState<number | null>(null);
  return (
    <>
      <div className="lesson-panel-heading">
        <span className="landing-badge lilac">퀴즈</span>
        <h3>
          비트가 2개라면
          <br />몇 가지를 표현할 수 있을까요?
        </h3>
      </div>
      <div className="quiz-options" role="group" aria-label="퀴즈 답 고르기">
        {[2, 4, 8, 16].map((value, index) => (
          <button
            key={value}
            aria-pressed={answer === value}
            onClick={() => setAnswer(value)}
          >
            <span className="choice-number">{index + 1}</span>
            <strong>{value}가지</strong>
            <span className="choice-mark" aria-hidden="true">
              {answer === value ? <Check size={18} /> : null}
            </span>
          </button>
        ))}
      </div>
      <p className="quiz-feedback" role="status" data-correct={answer === 4}>
        {answer === null
          ? "답을 골라 보세요. 다른 단계도 자유롭게 볼 수 있어요."
          : answer === 4
            ? "맞아요! 00, 01, 10, 11의 네 가지를 표현해요."
            : "다시 생각해 볼까요? 00, 01, 10, 11을 세어 보세요."}
      </p>
    </>
  );
}

function BitExample() {
  const [bits, setBits] = useState([false, true, false, true]);
  const weights = [8, 4, 2, 1];
  const total = bits.reduce((sum, on, i) => sum + (on ? weights[i] : 0), 0);
  return (
    <>
      <div className="lesson-panel-heading">
        <span className="landing-badge apricot">실습</span>
        <h3>스위치로 숫자를 만들어 봐요.</h3>
        <p>켜진 비트의 값을 더하면 어떤 숫자가 될까요?</p>
      </div>
      <div className="bit-switches" role="group" aria-label="비트 스위치">
        {weights.map((weight, i) => (
          <button
            key={weight}
            aria-label={`${weight} 비트`}
            aria-pressed={bits[i]}
            onClick={() =>
              setBits((current) => current.map((on, j) => (i === j ? !on : on)))
            }
          >
            <span>{weight}</span>
            <strong>{bits[i] ? "1" : "0"}</strong>
            <small>{bits[i] ? "ON" : "OFF"}</small>
          </button>
        ))}
      </div>
      <div className="bit-result">
        <span>10진수로 바꾸면</span>
        <output aria-live="polite" aria-label="10진수 결과">
          {total}
        </output>
        <button
          onClick={() => setBits([false, false, false, false])}
          aria-label="스위치 초기화"
        >
          <RotateCcw size={17} />
        </button>
      </div>
    </>
  );
}

function LessonStory({ paused }: { paused: boolean }) {
  const supportsPin = useSyncExternalStore(
    subscribePin,
    pinSnapshot,
    serverSnapshot,
  );
  const pinned = supportsPin && !paused;
  const region = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const panels = useRef<HTMLDivElement>(null);
  const manualSelection = useRef(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!pinned) return;
    let frame = 0;
    function update() {
      frame = 0;
      if (!region.current || !pin.current) return;
      if (manualSelection.current) return;
      // Keep a keyboard user's focused lesson control available until they leave it.
      if (
        panels.current?.contains(document.activeElement) &&
        document.activeElement?.matches(":focus-visible")
      )
        return;
      const rect = region.current.getBoundingClientRect();
      const travel = rect.height - pin.current.offsetHeight;
      if (travel <= 0) return;
      const progress = Math.max(0, Math.min(1, (84 - rect.top) / travel));
      setActive(
        Math.min(scenes.length - 1, Math.floor(progress * scenes.length)),
      );
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // Focus and browser scroll anchoring must not undo an explicit tab selection.
    // Resume the scroll story only when the user starts scrolling again.
    const resume = () => {
      manualSelection.current = false;
      schedule();
    };
    const resumeFromKey = (event: globalThis.KeyboardEvent) => {
      if (
        ["PageDown", "PageUp", "ArrowDown", "ArrowUp", " "].includes(
          event.key,
        ) &&
        !(
          event.target instanceof HTMLElement &&
          event.target.closest("button, a, input, [role=tab]")
        )
      )
        resume();
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("wheel", resume, { passive: true });
    window.addEventListener("touchmove", resume, { passive: true });
    window.addEventListener("keydown", resumeFromKey);
    region.current?.addEventListener("focusout", schedule);
    const node = region.current;
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("wheel", resume);
      window.removeEventListener("touchmove", resume);
      window.removeEventListener("keydown", resumeFromKey);
      node?.removeEventListener("focusout", schedule);
    };
  }, [pinned]);

  function choose(index: number) {
    manualSelection.current = true;
    setActive(index);
    if (pinned && region.current && pin.current) {
      const rect = region.current.getBoundingClientRect();
      const travel = rect.height - pin.current.offsetHeight;
      // Native document scrolling stays available. A tab jumps to its own segment.
      window.scrollTo({
        top:
          window.scrollY +
          rect.top -
          84 +
          travel * ((index + 0.5) / scenes.length),
        behavior: "instant",
      });
    }
  }
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    // Tab follows native DOM order into the active panel; only arrows change tabs.
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % scenes.length;
    else if (event.key === "ArrowLeft")
      next = (index + scenes.length - 1) % scenes.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = scenes.length - 1;
    else return;
    event.preventDefault();
    choose(next);
    tabs.current[next]?.focus({ preventScroll: true });
  }

  return (
    <section
      className="landing-story"
      id="experience"
      ref={region}
      data-pinned={pinned}
      aria-label="수업 사용 방법"
    >
      <div className="story-pin landing-container" ref={pin}>
        <div className="story-copy">
          <span className="landing-eyebrow">
            수업을 시작하고, 이어가는 방법
          </span>
          <div key={active} className="story-caption">
            <span className="story-number">
              0{active + 1}
              <span> / 05</span>
            </span>
            <h2>{scenes[active].title}</h2>
            <p>{scenes[active].description}</p>
          </div>
          <div className="story-instruction">
            <Mouse size={17} />
            <span>
              {pinned
                ? "스크롤하거나 아래 단계를 눌러 보세요."
                : "아래 단계를 눌러 수업을 살펴보세요."}
            </span>
          </div>
          <a className="story-skip" href="#classrooms">
            공간 안내로 건너뛰기 <ArrowDown size={14} />
          </a>
        </div>
        <div
          className="story-demo"
          data-scene={scenes[active].id}
          data-tone={scenes[active].color}
        >
          <div className="story-aura" aria-hidden="true" />
          <div
            className="story-tabs"
            role="tablist"
            aria-label="수업 미리보기 단계"
          >
            {scenes.map((scene, index) => (
              <button
                key={scene.id}
                ref={(node) => {
                  tabs.current[index] = node;
                }}
                id={`scene-tab-${scene.id}`}
                role="tab"
                aria-selected={active === index}
                aria-controls={`scene-${scene.id}`}
                tabIndex={active === index ? 0 : -1}
                onClick={() => choose(index)}
                onKeyDown={(event) => navigate(event, index)}
              >
                <span aria-hidden="true">0{index + 1}</span>
                {scene.label}
              </button>
            ))}
          </div>
          <ReactiveSurface className="lesson-device">
            <div className="lesson-windowbar">
              <span className="window-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>CS Class</span>
              <span className="example-label">화면 예시</span>
            </div>
            <div className="lesson-toolbar">
              <BookOpen size={18} />
              <span>
                {active === 0 || active === 4
                  ? "내 교실"
                  : "정보의 표현과 디지털 부호"}
              </span>
              <span>
                {active > 0 && active < 4 ? "수업 구성 예시" : "학생 공간"}
              </span>
            </div>
            <div className="lesson-panels" ref={panels}>
              {scenes.map((scene, index) => (
                <div
                  key={scene.id}
                  role="tabpanel"
                  id={`scene-${scene.id}`}
                  aria-labelledby={`scene-tab-${scene.id}`}
                  aria-hidden={active !== index}
                  inert={active !== index}
                  tabIndex={active === index ? 0 : -1}
                  className="lesson-scene"
                  data-active={active === index}
                  data-before={index < active}
                >
                  {index === 0 ? (
                    <>
                      <div className="lesson-panel-heading">
                        <span className="landing-badge">이번 수업</span>
                        <h3>
                          정보의 표현과
                          <br />
                          디지털 부호
                        </h3>
                        <p>컴퓨터는 정보를 어떻게 표현할까요?</p>
                      </div>
                      <div className="lesson-cover" aria-hidden="true">
                        <span>0</span>
                        <span>1</span>
                        <span>0</span>
                        <span>1</span>
                        <i>
                          <Sparkles size={24} />
                        </i>
                      </div>
                      <button
                        className="landing-button"
                        onClick={() => choose(1)}
                      >
                        수업 시작 <ArrowRight size={18} />
                      </button>
                    </>
                  ) : index === 1 ? (
                    <ConceptExample />
                  ) : index === 2 ? (
                    <QuizExample />
                  ) : index === 3 ? (
                    <BitExample />
                  ) : (
                    <>
                      <div className="lesson-panel-heading">
                        <span className="landing-badge">
                          최근에 열어 본 수업
                        </span>
                        <h3>하던 활동이 있는 곳으로</h3>
                        <p>다시 열고, 이어서 해보세요.</p>
                      </div>
                      <div className="continue-lesson">
                        <div className="continue-icon">
                          <BookOpen size={30} />
                        </div>
                        <div>
                          <small>수업 예시</small>
                          <strong>정보의 표현과 디지털 부호</strong>
                          <span>개념학습 · 퀴즈 · 실습</span>
                        </div>
                      </div>
                      <button
                        className="landing-button"
                        onClick={() => choose(1)}
                      >
                        예시 수업 이어하기 <ArrowRight size={18} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="lesson-windowfooter">
              <span className="lesson-status-dot" />
              <span>{scenes[active].eyebrow}</span>
              <span>
                직접 눌러 보세요 <ChevronRight size={13} />
              </span>
            </div>
          </ReactiveSurface>
          <div className="story-progress" aria-hidden="true">
            <span style={{ width: `${(active + 1) * 20}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}

function RolePreview() {
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

export function PublicHome() {
  const [paused, setPaused] = useState(false);
  return (
    <div
      className="public-home"
      id="top"
      data-motion={paused ? "reduced" : "on"}
    >
      <DemoBanner />
      <header className="landing-header">
        <div className="landing-container">
          <Brand />
          <nav aria-label="주 메뉴">
            <a href="#experience">수업 미리보기</a>
            <a href="#classrooms">공간 안내</a>
          </nav>
          <HomeEntry
            paused={paused}
            onToggleMotion={() => setPaused(!paused)}
          />
        </div>
      </header>
      <main id="main-content">
        <section className="landing-hero" aria-labelledby="home-heading">
          <div className="landing-container hero-layout">
            <div className="landing-hero-copy">
              <span className="landing-eyebrow">중학교 정보 수업 플랫폼</span>
              <h1 id="home-heading">
                정보 수업을 위한
                <br />
                <span>온라인 교실</span>
              </h1>
              <p>
                이번 수업을 확인하고, 수업 활동을 시작해요.
                <br />
                지난 활동도 이어갈 수 있어요.
              </p>
              <div className="landing-hero-actions">
                <a className="landing-button" href="#experience">
                  수업 방식 보기 <ArrowDown size={18} />
                </a>
              </div>
            </div>
            <HomeArt paused={paused} />
          </div>
          <div className="landing-hero-bottom landing-container">
            <a href="#experience">
              <Mouse size={17} /> 스크롤하며 살펴보기 <ArrowDown size={14} />
            </a>
            <span>
              개념학습 <i /> 퀴즈 <i /> 실습
            </span>
          </div>
        </section>
        <LessonStory paused={paused} />
        <RolePreview />
        <section className="landing-finale" aria-labelledby="entry-heading">
          <div className="finale-orbit" aria-hidden="true" />
          <div className="landing-container">
            <span className="finale-mark" aria-hidden="true">
              <GraduationCap size={42} strokeWidth={1.5} />
            </span>
            <h2 id="entry-heading">
              오늘의 정보 수업,
              <br />
              여기서 시작해요.
            </h2>
            <p>배우는 학생도, 수업을 여는 선생님도.</p>
            <div className="finale-entries">
              <div>
                <Link className="landing-button" href="/login/student">
                  학생으로 입장 <ArrowRight size={20} />
                </Link>
                <span>학번과 비밀번호로 내 교실에</span>
              </div>
              <div>
                <Link
                  className="landing-button teacher-entry"
                  href="/login/teacher"
                >
                  선생님으로 입장 <ArrowRight size={20} />
                </Link>
                <span>교사 계정으로 수업 준비를</span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <div className="landing-container">
          <a
            className="footer-signature"
            href="#top"
            aria-label="CS Class 맨 위로"
          >
            <span aria-hidden="true">
              cs<span>·</span>
            </span>
            <span>정보 수업을 위한 온라인 교실</span>
          </a>
          <small>
            © {new Date().getFullYear()} 안동현T. All rights reserved.
          </small>
          <a className="footer-top" href="#top">
            맨 위로 <ArrowUp size={16} />
          </a>
        </div>
      </footer>
    </div>
  );
}
