"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Code2, Dog, Keyboard, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { concepts, type PrototypeState } from "@/lib/prototype/programming";
import styles from "./programming.module.css";
import conceptStyles from "@/components/ui/concept-layout.module.css";

export function Concept({ state, update, focus, next, onCheck, serverFeedback, locked = false }: { state: PrototypeState; update: (next: PrototypeState) => void; focus: (id: string) => void; next: () => void; onCheck?: () => void; serverFeedback?: string; locked?: boolean }) {
  const [language, setLanguage] = useState("block");
  const [name, setName] = useState("초코");
  const [greeting, setGreeting] = useState("");
  const [A, setA] = useState(6);
  const [B, setB] = useState(4);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [feedback, setFeedback] = useState("");
  const c = concepts[state.concept];
  const answer = state.conceptAnswers[state.concept];
  const done = state.conceptDone.includes(state.concept);
  function move(index: number) {
    update({ ...state, concept: index }); setFeedback(""); focus("concept-title");
  }
  function direction(dx: number, dy: number) { setPosition((p) => ({ x: Math.max(-3, Math.min(3, p.x + dx)), y: Math.max(-2, Math.min(2, p.y + dy)) })); }
  return <div className={conceptStyles.layout}>
    <nav className={conceptStyles.nav} aria-label="개념 목록">{concepts.map((item, i) => <button key={item.title} type="button" disabled={locked} aria-current={i === state.concept ? "step" : undefined} onClick={() => move(i)}><span>{state.conceptDone.includes(i) ? <Check size={16} aria-label="확인 완료" /> : `0${i + 1}`}</span><div><strong>{item.title}</strong><small>{["블록과 텍스트", "입력 → 처리 → 출력", "변수와 연산", "시작 버튼 · 방향키"][i]}</small></div></button>)}<p>직접 바꾸고, 결과를 보고,<br />한 번 더 생각해 보세요.</p></nav>
    <div className={conceptStyles.content}>
      <div className={conceptStyles.heading}><span className={conceptStyles.eyebrow}>CONCEPT {String(state.concept + 1).padStart(2, "0")} / 04</span><h2 id="concept-title" tabIndex={-1}>{c.title}</h2><p>{c.subtitle}</p></div>
      <div className={styles.experiment}>
        {state.concept === 0 && <>
          <div className={styles.experimentTop}><span><Code2 size={17} />같은 명령, 두 가지 표현</span><div className={styles.segment}><button type="button" aria-pressed={language === "block"} onClick={() => setLanguage("block")}>블록</button><button type="button" aria-pressed={language === "text"} onClick={() => setLanguage("text")}>텍스트</button></div></div>
          <div className={styles.languageDemo}><div>{language === "block" ? <div className={styles.demoBlocks}><div data-kind="start">시작하기 버튼을 클릭했을 때</div><div data-kind="say">‘안녕!’ 말하기</div></div> : <pre className={styles.code}><span>Python</span><code>print(<em>&apos;안녕!&apos;</em>)</code></pre>}<p>엔트리·스크래치는 블록, 파이썬·자바스크립트는 텍스트로 명령을 표현해요.</p><Button variant="outline" onClick={() => setGreeting("안녕!")}><Play size={16} />이 명령 실행하기</Button></div><div className={styles.dogDemo}><div className={styles.speech}>{greeting || "어떤 명령을 줄까?"}</div><Dog size={104} strokeWidth={1.5} aria-hidden="true" /></div></div>
          <p className={styles.takeaway}>코드는 명령을 표현하고, 프로그램은 그 명령들을 담아요. 기계어는 컴퓨터가 직접 읽는 0과 1의 명령이에요.</p>
        </>}
        {state.concept === 1 && <>
          <div className={styles.experimentTop}><span>이름을 바꾸고 실행해 보세요</span><span className={styles.miniLabel}>직접 해보기</span></div>
          <div className={styles.flowDemo}><div><span>01 · 입력</span><label htmlFor="concept-name">강아지 이름</label><input id="concept-name" maxLength={20} value={name} onChange={(e) => { setName(e.target.value); setGreeting(""); }} /></div><ArrowRight aria-hidden="true" /><div><span>02 · 처리</span><strong>인사말 만들기</strong><code>‘내 이름은 ’ + 이름</code></div><ArrowRight aria-hidden="true" /><div><span>03 · 출력</span><Dog size={44} aria-hidden="true" /><strong>{greeting || "말풍선이 기다리고 있어요"}</strong></div></div>
          <Button disabled={!name.trim()} onClick={() => setGreeting(`내 이름은 ${name.trim()}!`)}><Play size={16} />인사말 만들어 보기</Button>
          <p className={styles.takeaway}>키보드·마이크·센서가 자료를 입력하고, 프로그램이 처리한 결과를 화면·스피커 등으로 출력해요.</p>
        </>}
        {state.concept === 2 && <>
          <div className={styles.experimentTop}><span>상자에 새 값을 넣어 보세요</span><span className={styles.miniLabel}>변수 실험실</span></div>
          <div className={styles.variableDemo}><div className={styles.variableBox}><label htmlFor="concept-a">변수 A</label><input id="concept-a" type="number" min={-100} max={100} value={A} onChange={(e) => setA(Math.max(-100, Math.min(100, Number(e.target.value))))} /><button type="button" onClick={() => setA(A === 6 ? 3 : 6)}>A에 {A === 6 ? 3 : 6} 저장하기</button></div><span className={styles.operator}>×</span><div className={styles.variableBox}><label htmlFor="concept-b">변수 B</label><input id="concept-b" type="number" min={-100} max={100} value={B} onChange={(e) => setB(Math.max(-100, Math.min(100, Number(e.target.value))))} /></div><span className={styles.operator}>=</span><div className={styles.calculation} aria-live="polite"><small>계산 결과</small><strong>{A * B}</strong></div></div>
          <p className={styles.takeaway}>변수는 값에 이름을 붙여 기억하는 장소예요. 연산자는 그 값을 계산해요. 두 수의 평균은 (A + B) ÷ 2예요.</p>
        </>}
        {state.concept === 3 && <>
          <div className={styles.experimentTop}><span><Keyboard size={17} />신호를 보내 움직여 보세요</span><button type="button" onClick={() => setPosition({ x: 0, y: 0 })}>처음 위치로</button></div>
          <div className={styles.signalDemo}><div className={styles.conceptStage} role="group" tabIndex={0} aria-label="방향키 실험 무대" onKeyDown={(e) => { const moves: Record<string, number[]> = { ArrowUp: [0, 1], ArrowRight: [1, 0], ArrowDown: [0, -1], ArrowLeft: [-1, 0] }; if (e.target === e.currentTarget && moves[e.key]) { e.preventDefault(); direction(moves[e.key][0], moves[e.key][1]); } }}><Dog size={64} aria-hidden="true" style={{ transform: `translate(${position.x * 24}px, ${-position.y * 24}px)` }} /><span>x {position.x * 10} · y {position.y * 10}</span></div><div className={styles.directionPad}>{[["↑ 위", 0, 1, "0°"], ["← 왼쪽", -1, 0, "270°"], ["↓ 아래", 0, -1, "180°"], ["→ 오른쪽", 1, 0, "90°"]].map(([label, dx, dy, degree]) => <button type="button" key={label} onClick={() => direction(Number(dx), Number(dy))}><strong>{label}</strong><small>{degree}</small></button>)}</div></div>
          <p className={styles.takeaway}>무대에 초점을 두고 방향키를 누르거나 옆의 버튼을 눌러보세요. 시작 신호 → 방향 정하기 → 이동하기로 연결돼요.</p>
        </>}
      </div>
      <fieldset className={styles.conceptCheck} disabled={locked}><legend><span className={styles.eyebrow}>한 번만 확인해 볼까요?</span>{c.question}</legend><div className={styles.compactOptions}>{c.options.map((option, i) => <label key={option} data-selected={answer === i}><input type="radio" name={`concept-${state.concept}`} checked={answer === i} disabled={done} onChange={() => { update({ ...state, conceptAnswers: { ...state.conceptAnswers, [state.concept]: i } }); setFeedback(""); }} /><span>{option}</span></label>)}</div>
        <Button variant={done ? "outline" : "default"} disabled={done || answer === undefined} onClick={() => { if (onCheck) { onCheck(); return; } const correct = answer === c.correct; if (correct) update({ ...state, conceptDone: [...state.conceptDone, state.concept] }); setFeedback(correct ? c.explanation : "다시 실험해 보고 골라보세요. 위의 변화가 단서예요."); focus("concept-feedback"); }}>{done ? <><Check size={16} />개념 확인 완료</> : "생각 확인하기"}</Button>
        {((onCheck ? serverFeedback : feedback) || done) && <p id="concept-feedback" tabIndex={-1} role="status" className={done ? styles.good : styles.feedback}>{(onCheck ? serverFeedback : feedback) || c.explanation}</p>}
      </fieldset>
      <div className={styles.footer}><Button variant="ghost" disabled={locked || state.concept === 0} onClick={() => move(state.concept - 1)}><ArrowLeft size={16} />이전 개념</Button>{state.concept < concepts.length - 1 ? <Button variant="outline" disabled={locked} onClick={() => move(state.concept + 1)}>다음 개념<ArrowRight size={16} /></Button> : <Button disabled={locked} onClick={next}>퀴즈에 도전하기<ArrowRight size={16} /></Button>}</div>
    </div>
  </div>;
}
