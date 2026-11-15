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
      ['ch1-q1', 'arrange'],
      ['ch1-q2', 'quiz'],
      ['ch1-q3', 'map'],
      ['ch1-q4', 'arrange'],
      ['ch2-q1', 'compare'],
      ['ch2-q2', 'quiz'],
      ['ch2-q3', 'route'],
      ['ch2-q4', 'prize'],
      ['ch3-q1', 'count'],
      ['ch3-q2', 'polygon'],
      ['ch3-q3', 'until'],
      ['ch3-q4', 'arrange'],
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
    for (const forbidden of ['#fit', '#correct', "button('fit", "button('correct", '비밀번호는 1600', "'1600'", '"1600"', '파이썬', 'print(', 'input(']) {
      assert.equal(text.includes(forbidden), false, `${rel}에 금지 문자열 존재: ${forbidden}`);
    }
    assert.equal(/\b(?:src|href)\s*=\s*["']https?:\/\//i.test(text), false, `${rel} 외부 URL 금지`);
  }
});

test('하트 문항은 풀기 전에 보이는 미션 목표·하루의 한마디에 정답을 적지 않는다', () => {
  const answerHints = {
    'ch1-q1': ['먼저 묻', '입력 → 처리 → 출력', '말하기를'],
    'ch1-q2': ['더하기', '바로', '저장해'],
    'ch1-q3': ['90°'],
    'ch1-q4': ['괄호'],
    'ch2-q1': ['≥', '>'],
    'ch2-q2': ['그리고', 'AND'],
    'ch2-q3': ['아니다', '또는'],
    'ch2-q4': ['큰 기준', '≥'],
    'ch3-q1': ['4번으로'],
    'ch3-q2': ['360', '바깥'],
    'ch3-q3': ['대답 =', '반복 안'],
  };
  const graded = [ch1, ch2, ch3].flatMap((ch) => ch.scenes.filter((s) => s.graded));
  for (const [qId, hints] of Object.entries(answerHints)) {
    const scene = graded.find((s) => s.questionId === qId);
    for (const hint of hints) {
      assert.equal(scene.goalPrompt.includes(hint), false, `${qId} 미션 목표에 정답 단서: ${hint}`);
    }
  }
  // 하루의 한마디 첫 문구는 하트 문항에서 observe(정답 요약)를 쓰지 않는다.
  const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
  assert.match(app, /companion-note-text">\$\{escape\(interpolate\(scene\.graded\?/);
});

test('채점 선택지는 정답 보기만 유독 길지 않다(오답 평균의 ±25%)', () => {
  const quizzes = [ch1, ch2, ch3].flatMap((ch) => ch.scenes.filter((s) => s.graded))
    .flatMap((s) => [s.quiz, s.goal?.chat].filter(Boolean).map((q) => [s.questionId, q]))
    .flatMap(([id, q]) => (q.steps ? q.steps.map((st, i) => [`${id}:${i}`, st]) : [[id, q]]));
  assert.ok(quizzes.length > 0);
  for (const [id, q] of quizzes) {
    if (!Array.isArray(q.choices) || q.choices.length < 2) continue;
    const right = q.choices.filter((c) => c.correct);
    const wrong = q.choices.filter((c) => !c.correct);
    assert.equal(right.length, 1, `${id} 정답 1개`);
    const avg = wrong.reduce((sum, c) => sum + c.label.length, 0) / wrong.length;
    const ratio = right[0].label.length / avg;
    assert.ok(ratio >= 0.75 && ratio <= 1.25, `${id} 정답 길이 비율 ${ratio.toFixed(2)}`);
  }
});

test("대화형 문항(style:'chat')은 단계마다 정답 1개·보기 3~4개·오답마다 이유가 있다", () => {
  const chats = [ch1, ch2, ch3].flatMap((ch) => ch.scenes)
    .flatMap((s) => [s.quiz, s.goal?.chat].filter((q) => q && q.style === 'chat').map((q) => [s.questionId, q]));
  for (const [id, q] of chats) {
    assert.ok(Array.isArray(q.steps) && q.steps.length >= 1, `${id} 단계 1개 이상`);
    q.steps.forEach((step, i) => {
      assert.ok(typeof step.prompt === 'string' && step.prompt.trim(), `${id}:${i} 질문`);
      assert.ok(step.choices.length >= 3 && step.choices.length <= 4, `${id}:${i} 보기 3~4개`);
      assert.equal(step.choices.filter((c) => c.correct).length, 1, `${id}:${i} 정답 1개`);
      for (const c of step.choices.filter((x) => !x.correct)) assert.ok(c.why, `${id}:${i}:${c.key} 오답 이유`);
    });
  }
});

test('첫 화면 하루 문구는 R1 결정 문장이다', () => {
  const shell = fs.readFileSync(path.join(root, 'src/shell.html'), 'utf8');
  assert.ok(shell.includes('버그 좀 같이 잡아 줄래? …끝나면, 축제도 같이 돌자.'), 'R1 문구');
  assert.equal(shell.includes('실력 좀 빌려줄래'), false, '옛 문구 제거');
});

test('ch1-q3 도입 증상은 처음 설정(시작하기 버튼 신호·0°)으로 실제 일어나는 일과 맞다', () => {
  const sc = ch1.scenes.find((s) => s.questionId === 'ch1-q3');
  assert.equal(sc.goal.initialEvent, 'start');
  assert.equal(sc.goal.initialAngle, 0);
  assert.match(sc.quote, /시작 버튼.*하늘/, '시작 버튼 → 위(하늘)로 감');
  assert.match(sc.quote, /→ 키.*먹통/, '→ 키 → 연결 안 됨');
  for (const line of sc.flow.intro.filter((l) => l.role === 'haru')) {
    for (const t of typeof line.text === 'string' ? [line.text] : Object.values(line.text)) {
      assert.equal(/시작 버튼[^,.]*(안 움직|먹통)/.test(t), false, `시작 버튼이 먹통이라는 옛 증상: ${t}`);
    }
  }
});

test('순서 바꾸기는 1장 1번 하나뿐이고, 1장 2번은 실행 기록을 보고 하루와 2턴 대화로 푼다', () => {
  // 순서를 옮기는 퍼즐만 셉니다(fixedOrder 블록판은 표기만 바꾸는 조작 활동)
  const arranges = [ch1, ch2, ch3].flatMap((ch) => ch.scenes).filter((s) => s.experiment === 'arrange' && !s.goal?.fixedOrder).map((s) => s.questionId);
  assert.deepEqual(arranges, ['ch1-q1']);
  const q = ch1.scenes.find((s) => s.questionId === 'ch1-q2').quiz;
  assert.equal(q.style, 'chat');
  assert.equal(q.steps.length, 2);
  assert.ok(Array.isArray(q.code) && q.code.some((l) => l.includes('정하기')), '하루의 블록 코드 표시');
  assert.ok(Array.isArray(q.trace) && q.trace.length >= 4, '실행 기록 표시');
  assert.match(q.screen, /정문 님!.*3장/, '버그 초대장 화면');
});

test('환영 문구의 빈 이름은 버그라는 것을 먼저 알려 준다', () => {
  const lines = ch1.scenes.find((s) => s.id === 'ch1-1').lines;
  const blankAt = lines.findIndex((l) => typeof l.text === 'string' && l.text.includes('" 님, 환영해요!'));
  assert.ok(blankAt > 0, '빈 이름 환영 문구 줄');
  assert.match(lines[blankAt - 1].text, /이상/, '보여 주기 직전에 이상하다고 예고');
});

test('1장 1번은 우리말 메모를 프로그래밍 언어로 설명하지 않는다', () => {
  const q1 = ch1.scenes.find((s) => s.questionId === 'ch1-q1');
  const card = ch1.scenes.find((s) => s.kind === 'summary').cards[0][1];
  for (const t of [q1.observe, q1.teacher.answer, card]) {
    assert.equal(/서로 다른 언어|다른 언어로|메모든 엔트리 블록이든 같은 명령/.test(t), false, `메모=언어 오개념: ${t}`);
  }
});

test('하트 문항의 도입 대사·인용·대화 질문에도 정답 단서가 없다', () => {
  const answerHints = {
    'ch1-q1': ['먼저 묻', '입력 → 처리 → 출력', '말하기를'],
    'ch1-q2': ['더하기', '저장해'],
    'ch1-q3': ['90°'],
    'ch1-q4': ['[내 티켓]', '÷ 2', '변수로'],
  };
  const texts = (v) => (v == null ? [] : typeof v === 'string' ? [v] : Object.values(v));
  for (const [qId, hints] of Object.entries(answerHints)) {
    const sc = ch1.scenes.find((s) => s.questionId === qId);
    const pre = [sc.quote, ...(sc.flow.intro || []).flatMap((l) => texts(l.text)), ...((sc.goal?.chat?.steps || sc.quiz?.steps || []).map((st) => st.prompt))];
    for (const t of pre) for (const h of hints) assert.equal(t.includes(h), false, `${qId} 풀기 전 문구에 정답 단서 '${h}': ${t}`);
  }
});

test('다중 선택 자판기의 마지막 줄은 가짜 "또는" 없이 "아니면, 만일"이다', () => {
  const src = fs.readFileSync(path.join(root, 'src/experiments.js'), 'utf8');
  assert.equal(/아니면 \(또는/.test(src), false, '③ 아니면 (또는 ≥ N) 같은 가짜 OR 표기 금지');
});

test('2장 입장 티켓 수는 1장 끝의 7장씩과 이어진다', () => {
  const goal = ch2.scenes.find((s) => s.questionId === 'ch2-q1').goal;
  assert.equal(goal.threshold, 7);
  assert.equal(goal.initialTickets, 7);
});

test('대사에 게임 구조 표현(1챕터 등)이 없고, 하루짜리 축제에 "내일 축제 끝나고"가 없다', () => {
  for (const ch of [ch1, ch2, ch3]) {
    const all = JSON.stringify(ch);
    assert.equal(/[123]챕터/.test(all), false, `${ch.id}장에 '챕터' 표현`);
  }
  const ending = JSON.stringify(ch3.scenes.find((s) => s.ending));
  assert.equal(/내일 축제 끝나고/.test(ending), false);
});

test('3장 엔딩 리포트에 반복 단원 핵심 정리 카드가 있고, 찐친 안내는 두 조건을 모두 말한다', () => {
  const end = ch3.scenes.find((s) => s.ending);
  assert.ok(Array.isArray(end.cards) && end.cards.length >= 4, '3장 핵심 정리 카드');
  assert.match(end.endings.friend.footer, /마음 선택지/, '12/12 하트 + 마음 선택지 조건');
});

test('1장 6번은 1단원 개념(변수 값이 바뀌면 계산도 바뀜)이고 괄호 우선순위·몫·나머지를 다루지 않는다', () => {
  const sc = ch1.scenes.find((s) => s.questionId === 'ch1-q4');
  assert.equal(sc.experiment, 'arrange');
  assert.equal(sc.goal.fixedOrder, true, '순서 이동 없는 블록판');
  const all = JSON.stringify(sc);
  assert.equal(/몫과 나머지|나머지 ?\d|우선순위|괄호가 없으면/.test(all), false, '1단원 밖 내용 없음');
  assert.match(sc.conceptTitle, /변수/);
  const card = ch1.scenes.find((s) => s.kind === 'summary').cards.map((c) => c.join(' ')).join(' ');
  assert.equal(/몫|나머지|우선순위/.test(card), false, '정리 카드도 1단원 범위');
});
