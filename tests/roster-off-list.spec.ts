import { expect, test } from "@playwright/test";
import { db, headers, loginStudent, readyTeacher, resetStudent } from "./emulator";

const classId = "2-8";
const [moving, staying, trial] = ["20881", "20882", "20899"];
const roster = (id: string) => `/api/classroom/students/student-${id}/roster`;
const teacherView = async (request: Parameters<typeof readyTeacher>[0]) => (await (await request.get(`/api/classroom/teacher?classId=${classId}`)).json()) as { students: { studentId: string }[]; offList: { studentId: string; kind: string }[] };

test("명단에서 빼기: 로그인·접속·반 명단에서 빠지고 기록은 남으며 다시 넣으면 돌아온다", async ({ request, playwright }) => {
  const student = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
  try {
    for (const id of [moving, staying, trial]) await resetStudent(request, id);
    await db.collection("csWork").doc(`student-${moving}__sequence-lab`).set({ uid: `student-${moving}`, classId, draft: { reflection: "남길 기록" } });
    expect((await loginStudent(student, undefined, moving)).status()).toBe(200);
    await readyTeacher(request);
    let view = await teacherView(request);
    // The class's 99 account is a trial account: kept usable, but out of the class list and counts.
    expect(view.students.map(item => item.studentId)).toEqual(expect.arrayContaining([moving, staying]));
    expect(view.students.map(item => item.studentId)).not.toContain(trial);
    expect(view.offList).toEqual([expect.objectContaining({ studentId: trial, kind: "trial" })]);

    expect((await request.post(roster(moving), { headers, data: { listed: "no" } })).status()).toBe(400);
    expect((await request.post(roster(moving), { headers, data: { listed: false, extra: 1 } })).status()).toBe(400);
    expect((await request.post(roster(trial), { headers, data: { listed: false } })).status()).toBe(409);
    expect((await request.post(roster(moving), { headers, data: { listed: false } })).status()).toBe(200);

    // The open session ends, sign-in and password reset are refused, and the record stays.
    expect((await student.get("/api/classroom/student")).status()).toBe(401);
    expect((await loginStudent(student, undefined, moving)).status()).toBe(401);
    expect((await request.post(`/api/classroom/students/student-${moving}/reset`, { headers, data: {} })).status()).toBe(409);
    view = await teacherView(request);
    expect(view.students.map(item => item.studentId)).not.toContain(moving);
    expect(view.offList.map(item => [item.studentId, item.kind])).toEqual([[moving, "removed"], [trial, "trial"]]);
    expect((await db.collection("csWork").doc(`student-${moving}__sequence-lab`).get()).data()!.draft.reflection).toBe("남길 기록");

    // A student cannot change the list, even for themself.
    expect((await loginStudent(student, undefined, staying)).status()).toBe(200);
    expect((await student.post(roster(staying), { headers, data: { listed: false } })).status()).toBe(403);

    expect((await request.post(roster(moving), { headers, data: { listed: true } })).status()).toBe(200);
    expect((await loginStudent(student, undefined, moving)).status()).toBe(200);
    view = await teacherView(request);
    expect(view.students.map(item => item.studentId)).toContain(moving);
    // A disabled trial account can be put back, and it returns as a trial account.
    await db.collection("csAccounts").doc(`student-${trial}`).update({ disabled: true });
    expect((await teacherView(request)).offList).toEqual([expect.objectContaining({ studentId: trial, kind: "removed" })]);
    expect((await request.post(roster(trial), { headers, data: { listed: true } })).status()).toBe(200);
    expect((await teacherView(request)).offList).toEqual([expect.objectContaining({ studentId: trial, kind: "trial" })]);
  } finally {
    await student.dispose();
    await db.collection("csWork").doc(`student-${moving}__sequence-lab`).delete();
    await db.collection("csAccounts").doc(`student-${trial}`).delete();
  }
});

test("명단에서 빼기 화면: 확인 창을 거쳐 빼고, 접힌 묶음에서 체험 계정과 함께 보이며 다시 넣는다", async ({ page }) => {
  for (const id of [moving, staying, trial]) await resetStudent(page.request, id);
  try {
    await readyTeacher(page.request);
    await page.goto(`/teacher/students?classId=${classId}`);
    await expect(page.getByRole("button", { name: `${staying} 명단에서 빼기`, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: `${trial} 명단에서 빼기`, exact: true })).toHaveCount(0);
    const group = page.locator("details").filter({ hasText: "명단에서 뺀 계정" });
    await expect(group.locator("summary")).toHaveText("명단에서 뺀 계정 1개");

    await page.getByRole("button", { name: `${staying} 명단에서 빼기`, exact: true }).click();
    const dialog = page.getByRole("alertdialog", { name: `${staying} 학생을 명단에서 뺄까요?` });
    await expect(dialog).toContainText("로그인할 수 없고");
    await dialog.getByRole("button", { name: "취소", exact: true }).click();
    await expect(page.getByRole("button", { name: `${staying} 명단에서 빼기`, exact: true })).toBeVisible();
    await page.getByRole("button", { name: `${staying} 명단에서 빼기`, exact: true }).click();
    await dialog.getByRole("button", { name: "명단에서 빼기", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: `${staying} 명단에서 빼기`, exact: true })).toHaveCount(0);
    await expect(group.locator("summary")).toHaveText("명단에서 뺀 계정 2개");

    await group.locator("summary").click();
    await expect(group.getByRole("listitem").filter({ hasText: trial })).toContainText("체험 계정 · 로그인 가능");
    await expect(group.getByRole("button", { name: `${trial} 다시 넣기`, exact: true })).toHaveCount(0);
    await expect(group.getByRole("listitem").filter({ hasText: staying })).toContainText("명단에서 뺌 · 로그인 막힘");
    await group.getByRole("button", { name: `${staying} 다시 넣기`, exact: true }).click();
    await expect(page.getByRole("button", { name: `${staying} 명단에서 빼기`, exact: true })).toBeVisible();
    await expect(group.locator("summary")).toHaveText("명단에서 뺀 계정 1개");
  } finally {
    await db.collection("csAccounts").doc(`student-${staying}`).update({ disabled: false });
    await db.collection("csAccounts").doc(`student-${trial}`).delete();
  }
});
