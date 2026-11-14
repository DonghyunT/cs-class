/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node tooling uses CommonJS. */
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../src/state.js');

const ch1 = require('../src/chapters/ch1.cjs');
const ch2 = require('../src/chapters/ch2.cjs');
const ch3 = require('../src/chapters/ch3.cjs');
const chapters = [ch1, ch2, ch3];

const ALLOWED_VARS = new Set([
  'name',
  'vocative',
  'prizeName',
  'shapeName',
  'boothName',
  'routeDescription',
  'meetingTime',
  'ticketName',
  'threshold',
  'tickets',
  'times',
  'replyKey',
]);

function collectTexts(value, out = []) {
  if (typeof value === 'string') {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectTexts(item, out);
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectTexts(v, out);
  }
  return out;
}

test('확정한 약속과 도형만 복원하고 실행 중간 상태는 버린다', () => {
  const storage = S.createMemoryStorage();
  const state = S.createStoryState();
  S.applyIdentity(state, '구름');
  state.chapterId = 3;
  state.sceneId = 'ch3-4';
  state.story = S.storyValues({ meetingTime: '16:00', prize: 'sticker', polygon: 3 });
  state.running = true;
  S.saveGameState(storage, state);
  const restored = S.readGameState(storage, ['ch3-4']);
  assert.equal(restored.story?.polygon, 3);
  assert.equal(restored.story.meetingTime, '16:00');
  assert.equal(restored.story.prize, 'sticker');
  assert.equal(restored.running, undefined);
});

test('손상된 이야기 상태는 안전한 차시 기본값을 사용한다', () => {
  const b = S.storyValues({ polygon: 999, route: 'elsewhere', prize: 'none', meetingTime: '24:00' });
  assert.equal(b.polygon, 4);
  assert.equal(b.route, 'indoor');
  assert.equal(b.prize, 'small');
  assert.equal(b.meetingTime, '17:00');
});

test('conceptResponseLines는 첫 시도·재시도·간결 모드를 정확히 결합한다', () => {
  const flow = ch3.scenes.find((s) => s.id === 'ch3-3').flow;
  const firstFull = S.conceptResponseLines(flow, { choiceKey: 'triangle', isFirstTry: true, shortMode: false });
  assert.deepEqual(firstFull, [...flow.choiceReplies.triangle, ...flow.firstTrySuccess]);
  const retryFull = S.conceptResponseLines(flow, { choiceKey: 'triangle', isFirstTry: false, shortMode: false });
  assert.deepEqual(retryFull, [...flow.choiceReplies.triangle, ...flow.retrySuccess]);
  const firstShort = S.conceptResponseLines(flow, { choiceKey: 'triangle', isFirstTry: true, shortMode: true });
  assert.deepEqual(firstShort, [flow.firstTrySuccess[0]]);
});

test('3개 챕터·12개 등급 문항·마음 선택지·3가지 엔딩·교사 메모·템플릿 변수 스키마가 완결된다', () => {
  assert.deepEqual(chapters.map((c) => c.id), [1, 2, 3]);
  const gradedIds = [];
  let heartChoiceScenes = 0;
  let endingScenes = 0;

  for (const ch of chapters) {
    assert.ok(ch.recap && ch.scenes.length >= 6);
    const chGraded = ch.scenes.filter((s) => s.graded);
    assert.equal(chGraded.length, 4, `Ch.${ch.id}는 4문항이어야 합니다`);

    if (ch.id < 3) {
      assert.equal(ch.scenes.at(-1).kind, 'summary', `Ch.${ch.id}는 summary로 끝납니다`);
      assert.equal(ch.scenes.some((s) => s.ending), false);
    } else {
      assert.equal(ch.scenes.at(-1).ending, true, 'Ch.3은 ending 장면으로 끝납니다');
      assert.equal(ch.scenes.some((s) => s.kind === 'summary'), false);
    }

    for (const sc of ch.scenes) {
      assert.equal(Boolean(sc.optional), false, `${sc.id}에는 optional:true가 없어야 합니다`);
      assert.ok(sc.teacher && sc.teacher.ask && sc.teacher.answer && sc.teacher.watch && sc.teacher.short, `${sc.id} 교사 메모 필수`);

      if (sc.heartChoice) {
        heartChoiceScenes++;
        assert.ok(Array.isArray(sc.choices) && sc.choices.length >= 2, `${sc.id} 선택지 필요`);
        assert.equal(sc.choices.some((c) => !c.cold), true, `${sc.id} 따뜻한 선택지 필요`);
        assert.equal(sc.choices.some((c) => c.cold === true), true, `${sc.id} cold 선택지 필요`);
      }

      if (sc.choices) {
        for (const c of sc.choices) {
          assert.ok(c.key && c.label && Array.isArray(c.reply) && c.reply.length > 0, `${sc.id} 선택지 reply 필수`);
        }
      }

      if (sc.ending) {
        endingScenes++;
        assert.ok(sc.endings?.some && sc.endings?.friend && sc.endings?.awkward, '3가지 엔딩 필수');
        for (const k of ['some', 'friend', 'awkward']) {
          const ed = sc.endings[k];
          assert.ok(ed.badge && ed.title && ed.headline && Array.isArray(ed.lines) && ed.lines.length > 0 && ed.footer, `${k} 엔딩 필드 필수`);
        }
        assert.ok(sc.endings.friend.coldTitle && sc.endings.friend.coldHeadline && sc.endings.friend.coldCallout && Array.isArray(sc.endings.friend.coldLines), '12/12+cold 찐친 문구 필수');
      }

      if (sc.graded) {
        gradedIds.push(sc.questionId);
        assert.ok(sc.conceptTitle && sc.goalPrompt && sc.observe, `${sc.id} 개념 메타 필수`);
        assert.ok(sc.flow && Array.isArray(sc.flow.firstTrySuccess) && sc.flow.firstTrySuccess.length > 0, `${sc.id} firstTrySuccess 필수`);
        assert.ok(Array.isArray(sc.flow.retrySuccess) && sc.flow.retrySuccess.length > 0, `${sc.id} retrySuccess 필수`);
        assert.ok(sc.flow.wrongReaction && [3, 4].includes(sc.flow.wrongReaction.expression) && sc.flow.wrongReaction.line, `${sc.id} wrongReaction 필수`);
        if (sc.experiment === 'quiz') {
          assert.ok(sc.quiz && sc.quiz.prompt && Array.isArray(sc.quiz.choices), `${sc.id} quiz 필수`);
          assert.equal(sc.quiz.choices.some((c) => c.correct), true, `${sc.id} 정답 보기 필수`);
          for (const c of sc.quiz.choices) {
            if (!c.correct) assert.ok(c.why, `${sc.id} 오답 보기(${c.key}) why 필수`);
          }
        } else {
          assert.ok(sc.goal && sc.goal.wrongHints && sc.goal.defaultWhy, `${sc.id} goal.wrongHints/defaultWhy 필수`);
        }
      }

      for (const text of collectTexts(sc)) {
        for (const match of text.matchAll(/\{\{(\w+)\}\}/g)) {
          assert.equal(ALLOWED_VARS.has(match[1]), true, `${sc.id} 알 수 없는 템플릿 변수 {{${match[1]}}}`);
        }
      }
    }
  }

  assert.deepEqual(gradedIds, [
    'ch1-q1', 'ch1-q2', 'ch1-q3', 'ch1-q4',
    'ch2-q1', 'ch2-q2', 'ch2-q3', 'ch2-q4',
    'ch3-q1', 'ch3-q2', 'ch3-q3', 'ch3-q4',
  ]);
  assert.equal(heartChoiceScenes, 2);
  assert.equal(endingScenes, 1);
});
