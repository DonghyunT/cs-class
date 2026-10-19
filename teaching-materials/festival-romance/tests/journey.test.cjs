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

test('선택 반응과 실행 결과를 함께 잇고 간결 모드에도 실제 결과를 남긴다',()=>{
 assert.equal(typeof S.responseLines,'function');
 const chapter=require('../src/chapters/ch2.cjs');
 const scene=chapter.scenes.find(s=>s.id==='ch2-6'),flow=scene.flow;
 assert.equal(flow.options.length,2);
 for(const choice of flow.options){
  assert.ok(flow.choiceReplies[choice.key].length>0);
  for(const result of ['indoor','outdoor','wait']){
   const lines=S.responseLines(flow,choice.key,result,false);
   assert.deepEqual(lines,[...flow.choiceReplies[choice.key],...flow.responses[result]]);
   const short=S.responseLines(flow,choice.key,result,true);
   assert.deepEqual(short[0],flow.responses[result][0]);
  }
 }
 assert.deepEqual(S.responseLines({responses:{default:[{text:'기본 결과'}]}},'unknown','unknown',false),[{text:'기본 결과'}]);
});

test('본편 선택은 같은 활동으로 이어지며 각 선택을 받아 주는 반응이 있다',()=>{
 const chapter1=require('../src/chapters/ch1.cjs');
 const opening=chapter1.scenes.find(s=>s.id==='ch1-1');
 assert.equal(opening.choices.length,2);assert.equal(opening.choiceReplies.length,2);
 for(const [chapter,id]of [[1,'ch1-3'],[2,'ch2-6'],[2,'ch2-7'],[3,'ch3-5']]){
  const flow=require('../src/chapters/ch'+chapter+'.cjs').scenes.find(s=>s.id===id).flow;
  assert.equal(flow.options.length,2,id);
  assert.equal(new Set(flow.options.map(o=>o.key)).size,2,id);
  for(const option of flow.options)assert.ok(flow.choiceReplies[option.key].length>0,id+' '+option.key);
 }
});
