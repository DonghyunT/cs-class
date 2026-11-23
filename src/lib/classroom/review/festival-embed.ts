// The classroom side of the festival game's embed contract (teaching-materials/festival-romance/src/app.js).
import { ENTRY_WORKSPACE_SRC } from "@/lib/classroom/entry-workspace-frame";
import type { Work } from "../types";
import { basicReviewCheck, festivalProjectFrom, projectSnapshot, sameReviewProject, type FestivalProject, type ReviewProject } from "./project";

// The game rides on the Entry workspace host (D3) when a production build opens the workspace there: that host is another
// site, so the game keeps its origin and Chrome's cache. Anywhere else the app's own copy stays opaque, since
// allow-same-origin there would let the game script the app with the student's cookies.
export function festivalFrame(entrySrc: string, preview = false) {
  const host = entrySrc.startsWith("/") ? null : new URL(entrySrc);
  const query = preview ? "?embed=1&mode=teacher" : "?embed=1";
  return host?.pathname === "/entryjs/workspace.html"
    ? { src: `${host.origin}/festival-romance.html${query}`, sandbox: "allow-scripts allow-same-origin allow-forms" }
    : { src: `/festival-romance.html${query}`, sandbox: "allow-scripts allow-forms" };
}
export const FESTIVAL_FRAME = festivalFrame(ENTRY_WORKSPACE_SRC);
export const FESTIVAL_PREVIEW_FRAME = festivalFrame(ENTRY_WORKSPACE_SRC, true);

export type FestivalStep = { type: "init" } | { type: "save" } | { type: "update" | "finish"; project: FestivalProject } | null;

// What one game message asks of the classroom, given the work the server last confirmed.
export function festivalStep(message: unknown, saved: Work, preview: boolean, current?: ReviewProject | null): FestivalStep {
  const { type, payload } = (typeof message === "object" && message ? message : {}) as { type?: unknown; payload?: unknown };
  if (type === "festival:ready") return { type: "init" };
  // The teacher preview plays the game but keeps nothing it sends.
  if (preview) return null;
  if (type === "festival:save-request") return { type: "save" };
  if (type === "festival:chapter-complete") {
    const id = (payload as { chapterId?: unknown } | null)?.chapterId, stored = saved.draft.reviewProject;
    if ((id !== 1 && id !== 2 && id !== 3) || stored?.type !== "festival") return null;
    if (!stored.chapterResults[id].completed) return { type: "save" };
    if (current?.type !== "festival") return null;
    const curSnap = projectSnapshot(current) as FestivalProject, savedSnap = projectSnapshot(stored) as FestivalProject;
    const changed = JSON.stringify(curSnap.chapterResults[id]) !== JSON.stringify(savedSnap.chapterResults[id])
      || JSON.stringify(curSnap.coldChoices) !== JSON.stringify(savedSnap.coldChoices);
    return changed ? { type: "save" } : null;
  }
  if (type !== "festival:state" && type !== "festival:complete") return null;
  const state = typeof payload === "object" && payload ? { ...payload } as Record<string, unknown> : null;
  // The saved format holds the ending itself (endingOutcome), not the report's outcome.
  if (state && type === "festival:complete") delete state.outcome;
  const project = festivalProjectFrom(state);
  // A game edit outside the schema would otherwise stop saving while the rail still says 저장 완료.
  if (!project) { console.warn(`festival: dropped a ${type} message that does not fit the saved format`); return null; }
  // The ending report renders again on every visit; a state already submitted only updates the draft.
  return type === "festival:complete" && basicReviewCheck(project).passed && !sameReviewProject(project, saved.submission?.reviewProject) ? { type: "finish", project } : { type: "update", project };
}
