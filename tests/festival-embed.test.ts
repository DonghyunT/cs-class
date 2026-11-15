import { expect, test } from "@playwright/test";
import { buildCustomRoute } from "next/dist/lib/build-custom-route";
import nextConfig from "../next.config";
import { LESSONS } from "../src/lib/classroom/catalog";
import { emptyWork } from "../src/lib/classroom/progress";
import { FESTIVAL_FRAME, festivalFrame, festivalStep } from "../src/lib/classroom/review/festival-embed";
import { festivalGameState, festivalProjectFrom, initialReviewProject, type FestivalProject } from "../src/lib/classroom/review/project";
import type { Work } from "../src/lib/classroom/types";

const lesson = LESSONS.find(item => item.id === "review-festival")!;
const initial = initialReviewProject("festival") as FestivalProject, start = festivalGameState(initial);
const chapter = { completed: true, hearts: 4, questions: {} };
// The state the game posts once the ending is reached (teaching-materials/festival-romance/src/app.js buildEmbedPayload).
const ended = { ...start, onboarded: true, chapterId: 3, sceneId: "ch3-7", chapterResults: { 1: chapter, 2: chapter, 3: chapter }, totalHearts: 12, endingOutcome: "some" as const };
const saved = (fields: Partial<Work> = {}): Work => ({ ...emptyWork(lesson), ...fields });
const withChapter1 = (completed: boolean) => saved({ draft: { ...emptyWork(lesson).draft, reviewProject: { ...initial, chapterResults: { ...initial.chapterResults, 1: { ...chapter, completed } } } } });

test("게임 iframe은 작업실 호스트가 있을 때만 그 호스트에서 자기 출처로 열린다", () => {
  const local = { src: "/festival-romance.html?embed=1", sandbox: "allow-scripts allow-forms" };
  expect(festivalFrame("/entryjs/workspace.html")).toEqual(local);
  expect(festivalFrame("https://cs-class-sigma.vercel.app/entryjs/workspace.html")).toEqual({ src: "https://cs-class-sigma.vercel.app/festival-romance.html?embed=1", sandbox: "allow-scripts allow-same-origin allow-forms" });
  // The Entry CDN serves only Entry files, so the game stays on the app's own (opaque) copy.
  expect(festivalFrame("https://entry-cdn.test/v/fedcba9876543210-0123456789abcdef/workspace.html")).toEqual(local);
  // The committed address is the local one; only production builds rewrite entry-workspace.json.
  expect(FESTIVAL_FRAME).toEqual(local);
});

test("작업실 호스트는 게임 파일과 /entryjs/만 그대로 보내고 나머지는 앱으로 보낸다", async () => {
  const [rule] = await nextConfig.redirects!();
  const route = buildCustomRoute("redirect", rule, ["/_next"]);
  const moved = (pathname: string) => new RegExp(route.regex).test(pathname);
  for (const pathname of ["/", "/festival-lesson.html", "/classroom/review-festival", "/festival-romance.htmlx", "/festival-romance.html/x", "/x/festival-romance.html"]) expect(moved(pathname), pathname).toBe(true);
  for (const pathname of ["/festival-romance.html", "/entryjs/workspace.html"]) expect(moved(pathname), pathname).toBe(false);
});

test("게임 메시지: 준비되면 init, 상태는 초안, 저장 요청은 저장, 모르는 메시지는 무시", () => {
  expect(festivalStep({ type: "festival:ready" }, saved(), false)).toEqual({ type: "init" });
  expect(festivalStep({ type: "festival:save-request" }, saved(), false)).toEqual({ type: "save" });
  expect(festivalStep({ type: "festival:state", payload: ended }, saved(), false)).toEqual({ type: "update", project: festivalProjectFrom(ended) });
  for (const message of [null, "festival:ready", { type: "festival:init", payload: null }, { type: "festival:state", payload: { ...ended, extra: 1 } }, { type: "festival:state", payload: null }]) {
    expect(festivalStep(message, saved(), false), JSON.stringify(message)).toBeNull();
  }
});

test("장 끝 메시지는 저장된 기록에 그 장이 아직 끝나지 않았을 때만 저장한다", () => {
  expect(festivalStep({ type: "festival:chapter-complete", payload: { chapterId: 1 } }, withChapter1(false), false)).toEqual({ type: "save" });
  // A reopened summary scene sends it again (D2 keeps chapter-end saves to at most 3).
  expect(festivalStep({ type: "festival:chapter-complete", payload: { chapterId: 1 } }, withChapter1(true), false)).toBeNull();
  for (const chapterId of [0, 4, "1", undefined]) expect(festivalStep({ type: "festival:chapter-complete", payload: { chapterId } }, saved(), false), String(chapterId)).toBeNull();
});

test("엔딩 메시지는 아직 제출하지 않은 끝난 상태만 제출 단계로 보낸다", () => {
  const project = festivalProjectFrom(ended)!;
  expect(festivalStep({ type: "festival:complete", payload: { ...ended, outcome: "some" } }, saved(), false)).toEqual({ type: "finish", project });
  // The ending report renders again on every visit; the same state is not submitted twice.
  expect(festivalStep({ type: "festival:complete", payload: { ...ended, outcome: "some" } }, saved({ submission: { id: "s", order: [], submittedAt: 1, reviewProject: project } }), false)).toEqual({ type: "update", project });
  const unfinished = { ...ended, endingOutcome: null };
  expect(festivalStep({ type: "festival:complete", payload: { ...unfinished, outcome: "some" } }, saved(), false)).toEqual({ type: "update", project: festivalProjectFrom(unfinished) });
});

test("교사 미리보기는 게임을 열기만 하고 받은 상태를 남기지 않는다", () => {
  expect(festivalStep({ type: "festival:ready" }, saved(), true)).toEqual({ type: "init" });
  for (const message of [{ type: "festival:state", payload: ended }, { type: "festival:save-request" }, { type: "festival:chapter-complete", payload: { chapterId: 1 } }, { type: "festival:complete", payload: { ...ended, outcome: "some" } }]) {
    expect(festivalStep(message, withChapter1(false), true), message.type).toBeNull();
  }
});
