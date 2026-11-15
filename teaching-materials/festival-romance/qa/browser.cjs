/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node tooling uses CommonJS. */
const { chromium } = require(process.env.FESTIVAL_PLAYWRIGHT_MODULE || '@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const resultsDir = path.join(root, 'qa-results');
fs.mkdirSync(resultsDir, { recursive: true });

const publicRomancePath = path.resolve(root, '../../public/festival-romance.html');
const publicLessonPath = path.resolve(root, '../../public/festival-lesson.html');
const romanceUrl = pathToFileURL(publicRomancePath).href;
const lessonUrl = pathToFileURL(publicLessonPath).href;

async function launchBrowser() {
  return chromium.launch({
    headless: true,
    ...(process.env.FESTIVAL_BROWSER ? { executablePath: process.env.FESTIVAL_BROWSER } : { channel: 'chrome' }),
  });
}

function attachGuards(target, errors, consoleErrors, remote) {
  target.on('pageerror', (e) => errors.push(e.message));
  target.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  target.on('request', (req) => {
    if (/^https?:/.test(req.url())) remote.push(req.url());
  });
}

async function advanceDialogue(page, { choiceKey = null, cold = false, skipSeen = false } = {}) {
  for (let i = 0; i < 30; i++) {
    if (await page.locator('#experiment').count()) return 'experiment';
    if (await page.locator('.ending-report-layout').count()) return 'ending-report';
    if (await page.locator('.summary-layout').count()) return 'summary';

    if (skipSeen) {
      const skipBtn = page.locator('#skip-seen-button');
      if ((await skipBtn.count()) && (await skipBtn.isVisible())) {
        await skipBtn.click();
        continue;
      }
    }

    const choices = page.locator('#story-choices button');
    if ((await choices.count()) > 0 && (await choices.first().isVisible())) {
      assert.equal(await page.locator('#next-button').isDisabled(), true, '선택 중에는 다음 버튼 비활성');
      if (cold) {
        await page.locator('#story-choices button[data-cold-choice="true"]').click();
      } else if (choiceKey) {
        await page.locator(`#story-choices button[data-flow-choice="${choiceKey}"]`).click();
      } else {
        await page.locator('#story-choices button:not([data-cold-choice="true"])').first().click();
      }
      continue;
    }

    const nextBtn = page.locator('#next-button');
    if ((await nextBtn.count()) && !(await nextBtn.isDisabled())) {
      await nextBtn.click();
      continue;
    }
    throw new Error('진행 가능한 다음 버튼 또는 선택지를 찾지 못했습니다.');
  }
  throw new Error('대화 진행 한도 초과');
}

async function waitForActivityPass(page) {
  await page.waitForFunction(() => {
    const btn = document.getElementById('next-button');
    return btn && !btn.disabled && /대화로 돌아가기|다음 장면/.test(btn.textContent || '');
  }, null, { timeout: 15000 });
}

async function waitForActivityFail(page) {
  await page.waitForFunction(() => {
    const res = document.getElementById('result');
    return res && !res.hidden && res.classList.contains('result-wrong');
  }, null, { timeout: 15000 });
  assert.equal(await page.locator('#next-button').isDisabled(), true, '오답 시 다음 버튼 잠금');
}

async function finishConceptResponse(page, { skipSeen = false } = {}) {
  await waitForActivityPass(page);
  await page.locator('#next-button').click();
  for (let i = 0; i < 20; i++) {
    if (await page.locator('#experiment').count()) return;
    if (await page.locator('.summary-layout').count()) return;
    if (await page.locator('.ending-report-layout').count()) return;
    const progress = page.locator('#line-progress');
    if (!(await progress.count())) return;
    const nextBtn = page.locator('#next-button');
    const txt = await nextBtn.textContent();
    if (skipSeen && (await page.locator('#skip-seen-button').isVisible())) {
      await page.locator('#skip-seen-button').click();
      continue;
    }
    if (/다음 장면|대화로/.test(txt || '') && !(await page.locator('#story-choices button:visible').count())) {
      await nextBtn.click();
      if (/다음 장면/.test(txt || '')) return;
      continue;
    }
    if (await page.locator('#story-choices button:visible').count()) return;
    await nextBtn.click();
  }
}

// 지금 화면의 장면 데이터(제목으로 찾음)
async function currentSceneData(page) {
  const title = await page.locator('.lesson-heading h2').innerText();
  const scene = await page.evaluate((t) => window.FESTIVAL_CHAPTERS.flatMap((c) => c.scenes).find((s) => s.title === t), title);
  assert.ok(scene, `장면 데이터 찾기: ${title}`);
  return scene;
}

// 블록 순서 바꾸기: ↑ 버튼과 표기 버튼만으로 첫 허용 순서를 만든 뒤 실행
async function solveArrange(page) {
  const { goal } = await currentSceneData(page);
  const target = goal.acceptOrders[0];
  for (let i = 0; i < target.length; i++) {
    const order = await page.evaluate(() => [...document.querySelectorAll('.arrange-row')].map((r) => r.dataset.blockId));
    for (let j = order.indexOf(target[i]); j > i; j--) {
      await page.locator(`[data-arrange-move="-1"][data-id="${target[i]}"]`).click();
    }
  }
  for (const [id, want] of Object.entries(goal.expectedChoices || {})) {
    const block = goal.blocks.find((b) => b.id === id);
    const steps = (want - (block.initialChoice ?? 0) + block.choices.length) % block.choices.length;
    for (let k = 0; k < steps; k++) await page.locator(`[data-arrange-choice="${id}"]`).click();
  }
  await page.locator('#run-arrange').click();
}

async function solveCurrentChallenge(page, { meetingTime = '16:00', polygonAngle = '60', finish = true } = {}) {
  const type = await page.locator('#experiment').getAttribute('data-experiment');
  if (type === 'quiz') {
    const scene = await currentSceneData(page);
    const keys = scene.quiz.choices.map((c) => c.key);
    const shownOrder = await page.evaluate(() => [...document.querySelectorAll('[data-quiz-choice]')].map((b) => b.dataset.quizChoice));
    const seeded = await page.evaluate(({ id, n }) => window.FestivalModels.seededOrder(id, n), { id: scene.questionId, n: keys.length });
    assert.deepEqual(shownOrder, seeded.map((i) => keys[i]), `${scene.questionId} 보기 순서를 문항별 seed로 섞음`);
    await page.locator(`[data-quiz-choice="${scene.quiz.choices.find((c) => c.correct).key}"]`).click();
  } else if (type === 'arrange') {
    await solveArrange(page);
  } else if (type === 'map') {
    await page.locator('#map-event').selectOption('ArrowRight');
    await page.locator('#map-angle').selectOption('90');
    await page.locator('#run-map-block').click();
  } else if (type === 'math') {
    await page.locator('[data-math-formula="paren"]').click();
    await page.locator('#math-quotient').fill('3');
    await page.locator('#math-remainder').fill('1');
    await page.locator('#run').click();
  } else if (type === 'compare') {
    await page.locator('#operator').selectOption('≥');
    await page.locator('#run').click();
  } else if (type === 'and') {
    await page.locator('[data-logic-op="and"]').click();
    await page.locator('[data-logic-answer="false"]').click();
    await page.locator('#run').click();
  } else if (type === 'route') {
    await page.locator('#route-rain-check').selectOption('not');
    await page.locator('#route-connector').selectOption('or');
    await page.locator('#run').click();
  } else if (type === 'prize') {
    await page.locator('#prize-order').selectOption('desc');
    await page.locator('#run').click();
  } else if (type === 'count') {
    await page.locator('#times').selectOption('4');
    await page.locator('[data-count-final="off"]').click();
    await page.locator('#run').click();
  } else if (type === 'polygon') {
    assert.equal(await page.locator('#fit').count(), 0, '다각형 #fit 치트 버튼 제거 확인');
    await page.locator('#turn').selectOption(polygonAngle);
    await page.locator('#run').click();
  } else if (type === 'until') {
    assert.equal(await page.locator('#correct').count(), 0, 'until #correct 치트 버튼 제거 확인');
    const bodyText = await page.locator('#experiment').innerText();
    assert.equal(bodyText.includes('비밀번호는 1600'), false, 'until 1600 치트 문구 제거 확인');
    await page.locator('#until-cond').selectOption('=');
    await page.locator('#until-body').selectOption('inside');
    await page.locator('#run-until').click();
    await page.locator('#wrong').click();
    await page.locator('#answer').click();
    await page.locator('#password').fill(meetingTime.replace(':', ''));
    await page.locator('#answer').click();
  } else {
    throw new Error(`알 수 없는 실험 타입: ${type}`);
  }
  if (!finish) {
    await waitForActivityPass(page);
    return type;
  }
  await finishConceptResponse(page);
  return type;
}

async function playChapterToEnd(page, chapterId, {
  coldScenes = new Set(),
  meetingChoice = 'early',
  polygonKey = 'hexagon',
  polygonAngle = '60',
  skipSeen = false,
  onScene = null,
} = {}) {
  const solvedTypes = [];
  for (let step = 0; step < 30; step++) {
    if (await page.locator('.summary-layout').count()) return { endedAt: 'summary', solvedTypes };
    if (await page.locator('.ending-report-layout').count()) return { endedAt: 'ending-report', solvedTypes };

    const stageKind = await page.locator('#stage').getAttribute('data-kind');
    if (stageKind === 'story') {
      const textBefore = await page.locator('.story-heading h2').innerText();
      if (onScene) await onScene(textBefore);
      // Wait through dialogue until choices/summary/experiment/ending-report
      for (let lineStep = 0; lineStep < 25; lineStep++) {
        if (await page.locator('#experiment').count()) break;
        if (await page.locator('.summary-layout').count()) return { endedAt: 'summary', solvedTypes };
        if (await page.locator('.ending-report-layout').count()) return { endedAt: 'ending-report', solvedTypes };
        if (skipSeen && (await page.locator('#skip-seen-button').isVisible())) {
          await page.locator('#skip-seen-button').click();
          continue;
        }
        if (await page.locator('#story-choices button:visible').count()) {
          const isHeart = await page.locator('#heart-choice-cue').isVisible();
          const heading = await page.locator('.story-heading h2').innerText();
          if (isHeart) {
            const wantCold = [...coldScenes].some((k) => heading.includes(k));
            if (wantCold) {
              await page.locator('#story-choices button[data-cold-choice="true"]').click();
            } else {
              await page.locator('#story-choices button:not([data-cold-choice="true"])').first().click();
            }
          } else if (await page.locator(`#story-choices button[data-flow-choice="${meetingChoice}"]`).count()) {
            await page.locator(`#story-choices button[data-flow-choice="${meetingChoice}"]`).click();
          } else if (await page.locator(`#story-choices button[data-flow-choice="${polygonKey}"]`).count()) {
            await page.locator(`#story-choices button[data-flow-choice="${polygonKey}"]`).click();
          } else {
            await page.locator('#story-choices button').first().click();
          }
          continue;
        }
        const nextBtn = page.locator('#next-button');
        if (!(await nextBtn.isDisabled())) {
          await nextBtn.click();
        } else {
          break;
        }
      }
      continue;
    }

    if (await page.locator('#experiment').count()) {
      const meeting = meetingChoice === 'early' ? '16:00' : '17:00';
      const type = await solveCurrentChallenge(page, { meetingTime: meeting, polygonAngle });
      solvedTypes.push(type);
      continue;
    }

    // Handle concept intro before experiment
    for (let i = 0; i < 20; i++) {
      if (await page.locator('#experiment').count()) break;
      if (skipSeen && (await page.locator('#skip-seen-button').isVisible())) {
        await page.locator('#skip-seen-button').click();
        continue;
      }
      if (await page.locator('#story-choices button:visible').count()) {
        if (await page.locator(`#story-choices button[data-flow-choice="${polygonKey}"]`).count()) {
          await page.locator(`#story-choices button[data-flow-choice="${polygonKey}"]`).click();
        } else {
          await page.locator('#story-choices button').first().click();
        }
        continue;
      }
      await page.locator('#next-button').click();
    }
    const meeting = meetingChoice === 'early' ? '16:00' : '17:00';
    const type = await solveCurrentChallenge(page, { meetingTime: meeting, polygonAngle });
    solvedTypes.push(type);
  }
  throw new Error(`Ch.${chapterId} 종료 실패`);
}

(async () => {
  const browser = await launchBrowser();
  const errors = [];
  const consoleErrors = [];
  const remote = [];
  const checks = [];

  try {
    // 1. Preserved original teacher intro (public/festival-lesson.html)
    {
      const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      attachGuards(page, errors, consoleErrors, remote);
      await page.goto(lessonUrl);
      const lessonScenes = await page.evaluate(() => FESTIVAL_CHAPTERS.reduce((n, c) => n + c.scenes.length, 0));
      assert.equal(lessonScenes, 27, '보존된 festival-lesson.html은 27장면이어야 합니다');
      assert.equal(await page.locator('#contents-button').isVisible(), true, '원본 교사용 목차 노출');
      await page.locator('#contents-button').click();
      await page.locator('[data-scene="ch1-1"]').click();
      assert.equal(await page.locator('#stage').getAttribute('data-voice'), 'narration');
      await page.screenshot({ path: path.join(resultsDir, 'v2-lesson-preserved.png') });
      await ctx.close();
      checks.push('원본 교사용 public/festival-lesson.html 27장면·오류 0건 확인');
    }

    // 2. Default Student Mode: onboarding, v3 sprites, sequential lock, 1st-attempt anti-cheat, 3 endings + retry + skip
    {
      const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      attachGuards(page, errors, consoleErrors, remote);
      await page.goto(romanceUrl);

      assert.deepEqual(await page.evaluate(() => window.FESTIVAL_SPRITE_ROWS), { boy: 1, girl: 1 });
      assert.equal(await page.locator('#stage').getAttribute('data-mode'), 'student');
      assert.equal(await page.locator('#stage').getAttribute('data-embed'), null);
      assert.equal(await page.locator('#contents-button').isVisible(), false, '학생 모드에서 목차 숨김');
      assert.equal(await page.locator('#teaching-tools').isVisible(), false, '학생 모드에서 교사 도구 숨김');
      assert.equal(await page.locator('#teacher-button').isVisible(), false, '학생 모드에서 교사 메모 숨김');

      await page.locator('#settings-button').click();
      assert.equal(await page.locator('#short-mode-field').isVisible(), false, '학생 설정에서 간결 모드 숨김');
      assert.equal(await page.locator('#site-url-field').isVisible(), false, '학생 설정에서 사이트 URL 숨김');
      await page.locator('[data-close="settings-dialog"]').click();

      assert.equal(await page.locator('#chapter-list').isVisible(), false, '새 학생은 챕터 카드 숨김(새 이야기 시작으로만 진입)');
      assert.equal(await page.locator('#resume-button').isVisible(), false, '새 학생은 이어하기 숨김');
      assert.equal(await page.locator('.title-character').evaluate((el) => getComputedStyle(el).backgroundSize), '300% 100%');
      await page.screenshot({ path: path.join(resultsDir, 'v2-title-1366.png') });

      // Onboarding: test boy & girl v3 sprite preview + nickname
      await page.locator('#new-story-button').click();
      assert.equal(await page.locator('#onboard-character').evaluate((el) => getComputedStyle(el).backgroundSize), '300% 100%');
      const boyBg = await page.locator('#onboard-character').evaluate((el) => el.style.backgroundImage);
      await page.locator('label:has(input[name="onboard-variant"][value="girl"])').click();
      const girlBg = await page.locator('#onboard-character').evaluate((el) => el.style.backgroundImage);
      assert.notEqual(girlBg, boyBg, '여학생/남학생 하루 스프라이트 전환');
      assert.equal(await page.locator('#onboard-character').evaluate((el) => getComputedStyle(el).backgroundSize), '300% 100%');
      await page.screenshot({ path: path.join(resultsDir, 'v2-onboarding-girl.png') });

      await page.locator('label:has(input[name="onboard-variant"][value="boy"])').click();
      await page.locator('#onboard-name').fill('구름');
      await page.locator('#onboard-start').click();
      checks.push('학생 모드 UI 은닉·순차 잠금·온보딩 남녀 v3 스프라이트(300% 100%) 확인');

      // Ch.1: advance ch1-1, verify v3 sprite crop & keyboard space/arrow
      assert.equal(await page.locator('.story-character').evaluate((el) => getComputedStyle(el).backgroundSize), '300% 100%');
      // 줄 단위 이전: 버튼과 ← 키
      assert.match(await page.locator('#line-progress').innerText(), /^1 \//);
      assert.equal(await page.locator('#previous-button').isDisabled(), true, '1장 첫 장면 첫 줄에서는 이전 없음');
      await page.keyboard.press('ArrowRight');
      assert.match(await page.locator('#line-progress').innerText(), /^2 \//);
      assert.equal(await page.locator('#previous-button').isDisabled(), false, '둘째 줄에서 이전 버튼 켜짐');
      await page.locator('#previous-button').click();
      assert.match(await page.locator('#line-progress').innerText(), /^1 \//, '이전 버튼으로 한 줄 뒤로');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowLeft');
      assert.match(await page.locator('#line-progress').innerText(), /^1 \//, '← 키로 한 줄 뒤로');
      // 선택 응답에서 이전 → 같은 선택지 다시
      for (let i = 0; i < 20 && !(await page.locator('#story-choices button').first().isVisible()); i++) {
        await page.locator('#next-button').click();
      }
      await page.locator('#story-choices button[data-flow-choice="sweet"]').click();
      assert.equal(await page.locator('#story-choices').isVisible(), false);
      await page.locator('#previous-button').click();
      assert.equal(await page.locator('#story-choices button[data-flow-choice="sweet"]').isVisible(), true, '응답에서 이전 → 선택지 다시');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Space');
      await advanceDialogue(page, { choiceKey: 'sweet' });

      // In ch1-2 (ch1-q1): intentionally fail first attempt, test anti-cheat reload & back button
      await advanceDialogue(page);
      assert.equal(await page.locator('#experiment').getAttribute('data-experiment'), 'arrange');
      assert.equal(await page.locator('.arrange-note').isVisible(), true, '하루의 손글씨 메모 표시');
      await page.locator('#run-arrange').click(); // 처음 순서(말하기가 맨 위) 그대로 실행 → 첫 시도 실패
      await waitForActivityFail(page);
      assert.match(await page.locator('#result').innerText(), /\[이름\]이 아직 비어/);
      assert.match(await page.locator('.sim-screen').innerText(), /" 님, 환영해요!"/, '실행 기록에 빈 이름 인사 표시');
      assert.equal(await page.locator('.companion-character').getAttribute('data-expression'), '4');
      assert.equal(await page.locator('.companion-character').evaluate((el) => getComputedStyle(el).backgroundSize), '300% 100%');
      assert.equal(await page.locator('.companion-character').evaluate((el) => el.style.backgroundPosition), '50% 0%');
      assert.equal(await page.locator('#chapter-hearts .heart-slot.missed').count(), 1);
      await page.screenshot({ path: path.join(resultsDir, 'v2-quiz-wrong-1366.png') });

      // Check localStorage v2 key & reload anti-cheat
      const keys = await page.evaluate(() => ({
        v2: Boolean(localStorage.getItem('festival-romance.game.v2')),
        v1: localStorage.getItem('festival-romance.bookmark.v1'),
      }));
      assert.equal(keys.v2, true);
      assert.equal(keys.v1, null);

      await page.reload();
      assert.equal(await page.locator('#chapter-list').isVisible(), true, '진행 기록이 있으면 챕터 카드 표시');
      assert.equal(await page.locator('[data-chapter="1"]').isDisabled(), false, 'Ch.1 시작 해금');
      assert.equal(await page.locator('[data-chapter="2"]').isDisabled(), true, 'Ch.2 초기 잠금');
      assert.equal(await page.locator('[data-chapter="3"]').isDisabled(), true, 'Ch.3 초기 잠금');
      // 온보딩 없이 챕터 카드로 시작했던 예전 저장(onboarded:false + 진행 기록)도 카드·이어하기 유지
      await page.evaluate(() => {
        const key = 'festival-romance.game.v2';
        const saved = JSON.parse(localStorage.getItem(key));
        saved.onboarded = false;
        localStorage.setItem(key, JSON.stringify(saved));
      });
      await page.reload();
      assert.equal(await page.locator('#chapter-list').isVisible(), true, '예전 저장도 챕터 카드 표시');
      assert.equal(await page.locator('#resume-button').isVisible(), true, '예전 저장도 이어하기 표시');
      await page.locator('#resume-button').click();
      await advanceDialogue(page);
      assert.equal(await page.locator('#chapter-hearts .heart-slot.missed').count(), 1, '새로고침 후에도 첫 시도 실패 유지');

      // 이전 버튼으로 1장 첫 장면까지 거슬러 올라가도 첫 시도 실패 유지
      for (let i = 0; i < 40 && !/ 1 \/ /.test(await page.locator('#progress-text').innerText()); i++) {
        if (await page.locator('#previous-button').isDisabled()) break;
        await page.locator('#previous-button').click();
      }
      assert.match(await page.locator('#progress-text').innerText(), / 1 \/ /, '이전 버튼으로 첫 장면까지 이동');
      await advanceDialogue(page, { choiceKey: 'sweet', skipSeen: true });
      await advanceDialogue(page);
      assert.equal(await page.locator('#chapter-hearts .heart-slot.missed').count(), 1, '이전 장면 복귀 후에도 첫 시도 실패 유지');

      // Retry ch1-q1 right -> 0 heart
      await solveArrange(page);
      assert.match(await page.locator('.sim-screen').innerText(), /구름 님, 환영해요!/, '고친 뒤 이름이 들어간 인사');
      await finishConceptResponse(page);
      assert.equal(await page.locator('#total-hearts').innerText(), '총 ♥ 0/12');
      assert.equal(await page.locator('#chapter-hearts .heart-slot.missed').count(), 1);

      // Solve ch1-q2, ch1-4 (16:00), ch1-q3 (map), ch1-q4 (math) on 1st attempt -> 3/4
      await advanceDialogue(page);
      await solveCurrentChallenge(page, { meetingTime: '16:00', finish: false });
      assert.equal(await page.locator('#total-hearts').innerText(), '총 ♥ 1/12');
      // 결과 대사에서 이전 → 활동 화면, 다시 풀어도 하트 그대로
      await page.locator('#next-button').click();
      assert.equal(await page.locator('#experiment').count(), 0, '결과 대사로 이동');
      await page.locator('#previous-button').click();
      assert.equal(await page.locator('#experiment').count(), 1, '결과 대사에서 이전 → 활동 화면');
      await solveCurrentChallenge(page, { meetingTime: '16:00' });
      assert.equal(await page.locator('#total-hearts').innerText(), '총 ♥ 1/12', '되돌아가 다시 풀어도 하트 그대로');

      await advanceDialogue(page, { choiceKey: 'early' }); // 16:00 storyPatch
      await advanceDialogue(page);
      await solveCurrentChallenge(page, { meetingTime: '16:00' });
      assert.equal(await page.locator('#total-hearts').innerText(), '총 ♥ 2/12');

      await advanceDialogue(page);
      await solveCurrentChallenge(page, { meetingTime: '16:00' });
      assert.equal(await page.locator('#total-hearts').innerText(), '총 ♥ 3/12');

      await advanceDialogue(page);
      assert.match(await page.locator('.chapter-clear-banner').innerText(), /♥ 3 \/ 4/);
      await page.screenshot({ path: path.join(resultsDir, 'v2-ch1-summary.png') });
      checks.push('첫 시도 하트 규칙·오답 재도전 0하트·새로고침/이전버튼 치트방지·v2 저장키 확인');

      // Ch.2 (4/4 hearts + cold choice on ch2-6)
      await page.locator('#next-chapter-btn').click();
      await playChapterToEnd(page, 2, {
        coldScenes: new Set(['마음 선택지']),
        onScene: async (heading) => {
          if (heading.includes('마음 선택지')) {
            // Capture heart choice screen once
            await advanceDialogueUntilChoiceOrEndPreview(page, path.join(resultsDir, 'v2-heart-choice.png'));
          }
        },
      });
      assert.match(await page.locator('.chapter-clear-banner').innerText(), /♥ 4 \/ 4/);
      assert.equal(await page.locator('#total-hearts').innerText(), '총 ♥ 7/12');

      // Ch.3 (4/4 hearts + warm on ch3-6 -> total 11/12 + cold = friend ending)
      await page.locator('#next-chapter-btn').click();
      const ch3Res = await playChapterToEnd(page, 3, {
        meetingChoice: 'early',
        polygonKey: 'hexagon',
        polygonAngle: '60',
      });
      assert.equal(ch3Res.endedAt, 'ending-report');
      assert.equal(await page.locator('.ending-report-layout').getAttribute('data-outcome'), 'friend');
      assert.match(await page.locator('.ending-badge').innerText(), /찐친/);
      assert.match(await page.locator('.missed-list').innerText(), /프로그래밍과 입력·처리·출력/);
      assert.equal(await page.locator('[data-retry-chapter="1"]').isVisible(), true);
      await page.screenshot({ path: path.join(resultsDir, 'v2-ending-friend-report.png') });
      checks.push('12문항 전체 시뮬레이터·퀴즈 완주 및 찐친 엔딩(11/12)·오답 리포트 확인');

      // Retry Ch.1 with skip-seen-dialogue -> 4/4 -> revisit ending -> 12/12 + cold Friend-zone!
      await page.locator('[data-retry-chapter="1"]').click();
      assert.equal(await page.locator('#skip-seen-button').isVisible(), true, '재도전 시 이미 본 대사 건너뛰기 노출');
      await playChapterToEnd(page, 1, { meetingChoice: 'early', skipSeen: true });
      assert.match(await page.locator('.chapter-clear-banner').innerText(), /♥ 4 \/ 4/);
      assert.equal(await page.locator('#total-hearts').innerText(), '총 ♥ 12/12');
      await page.locator('#revisit-ending-btn').click();
      await advanceDialogue(page, { skipSeen: true });
      assert.equal(await page.locator('.ending-report-layout').getAttribute('data-outcome'), 'friend');
      assert.equal(await page.locator('.cold-callout').isVisible(), true, '12/12 + cold 찐친 안내 표시');
      assert.equal(await page.locator('[data-retry-chapter="2"]').isVisible(), true);
      await page.screenshot({ path: path.join(resultsDir, 'v2-ending-12-cold.png') });

      // Retry Ch.2 choosing warm on 마음 선택지 -> clears coldChoices -> 썸 시작 True Ending!
      await page.locator('[data-retry-chapter="2"]').click();
      await playChapterToEnd(page, 2, { skipSeen: true });
      await page.locator('#revisit-ending-btn').click();
      await page.locator('input[name="variant"][value="girl"]').check();
      await advanceDialogue(page, { skipSeen: true });
      assert.equal(await page.locator('.ending-report-layout').getAttribute('data-outcome'), 'some');
      assert.match(await page.locator('.ending-badge').innerText(), /썸 시작/);
      assert.equal(await page.locator('.perfect-note').isVisible(), true);
      assert.equal(await page.locator('.ending-lights svg').getAttribute('data-shape'), '6');
      await page.screenshot({ path: path.join(resultsDir, 'v2-ending-some.png') });
      checks.push('이미 본 대사 건너뛰기·12/12+cold 찐친 분기·재도전 cold 해제→썸 시작 진엔딩 확인');

      // Mobile 390x844 horizontal overflow checks across key screens
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false, '390px 엔딩 리포트 가로 넘침 없음');
      await page.locator('#home-button').click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false, '390px 타이틀 가로 넘침 없음');
      await page.locator('[data-chapter="2"]').click();
      await advanceDialogue(page, { skipSeen: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false, '390px 시뮬레이터 가로 넘침 없음');
      await page.screenshot({ path: path.join(resultsDir, 'v2-mobile-390.png'), fullPage: true });
      checks.push('모바일 390x844 타이틀·시뮬레이터·엔딩 리포트 가로 넘침 0건 확인');

      await ctx.close();
    }

    // 3. Teacher Mode (?mode=teacher): all unlock, teacher notes, all graded simulator wrong hints, awkward ending
    {
      const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      attachGuards(page, errors, consoleErrors, remote);
      await page.goto(`${romanceUrl}?mode=teacher`);

      assert.equal(await page.locator('#stage').getAttribute('data-mode'), 'teacher');
      assert.equal(await page.locator('[data-chapter="3"]').isDisabled(), false, '교사 모드 Ch.3 해금');
      await page.locator('[data-chapter="1"]').click();
      assert.equal(await page.locator('#contents-button').isVisible(), true);
      assert.equal(await page.locator('#teaching-tools').isVisible(), true);

      await page.locator('#settings-button').click();
      assert.equal(await page.locator('#short-mode-field').isVisible(), true);
      assert.equal(await page.locator('#site-url-field').isVisible(), true);
      await page.locator('[data-close="settings-dialog"]').click();

      const jump = async (id) => {
        await page.locator('#contents-button').click();
        await page.locator(`[data-scene="${id}"]`).click();
      };
      const enterExp = async (id, key = null) => {
        await jump(id);
        await advanceDialogue(page, { choiceKey: key });
      };

      // Teacher notes dialog
      await jump('ch1-2');
      await page.locator('#teacher-button').click();
      assert.match(await page.locator('#notes-content').innerText(), /발문/);
      await page.screenshot({ path: path.join(resultsDir, 'v2-teacher-notes.png') });
      await page.locator('[data-close="notes-dialog"]').click();

      // Verify wrong-attempt misconception feedback on every graded simulator
      await enterExp('ch1-3'); // arrange: 초대장
      await page.locator('#run-arrange').click();
      await waitForActivityFail(page);
      assert.match(await page.locator('.sim-screen').innerText(), /정문 님! 내일 정문에서 만나요\. 보유 티켓: 3장/, '버그 초대장 재현');

      await enterExp('ch1-5'); // map
      await page.locator('#start-map').click();
      await waitForActivityFail(page);
      await page.locator('#map-event').selectOption('ArrowRight');
      await page.locator('#map-angle').selectOption('0');
      await page.locator('#run-map-block').click();
      await waitForActivityFail(page);

      await enterExp('ch1-6'); // math
      await page.locator('#run').click();
      await waitForActivityFail(page);
      await page.locator('[data-math-formula="paren"]').click();
      await page.locator('#math-quotient').fill('2');
      await page.locator('#math-remainder').fill('1');
      await page.locator('#run').click();
      await waitForActivityFail(page);

      await enterExp('ch2-2'); // compare
      await page.locator('#run').click();
      await waitForActivityFail(page);

      await enterExp('ch2-3'); // and
      await page.locator('[data-logic-answer="true"]').click();
      await page.locator('#run').click();
      await waitForActivityFail(page);

      await enterExp('ch2-4'); // route
      await page.locator('#run').click();
      await waitForActivityFail(page);
      await page.locator('#route-rain-check').selectOption('not');
      await page.locator('#run').click();
      await waitForActivityFail(page);

      await enterExp('ch2-5'); // prize
      await page.locator('#run').click();
      await waitForActivityFail(page);

      await enterExp('ch3-2'); // count
      await page.locator('[data-count-final="on"]').click();
      await page.locator('#run').click();
      await waitForActivityFail(page);

      await enterExp('ch3-3', 'triangle'); // polygon interior trap 60°
      await page.locator('#run').click();
      await waitForActivityFail(page);
      assert.match(await page.locator('#result').innerText(), /안쪽 각/);

      await enterExp('ch3-4'); // until
      await page.locator('#run-until').click();
      await waitForActivityFail(page);
      await page.locator('#until-body').selectOption('inside');
      await page.locator('#run-until').click();
      await waitForActivityFail(page);

      // Jump to ch3-7 with <= 6 hearts -> awkward ending + teacher ending preview pills
      await jump('ch3-7');
      await advanceDialogue(page);
      assert.equal(await page.locator('.ending-report-layout').getAttribute('data-outcome'), 'awkward');
      assert.match(await page.locator('.ending-badge').innerText(), /어색한 사이/);
      await page.screenshot({ path: path.join(resultsDir, 'v2-ending-awkward.png') });

      await page.locator('[data-preview-ending="some"]').click();
      await advanceDialogue(page);
      assert.equal(await page.locator('.ending-report-layout').getAttribute('data-outcome'), 'some');

      await ctx.close();
      checks.push('교사 모드(?mode=teacher)·전 시뮬레이터 오답 힌트·어색한 사이(<=6/12) 엔딩·엔딩 미리보기 확인');
    }

    // 4. Embed Mode (?embed=1): data-embed=true, hidden #fullscreen, 0 localStorage, postMessage contract
    {
      const romanceHtml = fs.readFileSync(publicRomancePath);
      const server = http.createServer((req, res) => {
        const u = req.url.split('?')[0];
        if (u === '/host.html') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<!doctype html><html lang="ko"><body style="margin:0"><iframe id="game" src="/festival-romance.html?embed=1" style="width:1280px;height:720px;border:0"></iframe><script>window.__msgs=[];window.addEventListener("message",e=>window.__msgs.push(e.data));</script></body></html>\n');
          return;
        }
        if (u === '/festival-romance.html') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(romanceHtml);
          return;
        }
        if (u === '/favicon.ico') {
          res.writeHead(204);
          res.end();
          return;
        }
        res.writeHead(404);
        res.end();
      });
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      const { port } = server.address();
      const baseUrl = `http://127.0.0.1:${port}`;
      const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
      try {
        await ctx.addInitScript(() => {
          if (!window.location.search.includes('embed=1')) return;
          window.__lsAccessCount = 0;
          const bump = () => { window.__lsAccessCount += 1; };
          const proto = window.Storage && window.Storage.prototype;
          if (proto) {
            for (const m of ['getItem', 'setItem', 'removeItem', 'clear', 'key']) {
              const orig = proto[m];
              proto[m] = function (...args) {
                bump();
                return orig.apply(this, args);
              };
            }
          }
        });
        const page = await ctx.newPage();
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (msg) => {
          if (msg.type() === 'error') consoleErrors.push(msg.text());
        });
        page.on('request', (req) => {
          if (/^https?:/.test(req.url()) && !req.url().startsWith(baseUrl)) remote.push(req.url());
        });
        await page.goto(`${baseUrl}/host.html`);
        const frame = page.frameLocator('#game');
        await frame.locator('#stage[data-embed="true"]').waitFor();
        assert.equal(await frame.locator('body').getAttribute('data-embed'), 'true');
        assert.equal(await frame.locator('#fullscreen').isVisible(), false, 'embed 모드에서 전체화면 버튼 숨김');
        assert.equal(await frame.locator('#chapter-list').isVisible(), false, 'embed 모드에서 init 전 챕터 카드 숨김');

        // Spoofed festival:init from inside iframe must be ignored
        const gameFrame = page.frames().find((f) => f.url().includes('embed=1'));
        assert.ok(gameFrame, 'embed iframe frame 찾기');
        await gameFrame.evaluate(() => {
          window.postMessage({ type: 'festival:init', payload: { nickname: '해커', onboarded: true } }, '*');
        });
        assert.equal(await frame.locator('#title-view').isVisible(), true);

        // Valid festival:init from parent hydrates state and jumps directly to ch3-6
        await page.evaluate(() => {
          const iframe = document.getElementById('game');
          iframe.contentWindow.postMessage({
            type: 'festival:init',
            payload: {
              nickname: '임베드',
              variant: 'girl',
              onboarded: true,
              chapterId: 3,
              sceneId: 'ch3-6',
              story: { meetingTime: '16:00', polygon: 6, prize: 'large' },
              chapterResults: {
                1: { completed: true, hearts: 4, questions: {} },
                2: { completed: true, hearts: 4, questions: {} },
                3: { completed: false, hearts: 0, questions: {} },
              },
              activeRuns: {
                3: {
                  missedThisRun: {},
                  solvedThisRun: {
                    'ch3-q1': { firstAttempt: true, solved: true, conceptTitle: 'q1' },
                    'ch3-q2': { firstAttempt: true, solved: true, conceptTitle: 'q2' },
                    'ch3-q3': { firstAttempt: true, solved: true, conceptTitle: 'q3' },
                    'ch3-q4': { firstAttempt: true, solved: true, conceptTitle: 'q4' },
                  },
                },
              },
              coldChoices: {},
              seenScenes: {},
            },
          }, '*');
        });
        await frame.locator('.story-heading h2').waitFor();
        assert.match(await frame.locator('.story-heading h2').innerText(), /마음 선택지/);
        await page.screenshot({ path: path.join(resultsDir, 'v2-embed-1366.png') });

        // Advance ch3-6 warm -> ch3-7 -> ending report -> verify festival:state & festival:complete
        for (let i = 0; i < 30; i++) {
          if (await frame.locator('.ending-report-layout').count()) break;
          if (await frame.locator('#story-choices button:visible').count()) {
            await frame.locator('#story-choices button:not([data-cold-choice="true"])').first().click();
          } else {
            await frame.locator('#next-button').click();
          }
        }
        const embedInfo = await page.evaluate(() => window.__msgs);
        const stateMsgs = embedInfo.filter((m) => m?.type === 'festival:state');
        const completeMsgs = embedInfo.filter((m) => m?.type === 'festival:complete');
        assert.ok(stateMsgs.length > 0, 'festival:state postMessage 송신');
        assert.equal(completeMsgs.length, 1, 'festival:complete postMessage 송신');
        assert.equal(completeMsgs[0].payload.outcome, 'some');
        assert.equal(completeMsgs[0].payload.totalHearts, 12);
        const lsCount = await gameFrame.evaluate(() => window.__lsAccessCount || 0);
        assert.equal(lsCount, 0, 'embed 모드에서는 localStorage 접근 0회');
      } finally {
        await ctx.close();
        await new Promise((resolve) => server.close(resolve));
      }
      checks.push('임베드 모드(?embed=1)·postMessage(init/state/complete)·출처 검증·localStorage 0회 확인');
    }

    // 5. v3 sprite crop visual contact sheets (rows=1 mapping across 6 expression slots)
    {
      const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
      const page = await ctx.newPage();
      await page.goto(romanceUrl);
      const assets = await page.evaluate(() => ({
        assets: window.FESTIVAL_ASSETS,
        labels: window.FestivalModels.EXPRESSION_LABELS,
        crops: [0, 1, 2, 3, 4, 5].map((i) => window.FestivalModels.spriteCrop(i, 1)),
      }));
      for (const variant of ['boy', 'girl']) {
        await page.setContent(
          `<style>body{margin:0;background:#dbe3e8;font-family:sans-serif;display:grid;grid-template-columns:repeat(3,1fr)}figure{margin:10px;text-align:center}div{height:300px;aspect-ratio:1/2;margin:auto;background-image:url("${assets.assets[variant]}");background-repeat:no-repeat}</style>` +
            assets.crops.map((c, i) => `<figure><div style="background-size:${c.backgroundSize};background-position:${c.backgroundPosition}"></div><figcaption>${i}: ${assets.labels[i]}</figcaption></figure>`).join(''),
        );
        await page.screenshot({ path: path.join(resultsDir, `expressions-v3-${variant}.png`) });
      }
      await ctx.close();
      checks.push('v3 남녀 3x1 스프라이트 6표정 매핑 시트 저장 확인');
    }

    assert.deepEqual(errors, []);
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(remote, []);
    const report = {
      status: 'pass',
      checks,
      errors,
      consoleErrors,
      remoteRequests: remote.length,
      at: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(resultsDir, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

async function advanceDialogueUntilChoiceOrEndPreview(page, screenshotPath) {
  for (let i = 0; i < 12; i++) {
    if (await page.locator('#story-choices button:visible').count()) {
      await page.screenshot({ path: screenshotPath });
      return;
    }
    const nextBtn = page.locator('#next-button');
    if (!(await nextBtn.isDisabled())) await nextBtn.click();
    else return;
  }
}
