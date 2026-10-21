import { test, expect } from "@playwright/test";
import { db, headers, loginStudent, readyTeacher, resetStudent, studentPassword } from "./emulator";

const classId = "2-7";
const entryPath = `/api/classroom/first-entry/${classId}`;
const entryCode = async (response: Awaited<ReturnType<typeof loginStudent>>) => (await response.json()).code as string;
const offBy = (code: string) => String((Number(code) + 1) % 1_000_000).padStart(6, "0");

test("반 공통 첫 입장 코드는 열린 동안만 비밀번호 미설정 학생 한 명씩 입장시키고 담당 교사만 열고 닫음", async ({ request, playwright }) => {
  const contexts = await Promise.all([1, 2, 3].map(() => playwright.request.newContext({ baseURL: "http://localhost:3000" })));
  const [student, squatter, other] = contexts;
  try {
    for (const id of ["20771", "20772", "20773"]) await resetStudent(request, id);
    await db.collection("csFirstEntry").doc(classId).delete();
    expect((await (await loginStudent(student, "123456", "20771")).json()).code).toBe("FIRST_ENTRY_CLOSED");

    await readyTeacher(request);
    expect((await request.post(entryPath, { headers, data: { action: "extend" } })).status()).toBe(409);
    const opened = await request.post(entryPath, { headers, data: { action: "open" } });
    expect(opened.status()).toBe(200);
    const code = await entryCode(opened);
    expect(code).toMatch(/^\d{6}$/);
    const stored = (await db.collection("csFirstEntry").doc(classId).get()).data()!;
    expect(JSON.stringify(stored)).not.toContain(code);

    const wrong = offBy(code);
    expect((await (await loginStudent(student, wrong, "20771")).json()).code).toBe("INVALID_LOGIN");
    const entered = await loginStudent(student, code, "20771");
    expect(entered.status()).toBe(200);
    expect((await entered.json()).session.mustChangePassword).toBe(true);
    expect((await student.get("/api/classroom/student")).status()).toBe(403);
    expect((await student.post("/api/auth/password", { headers, data: { password: studentPassword } })).status()).toBe(200);
    // 비밀번호를 정한 뒤에는 같은 코드로 다시 들어오거나 반 코드를 바꿀 수 없어요.
    expect((await loginStudent(other, code, "20771")).status()).toBe(401);
    expect((await student.post(entryPath, { headers, data: { action: "open" } })).status()).toBe(403);

    // 먼저 입장한 사람이 비밀번호를 정하는 동안 같은 학번으로 그 접속을 빼앗지 못해요.
    expect((await loginStudent(squatter, code, "20772")).status()).toBe(200);
    expect((await (await loginStudent(other, code, "20772")).json()).code).toBe("ALREADY_ACTIVE");
    expect((await squatter.get("/api/auth/session")).status()).toBe(200);
    expect((await (await squatter.get("/api/auth/session")).json()).session.studentId).toBe("20772");

    const extended = await request.post(entryPath, { headers, data: { action: "extend" } });
    expect(extended.status()).toBe(200);
    expect((await extended.json()).code).toBeNull();
    expect((await request.post(entryPath, { headers, data: { action: "close" } })).status()).toBe(200);
    expect((await (await loginStudent(other, code, "20773")).json()).code).toBe("FIRST_ENTRY_CLOSED");

    const reopened = await entryCode(await request.post(entryPath, { headers, data: { action: "open" } }));
    expect((await loginStudent(other, code === reopened ? wrong : code, "20773")).status()).toBe(401);
    // 반 전체 오답이 상한에 닿으면 맞는 코드로도 들어올 수 없고, 다시 열면 횟수를 처음부터 셉니다.
    expect((await db.collection("csFirstEntry").doc(classId).get()).data()!.failures).toBe(1);
    await db.collection("csFirstEntry").doc(classId).update({ failures: 49 });
    expect((await (await loginStudent(other, offBy(reopened), "20773")).json()).code).toBe("INVALID_LOGIN");
    expect((await (await loginStudent(other, reopened, "20773")).json()).code).toBe("FIRST_ENTRY_CLOSED");
    const third = await entryCode(await request.post(entryPath, { headers, data: { action: "open" } }));
    expect((await db.collection("csFirstEntry").doc(classId).get()).data()!.failures).toBeUndefined();
    await db.collection("csFirstEntry").doc(classId).update({ expiresAt: Date.now() - 1 });
    expect((await (await loginStudent(other, third, "20773")).json()).code).toBe("FIRST_ENTRY_CLOSED");
    expect((await request.post(entryPath, { headers, data: { action: "reveal" } })).status()).toBe(400);
  } finally {
    await Promise.all(contexts.map(context => context.dispose()));
    await db.collection("csFirstEntry").doc(classId).delete();
  }
});

test("교사는 첫 입장 창에서 코드를 띄우고 이번에 입장한 학생을 확인한 뒤 닫음", async ({ page, playwright }) => {
  const student = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
  try {
    for (const id of ["20771", "20772", "20773"]) await resetStudent(page.request, id);
    await readyTeacher(page.request);
    await page.goto(`/teacher/students?classId=${classId}`);
    await page.getByRole("button", { name: "첫 입장 열기", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("비밀번호를 정해야 하는 학생 3명");
    await dialog.getByRole("button", { name: "첫 입장 열기", exact: true }).click();
    const code = (await dialog.getByLabel(/^입장 코드/).textContent())!;
    expect(code).toMatch(/^\d{6}$/);
    await expect(dialog.getByRole("status")).toContainText("남은 시간 10분");

    expect((await loginStudent(student, code, "20771")).status()).toBe(200);
    expect((await student.post("/api/auth/password", { headers, data: { password: studentPassword } })).status()).toBe(200);
    await dialog.getByRole("button", { name: "입장 현황 새로고침", exact: true }).click();
    await expect(dialog.getByRole("heading", { name: "이번에 입장한 학생 1명" })).toBeVisible();
    await expect(dialog).toContainText("20771");
    await expect(dialog.getByRole("heading", { name: "아직 비밀번호를 정하지 않은 학생 2명" })).toBeVisible();

    // 틀린 코드가 쌓여 서버가 닫으면, 연장 대신 새 코드로 다시 열 수 있어요.
    await db.collection("csFirstEntry").doc(classId).delete();
    await dialog.getByRole("button", { name: "10분 연장", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("첫 입장이 이미 닫혔어요");
    await dialog.getByRole("button", { name: "새 코드로 다시 열기", exact: true }).click();
    await expect(dialog.getByRole("status")).toContainText("남은 시간 10분");
    await expect(dialog.getByRole("alert")).toBeHidden();

    await dialog.getByRole("button", { name: "첫 입장 닫기", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect.poll(async () => (await db.collection("csFirstEntry").doc(classId).get()).exists).toBe(false);
  } finally {
    await student.dispose();
    await db.collection("csFirstEntry").doc(classId).delete();
  }
});
