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
        // 카드 구조(정답 1개·오답 이유·실행 결과)는 refinement.test.cjs가 자세히 검사합니다.
        assert.ok((sc.experiment === 'quiz' && (Array.isArray(sc.quiz?.choices) || sc.quiz?.variants)) || (['order', 'number'].includes(sc.experiment) && sc.task), `${sc.id} 카드 또는 조작·단답형 문항 필수`);
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

test('성별 대사 객체는 text·line에만, 두 키 모두, 같은 {{변수}}', () => {
  const vars = (s) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort().join(',');
  const found = [];
  const walk = (value, parentKey, where) => {
    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, parentKey, `${where}[${i}]`));
      return;
    }
    if (!value || typeof value !== 'object') return;
    if ('boy' in value || 'girl' in value) {
      found.push(where);
      assert.deepEqual(Object.keys(value).sort(), ['boy', 'girl'], `${where}: boy·girl 두 키만`);
      assert.ok(['text', 'line'].includes(parentKey), `${where}: text·line 아래에만 (지금 ${parentKey})`);
      for (const k of ['boy', 'girl']) {
        assert.equal(typeof value[k], 'string', `${where}.${k} 문자열`);
        assert.ok(value[k].trim(), `${where}.${k} 비어 있지 않음`);
      }
      assert.equal(vars(value.boy), vars(value.girl), `${where}: 남녀 문장의 {{변수}}가 같아야 함`);
      return;
    }
    for (const [k, v] of Object.entries(value)) walk(v, k, `${where}.${k}`);
  };
  for (const ch of chapters) walk(ch, null, ch.id);
  assert.ok(found.length > 0, '성별 대사 객체가 실제로 있어야 구조 검사가 의미 있음');
});

test('하루의 감정 대사(본편 대사·응답·도입·성공 반응·엔딩)는 세 장 모두 남녀 두 가지다', () => {
  const plain = [];
  for (const sc of chapters.flatMap((ch) => ch.scenes)) {
    const groups = [sc.lines, ...(sc.choices || []).map((c) => c.reply), sc.flow?.intro, sc.flow?.firstTrySuccess, sc.flow?.retrySuccess, ...Object.values(sc.flow?.choiceReplies || {}), ...Object.values(sc.endings || {}).flatMap((e) => [e.lines, e.coldLines])];
    for (const g of groups.filter(Array.isArray)) {
      for (const line of g) if (line.role === 'haru' && typeof line.text === 'string') plain.push(`${sc.id}: ${line.text}`);
    }
  }
  assert.deepEqual(plain, [], '남녀로 나뉘지 않은 하루 대사');
});

test('2장에서 선을 그었으면 3장 시작·도형 장면에 그에 맞는 대사가 있다(when: cold/warm)', () => {
  for (const id of ['ch3-1', 'ch3-3']) {
    const sc = ch3.scenes.find((s) => s.id === id);
    const pool = [...(sc.lines || []), ...(sc.flow?.intro || [])];
    assert.ok(pool.some((l) => l.when === 'cold'), `${id} cold 대사`);
    assert.ok(pool.some((l) => l.when === 'warm'), `${id} warm 대사`);
  }
});
