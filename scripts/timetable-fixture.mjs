import { createServer } from "node:http";

// Synthetic Comcigan responses for local E2E; never used on a deployment.
export function timetableWeek(start, changed = false) {
  const grade = [0];
  for (let classroom = 1; classroom <= 11; classroom++) {
    const days = [0];
    for (let day = 1; day <= 6; day++) days.push([8, ...Array(8).fill(0)]);
    days[changed && classroom === 1 ? 3 : 1][changed && classroom === 1 ? 2 : 1] = changed && classroom === 1 ? ">25001" : 25001;
    grade.push(days);
  }
  const first = new Date(start + "T00:00:00Z"); const second = new Date(first); second.setUTCDate(second.getUTCDate() + 7);
  function label(date) { const end = new Date(date); end.setUTCDate(end.getUTCDate() + 5); return `${date.toISOString().slice(2, 10)} ~ ${end.toISOString().slice(2, 10)}`; }
  const subjects = Array(26).fill(""); subjects[0] = 0; subjects[25] = "정보";
  return {
    시작일: start, 자료244: `${first.toISOString().slice(0, 10)} 13:00:${changed ? "01" : "00"}`,
    학년도: first.getUTCFullYear(), 학급수: [31, 9, 11, 11], 가상학급수: [0, 0, 0, 0], 자료492: subjects,
    자료147: [0, [], grade, []], 자료446: ["fixture-teacher-must-not-leave-parser"],
    일과시간: ["1(09:00)", "2(09:55)", "3(10:50)", "4(11:45)", "5(13:30)", "6(14:25)", "7(15:20)", "8(16:15)"],
    열람제한일: "1899-12-30", 변경알림: 1, 분리: 1000, 일자자료: [[1, label(first)], [2, label(second)]],
  };
}
export async function startTimetableFixture() {
  let mode = "normal", calls = 0;
  const today = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()) + "T00:00:00Z");
  today.setUTCDate(today.getUTCDate() + (8 - today.getUTCDay()) % 7);
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1:4781");
    if (url.pathname === "/__fixture") {
      if (request.method === "POST") { mode = url.searchParams.get("mode") ?? "normal"; calls = 0; }
      response.end(JSON.stringify({ mode, calls })); return;
    }
    calls++;
    if (mode === "slow" && url.pathname === "/st") await new Promise((resolve) => setTimeout(resolve, 1500));
    if (url.pathname === "/st") { response.end("function school_ra(){ajax({url:'./36179?17384l'})}function sc_disp(sc){sc_data('73629_',sc,1,'0')}"); return; }
    if (url.search.startsWith("?17384l")) { response.end(JSON.stringify({ 학교검색: [[24966, "서울", "금옥중학교", 74022]] }) + "\0"); return; }
    const index = Number(Buffer.from(url.search.slice(1), "base64").toString().split("_").at(-1));
    if (mode === "failed" && index === 2) { response.writeHead(503); response.end("unavailable"); return; }
    const start = new Date(today); start.setUTCDate(start.getUTCDate() + (index - 1) * 7);
    const data = timetableWeek(start.toISOString().slice(0, 10), mode === "changed");
    // Both published weeks share a provider revision.
    data.자료244 = `${today.toISOString().slice(0, 10)} 13:00:${mode === "changed" ? "01" : "00"}`;
    if (mode === "invalid") data.자료147 = [];
    // Public responses may have JSON whitespace before their trailing NUL padding.
    response.end(JSON.stringify(data) + "\r\n\0\0");
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(4781, "127.0.0.1", resolve); });
  return server;
}
