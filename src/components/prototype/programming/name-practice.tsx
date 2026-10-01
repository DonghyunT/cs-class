"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState, type RefObject } from "react";
import { Check, Lightbulb, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkNameMission, nameProjectLines, parseNameProject, type NameRun } from "@/lib/prototype/name-entry";
import { blockLabels, type PrototypeState, type PrototypeUpdate } from "@/lib/prototype/programming";
import type { HelpContext } from "./support";
import styles from "./programming.module.css";

export type NameEditor = { read: () => Promise<string | null>; dirty: () => boolean; runs: () => NameRun[] };
const channel = "cs-class-entryjs";
export function NamePractice({ state, update, focus, help, editorRef }: {
  state: PrototypeState; update: PrototypeUpdate; focus: (id: string) => void;
  help: (context: HelpContext) => void; editorRef: RefObject<NameEditor | null>;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const pending = useRef<{ id: string; resolve: (raw: string | null) => void; timer: number } | null>(null);
  const dirty = useRef(false);
  const currentRun = useRef<{ id: string; key: string } | null>(null);
  const runsRef = useRef<NameRun[]>([]);
  const [runs, setRuns] = useState<NameRun[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "failed">("loading");
  const [running, setRunning] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("질문과 말하기를 연결하고 실행해 보세요.");
  const [validation, setValidation] = useState<{ passed: boolean; message: string } | null>(null);
  const boot = useRef<number | undefined>(undefined);
  const send = (type: string, details: object = {}) => frame.current?.contentWindow?.postMessage({ channel, type, ...details }, "*");
  const read = useCallback((): Promise<string | null> => {
    if (pending.current || !frame.current) return Promise.resolve(null);
    setError("");
    return new Promise((resolve) => {
      const id = crypto.randomUUID();
      const timer = window.setTimeout(() => { pending.current = null; setError("작품을 읽지 못했어요. 현재 화면에서 다시 시도해 주세요."); resolve(null); }, 4000);
      pending.current = { id, resolve, timer };
      frame.current!.contentWindow?.postMessage({ channel, type: "export", id }, "*");
    });
  }, []);
  const receive = useEffectEvent((event: MessageEvent) => {
    if (event.source !== frame.current?.contentWindow || event.origin !== "null" || event.data?.channel !== channel) return;
    const m = event.data;
    if (m.type === "ready") {
      const p = parseNameProject(state.nameEntryProject);
      if (p) send("load", { project: p.project });
    } else if (m.type === "loaded") { window.clearTimeout(boot.current); setPhase("ready"); setError(""); }
    else if (m.type === "editing") dirty.current = true;
    else if (m.type === "changed" || m.type === "exported") {
      const p = parseNameProject(m.project);
      if (p) {
        const previous = parseNameProject(state.nameEntryProject);
        if (p.key !== previous?.key) { runsRef.current = []; setRuns([]); setValidation(null); }
        update((previous) => ({ ...previous, nameEntryProject: m.project }));
      }
      // A valid native change is already in the parent's draft; its storage
      // comparison tracks pending writes. Keep unreadable native edits dirty.
      if (m.type === "changed") dirty.current = !p;
      if (m.type === "exported" && pending.current && pending.current.id === m.id) {
        const request = pending.current; pending.current = null; window.clearTimeout(request.timer);
        if (p) { dirty.current = false; setError(""); } else setError("현재 작품을 읽지 못했어요. 입력을 유지하고 다시 시도해 주세요.");
        request.resolve(p ? m.project : null);
      }
    } else if (m.type === "running") setRunning(m.running === true);
    else if (m.type === "name-start") {
      const p = parseNameProject(m.project);
      currentRun.current = p && typeof m.id === "string" ? { id: m.id, key: p.key } : null;
      setValidation(null); setMessage("실행 중 · 강아지가 물으면 무대의 질문창에 이름을 입력해 주세요.");
    } else if (m.type === "name-run" && currentRun.current && m.run?.id === currentRun.current.id) {
      const { id, key } = currentRun.current; currentRun.current = null;
      const steps = m.run.steps;
      if (!Array.isArray(steps) || steps.length > 96 || !steps.every((s) => s && ["ask", "answer", "say"].includes(s.kind) && typeof s.value === "string" && s.value.length <= 500)) { setError("실행 기록을 읽지 못했어요. 작품을 보존하고 다시 실행해 주세요."); return; }
      const run: NameRun = { id, key, reason: String(m.run.reason), steps };
      runsRef.current = [...runsRef.current.filter((r) => r.key === key), run].slice(-8); setRuns(runsRef.current);
      setMessage(run.reason === "error" ? "실행기에서 오류가 생겼어요. 작품을 보존했으니 입력칸과 블록을 확인하고 다시 실행해 주세요." : run.reason === "finished" ? `실행을 마쳤어요. 마지막 말: ${steps.filter((s) => s.kind === "say").at(-1)?.value ?? "아직 없음"}` : run.reason === "timeout" ? "실행 시간이 길어 멈췄어요. 작품은 유지돼요." : "실행을 멈추고 무대를 처음 위치로 돌렸어요.");
    } else if (m.type === "error") { setError("작업실에서 작품을 읽지 못했어요. 입력을 보존하고 다시 불러와 주세요."); setPhase("failed"); }
    else if (m.type === "focus-return") document.getElementById("name-run")?.focus();
  });
  useEffect(() => {
    const listener = (event: MessageEvent) => receive(event);
    window.addEventListener("message", listener);
    boot.current = window.setTimeout(() => { setPhase("failed"); setError("작업실을 불러오지 못했어요. 다시 불러오기를 눌러 주세요."); }, 20000);
    return () => { window.removeEventListener("message", listener); window.clearTimeout(boot.current); if (pending.current) { window.clearTimeout(pending.current.timer); pending.current.resolve(null); pending.current = null; } };
  }, [attempt]);
  useEffect(() => {
    editorRef.current = { read: phase === "ready" ? read : async () => { if (!dirty.current) return state.nameEntryProject; setError("작업실 준비를 확인한 뒤 다시 이동해 주세요."); return null; }, dirty: () => dirty.current, runs: () => structuredClone(runsRef.current) };
    return () => { editorRef.current = null; };
  }, [editorRef, phase, read, state.nameEntryProject]);

  async function inspect(action: "validate" | "help") {
    const raw = await read(); if (!raw) return;
    if (action === "validate") { setValidation(checkNameMission(raw, runsRef.current)); focus("mission-feedback"); }
    else { help({ format: "entry", mission: 0, program: [], project: raw, runs: structuredClone(runsRef.current), inputs: { ...state.inputs }, result: null }); }
  }
  return <>
    <div className={styles.practiceHeading}><div className={styles.sectionHeading}><span className={styles.eyebrow}>MISSION 01 · 엔트리 블록 실습</span><h2 id="practice-title" tabIndex={-1}>강아지 이름 짓기</h2><p>이름을 물어보고 입력한 이름을 말하게 해주세요. 인사 문장은 자유롭게 꾸며도 좋아요.</p></div><Button variant="outline" disabled={running || phase !== "ready"} onClick={() => void inspect("help")}><Lightbulb size={17} />막혔어요</Button></div>
    <p className={styles.goal}><span>오늘의 목표</span>이름 입력 → 대답 → 이름 말하기</p>
    {state.nameImportFailed && <div className={styles.feedback} role="status"><p>이전 이름 초안은 새 작업실로 옮기지 못했어요. 다른 답안과 완료 기록은 유지하고, 이전 코드를 아래에 보존했어요.</p><details><summary>이전 이름 코드 보기</summary>{state.nameImportRaw ? <pre className={styles.preservedCode}>{state.nameImportRaw}</pre> : <ol>{state.programs[0].map((b) => <li key={b.id}>{blockLabels[b.kind]} · {b.value || "입력 중"}</li>)}</ol>}</details></div>}
    <section className={styles.entryEditor} aria-label="블록 조립 작업실"><p className={styles.smallText}>질문·대답·말하기 블록을 직접 끌어 연결하세요. 이번 파일럿은 이 미션에 필요한 블록만 지원해요. 질문창은 실행 무대 안에 나타나요.</p>
      <div className={styles.entryScroll} tabIndex={0} role="region" aria-label="엔트리 작업실 가로 이동"><iframe key={attempt} ref={frame} title="강아지 이름 짓기 엔트리 작업실" sandbox="allow-scripts" src="/entryjs/workspace.html?exercise=name" className={styles.entryFrame} />{phase === "loading" && <p className={styles.loading}>엔트리 작업실을 준비하고 있어요.</p>}</div>
      {error && <div role="alert" className={styles.feedback}><p>{error}</p><Button variant="outline" onClick={async () => { if (dirty.current && !await read()) return; setPhase("loading"); setRunning(false); setError(""); currentRun.current = null; setAttempt((n) => n + 1); }}>다시 불러오기</Button></div>}
      <div className={styles.runTools}><Button id="name-run" disabled={running || phase !== "ready"} onClick={() => { send("export", { id: "before-run" }); send("run"); }}><Play size={16} />실행하기</Button><Button variant="outline" disabled={!running} onClick={() => send("stop")}><Square size={14} />중지</Button><Button variant="ghost" disabled={phase !== "ready"} onClick={() => send("reset-stage")}>무대 처음 위치로</Button></div><p className={styles.runStatus} role="status">{message}</p>
    </section>
    <details className={styles.hint}><summary>먼저 해볼 작은 실험</summary><p>1. 서로 다른 이름으로 다시 실행해 보세요.</p><p>2. 질문 뒤에 ‘대답’ 값이 바뀌는지 살펴보세요.</p><p>3. 말하기 입력칸에 ‘대답’ 블록을 연결해 보세요.</p></details>
    <details className={styles.trace}><summary>실행 발자국 · {runs.length}번</summary>{runs.map((r, i) => <div key={r.id}><strong>{i + 1}번 실행 · {r.reason === "finished" ? "실행 마침" : "중지됨"}</strong><ol>{r.steps.map((s, j) => <li key={j}>{({ ask: "질문", answer: "대답", say: "말하기" })[s.kind]}: {s.value}</li>)}</ol></div>)}</details>
    <div className={styles.validation}><p>{state.completed.includes(0) ? "완료 기록이 있어요. 현재 작품도 다시 확인해 보세요." : "서로 다른 이름으로 두 번 실행을 마친 뒤 확인해요."}</p><div><Button variant="outline" disabled={running || phase !== "ready"} onClick={() => void inspect("validate")}>미션 조건 확인</Button><Button disabled={running || !validation?.passed} onClick={async () => { const raw = await read(); if (!raw) return; const checked = checkNameMission(raw, runsRef.current); setValidation(checked); if (checked.passed && !state.completed.includes(0)) update((previous) => ({ ...previous, nameEntryProject: raw, completed: previous.completed.includes(0) ? previous.completed : [...previous.completed, 0] })); focus("mission-feedback"); }}><Check size={16} />내 작업에 완료 표시</Button></div></div>
    {validation && <p id="mission-feedback" tabIndex={-1} role="status" className={validation.passed ? styles.good : styles.feedback}>{validation.message}</p>}
    <details className={styles.trace}><summary>현재 코드 확인</summary><ol>{nameProjectLines(state.nameEntryProject).map((line, i) => <li key={i}>{line}</li>)}</ol></details>
  </>;
}
