(function(){
  'use strict';
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const button=(id,label,primary=false)=>`<button id="${id}" type="button" class="${primary?'primary-button':'secondary-button'}">${label}</button>`;
  const prediction=labels=>`<section class="prediction" data-prediction aria-label="실행 전 예상 문제"><div class="prediction-heading"><span class="prediction-kicker">실행 전, 함께 예상하기</span><h3 class="prediction-question">어떤 결과가 나올까요?</h3></div><div class="prediction-options">${labels.map(x=>`<button type="button" aria-pressed="false">${escape(x)}</button>`).join('')}</div><p class="prediction-guide">답을 고른 뒤 실행 결과와 비교해 보세요.</p></section>`;
  const result=()=>'<div id="result" class="result" role="status" hidden></div>';
  const numberField=(id,label,value,min=0,max=20)=>`<label>${label}<input id="${id}" type="number" min="${min}" max="${max}" step="1" value="${value}"></label>`;
  const renderCodeLines=code=>{
    const lines=Array.isArray(code)?code:String(code||'').split('\n');
    return `<pre class="block-code quiz-code">${lines.map((line,idx)=>{
      const text=String(line);
      const indented=/^\s{2,}|^\s*└/.test(text);
      return `<span class="code-line${indented?' indent':''}"><span class="line-no" aria-hidden="true">${idx+1}</span><span>${escape(text.replace(/^\s{2}/,''))}</span></span>`;
    }).join('')}</pre>`;
  };
  const renderers={};

  function render(type,root,ctx){
    root.dataset.experiment=type;
    const $=id=>root.querySelector('#'+id),M=ctx.models;
    const goal=ctx.scene?.goal||null;
    // 고치기 전(아무것도 바꾸지 않고) 실행하면 버그 재현만 보여 주고 하트에는 영향을 주지 않습니다.
    let dirty=false,lastAction='';
    const graded=Boolean(ctx.scene?.graded);
    const RUN='#run,#run-arrange,#run-until,#start-map,[data-key]';
    const SCENARIO='#five,#six,#seven,#tickets,#rain,#umbrella,#passage';
    root.addEventListener('click',ev=>{
      const t=ev.target instanceof Element?ev.target:null;
      if(!t)return;
      if(t.closest(RUN))lastAction='run';
      else if(t.closest('[data-chat-choice],[data-quiz-choice]'))lastAction='answer';
      else if(t.closest('button')&&!t.closest(SCENARIO))dirty=true;
    },true);
    root.addEventListener('keydown',ev=>{if(String(ev.key).startsWith('Arrow'))lastAction='run';},true);
    const markDirty=ev=>{const t=ev.target instanceof Element?ev.target:null;if(t&&!t.closest(SCENARIO))dirty=true;};
    root.addEventListener('change',markDirty,true);
    root.addEventListener('input',markDirty,true);
    const show=(html,outcome={})=>{
      if(graded&&outcome.valid===false&&lastAction==='run'&&!dirty){
        const resEl=$('result');
        resEl.classList.remove('result-wrong','result-correct');
        resEl.classList.add('result-repro');
        resEl.innerHTML='<strong class="repro-badge">버그 재현 · 아직 고치기 전이라 하트에는 영향이 없어요</strong>'+html;
        resEl.hidden=false;
        ctx.invalidate();
        resEl.scrollIntoView({block:'nearest',behavior:'auto'});
        return;
      }
      if($('result'))$('result').classList.remove('result-repro');
      root.querySelectorAll('[data-prediction] button').forEach(b=>b.disabled=true);
      const predicted=root.dataset.prediction;
      const resEl=$('result');
      resEl.classList.toggle('result-wrong',outcome.valid===false);
      resEl.classList.toggle('result-correct',outcome.valid!==false);
      resEl.innerHTML=(predicted?`<div class="prediction-recall">우리의 예상: ${escape(predicted)}<br>실행 결과와 비교해 보세요.</div>`:'')+html;
      resEl.hidden=false;
      if(outcome.valid===false){
        root.querySelectorAll('[data-prediction] button').forEach(b=>b.disabled=false);
        if(outcome.failWhy&&typeof ctx.fail==='function')ctx.fail(outcome.failWhy,outcome.failExpr||4);
        else ctx.invalidate();
      }else{
        ctx.complete(outcome);
      }
      resEl.scrollIntoView({block:'nearest',behavior:'auto'});
    };
    const hide=(clearPrediction=true)=>{
      root.querySelectorAll('[data-prediction] button').forEach(b=>b.disabled=false);
      if($('result')){$('result').hidden=true;$('result').classList.remove('result-wrong','result-correct');}
      ctx.invalidate();
      if(clearPrediction){
        delete root.dataset.prediction;
        root.querySelectorAll('[data-prediction] button').forEach(b=>b.setAttribute('aria-pressed','false'));
      }
    };
    const read=(id,min=0,max=20)=>{
      const n=M.boundedInteger($(id).value,min,max);
      if(n===null){ctx.notify(`${min}~${max} 사이의 정수를 입력해 주세요.`);$(id).focus();}
      return n;
    };
    const env={root,ctx,$,M,goal,show,hide,read};
    if(!renderers[type])throw Error('알 수 없는 실험: '+type);
    renderers[type](env);
    const questions={
      invitation:'이름을 바꾸면 초대장의 어느 부분이 달라질까요?',
      variable:'새 시각을 저장하면 변수에는 어떤 값이 남을까요?',
      answer:'두 번 질문한 뒤 대답 칸에는 무엇이 남을까요?',
      event:'답장을 고른 지금, 메시지는 이미 보내졌을까요?',
      math:'괄호를 넣기 전과 후의 계산 결과는 같을까요?',
      compare:'지금 두 조건으로 판단하면 부스에 들어갈 수 있을까요?',
      and:'두 조건을 그리고로 연결하면 입장할 수 있을까요?',
      or:'이 조건의 계산 결과는 참일까요, 거짓일까요?',
      route:'현재 날씨와 비를 피할 방법을 보면 어디로 갈까요?',
      prize:'지금 교환권 수로 받을 기념품은 무엇일까요?',
      count:'고른 횟수만큼 무엇을 반복하게 될까요?',
      polygon:'이 횟수와 회전각으로 고른 도형을 완성할 수 있을까요?',
      until:'암호를 틀리면 카드는 어떻게 동작할까요?',
      repeatCompare:'두 코드의 실제 실행 횟수는 같을까요?'
    };
    const question=root.querySelector('.prediction-question');
    if(question)question.textContent=questions[type]||'어떤 결과가 나올까요?';
    root.querySelectorAll('[data-prediction] button').forEach(b=>b.addEventListener('click',()=>{
      b.parentElement.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
      root.dataset.prediction=b.textContent;
    }));
  }

  // 하루와 주고받는 대화형 선택. 단계마다 보기 순서를 섞고, 틀리면 그 단계만 다시 고릅니다.
  function chatSteps(host,{M,steps,seedBase,onWrong,onStepRight,onAllRight,fmt=v=>String(v??'')}){
    let i=0;
    host.innerHTML='<div class="chat-log" aria-live="polite"></div><div class="chat-replies" role="group" aria-label="하루에게 할 대답"></div>';
    const log=host.querySelector('.chat-log'),box=host.querySelector('.chat-replies');
    const bubble=(who,text)=>{const p=document.createElement('p');p.className='chat-bubble chat-'+who;p.textContent=text;log.appendChild(p);};
    const step=()=>{
      const s=steps[i],choices=Array.isArray(s.choices)?s.choices:[];
      bubble('haru',fmt(s.prompt));
      box.innerHTML=M.seededOrder(seedBase+':'+i,choices.length).map(ci=>{const c=choices[ci];return '<button type="button" class="chat-reply" data-chat-choice="'+escape(String(c.key??ci))+'">'+escape(fmt(c.label))+'</button>';}).join('');
      box.querySelectorAll('[data-chat-choice]').forEach(btn=>btn.onclick=()=>{
        const g=M.gradeQuizAnswer(s,btn.dataset.chatChoice);
        if(!g.correct){btn.dataset.wrong='true';btn.disabled=true;onWrong(g.why,g.choice);return;}
        bubble('me',fmt(g.choice?.label)||btn.textContent);
        if(g.choice?.reply)bubble('haru',fmt(g.choice.reply));
        box.innerHTML='';
        i++;
        if(i<steps.length){onStepRight?.(i);step();box.querySelector('button')?.focus();}else onAllRight(g.choice);
      });
    };
    step();
  }
  renderers.quiz=({root,$,M,ctx,show,hide})=>{
    const q=ctx.scene?.quiz||{};
    if(q.style==='chat'){
      const fmt=v=>ctx.interpolate?ctx.interpolate(v):String(v??'');
      const trace=Array.isArray(q.trace)?simLog(q.trace.map(r=>[fmt(r[0]),fmt(r[1])]),fmt(q.screen||'')):'';
      root.innerHTML='<div class="board chat-board">'+(q.code?renderCodeLines(q.code):'')+trace+'<div id="chat-host"></div></div>'+result();
      chatSteps($('chat-host'),{M,fmt,steps:q.steps||[],seedBase:ctx.scene?.questionId||ctx.scene?.id||'',
        onWrong:(why,choice)=>show('<strong>다시 생각해 보자!</strong><span class="explanation">'+escape(why)+'</span>',{valid:false,failWhy:why,failExpr:choice?.expression||4}),
        onStepRight:()=>hide(false),
        onAllRight:()=>{show('<strong>'+escape(q.successTitle||'통했다!')+'</strong><span class="explanation">'+escape(fmt(q.explain||'하루가 고개를 끄덕였어요.'))+'</span>',{valid:true,story:q.storyPatch,values:q.values});ctx.focusNext?.();}});
      return;
    }
    const isShort=q.inputType==='short';
    const choices=Array.isArray(q.choices)?q.choices:[];
    const letters=['A','B','C','D','E'];
    root.innerHTML=`<div class="board quiz-board">${q.code?renderCodeLines(q.code):''}<h3 class="quiz-prompt">${escape(q.prompt||'코드를 살펴보고 알맞은 답을 골라 보세요.')}</h3>${isShort?`<div class="quiz-short-row"><label class="sr-only" for="quiz-short-input">정답 입력</label><input id="quiz-short-input" class="large-input" autocomplete="off" placeholder="${escape(q.placeholder||'정답을 입력하세요')}">${q.unit?`<span class="quiz-unit">${escape(q.unit)}</span>`:''}${button('quiz-submit','확인하기 →',true)}</div>`:`<div class="quiz-choices">${M.seededOrder(ctx.scene?.questionId||ctx.scene?.id||'',choices.length).map((ci,i)=>{const c=choices[ci];return `<button type="button" class="quiz-choice" data-quiz-choice="${escape(String(c.key??ci))}"><span class="choice-badge" aria-hidden="true">${letters[i]||i+1}</span><span class="choice-label">${escape(c.label)}</span></button>`;}).join('')}</div>`}</div>${result()}`;
    if(isShort){
      const submit=()=>{
        const raw=$('quiz-short-input').value;
        const graded=M.gradeQuizAnswer(q,raw);
        if(graded.empty){ctx.notify('답을 먼저 입력해 주세요.');$('quiz-short-input').focus();return;}
        if(!graded.correct){
          show(`<strong>오개념 점검!</strong><span class="explanation">${escape(graded.why)}</span>`,{valid:false,failWhy:graded.why,failExpr:q.wrongExpression||4});
          $('quiz-short-input').focus();
          return;
        }
        $('quiz-short-input').disabled=true;$('quiz-submit').disabled=true;
        show(`<strong>정답이에요!</strong><span class="explanation">${escape(q.explain||'정확하게 진단했어요!')}</span>`,{valid:true,quizAnswer:graded.normalized,story:q.storyPatch,values:q.values});
      };
      $('quiz-submit').onclick=submit;
      $('quiz-short-input').onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();submit();}};
      return;
    }
    root.querySelectorAll('[data-quiz-choice]').forEach(btn=>{
      btn.onclick=()=>{
        const key=btn.dataset.quizChoice;
        const graded=M.gradeQuizAnswer(q,key);
        if(!graded.correct){
          btn.dataset.wrong='true';
          btn.disabled=true;
          show(`<strong>다시 살펴보자!</strong><span class="explanation">${escape(graded.why)}</span>`,{valid:false,failWhy:graded.why,failExpr:graded.choice?.expression||4});
          return;
        }
        btn.dataset.correct='true';
        root.querySelectorAll('[data-quiz-choice]').forEach(b=>b.disabled=true);
        const explain=q.explain||graded.choice?.explain||'정확하게 짚어냈어요!';
        show(`<strong>정답이에요!</strong><span class="explanation">${escape(explain)}</span>`,{valid:true,quizKey:graded.choice?.key??key,story:graded.choice?.storyPatch||q.storyPatch,values:graded.choice?.values||q.values});
      };
    });
  };

  // 블록 줄 순서 바꾸기(↑·↓ 버튼)와 눌러서 바꾸는 표기. 처음 '실행'이 채점 실행입니다.
  // goal: {blocks:[{id,label,choices?}], initialOrder, acceptOrders, expectedChoices?, wrongHints?, defaultWhy?, hat?, simulate?, successText?}
  const arrangeSims={};
  renderers.arrange=({root,$,M,ctx,goal,show})=>{
    const g=goal||{};
    const byId=Object.fromEntries((g.blocks||[]).map(b=>[b.id,b]));
    const order=(g.initialOrder||Object.keys(byId)).filter(id=>byId[id]);
    const picks=Object.fromEntries((g.blocks||[]).filter(b=>b.choices).map(b=>[b.id,b.initialChoice??0]));
    let locked=false;
    const labelOf=id=>{const b=byId[id];return b.choices?String(b.label||'').replace('{choice}',b.choices[picks[id]]):b.label;};
    const draw=focus=>{
      $('arrange-list').innerHTML=order.map((id,i)=>{
        const b=byId[id],text=escape(labelOf(id));
        const label=b.choices?`<button type="button" class="arrange-choice" data-arrange-choice="${escape(id)}" aria-label="${text} · 눌러서 바꾸기"${locked?' disabled':''}>${text} <span aria-hidden="true">⇄</span></button>`:`<span class="arrange-label">${text}</span>`;
        if(g.fixedOrder)return `<li class="arrange-row${b.indent?' arrange-indent-'+b.indent:''}" data-block-id="${escape(id)}"><span class="arrange-index" aria-hidden="true">${i+1}</span>${label}</li>`;
        return `<li class="arrange-row" data-block-id="${escape(id)}"><span class="arrange-index" aria-hidden="true">${i+1}</span>${label}<span class="arrange-moves"><button type="button" data-arrange-move="-1" data-id="${escape(id)}" aria-label="${i+1}번째 줄 '${text}' 위로"${locked||i===0?' disabled':''}>↑</button><button type="button" data-arrange-move="1" data-id="${escape(id)}" aria-label="${i+1}번째 줄 '${text}' 아래로"${locked||i===order.length-1?' disabled':''}>↓</button></span></li>`;
      }).join('');
      $('arrange-list').querySelectorAll('[data-arrange-move]').forEach(btn=>btn.onclick=()=>{
        const id=btn.dataset.id,from=order.indexOf(id),to=from+Number(btn.dataset.arrangeMove);
        if(to<0||to>=order.length)return;
        [order[from],order[to]]=[order[to],order[from]];
        $('arrange-live').textContent=`'${labelOf(id)}' → ${to+1}번째 줄`;
        draw({id,dir:btn.dataset.arrangeMove});
      });
      $('arrange-list').querySelectorAll('[data-arrange-choice]').forEach(btn=>btn.onclick=()=>{
        const id=btn.dataset.arrangeChoice;
        picks[id]=(picks[id]+1)%byId[id].choices.length;
        $('arrange-live').textContent=`바꾼 블록: '${labelOf(id)}'`;
        draw({id,choice:true});
      });
      if(focus){
        const sel=focus.choice?`[data-arrange-choice="${focus.id}"]`:`[data-arrange-move="${focus.dir}"][data-id="${focus.id}"]`;
        const target=$('arrange-list').querySelector(sel);
        (target&&!target.disabled?target:$('arrange-list').querySelector(`[data-id="${focus.id}"]:not(:disabled)`))?.focus();
      }
    };
    const note=g.note?`<aside class="arrange-note"><strong>${escape(g.note.title||'메모')}</strong><ol>${(g.note.lines||[]).map(l=>`<li>${escape(l)}</li>`).join('')}</ol></aside>`:'';
    root.innerHTML=`<div class="board arrange-board">${note}${(g.blocks||[]).some(b=>b.choices)?'<p class="form-note">⇄ 표시된 블록은 누르면 내용이 바뀌어요.</p>':''}${g.hat?`<p class="arrange-hat">${escape(g.hat)}</p>`:''}<ol id="arrange-list" class="arrange-list" aria-label="블록 순서"></ol><p id="arrange-live" class="sr-only" aria-live="polite"></p><div class="experiment-actions">${button('run-arrange',escape(g.runLabel||'실행해 보기'),true)}</div><div id="arrange-sim" class="arrange-sim" hidden></div></div>${result()}`;
    draw();
    $('run-arrange').onclick=()=>{
      const r=M.evaluateArrange(order,g,picks);
      const sim=g.simulate&&arrangeSims[g.simulate]?arrangeSims[g.simulate]({order:[...order],picks:{...picks},correct:r.correct,ctx,goal:g}):'';
      if(sim){$('arrange-sim').innerHTML=sim;$('arrange-sim').hidden=false;}
      if(r.correct){
        locked=true;draw();$('run-arrange').disabled=true;
        show(`<strong>${escape(g.successTitle||'실행 성공!')}</strong>${g.successText?`<span class="explanation">${escape(g.successText)}</span>`:''}`,{valid:true});
        return;
      }
      const why=(r.firstWrongId&&g.wrongHints?.[r.firstWrongId])||g.defaultWhy||'블록 순서를 다시 살펴보자!';
      show(`<strong>${escape(g.failTitle||'실행 결과가 이상해!')}</strong><span class="explanation">${escape(why)}</span>`,{valid:false,failWhy:why,failExpr:4});
    };
  };
  renderers.arrange.sims=arrangeSims;
  // 실행 기록: 줄마다 바뀐 값을 보여 주고 마지막 화면을 띄웁니다.
  const simLog=(rows,screen)=>'<div class="sim-run"><h4>실행 기록</h4><ol class="sim-steps">'+rows.map(r=>'<li><span class="sim-line">'+escape(r[0])+'</span><span class="sim-effect">→ '+escape(r[1])+'</span></li>').join('')+'</ol><p class="sim-screen" role="status">'+escape(screen)+'</p></div>';
  const shown=v=>v===''?'(빈칸)':v;
  arrangeSims.finale=({picks,goal})=>{
    const pick=id=>{const b=goal.blocks.find(x=>x.id===id);return b?.choices?b.choices[picks[id]??b.initialChoice??0]:'';};
    const outer=Number((pick('outer').match(/(\d+)번/)||[])[1]||2),inner=Number(goal.innerTimes||3),fires=outer*inner;
    const adds=/더하기/.test(pick('counter'));
    const counter=adds?fires:1;
    const loopTimes=(pick('ending').match(/(\d+)번/)||[])[1];
    const rows=[[pick('outer')+' 안의 '+inner+'번 반복','불꽃 '+fires+'번 발사'],[pick('counter'),'[카운터]: '+counter],[pick('ending'),loopTimes?'드론 '+loopTimes+'번 반짝인 뒤 다음 줄로':'드론이 끝없이 반짝임(아래 줄로 못 감)']];
    return simLog(rows,'제어반: 불꽃 '+fires+'번 · 카운터 '+counter+(loopTimes?' · "점등 완료!"':' · "점등 완료!" 안 뜸'));
  };
  arrangeSims.welcome=({order,ctx,goal})=>{
    const label=Object.fromEntries(goal.blocks.map(b=>[b.id,b.label]));
    const nick=ctx.state?.nickname||'나';
    let answer='',name='',screen='';const rows=[];
    for(const id of order){
      if(id==='ask'){answer=nick;rows.push([label[id],'대답: '+nick]);}
      else if(id==='set'){name=answer;rows.push([label[id],'[이름]: '+shown(name)]);}
      else if(id==='say'){screen='"'+name+' 님, 환영해요!"';rows.push([label[id],'화면: '+screen]);}
    }
    return simLog(rows,'앱 화면: '+(screen||'(인사 없음)'));
  };
  renderers.invitation=({root,$,M,ctx})=>{
    root.innerHTML=`<div class="flow-grid"><div class="flow-card"><h3>입력</h3><label for="nickname">초대장에 쓸 이름</label><input id="nickname" maxlength="12" autocomplete="off" value="${escape(ctx.state.nickname)}"><p class="form-note">새 이름을 입력해 보세요.</p></div><span class="flow-arrow" aria-hidden="true">→</span><div class="flow-card"><h3>처리</h3><div class="code-mix"><span class="variable-chip" id="process-name"></span><span>＋</span><span>“ 님의 초대장”</span></div></div><span class="flow-arrow" aria-hidden="true">→</span><div class="flow-card"><h3>출력</h3><div id="placeholder" class="output-placeholder">어떤 문장이<br>나타날까요?</div><div id="invitation" class="invitation" role="status" hidden><strong id="invitation-title"></strong><p>하루와 함께<br>내일, 정문에서.</p></div></div></div>${prediction(['입력한 이름으로 바뀐다','항상 처음 이름으로 나온다'])}<div class="experiment-actions">${button('run-experiment','초대장 만들기 →',true)}${button('again','다시 예상하기')}</div><div class="result" id="takeaway" hidden>입력 → 처리 → 출력<span class="explanation">이름을 받아, 문장을 만들고, 화면에 보여줘요.</span></div>`;
    const name=()=>ctx.stateApi.normalizeNickname($('nickname').value);
    const clear=()=>{ctx.invalidate();root.querySelectorAll('[data-prediction] button').forEach(b=>{b.disabled=false;b.setAttribute('aria-pressed','false');});delete root.dataset.prediction;$('process-name').textContent=name();$('placeholder').hidden=false;$('invitation').hidden=true;$('takeaway').hidden=true;};
    const run=()=>{$('nickname').value=name();$('process-name').textContent=name();$('invitation-title').textContent=M.formatInvitation(name());$('placeholder').hidden=true;$('invitation').hidden=false;$('takeaway').hidden=false;root.querySelectorAll('[data-prediction] button').forEach(b=>b.disabled=true);$('takeaway').innerHTML=(root.dataset.prediction?`<div class="prediction-recall">우리의 예상: ${escape(root.dataset.prediction)}</div>`:'')+'입력 → 처리 → 출력<span class="explanation">입력한 이름을 문장에 넣어 초대장을 만들었어요. 이 이름으로 이야기를 이어 갑니다.</span>';ctx.complete({identity:name(),story:{ticketName:name()},values:{ticketName:name()}});};
    $('nickname').addEventListener('input',clear);$('nickname').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();run();}});$('run-experiment').onclick=run;$('again').onclick=clear;clear();
  };

  renderers.variable=({root,$,ctx,show})=>{
    const target=ctx.choice?.params?.time||'17:00',old=target==='17:00'?'16:00':'17:00';
    root.innerHTML=`${prediction([old,target,'두 시각이 함께 남아요'])}<div class="two-columns"><div class="board"><h3>약속 시각을 바꾸면</h3><pre class="block-code">약속 시각을 “${old}”로 정하기\n<span id="replace-line">약속 시각을 “${target}”로 정하기</span>\n약속 시각의 값 말하기</pre></div><div class="board"><h3>변수: 약속 시각</h3><div class="formula variable-chip" id="variable-value">${old}</div><p class="control-description" id="current-value">현재 값: ${old}</p>${button('replace',`“${target}”로 정하기`,true)}</div></div>${result()}`;
    $('replace').onclick=()=>{$('variable-value').textContent=target;$('current-value').textContent=`현재 값: ${target}`;$('replace-line').classList.add('trace');$('replace').disabled=true;show(`약속 시각은 ${target} 하나로 바뀌었어요.<span class="explanation">새로 정하는 명령은 이전 값을 교체해요. 두 시각을 함께 저장하거나 이어 붙인 것이 아니에요.</span>`,{story:{meetingTime:target},values:{meetingTime:target}});};
  };

  renderers.answer=({root,$,M,show,hide})=>{
    root.innerHTML=`${prediction(['대답에 이름이 남아요','대답에 정문이 남아요'])}<label class="checkbox-line"><input id="save-each" type="checkbox"><span>각 대답을 바로 변수에 저장하기</span></label><div class="three-columns"><div class="board"><h3>대답</h3><div id="answer-slot" class="variable-chip">아직 없음</div></div><div class="board"><h3>이름 변수</h3><div id="name-slot" class="variable-chip">비어 있음</div></div><div class="board"><h3>장소 변수</h3><div id="place-slot" class="variable-chip">비어 있음</div></div></div><div class="experiment-actions">${button('ask','첫 질문: 이름 묻기',true)}${button('restart','처음부터')}</div>${result()}`;
    let step=0;
    const reset=()=>{step=0;$('answer-slot').textContent='아직 없음';$('name-slot').textContent='비어 있음';$('place-slot').textContent='비어 있음';$('ask').disabled=false;$('ask').textContent='첫 질문: 이름 묻기';hide();};
    $('ask').onclick=()=>{step++;const d=M.answerDemo(['여울','정문'].slice(0,step),$('save-each').checked);$('answer-slot').textContent=d.answer;$('name-slot').textContent=d.name||'비어 있음';$('place-slot').textContent=d.place||'비어 있음';$('ask').textContent=step===1?'두 번째 질문: 장소 묻기':'질문 완료';$('ask').disabled=step>=2;if(step===2)show($('save-each').checked?'이름과 장소가 각 변수에 남았어요.<span class="explanation">대답은 정문으로 바뀌었지만, 첫 대답은 이름 변수에 보관했어요.</span>':'대답에는 가장 최근의 ‘정문’만 남아요.<span class="explanation">이름을 계속 쓰려면 이름을 들은 직후 따로 저장해야 해요.</span>');};
    $('save-each').onchange=reset;$('restart').onclick=reset;
  };

  renderers.event=({root,$,ctx,show})=>{
    const key=ctx.choice?.key||'casual',text=ctx.choice?.params?.text||(key==='warm'?'응. 나도 같이 가고 싶었어.':'좋아, 정문에서 보자!');
    root.innerHTML=`<div class="two-columns"><div class="board"><h3>작성 중인 답장</h3><p id="draft" class="control-description">${escape(text)}</p><p id="send-status" class="form-note">아직 보내지 않았어요.</p>${button('send','전송 버튼 누르기 →',true)}</div><div class="board"><h3>어떤 사건에 연결했을까?</h3><pre class="block-code"><span id="event-line">전송 버튼을 눌렀을 때</span>\n  <span id="send-line">준비된 문장 보내기</span></pre></div></div>${prediction(['문장을 고르면 전송돼요','전송 버튼을 눌러야 보내요'])}${result()}`;
    $('send').onclick=()=>{$('event-line').classList.add('trace');$('send-line').classList.add('trace');$('send-status').textContent='보낸 메시지';$('send').disabled=true;show(`전송 완료: “${escape(text)}”<span class="explanation">문장을 고르는 것과 보내는 것은 달라요. 연결된 버튼 사건이 보내기 명령을 실행했어요.</span>`,{key,story:{replyKey:key}});};
  };

  renderers.map=({root,$,M,ctx,goal,show,hide})=>{
    const graded=Boolean(ctx.scene?.graded||goal);
    const start=goal?.start||{x:1,y:2,direction:0};
    const target=goal?.target||{x:4,y:2};
    if(graded){
      // 연결한 신호를 실제로 보냈을 때 블록이 실행되고, 그 첫 실행을 채점합니다(연결 안 된 신호는 아무 일도 없음).
      const events={start:'시작하기 버튼을 클릭했을 때',ArrowRight:'오른쪽 화살표 키를 눌렀을 때',ArrowUp:'위쪽 화살표 키를 눌렀을 때'};
      const signalName={start:'시작하기 버튼',ArrowUp:'위쪽 화살표 키',ArrowDown:'아래쪽 화살표 키',ArrowLeft:'왼쪽 화살표 키',ArrowRight:'오른쪽 화살표 키'};
      const keyForAngle={0:'ArrowUp',90:'ArrowRight',180:'ArrowDown',270:'ArrowLeft'};
      const expectedEv=goal?.expectedEvent||'ArrowRight',expectedAng=goal?.expectedAngle??90,wh=goal?.wrongHints||{};
      let ev=goal?.initialEvent||'start',ang=Number(goal?.initialAngle??0),done=false;
      let pos={...start,direction:ang};
      root.innerHTML=`<div class="two-columns"><div><div class="map-holder" id="map-holder" tabindex="0" data-experience="map" role="group" aria-label="길 안내 미니맵. 방향키로 신호를 보낼 수 있습니다."><div id="map" class="map-grid"></div></div><p class="form-note map-legend">신호 보내기(테스트)</p><div class="map-controls" aria-label="방향키 신호 보내기"><span></span><button type="button" data-key="ArrowUp" aria-label="위쪽 화살표 키 신호">↑</button><span></span><button type="button" data-key="ArrowLeft" aria-label="왼쪽 화살표 키 신호">←</button><button type="button" data-key="ArrowDown" aria-label="아래쪽 화살표 키 신호">↓</button><button type="button" data-key="ArrowRight" aria-label="오른쪽 화살표 키 신호">→</button></div><div class="experiment-actions map-start">${button('start-map','▶ 시작하기 버튼 누르기')}</div></div><div class="board"><h3>길 안내 블록 고치기</h3><p class="form-note">① 어떤 신호를 받았을 때 움직일까?</p><div class="map-chips" role="group" aria-label="시작 신호(사건) 고르기">${Object.entries(events).map(([k,l])=>`<button type="button" class="map-chip" data-map-event="${k}" aria-pressed="${k===ev}">${escape(l)}</button>`).join('')}</div><p class="form-note">② 이동 방향은 몇 도로 정할까?</p><div class="map-chips map-compass" role="group" aria-label="이동 방향각 고르기">${[0,90,180,270].map(a=>`<button type="button" class="map-chip" data-map-angle="${a}" aria-pressed="${a===ang}">${a}°</button>`).join('')}</div><pre class="block-code" id="map-script"></pre><p class="map-info" id="map-info" role="status">블록을 고친 뒤, 연결한 신호를 직접 보내 실행해 보세요(키보드 방향키도 돼요).</p></div></div>${result()}`;
      const draw=()=>{$('map').innerHTML=Array.from({length:25},(_,i)=>{const x=i%5,y=Math.floor(i/5),p=x===pos.x&&y===pos.y,g=x===target.x&&y===target.y;return `<div class="map-cell${p?' player':''}${g?' goal':''}"${p?' aria-label="현재 위치"':''}>${p?`<span style="transform:rotate(${pos.direction}deg)" aria-hidden="true">▲</span>`:g?'정문':''}</div>`;}).join('');};
      const script=()=>{$('map-script').textContent=`${events[ev]}\n  이동 방향을 ${ang}°로 정하기\n  3칸 움직이기`;};
      const pick=()=>{
        root.querySelectorAll('[data-map-event]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mapEvent===ev)));
        root.querySelectorAll('[data-map-angle]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.mapAngle)===ang)));
        pos={...start,direction:ang};draw();script();hide(false);
      };
      root.querySelectorAll('[data-map-event]').forEach(b=>b.onclick=()=>{if(done)return;ev=b.dataset.mapEvent;pick();});
      root.querySelectorAll('[data-map-angle]').forEach(b=>b.onclick=()=>{if(done)return;ang=Number(b.dataset.mapAngle);pick();});
      const trigger=signal=>{
        if(done)return;
        if(signal!==ev){$('map-info').textContent=`${signalName[signal]} 신호를 보냈지만 연결된 블록이 없어서 아무 일도 일어나지 않아요.`;return;}
        pos={...start,direction:ang};
        for(let k=0;k<3;k++)pos=M.moveOnMap(pos,keyForAngle[ang]||'ArrowUp');
        pos={...pos,direction:ang};draw();
        if(ev!==expectedEv){
          const why=wh[ev]||wh.start||goal?.defaultWhy||'정문 길 안내가 어떤 신호에 반응해야 하는지 다시 생각해 보세요.';
          $('map-info').textContent=`${signalName[signal]} 신호로 블록이 실행됐어요.`;
          show(`<strong>사건 블록을 확인해 보세요!</strong><span class="explanation">${escape(why)}</span>`,{valid:false,failWhy:why,failExpr:4});
          return;
        }
        if(ang!==expectedAng||pos.x!==target.x||pos.y!==target.y){
          const why=wh[String(ang)]||goal?.defaultWhy||'엔트리 방향각을 다시 확인해 보세요.';
          $('map-info').textContent=`방향 ${ang}°로 움직여 엉뚱한 곳에 도착했어요.`;
          show(`<strong>방향각 오류 (${ang}°)</strong><span class="explanation">${escape(why)}</span>`,{valid:false,failWhy:why,failExpr:4});
          return;
        }
        done=true;delete root.dataset.experience;
        root.querySelectorAll('[data-map-event],[data-map-angle],[data-key],#start-map').forEach(b=>b.disabled=true);
        $('map-info').textContent='오른쪽 화살표 키 신호로 정문에 정확히 도착했어요!';
        show('<strong>정문 도착 완료!</strong><span class="explanation">오른쪽 화살표 키 신호에 연결하고 90°로 정하니 정문까지 세 칸 정확히 움직였어요.</span>',{valid:true,key:'arrived',story:goal?.storyPatch});
      };
      // 활동 안 어디에 초점이 있든 방향키는 미니맵 신호입니다(대사 이동 ←/→로 새지 않게). 해결 뒤에는 대사 이동으로 돌려줍니다.
      root.dataset.experience='map';
      root.onkeydown=e=>{if(done||e.isComposing||!e.key.startsWith('Arrow'))return;e.preventDefault();e.stopPropagation();trigger(e.key);};
      root.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>trigger(b.dataset.key));
      $('start-map').onclick=()=>trigger('start');
      draw();script();
      return;
    }
    root.innerHTML=`<div class="two-columns"><div><div class="map-holder" id="map-holder" tabindex="0" data-experience="map" role="group" aria-label="방향키 지도 체험. 방향키로 이동하고 Tab으로 체험을 나갈 수 있습니다."><div id="map" class="map-grid"></div></div><div class="map-controls" aria-label="지도 이동"><span></span><button type="button" data-key="ArrowUp" aria-label="위로 이동">↑</button><span></span><button type="button" data-key="ArrowLeft" aria-label="왼쪽으로 이동">←</button><button type="button" data-key="ArrowDown" aria-label="아래로 이동">↓</button><button type="button" data-key="ArrowRight" aria-label="오른쪽으로 이동">→</button></div></div><div class="board"><h3>어떤 신호가 왔을까?</h3><p class="map-info" id="map-info" role="status">아직 이동 신호가 없어요.</p>${button('start-map','시작 버튼 누르기')}<div class="experiment-actions">${button('focus-map','방향키 체험 시작',true)}${button('leave-map','체험 끝내기')}</div><details class="form-note"><summary>방향각 보기 · 선택 설명</summary><p>위 0° · 오른쪽 90°<br>아래 180° · 왼쪽 270°</p></details><p class="form-note">정문까지 오른쪽으로 세 칸!<br>핵심은 각도보다 ‘어떤 키가 신호인가’예요.</p></div></div>`;
    let pos={x:1,y:2,direction:90};const draw=()=>{$('map').innerHTML=Array.from({length:25},(_,i)=>{const x=i%5,y=Math.floor(i/5),p=x===pos.x&&y===pos.y,g=x===4&&y===2;return `<div class="map-cell${p?' player':''}${g?' goal':''}"${p?' aria-label="현재 위치"':''}>${p?`<span style="transform:rotate(${pos.direction}deg)" aria-hidden="true">▲</span>`:g?'정문':''}</div>`;}).join('');};
    const move=key=>{pos=M.moveOnMap(pos,key);draw();$('map-info').textContent=`${{ArrowUp:'위',ArrowDown:'아래',ArrowLeft:'왼쪽',ArrowRight:'오른쪽'}[key]} 키 신호 → 이동${pos.x===4&&pos.y===2?' · 정문 도착!':''}`;};
    $('map-holder').onkeydown=e=>{if(e.isComposing||!e.key.startsWith('Arrow'))return;e.preventDefault();e.stopPropagation();move(e.key);};
    root.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>{move(b.dataset.key);$('map-holder').focus();});
    $('start-map').onclick=()=>{$('map-info').textContent='시작 버튼 신호를 받았어요. 방향키 신호와 달라서 아직 이동하지 않아요.';};
    $('focus-map').onclick=()=>$('map-holder').focus();$('leave-map').onclick=()=>ctx.focusNext();draw();
  };

  renderers.math=({root,$,M,ctx,goal,show,hide,read})=>{
    const graded=Boolean(ctx.scene?.graded||goal);
    if(graded){
      // 틈을 눌러 괄호를 넣고(빈칸 → ( → ) → 빈칸) 계산 순서를 확인한 뒤, 하루의 질문에 대화로 답합니다.
      const a=goal?.a??6,b=goal?.b??4,div=goal?.divisor??2,expected=(a+b)/div;
      const base=[a,'+',b,'÷',div],gaps=Array(base.length+1).fill('');
      const fmt=n=>String(Math.round(n*1000)/1000);
      const tokens=()=>{const t=[];base.forEach((x,i)=>{if(gaps[i])t.push(gaps[i]);t.push(x);});if(gaps[base.length])t.push(gaps[base.length]);return t;};
      const gapLabel=g=>g==='('?'여는 괄호':g===')'?'닫는 괄호':'비어 있음';
      root.innerHTML=`<div class="board"><h3>1. 똑같이 나누는 식 고치기</h3><p class="form-note">${escape(ctx.state?.nickname||'나')} ${b}장 · 하루 ${a}장을 둘이 똑같이 나누는 식이에요. 빈칸(·)을 누를 때마다 ( → ) → 빈칸 순서로 바뀌어요.</p><div class="math-formula" id="math-formula" role="group" aria-label="계산식과 괄호를 넣을 틈"></div><div class="experiment-actions">${button('run','계산해 보기',true)}</div><ol class="math-steps" id="math-steps" aria-label="계산 순서"></ol></div><div class="board chat-board" id="math-chat" hidden></div>${result()}`;
      let locked=false;
      const drawFormula=()=>{
        const parts=[];
        base.forEach((x,i)=>{parts.push(`<button type="button" class="math-gap" data-math-gap="${i}" aria-label="${i+1}번째 틈: ${gapLabel(gaps[i])}"${locked?' disabled':''}>${gaps[i]||'·'}</button>`);parts.push(`<span class="math-token">${escape(String(x))}</span>`);});
        parts.push(`<button type="button" class="math-gap" data-math-gap="${base.length}" aria-label="${base.length+1}번째 틈: ${gapLabel(gaps[base.length])}"${locked?' disabled':''}>${gaps[base.length]||'·'}</button>`);
        $('math-formula').innerHTML=parts.join('');
        $('math-formula').querySelectorAll('[data-math-gap]').forEach(btn=>btn.onclick=()=>{
          const i=Number(btn.dataset.mathGap);gaps[i]=gaps[i]===''?'(':gaps[i]==='('?')':'';
          drawFormula();$('math-formula').querySelector(`[data-math-gap="${i}"]`)?.focus();
        });
      };
      drawFormula();
      $('run').onclick=()=>{
        const r=M.evaluateTokens(tokens());
        if(!r){ctx.notify('여는 괄호와 닫는 괄호가 짝을 이루도록 놓아 주세요.');return;}
        const reduced=ctx.reducedMotion?.();
        $('math-steps').innerHTML=r.steps.map((s,i)=>`<li${reduced?'':` style="animation-delay:${i*0.6}s"`}>${i+1}단계: ${escape(s)}</li>`).join('');
        const wh=goal?.wrongHints||{};
        if(r.value!==expected){
          const why=(gaps.some(Boolean)&&wh.wrongPlace)||wh.noParen||goal?.defaultWhy||'어떤 계산이 먼저 되는지 다시 따라가 보세요.';
          show(`<strong>한 사람당 ${fmt(r.value)}장?</strong><span class="explanation">${escape(why)}</span>`,{valid:false,failWhy:why,failExpr:4});
          return;
        }
        locked=true;drawFormula();$('run').disabled=true;hide(false);
        const chat=goal?.chat;
        if(!chat?.steps?.length){show(`<strong>한 사람당 ${fmt(expected)}장!</strong>`,{valid:true,story:goal?.storyPatch});return;}
        $('math-chat').hidden=false;
        chatSteps($('math-chat'),{M,fmt:v=>ctx.interpolate?ctx.interpolate(v):String(v??''),steps:chat.steps,seedBase:(ctx.scene?.questionId||'math')+':chat',
          onWrong:(why,choice)=>show('<strong>다시 생각해 보자!</strong><span class="explanation">'+escape(why)+'</span>',{valid:false,failWhy:why,failExpr:choice?.expression||4}),
          onStepRight:()=>hide(false),
          onAllRight:()=>{show(`<strong>계산 성공! 한 사람당 ${fmt(expected)}장</strong><span class="explanation">${escape(chat.explain||'괄호로 덧셈을 먼저 하고, 횟수와 남는 장수는 몫과 나머지로 구했어요.')}</span>`,{valid:true,story:goal?.storyPatch});ctx.focusNext?.();}});
      };
      return;
    }
    root.innerHTML=`${prediction(['두 식의 결과가 같아요','두 식의 결과가 달라요'])}<div class="field-row">${numberField('a','하루의 티켓',6)}${numberField('b','나의 티켓',4)}</div><div class="two-columns"><div class="board"><h3>괄호가 없다면</h3><div class="formula" id="plain-formula">6 + 4 ÷ 2</div></div><div class="board"><h3>두 사람의 평균은</h3><div class="formula" id="mean-formula">(6 + 4) ÷ 2</div></div></div><div class="experiment-actions">${button('run','계산해 보기',true)}${button('remainder','몫·나머지 추가 확인')}</div>${result()}`;
    const clear=()=>{$('plain-formula').textContent=`${$('a').value||'?'} + ${$('b').value||'?'} ÷ 2`;$('mean-formula').textContent=`(${$('a').value||'?'} + ${$('b').value||'?'}) ÷ 2`;hide();};$('a').oninput=clear;$('b').oninput=clear;
    $('run').onclick=()=>{const a=read('a'),b=read('b');if(a===null||b===null)return;const r=M.ticketMath(a,b);show(`괄호 없음: ${r.withoutParentheses} / 평균: ${r.average}장<span class="explanation">평균은 먼저 ${a} + ${b} = ${r.total}, 그다음 ${r.total} ÷ 2 = ${r.average}예요.</span>`);};
    $('remainder').onclick=()=>{const r=M.divideTickets(7,2);show(`티켓 7장으로 2장짜리 게임은 ${r.quotient}번, ${r.remainder}장이 남아요.<span class="explanation">7 ÷ 2의 몫은 3, 나머지는 1이에요.</span>`);};
  };

  renderers.compare=({root,$,M,ctx,goal,show,hide,read})=>{
    const graded=Boolean(ctx.scene?.graded||goal);
    const booth=goal?.booth||ctx.choice?.params?.booth||'photo';
    const threshold=goal?.threshold||ctx.choice?.params?.threshold||(booth==='photo'?6:4);
    const name=booth==='photo'?'사진 부스':'게임 부스';
    const ops=graded?['>','≥','=','≠','<','≤']:['≥','>','=','≠','<','≤'];
    const initOp=goal?.initialOperator||(graded?'>':'≥');
    const initTickets=goal?.initialTickets??threshold;
    root.innerHTML=`<div class="field-row">${numberField('tickets','테스트할 입장 티켓 수',initTickets)}<label>비교 기호<select id="operator">${ops.map(op=>`<option${op===initOp?' selected':''}>${op}</option>`).join('')}</select></label><label>안내판 기준<input value="${threshold}" readonly></label></div><label class="checkbox-line"${graded?' hidden':''}><input id="booth-open" type="checkbox" checked><span>${name} 운영을 시작했다</span></label><div class="board compact-board"><h3>${name} 입장 규칙 (${threshold}장 이상 입장)</h3><pre class="block-code"${graded?' data-graded="true"':''}><span id="comparison">${initTickets} ${initOp} ${threshold}</span>${graded?'\n참이면 → 입장 가능':' 그리고 (부스 운영 중)\n두 조건이 모두 참이면 → 입장 가능'}</pre><p class="form-note">딱 ${threshold}장을 가진 사람도 입장할 수 있게 비교 연산자를 맞춰 실행해 보세요.</p></div>${graded?'':prediction(['들어갈 수 있다','아직 기다려야 한다'])}<div class="experiment-actions">${button('five',`${threshold-1}장`)}${button('six',`${threshold}장`)}${button('seven',`${threshold+1}장`)}${button('run','비교 실행하기',true)}</div>${result()}`;
    const clear=()=>{$('comparison').textContent=`${$('tickets').value||'?'} ${$('operator').value} ${threshold}`;hide();};
    $('tickets').oninput=clear;$('operator').onchange=clear;$('booth-open').onchange=clear;
    [['five',threshold-1],['six',threshold],['seven',threshold+1]].forEach(([id,n])=>$(id).onclick=()=>{$('tickets').value=n;clear();});
    $('run').onclick=()=>{
      const n=read('tickets');if(n===null)return;
      const op=$('operator').value,enough=M.compareTicket(n,op,threshold),open=$('booth-open').checked,allowed=enough&&open;
      const expectedOp=goal?.expectedOperator||'≥';
      const validOp=op===expectedOp;
      if(graded&&!validOp){
        const wh=goal?.wrongHints||{};
        const why=wh[op]||goal?.defaultWhy||`기준(${threshold}장)과 똑같을 때도 입장하려면 ‘크거나 같다(${expectedOp})’를 써야 해요!`;
        show(`입장 티켓 비교: ${n} ${escape(op)} ${threshold} → ${enough?'참':'거짓'}<br><strong>비교 연산자를 다시 살펴보자!</strong><span class="explanation">${escape(why)}</span>`,{valid:false,failWhy:why,failExpr:4});
        return;
      }
      if(graded&&!enough){
        const resEl=$('result');resEl.classList.remove('result-wrong','result-correct');resEl.classList.add('result-repro');
        resEl.innerHTML=`입장 티켓 비교: ${n} ${escape(op)} ${threshold} → 거짓<span class="explanation">규칙대로 ${n}장은 들어갈 수 없어요(하트와 상관없는 테스트). 이제 ${threshold}장을 가진 우리 둘로 확인해 보세요.</span>`;resEl.hidden=false;ctx.invalidate();
        return;
      }
      const valid=validOp;
      if(graded){
        $('run').disabled=true;$('operator').disabled=true;
        show(`입장 티켓 비교: ${n} ${escape(op)} ${threshold} → 참<br><strong>참 · 입장 가능!</strong><span class="explanation">‘${threshold}장 이상’은 ${threshold}장도 포함하니까 크거나 같다(≥)로 비교해야 딱 ${threshold}장인 사람도 들어갈 수 있어요.</span>`,{valid:true,key:'allowed'});
        return;
      }
      show(`입장 티켓 비교: ${n} ${escape(op)} ${threshold} → ${enough?'참':'거짓'}<br>부스 운영 중: ${open?'참':'거짓'}<br><strong>${enough?'참':'거짓'} 그리고 ${open?'참':'거짓'} → ${allowed?'참 · 입장 가능':'거짓 · 아직 입장 불가'}</strong><span class="explanation">${valid?'경계값과 같은 수까지 포함하려면 ≥를 사용하고, 두 조건을 AND로 확인해요.':`지금 비교한 결과를 확인했어요. ‘${threshold}장 이상’을 표현하려면 ≥로 바꾸어 실행해 보세요.`}</span>`,{valid,key:allowed?'allowed':!enough&&!open?'both-blocked':enough?'wait':'blocked',story:{booth,boothAllowed:n>=threshold,boothOpen:open},values:{boothName:name,threshold,tickets:n}});
    };
  };

  function logic({root,$,M,ctx,goal,show,hide},or){
    const graded=Boolean((ctx.scene?.graded||goal)&&!or);
    if(graded){
      const initA=goal?.a!==undefined?Boolean(goal.a):true;
      const initB=goal?.b!==undefined?Boolean(goal.b):false;
      const expectedOp=goal?.expectedOp||'and';
      const expectedResult=goal?.expectedResult!==undefined?Boolean(goal.expectedResult):(expectedOp==='and'?initA&&initB:initA||initB);
      let chosenOp='or',chosenTruth='';
      root.innerHTML=`<div class="check-boards"><label class="check-board checkbox-line"><input id="condition-a" type="checkbox"${initA?' checked':''}${goal?.lockInputs?' disabled':''}><span>입장 티켓 기준을 채웠다 (${initA?'참':'거짓'})</span></label><label class="check-board checkbox-line"><input id="condition-b" type="checkbox"${initB?' checked':''}${goal?.lockInputs?' disabled':''}><span>부스 운영을 시작했다 (${initB?'참':'거짓'})</span></label></div><div class="board" style="margin-top:14px"><h3>1. 부스 규칙에 맞는 논리 연산자</h3><div class="prediction"><button type="button" data-logic-op="or" aria-pressed="true">또는 (OR)</button><button type="button" data-logic-op="and" aria-pressed="false">그리고 (AND)</button></div><div class="formula" id="logic-formula">${initA?'참':'거짓'} 또는 ${initB?'참':'거짓'}</div><h3>2. 이 상태에서 최종 판단 결과는?</h3><div class="prediction"><button type="button" data-logic-answer="true" aria-pressed="false">참 (입장 가능)</button><button type="button" data-logic-answer="false" aria-pressed="false">거짓 (입장 불가)</button></div></div><div class="experiment-actions">${button('run','결과 확인하기',true)}</div>${result()}`;
      const syncFormula=()=>{$('logic-formula').textContent=`${$('condition-a').checked?'참':'거짓'} ${chosenOp==='and'?'그리고':'또는'} ${$('condition-b').checked?'참':'거짓'}`;};
      root.querySelectorAll('[data-logic-op]').forEach(b=>b.onclick=()=>{chosenOp=b.dataset.logicOp;root.querySelectorAll('[data-logic-op]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));syncFormula();hide(false);});
      root.querySelectorAll('[data-logic-answer]').forEach(b=>b.onclick=()=>{chosenTruth=b.dataset.logicAnswer;root.querySelectorAll('[data-logic-answer]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));hide(false);});
      $('run').onclick=()=>{
        const wh=goal?.wrongHints||{};
        if(!chosenTruth){ctx.notify('최종 판단 결과(참/거짓)를 먼저 골라 주세요.');return;}
        if(chosenOp!==expectedOp){
          const why=wh[chosenOp]||wh.wrongOp||goal?.defaultWhy||'표도 있고 부스도 열려 있어야 하므로 두 조건이 모두 참일 때만 참인 ‘그리고(AND)’를 써야 해요!';
          show(`<strong>연산자를 다시 확인하자!</strong><span class="explanation">${escape(why)}</span>`,{valid:false,failWhy:why,failExpr:4});
          return;
        }
        const aVal=$('condition-a').checked,bVal=$('condition-b').checked;
        const actual=M.logicResult(aVal,bVal,chosenOp);
        if((chosenTruth==='true')!==expectedResult){
          const why=wh.wrongTruth||goal?.defaultWhy||'그리고(AND)는 두 조건 중 하나라도 거짓이면 전체가 거짓이에요!';
          show(`<strong>판단 결과가 달라요!</strong><span class="explanation">${escape(why)}</span>`,{valid:false,failWhy:why,failExpr:4});
          return;
        }
        $('run').disabled=true;
        show(`<strong>정확해요! 판단 결과: ${actual?'참':'거짓'}</strong><span class="explanation">${actual?'두 조건이 모두 참이라 입장할 수 있어요.':'한 조건이라도 거짓이면 AND 결과는 거짓이 되어 입장할 수 없어요.'}</span>`,{valid:true,key:actual?'ready':'wait',story:goal?.storyPatch});
      };
      return;
    }
    root.innerHTML=`${prediction(['참','거짓'])}${or?'<div class="prediction"><button type="button" id="mode-or" aria-pressed="true">또는</button><button type="button" id="mode-not" aria-pressed="false">아니다</button></div>':''}<div class="check-boards"><label class="check-board checkbox-line"><input id="condition-a" type="checkbox" checked><span id="condition-a-label">${or?'본관 로비가 열려 있다':'입장 티켓 보유 수 기준을 채웠다'}</span></label><label class="check-board checkbox-line" id="condition-b-holder"><input id="condition-b" type="checkbox"><span>${or?'실내 통로가 열렸다':'부스 운영을 시작했다'}</span></label></div><div class="board" style="margin-top:14px"><div class="formula" id="logic-formula">참 ${or?'또는':'그리고'} 거짓</div><p class="form-note" id="logic-help">${or?'하나라도 참이면 참! 둘 다 참이어도 참이에요.':'두 조건이 모두 참일 때만 입장할 수 있어요.'}</p></div><div class="experiment-actions">${button('run','결과 확인',true)}</div>${result()}`;
    let mode=or?'or':'and';if(!or){$('condition-a').checked=ctx.state.story.boothAllowed;$('condition-b').checked=ctx.state.story.boothOpen;}
    const clear=()=>{$('logic-formula').textContent=mode==='not'?`아니다 (${$('condition-a').checked?'참':'거짓'})`:`${$('condition-a').checked?'참':'거짓'} ${mode==='and'?'그리고':'또는'} ${$('condition-b').checked?'참':'거짓'}`;hide();};
    $('condition-a').onchange=clear;$('condition-b').onchange=clear;clear();
    if(or){$('mode-or').onclick=()=>{mode='or';$('mode-or').setAttribute('aria-pressed','true');$('mode-not').setAttribute('aria-pressed','false');$('condition-a-label').textContent='본관 로비가 열려 있다';$('condition-b-holder').hidden=false;$('logic-help').textContent='하나라도 참이면 참! 둘 다 참이어도 참이에요.';clear();};$('mode-not').onclick=()=>{mode='not';$('mode-or').setAttribute('aria-pressed','false');$('mode-not').setAttribute('aria-pressed','true');$('condition-a-label').textContent='본관 로비가 열려 있다';$('condition-b-holder').hidden=true;$('logic-help').textContent='같은 조건 ‘본관 로비가 열려 있다’를 뒤집어 ‘우산이 없다’를 판단해요.';clear();};}
    $('run').onclick=()=>{const r=M.logicResult($('condition-a').checked,$('condition-b').checked,mode);show(`판단 결과: ${r?'참':'거짓'}<span class="explanation">${mode==='and'?(r?'두 조건이 모두 맞아서 입장할 수 있어요.':'한 조건이라도 거짓이면 아직 입장할 수 없어요.'):mode==='or'?(r?'비를 피할 방법이 하나 이상 있어요.':'두 방법이 모두 없어서 다른 방법을 찾아야 해요.'):(r?'우산이 없다는 판단은 참이에요.':'우산이 없다는 판단은 거짓이에요.')}</span>`,{key:mode==='and'?(r?'ready':'wait'):'default'});};
  }
  renderers.and=e=>logic(e,false);renderers.or=e=>logic(e,true);

  renderers.route=({root,$,M,ctx,goal,show,hide})=>{
    const graded=Boolean(ctx.scene?.graded||goal);
    if(graded){
      const initRain=goal?.rain!==undefined?Boolean(goal.rain):true;
      const initUmb=goal?.umbrella!==undefined?Boolean(goal.umbrella):false;
      const initPass=goal?.passage!==undefined?Boolean(goal.passage):true;
      const initRainCheck=goal?.initialRainCheck||(goal?.expectedRainCheck==='not'?'rain':'not');
      const initConn=goal?.initialConnector||'and';
      const needNot=goal?.expectedRainCheck==='not';
      root.innerHTML=`<div class="route-inputs"><label class="checkbox-line"><input id="rain" type="checkbox"${initRain?' checked':''}><span>비가 온다</span></label><label class="checkbox-line"><input id="umbrella" type="checkbox"${initUmb?' checked':''}><span>본관 로비가 열려 있다</span></label><label class="checkbox-line"><input id="passage" type="checkbox"${initPass?' checked':''}><span>실내 통로가 열렸다</span></label></div><div class="block-code route-code block-builder"><div>만일 (${needNot?`<select id="route-rain-check"><option value="rain"${initRainCheck==='rain'?' selected':''}>비가 온다</option><option value="not"${initRainCheck==='not'?' selected':''}>아니다(비가 온다)</option></select>`:'아니다(비가 온다)'}) 라면 → 야외 공연</div><div>아니면</div><div class="indent">만일 (본관 로비 <select id="route-connector"><option value="and"${initConn==='and'?' selected':''}>그리고</option><option value="or"${initConn==='or'?' selected':''}>또는</option></select> 실내 통로) 라면 → 실내 부스</div><div class="indent">아니면 → 잠깐 기다리기</div></div><p class="form-note path-legend">길 찾기 결과</p><div class="path-options route-paths"><div id="indoor" class="path-option">실내 부스</div><div id="outdoor" class="path-option">야외 공연</div><div id="wait" class="path-option">잠깐 기다리기</div></div><div class="experiment-actions">${button('run','조건 고쳐서 길 찾기',true)}</div>${result()}`;
      const clear=()=>{root.querySelectorAll('.path-option').forEach(x=>x.classList.remove('chosen'));hide();};
      ['rain','umbrella','passage','route-connector'].forEach(id=>$(id).onchange=clear);
      if($('route-rain-check'))$('route-rain-check').onchange=clear;
      $('run').onclick=()=>{
        const rain=$('rain').checked,umb=$('umbrella').checked,pass=$('passage').checked;
        const rainCheck=$('route-rain-check')?$('route-rain-check').value:'not';
        const conn=$('route-connector').value;
        const outdoorCond=rainCheck==='not'?!rain:rain;
        const shelterCond=conn==='or'?(umb||pass):(umb&&pass);
        const simulated=outdoorCond?'outdoor':shelterCond?'indoor':'wait';
        root.querySelectorAll('.path-option').forEach(x=>x.classList.toggle('chosen',x.id===simulated));
        const wh=goal?.wrongHints||{};
        if(needNot&&rainCheck!=='not'){
          const why=wh.not||goal?.defaultWhy||'비가 오지 않을 때만 야외 공연으로 가야 해요! ‘비가 온다’를 뒤집는 ‘아니다(비가 온다)’를 골라야 해요.';
          show(`<strong>야외 조건이 뒤집혔어요! (${simulated==='outdoor'?'비 오는데 야외로 출발!':''})</strong><span class="explanation">${escape(why)}</span>`,{valid:false,failWhy:why,failExpr:4});
          return;
        }
        if(conn!==(goal?.expectedConnector||'or')){
          const why=wh.and||wh.connector||goal?.defaultWhy||'본관 로비와 실내 통로 중 하나만 있어도 비를 피할 수 있어요! ‘그리고’ 대신 ‘또는(OR)’을 선택해 보세요.';
          show(`<strong>연결 논리가 달라요!</strong><span class="explanation">${escape(why)}</span>`,{valid:false,failWhy:why,failExpr:4});
          return;
        }
        const route=M.chooseRoute(rain,umb,pass);
        const notRain=M.logicResult(rain,false,'not');
        const shelter=M.logicResult(umb,pass,'or');
        $('run').disabled=true;
        show(`<strong>정확한 길 안내: ${{indoor:'실내 부스로 이동!',outdoor:'야외 공연으로 이동!',wait:'잠깐 기다리기!'}[route]}</strong><span class="explanation">아니다(비가 온다) → ${notRain?'참':'거짓'}, 본관 로비 또는 실내 통로 → ${shelter?'참':'거짓'}로 올바른 경로를 찾았어요.</span>`,{valid:true,key:route,story:{route}});
      };
      return;
    }
    root.innerHTML=`<div class="route-inputs"><label class="checkbox-line"><input id="rain" type="checkbox" checked><span>비가 온다</span></label><label class="checkbox-line"><input id="umbrella" type="checkbox"><span>본관 로비가 열려 있다</span></label><label class="checkbox-line"><input id="passage" type="checkbox" checked><span>실내 통로가 열렸다</span></label></div><pre class="block-code route-code">만일 (비가 온다)라면\n  만일 (본관 로비 또는 실내 통로)가 있으면 → 실내 부스\n  아니면 → 잠깐 기다리기\n아니면 → 야외 공연</pre>${prediction(['실내 부스로 간다','야외 공연으로 간다','잠깐 기다린다'])}<p class="form-note path-legend">길 찾기 결과</p><div class="path-options route-paths"><div id="indoor" class="path-option">실내 부스</div><div id="outdoor" class="path-option">야외 공연</div><div id="wait" class="path-option">잠깐 기다리기</div></div><div class="experiment-actions">${button('run','조건을 따라 길 찾기',true)}</div>${result()}`;
    const clear=()=>{root.querySelectorAll('.path-option').forEach(x=>x.classList.remove('chosen'));hide();};['rain','umbrella','passage'].forEach(id=>$(id).onchange=clear);
    $('run').onclick=()=>{const rain=$('rain').checked,shelter=M.logicResult($('umbrella').checked,$('passage').checked,'or'),route=M.chooseRoute(rain,$('umbrella').checked,$('passage').checked),notRain=M.logicResult(rain,false,'not');root.querySelectorAll('.path-option').forEach(x=>x.classList.toggle('chosen',x.id===route));show(`<strong>${{indoor:'비가 오고, 비를 피할 방법이 있어 실내 부스로 가요.',outdoor:'비가 오지 않아서 야외 공연으로 가요.',wait:'비가 오는데 본관 로비와 실내 통로가 모두 없어 잠깐 기다려요.'}[route]}</strong><span class="explanation">본관 로비 또는 실내 통로 → ${shelter?'참':'거짓'} (하나 이상 참이면 참)<br>아니다(비가 온다) → ${notRain?'참':'거짓'} (원래 판단을 뒤집기)<br>조건을 따라 한 경로만 실행해요.</span>`,{key:route,story:{route}});};
  };

  renderers.prize=({root,$,M,ctx,goal,show,hide,read})=>{
    const graded=Boolean(ctx.scene?.graded||goal);
    if(graded){
      const tiers=Array.isArray(goal?.tiers)&&goal.tiers.length?goal.tiers:[{key:'large',min:10,label:'큰 키링'},{key:'small',min:5,label:'작은 키링'},{key:'sticker',min:3,label:'별 스티커'}];
      const sortedAsc=[...tiers].sort((a,b)=>a.min-b.min);
      const sortedDesc=[...tiers].sort((a,b)=>b.min-a.min);
      // 맨 위(①)에 둘 조건을 고르면 나머지는 큰 기준부터 이어집니다. 정답은 가장 큰 기준이 맨 위.
      let top=String(goal?.initialTop??sortedAsc[0].key);
      const orderKeys=()=>[top,...sortedDesc.map(t=>t.key).filter(k=>k!==top)];
      let order=orderKeys();
      const initTickets=goal?.tickets??sortedDesc[0].min;
      const ordinal=['①','②','③','④','⑤'];
      root.innerHTML=`${goal?.predict?'<div class="board chat-board" id="prize-predict"></div>':''}<div id="prize-fix"${goal?.predict?' hidden':''}><div class="field-row">${numberField('tickets','기념품 교환권 수',initTickets,0,30)}</div><p class="form-note">맨 위(①)에서 먼저 검사할 조건을 고르세요. 나머지 줄은 그 아래로 이어져요.</p><div class="map-chips" role="group" aria-label="맨 위에서 먼저 검사할 조건">${tiers.map(t=>`<button type="button" class="map-chip" data-prize-top="${escape(t.key)}" aria-pressed="${t.key===top}">교환권 ≥ ${t.min}</button>`).join('')}</div><div class="prize-rows" id="prize-rows"></div><div class="experiment-actions">${button('run','위에서부터 검사 실행',true)}</div></div>${result()}`;
      const renderRows=()=>{
        order=orderKeys();
        const ev=M.evaluatePrizeBranches(0,tiers,order);
        $('prize-rows').innerHTML=ev.ordered.map((t,i)=>`<div class="prize-row" data-prize="${escape(t.key)}">${ordinal[i]||i+1} ${i===0?'만일':'아니면, 만일'} 교환권 ≥ ${t.min} → ${escape(t.label)} <small class="branch-status"></small></div>`).join('');
        root.querySelectorAll('[data-prize-top]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.prizeTop===top)));
      };
      const resetRows=()=>{hide();renderRows();};
      root.querySelectorAll('[data-prize-top]').forEach(b=>b.onclick=()=>{top=b.dataset.prizeTop;resetRows();});
      if(goal?.predict){
        chatSteps($('prize-predict'),{M,fmt:v=>ctx.interpolate?ctx.interpolate(v):String(v??''),steps:goal.predict.steps||[],seedBase:(ctx.scene?.questionId||'prize')+':predict',
          onWrong:(why,choice)=>show('<strong>다시 생각해 보자!</strong><span class="explanation">'+escape(why)+'</span>',{valid:false,failWhy:why,failExpr:choice?.expression||4}),
          onStepRight:()=>hide(false),
          onAllRight:()=>{hide(false);$('prize-fix').hidden=false;root.querySelector('[data-prize-top]')?.focus();}});
      }
      $('tickets').oninput=()=>{hide();root.querySelectorAll('.prize-row').forEach(x=>{x.classList.remove('chosen','skipped');x.querySelector('.branch-status').textContent='';});};
      renderRows();
      $('run').onclick=()=>{
        const n=read('tickets',0,30);if(n===null)return;
        order=orderKeys();
        const ev=M.evaluatePrizeBranches(n,tiers,order);
        root.querySelectorAll('.prize-row').forEach((x,i)=>{
          x.classList.toggle('chosen',i===ev.matchedIndex);
          x.classList.toggle('skipped',ev.matchedIndex>=0&&i>ev.matchedIndex);
          x.querySelector('.branch-status').textContent=ev.matchedIndex<0?'거짓':i<ev.matchedIndex?'검사 → 거짓':i===ev.matchedIndex?'검사 → 참 → 여기서 멈춤!':'실행 안 됨';
        });
        const wh=goal?.wrongHints||{};
        if(top!==sortedDesc[0].key){
          const why=wh[top]||wh.asc||goal?.defaultWhy||`위에서부터 검사하기 때문에 ≥ ${sortedAsc[0].min}을 먼저 쓰면 ${n}장을 내도 첫 분기에서 ${ev.matchedTier?.label||'스티커'}만 받고 끝나 버려요!`;
          show(`<strong>분기 순서 버그! (${escape(ev.matchedTier?.label||'오류')})</strong><span class="explanation">${escape(why)}</span>`,{valid:false,failWhy:why,failExpr:4});
          return;
        }
        if(!ev.matchedTier){
          show(`교환권 ${n}장으로는 어떤 기준에도 해당하지 않았어요.<span class="explanation">교환권을 ${sortedDesc[0].min}장 이상으로 넣어 큰 키링이 제대로 나오는지 확인해 보세요.</span>`,{valid:false});
          return;
        }
        $('run').disabled=true;root.querySelectorAll('[data-prize-top]').forEach(b=>b.disabled=true);
        show(`<strong>받을 상품: ${escape(ev.matchedTier.label)}!</strong><span class="explanation">큰 조건부터 차례로 검사해야 ${n}장에 알맞은 ${escape(ev.matchedTier.label)} 분기로 정확히 연결돼요.</span>`,{valid:true,key:ev.matchedTier.key,story:{prize:ev.matchedTier.key},values:{prizeName:ev.matchedTier.label}});
      };
      return;
    }
    root.innerHTML=`${prediction(['큰 키링','작은 키링','별 스티커'])}<div class="field-row">${numberField('tickets','기념품 교환권 수',6)}</div><p class="form-note">입장 티켓과 별도로 부스 체험 뒤 받은 기념품 교환권이에요.</p><div class="prize-rows"><div class="prize-row" data-prize="large">① 만일 교환권 ≥ 8 → 큰 키링 <small class="branch-status"></small></div><div class="prize-row" data-prize="small">② 아니면, 만일 교환권 ≥ 5 → 작은 키링 <small class="branch-status"></small></div><div class="prize-row" data-prize="sticker">③ 아니면 → 별 스티커 <small class="branch-status"></small></div></div><div class="experiment-actions">${button('run','위에서부터 판단하기',true)}</div>${result()}`;
    $('tickets').oninput=()=>{hide();root.querySelectorAll('.prize-row').forEach(x=>{x.classList.remove('chosen','skipped');x.querySelector('.branch-status').textContent='';});};
    $('run').onclick=()=>{const n=read('tickets');if(n===null)return;const p=M.choosePrize(n),selected=['large','small','sticker'].indexOf(p),name={large:'큰 키링',small:'작은 키링',sticker:'별 스티커'}[p];root.querySelectorAll('.prize-row').forEach((x,i)=>{x.classList.toggle('chosen',i===selected);x.classList.toggle('skipped',i>selected);x.querySelector('.branch-status').textContent=i<selected?'검사 → 거짓':i===selected?(i===2?'앞의 조건 모두 거짓 → 실행':'검사 → 참 → 실행'):'방문하지 않음';});show(`받을 상품은 ${name} 하나!<span class="explanation">${n>=8?'첫 조건이 참이므로 아래쪽 ‘아니면’은 실행하지 않아요.':n>=5?'8 이상은 거짓, 5 이상은 참이므로 두 번째 분기를 실행해요.':'두 조건이 모두 거짓이라 마지막 ‘아니면’을 실행해요.'}</span>`,{key:p,story:{prize:p},values:{prizeName:name}});};
  };

  renderers.repeatCompare=({root,$,show})=>{
    const group='켜기 → 기다리기 → 끄기';root.innerHTML=`<div class="two-columns"><div class="board"><h3>네 번 복사하면</h3><pre class="block-code">${Array(4).fill(group).join('\n')}</pre></div><div class="board"><h3>반복을 사용하면</h3><pre class="block-code">4번 반복하기\n  불 켜기\n  잠깐 기다리기\n  불 끄기</pre></div></div>${prediction(['왼쪽만 4번','둘 다 4번'])}<div class="experiment-actions">${button('run','실행 횟수 확인',true)}</div>${result()}`;$('run').onclick=()=>show('둘 다 같은 묶음을 4번 실행해요.<span class="explanation">반복을 쓰면 명령 묶음을 한 번만 적고, 횟수를 바꾸기도 쉬워요.</span>');
  };

  renderers.count=({root,$,ctx,goal,show,hide})=>{
    const graded=Boolean(ctx.scene?.graded||goal);
    const initial=graded?(goal?.initialTimes??3):(ctx.choice?.params?.times||4);
    const timesOpts=[2,3,4,6];
    let finalGuess='';
    root.innerHTML=`<div class="count-toolbar">${graded?`<div class="board compact-board" style="flex:1"><h3>반복이 끝난 직후 조명은 어떤 상태일까요?</h3><div class="prediction"><button type="button" data-count-final="on" aria-pressed="false">켜진 채로 남아 있어요</button><button type="button" data-count-final="off" aria-pressed="false">꺼진 상태로 끝나요</button></div></div>`:prediction(['안쪽 세 명령을 모두 반복해요','불 켜기만 반복해요'])}<div class="field-row"><label>반복 횟수<select id="times">${timesOpts.map(n=>`<option${n===initial?' selected':''}>${n}</option>`).join('')}</select></label></div></div><div class="two-columns"><pre class="block-code"><span id="times-code">${initial}</span>번 반복하기\n  <span id="light-on-code">불 켜기</span>\n  <span id="light-wait-code">잠깐 기다리기</span>\n  <span id="light-off-code">불 끄기</span></pre><div class="board"><h3>실제 조명</h3><div id="lights" class="light-row"><span id="count-light" class="light-bulb"></span></div><div class="loop-status" id="light-state" role="status">불이 꺼져 있어요.</div><div class="loop-count" id="loop-count">0 / ${initial}회 완료</div><div id="completion-marks" class="completion-marks"></div></div></div><div class="experiment-actions">${button('step','명령 한 줄씩')}${button('run','전체 실행',true)}${button('stop','일시 정지')}</div>${result()}`;
    let done=0,command=0,running=false,on=false;const count=()=>Number($('times').value);
    if(graded){
      root.querySelectorAll('[data-count-final]').forEach(b=>b.onclick=()=>{
        finalGuess=b.dataset.countFinal;
        root.querySelectorAll('[data-count-final]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
        hide(false);
      });
    }
    const draw=()=>{$('loop-count').textContent=`${done} / ${count()}회 완료`;$('count-light').classList.toggle('on',on);$('completion-marks').textContent=Array.from({length:count()},(_,i)=>i<done?'✓':'○').join(' ');$('step').disabled=running||done>=count();$('run').disabled=running;$('stop').disabled=!running;};
    const stop=()=>{ctx.stopTimers();running=false;draw();};
    const evaluateCompletion=()=>{
      if(!graded){show(`${done}번의 명령 묶음을 모두 실행했어요.<span class="explanation">마지막 ‘불 끄기’까지 실행해서 조명은 꺼져 있어요. ✓는 조명 상태가 아니라 완료한 반복 횟수예요.</span>`,{values:{times:done}});return;}
      const wh=goal?.wrongHints||{};
      const expectedTimes=goal?.expectedTimes;
      const expectedOn=Boolean(goal?.expectedFinalOn);
      if(expectedTimes&&done!==expectedTimes){
        const why=wh.times||goal?.defaultWhy||`무대 신호에 맞게 정확히 ${expectedTimes}번 반복하도록 횟수를 맞춰 주세요!`;
        show(`<strong>반복 횟수가 달라요! (${done}번 실행됨)</strong><span class="explanation">${escape(why)}</span>`,{valid:false,failWhy:why,failExpr:4});
        return;
      }
      if(!finalGuess){
        show('반복이 끝난 뒤 조명 상태(켜짐/꺼짐) 예상을 고르고 다시 실행해 주세요.',{valid:false});
        return;
      }
      if((finalGuess==='on')!==expectedOn){
        const why=wh.finalState||goal?.defaultWhy||'반복 묶음의 마지막 명령이 ‘불 끄기’이므로 모든 반복이 끝나면 조명은 꺼져 있어요!';
        show(`<strong>최종 상태를 다시 확인하자!</strong><span class="explanation">${escape(why)}</span>`,{valid:false,failWhy:why,failExpr:4});
        return;
      }
      show(`<strong>정확해요! ${done}회 깜빡임 완료 후 꺼짐</strong><span class="explanation">안쪽 세 명령을 모두 한 묶음으로 ${done}번 실행해 마지막 불 끄기로 깔끔하게 끝났어요.</span>`,{valid:true,values:{times:done},story:goal?.storyPatch});
    };
    const step=()=>{if(done>=count())return;['light-on-code','light-wait-code','light-off-code'].forEach((id,i)=>$(id).classList.toggle('trace',i===command));if(command===0){on=true;$('light-state').textContent='불 켜기 실행 → 켜짐';command=1;}else if(command===1){$('light-state').textContent='기다리기 실행 → 켜진 채 기다림';command=2;}else{on=false;done++;command=0;$('light-state').textContent='불 끄기 실행 → 꺼짐 · 한 묶음 완료';}draw();if(done>=count()){stop();evaluateCompletion();}};
    const reset=()=>{stop();done=0;command=0;on=false;hide();$('times-code').textContent=count();$('light-state').textContent='불이 꺼져 있어요.';root.querySelectorAll('.trace').forEach(x=>x.classList.remove('trace'));draw();};
    if(ctx.choice&&!graded)$('times').disabled=true;
    $('times').onchange=reset;$('step').onclick=step;
    $('run').onclick=()=>{
      if(graded&&!finalGuess){ctx.notify('반복이 끝난 뒤 조명 상태를 먼저 골라 주세요.');return;}
      stop();if(done>=count()){done=0;command=0;on=false;}hide(false);running=true;step();if(done<count())ctx.interval(step,ctx.reducedMotion()?450:320);
    };
    $('stop').onclick=stop;draw();
  };

  renderers.polygon=({root,$,M,ctx,goal,show,hide})=>{
    const graded=Boolean(ctx.scene?.graded||goal);
    const initialSides=goal?.sides||ctx.choice?.params?.sides||4;
    const sidesOptions=goal?.sidesOptions||[3,4,5,6];
    const turnOptions=goal?.turnOptions||[45,60,72,90,108,120,135];
    const trapMap={3:60,4:45,5:108,6:120};
    const defaultTrap=n=>trapMap[n]||60;
    const initTurn=graded?(goal?.initialTurn&&goal.initialTurn!==M.polygonTurn(initialSides)?goal.initialTurn:defaultTrap(initialSides)):90;
    root.innerHTML=`<div class="field-row"><label>선택한 도형의 변 수<select id="sides">${sidesOptions.map(n=>`<option${n===initialSides?' selected':''}>${n}</option>`).join('')}</select></label><label>한 번의 회전각<select id="turn">${turnOptions.map(a=>`<option value="${a}"${a===initTurn?' selected':''}>${a}°</option>`).join('')}</select></label></div>${graded?'':prediction(['처음 자리로 돌아와 닫혀요','경로가 어긋날 것 같아요'])}<div class="two-columns"><div><pre class="block-code"><span id="sides-code">${initialSides}</span>번 반복하기\n  <span id="move-code">80만큼 움직이기</span>\n  <span id="turn-line">이동 방향을 <span id="turn-code">${initTurn}</span>°만큼 회전하기</span></pre><p class="form-note">드론은 한 변을 날고 나서 정한 각도만큼 돌아요. 변을 한 번씩만 그리고 출발점으로 돌아와 정다각형이 닫혀야 성공!</p><p class="control-description" id="polygon-command" role="status">오른쪽을 보고 출발해요.</p></div><div class="polygon-stage" id="polygon-stage" role="img" aria-label="도형 실행 경로"></div></div><div class="experiment-actions">${button('step','명령 한 줄씩')}${button('run','드론 비행 실행',true)}${button('stop','일시 정지')}</div>${result()}`;
    let steps=0,running=false;const values=()=>({n:Number($('sides').value),a:Number($('turn').value)});
    const draw=()=>{const {n,a}=values(),points=M.polygonPath(n,80,a),shown=points.slice(0,Math.ceil(steps/2)+1),last=shown.at(-1),angle=Math.floor(steps/2)*a,xs=points.map(p=>p.x),ys=points.map(p=>p.y),x=Math.min(...xs)-45,y=Math.min(...ys)-45,w=Math.max(...xs)-x+50,h=Math.max(100,Math.max(...ys)-y+50);let arc='';if(steps>0&&steps%2===0){const r=24,start=(angle-a)*Math.PI/180,end=angle*Math.PI/180;arc=`<path class="turn-arc" d="M${last.x+r*Math.cos(start)},${last.y+r*Math.sin(start)} A${r},${r} 0 0 1 ${last.x+r*Math.cos(end)},${last.y+r*Math.sin(end)}"/>`;}$('polygon-stage').innerHTML=`<svg viewBox="${x} ${y} ${w} ${h}" aria-hidden="true"><polyline points="${shown.map(p=>p.x+','+p.y).join(' ')}"/>${arc}<path class="direction-cursor" transform="translate(${last.x} ${last.y}) rotate(${angle})" d="M10 0 L-6 -5 L-6 5 Z"/></svg>`;$('polygon-stage').setAttribute('aria-label',`${n}번 중 ${Math.ceil(steps/2)}번 이동, ${Math.floor(steps/2)}번 회전, 현재 방향 ${angle%360}도`);$('move-code').classList.toggle('trace',steps>0&&steps%2===1);$('turn-line').classList.toggle('trace',steps>0&&steps%2===0);$('step').disabled=running||steps>=n*2;$('run').disabled=running;$('stop').disabled=!running;};
    const stop=()=>{ctx.stopTimers();running=false;draw();};
    const step=()=>{
      const {n,a}=values();if(steps>=n*2)return;
      steps++;
      $('polygon-command').textContent=steps%2?'80만큼 움직였어요. 이제 그 자리에서 회전해요.':`${a}° 회전했어요. ${steps/2} / ${n}묶음 완료`;
      draw();
      if(steps>=n*2){
        stop();
        const ev=M.evaluatePolygonTurn(n,a);
        if(ev.correct){
          show(`<strong>정${n}각형 드론 경로 완성! ${a}° × ${n} = 360°</strong><span class="explanation">한 바퀴 360°를 ${n}번에 나누어 바깥각 ${a}°씩 돌아 깔끔하게 닫혔어요.</span>`,{valid:true,key:ctx.choice?.key||'default',story:{polygon:n}});
        }else{
          const wh=goal?.wrongHints||{};
          const why=wh[`${n}:${a}`]||(a===ev.interior?wh.interior:null)||wh[String(a)]||wh.sum||wh.default||goal?.defaultWhy||`안쪽 각(${ev.interior}°)이 아니라 꺾어 도는 바깥각(360° ÷ ${n} = ${ev.expected}°)으로 회전해야 정${n}각형이 닫혀요!`;
          show(`<strong>경로가 닫히지 않았어요! (${a}° × ${n} = ${ev.sum}°)</strong><span class="explanation">${escape(why)}</span>`,{valid:false,failWhy:why,failExpr:4});
        }
      }
    };
    const reset=()=>{ctx.stopTimers();steps=0;running=false;hide();$('sides-code').textContent=$('sides').value;$('turn-code').textContent=$('turn').value;$('polygon-command').textContent='오른쪽을 보고 출발해요.';draw();};
    if(ctx.choice||goal?.lockSides)$('sides').disabled=true;
    $('sides').onchange=()=>{if(graded)$('turn').value=String(defaultTrap(Number($('sides').value)));reset();};
    $('turn').onchange=reset;$('step').onclick=step;
    $('run').onclick=()=>{stop();if(steps>=values().n*2)steps=0;hide(false);running=true;step();if(steps<values().n*2)ctx.interval(step,ctx.reducedMotion()?220:260);};
    $('stop').onclick=stop;draw();
  };

  renderers.until=({root,$,ctx,goal,show,hide})=>{
    const graded=Boolean(ctx.scene?.graded||goal);
    const secret=String(goal?.passcode||ctx.state.story.meetingTime.replace(':','')||'1700');
    if(graded){
      const initCond=goal?.initialCondition||'!=';
      const initBody=goal?.initialBody||'outside';
      root.innerHTML=`<div class="board"><h3>1. 잠금 해제 반복 블록 디버깅</h3><p class="form-note">틀린 암호(‘1111’)가 들어오면 다시 묻고, 어젯밤 정한 약속 시각 네 자리 암호가 들어오면 바로 멈춰 잠금을 열어야 해요.</p><div class="block-code block-builder"><div id="until-before-line" class="form-note" hidden>암호 묻고 대답 기다리기</div><div>(<select id="until-cond"><option value="!="${initCond==='!='?' selected':''}>대답 ≠ 목표 암호</option><option value="="${initCond==='='?' selected':''}>대답 = 목표 암호</option></select>) 이(가) 될 때까지 반복하기</div><div class="indent"><select id="until-body"><option value="outside"${initBody==='outside'?' selected':''}>아무것도 묻지 않고 그대로 검사만 반복</option><option value="inside"${initBody==='inside'?' selected':''}>암호 묻고 대답 기다리기 (반복 안)</option></select></div><div>잠금 풀고 점등식 시작!</div></div><div class="password-status"><span id="until-trace-step">블록을 고친 뒤 실행해 오답(‘1111’)과 약속 시각 네 자리를 테스트해 보세요.</span></div><div class="experiment-actions">${button('run-until','조건 검사하고 잠금 테스트 시작 →',true)}</div><div id="until-pass-box" hidden style="margin-top:14px"><label class="form-field">2. 제어반 네 자리 암호 입력 (오답 1111 먼저 시험해 보기)<input id="password" type="text" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="네 자리 숫자"></label><div class="experiment-actions">${button('wrong','1111 시험 입력')}${button('answer','암호 입력해서 검사하기',true)}</div><p id="password-error" class="form-feedback" role="status"></p></div></div>${result()}`;
      const resetPass=()=>{
        $('until-before-line').hidden=$('until-body').value!=='outside';
        $('until-pass-box').hidden=true;
        $('run-until').disabled=false;
        $('password-error').textContent='';
        $('password').value='';
        hide();
      };
      $('until-cond').onchange=resetPass;$('until-body').onchange=resetPass;
      $('until-before-line').hidden=$('until-body').value!=='outside';
      $('run-until').onclick=()=>{
        const cond=$('until-cond').value,body=$('until-body').value;
        const expectedCond=goal?.expectedCondition||'=';
        const expectedBody=goal?.expectedBody||'inside';
        const wh=goal?.wrongHints||{};
        if(body!==expectedBody){
          const why=wh.body||wh.outside||goal?.defaultWhy||'묻기 블록이 반복 밖에 있으면 오답일 때 대답이 바뀌지 않아 무한 반복에 빠져요!';
          $('until-trace-step').textContent='추적: 반복 안에 묻기 블록이 없어 대답이 갱신되지 않아요!';
          show(`<strong>무한 반복 버그!</strong><span class="explanation">${escape(why)}</span>`,{valid:false,failWhy:why,failExpr:4});
          return;
        }
        if(cond!==expectedCond){
          const why=wh.condition||wh['!=']||goal?.defaultWhy||'‘~할 때까지 반복’은 조건이 참이 될 때 멈춰요! ≠를 쓰면 ‘1111 ≠ 암호’가 참이라 오답인데도 바로 열려 버려요.';
          $('until-trace-step').textContent='추적: ‘1111’ 입력 → (대답 ≠ 목표)가 참! 오답인데 열려 버림!';
          show(`<strong>종료 조건 버그!</strong><span class="explanation">${escape(why)}</span>`,{valid:false,failWhy:why,failExpr:4});
          return;
        }
        hide(false);
        $('run-until').disabled=true;
        $('until-cond').disabled=true;
        $('until-body').disabled=true;
        $('until-pass-box').hidden=false;
        $('until-trace-step').textContent='조건(대답 = 암호) 거짓 → 반복 안 질문 실행 중! 먼저 1111 같은 오답도 넣어 보세요.';
        $('password').focus();
      };
      $('wrong').onclick=()=>{$('password').value='1111';$('password').focus();};
      const testPasscode=()=>{
        const val=$('password').value.trim();
        if(!/^\d{4}$/.test(val)){
          $('password-error').textContent='네 자리 숫자를 입력해 주세요.';
          $('password').focus();
          return;
        }
        $('password-error').textContent='';
        if(val!==secret){
          $('until-trace-step').textContent=val==='1111'?'추적: ‘1111’ ≠ 암호 → 조건 거짓! 반복이 끝나지 않고 다시 물어요. 이제 어젯밤 정한 약속 시각 네 자리를 입력해 보세요!':`추적: ‘${val}’ ≠ 암호 → 조건 거짓! 다시 물어요. (힌트: 어젯밤 정한 약속 시각은 ${ctx.state.story.meetingTime}였어요!)`;
          $('password').value='';
          $('password').focus();
          return;
        }
        $('until-trace-step').textContent=`추적: ‘${val}’ = 암호 → 조건 참! 반복 종료 후 제어반 잠금 해제!`;
        $('password').disabled=true;$('wrong').disabled=true;$('answer').disabled=true;
        show(`<strong>제어반 잠금 해제 완료!</strong><span class="explanation">‘(대답 = 암호)’가 될 때까지 반복 안에 묻기 블록을 두어, 틀리면 다시 묻고 약속 시각(${escape(ctx.state.story.meetingTime)}) 네 자리에서 정확히 멈추어 열렸어요.</span>`,{valid:true,key:'opened',story:goal?.storyPatch});
      };
      $('answer').onclick=testPasscode;
      $('password').onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();testPasscode();}};
      return;
    }
    root.innerHTML=`<p class="form-note">약속한 시각을 네 자리 숫자로 떠올려 카드를 열어 보세요.</p>${prediction(['오답 뒤에도 다시 물어요','한 번 물으면 바로 열려요'])}<details class="form-note"><summary>처음부터 조건이 참인 경우도 확인하기</summary><label class="checkbox-line"><input id="precorrect" type="checkbox"><span>시작할 때 대답이 이미 정답과 같다면?</span></label></details><pre class="block-code"><span id="until-check-code">(대답 = 목표 암호)이 될 때까지 반복하기</span>\n  <span id="until-ask-code">암호를 묻고 대답 기다리기</span>\n<span id="until-open-code">카드 열기</span></pre><div class="password-status"><span id="latest-answer">현재 대답: 비어 있음</span><span id="questions">질문 0번</span></div><p id="until-trace" class="execution-trace" role="status">아직 조건을 검사하지 않았어요.</p><div id="password-form" hidden><label class="form-field">카드의 네 자리 암호는?<input id="password" type="text" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="네 자리 숫자"></label><div class="experiment-actions">${button('wrong','1111 입력해 보기')}${button('answer','대답하고 다시 검사',true)}</div></div><p id="password-error" class="form-feedback" role="status"></p><div class="experiment-actions">${button('start','조건을 검사하고 시작',true)}${button('next-command','판정에 따라 다음 명령',true)}${button('restart','처음부터')}</div>${result()}`;
    let answer='',questions=0,active=false,pending=null;$('next-command').hidden=true;const update=()=>{$('latest-answer').textContent=`현재 대답: ${answer?'****':'비어 있음'}`;$('questions').textContent=`질문 ${questions}번`;};
    const check=()=>{update();root.querySelectorAll('.trace').forEach(x=>x.classList.remove('trace'));$('until-check-code').classList.add('trace');$('password-form').hidden=true;pending=answer===secret?'open':'ask';$('until-trace').textContent=`조건 검사 결과 → ${pending==='open'?'참 · 반복 종료 후 카드 열기로':'거짓 · 반복 안의 질문으로'}`;$('next-command').textContent=pending==='open'?'참 → 카드 열기':'거짓 → 질문하기';$('next-command').hidden=false;};
    $('next-command').onclick=()=>{if(!pending)return;root.querySelectorAll('.trace').forEach(x=>x.classList.remove('trace'));$('next-command').hidden=true;if(pending==='open'){active=false;$('until-open-code').classList.add('trace');$('until-trace').textContent='조건이 참이므로 반복을 끝내고 카드 열기를 실행했어요.';show(`카드가 열렸어요. 질문은 ${questions}번!<span class="explanation">조건이 참이면 반복 몸체를 더 실행하지 않고 다음 명령으로 진행해요.</span>`);}else{questions++;$('until-ask-code').classList.add('trace');$('until-trace').textContent=`조건이 거짓이므로 ${questions}번째 질문을 실행해요. 대답하면 다시 조건을 검사해요.`;$('password-form').hidden=false;$('password').value='';update();}pending=null;};
    const reset=(clearPrediction=true)=>{answer=$('precorrect').checked?secret:'';questions=0;active=false;pending=null;$('next-command').hidden=true;update();hide(clearPrediction);$('password-form').hidden=true;$('password-error').textContent='';$('until-trace').textContent='조건을 검사하기 전이에요.';$('start').disabled=false;root.querySelectorAll('.trace').forEach(x=>x.classList.remove('trace'));};
    $('start').onclick=()=>{reset(false);active=true;$('start').disabled=true;check();};const submit=()=>{if(!active)return;const value=$('password').value;if(!/^\d{4}$/.test(value)){$('password-error').textContent='네 자리 숫자를 입력해 주세요.';$('password').focus();return;}$('password-error').textContent='';answer=value;check();};$('wrong').onclick=()=>{$('password').value='1111';};$('answer').onclick=submit;$('password').onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();submit();}};$('restart').onclick=reset;$('precorrect').onchange=reset;reset();
  };

  renderers.forever=({root,$,ctx,show,hide})=>{
    root.innerHTML=`<div class="two-columns"><pre class="block-code">계속 반복하기\n  <span id="forever-on">불 켜기</span>\n  <span id="forever-wait-on">잠깐 기다리기</span>\n  <span id="forever-off">불 끄기</span>\n  <span id="forever-wait-off">잠깐 기다리기</span>\n\n아래 명령: “공연 끝!” 말하기</pre><div class="board"><h3>계속 반복 중인 조명</h3><div class="light-row"><span id="forever-light" class="light-bulb"></span></div><div id="forever-status" class="loop-status" role="status">아직 시작하지 않았어요.</div><p class="form-note">반복을 빠져나오지 않으면 아래 명령으로 진행하지 않아요.</p></div></div><div class="experiment-actions">${button('run','계속 반복 시작',true)}${button('stop','프로그램 정지')}</div>${result()}`;
    let running=false,command=0;$('stop').disabled=true;const lines=['forever-on','forever-wait-on','forever-off','forever-wait-off'];
    $('run').onclick=()=>{if(running)return;running=true;command=0;hide(false);$('run').disabled=true;$('stop').disabled=false;const tick=()=>{lines.forEach((id,i)=>$(id).classList.toggle('trace',i===command));$('forever-light').classList.toggle('on',command<2);$('forever-status').textContent=['불 켜기 실행','켜진 채 기다리기','불 끄기 실행','꺼진 채 기다리기'][command]+' · 종료 횟수 없음';command=(command+1)%4;};tick();ctx.interval(tick,ctx.reducedMotion()?700:450);};
    $('stop').onclick=()=>{ctx.stopTimers();running=false;$('run').disabled=false;$('stop').disabled=true;$('forever-light').classList.remove('on');lines.forEach(id=>$(id).classList.remove('trace'));$('forever-status').textContent='전체 프로그램을 정지했어요.';show('프로그램 전체를 정지했어요.<span class="explanation">반복 안에서 빠져나오는 명령을 실행한 것이 아니에요. 아래의 “공연 끝!”도 실행되지 않았어요.</span>');};
  };

  renderers.counter=({root,$,M,ctx,goal,show,hide})=>{
    const graded=Boolean(ctx.scene?.graded||goal);
    if(graded){
      const initOp=goal?.initialOp||'set',target=goal?.target||5;
      let count=0;
      root.innerHTML=`<div class="two-columns"><div class="block-code block-builder"><div>시작할 때 준비 횟수를 0으로 정하기</div><div>버튼을 클릭했을 때</div><div class="indent"><select id="counter-op"><option value="set"${initOp==='set'?' selected':''}>준비 횟수를 1로 정하기</option><option value="add"${initOp==='add'?' selected':''}>준비 횟수에 1만큼 더하기</option></select></div><div class="indent" id="counter-condition">만일 준비 횟수 ≥ ${target}라면</div><div class="indent" id="counter-shape-code">  완성 모양으로 바꾸기</div></div><div class="board"><h3>조명 준비 확인</h3><div id="ready-display" class="ready-display">${ctx.shapeSvg()}</div><div id="ready-lights" class="completion-marks"></div><div class="loop-count" id="ready-count" role="status">0 / ${target}</div><p class="loop-status" id="ready-shape">미완성 모양</p></div></div><div class="experiment-actions">${button('click','준비 확인 버튼 클릭 (+테스트)',true)}${button('reset','0으로 다시 시작')}</div>${result()}`;
      const draw=()=>{$('ready-count').textContent=`${count} / ${target}`;$('ready-lights').textContent=Array.from({length:target},(_,i)=>i<count?'✓':'○').join(' ');$('ready-shape').textContent=count>=target?'완성 모양 · 조건 참':'미완성 모양 · 조건 거짓';$('ready-display').classList.toggle('complete',count>=target);$('counter-condition').classList.toggle('trace',count>0);$('counter-shape-code').classList.toggle('trace',count>=target);$('click').disabled=count>=target;};
      $('counter-op').onchange=()=>{count=0;hide();draw();};
      $('click').onclick=()=>{
        const op=$('counter-op').value;
        if(op!==(goal?.expectedOp||'add')){
          count=1;draw();
          const wh=goal?.wrongHints||{};
          const why=wh.set||goal?.defaultWhy||'‘1로 정하기’는 누를 때마다 값을 1로 덮어써서 숫자가 쌓이지 않아요! ‘1만큼 더하기’로 바꿔야 5까지 올라가요.';
          show(`<strong>카운터가 1에서 멈췄어요!</strong><span class="explanation">${escape(why)}</span>`,{valid:false,failWhy:why,failExpr:4});
          return;
        }
        count=M.incrementReady(count).count;draw();
        if(count>=target){
          $('counter-op').disabled=true;
          show(`<strong>카운터 ${target} 달성!</strong><span class="explanation">0에서 시작해 클릭마다 ‘1만큼 더하기’를 실행해서 ${target}에 도달했어요.</span>`,{valid:true,story:goal?.storyPatch});
        }
      };
      $('reset').onclick=()=>{count=0;hide();draw();};draw();
      return;
    }
    root.innerHTML=`<div class="two-columns"><pre class="block-code">시작할 때 준비 횟수를 0으로 정하기\n버튼을 클릭했을 때\n  준비 횟수에 1 더하기\n  <span id="counter-condition">만일 준비 횟수 ≥ 5라면</span>\n    <span id="counter-shape-code">완성 모양으로 바꾸기</span></pre><div class="board"><h3>조명 준비 확인</h3><div id="ready-display" class="ready-display">${ctx.shapeSvg()}</div><div id="ready-lights" class="completion-marks"></div><div class="loop-count" id="ready-count" role="status">0 / 5</div><p class="loop-status" id="ready-shape">미완성 모양</p></div></div><div class="experiment-actions">${button('click','준비 확인 1회',true)}${button('reset','0으로 다시 시작')}</div>${result()}<p class="form-note">클릭 사건 한 번에 1을 더해요. 여러 번 클릭하는 것과 반복 블록은 구분해요.</p>`;
    let count=0;const draw=()=>{$('ready-count').textContent=`${count} / 5`;$('ready-lights').textContent=Array.from({length:5},(_,i)=>i<count?'✓':'○').join(' ');$('ready-shape').textContent=count>=5?'완성 모양 · 조건 참':'미완성 모양 · 조건 거짓';$('ready-display').classList.toggle('complete',count>=5);$('counter-condition').classList.toggle('trace',count>0);$('counter-shape-code').classList.toggle('trace',count>=5);$('click').disabled=count>=5;};$('click').onclick=()=>{count=M.incrementReady(count).count;draw();if(count>=5)show('0에서 다섯 번 1을 더해서 5가 되었어요.<span class="explanation">준비 횟수 ≥ 5가 참인 지금, 완성 모양으로 바뀌었어요.</span>');};$('reset').onclick=()=>{count=0;hide();draw();};draw();
  };

  window.FestivalExperiments={render,escape};
})();
