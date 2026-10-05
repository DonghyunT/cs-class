import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFlowRun, stepFlowRun } from '../src/lib/classroom/review/flow-runner.mjs';
test('실제 연결을 따라 수식·입력·분기·출력을 실행한다', () => {
  const project = { nodes: [
    {id:'start',shape:'terminal',text:'시작'}, {id:'in',shape:'io',text:'키 입력'},
    {id:'d',shape:'decision',text:'키 >= 150'}, {id:'yes',shape:'io',text:"'탑승 가능' 출력"},
    {id:'no',shape:'io',text:"'탑승 불가' 출력"}, {id:'end',shape:'terminal',text:'종료'}
  ], edges: [{from:'start',to:'in',label:''},{from:'in',to:'d',label:''},{from:'d',to:'yes',label:'예'},{from:'d',to:'no',label:'아니오'},{from:'yes',to:'end',label:''},{from:'no',to:'end',label:''}] };
  let run=createFlowRun(project); run=stepFlowRun(project,run); run=stepFlowRun(project,run); assert.equal(run.waiting.kind,'input');
  run=stepFlowRun(project,run,'149'); run=stepFlowRun(project,run); run=stepFlowRun(project,run); run=stepFlowRun(project,run);
  assert.equal(run.done,true); assert.equal(run.vars['키'],149); assert.ok(run.log.some(text=>text.includes('탑승 불가')));
});
test('자연어 판단은 학생 선택을 기다리고 수식 오류·반복 한도를 알린다',()=>{
  const p={nodes:[{id:'start',shape:'terminal',text:'시작'},{id:'d',shape:'decision',text:'준비했나요?'},{id:'end',shape:'terminal',text:'종료'}],edges:[{from:'start',to:'d',label:''},{from:'d',to:'d',label:'아니오'},{from:'d',to:'end',label:'예'}]};
  let r=stepFlowRun(p,createFlowRun(p)); r=stepFlowRun(p,r); assert.equal(r.waiting.kind,'choice'); r=stepFlowRun(p,r,'예'); r=stepFlowRun(p,r); assert.equal(r.done,true);
  r={...createFlowRun(p),steps:300}; assert.match(stepFlowRun(p,r).error,/300/);
  const bad={nodes:[{id:'start',shape:'terminal',text:'시작'},{id:'x',shape:'process',text:'x = 1 / 0'},{id:'end',shape:'terminal',text:'종료'}],edges:[{from:'start',to:'x',label:''},{from:'x',to:'end',label:''}]};
  r=stepFlowRun(bad,createFlowRun(bad)); assert.match(stepFlowRun(bad,r).error,/0으로/);
});
