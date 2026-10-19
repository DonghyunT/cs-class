/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node tooling uses CommonJS. */
const test=require('node:test');const assert=require('node:assert/strict');
const m=require('../src/models.js');
test('입력값은 문자로 다루고 변수는 새 값으로 교체한다',()=>{
  assert.equal(m.formatInvitation('여울'),'여울 님의 초대장');
  assert.equal(m.formatInvitation('<b>'),' <b> 님의 초대장'.trim());
  assert.equal(m.overwriteDemo('여울','구름'),'구름');
  assert.deepEqual(m.answerDemo(['여울','정문'],true),{answer:'정문',name:'여울',place:'정문'});
  assert.deepEqual(m.answerDemo(['여울','정문'],false),{answer:'정문',name:'',place:''});
});
test('방향키는 엔트리 방향으로 움직이며 지도 경계를 벗어나지 않는다',()=>{
  assert.deepEqual(m.moveOnMap({x:2,y:2},'ArrowRight'),{x:3,y:2,direction:90});
  assert.deepEqual(m.moveOnMap({x:0,y:0},'ArrowUp'),{x:0,y:0,direction:0});
  assert.equal(m.moveOnMap({x:4,y:4},'ArrowDown').y,4);
});
test('티켓 산술·괄호·몫·나머지의 실제 결과',()=>{
  assert.deepEqual(m.ticketMath(6,4),{total:10,average:5,withoutParentheses:8});
  assert.deepEqual(m.divideTickets(7,2),{quotient:3,remainder:1});
  for(const value of ['', 'abc', 1.5, -1, 11, Infinity]) assert.equal(m.boundedInteger(value,0,10),null);
  assert.equal(m.boundedInteger('0',0,10),0);
});
test('비교 경계와 중첩 조건은 명확하다',()=>{
  assert.equal(m.compareTicket(6,'>',6),false);assert.equal(m.compareTicket(6,'≥',6),true);
  assert.equal(m.compareTicket(5,'≤',6),true);assert.equal(m.compareTicket(6,'≠',6),false);
  assert.deepEqual([4,5,6,8].map(m.choosePrize),['sticker','small','small','large']);
  assert.equal(m.chooseRoute(true),'indoor');assert.equal(m.chooseRoute(false),'outdoor');
});
test('AND·OR의 네 조합과 NOT',()=>{
  for(const a of [false,true])for(const b of [false,true]){
    assert.equal(m.logicResult(a,b,'and'),a&&b);assert.equal(m.logicResult(a,b,'or'),a||b);
    assert.equal(m.logicResult(a,b,'not'),!a);
  }
});
test('3·4·6각형의 외각과 닫힌 경로',()=>{
  for(const n of [3,4,6]){
    assert.equal(m.polygonTurn(n),360/n);const p=m.polygonPath(n,80);
    assert.equal(p.length,n+1);assert.ok(Math.hypot(p.at(-1).x,p.at(-1).y)<0.001);
  }
  const wrong=m.polygonPath(3,80,60);assert.ok(Math.hypot(wrong.at(-1).x,wrong.at(-1).y)>1);
});
test('조건 반복은 사전 검사하고 정답 이후 질문하지 않는다',()=>{
  assert.deepEqual(m.untilTrace('', ['1111','1234','5555'],'1234'),{questions:2,open:true});
  assert.deepEqual(m.untilTrace('1234', ['1111'],'1234'),{questions:0,open:true});
  assert.deepEqual(m.untilTrace('', ['1111'],'1234'),{questions:1,open:false});
  assert.deepEqual(m.incrementReady(4),{count:5,complete:true});
});
