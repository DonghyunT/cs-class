import { expect, test } from "@playwright/test";
import { db, headers, readyStudent, entryReset, entryStart, entryStop } from "./emulator";
import { buildProgrammingProject, parseProgrammingProject } from "../src/lib/classroom/programming-entry";
const id="programming-13", endpoint=`/api/classroom/work/${id}`;
let originalClass: FirebaseFirestore.DocumentData | undefined;
const project=buildProgrammingProject([[{type:"when_run_button_click",params:[null]},{type:"move_direction",params:[{type:"number",params:[10]},null]}]]);
test.beforeEach(async({page})=>{
  originalClass=(await db.doc("csClasses/2-1").get()).data(); await readyStudent(page.request);
  await db.doc("csClasses/2-1").update({openedLessonIds:[id],currentLessonId:id}); await db.doc(`csWork/student-20101__${id}`).delete();
  const initial=await(await page.request.get(endpoint)).json(); expect((await page.request.post(endpoint,{headers,data:{revision:initial.revision,draft:{...initial.draft,stage:"practice",programming:{mission:"move",projects:{move:project},reflection:""}}}})).status()).toBe(200);
  await page.goto(`/classroom/${id}`);await page.locator("iframe").scrollIntoViewIfNeeded();await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });
});
test.afterEach(async({page})=>{await page.goto("about:blank");await db.doc(`csWork/student-20101__${id}`).delete();if(originalClass)await db.doc("csClasses/2-1").set(originalClass);});
test("iframe 실제 숫자 입력의 Ctrl+S는 미확정 입력까지 저장하고 새로고침 복원한다",async({page})=>{
  const frame=page.frameLocator("iframe"); await frame.locator("#entryWorkspaceBoard").getByText("10",{exact:true}).first().locator("..").click();
  const input=frame.locator("input.entry-widget-input-field:visible");await input.fill("25");await input.press("Control+s");
  await expect.poll(async()=>{const work=await(await page.request.get(endpoint)).json();return parseProgrammingProject(work.draft.programming.projects.move)?.threads[0][1].params[0];}).toMatchObject({type:"number",params:["25"]});
  await page.reload();await page.locator("iframe").scrollIntoViewIfNeeded();await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });await expect(page.frameLocator("iframe").locator("#entryWorkspaceBoard").getByText("25",{exact:true}).first()).toBeVisible();
});
test("미션 탐색·기본 작품 방문은 서버 저장·미저장 경고 없이 기존 작품을 유지한다",async({page})=>{
  let posts=0;page.on("request",r=>{if(r.method()==="POST"&&new URL(r.url()).pathname===endpoint)posts++;});
  await page.getByRole("button",{name:"다음 미션",exact:true}).click();await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });await page.getByRole("button",{name:"이전 미션",exact:true}).click();await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });
  await expect(page.getByText("저장하지 않은 변경 있음",{exact:true})).toHaveCount(0);expect(posts).toBe(0);
  await page.getByRole("link",{name:"수업 나가기",exact:true}).click();await expect(page).toHaveURL(/\/student\/lessons$/);await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Entry 블록 묶음의 배치만 바꿔도 명시 저장하고 재접속 복원한다", async ({ page }) => {
  const block = page.frameLocator("iframe").locator("#entryWorkspaceBoard g.block").filter({ hasText: "시작하기 버튼" }).first();
  const box = (await block.boundingBox())!;
  await page.mouse.move(box.x + 50, box.y + 15); await page.mouse.down(); await page.mouse.move(box.x + 150, box.y + 95, { steps: 8 }); await page.mouse.up();
  await expect(page.locator('[data-lesson-shell] header [role=status]')).toHaveText("저장하지 않은 변경 있음");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.locator('[data-lesson-shell] header [role=status]')).toHaveText("저장 완료");
  const saved = parseProgrammingProject((await (await page.request.get(endpoint)).json()).draft.programming.projects.move)!.threads[0][0];
  expect(saved.x).toBeGreaterThan(50); expect(saved.y).toBeGreaterThan(40);
  await page.reload(); await page.locator("iframe").scrollIntoViewIfNeeded(); await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });
  await expect(block).toBeVisible();
  const restored = await block.evaluate(element => { const native = (element as unknown as { blockView: { block: { x: number; y: number } } }).blockView.block; return { x: native.x, y: native.y }; });
  expect(restored).toEqual({ x: saved.x, y: saved.y });
});
test("Entry 실행 중 저장은 실행을 멈추지 않고 현재 코드와 발견 기록을 저장한다",async({page})=>{
  await page.goto("about:blank");
  const work=await(await page.request.get(endpoint)).json();
  const running=buildProgrammingProject([[{type:"when_run_button_click",params:[null]},{type:"dialog_time",params:[{type:"text",params:["실행 유지"]},{type:"number",params:[10]},"speak",null]}]]);
  expect((await page.request.post(endpoint,{headers,data:{revision:work.revision,draft:{...work.draft,programming:{...work.draft.programming,projects:{move:running}}}}})).status()).toBe(200);
  await page.goto(`/classroom/${id}`);await page.locator("iframe").scrollIntoViewIfNeeded();await expect(entryReset(page)).toBeEnabled({ timeout: 20000 });
  await page.getByLabel("오늘 발견한 것을 한 줄로 남겨볼까요?").fill("실행 중 발견 기록");await entryStart(page).click();await expect(entryStop(page)).toBeVisible();
  await page.getByRole("button",{name:"저장",exact:true}).click();await expect(page.locator("[data-lesson-shell] header [role=status]")).toHaveText("저장 완료");
  await expect(entryStop(page)).toBeVisible();expect((await(await page.request.get(endpoint)).json()).draft.programming.reflection).toBe("실행 중 발견 기록");await entryStop(page).click();
});
