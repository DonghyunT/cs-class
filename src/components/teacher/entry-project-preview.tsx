"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ENTRY_PALETTE, TRUSTED_SPRITES } from "@/lib/classroom/entry-palette";
import {
  entryBlockCategory,
  formatEntryNode,
  missionById,
  parseProgrammingProject,
  programmingProjectLines,
  type EntryNode,
} from "@/lib/classroom/programming-entry";
import styles from "./teacher.module.css";

const CHANNEL = "cs-class-entryjs";
const WAITING = " 키를 누르거나 오브젝트를 클릭해 보세요. 다 해 봤으면 무대 아래 ‘정지하기’를 눌러 주세요.";

type EntryCategory = (typeof ENTRY_PALETTE)[number]["category"];

const CATEGORY_LABELS: Record<EntryCategory, string> = {
  start: "시작",
  flow: "흐름",
  moving: "움직임",
  looks: "생김새",
  brush: "붓",
  judgement: "판단",
  calc: "계산",
  variable: "자료",
};

function BlockTree({ nodes }: { nodes: EntryNode[] }) {
  if (!nodes.length) return <p className={styles.entryEmptyBranch}>비어 있음</p>;
  return (
    <ol className={styles.entryBlockList}>
      {nodes.map((node, index) => {
        const rawCategory = entryBlockCategory(node.type);
        const category: EntryCategory =
          rawCategory && rawCategory in CATEGORY_LABELS ? (rawCategory as EntryCategory) : "flow";
        const branches = node.statements ?? [];
        return (
          <li key={index} className={styles.entryBlockItem}>
            <div className={styles.entryBlockPill} data-category={category}>
              <span className={styles.entryBlockBadge}>{CATEGORY_LABELS[category]}</span>
              <span className={styles.entryBlockText}>{formatEntryNode(node)}</span>
            </div>
            {branches.length > 0 && (
              <div className={styles.entryBranches} data-category={category}>
                <div className={styles.entryBranch}>
                  <BlockTree nodes={branches[0] ?? []} />
                </div>
                {branches.length > 1 && (
                  <>
                    <div className={styles.entryElseDivider}>아니면</div>
                    <div className={styles.entryBranch}>
                      <BlockTree nodes={branches[1] ?? []} />
                    </div>
                  </>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function EntryProjectPreview({
  missionId,
  missionTitle,
  entryProject,
  workspaceOpen,
  onWorkspaceOpenChange,
  registerClose,
}: {
  missionId: string;
  missionTitle: string;
  entryProject?: string;
  workspaceOpen: boolean;
  onWorkspaceOpenChange: (open: boolean) => void;
  registerClose?: (close: (() => void) | null) => void;
}) {
  const parsed = useMemo(() => parseProgrammingProject(entryProject), [entryProject]);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const loadedKeyRef = useRef<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [bootReady, setBootReady] = useState(false);
  const [phase, setPhase] = useState<"loading" | "ready" | "failed">("loading");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState("무대 아래 ‘시작하기’를 눌러 학생 작품을 실행해 보세요.");

  function openWorkspace() {
    loadedKeyRef.current = null;
    setBootReady(false);
    setPhase("loading");
    setRunning(false);
    setResult("무대 아래 ‘시작하기’를 눌러 학생 작품을 실행해 보세요.");
    onWorkspaceOpenChange(true);
  }

  function closeWorkspace() {
    loadedKeyRef.current = null;
    setBootReady(false);
    setPhase("loading");
    setRunning(false);
    onWorkspaceOpenChange(false);
    requestAnimationFrame(() => toggleRef.current?.focus());
  }

  function reloadWorkspace() {
    loadedKeyRef.current = null;
    setBootReady(false);
    setPhase("loading");
    setRunning(false);
    setResult("무대 아래 ‘시작하기’를 눌러 학생 작품을 실행해 보세요.");
    setAttempt((value) => value + 1);
  }

  useEffect(() => {
    if (!workspaceOpen) {
      loadedKeyRef.current = null;
      registerClose?.(null);
      return;
    }
    const close = () => {
      loadedKeyRef.current = null;
      setBootReady(false);
      setPhase("loading");
      setRunning(false);
      onWorkspaceOpenChange(false);
      requestAnimationFrame(() => toggleRef.current?.focus());
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    registerClose?.(close);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      registerClose?.(null);
    };
  }, [workspaceOpen, onWorkspaceOpenChange, registerClose]);

  useEffect(() => {
    if (!workspaceOpen) return;
    const timer = window.setTimeout(() => {
      setPhase((current) => {
        if (current === "loading") setResult("작업실을 불러오지 못했어요. 다시 불러와 주세요.");
        return current === "loading" ? "failed" : current;
      });
    }, 20000);
    return () => window.clearTimeout(timer);
  }, [workspaceOpen, attempt]);

  useEffect(() => {
    if (!workspaceOpen) return;
    function receive(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow || event.origin !== "null" || event.data?.channel !== CHANNEL) return;
      const message = event.data;
      if (message.type === "ready") setBootReady(true);
      else if (message.type === "loaded") setPhase("ready");
      else if (message.type === "running" && typeof message.running === "boolean") {
        setRunning(message.running);
        if (message.running) {
          const hasAsk = parsed?.order.includes("ask_and_wait");
          const hasKeys =
            !!missionById(missionId)?.keyEvents ||
            parsed?.order.some((type) => type === "when_some_key_pressed" || type === "is_press_some_key");
          setResult(
            hasAsk
              ? "실행 중이에요. 질문에는 무대 안의 입력칸으로 답해 주세요."
              : hasKeys
                ? "실행 중이에요. 아래 방향키 버튼을 누르거나 키보드 방향키를 눌러 보세요."
                : "학생 작품을 실행하고 있어요.",
          );
        }
      } else if (
        message.type === "result" &&
        typeof message.x === "number" &&
        Number.isFinite(message.x) &&
        typeof message.y === "number" &&
        Number.isFinite(message.y) &&
        typeof message.speech === "string"
      ) {
        const finish =
          message.reason === "timeout"
            ? "15초가 지나 실행을 멈췄어요."
            : message.reason === "reset"
              ? "무대를 처음 위치로 돌렸어요."
              : message.reason === "finished"
                ? "실행을 마쳤어요."
                : "실행을 멈췄어요.";
        setResult(
          `${finish} 현재 위치 X ${Math.round(message.x * 100) / 100} · Y ${Math.round(message.y * 100) / 100} · 마지막 말: ${message.speech.slice(0, 80) || "아직 없음"}`,
        );
      } else if (message.type === "waiting") {
        setResult((text) => (text.endsWith(WAITING) ? text : `${text}${WAITING}`));
      } else if (message.type === "waiting-ended") {
        setResult((text) => `${text.endsWith(WAITING) ? text.slice(0, -WAITING.length) : text} ${message.reason === "timeout" ? "15초가 지나 실행을 멈췄어요." : "실행을 멈췄어요."}`);
      } else if (message.type === "error") {
        setPhase("failed");
        setResult("작업실을 불러오지 못했어요. 다시 불러와 주세요.");
      } else if (message.type === "focus-return") {
        loadedKeyRef.current = null;
        setBootReady(false);
        setPhase("loading");
        setRunning(false);
        onWorkspaceOpenChange(false);
        requestAnimationFrame(() => toggleRef.current?.focus());
      }
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [workspaceOpen, onWorkspaceOpenChange, parsed, missionId]);

  useEffect(() => {
    if (!workspaceOpen || !bootReady) return;
    const narrow = window.matchMedia("(max-width: 600px)");
    const fit = () => frameRef.current?.contentWindow?.postMessage({ channel: CHANNEL, type: "stage-size", narrow: narrow.matches }, "*");
    fit();
    narrow.addEventListener("change", fit);
    return () => narrow.removeEventListener("change", fit);
  }, [workspaceOpen, bootReady]);

  useEffect(() => {
    if (!workspaceOpen || !bootReady || !parsed || loadedKeyRef.current === parsed.key) return;
    loadedKeyRef.current = parsed.key;
    frameRef.current?.contentWindow?.postMessage({ channel: CHANNEL, type: "load", project: parsed.project }, "*");
  }, [workspaceOpen, bootReady, parsed]);

  function send(type: string, details: Record<string, unknown> = {}) {
    frameRef.current?.contentWindow?.postMessage({ channel: CHANNEL, type, ...details }, "*");
  }

  if (!parsed) {
    return (
      <ol className={styles.submission}>
        {programmingProjectLines(entryProject).map((line, i) => (
          <li key={i}>
            <span>{i + 1}</span>
            {line}
          </li>
        ))}
      </ol>
    );
  }

  const rawObjects = Array.isArray(parsed.project.objects)
    ? (parsed.project.objects as { id?: string; entity?: { x?: number; y?: number } }[])
    : [];
  const mainEntity = rawObjects.find((item) => item.id === "entrybot")?.entity;
  const objects = [
    {
      id: "entrybot",
      name: "강아지",
      icon: "/entryjs/name-dog.svg",
      x: Math.round(Number(mainEntity?.x ?? 0)) || 0,
      y: Math.round(Number(mainEntity?.y ?? 0)) || 0,
      threads: parsed.threads,
    },
    ...parsed.added.map((item) => ({
      id: item.id,
      name: item.name,
      icon: TRUSTED_SPRITES.find((sprite) => sprite.id === item.sprite)?.file ?? "/entryjs/sprites/ball.svg",
      x: Math.round(item.entity.x) || 0,
      y: Math.round(item.entity.y) || 0,
      threads: item.threads,
    })),
  ];
  const usesKeys =
    !!missionById(missionId)?.keyEvents ||
    parsed.order.some((type) => type === "when_some_key_pressed" || type === "is_press_some_key");

  return (
    <div className={styles.entryPreview}>
      <div className={styles.entryPreviewBar}>
        <div className={styles.entryObjectChips} role="group" aria-label="오브젝트 요약">
          {objects.map((object) => (
            <span key={object.id} className={styles.entryObjectChip}>
              {/* eslint-disable-next-line @next/next/no-img-element -- small static sprite icon */}
              <img src={object.icon} alt="" width={20} height={20} />
              <strong>{object.name}</strong>
              <small>
                X {object.x} · Y {object.y} · 묶음 {object.threads.length}개
              </small>
            </span>
          ))}
        </div>
        <Button
          ref={toggleRef}
          size="sm"
          variant={workspaceOpen ? "outline" : "default"}
          aria-expanded={workspaceOpen}
          onClick={() => (workspaceOpen ? closeWorkspace() : openWorkspace())}
        >
          {workspaceOpen ? <X size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
          {workspaceOpen ? "작업실 닫기" : "작업실에서 실행해 보기"}
        </Button>
      </div>

      {workspaceOpen && (
        <section className={styles.entryRunner} aria-label={`${missionTitle} 실시간 실행 작업실`}>
          <div className={styles.entryRunnerBar}>
            <strong>실시간 실행 작업실 · 학생 제출본은 바뀌지 않아요</strong>
            <div className={styles.entryRunnerActions}>
              <Button
                size="sm"
                variant="outline"
                disabled={phase !== "ready"}
                onClick={() => send("reset-stage")}
              >
                <RotateCcw size={14} aria-hidden="true" />
                무대 처음 위치로
              </Button>
              <Button size="sm" variant="ghost" onClick={reloadWorkspace}>
                다시 불러오기
              </Button>
            </div>
          </div>
          <div
            className={styles.entryRunnerScroll}
            tabIndex={0}
            role="region"
            aria-label="교사 실행 작업실 가로 이동"
            aria-busy={phase === "loading"}
          >
            {phase === "loading" && (
              <p className={styles.entryRunnerLoading} role="status">
                엔트리 작업실을 불러오는 중…
              </p>
            )}
            <iframe
              key={attempt}
              ref={frameRef}
              src={`/entryjs/workspace.html?exercise=programming&mission=${encodeURIComponent(missionId)}${missionById(missionId)?.variables ? "&vars=1" : ""}${missionById(missionId)?.keyEvents ? "&keys=1" : ""}`}
              title={`${missionTitle} 교사 실행 작업실`}
              sandbox="allow-scripts"
              className={styles.entryRunnerFrame}
              inert={phase !== "ready"}
            />
          </div>
          <p className={styles.entryRunnerResult} role="status">
            {result}
          </p>
          {usesKeys && (
            <div className={styles.entryRunnerKeys} aria-label="방향키 실행">
              {[
                ["38", "↑ 위"],
                ["37", "← 왼쪽"],
                ["40", "↓ 아래"],
                ["39", "→ 오른쪽"],
              ].map(([key, label]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  disabled={!running || phase !== "ready"}
                  onClick={() => send("key", { key })}
                >
                  {label}
                </Button>
              ))}
            </div>
          )}
        </section>
      )}

      <div className={styles.entryObjectList}>
        {objects.map((object) => (
          <section key={object.id} className={styles.entryObjectSection} aria-label={`${object.name} 블록 조립도`}>
            {objects.length > 1 && (
              <header className={styles.entryObjectHeader}>
                {/* eslint-disable-next-line @next/next/no-img-element -- small static sprite icon */}
                <img src={object.icon} alt="" width={18} height={18} />
                <h4>{object.name}</h4>
              </header>
            )}
            {object.threads.length === 0 ? (
              <p className={styles.entryEmptyObject}>조립된 블록이 없어요.</p>
            ) : (
              <div className={styles.entryThreads}>
                {object.threads.map((thread, index) => (
                  <div key={index} className={styles.entryThreadCard}>
                    <div className={styles.entryThreadTitle}>
                      {entryBlockCategory(thread[0]?.type ?? "") === "start" || thread[0]?.type === "when_clone_start"
                        ? `시작 묶음 ${index + 1}`
                        : `블록 묶음 ${index + 1}`}
                    </div>
                    <BlockTree nodes={thread} />
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
