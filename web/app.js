(function () {
  "use strict";
  var data = window.CS_DATA;
  var key = "cs-class-prototype-v1";
  var defaults = {
    concepts:[], applied:[], lastSection:"concept", closed:false, teacherTab:"overview",
    roster:[
      {id:"sample-03",number:3,name:"",concept:4,applied:4,submitted:2},
      {id:"sample-07",number:7,name:"",concept:0,applied:0,submitted:0},
      {id:"sample-12",number:12,name:"",concept:3,applied:2,submitted:0},
      {id:"sample-18",number:18,name:"",concept:1,applied:0,submitted:0}
    ],
    archived:[{year:2025,klass:"2학년 1반",number:3,version:1,title:"등교 준비 순서도",date:"2025-12-11"}],
    placed:{"1":{}, "2":{}, "3":{}}, labs:[], walkthrough:0,
    draft:{plan:"",blocks:[]}, draftRevision:0, reviewedRevision:-1, submissions:[]
  };
  function copy(v){return JSON.parse(JSON.stringify(v));}
  function load(){
    try {
      var raw=sessionStorage.getItem(key); if(!raw) return copy(defaults);
      var parsed=JSON.parse(raw);
      var result=Object.assign(copy(defaults),parsed);
      result.draft=Object.assign(copy(defaults.draft),parsed.draft||{});
      result.placed=Object.assign(copy(defaults.placed),parsed.placed||{});
      return result;
    } catch(e){return copy(defaults);}
  }
  var state=load();
  var activeSim="sequence", alternateSim=false, simTimers=[], selectedBank=-1, toastTimer=null;
  var sections=["concept","apply","lab-1","lab-2","lab-3","lab-4","lab-5"];
  var sectionNames={"concept":"4대 기호","apply":"흐름 읽기","lab-1":"라면 · 순차","lab-2":"놀이기구 · 선택","lab-3":"비밀번호 · 반복","lab-4":"등교 · 예시 공방","lab-5":"나만의 백지"};
  function save(){
    try {sessionStorage.setItem(key,JSON.stringify(state));return true;}
    catch(e){toast("이 탭에 상태를 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.");return false;}
  }
  function $(selector,root){return (root||document).querySelector(selector);}
  function $all(selector,root){return Array.from((root||document).querySelectorAll(selector));}
  function esc(value){return String(value==null?"":value).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
  function toast(message){var el=$("#toast");el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(function(){el.hidden=true;},4200);}
  function go(route){location.hash="#"+route;}
  function currentRoute(){var hash=decodeURIComponent(location.hash.slice(1));if(hash==="student"||hash==="teacher")return {view:hash};if(hash.indexOf("module/")===0){var s=hash.slice(7);return {view:"module",section:sections.includes(s)?s:"concept"};}return {view:"home",anchor:hash==="explore"?"explore":null};}
  function updateProgress(){
    var conceptCount=state.concepts.length,applyCount=state.applied.length,submitted=state.submissions.length>0;
    var total=conceptCount+applyCount+(submitted?1:0),percent=Math.round(total/9*100);
    $("#concept-progress").textContent=conceptCount+" / 4";$("#apply-progress").textContent=applyCount+" / 4";
    $("#submit-progress").textContent=submitted?"제출 "+state.submissions.length+"회":"미제출";
    $("#total-progress").textContent=percent+"%";$("#progress-fill").style.width=percent+"%";
    $("#module-progress-count").textContent=total+" / 9";$("#module-progress-fill").style.width=percent+"%";
    $("#completion-label").textContent=total===9?"완료":"진행 중";
    $("#student-last-place").textContent=sectionNames[state.lastSection]||"개념부터";
    $(".lesson-feature [data-route]").dataset.route="module/"+(sections.includes(state.lastSection)?state.lastSection:"concept");
    $("#student-save-state").textContent="가상 학습 기록은 이 브라우저 탭에만 저장됩니다. 탭을 닫으면 이어지지 않을 수 있어요.";
  }
  function renderRoute(){
    var route=currentRoute();
    $all("[data-view]").forEach(function(v){v.hidden=v.dataset.view!==route.view;});
    document.body.classList.toggle("on-public",route.view==="home");
    if(route.view==="module"){
      state.lastSection=route.section;save();
      $all("[data-section-panel]").forEach(function(p){p.hidden=p.dataset.sectionPanel!==(route.section.indexOf("lab-")===0?"lab":route.section);});
      $all("[data-section]").forEach(function(link){link.classList.toggle("active",link.dataset.section===route.section);});
      $all(".mobile-module-nav a").forEach(function(link){link.classList.toggle("active",link.getAttribute("href")==="#module/"+route.section);});
      $("#module-breadcrumb").textContent="순서도 연구소 / "+sectionNames[route.section];
      if(route.section.indexOf("lab-")===0)renderLab(Number(route.section.slice(4)));
      updateProgress();
      window.scrollTo(0,0);
    } else if(route.view==="student"){updateProgress();window.scrollTo(0,0);}
    else if(route.view==="teacher"){renderTeacher();window.scrollTo(0,0);}
    else if(route.anchor){requestAnimationFrame(function(){$("#explore").scrollIntoView({behavior:"smooth"});});}
    else window.scrollTo(0,0);
  }
  function quizHTML(question,kind,id,done){
    var options=question.options.map(function(option,i){return '<button type="button" data-quiz-kind="'+kind+'" data-quiz-id="'+esc(id)+'" data-answer="'+i+'"'+(done&&i===question.answer?' class="done"':'')+'>'+esc(option)+'</button>';}).join("");
    return '<div class="quiz-box"><p class="question">'+esc(question.question)+'</p><div class="quiz-options">'+options+'</div><p class="quiz-result" id="result-'+kind+'-'+esc(id)+'" role="status">'+(done?"맞혀서 완료했어요.":"")+'</p></div>';
  }
  function renderConcepts(){
    $("#concept-list").innerHTML=data.concepts.map(function(c,i){
      return '<article class="concept-card"><div class="concept-top"><div class="concept-shape '+c.id+'" aria-hidden="true">'+c.shape+'</div><div><p class="eyebrow muted">'+esc(c.english)+' · 0'+(i+1)+'</p><h2>'+esc(c.name)+' '+(state.concepts.includes(c.id)?'<span class="completed-label">✓ 완료</span>':'')+'</h2><p class="symbol-desc">'+esc(c.explanation)+'</p></div></div><div class="concept-example"><strong>'+esc(c.role)+'</strong><br>'+esc(c.example)+'</div>'+quizHTML(c,"concept",c.id,state.concepts.includes(c.id))+'</article>';
    }).join("");
  }
  function flowHTML(nodes,vertical){
    return '<div class="flow-mini'+(vertical?' vertical':'')+'">'+nodes.map(function(n,i){
      return (i?'<span class="flow-arrow" aria-hidden="true">'+(vertical?'↓':'→')+'</span>':'')+'<span class="flow-node node-'+esc(n[1])+'" data-flow-index="'+i+'">'+esc(n[0])+'</span>';
    }).join("")+'</div>';
  }
  function diagramHTML(kind,nodes){
    if(kind==="sequence")return flowHTML(nodes,true);
    function node(i){var n=nodes[i];return '<span class="flow-node node-'+esc(n[1])+'" data-flow-index="'+i+'">'+esc(n[0])+'</span>';}
    var cond=kind==="decision"&&nodes[1][1]==="decision"?1:kind==="decision"?2:1;
    var html='<div class="mini-diagram"><div class="mini-chain">'+node(0);
    if(cond===2)html+='<span class="flow-arrow" aria-hidden="true">↓</span>'+node(1);
    html+='<span class="flow-arrow" aria-hidden="true">↓</span>'+node(cond)+'</div>';
    if(kind==="loop"){
      html+='<div class="mini-branches"><div><small>아니오 ↶ 입력으로</small>'+node(2)+'</div><div><small>예 → 완료</small>'+node(3)+'</div></div>';
    }else{
      var yes=cond+1,no=cond+2;
      html+='<div class="mini-branches"><div><small>예</small>'+node(yes)+'</div><div><small>아니오</small>'+node(no)+'</div></div>';
      if(nodes.length>no+1)html+='<span class="flow-arrow" aria-hidden="true">↓</span>'+node(no+1);
    }
    return html+'</div>';
  }
  function renderApplied(){
    $("#apply-list").innerHTML=data.applied.map(function(q){
      var done=state.applied.includes(q.id);
      return '<article class="apply-card"><div class="apply-visual" aria-label="'+esc(q.title)+' 그림">'+diagramHTML(q.id,q.nodes)+'</div><div class="apply-body"><p class="eyebrow blue">'+esc(q.eyebrow)+'</p><h2>'+esc(q.title)+' '+(done?'<span class="completed-label">✓ 완료</span>':'')+'</h2>'+quizHTML(q,"apply",q.id,done)+'</div></article>';
    }).join("");
  }
  function answerQuiz(button){
    var kind=button.dataset.quizKind,id=button.dataset.quizId;
    var item=(kind==="concept"?data.concepts:data.applied).find(function(x){return x.id===id;});
    if(!item)return;
    var correct=Number(button.dataset.answer)===item.answer;
    var result=$("#result-"+kind+"-"+id);
    $all('[data-quiz-kind="'+kind+'"][data-quiz-id="'+id+'"]').forEach(function(b){b.classList.remove("correct","incorrect");});
    button.classList.add(correct?"correct":"incorrect");
    result.textContent=correct?"맞았어요! "+item.feedback:"다시 그림과 설명을 살펴보고 골라 보세요.";
    result.classList.toggle("error",!correct);
    if(correct){
      if(!state[kind==="concept"?"concepts":"applied"].includes(id))state[kind==="concept"?"concepts":"applied"].push(id);
      save();updateProgress();
      var card=button.closest(".concept-card, .apply-card");var heading=$("h2",card);
      if(heading&&!$(".completed-label",heading)){var badge=document.createElement("span");badge.className="completed-label";badge.textContent=" ✓ 완료";heading.appendChild(badge);}
    }
  }
  function renderSim(){
    var s=data.sims[activeSim];
    $all("[data-sim]").forEach(function(b){b.classList.toggle("active",b.dataset.sim===activeSim);});
    $("#sim-title").textContent=s.title;$("#sim-description").textContent=s.description;
    $("#sim-diagram").innerHTML=diagramHTML(activeSim,s.nodes);
    $("#sim-status").textContent="재생 버튼을 누르면 빛이 흐름을 따라 움직여요.";
  }
  function playSim(){
    simTimers.forEach(clearTimeout);simTimers=[];
    var s=data.sims[activeSim],path=s.alternate&&alternateSim?s.alternate:s.path;
    if(s.alternate)alternateSim=!alternateSim;
    var nodes=$all("#sim-diagram .flow-node"),reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(reduce){nodes.forEach(function(n){n.classList.remove("lit");});nodes[path[path.length-1]].classList.add("lit");$("#sim-status").textContent="흐름: "+path.map(function(i){return s.nodes[i][0];}).join(" → ");return;}
    path.forEach(function(index,step){
      simTimers.push(setTimeout(function(){nodes.forEach(function(n){n.classList.remove("lit");});nodes[index].classList.add("lit");$("#sim-status").textContent=(step+1)+" / "+path.length+" · "+s.nodes[index][0];},step*470));
    });
  }
  function renderMission(number){
    var m=data.missions[number-1],placed=state.placed[String(number)]||{};
    var bank=m.bank.map(function(text,i){return '<button class="bank-item'+(selectedBank===i?' selected':'')+'" type="button" data-bank="'+i+'">'+esc(text)+'</button>';}).join("");
    var slot=function(i){
      var spec=m.slots[i],value=placed[i],fixed=spec[1]===null;
      return '<button type="button" class="slot'+(fixed?' fixed':'')+(value?' filled':'')+'" data-slot="'+i+'" '+(fixed?'disabled':'')+' aria-label="'+esc(spec[0])+' 칸">'+esc(value||spec[0])+'</button>';
    };
    var canvas='<div class="lab-canvas">'+slot(0);
    for(var i=1;i<m.slots.length;i++){
      if((number===2||number===3)&&i===3){canvas+='<span class="slot-arrow" aria-hidden="true">↓</span><div class="branch-slots"><div><small>예</small>'+slot(3)+'</div><div><small>아니오</small>'+slot(4)+'</div></div>';i=4;continue;}
      canvas+='<span class="slot-arrow" aria-hidden="true">↓</span>'+slot(i);
    }
    canvas+='</div>';
    var input=number===2?'<label class="lab-input-label">가상 키 (cm)<input id="mission-input" type="number" min="0" max="300" value="148"></label>':number===3?'<label class="lab-input-label">가상 비밀번호<input id="mission-input" type="text" inputmode="numeric" value="1234"></label>':'';
    $("#lab-workspace").innerHTML='<div class="lab-workspace"><section class="lab-panel"><h2>블록 보관함</h2><p class="hint">블록을 선택한 다음 가운데 빈칸을 누르세요. 키보드로도 조립할 수 있어요.</p><div class="block-bank">'+bank+'</div></section><section class="lab-panel"><h2>'+esc(m.type)+' 순서도</h2><p class="hint">기호를 놓고 실행 결과를 확인해 보세요.</p>'+canvas+'</section><section class="lab-panel"><h2>실행해 보기</h2><p class="lab-side-note">블록을 모두 배치하면 가상 입력을 바꿔 흐름을 확인할 수 있어요.</p>'+input+'<div class="lab-output" id="lab-output">실행 전입니다.</div><button type="button" class="button button-dark compact" data-action="run-mission">순서도 실행</button><div class="lab-controls"><button type="button" data-action="reset-mission">다시 조립</button></div><p class="lab-message" id="lab-message" role="status"></p></section></div>';
  }
  function renderWalkthrough(){
    var current=state.walkthrough||0;
    var cards=data.walkthrough.map(function(s,i){return '<button class="walk-card'+(current===i?' active':'')+'" type="button" data-walk="'+i+'"><strong>'+esc(s.title)+'</strong><small>'+esc(s.text)+'</small></button>';}).join("");
    var visible=data.walkthrough.slice(0,current+1).map(function(s){return [s.shape+" "+s.title,s.symbol.toLowerCase()==="판단"?"decision":"process"];});
    var s=data.walkthrough[current];
    $("#lab-workspace").innerHTML='<div class="walkthrough"><div class="walk-list">'+cards+'</div><div class="walk-result"><p class="eyebrow blue">STEP '+(current+1)+' / 4</p><h2>'+esc(s.title)+'</h2><p>'+esc(s.reason)+'</p><div class="walk-flow">'+flowHTML(visible,true)+'</div><p>왼쪽 단계를 선택해 순서도를 차례대로 완성해 보세요.</p></div></div>';
  }
  function renderFree(){
    var draft=state.draft;
    var blockList=draft.blocks.map(function(block,i){return '<div class="free-block"><span class="icon" aria-hidden="true">'+esc(block.shape)+'</span><input type="text" data-block-text="'+i+'" aria-label="'+(i+1)+'번 블록 내용" maxlength="80" value="'+esc(block.text)+'"><div class="free-block-actions"><button type="button" data-move-up="'+i+'" aria-label="'+(i+1)+'번 블록 위로">↑</button><button type="button" data-move-down="'+i+'" aria-label="'+(i+1)+'번 블록 아래로">↓</button><button type="button" data-remove-block="'+i+'" aria-label="'+(i+1)+'번 블록 삭제">×</button></div></div>';}).join("");
    var list=state.submissions.slice().reverse().map(function(s){return '<div><strong>제출 '+s.version+'회</strong> · '+esc(s.date)+' · '+esc(s.plan.slice(0,45))+'</div>';}).join("");
    var reviewed=state.reviewedRevision===state.draftRevision,closed=state.closed;
    $("#lab-workspace").innerHTML='<div class="free-workspace"><section class="free-panel"><p class="eyebrow blue">PLAN FIRST</p><h2>말로 먼저 계획하기</h2><p>해결할 문제와 필요한 순서를 적어 보세요. 입력한 내용은 이 탭에 자동 저장됩니다.</p><label for="free-plan">나의 알고리즘 계획</label><textarea id="free-plan" placeholder="예: 아침에 늦지 않으려면 현재 시각을 확인하고…">'+esc(draft.plan)+'</textarea><p class="draft-state" id="draft-state">이 브라우저 탭에만 저장되는 가상 초안</p><div class="free-callout">이 화면은 작업 방식 확인용 시안입니다. 현재 블록은 순서만 편집할 수 있고, V1의 자유 연결 캔버스와 실제 AI 검사는 아직 연결되지 않았습니다.</div></section><section class="free-panel"><p class="eyebrow blue">MAKE & SUBMIT</p><h2>순서도 조립하기</h2><p>기호를 추가한 뒤 내용을 적고 순서를 바꿔 보세요.</p><div class="free-toolbar"><button type="button" data-add-block="⬭">⬭ 단말</button><button type="button" data-add-block="▱">▱ 자료</button><button type="button" data-add-block="◇">◇ 판단</button><button type="button" data-add-block="▭">▭ 처리</button></div><div class="free-block-list" id="free-block-list">'+(blockList||'<p class="panel-note">아직 추가한 기호가 없어요.</p>')+'</div><div class="free-callout">제출 흐름 미리보기: 시안용 구조 확인 → 가상 제출. 실제 운영에서는 AI 설계 검사 통과 후 학생이 제출하게 됩니다.</div><button class="button button-quiet compact" type="button" data-action="review-draft">시안용 구조 확인 (AI 아님)</button><button class="button button-dark compact" type="button" data-action="submit-draft" '+(!reviewed||closed?'disabled':'')+'>가상 제출'+(closed?' · 마감됨':'')+'</button><p class="lab-message" id="free-message" role="status">'+(closed?'교사가 제출을 마감했습니다. 초안 편집은 계속할 수 있어요.':reviewed?'시안용 구조 확인을 마쳤습니다. 작업을 바꾸면 다시 확인해야 해요.':'초안을 만들고 시안용 구조 확인을 눌러 주세요.')+'</p><div class="submission-list"><h3>가상 제출 이력</h3>'+(list||'<p class="panel-note">아직 제출한 예시가 없어요.</p>')+'</div></section></div>';
  }
  function renderLab(number){
    selectedBank=-1;
    $("#lab-eyebrow").textContent="PART 03 · MAKE / "+number+" OF 5";
    var labels=["","라면 끓이기","놀이기구 탑승","비밀번호 맞추기","아침 등교 예시 공방","나만의 백지"];
    var descriptions=["",data.missions[0].description,data.missions[1].description,data.missions[2].description,"자연어 계획이 순서도 기호로 바뀌는 과정을 한 단계씩 살펴보세요.","나만의 문제를 계획하고 순서도 형태로 옮겨 보세요."];
    $("#lab-title").textContent=labels[number];$("#lab-description").textContent=descriptions[number];
    if(number<=3)renderMission(number);else if(number===4)renderWalkthrough();else renderFree();
    $("#lab-next-actions").innerHTML='<button type="button" data-route="module/'+(number===5?"concept":"lab-"+(number+1))+'">'+(number===5?"개념으로 돌아가기":"다음 실습 →")+'</button>';
  }
  function runMission(){
    var number=Number(currentRoute().section.slice(4)),m=data.missions[number-1],placed=state.placed[String(number)]||{};
    var wrong=[];
    m.slots.forEach(function(slot,i){if(slot[1]!==null&&placed[i]!==slot[0])wrong.push(slot[0]);});
    var message=$("#lab-message"),output=$("#lab-output");
    if(wrong.length){message.textContent="아직 맞지 않는 칸이 있어요. 블록 내용을 읽고 다시 배치해 보세요.";message.className="lab-message error";output.textContent="순서도를 완성한 뒤 다시 실행해 주세요.";return;}
    var result=m.output;
    if(number===2){var h=Number($("#mission-input").value);if(!Number.isFinite(h)||h<0||h>300){message.textContent="키를 0~300cm 사이로 입력해 주세요.";message.className="lab-message error";return;}result=h>=150?h+"cm → [예] 탑승 가능":h+"cm → [아니오] 탑승 불가";}
    if(number===3){var pw=$("#mission-input").value.trim();result=pw==="7777"?"7777 → [예] 성공":"[아니오] 다시 입력 단계로 돌아가요. 7777을 넣어 다시 실행해 보세요.";}
    output.textContent=result;message.textContent="흐름을 잘 연결했어요. 입력을 바꿔 한 번 더 실행해 보세요.";message.className="lab-message good";
    if(!state.labs.includes(number))state.labs.push(number);save();
  }
  function draftChanged(){state.draftRevision++;state.reviewedRevision=-1;save();var button=$('[data-action="submit-draft"]');if(button)button.disabled=true;var msg=$("#free-message");if(msg)msg.textContent="작업이 바뀌었어요. 시안용 구조 확인을 다시 해 주세요.";}
  function submitDraft(){
    if(state.closed){toast("교사가 제출을 마감했습니다. 다시 열릴 때 제출해 주세요.");return;}
    if(state.reviewedRevision!==state.draftRevision){toast("작업을 시안용 구조 확인으로 먼저 확인해 주세요.");return;}
    var version=state.submissions.length+1;
    state.submissions.push({version:version,date:new Date().toLocaleString("ko-KR"),plan:state.draft.plan,blocks:copy(state.draft.blocks)});
    save();renderFree();updateProgress();renderTeacher();toast("가상 제출 "+version+"회를 기록했습니다. 실제 서버에는 보내지지 않았습니다.");
  }
  function renderTeacher(){
    var tab=state.teacherTab;var titles={overview:["반 현황","열어 둔 수업과 학생별 학습 상태를 살펴보세요."],accounts:["학생 계정","출석번호를 지정하고 필요한 계정을 관리하세요."],archive:["기록실","학년도별 지난 제출 기록을 찾아보세요."]};
    $("#teacher-page-title").textContent=titles[tab][0];$("#teacher-page-description").textContent=titles[tab][1];
    $all("[data-panel]").forEach(function(p){p.hidden=p.dataset.panel!==tab;});
    $all("[data-teacher-tab]").forEach(function(b){b.classList.toggle("active",b.dataset.teacherTab===tab);});
    $("#module-open-label").textContent=state.closed?"마감":"열림";$("#module-open-label").classList.toggle("closed",state.closed);
    $("#close-button").textContent=state.closed?"제출 다시 열기":"제출 마감하기";
    $("#close-help").textContent=state.closed?"다시 열면 재제출할 수 있습니다.":"마감하면 새 제출·재제출이 멈춥니다.";
    var roster=state.roster.slice().sort(function(a,b){return a.number-b.number;});
    var rows=roster.map(function(s){
      var dynamic=s.id==="sample-07",concept=dynamic?state.concepts.length:s.concept,applied=dynamic?state.applied.length:s.applied,submitted=dynamic?state.submissions.length:s.submitted;
      return '<tr><td><strong>'+s.number+'번</strong></td><td>'+esc(s.name||"—")+'</td><td>'+concept+' / 4</td><td>'+applied+' / 4</td><td><span class="tag '+(submitted?"":"neutral")+'">'+(submitted?submitted+"회 제출":"미제출")+'</span></td><td><button class="table-link" type="button" data-student-detail="'+esc(s.id)+'">보기 →</button></td></tr>';
    }).join("");
    $("#teacher-student-body").innerHTML=rows;
    $("#teacher-account-body").innerHTML=roster.map(function(s){
      return '<tr><td><strong>'+s.number+'번</strong></td><td>'+esc(s.name||"미입력")+'</td><td><span class="tag">사용 중</span></td><td><button class="table-link" type="button" data-reset="'+esc(s.id)+'">비밀번호 재발급</button> <button class="table-link" type="button" data-replace="'+esc(s.id)+'">학생 교체</button></td></tr>';
    }).join("");
    $("#teacher-students-count").textContent=roster.length;
    $("#teacher-submitted-count").textContent=roster.filter(function(s){return (s.id==="sample-07"?state.submissions.length:s.submitted)>0;}).length;
    $("#teacher-learning-count").textContent=roster.filter(function(s){return (s.id==="sample-07"?(state.concepts.length+state.applied.length)>0:(s.concept+s.applied)>0);}).length;
    renderArchive();
  }
  function showStudentDetail(id){
    var s=state.roster.find(function(r){return r.id===id;});if(!s)return;
    var submitted=s.id==="sample-07"?state.submissions.length:s.submitted;
    var history=s.id==="sample-07"?state.submissions.map(function(v){return "<li>제출 "+v.version+"회 · "+esc(v.date)+" · "+esc(v.plan.slice(0,55))+"</li>";}).join(""):"<li>예시 제출 기록 "+submitted+"회</li>";
    var detail=$("#student-detail");detail.hidden=false;
    detail.innerHTML="<h3>"+s.number+"번"+(s.name?" · "+esc(s.name):"")+" 상세</h3><p>현재 제출 "+submitted+"회. 최신본과 이전 제출본은 실제 기능 연결 후 이곳에서 각각 열람합니다.</p><ul>"+(submitted?history:"<li>아직 제출한 작품이 없습니다.</li>")+"</ul>";
    detail.scrollIntoView({block:"nearest",behavior:"smooth"});
  }
  function renderArchive(){
    var year=Number($("#archive-year").value),number=$("#archive-number").value;
    var items=state.archived.filter(function(a){return a.year===year&&(!number||a.number===Number(number));});
    $("#archive-results").innerHTML=items.length?'<ul>'+items.map(function(a){return '<li>'+a.year+' · '+esc(a.klass)+' · '+a.number+'번 · '+esc(a.title)+' · 제출 '+a.version+'회</li>';}).join("")+'</ul>':'<p>조건에 맞는 예시 기록이 없습니다.</p>';
  }
  function exportArchive(){
    var year=Number($("#archive-year").value),number=$("#archive-number").value;
    var items=state.archived.filter(function(a){return a.year===year&&(!number||a.number===Number(number));});
    function csv(v){var text=String(v==null?"":v);if(/^[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
    var rows=[["학년도","반","번호","제출회차","제목","날짜"]].concat(items.map(function(a){return [a.year,a.klass,a.number,a.version,a.title,a.date];}));
    var blob=new Blob(["\ufeff"+rows.map(function(r){return r.map(csv).join(",");}).join("\r\n")],{type:"text/csv;charset=utf-8"});
    var url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="cs-class-demo-archive.csv";a.click();setTimeout(function(){URL.revokeObjectURL(url);},5000);
  }
  document.addEventListener("click",function(event){
    var route=event.target.closest("[data-route]");if(route){go(route.dataset.route);return;}
    var quiz=event.target.closest("[data-quiz-kind]");if(quiz){answerQuiz(quiz);return;}
    var sim=event.target.closest("[data-sim]");if(sim){activeSim=sim.dataset.sim;renderSim();return;}
    var bank=event.target.closest("[data-bank]");if(bank){selectedBank=Number(bank.dataset.bank);$all("[data-bank]").forEach(function(b){b.classList.toggle("selected",b===bank);});toast("가운데 빈칸을 눌러 블록을 놓으세요.");return;}
    var slot=event.target.closest("[data-slot]");if(slot){
      var num=Number(currentRoute().section.slice(4));if(num<1||num>3||selectedBank<0){toast("왼쪽 보관함에서 블록을 먼저 골라 주세요.");return;}
      var m=data.missions[num-1],value=m.bank[selectedBank],placed=state.placed[String(num)]||{};
      Object.keys(placed).forEach(function(k){if(placed[k]===value)delete placed[k];});
      placed[slot.dataset.slot]=value;state.placed[String(num)]=placed;save();renderMission(num);return;
    }
    var tab=event.target.closest("[data-teacher-tab]");if(tab){state.teacherTab=tab.dataset.teacherTab;save();renderTeacher();return;}
    var detail=event.target.closest("[data-student-detail]");if(detail){showStudentDetail(detail.dataset.studentDetail);return;}
    var reset=event.target.closest("[data-reset]");if(reset){toast("시안: 비밀번호 재발급 시 기존 작업은 유지되고, 새 임시 비밀번호를 교사에게 한 번만 보여 줍니다.");return;}
    var replace=event.target.closest("[data-replace]");if(replace){
      var old=state.roster.find(function(s){return s.id===replace.dataset.replace;});if(!old)return;
      var d=$("#student-detail");d.hidden=false;state.teacherTab="overview";renderTeacher();
      d=$("#student-detail");d.hidden=false;d.innerHTML='<h3>'+old.number+'번 학생 교체 미리보기</h3><p>이전 학생의 작업을 기록실로 분리하고 같은 번호에 빈 새 계정을 만듭니다. 가상 자료만 바뀝니다.</p><button class="button button-dark compact" type="button" data-confirm-replace="'+esc(old.id)+'">가상 교체 실행</button>';d.scrollIntoView({block:"nearest"});return;
    }
    var confirmReplace=event.target.closest("[data-confirm-replace]");if(confirmReplace){
      var existing=state.roster.find(function(s){return s.id===confirmReplace.dataset.confirmReplace;});if(!existing)return;
      state.archived.push({year:2026,klass:"2학년 1반",number:existing.number,version:existing.submitted||0,title:"이전 학생 작업 보관",date:new Date().toLocaleDateString("ko-KR")});
      existing.id="demo-"+Date.now();existing.name="";existing.concept=0;existing.applied=0;existing.submitted=0;save();renderTeacher();$("#student-detail").hidden=true;toast(existing.number+"번을 가상으로 교체했습니다. 이전 기록은 분리됐습니다.");return;
    }
    var walk=event.target.closest("[data-walk]");if(walk){state.walkthrough=Number(walk.dataset.walk);save();renderWalkthrough();return;}
    var add=event.target.closest("[data-add-block]");if(add){state.draft.blocks.push({shape:add.dataset.addBlock,text:""});draftChanged();renderFree();return;}
    var remove=event.target.closest("[data-remove-block]");if(remove){state.draft.blocks.splice(Number(remove.dataset.removeBlock),1);draftChanged();renderFree();return;}
    var up=event.target.closest("[data-move-up]");if(up){var i=Number(up.dataset.moveUp);if(i>0){var t=state.draft.blocks[i-1];state.draft.blocks[i-1]=state.draft.blocks[i];state.draft.blocks[i]=t;draftChanged();renderFree();}return;}
    var down=event.target.closest("[data-move-down]");if(down){var j=Number(down.dataset.moveDown);if(j<state.draft.blocks.length-1){var t2=state.draft.blocks[j+1];state.draft.blocks[j+1]=state.draft.blocks[j];state.draft.blocks[j]=t2;draftChanged();renderFree();}return;}
    var action=event.target.closest("[data-action]");if(!action)return;
    switch(action.dataset.action){
      case "play-sim":playSim();break;
      case "run-mission":runMission();break;
      case "reset-mission":var n=Number(currentRoute().section.slice(4));state.placed[String(n)]={};save();renderMission(n);break;
      case "review-draft":
        if(state.draft.plan.trim().length<15||state.draft.blocks.length<3||state.draft.blocks.some(function(b){return !b.text.trim();})){
          $("#free-message").textContent="계획을 15자 이상 적고, 내용이 있는 기호를 3개 이상 추가해 주세요. 이것은 시안용 구조 확인입니다.";
          $("#free-message").className="lab-message error";return;
        }
        state.reviewedRevision=state.draftRevision;save();renderFree();toast("시안용 구조 확인을 마쳤습니다. AI 검사는 실행되지 않았습니다.");break;
      case "submit-draft":submitDraft();break;
      case "toggle-close":state.closed=!state.closed;save();renderTeacher();toast(state.closed?"가상 제출을 마감했습니다.":"가상 제출을 다시 열었습니다.");break;
      case "add-student":$("#account-form").hidden=false;$("#new-student-number").focus();break;
      case "cancel-add":$("#account-form").hidden=true;$("#account-error").textContent="";break;
      case "save-student":
        var number=Number($("#new-student-number").value),name=$("#new-student-name").value.trim();
        if(!Number.isInteger(number)||number<1||number>99){$("#account-error").textContent="출석번호를 1~99 사이로 입력해 주세요.";return;}
        if(state.roster.some(function(s){return s.number===number;})){$("#account-error").textContent="이미 사용하는 번호입니다. 학생 교체 메뉴를 이용해 주세요.";return;}
        state.roster.push({id:"demo-"+Date.now(),number:number,name:name,concept:0,applied:0,submitted:0});save();$("#account-form").hidden=true;$("#new-student-number").value="";$("#new-student-name").value="";$("#account-error").textContent="";renderTeacher();toast(number+"번 가상 학생을 추가했습니다.");break;
      case "archive-filter":renderArchive();break;
      case "archive-export":exportArchive();break;
    }
  });
  document.addEventListener("input",function(event){
    if(event.target.id==="free-plan"){state.draft.plan=event.target.value;draftChanged();$("#draft-state").textContent="이 탭에 자동 저장했습니다 · 실제 서버 전송 없음";}
    if(event.target.matches("[data-block-text]")){state.draft.blocks[Number(event.target.dataset.blockText)].text=event.target.value;draftChanged();}
  });
  window.addEventListener("hashchange",renderRoute);
  renderConcepts();renderApplied();renderSim();updateProgress();renderRoute();
})();
