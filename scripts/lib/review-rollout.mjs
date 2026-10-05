const retired = new Set(['sequence-lab','flowchart-lab','entry-bot-lab']);
const reviews = ['review-sandwich','review-abstraction','review-flowchart'];
export function nextReviewSettings(before, phase) {
  const index=['sandwich','abstraction','flowchart'].indexOf(phase);
  if(index<0 || !Array.isArray(before.openedLessonIds) || !Number.isSafeInteger(before.revision)) throw Error('Invalid phase or class settings.');
  return {openedLessonIds:[...new Set([...before.openedLessonIds.filter(id=>!retired.has(id)),...reviews.slice(0,index+1)])],currentLessonId:retired.has(before.currentLessonId)?null:before.currentLessonId,revision:before.revision+1};
}
