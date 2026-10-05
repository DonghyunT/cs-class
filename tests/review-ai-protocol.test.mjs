import test from 'node:test';
import assert from 'node:assert/strict';
import { quotaWindow, parseSolarEnvelope, hasExplicitPreparation } from '../src/lib/classroom/review/ai-protocol.mjs';

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
