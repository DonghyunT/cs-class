/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node tooling uses CommonJS. */
const test=require('node:test');const assert=require('node:assert/strict');
const s=require('../src/state.js');const ids=['ch1-1','ch1-2','ch2-1','ch3-9'];
test('이름과 한국어 호격을 정규화한다',()=>{
  assert.equal(s.normalizeNickname('  '),'여울');assert.equal(s.normalizeNickname('  하루  '),'하루');
  assert.equal(Array.from(s.normalizeNickname('가'.repeat(20))).length,12);
  assert.equal(s.vocative('여울'),'여울아');assert.equal(s.vocative('하루'),'하루야');assert.equal(s.vocative('Alex'),'Alex');
});
test('저장소 예외는 수업을 막지 않는다',()=>{
  const fail={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}};
  assert.equal(s.readBookmark(fail,ids),null);assert.equal(s.saveBookmark(fail,{}),false);assert.equal(s.clearBookmark(fail),false);
  assert.equal(s.createStoryState().nickname,'여울');
});
test('알 수 없는 챕터·손상된 데이터는 복원하지 않는다',()=>{
  for(const raw of ['{', 'null', JSON.stringify({chapterId:99,sceneId:'ch1-1'}),JSON.stringify({chapterId:1,sceneId:'ch3-9'})]){
    assert.equal(s.readBookmark({getItem(){return raw}},ids),null);
  }
});
test('복원에는 이야기 이름과 위치만 사용하고 실행 중간 상태는 버린다',()=>{
  let raw;const storage={getItem(){return raw},setItem(k,v){raw=v},removeItem(){raw=null}};
  assert.equal(s.saveBookmark(storage,{nickname:'구름',variant:'girl',chapterId:3,sceneId:'ch3-9',running:true}),true);
  const b=s.readBookmark(storage,ids);assert.equal(b.nickname,'구름');assert.equal(b.variant,'girl');assert.equal(b.sceneId,'ch3-9');assert.equal('running' in b,false);
  assert.equal(s.clearBookmark(storage),true);assert.equal(s.readBookmark(storage,ids),null);
});
