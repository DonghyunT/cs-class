import type { ReactNode } from "react";
import styles from "./concept-visual.module.css";

// Small static pictures for the common concept screen of the conditionals and loops lessons.
// Keyed by concept id; lessons without an entry (reviews, programming-13) show nothing.
const Tile = ({ tone = "blue", sub, children }: { tone?: "blue" | "true" | "false" | "purple"; sub?: string; children: ReactNode }) => <b className={styles.tile} data-tone={tone}>{children}{sub && <small>{sub}</small>}</b>;
// `word` ops (AND, OR) are words: a `+` there read like addition.
const Op = ({ children, word }: { children: ReactNode; word?: true }) => <span className={word ? styles.opWord : styles.op}>{children}</span>;
const Card = ({ title, children }: { title: string; children: ReactNode }) => <div className={styles.card}><strong>{title}</strong>{children}</div>;
const Row = ({ children }: { children: ReactNode }) => <div className={styles.row}>{children}</div>;
// Entry-like block: `kind` picks the block category colour (flow, brush).
const Block = ({ kind = "flow", children }: { kind?: "flow" | "brush"; children: ReactNode }) => <div className={styles.block} data-kind={kind}>{children}</div>;
// Entry's own rendering of a block thread, exported at 3x (public/concepts/) and shown at
// 1.226x its CSS size like cc4; the figure's aria-label carries the meaning.
const Capture = ({ src, width, height }: { src: string; width: number; height: number }) =>
  // eslint-disable-next-line @next/next/no-img-element -- bundled static capture
  <img className={styles.capture} src={`/concepts/${src}.png`} alt="" width={width} height={height} />;
const Nest = ({ kind = "flow", head, children }: { kind?: "flow"; head: ReactNode; children: ReactNode }) => <div className={styles.nest} data-kind={kind}><div>{head}</div><div className={styles.inner}>{children}</div></div>;

function Polygon({ n, label }: { n: number; label: string }) {
  const points = Array.from({ length: n }, (_, i) => { const angle = (i / n) * 2 * Math.PI - Math.PI / 2; return `${(40 + 32 * Math.cos(angle)).toFixed(1)},${(42 + 32 * Math.sin(angle)).toFixed(1)}`; }).join(" ");
  return <div className={styles.card}><svg viewBox="0 0 80 84" width="80" height="84"><polygon points={points} fill="#eaf2ff" stroke="#376fc8" strokeWidth="3" strokeLinejoin="round" /></svg><strong>{label}</strong><span>360 ÷ {n} = {360 / n}°</span></div>;
}

const box = { fill: "#fff", stroke: "#376fc8", strokeWidth: 2 };
// Control-structure arrows: a fixed-size head whose tip sits exactly on the path end.
const flowHead = <marker id="cv-flow" viewBox="0 0 10 10" refX="10" refY="5" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="#526173" /></marker>;
const flow = { stroke: "#526173", strokeWidth: 2, fill: "none", markerEnd: "url(#cv-flow)" };

function Tree({ stage, clicks }: { stage: number; clicks: string }) {
  const crown = [5, 9][stage], trunk = [8, 14][stage];
  return <div className={styles.tree}><svg viewBox="0 0 70 80" width="70" height="80"><rect x="31" y={72 - trunk} width="8" height={trunk} rx="2" fill="#8a6a4a" /><circle cx="35" cy={72 - trunk - crown + 4} r={crown} fill="#4fae7b" /><ellipse cx="35" cy="73" rx="22" ry="5" fill="#d9c3a4" /></svg><small>{clicks}</small></div>;
}

export const CONCEPT_VISUALS: Record<string, { label: string; node: ReactNode }> = {
  cc0: { label: "괄호 안의 6 + 4를 먼저 계산해 10, 그다음 2로 나누어 5가 되는 과정", node: <Row><Tile sub="A + B">( 6 + 4 )</Tile><Op>→</Op><Tile tone="purple">10</Tile><Op>÷</Op><Tile>2</Tile><Op>=</Op><Tile tone="true">5</Tile></Row> },
  cc1: { label: "대답이 75일 때 75 ≥ 60은 참, 75 < 60은 거짓", node: <><Card title="75 ≥ 60"><Tile tone="true">참</Tile></Card><Card title="75 < 60"><Tile tone="false">거짓</Tile></Card></> },
  cc2: { label: "그리고(AND)는 둘 다 참일 때 참, 또는(OR)은 하나만 참이어도 참, 아니다(NOT)는 참을 거짓으로 뒤집음", node: <>
    <Card title="그리고 (AND)"><Row><Tile tone="true">참</Tile><Op word>AND</Op><Tile tone="true">참</Tile><Op>→</Op><Tile tone="true">참</Tile></Row><small>둘 다 참일 때만</small></Card>
    <Card title="또는 (OR)"><Row><Tile tone="false">거짓</Tile><Op word>OR</Op><Tile tone="true">참</Tile><Op>→</Op><Tile tone="true">참</Tile></Row><small>하나라도 참이면</small></Card>
    <Card title="아니다 (NOT)"><Row><Tile tone="true">참</Tile><Op>→</Op><Tile tone="false">거짓</Tile></Row><small>뒤집어요</small></Card></> },
  // Each arrow is its own path so every segment gets a head, and the tip stops at the box edge.
  cc3: { label: "순차는 위에서 아래로, 선택은 조건에 따라 참과 거짓으로 길이 갈라지고, 반복은 앞으로 되돌아가는 흐름", node: <>
    <Card title="순차"><svg viewBox="0 0 100 100" width="100" height="100" aria-hidden="true"><defs>{flowHead}</defs><rect x="30" y="4" width="40" height="20" rx="6" {...box} /><rect x="30" y="40" width="40" height="20" rx="6" {...box} /><rect x="30" y="76" width="40" height="20" rx="6" {...box} /><path d="M50 24V39" {...flow} /><path d="M50 60V75" {...flow} /></svg></Card>
    <Card title="선택"><svg viewBox="0 0 100 100" width="100" height="100" aria-hidden="true"><defs>{flowHead}</defs><path d="M50 4L74 24L50 44L26 24z" {...box} /><rect x="6" y="74" width="40" height="22" rx="6" {...box} /><rect x="54" y="74" width="40" height="22" rx="6" {...box} /><path d="M26 24V73" {...flow} /><path d="M74 24V73" {...flow} /><text x="22" y="52" textAnchor="end" fontSize="11" fontWeight="700" fill="#1d6b5a">참</text><text x="78" y="52" fontSize="11" fontWeight="700" fill="#a03a3a">거짓</text></svg></Card>
    <Card title="반복"><svg viewBox="0 0 100 100" width="100" height="100" aria-hidden="true"><defs>{flowHead}</defs><rect x="30" y="14" width="40" height="22" rx="6" {...box} /><rect x="30" y="62" width="40" height="22" rx="6" {...box} /><path d="M50 36V61" {...flow} /><path d="M70 73H86V25H71" {...flow} /></svg></Card></> },
  // The freethrow reference solution.
  cc4: { label: "만일 대답이 8 이상이면 훌륭해요, 아니면 만일 5 이상이면 잘했어요, 아니면 더 연습해 보자", node: <Capture src="conditionals-nested-if" width={320} height={287} /> },
  lc0: { label: "도장 찍기를 세 번 쓰는 것과, 3번 반복하기 안에 한 번만 쓰는 것이 같은 결과", node: <>
    <Card title="그냥 쓰면"><Block kind="brush">도장 찍기</Block><Block kind="brush">도장 찍기</Block><Block kind="brush">도장 찍기</Block></Card>
    <Op>=</Op>
    <Card title="반복으로 쓰면"><Nest head="3번 반복하기"><Block kind="brush">도장 찍기</Block></Nest></Card></> },
  // Captures avoid the mission assemblies: a triangle, not the square (4 · 100 · 90°); a wall, not the 1234 safe;
  // one '= 5' rule, not the tree's five. Entry draws the triangle point-down (right, then clockwise turns).
  lc1: { label: "3번 반복하기 안에 이동 방향으로 80만큼 움직이기와 이동 방향을 120°만큼 회전하기를 넣으면 변 세 개를 차례로 그려 정삼각형이 됨", node: <>
    <Capture src="loops-repeat-triangle" width={314} height={131} />
    <Op>→</Op>
    <svg viewBox="0 0 96 96" width="96" height="96" aria-hidden="true"><path d="M16 20H80L48 75.4z" fill="#eaf2ff" stroke="#376fc8" strokeWidth="3" strokeLinejoin="round" />{[[48, 13, "1"], [75, 58, "2"], [21, 58, "3"]].map(([x, y, n]) => <text key={n} x={x} y={y} textAnchor="middle" fontSize="14" fontWeight="700" fill="#2e5fab">{n}</text>)}</svg></> },
  lc2: { label: "정삼각형은 120도, 정사각형은 90도, 정팔각형은 45도씩 돌며 360을 변의 수로 나눈 값", node: <><Polygon n={3} label="정삼각형" /><Polygon n={4} label="정사각형" /><Polygon n={8} label="정팔각형" /></> },
  lc3: { label: "벽에 닿을 때까지 이동 방향으로 10만큼 움직이기를 되풀이하고, 벽에 닿으면 반복을 멈춘 뒤 도착!을 말함", node: <Capture src="loops-repeat-until" width={376} height={131} /> },
  lc4: { label: "마우스를 클릭했을 때(무대를 클릭할 때마다) 클릭 수에 1만큼 더하고, 클릭 수 값이 5가 되면 나무가 다음 모양으로 바뀌어 한 단계 자람", node: <>
    <Capture src="loops-count-variable" width={367} height={172} />
    <Tree stage={0} clicks="클릭 수 0" /><Op>→</Op><Tree stage={1} clicks="클릭 수 5" /></> },
};

export function ConceptVisual({ conceptId }: { conceptId: string }) {
  const visual = CONCEPT_VISUALS[conceptId];
  return visual ? <figure className={styles.visual} role="img" aria-label={visual.label}>{visual.node}</figure> : null;
}
