import { expect, test } from "@playwright/test";
import { buildCustomRoute } from "next/dist/lib/build-custom-route";
import { matchHas } from "next/dist/shared/lib/router/utils/prepare-destination";
import nextConfig from "../next.config";
import entryCdn from "../scripts/entryjs-cdn.json";
import { sameWorkContent } from "../src/components/student/work-draft";
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

test("앱 주소의 게임 사본은 embed로 열 때만 격리 헤더를 받고, 작업실 호스트와 주소 모드는 자기 출처를 지킨다", async () => {
  const rule = (await nextConfig.headers!()).find(item => item.source === "/festival-romance.html");
  expect(rule?.headers).toEqual([{ key: "Content-Security-Policy", value: "sandbox allow-scripts allow-forms" }]);
  const route = buildCustomRoute("header", rule!);
  const sandboxed = (pathname: string, host: string, query: Record<string, string>) =>
    new RegExp(route.regex).test(pathname) && !!matchHas({ headers: { host } } as never, query, rule!.has, rule!.missing);
  // A workspace-host frame redirected back to the app would otherwise run allow-same-origin on the app's own origin.
  for (const host of [`${entryCdn.appHost}`, "localhost:3000"]) expect(sandboxed("/festival-romance.html", host, { embed: "1" }), host).toBe(true);
  expect(sandboxed("/festival-romance.html", entryCdn.workspaceHost, { embed: "1" })).toBe(false);
  // Address mode keeps its origin, so its localStorage save still works.
  expect(sandboxed("/festival-romance.html", entryCdn.appHost, {})).toBe(false);
  expect(sandboxed("/festival-lesson.html", entryCdn.appHost, { embed: "1" })).toBe(false);
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

// Firestore need not return map keys in the order the game wrote them.
const reordered = (value: unknown): unknown => Array.isArray(value) ? value.map(reordered)
  : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reordered(item)])) : value;
test("저장된 기록의 키 순서가 달라도 같은 엔딩은 다시 제출하지 않고, 같은 상태는 바뀐 것으로 보지 않는다", () => {
  const played = { ...ended, chapterResults: { ...ended.chapterResults, 1: { completed: true, hearts: 3, questions: { "ch1-q1": { firstAttempt: true, solved: true, conceptTitle: "출력" }, "ch1-q2": { firstAttempt: false, solved: true, conceptTitle: "변수", lastWrongWhy: "이유" } } } }, coldChoices: { "ch2-6": true as const }, seenScenes: { "ch1-1": true as const, "ch1-1:res": true as const, "ch3-7": true as const } };
  const project = festivalProjectFrom(played)!, stored = reordered(project) as FestivalProject;
  expect(JSON.stringify(stored)).not.toBe(JSON.stringify(project));
  expect(festivalStep({ type: "festival:complete", payload: { ...played, outcome: "some" } }, saved({ submission: { id: "s", order: [], submittedAt: 1, reviewProject: stored } }), false)).toEqual({ type: "update", project });
  const draft = emptyWork(lesson).draft;
  expect(sameWorkContent({ ...draft, reviewProject: project }, { ...draft, reviewProject: stored })).toBe(true);
  expect(sameWorkContent({ ...draft, reviewProject: project }, { ...draft, reviewProject: { ...stored, sceneId: "ch3-6" } })).toBe(false);
});

test("저장 형식에 맞지 않는 게임 상태는 버리되 학생 내용 없이 경고를 남긴다", () => {
  const warned: unknown[][] = [], warn = console.warn;
  console.warn = (...args: unknown[]) => { warned.push(args); };
  try {
    expect(festivalStep({ type: "festival:state", payload: { ...ended, nickname: "비밀별명", sceneId: "ch3-new-finale" } }, saved(), false)).toBeNull();
    expect(festivalStep({ type: "festival:state", payload: ended }, saved(), false)).not.toBeNull();
  } finally { console.warn = warn; }
  expect(warned).toHaveLength(1);
  expect(JSON.stringify(warned)).not.toContain("비밀별명");
});

test("교사 미리보기는 게임을 열기만 하고 받은 상태를 남기지 않는다", () => {
  expect(festivalStep({ type: "festival:ready" }, saved(), true)).toEqual({ type: "init" });
  for (const message of [{ type: "festival:state", payload: ended }, { type: "festival:save-request" }, { type: "festival:chapter-complete", payload: { chapterId: 1 } }, { type: "festival:complete", payload: { ...ended, outcome: "some" } }]) {
    expect(festivalStep(message, withChapter1(false), true), message.type).toBeNull();
  }
});
