"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Check, CheckCircle2, Maximize2, Minimize2, Play, RotateCcw, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lesson, Work, WorkAction, WorkDraft } from "@/lib/classroom/types";
import { buildEntryProject, parseEntryProject } from "@/lib/classroom/entry-project";
import { practiceMatches } from "@/lib/classroom/progress";
import { buildProgrammingProject, parseProgrammingProject, type ProgrammingMission } from "@/lib/classroom/programming-entry";
import { checkNameMission, type NameRun } from "@/lib/prototype/name-entry";
import type { useWork } from "./use-work";
import common from "./student.module.css";
import styles from "./entry-practice-workspace.module.css";

const CHANNEL = "cs-class-entryjs";
const timeLabel = (time: number) => new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(time);

export function EntryPracticeWorkspace({ lesson, work, draft, locked, busy, update, runAction, exportRef, mission, saveLabel, saveState, workspaceWide, onWorkspaceWideChange }: {
  lesson: Lesson; work: Work; draft: WorkDraft; locked: boolean; busy: boolean;
  update: (next: WorkDraft) => void;
  runAction: (action: WorkAction, focusId: string) => Promise<void>;
  exportRef: RefObject<(() => Promise<string | null>) | null>;
  mission?: ProgrammingMission;
  saveLabel: string;
  saveState: ReturnType<typeof useWork>["saveState"];
  workspaceWide: boolean;
  onWorkspaceWideChange: (wide: boolean) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const editorProject = useRef<string | null>(null);
  const bootTimer = useRef<number | undefined>(undefined);
  const pending = useRef<{ id: number; promise: Promise<string | null>; resolve: (project: string | null) => void; timer: number } | null>(null);
  const requestId = useRef(0);
  const [attempt, setAttempt] = useState(0);
  const [bootReady, setBootReady] = useState(false);
  const [phase, setPhase] = useState<"loading" | "ready" | "failed">("loading");
  const [running, setRunning] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("블록을 연결한 뒤 실행해 보세요.");
  const runs = useRef<NameRun[]>([]);
  const currentRun = useRef<{ id: string; key: string } | null>(null);
  const viewToggle = useRef<HTMLButtonElement>(null);
  const manualViewFocus = useRef(false);
  useEffect(() => {
    if (manualViewFocus.current) { viewToggle.current?.focus({ preventScroll: true }); manualViewFocus.current = false; }
  }, [workspaceWide]);
  function setWide(wide: boolean) { manualViewFocus.current = true; onWorkspaceWideChange(wide); }
  const parse = mission ? parseProgrammingProject : parseEntryProject;
  const program = parse(draft.entryProject);
  const validation = practiceMatches(draft, work.validation) ? work.validation : null;
  const submitted = practiceMatches(draft, work.submission);

  function send(type: string, details: Record<string, unknown> = {}) {
    frame.current?.contentWindow?.postMessage({ channel: CHANNEL, type, ...details }, "*");
  }

  const readProject = useCallback((): Promise<string | null> => {
    if (pending.current) return pending.current.promise;
    let resolve!: (project: string | null) => void;
    const promise = new Promise<string | null>((finish) => { resolve = finish; });
    const id = ++requestId.current;
    const timer = window.setTimeout(() => { if (pending.current?.id === id) { pending.current = null; resolve(null); } }, 4000);
    pending.current = { id, promise, resolve, timer };
    frame.current?.contentWindow?.postMessage({ channel: CHANNEL, type: "export", id }, "*");
    return promise;
  }, []);

  useEffect(() => {
    const exportProject = async () => {
      const serialized = await readProject();
      if (serialized) editorProject.current = serialized;
      return serialized;
    };
    exportRef.current = phase === "ready" ? exportProject : null;
    return () => { if (exportRef.current === exportProject) exportRef.current = null; };
  }, [exportRef, phase, readProject]);

  useEffect(() => {
    bootTimer.current = window.setTimeout(() => { setPhase("failed"); setError("작업실을 불러오지 못했어요. 다시 불러와 주세요."); }, 20000);
    return () => {
      window.clearTimeout(bootTimer.current);
      if (pending.current) { window.clearTimeout(pending.current.timer); pending.current.resolve(null); pending.current = null; }
    };
  }, [attempt]);

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || event.origin !== "null" || event.data?.channel !== CHANNEL) return;
      const message = event.data;
      if (message.type === "ready") setBootReady(true);
      else if (message.type === "loaded") { window.clearTimeout(bootTimer.current); setPhase("ready"); setError(""); }
      else if (message.type === "changed" && typeof message.project === "string" && !locked) {
        const next = parse(message.project);
        if (mission && parseProgrammingProject(message.project)?.key !== parseProgrammingProject(draft.entryProject)?.key) runs.current = [];
        editorProject.current = message.project;
        update({ ...draft, entryProject: message.project, practiceOrder: next?.order ?? draft.practiceOrder });
        setError(next ? "" : "이번 미션의 블록과 입력값을 확인해 주세요. 읽지 못한 입력은 화면에 유지하고 있어요.");
      } else if (message.type === "exported" && typeof message.project === "string" && pending.current && pending.current.id === message.id) {
        window.clearTimeout(pending.current.timer); pending.current.resolve(message.project); pending.current = null;
      } else if (message.type === "running" && typeof message.running === "boolean") {
        setRunning(message.running);
        if (message.running) setResult(mission ? "실행 중이에요. 질문에는 무대 안의 입력칸으로 답해 주세요." : "엔트리봇이 실행 중이에요.");
      } else if (mission && message.type === "name-start") {
        const p = parseProgrammingProject(message.project);
        currentRun.current = p && typeof message.id === "string" ? { id: message.id, key: p.key } : null;
      } else if (mission && message.type === "name-run" && currentRun.current && currentRun.current.id === message.run?.id) {
        const steps = message.run.steps;
        if (Array.isArray(steps) && steps.length <= 96 && steps.every((s) => s && ["ask", "answer", "say"].includes(s.kind) && typeof s.value === "string" && s.value.length <= 500)) runs.current = [...runs.current.filter((r) => r.key === currentRun.current!.key), { ...currentRun.current!, reason: String(message.run.reason), steps }].slice(-8);
        currentRun.current = null;
      } else if (message.type === "result" && typeof message.x === "number" && Number.isFinite(message.x) && typeof message.speech === "string") {
        const finish = message.reason === "timeout" ? "15초가 지나 실행을 멈췄어요." : message.reason === "reset" ? "무대를 처음 위치로 돌렸어요." : message.reason === "finished" ? "실행을 마쳤어요." : "실행을 멈췄어요.";
        setResult(`${finish} 이동 거리 ${Math.round(message.x * 100) / 100}${message.speech ? ` · 마지막 말: ${message.speech.slice(0, 80)}` : ""}`);
      } else if (message.type === "error") { window.clearTimeout(bootTimer.current); setPhase("failed"); setError("작업실을 불러오지 못했어요. 입력한 작품은 이 화면에 유지하고 있어요."); }
      else if (message.type === "focus-return") document.getElementById("entry-run")?.focus();
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [draft, locked, update, mission, parse]);

  useEffect(() => {
    if (!bootReady || editorProject.current === (draft.entryProject ?? null)) return;
    const next = parse(draft.entryProject);
    if (!next) return;
    editorProject.current = draft.entryProject ?? null;
    frame.current?.contentWindow?.postMessage({ channel: CHANNEL, type: "load", project: next.project }, "*");
  }, [bootReady, draft.entryProject, parse]);

  useEffect(() => {
    if (bootReady) frame.current?.contentWindow?.postMessage({ channel: CHANNEL, type: "lock", locked: locked || preparing }, "*");
  }, [bootReady, locked, preparing]);

  async function act(action: WorkAction, focusId: string) {
    if (locked || preparing || phase !== "ready" || running) return;
    setPreparing(true);
    const serialized = await readProject();
    const next = parse(serialized);
    if (serialized && next) {
      if (mission?.id === "name" && action.type === "validate-practice") {
        const check = checkNameMission(serialized, runs.current);
        if (!check.passed) { setError(check.message); setPreparing(false); return; }
      }
      editorProject.current = serialized;
      update({ ...draft, entryProject: serialized, practiceOrder: next.order });
      await runAction(mission ? { ...action, missionId: mission.id } as WorkAction : action, focusId);
    } else setError("작품을 확인하지 못했어요. 작업실의 블록과 입력값을 확인하고 다시 시도해 주세요.");
    setPreparing(false);
  }

  function retry() {
    editorProject.current = null; setBootReady(false); setPhase("loading"); setError(""); setRunning(false); setAttempt((value) => value + 1);
  }

  return <div className={styles.workspace}>
    {work.submission && <div className={common.submissionNotice}><CheckCircle2 size={20} /><div><strong id="submitted-heading" tabIndex={-1}>제출한 작품이 있어요.</strong><p>{timeLabel(work.submission.submittedAt)} 제출 · 수정하는 동안에도 이전 제출본과 완료 기록은 유지돼요.</p></div></div>}
    <section className={styles.editor} aria-label="엔트리 블록 코딩 작업">
      <div className={styles.toolbar}><strong>엔트리 작업실</strong><div>
        <Button id="entry-run" size="sm" disabled={locked || preparing || phase !== "ready" || !program} onClick={() => send(running ? "stop" : "run")}>
          {running ? <Square size={14} /> : <Play size={14} />}{running ? "실행 정지" : "실행하기"}
        </Button>
        <Button className={styles.auxControl} size="sm" variant="ghost" aria-label="무대 처음 위치로 초기화" title="무대만 초기화 · 블록과 제출 기록 유지" disabled={locked || preparing || phase !== "ready"} onClick={() => send("reset-stage")}><RotateCcw size={14} aria-hidden="true" />초기화</Button>
        <Button ref={viewToggle} size="sm" variant="outline" aria-pressed={workspaceWide} onClick={() => setWide(!workspaceWide)} onKeyDown={(event) => { if (event.key === "Escape" && workspaceWide) { event.preventDefault(); setWide(false); } }}>
          {workspaceWide ? <Minimize2 size={14} /> : <Maximize2 size={14} />}{workspaceWide ? "기본 크기로 돌아가기" : "작업실 넓게 보기"}
        </Button>
      </div></div>
      <div className={styles.workStates} role="group" aria-label="작품 저장·검증·제출 상태">
        <span role="status" aria-atomic="true" data-save-state={saveState}><strong>저장</strong>{saveLabel}</span>
        <span><strong>검증</strong>{validation ? validation.passed ? "검증 통과" : "조건 보완 필요" : work.validation ? "다시 검증 필요" : "검증 전"}</span>
        <span><strong>제출</strong>{submitted ? "현재 작품 제출 완료" : work.submission ? "이전 제출 유지 · 수정 중" : "아직 제출 전"}</span>
        {saveState === "failed" && <Button size="sm" variant="ghost" onClick={() => document.getElementById("work-save-error")?.focus()}>저장 오류 확인</Button>}
      </div>
      <details className={styles.help}><summary>작업실 사용 안내</summary><p id="entry-help">{mission ? "왼쪽 팔레트에서 필요한 블록을 끌어 연결하고, 질문과 숫자를 바꿔 보세요." : "시작·움직임·생김새에서 블록을 끌어 연결하고 숫자와 말을 바꿔 보세요."} 좁은 화면에서는 작업실을 가로로 움직일 수 있어요. Esc를 누르면 실행 버튼으로 돌아와요.</p></details>
      {(!program || error) && <div role="alert" className={styles.error}><p>{error || "저장된 작품을 읽지 못했어요. 기존 저장본은 유지돼요."}</p>{phase === "failed" && program && <Button variant="outline" onClick={retry}>작업실 다시 불러오기</Button>}
        {!program && <Button variant="outline" disabled={locked} onClick={() => { if (window.confirm("현재 편집 중인 블록을 시작 블록 하나로 바꿀까요? 이전 제출본은 유지돼요.")) { const starter = mission ? buildProgrammingProject() : buildEntryProject(); update({ ...draft, entryProject: starter, practiceOrder: mission ? [] : ["when_run_button_click"] }); retry(); } }}>시작 블록으로 다시 만들기</Button>}
      </div>}
      <div className={styles.frameScroll} tabIndex={0} role="region" aria-label="엔트리 작업실 가로 이동" aria-describedby="entry-help" aria-busy={phase === "loading"}>
        {phase === "loading" && <p className={styles.loading} role="status">엔트리 작업실을 불러오는 중…</p>}
        <iframe key={attempt} ref={frame} src={mission ? `/entryjs/workspace.html?exercise=programming&mission=${mission.id}` : "/entryjs/workspace.html"} title={mission ? `${mission.title} 엔트리 작업실` : "엔트리봇 블록 편집기와 실행 무대"} sandbox="allow-scripts" className={styles.frame} inert={locked || preparing || phase !== "ready"} />
      </div>
      <p className={styles.result} role="status">{result}</p>
      {mission?.id === "keys" && <div className={styles.keyPad} aria-label="방향키 실행">{[["38", "↑ 위"], ["37", "← 왼쪽"], ["40", "↓ 아래"], ["39", "→ 오른쪽"]].map(([key, label]) => <Button key={key} variant="outline" size="sm" disabled={!running || locked} onClick={() => send("key", { key })}>{label}</Button>)}</div>}
    </section>
    <aside className={styles.validation}>
      <div><h3>검증하고 제출해요</h3><p>실행 결과 확인 → 조건 검증 → 작품 제출 순서로 해보세요. 검증을 통과한 작품을 제출하면 실습이 완료돼요.</p>
        <ul className={styles.criteria}>{lesson.practice.criteria?.map((criterion) => {
          const feedback = validation?.criteriaResults?.find((item) => item.id === criterion.id);
          return <li key={criterion.id}>{feedback?.passed ? <Check size={16} /> : <Square size={16} />}<span>{criterion.label}<span className={common.srOnly}>{feedback ? feedback.passed ? "통과" : "보완 필요" : "확인 전"}</span></span></li>;
        })}</ul>
      </div>
      <div className={styles.actions}>
        <Button variant={validation?.passed && !submitted ? "outline" : "default"} disabled={locked || preparing || running || phase !== "ready" || !program} onClick={() => void act({ type: "validate-practice" }, "practice-feedback")}>{busy || preparing ? "확인 중…" : "조건 검증"}</Button>
        {validation && <p id="practice-feedback" tabIndex={-1} role="status" className={validation.passed ? common.feedbackGood : common.feedbackRetry}>{validation.message}</p>}
        <Button variant={validation?.passed && !submitted ? "default" : "outline"} disabled={locked || preparing || running || phase !== "ready" || !validation?.passed || submitted} onClick={() => void act({ type: "submit-practice" }, "submitted-heading")}><Send size={16} />{submitted ? "이 작품 제출 완료" : work.submission ? "수정한 작품 제출" : "작품 제출"}</Button>
        {!work.submission && validation?.passed && <p className={common.smallNote}>검증 통과 · 아직 제출 전이에요.</p>}
      </div>
    </aside>
  </div>;
}
