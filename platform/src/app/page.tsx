import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand, DemoBanner, LessonArt } from "@/components/visuals";
import {
  ClassroomPreview,
  IdeaPlayground,
  LandingMotion,
  LearningJourney,
} from "@/components/home-interactions";
import { lessons } from "@/lib/demo-data";

export default function Home() {
  return (
    <div className="home-experience">
      <DemoBanner />
      <header className="home-header">
        <div className="home-container">
          <Brand />
          <nav aria-label="주 메뉴">
            <a href="#experience">배우는 방법</a>
            <a href="#explore">배울 거리</a>
            <Link href="/login/teacher">
              선생님 공간 <ArrowUpRight size={14} />
            </Link>
          </nav>
          <Button nativeButton={false} render={<Link href="/login/student" />}>
            교실 입장 <ArrowUpRight size={17} />
          </Button>
        </div>
      </header>
      <main id="main-content">
        <section className="home-hero home-container">
          <div className="home-hero-copy">
            <span className="section-kicker">
              <span className="live-dot" /> SMALL QUESTIONS. BIG POSSIBILITIES.
            </span>
            <h1>
              궁금한 생각이,
              <br />
              <em>나만의 발견으로.</em>
            </h1>
            <p>
              작은 물음표 하나면 충분해요.
              <br />
              생각을 연결하고, 직접 시도하며
              <br className="mobile-break" /> 나만의 답을 찾아가는 정보 교실.
            </p>
            <div className="home-hero-actions">
              <Button
                nativeButton={false}
                size="lg"
                render={<Link href="/login/student" />}
              >
                내 교실로 가기 <ArrowRight size={18} />
              </Button>
              <a href="#experience">
                먼저 둘러볼래요 <ArrowDown size={16} />
              </a>
            </div>
            <div className="hero-footnote">
              <span>✳</span> 준비물은 호기심. 틀릴 용기도 조금.
            </div>
          </div>
          <IdeaPlayground />
          <div className="hero-baseline">
            <span>THINK IT. TRY IT. MAKE IT YOURS.</span>
            <a href="#experience">
              아래로, 새로운 발견 <ArrowDown size={14} />
            </a>
            <LandingMotion />
          </div>
        </section>
        <div className="home-container">
          <LearningJourney />
        </div>
        <section className="home-explore" id="explore">
          <div className="home-container">
            <div className="editorial-heading" data-reveal>
              <div>
                <span className="section-kicker">02 / A WORLD TO EXPLORE</span>
                <h2>호기심이 향하는 곳으로.</h2>
              </div>
              <p>
                생각을 표현하는 방법부터 디지털 세상까지.
                <br />
                우리의 배움은 계속 넓어져요.
              </p>
            </div>
            <div className="home-lesson-grid">
              {lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/explore/${lesson.id}`}
                  className={`home-lesson ${lesson.color}`}
                  data-reveal
                >
                  <div className="home-lesson-art">
                    <span className="home-art-number">{lesson.number}</span>
                    <LessonArt kind={lesson.id} />
                    <span className="home-art-label">
                      {lesson.id === "flow"
                        ? "CONNECT THE DOTS"
                        : lesson.id === "data"
                          ? "FIND THE PATTERN"
                          : "MAKE A BETTER WORLD"}
                    </span>
                  </div>
                  <div className="home-lesson-copy">
                    <span>{lesson.category}</span>
                    <h3>
                      {lesson.title}
                      <ArrowUpRight size={24} />
                    </h3>
                    <p>{lesson.subtitle}</p>
                    <small>
                      콘텐츠 준비 중 <span>공간 둘러보기</span>
                    </small>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <div className="home-container">
          <ClassroomPreview />
        </div>
        <section className="home-finale">
          <div className="finale-orbit" aria-hidden="true" />
          <div className="home-container" data-reveal>
            <span className="section-kicker">
              YOUR NEXT DISCOVERY STARTS HERE
            </span>
            <h2>
              오늘은 어떤 생각을
              <br />켜 볼까요<span>?</span>
            </h2>
            <p>나의 속도로, 나의 방식으로. 여기서 시작해요.</p>
            <Button
              nativeButton={false}
              size="lg"
              render={<Link href="/login/student" />}
            >
              내 교실로 가기 <ArrowUpRight size={20} />
            </Button>
            <span className="finale-spark" aria-hidden="true">
              ✳
            </span>
          </div>
        </section>
      </main>
      <footer className="home-footer home-container">
        <Brand small />
        <p>생각하고, 시도하고, 발견하는 즐거움.</p>
        <Link href="/login/teacher">
          선생님 공간 <ArrowUpRight size={14} />
        </Link>
        <small>© CS CLASS</small>
      </footer>
    </div>
  );
}
