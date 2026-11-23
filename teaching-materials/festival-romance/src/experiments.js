(function(){
  'use strict';
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const renderers={};

  function render(type,root,ctx){
    root.dataset.experiment=type;
    const $=id=>root.querySelector('#'+id),M=ctx.models;
    const show=(html,outcome={})=>{
      const resEl=$('result');
      resEl.classList.toggle('result-wrong',outcome.valid===false);
      resEl.classList.toggle('result-correct',outcome.valid!==false);
      resEl.innerHTML=html;
      resEl.hidden=false;
      if(outcome.valid===false){
        if(outcome.failWhy&&typeof ctx.fail==='function')ctx.fail(outcome.failWhy,outcome.failExpr||4);
        else ctx.invalidate();
      }else{
        ctx.complete(outcome);
      }
      const main=document.querySelector('.lesson-main');
      if(main){
        const m=main.getBoundingClientRect(),r=resEl.getBoundingClientRect();
        if(r.bottom>m.bottom-8)resEl.scrollIntoView({block:'nearest',behavior:'smooth'});
      }else{
        resEl.scrollIntoView({block:'nearest',behavior:'auto'});
      }
    };
    if(!renderers[type])throw Error('알 수 없는 실험: '+type);
    renderers[type]({root,ctx,$,M,show});
  }

  // 문항 데이터(quiz 또는 task)와, 흐름에서 고른 key에 맞는 묶음(variants)을 합칩니다.
  function pick(ctx,field,root){
    const base=ctx.scene?.[field]||{};
    const variantKey=base.variants?ctx.choice?.key||'':'';
    if(variantKey)root.dataset.variant=variantKey;
    return {q:{...base,...(base.variants?.[variantKey]||{})},variantKey};
  }
  const fmtOf=ctx=>v=>ctx.interpolate?ctx.interpolate(v):String(v??'');
  // 화면 위쪽 공통 틀: 지금 상황 → 시작 블록 → 코드(고칠 줄 강조, {n} 자리에 입력칸) → 질문
  function boardTop(q,ctx,fmt,{slot='',codeHtml=null}={}){
    const code=Array.isArray(q.code)?q.code:[];
    const lines=codeHtml??(code.length?`<pre class="block-code quiz-code">${code.map((line,idx)=>{
      const text=fmt(line),focus=idx+1===q.focus,parts=text.replace(/^\s{2}/,'').split('{n}');
      return `<span class="code-line${/^\s{2,}/.test(text)?' indent':''}${focus?' focus':''}"><span class="line-no" aria-hidden="true">${idx+1}</span><span class="code-text">${parts.map(escape).join(slot)}</span>${focus?'<span class="focus-tag">고칠 곳</span>':''}</span>`;
    }).join('')}</pre>`:'');
    const situation=(q.situation||[]).map(line=>`<p>${escape(fmt(line))}</p>`).join('');
    return `${situation?`<div class="quiz-situation"><span class="quiz-label">지금 상황</span>${situation}</div>`:''}${q.hat?`<div class="quiz-hat">${escape(fmt(q.hat))}</div>`:''}${lines}<h3 class="quiz-prompt">${escape(fmt(q.prompt||ctx.scene?.goalPrompt||''))}</h3>`;
  }
  const resultBox='<div id="result" class="result" role="status" hidden></div>';
  const screenHtml=(text,fmt)=>`<p class="sim-screen">실행 결과 · ${escape(fmt(text))}</p>`;

  // 카드 3장 중 고르기. 카드를 고르면 그 코드로 실행한 결과(screen)를 보여 주고, 처음 고른 카드가 첫 시도입니다.
  function quizVisualHtml(visual,key){
    if(visual==='compass'){
      const end={90:{x:98,y:28},180:{x:38,y:48},270:{x:10,y:28}}[key]||{x:38,y:8};
      const hit=key==='90';
      return `<div class="mini-visual mini-compass" aria-hidden="true"><svg viewBox="0 0 160 56"><line x1="42" y1="28" x2="${end.x+4}" y2="${end.y}" class="compass-arrow${hit?' is-hit':' is-miss'}"/><circle cx="42" cy="28" r="5" class="compass-start"/><text x="108" y="33" class="compass-goal">★ 정문</text><text x="6" y="14" class="compass-axis">위 0°</text></svg></div>`;
    }
    if(visual==='gate'){
      const allow={ge:[false,true,true],eq:[false,true,false],le:[true,true,false]}[key]||[false,false,false];
      return `<div class="mini-visual mini-gate" aria-hidden="true">${[6,7,8].map((n,i)=>`<span class="gate-pill ${allow[i]?'is-open':'is-closed'}">${n}장${n===7?'(우리)':''} ${allow[i]?'○':'✕'}</span>`).join('')}</div>`;
    }
    if(visual==='counter'){
      const vals={add1:[1,2,3,4,5,6],'reset-add':[1,1,1,1,1,1],set6:[6,6,6,6,6,6]}[key]||[1,1,1,1,1,1];
      return `<div class="mini-visual mini-counter" aria-hidden="true">${vals.map((v,i)=>`<span class="counter-step${key==='add1'?' is-good':''}"><small>${i+1}발</small><b>${v}</b></span>`).join('')}</div>`;
    }
    return '';
  }

  renderers.quiz=({root,M,ctx,show})=>{
    const {q,variantKey}=pick(ctx,'quiz',root),fmt=fmtOf(ctx);
    const choices=Array.isArray(q.choices)?q.choices:[];
    const letters=['A','B','C','D'];
    root.innerHTML=`<div class="board quiz-board">${boardTop(q,ctx,fmt)}<div class="quiz-choices" role="group" aria-label="고를 카드">${M.seededOrder((ctx.scene?.questionId||ctx.scene?.id||'')+variantKey,choices.length).map((ci,i)=>{const c=choices[ci];return `<button type="button" class="quiz-choice" data-quiz-choice="${escape(String(c.key??ci))}"><span class="choice-badge" aria-hidden="true">${letters[i]||i+1}</span><span class="choice-label">${escape(fmt(c.label))}</span></button>`;}).join('')}</div></div>${resultBox}`;
    root.querySelectorAll('[data-quiz-choice]').forEach(btn=>{
      btn.onclick=()=>{
        const graded=M.gradeQuizAnswer(q,btn.dataset.quizChoice);
        const c=graded.choice;
        const visual=q.visual?quizVisualHtml(q.visual,c?.key):'';
        const screen=c?.screen?screenHtml(c.screen,fmt):'';
        if(!graded.correct){
          btn.dataset.wrong='true';
          btn.disabled=true;
          show(`${visual}${screen}<strong>다시 골라 보자!</strong><span class="explanation">${escape(fmt(graded.why))}</span>`,{valid:false,failWhy:fmt(graded.why),failExpr:c?.expression||4});
          return;
        }
        btn.dataset.correct='true';
        root.querySelectorAll('[data-quiz-choice]').forEach(b=>b.disabled=true);
        show(`${visual}${screen}<strong>${escape(fmt(q.successTitle||'정답이에요!'))}</strong><span class="explanation">${escape(fmt(q.explain||c?.explain||''))}</span>`,{valid:true,quizKey:c?.key,story:c?.storyPatch||q.storyPatch,values:c?.values||q.values});
      };
    });
  };

  // 직접 조작: '만일 ~ 아니면, 만일' 줄을 ↑·↓로 옮긴 뒤 실행하면 tests의 손님마다 처음 참인 줄 하나만 실행합니다.
  // 바꾼 뒤 처음 실행이 첫 시도이고, 처음 상태나 방금 실행한 순서 그대로는 실행할 수 없습니다.
  renderers.order=({root,$,ctx,show})=>{
    const {q}=pick(ctx,'task',root),fmt=fmtOf(ctx);
    const rows=q.rows||[],byId=Object.fromEntries(rows.map(r=>[r.id,r]));
    let order=[...(q.initialOrder||rows.map(r=>r.id))],lastRun=order.join(),done=false;
    const draw=()=>{
      $('order-rows').innerHTML=order.map((id,i)=>{const r=byId[id];return `<li class="order-row" data-row="${escape(id)}"><span class="line-no" aria-hidden="true">${i+1}</span><span class="code-text">${i?'아니면, 만일':'만일'} ${escape(fmt(q.subject||'값이'))} ${r.min}${escape(fmt(q.unit||''))} 이상이면 → ${escape(fmt(r.then))}</span><span class="order-buttons"><button type="button" class="order-move" data-move="-1" data-id="${escape(id)}" aria-label="${i+1}번 줄을 위로"${i===0||done?' disabled':''}>↑</button><button type="button" class="order-move" data-move="1" data-id="${escape(id)}" aria-label="${i+1}번 줄을 아래로"${i===order.length-1||done?' disabled':''}>↓</button></span></li>`;}).join('');
      $('run-task').disabled=done||order.join()===lastRun;
    };
    root.innerHTML=`<div class="board quiz-board task-board">${boardTop(q,ctx,fmt,{codeHtml:'<ol class="block-code quiz-code order-rows" id="order-rows"></ol>'})}<div class="task-controls"><button type="button" id="run-task" class="primary-button task-run">자판기 실행하기 ▶</button><span class="task-hint">줄 옆 ↑·↓로 순서를 바꾼 뒤 실행해요.</span></div></div>${resultBox}`;
    root.addEventListener('click',ev=>{
      const b=ev.target instanceof Element?ev.target.closest('[data-move]'):null;
      if(!b||b.disabled)return;
      const i=order.indexOf(b.dataset.id),j=i+Number(b.dataset.move);
      if(j<0||j>=order.length)return;
      [order[i],order[j]]=[order[j],order[i]];
      draw();
      root.querySelector(`[data-move="${b.dataset.move}"][data-id="${b.dataset.id}"]:not(:disabled)`)?.focus();
    });
    $('run-task').onclick=()=>{
      lastRun=order.join();
      const want=t=>[...rows].sort((a,b)=>b.min-a.min).find(r=>t>=r.min);
      const got=t=>order.map(id=>byId[id]).find(r=>t>=r.min);
      const results=(q.tests||[]).map(t=>({t,got:got(t),want:want(t)}));
      const screen=results.map(x=>`${x.t}장 → ${x.got?fmt(x.got.then):'없음'} ${x.got===x.want?'○':'✕'}`).join(' · ');
      if(results.every(x=>x.got===x.want)){
        done=true;draw();
        show(`${screenHtml(screen,fmt)}<strong>${escape(fmt(q.successTitle||'정답이에요!'))}</strong><span class="explanation">${escape(fmt(q.explain||''))}</span>`,{valid:true,story:q.storyPatch,values:q.values});
        return;
      }
      draw();
      const why=q.whyTop?.[order[0]]||q.whyRest||'위에서부터 처음 참인 줄 하나만 실행돼요.';
      show(`${screenHtml(screen,fmt)}<strong>다시 바꿔 보자!</strong><span class="explanation">${escape(fmt(why))}</span>`,{valid:false,failWhy:fmt(why),failExpr:4});
    };
    draw();
  };

  // 단답형: 코드의 {n} 자리에 숫자를 적고 실행합니다(visual: lights=조명 깜빡임, drone=드론 경로).
  // 처음 값이나 방금 실행한 값 그대로는 실행할 수 없고, 바꾼 뒤 처음 실행이 첫 시도입니다.
  renderers.number=({root,$,M,ctx,show})=>{
    const {q}=pick(ctx,'task',root),fmt=fmtOf(ctx);
    const min=q.min??1,max=q.max??20,per=q.blinksPerCycle||1;
    let lastRun=q.initial,done=false;
    const slot=`<input id="task-num" class="code-input" type="number" inputmode="numeric" min="${min}" max="${max}" step="1" value="${escape(String(q.initial))}" aria-label="${escape(fmt(q.label||'값'))}">`;
    root.innerHTML=`<div class="board quiz-board task-board">${boardTop(q,ctx,fmt,{slot})}<div class="task-controls"><button type="button" class="step-button" data-step="-1" aria-label="${escape(fmt(q.label||'값'))} 1 줄이기">−</button><button type="button" class="step-button" data-step="1" aria-label="${escape(fmt(q.label||'값'))} 1 늘리기">+</button><button type="button" id="run-task" class="primary-button task-run">${escape(fmt(q.runLabel||'실행하기 ▶'))}</button><span class="task-hint">${escape(fmt(q.label||'값'))} 칸을 바꾼 뒤 실행해요.</span></div><div class="task-visual" id="task-visual" aria-hidden="true"></div></div>${resultBox}`;
    const input=$('task-num');
    let busy=false;
    const sync=()=>{
      const lock=done||busy;
      const raw=input.value.trim();
      const bad=Boolean(input.validity?.badInput);
      const parsed=M.boundedInteger(raw,min,max);
      $('run-task').disabled=lock||(!bad&&(raw===''||parsed===lastRun));
      input.disabled=lock;
      root.querySelectorAll('[data-step]').forEach(b=>{b.disabled=lock;});
    };
    input.addEventListener('input',sync);
    input.addEventListener('beforeinput',e=>{if(!e.isComposing&&e.data&&/[^0-9.-]/.test(e.data)){e.preventDefault();ctx.notify(`${min}~${max} 사이의 숫자만 입력해 주세요.`);}});
    input.addEventListener('compositionend',e=>{if(e.data&&/[^0-9.-]/.test(e.data))ctx.notify(`${min}~${max} 사이의 숫자만 입력해 주세요.`);});
    input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing&&!$('run-task').disabled){e.preventDefault();$('run-task').click();}});
    root.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{
      if(done||busy)return;
      const raw=Number(input.value);
      const base=Number.isFinite(raw)&&input.value.trim()!==''?Math.trunc(raw):q.initial;
      input.value=String(Math.min(max,Math.max(min,base+Number(b.dataset.step))));
      sync();
    });
    // 실행 과정을 한 장면씩 보여 줍니다: 조명은 깜빡일 때마다 전구가 하나씩 켜지고, 드론은 한 변씩 날아가며 선을 그립니다.
    const frames=n=>{
      if(q.visual==='lights'){
        const total=n*per;
        const shown=Math.min(total,20);
        return {count:shown,ms:per>1?240:320,draw:k=>`<div class="lights-row">${Array.from({length:shown},(_,i)=>{const tone=per===2?(i%2===0?' bulb-yellow':' bulb-blue'):'';return `<span class="bulb${tone}${i<k?' on':''}"></span>`;}).join('')}${total>shown?'<span class="bulb-more">…</span>':''}</div><p class="visual-caption">${per>1?`${n}번 반복 · `:''}깜빡임 ${k}번</p>`};
      }
      if(q.visual==='drone'){
        const pts=M.polygonPath(q.sides,60,n),xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),f=v=>v.toFixed(1);
        const x0=Math.min(...xs)-14,y0=Math.min(...ys)-14,box=`${f(x0)} ${f(y0)} ${f(Math.max(...xs)-x0+14)} ${f(Math.max(...ys)-y0+14)}`;
        return {count:q.sides,ms:480,draw:k=>`<svg class="drone-path" viewBox="${box}"><polyline points="${pts.slice(0,k+1).map(p=>`${f(p.x)},${f(p.y)}`).join(' ')}"/><circle class="start" cx="0" cy="0" r="5"/><circle class="drone" cx="${f(pts[k].x)}" cy="${f(pts[k].y)}" r="7"/></svg><p class="visual-caption">${k} / ${q.sides}번 이동·회전</p>`};
      }
      return {count:0,ms:0,draw:()=>''};
    };
    const play=(n,onDone)=>{
      const {count,ms,draw}=frames(n);
      if(!count||ctx.reducedMotion?.()){$('task-visual').innerHTML=draw(count);onDone();return;}
      let k=0;
      $('task-visual').innerHTML=draw(0);
      $('task-visual').scrollIntoView({block:'nearest',behavior:'smooth'}); // 그리는 과정이 화면 밖에서 지나가지 않게
      const timer=ctx.interval(()=>{k++;$('task-visual').innerHTML=draw(k);if(k>=count){clearInterval(timer);onDone();}},ms);
    };
    const screenFor=n=>{
      if(q.visual==='drone'){const sum=n*q.sides,closed=sum%360===0&&n%360!==0;return `${n}° × ${q.sides} = ${sum}°${sum===360?' → 도형 완성!':closed?' → 닫혔지만 한 바퀴보다 많이 돌아요':' → 제자리로 안 돌아와요'}`;}
      return fmt(q.screen||'{n}').replaceAll('{n}',String(n)).replaceAll('{total}',String(n*per));
    };
    $('run-task').onclick=()=>{
      const n=input.validity?.badInput?null:M.boundedInteger(input.value.trim(),min,max);
      if(n===null){ctx.notify(`${min}~${max} 사이의 정수를 입력해 주세요.`);input.focus();return;}
      lastRun=n;input.value=String(n);
      $('result').hidden=true;
      busy=true;sync();
      play(n,()=>{
        busy=false;
        if(n===q.answer){
          done=true;sync();
          show(`${screenHtml(screenFor(n),fmt)}<strong>${escape(fmt(q.successTitle||'정답이에요!'))}</strong><span class="explanation">${escape(fmt(q.explain||''))}</span>`,{valid:true,story:q.storyPatch,values:q.values});
          return;
        }
        sync();
        const why=q.whyBy?.[String(n)]||(q.visual==='drone'&&(n*q.sides)%360===0&&n%360!==0?q.whyMulti:null)||(n<q.answer?q.whyLow:q.whyHigh)||q.whyWrong||'다시 생각해 보자!';
        show(`${screenHtml(screenFor(n),fmt)}<strong>다시 바꿔 보자!</strong><span class="explanation">${escape(fmt(why))}</span>`,{valid:false,failWhy:fmt(why),failExpr:4});
      });
    };
    sync();
  };

  window.FestivalExperiments={render,escape};
})();
