/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node tooling uses CommonJS. */
const test = require('node:test');
const assert = require('node:assert/strict');
const s = require('../src/state.js');

const ids = ['ch1-1', 'ch1-2', 'ch2-1', 'ch2-6', 'ch3-6', 'ch3-7'];

test('저장 키가 v2 게임 전용 키로 격리되고 이름·한국어 호격을 정규화한다', () => {
  assert.equal(s.KEY, 'festival-romance.game.v2');
  assert.equal(s.normalizeNickname('  '), '여울');
  assert.equal(s.normalizeNickname('  하루  '), '하루');
  assert.equal(Array.from(s.normalizeNickname('가'.repeat(20))).length, 12);
  assert.equal(s.vocative('여울'), '여울아');
  assert.equal(s.vocative('하루'), '하루야');
  assert.equal(s.vocative('Alex'), 'Alex');
});

test('저장소 예외는 수업을 막지 않는다', () => {
  const fail = {
    getItem() { throw Error('blocked'); },
    setItem() { throw Error('blocked'); },
    removeItem() { throw Error('blocked'); },
  };
  assert.equal(s.readBookmark(fail, ids), null);
  assert.equal(s.saveBookmark(fail, {}), false);
  assert.equal(s.clearBookmark(fail), false);
  assert.equal(s.readGameState(fail, ids), null);
  assert.equal(s.saveGameState(fail, s.createStoryState()), false);
  assert.equal(s.clearGameState(fail), false);
  assert.equal(s.createStoryState().nickname, '여울');
});

test('알 수 없는 챕터·손상된 데이터·프로토타입 오염 키를 안전하게 거른다', () => {
  for (const raw of ['{', 'null', JSON.stringify({ chapterId: 99, sceneId: 'ch1-1' }), JSON.stringify({ chapterId: 1, sceneId: 'ch3-7' })]) {
    assert.equal(s.readBookmark({ getItem() { return raw; } }, ids), null);
  }
  const polluted = JSON.parse('{"nickname":"구름","variant":"girl","chapterId":2,"sceneId":"ch2-6","__proto__":{"polluted":true},"coldChoices":{"__proto__":true,"ch2-6":true},"seenScenes":{"constructor":true,"ch1-1":true},"chapterResults":{"1":{"completed":true,"hearts":99,"questions":{"ch1-q1":{"firstAttempt":true,"solved":true,"conceptTitle":"테스트"}}}}}');
  const clean = s.sanitizeGameState(polluted, ids);
  assert.equal(clean.chapterId, 2);
  assert.equal(clean.sceneId, 'ch2-6');
  assert.equal(clean.chapterResults[1].hearts, 4);
  assert.equal(Object.hasOwn(clean.coldChoices, '__proto__'), false);
  assert.equal(clean.coldChoices['ch2-6'], true);
  assert.equal(Object.hasOwn(clean.seenScenes, 'constructor'), false);
  assert.equal(clean.seenScenes['ch1-1'], true);
  assert.equal(({}).polluted, undefined);
});

test('festival-romance.game.v2 저장·복원과 activeRuns·coldChoices·seenScenes 보존', () => {
  const storage = s.createMemoryStorage();
  const state = s.createStoryState();
  s.applyIdentity(state, '구름');
  state.variant = 'girl';
  state.onboarded = true;
  state.chapterId = 2;
  state.sceneId = 'ch2-6';
  state.story = s.storyValues({ meetingTime: '16:00', prize: 'large', polygon: 6 });
  s.startChapterRun(state, 2);
  s.recordQuestionAttempt(state, 2, 'ch2-q1', { correct: false, conceptTitle: '비교', wrongWhy: '> 대신 ≥' });
  state.coldChoices['ch2-6'] = true;
  s.markSceneSeen(state, 'ch1-1');

  assert.equal(s.saveGameState(storage, state), true);
  assert.ok(storage.getItem(s.KEY));

  const restored = s.readGameState(storage, ids);
  assert.equal(restored.nickname, '구름');
  assert.equal(restored.variant, 'girl');
  assert.equal(restored.onboarded, true);
  assert.equal(restored.chapterId, 2);
  assert.equal(restored.sceneId, 'ch2-6');
  assert.equal(restored.story.meetingTime, '16:00');
  assert.equal(restored.story.polygon, 6);
  assert.equal(restored.activeRuns[2].missedThisRun['ch2-q1'], true);
  assert.equal(restored.coldChoices['ch2-6'], true);
  assert.equal(s.isSceneSeen(restored, 'ch1-1'), true);

  assert.equal(s.clearGameState(storage), true);
  assert.equal(s.readGameState(storage, ids), null);
});

test('첫 시도 하트 규칙과 재시도·중복제출·새로고침 방지(anti-cheat)', () => {
  const state = s.createStoryState();
  const qMeta = [
    { questionId: 'ch1-q1', conceptTitle: 'IPO' },
    { questionId: 'ch1-q2', conceptTitle: '변수' },
    { questionId: 'ch1-q3', conceptTitle: '사건과 방향각' },
    { questionId: 'ch1-q4', conceptTitle: '우선순위' },
  ];
  s.startChapterRun(state, 1);

  // ch1-q1: 틀린 뒤 재시도 성공 -> 0 하트
  const miss = s.recordQuestionAttempt(state, 1, 'ch1-q1', { correct: false, conceptTitle: 'IPO', wrongWhy: '입력 먼저' });
  assert.deepEqual(miss, { firstAttempt: false, earnedHeart: false, alreadySolved: false, missed: true });
  assert.equal(state.activeRuns[1].missedThisRun['ch1-q1'], true);

  const retryPass = s.recordQuestionAttempt(state, 1, 'ch1-q1', { correct: true, conceptTitle: 'IPO' });
  assert.deepEqual(retryPass, { firstAttempt: false, earnedHeart: false, alreadySolved: false, missed: true });

  // 이미 푼 문제를 다시 제출해도 하트 중복 지급 금지
  const dup = s.recordQuestionAttempt(state, 1, 'ch1-q1', { correct: true, conceptTitle: 'IPO' });
  assert.equal(dup.alreadySolved, true);
  assert.equal(dup.earnedHeart, false);

  // 나머지 3문항 첫 시도 정답 -> 3/4 하트
  for (const id of ['ch1-q2', 'ch1-q3', 'ch1-q4']) {
    const pass = s.recordQuestionAttempt(state, 1, id, { correct: true, conceptTitle: id });
    assert.deepEqual(pass, { firstAttempt: true, earnedHeart: true, alreadySolved: false, missed: false });
  }
  assert.equal(s.countRunHearts(state.activeRuns[1]), 3);
  assert.equal(s.countLiveTotalHearts(state, 1), 3);

  const committed = s.commitChapterRun(state, 1, qMeta);
  assert.equal(committed.completed, true);
  assert.equal(committed.hearts, 3);
  assert.equal(committed.questions['ch1-q1'].firstAttempt, false);
  assert.equal(committed.questions['ch1-q1'].lastWrongWhy, '입력 먼저');
  assert.equal(s.countTotalHearts(state), 3);

  // 재도전 시 더 낮은 점수(1점)여도 기존 최고 점수(3점) 유지
  s.startChapterRun(state, 1);
  s.recordQuestionAttempt(state, 1, 'ch1-q1', { correct: true, conceptTitle: 'IPO' });
  s.recordQuestionAttempt(state, 1, 'ch1-q2', { correct: false, conceptTitle: '변수' });
  s.commitChapterRun(state, 1, qMeta);
  assert.equal(state.chapterResults[1].hearts, 3);

  // 재도전 시 4/4 달성하면 최고 점수(4점)로 갱신
  s.startChapterRun(state, 1);
  for (const m of qMeta) s.recordQuestionAttempt(state, 1, m.questionId, { correct: true, conceptTitle: m.conceptTitle });
  s.commitChapterRun(state, 1, qMeta);
  assert.equal(state.chapterResults[1].hearts, 4);
  assert.equal(s.countTotalHearts(state), 4);
});

test('재도전 시 coldChoices 해제, 순차 해금, 임베드 메모리 저장소 격리를 검증한다', () => {
  const state = s.createStoryState();
  assert.equal(s.isChapterUnlocked(state, 1, false), true);
  assert.equal(s.isChapterUnlocked(state, 2, false), false);
  assert.equal(s.isChapterUnlocked(state, 3, false), false);
  assert.equal(s.isChapterUnlocked(state, 3, true), true);
  assert.equal(s.isChapterUnlocked(state, 4, true), false);

  state.chapterResults[1].completed = true;
  assert.equal(s.isChapterUnlocked(state, 2, false), true);
  assert.equal(s.isChapterUnlocked(state, 3, false), false);

  state.chapterResults[2].completed = true;
  assert.equal(s.isChapterUnlocked(state, 3, false), true);

  state.coldChoices['ch2-6'] = true;
  assert.equal(s.hasColdRejection(state), true);
  delete state.coldChoices['ch2-6'];
  assert.equal(s.hasColdRejection(state), false);

  let localTouched = 0;
  const spyLocal = {
    getItem() { localTouched++; return null; },
    setItem() { localTouched++; },
    removeItem() { localTouched++; },
  };
  const embedAdapter = s.createStorageAdapter({ embed: true, local: spyLocal });
  embedAdapter.setItem(s.KEY, '{"ok":true}');
  assert.equal(embedAdapter.getItem(s.KEY), '{"ok":true}');
  embedAdapter.removeItem(s.KEY);
  assert.equal(embedAdapter.getItem(s.KEY), null);
  assert.equal(localTouched, 0);
});
