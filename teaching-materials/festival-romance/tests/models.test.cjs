/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node tooling uses CommonJS. */
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/models.js');

test('입력값은 문자로 다루고 변수는 새 값으로 교체한다', () => {
  assert.equal(m.formatInvitation('여울'), '여울 님의 초대장');
  assert.equal(m.formatInvitation('<b>'), '<b> 님의 초대장');
  assert.equal(m.overwriteDemo('여울', '구름'), '구름');
  assert.deepEqual(m.answerDemo(['여울', '정문'], true), { answer: '정문', name: '여울', place: '정문' });
  assert.deepEqual(m.answerDemo(['여울', '정문'], false), { answer: '정문', name: '', place: '' });
});

test('방향키는 엔트리 방향으로 움직이며 지도 경계를 벗어나지 않는다', () => {
  assert.deepEqual(m.moveOnMap({ x: 2, y: 2 }, 'ArrowRight'), { x: 3, y: 2, direction: 90 });
  assert.deepEqual(m.moveOnMap({ x: 0, y: 0 }, 'ArrowUp'), { x: 0, y: 0, direction: 0 });
  assert.equal(m.moveOnMap({ x: 4, y: 4 }, 'ArrowDown').y, 4);
  assert.deepEqual(m.moveOnMap({ x: 1, y: 2 }, 'ArrowLeft'), { x: 0, y: 2, direction: 270 });
});

test('티켓 산술·괄호·몫·나머지의 실제 결과', () => {
  assert.deepEqual(m.ticketMath(6, 4), { total: 10, average: 5, withoutParentheses: 8 });
  assert.deepEqual(m.divideTickets(7, 2), { quotient: 3, remainder: 1 });
  for (const value of ['', 'abc', 1.5, -1, 11, Infinity]) assert.equal(m.boundedInteger(value, 0, 10), null);
  assert.equal(m.boundedInteger('0', 0, 10), 0);
});

test('비교 경계와 중첩 조건은 명확하다', () => {
  assert.equal(m.compareTicket(6, '>', 6), false);
  assert.equal(m.compareTicket(6, '≥', 6), true);
  assert.equal(m.compareTicket(5, '≤', 6), true);
  assert.equal(m.compareTicket(6, '≠', 6), false);
  assert.deepEqual([4, 5, 6, 8].map(m.choosePrize), ['sticker', 'small', 'small', 'large']);
  assert.equal(m.chooseRoute(true), 'indoor');
  assert.equal(m.chooseRoute(false), 'outdoor');
});

test('AND·OR의 네 조합과 NOT', () => {
  for (const a of [false, true]) {
    for (const b of [false, true]) {
      assert.equal(m.logicResult(a, b, 'and'), a && b);
      assert.equal(m.logicResult(a, b, 'or'), a || b);
      assert.equal(m.logicResult(a, b, 'not'), !a);
    }
  }
});

test('3·4·5·6각형의 외각과 닫힌 경로', () => {
  for (const n of [3, 4, 5, 6]) {
    assert.equal(m.polygonTurn(n), 360 / n);
    const p = m.polygonPath(n, 80);
    assert.equal(p.length, n + 1);
    assert.ok(Math.hypot(p.at(-1).x, p.at(-1).y) < 0.001);
  }
  const wrong = m.polygonPath(3, 80, 60);
  assert.ok(Math.hypot(wrong.at(-1).x, wrong.at(-1).y) > 1);
});

test('조건 반복은 사전 검사하고 정답 이후 질문하지 않는다', () => {
  assert.deepEqual(m.untilTrace('', ['1111', '1234', '5555'], '1234'), { questions: 2, open: true });
  assert.deepEqual(m.untilTrace('1234', ['1111'], '1234'), { questions: 0, open: true });
  assert.deepEqual(m.untilTrace('', ['1111'], '1234'), { questions: 1, open: false });
  assert.deepEqual(m.incrementReady(4), { count: 5, complete: true });
});

test('spriteCrop은 1행(v3)과 2행(6표정) 시트 모두에서 6표정 좌표와 라벨을 계산한다', () => {
  const row1Expected = [
    [0, '0% 0%', '하루 · 미소'],
    [1, '50% 0%', '하루 · 수줍음'],
    [2, '100% 0%', '하루 · 환한 웃음'],
    [3, '50% 0%', '하루 · 놀람'],
    [4, '50% 0%', '하루 · 곤란'],
    [5, '100% 0%', '하루 · 장난기'],
  ];
  for (const [idx, pos, label] of row1Expected) {
    assert.deepEqual(m.spriteCrop(idx, 1), {
      expression: idx,
      rows: 1,
      backgroundSize: '300% 100%',
      backgroundPosition: pos,
      label,
    });
  }

  const row2Expected = [
    [0, '0% 0%'],
    [1, '50% 0%'],
    [2, '100% 0%'],
    [3, '0% 100%'],
    [4, '50% 100%'],
    [5, '100% 100%'],
  ];
  for (const [idx, pos] of row2Expected) {
    const crop = m.spriteCrop(idx, 2);
    assert.equal(crop.expression, idx);
    assert.equal(crop.rows, 2);
    assert.equal(crop.backgroundSize, '300% 200%');
    assert.equal(crop.backgroundPosition, pos);
    assert.equal(crop.label, `하루 · ${m.EXPRESSION_LABELS[idx]}`);
  }

  assert.equal(m.spriteCrop(-1, 1).expression, 0);
  assert.equal(m.spriteCrop(6, 2).expression, 0);
  assert.equal(m.spriteCrop('2', 1).expression, 0);
});

test('computeEndingOutcome은 총 하트와 마음 선택지 거절 여부에 따라 3가지 엔딩을 판정한다', () => {
  assert.equal(m.computeEndingOutcome(12, false), 'some');
  assert.equal(m.computeEndingOutcome(12, true), 'friend');
  assert.equal(m.computeEndingOutcome(11, false), 'friend');
  assert.equal(m.computeEndingOutcome(7, false), 'friend');
  assert.equal(m.computeEndingOutcome(7, true), 'friend');
  assert.equal(m.computeEndingOutcome(6, false), 'awkward');
  assert.equal(m.computeEndingOutcome(6, true), 'awkward');
  assert.equal(m.computeEndingOutcome(0, false), 'awkward');
  assert.equal(m.computeEndingOutcome(NaN, false), 'awkward');
});

test('gradeQuizAnswer·evaluatePolygonTurn·evaluatePrizeBranches는 오개념 피드백과 판정을 반환한다', () => {
  const choiceQuiz = {
    inputType: 'choice',
    choices: [
      { key: 'a', label: '맞는 답', correct: true },
      { key: 'b', label: '틀린 답', correct: false, why: '순서가 바뀌었어요.' },
    ],
    defaultWhy: '다시 보세요.',
  };
  assert.equal(m.gradeQuizAnswer(choiceQuiz, 'a').correct, true);
  const wrongChoice = m.gradeQuizAnswer(choiceQuiz, 'b');
  assert.equal(wrongChoice.correct, false);
  assert.equal(wrongChoice.why, '순서가 바뀌었어요.');
  assert.equal(m.gradeQuizAnswer(choiceQuiz, 'missing').why, '다시 보세요.');

  const shortQuiz = {
    inputType: 'short',
    answer: '120',
    normalize: 'number',
    unit: '°',
    wrongHints: [{ match: '60', why: '60°는 내각이에요.' }],
    defaultWhy: '360÷n을 계산하세요.',
  };
  assert.equal(m.gradeQuizAnswer(shortQuiz, '  ').empty, true);
  assert.equal(m.gradeQuizAnswer(shortQuiz, '120°').correct, true);
  assert.equal(m.gradeQuizAnswer(shortQuiz, '60°').why, '60°는 내각이에요.');
  assert.equal(m.gradeQuizAnswer(shortQuiz, '90').why, '360÷n을 계산하세요.');

  assert.deepEqual(m.evaluatePolygonTurn(3, 120), { correct: true, expected: 120, interior: 60, sum: 360 });
  assert.deepEqual(m.evaluatePolygonTurn(3, 60), { correct: false, expected: 120, interior: 60, sum: 180 });
  assert.equal(m.evaluatePolygonTurn(6, 60).correct, true);

  const tiers = [
    { key: 'large', min: 10, label: '큰 키링' },
    { key: 'small', min: 5, label: '작은 키링' },
    { key: 'sticker', min: 3, label: '별 스티커' },
  ];
  assert.equal(m.evaluatePrizeBranches(10, tiers, 'asc').matchedTier.key, 'sticker');
  assert.equal(m.evaluatePrizeBranches(10, tiers, 'desc').matchedTier.key, 'large');
});

test('seededOrder는 같은 seed에 같은 순열을 돌려준다', () => {
  const a = m.seededOrder('ch1-q1', 4);
  assert.deepEqual(m.seededOrder('ch1-q1', 4), a, '같은 seed는 같은 결과');
  assert.deepEqual([...a].sort(), [0, 1, 2, 3], '0..3의 순열');
  assert.deepEqual(m.seededOrder('x', 0), []);
  assert.deepEqual(m.seededOrder('x', 1), [0]);
  // 정답이 늘 첫 칸에 있지 않도록: 지금 퀴즈 문항 중 하나 이상은 0번(정답)이 첫 칸이 아님
  assert.ok(['ch1-q1', 'ch1-q2', 'ch3-q4'].some((id) => m.seededOrder(id, 4)[0] !== 0));
});

test('evaluateArrange는 허용 순서·블록 표기를 채점하고 처음 어긋난 블록을 알려 준다', () => {
  const goal = {
    blocks: [{ id: 'ask' }, { id: 'set', choices: ['정하기', '더하기'] }, { id: 'say' }],
    acceptOrders: [['ask', 'set', 'say'], ['set', 'ask', 'say']],
    expectedChoices: { set: 1 },
  };
  assert.deepEqual(m.evaluateArrange(['ask', 'set', 'say'], goal, { set: 1 }), { correct: true, firstWrongId: null });
  assert.deepEqual(m.evaluateArrange(['set', 'ask', 'say'], goal, { set: 1 }), { correct: true, firstWrongId: null }, '두 번째 허용 순서');
  assert.deepEqual(m.evaluateArrange(['say', 'ask', 'set'], goal, { set: 1 }), { correct: false, firstWrongId: 'say' }, '첫 줄부터 틀림');
  assert.deepEqual(m.evaluateArrange(['ask', 'say', 'set'], goal, { set: 1 }), { correct: false, firstWrongId: 'say' }, '둘째 줄이 틀림');
  assert.deepEqual(m.evaluateArrange(['ask', 'set', 'say'], goal, { set: 0 }), { correct: false, firstWrongId: 'set' }, '순서는 맞고 표기가 틀림');
  assert.deepEqual(m.evaluateArrange(['ask', 'set', 'say'], goal, {}), { correct: false, firstWrongId: 'set' }, '표기 기본값 0');
  assert.deepEqual(m.evaluateArrange([], goal, {}), { correct: false, firstWrongId: null }, '빈 순서');
});

test('evaluateTokens는 괄호·우선순위대로 계산하고 계산 순서를 돌려준다', () => {
  assert.deepEqual(m.evaluateTokens([5, '+', 9, '÷', 2]), { value: 9.5, steps: ['9 ÷ 2 = 4.5', '5 + 4.5 = 9.5'] });
  assert.deepEqual(m.evaluateTokens(['(', 5, '+', 9, ')', '÷', 2]), { value: 7, steps: ['5 + 9 = 14', '14 ÷ 2 = 7'] });
  assert.deepEqual(m.evaluateTokens([5, '+', '(', 9, '÷', 2, ')']), { value: 9.5, steps: ['9 ÷ 2 = 4.5', '5 + 4.5 = 9.5'] });
  assert.deepEqual(m.evaluateTokens(['(', '(', 5, '+', 9, ')', ')', '÷', 2]).value, 7, '겹괄호');
  assert.equal(m.evaluateTokens(['(', 5, '+', 9, '÷', 2]), null, '짝이 안 맞는 괄호');
  assert.equal(m.evaluateTokens([')', 5, '+', 9, '(', '÷', 2]), null, '닫는 괄호가 먼저');
  assert.equal(m.evaluateTokens(['(', ')', 5, '+', 9]), null, '빈 괄호');
});

test('evaluatePrizeBranches는 정해 준 검사 순서(키 배열)대로 처음 참인 줄에서 멈춘다', () => {
  const tiers = [{ key: 'large', min: 10, label: '큰 키링' }, { key: 'small', min: 5, label: '작은 키링' }, { key: 'sticker', min: 3, label: '별 스티커' }];
  assert.equal(m.evaluatePrizeBranches(10, tiers, ['small', 'large', 'sticker']).matchedTier.key, 'small', '≥5를 맨 위에 두면 10장도 작은 키링');
  assert.equal(m.evaluatePrizeBranches(10, tiers, ['large', 'small', 'sticker']).matchedTier.key, 'large');
  assert.deepEqual(m.evaluatePrizeBranches(6, tiers, ['large', 'small', 'sticker']).ordered.map((t) => t.key), ['large', 'small', 'sticker']);
  assert.equal(m.evaluatePrizeBranches(10, tiers, 'asc').matchedTier.key, 'sticker', '기존 asc/desc도 그대로');
});
