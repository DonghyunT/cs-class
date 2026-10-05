import test from 'node:test';
import assert from 'node:assert/strict';
import { quotaWindow, parseSolarEnvelope, hasExplicitPreparation, groundFlowReview } from '../src/lib/classroom/review/ai-protocol.mjs';

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
