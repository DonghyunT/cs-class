"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { LessonMode } from "../work-controller";
import { entryFrameOrigin } from "@/lib/classroom/entry-workspace-frame";
import { FESTIVAL_FRAME, festivalStep } from "@/lib/classroom/review/festival-embed";
import { basicReviewCheck, festivalGameState, sameReviewProject, type FestivalProject } from "@/lib/classroom/review/project";
import type { ReviewController } from "./shared";
import styles from "./review.module.css";

export function Festival({ controller, mode = "student" }: { controller: ReviewController; mode?: LessonMode }) {
  const frame = useRef<HTMLIFrameElement>(null);
  // useWork drops edits while an action runs, so states that arrive during the ending's submission wait here.
  const finishing = useRef(false), held = useRef<FestivalProject | null>(null), compared = useRef(false);
  // The ending's save, check and submission: announced while it runs, and offered again by a button if it fails.
  const [ending, setEnding] = useState<"idle" | "finishing" | "failed">("idle");
  // The finish button hides or turns off while it runs, so focus then moves on, as the shared review submit does.
  const [refocus, setRefocus] = useState(0), retryFailed = useRef(false);
  useEffect(() => { if (refocus) (retryFailed.current ? document.getElementById("work-action-error") ?? document.getElementById("work-save-error") : frame.current)?.focus(); }, [refocus]);

  const finish = useCallback(async (project: FestivalProject) => {
    finishing.current = true; setEnding("finishing");
    controller.update({ ...controller.getDraft(), reviewProject: project });
    let done = false;
    try { done = await controller.perform({ type: "validate-practice" }) && await controller.perform({ type: "submit-practice" }); }
    finally {
      finishing.current = false; setEnding(done ? "idle" : "failed");
      const next = held.current; held.current = null;
      if (next) controller.update({ ...controller.getDraft(), reviewProject: next });
    }
    return done;
  }, [controller]);
  async function finishAgain() {
    const project = controller.getDraft().reviewProject;
    // save() first lifts the block a failed save leaves; the game cannot re-send its ending without replaying it.
    retryFailed.current = !(project?.type === "festival" && await controller.save() && await finish(project));
    setRefocus(value => value + 1);
  }

  useEffect(() => {
    const init = () => {
      const target = frame.current, project = controller.getDraft().reviewProject;
      if (!target?.contentWindow) return;
      const origin = entryFrameOrigin(target);
      target.contentWindow.postMessage({ type: "festival:init", payload: project?.type === "festival" ? festivalGameState(project) : null }, origin === "null" ? "*" : origin);
    };
    // Choosing the server's record after a conflict replaces the draft, so the game starts again from it.
    if (controller.remote) compared.current = true;
    else if (compared.current) { compared.current = false; init(); }
    function receive(event: MessageEvent) {
      if (!frame.current || event.source !== frame.current.contentWindow || event.origin !== entryFrameOrigin(frame.current)) return;
      const step = festivalStep(event.data, controller.work, mode === "preview");
      if (step?.type === "init") init();
      // A save in flight carries an older draft (say, before the chapter ended), so save again once it lands; a no-op when clean.
      else if (step?.type === "save") { if (!finishing.current) void controller.save().then(saved => saved && controller.save()); }
      else if (step && finishing.current) held.current = step.project;
      else if (step?.type === "update") controller.update({ ...controller.getDraft(), reviewProject: step.project });
      else if (step?.type === "finish") void finish(step.project);
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [controller, finish, mode]);

  const project = controller.draft.reviewProject;
  const unfinished = mode === "student" && ending === "failed" && project?.type === "festival" && basicReviewCheck(project).passed && !sameReviewProject(project, controller.work.submission?.reviewProject);
  return <>
    {unfinished && <section className={styles.panel} aria-label="엔딩 기록 남기기"><p>엔딩까지 마쳤지만 복습 기록을 아직 남기지 못했어요.</p><div className={styles.actions}><Button id="festival-finish" disabled={controller.busy || controller.actionBlocked || controller.conflict} onClick={() => void finishAgain()}>복습 기록 남기기</Button></div></section>}
    <iframe id="festival-game" ref={frame} src={FESTIVAL_FRAME.src} sandbox={FESTIVAL_FRAME.sandbox} title="내일, 축제에서 만나 게임" />
    <p id="review-action-feedback" tabIndex={-1} role="status" className={styles.srOnly}>{ending === "finishing" ? "엔딩까지 마쳤어요. 복습 기록을 남기는 중이에요." : ending === "idle" && mode === "student" && controller.work.submission ? "복습 기록을 남겼어요." : ""}</p>
  </>;
}
