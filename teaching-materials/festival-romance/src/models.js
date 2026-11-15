(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FestivalModels=api;})(globalThis,function(){
  'use strict';
  const EXPRESSION_LABELS=['미소','수줍음','환한 웃음','놀람','고민','장난기'];
  const V3_COLUMN_MAP=[0,1,2,1,1,2];
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
  function spriteCrop(index,rows=2){
    const n=Number.isInteger(index)&&index>=0&&index<6?index:0;
    const r=rows===1?1:2;
    const backgroundSize=r===1?'300% 100%':'300% 200%';
    const backgroundPosition=r===1?`${V3_COLUMN_MAP[n]*50}% 0%`:`${(n%3)*50}% ${Math.floor(n/3)*100}%`;
    return {expression:n,rows:r,backgroundSize,backgroundPosition,label:`하루 · ${EXPRESSION_LABELS[n]}`};
  }
  // 문항 id로 늘 같은 보기 순서를 만듭니다(정답이 한 자리에 몰리지 않게, 새로고침해도 그대로).
  function seededOrder(seed,length){
    let h=2166136261;
    for(const ch of String(seed))h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;
    const next=()=>{h=(h+0x6D2B79F5)>>>0;let t=h;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
    const order=Array.from({length:Math.max(0,length|0)},(_,i)=>i);
    for(let i=order.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
    return order;
  }
  // 블록 순서·표기 채점. 틀리면 가장 비슷한 정답 순서와 처음 어긋난 줄의 블록 id를 돌려줍니다.
  function evaluateArrange(order,goal,picks={}){
    const list=Array.isArray(order)?order:[];
    const accepts=Array.isArray(goal?.acceptOrders)?goal.acceptOrders:[];
    if(!list.length||!accepts.length)return {correct:false,firstWrongId:null};
    const same=a=>a.length===list.length&&a.every((id,i)=>id===list[i]);
    if(!accepts.some(same)){
      const score=a=>a.reduce((n,id,i)=>n+(id===list[i]?1:0),0);
      const best=accepts.reduce((b,a)=>score(a)>score(b)?a:b);
      const i=list.findIndex((id,k)=>id!==best[k]);
      return {correct:false,firstWrongId:i>=0?list[i]:null};
    }
    const wrongChoice=Object.entries(goal.expectedChoices||{}).find(([id,want])=>(picks[id]??0)!==want);
    return wrongChoice?{correct:false,firstWrongId:wrongChoice[0]}:{correct:true,firstWrongId:null};
  }
  function computeEndingOutcome(totalHearts,hasColdRejection){
    const hearts=Number(totalHearts)||0;
    if(hearts>=12&&!hasColdRejection)return 'some';
    if(hearts>=7)return 'friend';
    return 'awkward';
  }
  function normalizeShortText(raw,quiz){
    let text=String(raw??'').trim().replace(/\s+/g,' ');
    if(quiz?.unit&&text.endsWith(quiz.unit))text=text.slice(0,-quiz.unit.length).trim();
    if(quiz?.normalize==='number'){
      const cleaned=text.replace(/,/g,'').replace(/[°번장개]/g,'').trim();
      const num=Number(cleaned);
      return Number.isFinite(num)&&cleaned!==''?String(num):text;
    }
    return text;
  }
  function gradeQuizAnswer(quiz,rawValue){
    if(!quiz||typeof quiz!=='object')return {correct:false,why:'문제 데이터가 없습니다.'};
    if(quiz.inputType==='short'){
      const normalized=normalizeShortText(rawValue,quiz);
      if(!normalized)return {correct:false,empty:true,why:'답을 먼저 입력해 주세요.',normalized:''};
      const expectedList=(Array.isArray(quiz.answer)?quiz.answer:[quiz.answer]).map(a=>normalizeShortText(a,quiz));
      const matched=expectedList.some(exp=>quiz.normalize==='number'?Number(exp)===Number(normalized):exp.toLowerCase()===normalized.toLowerCase());
      if(matched)return {correct:true,why:'',normalized};
      const hints=Array.isArray(quiz.wrongHints)?quiz.wrongHints:[];
      const hit=hints.find(h=>{
        const matches=Array.isArray(h.match)?h.match:[h.match];
        return matches.some(m=>{
          const nm=normalizeShortText(m,quiz);
          return quiz.normalize==='number'?Number(nm)===Number(normalized):nm.toLowerCase()===normalized.toLowerCase();
        });
      });
      return {correct:false,why:hit?.why||quiz.defaultWhy||'입력한 값을 코드의 실행 흐름과 비교해 다시 확인해 보세요.',normalized};
    }
    const choices=Array.isArray(quiz.choices)?quiz.choices:[];
    const choice=choices.find((c,i)=>String(c.key??i)===String(rawValue));
    if(!choice)return {correct:false,why:quiz.defaultWhy||'보기를 선택해 주세요.'};
    return {correct:Boolean(choice.correct),why:choice.correct?'':(choice.why||quiz.defaultWhy||'조건과 실행 순서를 다시 한 줄씩 살펴보세요.'),choice};
  }
  function evaluatePolygonTurn(sides,angle){
    const expected=polygonTurn(sides);
    return {correct:angle===expected,expected,interior:180-expected,sum:angle*sides};
  }
  function evaluatePrizeBranches(tickets,tiers,order='desc'){
    const list=(Array.isArray(tiers)&&tiers.length?tiers:[
      {key:'large',min:8,label:'큰 키링'},
      {key:'small',min:5,label:'작은 키링'},
      {key:'sticker',min:0,label:'별 스티커'}
    ]).slice();
    const ordered=order==='asc'?list.sort((a,b)=>a.min-b.min):list.sort((a,b)=>b.min-a.min);
    const matchedIndex=ordered.findIndex(t=>tickets>=t.min);
    return {ordered,matchedIndex,matchedTier:matchedIndex>=0?ordered[matchedIndex]:null};
  }
  return {
    EXPRESSION_LABELS,V3_COLUMN_MAP,
    boundedInteger,formatInvitation,overwriteDemo,answerDemo,moveOnMap,ticketMath,divideTickets,
    compareTicket,logicResult,chooseRoute,choosePrize,polygonTurn,polygonPath,untilTrace,incrementReady,
    spriteCrop,seededOrder,evaluateArrange,computeEndingOutcome,gradeQuizAnswer,evaluatePolygonTurn,evaluatePrizeBranches
  };
});
