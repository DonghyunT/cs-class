"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, MessageCircle, Plus, RefreshCw, Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TeacherToolbar } from "@/components/teacher/teacher-toolbar";
import { useNavigationGuard } from "@/components/navigation-provider";
import { useSession, useTeacherClass } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import { api } from "@/lib/classroom/client";
import { QUESTION_ANSWER_LIMIT, questionAuthorName, type CommunityData, type CommunityQuestion, type QuestionAuthor, type QuestionReplyResult, type QuestionSummary } from "@/lib/classroom/community";
import styles from "./community.module.css";

type QuestionDraft = { id: string; title: string; body: string; lessonId: string | null };
type AnswerDraft = { id: string; body: string };
type Drafts = { question: QuestionDraft; answers: Record<string, AnswerDraft> };
const emptyQuestion = (): QuestionDraft => ({ id: crypto.randomUUID(), title: "", body: "", lessonId: null });
const hasContent = (drafts: Drafts) => Boolean(drafts.question.title || drafts.question.body || Object.values(drafts.answers).some(item => item.body));
const dateLabel = (value: number) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit", hour12: false }).format(value);
function restoreDrafts(key: string): Drafts {
  if (typeof window !== "undefined") try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? "null") as Drafts | null;
    if (saved && typeof saved.question?.title === "string" && typeof saved.question.body === "string") {
      const question = { id: typeof saved.question.id === "string" ? saved.question.id : crypto.randomUUID(), title: saved.question.title.slice(0, 80), body: saved.question.body.slice(0, 2000), lessonId: typeof saved.question.lessonId === "string" ? saved.question.lessonId : null };
      const answers = Object.fromEntries(Object.entries(saved.answers ?? {}).filter(([, value]) => value && typeof value.body === "string").map(([id, value]) => [id, { id: typeof value.id === "string" ? value.id : crypto.randomUUID(), body: value.body.slice(0, 1500) }]));
      return { question, answers };
    }
  } catch { /* A browser that cannot restore drafts still has a usable form. */ }
  return { question: emptyQuestion(), answers: {} };
}

function Author({ author }: { author: QuestionAuthor }) {
  return <span className={styles.author}>{questionAuthorName(author)}{author.role === "student" ? <small>{author.studentId}</small> : <small className={styles.teacher}>{author.role === "instructor" ? "강사" : "교사"}</small>}</span>;
}

export function CommunityScreen({ teacher = false, classId }: { teacher?: boolean; classId?: string }) {
  const { session } = useSession();
  const selection = useTeacherClass(classId);
  const selected = teacher ? selection.classId : session?.classId;
  return <AppShell teacher={teacher} title="우리 반 Q&A">{session && selected ? <CommunityBoard key={`${session.uid}:${selected}`} uid={session.uid} classId={selected} teacher={teacher} onClassChange={selection.setClassId} /> : <p>반이 연결되면 질문을 확인할 수 있어요.</p>}</AppShell>;
}

function CommunityBoard({ uid, classId, teacher, onClassChange }: { uid: string; classId: string; teacher: boolean; onClassChange: (id: string) => void }) {
  const formId = useId();
  const storageKey = `cs-community-draft:${uid}:${classId}`;
  const [data, setData] = useState<CommunityData | null>(null);
  const [question, setQuestion] = useState<CommunityQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [drafts, setDrafts] = useState<Drafts>(() => restoreDrafts(storageKey));
  const [composerOpen, setComposerOpen] = useState(() => Boolean(drafts.question.title || drafts.question.body));
  const [filter, setFilter] = useState<"all" | "unanswered" | "resolved">("all");
  const [focus, setFocus] = useState<{ target: "title" | "answer" | null; key: number }>({ target: null, key: 0 });
  const title = useRef<HTMLInputElement>(null);
  const answer = useRef<HTMLTextAreaElement>(null);
  const threadTitle = useRef<HTMLHeadingElement>(null);
  const active = useRef(true);
  const request = useRef(0);
  const pending = useRef<Promise<boolean> | null>(null);
  const currentDrafts = useRef(drafts);
  const flushedDrafts = useRef<Drafts | null>(null);
  const changeDrafts = useCallback((update: (previous: Drafts) => Drafts) => {
    const next = update(currentDrafts.current);
    currentDrafts.current = next;
    setDrafts(next);
  }, []);
  const { register, beforeLeave } = useNavigationGuard();
  const path = `classroom/community?classId=${encodeURIComponent(classId)}`;

  useEffect(() => {
    const clear = () => { try { sessionStorage.removeItem(storageKey); } catch {} changeDrafts(() => ({ question: emptyQuestion(), answers: {} })); };
    window.addEventListener("cs-draft-clear", clear);
    return () => window.removeEventListener("cs-draft-clear", clear);
  }, [storageKey, changeDrafts]);
  const preserveDraft = useCallback(() => {
    const current = currentDrafts.current;
    try {
      if (hasContent(current)) sessionStorage.setItem(storageKey, JSON.stringify(current)); else sessionStorage.removeItem(storageKey);
      return true;
    } catch { return !hasContent(current); }
  }, [storageKey]);
  useEffect(() => { preserveDraft(); }, [drafts, preserveDraft]);
  useEffect(() => register({ isDirty: () => !!pending.current || hasContent(currentDrafts.current) && flushedDrafts.current !== currentDrafts.current, flush: async () => {
    if (pending.current && !await pending.current) return false;
    const saved = preserveDraft();
    if (saved) flushedDrafts.current = currentDrafts.current;
    else setError("작성 내용을 보관하지 못했어요. 등록하거나 입력을 지운 뒤 이동해 주세요.");
    return saved;
  } }), [register, preserveDraft]);
  useEffect(() => { if (focus.target === "title") title.current?.focus(); else if (focus.target === "answer") (answer.current ?? threadTitle.current)?.focus(); }, [focus]);

  const refresh = useCallback(async (after?: string) => {
    const generation = ++request.current;
    setLoading(true);
    try {
      const next = await api<CommunityData>(`${path}${after ? `&after=${encodeURIComponent(after)}` : ""}`, undefined, "GET", uid);
      if (!active.current || generation !== request.current) return;
      setData(previous => after && previous ? { ...next, questions: [...previous.questions, ...next.questions.filter(item => !previous.questions.some(old => old.id === item.id))] } : next);
      setError("");
    } catch (problem) { if (active.current && generation === request.current) setError(problem instanceof Error ? problem.message : "질문을 불러오지 못했어요."); }
    finally { if (active.current && generation === request.current) setLoading(false); }
  }, [path, uid]);
  const invalidate = useCallback(() => { request.current++; }, []);
  useEffect(() => { active.current = true; queueMicrotask(() => { if (active.current) void refresh(); }); return () => { active.current = false; invalidate(); }; }, [refresh, invalidate]);
  const threadRequest = useRef(0);
  async function openQuestion(id: string) {
    const generation = ++threadRequest.current;
    setThreadLoading(true); setError("");
    try {
      const next = await api<CommunityQuestion>(`classroom/community/${encodeURIComponent(id)}`, undefined, "GET", uid);
      if (active.current && generation === threadRequest.current) setQuestion(next);
    } catch (problem) { if (active.current && generation === threadRequest.current) setError(problem instanceof Error ? problem.message : "질문 내용을 불러오지 못했어요."); }
    finally { if (active.current && generation === threadRequest.current) setThreadLoading(false); }
  }
  function updateSummary(next: QuestionSummary) {
    request.current++; setLoading(false);
    setData(previous => previous ? { ...previous, questions: previous.questions.some(item => item.id === next.id) ? previous.questions.map(item => item.id === next.id ? next : item) : [next, ...previous.questions] } : previous);
  }
  function perform(operation: () => Promise<void>) {
    if (pending.current) return pending.current;
    setSaving(true); setError(""); setMessage("");
    const job = (async () => {
      try { await operation(); return true; }
      catch (problem) { if (active.current) setError(problem instanceof Error ? problem.message : "등록하지 못했어요. 작성 내용은 남아 있어요."); return false; }
      finally { pending.current = null; if (active.current) setSaving(false); }
    })();
    pending.current = job;
    return job;
  }
  function create() {
    if (!drafts.question.title.trim() || !drafts.question.body.trim()) return;
    void perform(async () => {
      const next = await api<CommunityQuestion>(`classroom/community/${encodeURIComponent(classId)}`, drafts.question, "POST", uid);
      if (!active.current) return;
      threadRequest.current++; setThreadLoading(false);
      updateSummary(next); setQuestion(next);
      changeDrafts(previous => ({ ...previous, question: emptyQuestion() }));
      setMessage("질문을 등록했어요."); setFocus(previous => ({ target: "title", key: previous.key + 1 }));
    });
  }
  function reply() {
    if (!question || threadLoading || !drafts.answers[question.id]?.body.trim()) return;
    const id = question.id, draft = drafts.answers[id];
    void perform(async () => {
      const result = await api<QuestionReplyResult>(`classroom/community/${encodeURIComponent(id)}/answers`, draft, "POST", uid);
      if (!active.current) return;
      updateSummary(result.question);
      setQuestion(previous => previous?.id === id ? { ...previous, ...result.question, answers: previous.answers.some(item => item.id === result.answer.id) ? previous.answers : [...previous.answers, result.answer] } : previous);
      changeDrafts(previous => ({ ...previous, answers: { ...previous.answers, [id]: { id: crypto.randomUUID(), body: "" } } }));
      setMessage("답변을 등록했어요."); setFocus(previous => ({ target: "answer", key: previous.key + 1 }));
    });
  }
  function resolve() {
    if (!question || threadLoading) return;
    const id = question.id;
    void perform(async () => {
      const next = await api<QuestionSummary>(`classroom/community/${encodeURIComponent(id)}/resolve`, { resolved: !question.resolved }, "POST", uid);
      if (!active.current) return;
      updateSummary(next); setQuestion(previous => previous?.id === id ? { ...previous, ...next } : previous);
      setMessage(next.resolved ? "해결됨으로 표시했어요." : "질문을 다시 열었어요.");
    });
  }
  const shown = data?.questions.filter(item => filter === "all" || (filter === "resolved" ? item.resolved : item.answerCount === 0 && !item.resolved)) ?? [];
  const draft = drafts.question;
  return <div className={styles.page}>
    <header className={styles.heading}><div><span className={styles.eyebrow}><MessageCircle size={18} aria-hidden="true" />우리 반 질문</span><h1>함께 묻고, 함께 설명해요.</h1><p>같은 반 친구와 선생님이 질문·답변을 볼 수 있어요.</p></div>{!teacher && <div className={styles.tools}><Button variant="ghost" aria-label="질문 새로고침" aria-disabled={loading || saving} onClick={() => { if (!loading && !saving) { void refresh(); if (question) void openQuestion(question.id); } }}><RefreshCw size={16} aria-hidden="true" />새로고침</Button></div>}</header>
    {teacher && <TeacherToolbar classId={classId} classrooms={data?.classrooms ?? []} refreshing={loading || saving || threadLoading} onClassChange={async id => { if (await beforeLeave()) onClassChange(id); }} onRefresh={() => { void refresh(); if (question) void openQuestion(question.id); }} />}
    {error && <div className={styles.error} role="alert"><p>{error} {data && "마지막으로 확인한 질문을 보여드리고 있어요."}</p>{!data && <Button variant="outline" onClick={() => void refresh()}>질문 다시 불러오기</Button>}</div>}
    <p className={styles.status} role="status" aria-live="polite">{saving ? "등록하고 있어요. 작성 내용은 보관 중이에요." : message}</p>
    {!data && loading && <LoadingState>우리 반 질문을 불러오고 있어요.</LoadingState>}
    {data && <>
      <details className={styles.composer} open={composerOpen} onToggle={event => setComposerOpen(event.currentTarget.open)}><summary><Plus size={17} aria-hidden="true" />질문 쓰기</summary><form onSubmit={event => { event.preventDefault(); create(); }}>
        <label>질문 제목<Input ref={title} value={draft.title} required maxLength={80} readOnly={saving} onChange={event => changeDrafts(previous => ({ ...previous, question: { ...previous.question, id: crypto.randomUUID(), title: event.target.value } }))} /></label>
        <div className={styles.field}><label htmlFor={`${formId}-question-body`}>질문 내용</label><textarea id={`${formId}-question-body`} value={draft.body} required maxLength={2000} rows={4} readOnly={saving} onChange={event => changeDrafts(previous => ({ ...previous, question: { ...previous.question, id: crypto.randomUUID(), body: event.target.value } }))} /></div>
        <div className={styles.composerFooter}><label>관련 수업<Select label="질문 수업" value={draft.lessonId ?? ""} options={[{ value: "", label: "수업 선택 안 함" }, ...data.lessons.map(lesson => ({ value: lesson.id, label: lesson.title }))]} disabled={saving} onValueChange={value => changeDrafts(previous => ({ ...previous, question: { ...previous.question, id: crypto.randomUUID(), lessonId: value || null } }))} /></label><Button type="submit" aria-disabled={saving || !draft.title.trim() || !draft.body.trim()}><Send size={15} aria-hidden="true" />질문 등록</Button></div>
        <p className={styles.note}>등록 전 작성 내용은 이 탭에서 이어 쓸 수 있어요.</p>
      </form></details>
      <div className={styles.filters} role="group" aria-label="질문 필터">{([['all', '전체'], ['unanswered', '답변 대기'], ['resolved', '해결됨']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
      <div className={styles.layout}><section className={styles.list} aria-label="우리 반 질문 목록">
        {!shown.length && <p className={styles.empty}>{data.questions.length ? "해당하는 질문이 없어요." : "아직 질문이 없어요. 궁금한 점을 먼저 나눠 보세요."}</p>}
        {shown.map(item => <article key={item.id}><button type="button" className={styles.questionButton} aria-expanded={question?.id === item.id} aria-controls="question-thread" onClick={() => { if (!saving) void openQuestion(item.id); }}><span className={styles.questionMeta}>{item.resolved ? <span className={styles.resolved}><Check size={13} aria-hidden="true" />해결됨</span> : "질문"}{item.lessonId && <span>{data.lessons.find(lesson => lesson.id === item.lessonId)?.title ?? "수업 질문"}</span>}</span><strong>{item.title}</strong><span className={styles.questionMeta}><Author author={item.author} /><span>답변 {item.answerCount}개</span></span></button></article>)}
        {data.nextCursor && <Button variant="ghost" aria-disabled={loading} onClick={() => { if (!loading) void refresh(data.nextCursor!); }}>이전 질문 더 보기</Button>}
      </section><section id="question-thread" className={styles.thread} aria-label="질문과 답변" aria-busy={threadLoading}>
        {threadLoading && <LoadingState>질문과 답변을 확인하고 있어요.</LoadingState>}
        {!question ? !threadLoading && <p className={styles.empty}>질문을 선택하면 내용과 답변이 보여요.</p> : <>
          <header className={styles.threadHeading}><h2 ref={threadTitle} tabIndex={-1}>{question.title}</h2>{(teacher || question.author.uid === uid) && <Button variant="ghost" aria-disabled={saving || threadLoading} onClick={resolve}>{question.resolved ? "질문 다시 열기" : "해결됨으로 표시"}</Button>}</header>
          <div className={styles.questionMeta}><Author author={question.author} /><time dateTime={new Date(question.createdAt).toISOString()}>{dateLabel(question.createdAt)}</time></div>
          <p className={styles.body}>{question.body}</p>
          {question.resolved && <p className={styles.resolved}><Check size={15} aria-hidden="true" />해결됨 · 질문자의 궁금증이 해소되었다는 표시예요.</p>}
          <h3>답변 {question.answerCount}개</h3>
          <ol className={styles.answers}>{question.answers.map(item => <li key={item.id}><div className={styles.questionMeta}><Author author={item.author} /><time dateTime={new Date(item.createdAt).toISOString()}>{dateLabel(item.createdAt)}</time></div><p className={styles.body}>{item.body}</p></li>)}</ol>
          {!question.answers.length && <p className={styles.note}>아직 답변이 없어요. 친구와 선생님의 설명을 기다리고 있어요.</p>}
          {question.answerCount >= QUESTION_ANSWER_LIMIT ? <p className={styles.note}>답변은 한 질문에 {QUESTION_ANSWER_LIMIT}개까지 등록할 수 있어요. 새 질문에서 이어 주세요.</p> : <form className={styles.answerForm} onSubmit={event => { event.preventDefault(); reply(); }}><div className={styles.field}><label htmlFor={`${formId}-answer-body`}>답변 내용</label><textarea id={`${formId}-answer-body`} ref={answer} value={drafts.answers[question.id]?.body ?? ""} required rows={3} maxLength={1500} readOnly={saving || threadLoading} onChange={event => { const body = event.target.value; changeDrafts(previous => ({ ...previous, answers: { ...previous.answers, [question.id]: { id: crypto.randomUUID(), body } } })); }} /></div><Button type="submit" aria-disabled={saving || threadLoading || !drafts.answers[question.id]?.body.trim()}><Send size={15} aria-hidden="true" />답변 등록</Button></form>}
        </>}
      </section></div>
    </>}
  </div>;
}
