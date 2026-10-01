"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, BookOpen, Check, CheckCircle2, FlaskConical, Layers3, Monitor, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/visuals";
import { Button } from "@/components/ui/button";
import { useNavigationGuard } from "@/components/navigation-provider";
import type { Stage } from "@/lib/classroom/types";
import { LEGACY_STORAGE_KEY, STORAGE_KEY, MAX_PROTOTYPE_SIZE, initialState, restoreState, type PrototypeState, type PrototypeUpdate } from "@/lib/prototype/programming";
import { type NameEditor } from "./name-practice";
import { Concept } from "./concept";
import { Quiz } from "./quiz";
import { Practice } from "./practice";
import { HelpPanel, TeacherView, type HelpContext, type HelpRequest } from "./support";
import styles from "./programming.module.css";

const stages = [{ id: "concept", label: "개념", icon: BookOpen }, { id: "quiz", label: "퀴즈", icon: CheckCircle2 }, { id: "practice", label: "실습", icon: Layers3 }] as const;

export function ProgrammingPrototype() {
  const [state, setState] = useState<PrototypeState>(initialState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [teacher, setTeacher] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [context, setContext] = useState<HelpContext | null>(null);
  const [request, setRequest] = useState<HelpRequest | null>(null);
  const [resetCount, setResetCount] = useState(0);
  const [focusTarget, setFocusTarget] = useState<{ id: string } | null>(null);
  const latest = useRef<PrototypeState | null>(null);
  const saved = useRef("");
  const editor = useRef<NameEditor | null>(null);
  const { register } = useNavigationGuard();
  const focus = (id: string) => setFocusTarget({ id });
  const update: PrototypeUpdate = (value) => {
    const next = typeof value === "function" ? value(latest.current!) : value;
    if (latest.current?.mission !== next.mission) setHelpOpen(false);
    latest.current = next; setState(next);
  };
  const save = useCallback((next: PrototypeState): boolean => {
    try { const raw = JSON.stringify(next); if (raw.length > MAX_PROTOTYPE_SIZE) throw Error("Draft too large"); sessionStorage.setItem(STORAGE_KEY, raw); saved.current = raw; setError(""); return true; }
    catch { setError("이 탭에 기록을 보관하지 못했어요. 입력은 화면에 유지돼요. 보관 재시도 전에는 새로고침하거나 탭을 닫지 마세요."); return false; }
  }, []);
  const flush = useCallback(async () => {
    if (!latest.current) return true;
    if (editor.current) {
      const raw = await editor.current.read();
      if (!raw) return false;
      const next = { ...latest.current, nameEntryProject: raw };
      latest.current = next; setState(next);
    }
    return save(latest.current);
  }, [save]);
  useEffect(() => {
    let active = true;
    // Read browser storage only after hydration; never overwrite a restored draft on the first render.
    void Promise.resolve().then(() => {
      if (!active) return;
      let next = initialState();
      try {
        const current = sessionStorage.getItem(STORAGE_KEY);
        const raw = current ?? sessionStorage.getItem(LEGACY_STORAGE_KEY);
        const restored = restoreState(raw);
        if (restored) next = restored;
        else if (raw) setError("이전 체험 기록의 형식을 읽지 못했어요. 새로운 체험을 시작합니다.");
        saved.current = current ?? "";
      } catch { setError("이 브라우저에서 탭 보관을 사용할 수 없어요. 입력은 이 화면에 유지돼요."); }
      latest.current = next; setState(next); setReady(true);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => { if (ready && JSON.stringify(state) !== saved.current) save(state); }, [ready, state, save]);
  useEffect(() => register({ flush, isDirty: () => !!editor.current?.dirty() || (latest.current !== null && JSON.stringify(latest.current) !== saved.current) }), [register, flush]);
  useEffect(() => { if (focusTarget) document.getElementById(focusTarget.id)?.focus(); }, [focusTarget]);
  async function switchStage(stage: Stage, tab = false) {
    if (!ready || !latest.current || !await flush()) return;
    const next = { ...latest.current, stage };
    update(next); setTeacher(false); setHelpOpen(false);
    focus(tab ? `prototype-tab-${stage}` : `${stage === "concept" ? "concept" : stage === "quiz" ? "quiz" : "practice"}-title`);
  }
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % stages.length;
    else if (event.key === "ArrowLeft") next = (index + stages.length - 1) % stages.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = stages.length - 1;
    else return;
    event.preventDefault(); switchStage(stages[next].id, true);
  }
  async function viewTeacher() { if (!await flush()) return; setTeacher(true); setHelpOpen(false); focus("teacher-title"); }
  async function moveMission(mission: number) { if (!latest.current || !await flush()) return; update({ ...latest.current, mission }); focus("practice-title"); }
  async function prepareRequest(): Promise<HelpContext | null> {
    if (context?.format !== "entry") return context;
    const raw = await editor.current?.read();
    return raw && editor.current ? { ...context, project: raw, runs: editor.current.runs() } : null;
  }
  function viewStudent() { setTeacher(false); setHelpOpen(!!request); focus(request ? "help-title" : `${state.stage}-title`); }
  const totals = { concept: `${state.conceptDone.length}/4`, quiz: `${state.quiz.solved.length}/5`, practice: `${state.completed.filter((i) => i < 3).length}/3` };
  return <div className={styles.prototype}>
    <div className={styles.banner}><FlaskConical size={15} /><span>수업 프로토타입 · 기록은 이 탭에만 보관돼요. 도움·교사 피드백은 체험이에요.</span></div>
    <header className={styles.topbar}><Brand small /><div className={styles.topbarActions}><span className={styles.localStatus} role="status">{!ready ? "체험 기록 불러오는 중" : error ? "탭 보관 확인 필요" : "이 탭에 보관"}</span><Button variant="outline" onClick={() => teacher ? viewStudent() : viewTeacher()}><Monitor size={16} />{teacher ? "학생 시점으로" : "교사 시점 체험"}</Button></div></header>
    <main id="main-content" className={styles.main}>
      <div className={styles.breadcrumb}><Link href="/"><ArrowLeft size={15} />정보 교실</Link><span>/</span><span>프로그래밍 · 13차시</span></div>
      <div className={styles.lessonHeader}><div><span className={styles.eyebrow}>프로그래밍 · 입력과 변수</span><h1>강아지에게 말 걸기</h1><p>이름을 묻고, 값을 기억하고, 신호에 반응하는 나의 첫 프로그램.</p></div><span className={styles.lessonStamp}>한 차시<br /><strong>개념 → 퀴즈 → 실습</strong></span></div>
      {error && <div className={styles.storageError} role="alert"><p>{error}</p><Button variant="outline" onClick={() => void flush()}>탭 보관 재시도</Button></div>}
      <div className={styles.tabs} role="tablist" aria-label="수업 단계">{stages.map((stage, index) => <button key={stage.id} type="button" id={`prototype-tab-${stage.id}`} role="tab" aria-selected={state.stage === stage.id} aria-controls={`prototype-panel-${stage.id}`} tabIndex={state.stage === stage.id ? 0 : -1} disabled={!ready} onKeyDown={(e) => tabKey(e, index)} onClick={() => switchStage(stage.id, true)}><stage.icon size={20} /><span>{stage.label}</span><small>{totals[stage.id]}</small>{totals[stage.id].split("/")[0] === totals[stage.id].split("/")[1] && <Check size={16} />}</button>)}</div>
      {!ready ? <p role="status" className={styles.loading}>이 탭에서 하던 체험을 준비하고 있어요.</p> : teacher ? <section id={`prototype-panel-${state.stage}`} role="tabpanel" aria-labelledby={`prototype-tab-${state.stage}`}><TeacherView key={resetCount} request={request} setRequest={setRequest} currentProgram={request ? state.programs[request.mission] : []} currentProject={state.nameEntryProject} student={viewStudent} focus={focus} /></section> : <section id={`prototype-panel-${state.stage}`} role="tabpanel" aria-labelledby={`prototype-tab-${state.stage}`} className={styles.panel}>
        {state.stage === "concept" && <Concept key={resetCount} state={state} update={update} focus={focus} next={() => switchStage("quiz")} />}
        {state.stage === "quiz" && <Quiz state={state} update={update} focus={focus} next={() => switchStage("practice")} />}
        {state.stage === "practice" && <Practice key={`${resetCount}-${state.mission}`} state={state} update={update} focus={focus} moveMission={moveMission} editorRef={editor} help={(next) => { setContext(next); setHelpOpen(true); focus("help-title"); }} />}
      </section>}
      <HelpPanel key={resetCount} open={helpOpen && !teacher} context={context} request={request} setRequest={setRequest} prepareRequest={prepareRequest} close={() => { setHelpOpen(false); focus(`${state.stage}-title`); }} teacher={viewTeacher} focus={focus} />
      <footer className={styles.pageFooter}><p>수업 PPT의 프로그래밍·입력/처리/출력·변수·시작 신호를 바탕으로 만든 체험입니다.<br />이름 미션은 실제 엔트리, 다른 미션은 미니 작업실을 사용해요. 엔트리 파일 저장·실제 제출은 지원하지 않아요.</p><Button variant="ghost" onClick={async () => { if (!await flush()) return; if (window.confirm("이 탭의 개념·퀴즈·실습 체험 기록을 지우고 처음부터 시작할까요?")) { const next = initialState(); update(next); setResetCount((count) => count + 1); setRequest(null); setContext(null); setHelpOpen(false); setTeacher(false); focus("concept-title"); } }}><RotateCcw size={15} />체험 처음부터</Button></footer>
    </main>
  </div>;
}
