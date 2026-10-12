import test from 'node:test';
import assert from 'node:assert/strict';
import { quotaWindow, parseSolarEnvelope, hasExplicitPreparation, groundFlowReview } from '../src/lib/classroom/review/ai-protocol.mjs';
import * as protocol from '../src/lib/classroom/review/ai-protocol.mjs';

test('요소 7개는 공백을 제외한 서로 다른 관측값이어야 하며 빈 값과 중복을 거절한다', () => {
  assert.equal(typeof protocol.hasDistinctOptions, 'function');
  const options = ['현재 시각', '남은 과제', '제출 기한', '문제 수', '노트 색', '배경 음악', '펜 모양'];
  assert.equal(protocol.hasDistinctOptions(options, 7), true);
  assert.equal(protocol.hasDistinctOptions(options.slice(1), 7), false);
  assert.equal(protocol.hasDistinctOptions([...options.slice(0, 6), ' \n '], 7), false);
  assert.equal(protocol.hasDistinctOptions([...options.slice(0, 6), ' 현재시각 '], 7), false);
  assert.deepEqual(options, ['현재 시각', '남은 과제', '제출 기한', '문제 수', '노트 색', '배경 음악', '펜 모양']);
});

test('한국 날짜 경계와 최근 60초 15회·하루 70회 경계를 구분한다', () => {
  const now = Date.parse('2026-10-05T15:00:00Z');
  const previous = { day: '2026-10-05', count: 70, calls: Array(14).fill(now - 1000) };
  assert.deepEqual(quotaWindow(previous, now), { day: '2026-10-06', count: 0, calls: Array(14).fill(now - 1000), allowed: true });
  assert.equal(quotaWindow({ day: '2026-10-06', count: 70, calls: [] }, now).allowed, false);
  assert.equal(quotaWindow({ day: '2026-10-06', count: 69, calls: Array(15).fill(now - 59000) }, now).allowed, false);
  assert.equal(quotaWindow({ day: '2026-10-06', count: 69, calls: Array(15).fill(now - 60000) }, now).allowed, true);
});
test('AI가 명시하지 않은 봉지·뚜껑 열기나 재료 뜨기를 추가하지 못한다', () => {
  assert.equal(hasExplicitPreparation('식빵 꺼내', ['OPEN_BAG', 'TAKE_BREAD']), false);
  assert.equal(hasExplicitPreparation('빵 봉지를 열고 식빵을 꺼내', ['OPEN_BAG', 'TAKE_BREAD']), true);
  assert.equal(hasExplicitPreparation('봉지를 열고 잼을 빵에 발라', ['OPEN_JAM']), false);
  assert.equal(hasExplicitPreparation('잼 뚜껑을 열고 칼에 잼을 묻혀', ['OPEN_JAM', 'SCOOP_JAM']), true);
  assert.equal(hasExplicitPreparation('빵에 잼을 발라', ['SCOOP_JAM']), false);
});
test('Solar의 잘린 응답·형식 오류·여러 선택지를 성공으로 처리하지 않는다', () => {
  const envelope = (content, finish_reason = 'stop') => ({ choices: [{ finish_reason, message: { content } }] });
  assert.deepEqual(parseSolarEnvelope(envelope('{"message":"안내"}')), { message: '안내' });
  assert.throws(() => parseSolarEnvelope(envelope('{"message":"안내"}', 'length')));
  assert.throws(() => parseSolarEnvelope(envelope('```json\n{}\n```')));
  assert.throws(() => parseSolarEnvelope({ choices: [] }));
});

test('순서도 통과의 조건 근거는 실제 기호에서 인용하며 기획서나 없는 문장을 근거로 쓰지 않는다', () => {
  const result = { message: '조건을 충족했어요.', verdict: 'pass' };
  const project = { conditions: ['준비물을 챙긴다'], nodes: [{ id: 'ready', text: '일어나 씻고 준비물을 챙긴다' }] };
  const checks = [{ conditionIndex: 0, status: 'met', nodeId: 'ready', evidence: '준비물을 챙긴다' }];
  assert.deepEqual(groundFlowReview(result, checks, project), result);
  const missing = { ...project, nodes: [{ id: 'ready', text: '일어나 씻는다' }] };
  assert.equal(groundFlowReview(result, checks, missing).verdict, 'uncertain');
  assert.equal(groundFlowReview(result, [{ ...checks[0], status: 'missing', nodeId: '', evidence: '' }], missing).verdict, 'needs-changes');
  assert.equal(groundFlowReview(result, [], project).verdict, 'uncertain');
  assert.equal(groundFlowReview(result, [checks[0], checks[0]], project).verdict, 'uncertain');
  assert.equal(groundFlowReview(result, [{ ...checks[0], nodeId: 'planning-card' }], project).verdict, 'uncertain');
});

test('빈 조건 줄은 보존하되 검토에서 제외하고 단말의 행동 문구를 실행 근거로 삼지 않는다', () => {
  const result = { message: '조건을 충족했어요.', verdict: 'pass' };
  const project = { conditions: ['', '준비물을 챙긴다', '  '], nodes: [{ id: 'ready', shape: 'process', text: '씻고 준비물을 챙긴다' }] };
  const checks = [{ conditionIndex: 1, status: 'met', nodeId: 'ready', evidence: '준비물을 챙긴다' }];
  assert.deepEqual(groundFlowReview(result, checks, project), result);
  assert.deepEqual(project.conditions, ['', '준비물을 챙긴다', '  ']);
  assert.equal(groundFlowReview(result, [{ ...checks[0], conditionIndex: 0 }], project).verdict, 'uncertain');
  assert.equal(groundFlowReview(result, [], { ...project, conditions: ['  '] }).verdict, 'uncertain');
  assert.equal(groundFlowReview(result, checks, { ...project, nodes: [{ ...project.nodes[0], shape: 'terminal' }] }).verdict, 'uncertain');
});

test('무조건 필요한 행동을 건너뛰는 종료 경로는 통과하지 않고 조건부 행동은 분기를 허용한다', () => {
  const result = { message: '조건을 충족했어요.', verdict: 'pass' };
  const nodes = [{ id: 'start', shape: 'terminal', text: '시작' }, { id: 'check', shape: 'decision', text: '비가 오는가?' }, { id: 'prep', shape: 'process', text: '준비물을 챙긴다' }, { id: 'end', shape: 'terminal', text: '종료' }];
  const edges = [{ from: 'start', to: 'check', label: '' }, { from: 'check', to: 'prep', label: '예' }, { from: 'check', to: 'end', label: '아니오' }, { from: 'prep', to: 'end', label: '' }];
  const check = { conditionIndex: 0, status: 'met', nodeId: 'prep', evidence: '준비물을 챙긴다', appliesTo: 'every-path' };
  const project = { conditions: ['준비물을 챙긴다'], nodes, edges };
  assert.equal(groundFlowReview(result, [check], project).verdict, 'uncertain');
  assert.equal(groundFlowReview(result, [{ ...check, appliesTo: 'conditional-path' }], { ...project, conditions: ['비가 오면 준비물을 챙긴다'] }).verdict, 'pass');
  const linear = { ...project, nodes: nodes.filter(n => n.id !== 'check'), edges: [{ from: 'start', to: 'prep', label: '' }, { from: 'prep', to: 'end', label: '' }] };
  assert.equal(groundFlowReview(result, [check], linear).verdict, 'pass');
  const duplicated = { ...project, nodes: [...nodes, { id: 'other', shape: 'process', text: '가방에 준비물을 넣는다' }], edges: edges.map(e => e.from === 'check' && e.label === '아니오' ? { ...e, to: 'other' } : e).concat({ from: 'other', to: 'end', label: '' }) };
  const both = { ...check, additionalEvidence: [{ nodeId: 'other', evidence: '가방에 준비물을 넣는다' }] };
  assert.equal(groundFlowReview(result, [both], duplicated).verdict, 'pass');
  assert.equal(groundFlowReview(result, [{ ...both, additionalEvidence: [{ nodeId: 'other', evidence: '없는 행동' }] }], duplicated).verdict, 'uncertain');
});
