"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Question } from "@/lib/classroom/types";
import { BlockCode, EntryBlock } from "./concept-assemble";
import styles from "./concept-visual.module.css";

type Kind = NonNullable<Question["assemble"]>["blocks"][number]["kind"];
type Values = Record<string, string>;
type Press = { values: Values; lit: number[]; say: string };
type Scene = { head: string; rows: { kind: Kind; label: string; indent: number }[]; start: Values; buttons: { label: string; press: (values: Values) => Press }[] };

const SCENES: Record<string, Scene> = {
  bc0: {
    head: "시작하기 버튼을 클릭했을 때",
    rows: [
      { kind: "variable", label: "[점수]를 {0}(으)로 정하기", indent: 0 },
      { kind: "flow", label: "계속 반복하기", indent: 0 },
      { kind: "flow", label: "만일 <벽돌|에 닿았는가?> (이)라면", indent: 1 },
      { kind: "variable", label: "[점수]에 {1}만큼 더하기", indent: 2 },
    ],
    start: { 점수: "정하기 전" },
    buttons: [
      { label: "시작하기", press: () => ({ values: { 점수: "0" }, lit: [0], say: "시작할 때 한 번만 0이 돼요." }) },
      { label: "벽돌에 닿았을 때", press: (v) => { if (v.점수 === "정하기 전") return { values: v, lit: [], say: "먼저 [시작하기]를 눌러 보세요." }; const score = Number(v.점수) + 1; return { values: { 점수: String(score) }, lit: [2, 3], say: `반복하며 확인하다가 닿으면 1을 더해요. 지금 점수는 ${score}점이에요.` }; } },
    ],
  },
  bc1: {
    head: "시작하기 버튼을 클릭했을 때",
    rows: [
      { kind: "flow", label: "계속 반복하기", indent: 0 },
      { kind: "moving", label: "x: ~마우스|x|좌푯값~ 위치로 이동하기", indent: 1 },
    ],
    start: { "마우스 x": "0", "마우스 y": "0", "막대 x": "0", "막대 y": "-115" },
    buttons: [
      { label: "마우스 왼쪽 위", press: () => ({ values: { "마우스 x": "-80", "마우스 y": "60", "막대 x": "-80", "막대 y": "-115" }, lit: [1], say: "마우스 x가 -80이라 막대 x도 -80이에요. y는 그대로예요." }) },
      { label: "마우스 오른쪽 아래", press: () => ({ values: { "마우스 x": "80", "마우스 y": "-60", "막대 x": "80", "막대 y": "-115" }, lit: [1], say: "마우스 x가 80이라 막대 x도 80이에요. y는 그대로예요." }) },
      { label: "반복 빼 보기", press: () => ({ values: { "마우스 x": "80", "마우스 y": "0", "막대 x": "0", "막대 y": "-115" }, lit: [], say: "반복을 빼면, 마우스 x는 80인데 막대 x는 0 그대로예요. 한 번만 움직이고 끝나기 때문이에요." }) },
    ],
  },
  bc2: {
    head: "오브젝트를 클릭했을 때",
    rows: [
      { kind: "flow", label: "계속 반복하기", indent: 0 },
      { kind: "moving", label: "① 이동 방향으로 {4}만큼 움직이기", indent: 1 },
      { kind: "moving", label: "② 화면 끝에 닿으면 튕기기", indent: 1 },
      { kind: "flow", label: "③ 만일 <아래쪽 벽|에 닿았는가?> (이)라면", indent: 1 },
      { kind: "flow", label: "[모든] 코드 멈추기", indent: 2 },
    ],
    start: { "공 위치": "빈 곳", "아래쪽 벽에 닿았는가?": "거짓" },
    buttons: [
      { label: "공이 빈 곳에", press: () => ({ values: { "공 위치": "빈 곳", "아래쪽 벽에 닿았는가?": "거짓" }, lit: [1, 2, 3], say: "①움직였어요. 벽이 없어서 ②튕기지 않고, ③도 거짓이에요." }) },
      { label: "공이 옆 벽에", press: () => ({ values: { "공 위치": "옆 벽", "아래쪽 벽에 닿았는가?": "거짓" }, lit: [1, 2, 3], say: "①움직이고 ②벽에서 방향이 바뀌었어요. ③은 아래쪽 벽이 아니라 거짓이에요." }) },
      { label: "공이 아래쪽 벽에", press: () => ({ values: { "공 위치": "아래쪽 벽", "아래쪽 벽에 닿았는가?": "참" }, lit: [1, 2, 3, 4], say: "③아래쪽 벽이라 참! 모든 코드가 멈춰요." }) },
    ],
  },
  bc3: {
    head: "시작하기 버튼을 클릭했을 때",
    rows: [
      { kind: "flow", label: "계속 반복하기", indent: 0 },
      { kind: "flow", label: "만일 <공|에 닿았는가?> (이)라면", indent: 1 },
      { kind: "variable", label: "① [점수]에 {1}만큼 더하기", indent: 2 },
      { kind: "looks", label: "② 모양 숨기기", indent: 2 },
    ],
    start: { 점수: "0", 벽돌: "있어요" },
    buttons: [
      { label: "공이 벽돌에 닿았을 때", press: (v) => v.벽돌 === "있어요"
        ? { values: { 점수: String(Number(v.점수) + 1), 벽돌: "사라졌어요" }, lit: [1, 2, 3], say: "점수를 먼저 올리고, 그다음 벽돌이 사라져요." }
        : { values: v, lit: [1], say: "벽돌이 숨어서 이제 닿지 않아요. 점수는 그대로예요." } },
    ],
  },
};

// Ungraded and unsaved on purpose: only local state, so pressing never touches the student's work.
export function BrickConceptPlay({ id }: { id: string }) {
  const scene = SCENES[id];
  const [state, setState] = useState<Press>({ values: scene.start, lit: [], say: "아래 버튼을 눌러 어떤 블록이 실행되는지 보세요." });
  return <div className={styles.play}>
    <BlockCode head={scene.head} slots={scene.rows.map((row) => row.indent)} kindOf={(i) => scene.rows[i].kind} renderSlot={(i) => <span className={styles.playRow} data-lit={state.lit.includes(i) || undefined}><EntryBlock kind={scene.rows[i].kind} label={scene.rows[i].label} />{state.lit.includes(i) && <span className={styles.playRan}>실행!</span>}</span>} />
    <div className={styles.playSide}>
      <div className={styles.playValues}>{Object.entries(state.values).map(([name, value]) => <span key={name}><small>{name}</small><b>{value}</b></span>)}</div>
      <p className={styles.playSay} role="status">{state.say}</p>
      <div className={styles.playButtons}>
        {scene.buttons.map((button) => <Button key={button.label} onClick={() => setState(button.press(state.values))}>{button.label}</Button>)}
        <Button variant="ghost" onClick={() => setState({ values: scene.start, lit: [], say: "처음 상태로 돌아왔어요." })}>처음으로</Button>
      </div>
    </div>
  </div>;
}
