/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node tooling uses CommonJS. */
const test=require('node:test'),assert=require('node:assert/strict'),S=require('../src/state.js');
test('초대장을 확정한 이름은 주인공 이름과 초대장 이름에 함께 반영한다',()=>{
 assert.equal(typeof S.applyIdentity,'function');const state=S.createStoryState();state.story.prize='sticker';S.applyIdentity(state,'  구름  ');assert.equal(state.nickname,'구름');assert.equal(state.story.ticketName,'구름');assert.equal(state.story.prize,'sticker');
});
test('확정한 부스 운영 상태를 확장 활동에서도 이어받는다',()=>{
 assert.equal(S.storyValues({boothOpen:true}).boothOpen,true);
});
test('모델이 우산·통로 유무에 따른 대기 경로도 판단한다',()=>{
 const M=require('../src/models.js');
 for(const [r,u,p,want] of [[true,false,false,'wait'],[true,true,false,'indoor'],[true,false,true,'indoor'],[true,true,true,'indoor'],[false,false,false,'outdoor']])assert.equal(M.chooseRoute(r,u,p),want);
});
test('기본 이야기에는 차시마다 중심 활동 세 개만 남긴다',()=>{
 for(const n of [1,2,3]){const chapter=require('../src/chapters/ch'+n+'.cjs');assert.equal(chapter.scenes.filter(s=>s.kind==='concept'&&!s.optional).length,3,`${n}차시 중심 활동`);}
});
