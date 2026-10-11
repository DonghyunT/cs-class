import { expect, test, type APIRequestContext } from "@playwright/test";
import { createHmac, randomUUID } from "node:crypto";
import { db, headers, readyStudent, readyTeacher, studentPassword, loginStudent } from "./emulator";
import type { Work } from "../src/lib/classroom/types";

const id = "review-sandwich", uid = "student-20101";
async function prepare(request: APIRequestContext) {
  await readyStudent(request);
  await db.collection("csClasses").doc("2-1").update({ openedLessonIds: ["sequence-lab", id], currentLessonId: "sequence-lab" });
  await db.collection("csWork").doc(`${uid}__${id}`).delete();
  await db.collection("csAiUsage").doc(uid).delete();
  for (const collection of ["csAiRequests", "csAiCache"]) { const snaps = await db.collection(collection).get(); await Promise.all(snaps.docs.map(doc => doc.ref.delete())); }
  return (await (await request.get(`/api/classroom/work/${id}`)).json()) as Work;
}
async function command(request: APIRequestContext, work: Work, input: string, task = "sandwich-rules", requestId = randomUUID()) {
  const data = { lessonId: id, revision: work.revision, task, input, requestId };
  const response = await request.post("/api/classroom/ai", { headers, data });
  return { response, data, reply: await response.json() };
}
async function action(request: APIRequestContext, work: Work, type: string) {
  const response = await request.post(`/api/classroom/work/${id}/action`, { headers, data: { revision: work.revision, action: { type } } });
  expect(response.status()).toBe(200); return await response.json() as Work;
}
const recipe = ["빵 봉지를 열어", "식빵 두 장을 꺼내", "잼 뚜껑을 열어", "칼에 잼을 묻혀", "식빵 1의 넓은 면에 잼을 발라", "식빵 2를 식빵 1 위에 덮어"];

test("샌드위치 완성 결과는 자동으로 열리고 실제 명령과 시식평을 복사한다", async ({ page, context }, testInfo) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  let work = await prepare(page.request);
  // A failed instruction is observable in chat, but is not a successful recipe step.
  for (const input of ["식빵 꺼내", ...recipe.slice(0, -1)]) {
    const result = await command(page.request, work, input); expect(result.response.status()).toBe(200); work = result.reply.work;
  }
  await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click();
  const input = page.getByLabel("자연어 명령");
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let committed = false;
  await page.route("**/api/classroom/ai", async route => { const response = await route.fetch(); committed = true; await gate; await route.fulfill({ response }); });
  await input.fill(recipe.at(-1)!); await input.press("Enter");
  await expect.poll(() => committed).toBe(true); await input.fill("다음 레시피를 위한 입력"); release();
  const dialog = page.getByRole("dialog", { name: "샌드위치 완성 결과" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "샌드위치 완성 결과" })).toBeFocused();
  await expect(dialog).toContainText("달콤한 딸기잼 샌드위치");
  const written = dialog.getByRole("list", { name: "내가 작성한 알고리즘" });
  await expect(written.getByRole("listitem")).toHaveCount(6);
  for (const text of recipe) await expect(written).toContainText(text);
  await expect(written).not.toContainText("식빵 꺼내");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await dialog.getByRole("button", { name: "알고리즘과 시식평 복사" }).click();
  await expect(dialog.getByRole("status")).toContainText("복사했어요");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("완성 샌드위치: 달콤한 딸기잼 샌드위치");
  expect(copied).toContain("미슐랭 셰프가 인정합니다");
  expect(copied).toContain('2단계: "식빵 두 장을 꺼내"');
  expect(copied).toContain('6단계: "식빵 2를 식빵 1 위에 덮어"');
  expect(copied).not.toContain("다음 레시피를 위한 입력");
  expect(copied).not.toContain("식빵 꺼내");
  expect(copied).not.toContain("OPEN_BAG");
  await dialog.screenshot({ path: testInfo.outputPath("sandwich-result-desktop.png") });
  await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible(); await expect(input).toBeFocused();
  await expect(input).toHaveValue("다음 레시피를 위한 입력");
  const reopen = page.getByRole("button", { name: "완성 결과 다시 보기" });
  await reopen.click(); await expect(dialog).toBeVisible(); await expect(dialog.getByRole("heading", { name: "샌드위치 완성 결과" })).toBeFocused();
  await page.keyboard.press("Escape"); await expect(reopen).toBeFocused();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible(); await page.reload();
  await expect(dialog).not.toBeVisible(); await expect(input).toHaveValue("다음 레시피를 위한 입력"); await expect(reopen).toBeVisible();
  expect(errors).toEqual([]);
});

test("샌드위치 자동 완성은 실습 바깥의 초점을 유지하고 결과를 다시 볼 수 있다", async ({ page }) => {
  let work = await prepare(page.request);
  for (const input of recipe.slice(0, -1)) {
    const result = await command(page.request, work, input); expect(result.response.status()).toBe(200); work = result.reply.work;
  }
  await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click();
  const input = page.getByLabel("자연어 명령");
  await input.fill(recipe.at(-1)!); await input.press("Enter");
  await expect(page.getByText("다시 실행 중", { exact: true })).toBeVisible();
  const leave = page.getByRole("link", { name: "수업 나가기" }); await leave.focus();
  await expect(page.getByText("조립 완료", { exact: true })).toBeVisible();
  await expect(leave).toBeFocused(); await expect(page.getByRole("dialog", { name: "샌드위치 완성 결과" })).not.toBeVisible();
  await page.getByRole("button", { name: "완성 결과 다시 보기" }).click();
  await expect(page.getByRole("dialog", { name: "샌드위치 완성 결과" })).toBeVisible();
});

test("샌드위치 결과 복사 실패는 좁은 창에서도 원문과 닫기 초점을 보존한다", async ({ page }, testInfo) => {
  let work = await prepare(page.request);
  for (const input of recipe) {
    const result = await command(page.request, work, input); expect(result.response.status()).toBe(200); work = result.reply.work;
  }
  await page.addInitScript(() => {
    Object.defineProperty(navigator.clipboard, "writeText", { configurable: true, value: async () => { throw new DOMException("Clipboard denied", "NotAllowedError"); } });
  });
  await page.setViewportSize({ width: 390, height: 640 });
  await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click();
  const reopen = page.getByRole("button", { name: "완성 결과 다시 보기" }); await reopen.click();
  const dialog = page.getByRole("dialog", { name: "샌드위치 완성 결과" });
  await expect(dialog.getByRole("heading", { name: "샌드위치 완성 결과" })).toBeFocused();
  await dialog.getByRole("button", { name: "알고리즘과 시식평 복사" }).click();
  await expect(dialog.getByRole("alert")).toContainText("직접 선택해 복사");
  await expect(dialog.getByLabel("직접 복사할 결과")).toHaveValue(/6단계: "식빵 2를 식빵 1 위에 덮어"/);
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  const bounds = await dialog.boundingBox(); expect(bounds?.width).toBeLessThanOrEqual(390); expect(bounds?.height).toBeLessThanOrEqual(640);
  await dialog.screenshot({ path: testInfo.outputPath("sandwich-result-mobile-copy-failure.png") });
  await page.keyboard.press("Escape"); await expect(reopen).toBeFocused();
});

test("서버 실행·중복 요청·서명 검증·제출본 보존", async ({ request }) => {
  let work = await prepare(request);
  let response = await command(request, work, "식빵 꺼내"); expect(response.response.status()).toBe(200); work = response.reply.work;
  expect(work.draft.reviewProject?.type).toBe("sandwich");
  work = await action(request, work, "validate-practice"); expect(work.validation?.passed).toBe(false);
  work.draft.reviewProject = { type: "sandwich", runId: randomUUID(), input: "", commands: [] };
  const saved = await request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } }); expect(saved.status()).toBe(200); work = await saved.json();
  for (const input of recipe) { response = await command(request, work, input); expect(response.response.status()).toBe(200); work = response.reply.work; }
  const duplicate = await request.post("/api/classroom/ai", { headers, data: response.data }); expect(duplicate.status()).toBe(200); expect((await duplicate.json()).work.revision).toBe(work.revision);
  work = await action(request, work, "validate-practice"); expect(work.validation?.passed).toBe(true);
  work = await action(request, work, "submit-practice"); const submitted = work.submission;
  const forged = structuredClone(work.draft); if (forged.reviewProject?.type === "sandwich") forged.reviewProject.commands[0].actions = ["TAKE_BREAD"];
  expect((await request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: forged } })).status()).toBe(400);
  work.draft.reviewProject = { type: "sandwich", runId: randomUUID(), input: "미완성 명령", commands: [] };
  const reset = await request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } }); expect(reset.status()).toBe(200);
  work = await reset.json(); expect(work.validation).toBeNull(); expect(work.submission).toEqual(submitted);
  const reconnected = await (await request.get(`/api/classroom/work/${id}`)).json(); expect(reconnected.draft.reviewProject.input).toBe("미완성 명령");
});
test("모호하다는 AI 판정에 섞인 실행 명령은 저장하지 않고 초안을 보존한다", async ({ request }) => {
  let work = await prepare(request);
  if (work.draft.reviewProject?.type !== "sandwich") throw Error("wrong lesson");
  work.draft.reviewProject.input = "이거 발라 줘";
  const saved = await request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } });
  expect(saved.status()).toBe(200); work = await saved.json();
  const result = await command(request, work, "fixture-clarify-actions", "sandwich-command");
  expect(result.response.status()).toBe(502); expect(result.reply.code).toBe("AI_FORMAT");
  const latest = await (await request.get(`/api/classroom/work/${id}`)).json();
  expect(latest.revision).toBe(work.revision); expect(latest.draft).toEqual(work.draft);
  expect((await db.collection("csAiUsage").doc(uid).get()).data()?.failures).toBe(1);
  expect((await db.collection("csAiCache").get()).empty).toBe(true);
});

test("AI 캐시·중복은 차감하지 않고 실패·분당·일일 경계를 적용", async ({ request }) => {
  const work = await prepare(request);
  const first = await command(request, work, "알아서 만들어", "sandwich-command"); expect(first.response.status()).toBe(200);
  const cached = await command(request, work, "알아서 만들어", "sandwich-command"); expect(cached.response.status()).toBe(200); expect(cached.reply.reused).toBe(true);
  expect((await db.collection("csAiUsage").doc(uid).get()).data()?.count).toBe(1);
  const broken = await command(request, work, "fixture-malformed", "sandwich-command"); expect(broken.response.status()).toBe(502);
  expect((await db.collection("csAiUsage").doc(uid).get()).data()?.count).toBe(2);
  const now = Date.now(), day = new Date(now + 9 * 3600000).toISOString().slice(0,10);
  await db.collection("csAiUsage").doc(uid).set({ day, count: 15, calls: Array(15).fill(now) });
  expect((await command(request, work, "분당 제한 확인", "sandwich-command")).response.status()).toBe(429);
  await db.collection("csAiUsage").doc(uid).set({ day, count: 70, calls: [] });
  expect((await command(request, work, "일일 제한 확인", "sandwich-command")).response.status()).toBe(429);
  expect((await command(request, work, "빵 봉지를 열어", "sandwich-rules")).response.status()).toBe(200);
});
test("진행 중 중복·요청 ID 충돌·늦은 AI 응답은 새 초안을 덮어쓰지 않는다", async ({ request }) => {
  const work = await prepare(request), requestId = randomUUID();
  const data = { lessonId: id, revision: work.revision, task: "sandwich-command", input: "fixture-slow", requestId };
  const pending = request.post("/api/classroom/ai", { headers, data });
  await expect.poll(async () => (await db.collection("csAiUsage").doc(uid).get()).data()?.count).toBe(1);
  const duplicate = await request.post("/api/classroom/ai", { headers, data }); expect(duplicate.status()).toBe(409); expect((await duplicate.json()).code).toBe("AI_PENDING");
  const conflict = await request.post("/api/classroom/ai", { headers, data: { ...data, input: "다른 요청" } }); expect(conflict.status()).toBe(409); expect((await conflict.json()).code).toBe("REQUEST_CONFLICT");
  if (work.draft.reviewProject?.type === "sandwich") work.draft.reviewProject.input = "새로 작성한 명령";
  const saved = await request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } }); expect(saved.status()).toBe(200);
  const delayed = await pending; expect(delayed.status()).toBe(409); expect((await delayed.json()).code).toBe("AI_STALE");
  const latest = await (await request.get(`/api/classroom/work/${id}`)).json(); expect(latest.draft.reviewProject.input).toBe("새로 작성한 명령"); expect(latest.draft.reviewProject.commands).toEqual([]);
  expect((await db.collection("csAiUsage").doc(uid).get()).data()?.count).toBe(1);
});

test("AI 준비·응답 대기 중 작성한 다음 입력과 서버 명령을 함께 보존한다", async ({ page }) => {
  await prepare(page.request); await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click();
  const input = page.getByLabel("자연어 명령");
  let releaseSave!: () => void;
  const gate = new Promise<void>(resolve => { releaseSave = resolve; });
  let saving = false;
  await page.route(`**/api/classroom/work/${id}`, async route => {
    if (route.request().method() === "POST" && !saving) { saving = true; await gate; }
    await route.continue();
  });
  await input.fill("빵 봉지를 열어"); await page.getByRole("button", { name: "실행" }).click();
  await expect.poll(() => saving).toBe(true); await input.fill("준비 중 새로 쓴 명령"); releaseSave();
  await expect(page.getByRole("heading", { name: "알고리즘 실행 기록", exact: true })).toBeVisible();
  await expect(page.locator("ol").filter({ hasText: "빵 봉지를 열어" })).toBeVisible();
  await expect(input).toHaveValue("준비 중 새로 쓴 명령"); await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await input.fill("fixture-slow"); await page.getByRole("button", { name: "실행" }).click();
  await expect(page.getByRole("button", { name: "명령을 해석하고 있어요…" })).toBeVisible(); await input.fill("응답 중 다음 명령");
  await expect(page.getByRole("button", { name: "실행" })).toBeEnabled();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible(); await page.reload();
  await expect(input).toHaveValue("응답 중 다음 명령");
  const work = await (await page.request.get(`/api/classroom/work/${id}`)).json(); expect(work.draft.reviewProject.commands).toHaveLength(1);
});

test("150개 명령에서 외부 호출 전에 제한하고 입력·기존 기록을 보존한다", async ({ request }) => {
  const work = await prepare(request), project = work.draft.reviewProject;
  if (project?.type !== "sandwich") throw new Error("wrong lesson");
  project.input = "계속 작성 중";
  project.commands = Array.from({ length: 150 }, () => {
    const command = { id: randomUUID(), text: "빵 봉지를 열어", actions: ["OPEN_BAG"], source: "rules" as const };
    const proof = createHmac("sha256", "demo-only-command-proof").update(JSON.stringify([uid, project.runId, command.id, command.text, command.actions, command.source])).digest("hex");
    return { ...command, proof };
  });
  await db.collection("csWork").doc(`${uid}__${id}`).set(work);
  const result = await command(request, work, "식빵 꺼내", "sandwich-command"); expect(result.response.status()).toBe(400); expect(result.reply.code).toBe("COMMAND_LIMIT");
  expect((await db.collection("csAiUsage").doc(uid).get()).exists).toBe(false);
  const latest = await (await request.get(`/api/classroom/work/${id}`)).json(); expect(latest.draft.reviewProject.commands).toHaveLength(150); expect(latest.draft.reviewProject.input).toBe("계속 작성 중");
});

test("명령 저장 뒤 응답만 유실되어도 복구 GET은 실행 기록과 다음 입력을 유지한다", async ({ page }) => {
  await prepare(page.request); await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click();
  let committed = false, release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/classroom/ai", async route => { await route.fetch(); committed = true; await gate; await route.abort("failed"); });
  const input = page.getByLabel("자연어 명령"); await input.fill("빵 봉지를 열어"); await page.getByRole("button", { name: "실행" }).click();
  await expect.poll(() => committed).toBe(true); await input.fill("응답 유실 뒤 다음 입력"); release();
  await expect(page.getByRole("alert").filter({ hasText: "연결하지 못했어요" })).toBeVisible();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible(); await page.reload(); await expect(input).toHaveValue("응답 유실 뒤 다음 입력");
  const work = await (await page.request.get(`/api/classroom/work/${id}`)).json(); expect(work.draft.reviewProject.commands).toHaveLength(1);
});
test("복습 카드·키보드·44px·명령 실패·재접속·교사 상세", async ({ page, browser }) => {
  let work = await prepare(page.request);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/student/lessons");
  const card = page.locator("article").filter({ has: page.getByRole("heading", { name: "알고리즘 설계", exact: true }) });
  await expect(card).toContainText("복습 수업"); await expect(card).not.toContainText("0%"); await card.getByRole("button", { name: "다시 둘러보기" }).click();
  await expect(page.getByText("성적에 반영하지 않아요", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: /실습/ }).click();
  const input = page.getByLabel("자연어 명령"); await input.fill("식빵 꺼내"); await page.getByRole("button", { name: "실행" }).click();
  await expect(page.getByText("오류: 빵 봉지가 닫혀 있습니다!", { exact: false }).first()).toBeVisible();
  await input.fill("쓰다가 멈춘 명령"); await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  await page.reload(); await expect(input).toHaveValue("쓰다가 멈춘 명령");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "scratch/review-lessons/sandwich-mobile.png", fullPage: true });
  const bounds = await page.getByRole("button", { name: "실행" }).boundingBox(); expect(bounds?.height).toBeGreaterThanOrEqual(44);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await input.focus(); await page.keyboard.press("Tab"); await expect(page.getByRole("button", { name: "실행" })).toBeFocused(); expect(errors).toEqual([]);
  // Submit a separate recipe using the same real server contract.
  work = await (await page.request.get(`/api/classroom/work/${id}`)).json();
  for (const text of recipe) { const result = await command(page.request, work, text); expect(result.response.status()).toBe(200); work = result.reply.work; }
  work = await action(page.request, work, "validate-practice"); await action(page.request, work, "submit-practice");
  const teacher = await browser.newContext(); await readyTeacher(teacher.request);
  const list = await (await teacher.request.get(`/api/classroom/teacher?classId=2-1&lessonId=${id}`)).json(); const row = list.students.find((student: { uid: string }) => student.uid === uid); expect(row.work.draft).toBeUndefined(); expect(row.work.submission.reviewProject).toBeUndefined();
  const detail = await teacher.request.get(`/api/classroom/students/${uid}/work/${id}`); expect(detail.status()).toBe(200); expect((await detail.json()).submission.reviewProject.commands.length).toBeGreaterThan(0);
  expect((await page.request.get(`/api/classroom/students/${uid}/work/${id}`)).status()).toBe(403);
  await teacher.close();
  expect((await loginStudent(page.request, studentPassword)).status()).toBe(200);
});
