"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

import scenes from "./concepts.module.css";
import { AbstractionConcepts } from "./abstraction-concepts";
import { FlowchartConcepts } from "./flowchart-concepts";

const conditions = [
  ["입력", "문제를 해결할 때 필요한 자료예요. 입력은 없을 수도 있어요."], ["출력", "해결 결과가 하나 이상 나와야 해요."], ["명확성", "명령이 모호하지 않고 같은 뜻으로 이해되어야 해요."], ["유한성", "한정된 단계 뒤에 반드시 끝나야 해요."], ["수행 가능성", "각 명령을 실제로 실행할 수 있어야 해요."],
];
type ConceptProps = { type: "sandwich" | "abstraction" | "flowchart"; conceptId: string };

export function ReviewConcepts(props: ConceptProps) {
  if (props.type === "abstraction") return <AbstractionConcepts conceptId={props.conceptId} />;
  if (props.type === "flowchart") return <FlowchartConcepts conceptId={props.conceptId} />;
  return <section className={scenes.experience} aria-label="알고리즘 개념 체험">
    {props.conceptId === "clear" ? <ClearExperience /> : props.conceptId === "finite" ? <FiniteExperience /> : <StructureExperience />}
    <p className={scenes.note}>체험 장면은 다시 들어오면 처음부터 시작해요. 확인한 답안과 완료 기록은 저장돼요.</p>
  </section>;
}

function ClearExperience() {
  const [jam, setJam] = useState<"edge" | "flat" | null>(null);
  return <>
    <h4>명령에서 바르는 면을 바꾸면 어떻게 될까요?</h4>
    <p className={scenes.question}>두 명령을 번갈아 누르고, 잼이 묻은 위치를 비교해 보세요.</p>
    <div className={scenes.scene}><svg viewBox="0 0 700 290" role="img" aria-label="잼을 바르는 면 비교">
      <ellipse cx="350" cy="248" rx="190" ry="22" fill="#dce6f3" />
      <path d="M185 233V100C155 28 260 21 292 54C337 13 445 23 444 92L493 233Z" fill="#e5b579" stroke="#aa713b" strokeWidth="6" />
      <path d="M203 215V99C178 52 253 44 290 74C335 37 417 40 425 100L468 215Z" fill="#fff0cd" />
      {jam === "edge" && <path data-jam="edge" d="M188 228H494V240H188Z" fill="#c53d62" stroke="#c53d62" strokeWidth="4" strokeLinejoin="round" />}
      {jam === "flat" && <path data-jam="flat" d="M212 207V108C193 61 255 62 290 88C340 52 403 58 414 108L455 207Z" fill="#cf5474" stroke="#b83959" strokeWidth="3" />}
      <text x="350" y="277" textAnchor="middle">{jam === "edge" ? "테두리에만 묻은 잼" : jam === "flat" ? "넓은 면에 골고루 묻은 잼" : "명령을 기다리는 식빵"}</text>
    </svg></div>
    <div className={scenes.controls} role="group" aria-label="바르는 면 비교"><Button variant="outline" aria-pressed={jam === "edge"} onClick={() => setJam("edge")}>잼을 발라</Button><Button variant="outline" aria-pressed={jam === "flat"} onClick={() => setJam("flat")}>넓은 면에 골고루 발라</Button></div>
    <p className={scenes.result} role="status">{jam === "edge" ? "바르는 면을 정하지 않아 이 로봇은 테두리에 발랐어요. 넓은 면을 지정해 다시 비교해 보세요." : jam === "flat" ? "바르는 위치를 지정하니 넓은 면에 잼을 발랐어요. 두 그림의 차이를 설명해 볼까요?" : "명령을 선택하면 잼이 묻는 면이 그림에 나타나요."}</p>
    <p className={scenes.note}>이 체험 로봇의 해석 예시예요. 모든 컴퓨터가 같은 모호한 명령을 이렇게 해석하는 것은 아니에요.</p>
  </>;
}

function FiniteExperience() {
  const [condition, setCondition] = useState(0);
  const [count, setCount] = useState(0);
  const [mode, setMode] = useState<"finite" | "infinite">("finite");
  const [running, setRunning] = useState(false);
  const [ending, setEnding] = useState<"idle" | "auto" | "external">("idle");
  const controls = useRef<HTMLDivElement>(null), returnFocus = useRef(false);
  const finish = useCallback((next: "auto" | "external") => {
    returnFocus.current = controls.current?.contains(document.activeElement) ?? false;
    setRunning(false); setEnding(next);
  }, []);
  useEffect(() => { if (!running && returnFocus.current) { controls.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus(); returnFocus.current = false; } }, [running]);
  function advance() {
    const next = count + 1;
    setCount(next);
    if (mode === "finite" && next >= 3) finish("auto");
  }
  useEffect(() => {
    if (!running || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(() => {
      setCount(count + 1);
      if (mode === "finite" && count + 1 >= 3) finish("auto");
    }, 650);
    return () => clearTimeout(timer);
  }, [running, count, mode, finish]);
  function start(next: "finite" | "infinite") {
    const immediate = next === "finite" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMode(next); setCount(immediate ? 3 : 0); setRunning(!immediate); setEnding(immediate ? "auto" : "idle");
  }
  return <>
    <h4>어떤 반복에 끝나는 조건이 있을까요?</h4>
    <div className={scenes.controls}>{conditions.map(([label], i) => <button key={label} type="button" aria-pressed={condition === i} onClick={() => setCondition(i)}>{label}</button>)}</div>
    <p className={scenes.question}>{conditions[condition][1]}</p>
    <div className={scenes.scene}><svg viewBox="0 0 700 270" role="img" aria-label={`물 붓기 ${count}회, 표시용 컵`}>
      <path d="M235 35H465L440 235H260Z" fill="white" stroke="#8097b6" strokeWidth="5" />
      <path d={`M${260 - Math.min(count, 3) * 5} ${235 - Math.min(count, 3) * 52}H${440 + Math.min(count, 3) * 5}L440 235H260Z`} fill="#80b8ea" />
      <text x="350" y="264" textAnchor="middle">물 붓기 {count}회</text>
    </svg></div>
    <div ref={controls} className={scenes.controls} role="group" aria-label="반복 실행"><Button variant="outline" aria-pressed={mode === "infinite" && (running || ending !== "idle")} onClick={() => start("infinite")}>끝없이 반복</Button><Button variant="outline" aria-pressed={mode === "finite" && (running || ending !== "idle")} onClick={() => start("finite")}>3번만 반복</Button>{running && <><Button className={scenes.secondaryAction} variant="ghost" onClick={advance}>한 단계 실행</Button><Button className={scenes.secondaryAction} variant="ghost" onClick={() => finish("external")}>실행 중지</Button></>}</div>
    <p className={scenes.result} role="status" aria-label="반복 결과">{count}회 · {running ? "실행 중" : ending === "auto" ? "자동 종료" : ending === "external" ? "외부에서 중지" : "아직 실행하지 않았어요"}</p>
    <p>{ending === "external" ? "중지 버튼은 밖에서 실행을 멈춘 것이에요. 끝없는 반복 자체에 종료 조건이 생긴 것은 아니에요." : "3번 반복은 정한 횟수가 되면 스스로 끝나요. 끝없이 반복하는 명령에는 끝나는 조건이 없어요."}</p>
    <p className={scenes.note}>컵의 물높이는 최대 3회까지만 표시해요. 실제 실행 횟수는 위 결과에서 확인해요. 움직임을 줄인 환경에서는 한 단계씩 비교할 수 있어요.</p>
  </>;
}

function SelectionFlowchart({ milk }: { milk: boolean }) {
  return <svg className={scenes.selectionDiagram} viewBox="0 0 900 350" role="img" aria-label="선택한 알고리즘의 순서도">
    <defs><marker id="structure-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="context-stroke" /></marker></defs>
    <g fill="none" stroke="#376fc8" strokeWidth="2" markerEnd="url(#structure-arrow)">
      <path d="M135 58H180" /><path d="M335 58H370" />
      <path d="M690 260V275" /><path d="M775 310H790" />
    </g>
    <rect x="5" y="28" width="130" height="60" rx="30" fill="#eef4ff" stroke="#376fc8" /><text x="70" y="65" textAnchor="middle">시작</text>
    <rect x="185" y="28" width="150" height="60" fill="white" stroke="#376fc8" /><text x="260" y="65" textAnchor="middle">컵 준비</text>
    <path d="M450 5L525 58L450 111L375 58Z" fill="#fff3e8" stroke="#a84f2a" /><text x="450" y="65" textAnchor="middle">우유 있음?</text>
    <g data-branch="milk" data-selected={milk}>
      <path d="M525 58H600" fill="none" stroke={milk ? "#376fc8" : "#8091aa"} strokeWidth={milk ? 4 : 2} markerEnd="url(#structure-arrow)" />
      <text x="560" y="44" textAnchor="middle">예</text>
      <rect x="605" y="28" width="170" height="60" fill={milk ? "#eef4ff" : "white"} stroke={milk ? "#376fc8" : "#8091aa"} strokeWidth={milk ? 3 : 1} /><text x="690" y="65" textAnchor="middle">우유 넣기</text>
      <path d="M775 58H830V260H690" fill="none" stroke={milk ? "#376fc8" : "#8091aa"} strokeWidth={milk ? 4 : 2} />
    </g>
    <g data-branch="water" data-selected={!milk}>
      <path d="M450 111V200H600" fill="none" stroke={!milk ? "#376fc8" : "#8091aa"} strokeWidth={!milk ? 4 : 2} markerEnd="url(#structure-arrow)" />
      <text x="490" y="158" textAnchor="middle">아니오</text>
      <rect x="605" y="170" width="170" height="60" fill={!milk ? "#eef4ff" : "white"} stroke={!milk ? "#376fc8" : "#8091aa"} strokeWidth={!milk ? 3 : 1} /><text x="690" y="207" textAnchor="middle">물 넣기</text>
      <path d="M690 230V260" fill="none" stroke={!milk ? "#376fc8" : "#8091aa"} strokeWidth={!milk ? 4 : 2} />
    </g>
    <rect x="605" y="280" width="170" height="60" fill="white" stroke="#376fc8" /><text x="690" y="317" textAnchor="middle">젓기</text>
    <rect x="795" y="280" width="100" height="60" rx="30" fill="#eef4ff" stroke="#376fc8" /><text x="845" y="317" textAnchor="middle">종료</text>
  </svg>;
}

function StructureExperience() {
  const [structure, setStructure] = useState("순차"), [milk, setMilk] = useState(true), [times, setTimes] = useState(3), [representation, setRepresentation] = useState("자연어");
  const [position, setPosition] = useState(0), [running, setRunning] = useState(false);
  const controls = useRef<HTMLDivElement>(null), runButton = useRef<HTMLButtonElement>(null), returnFocus = useRef(false);
  useEffect(() => { if (!running && returnFocus.current) { runButton.current?.focus(); returnFocus.current = false; } }, [running, position]);
  const path = ["시작", "컵 준비", structure === "선택" && !milk ? "물 넣기" : "우유 넣기", ...(structure === "반복" ? Array.from({ length: times }, () => "젓기") : ["젓기"]), "종료"];
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => { setPosition(position + 1); if (position + 1 >= path.length) { returnFocus.current = controls.current?.contains(document.activeElement) ?? false; setRunning(false); } }, 650);
    return () => clearTimeout(timer);
  }, [running, position, path.length]);
  function change(action: () => void) { action(); setPosition(0); setRunning(false); }
  const instructions = ["시작", "컵 준비", ...(structure === "선택" ? ["우유가 있으면 우유 넣기, 없으면 물 넣기"] : ["우유 넣기"]), structure === "반복" ? `${times}회 젓기` : "젓기", "종료"];
  const pseudocode = `START\nPREPARE cup\n${structure === "선택" ? "IF milkAvailable THEN ADD milk\nELSE ADD water" : "ADD milk"}\n${structure === "반복" ? `REPEAT ${times} TIMES: STIR` : "STIR"}\nEND`;
  return <>
    <h4>조건과 횟수를 바꾸면 실행 경로는 어떻게 달라질까요?</h4>
    <p className={scenes.question}>구조를 고르고 실행해 보세요. 같은 명령을 세 가지 표현으로 비교할 수 있어요.</p>
    <div className={scenes.controls}>{["순차", "선택", "반복"].map((value) => <button key={value} type="button" aria-pressed={structure === value} onClick={() => change(() => setStructure(value))}>{value}</button>)}</div>
    {structure === "선택" && <div className={scenes.controls} aria-label="우유 조건">{[true, false].map((value) => <button key={String(value)} type="button" aria-pressed={milk === value} onClick={() => change(() => setMilk(value))}>우유 {value ? "있음" : "없음"}</button>)}</div>}
    {structure === "반복" && <div className={scenes.controls} aria-label="젓는 횟수">{[1, 3].map((value) => <button key={value} type="button" aria-pressed={times === value} onClick={() => change(() => setTimes(value))}>{value}회</button>)}</div>}
    <div className={scenes.controls}>{["자연어", "순서도", "의사 코드"].map((value) => <button key={value} type="button" aria-pressed={representation === value} onClick={() => setRepresentation(value)}>{value}</button>)}</div>
    <div className={scenes.representation}>{representation === "순서도" ? structure === "선택" ? <><SelectionFlowchart milk={milk} /><p className={scenes.note}>현재 조건: {milk ? "우유 있음 → 예 → 우유 넣기" : "우유 없음 → 아니오 → 물 넣기"}. 두 경로는 젓기 전에 합쳐져요.</p></> : <svg viewBox="0 0 900 150" role="img" aria-label="선택한 알고리즘의 순서도">{instructions.map((label, i) => <g key={i} transform={`translate(${i * 180},0)`}>{i === 0 || i === instructions.length - 1 ? <rect x="5" y="35" width="165" height="80" rx="40" fill="#eef4ff" stroke="#376fc8" /> : <rect x="5" y="35" width="165" height="80" fill="#fff" stroke="#376fc8" />}<text x="85" y="70" textAnchor="middle">{label}</text>{i < instructions.length - 1 && <text x="172" y="78">→</text>}</g>)}</svg> : <pre>{representation === "자연어" ? instructions.join(" → ") : pseudocode}</pre>}</div>
    <div ref={controls} className={scenes.controls} role="group" aria-label="흐름 실행 조작"><Button ref={runButton} className={scenes.primaryAction} onClick={() => { const immediate = matchMedia("(prefers-reduced-motion: reduce)").matches; setPosition(immediate ? path.length : 0); setRunning(!immediate); }}>흐름 실행</Button><Button className={scenes.secondaryAction} variant="ghost" disabled={position >= path.length} onClick={() => { if (position + 1 >= path.length) returnFocus.current = controls.current?.contains(document.activeElement) ?? false; setRunning(false); setPosition(position + 1); }}>한 단계 실행</Button>{running && <Button className={scenes.secondaryAction} variant="ghost" onClick={() => { returnFocus.current = controls.current?.contains(document.activeElement) ?? false; setRunning(false); }}>실행 중지</Button>}</div>
    <p className={scenes.result} role="status">{running ? "실행 중" : position === path.length ? "정한 단계 뒤 자동 종료했어요." : position ? "멈춘 위치에서 한 단계씩 이어갈 수 있어요." : "실행하면 아래에 실제로 지난 경로가 나타나요."}</p>
    <ol className={scenes.flow} aria-label="이번 실행 경로">{path.slice(0, position).map((label, i) => <li key={i}>{label}</li>)}</ol>
  </>;
}
