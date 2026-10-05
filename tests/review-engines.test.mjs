import test from 'node:test';
import assert from 'node:assert/strict';
import { initialSandwich, stepSandwich, reviewSandwich, parseSandwichCommand } from '../src/lib/classroom/review/sandwich-engine.mjs';

test('샌드위치: 명시하지 않은 준비 행동은 추가하지 않고 실패 뒤 상태를 보존한다', () => {
  const state = initialSandwich();
  assert.deepEqual(parseSandwichCommand('식빵 꺼내').actions, ['TAKE_BREAD']);
  assert.equal(stepSandwich(state, 'TAKE_BREAD').success, false);
  assert.equal(state.breadOnPlate, 0);
  assert.equal(stepSandwich(state, 'OPEN_BAG').success, true);
  assert.equal(stepSandwich(state, 'TAKE_BREAD').success, true);
  assert.equal(state.breadOnPlate, 1);
});
test('샌드위치: 다양한 속 재료와 넓은 면·뒤집기·포장 제거를 실제 실행으로 확인한다', () => {
  const state = initialSandwich();
  for (const action of ['OPEN_BAG', 'TAKE_BREAD', 'TAKE_BREAD', 'OPEN_JAM', 'SCOOP_JAM', 'SPREAD_JAM_BREAD1_FLAT', 'COVER_BREAD_NORMAL']) assert.equal(stepSandwich(state, action).success, true);
  assert.equal(state.completed, true);
  assert.equal(reviewSandwich(state).isFlawless, true);
  assert.equal(reviewSandwich({ ...state, cheesePlasticIncluded: true }).isFlawless, false);
  assert.equal(reviewSandwich({ ...state, bread1Spread: 'none' }).isFlawless, false);
});
