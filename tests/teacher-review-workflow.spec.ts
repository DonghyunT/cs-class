import { createHash, randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { LESSONS } from "../src/lib/classroom/catalog";
import { buildProgrammingProject } from "../src/lib/classroom/programming-entry";
import { emptyWork, latestSubmissionAtFor, submissionCountFor } from "../src/lib/classroom/progress";
import type { AbstractionProject } from "../src/lib/classroom/review/project";
import type { Lesson, TeacherDashboard, Work } from "../src/lib/classroom/types";
import { passwordDigest } from "../src/lib/server/temporary-password.mjs";
import { testEnv } from "../scripts/local-test-env.mjs";
import { auth, db, headers, localOnly, readyTeacher, studentPassword } from "./emulator";

const ordinary = LESSONS.find(lesson => lesson.id === "sequence-lab")!;
const programming = LESSONS.find(lesson => lesson.id === "programming-13")!;
const review = LESSONS.find(lesson => lesson.id === "review-abstraction")!;
const flowchart = LESSONS.find(lesson => lesson.id === "review-flowchart")!;
const lessons = [ordinary, programming, review, flowchart];
const studentIds = ["20171", "20172", "20173", "20174", "20175"];
const uids = studentIds.map(id => `teacher-review-workflow-${id}`);
const originalClasses = new Map<string, FirebaseFirestore.DocumentData | undefined>();
let teacherBefore: { uid: string; role: string; classIds: string[] } | null = null;
let ownsAccounts = false;
let failTeacherRead = false;

const workRef = (index: number, lesson = review) => db.doc(`csWork/${uids[index]}__${lesson.id}`);
const row = (page: Page, index: number) => page.locator("tbody tr").filter({ hasText: studentIds[index] });
const pendingOnly = (page: Page) => page.getByRole("checkbox", { name: "확인 요청만", exact: true });
const refresh = (page: Page) => page.getByRole("button", { name: "수업 새로고침", exact: true });
const viewer = (page: Page, index: number) => page.getByRole("dialog", { name: `${studentIds[index]} 학생의 제출 작품`, exact: true });
const reviewPath = (index: number) => `/api/classroom/students/${uids[index]}/review/${review.id}`;

function requestedWork(index: number, goal = `요청 당시 목표 ${studentIds[index]}`): Work {
  const work = emptyWork(review);
  const project = work.draft.reviewProject as AbstractionProject;
  Object.assign(project, { view: "workbook", current: "합성 현재 상태", goal, conditions: ["합성 조건"], core: ["합성 핵심"], plans: ["합성 계획"] });
  work.revision = 1;
  work.updatedAt = 1000;
  work.review = { id: randomUUID(), project: structuredClone(project), status: "pending", message: "합성 확인 요청", requestedAt: 1000 + index };
  project.goal = `요청 후 수정 중인 목표 ${studentIds[index]}`;
  return work;
}

function recentWork(lesson: Lesson, index: number): Work {
  const work = emptyWork(lesson);
  const times = [2000, 3000, 4000, 3000, null];
  const submittedAt = times[index];
  work.updatedAt = index === 0 ? 900_000 : 1000;
  const submission = (id: string, time: number) => ({ id, order: [], submittedAt: time, ...(lesson.practice.type === "programming" ? { entryProject: buildProgrammingProject() } : {}) });
  if (lesson.id === ordinary.id) {
    work.submission = submittedAt === null ? null : submission(`main-${index}`, submittedAt);
    work.missions = { name: { validation: null, submission: submission("ignored-mission", 990_000) } };
  } else {
    const missionIds = lesson.id === programming.id ? ["name", "average", "keys", "move", "unknown"] : ["1", "free", "3", "1", "guide"];
    work.missions = { [missionIds[index]]: { validation: null, submission: submission(`mission-${index}`, submittedAt ?? 990_000) } };
    if (index === 0) work.missions[lesson.id === programming.id ? "unknown" : "guide"] = { validation: null, submission: submission("ignored-latest", 990_000) };
    if (index === 2) work.missions[lesson.id === programming.id ? "multiply" : "2"] = { validation: null, submission: submission("earlier-known", 1000) };
  }
  return work;
}

async function choose(page: Page, label: string, value: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  const option = page.getByRole("option", { name: value, exact: true });
  await expect(option).toBeVisible();
  await option.click();
}

async function setCurrent(lesson: Lesson) {
  await db.doc("csClasses/2-1").update({ currentLessonId: lesson.id });
}

async function openPending(page: Page) {
  await page.goto(`/teacher/students?classId=2-1&lessonId=${review.id}&review=pending`);
  await expect(pendingOnly(page)).toBeChecked();
  await expect(page.locator("tbody tr")).toHaveCount(2);
}

async function openViewer(page: Page, index: number) {
  await row(page, index).getByRole("button", { name: `${studentIds[index]} 제출 작품 보기`, exact: true }).click();
  await expect(viewer(page, index)).toBeVisible();
}

async function waitWithoutTeacherRefresh(page: Page) {
  await page.clock.fastForward(60_001);
}

async function focusInside(page: Page, index: number) {
  await expect.poll(() => viewer(page, index).evaluate(element => element.contains(document.activeElement))).toBe(true);
}

test.beforeAll(async ({ request }) => {
  await localOnly(request);
  for (const classId of ["2-1", "2-2"]) originalClasses.set(classId, (await db.doc(`csClasses/${classId}`).get()).data());
  // Own only these namespaced QA accounts; never overwrite a pre-existing account.
  for (const uid of uids) {
    expect((await db.doc(`csAccounts/${uid}`).get()).exists).toBe(false);
    await auth.getUser(uid).then(() => { throw new Error(`QA account already exists: ${uid}`); }, error => { if ((error as { code: string }).code !== "auth/user-not-found") throw error; });
  }
  try {
    const user = await auth.getUserByEmail(testEnv.CS_TEACHER_EMAILS);
    const profile = (await db.doc(`csAccounts/${user.uid}`).get()).data();
    if (profile) teacherBefore = { uid: user.uid, role: profile.role, classIds: profile.classIds };
  } catch (error) { if ((error as { code: string }).code !== "auth/user-not-found") throw error; }
  ownsAccounts = true;
  for (const uid of uids) await auth.createUser({ uid, email: `${uid}@cs-class.invalid`, password: studentPassword });
});

test.beforeEach(async ({ page }) => {
  await localOnly(page.request);
  failTeacherRead = false;
  const batch = db.batch();
  for (const classId of ["2-1", "2-2"]) batch.set(db.doc(`csClasses/${classId}`), { id: classId, name: `2학년 ${classId.split("-")[1]}반`, revision: 0, currentLessonId: programming.id, openedLessonIds: lessons.map(lesson => lesson.id) });
  for (const [index, uid] of uids.entries()) {
    batch.set(db.doc(`csAccounts/${uid}`), { uid, role: "student", studentId: studentIds[index], classId: "2-1", classIds: [], mustChangePassword: false, disabled: false, authVersion: 0, authBusy: null, session: null });
    for (const lesson of lessons) {
      const work = lesson.id === review.id ? index < 2 ? requestedWork(index) : emptyWork(review) : recentWork(lesson, index);
      batch.set(workRef(index, lesson), { ...work, uid, classId: "2-1" });
    }
  }
  await batch.commit();
  await readyTeacher(page.request);
  // Keep the real API/authorization/summary conversion, narrow only the roster to owned QA rows.
  await page.route("**/api/classroom/teacher?**", async route => {
    if (failTeacherRead) {
      await route.fulfill({ status: 503, json: { code: "FETCH_UNAVAILABLE", message: "합성 요청 목록 조회 실패" } });
      return;
    }
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    const data = await response.json() as TeacherDashboard;
    await route.fulfill({ response, json: { ...data, students: data.students.filter(student => uids.includes(student.uid)) } });
  });
});

test.afterAll(async () => {
  if (!ownsAccounts) return;
  const batch = db.batch();
  for (const uid of uids) {
    batch.delete(db.doc(`csAccounts/${uid}`));
    for (const lesson of lessons) batch.delete(db.doc(`csWork/${uid}__${lesson.id}`));
    for (const key of [`credential:${uid}:${passwordDigest(studentPassword)}`, `password-change:${uid}`]) batch.delete(db.doc(`csRateLimits/${createHash("sha256").update(key).digest("hex")}`));
  }
  for (const [classId, original] of originalClasses) {
    if (original) batch.set(db.doc(`csClasses/${classId}`), original);
    else batch.delete(db.doc(`csClasses/${classId}`));
  }
  if (teacherBefore) batch.update(db.doc(`csAccounts/${teacherBefore.uid}`), { role: teacherBefore.role, classIds: teacherBefore.classIds });
  const cleanup = await Promise.allSettled([
    batch.commit(),
    ...uids.map(uid => auth.deleteUser(uid).catch(error => { if ((error as { code: string }).code !== "auth/user-not-found") throw error; })),
  ]);
  for (const result of cleanup) if (result.status === "rejected") throw result.reason;
});

test("[4차-6] 최근 제출은 알려진 submittedAt 최댓값·학번 동률순이며 초안 편집과 무관", async ({ page }) => {
  // Historical single-submission work remains readable through its direct API.
  const legacyDetail = await page.request.get(`/api/classroom/students/${uids[0]}/work/${ordinary.id}`);
  expect(legacyDetail.status()).toBe(200);
  const legacyWork = await legacyDetail.json() as Work;
  expect(latestSubmissionAtFor(ordinary, legacyWork)).toBe(2000);
  expect(submissionCountFor(ordinary, legacyWork)).toBe(1);
  expect(latestSubmissionAtFor(ordinary, recentWork(ordinary, 4))).toBe(0);
  expect(submissionCountFor(ordinary, recentWork(ordinary, 4))).toBe(0);
  for (const lesson of [programming, flowchart]) {
    await setCurrent(lesson);
    await page.goto("/teacher?classId=2-1");
    const actions = page.getByRole("region", { name: "교사가 확인할 일", exact: true });
    const recent = actions.getByRole("list", { name: "최근 제출 학생", exact: true });
    await expect(recent).toBeVisible();
    const links = recent.locator('a[href*="studentId="]');
    await expect(links).toHaveCount(3);
    const targets = await links.evaluateAll(elements => elements.map(element => Object.fromEntries(new URL((element as HTMLAnchorElement).href).searchParams)));
    expect(targets).toEqual([2, 1, 3].map(index => ({ classId: "2-1", lessonId: lesson.id, studentId: studentIds[index] })));
    await workRef(0, lesson).update({ updatedAt: 1_500_000 });
    const reloaded = page.waitForResponse(response => new URL(response.url()).pathname === "/api/classroom/teacher" && response.status() === 200);
    await refresh(page).click();
    await (await reloaded).finished();
    await expect(links.first()).toHaveAttribute("href", new RegExp(`studentId=${studentIds[2]}`));
    await expect(links.last()).toHaveAttribute("href", new RegExp(`studentId=${studentIds[3]}`));
  }
});

test("[4차-5] 선택 복습 요청 인원·deep-link·검색 교집합과 초기화 URL을 유지", async ({ page }) => {
  await setCurrent(review);
  await page.goto("/teacher?classId=2-1");
  const actions = page.getByRole("region", { name: "교사가 확인할 일", exact: true });
  const pendingLink = actions.getByRole("link", { name: `${review.title} · 확인 요청 2명`, exact: true });
  await expect(pendingLink).toBeVisible();
  expect(Object.fromEntries(new URL((await pendingLink.getAttribute("href"))!, "http://localhost:3000").searchParams)).toEqual({ classId: "2-1", lessonId: review.id, review: "pending" });
  await pendingLink.click();
  await expect(pendingOnly(page)).toBeChecked();
  await expect(page.getByRole("combobox", { name: "진행 상태", exact: true })).toBeDisabled();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByRole("searchbox", { name: "학번·닉네임 검색" }).fill(studentIds[0]);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(row(page, 0)).toContainText("확인 대기");
  await expect(page.getByText(`${review.title} · 확인 요청 2명`, { exact: true })).toBeVisible();
  failTeacherRead = true;
  await refresh(page).click();
  await expect(page.getByRole("alert").filter({ hasText: "합성 요청 목록 조회 실패" })).toBeVisible();
  await expect(page.getByText(`${review.title} · 확인 요청 2명`, { exact: true })).toBeVisible();
  await expect(row(page, 0)).toHaveCount(1);
  failTeacherRead = false;
  await refresh(page).click();
  await expect(page.getByRole("alert").filter({ hasText: "합성 요청 목록 조회 실패" })).toHaveCount(0);
  await page.getByRole("searchbox", { name: "학번·닉네임 검색" }).fill(studentIds[2]);
  await expect(page.getByText("조건에 맞는 학생이 없어요.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "검색·필터 초기화", exact: true }).click();
  await expect(pendingOnly(page)).not.toBeChecked();
  await expect(page.getByRole("searchbox", { name: "학번·닉네임 검색" })).toHaveValue("");
  expect(new URL(page.url()).searchParams.has("review")).toBe(false);
  await page.reload();
  await expect(pendingOnly(page)).not.toBeChecked();
  await expect(page.locator("tbody tr")).toHaveCount(5);
});

test("[4차-5] 요청 checkbox는 진행 조건과 AND이며 수업·반 전환 뒤 URL 조건이 부활하지 않음", async ({ page }) => {
  // Existing requests are review-only. This response fixture checks the independent UI predicate,
  // without introducing a request issuance path for a regular lesson.
  const requestIds = [randomUUID(), randomUUID()];
  await page.route("**/api/classroom/teacher?**", async route => {
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    const data = await response.json() as TeacherDashboard;
    const students = data.students.filter(student => uids.includes(student.uid)).map(student => {
      const index = uids.indexOf(student.uid);
      if (data.selectedLessonId !== programming.id || !student.work || index > 1) return student;
      const completed = index === 1;
      return { ...student, nickname: "교집합", mustChangePassword: completed, work: { ...student.work, ...(completed ? { conceptSolved: programming.concepts.map(item => item.id), quizSolved: programming.quiz.map(item => item.id), missions: Object.fromEntries(["name", "multiply", "move", "keys"].map(id => [id, { submission: { id: `complete-${id}`, submittedAt: 1000 } }])) } : {}), review: { id: requestIds[index], status: "pending" as const, requestedAt: 1000 } } };
    });
    await route.fulfill({ response, json: { ...data, students } });
  });
  await page.goto(`/teacher/students?classId=2-1&lessonId=${programming.id}&review=pending`);
  await expect(pendingOnly(page)).toBeChecked();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByRole("searchbox", { name: "학번·닉네임 검색" }).fill("교집합");
  await page.getByRole("checkbox", { name: "비밀번호 변경 필요만", exact: true }).check();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await choose(page, "진행 상태", "완료");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(row(page, 1)).toBeVisible();
  await page.getByRole("searchbox", { name: "학번·닉네임 검색" }).fill(studentIds[0]);
  await expect(page.getByText("조건에 맞는 학생이 없어요.", { exact: true })).toBeVisible();
  await choose(page, "확인할 수업", review.title);
  await expect(pendingOnly(page)).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: "비밀번호 변경 필요만", exact: true })).not.toBeChecked();
  await expect(page.getByRole("searchbox", { name: "학번·닉네임 검색" })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "진행 상태", exact: true })).toContainText("모든 진행");
  expect(new URL(page.url()).searchParams.has("review")).toBe(false);
  await page.reload();
  await expect(pendingOnly(page)).not.toBeChecked();
  await pendingOnly(page).check();
  await choose(page, "담당 반", "2학년 2반");
  await expect(page.getByRole("combobox", { name: "담당 반", exact: true })).toContainText("2학년 2반");
  expect(new URL(page.url()).searchParams.get("classId")).toBe("2-2");
  expect(new URL(page.url()).searchParams.has("review")).toBe(false);
  await page.reload();
  await expect(pendingOnly(page)).not.toBeChecked();
});

test("[4차-5-작품창] 실패 초안을 보존하고 승인·수정 안내 뒤 행 재조회와 창·초점 복귀를 유지", async ({ page }) => {
  await openPending(page);
  await openViewer(page, 0);
  const dialog = viewer(page, 0);
  const message = dialog.getByLabel("학생에게 안내", { exact: true });
  await expect(dialog).toContainText(`요청 당시 목표 ${studentIds[0]}`);
  await message.fill("전송 실패 뒤에도 남아야 하는 안내");
  await page.route(`**${reviewPath(0)}`, route => route.fulfill({ status: 503, json: { code: "REVIEW_UNAVAILABLE", message: "합성 확인 처리 실패" } }));
  await dialog.getByRole("button", { name: "요청본 승인", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("합성 확인 처리 실패");
  await expect(message).toHaveValue("전송 실패 뒤에도 남아야 하는 안내");
  await expect(row(page, 0)).toHaveCount(1);
  await page.unroute(`**${reviewPath(0)}`);
  const listReload = page.waitForResponse(response => new URL(response.url()).pathname === "/api/classroom/teacher" && response.status() === 200);
  await dialog.getByRole("button", { name: "요청본 승인", exact: true }).click();
  await (await listReload).finished();
  await expect(row(page, 0)).toHaveCount(0);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("승인한 요청");
  await focusInside(page, 0);
  await expect(dialog.getByRole("heading", { name: "승인한 요청", exact: true })).toBeFocused();
  const approved = (await workRef(0).get()).data()! as Work;
  expect(approved.review!.status).toBe("approved");
  expect((approved.submission!.reviewProject as AbstractionProject).goal).toBe(`요청 당시 목표 ${studentIds[0]}`);
  expect((approved.draft.reviewProject as AbstractionProject).goal).toBe(`요청 후 수정 중인 목표 ${studentIds[0]}`);
  await page.keyboard.press("Escape");
  await expect(pendingOnly(page)).toBeFocused();
  await page.getByRole("button", { name: "격자 보기", exact: true }).click();
  await openViewer(page, 1);
  await viewer(page, 1).getByLabel("학생에게 안내", { exact: true }).fill("합성 수정 안내");
  const changesReload = page.waitForResponse(response => new URL(response.url()).pathname === "/api/classroom/teacher" && response.status() === 200);
  await viewer(page, 1).getByRole("button", { name: "수정 안내 보내기", exact: true }).click();
  await (await changesReload).finished();
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await expect(viewer(page, 1)).toContainText("수정 안내");
  await focusInside(page, 1);
  const changed = (await workRef(1).get()).data()! as Work;
  expect(changed.review!.status).toBe("changes");
  expect(changed.submission).toBeNull();
  await page.keyboard.press("Escape");
  await expect(pendingOnly(page)).toBeFocused();
});

test("[4차-5-요청ID] 열기 중·열린 뒤 바뀐 요청을 자동 승인하지 않고 409 초안·학생 맥락을 보존", async ({ page }) => {
  await page.clock.install();
  await openPending(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let detailWaiting = false;
  const detailPath = `**/api/classroom/students/${uids[0]}/work/${review.id}`;
  const decisions: string[] = [];
  await page.route(`**${reviewPath(0)}`, async route => {
    decisions.push(route.request().postDataJSON().requestId);
    await route.fulfill({ response: await route.fetch() });
  });
  await page.route(detailPath, async route => {
    detailWaiting = true;
    await gate;
    await route.fulfill({ response: await route.fetch() });
  });
  try {
    await openViewer(page, 0);
    await expect.poll(() => detailWaiting).toBe(true);
    const replacement = requestedWork(0, "열기 중 바뀐 요청 목표");
    await workRef(0).set({ ...replacement, uid: uids[0], classId: "2-1" });
    release();
    await expect(viewer(page, 0).getByRole("alert")).toContainText("확인 요청이 바뀌었어요.");
    const approve = viewer(page, 0).getByRole("button", { name: "요청본 승인", exact: true });
    await expect(approve).toBeDisabled();
    const latestRequest = viewer(page, 0).getByRole("button", { name: "최신 요청 열기", exact: true });
    await expect(latestRequest).toBeVisible();
    expect(decisions).toEqual([]);
    expect(((await workRef(0).get()).data()! as Work).review!.status).toBe("pending");
    expect(decisions).not.toContain(replacement.review!.id);
    await page.unroute(detailPath);
    await latestRequest.click();
    await expect(viewer(page, 0)).toContainText("열기 중 바뀐 요청 목표");
    const draft = viewer(page, 0).getByLabel("학생에게 안내", { exact: true });
    await draft.fill("옛 요청을 보던 안내 초안");
    const newest = requestedWork(0, "열린 뒤 바뀐 요청 목표");
    await workRef(0).set({ ...newest, uid: uids[0], classId: "2-1" });
    await waitWithoutTeacherRefresh(page);
    await expect(viewer(page, 0)).toContainText("열기 중 바뀐 요청 목표");
    await expect(viewer(page, 0)).not.toContainText("열린 뒤 바뀐 요청 목표");
    await expect(draft).toHaveValue("옛 요청을 보던 안내 초안");
    const staleResponse = page.waitForResponse(response => new URL(response.url()).pathname === reviewPath(0) && response.status() === 409);
    await viewer(page, 0).getByRole("button", { name: "요청본 승인", exact: true }).click();
    await (await staleResponse).finished();
    await expect(viewer(page, 0).getByRole("alert")).toContainText(/확인 요청이 바뀌었어요|최신 요청/);
    await expect(viewer(page, 0).getByRole("button", { name: "최신 요청 열기", exact: true })).toBeVisible();
    expect(decisions.at(-1)).toBe(replacement.review!.id);
    expect(decisions).not.toContain(newest.review!.id);
    await expect(draft).toHaveValue("옛 요청을 보던 안내 초안");
    const latest = (await workRef(0).get()).data()! as Work;
    expect(latest.review!.id).toBe(newest.review!.id);
    expect(latest.review!.status).toBe("pending");
    expect(latest.submission).toBeNull();
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("[4차-5-계정창] 수동 조회 전까지 행·초기화 확인·임시 결과·닫기 초점을 보존", async ({ page }) => {
  await page.clock.install();
  await openPending(page);
  await row(page, 0).getByRole("button", { name: `${studentIds[0]} 비밀번호 초기화`, exact: true }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm.getByRole("button", { name: "취소", exact: true })).toBeFocused();
  const first = (await workRef(0).get()).data()! as Work;
  expect((await page.request.post(reviewPath(0), { headers, data: { requestId: first.review!.id, decision: "changes", message: "다른 교사의 합성 처리" } })).status()).toBe(200);
  await waitWithoutTeacherRefresh(page);
  await expect(row(page, 0)).toHaveCount(1);
  await expect(confirm).toBeVisible();
  await expect(confirm).toContainText(studentIds[0]);
  await expect(confirm.getByRole("button", { name: "취소", exact: true })).toBeFocused();
  await confirm.getByRole("button", { name: "취소", exact: true }).click();
  await expect(row(page, 0).getByRole("button", { name: `${studentIds[0]} 비밀번호 초기화`, exact: true })).toBeFocused();
  await page.getByRole("button", { name: "수업 새로고침", exact: true }).click();
  await expect(row(page, 0)).toHaveCount(0);
  await row(page, 1).getByRole("button", { name: `${studentIds[1]} 비밀번호 초기화`, exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "초기화하기", exact: true }).click();
  const result = page.getByRole("dialog", { name: `${studentIds[1]} 학생의 임시 비밀번호`, exact: true });
  await expect(result).toBeVisible();
  const password = result.getByLabel("임시 비밀번호", { exact: true });
  await expect(password).toBeFocused();
  expect(await password.evaluate(element => (element as HTMLInputElement).value.length > 0)).toBe(true);
  // Compare fingerprints so an assertion never prints the issued credential.
  const fingerprint = createHash("sha256").update(await password.inputValue()).digest("hex");
  const second = (await workRef(1).get()).data()! as Work;
  expect((await page.request.post(reviewPath(1), { headers, data: { requestId: second.review!.id, decision: "approve", message: "" } })).status()).toBe(200);
  await waitWithoutTeacherRefresh(page);
  await expect(row(page, 1)).toHaveCount(1);
  await expect(result).toBeVisible();
  await expect(password).toBeFocused();
  expect(createHash("sha256").update(await password.inputValue()).digest("hex") === fingerprint).toBe(true);
  expect((await db.doc(`csAccounts/${uids[1]}`).get()).data()!.mustChangePassword).toBe(true);
  await result.getByRole("button", { name: "전달 완료", exact: true }).click();
  await expect(result).toHaveCount(0);
  await expect(row(page, 1).getByRole("button", { name: `${studentIds[1]} 비밀번호 초기화`, exact: true })).toBeFocused();
  await page.getByRole("button", { name: "수업 새로고침", exact: true }).click();
  await expect(row(page, 1)).toHaveCount(0);
});
