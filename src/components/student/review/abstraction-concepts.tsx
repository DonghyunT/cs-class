"use client";

import { useEffect, useRef, useState } from "react";
import type { LessonMode } from "../work-controller";
import scenes from "./concepts.module.css";
import styles from "./abstraction-concepts.module.css";

const information = [
  { name: "노트 표지 색", reason: "표지 색은 과제에 쓸 시간과 관계없어요.", core: false },
  { name: "목표 공부 시간", reason: "공부에 쓸 수 있는 시간을 정해야 해요.", core: true },
  { name: "필기구 브랜드", reason: "필기구의 브랜드는 과제를 끝내는 기준이 아니에요.", core: false },
  { name: "남은 과제", reason: "무엇을 얼마나 해야 하는지 알아야 해요.", core: true },
  { name: "책상 장식", reason: "장식의 모양은 과제의 양과 마감에 관계없어요.", core: false },
  { name: "현재 시각", reason: "마감까지 남은 시간을 계산할 때 필요해요.", core: true },
];
const states = [
  ["초기 상태", "저녁 7시, 과제 두 개를 시작하기 전이에요."],
  ["현재 상태", "저녁 8시, 과제 하나는 끝났고 하나가 남았어요."],
  ["조건", "밤 10시 전에 제출하고, 직접 해결해야 해요."],
  ["목표 상태", "마감 전에 과제 두 개를 모두 제출한 상태예요."],
];
const scenarios = [
  { name: "라면 끓이기", goal: "안전하게 라면을 끓여 먹기", steps: [
    ["재료 준비", "냄비·물·라면을 준비해요."], ["물 끓이기", "포장지의 물 양을 확인하고, 뜨거운 냄비를 조심해요."],
    ["면과 스프 넣기", "물이 끓으면 면과 스프를 넣어요."], ["익히고 담기", "조리 시간을 확인하고 불을 끈 뒤 그릇에 담아요."],
  ] },
  { name: "등교하기", goal: "준비물을 챙겨 정시에 학교에 도착하기", steps: [
    ["기상 시간 정하기", "학교 도착 시각에서 이동·준비 시간을 거꾸로 계산해요."], ["씻고 옷 입기", "정한 시간 안에 씻고 학교에 갈 옷을 입어요."],
    ["준비물 확인", "시간표에 맞는 책과 과제를 챙겨요."], ["학교로 이동", "출발 시각과 버스 시간을 확인하고 안전하게 이동해요."],
  ] },
];
const stations = [
  { id: "start", name: "출발역", x: 60, y: 120 }, { id: "transfer", name: "환승역", x: 290, y: 120 },
  { id: "goal", name: "도착역", x: 560, y: 60 }, { id: "park", name: "공원역", x: 60, y: 45 },
  { id: "school", name: "학교역", x: 560, y: 185 },
];
const links = [
  { id: "start-transfer", simple: "M60 120H290", geographic: "M60 120C130 10 200 210 290 120", color: "#376fc8" },
  { id: "transfer-goal", simple: "M290 120L350 60H560", geographic: "M290 120C380 200 410 10 560 60", color: "#376fc8" },
  { id: "park-transfer", simple: "M60 45H215L290 120", geographic: "M60 45C170 0 190 180 290 120", color: "#278364" },
  { id: "transfer-school", simple: "M290 120L355 185H560", geographic: "M290 120C380 20 430 240 560 185", color: "#278364" },
];

function SubwayMap({ simple }: { simple: boolean }) {
  return <figure className={styles.map}>
    <figcaption>{simple ? "연결을 정리한 노선도" : "지형을 표현한 지도"}</figcaption>
    <p className={styles.mapHint}>좁은 화면에서는 지도를 옆으로 스크롤해 모든 역을 보세요.</p>
    <div className={styles.mapScroll} tabIndex={0} aria-label={`${simple ? "노선도" : "지형 지도"} 가로 스크롤`}>
      <svg viewBox="0 0 640 240" role="img" aria-label={simple ? "연결을 정리한 노선도" : "지형을 표현한 지도"}>
        {links.map(link => <path key={link.id} data-edge={link.id} d={simple ? link.simple : link.geographic} fill="none" stroke={link.color} strokeWidth={7} />)}
        {stations.map(station => <g key={station.id} data-station={station.id}>
          <circle cx={station.x} cy={station.y} r={station.id === "transfer" ? 11 : 8} fill="white" stroke="#334861" strokeWidth={2} />
          <text x={station.x} y={station.y + 32} textAnchor="middle">{station.name}</text>
        </g>)}
      </svg>
    </div>
  </figure>;
}

export function AbstractionConcepts({ conceptId, mode = "student" }: { conceptId: string; mode?: LessonMode }) {
  return <section className={scenes.experience} aria-label="추상화 개념 체험">
    <AbstractionExperience key={conceptId} conceptId={conceptId} />
    <p className={scenes.note}>{mode === "preview" ? "체험 장면은 다시 들어오면 처음부터 시작해요. 답안과 완료 기록은 이 창에서만 체험해요." : "체험 장면은 다시 들어오면 처음부터 시작해요. 확인한 답안과 완료 기록은 저장돼요."}</p>
  </section>;
}

function AbstractionExperience({ conceptId }: { conceptId: string }) {
  const [discarded, setDiscarded] = useState<string[]>([]), [message, setMessage] = useState("");
  const [selected, setSelected] = useState(0), [scenario, setScenario] = useState(0);
  const result = useRef<HTMLParagraphElement>(null), [focus, setFocus] = useState(0);
  useEffect(() => { if (focus) result.current?.focus(); }, [focus]);
  if (conceptId === "essential") return <>
    <h4>과제를 제시간에 끝내려면 어떤 정보가 필요할까요?</h4>
    <p className={scenes.question}>목적은 ‘밤 10시 전에 과제 제출하기’예요. 목적에 필요 없는 정보만 눌러 덜어내 보세요.</p>
    <div className={scenes.controls}>{information.filter(item => !discarded.includes(item.name)).map(item => <button key={item.name} type="button" onClick={event => {
      if (item.core) setMessage(`${item.name}은 남겨요. ${item.reason}`);
      else { if (document.activeElement === event.currentTarget) setFocus(n => n + 1); const next = [...discarded, item.name]; setDiscarded(next); setMessage(next.length === 3 ? "핵심 정보 세 가지만 남았어요! 각각 왜 필요한지 확인해 보세요." : item.reason); }
    }}>{item.name}</button>)}</div>
    <p ref={result} tabIndex={-1} role="status" className={scenes.result}>{message || "버릴 정보와 남길 정보를 골라 보세요."}</p>
    <ul className={styles.reasons} aria-label="남기는 정보와 이유">{information.filter(item => item.core).map(item => <li key={item.name}><strong>{item.name}</strong><span>{item.reason}</span></li>)}</ul>
    <h4>모양이 달라도 환승 연결은 같을까요?</h4>
    <p>두 지도에는 같은 다섯 역과 네 연결이 있어요. 파랑 노선에서 초록 노선으로 갈 때 만나는 역을 찾아보세요.</p>
    <div className={styles.maps}><SubwayMap simple={false} /><SubwayMap simple /></div>
    <p className={scenes.question}>핵심은 역 이름과 연결이에요. 노선도는 실제 거리와 굽은 모양을 덜어내 환승역을 찾기 쉽게 해요.</p>
  </>;
  if (conceptId === "state") return <>
    <h4>지금 어디에 있고, 어떤 상태에 도달하려고 하나요?</h4>
    <p className={scenes.question}>출발점·현재 위치·도착점을 비교해 보세요. 조건은 해결 과정에서 계속 지켜야 하는 기준이에요.</p>
    <ol className={styles.stateFlow} aria-label="현재에서 목표로 가는 흐름">{[0, 1, 3].map(index => <li key={index}>
      <button type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>{states[index][0]}</button><p>{states[index][1]}</p>
    </li>)}</ol>
    <div className={`${scenes.controls} ${styles.condition}`}><button type="button" aria-pressed={selected === 2} onClick={() => setSelected(2)}>조건</button><span>{states[2][1]}</span></div>
    <p className={scenes.result} role="status">{states[selected][0]}: {states[selected][1]}</p>
  </>;
  const current = scenarios[scenario];
  return <>
    <h4>큰 목표를 어떤 작은 문제로 나눌 수 있을까요?</h4>
    <div className={scenes.controls}>{scenarios.map((item, index) => <button type="button" key={item.name} aria-pressed={scenario === index} onClick={() => setScenario(index)}>{item.name}</button>)}</div>
    <p className={scenes.question}>목표: {current.goal}</p>
    <p>각 단계를 펼쳐 필요한 정보와 할 일을 확인해 보세요. 작은 단계를 해결하면 큰 목표에 가까워져요.</p>
    <ol className={styles.steps}>{current.steps.map(([title, detail], index) => <li key={`${scenario}-${title}`}><details><summary>{index + 1}. {title}</summary><p>{detail}</p><small>큰 목표와 연결: {current.goal}</small></details></li>)}</ol>
  </>;
}
