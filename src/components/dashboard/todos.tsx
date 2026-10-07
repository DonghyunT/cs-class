"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ListTodo, Pencil, Trash2, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigationGuard } from "@/components/navigation-provider";
import { PLANNER_LIMIT, type Todo } from "@/lib/classroom/planner";
import { useSavedList } from "./use-saved-list";
import { LoadingList } from "./loading-list";
import styles from "./dashboard.module.css";

export function composing(event: KeyboardEvent<HTMLInputElement>) {
  return event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229;
}
export function TodoList({ uid }: { uid: string }) {
  const list = useSavedList<Todo>("classroom/todos", "classroom/todos", uid);
  const [text, setText] = useState("");
  const [edit, setEdit] = useState<{ id: string; text: string } | null>(null);
  const [focus, setFocus] = useState<{ id: string | null } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const editInput = useRef<HTMLInputElement>(null);
  const section = useRef<HTMLElement>(null);
  const { register } = useNavigationGuard();
  const { send, flush, isDirty } = list;

  useEffect(() => {
    if (!focus) return;
    if (focus.id) section.current?.querySelector<HTMLButtonElement>(`button[data-edit-id="${focus.id}"]`)?.focus();
    else input.current?.focus();
  }, [focus]);
  useEffect(() => { editInput.current?.focus(); }, [edit?.id]);
  useEffect(() => register({
    isDirty: () => isDirty() || !!text.trim() || !!edit,
    flush: async () => {
      if (edit) {
        const original = list.items.find((item) => item.id === edit.id);
        if (!original || !edit.text.trim() || !send({ id: edit.id, item: { ...original, text: edit.text.trim() } })) return false;
        setEdit(null);
      }
      if (text.trim()) {
        if (list.items.length >= PLANNER_LIMIT) return false;
        const item = { id: crypto.randomUUID(), text: text.trim(), completed: false };
        if (!send({ id: item.id, item })) return false;
        setText("");
      }
      return flush();
    },
  }), [register, isDirty, flush, send, text, edit, list.items]);

  function add() {
    if (!text.trim() || list.items.length >= PLANNER_LIMIT || list.loadError || list.error) return;
    const item = { id: crypto.randomUUID(), text: text.trim(), completed: false };
    if (send({ id: item.id, item })) { setText(""); setFocus({ id: null }); }
  }
  function commit(item: Todo) {
    if (!edit?.text.trim()) return;
    if (send({ id: item.id, item: { ...item, text: edit.text.trim() } })) { setEdit(null); setFocus({ id: null }); }
  }
  const locked = !!list.error;
  const items = list.items.filter((item) => list.error || !list.changes.some((change) => change.id === item.id && !change.item));
  return <section ref={section} className={`${styles.panel} ${styles.todoPanel}`} aria-labelledby="todos-heading">
    <div className={styles.sectionHeading}><div className={styles.sectionTitle}><span className={`${styles.titleIcon} ${styles.todoIcon}`}><ListTodo size={19} aria-hidden="true" /></span><h2 id="todos-heading">내 할 일</h2></div><div className={styles.panelTools}><span>나만 보는 목록</span><button type="button" aria-label="할 일 새로고침" disabled={list.saving || locked} onClick={() => void list.refresh()}><RefreshCw size={16} aria-hidden="true" /></button></div></div>
    <p className={styles.todoSubtitle}>개인 체크리스트예요. 체크해도 수업·제출 기록은 바뀌지 않아요.</p>
    {list.loadError && <div className={styles.error} role="alert"><p>{list.loadError} {list.data && "마지막으로 조회한 목록이에요."}</p><Button variant="outline" onClick={() => void list.refresh()} disabled={list.saving}>목록 다시 불러오기</Button></div>}
    {!list.data && !list.loadError && <LoadingList label="할 일을 불러오고 있어요." checklist />}
    {list.data && <>
      {!items.length && <p className={styles.empty}>{list.changes.some((change) => !change.item) ? "삭제 내용을 저장하고 있어요." : "아직 내 할 일이 없어요. 기억해 둘 일을 한 줄로 적어 보세요."}</p>}
      <ul className={styles.todoList}>{items.map((item) => {
        const change = list.changes.find((change) => change.id === item.id);
        const pending = !!change;
        const rowLocked = locked || pending || !!list.loadError;
        return <li key={item.id} data-todo-id={item.id} aria-busy={pending}>
          <label className={styles.checkbox}><input type="checkbox" aria-label={`${item.text} 완료`} checked={item.completed} aria-disabled={rowLocked} onChange={(event) => { if (!rowLocked) send({ id: item.id, item: { ...item, completed: event.target.checked } }); }} /></label>
          {edit?.id === item.id ? <div className={styles.inlineEdit}><input ref={editInput} aria-label="할 일 수정" maxLength={180} value={edit.text} onChange={(event) => setEdit({ ...edit, text: event.target.value })} onKeyDown={(event) => {
            if (composing(event)) return;
            if (event.key === "Enter") { event.preventDefault(); commit(item); }
            if (event.key === "Escape") { event.preventDefault(); setEdit(null); setFocus({ id: item.id }); }
          }} /><Button variant="outline" onClick={() => commit(item)} disabled={!edit.text.trim() || rowLocked}>수정 저장</Button><Button variant="ghost" onClick={() => { setEdit(null); setFocus({ id: item.id }); }}>취소</Button></div> : <span className={styles.todoText}><span className={item.completed ? styles.completed : undefined}>{item.text}</span>{pending && <small>{!change?.item && "삭제 · "}{list.error ? "저장 실패 · 변경 보관 중" : "저장 중"}</small>}</span>}
          {!edit && <div className={styles.rowActions}><button type="button" data-edit-id={item.id} aria-label={`${item.text} 수정`} disabled={rowLocked} onClick={() => setEdit({ id: item.id, text: item.text })}><Pencil size={16} aria-hidden="true" /></button><button type="button" aria-label={`${item.text} 삭제`} disabled={rowLocked} onClick={() => { if (send({ id: item.id, item: null })) setFocus({ id: null }); }}><Trash2 size={16} aria-hidden="true" /></button></div>}
        </li>;
      })}</ul>
      <form className={styles.addTodo} onSubmit={(event) => { event.preventDefault(); add(); }}>
        <label htmlFor="new-todo">할 일 추가</label><div><input id="new-todo" ref={input} autoComplete="off" maxLength={180} placeholder="기억해 둘 일을 적어 보세요" value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && composing(event)) event.preventDefault(); }} />
          <Button type="submit" variant="outline" disabled={!text.trim() || !!list.error || !!list.loadError || list.items.length >= PLANNER_LIMIT}><Plus size={16} aria-hidden="true" />추가</Button></div>
      </form>
      {list.items.length >= PLANNER_LIMIT && <p className={styles.muted}>파일럿은 할 일 {PLANNER_LIMIT}개까지 저장해요. 필요 없는 항목을 지워 주세요.</p>}
      {list.error && <div className={styles.error} role="alert"><p>{list.error} 텍스트·체크·삭제 의도를 보관하고 있어요. 재시도하면 같은 항목에는 내 변경을 적용하고 다른 항목은 유지해요.</p><Button variant="outline" onClick={() => void list.retry()}>최신 기록에 내 변경 재시도</Button></div>}
      <p className={styles.saveStatus} role="status">{list.saving ? "저장 중이에요. 다른 할 일도 정리해 보세요." : list.error ? "아직 저장하지 못했어요." : list.loadError ? "마지막 조회 자료 · 최신 기록 확인 필요" : list.saved ? "저장 완료" : "Enter로 추가·수정, Esc로 편집 취소"}</p>
    </>}
  </section>;
}
