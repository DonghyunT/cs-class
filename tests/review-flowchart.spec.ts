import { expect, test, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { db, headers, readyStudent, readyTeacher } from "./emulator";
import type { Work } from "../src/lib/classroom/types";
const id = "review-flowchart", uid = "student-20101";
async function prepare(request: APIRequestContext) {
  await readyStudent(request); await db.collection("csClasses").doc("2-1").update({ openedLessonIds: [id, "review-abstraction", "programming-13"] });
  await db.collection("csWork").doc(`${uid}__${id}`).delete(); await db.collection("csAiUsage").doc(uid).delete();
  return await (await request.get(`/api/classroom/work/${id}`)).json() as Work;
}
async function action(request: APIRequestContext, work: Work, type: string, missionId: string) {
  const response = await request.post(`/api/classroom/work/${id}/action`, { headers, data: { revision: work.revision, action: { type, missionId } } }); expect(response.status()).toBe(200); return await response.json() as Work;
}
const correct = [{ s2: "b-m1-1", s3: "b-m1-2", s4: "b-m1-3" }, { s2: "b-m2-1", s3: "b-m2-2", s4_yes: "b-m2-yes", s4_no: "b-m2-no" }, { s2: "b-m3-in", s3: "b-m3-chk", s4_yes: "b-m3-yes", s4_no: "b-m3-no" }];
test("퍼즐 실행은 실제 선택한 출력 기호를 실행하고 빈 기호를 보정하지 않는다", async ({ page }) => {
  const work = await prepare(page.request);
  if (work.draft.reviewProject?.type !== "flowchart") throw new Error("wrong lesson");
  Object.assign(work.draft.reviewProject, { mission: "2", placements: { "2": { ...correct[1], s2: "b-m2-yes" } } });
  expect((await page.request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } })).status()).toBe(200);
  await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click();
  const run = page.getByRole("region", { name: "순서도 실행" });
  await run.getByRole("button", { name: "실행 준비 / 다시 시작" }).click(); await run.getByRole("button", { name: "한 단계 실행" }).click(); await run.getByRole("button", { name: "한 단계 실행" }).click();
  await expect(run.getByLabel("키 입력값")).toHaveCount(0); await expect(run).toContainText("출력: 탑승 가능");
  await page.locator('select[id$="-s2"]').selectOption(""); await run.getByRole("button", { name: "실행 준비 / 다시 시작" }).click();
  await expect(run).toContainText("빈 기호를 먼저 채워 주세요."); await expect(run.getByRole("button", { name: "한 단계 실행" })).toBeDisabled();
});
test("자유 캔버스 초기화는 퍼즐·기획서·공방을 보존하고 기호만 되돌릴 수 있다", async ({ page }) => {
  const work = await prepare(page.request);
  if (work.draft.reviewProject?.type !== "flowchart") throw new Error("wrong lesson");
  const p = work.draft.reviewProject;
  Object.assign(p, { mission: "free", placements: Object.fromEntries(correct.map((value, i) => [String(i + 1), value])), guideStep: 4, current: "현재 기록", goal: "목표 기록", conditions: ["필수 조건"], core: ["핵심 요소"], cards: [{ id: "plan", type: "sequence", text: "계획 보존", yes: "", no: "" }], nodes: [...p.nodes, { id: "step", shape: "process", text: "추가 처리", x: 80, y: 160 }], edges: [{ from: "start", to: "step", label: "" }, { from: "step", to: "end", label: "" }], pan: { x: 100, y: 100 } });
  expect((await page.request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } })).status()).toBe(200);
  await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click(); await page.getByRole("button", { name: "캔버스 초기화", exact: true }).click();
  await expect(page.getByRole("button", { name: "자유 캔버스", exact: true })).toHaveAttribute("aria-pressed", "true"); await expect(page.getByLabel("현재 상태", { exact: true })).toHaveValue("현재 기록");
  await expect(page.getByLabel("계획 / 판단 조건", { exact: true })).toHaveValue("계획 보존"); await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  const fresh = (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject;
  expect(fresh).toMatchObject({ placements: p.placements, guideStep: 4, current: p.current, goal: p.goal, conditions: p.conditions, core: p.core, cards: p.cards, edges: [], pan: { x: 0, y: 0 } }); expect(fresh.nodes).toHaveLength(2);
  await page.getByRole("button", { name: "편집 되돌리기", exact: true }).click(); await expect(page.getByRole("button", { name: "처리 기호: 추가 처리", exact: true })).toBeVisible();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible(); await page.reload(); await expect(page.getByLabel("현재 상태", { exact: true })).toHaveValue("현재 기록");
  await page.getByRole("button", { name: "처리 기호: 추가 처리", exact: true }).click(); await page.getByRole("button", { name: "선택 기호와 연결 삭제", exact: true }).click();
  await page.getByRole("button", { name: "처리 기호 추가", exact: true }).click(); await page.getByLabel("기호 내용", { exact: true }).fill("알람 켜기");
  await page.getByRole("combobox", { name: "출발 기호", exact: true }).selectOption({ label: "시작" }); await page.getByRole("combobox", { name: "도착 기호", exact: true }).selectOption({ label: "알람 켜기" }); await page.getByRole("button", { name: "이 화살표 연결", exact: true }).click();
  await page.getByRole("combobox", { name: "출발 기호", exact: true }).selectOption({ label: "알람 켜기" }); await page.getByRole("combobox", { name: "도착 기호", exact: true }).selectOption({ label: "종료" }); await page.getByRole("button", { name: "이 화살표 연결", exact: true }).click();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  const beforeMove = (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject.nodes.find((n: { text: string }) => n.text === "알람 켜기");
  const alarm = page.getByRole("button", { name: "처리 기호: 알람 켜기", exact: true }); await alarm.scrollIntoViewIfNeeded(); const box = await alarm.boundingBox(); if (!box) throw new Error("No visible node");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 30, { steps: 4 }); await page.mouse.up();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible(); const moved = (await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject;
  expect(moved.nodes).toHaveLength(3); expect(moved.edges).toHaveLength(2); expect(moved.nodes.find((n: { text: string }) => n.text === "알람 켜기").x).toBeGreaterThan(beforeMove.x);
  await page.reload(); await expect(page.getByRole("button", { name: "처리 기호: 알람 켜기", exact: true })).toBeVisible();
  expect((await (await page.request.get(`/api/classroom/work/${id}`)).json()).draft.reviewProject.nodes).toEqual(moved.nodes);
});
test("세 퍼즐은 오류 관찰·실행·각 제출·재접속 기록을 유지한다", async ({ page }) => {
  await prepare(page.request); await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click();
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.getByRole("button", { name: "작품 검증", exact: true }).click(); await expect(page.getByText("기호의 역할과 예·아니오, 돌아가는 연결을 확인해 주세요.", { exact: true })).toBeVisible();
  for (let i = 0; i < 3; i++) {
    if (i) await page.getByRole("button", { name: i === 1 ? /2\. 선택 퍼즐/ : /3\. 반복 퍼즐/ }).click();
    for (const [slot, block] of Object.entries(correct[i])) await page.locator(`select[id$="-${slot}"]`).selectOption(block);
    await page.getByRole("button", { name: "작품 검증", exact: true }).click(); await page.getByRole("button", { name: "작품 제출", exact: true }).click(); await expect(page.getByText("복습 작품을 저장했어요.")).toBeVisible();
  }
  await page.reload(); await expect(page.getByRole("button", { name: /3\. 반복 퍼즐/ })).toHaveAttribute("aria-pressed", "true");
  const run = page.getByRole("region", { name: "순서도 실행" }); await run.getByRole("button", { name: "실행 준비 / 다시 시작" }).click(); await run.getByRole("button", { name: "한 단계 실행" }).click(); await run.getByRole("button", { name: "한 단계 실행" }).click();
  await run.getByLabel("비밀번호 입력값").fill("1111"); await run.getByRole("button", { name: "입력값 적용" }).click(); await run.getByRole("button", { name: "한 단계 실행" }).click(); await expect(run).toContainText("아니오"); await run.getByRole("button", { name: "한 단계 실행" }).click(); await run.getByRole("button", { name: "한 단계 실행" }).click(); await run.getByLabel("비밀번호 입력값").fill("7777"); await run.getByRole("button", { name: "입력값 적용" }).click(); await run.getByRole("button", { name: "자동 실행", exact: true }).click(); await expect(run.getByText("종료에 도달했어요!", { exact: true })).toBeVisible(); expect(errors).toEqual([]);
  const work = await (await page.request.get(`/api/classroom/work/${id}`)).json(); expect(Object.values(work.missions).filter((m: unknown) => (m as { submission: unknown }).submission)).toHaveLength(3);
});
test("자유 캔버스·공방·키보드·추상화 복사·교사 승인은 수정본과 독립이다", async ({ page, playwright }) => {
  await prepare(page.request); const abstraction: Work = await (await page.request.get("/api/classroom/work/review-abstraction")).json();
  if (abstraction.draft.reviewProject?.type !== "abstraction") throw new Error("wrong lesson");
  Object.assign(abstraction.draft.reviewProject, { current: "지각함", goal: "정시에 등교함", conditions: ["7시 30분에 기상"], core: ["현재 시각"], plans: ["알람 설정"] });
  const saved = await page.request.post("/api/classroom/work/review-abstraction", { headers, data: { revision: abstraction.revision, draft: abstraction.draft } }); expect(saved.status()).toBe(200);
  await page.goto(`/classroom/${id}`); await page.getByRole("tab", { name: /실습/ }).click(); await page.getByRole("button", { name: "예시 공방 (선택)" }).click(); await page.getByRole("button", { name: /4단계: 순차 구조/ }).click(); await page.getByRole("button", { name: "공방 기호를 자유 캔버스에 복사" }).click();
  await page.getByText("추상화 기록이나 예시에서 시작하기", { exact: true }).click(); await page.getByLabel("가져올 추상화 기록").selectOption("draft"); await page.getByRole("button", { name: "추상화 기록 살펴보기" }).click(); await page.getByRole("button", { name: "이 정의를 내 작품에 복사" }).click();
  await expect(page.getByLabel("현재 상태", { exact: true })).toHaveValue("지각함"); await page.getByRole("button", { name: "계획 카드 추가" }).click(); await page.getByLabel("계획 / 판단 조건", { exact: true }).fill("시각을 확인하고 조건에 맞춰 등교 준비와 버스 탑승을 한다");
  const node = page.getByRole("button", { name: "처리 기호: 기상 및 세수하기", exact: true }); await node.focus(); await page.keyboard.press("ArrowRight"); await expect(node).toBeFocused();
  await page.getByRole("button", { name: "AI 설계 리뷰 받기" }).click(); await page.getByRole("button", { name: "선생님 확인 요청" }).click(); await expect(page.getByText(/선생님 확인 대기 중이에요/)).toBeVisible();
  await expect(page.getByText("저장 완료", { exact: true })).toBeVisible(); const work = await (await page.request.get(`/api/classroom/work/${id}`)).json();
  await page.getByLabel("목표 상태", { exact: true }).fill("수정 중인 별도 목표"); await expect(page.getByText("저장 완료", { exact: true })).toBeVisible();
  const teacher = await playwright.request.newContext({ baseURL: "http://localhost:3000" }); await readyTeacher(teacher);
  const approve = await teacher.post(`/api/classroom/students/${uid}/review/${id}`, { headers, data: { requestId: work.review.id, decision: "approve", message: "" } }); expect(approve.status()).toBe(200); const latest = await approve.json(); expect(latest.missions.free.submission.reviewProject.goal).toBe("정시에 등교함"); expect(latest.draft.reviewProject.goal).toBe("수정 중인 별도 목표"); await teacher.dispose();
  await page.reload(); await expect(page.getByLabel("목표 상태", { exact: true })).toHaveValue("수정 중인 별도 목표");
  await page.setViewportSize({ width: 390, height: 844 }); await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: "scratch/review-lessons/flowchart-mobile.png", fullPage: true });
  expect((await page.getByRole("button", { name: "계획 카드 추가" }).boundingBox())?.height).toBeGreaterThanOrEqual(44);
});
test("현재 검증·AI가 수정과 경합할 때 이전 제출을 유지하고 타 반 교사 요청을 거부한다", async ({ request, playwright }) => {
  let work = await prepare(request); if (work.draft.reviewProject?.type !== "flowchart") throw new Error("wrong lesson");
  const p = work.draft.reviewProject; Object.assign(p, { mission: "free", current: "알람 꺼짐", goal: "기상함", conditions: ["7시 전에 기상"], cards: [{ id: "one", type: "sequence", text: "알람을 켠다", yes: "", no: "" }], nodes: [...p.nodes, { id: "alarm", shape: "process", text: "알람 켜기", x: 80, y: 180 }], edges: [{ from: "start", to: "alarm", label: "" }, { from: "alarm", to: "end", label: "" }] });
  work = await (await request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } })).json();
  const ai = await request.post("/api/classroom/ai", { headers, data: { lessonId: id, task: "flow-review", revision: work.revision, requestId: randomUUID(), missionId: "free", input: "fixture-pass" } }); expect(ai.status()).toBe(200); work = (await ai.json()).work;
  work = await action(request, work, "validate-practice", "free"); work = await action(request, work, "submit-practice", "free"); const submission = work.missions!.free.submission;
  if (work.draft.reviewProject?.type === "flowchart") work.draft.reviewProject.nodes[0].x += 40;
  work = await (await request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } })).json(); expect(work.missions!.free.validation?.passed).toBe(true);
  if (work.draft.reviewProject?.type === "flowchart") work.draft.reviewProject.goal = "변경한 목표";
  work = await (await request.post(`/api/classroom/work/${id}`, { headers, data: { revision: work.revision, draft: work.draft } })).json(); expect(work.missions!.free.validation).toBeNull(); expect(work.missions!.free.submission).toEqual(submission);
  expect((await request.post(`/api/classroom/work/${id}/action`, { headers, data: { revision: work.revision, action: { type: "submit-practice", missionId: "free" } } })).status()).toBe(409);
  const teacher = await playwright.request.newContext({ baseURL: "http://localhost:3000" }), session = await readyTeacher(teacher);
  const profile = db.collection("csAccounts").doc(session.uid); await profile.update({ role: "instructor", classIds: ["2-2"] });
  try {
    expect((await teacher.get(`/api/classroom/students/${uid}/work/${id}`)).status()).toBe(403);
    expect((await teacher.post(`/api/classroom/students/${uid}/review/${id}`, { headers, data: { requestId: randomUUID(), decision: "approve", message: "" } })).status()).toBe(403);
  } finally { await profile.update({ role: "teacher", classIds: Array.from({ length: 11 }, (_, index) => `2-${index + 1}`) }); await teacher.dispose(); }
});
