"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, GraduationCap, Mouse } from "lucide-react";
import { Brand, DemoBanner } from "@/components/visuals";
import { HomeArt } from "./home-art";
import { HomeEntry } from "./home-entry";
import { LessonStory } from "./lesson-story";
import { RolePreview } from "./role-preview";

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
