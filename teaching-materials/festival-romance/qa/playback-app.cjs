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
      // 카드 문항에는 재생 타이머가 없습니다. 첫 장면 대사가 내레이션으로 시작하는지만 확인합니다.
      await jump('ch1-1');
      assert.equal(await page.locator('#stage').getAttribute('data-voice'), 'narration');

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
      clock: 'Playwright controlled clock',
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
