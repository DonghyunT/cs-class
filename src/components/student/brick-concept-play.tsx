"use client";

import { useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import styles from "./concept-visual.module.css";

// Ungraded and unsaved on purpose: only local state, so playing never touches the student's work.
// No Entry blocks here: the code to build is the concept check's answer.
type Point = { x: number; y: number };
const ARROWS: Record<string, Point> = { ArrowLeft: { x: -20, y: 0 }, ArrowRight: { x: 20, y: 0 }, ArrowUp: { x: 0, y: 20 }, ArrowDown: { x: 0, y: -20 } };
const label = { fontSize: 24, fontWeight: 700, fill: "#526173" };

// Entry's stage in Entry's own numbers (x -240 to 240, y -135 to 135). Screen y runs down, so pictures draw at -y.
function Stage({ name, at, inset = 0, onMove, children }: { name: string; at: Point; inset?: number; onMove: (point: Point) => void; children: ReactNode }) {
  const go = (x: number, y: number) => onMove({ x: Math.round(Math.max(inset - 240, Math.min(240 - inset, x))), y: Math.round(Math.max(inset - 135, Math.min(135 - inset, y))) });
  const follow = (event: PointerEvent<SVGSVGElement>) => { const box = event.currentTarget.getBoundingClientRect(); go((event.clientX - box.left) / box.width * 480 - 240, 135 - (event.clientY - box.top) / box.height * 270); };
  const press = (event: KeyboardEvent<SVGSVGElement>) => { const step = ARROWS[event.key]; if (step) { event.preventDefault(); go(at.x + step.x, at.y + step.y); } };
  return <svg className={styles.stage} viewBox="-240 -135 480 270" width="480" height="270" role="application" aria-label={name} tabIndex={0} onPointerMove={follow} onPointerDown={follow} onKeyDown={press}>
    <path d="M-240 0H240M0-135V135" stroke="#dbe4f0" strokeWidth="2" />
    <text x="222" y="-8" {...label}>x</text>
    <text x="8" y="-110" {...label}>y</text>
    {children}
  </svg>;
}

const Values = ({ values }: { values: Record<string, string | number> }) => <div className={styles.playValues}>{Object.entries(values).map(([name, value]) => <span key={name}><small>{name}</small><b>{value}</b></span>)}</div>;

function ScorePlay() {
  const [score, setScore] = useState<number | null>(null);
  const say = score === null ? "[시작하기]부터 눌러 보세요." : score === 0 ? "시작할 때 한 번 0이 됐어요." : `변수가 값을 기억해서 ${score}점까지 쌓였어요.`;
  return <div className={styles.playSide}>
    <Values values={{ 점수: score ?? "정하기 전" }} />
    <p className={styles.playSay} role="status">{say}</p>
    <div className={styles.playButtons}>
      <Button onClick={() => setScore(0)}>시작하기</Button>
      <Button disabled={score === null} onClick={() => setScore((score ?? 0) + 1)}>벽돌 깨기</Button>
    </div>
  </div>;
}

function MousePlay() {
  const [mouse, setMouse] = useState<Point>({ x: 0, y: 0 });
  return <div className={styles.play}>
    <Stage name="무대. 마우스나 방향키로 움직여 보세요." at={mouse} onMove={setMouse}>
      <path d={`M${mouse.x} ${-mouse.y}L${mouse.x} 107`} stroke="#376fc8" strokeWidth="2" strokeDasharray="6 6" />
      <circle cx={mouse.x} cy={-mouse.y} r="10" fill="#376fc8" />
      <rect x={mouse.x - 45} y="107" width="90" height="16" rx="8" fill="#ef4444" />
    </Stage>
    <div className={styles.playSide}>
      <div role="status"><Values values={{ "마우스 x": mouse.x, "마우스 y": mouse.y, "막대 x": mouse.x, "막대 y": -115 }} /></div>
      <p className={styles.playSay}>파란 점이 마우스예요. 무대 위에서 움직여 보세요.</p>
    </div>
  </div>;
}

function WallPlay() {
  const [ball, setBall] = useState<Point>({ x: 0, y: 0 });
  const bottom = ball.y <= -111, wall = !bottom && (Math.abs(ball.x) >= 216 || ball.y >= 111);
  return <div className={styles.play}>
    <Stage name="무대. 마우스나 방향키로 공을 벽에 갖다 대 보세요." at={ball} inset={16} onMove={setBall}>
      <rect x="-240" y="125" width="480" height="10" fill="#ef4444" />
      <text x="-226" y="116" {...label} fill="#b91c1c">아래쪽 벽</text>
      <circle cx={ball.x} cy={-ball.y} r="16" fill={bottom ? "#ef4444" : "#376fc8"} />
    </Stage>
    <div className={styles.playSide}>
      <Values values={{ "아래쪽 벽에 닿았는가?": bottom ? "참" : "거짓" }} />
      <p className={styles.playSay} role="status">{bottom ? "참이 됐어요. 이때 ‘모든 코드 멈추기’로 게임을 끝내요." : wall ? "화면 끝에서는 튕겨요. 아래쪽 벽이 아니라서 거짓이에요." : "마우스로 공을 벽에 갖다 대 보세요."}</p>
    </div>
  </div>;
}

function BrickPlay() {
  const bricks = [1, 2, 3];
  const [gone, setGone] = useState<number[]>([]);
  const [say, setSay] = useState("벽돌을 눌러 공이 닿았다고 해 보세요.");
  const won = gone.length === bricks.length;
  const hit = (brick: number) => {
    if (gone.includes(brick)) return setSay("숨긴 벽돌에는 공이 닿지 않아요. 점수는 그대로예요.");
    setGone([...gone, brick]);
    setSay(gone.length + 1 === bricks.length ? "점수 값과 목표 개수가 같아져서 승리했어요!" : "점수가 오르고 벽돌이 숨었어요. 같은 벽돌을 다시 눌러 보세요.");
  };
  return <div className={styles.playSide}>
    <div className={styles.playBricks}>
      {bricks.map((brick) => <button key={brick} type="button" data-gone={gone.includes(brick) || undefined} aria-label={`벽돌 ${brick}${gone.includes(brick) ? ", 숨김" : ""}`} onClick={() => hit(brick)}>{gone.includes(brick) ? "숨김" : `벽돌 ${brick}`}</button>)}
    </div>
    <div className={styles.playButtons}>
      <Values values={{ 점수: gone.length, "목표 개수": bricks.length }} />
      {won && <b className={styles.tile} data-tone="true">You win!</b>}
    </div>
    <p className={styles.playSay} role="status">{say}</p>
    {gone.length > 0 && <div className={styles.playButtons}><Button variant="ghost" onClick={() => { setGone([]); setSay("벽돌을 눌러 공이 닿았다고 해 보세요."); }}>다시 하기</Button></div>}
  </div>;
}

export const BrickConceptPlay = ({ id }: { id: "bc0" | "bc1" | "bc2" | "bc3" }) => ({ bc0: <ScorePlay />, bc1: <MousePlay />, bc2: <WallPlay />, bc3: <BrickPlay /> })[id];
