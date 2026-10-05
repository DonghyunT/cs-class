import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextReviewSettings } from '../scripts/lib/review-rollout.mjs';
test('강아지 설정을 유지하고 테스트 수업 지정만 해제하며 단계별 복습을 연다',()=>{
  const dog={revision:4,currentLessonId:'programming-13',openedLessonIds:['programming-13','sequence-lab','flowchart-lab','entry-bot-lab']};
  const next=nextReviewSettings(dog,'sandwich'); assert.equal(next.currentLessonId,'programming-13'); assert.deepEqual(next.openedLessonIds,['programming-13','review-sandwich']); assert.equal(next.revision,5);
  const removed=nextReviewSettings({...dog,currentLessonId:'flowchart-lab'},'flowchart'); assert.equal(removed.currentLessonId,null); assert.deepEqual(removed.openedLessonIds,['programming-13','review-sandwich','review-abstraction','review-flowchart']);
});
