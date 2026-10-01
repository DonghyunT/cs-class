"use client";

import { useEffect, useState, type DragEvent, type RefObject } from "react";
import { ArrowDown, ArrowUp, Check, Dog, Lightbulb, Play, Plus, RotateCcw, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { blankFrame, blockLabels, checkMission, missions, newBlock, runProgram, signalLabels, type Block, type BlockKind, type Frame, type PrototypeState, type PrototypeUpdate, type RunResult, type Signal } from "@/lib/prototype/programming";
import type { HelpContext } from "./support";
import styles from "./programming.module.css";
import { NamePractice, type NameEditor } from "./name-practice";

export function Practice({ state, update, focus, help, moveMission, editorRef }: { state: PrototypeState; update: PrototypeUpdate; focus: (id: string) => void; help: (context: HelpContext) => void; moveMission: (mission: number) => Promise<void>; editorRef: RefObject<NameEditor | null> }) {
  const mission = missions[state.mission];
  const blocks = state.programs[state.mission];
  const [frame, setFrame] = useState<Frame>(blankFrame);
  const [result, setResult] = useState<RunResult | null>(null);
  const [playback, setPlayback] = useState<{ result: RunResult; index: number } | null>(null);
  const [validation, setValidation] = useState<{ passed: boolean; message: string } | null>(null);
  const running = playback !== null;
  useEffect(() => {
    if (!playback) return;
    const timer = window.setTimeout(() => {
      setFrame(playback.result.frames[playback.index]);
      if (playback.index + 1 >= playback.result.frames.length) { setResult(playback.result); setPlayback(null); }
      else setPlayback({ ...playback, index: playback.index + 1 });
    }, 320);
    return () => window.clearTimeout(timer);
  }, [playback]);
  function change(next: Block[]) {
    setValidation(null); setResult(null);
    update({ ...state, programs: state.programs.map((p, i) => i === state.mission ? next : p) });
  }
  function add(kind: BlockKind) {
    if (running || blocks.length >= 32 || !mission.kinds.includes(kind)) return;
    const block = newBlock(kind, crypto.randomUUID());
    if (state.mission === 2 && kind === "start") block.value = "ArrowRight";
    if ([1, 3].includes(state.mission) && kind === "ask") block.value = blocks.filter((b) => b.kind === "ask").length ? "b" : "a";
    if (kind === "store") block.value = blocks.filter((b) => b.kind === "store").length ? "B" : "A";
    change([...blocks, block]); focus(`block-${block.id}`);
  }
  function move(id: string, delta: number) {
    const index = blocks.findIndex((b) => b.id === id);
    const next = [...blocks];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    change(next); focus(`block-${id}`);
  }
  function drop(event: DragEvent<HTMLElement>, destination = blocks.length) {
    event.preventDefault(); event.stopPropagation();
    if (running) return;
    const kind = event.dataTransfer.getData("application/cs-block-kind") as BlockKind;
    if (mission.kinds.includes(kind)) { add(kind); return; }
    const id = event.dataTransfer.getData("application/cs-block-id");
    const source = blocks.findIndex((b) => b.id === id);
    if (source < 0) return;
    const next = blocks.filter((b) => b.id !== id);
    next.splice(destination > source ? destination - 1 : destination, 0, blocks[source]);
    change(next); focus(`block-${id}`);
  }
  function run(signal: Signal = "click") {
    if (running) return;
    const next = runProgram(blocks, state.inputs, signal, signal === "click" ? { x: 0, y: 0 } : frame);
    setResult(null);
    if (next.frames.length) setPlayback({ result: next, index: 0 });
    else { setResult(next); setFrame({ ...frame, message: next.error }); }
  }
  function reset() { setPlayback(null); setFrame(blankFrame); setResult(null); }
  function patchBlock(id: string, value: string) { change(blocks.map((b) => b.id === id ? { ...b, value } : b)); }
  return <div>
    <nav className={styles.missionNav} aria-label="실습 미션">{missions.map((item, i) => <button type="button" key={item.title} aria-current={i === state.mission ? "step" : undefined} onClick={() => void moveMission(i)}><span>{state.completed.includes(i) ? <Check size={16} /> : i === 3 ? "+" : `0${i + 1}`}</span><strong>{item.title}</strong>{i === 3 && <small>추가 도전</small>}</button>)}</nav>
    {state.mission === 0 ? <NamePractice state={state} update={update} focus={focus} help={help} editorRef={editorRef} /> : <>
    <div className={styles.practiceHeading}><div className={styles.sectionHeading}><span className={styles.eyebrow}>{state.mission === 3 ? "CHALLENGE" : `MISSION 0${state.mission + 1}`} · 미니 블록 실습</span><h2 id="practice-title" tabIndex={-1}>{mission.title}</h2><p>{mission.description}</p></div><Button variant="outline" disabled={running} onClick={() => help({ format: "mini", mission: state.mission, program: blocks.map((b) => ({ ...b })), inputs: { ...state.inputs }, result })}><Lightbulb size={17} />막혔어요</Button></div>
    <p className={styles.goal}><span>오늘의 목표</span>{mission.goal}</p>
    <div className={styles.workbench}>
      <section className={styles.codeWorkspace} aria-label="블록 조립 작업실"><div className={styles.workbenchTop}><strong>내 코드</strong><span>블록을 눌러 추가하거나 끌어 놓으세요</span></div>
        <div className={styles.palette}>{mission.kinds.map((kind) => <button type="button" key={kind} disabled={running || blocks.length >= 32} draggable={!running} onDragStart={(e) => e.dataTransfer.setData("application/cs-block-kind", kind)} onClick={() => add(kind)} data-kind={kind}><Plus size={15} />{blockLabels[kind]}</button>)}</div>
        <ol className={styles.blockList} onDragOver={(e) => e.preventDefault()} onDrop={(e) => drop(e)}>{blocks.map((b, index) => <li key={b.id} id={`block-${b.id}`} tabIndex={-1} data-kind={b.kind} data-active={running && frame.blockId === b.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => drop(e, index)}>
          <div className={styles.blockTop} draggable={!running} onDragStart={(e) => e.dataTransfer.setData("application/cs-block-id", b.id)}><span>{String(index + 1).padStart(2, "0")} · {blockLabels[b.kind]}</span><div className={styles.blockTools}><button type="button" aria-label={`${index + 1}번 블록 위로 이동`} disabled={running || index === 0} onClick={() => move(b.id, -1)}><ArrowUp size={15} /></button><button type="button" aria-label={`${index + 1}번 블록 아래로 이동`} disabled={running || index === blocks.length - 1} onClick={() => move(b.id, 1)}><ArrowDown size={15} /></button><button type="button" aria-label={`${index + 1}번 블록 삭제`} disabled={running} onClick={() => { change(blocks.filter((item) => item.id !== b.id)); focus(blocks[index + 1] ? `block-${blocks[index + 1].id}` : blocks[index - 1] ? `block-${blocks[index - 1].id}` : "palette-heading"); }}><Trash2 size={15} /></button></div></div>
          <div className={styles.blockValue}>
            {b.kind === "start" && <><select aria-label={`${index + 1}번 블록 시작 신호`} value={b.value} disabled={running} onChange={(e) => patchBlock(b.id, e.target.value)}>{Object.entries(signalLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span>{b.value === "click" ? "을 클릭했을 때" : "를 눌렀을 때"}</span></>}
            {b.kind === "ask" && <><select aria-label={`${index + 1}번 블록 질문`} value={b.value} disabled={running} onChange={(e) => patchBlock(b.id, e.target.value)}><option value="name">강아지 이름은?</option><option value="a">A의 값은?</option><option value="b">B의 값은?</option></select><span>묻고 대답 기다리기</span></>}
            {b.kind === "store" && <><select aria-label={`${index + 1}번 블록 변수`} value={b.value} disabled={running} onChange={(e) => patchBlock(b.id, e.target.value)}><option>A</option><option>B</option></select><span>를 <em>대답</em>으로 정하기</span></>}
            {b.kind === "say" && <span>‘내 이름은 ’ + <em>대답</em> + ‘!’ 말하기</span>}
            {b.kind === "calculate" && <><select aria-label={`${index + 1}번 블록 연산`} value={b.value} disabled={running} onChange={(e) => patchBlock(b.id, e.target.value)}><option value="multiply">A × B</option><option value="average">(A + B) ÷ 2</option></select><span>계산해서 말하기</span></>}
            {b.kind === "direction" && <><span>이동 방향을</span><select aria-label={`${index + 1}번 블록 방향`} value={b.value} disabled={running} onChange={(e) => patchBlock(b.id, e.target.value)}>{[0, 90, 180, 270].map((n) => <option key={n} value={n}>{n}°</option>)}</select><span>로 정하기</span></>}
            {b.kind === "move" && <><span>이동 방향으로</span><input aria-label={`${index + 1}번 블록 이동 거리`} inputMode="decimal" maxLength={40} value={b.value} disabled={running} onChange={(e) => patchBlock(b.id, e.target.value)} /><span>만큼 움직이기</span></>}
          </div>
        </li>)}</ol><p id="palette-heading" tabIndex={-1} className={styles.smallText}>위에서 아래로 연결해요. 시작 신호가 여러 개면 각 신호 아래의 코드가 따로 실행돼요. 최대 32개 블록.</p>
      </section>
      <section className={styles.stageWorkspace} aria-label="실행 무대와 기록"><div className={styles.workbenchTop}><strong>실행 무대</strong><span>입력값을 바꿔 다시 실험해요</span></div>
        <fieldset className={styles.testInputs} disabled={running}><legend>이번 실행의 입력값</legend>{state.mission === 0 ? <label>강아지 이름<input maxLength={40} value={state.inputs.name} onChange={(e) => { setValidation(null); setResult(null); update({ ...state, inputs: { ...state.inputs, name: e.target.value } }); }} /></label> : state.mission !== 2 && ["a", "b"].map((key) => <label key={key}>입력 {key.toUpperCase()}<input maxLength={40} inputMode="decimal" value={state.inputs[key as "a" | "b"]} onChange={(e) => { setValidation(null); setResult(null); update({ ...state, inputs: { ...state.inputs, [key]: e.target.value } }); }} /></label>)}{state.mission === 2 && <p>무대를 클릭하거나 Tab으로 초점을 두고 방향키를 눌러보세요.</p>}</fieldset>
        <div className={styles.stage} tabIndex={0} role="group" aria-label="강아지 실행 무대" onKeyDown={(e) => { if (state.mission === 2 && e.target === e.currentTarget && e.key in signalLabels && e.key !== "click") { e.preventDefault(); run(e.key as Signal); } }}><div className={styles.stageAxes} aria-hidden="true"><span>y</span><span>x</span></div><div className={styles.actor} style={{ left: `${50 + frame.x / 4}%`, top: `${55 - frame.y / 2.5}%` }}><div className={styles.speech}>{frame.speech || (state.mission === 2 ? "방향키로 움직여 봐!" : "어떤 결과가 나올까?")}</div><Dog size={72} strokeWidth={1.5} aria-hidden="true" /></div><span className={styles.coordinates}>x {frame.x} · y {frame.y} · 방향 {frame.direction}°</span></div>
        <div className={styles.runTools}><Button disabled={running} onClick={() => run()}><Play size={16} />실행하기</Button><Button variant="outline" disabled={!running} onClick={() => { setPlayback(null); setResult(null); setFrame({ ...blankFrame, message: "실행을 멈추고 무대를 처음 위치로 돌렸어요." }); }}><Square size={14} />중지</Button><button type="button" aria-label="무대 처음 위치로" className={styles.iconButton} onClick={reset}><RotateCcw size={19} /></button></div>
        {state.mission === 2 && <div className={styles.keyButtons}>{(["ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"] as Signal[]).map((signal) => <button type="button" key={signal} disabled={running} onClick={() => run(signal)}>{signalLabels[signal]}</button>)}</div>}
        <div className={styles.runtimeState}><span>대답 <strong>{frame.answer || "아직 없음"}</strong></span><span>A <strong>{frame.variables.A ?? "—"}</strong></span><span>B <strong>{frame.variables.B ?? "—"}</strong></span></div>
        <p className={result?.error ? styles.feedback : styles.runStatus} role="status">{running ? `실행 중 · ${frame.message}` : result?.error || frame.message}</p>
        <details className={styles.trace}><summary>실행 발자국 {result ? `· ${result.frames.length}단계` : ""}</summary>{result ? <ol>{result.frames.map((step, i) => <li key={`${step.blockId}-${i}`}><span>{i + 1}</span>{step.message}</li>)}</ol> : <p>실행을 마치면 어떤 순서로 값이 바뀌었는지 보여요.</p>}</details>
      </section>
    </div>
    <div className={styles.validation}><div><span className={styles.eyebrow}>마지막으로 확인해요</span><p>{state.completed.includes(state.mission) ? "완료 기록이 있어요. 수정한 코드도 다시 확인해 보세요." : "입력값이 달라도 목표대로 실행되는지 확인해요."}</p></div><div><Button variant="outline" disabled={running} onClick={() => { setValidation(checkMission(state.mission, blocks)); focus("mission-feedback"); }}>미션 조건 확인</Button><Button disabled={running || !validation?.passed} onClick={() => { if (!state.completed.includes(state.mission)) update({ ...state, completed: [...state.completed, state.mission] }); focus("mission-feedback"); }}><Check size={16} />내 작업에 완료 표시</Button></div></div>
    {validation && <p id="mission-feedback" tabIndex={-1} role="status" className={validation.passed ? styles.good : styles.feedback}>{state.completed.includes(state.mission) && validation.passed ? "이 탭의 작업에 완료 기록을 남겼어요. 실제 수업 제출은 아니에요." : validation.message}</p>}
    </>}
    <div className={styles.reflection}><label htmlFor="reflection">오늘 발견한 것을 한 줄로 남겨볼까요?</label><textarea id="reflection" maxLength={500} placeholder="예: A의 대답을 먼저 저장해야 B를 물어도 A가 남는다." value={state.reflection} onChange={(e) => update({ ...state, reflection: e.target.value })} /><p>내 코드와 함께 이 탭에 보관돼요. 탭을 닫으면 체험 기록이 사라져요.</p></div>
  </div>;
}
