import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import ch1 from "../teaching-materials/festival-romance/src/chapters/ch1.cjs";
import ch2 from "../teaching-materials/festival-romance/src/chapters/ch2.cjs";
import ch3 from "../teaching-materials/festival-romance/src/chapters/ch3.cjs";
import gameState from "../teaching-materials/festival-romance/src/state.js";
import gameModels from "../teaching-materials/festival-romance/src/models.js";
import { LESSONS, RELEASED_LESSONS } from "../src/lib/classroom/catalog";
import { emptyWork, progressFor } from "../src/lib/classroom/progress";
import { basicReviewCheck, festivalGameState, festivalProjectFrom, initialReviewProject, reviewProjectSchema } from "../src/lib/classroom/review/project";

const lesson = LESSONS.find(item => item.id === "review-festival")!;
const ids = [1, 2, 3, 4].map(n => (c: number) => `ch${c}-q${n}`);
const question = (id: string) => ({ conceptTitle: `개념 ${id}`, firstAttempt: id.endsWith("q1"), solved: true, lastWrongWhy: "이유" });
const chapter = (c: 1 | 2 | 3, completed = true) => ({ completed, hearts: 3, questions: Object.fromEntries(ids.map(f => [f(c), question(f(c))])) });
// The shape the game posts as festival:state once the last chapter is done.
const finished = () => ({
  version: 2, nickname: "여울", variant: "girl", onboarded: true, chapterId: 3, sceneId: "ch3-7",
  story: { ticketName: "여울", meetingTime: "17:00", replyKey: "warm", booth: "photo", boothAllowed: true, boothOpen: false, route: "indoor", prize: "small", polygon: 4 },
  chapterResults: { 1: chapter(1), 2: chapter(2), 3: chapter(3) },
  activeRuns: { 3: { missedThisRun: { "ch3-q1": true }, solvedThisRun: { "ch3-q2": question("ch3-q2") } } },
  coldChoices: { "ch1-2": true }, seenScenes: { "ch1-1": true, "ch1-1:res": true, "ch1-2:reply:warm": true },
  totalHearts: 9, maxHearts: 12, hasColdRejection: true, endingOutcome: "friend",
});

test("festival 수업은 퀴즈 없이 실습에서 시작하고 제출 하나로 완료된다", async () => {
  // solutions.ts is server-only; the marker package only throws outside Next, so stub it for this unit test.
  require.cache[require.resolve("server-only")] = { exports: {} } as NodeJS.Module;
  const { getLessonSolution } = await import("../src/lib/server/solutions");
  expect(lesson).toMatchObject({ mode: "review", title: "내일, 축제에서 만나", category: "정보 1~3단원 복습 게임", concepts: [], quiz: [], practice: { type: "festival" } });
  expect(RELEASED_LESSONS).toContain(lesson);
  expect(emptyWork(lesson).draft.stage).toBe("practice");
  expect(emptyWork(lesson).draft.reviewProject).toEqual(initialReviewProject("festival"));
  expect(progressFor(lesson, { conceptSolved: [], quizSolved: [], updatedAt: 1, submission: null }).status).toBe("in-progress");
  expect(progressFor(lesson, { conceptSolved: [], quizSolved: [], updatedAt: 1, submission: { id: "s" } }).status).toBe("completed");
  expect(getLessonSolution("review-festival")).toMatchObject({ lessonId: "review-festival", quizAnswers: {}, conceptAnswers: {} });
});

test("스키마는 게임이 보내는 상태를 받고 festivalGameState는 type만 뺀다", () => {
  const project = festivalProjectFrom(finished())!;
  expect(project.type).toBe("festival");
  expect(reviewProjectSchema.safeParse(project).success).toBe(true);
  expect(festivalGameState(project)).toEqual(finished());
  expect(reviewProjectSchema.safeParse(initialReviewProject("festival")).success).toBe(true);
});

test("스키마는 모르는 키, 긴 문자열, 많은 장면 id를 거절한다", () => {
  const bad = (patch: object) => festivalProjectFrom({ ...finished(), ...patch });
  expect(bad({ extra: 1 })).toBeNull();
  expect(bad({ nickname: "가".repeat(13) })).toBeNull();
  expect(bad({ nickname: "" })).toBeNull();
  expect(bad({ chapterId: 4 })).toBeNull();
  expect(bad({ totalHearts: 13 })).toBeNull();
  expect(bad({ endingOutcome: "love" })).toBeNull();
  expect(bad({ story: { ...finished().story, ticketName: "가".repeat(13) } })).toBeNull();
  expect(bad({ seenScenes: { ["x".repeat(65)]: true } })).toBeNull();
  expect(bad({ seenScenes: Object.fromEntries(Array.from({ length: 401 }, (_, i) => [`s${i}`, true])) })).toBeNull();
  expect(bad({ chapterResults: { ...finished().chapterResults, 1: { ...chapter(1), hearts: 5 } } })).toBeNull();
  expect(bad({ chapterResults: { ...finished().chapterResults, 1: { ...chapter(1), questions: { "q": { ...question("q"), conceptTitle: "가".repeat(121) } } } } })).toBeNull();
  expect(festivalProjectFrom(null)).toBeNull();
});

// The game's UMD modules; TypeScript's guesses at their plain-JS signatures are too narrow for a fixture driven through them.
type Game = Record<string, (...args: unknown[]) => unknown>;
type GameState = Record<string, unknown> & { coldChoices: Record<string, boolean>; chapterResults: Record<number, { completed: boolean }> };
const S = gameState as unknown as Game, M = gameModels as unknown as Game;
type Scene = { id: string; questionId?: string; conceptTitle?: string; heartChoice?: boolean; choices?: { key?: string }[]; endings?: object };
const chapters = ([ch1, ch2, ch3] as { id: 1 | 2 | 3; scenes: Scene[] }[]);
// The fields app.js buildEmbedPayload sends, read from its source so a renamed or added field fails here too.
const sent = [...readFileSync("teaching-materials/festival-romance/src/app.js", "utf8").match(/function buildEmbedPayload\(\)\{[\s\S]*?return \{([\s\S]*?)\n    \};/)![1].matchAll(/^\s*(\w+)/gm)].map(match => match[1]);
function embedPayload(state: object, sceneIds: string[]) {
  const clean = S.sanitizeGameState(state, sceneIds) as GameState, totalHearts = S.countTotalHearts(clean), cold = S.hasColdRejection(clean);
  const computed: Record<string, unknown> = { version: 2, totalHearts, maxHearts: 12, hasColdRejection: cold, endingOutcome: clean.chapterResults[3].completed ? M.computeEndingOutcome(totalHearts, cold) : null };
  return Object.fromEntries(sent.map(key => [key, key in computed ? computed[key] : clean[key]]));
}

test("게임이 직접 정리한 상태(sanitizeGameState)는 어느 장면에서 보내도 저장 형식에 맞는다", () => {
  const sceneIds = chapters.flatMap(chapter => chapter.scenes.map(scene => scene.id));
  // Played through with the game's own state functions: every key it marks seen, every question missed once, and inputs
  // past the game's caps, so the game's truncation (not this fixture) decides what reaches the schema.
  const state = S.createStoryState() as GameState;
  S.applyIdentity(state, "가".repeat(20));
  state.variant = "girl";
  for (const chapter of chapters) {
    S.startChapterRun(state, chapter.id);
    for (const scene of chapter.scenes) {
      for (const key of [scene.id, `${scene.id}:res`, ...(scene.choices ?? []).map(choice => `${scene.id}:reply:${choice.key}`), ...Object.keys(scene.endings ?? {}).flatMap(outcome => [`${scene.id}:${outcome}`, `${scene.id}:${outcome}:cold`])]) S.markSceneSeen(state, key);
      if (scene.heartChoice) state.coldChoices[scene.id] = true;
      if (!scene.questionId) continue;
      S.recordQuestionAttempt(state, chapter.id, scene.questionId, { correct: false, conceptTitle: `${scene.conceptTitle}${"가".repeat(200)}`, wrongWhy: "이유".repeat(400) });
      S.recordQuestionAttempt(state, chapter.id, scene.questionId, { correct: true, conceptTitle: scene.conceptTitle });
    }
    S.commitChapterRun(state, chapter.id, chapter.scenes.filter(scene => scene.questionId).map(scene => ({ questionId: scene.questionId, conceptTitle: scene.conceptTitle })));
  }
  for (const chapter of chapters) for (const scene of chapter.scenes) {
    const project = festivalProjectFrom(embedPayload({ ...state, chapterId: chapter.id, sceneId: scene.id }, sceneIds));
    expect(project?.sceneId, scene.id).toBe(scene.id);
  }
  expect(festivalProjectFrom(embedPayload(S.createStoryState() as GameState, sceneIds))).not.toBeNull();
});

test("모든 장면을 본 가장 큰 상태도 저장 한도보다 한참 작다", () => {
  const key = (i: number) => `ch${(i % 3) + 1}-${i}:reply:${"k".repeat(40)}`;
  const big = { ...finished(), seenScenes: Object.fromEntries(Array.from({ length: 400 }, (_, i) => [key(i), true])), coldChoices: Object.fromEntries(Array.from({ length: 100 }, (_, i) => [key(i), true])) };
  const project = festivalProjectFrom(big)!;
  expect(project).not.toBeNull();
  expect(Buffer.byteLength(JSON.stringify({ stage: "practice", reviewProject: project }), "utf8")).toBeLessThan(80000);
});

test("완료 조건은 3장을 모두 끝내 엔딩이 정해진 것이다", () => {
  const check = (patch: object) => basicReviewCheck(festivalProjectFrom({ ...finished(), ...patch })!).passed;
  expect(check({})).toBe(true);
  expect(check({ endingOutcome: null })).toBe(false);
  expect(basicReviewCheck(initialReviewProject("festival")).passed).toBe(false);
});
