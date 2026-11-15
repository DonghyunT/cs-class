/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node tooling uses CommonJS. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const distHtml = fs.readFileSync(path.join(root, 'dist/festival-romance.html'), 'utf8');
const publicPath = path.resolve(root, '../../public/festival-romance.html');
const distLessonPath = path.join(root, 'dist/festival-lesson.html');
const publicLessonPath = path.resolve(root, '../../public/festival-lesson.html');

test('독립 HTML에 세 챕터·22장면·12문항·겹침 없는 v13 6표정(2행) 스프라이트 정보가 포함된다', () => {
  assert.equal(/\r/.test(distHtml), false, 'dist/festival-romance.html은 LF 줄바꿈이어야 합니다');
  assert.equal((distHtml.match(/"id":"ch[1-3]-[1-9]"/g) || []).length, 22);
  const spriteMatch = distHtml.match(/window\.FESTIVAL_SPRITE_ROWS=([^;]+);/);
  assert.ok(spriteMatch, 'FESTIVAL_SPRITE_ROWS 주입 확인');
  assert.deepEqual(JSON.parse(spriteMatch[1]), { boy: 2, girl: 2 });
  const build = fs.readFileSync(path.join(root, 'build.cjs'), 'utf8');
  assert.ok(build.includes("'haru-boy-v13.png'") && build.includes("'haru-girl-v13.png'"), '빌드가 v13 시트를 사용');
  assert.ok(distHtml.includes('CS 복습 챌린지'));
  assert.ok(!distHtml.includes('금옥중학교'));
  assert.ok(Buffer.byteLength(distHtml) <= 20000000);
  assert.ok(!/본문 제작 예정/.test(distHtml));
});

test('외부 리소스·치트 잔재 없이 모든 내장 스크립트 5개가 유효하게 컴파일된다', () => {
  assert.ok(!/\b(?:src|href)\s*=\s*["']https?:\/\//i.test(distHtml));
  assert.ok(!/@import\s|\bfetch\s*\(|\bimport\s*\(/.test(distHtml));

  const scripts = [...distHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 5);
  for (const [i, s] of scripts.entries()) {
    assert.doesNotThrow(() => new vm.Script(s[1], { filename: `embedded-${i}.js` }));
  }

  const nonAssetHtml = distHtml.replace(/window\.FESTIVAL_ASSETS=\{[\s\S]*?\};/, '');
  for (const cheat of ['#fit', '#correct', "button('fit", "button('correct", "'1600'", '"1600"', '비밀번호는 1600']) {
    assert.equal(nonAssetHtml.includes(cheat), false, `치트 문자열 금지: ${cheat}`);
  }
});

test('웹 공개 파일과 오프라인 완성본·빌드 매니페스트·문서·원본 수업 파일이 일치한다', () => {
  assert.ok(fs.existsSync(publicPath));
  assert.equal(fs.readFileSync(publicPath, 'utf8'), distHtml);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'qa/build-manifest.json'), 'utf8'));
  assert.equal(manifest.html, 'festival-romance.html');
  assert.equal(manifest.publicPath, '/festival-romance.html');
  assert.equal(manifest.offlinePublicMatches, true);
  assert.equal(manifest.bytes, Buffer.byteLength(distHtml));
  assert.equal(manifest.sha256, createHash('sha256').update(distHtml).digest('hex'));

  assert.ok(fs.existsSync(distLessonPath) && fs.existsSync(publicLessonPath));
  const distLesson = fs.readFileSync(distLessonPath);
  const publicLesson = fs.readFileSync(publicLessonPath);
  assert.equal(Buffer.compare(distLesson, publicLesson), 0, '보존된 festival-lesson.html dist/public 일치');
  const lessonText = publicLesson.toString('utf8');
  assert.equal((lessonText.match(/"id":"ch[1-3]-[1-9]"/g) || []).length, 27);
  assert.equal([...lessonText.matchAll(/<script>([\s\S]*?)<\/script>/g)].length, 5);

  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.ok(readme.includes('12'));
  assert.ok(readme.includes('festival-lesson.html'));
  assert.ok(fs.existsSync(path.join(root, 'src/app.js')));
});
