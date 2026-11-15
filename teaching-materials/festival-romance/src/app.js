(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const S=window.FestivalState,M=window.FestivalModels,E=window.FestivalExperiments;
  const chapters=window.FESTIVAL_CHAPTERS||[];
  const ids=chapters.flatMap(c=>c.scenes.map(s=>s.id));
  const state=S.createStoryState();
  const escape=E.escape;
  const urlParams=new URLSearchParams(window.location.search);
  const isTeacher=urlParams.get('mode')==='teacher';
  const isEmbed=urlParams.get('embed')==='1';

  let rawLocal=null;
  try{if(!isEmbed)rawLocal=window.localStorage;}catch{rawLocal=null;}
  const storage=S.createStorageAdapter({embed:isEmbed,local:rawLocal});

  let activeChapter=null,activeScene=null,generation=0,advanceLine=null,forward=null,backward=null,toastTimer,deltaTimer,phase='',flowChoice=null,flowResult=null,lastAttemptFirstTry=true;
  const timers=new Set();

  if(isEmbed){
    document.body.dataset.embed='true';
    $('stage').dataset.embed='true';
    $('fullscreen').hidden=true;
  }
  $('stage').dataset.mode=isTeacher?'teacher':'student';
  $('contents-button').hidden=!isTeacher;
  $('teaching-tools').hidden=!isTeacher;
  $('short-mode-field').hidden=!isTeacher;
  $('site-url-field').hidden=!isTeacher;

  const saved=S.readGameState(storage,ids);
  if(saved){
    Object.assign(state,saved);
    if(!isTeacher)state.shortMode=false;
  }

  const shapeName=n=>({3:'삼각형',4:'사각형',5:'오각형',6:'육각형'}[n]||'사각형');
  function interpolate(value){
    const t=state.story||{};
    const values={
      ...t,
      name:state.nickname,
      vocative:S.vocative(state.nickname),
      prizeName:{large:'큰 키링',small:'작은 키링',sticker:'별 스티커'}[t.prize]||'작은 키링',
      shapeName:shapeName(t.polygon),
      boothName:t.booth==='game'?'게임 부스':'사진 부스',
      routeDescription:t.route==='indoor'?'실내 부스를 둘러보고 나오니':t.route==='wait'?'비가 잠잠해질 때까지 함께 기다린 뒤':'야외 공연을 보고 나오니',
      ...(flowResult?.values||{})
    };
    return String(S.variantText(value,state.variant)||'').replace(/\{\{(\w+)\}\}/g,(_,key)=>values[key]??'');
  }

  function buildEmbedPayload(){
    const totalHearts=S.countTotalHearts(state);
    const cold=S.hasColdRejection(state);
    return {
      version:2,
      nickname:state.nickname,
      variant:state.variant,
      onboarded:state.onboarded,
      chapterId:state.chapterId,
      sceneId:state.sceneId,
      story:state.story,
      chapterResults:state.chapterResults,
      activeRuns:state.activeRuns,
      coldChoices:state.coldChoices,
      seenScenes:state.seenScenes,
      totalHearts,
      maxHearts:12,
      hasColdRejection:cold,
      endingOutcome:state.chapterResults?.[3]?.completed?M.computeEndingOutcome(totalHearts,cold):null
    };
  }
  // 게임이 다른 도메인에서 열릴 수 있어, 부모 출처는 처음 받은 festival:init에서 정합니다. 그 전에는 내용 없는 ready만 보냅니다.
  let parentOrigin=null;
  function postToParent(type,payload){
    if(!isEmbed||!window.parent||window.parent===window)return;
    if(type!=='festival:ready'&&!parentOrigin)return;
    try{window.parent.postMessage({type,payload},type==='festival:ready'?'*':parentOrigin);}catch{}
  }
  // 장을 끝낸 기록은 한 곳에서만 만들고, 장을 새로 시작하기 전까지 chapter-complete는 한 번만 보냅니다(다시 보기마다 저장하지 않음).
  const reportedChapters=new Set();
  function completeChapter(id){
    S.commitChapterRun(state,id,chapterQuestionMetas(activeChapter));
    record();
    if(reportedChapters.has(id))return;
    reportedChapters.add(id);
    postToParent('festival:chapter-complete',{chapterId:id});
  }

  function notify(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4800);}
  function stopTimers(){timers.forEach(clearInterval);timers.clear();}
  function disposeScene(){generation++;stopTimers();advanceLine=null;forward=null;backward=null;$('previous-button').disabled=true;clearTimeout(toastTimer);$('toast').hidden=true;}
  function interval(callback,ms){const current=generation;const timer=setInterval(()=>{if(generation!==current){clearInterval(timer);timers.delete(timer);return;}if(document.querySelector('dialog[open]'))return;callback();},ms);timers.add(timer);return timer;}
  function setBackward(action){backward=action||null;$('previous-button').disabled=!backward;}
  function goBack(){if(!$('previous-button').disabled)backward?.();}
  // 장 첫 장면에서는 이전 장으로 가지 않습니다(startChapter가 회차 기록을 지우므로 이전 경로에서 쓰지 않음).
  function sceneBack(){return nextIndex(-1)>=0?()=>move(-1):null;}
  function setForward(label,action,disabled=false){$('next-button').textContent=label;$('next-button').disabled=disabled;forward=action;}

  function expression(el,index){
    if(!el)return;
    const rows=(window.FESTIVAL_SPRITE_ROWS&&window.FESTIVAL_SPRITE_ROWS[state.variant])||2;
    const crop=M.spriteCrop(index,rows);
    el.style.backgroundSize=crop.backgroundSize;
    el.style.backgroundPosition=crop.backgroundPosition;
    el.dataset.expression=String(crop.expression);
    el.setAttribute('aria-label',crop.label);
  }
  function applyCharacter(){
    const asset=window.FESTIVAL_ASSETS[state.variant];
    document.querySelectorAll('.character').forEach(el=>{
      el.style.backgroundImage=`url("${asset}")`;
      const expr=el.dataset.expression!==undefined?Number(el.dataset.expression):0;
      expression(el,Number.isInteger(expr)?expr:0);
    });
    document.querySelectorAll('input[name="variant"]').forEach(input=>{input.checked=input.value===state.variant;});
    document.querySelectorAll('input[name="onboard-variant"]').forEach(input=>{input.checked=input.value===state.variant;});
  }
  function background(key){
    const image=key==='night'?window.FESTIVAL_ASSETS.night:key==='dusk'?window.FESTIVAL_ASSETS.dusk:window.FESTIVAL_ASSETS.background;
    document.querySelector('.scenery').style.backgroundImage=`url("${image}")`;
    $('stage').dataset.tone=key||'day';
  }
  function record(){
    S.saveGameState(storage,state);
    postToParent('festival:state',buildEmbedPayload());
  }

  function renderHeartHud({deltaText='',deltaKind=''}={}){
    const total=activeChapter?S.countLiveTotalHearts(state,activeChapter.id):S.countTotalHearts(state);
    $('total-hearts').textContent=`총 ♥ ${total}/12`;
    if(!activeChapter){
      $('chapter-hearts').hidden=true;
      $('chapter-hearts').innerHTML='';
    }else{
      const graded=activeChapter.scenes.filter(s=>s.graded);
      const run=state.activeRuns?.[activeChapter.id]||{missedThisRun:{},solvedThisRun:{}};
      $('chapter-hearts').innerHTML=graded.map((q,idx)=>{
        const qId=q.questionId||q.id;
        const solved=run.solvedThisRun?.[qId];
        const missed=Boolean(run.missedThisRun?.[qId]);
        if(solved?.solved&&solved.firstAttempt)return `<span class="heart-slot earned" title="문항 ${idx+1}: 첫 시도 성공 (+1 ♥)" aria-label="문항 ${idx+1} 첫 시도 성공">♥</span>`;
        if(solved?.solved||missed)return `<span class="heart-slot missed" title="문항 ${idx+1}: 첫 시도 오답 (0 ♥)" aria-label="문항 ${idx+1} 첫 시도 실패">♡</span>`;
        return `<span class="heart-slot upcoming" title="문항 ${idx+1}: 도전 전" aria-label="문항 ${idx+1} 도전 전">☆</span>`;
      }).join('');
      $('chapter-hearts').dataset.label=`${activeChapter.id}장`;
      $('chapter-hearts').setAttribute('aria-label',`${activeChapter.id}장 하트(첫 시도에 맞힌 문제)`);
      $('chapter-hearts').hidden=false;
    }
    if(deltaText){
      clearTimeout(deltaTimer);
      const el=$('heart-delta');
      el.hidden=false;
      el.className=`heart-delta ${deltaKind}`;
      el.textContent=deltaText;
      deltaTimer=setTimeout(()=>{el.hidden=true;},2600);
    }
  }

  function chapterQuestionMetas(chapter){
    return chapter.scenes.filter(s=>s.graded).map(s=>({questionId:s.questionId||s.id,conceptTitle:s.conceptTitle||s.title}));
  }
  function startChapter(chapterId,index=0){
    if(!canPickChapter()){openOnboarding();return;}
    if(!S.isChapterUnlocked(state,chapterId,isTeacher)){
      notify(`${chapterId-1}장을 먼저 완료하면 ${chapterId}장이 열려요!`);
      return;
    }
    if(index===0){S.startChapterRun(state,chapterId);reportedChapters.delete(chapterId);}
    showScene(chapterId,index);
  }
  function hasAnyProgress(){
    return Boolean(state.onboarded||state.chapterId||[1,2,3].some(id=>state.chapterResults?.[id]?.completed));
  }
  // 처음 온 학생은 이름·하루 성별을 정하는 '새 이야기 시작'으로만 들어옵니다.
  function canPickChapter(){return isTeacher||hasAnyProgress();}

  function syncTitle(){
    $('chapter-list').innerHTML=chapters.map(c=>{
      const unlocked=S.isChapterUnlocked(state,c.id,isTeacher);
      const res=state.chapterResults?.[c.id]||{completed:false,hearts:0};
      const status=res.completed?(res.hearts===4?'완료 · ♥ 4/4 퍼펙트!':`완료 · ♥ ${res.hearts}/4 · 재도전`):(unlocked?'도전 가능 · 4문항':`🔒 ${c.id-1}장 완료 후 해금`);
      const badgeClass=res.completed?(res.hearts===4?'is-perfect':'is-done'):(unlocked?'is-open':'is-locked');
      return `<button class="chapter-card ${badgeClass}" data-chapter="${c.id}"${unlocked?'':' disabled'}><span class="chapter-number">0${c.id}</span><span><strong>${escape(c.title)}</strong><small>${escape(c.subject)} · ${escape(status)}</small></span><span class="chapter-link" aria-hidden="true">${unlocked?'↗':'🔒'}</span></button>`;
    }).join('');
    $('chapter-list').querySelectorAll('[data-chapter]').forEach(b=>b.onclick=()=>startChapter(Number(b.dataset.chapter),0));
    $('chapter-list').hidden=!canPickChapter();

    const canResume=Boolean(state.chapterId&&state.sceneId&&S.isChapterUnlocked(state,state.chapterId,isTeacher)&&ids.includes(state.sceneId));
    $('resume-button').hidden=!canResume;
    if(canResume){
      const c=chapters.find(x=>x.id===state.chapterId),s=c?.scenes.find(x=>x.id===state.sceneId);
      if(s)$('resume-button').textContent=`이어하기 · ${interpolate(s.title)}`;
    }
    $('ending-review-button').hidden=!state.chapterResults?.[3]?.completed;
    renderHeartHud();
  }

  function showTitle(){
    disposeScene();
    activeChapter=null;activeScene=null;flowResult=null;flowChoice=null;
    $('title-view').hidden=false;$('scene-view').hidden=true;
    $('stage').dataset.kind='title';
    delete $('stage').dataset.voice;
    delete $('stage').dataset.medium;
    background('day');
    $('chapter-indicator').textContent=isTeacher?'교사 검수 모드 · 전체 해금':'하나의 이야기 · 12문항 CS 챌린지';
    $('progress-text').textContent=canPickChapter()?'새 이야기를 시작하거나 해금된 장을 골라 보세요.':'새 이야기 시작을 눌러 하루와의 이야기를 시작해 보세요.';
    $('timing-text').textContent='1~3단원 핵심 개념 총복습 · 3가지 엔딩';
    ['previous-button','next-button','reset-button','teacher-button'].forEach(id=>$(id).disabled=true);
    $('next-button').textContent='다음 →';
    syncTitle();
    applyCharacter();
  }

  function sceneIndex(){return activeChapter?activeChapter.scenes.findIndex(s=>s.id===activeScene.id):-1;}
  function nextIndex(direction){
    if(!activeChapter)return -1;
    let i=sceneIndex()+direction;
    while(i>=0&&i<activeChapter.scenes.length&&activeChapter.scenes[i].optional)i+=direction;
    return i;
  }
  function move(direction){
    if(!activeScene)return;
    const i=nextIndex(direction);
    if(i>=activeChapter.scenes.length){
      completeChapter(activeChapter.id);
      if(activeChapter.id<3&&!activeChapter.scenes.some(s=>s.kind==='summary')){
        startChapter(activeChapter.id+1,0);
        return;
      }
      showTitle();
      return;
    }
    if(i>=0)showScene(activeChapter.id,i);
  }

  function shapeSvg(n=state.story.polygon){
    const points=M.polygonPath(n,80),xs=points.map(p=>p.x),ys=points.map(p=>p.y);
    const x=Math.min(...xs)-20,y=Math.min(...ys)-20,w=Math.max(...xs)-x+20,h=Math.max(...ys)-y+20;
    return `<svg viewBox="${x} ${y} ${w} ${h}" data-shape="${n}" aria-hidden="true"><polyline points="${points.map(p=>p.x+','+p.y).join(' ')}"/></svg>`;
  }
  function appOrigin(label,compact=false){
    return `<div class="app-origin${compact?' app-origin-compact':''}"><img src="${window.FESTIVAL_ASSETS.app}" width="64" height="80" alt=""><div><strong>축제앱</strong><span class="app-context">${escape(label)}</span></div></div>`;
  }
  function storyMarkup(scene){
    return `<div class="story-layout">${scene.ending?`<div class="ending-lights" aria-label="함께 완성한 ${shapeName(state.story.polygon)} 조명">${shapeSvg()}</div>`:''}<div class="story-heading"><p class="eyebrow">CHAPTER 0${activeChapter.id} · ${escape(activeChapter.title)}</p><h2 tabindex="-1">${escape(interpolate(scene.title))}</h2>${scene.channel?`<p class="scene-channel">${escape(scene.channel)}</p>`:''}${scene===activeChapter.scenes[0]?`<p class="recap">${escape(interpolate(activeChapter.recap))}</p>`:''}</div><div class="story-character character" role="img" aria-label="하루 · 미소"></div><div class="dialogue-box"><div class="speaker" id="speaker"></div>${appOrigin('하루와 채팅')}<p class="dialogue-text" id="dialogue-text" aria-live="polite"></p><div class="dialogue-actions"><span class="line-progress" id="line-progress"></span><button type="button" id="skip-seen-button" class="skip-seen-button" hidden>이미 본 대사 건너뛰기 ⏭</button><span class="dialogue-hint" id="dialogue-hint">아래 버튼이나 → 키로 계속</span></div><div id="heart-choice-cue" class="heart-choice-cue" hidden>💭 마음 선택지 · 하루와의 거리를 결정하는 대답이에요</div><div id="story-choices" class="story-choices" hidden></div></div></div>`;
  }
  function focusHeading(){$('scene-content').querySelector('h2')?.focus({preventScroll:true});}

  function normalizeChoices(rawChoices,legacyReplies){
    return (rawChoices||[]).map((c,i)=>{
      if(typeof c==='string')return {key:String(i),label:c,cold:false,heartChoice:false,reply:legacyReplies?.[i]||null};
      return {key:String(c.key??i),label:c.label,cold:Boolean(c.cold),heartChoice:Boolean(c.heartChoice),reply:c.reply||legacyReplies?.[i]||null,storyPatch:c.storyPatch,values:c.values,params:c.params};
    });
  }

  function dialogue(lines,{options=[],onChoice,onFinish=()=>move(1),finishLabel='다음 장면 →',heartChoice=false,seenKey=null,startLine=0,onBack=sceneBack()}={}){
    disposeScene();
    $('stage').dataset.kind='story';
    const coldNow=S.hasColdRejection(state);
    const pool=(Array.isArray(lines)?lines:[]).filter(l=>!l.when||(l.when==='cold')===coldNow);
    const safeLines=pool.length?pool:[{speaker:'하루',role:'haru',expression:0,text:'자, 다음으로 가 볼까?'}];
    $('scene-content').innerHTML=storyMarkup(activeScene);
    let line=Math.min(Math.max(0,startLine),safeLines.length-1);
    const isHeart=Boolean(heartChoice||options.some(o=>o.cold||o.heartChoice));
    const canSkip=Boolean(seenKey&&S.isSceneSeen(state,seenKey));

    const render=()=>{
      const item=safeLines[line],last=line===safeLines.length-1;
      const voice=item.role||(item.speaker==='나'?'me':item.speaker==='하루'?'haru':item.speaker==='내 생각'?'narration':'system');
      $('stage').dataset.voice=voice;
      const inApp=(voice==='system'&&item.speaker==='축제앱')||(['haru','me'].includes(voice)&&activeScene.channel?.startsWith('축제앱'));
      $('stage').dataset.medium=inApp?'app':'scene';
      document.querySelector('.app-origin').hidden=!inApp;
      document.querySelector('.app-context').textContent=activeScene.channel?.startsWith('축제앱')?'하루와 채팅':'축제 안내 · 개인 알림';
      const label=voice==='me'?`${state.nickname} · 나`:item.speaker;
      $('speaker').textContent=label;
      document.querySelector('.dialogue-box').setAttribute('aria-label',label+'의 말');
      $('dialogue-text').textContent=interpolate(item.text);
      $('line-progress').textContent=`${line+1} / ${safeLines.length}`;
      const character=document.querySelector('.story-character');
      if(voice==='haru'||!character.dataset.expression)expression(character,voice==='haru'?item.expression:0);

      const showOptions=last&&options.length>0;
      $('dialogue-hint').hidden=showOptions;
      $('heart-choice-cue').hidden=!(showOptions&&isHeart);
      $('story-choices').hidden=!showOptions;
      $('skip-seen-button').hidden=!(canSkip&&!last);

      if(showOptions){
        $('story-choices').innerHTML=options.map((o,i)=>`<button type="button" data-flow-choice="${escape(o.key||String(i))}"${o.cold?' data-cold-choice="true"':''}>${escape(interpolate(o.label))}</button>`).join('');
        $('story-choices').querySelectorAll('button').forEach((b,i)=>b.onclick=()=>onChoice(options[i]));
      }
      const single=last&&options.length===1;
      setForward(last?(options.length>1?'답을 골라 주세요':finishLabel):'대사 계속 →',single?()=>onChoice(options[0]):advanceLine,last&&options.length>1);
      setBackward(line>0?()=>{line--;render();}:onBack);
    };

    $('skip-seen-button').onclick=()=>{
      if(options.length){line=safeLines.length-1;render();}
      else onFinish();
    };
    advanceLine=()=>{if(line<safeLines.length-1){line++;render();}else if(!options.length)onFinish();};
    render();
    applyCharacter();
    focusHeading();
  }

  function initStory(scene,{startLine=0}={}){
    if(scene.ending){initEnding(scene);return;}
    phase='story';
    const lines=state.shortMode&&scene.shortLines?scene.shortLines:scene.lines;
    const options=normalizeChoices(scene.choices,scene.choiceReplies);
    dialogue(lines,{
      options,
      heartChoice:Boolean(scene.heartChoice),
      seenKey:scene.id,
      startLine,
      onFinish:()=>{S.markSceneSeen(state,scene.id);record();move(1);},
      onChoice:o=>{
        if(o.storyPatch){state.story=S.storyValues({...state.story,...o.storyPatch});}
        if(scene.heartChoice||options.some(opt=>opt.cold||opt.heartChoice)){
          if(o.cold)state.coldChoices[scene.id]=true;
          else delete state.coldChoices[scene.id];
        }
        record();
        phase='reply';
        const replyLines=o.reply||[{speaker:'하루',role:'haru',text:scene.choiceReply||'좋아. 그렇게 하자.',expression:2}];
        dialogue(replyLines,{
          seenKey:`${scene.id}:reply:${o.key}`,
          onBack:()=>initStory(scene,{startLine:Infinity}),
          onFinish:()=>{S.markSceneSeen(state,scene.id);S.markSceneSeen(state,`${scene.id}:reply:${o.key}`);record();move(1);}
        });
      }
    });
  }

  function flowIntro({startLine=0}={}){
    phase='intro';flowChoice=null;flowResult=null;
    const flow=activeScene.flow;
    const options=normalizeChoices(flow.options,null);
    const introLines=state.shortMode&&flow.shortIntro?flow.shortIntro:flow.intro;
    if(!introLines||!introLines.length){
      if(options.length===1)flowChoice=options[0];
      activity();
      return;
    }
    dialogue(introLines,{
      options:options.length>1?options:[],
      seenKey:activeScene.id,
      startLine,
      onChoice:choice=>{flowChoice=choice;activity();},
      onFinish:()=>{if(options.length===1)flowChoice=options[0];activity();},
      finishLabel:'버그 확인하기 →'
    });
  }

  function conceptMarkup(scene){
    const brief=flowChoice?`<div class="journey-brief"><span>내가 고른 것 · ${escape(interpolate(flowChoice.label))}</span>${(scene.flow?.options?.length||0)>1?'<button type="button" id="change-choice" class="text-button">선택 다시 보기</button>':''}</div>`:'';
    return `<div class="lesson-layout"><div class="lesson-main"><div class="lesson-heading"><p class="eyebrow">CHAPTER 0${activeChapter.id} · ${escape(scene.topic)}${scene.graded?' · 하트 챌린지':''}</p><h2 tabindex="-1">${escape(interpolate(scene.title))}</h2><p class="scene-quote">${escape(interpolate(scene.quote))}</p></div>${brief}<div id="experiment" class="experiment"></div></div><aside class="lesson-companion"><div class="companion-character character" role="img" aria-label="하루"></div><div class="companion-note" id="companion-note"><small>하루의 한마디</small><span id="companion-note-text">${escape(interpolate(scene.graded?(scene.experiment==='quiz'?'처음 고른 카드가 첫 시도야. 지금 상황이랑 코드를 먼저 보고 골라 줘!':'바꾼 뒤 처음 실행이 첫 시도야. 지금 상황이랑 코드를 먼저 보고 고쳐 줘!'):(scene.observe||scene.teacher?.ask||'함께 원리를 확인해 보자!')))}</span></div></aside></div>`;
  }

  function activity(){
    disposeScene();
    phase='activity';flowResult=null;lastAttemptFirstTry=true;
    $('stage').dataset.kind='concept';
    $('scene-content').innerHTML=conceptMarkup(activeScene);
    const current=generation;
    const companionChar=document.querySelector('.companion-character');
    const noteBox=$('companion-note');
    const noteText=$('companion-note-text');
    const qId=activeScene.questionId||activeScene.id;
    const conceptTitle=activeScene.conceptTitle||activeScene.title;

    const fail=(whyMessage,expr=4)=>{
      if(current!==generation||phase!=='activity')return;
      expression(companionChar,expr);
      if(noteBox){
        noteBox.classList.remove('is-right');
        noteBox.classList.add('is-wrong');
      }
      if(noteText){
        noteText.textContent=interpolate(activeScene.flow?.wrongReaction?.line||'어라…? 왜 이렇게 나왔지? 아래 오개념 힌트를 보고 다시 풀어 보자!');
      }
      // 이번 회차에 이미 푼 문항(이전 버튼으로 돌아와 다시 푸는 중)은 기록·'첫 시도 실패' 안내 없이 다시 풀게 합니다.
      const alreadySolved=Boolean(state.activeRuns?.[activeChapter.id]?.solvedThisRun?.[qId]?.solved);
      if(activeScene.graded&&!alreadySolved){
        S.recordQuestionAttempt(state,activeChapter.id,qId,{correct:false,conceptTitle,wrongWhy:whyMessage});
        record();
        renderHeartHud({deltaText:'♡ 첫 시도 실패 · 다시 풀면 통과!',deltaKind:'is-miss'});
      }
      if(activeScene.flow)setForward('힌트를 보고 다시 풀기',null,true);
    };

    const complete=result=>{
      if(current!==generation||phase!=='activity')return;
      flowResult=result||{};
      if(result?.identity){S.applyIdentity(state,result.identity);}
      if(result?.story){state.story=S.storyValues({...state.story,...result.story});}
      if(activeScene.graded){
        const attempt=S.recordQuestionAttempt(state,activeChapter.id,qId,{correct:true,conceptTitle});
        lastAttemptFirstTry=attempt.firstAttempt;
        if(attempt.earnedHeart){
          expression(companionChar,2);
          if(noteBox){noteBox.classList.remove('is-wrong');noteBox.classList.add('is-right');}
          if(noteText)noteText.textContent=`역시 깔끔해! 첫 시도에 바로 해결했네 (+1 ♥) ${interpolate(activeScene.observe||'')}`.trim();
          renderHeartHud({deltaText:'+1 ♥ 첫 시도 성공!',deltaKind:'is-gain'});
        }else{
          expression(companionChar,0);
          if(noteBox){noteBox.classList.remove('is-wrong');noteBox.classList.add('is-right');}
          if(noteText)noteText.textContent=`좋아, 원리를 제대로 찾았어! 다음엔 첫 시도에 노려 보자. ${interpolate(activeScene.observe||'')}`.trim();
          if(!attempt.alreadySolved)renderHeartHud({deltaText:'♡ 재도전 해결 (0 ♥)',deltaKind:'is-recover'});
        }
      }else{
        expression(companionChar,2);
      }
      S.markSceneSeen(state,activeScene.id);
      record();
      if(activeScene.flow)setForward('대화로 돌아가기 →',finishActivity);
      else setForward('다음 장면 →',()=>move(1));
    };

    const invalidate=()=>{
      if(current!==generation)return;
      flowResult=null;
      setForward(activeScene?.experiment==='quiz'?'답을 고르면 다음으로':'활동을 해결하면 다음으로',null,true);
    };

    invalidate();
    E.render(activeScene.experiment,$('experiment'),{
      models:M,stateApi:S,state,scene:activeScene,choice:flowChoice,shortMode:state.shortMode,
      notify,interval,stopTimers,complete,fail,invalidate,shapeSvg,interpolate,
      reducedMotion:()=>matchMedia('(prefers-reduced-motion: reduce)').matches,
      focusNext:()=>$('next-button').focus()
    });
    // 짧은 화면: 활동 패널 아래에 더 볼 내용이 있으면 '아래에 더 있어요' 표시
    const main=document.querySelector('.lesson-main');
    if(main){
      const cue=()=>main.classList.toggle('has-more',main.scrollHeight-main.scrollTop-main.clientHeight>24);
      main.onscroll=cue;
      if(typeof ResizeObserver==='function'){const ro=new ResizeObserver(cue);ro.observe(main);ro.observe($('experiment'));}
      requestAnimationFrame(cue);
    }
    if($('change-choice'))$('change-choice').onclick=()=>flowIntro();
    const introLines=activeScene.flow&&(state.shortMode&&activeScene.flow.shortIntro?activeScene.flow.shortIntro:activeScene.flow.intro);
    setBackward(introLines?.length?()=>flowIntro({startLine:Infinity}):sceneBack());
    applyCharacter();
    if(activeScene.initialExpression!==undefined)expression(companionChar,activeScene.initialExpression);
    focusHeading();
  }

  function finishActivity(){
    if(!flowResult)return;
    const flow=activeScene.flow;
    if(flowResult.story)state.story=S.storyValues({...state.story,...flowResult.story});
    record();
    phase='response';
    const lines=S.conceptResponseLines(flow,{
      choiceKey:flowChoice?.key||'default',
      resultKey:flowResult?.key||'default',
      isFirstTry:lastAttemptFirstTry,
      shortMode:state.shortMode
    });
    if(!lines.length){move(1);return;}
    dialogue(lines,{
      seenKey:`${activeScene.id}:res`,
      onBack:()=>activity(),
      onFinish:()=>{S.markSceneSeen(state,`${activeScene.id}:res`);record();move(1);},
      finishLabel:'다음 장면 →'
    });
  }

  function summaryMarkup(scene){
    const res=state.chapterResults?.[activeChapter.id]||{hearts:0,questions:{}};
    const missed=Object.entries(res.questions||{}).filter(([,q])=>!q.firstAttempt);
    const hasEnding=Boolean(state.chapterResults?.[3]?.completed);
    const nextChapter=chapters.find(c=>c.id===activeChapter.id+1);
    return `<div class="summary-layout"><p class="eyebrow">CHAPTER 0${activeChapter.id} CLEAR · ${escape(scene.topic)}</p><h2 tabindex="-1">${escape(interpolate(scene.title))}</h2><div class="chapter-clear-banner"><div><strong>${activeChapter.id}장 하트: ♥ ${res.hearts} / 4</strong><span>${res.hearts===4?'실수 없이 모든 버그를 첫 시도에 잡았어요!':`놓친 개념 ${missed.length}개 · 재도전하면 4/4 하트를 채울 수 있어요.`}</span></div><div class="clear-actions">${res.hearts<4?`<button type="button" id="retry-chapter-btn" class="secondary-button">${activeChapter.id}장 하트 채우러 재도전</button>`:''}${hasEnding?`<button type="button" id="revisit-ending-btn" class="primary-button">엔딩 다시 보기 →</button>`:''}</div></div><div class="summary-cards">${scene.cards.map(([title,body])=>`<div class="summary-card"><b>${escape(title)}</b><p>${escape(body)}</p></div>`).join('')}</div>${scene.endingMessage?`<p class="ending-message">“${escape(interpolate(scene.endingMessage))}”</p>`:''}<p class="summary-extra">${escape(scene.extra||'')}</p><div class="practice-box"><p>${escape(scene.mission||'')}</p>${nextChapter?`<button type="button" id="next-chapter-btn" class="primary-button">${nextChapter.id}장으로 이어가기 →</button>`:`<button type="button" id="practice-button" class="primary-button">처음 화면으로 →</button>`}</div></div>`;
  }

  function findColdChoiceDetails(){
    const details=[];
    for(const ch of chapters){
      for(const sc of ch.scenes){
        if(state.coldChoices?.[sc.id])details.push({chapterId:ch.id,sceneId:sc.id,title:sc.title});
      }
    }
    return details;
  }

  function endingReportMarkup(scene,outcome){
    const total=S.countTotalHearts(state);
    const cold=S.hasColdRejection(state);
    const endings=scene.endings||{};
    const data=endings[outcome]||{badge:outcome,title:scene.title,headline:'',footer:''};
    const isColdFriend=outcome==='friend'&&total===12&&cold;
    const title=isColdFriend&&data.coldTitle?data.coldTitle:data.title;
    const headline=isColdFriend&&data.coldHeadline?data.coldHeadline:data.headline;
    const footer=isColdFriend?(data.coldFooter||'✌️ 12/12 하트는 완벽해요! 위 버튼으로 마음 선택지만 다시 고르면 숨겨진 썸 시작 엔딩이 열립니다.'):data.footer;
    const coldDetails=findColdChoiceDetails();
    const missedItems=[];
    for(const id of [1,2,3]){
      const qMap=state.chapterResults?.[id]?.questions||{};
      for(const [qId,q] of Object.entries(qMap)){
        if(!q.firstAttempt)missedItems.push({chapterId:id,qId,conceptTitle:q.conceptTitle||qId,lastWrongWhy:q.lastWrongWhy||''});
      }
    }
    const imperfectChapters=[1,2,3].filter(id=>(state.chapterResults?.[id]?.hearts||0)<4);
    const expr=outcome==='some'?1:outcome==='friend'?2:4;
    return `<div class="ending-report-layout" data-outcome="${escape(outcome)}"><div class="ending-lights ending-lights-${escape(outcome)}" aria-hidden="true">${shapeSvg()}</div><div class="ending-report-grid"><div class="ending-report-main"><div class="ending-badge">${escape(interpolate(data.badge||outcome))}</div><h2 tabindex="-1">${escape(interpolate(title))}</h2><p class="ending-headline">${escape(interpolate(headline))}</p><div class="ending-score-row"><div class="score-pill"><strong>총 하트 ♥ ${total} / 12</strong><small>${[1,2,3].map(id=>`Ch.${id} ${state.chapterResults?.[id]?.hearts||0}/4`).join(' · ')}</small></div></div>${isColdFriend?`<div class="cold-callout"><strong>12/12 만점인데 찐친 엔딩이 된 이유!</strong><p>${escape(interpolate(data.coldCallout||'모든 CS 문항을 완벽하게 맞혔지만, 마음 선택지에서 거리를 두어 찐친 사이로 남았어요!'))}</p>${coldDetails.length?`<div class="retry-row">${coldDetails.map(d=>`<button type="button" class="secondary-button" data-retry-chapter="${d.chapterId}">${d.chapterId}장 마음 선택지 다시 고르기 (${escape(interpolate(d.title))})</button>`).join('')}</div>`:''}</div>`:''}<div class="report-card"><h3>CS 복습 리포트 ${missedItems.length?`· 놓친 개념 ${missedItems.length}개`:'· 퍼펙트 클리어!'}</h3>${missedItems.length?`<ul class="missed-list">${missedItems.map(m=>`<li><div><strong>[${m.chapterId}장] ${escape(m.conceptTitle)}</strong>${m.lastWrongWhy?`<p>${escape(m.lastWrongWhy)}</p>`:''}</div></li>`).join('')}</ul>`:'<p class="perfect-note">1~3단원 12개 핵심 CS 개념을 전부 첫 시도에 완벽하게 해결했어요!</p>'}${imperfectChapters.length?`<div class="retry-row">${imperfectChapters.map(id=>`<button type="button" class="primary-button" data-retry-chapter="${id}">${id}장 하트 채우러 가기 (재도전)</button>`).join('')}</div>`:''}</div>${footer?`<p class="ending-footer">${escape(interpolate(footer))}</p>`:''}<div class="ending-actions"><button type="button" id="replay-ending-lines" class="secondary-button">엔딩 대사 다시 보기</button><button type="button" id="ending-home-btn" class="secondary-button">처음 화면으로</button></div>${isTeacher?`<div class="teacher-ending-preview"><span>교사 엔딩 미리보기:</span>${['some','friend','awkward'].map(k=>`<button type="button" class="pill-button" data-preview-ending="${k}" aria-pressed="${k===outcome}">${k==='some'?'썸 시작':k==='friend'?'찐친':'어색한 사이'}</button>`).join('')}</div>`:''}${Array.isArray(scene.cards)&&scene.cards.length?`<section class="ending-recap"><h3>${escape(scene.recapTitle||'3장 핵심 정리')}</h3><div class="card-grid">${scene.cards.map(([t,d])=>`<div class="summary-card"><strong>${escape(t)}</strong><p>${escape(d)}</p></div>`).join('')}</div></section>`:''}</div><aside class="ending-portrait"><div class="ending-character character" data-expression="${expr}" role="img" aria-label="하루"></div></aside></div></div>`;
  }

  function renderEndingReport(scene,outcome){
    disposeScene();
    phase='ending-report';
    $('stage').dataset.kind='summary';
    $('scene-content').innerHTML=endingReportMarkup(scene,outcome);
    applyCharacter();
    const expr=outcome==='some'?1:outcome==='friend'?2:4;
    expression(document.querySelector('.ending-character'),expr);
    setForward('처음 화면으로 ↗',showTitle);
    setBackward(()=>initEnding(scene,outcome,{startLine:Infinity}));
    $('scene-content').querySelectorAll('[data-retry-chapter]').forEach(b=>b.onclick=()=>startChapter(Number(b.dataset.retryChapter),0));
    $('replay-ending-lines').onclick=()=>initEnding(scene,outcome);
    $('ending-home-btn').onclick=showTitle;
    $('scene-content').querySelectorAll('[data-preview-ending]').forEach(b=>b.onclick=()=>initEnding(scene,b.dataset.previewEnding));
    postToParent('festival:complete',{...buildEmbedPayload(),outcome});
    focusHeading();
  }

  function initEnding(scene,forcedOutcome=null,{startLine=0}={}){
    completeChapter(3);
    const total=S.countTotalHearts(state);
    const cold=S.hasColdRejection(state);
    const outcome=forcedOutcome||M.computeEndingOutcome(total,cold);
    const endingObj=scene.endings?.[outcome];
    if(!endingObj){renderEndingReport(scene,outcome);return;}
    const useCold=outcome==='friend'&&total===12&&cold&&Array.isArray(endingObj.coldLines)&&endingObj.coldLines.length;
    const useColdMid=!useCold&&outcome==='friend'&&cold&&Array.isArray(endingObj.coldMidLines)&&endingObj.coldMidLines.length;
    const lines=useCold?endingObj.coldLines:useColdMid?endingObj.coldMidLines:(endingObj.lines||scene.lines||[]);
    phase='ending';
    dialogue(lines,{
      seenKey:`${scene.id}:${outcome}${useCold?':cold':''}`,
      finishLabel:'최종 리포트 보기 →',
      startLine,
      onFinish:()=>{
        S.markSceneSeen(state,`${scene.id}:${outcome}${useCold?':cold':''}`);
        record();
        renderEndingReport(scene,outcome);
      }
    });
  }

  function showScene(chapterId,index,save=true){
    if(!S.isChapterUnlocked(state,chapterId,isTeacher)){
      notify(`${chapterId-1}장을 먼저 완료해야 열려요.`);
      return;
    }
    const chapter=chapters.find(c=>c.id===chapterId);
    if(!chapter?.scenes[index])return;
    disposeScene();
    activeChapter=chapter;
    activeScene=chapter.scenes[index];
    flowChoice=null;flowResult=null;
    state.chapterId=chapterId;state.sceneId=activeScene.id;
    const scene=activeScene;
    $('title-view').hidden=true;$('scene-view').hidden=false;
    background(scene.background||(chapterId===1?'night':chapterId===3?'dusk':'day'));
    renderHeartHud();

    if(scene.kind==='story'){
      initStory(scene);
    }else if(scene.kind==='concept'){
      if(scene.flow)flowIntro();
      else activity();
    }else{
      phase='summary';
      completeChapter(activeChapter.id);
      renderHeartHud();
      $('stage').dataset.kind='summary';
      $('scene-content').innerHTML=summaryMarkup(scene);
      const nextChapter=chapters.find(c=>c.id===chapterId+1);
      setForward(nextChapter?`${nextChapter.id}장으로 이어가기 →`:'처음 화면으로 ↗',nextChapter?()=>startChapter(nextChapter.id,0):showTitle);
      if($('next-chapter-btn'))$('next-chapter-btn').onclick=()=>startChapter(nextChapter.id,0);
      if($('practice-button'))$('practice-button').onclick=showTitle;
      if($('retry-chapter-btn'))$('retry-chapter-btn').onclick=()=>startChapter(activeChapter.id,0);
      if($('revisit-ending-btn'))$('revisit-ending-btn').onclick=()=>showEndingScene();
      setBackward(sceneBack());
      focusHeading();
    }
    $('chapter-indicator').textContent=`CHAPTER 0${chapterId} · ${chapter.subject}`;
    const mainScenes=chapter.scenes.filter(s=>!s.optional);
    $('progress-text').textContent=scene.optional?`${chapter.subject} · 확장 활동`:`${chapter.subject} · ${mainScenes.indexOf(scene)+1} / ${mainScenes.length} 장면`;
    $('timing-text').textContent=`${scene.kind==='summary'?'장 완료 · 정리':scene.graded?'하트 챌린지 · 첫 시도 +1 ♥':'스토리 진행'} · ${scene.minutes||''}`;
    $('reset-button').disabled=!isTeacher;
    $('teacher-button').disabled=!isTeacher;
    if(save)record();
  }

  function showEndingScene(){
    const ch3=chapters.find(c=>c.id===3);
    if(!ch3)return;
    const endIdx=ch3.scenes.findIndex(s=>s.ending);
    if(endIdx>=0)showScene(3,endIdx);
    else showTitle();
  }

  function openOnboarding(){
    $('onboard-name').value=state.nickname;
    document.querySelectorAll('input[name="onboard-variant"]').forEach(input=>{input.checked=input.value===state.variant;});
    $('onboard-reset-wrap').hidden=!hasAnyProgress();
    $('onboard-reset').checked=false;
    applyCharacter();
    $('onboarding-dialog').showModal();
  }
  $('new-story-button').onclick=openOnboarding;
  document.querySelectorAll('input[name="onboard-variant"]').forEach(input=>input.onchange=()=>{
    state.variant=input.value;
    applyCharacter();
    record();
  });
  $('onboarding-form').onsubmit=e=>{
    e.preventDefault();
    if($('onboard-reset').checked){
      const keepVariant=state.variant;
      Object.assign(state,S.createStoryState());
      state.variant=keepVariant;
    }
    S.applyIdentity(state,$('onboard-name').value);
    state.onboarded=true;
    record();
    $('onboarding-dialog').close();
    startChapter(1,0);
  };

  function openContents(){
    if(!isTeacher)return;
    $('contents-list').innerHTML=chapters.map(c=>`<section class="contents-group"><h3>0${c.id} ${escape(c.title)} · ${escape(c.subject)}</h3><div class="contents-scenes">${c.scenes.map((s,i)=>`<button type="button" data-scene="${escape(s.id)}" class="${activeScene?.id===s.id?'current':''}">${i+1}. ${escape(interpolate(s.title))}<small>${s.kind==='story'?'이야기':s.kind==='summary'?'정리':s.graded?'하트 문항':'활동'} · ${escape(s.minutes||'')}</small></button>`).join('')}</div></section>`).join('');
    $('contents-list').querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.scene,c=chapters.find(x=>x.scenes.some(s=>s.id===id));
      $('contents-dialog').close();
      showScene(c.id,c.scenes.findIndex(s=>s.id===id));
    });
    $('contents-dialog').showModal();
  }

  function openNotes(){
    if(!isTeacher||!activeScene)return;
    const t=activeScene.teacher||{ask:'-',answer:'-',watch:'-',short:'-'};
    $('note-scene').textContent=`${activeChapter.subject} · ${interpolate(activeScene.title)}`;
    $('notes-content').innerHTML=[['발문',t.ask],['예상 답 · 실행 결과',t.answer],['흔한 오개념 · 진행 유의',t.watch],['핵심 경로',t.short]].map(([title,body])=>`<section class="note-section"><h3>${escape(title)}</h3><p>${escape(body)}</p></section>`).join('');
    $('notes-dialog').showModal();
  }

  function openSettings(){
    $('story-name').value=state.nickname;
    $('short-mode').checked=isTeacher&&state.shortMode;
    $('site-url').value=state.siteUrl;
    $('settings-feedback').textContent='';
    $('settings-dialog').showModal();
  }

  $('settings-form').onsubmit=e=>{
    e.preventDefault();
    if(isTeacher){
      const raw=$('site-url').value.trim(),url=S.normalizeSiteUrl(raw);
      if(raw&&!url){$('settings-feedback').textContent='http 또는 https로 시작하는 사이트 주소를 입력해 주세요.';$('site-url').focus();return;}
      state.shortMode=$('short-mode').checked;
      state.siteUrl=url;
    }
    S.applyIdentity(state,$('story-name').value);
    $('settings-dialog').close();
    if(activeScene)showScene(activeChapter.id,sceneIndex());
    else{record();showTitle();}
    notify('설정을 적용했습니다.');
  };

  $('clear-memory').onclick=()=>{
    S.clearGameState(storage);
    const keepVariant=state.variant;
    Object.assign(state,S.createStoryState());
    state.variant=keepVariant;
    $('story-name').value='여울';
    $('settings-feedback').textContent='저장된 진행 기록과 하트를 모두 초기화했습니다.';
    syncTitle();
    postToParent('festival:state',buildEmbedPayload());
  };

  document.querySelectorAll('input[name="variant"]').forEach(input=>input.onchange=()=>{state.variant=input.value;applyCharacter();record();});
  $('home-button').onclick=showTitle;
  $('contents-button').onclick=openContents;
  $('settings-button').onclick=openSettings;
  $('teacher-button').onclick=openNotes;
  $('previous-button').onclick=goBack;
  $('next-button').onclick=()=>{if(!$('next-button').disabled)forward?.();};
  $('reset-button').onclick=()=>{if(isTeacher&&activeScene)showScene(activeChapter.id,sceneIndex());};
  $('resume-button').onclick=()=>{
    if(state.chapterId&&state.sceneId){
      const c=chapters.find(x=>x.id===state.chapterId);
      const idx=c?.scenes.findIndex(s=>s.id===state.sceneId)??-1;
      if(c&&idx>=0)showScene(c.id,idx);
    }
  };
  $('ending-review-button').onclick=showEndingScene;
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
  $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('stage').requestFullscreen?.();}catch{notify('일반 화면으로도 게임을 진행할 수 있습니다.');}};

  document.addEventListener('keydown',e=>{
    if(e.isComposing||e.altKey||e.ctrlKey||e.metaKey||document.querySelector('dialog[open]')||e.target.closest('input,textarea,select,[contenteditable="true"],[data-experience]'))return;
    if(e.code==='Space'&&advanceLine&&!e.target.closest('button')){e.preventDefault();if(!$('next-button').disabled)forward?.();}
    else if(activeScene&&['ArrowRight','ArrowLeft'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')goBack();else if(!$('next-button').disabled)forward?.();}
  });

  if(isEmbed){
    window.addEventListener('message',e=>{
      if(e.source!==window.parent)return;
      const msg=e.data;
      if(!msg||typeof msg!=='object'||msg.type!=='festival:init')return;
      const hydrated=S.sanitizeGameState(msg.payload,ids);
      if(!hydrated)return;
      if(!parentOrigin)parentOrigin=e.origin&&e.origin!=='null'?e.origin:'*';
      Object.assign(state,hydrated);
      if(!isTeacher)state.shortMode=false;
      S.saveGameState(storage,state);
      if(state.chapterId&&state.sceneId&&S.isChapterUnlocked(state,state.chapterId,isTeacher)){
        const ch=chapters.find(c=>c.id===state.chapterId);
        const idx=ch?.scenes.findIndex(s=>s.id===state.sceneId)??-1;
        if(ch&&idx>=0){showScene(ch.id,idx,false);return;}
      }
      showTitle();
    });
  }

  if(isEmbed){
    document.addEventListener('keydown',e=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();postToParent('festival:save-request');}
    });
    postToParent('festival:ready');
  }

  showTitle();
})();
