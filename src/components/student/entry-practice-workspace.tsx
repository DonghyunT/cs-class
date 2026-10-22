"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Check, CheckCircle2, Maximize2, Minimize2, Play, RotateCcw, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Toast } from "@base-ui/react/toast";
import { ENTRY_SPRITES, MAX_ADDED_OBJECTS, MAX_FREE_OBJECTS, MISSION_BLOCKS } from "@/lib/classroom/entry-palette";
import { SuccessToasts } from "@/components/ui/toast";
import type { Lesson, Work, WorkAction, WorkDraft } from "@/lib/classroom/types";
import { buildEntryProject, parseEntryProject } from "@/lib/classroom/entry-project";
import { practiceMatches } from "@/lib/classroom/progress";
import { LOCKED_OBJECTS, MAX_PROJECT_BYTES, entryObjectModel, isFreeMission, missionBlockIssue, missionStarter, newAddedObject, parseProgrammingProject, type ProgrammingMission } from "@/lib/classroom/programming-entry";
import { EntryLibraryPicker } from "./entry-library-picker";
import { checkNameMission, type NameRun } from "@/lib/classroom/name-entry";
import type { WorkController, LessonMode } from "./work-controller";
import { useWorkspaceExpansion } from "./use-workspace-expansion";
import { PracticeGuidance } from "./practice-guidance";
import common from "./student.module.css";
import styles from "./entry-practice-workspace.module.css";

const CHANNEL = "cs-class-entryjs";
const WAITING = " 키를 누르거나 오브젝트를 클릭해 보세요. 다 해 봤으면 무대 아래 ‘정지하기’를 눌러 주세요. 정지하면 조건을 검증할 수 있어요.";
// Entry's stop resets the stage, so drawing runs stay until the student stops them.
const DRAWING = " 그린 결과를 다 봤으면 무대 아래 ‘정지하기’를 눌러 주세요. 정지하면 무대가 처음 상태로 돌아가고, 그다음 조건을 검증할 수 있어요.";
const withoutWaiting = (text: string) => [WAITING, DRAWING].reduce((rest, notice) => rest.endsWith(notice) ? rest.slice(0, -notice.length) : rest, text);
// Name runs record only the dog, so they are keyed by the dog's code, not the whole work.
const gradedProject = (raw: unknown) => { const p = parseProgrammingProject(raw); return p && { key: p.gradeKey, threads: p.threads }; };
const timeLabel = (time: number) => new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(time);

export function EntryPracticeWorkspace({ lesson, work, draft, locked, busy, actionsBlocked = false, update, runAction, exportRef, mission, saveLabel, saveState, workspaceWide, practiceFocused = false, mode = "student", onWorkspaceWideChange, onSave, onReadyChange }: {
  lesson: Lesson; work: Work; draft: WorkDraft; locked: boolean; busy: boolean;
  actionsBlocked?: boolean;
  onSave?: () => Promise<boolean>; onReadyChange?: (ready: boolean) => void;
  update: (next: WorkDraft) => void;
  runAction: (action: WorkAction, focusId: string) => Promise<void>;
  exportRef: RefObject<(() => Promise<string | null>) | null>;
  mission?: ProgrammingMission;
  saveLabel: string;
  saveState: WorkController["saveState"];
  workspaceWide: boolean;
  practiceFocused?: boolean; mode?: LessonMode;
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
  const [recordedRuns, setRecordedRuns] = useState<NameRun[]>([]);
  const [runNotice, setRunNotice] = useState(work.updatedAt ? `${mode === "preview" ? "체험 작품" : "저장된 작품"}은 유지돼요. 이 화면에서 서로 다른 이름으로 두 번 실행해 주세요.` : "서로 다른 이름으로 두 번 실행해 주세요. 질문에 답하고 말하기가 끝날 때까지 기다려요.");
  const currentRun = useRef<{ id: string; key: string } | null>(null);
  // Structure reasons wait until the student runs this work, so a fresh starter keeps its first notice.
  const [triedRun, setTriedRun] = useState(false);
  const startOnly = useRef(false);
  const [picking, setPicking] = useState(false);
  // Dog-free lessons pick from the Entry library and warn, without undoing, when work leaves the mission's intent.
  const free = !!mission && isFreeMission(mission.id);
  const [toasts] = useState(() => Toast.createToastManager());
  const lastIssue = useRef<string | null>(null);
  const objectCount = (raw: unknown) => { const p = parseProgrammingProject(raw); return p ? p.added.length + (p.mainIndex >= 0 ? 1 : 0) : 0; };
  const [localFeedback, setLocalFeedback] = useState("");
  const [localFocus, setLocalFocus] = useState(0);
  const localFeedbackRef = useRef<HTMLParagraphElement>(null);
  const viewToggle = useRef<HTMLButtonElement>(null);
  const workspaceHeading = useRef<HTMLElement>(null);
  const showViewToggle = useWorkspaceExpansion(workspaceWide, viewToggle, workspaceHeading);
  const manualViewFocus = useRef(false);
  useEffect(() => {
    if (manualViewFocus.current) { (viewToggle.current ?? workspaceHeading.current)?.focus({ preventScroll: true }); manualViewFocus.current = false; }
  }, [workspaceWide]);
  function setWide(wide: boolean) { manualViewFocus.current = true; onWorkspaceWideChange(wide); }
  const parse = mission ? parseProgrammingProject : parseEntryProject;
  // Missions that ask questions report what the dog said instead of where it moved.
  const asksQuestion = !!mission && !!MISSION_BLOCKS[mission.id]?.has("ask_and_wait");
  const program = parse(draft.entryProject);
  const validation = practiceMatches(draft, work.validation) ? work.validation : null;
  const submitted = practiceMatches(draft, work.submission);
  const nameCheck = mission?.id === "name" ? checkNameMission(draft.entryProject ?? "", recordedRuns, gradedProject) : null;
  // Name runs live only in this screen. A work that already passed validation or was submitted had its two names checked.
  // Mission results are saved with an empty order (the lesson passes practiceOrder []), so compare with the draft's own order.
  const namesChecked = (current: WorkDraft) => !!work.validation?.passed && practiceMatches(current, work.validation) || practiceMatches(current, work.submission);
  const nameDone = !!nameCheck && namesChecked(draft);
  useEffect(() => { onReadyChange?.(phase === "ready"); return () => onReadyChange?.(false); }, [onReadyChange, phase]);
  useEffect(() => { if (localFocus) localFeedbackRef.current?.focus(); }, [localFocus]);

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
      if (message.type === "save-request") { if (mode === "student" && phase === "ready" && !locked && !preparing && !actionsBlocked) void onSave?.(); }
      else if (message.type === "ready") setBootReady(true);
      else if (message.type === "loaded") { window.clearTimeout(bootTimer.current); setPhase("ready"); setError(""); }
      else if (message.type === "changed" && typeof message.project === "string" && !locked) {
        const next = parse(message.project);
        if (mission && parseProgrammingProject(message.project)?.gradeKey !== parseProgrammingProject(draft.entryProject)?.gradeKey) {
          runs.current = []; setRecordedRuns([]); setLocalFeedback(""); setTriedRun(false);
          setRunNotice("작품 내용이 바뀌어 실행 확인을 다시 시작해요.");
        }
        editorProject.current = message.project;
        if (free && next) {
          const issue = missionBlockIssue(mission!.id, message.project);
          if (issue && issue !== lastIssue.current) toasts.add({ title: issue, type: "warning", priority: "high" });
          lastIssue.current = issue;
        }
        update({ ...draft, entryProject: message.project, practiceOrder: next?.order ?? draft.practiceOrder });
        setError(!next ? "이번 미션의 블록과 입력값을 확인해 주세요. 읽지 못한 입력은 화면에 유지하고 있어요." : "bytes" in next && next.bytes > MAX_PROJECT_BYTES ? "작품이 저장 한도를 넘었어요. 쓰지 않는 블록이나 오브젝트를 지워 주세요." : "");
      } else if (message.type === "exported" && typeof message.project === "string" && pending.current && pending.current.id === message.id) {
        window.clearTimeout(pending.current.timer); pending.current.resolve(message.project); pending.current = null;
      } else if (message.type === "running" && typeof message.running === "boolean") {
        setRunning(message.running);
        if (message.running) {
          startOnly.current = program?.order.length === 1 && program.order[0] === "when_run_button_click";
          setLocalFeedback("");
          // Arrow-key missions never finish on their own, so the waiting notice shows from the start.
          setResult(!mission ? "엔트리봇이 실행 중이에요." : program?.order.some((type) => type === "ask_and_wait") ? "실행 중이에요. 질문에는 무대 안의 입력칸으로 답해 주세요." : mission.keyEvents ? `실행 중이에요.${WAITING}` : "실행 중이에요.");
        }
      } else if (mission && message.type === "name-start") {
        const p = parseProgrammingProject(message.project);
        currentRun.current = p && typeof message.id === "string" ? { id: message.id, key: p.gradeKey } : null;
        setTriedRun(true);
      } else if (mission && message.type === "name-run" && currentRun.current && currentRun.current.id === message.run?.id) {
        const steps = message.run.steps;
        if (Array.isArray(steps) && steps.length <= 96 && steps.every((s) => s && ["ask", "answer", "say"].includes(s.kind) && typeof s.value === "string" && s.value.length <= 500)) {
          const previous = runs.current.filter((r) => r.key === currentRun.current!.key);
          const next = [...previous, { ...currentRun.current!, reason: String(message.run.reason), steps }];
          if (mission.id === "name") {
            // Keep the two completed checks even after duplicate or unsuccessful runs.
            const project = editorProject.current ?? draft.entryProject ?? "";
            runs.current = checkNameMission(project, next, gradedProject).validNames > previous.length ? next : previous;
          } else runs.current = next.slice(-8);
          setRecordedRuns(runs.current);
        }
        currentRun.current = null;
      } else if (message.type === "result" && typeof message.x === "number" && Number.isFinite(message.x) && typeof message.y === "number" && Number.isFinite(message.y) && typeof message.speech === "string") {
        const finish = message.reason === "timeout" ? "15초가 지나 실행을 멈췄어요." : message.reason === "reset" ? "무대를 처음 위치로 돌렸어요." : message.reason === "finished" ? "실행을 마쳤어요." : "실행을 멈췄어요.";
        if (message.reason === "finished" && startOnly.current) {
          const nextBlock = mission?.id === "name" ? "질문 블록" : mission?.variables ? "두 수를 묻고 변수에 대답을 저장하는 블록" : asksQuestion ? "질문 블록과 ‘만일’ 블록" : "이동 블록";
          setResult(`시작 신호가 준비됐어요. 시작하기 아래에 ${nextBlock}을 연결해 보세요.`);
        } else if (asksQuestion) setResult(`${finish} 마지막 말: ${message.speech.slice(0, 80) || "아직 없음"}`);
        else setResult(`${finish} 현재 위치 X ${Math.round(message.x * 100) / 100} · Y ${Math.round(message.y * 100) / 100}${message.speech ? ` · 마지막 말: ${message.speech.slice(0, 80)}` : ""}`);
      } else if (message.type === "error") { window.clearTimeout(bootTimer.current); setPhase("failed"); setError("작업실을 불러오지 못했어요. 입력한 작품은 이 화면에 유지하고 있어요."); }
      else if (message.type === "focus-return") document.getElementById(mission ? "entry-reset" : "entry-run")?.focus();
      else if (mission && message.type === "waiting") setResult((text) => `${withoutWaiting(text)}${message.drawing === true ? DRAWING : WAITING}`);
      else if (mission && message.type === "waiting-ended") setResult((text) => `${withoutWaiting(text)} ${message.reason === "timeout" ? "15초가 지나 실행을 멈췄어요." : "실행을 멈췄어요."}`);
      else if (free && message.type === "clone-blocked") setResult(`오브젝트는 ${MAX_FREE_OBJECTS}개까지 둘 수 있어요.`);
      else if (mission && message.type === "clone-blocked") setResult(message.reason === "main" ? "강아지는 복제할 수 없어요. ‘오브젝트 추가하기’로 새 오브젝트를 더해 주세요." : `오브젝트는 강아지 말고 ${MAX_ADDED_OBJECTS}개까지 추가할 수 있어요.`);
      else if (free && message.type === "object-added" && typeof message.name === "string") setResult(`‘${message.name.slice(0, 20)}’을(를) 추가했어요. 오브젝트 목록에서 고른 오브젝트에 코드를 만들어요.`);
      else if (free && message.type === "object-locked" && typeof message.name === "string") setResult(`‘${message.name.slice(0, 20)}’은(는) 이번 미션에 꼭 필요해서 지울 수 없어요.`);
      else if (free && message.type === "last-object") setResult("무대에는 오브젝트가 하나 이상 있어야 해요. 새 오브젝트를 추가한 뒤 지워 주세요.");
      else if (free && message.type === "picture-locked") setResult("모양은 목록에서 보고 고르기만 할 수 있어요. 다른 그림은 ‘오브젝트 추가하기’로 더해 주세요.");
      else if (mission && message.type === "object-added" && typeof message.name === "string") setResult(`‘${message.name.slice(0, 20)}’을(를) 추가했어요. 이 오브젝트의 코드를 만들려면 오브젝트 목록에서 고르세요. 검증은 강아지 코드로 해요.`);
      else if (mission && message.type === "main-object-locked") setResult("강아지는 미션 검증에 쓰여서 지울 수 없어요. 추가한 오브젝트만 지울 수 있어요.");
      else if (mission && message.type === "add-object-request" && !locked) {
        if (free && objectCount(editorProject.current ?? draft.entryProject) >= MAX_FREE_OBJECTS) setResult(`오브젝트는 ${MAX_FREE_OBJECTS}개까지 둘 수 있어요. 쓰지 않는 오브젝트를 지운 뒤 추가해 주세요.`);
        else if (!free && (parseProgrammingProject(editorProject.current ?? draft.entryProject)?.added.length ?? 0) >= MAX_ADDED_OBJECTS) setResult(`오브젝트는 강아지 말고 ${MAX_ADDED_OBJECTS}개까지 추가할 수 있어요.`);
        else setPicking(true);
      }
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [draft, locked, update, mission, parse, program, mode, phase, preparing, actionsBlocked, onSave, asksQuestion, free, toasts]);

  useEffect(() => {
    const element = frame.current;
    if (!bootReady || !element) return;
    // With Entry's default stage the block board starts about 793px into the frame, so a frame
    // narrower than 1,100px (1,024px screens, phones) uses the smallest stage to keep the board 300px+.
    // Sent before the project loads, so the smaller stage is ready when the workspace appears.
    let narrow: boolean | null = null;
    const fit = () => {
      const next = element.clientWidth < 1100;
      if (next !== narrow) { narrow = next; element.contentWindow?.postMessage({ channel: CHANNEL, type: "stage-size", narrow }, "*"); }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [bootReady]);

  useEffect(() => {
    if (!bootReady || editorProject.current === (draft.entryProject ?? null)) return;
    const next = parse(draft.entryProject);
    if (!next) return;
    const displayed = parse(editorProject.current);
    // A capture normalizes fixed media/metadata. Reloading the same native code
    // would stop a running engine and close its input field.
    if (displayed && JSON.stringify(displayed.project) === JSON.stringify(next.project)) {
      editorProject.current = draft.entryProject ?? null; return;
    }
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
      if (mission?.id === "name" && action.type === "validate-practice" && !namesChecked({ ...draft, entryProject: serialized })) {
        const issue = missionBlockIssue(mission.id, serialized);
        const check = issue ? { passed: false, message: issue } : checkNameMission(serialized, runs.current, gradedProject);
        if (!check.passed) { setLocalFeedback(check.message); setLocalFocus(value => value + 1); setPreparing(false); return; }
      }
      setLocalFeedback("");
      editorProject.current = serialized;
      update({ ...draft, entryProject: serialized, practiceOrder: next.order });
      await runAction(mission ? { ...action, missionId: mission.id } as WorkAction : action, focusId);
    } else setError("작품을 확인하지 못했어요. 작업실의 블록과 입력값을 확인하고 다시 시도해 주세요.");
    setPreparing(false);
  }

  function retry() {
    runs.current = []; setRecordedRuns([]); currentRun.current = null; setTriedRun(false);
    setRunNotice(`${mode === "preview" ? "체험 작품" : "저장된 작품"}은 유지돼요. 이 화면에서 서로 다른 이름으로 두 번 실행해 주세요.`);
    editorProject.current = null; setBootReady(false); setPhase("loading"); setError(""); setRunning(false); setAttempt((value) => value + 1);
  }

  return <div className={styles.workspace}>
    {work.submission && <div className={common.submissionNotice}><CheckCircle2 size={20} /><div><strong id="submitted-heading" tabIndex={-1}>{mode === "preview" ? "체험 제출을 확인했어요." : "제출한 작품이 있어요."}</strong><p>{mode === "preview" ? "수정하는 동안에도 이 창의 이전 체험 제출과 완료 상태는 유지돼요." : `${timeLabel(work.submission.submittedAt)} 제출 · 수정하는 동안에도 이전 제출본과 완료 기록은 유지돼요.`}</p></div></div>}
    <section className={styles.editor} aria-label="엔트리 블록 코딩 작업">
      <div className={styles.toolbar}><strong ref={workspaceHeading} role="heading" aria-level={3} tabIndex={-1}>엔트리 작업실</strong><div>
        {!mission && <Button id="entry-run" size="sm" disabled={locked || preparing || phase !== "ready" || !program} onClick={() => send(running ? "stop" : "run")}>
          {running ? <Square size={14} /> : <Play size={14} />}{running ? "실행 정지" : "실행하기"}
        </Button>}
        <Button id="entry-reset" className={styles.auxControl} size="sm" variant="ghost" title="무대만 처음 위치로 · 블록과 제출 기록은 그대로" disabled={locked || preparing || phase !== "ready"} onClick={() => send("reset-stage")}><RotateCcw size={14} aria-hidden="true" />무대 초기화</Button>
        {showViewToggle && <Button ref={viewToggle} className={styles.auxControl} size="sm" variant="ghost" aria-label={workspaceWide ? "기본 크기로 돌아가기" : "작업실 넓게 보기"} aria-pressed={workspaceWide} onClick={() => setWide(!workspaceWide)} onKeyDown={(event) => { if (event.key === "Escape" && workspaceWide) { event.preventDefault(); setWide(false); } }}>
          {workspaceWide ? <Minimize2 size={14} aria-hidden="true" /> : <Maximize2 size={14} aria-hidden="true" />}{workspaceWide ? "기본 크기" : "넓게 보기"}
        </Button>}
      </div></div>
      {saveState === "failed" && <div className={styles.saveFailure}><span><strong>{mode === "preview" ? "체험" : "저장"}</strong>{saveLabel}</span><Button size="sm" variant="ghost" onClick={() => document.getElementById("work-save-error")?.focus()}>{mode === "preview" ? "체험 작품 오류 확인" : "저장 오류 확인"}</Button></div>}
      {(!program || error) && <div role="alert" className={styles.error}><p>{error || (mode === "preview" ? "체험 작품을 읽지 못했어요. 현재 내용은 유지돼요." : "저장된 작품을 읽지 못했어요. 기존 저장본은 유지돼요.")}</p>{phase === "failed" && program && <Button variant="outline" onClick={retry}>작업실 다시 불러오기</Button>}
        {!program && <Button variant="outline" disabled={locked} onClick={() => { if (window.confirm(mode === "preview" ? "현재 체험 블록을 시작 블록 하나로 바꿀까요? 이 창의 이전 체험 제출은 유지돼요." : "현재 편집 중인 블록을 시작 블록 하나로 바꿀까요? 이전 제출본은 유지돼요.")) { const starter = mission ? missionStarter(mission.id) : buildEntryProject(); update({ ...draft, entryProject: starter, practiceOrder: mission ? [] : ["when_run_button_click"] }); retry(); } }}>시작 블록으로 다시 만들기</Button>}
      </div>}
      <div className={styles.frameScroll} tabIndex={0} role="region" aria-label="엔트리 작업실 가로 이동" aria-describedby="entry-help" aria-busy={phase === "loading"}>
        {phase === "loading" && <p className={styles.loading} role="status">엔트리 작업실을 불러오는 중…</p>}
        <iframe key={attempt} ref={frame} src={mission ? `/entryjs/workspace.html?exercise=programming&mission=${mission.id}${mission.variables ? "&vars=1" : ""}${mission.keyEvents ? "&keys=1" : ""}${free ? `&free=1&locked=${(LOCKED_OBJECTS[mission.id] ?? []).join(",")}` : ""}` : "/entryjs/workspace.html"} title={mission ? `${mission.title} 엔트리 작업실` : "엔트리봇 블록 편집기와 실행 무대"} sandbox="allow-scripts" className={styles.frame} inert={locked || preparing || phase !== "ready"} />
      </div>
      <p className={styles.result} role="status">{result}</p>
      {mission?.keyEvents && <div className={styles.keyPad} aria-label="방향키 실행">{[["38", "↑ 위"], ["37", "← 왼쪽"], ["40", "↓ 아래"], ["39", "→ 오른쪽"]].map(([key, label]) => <Button key={key} variant="outline" size="sm" disabled={!running || locked} onClick={() => send("key", { key })}>{label}</Button>)}</div>}
      <div className={styles.workStates} role="group" aria-label={mode === "preview" ? "체험 작품·검증·제출 상태" : "작품 저장·검증·제출 상태"}>
        <span role="status" aria-atomic="true" data-save-state={saveState}><strong>{mode === "preview" ? "체험" : "저장"}</strong>{saveLabel}</span>
        <span><strong>검증</strong>{validation ? validation.passed ? "검증 통과" : "조건 보완 필요" : work.validation ? "다시 검증 필요" : "검증 전"}</span>
        <span><strong>{mode === "preview" ? "체험 제출" : "제출"}</strong>{submitted ? mode === "preview" ? "현재 작품 체험 제출 확인" : "현재 작품 제출 완료" : work.submission ? mode === "preview" ? "이전 체험 제출 유지 · 수정 중" : "이전 제출 유지 · 수정 중" : mode === "preview" ? "체험 제출 전" : "아직 제출 전"}</span>
      </div>
      <details className={styles.help}><summary>작업실 사용 안내</summary><p id="entry-help">{mission ? "왼쪽 팔레트에서 필요한 블록을 끌어 연결하고, 질문과 숫자를 바꿔 보세요." : "시작·움직임·생김새에서 블록을 끌어 연결하고 숫자와 말을 바꿔 보세요."} {free ? "무대 아래 ‘시작하기’로 실행해요. ‘오브젝트 추가하기’로 엔트리 오브젝트와 배경을 더하고, 고른 오브젝트에 코드를 만들어요. 시작하기 코드는 한 오브젝트에만 두면 그 오브젝트의 코드로 검증해요. ‘모양’ 탭에서 오브젝트의 모양을 볼 수 있어요." : mission ? "무대 아래 ‘시작하기’로 실행하고, ‘오브젝트 추가하기’로 공·별 같은 오브젝트를 더할 수 있어요. 검증은 강아지의 코드로만 해요." : ""} 좁은 화면에서는 작업실을 가로로 움직일 수 있어요. Esc를 누르면 {mission ? "무대 초기화" : "실행"} 버튼으로 돌아와요.</p></details>
      {free && <Dialog open={picking} onOpenChange={setPicking}><DialogContent className={styles.libraryDialog}><DialogHeader><DialogTitle>오브젝트 추가하기</DialogTitle><DialogDescription>분류를 고르거나 이름으로 찾아요. 오브젝트는 {MAX_FREE_OBJECTS}개까지 둘 수 있어요.</DialogDescription></DialogHeader>
        <EntryLibraryPicker onPick={(sprite) => {
          const added = newAddedObject(sprite.id, objectCount(editorProject.current ?? draft.entryProject), true);
          setPicking(false);
          if (added) send("add-object", { object: entryObjectModel(added), back: sprite.category === "background" });
        }} />
      </DialogContent></Dialog>}
      {free && <SuccessToasts manager={toasts} label="미션 안내" />}
      {mission && !free && <Dialog open={picking} onOpenChange={setPicking}><DialogContent className={styles.spriteDialog}><DialogHeader><DialogTitle>오브젝트 추가하기</DialogTitle><DialogDescription>무대에 더할 그림을 골라요. 강아지 말고 {MAX_ADDED_OBJECTS}개까지 추가할 수 있어요.</DialogDescription></DialogHeader>
        <ul className={styles.spriteList}>{ENTRY_SPRITES.map((sprite) => <li key={sprite.id}><button type="button" onClick={() => {
          const added = newAddedObject(sprite.id, parseProgrammingProject(editorProject.current ?? draft.entryProject)?.added.length ?? 0);
          setPicking(false);
          if (added) send("add-object", { object: entryObjectModel(added) });
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- small static sprite preview */}
          <img src={sprite.file} alt="" width={56} height={56} /><span>{sprite.name}</span>
        </button></li>)}</ul>
      </DialogContent></Dialog>}
    </section>
    <aside className={styles.validation}>
      <PracticeGuidance focused={practiceFocused} label="검증 조건 안내"><div><h3>{mode === "preview" ? "검증하고 체험 제출해요" : "검증하고 제출해요"}</h3><p>{mode === "preview" ? "실행 결과 확인 → 조건 검증 → 체험 제출 순서로 해보세요. 결과는 이 창에서만 유지돼요." : "실행 결과 확인 → 조건 검증 → 작품 제출 순서로 해보세요. 검증을 통과한 작품을 제출하면 실습이 완료돼요."}</p>
        <ul className={styles.criteria}>{lesson.practice.criteria?.map((criterion) => {
          const feedback = validation?.criteriaResults?.find((item) => item.id === criterion.id);
          return <li key={criterion.id}>{feedback?.passed ? <Check size={16} /> : <Square size={16} />}<span>{criterion.label}<span className={common.srOnly}>{feedback ? feedback.passed ? "통과" : "보완 필요" : "확인 전"}</span></span></li>;
        })}</ul>
      </div></PracticeGuidance>
      <div className={styles.actions}>
        {nameCheck && <div className={styles.nameProgress}>
          <p role="status" aria-label="서로 다른 이름 확인">서로 다른 이름 확인 {nameDone ? "완료" : `${nameCheck.validNames}/2`}</p>
          <p>{nameDone ? "이 작품은 두 이름으로 확인하고 검증을 통과했어요. 블록을 바꾸면 두 번 실행을 다시 확인해요." : triedRun && (nameCheck.issue === "structure" || nameCheck.issue === "project") ? `지금 블록 연결로는 실행 확인을 세지 않아요. ${missionBlockIssue(mission!.id, draft.entryProject ?? "") ?? nameCheck.message}` : nameCheck.validNames === 0 ? runNotice : nameCheck.validNames === 1 ? "서로 다른 이름으로 한 번 더 실행해 주세요. 같은 이름은 한 번만 세요." : "현재 작품으로 두 이름을 확인했어요. 조건을 검증하고 작품을 제출해 주세요."}</p>
        </div>}
        <Button variant={validation?.passed && !submitted ? "outline" : "default"} disabled={locked || actionsBlocked || preparing || running || phase !== "ready" || !program} onClick={() => void act({ type: "validate-practice" }, "practice-feedback")}>{busy || preparing ? "확인 중…" : "조건 검증"}</Button>
        {localFeedback && <p id="entry-local-feedback" ref={localFeedbackRef} tabIndex={-1} role="status" className={common.feedbackRetry}>{localFeedback}</p>}
        {validation && <p id="practice-feedback" tabIndex={-1} role="status" className={validation.passed ? common.feedbackGood : common.feedbackRetry}>{validation.message}</p>}
        <Button variant={validation?.passed && !submitted ? "default" : "outline"} disabled={locked || actionsBlocked || preparing || running || phase !== "ready" || !validation?.passed || submitted} onClick={() => void act({ type: "submit-practice" }, "submitted-heading")}><Send size={16} />{submitted ? mode === "preview" ? "체험 제출 확인" : "이 작품 제출 완료" : mode === "preview" ? "체험 제출" : work.submission ? "수정한 작품 제출" : "작품 제출"}</Button>
        {!work.submission && validation?.passed && <p className={common.smallNote}>검증 통과 · 아직 제출 전이에요.</p>}
      </div>
    </aside>
  </div>;
}
