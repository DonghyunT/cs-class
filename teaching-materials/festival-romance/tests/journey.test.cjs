/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node tooling uses CommonJS. */
const test=require('node:test'),assert=require('node:assert/strict'),S=require('../src/state.js');
test('확정한 약속과 도형만 복원하고 실행 중간 상태는 버린다',()=>{
 let raw;const storage={setItem(k,v){raw=v},getItem(){return raw}};
 S.saveBookmark(storage,{nickname:'구름',chapterId:3,sceneId:'ch3-4',story:{meetingTime:'16:00',prize:'sticker',polygon:3},running:true});
 const b=S.readBookmark(storage,['ch3-4']);
 assert.equal(b.story?.polygon,3);assert.equal(b.story.meetingTime,'16:00');assert.equal(b.story.prize,'sticker');assert.equal(b.running,undefined);
});
test('손상된 이야기 상태는 안전한 차시 기본값을 사용한다',()=>{
 const b=S.storyValues({polygon:999,route:'elsewhere',prize:'none',meetingTime:'24:00'});
 assert.equal(b.polygon,4);assert.equal(b.route,'indoor');assert.equal(b.prize,'small');assert.equal(b.meetingTime,'17:00');
});
test('입장권 부족 판정을 다음 논리 조건까지 전달한다',()=>{
 assert.equal(S.storyValues({boothAllowed:false}).boothAllowed,false);
 assert.equal(S.storyValues().boothAllowed,true);
});
