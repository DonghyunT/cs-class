"use client";
import { useEffect, useRef } from "react";
import type { LessonMode } from "../work-controller";
import { entryFrameOrigin } from "@/lib/classroom/entry-workspace-frame";
import { FESTIVAL_FRAME, festivalStep } from "@/lib/classroom/review/festival-embed";
import { festivalGameState, type FestivalProject } from "@/lib/classroom/review/project";
import type { ReviewController } from "./shared";
import styles from "./review.module.css";

export function Festival({ controller, mode = "student" }: { controller: ReviewController; mode?: LessonMode }) {
  const frame = useRef<HTMLIFrameElement>(null);
  // useWork drops edits while an action runs, so states that arrive during the ending's submission wait here.
  const finishing = useRef(false), held = useRef<FestivalProject | null>(null), compared = useRef(false);

  useEffect(() => {
    const init = () => {
      const target = frame.current, project = controller.getDraft().reviewProject;
      if (!target?.contentWindow) return;
      const origin = entryFrameOrigin(target);
      target.contentWindow.postMessage({ type: "festival:init", payload: project?.type === "festival" ? festivalGameState(project) : null }, origin === "null" ? "*" : origin);
    };
    const edit = (project: FestivalProject) => controller.update({ ...controller.getDraft(), reviewProject: project });
    async function finish(project: FestivalProject) {
      finishing.current = true;
      edit(project);
      try { if (await controller.perform({ type: "validate-practice" })) await controller.perform({ type: "submit-practice" }); }
      finally {
        finishing.current = false;
        const next = held.current; held.current = null;
        if (next) edit(next);
      }
    }
    // Choosing the server's record after a conflict replaces the draft, so the game starts again from it.
    if (controller.remote) compared.current = true;
    else if (compared.current) { compared.current = false; init(); }
    function receive(event: MessageEvent) {
      if (!frame.current || event.source !== frame.current.contentWindow || event.origin !== entryFrameOrigin(frame.current)) return;
      const step = festivalStep(event.data, controller.work, mode === "preview");
      if (step?.type === "init") init();
      else if (step?.type === "save") { if (!finishing.current) void controller.save(); }
      else if (step && finishing.current) held.current = step.project;
      else if (step?.type === "update") edit(step.project);
      else if (step?.type === "finish") void finish(step.project);
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [controller, mode]);

  return <>
    <iframe ref={frame} src={FESTIVAL_FRAME.src} sandbox={FESTIVAL_FRAME.sandbox} title="내일, 축제에서 만나 게임" />
    <p id="review-action-feedback" tabIndex={-1} role="status" className={styles.srOnly}>{controller.busy ? "엔딩까지 마쳤어요. 복습 기록을 남기는 중이에요." : mode === "student" && controller.work.submission ? "복습 기록을 남겼어요." : ""}</p>
  </>;
}
