/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node tooling uses CommonJS. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const S = require('../src/state.js');
const M = require('../src/models.js');

const root = path.resolve(__dirname, '..');
const ch1 = require('../src/chapters/ch1.cjs');
const ch2 = require('../src/chapters/ch2.cjs');
const ch3 = require('../src/chapters/ch3.cjs');

test('초대장/설정 이름은 주인공 이름과 이야기 상태를 유지하며 반영한다', () => {
  assert.equal(typeof S.applyIdentity, 'function');
  const state = S.createStoryState();
  state.story.prize = 'sticker';
  S.applyIdentity(state, '  구름  ');
  assert.equal(state.nickname, '구름');
  assert.equal(state.story.ticketName, '구름');
  assert.equal(state.story.prize, 'sticker');
});

test('확정한 부스 운영 상태와 우산·통로 대기 경로를 이어받는다', () => {
  assert.equal(S.storyValues({ boothOpen: true }).boothOpen, true);
  for (const [r, u, p, want] of [
    [true, false, false, 'wait'],
    [true, true, false, 'indoor'],
    [true, false, true, 'indoor'],
    [true, true, true, 'indoor'],
    [false, false, false, 'outdoor'],
  ]) {
    assert.equal(M.chooseRoute(r, u, p), want);
  }
});

test('개편된 3챕터에는 optional:true 없이 1~3단원 핵심 개념 12문항이 모두 배정된다', () => {
  const allGraded = [ch1, ch2, ch3].flatMap((ch) => ch.scenes.filter((s) => s.graded));
  assert.equal(allGraded.length, 12);
  assert.deepEqual(
    allGraded.map((s) => [s.questionId, s.experiment]),
    [
      ['ch1-q1', 'quiz'],
      ['ch1-q2', 'quiz'],
      ['ch1-q3', 'map'],
      ['ch1-q4', 'math'],
      ['ch2-q1', 'compare'],
      ['ch2-q2', 'and'],
      ['ch2-q3', 'route'],
      ['ch2-q4', 'prize'],
      ['ch3-q1', 'count'],
      ['ch3-q2', 'polygon'],
      ['ch3-q3', 'until'],
      ['ch3-q4', 'quiz'],
    ],
  );
  for (const ch of [ch1, ch2, ch3]) {
    assert.equal(ch.scenes.some((s) => s.optional), false);
  }
  const ch1Meeting = ch1.scenes.find((s) => s.id === 'ch1-4');
  assert.deepEqual(
    ch1Meeting.choices.map((c) => c.storyPatch?.meetingTime),
    ['16:00', '17:00'],
  );
});

test('소스 코드와 챕터 데이터에 치트 버튼·비밀번호 노출·외부 요청이 없다', () => {
  const srcFiles = [
    'src/shell.html',
    'src/styles.css',
    'src/models.js',
    'src/state.js',
    'src/experiments.js',
    'src/app.js',
    'src/chapters/ch1.cjs',
    'src/chapters/ch2.cjs',
    'src/chapters/ch3.cjs',
  ];
  for (const rel of srcFiles) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    for (const forbidden of ['#fit', '#correct', "button('fit", "button('correct", '비밀번호는 1600', "'1600'", '"1600"']) {
      assert.equal(text.includes(forbidden), false, `${rel}에 금지 문자열 존재: ${forbidden}`);
    }
    assert.equal(/\b(?:src|href)\s*=\s*["']https?:\/\//i.test(text), false, `${rel} 외부 URL 금지`);
  }
});
