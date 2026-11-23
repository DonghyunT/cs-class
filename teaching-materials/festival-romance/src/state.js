(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FestivalState=api;})(globalThis,function(){
  'use strict';
  const KEY='festival-romance.game.v2';
  const CHAPTER_IDS=[1,2,3];
  function normalizeNickname(raw){return Array.from(typeof raw==='string'?raw.trim():'').slice(0,12).join('')||'여울';}
  // 하루 대사 {boy, girl} 중 고른 성별 문장을 돌려줍니다(없으면 boy, 문자열은 그대로).
  function variantText(value,variant){return value&&typeof value==='object'&&!Array.isArray(value)?(value[variant]??value.boy):value;}
  function vocative(name){const n=normalizeNickname(name),last=n.charCodeAt(n.length-1);return last>=0xAC00&&last<=0xD7A3?n+((last-0xAC00)%28?'아':'야'):n;}
  function storyValues(value={}){
    return {
      ticketName:normalizeNickname(value.ticketName),
      meetingTime:value.meetingTime==='16:00'?'16:00':'17:00',
      replyKey:value.replyKey==='warm'?'warm':'casual',
      booth:value.booth==='game'?'game':'photo',
      boothAllowed:value.boothAllowed!==false,
      boothOpen:Boolean(value.boothOpen),
      route:['outdoor','wait'].includes(value.route)?value.route:'indoor',
      prize:['large','small','sticker'].includes(value.prize)?value.prize:'small',
      polygon:[3,4,5,6].includes(value.polygon)?value.polygon:4
    };
  }
  function createEmptyChapterResult(){return {completed:false,hearts:0,questions:{}};}
  function createStoryState(){
    return {
      nickname:'여울',
      variant:'boy',
      onboarded:false,
      chapterId:null,
      sceneId:null,
      shortMode:false,
      siteUrl:'',
      story:storyValues(),
      chapterResults:{
        1:createEmptyChapterResult(),
        2:createEmptyChapterResult(),
        3:createEmptyChapterResult()
      },
      activeRuns:{},
      coldChoices:{},
      seenScenes:{},
      seenLines:{}
    };
  }
  function applyIdentity(state,raw){const name=normalizeNickname(raw);state.nickname=name;state.story={...state.story,ticketName:name};return name;}
  function responseLines(flow,choiceKey,resultKey,shortMode){
    const result=flow?.responses?.[resultKey]||flow?.responses?.[choiceKey]||flow?.responses?.default||[];
    const reply=flow?.choiceReplies?.[choiceKey]||[];
    return shortMode?result.slice(0,1):[...reply,...result];
  }
  function conceptResponseLines(flow,{choiceKey='default',resultKey='default',isFirstTry=true,shortMode=false}={}){
    if(!flow)return [];
    let result=null;
    if(isFirstTry&&Array.isArray(flow.firstTrySuccess)&&flow.firstTrySuccess.length)result=flow.firstTrySuccess;
    else if(!isFirstTry&&Array.isArray(flow.retrySuccess)&&flow.retrySuccess.length)result=flow.retrySuccess;
    if(!result)result=flow.responses?.[resultKey]||flow.responses?.[choiceKey]||flow.responses?.default||[];
    const reply=flow.choiceReplies?.[choiceKey]||[];
    return shortMode?result.slice(0,1):[...reply,...result];
  }
  function normalizeSiteUrl(raw){if(typeof raw!=='string'||!raw.trim())return '';try{const url=new URL(raw.trim());return ['http:','https:'].includes(url.protocol)?url.href:'';}catch{return '';}}
  function isSafeKey(key){return typeof key==='string'&&key.length>0&&key.length<=64&&key!=='__proto__'&&key!=='constructor'&&key!=='prototype';}
  function sanitizeBooleanMap(raw){
    const out={};
    if(!raw||typeof raw!=='object')return out;
    for(const [k,v] of Object.entries(raw)){if(isSafeKey(k)&&v===true)out[k]=true;}
    return out;
  }
  function sanitizeQuestionsMap(raw){
    const out={};
    if(!raw||typeof raw!=='object')return out;
    for(const [qId,entry] of Object.entries(raw)){
      if(!isSafeKey(qId)||!entry||typeof entry!=='object')continue;
      const item={
        firstAttempt:Boolean(entry.firstAttempt),
        solved:Boolean(entry.solved),
        conceptTitle:typeof entry.conceptTitle==='string'?entry.conceptTitle.slice(0,120):qId
      };
      if(typeof entry.lastWrongWhy==='string'&&entry.lastWrongWhy)item.lastWrongWhy=entry.lastWrongWhy.slice(0,300);
      out[qId]=item;
    }
    return out;
  }
  function sanitizeChapterResults(raw){
    const out={};
    for(const id of CHAPTER_IDS){
      const src=raw&&typeof raw==='object'?raw[id]||raw[String(id)]:null;
      const hearts=src&&Number.isInteger(src.hearts)?Math.max(0,Math.min(4,src.hearts)):0;
      out[id]={
        completed:Boolean(src?.completed),
        hearts,
        questions:sanitizeQuestionsMap(src?.questions)
      };
    }
    return out;
  }
  function sanitizeActiveRuns(raw){
    const out={};
    if(!raw||typeof raw!=='object')return out;
    for(const id of CHAPTER_IDS){
      const src=raw[id]||raw[String(id)];
      if(!src||typeof src!=='object')continue;
      out[id]={
        missedThisRun:sanitizeBooleanMap(src.missedThisRun),
        solvedThisRun:sanitizeQuestionsMap(src.solvedThisRun)
      };
    }
    return out;
  }
  function sanitizeGameState(value,validSceneIds=[]){
    if(!value||typeof value!=='object')return null;
    const validChap=CHAPTER_IDS.includes(value.chapterId)&&typeof value.sceneId==='string'&&value.sceneId.startsWith(`ch${value.chapterId}-`)&&(!validSceneIds.length||validSceneIds.includes(value.sceneId));
    const seen={...sanitizeBooleanMap(value.seenLines),...sanitizeBooleanMap(value.seenScenes)};
    return {
      nickname:normalizeNickname(value.nickname),
      variant:value.variant==='girl'?'girl':'boy',
      onboarded:Boolean(value.onboarded),
      chapterId:validChap?value.chapterId:null,
      sceneId:validChap?value.sceneId:null,
      shortMode:Boolean(value.shortMode),
      siteUrl:normalizeSiteUrl(value.siteUrl),
      story:storyValues(value.story&&typeof value.story==='object'?value.story:{}),
      chapterResults:sanitizeChapterResults(value.chapterResults),
      activeRuns:sanitizeActiveRuns(value.activeRuns),
      coldChoices:sanitizeBooleanMap(value.coldChoices),
      seenScenes:seen,
      seenLines:{...seen}
    };
  }
  function sanitizedBookmark(value,validSceneIds){
    if(!value||typeof value!=='object'||!CHAPTER_IDS.includes(value.chapterId)||typeof value.sceneId!=='string'||!value.sceneId.startsWith(`ch${value.chapterId}-`)||!validSceneIds.includes(value.sceneId))return null;
    return {
      nickname:normalizeNickname(value.nickname),
      variant:value.variant==='girl'?'girl':'boy',
      chapterId:value.chapterId,
      sceneId:value.sceneId,
      shortMode:Boolean(value.shortMode),
      siteUrl:normalizeSiteUrl(value.siteUrl),
      story:storyValues(value.story&&typeof value.story==='object'?value.story:{})
    };
  }
  function readBookmark(storage,validSceneIds){try{return sanitizedBookmark(JSON.parse(storage.getItem(KEY)),validSceneIds);}catch{return null;}}
  function saveBookmark(storage,bookmark){try{const value={nickname:normalizeNickname(bookmark.nickname),variant:bookmark.variant==='girl'?'girl':'boy',chapterId:bookmark.chapterId,sceneId:bookmark.sceneId,shortMode:Boolean(bookmark.shortMode),siteUrl:normalizeSiteUrl(bookmark.siteUrl),story:storyValues(bookmark.story)};storage.setItem(KEY,JSON.stringify(value));return true;}catch{return false;}}
  function clearBookmark(storage){try{storage.removeItem(KEY);return true;}catch{return false;}}
  function readGameState(storage,validSceneIds=[]){try{const raw=storage.getItem(KEY);return raw?sanitizeGameState(JSON.parse(raw),validSceneIds):null;}catch{return null;}}
  function saveGameState(storage,state){try{const clean=sanitizeGameState(state,[]);if(!clean)return false;storage.setItem(KEY,JSON.stringify(clean));return true;}catch{return false;}}
  function clearGameState(storage){return clearBookmark(storage);}
  function createMemoryStorage(){
    const store=new Map();
    return {
      getItem(k){return store.has(k)?store.get(k):null;},
      setItem(k,v){store.set(k,String(v));},
      removeItem(k){store.delete(k);}
    };
  }
  function createStorageAdapter({embed=false,local=null}={}){
    if(embed||!local)return createMemoryStorage();
    return {
      getItem(k){try{return local.getItem(k);}catch{return null;}},
      setItem(k,v){try{local.setItem(k,v);}catch{}},
      removeItem(k){try{local.removeItem(k);}catch{}}
    };
  }
  function isChapterUnlocked(state,chapterId,isTeacher=false){
    if(isTeacher)return CHAPTER_IDS.includes(chapterId);
    if(chapterId===1)return true;
    if(chapterId===2)return Boolean(state?.chapterResults?.[1]?.completed);
    if(chapterId===3)return Boolean(state?.chapterResults?.[2]?.completed);
    return false;
  }
  function ensureActiveRun(state,chapterId){
    if(!state.activeRuns||typeof state.activeRuns!=='object')state.activeRuns={};
    if(!state.activeRuns[chapterId])state.activeRuns[chapterId]={missedThisRun:{},solvedThisRun:{}};
    return state.activeRuns[chapterId];
  }
  function startChapterRun(state,chapterId){
    if(!state.activeRuns||typeof state.activeRuns!=='object')state.activeRuns={};
    state.activeRuns[chapterId]={missedThisRun:{},solvedThisRun:{}};
    return state.activeRuns[chapterId];
  }
  function startSingleQuestionRetry(state,chapterId,questionId){
    if(!state.activeRuns||typeof state.activeRuns!=='object')state.activeRuns={};
    const saved=state.chapterResults?.[chapterId]?.questions||{};
    const missedThisRun={},solvedThisRun={};
    for(const [qId,entry] of Object.entries(saved)){
      if(qId===questionId)continue;
      if(entry?.solved){
        solvedThisRun[qId]={...entry};
        if(!entry.firstAttempt)missedThisRun[qId]=true;
      }else if(entry&&!entry.firstAttempt){
        missedThisRun[qId]=true;
        solvedThisRun[qId]={...entry};
      }
    }
    state.activeRuns[chapterId]={missedThisRun,solvedThisRun};
    return state.activeRuns[chapterId];
  }
  function recordQuestionAttempt(state,chapterId,questionId,{correct,conceptTitle='',wrongWhy=''}={}){
    const run=ensureActiveRun(state,chapterId);
    if(!correct){
      run.missedThisRun[questionId]=true;
      const existing=run.solvedThisRun[questionId];
      if(!existing||!existing.solved){
        run.solvedThisRun[questionId]={
          firstAttempt:false,
          solved:false,
          conceptTitle:conceptTitle||questionId,
          ...(wrongWhy?{lastWrongWhy:wrongWhy}:{})
        };
      }
      return {firstAttempt:false,earnedHeart:false,alreadySolved:Boolean(existing?.solved),missed:true};
    }
    const existing=run.solvedThisRun[questionId];
    if(existing&&existing.solved){
      return {firstAttempt:existing.firstAttempt,earnedHeart:false,alreadySolved:true,missed:Boolean(run.missedThisRun[questionId])};
    }
    const firstAttempt=!run.missedThisRun[questionId];
    run.solvedThisRun[questionId]={
      firstAttempt,
      solved:true,
      conceptTitle:conceptTitle||questionId,
      ...(existing?.lastWrongWhy?{lastWrongWhy:existing.lastWrongWhy}:{})
    };
    return {firstAttempt,earnedHeart:firstAttempt,alreadySolved:false,missed:!firstAttempt};
  }
  function countRunHearts(run){
    if(!run?.solvedThisRun)return 0;
    return Object.values(run.solvedThisRun).filter(q=>q&&q.solved&&q.firstAttempt).length;
  }
  function commitChapterRun(state,chapterId,questionList=[]){
    const run=ensureActiveRun(state,chapterId);
    const prev=state.chapterResults?.[chapterId]||createEmptyChapterResult();
    if(prev.completed&&!Object.keys(run.solvedThisRun).length){
      return prev;
    }
    const questions={};
    for(const meta of questionList){
      const qId=typeof meta==='string'?meta:meta.questionId;
      const title=typeof meta==='string'?meta:meta.conceptTitle||qId;
      const solved=run.solvedThisRun[qId];
      if(solved){
        questions[qId]={...solved};
      }else{
        questions[qId]={firstAttempt:false,solved:false,conceptTitle:title};
      }
    }
    for(const [qId,entry] of Object.entries(run.solvedThisRun)){
      if(!questions[qId])questions[qId]={...entry};
    }
    const runHearts=Math.min(4,Object.values(questions).filter(q=>q.solved&&q.firstAttempt).length);
    const hasSolved=Object.values(run.solvedThisRun).some(q=>q&&q.solved);
    if(!prev.completed||runHearts>prev.hearts||(runHearts===prev.hearts&&hasSolved)){
      state.chapterResults[chapterId]={completed:true,hearts:runHearts,questions};
    }else{
      state.chapterResults[chapterId]={...prev,completed:true};
    }
    return state.chapterResults[chapterId];
  }
  function countTotalHearts(state){
    return CHAPTER_IDS.reduce((sum,id)=>sum+Math.max(0,Math.min(4,Number(state?.chapterResults?.[id]?.hearts)||0)),0);
  }
  function countLiveTotalHearts(state,activeChapterId=null){
    return CHAPTER_IDS.reduce((sum,id)=>{
      const saved=Math.max(0,Math.min(4,Number(state?.chapterResults?.[id]?.hearts)||0));
      if(id===activeChapterId&&state?.activeRuns?.[id]){
        const live=Math.min(4,countRunHearts(state.activeRuns[id]));
        return sum+Math.max(saved,live);
      }
      return sum+saved;
    },0);
  }
  function hasColdRejection(state){
    return Object.values(state?.coldChoices||{}).some(Boolean);
  }
  function markSceneSeen(state,key){
    if(!isSafeKey(key))return;
    if(!state.seenScenes||typeof state.seenScenes!=='object')state.seenScenes={};
    if(!state.seenLines||typeof state.seenLines!=='object')state.seenLines={};
    state.seenScenes[key]=true;
    state.seenLines[key]=true;
  }
  function isSceneSeen(state,key){
    return Boolean(state?.seenScenes?.[key]||state?.seenLines?.[key]);
  }
  return {
    KEY,normalizeNickname,vocative,variantText,createStoryState,applyIdentity,responseLines,conceptResponseLines,storyValues,
    readBookmark,saveBookmark,clearBookmark,normalizeSiteUrl,
    sanitizeGameState,readGameState,saveGameState,clearGameState,
    createMemoryStorage,createStorageAdapter,isChapterUnlocked,
    startChapterRun,startSingleQuestionRetry,recordQuestionAttempt,countRunHearts,commitChapterRun,
    countTotalHearts,countLiveTotalHearts,hasColdRejection,markSceneSeen,isSceneSeen
  };
});
