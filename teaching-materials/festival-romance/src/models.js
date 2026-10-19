(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FestivalModels=api;})(globalThis,function(){
  'use strict';
  function boundedInteger(raw,min,max){if(raw===''||raw===null||raw===undefined)return null;const n=Number(raw);return Number.isInteger(n)&&n>=min&&n<=max?n:null;}
  function formatInvitation(name){return `${name} 님의 초대장`;}
  function overwriteDemo(oldValue,newValue){return String(newValue);}
  function answerDemo(answers,saveEach){return {answer:answers.at(-1)||'',name:saveEach?(answers[0]||''):'',place:saveEach?(answers[1]||''):''};}
  function moveOnMap(position,key){const move={ArrowUp:[0,-1,0],ArrowRight:[1,0,90],ArrowDown:[0,1,180],ArrowLeft:[-1,0,270]}[key];if(!move)return {...position};return {x:Math.max(0,Math.min(4,position.x+move[0])),y:Math.max(0,Math.min(4,position.y+move[1])),direction:move[2]};}
  function ticketMath(a,b){return {total:a+b,average:(a+b)/2,withoutParentheses:a+b/2};}
  function divideTickets(total,cost){return {quotient:Math.floor(total/cost),remainder:total%cost};}
  function compareTicket(a,op,b){const operators={'=':()=>a===b,'≠':()=>a!==b,'>':()=>a>b,'<':()=>a<b,'≥':()=>a>=b,'≤':()=>a<=b};if(!operators[op])throw new RangeError('알 수 없는 비교 연산자');return operators[op]();}
  function logicResult(a,b,op){if(op==='and')return Boolean(a&&b);if(op==='or')return Boolean(a||b);if(op==='not')return !a;throw new RangeError('알 수 없는 논리 연산자');}
  function chooseRoute(raining,umbrella=false,passage=true){return !raining?'outdoor':(umbrella||passage)?'indoor':'wait';}
  function choosePrize(tickets){return tickets>=8?'large':tickets>=5?'small':'sticker';}
  function polygonTurn(sides){return 360/sides;}
  function polygonPath(sides,length,turn=polygonTurn(sides)){const points=[{x:0,y:0}];let x=0,y=0;for(let i=0;i<sides;i++){x+=length*Math.cos(i*turn*Math.PI/180);y+=length*Math.sin(i*turn*Math.PI/180);points.push({x,y});}return points;}
  function untilTrace(initialAnswer,attempts,password){let answer=initialAnswer,questions=0;for(const attempt of attempts){if(answer===password)break;questions++;answer=attempt;}return {questions,open:answer===password};}
  function incrementReady(count){const next=Math.min(5,count+1);return {count:next,complete:next>=5};}
  return {boundedInteger,formatInvitation,overwriteDemo,answerDemo,moveOnMap,ticketMath,divideTickets,compareTicket,logicResult,chooseRoute,choosePrize,polygonTurn,polygonPath,untilTrace,incrementReady};
});
