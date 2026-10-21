import type { ReactNode } from "react";
import styles from "./concept-visual.module.css";

// Small static pictures for the common concept screen of the conditionals and loops lessons.
// Keyed by concept id; lessons without an entry (reviews, programming-13) show nothing.
const Tile = ({ tone = "blue", sub, children }: { tone?: "blue" | "true" | "false" | "purple"; sub?: string; children: ReactNode }) => <b className={styles.tile} data-tone={tone}>{children}{sub && <small>{sub}</small>}</b>;
const Op = ({ children }: { children: ReactNode }) => <span className={styles.op}>{children}</span>;
const Card = ({ title, children }: { title: string; children: ReactNode }) => <div className={styles.card}><strong>{title}</strong>{children}</div>;
const Row = ({ children }: { children: ReactNode }) => <div className={styles.row}>{children}</div>;
// Entry-like block: `kind` picks the block category colour (flow, motion, brush).
const Block = ({ kind = "flow", children }: { kind?: "flow" | "motion" | "brush" | "look"; children: ReactNode }) => <div className={styles.block} data-kind={kind}>{children}</div>;
const Nest = ({ kind = "flow", head, children }: { kind?: "flow"; head: ReactNode; children: ReactNode }) => <div className={styles.nest} data-kind={kind}><div>{head}</div><div className={styles.inner}>{children}</div></div>;

function Polygon({ n, label }: { n: number; label: string }) {
  const points = Array.from({ length: n }, (_, i) => { const angle = (i / n) * 2 * Math.PI - Math.PI / 2; return `${(40 + 32 * Math.cos(angle)).toFixed(1)},${(42 + 32 * Math.sin(angle)).toFixed(1)}`; }).join(" ");
  return <div className={styles.card}><svg viewBox="0 0 80 84" width="80" height="84"><polygon points={points} fill="#eaf2ff" stroke="#376fc8" strokeWidth="3" strokeLinejoin="round" /></svg><strong>{label}</strong><span>360 ÷ {n} = {360 / n}°</span></div>;
}

const flowArrow = <marker id="cv-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#526173" /></marker>;
const box = { fill: "#fff", stroke: "#376fc8", strokeWidth: 2 };
const line = { stroke: "#526173", strokeWidth: 2, fill: "none", markerEnd: "url(#cv-arrow)" };
// Control-structure arrows: a fixed-size head whose tip sits exactly on the path end.
const flowHead = <marker id="cv-flow" viewBox="0 0 10 10" refX="10" refY="5" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="#526173" /></marker>;
const flow = { stroke: "#526173", strokeWidth: 2, fill: "none", markerEnd: "url(#cv-flow)" };

function Tree({ stage, clicks }: { stage: number; clicks: string }) {
  const crown = [5, 9, 14, 20][stage], trunk = [8, 14, 22, 30][stage];
  return <div className={styles.tree}><svg viewBox="0 0 70 80" width="70" height="80"><rect x="31" y={72 - trunk} width="8" height={trunk} rx="2" fill="#8a6a4a" /><circle cx="35" cy={72 - trunk - crown + 4} r={crown} fill="#4fae7b" /><ellipse cx="35" cy="73" rx="22" ry="5" fill="#d9c3a4" /></svg><small>{clicks}</small></div>;
}

export const CONCEPT_VISUALS: Record<string, { label: string; node: ReactNode }> = {
  cc0: { label: "괄호 안의 6 + 4를 먼저 계산해 10, 그다음 2로 나누어 5가 되는 과정", node: <Row><Tile sub="A + B">( 6 + 4 )</Tile><Op>→</Op><Tile tone="purple">10</Tile><Op>÷</Op><Tile>2</Tile><Op>=</Op><Tile tone="true">5</Tile></Row> },
  cc1: { label: "대답이 75일 때 75 ≥ 60은 참, 75 < 60은 거짓", node: <><Card title="75 ≥ 60"><Tile tone="true">참</Tile></Card><Card title="75 < 60"><Tile tone="false">거짓</Tile></Card></> },
  cc2: { label: "그리고(AND)는 둘 다 참일 때 참, 또는(OR)은 하나만 참이어도 참, 아니다(NOT)는 참을 거짓으로 뒤집음", node: <>
    <Card title="그리고 (AND)"><Row><Tile tone="true">참</Tile><Op>+</Op><Tile tone="true">참</Tile><Op>→</Op><Tile tone="true">참</Tile></Row><small>둘 다 참일 때만</small></Card>
    <Card title="또는 (OR)"><Row><Tile tone="false">거짓</Tile><Op>+</Op><Tile tone="true">참</Tile><Op>→</Op><Tile tone="true">참</Tile></Row><small>하나라도 참이면</small></Card>
    <Card title="아니다 (NOT)"><Row><Tile tone="true">참</Tile><Op>→</Op><Tile tone="false">거짓</Tile></Row><small>뒤집어요</small></Card></> },
  // Each arrow is its own path so every segment gets a head, and the tip stops at the box edge.
  cc3: { label: "순차는 위에서 아래로, 선택은 조건에 따라 참과 거짓으로 길이 갈라지고, 반복은 앞으로 되돌아가는 흐름", node: <>
    <Card title="순차"><svg viewBox="0 0 100 100" width="100" height="100" aria-hidden="true"><defs>{flowHead}</defs><rect x="30" y="4" width="40" height="20" rx="6" {...box} /><rect x="30" y="40" width="40" height="20" rx="6" {...box} /><rect x="30" y="76" width="40" height="20" rx="6" {...box} /><path d="M50 24V39" {...flow} /><path d="M50 60V75" {...flow} /></svg></Card>
    <Card title="선택"><svg viewBox="0 0 100 100" width="100" height="100" aria-hidden="true"><defs>{flowHead}</defs><path d="M50 4L74 24L50 44L26 24z" {...box} /><rect x="6" y="74" width="40" height="22" rx="6" {...box} /><rect x="54" y="74" width="40" height="22" rx="6" {...box} /><path d="M26 24V73" {...flow} /><path d="M74 24V73" {...flow} /><text x="22" y="52" textAnchor="end" fontSize="11" fontWeight="700" fill="#1d6b5a">참</text><text x="78" y="52" fontSize="11" fontWeight="700" fill="#a03a3a">거짓</text></svg></Card>
    <Card title="반복"><svg viewBox="0 0 100 100" width="100" height="100" aria-hidden="true"><defs>{flowHead}</defs><rect x="30" y="14" width="40" height="22" rx="6" {...box} /><rect x="30" y="62" width="40" height="22" rx="6" {...box} /><path d="M50 36V61" {...flow} /><path d="M70 73H86V25H71" {...flow} /></svg></Card></> },
  // Entry's own rendering of the freethrow reference solution (block view exported at 3x).
  cc4: { label: "만일 대답이 8 이상이면 훌륭해요, 아니면 만일 5 이상이면 잘했어요, 아니면 더 연습해 보자", node:
    // eslint-disable-next-line @next/next/no-img-element -- bundled static capture
    <img className={styles.capture} src="/concepts/conditionals-nested-if.png" alt="" width={320} height={287} /> },
  lc0: { label: "도장 찍기를 세 번 쓰는 것과, 3번 반복하기 안에 한 번만 쓰는 것이 같은 결과", node: <>
    <Card title="그냥 쓰면"><Block kind="brush">도장 찍기</Block><Block kind="brush">도장 찍기</Block><Block kind="brush">도장 찍기</Block></Card>
    <Op>=</Op>
    <Card title="반복으로 쓰면"><Nest head="3번 반복하기"><Block kind="brush">도장 찍기</Block></Nest></Card></> },
  lc1: { label: "4번 반복하기 안에서 100만큼 움직이고 90도 돌면 정사각형이 그려짐", node: <>
    <Nest head="4번 반복하기"><Block kind="motion">100만큼 움직이기</Block><Block kind="motion">90°만큼 회전하기</Block></Nest>
    <Op>→</Op>
    <svg viewBox="0 0 96 96" width="96" height="96" aria-hidden="true"><rect x="16" y="16" width="64" height="64" rx="2" fill="#eaf2ff" stroke="#376fc8" strokeWidth="3" />{[[48, 10, "1"], [86, 52, "2"], [48, 94, "3"], [10, 52, "4"]].map(([x, y, n]) => <text key={n} x={x} y={y} textAnchor="middle" fontSize="14" fontWeight="700" fill="#2e5fab">{n}</text>)}</svg></> },
  lc2: { label: "정삼각형은 120도, 정사각형은 90도, 정육각형은 60도씩 돌며 360을 변의 수로 나눈 값", node: <><Polygon n={3} label="정삼각형" /><Polygon n={4} label="정사각형" /><Polygon n={6} label="정육각형" /></> },
  lc3: { label: "비밀번호가 1234가 될 때까지 묻기를 되풀이하고, 맞으면 반복을 멈춤", node:
    <svg viewBox="0 0 330 120" width="330" height="120" aria-hidden="true" className={styles.wide}><defs>{flowArrow}</defs><rect x="6" y="40" width="82" height="36" rx="8" {...box} /><text x="47" y="63" textAnchor="middle" fontSize="14" fill="#202637">묻기</text><path d="M88 58H124" {...line} /><path d="M172 22L226 58L172 94L118 58z" {...box} /><text x="172" y="55" textAnchor="middle" fontSize="14" fill="#202637">대답</text><text x="172" y="72" textAnchor="middle" fontSize="14" fill="#202637">= 1234?</text><path d="M226 58H258" {...line} /><text x="242" y="48" textAnchor="middle" fontSize="14" fill="#268673">예</text><rect x="260" y="40" width="64" height="36" rx="8" fill="#e4f4ee" stroke="#268673" strokeWidth="2" /><text x="292" y="63" textAnchor="middle" fontSize="14" fill="#1d6b5a">멈춤</text><path d="M172 94V112H47V80" {...line} /><text x="110" y="108" textAnchor="middle" fontSize="14" fill="#a03a3a">아니오 → 다시</text></svg> },
  lc4: { label: "물뿌리개를 클릭해 클릭 수가 5, 10, 15, 25로 늘수록 나무가 점점 자람", node: <><Tree stage={0} clicks="0" /><Op>→</Op><Tree stage={1} clicks="5" /><Op>→</Op><Tree stage={2} clicks="15" /><Op>→</Op><Tree stage={3} clicks="25" /><Tile tone="purple" sub="클릭 수">+ 1</Tile></> },
};

export function ConceptVisual({ conceptId }: { conceptId: string }) {
  const visual = CONCEPT_VISUALS[conceptId];
  return visual ? <figure className={styles.visual} role="img" aria-label={visual.label}>{visual.node}</figure> : null;
}
