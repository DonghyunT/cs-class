/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node tooling uses CommonJS. */
// 학생 테스터(사람·AI)용 검토 자료: 게임 전체를 읽을 수 있는 대본(남녀 대사·활동·힌트·반응)과 활동 화면 캡처를 만듭니다.
// 사용: node teaching-materials/festival-romance/qa/student-review-pack.cjs  → qa-results/student-review/ (Git 제외)
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'qa-results', 'student-review');
fs.mkdirSync(outDir, { recursive: true });
const chapters = ['ch1', 'ch2', 'ch3'].map((f) => require(path.join(root, 'src', 'chapters', `${f}.cjs`)));

// 대본 속 이야기 변수(가상 학생 이름 '지우', 약속 16:00 등)
const VARS = {
  name: '지우', vocative: '지우야', meetingTime: '16:00', prizeName: '큰 키링', shapeName: '육각형', boothName: '사진 부스',
  routeDescription: '실내 부스를 둘러보고 나오니', ticketName: '지우', threshold: '6', tickets: '6', times: '4', replyKey: '',
};
const fill = (s) => String(s ?? '').replace(/\{\{(\w+)\}\}/g, (_, k) => VARS[k] ?? `{{${k}}}`);
const text = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? `[남] ${fill(v.boy)}\n    [여] ${fill(v.girl)}` : fill(v));
const who = (l) => (l.role === 'me' || l.speaker === '나' ? '나(주인공)' : l.speaker);
const lines = (arr, indent = '') => (arr || []).map((l) => `${indent}- ${who(l)}: ${text(l.text)}`).join('\n');
const cardSummary = (q, indent = '  ') => [
  ...(q.situation || []).map((l) => `${indent}지금 상황: ${fill(l)}`),
  ...(q.hat ? [`${indent}시작 블록: ${fill(q.hat)}`] : []),
  ...(q.code || []).map((c, i) => `${indent}  ${i + 1}. ${fill(c)}${q.focus === i + 1 ? '   ← 고칠 곳' : ''}`),
  ...(q.choices || []).map((c) => `${indent}· 카드 (${c.key}) ${fill(c.label)} → 실행 결과: ${fill(c.screen)}${c.correct ? '  ← 정답' : `  → 오답 피드백: ${fill(c.why)}`}`),
].join('\n');

const md = [
  '# 내일, 축제에서 만나 — 학생 테스터용 플레이 대본',
  '',
  '중학교 정보 1~3단원(프로그래밍·자료, 선택 구조·논리, 반복 구조) 복습 미연시 게임입니다. 학생은 이름과 하루(상대 캐릭터)의 성별을 고르고 3개 장을 순서대로 플레이합니다.',
  '규칙: 하트 문항 12개(장마다 4개)를 **첫 시도**에 맞히면 ♥ +1, 틀리면 힌트를 보고 다시 풀어 통과(0 ♥). 총 하트와 두 번의 마음 선택지(차갑게 선을 그으면 cold)로 엔딩이 갈립니다: 12/12·cold 없음 = 썸 시작, 7~11 또는 12+cold = 찐친, 0~6 = 어색한 사이.',
  '대사의 [남]/[여]는 하루의 성별에 따라 바뀌는 말투입니다.',
  `**예시 값 안내:** 게임은 학생의 선택을 변수로 기억해 대사에 넣습니다. 이 대본은 예시 값으로 채웠습니다 — ${Object.entries(VARS).filter(([, v]) => v).map(([k, v]) => `{{${k}}}=${v}`).join(', ')}. 실제 게임에서는 학생 이름, 1장에서 고른 약속 시각(16:00/17:00, 3장 잠금 암호가 됨), 3장에서 완성한 도형(삼각형/오각형/육각형), 2장에서 받은 상품이 그대로 들어갑니다. 예시 값이 고정돼 있다고 보고하지 마세요.`,
  '**화면 캡처 안내:** activity-*.png는 장면으로 바로 이동하려고 교사 모드(?mode=teacher)로 찍었습니다. 그래서 목차·장면 초기화·교사 메모 버튼이 보이지만 학생 화면에는 없고, 학생은 1장부터 차례로만 엽니다.',
  '**엔딩 리포트 안내:** 엔딩 뒤 리포트에는 총 하트, 첫 시도에 놓친 개념과 그때의 힌트, 장별 재도전 버튼, 3장 핵심 정리 카드가 나옵니다.',
  '',
];
for (const ch of chapters) {
  md.push(`## ${ch.id}장 · ${ch.title} (${ch.subject}, ${ch.duration || ''})`, '', `줄거리 요약: ${fill(ch.recap)}`, '');
  for (const s of ch.scenes) {
    md.push(`### ${s.id} · ${fill(s.title)}${s.graded ? ` — 하트 문항 ${s.questionId}` : ''}${s.heartChoice ? ' — 마음 선택지' : ''}${s.ending ? ' — 엔딩' : ''}`);
    md.push(`(${s.kind}, 약 ${s.minutes || '?'}, 배경 ${s.background || ''}, ${s.channel || ''})`);
    if (s.kind === 'summary') {
      md.push(...(s.cards || []).map(([t, d]) => `- 정리 카드 「${t}」 ${fill(d)}`), s.extra ? `- ${fill(s.extra)}` : '', s.mission ? `- 다음: ${fill(s.mission)}` : '', '');
      continue;
    }
    if (s.lines && !s.ending) md.push(lines(s.lines));
    if (s.choices) {
      md.push('선택지:');
      for (const c of s.choices) md.push(`  ▶ (${c.key}${c.cold ? ', 차갑게 선 긋기' : ''}) ${fill(c.label)}`, lines(c.reply, '    '));
    }
    if (s.graded) {
      md.push(`인용: ${fill(s.quote)}`, `질문: ${fill(s.goalPrompt)}`, `활동 종류: ${s.experiment}  (캡처: activity-${s.id}.png)`);
      if (s.flow?.intro) md.push('도입 대사:', lines(s.flow.intro, '  '));
      if (s.flow?.options) md.push('도입 뒤 선택:', ...s.flow.options.map((o) => `  ▶ (${o.key}) ${fill(o.label)}`));
      if (s.task) {
        const one = (q, indent) => [
          ...(q.situation || []).map((l) => `${indent}지금 상황: ${fill(l)}`),
          ...(q.rows ? [`${indent}직접 조작: 아래 줄을 ↑·↓로 옮긴 뒤 실행(손님 ${q.tests.join('·')}장으로 시험)`, ...q.initialOrder.map((id, i) => { const r = q.rows.find((x) => x.id === id); return `${indent}  ${i + 1}. ${i ? '아니면, 만일' : '만일'} ${q.subject} ${r.min}${q.unit || ''} 이상이면 → ${r.then}`; })] : []),
          ...(q.code ? [`${indent}단답형: 숫자 칸에 ${q.label} 값을 적고 실행(처음 ${q.initial}, 정답 ${q.answer})`, ...q.code.map((c, i) => `${indent}  ${i + 1}. ${c.replace('{n}', '[ ]')}`)] : []),
          `${indent}틀린 이유: ${[...Object.values(q.whyTop || {}), q.whyRest, ...Object.values(q.whyBy || {}), q.whyLow, q.whyHigh, q.whyMulti].filter(Boolean).map(fill).join(' / ')}`,
        ].join('\n');
        if (s.task.variants) for (const [k, v] of Object.entries(s.task.variants)) md.push(`  [${k}을(를) 고른 경우]`, one({ ...s.task, ...v }, '    '));
        else md.push(one(s.task, '  '));
      }
      if (s.quiz?.variants) {
        for (const [k, v] of Object.entries(s.quiz.variants)) md.push(`  [${k}을(를) 고른 경우]`, cardSummary({ ...s.quiz, ...v }, '    '));
      } else if (s.quiz) {
        md.push(cardSummary(s.quiz));
      }
      if (s.flow?.wrongReaction) md.push(`틀렸을 때 하루: ${fill(s.flow.wrongReaction.line)}`);
      if (s.flow?.choiceReplies) md.push('선택별 반응:', ...Object.entries(s.flow.choiceReplies).map(([k, v]) => `  (${k})\n${lines(v, '    ')}`));
      if (s.flow?.firstTrySuccess) md.push('첫 시도 성공 반응:', lines(s.flow.firstTrySuccess, '  '));
      if (s.flow?.retrySuccess) md.push('재도전 성공 반응:', lines(s.flow.retrySuccess, '  '));
      md.push(`개념 정리(정답 뒤 하루의 한마디): ${fill(s.observe)}`);
    }
    if (s.ending) {
      for (const [k, e] of Object.entries(s.endings)) {
        md.push(`엔딩 [${k}] ${e.badge} · ${e.title} — ${fill(e.headline)}`, lines(e.lines, '  '), `  리포트 문구: ${fill(e.footer)}`);
        if (e.coldLines) md.push(`엔딩 [${k} + cold] ${e.coldTitle} — ${fill(e.coldHeadline)}`, lines(e.coldLines, '  '));
      }
    }
    md.push('');
  }
}
fs.writeFileSync(path.join(outDir, 'transcript.md'), md.join('\n'));
console.log('transcript:', path.join(outDir, 'transcript.md'));

// 활동 화면 캡처(교사 모드 목차로 바로 이동, 1366×768)
(async () => {
  const { chromium } = require(process.env.FESTIVAL_PLAYWRIGHT_MODULE || '@playwright/test');
  const browser = await chromium.launch({ headless: true, ...(process.env.FESTIVAL_BROWSER ? { executablePath: process.env.FESTIVAL_BROWSER } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto(`${pathToFileURL(path.resolve(root, '../../public/festival-romance.html')).href}?mode=teacher`);
  await page.screenshot({ path: path.join(outDir, 'title.png') });
  for (const ch of chapters) {
    for (const s of ch.scenes.filter((x) => x.graded)) {
      await page.locator('#contents-button').click();
      await page.locator(`[data-scene="${s.id}"]`).click();
      for (let i = 0; i < 20 && !(await page.locator('#experiment').count()); i++) {
        const choice = page.locator('#story-choices button').first();
        if (await choice.isVisible()) await choice.click();
        else await page.locator('#next-button').click();
      }
      await page.screenshot({ path: path.join(outDir, `activity-${s.id}.png`), fullPage: true });
    }
  }
  await browser.close();
  console.log('screenshots:', outDir);
})().catch((e) => { console.error(e); process.exit(1); });
