"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { ArrowDown, ArrowRight, BookOpen, ChevronRight, Mouse, Sparkles } from "lucide-react";
import { ReactiveSurface } from "./reactive-surface";
import { BitExample, ConceptExample, QuizExample } from "./lesson-examples";

const PIN_QUERY = "(min-width: 960px) and (min-height: 680px)";
function subscribePin(callback: () => void) {
  const media = window.matchMedia(PIN_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const pinSnapshot = () => window.matchMedia(PIN_QUERY).matches;
const serverSnapshot = () => false;

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

export function LessonStory({ paused }: { paused: boolean }) {
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
