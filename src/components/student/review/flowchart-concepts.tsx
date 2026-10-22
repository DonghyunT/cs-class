"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { LessonMode } from "../work-controller";
import scenes from "./concepts.module.css";
import styles from "./flowchart-concepts.module.css";

type Shape = "terminal" | "io" | "process" | "decision";
const symbols: { name: string; shape: Shape; meaning: string; example: string; entry: string; note: string }[] = [
  { name: "단말", shape: "terminal", meaning: "시작과 종료를 나타내요.", example: "시작", entry: "시작하기 버튼을 클릭했을 때 · 모든 코드 멈추기", note: "시작은 절차의 출발점, 종료는 더 이상 실행할 단계가 없는 지점이에요." },
  { name: "입출력", shape: "io", meaning: "자료를 입력받거나 결과를 보여 줘요.", example: "키 입력", entry: "묻고 대답 기다리기 · 말하기", note: "입력과 출력 모두 평행사변형으로 나타내요. 내용에 무엇을 주고받는지 써요." },
  { name: "처리", shape: "process", meaning: "행동을 실행하거나 값을 계산해요.", example: "키에 10 더하기", entry: "변수 바꾸기 · 움직이기", note: "처리에는 실제로 할 행동이나 계산을 써요. 조건을 묻는 기호와 구분해요." },
  { name: "판단", shape: "decision", meaning: "조건을 확인하고 예·아니오로 길을 나눠요.", example: "키가 150 이상인가?", entry: "만일 조건이라면", note: "마름모에는 조건을 쓰고, 나가는 화살표에는 예·아니오를 표시해요." },
];

function SymbolShape({ shape, width, height }: { shape: Shape; width: number; height: number }) {
  if (shape === "terminal") return <ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} />;
  if (shape === "io") return <polygon points={`24,0 ${width},0 ${width - 24},${height} 0,${height}`} />;
  if (shape === "decision") return <polygon points={`${width / 2},0 ${width},${height / 2} ${width / 2},${height} 0,${height / 2}`} />;
  return <rect width={width} height={height} />;
}

export function FlowchartConcepts({ conceptId, mode = "student" }: { conceptId: string; mode?: LessonMode }) {
  return <section className={`${scenes.experience} ${styles.experience}`} aria-label="순서도 개념 체험">
    {conceptId === "symbols" ? <SymbolExperience /> : <PathExperience key={conceptId} loop={conceptId === "loop"} />}
    <p className={scenes.note}>{mode === "preview" ? "체험 장면은 다시 들어오면 처음부터 시작해요. 답안과 완료 기록, 실습 작품은 이 창에서만 체험해요." : "체험 장면은 다시 들어오면 처음부터 시작해요. 확인한 답안과 완료 기록, 실습 작품은 저장돼요."}</p>
  </section>;
}

function SymbolExperience() {
  const [selected, setSelected] = useState(0), symbol = symbols[selected];
  return <>
    <h4>같은 절차라도 어떤 역할의 기호를 쓸까요?</h4>
    <p className={scenes.question}>기호를 바꾸며 모양과 예시를 함께 보세요. 입력받기, 계산하기, 조건 묻기를 구분해 볼까요?</p>
    <div className={scenes.controls} role="group" aria-label="순서도 기호 선택">{symbols.map((item, index) => <Button key={item.name} variant="outline" aria-pressed={selected === index} onClick={() => setSelected(index)}>{item.name}</Button>)}</div>
    <div className={styles.symbolScene}>
      <svg viewBox="0 0 520 220" role="img" aria-label={`${symbol.name} 기호와 예시`}>
        <g transform="translate(70,20)" data-symbol-shape={symbol.shape} data-shape={symbol.shape}><SymbolShape shape={symbol.shape} width={380} height={180} /><text x="190" y="104" textAnchor="middle">{symbol.shape === "decision" ? <><tspan x="190" y="74">키가 150</tspan><tspan x="190" y="124"> 이상인가?</tspan></> : symbol.example}</text></g>
      </svg>
    </div>
    <div className={styles.symbolMeaning}><p className={scenes.result} role="status"><strong>{symbol.name}</strong> · {symbol.meaning}</p><p><strong>엔트리에서 연결해 보기</strong><br />{symbol.entry}</p><p>{symbol.note}</p></div>
    <div className={scenes.controls}><Button variant="ghost" className={scenes.secondaryAction} aria-label="기호 선택 초기화" title="기호 선택만 초기화 · 답안과 완료 기록 유지" onClick={() => setSelected(0)}>기호 선택 초기화</Button></div>
  </>;
}

type Run = { history: string[]; decision: boolean | null };
const emptyRun: Run = { history: [], decision: null };
const labels: Record<string, string> = { start: "시작", input: "예시 입력", decision: "조건 확인", yes: "탑승 가능 안내", no: "대기 안내", success: "로그인 성공 안내", fail: "불일치 안내", end: "종료" };
function nextStep(run: Run, answer: boolean, loop: boolean): Run {
  const current = run.history.at(-1);
  const next = !current ? "start" : current === "start" || current === "fail" ? "input" : current === "input" ? "decision" : current === "decision" ? run.decision ? loop ? "success" : "yes" : loop ? "fail" : "no" : "end";
  return { history: [...run.history, next], decision: current === "input" ? answer : run.decision };
}

function PathExperience({ loop }: { loop: boolean }) {
  const [height, setHeight] = useState(140), [correct, setCorrect] = useState(false), [run, setRun] = useState<Run>(emptyRun), [running, setRunning] = useState(false), [stopped, setStopped] = useState(false);
  const controls = useRef<HTMLDivElement>(null), runButton = useRef<HTMLButtonElement>(null), returnFocus = useRef(false);
  const answer = loop ? correct : height >= 150, current = run.history.at(-1), done = current === "end", returned = loop && current === "input" && run.history.length > 2;
  const finish = useCallback(() => {
    returnFocus.current = controls.current?.contains(document.activeElement) ?? false;
    setRunning(false);
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => { if (media.matches && running) finish(); };
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, [finish, running]);
  useEffect(() => {
    if (!running && returnFocus.current) { runButton.current?.focus(); returnFocus.current = false; }
  }, [running, run.history.length]);
  const advance = useCallback(() => {
    const next = nextStep(run, answer, loop);
    setRun(next); setStopped(false);
    if (next.history.at(-1) === "end" || (loop && current === "fail")) finish();
  }, [run, answer, loop, current, finish]);
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(advance, 650);
    return () => clearTimeout(timer);
  }, [running, advance]);
  function reset() { setRunning(false); setStopped(false); setRun(emptyRun); setHeight(140); setCorrect(false); }
  function start() {
    setStopped(false);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      let next = done ? emptyRun : run;
      do { next = nextStep(next, answer, loop); } while (next.history.at(-1) !== "end" && !(loop && next.history.at(-2) === "fail"));
      setRun(next); setRunning(false);
    } else { if (done) setRun(emptyRun); setRunning(true); }
  }
  const inputLabel = loop ? "예시 입력" : `키 ${height}cm 입력`;
  return <>
    <h4>{loop ? "틀린 입력은 어디로 돌아가고, 맞는 입력은 어디로 갈까요?" : "키가 150cm일 때도 ‘예’ 경로로 갈까요?"}</h4>
    <p className={scenes.question}>{loop ? "틀린 예시로 먼저 실행해 보세요. 입력 단계로 돌아오면 맞는 예시로 바꾸고 다시 실행해 보세요." : "예시 키를 선택한 뒤 ‘키가 150 이상인가?’를 확인하세요. 예·아니오 화살표와 실제 지나간 경로를 비교해 보세요."}</p>
    <div className={scenes.controls} role="group" aria-label={loop ? "예시 입력 선택" : "예시 키 선택"}>
      {loop ? [false, true].map(value => <Button key={String(value)} variant="outline" disabled={running || (!!current && current !== "input" && !done)} aria-pressed={correct === value} onClick={() => { if (done) setRun(emptyRun); setCorrect(value); setStopped(false); }}>예시 입력: {value ? "맞음" : "틀림"}</Button>) : [140, 160, 150].map(value => <Button key={value} variant="outline" aria-pressed={height === value} onClick={() => { setHeight(value); setRun(emptyRun); setRunning(false); setStopped(false); }}>{value}cm</Button>)}
    </div>
    <p className={styles.inputSummary}>{loop ? `선택한 예시: ${correct ? "맞음" : "틀림"} · 실제 비밀번호를 입력하지 않아요.` : `입력: ${height}cm · 조건: 키 ≥ 150cm (150cm도 포함해요)`}</p>
    <FlowScene loop={loop} run={run} inputLabel={inputLabel} />
    <div ref={controls} className={scenes.controls} role="group" aria-label="개념 흐름 실행 조작">
      <Button ref={runButton} className={scenes.primaryAction} onClick={start}>흐름 실행</Button>
      <Button variant="ghost" className={scenes.secondaryAction} disabled={done} onClick={() => { setRunning(false); advance(); }}>한 단계 실행</Button>
      {running && <Button variant="ghost" className={scenes.secondaryAction} onClick={() => { finish(); setStopped(true); }}>실행 중지</Button>}
      <Button variant="ghost" className={scenes.secondaryAction} aria-label="예시 흐름 초기화" title="예시 흐름만 초기화 · 답안과 완료 기록 유지" onClick={reset}>예시 흐름 초기화</Button>
    </div>
    <p className={scenes.result} role="status">{done ? `종료에 도달했어요. ${loop ? "맞는 입력은 예 경로로 로그인 성공 안내를 거쳐 끝나요." : `${height}cm는 ${run.decision ? "예 → 탑승 가능 안내" : "아니오 → 대기 안내"} 경로를 지났어요.`}` : stopped ? `실행을 중지했어요. 현재 위치: ${labels[current ?? "start"]}. 한 단계씩 이어갈 수 있어요.` : returned ? "입력 단계로 돌아왔어요. 맞는 예시를 선택하고 다시 조건을 확인해 보세요." : running ? `실행 중 · 현재 위치: ${labels[current ?? "start"]}` : current ? `현재 위치: ${labels[current]}${current === "decision" ? ` · ${run.decision ? "예" : "아니오"} 경로로 진행해요.` : " · 다음 단계를 실행해 보세요."}` : "아직 실행하지 않았어요. 화살표의 방향과 예·아니오를 먼저 살펴보세요."}</p>
    <ol className={scenes.flow} aria-label="이번 실행 경로">{run.history.map((node, index) => <li key={index}>{node === "input" && !loop ? inputLabel : labels[node]}</li>)}</ol>
    <p className={scenes.note}>{loop ? "틀림은 아니오 → 불일치 안내 → 다시 입력으로 돌아가요. 이 체험은 입력에 돌아오면 기다리고, 맞는 입력을 선택해야 종료까지 진행해요." : "판단에서는 두 갈래 중 조건에 맞는 하나만 실행해요. 두 길은 종료에서 합쳐져요."} 움직임을 줄인 환경에서는 실행 결과를 바로 보여 줘요.</p>
  </>;
}

function FlowScene({ loop, run, inputLabel }: { loop: boolean; run: Run; inputLabel: string }) {
  const marker = useId().replace(/:/g, ""), active = run.history.at(-1);
  const nodes: { id: string; shape: Shape; x: number; y: number; width: number; height: number; text: string[] }[] = loop ? [
    { id: "start", shape: "terminal", x: 160, y: 10, width: 120, height: 50, text: ["시작"] },
    { id: "input", shape: "io", x: 100, y: 100, width: 240, height: 70, text: [inputLabel] },
    { id: "decision", shape: "decision", x: 90, y: 210, width: 260, height: 120, text: ["예시 입력이", "맞는가?"] },
    { id: "fail", shape: "io", x: 440, y: 235, width: 180, height: 70, text: ["불일치 안내"] },
    { id: "success", shape: "io", x: 100, y: 375, width: 240, height: 70, text: ["로그인 성공 안내"] },
    { id: "end", shape: "terminal", x: 160, y: 485, width: 120, height: 50, text: ["종료"] },
  ] : [
    { id: "start", shape: "terminal", x: 260, y: 10, width: 120, height: 50, text: ["시작"] },
    { id: "input", shape: "io", x: 200, y: 90, width: 240, height: 70, text: [inputLabel] },
    { id: "decision", shape: "decision", x: 190, y: 185, width: 260, height: 110, text: ["키가 150", "이상인가?"] },
    { id: "yes", shape: "io", x: 10, y: 325, width: 230, height: 65, text: ["탑승 가능 안내"] },
    { id: "no", shape: "io", x: 400, y: 325, width: 230, height: 65, text: ["대기 안내"] },
    { id: "end", shape: "terminal", x: 260, y: 440, width: 120, height: 50, text: ["종료"] },
  ];
  const edges = loop ? [
    { id: "start", from: "start", to: "input", path: "M220 60V100" },
    { id: "input", from: "input", to: "decision", path: "M220 170V210" },
    { id: "yes", from: "decision", to: "success", path: "M220 330V375", label: "예", x: 245, y: 355 },
    { id: "no", from: "decision", to: "fail", path: "M350 270H452", label: "아니오", x: 395, y: 250 },
    { id: "return", from: "fail", to: "input", path: "M608 270H650V135H328", label: "다시 입력", x: 515, y: 114 },
    { id: "end", from: "success", to: "end", path: "M220 445V485" },
  ] : [
    { id: "start", from: "start", to: "input", path: "M320 60V90" },
    { id: "input", from: "input", to: "decision", path: "M320 160V185" },
    { id: "yes", from: "decision", to: "yes", path: "M190 240H125V325", label: "예", x: 150, y: 275 },
    { id: "no", from: "decision", to: "no", path: "M450 240H515V325", label: "아니오", x: 487, y: 275 },
    { id: "yes-end", from: "yes", to: "end", path: "M125 390V420H320V440" },
    { id: "no-end", from: "no", to: "end", path: "M515 390V420H320V440" },
  ];
  return <div className={styles.diagram} tabIndex={0} role="group" aria-label="체험 순서도 스크롤 영역"><svg viewBox={`0 0 670 ${loop ? 550 : 505}`} role="img" aria-label={loop ? "틀린 입력은 돌아가고 맞는 입력은 종료하는 순서도" : "키가 150 이상인지 판단하는 순서도"}>
    <defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="context-stroke" /></marker></defs>
    {edges.map(edge => {
      const visited = run.history.some((node, index) => node === edge.to && run.history[index - 1] === edge.from);
      return <g key={edge.id} data-edge={edge.id} data-visited={visited}><path d={edge.path} fill="none" markerEnd={`url(#${marker})`} />{edge.label && <text x={edge.x} y={edge.y} textAnchor="middle">{edge.label}</text>}</g>;
    })}
    {nodes.map(node => <g key={node.id} transform={`translate(${node.x},${node.y})`} data-shape={node.shape} data-active={active === node.id} data-node={node.id}>
      <SymbolShape shape={node.shape} width={node.width} height={node.height} />
      {node.text.map((line, index) => <text key={line} x={node.width / 2} y={node.height / 2 + 6 + (index - (node.text.length - 1) / 2) * 23} textAnchor="middle">{line}</text>)}
    </g>)}
  </svg></div>;
}
