/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node tooling uses CommonJS. */
const { chromium } = require(process.env.FESTIVAL_PLAYWRIGHT_MODULE || '@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'qa-results');
fs.mkdirSync(output, { recursive: true });

const publicRomancePath = path.resolve(root, '../../public/festival-romance.html');
const publicLessonPath = path.resolve(root, '../../public/festival-lesson.html');
const romanceUrl = `${pathToFileURL(publicRomancePath).href}?mode=teacher`;
const lessonUrl = pathToFileURL(publicLessonPath).href;

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.FESTIVAL_BROWSER ? { executablePath: process.env.FESTIVAL_BROWSER } : { channel: 'chrome' }),
  });
  try {
    const checks = [];
    const errors = [];
    const consoleErrors = [];
    const remote = [];

    // Check preserved original teacher lesson loads cleanly with zero errors
    {
      const lessonPage = await browser.newPage({ viewport: { width: 1366, height: 768 } });
      lessonPage.on('pageerror', (e) => errors.push(e.message));
      lessonPage.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      lessonPage.on('request', (r) => { if (/^https?:/.test(r.url())) remote.push(r.url()); });
      await lessonPage.goto(lessonUrl);
      const count = await lessonPage.evaluate(() => FESTIVAL_CHAPTERS.reduce((n, c) => n + c.scenes.length, 0));
      assert.equal(count, 27);
      await lessonPage.close();
      checks.push('원본 public/festival-lesson.html (27장면) 무오류 로드 확인');
    }

    for (const motion of ['reduce', 'no-preference']) {
      const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: motion });
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('request', (r) => { if (/^https?:/.test(r.url())) remote.push(r.url()); });

      await page.clock.install({ time: new Date('2026-10-19T00:00:00Z') });
      await page.goto(romanceUrl);
      await page.clock.pauseAt(new Date('2026-10-19T00:01:00Z'));
      await page.locator('[data-chapter="1"]').click();

      const jump = async (id) => {
        await page.locator('#contents-button').click();
        await page.locator(`[data-scene="${id}"]`).click();
      };
      const enter = async (id, key) => {
        await jump(id);
        for (let i = 0; i < 14; i++) {
          if (await page.locator('#experiment').count()) return;
          const choices = page.locator('#story-choices button:visible');
          if (await choices.count()) {
            await (key ? page.locator(`#story-choices button[data-flow-choice="${key}"]`) : choices.first()).click();
          } else {
            await page.locator('#next-button').click();
          }
        }
        throw new Error(`활동 진입 실패 ${id}`);
      };

      const countPace = motion === 'reduce' ? 450 : 320;
      const polyPace = motion === 'reduce' ? 220 : 260;

      // ch3-2 (count ch3-q1): test times 4 + pause/resume + restart
      await enter('ch3-2');
      await page.locator('#times').selectOption('4');
      await page.locator('#run').click();
      assert.equal(await page.locator('#next-button').isEnabled(), false, '자동 실행 직후 아직 완료되지 않음');
      assert.match(await page.locator('#loop-count').innerText(), /0 \/ 4/);
      assert.equal(await page.locator('#light-on-code.trace').count(), 1);
      const onStyle = await page.locator('#count-light').evaluate((el) => ({
        bg: getComputedStyle(el).backgroundColor,
        shadow: getComputedStyle(el).boxShadow,
      }));
      assert.equal(onStyle.bg, 'rgb(255, 216, 121)');
      if (motion === 'reduce') {
        assert.equal(onStyle.shadow, 'none', '동작 줄이기에서는 전구 발광 그림자 번쩍임을 끔');
      } else {
        assert.notEqual(onStyle.shadow, 'none', '일반 모션에서는 켜진 전구에 발광 그림자 표시');
      }
      await page.clock.runFor(countPace);
      assert.equal(await page.locator('#light-wait-code.trace').count(), 1);
      await page.clock.runFor(countPace);
      assert.match(await page.locator('#loop-count').innerText(), /1 \/ 4/);
      assert.equal(await page.locator('#light-off-code.trace').count(), 1);
      assert.equal(
        await page.locator('#count-light').evaluate((el) => getComputedStyle(el).backgroundColor),
        'rgb(213, 211, 207)',
        '불 끄기 실행 후 전구 꺼짐',
      );
      await page.locator('#stop').click();
      await page.clock.runFor(countPace * 2);
      assert.match(await page.locator('#loop-count').innerText(), /1 \/ 4/);
      await page.locator('#run').click();
      assert.match(await page.locator('#loop-count').innerText(), /1 \/ 4/, '일시 정지 후 완료 횟수 유지');
      assert.equal(await page.locator('#light-on-code.trace').count(), 1);
      await page.clock.runFor(20000);
      assert.equal(await page.locator('#next-button').isEnabled(), true);
      assert.match(await page.locator('#loop-count').innerText(), /4 \/ 4/);
      await page.locator('#run').click();
      assert.match(await page.locator('#loop-count').innerText(), /0 \/ 4/, '완료 후 실행은 처음부터');
      await page.locator('#stop').click();
      checks.push(`${motion}: 조명 4회 명령별 진행·일시정지/재개·완료 후 새 실행`);

      // ch3-3 (polygon ch3-q2): cheat-free 3/4/6 polygons, step-by-step timer playback, pause/resume
      for (const [key, sides, angle] of [['triangle', 3, 120], ['pentagon', 5, 72], ['hexagon', 6, 60]]) {
        await enter('ch3-3', key);
        assert.equal(await page.locator('#fit').count(), 0);
        await page.locator('#turn').selectOption(String(angle));
        await page.locator('#run').click();
        assert.equal(await page.locator('#next-button').isEnabled(), false);
        assert.match(await page.locator('#polygon-stage').getAttribute('aria-label'), /1번 이동, 0번 회전/);
        if (key === 'triangle') await page.screenshot({ path: path.join(output, `playback-${motion}-move.png`) });
        await page.clock.runFor(polyPace);
        assert.match(await page.locator('#polygon-stage').getAttribute('aria-label'), /1번 이동, 1번 회전/);
        if (key === 'triangle') await page.screenshot({ path: path.join(output, `playback-${motion}-turn.png`) });
        await page.locator('#stop').click();
        await page.clock.runFor(polyPace * 2);
        assert.match(await page.locator('#polygon-stage').getAttribute('aria-label'), /1번 이동, 1번 회전/);
        await page.locator('#run').click();
        assert.match(await page.locator('#polygon-stage').getAttribute('aria-label'), /2번 이동, 1번 회전/, '일시 정지 후 다음 명령부터 재개');
        await page.clock.runFor(20000);
        assert.equal(await page.locator('#next-button').isEnabled(), true);
        assert.match(await page.locator('#polygon-stage').getAttribute('aria-label'), new RegExp(`${sides}번 이동, ${sides}번 회전`));
        await page.locator('#run').click();
        assert.match(await page.locator('#polygon-stage').getAttribute('aria-label'), /1번 이동, 0번 회전/, '완료 후 실행은 처음부터');
        await page.locator('#stop').click();
      }
      checks.push(`${motion}: 세 도형(치트 제거) 이동→회전→완성·일시정지 후 재개·새 실행`);

      // Wrong interior trap, modal pause, input reset, scene exit cleanup
      await enter('ch3-3', 'triangle');
      await page.locator('#run').click(); // starts at 60° interior trap
      await page.clock.runFor(20000);
      assert.equal(await page.locator('#next-button').isEnabled(), false);
      assert.match(await page.locator('#result').innerText(), /안쪽 각/);
      await page.locator('#turn').selectOption('120');
      await page.locator('#run').click();
      await page.locator('#teacher-button').click();
      const paused = await page.locator('#polygon-stage').getAttribute('aria-label');
      await page.clock.runFor(polyPace * 4);
      assert.equal(await page.locator('#polygon-stage').getAttribute('aria-label'), paused);
      await page.locator('[data-close="notes-dialog"]').click();
      await page.clock.runFor(polyPace);
      assert.match(await page.locator('#polygon-stage').getAttribute('aria-label'), /1번 이동, 1번 회전/);
      await page.locator('#stop').click();
      const stopped = await page.locator('#polygon-stage').getAttribute('aria-label');
      await page.clock.runFor(polyPace * 3);
      assert.equal(await page.locator('#polygon-stage').getAttribute('aria-label'), stopped);
      await page.locator('#turn').selectOption('90');
      await page.clock.runFor(polyPace * 2);
      assert.match(await page.locator('#polygon-stage').getAttribute('aria-label'), /0번 이동, 0번 회전/);
      await page.locator('#run').click();
      await jump('ch1-1');
      await page.clock.runFor(20000);
      assert.equal(await page.locator('#polygon-stage').count(), 0);
      assert.equal(await page.locator('#stage').getAttribute('data-voice'), 'narration');
      checks.push(`${motion}: 내각 함정 오개념·교사메모 모달 보류·정지·입력 변경·장면 이탈 정리`);

      if (motion === 'reduce') {
        assert.equal(await page.locator('.app-origin').isVisible(), false);
        await page.locator('#next-button').click();
        assert.equal(await page.locator('#stage').getAttribute('data-medium'), 'app');
        assert.equal(await page.locator('.app-origin').isVisible(), true);
        assert.equal(await page.locator('.app-origin img').evaluate((img) => img.complete && img.naturalWidth > 0), true);
        await page.screenshot({ path: path.join(output, 'app-message-1366.png') });
        await page.locator('#next-button').click();
        assert.equal(await page.locator('#stage').getAttribute('data-medium'), 'scene', '내 생각(내레이션)은 현장 화면');
        await page.locator('#next-button').click();
        await page.locator('#next-button').click();
        assert.equal(await page.locator('#stage').getAttribute('data-medium'), 'app');
        assert.match(await page.locator('#dialogue-text').innerText(), /이 시간에 테스트해 준 거야/);

        await page.setViewportSize({ width: 390, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false);
        const text = await page.locator('#dialogue-text').boundingBox();
        const box = await page.locator('.dialogue-box').boundingBox();
        assert.ok(text.x >= box.x && text.x + text.width <= box.x + box.width);
        await page.screenshot({ path: path.join(output, 'app-message-390.png'), fullPage: true });

        await page.setViewportSize({ width: 1366, height: 768 });
        await jump('ch2-1');
        await page.locator('#next-button').click();
        assert.equal(await page.locator('.app-origin').isVisible(), false);
        await page.locator('#next-button').click();
        assert.equal(await page.locator('.app-origin').isVisible(), true);
        assert.match(await page.locator('#dialogue-text').innerText(), /12분 전/);
        await page.screenshot({ path: path.join(output, 'app-arrival-1366.png') });
        checks.push('앱 알림·채팅 전용 이미지·내 생각/현장 대화 구분·390px 레이아웃 확인');
      }

      await page.close();
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
      clock: 'Playwright controlled clock; real scheduled intervals advanced one command at a time',
      at: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(output, 'playback-app-report.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
