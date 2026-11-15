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
      resEl.scrollIntoView({block:'nearest',behavior:'auto'});
    };
    if(!renderers[type])throw Error('알 수 없는 실험: '+type);
    renderers[type]({root,ctx,$,M,show});
  }

  // 하트 문항: 지금 상황 → 코드(고칠 줄 강조) → 질문 → 큰 카드 3장.
  // 카드를 고르면 그 코드로 실행한 결과(screen)를 보여 주고, 처음 고른 카드가 첫 시도입니다.
  // quiz.variants[고른 흐름 key]가 있으면 그 묶음으로 바꿔 씁니다(예: 3장 도형마다 다른 카드).
  renderers.quiz=({root,M,ctx,show})=>{
    const base=ctx.scene?.quiz||{};
    const variantKey=base.variants?ctx.choice?.key:'';
    const q={...base,...(base.variants?.[variantKey]||{})};
    const fmt=v=>ctx.interpolate?ctx.interpolate(v):String(v??'');
    const choices=Array.isArray(q.choices)?q.choices:[];
    const letters=['A','B','C','D'];
    const code=Array.isArray(q.code)?q.code:[];
    const codeHtml=code.length?`<pre class="block-code quiz-code">${code.map((line,idx)=>{
      const text=fmt(line),focus=idx+1===q.focus;
      return `<span class="code-line${/^\s{2,}/.test(text)?' indent':''}${focus?' focus':''}"><span class="line-no" aria-hidden="true">${idx+1}</span><span class="code-text">${escape(text.replace(/^\s{2}/,''))}</span>${focus?'<span class="focus-tag">고칠 곳</span>':''}</span>`;
    }).join('')}</pre>`:'';
    const situation=(q.situation||[]).map(line=>`<p>${escape(fmt(line))}</p>`).join('');
    root.innerHTML=`<div class="board quiz-board">${situation?`<div class="quiz-situation"><span class="quiz-label">지금 상황</span>${situation}</div>`:''}${q.hat?`<div class="quiz-hat">${escape(fmt(q.hat))}</div>`:''}${codeHtml}<h3 class="quiz-prompt">${escape(fmt(q.prompt||ctx.scene?.goalPrompt||'알맞은 카드를 골라 보세요.'))}</h3><div class="quiz-choices" role="group" aria-label="고를 카드">${M.seededOrder((ctx.scene?.questionId||ctx.scene?.id||'')+variantKey,choices.length).map((ci,i)=>{const c=choices[ci];return `<button type="button" class="quiz-choice" data-quiz-choice="${escape(String(c.key??ci))}"><span class="choice-badge" aria-hidden="true">${letters[i]||i+1}</span><span class="choice-label">${escape(fmt(c.label))}</span></button>`;}).join('')}</div></div><div id="result" class="result" role="status" hidden></div>`;
    root.querySelectorAll('[data-quiz-choice]').forEach(btn=>{
      btn.onclick=()=>{
        const graded=M.gradeQuizAnswer(q,btn.dataset.quizChoice);
        const c=graded.choice;
        const screen=c?.screen?`<p class="sim-screen">실행 결과 · ${escape(fmt(c.screen))}</p>`:'';
        if(!graded.correct){
          btn.dataset.wrong='true';
          btn.disabled=true;
          show(`${screen}<strong>다시 골라 보자!</strong><span class="explanation">${escape(fmt(graded.why))}</span>`,{valid:false,failWhy:fmt(graded.why),failExpr:c?.expression||4});
          return;
        }
        btn.dataset.correct='true';
        root.querySelectorAll('[data-quiz-choice]').forEach(b=>b.disabled=true);
        show(`${screen}<strong>${escape(fmt(q.successTitle||'정답이에요!'))}</strong><span class="explanation">${escape(fmt(q.explain||c?.explain||''))}</span>`,{valid:true,quizKey:c?.key,story:c?.storyPatch||q.storyPatch,values:c?.values||q.values});
      };
    });
  };

  window.FestivalExperiments={render,escape};
})();
