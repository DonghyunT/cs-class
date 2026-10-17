import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { testEnv } from "../scripts/local-test-env.mjs";
import { auth, clearLoginLimit, db, headers, localOnly, loginStudent } from "./emulator";
const run = promisify(execFile);
const csv = "학년,반,번호,학번\n2,9,25,20925\n2,9,26,20926\n";

test("명부 계획·개별 등록·반별 30분 발급·기존 작품 보존·비공개 백업", async ({ request }) => {
  test.setTimeout(60000); await localOnly(request);
  const directory = path.resolve("private", `roster-test-${randomUUID()}`); await mkdir(directory, { recursive: true });
  const input = path.join(directory, "roster.csv"), output = path.join(directory, "credentials.ndjson"); await writeFile(input, csv);
  const invoke = (args: string[]) => run(process.execPath, ["scripts/student-roster.mjs", "--csv", input, "--year", "2026", ...args], { env: { ...process.env, ...testEnv } });
  const uids = ["student-20925", "student-20926"], passwords = [testEnv.CS_INITIAL_PASSWORD, "my-private-pass-7319"];
  try {
    const plan = await invoke([]), details = JSON.parse(plan.stdout); expect(details.new).toBe(2);
    expect((await db.collection("csAccounts").doc(uids[0]).get()).exists).toBe(false);
    await expect(invoke(["--mode", "register", "--apply"])).rejects.toThrow();
    const marker = `CSClass:2026:${details.rosterHash.slice(0, 24)}`;
    await db.collection("csAccounts").doc(uids[1]).create({ uid: uids[1], role: "student", studentId: "20926", classId: "2-9", classIds: [], mustChangePassword: true, temporaryPassword: null, disabled: true, authVersion: 0, authBusy: marker, session: null, roster: { year: 2026, hash: details.rosterHash } });
    await auth.createUser({ uid: uids[1], email: "s-20926@cs-class.invalid", displayName: marker, disabled: true, password: "provider-only-7319" });
    await expect(invoke(["--mode", "register", "--apply", "--confirm-project", "demo-cs-class"])).rejects.toThrow();
    expect((await db.collection("csAccounts").doc(uids[0]).get()).exists).toBe(false);
    await invoke(["--mode", "register", "--resume", "--apply", "--confirm-project", "demo-cs-class"]);
    expect((await db.collection("csAccounts").doc(uids[0]).get()).data()).toMatchObject({ mustChangePassword: true, temporaryPassword: null, disabled: false, authBusy: null });
    expect((await loginStudent(request, testEnv.CS_INITIAL_PASSWORD, "20925")).status()).toBe(401);
    await db.collection("csWork").doc(`${uids[0]}__programming-13`).set({ uid: uids[0], classId: "2-9", draft: { reflection: "기존 학습" } });
    // Repeated registration does not reset a credential or erase work.
    await invoke(["--mode", "register", "--apply", "--confirm-project", "demo-cs-class"]);
    const issued = await invoke(["--mode", "issue", "--class", "2-9", "--apply", "--confirm-project", "demo-cs-class", "--output", output]);
    const records = (await readFile(output, "utf8")).trim().split("\n").map((s) => JSON.parse(s));
    const credentials = records.filter((r) => r.status === "pending");
    passwords.push(...credentials.map((r) => r.password));
    expect(records.filter((r) => r.status === "issued")).toHaveLength(2);
    expect(new Set(credentials.map((r) => r.password)).size).toBe(2);
    for (const credential of credentials) { expect(credential.expiresAt - Date.now()).toBeGreaterThan(28 * 60_000); expect(issued.stdout).not.toContain(credential.password); }
    expect((await loginStudent(request, credentials[0].password, "20925")).status()).toBe(200);
    expect((await request.post("/api/auth/password", { headers, data: { password: "my-private-pass-7319" } })).status()).toBe(200);
    const backupFile = path.join(directory, "backup.json");
    await invoke(["--mode", "backup", "--apply", "--confirm-project", "demo-cs-class", "--output", backupFile]);
    const backup = JSON.parse(await readFile(backupFile, "utf8"));
    expect(backup.work[0].data.draft.reflection).toBe("기존 학습");
    expect(JSON.stringify(backup)).not.toContain("temporaryPassword"); expect(JSON.stringify(backup)).not.toContain(credentials[0].password);
    await expect(invoke(["--mode", "issue", "--class", "2-9", "--apply", "--confirm-project", "demo-cs-class", "--output", path.join(directory, "refused.ndjson")])).rejects.toThrow();
    // Same roster IDs in a different school year are conflicts, not resets.
    await expect(run(process.execPath, ["scripts/student-roster.mjs", "--csv", input, "--year", "2027"], { env: { ...process.env, ...testEnv } })).rejects.toThrow();
    expect((await db.collection("csWork").doc(`${uids[0]}__programming-13`).get()).data()!.draft.reflection).toBe("기존 학습");
  } finally {
    for (const uid of uids) { await auth.deleteUser(uid).catch(() => {}); await db.collection("csAccounts").doc(uid).delete(); await db.collection("csWork").doc(`${uid}__programming-13`).delete(); }
    for (const uid of uids) await clearLoginLimit(uid);
    if (!directory.startsWith(path.resolve("private") + path.sep) || !path.basename(directory).startsWith("roster-test-")) throw Error("Unsafe cleanup path.");
    await rm(directory, { recursive: true, force: true });
  }
});

test("명부 중복·다른 학번 형식·운영 혼합 설정은 변경 전에 거절한다", async ({ request }, info) => {
  await localOnly(request);
  const input = info.outputPath("invalid-roster.csv");
  await writeFile(input, csv + "2,9,25,20925\n");
  const args = ["scripts/student-roster.mjs", "--csv", input, "--year", "2026"];
  await expect(run(process.execPath, args, { env: { ...process.env, ...testEnv } })).rejects.toThrow();
  await writeFile(input, csv.replace("20926", "21026"));
  await expect(run(process.execPath, args, { env: { ...process.env, ...testEnv } })).rejects.toThrow();
  await writeFile(input, csv);
  await expect(run(process.execPath, args, { env: { ...process.env, ...testEnv, FIREBASE_PROJECT_ID: "cs-class-f74c4" } })).rejects.toThrow();
  expect((await db.collection("csAccounts").doc("student-20925").get()).exists).toBe(false);
});

test("기존 Excel 11반 297명은 번호·학번만 변환하고 원문을 보존한다", async ({}, info) => {
  test.skip(process.platform !== "win32", "Windows의 기본 .NET 변환 도구 검사");
  const directory = path.resolve("private", `roster-test-${randomUUID()}`); await mkdir(directory, { recursive: true });
  const fixture = info.outputPath("make-workbook.ps1");
  // Small OpenXML fixture using the same native ZIP/XML APIs available to the
  // operator; no Excel installation or extra package is required.
  await writeFile(fixture, `\uFEFFparam([string]$Directory)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$zip=[IO.Compression.ZipFile]::Open((Join-Path $Directory 'synthetic.xlsx'),[IO.Compression.ZipArchiveMode]::Create)
function Add-Part([string]$Name,[string]$Text) { $entry=$zip.CreateEntry($Name); $writer=[IO.StreamWriter]::new($entry.Open(),[Text.UTF8Encoding]::new($false)); try { $writer.Write($Text) } finally { $writer.Dispose() } }
try {
 $sheets=''; $relationships=''
 for($class=1;$class -le 11;$class++) {
  $sheets += '<sheet name="'+$class+'반" sheetId="'+$class+'" r:id="r'+$class+'"/>'
  $relationships += '<Relationship Id="r'+$class+'" Target="worksheets/sheet'+$class+'.xml"/>'
  $rows='<row r="1"><c r="A1" t="inlineStr"><is><t>번호</t></is></c><c r="B1" t="inlineStr"><is><t>학번</t></is></c><c r="C1" t="inlineStr"><is><t>비밀번호</t></is></c><c r="D1" t="inlineStr"><is><t>이름</t></is></c></row>'
  for($number=1;$number -le 27;$number++) { $r=$number+1; $id='2{0:D2}{1:D2}' -f $class,$number; $rows+='<row r="'+$r+'"><c r="A'+$r+'"><v>'+$number+'</v></c><c r="B'+$r+'" t="inlineStr"><is><t>'+$id+'</t></is></c><c r="C'+$r+'" t="inlineStr"><is><t>legacy-shared-secret</t></is></c><c r="D'+$r+'" t="inlineStr"><is><t>synthetic-name</t></is></c></row>' }
  Add-Part ('xl/worksheets/sheet'+$class+'.xml') ('<worksheet><sheetData>'+$rows+'</sheetData></worksheet>')
 }
 Add-Part 'xl/workbook.xml' ('<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+$sheets+'</sheets></workbook>')
 Add-Part 'xl/_rels/workbook.xml.rels' ('<Relationships>'+$relationships+'</Relationships>')
} finally { $zip.Dispose() }
`, { encoding: "utf8" });
  try {
    await run("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", fixture, "-Directory", directory]);
    const source = path.join(directory, "synthetic.xlsx"), before = await readFile(source), converted = path.join(directory, "roster.csv");
    await run("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts/roster-from-xlsx.ps1", "-Source", source, "-Output", converted]);
    expect(await readFile(source)).toEqual(before);
    const content = await readFile(converted, "utf8"); expect(content).not.toContain("legacy-shared-secret"); expect(content).not.toContain("synthetic-name");
    const validation = await run(process.execPath, ["scripts/student-roster.mjs", "--csv", converted, "--year", "2026", "--mode", "validate"]);
    expect(JSON.parse(validation.stdout).total).toBe(297);
    await expect(run("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts/roster-from-xlsx.ps1", "-Source", source, "-Output", converted])).rejects.toThrow();
  } finally {
    if (!directory.startsWith(path.resolve("private") + path.sep) || !path.basename(directory).startsWith("roster-test-")) throw Error("Unsafe cleanup path.");
    await rm(directory, { recursive: true, force: true });
  }
});
