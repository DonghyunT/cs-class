"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { ArrowDown, Minus, Music, Play, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LessonMode } from "./work-controller";
import styles from "./function-concepts.module.css";

// Hands-on experiences for the functions lesson concepts (the beat game, then Entry-looking blocks).
// Each one ends by offering the check question, so students move on without hunting for it.

const STEP_MS = 420;

// Lights one step at a time (long runs go faster, about 3.6 s at most); timers stop when the experience is reset or left.
function usePlayback() {
  const timers = useRef<number[]>([]);
  const [current, setCurrent] = useState(-1);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const play = (count: number, onEnd: () => void) => {
    const step = Math.min(STEP_MS, 3600 / Math.max(count, 1)), before = document.activeElement as HTMLElement | null;
    timers.current.forEach(clearTimeout);
    setPlaying(true);
    timers.current = Array.from({ length: count + 1 }, (_, i) => window.setTimeout(() => {
      if (i < count) return setCurrent(i);
      setCurrent(-1); setPlaying(false); onEnd();
      // Disabled buttons lose focus while playing; return it unless the next step already took it.
      requestAnimationFrame(() => { if (!document.activeElement || document.activeElement === document.body) before?.focus(); });
    }, i * step));
  };
  return { current, playing, play };
}

// Entry-looking blocks; `on` marks the block running right now.
const Block = ({ kind, inner, on, children }: { kind: "start" | "fn" | "say" | "move" | "pen"; inner?: boolean; on?: boolean; children: ReactNode }) =>
  <div className={styles.block} data-kind={kind} data-inner={inner ? "" : undefined} data-on={on ? "" : undefined}>{children}</div>;

// Moves focus to the first answer of this concept, or to the next button once it is solved.
function ToCheck({ conceptId, ref }: { conceptId: string; ref: RefObject<HTMLButtonElement | null> }) {
  return <Button ref={ref} variant="outline" className={styles.toCheck} onClick={() => {
    const target = document.getElementById(`concept-${conceptId}`)?.querySelector<HTMLElement>("input[type=radio]:not(:disabled)") ?? document.getElementById(`concept-next-${conceptId}`);
    target?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    target?.focus({ preventScroll: true });
  }}>확인 문제로<ArrowDown size={16} aria-hidden="true" /></Button>;
}

function Frame({ conceptId, question, status, done, children }: { conceptId: string; question: string; status: string; done: boolean; children: ReactNode }) {
  const toCheck = useRef<HTMLButtonElement>(null), shown = useRef(done);
  // Take focus only if it is lost or still inside this experience, never from where the student moved it.
  useEffect(() => {
    const active = document.activeElement, own = toCheck.current?.closest("section");
    if (done && !shown.current && (!active || active === document.body || own?.contains(active))) toCheck.current?.focus({ preventScroll: true });
    shown.current = done;
  }, [done]);
  return <>
    <p className={styles.observation}><strong>관찰 질문</strong>{question}</p>
    {children}
    <div className={styles.result}><p role="status">{status}</p>{done && <ToCheck conceptId={conceptId} ref={toCheck} />}</div>
  </>;
}

const flip = (beat: string) => beat === "쿵" ? "짝" : "쿵";

function BeatMaker({ conceptId }: { conceptId: string }) {
  const [beat, setBeat] = useState(["쿵", "쿵", "짝"]);
  const [status, setStatus] = useState("칸을 눌러 나만의 비트를 정하고, 불러 보세요.");
  const [done, setDone] = useState(false);
  const { current, playing, play } = usePlayback();
  return <Frame conceptId={conceptId} question="비트를 한 번 부르면 무엇이 어떤 순서로 실행될까요?" status={status} done={done}>
    <div className={styles.split}>
      <div className={styles.pane}>
        <span className={styles.paneLabel}>교실의 【비트】 정하기</span>
        <div className={styles.tiles}>{beat.map((b, i) => <button key={i} type="button" className={styles.tile} data-tone={b === "짝" ? "clap" : undefined} data-on={current === i ? "" : undefined} disabled={playing} aria-label={`${i + 1}번째 동작 ${b}, 눌러서 바꾸기`} onClick={() => { setBeat(beat.map((x, j) => j === i ? flip(x) : x)); setStatus("비트를 바꿨어요. 불러서 확인해 보세요."); }}>{b}</button>)}</div>
        <Button disabled={playing} onClick={() => { setStatus("연주 중…"); play(beat.length, () => { setStatus(`비트를 한 번 불러 ${beat.join("·")}을 차례로 했어요.`); setDone(true); }); }}><Play size={16} aria-hidden="true" />“비트!” 부르기</Button>
      </div>
      <div className={styles.pane}>
        <span className={styles.paneLabel}>엔트리의 함수 ‘비트’</span>
        <div className={styles.code}><Block kind="fn">함수 정의하기 <b>비트</b></Block>{beat.map((b, i) => <Block key={i} kind="say" inner on={current === i}>{b} 말하기</Block>)}</div>
      </div>
    </div>
  </Frame>;
}

const BEAT = ["쿵", "쿵", "짝"];

// Like Entry: create the function, fill it, save it; only then its call block can be used.
function DefineCall({ conceptId }: { conceptId: string }) {
  const [body, setBody] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [called, setCalled] = useState(false);
  const [ranAlone, setRanAlone] = useState(false);
  const [status, setStatus] = useState("‘함수 만들기’를 눌러 함수 ‘비트’를 만들어 보세요.");
  const [done, setDone] = useState(false);
  const { current, playing, play } = usePlayback();
  const said = body ?? [];
  const root = useRef<HTMLDivElement>(null);
  const focusNext = (selector: string) => requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(selector)?.focus());
  return <Frame conceptId={conceptId} question="정의만 있을 때와, 호출 블록을 끼웠을 때 무엇이 달라질까요?" status={status} done={done}>
    <div className={styles.split} ref={root}>
      <div className={styles.pane}>
        <span className={styles.paneLabel}>① 정의 · 함수 만들기</span>
        {body === null ? <Button variant="outline" onClick={() => { setBody([]); setStatus("함수 정의하기 블록이 생겼어요. 안에 넣을 블록을 담고 ‘저장’을 눌러요."); focusNext("[data-first-add]"); }}><Plus size={16} aria-hidden="true" />함수 만들기</Button> : <>
          <div className={styles.code}><Block kind="fn" on={playing}>함수 정의하기 <b>비트</b></Block>{said.length ? said.map((b, i) => <Block key={i} kind="say" inner on={current === i}>{b} 말하기</Block>) : <div className={styles.slot}>여기에 블록을 넣어요</div>}</div>
          {saved ? <span className={styles.badge} data-on={playing ? "" : undefined}>{playing ? "실행 중" : "저장됨 · 불릴 때까지 기다리는 중"}</span> : <div className={styles.actions}>
            {["쿵", "짝"].map((b) => <Button key={b} variant="outline" size="sm" data-first-add={b === "쿵" ? "" : undefined} disabled={said.length >= 4} onClick={() => { setBody([...said, b]); setStatus(`‘${b} 말하기’를 넣었어요.`); }}><Plus size={14} aria-hidden="true" />{b} 말하기 넣기</Button>)}
            <Button size="sm" disabled={!said.length} onClick={() => { setSaved(true); setStatus("저장했어요. 먼저 ‘비트’ 블록 없이 그대로 시작하기를 눌러 보세요."); focusNext("[data-run]"); }}><Save size={14} aria-hidden="true" />저장</Button>
          </div>}
        </>}
      </div>
      <div className={styles.pane}>
        <span className={styles.paneLabel}>② 호출 · 불러서 실행</span>
        <div className={styles.code}><Block kind="start">시작하기 버튼을 클릭했을 때</Block>{called ? <Block kind="fn" inner on={playing}>비트</Block> : <div className={styles.slot}>빈 자리</div>}</div>
        <div className={styles.actions}>
          <Button variant="outline" aria-pressed={called} disabled={!ranAlone || playing} onClick={() => { setCalled(!called); setStatus(called ? "‘비트’ 블록을 뺐어요. 시작하기를 눌러 보세요." : "‘비트’ 블록을 끼웠어요. 다시 시작하기를 눌러 보세요."); }}>{called ? "‘비트’ 블록 빼기" : "‘비트’ 블록 끼우기"}</Button>
          <Button disabled={playing} data-run="" aria-label="시작하기 실행" onClick={() => {
            if (!called) { if (saved) setRanAlone(true); setStatus(saved ? "시작하기 아래에 끼운 블록이 없어 아무것도 실행되지 않았어요. 정의는 불릴 때까지 기다려요. 이제 ‘비트’ 블록을 끼워 보세요." : "시작하기 아래에 끼운 블록이 없어 아무것도 실행되지 않았어요. 먼저 함수를 만들고 저장해요."); return; }
            setStatus("연주 중…");
            play(said.length, () => { setStatus(`‘비트’를 부르자 정의 안의 ${said.join("·")}이 실행됐어요.`); setDone(true); });
          }}><Play size={16} aria-hidden="true" />시작하기</Button>
        </div>
        <div className={styles.stage} aria-hidden="true"><Music size={28} /><span className={styles.bubble}>{current >= 0 ? said[current] : "…"}</span></div>
      </div>
    </div>
  </Frame>;
}

type Part = "loop" | "beat" | "break";
const MAX_PARTS = 6;
const ADD_LABEL: Record<Part, string> = { beat: "비트 더하기", break: "브레이크! 말하기 더하기", loop: "4번 반복 더하기" };
// What a score plays: each 비트 call, marked when it sits inside the loop.
const unfold = (score: Part[]) => score.flatMap((part) => part === "loop" ? Array.from({ length: 4 }, () => ({ name: "비트", loop: true })) : [{ name: part === "beat" ? "비트" : "브레이크!", loop: false }]);

function Score({ conceptId }: { conceptId: string }) {
  const [score, setScore] = useState<Part[]>(["loop", "break", "beat"]);
  const [played, setPlayed] = useState<ReturnType<typeof unfold> | null>(null);
  const [status, setStatus] = useState("악보를 그대로 연주하거나, 블록을 더하고 빼 보세요.");
  const [done, setDone] = useState(false);
  const { current, playing, play } = usePlayback();
  const pane = useRef<HTMLDivElement>(null);
  const refocus = useRef<number | null>(null);
  // After a block is removed, focus its neighbour (or the first add button) so keyboard users keep their place.
  useEffect(() => {
    if (refocus.current === null) return;
    const buttons = pane.current?.querySelectorAll<HTMLElement>("[data-remove]") ?? [];
    (buttons[Math.min(refocus.current, buttons.length - 1)] ?? pane.current?.querySelector<HTMLElement>("[data-add]"))?.focus();
    refocus.current = null;
  }, [score]);
  const change = (next: Part[]) => { setScore(next); setPlayed(null); setStatus(next.length ? "악보를 바꿨어요. 다시 연주해 보세요." : "악보가 비었어요. 블록을 더해 보세요."); };
  return <Frame conceptId={conceptId} question="반복은 어떻게 연주되고, 함수 호출은 어디에 둘 수 있을까요?" status={status} done={done}>
    <div className={styles.split}>
      <div className={styles.pane} ref={pane}>
        <span className={styles.paneLabel}>악보 만들기</span>
        <div className={styles.code}><Block kind="start">시작하기 버튼을 클릭했을 때</Block>{score.map((part, i) => <div key={i} className={styles.removable}>
          {part === "loop" ? <div className={styles.loop}><span>4번 반복하기</span><Block kind="fn" inner>비트</Block></div> : part === "beat" ? <Block kind="fn" inner>비트</Block> : <Block kind="say" inner>브레이크! 말하기</Block>}
          <button type="button" className={styles.remove} data-remove="" disabled={playing} aria-label={`${i + 1}번째 블록 빼기`} onClick={() => { refocus.current = i; change(score.filter((_, j) => j !== i)); }}><X size={14} aria-hidden="true" /></button>
        </div>)}</div>
        <div className={styles.actions}>{(["beat", "break", "loop"] as Part[]).map((part) => <Button key={part} variant="outline" size="sm" data-add={part === "beat" ? "" : undefined} disabled={playing || score.length >= MAX_PARTS} onClick={() => change([...score, part])}><Plus size={14} aria-hidden="true" />{ADD_LABEL[part]}</Button>)}</div>
      </div>
      <div className={styles.pane}>
        <span className={styles.paneLabel}>연주 순서</span>
        <div className={styles.code} aria-label="모든 ‘비트’ 호출이 실행하는 정의"><Block kind="fn" on={(played ?? [])[current]?.name === "비트"}>함수 정의하기 <b>비트</b></Block>{BEAT.map((b, i) => <Block key={i} kind="say" inner on={(played ?? [])[current]?.name === "비트"}>{b} 말하기</Block>)}</div>
        {!played && <p className={styles.pending}>연주하기를 누르면 이 순서로 불이 켜져요.</p>}
        <ol className={styles.timeline} aria-label="연주 순서">{(played ?? unfold(score)).map((unit, i) => <li key={i} data-loop={unit.loop ? "" : undefined} data-break={unit.name === "비트" ? undefined : ""} data-on={current === i ? "" : undefined} data-dim={played ? undefined : ""}>{unit.name}</li>)}</ol>
        <p className={styles.legend}><span><i data-loop="" />반복 안의 호출</span><span><i />반복 밖의 호출</span><span><i data-break="" />말하기 명령</span></p>
        <Button disabled={playing || !score.length} onClick={() => {
          const units = unfold(score), calls = units.filter((unit) => unit.name === "비트"), inLoop = calls.filter((unit) => unit.loop).length;
          setPlayed(units); setStatus("연주 중…");
          play(units.length, () => { setStatus(calls.length ? `비트를 ${calls.length}번 불렀어요. 반복 안에서 ${inLoop}번, 반복 밖에서 ${calls.length - inLoop}번이고, 모두 같은 ‘비트’ 정의를 실행했어요.` : "비트를 한 번도 부르지 않았어요."); setDone(true); });
        }}><Play size={16} aria-hidden="true" />연주하기</Button>
      </div>
    </div>
  </Frame>;
}

// ① run, ② edit the definition, ③ run again: editing opens only after the first run.
function EditDefinition({ conceptId }: { conceptId: string }) {
  const [beat, setBeat] = useState(BEAT);
  const [played, setPlayed] = useState<string[] | null>(null);
  const [status, setStatus] = useState("① 먼저 ‘실행’을 눌러 불이 켜지는 순서를 보세요.");
  const [done, setDone] = useState(false);
  const { current, playing, play } = usePlayback();
  const stale = !!played && played.join() !== beat.join();
  const shown = played ?? beat;
  // The two calls with 브레이크! between them, as one row of steps.
  const units = [...shown.map((b) => ({ b, call: 1 })), { b: "브레이크!", call: 0 }, ...shown.map((b) => ({ b, call: 2 }))];
  const edit = (next: string[]) => { setBeat(next); setStatus("② 정의를 바꿨어요. ③ 다시 실행해 보세요."); };
  return <Frame conceptId={conceptId} question="정의를 고친 뒤 다시 실행하면, 비트를 부른 두 곳은 어떻게 될까요?" status={status} done={done}>
    <div className={styles.split}>
      <div className={styles.pane}>
        <span className={styles.paneLabel}>② 정의 바꾸기</span>
        <div className={styles.code}><Block kind="fn">함수 정의하기 <b>비트</b></Block>{beat.map((b, i) => <Block key={i} kind="say" inner>{b} 말하기</Block>)}</div>
        <div className={styles.actions}>
          <Button variant="outline" size="sm" disabled={!played || playing || beat.length >= 5} onClick={() => edit([...beat, "짝"])}><Plus size={14} aria-hidden="true" />짝 하나 더하기</Button>
          <Button variant="outline" size="sm" disabled={!played || playing || beat.length <= 2} onClick={() => edit(beat.slice(0, -1))}><Minus size={14} aria-hidden="true" />마지막 동작 빼기</Button>
        </div>
        {!played && <p className={styles.pending}>① 실행한 뒤에 바꿀 수 있어요.</p>}
      </div>
      <div className={styles.pane}>
        <span className={styles.paneLabel}>부르는 곳 두 군데 · ① 실행 ③ 다시 실행</span>
        <div className={styles.code}><Block kind="start">시작하기 버튼을 클릭했을 때</Block><Block kind="fn" inner>비트</Block><Block kind="say" inner>브레이크! 말하기</Block><Block kind="fn" inner>비트</Block></div>
        {!played && <p className={styles.pending}>실행하면 이 순서로 불이 켜져요.</p>}
        <ol className={styles.timeline} aria-label="연주">{units.map((unit, i) => <li key={i} data-tone={unit.b === "짝" ? "clap" : undefined} data-break={unit.call ? undefined : ""} data-on={current === i ? "" : undefined} data-dim={played && !stale ? undefined : ""}>{unit.b}</li>)}</ol>
        {stale && <p className={styles.stale}>고치기 전 연주예요. 다시 실행하면 바뀌어요.</p>}
        <Button disabled={playing} onClick={() => {
          const edited = stale;
          setPlayed(beat); setStatus("연주 중…");
          play(beat.length * 2 + 1, () => {
            const sound = beat.join("·");
            setStatus(edited ? `다시 실행했더니 두 곳 모두 ${sound}으로 바뀌었어요.` : `두 곳 모두 ${sound}을 했어요. ② 이제 정의를 바꾸고 ③ 다시 실행해 보세요.`);
            if (edited) setDone(true);
          });
        }}><Play size={16} aria-hidden="true" />{played ? "다시 실행" : "실행"}</Button>
      </div>
    </div>
  </Frame>;
}

const LIMITS = { n: [2, 8, 1], d: [30, 90, 10], a: [30, 180, 10] } as const;
type Key = keyof typeof LIMITS;
const NAMES: Record<Key, string> = { n: "반복", d: "거리", a: "각도" };
const TARGET = [[50, 40], [130, 40], [90, 109.3]];
// Entry starts facing right and turns clockwise; one step of 50 draws 80px.
function trace(v: Record<Key, number>) {
  let x = 50, y = 40, heading = 0;
  const points = [[x, y]];
  for (let i = 0; i < v.n; i++) {
    x += v.d * 1.6 * Math.cos(heading * Math.PI / 180); y += v.d * 1.6 * Math.sin(heading * Math.PI / 180);
    points.push([x, y]); heading += v.a;
  }
  return { points, path: points.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`).join(""), closed: Math.hypot(x - 50, y - 40) < 1 };
}
// Frames the drawing and the target together, at one scale, so no stroke leaves the stage.
function frame(points: number[][]) {
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y), pad = 16;
  const minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad;
  return `${minX.toFixed(1)} ${minY.toFixed(1)} ${Math.max(Math.max(...xs) + pad - minX, 220).toFixed(1)} ${Math.max(Math.max(...ys) + pad - minY, 180).toFixed(1)}`;
}
const STEPS = ["오류 찾기", "원인 생각하기", "고치기", "다시 실행해 확인"];

function Debug({ conceptId }: { conceptId: string }) {
  const [v, setV] = useState<Record<Key, number>>({ n: 3, d: 50, a: 90 });
  const [drawn, setDrawn] = useState<{ path: string; points: number[][]; shape: string; run: number; stale: boolean } | null>(null);
  const [phase, setPhase] = useState(0);
  const [misses, setMisses] = useState(0);
  const [status, setStatus] = useState("① 그대로 실행해서 점선(예상)과 비교해 보세요.");
  const [done, setDone] = useState(false);
  const change = (key: Key, delta: number) => {
    const [min, max] = LIMITS[key];
    const value = Math.max(min, Math.min(max, v[key] + delta)), said = `바꾼 값: ${NAMES[key]} ${value}${key === "a" ? "°" : ""}.`;
    setV({ ...v, [key]: value });
    if (drawn) { setDrawn({ ...drawn, stale: true }); setPhase(2); setStatus(`③ ${said} ④ 다시 실행해 확인해 보세요.`); }
    else setStatus(`${said} 실행해 보세요.`);
  };
  const run = () => {
    const result = trace(v), solved = result.closed && v.n === 3 && v.a === 120;
    // The first return to the start: earlier than the last stroke means later strokes go over the shape again.
    const back = result.points.findIndex(([x, y], i) => i >= 2 && Math.hypot(x - 50, y - 40) < 1);
    const overlap = back > 0 && back < v.n;
    const what = overlap ? back === 3 ? v.n === 6 ? "정삼각형을 두 번 겹쳐 그렸어요. 반복 횟수를 줄여 한 번만 그려 보세요." : "정삼각형을 그린 뒤에도 선을 더 그려 겹쳤어요. 반복 횟수를 살펴보세요." : "도형이 닫힌 뒤에도 선을 더 그려 겹쳤어요. 정삼각형도 아니에요." : result.closed ? "닫혔지만 정삼각형이 아니에요." : "예상과 달리 열린 모양이에요.";
    // The stage description follows the same reading as the message.
    const shape = solved ? "정삼각형" : overlap ? back === 3 ? "정삼각형 위에 선을 더 겹쳐 그린 모양" : "닫힌 도형 위에 선을 더 겹쳐 그린 모양" : result.closed ? "정삼각형이 아닌 닫힌 모양" : "열린 모양";
    const recheck = !!drawn?.stale;
    setDrawn({ path: result.path, points: result.points, shape, run: (drawn?.run ?? 0) + 1, stale: false });
    setPhase(solved ? 3 : 1);
    if (!solved) setMisses(misses + 1);
    setStatus(solved ? `④ 다시 실행해 확인: 정삼각형이 됐어요.${v.d === 50 ? "" : " 크기는 점선과 달라도 세 변과 세 각이 같아요."} 어느 값을 바꿨는지 떠올려 보세요.` : recheck ? `④ 다시 실행해 확인: 아직 예상과 달라요. ${what} ② 원인을 다시 생각해 보세요.` : `① 오류 찾기: ${what} ② 어느 값 때문일지 생각해 보세요.`);
    if (solved) setDone(true);
  };
  const stepper = (key: Key) => <span className={styles.value}><button type="button" aria-label={`${NAMES[key]} 줄이기`} onClick={() => change(key, -LIMITS[key][2])}><Minus size={14} aria-hidden="true" /></button><span className={styles.number}>{v[key]}{key === "a" ? "°" : ""}</span><button type="button" aria-label={`${NAMES[key]} 늘리기`} onClick={() => change(key, LIMITS[key][2])}><Plus size={14} aria-hidden="true" /></button></span>;
  return <Frame conceptId={conceptId} question="정삼각형이 되려면 어느 값을 바꿔야 할까요? 하나씩 바꾸고 다시 실행해 보세요." status={status} done={done}>
    <ol className={styles.steps} aria-label="디버깅 순서">{STEPS.map((step, i) => <li key={step} data-on={phase === i ? "" : undefined} data-past={phase > i ? "" : undefined}>{["①", "②", "③", "④"][i]} {step}</li>)}</ol>
    <div className={styles.split}>
      <div className={styles.pane}>
        <span className={styles.paneLabel}>코드</span>
        <div className={styles.code}>
          <Block kind="start">시작하기 버튼을 클릭했을 때</Block>
          <Block kind="pen" inner>그리기 시작하기</Block>
          <div className={styles.loop}><span>{stepper("n")}번 반복하기</span>
            <Block kind="move" inner>이동 방향으로 {stepper("d")}만큼 움직이기</Block>
            <Block kind="move" inner>이동 방향을 {stepper("a")}만큼 회전하기</Block>
          </div>
          <Block kind="pen" inner>그리기 멈추기</Block>
        </div>
        {misses >= 2 && !done && <p className={styles.pending}>반복은 선의 개수, 거리는 선의 길이, 각도는 꺾이는 정도를 바꿔요. 점선과 다른 부분을 찾아보세요.</p>}
      </div>
      <div className={styles.pane}>
        <span className={styles.paneLabel}>무대 · 점선이 예상한 모양</span>
        <Button onClick={run}><Play size={16} aria-hidden="true" />{drawn ? "다시 실행" : "실행"}</Button>
        <svg className={styles.canvas} viewBox={frame([...TARGET, ...(drawn?.points ?? [])])} role="img" aria-label={drawn ? `그려진 모양: ${drawn.shape}` : "아직 그리지 않았어요"}>
          <path d="M50 40H130L90 109.3z" fill="none" stroke="#9fb3d1" strokeWidth="2" strokeDasharray="5 5" />
          {drawn && <path key={drawn.run} className={styles.pen} data-stale={drawn.stale ? "" : undefined} d={drawn.path} pathLength={1} fill="none" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />}
          <circle cx="50" cy="40" r="5" fill="#15803d" />
        </svg>
      </div>
    </div>
  </Frame>;
}

const EXPERIENCES: Record<string, (props: { conceptId: string }) => ReactNode> = { fc0: BeatMaker, fc1: DefineCall, fc2: Score, fc3: EditDefinition, fc4: Debug };

export function FunctionConcepts({ conceptId, mode }: { conceptId: string; mode: LessonMode }) {
  const Experience = EXPERIENCES[conceptId];
  return Experience ? <section className={styles.experience} aria-label="함수 개념 체험">
    <Experience conceptId={conceptId} />
    <p className={styles.note}>{mode === "preview" ? "체험 장면은 다시 들어오면 처음부터 시작해요. 답안과 완료 기록은 이 창에서만 체험해요." : "체험 장면은 다시 들어오면 처음부터 시작해요. 확인한 답안과 완료 기록은 저장돼요."}</p>
  </section> : null;
}
