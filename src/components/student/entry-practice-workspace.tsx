"use client";

import { useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, CheckCircle2, Play, Plus, RotateCcw, Send, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lesson, Work, WorkAction, WorkDraft } from "@/lib/classroom/types";
import styles from "./student.module.css";

interface EntryBlockItem {
  id: string;
  type: string;
  label: string;
  category: "start" | "movement" | "looks";
  paramText?: string;
}

const AVAILABLE_BLOCKS: EntryBlockItem[] = [
  { id: "when_run_button_click", type: "when_run_button_click", label: "시작하기 버튼을 클릭했을 때", category: "start" },
  { id: "move_direction", type: "move_direction", label: "이동 방향으로", category: "movement", paramText: "10만큼 움직이기" },
  { id: "dialog", type: "dialog", label: "‘안녕!’을", category: "looks", paramText: "2초 동안 말하기" },
];

function buildProjectJson(blocks: EntryBlockItem[]): string {
  return JSON.stringify({
    objects: [
      {
        name: "엔트리봇",
        script: [blocks.map((b) => ({ type: b.type, params: b.type === "move_direction" ? [10] : b.type === "dialog" ? ["안녕!", "say", 2] : [] }))],
      },
    ],
  });
}

function parseBlocksFromDraft(draft: WorkDraft): EntryBlockItem[] {
  if (draft.entryProject) {
    try {
      const parsed = JSON.parse(draft.entryProject);
      const scripts = parsed?.objects?.[0]?.script?.[0];
      if (Array.isArray(scripts)) {
        const result: EntryBlockItem[] = [];
        for (let i = 0; i < scripts.length; i++) {
          const item = scripts[i];
          const matched = AVAILABLE_BLOCKS.find((b) => b.type === item.type);
          if (matched) {
            result.push({ ...matched, id: `${matched.type}_${i}` });
          }
        }
        if (result.length > 0) return result;
      }
    } catch {
      // Fallback below
    }
  }
  // Default blocks for entry-bot-lab
  return [
    { ...AVAILABLE_BLOCKS[0], id: "blk_start_default" },
    { ...AVAILABLE_BLOCKS[1], id: "blk_move_default" },
    { ...AVAILABLE_BLOCKS[2], id: "blk_dialog_default" },
  ];
}

const timeLabel = (time: number) =>
  new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(time);

export function EntryPracticeWorkspace({
  lesson,
  work,
  draft,
  locked,
  busy,
  update,
  runAction,
}: {
  lesson: Lesson;
  work: Work;
  draft: WorkDraft;
  locked: boolean;
  busy: boolean;
  update: (next: WorkDraft) => void;
  runAction: (action: WorkAction, focusId: string) => Promise<void>;
}) {
  const [blocks, setBlocks] = useState<EntryBlockItem[]>(() => parseBlocksFromDraft(draft));
  const [isRunning, setIsRunning] = useState(false);
  const [botX, setBotX] = useState(50); // percentage across canvas
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [runMessage, setRunMessage] = useState("");
  const canvasId = useId();
  const blockCounter = useRef(100);

  // Sync draft whenever blocks change
  function applyBlockChanges(nextBlocks: EntryBlockItem[]) {
    setBlocks(nextBlocks);
    const json = buildProjectJson(nextBlocks);
    update({
      ...draft,
      entryProject: json,
      practiceOrder: nextBlocks.map((b) => b.type),
    });
  }

  function addBlock(template: EntryBlockItem) {
    if (locked) return;
    blockCounter.current += 1;
    const newBlock: EntryBlockItem = {
      ...template,
      id: `${template.type}_${blockCounter.current}`,
    };
    applyBlockChanges([...blocks, newBlock]);
  }

  function removeBlock(index: number) {
    if (locked) return;
    const next = [...blocks];
    next.splice(index, 1);
    applyBlockChanges(next);
  }

  function moveBlock(index: number, delta: number) {
    if (locked) return;
    const destination = index + delta;
    if (destination < 0 || destination >= blocks.length) return;
    const next = [...blocks];
    const [target] = next.splice(index, 1);
    next.splice(destination, 0, target);
    applyBlockChanges(next);
  }

  function resetSimulator() {
    setIsRunning(false);
    setBotX(50);
    setSpeechBubble(null);
    setActiveStepIndex(null);
    setRunMessage("");
  }

  // Simulation execution loop
  function handleRun() {
    if (isRunning) {
      resetSimulator();
      return;
    }
    const hasStart = blocks.some((b) => b.type === "when_run_button_click");
    if (!hasStart) {
      setRunMessage("‘시작하기 버튼을 클릭했을 때’ 블록이 연결되어야 실행돼요!");
      return;
    }
    setIsRunning(true);
    setBotX(50);
    setSpeechBubble(null);
    setRunMessage("실행 중…");

    // Execute step by step
    let delay = 0;
    blocks.forEach((block, index) => {
      setTimeout(() => {
        setActiveStepIndex(index);
        if (block.type === "move_direction") {
          setBotX((prev) => Math.min(prev + 12, 85));
        } else if (block.type === "dialog") {
          setSpeechBubble("안녕!");
        }
      }, delay);
      delay += 800;
    });

    setTimeout(() => {
      setIsRunning(false);
      setActiveStepIndex(null);
      setRunMessage("실행을 마쳤어요. 조건을 검증해 보세요!");
    }, delay + 600);
  }

  const draftMatchesValidation =
    work.validation?.passed && work.validation.criteriaResults?.every((r) => r.passed);
  const draftMatchesSubmission =
    work.submission && work.submission.entryProject === draft.entryProject;

  return (
    <div className={styles.practiceGrid}>
      <section className={styles.entryWorkspacePanel} aria-label="엔트리 블록 코딩 작업">
        {work.submission && (
          <div className={styles.submissionNotice}>
            <CheckCircle2 size={20} />
            <div>
              <strong id="submitted-heading" tabIndex={-1}>제출한 작품이 있어요.</strong>
              <p>{timeLabel(work.submission.submittedAt)} 제출 · 수정하는 동안에도 이전 제출본과 완료 기록은 유지돼요.</p>
            </div>
          </div>
        )}

        {/* Live Simulation Canvas */}
        <div className={styles.entryCanvasWrapper} id={canvasId} role="region" aria-label="엔트리 무대">
          <div className={styles.entryCanvasHeader}>
            <div className={styles.entryCanvasTitle}>
              <span className={styles.entryCanvasBadge}>무대</span>
              <span>실행 결과 미리보기</span>
            </div>
            <div className={styles.entrySimControls}>
              <Button
                variant={isRunning ? "destructive" : "default"}
                size="sm"
                onClick={handleRun}
                aria-label={isRunning ? "실행 정지" : "시작하기 실행"}
              >
                {isRunning ? <Square size={14} /> : <Play size={14} />}
                {isRunning ? "정지하기" : "시작하기"}
              </Button>
              <Button variant="outline" size="sm" onClick={resetSimulator} aria-label="무대 초기화">
                <RotateCcw size={14} />초기화
              </Button>
            </div>
          </div>

          <div className={styles.entryStage}>
            {/* Coordinate ground line */}
            <div className={styles.stageGround} />
            {/* EntryBot */}
            <div
              className={styles.entryBotContainer}
              style={{ left: `${botX}%` }}
              aria-label="엔트리봇 캐릭터"
            >
              {speechBubble && <div className={styles.entrySpeechBubble}>{speechBubble}</div>}
              {/* Cute SVG representation of EntryBot */}
              <svg width="68" height="68" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Body */}
                <rect x="25" y="32" width="50" height="42" rx="14" fill="#376FC8" />
                <rect x="29" y="36" width="42" height="34" rx="10" fill="#FFFFFF" />
                {/* Eyes */}
                <circle cx="42" cy="50" r="5" fill="#202B3A" />
                <circle cx="58" cy="50" r="5" fill="#202B3A" />
                <circle cx="44" cy="48" r="1.5" fill="#FFFFFF" />
                <circle cx="60" cy="48" r="1.5" fill="#FFFFFF" />
                {/* Smile */}
                <path d="M44 60 C 48 64, 52 64, 56 60" stroke="#202B3A" strokeWidth="2.5" strokeLinecap="round" />
                {/* Antenna */}
                <path d="M50 32 L50 20" stroke="#376FC8" strokeWidth="4" strokeLinecap="round" />
                <circle cx="50" cy="18" r="5" fill="#F8B133" />
                {/* Ears */}
                <rect x="18" y="44" width="7" height="16" rx="3.5" fill="#376FC8" />
                <rect x="75" y="44" width="7" height="16" rx="3.5" fill="#376FC8" />
                {/* Feet */}
                <rect x="33" y="74" width="12" height="10" rx="4" fill="#202B3A" />
                <rect x="55" y="74" width="12" height="10" rx="4" fill="#202B3A" />
              </svg>
            </div>
          </div>
          {runMessage && <p className={styles.simStatus} role="status">{runMessage}</p>}
        </div>

        {/* Block Palette & Assembly Area */}
        <div className={styles.entryStudio}>
          {/* Palette */}
          <div className={styles.entryPalette}>
            <h4>블록 모음</h4>
            <div className={styles.paletteList}>
              {AVAILABLE_BLOCKS.map((template) => (
                <button
                  key={template.type}
                  type="button"
                  className={`${styles.entryBlock} ${styles[`entryBlock_${template.category}`]}`}
                  disabled={locked}
                  onClick={() => addBlock(template)}
                  aria-label={`${template.label} 추가`}
                >
                  <Plus size={14} />
                  <span>{template.label} {template.paramText && <em>{template.paramText}</em>}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Script Thread */}
          <div className={styles.entryScriptThread}>
            <div className={styles.scriptHeader}>
              <h4>조립된 블록 ({blocks.length}개)</h4>
              <span>위에서 아래로 차례대로 실행돼요</span>
            </div>
            {blocks.length === 0 ? (
              <div className={styles.emptyScript}>
                <p>왼쪽 블록 모음에서 블록을 클릭해 조립해 보세요.</p>
              </div>
            ) : (
              <ol className={styles.entryScriptList}>
                {blocks.map((b, index) => (
                  <li
                    key={b.id}
                    className={`${styles.entryScriptItem} ${styles[`entryBlock_${b.category}`]} ${activeStepIndex === index ? styles.activeBlockStep : ""}`}
                  >
                    <span className={styles.stepNum}>{index + 1}</span>
                    <span className={styles.blockText}>
                      {b.label} {b.paramText && <strong className={styles.paramBubble}>{b.paramText}</strong>}
                    </span>
                    <div className={styles.blockActions}>
                      <button
                        type="button"
                        disabled={locked || index === 0}
                        onClick={() => moveBlock(index, -1)}
                        aria-label="위로 이동"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={locked || index === blocks.length - 1}
                        onClick={() => moveBlock(index, 1)}
                        aria-label="아래로 이동"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => removeBlock(index)}
                        aria-label="블록 삭제"
                        className={styles.deleteBlockBtn}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>

      {/* Validation Panel */}
      <aside className={styles.validationPanel}>
        <span className={styles.iconTile}><CheckCircle2 size={24} /></span>
        <h3>검증하고 제출해요</h3>
        <p>조립한 블록이 과제의 조건을 만족하는지 확인하세요. 검증을 통과한 작품을 제출하면 실습이 완료돼요.</p>

        {lesson.practice.criteria && (
          <ul className={styles.criteriaList}>
            {lesson.practice.criteria.map((criterion) => {
              const res = work.validation?.criteriaResults?.find((r) => r.id === criterion.id);
              const isChecked = res ? res.passed : false;
              return (
                <li key={criterion.id} className={isChecked ? styles.criterionPassed : ""}>
                  <Check size={15} />
                  <span>{criterion.label}</span>
                </li>
              );
            })}
          </ul>
        )}

        <Button
          disabled={locked}
          onClick={() => void runAction({ type: "validate-practice" }, "practice-feedback")}
        >
          {busy ? "검증 중…" : "조건 검증"}
        </Button>

        {work.validation && (
          <p
            id="practice-feedback"
            tabIndex={-1}
            role="status"
            className={work.validation.passed ? styles.feedbackGood : styles.feedbackRetry}
          >
            {work.validation.passed && <Check size={16} />}
            {work.validation.message}
          </p>
        )}

        <Button
          variant="outline"
          disabled={locked || !draftMatchesValidation || !!draftMatchesSubmission}
          onClick={() => void runAction({ type: "submit-practice" }, "submitted-heading")}
        >
          <Send size={16} />
          {draftMatchesSubmission ? "이 작품 제출 완료" : work.submission ? "수정한 작품 제출" : "작품 제출"}
        </Button>
        {!work.submission && draftMatchesValidation && (
          <p className={styles.smallNote}>검증 통과 · 아직 제출 전이에요.</p>
        )}
      </aside>
    </div>
  );
}
