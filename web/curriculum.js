(function () {
  "use strict";
  window.CS_DATA = {
    concepts: [
      { id:"terminal", name:"단말", english:"TERMINAL", shape:"⬭", role:"알고리즘의 시작과 끝", explanation:"어디에서 시작하고 어디에서 끝나는지 알려 줍니다. 순서도의 첫 기호와 마지막 기호를 찾아보세요.", example:"예: 시작 · 종료", question:"[시작]과 [끝]을 나타내는 기호는 무엇일까요?", options:["단말","판단","처리","입출력"], answer:0, feedback:"단말은 시작과 종료를 표시해요." },
      { id:"io", name:"자료 (입출력)", english:"INPUT / OUTPUT", shape:"▱", role:"자료를 받거나 결과를 보여주기", explanation:"현재 기온을 입력받거나 추천 옷차림을 보여 주는 것처럼, 정보가 들어오고 나가는 곳에 사용해요.", example:"예: 키 입력받기 · 결과 출력하기", question:"'현재 기온을 입력받는다'에 어울리는 기호는?", options:["처리","자료 (입출력)","판단","단말"], answer:1, feedback:"자료 기호는 입력과 출력에 사용해요." },
      { id:"decision", name:"판단", english:"DECISION", shape:"◇", role:"조건에 따라 길 나누기", explanation:"조건을 확인하고 [예]와 [아니오] 두 길로 나눕니다. 다른 결과로 이어지는지 화살표를 따라가 보세요.", example:"예: 키가 150cm 이상인가?", question:"'키가 150cm 이상인가?'를 확인하는 기호는?", options:["단말","처리","판단","자료 (입출력)"], answer:2, feedback:"판단 기호는 조건에 따라 흐름을 나눠요." },
      { id:"process", name:"처리", english:"PROCESS", shape:"▭", role:"명령이나 계산 실행하기", explanation:"물을 끓이거나 두 수를 더하는 것처럼, 실제로 수행할 동작을 적습니다.", example:"예: 물 끓이기 · 합계 계산하기", question:"'물 끓이기'처럼 명령을 실행하는 기호는?", options:["처리","단말","판단","자료 (입출력)"], answer:0, feedback:"처리는 구체적인 동작이나 계산을 나타내요." }
    ],
    applied: [
      { id:"sequence", eyebrow:"01 / 순차", title:"라면은 어떤 순서로 완성될까요?", question:"'물 끓이기' 다음에 실행할 일은 무엇인가요?", nodes:[["시작","terminal"],["물 500ml 붓기","io"],["물 끓이기","process"],["면과 스프 넣기","process"],["종료","terminal"]], options:["냄비에 물 붓기","면과 스프 넣기","종료부터 시작하기","키를 입력받기"], answer:1, feedback:"순차 구조는 화살표를 따라 차례대로 실행돼요." },
      { id:"decision", eyebrow:"02 / 선택", title:"키가 148cm라면 어느 길로 갈까요?", question:"'키 ≥ 150cm?'에서 148cm를 넣었을 때 결과는?", nodes:[["시작","terminal"],["키 입력","io"],["키 ≥ 150cm?","decision"],["예 → 탑승 가능","io"],["아니오 → 탑승 불가","io"]], options:["예 → 탑승 가능","아니오 → 탑승 불가","두 길 모두 실행","조건을 보지 않고 종료"], answer:1, feedback:"148은 150보다 작으므로 [아니오] 길로 가요." },
      { id:"loop", eyebrow:"03 / 반복", title:"비밀번호가 틀리면 어떻게 될까요?", question:"첫 입력이 틀렸을 때 다음에 해야 할 일은?", nodes:[["비밀번호 입력","io"],["7777인가?","decision"],["아니오 → 다시 입력","process"],["예 → 성공","io"]], options:["곧바로 성공 표시","입력 단계로 돌아가기","프로그램 종료","예·아니오를 동시에 실행"], answer:1, feedback:"반복 구조에서는 조건을 다시 확인하도록 입력 단계로 돌아가요." },
      { id:"error", eyebrow:"04 / 흐름 오류", title:"빠진 길은 어디일까요?", question:"판단 기호에서 [예] 길만 있다면 무엇을 고쳐야 할까요?", nodes:[["시작","terminal"],["비가 오는가?","decision"],["예 → 우산 챙기기","process"],["아니오 → ?","missing"]], options:["시작 기호 삭제","아니오 길을 연결","예 길도 삭제","판단 없이 항상 우산 챙기기"], answer:1, feedback:"판단에는 [예]와 [아니오] 흐름이 모두 필요해요." }
    ],
    sims: {
      sequence:{title:"순차 구조",description:"위에서 아래로 한 단계씩. 라면을 끓이는 일처럼 정해진 순서를 따라가요.",nodes:[["시작","terminal"],["물 붓기","io"],["물 끓이기","process"],["종료","terminal"]],path:[0,1,2,3]},
      decision:{title:"선택 구조",description:"조건을 확인하고 하나의 길을 선택해요. 재생할 때마다 다른 길을 보여 줍니다.",nodes:[["시작","terminal"],["키 ≥ 150cm?","decision"],["예: 탑승","io"],["아니오: 다음 기회","io"],["종료","terminal"]],path:[0,1,2,4],alternate:[0,1,3,4]},
      loop:{title:"반복 구조",description:"조건이 맞지 않으면 앞 단계로 돌아갑니다. 비밀번호를 다시 입력하는 흐름을 따라가요.",nodes:[["입력","io"],["7777인가?","decision"],["아니오: 다시 입력","process"],["예: 성공","io"]],path:[0,1,2,0,1,3]}
    },
    missions: [
      {id:1,title:"라면 끓이기",type:"순차 구조",description:"알맞은 블록을 선택한 뒤 빈칸을 눌러 순서대로 배치해 보세요.",slots:[["시작",null],["물 500ml 붓기","io"],["물 끓이기","process"],["면과 스프 넣기","process"],["종료",null]],bank:["면과 스프 넣기","물 500ml 붓기","물 끓이기"],output:"순서대로 실행되어 라면이 완성됐어요."},
      {id:2,title:"놀이기구 탑승",type:"선택 구조",description:"키를 입력받고 150cm 이상인지 판단해 두 길로 나누어 보세요.",slots:[["시작",null],["키 입력받기","io"],["키 ≥ 150cm?","decision"],["예: 탑승 가능 출력","io"],["아니오: 탑승 불가 출력","io"],["종료",null]],bank:["아니오: 탑승 불가 출력","키 ≥ 150cm?","예: 탑승 가능 출력","키 입력받기"],output:"조건에 따라 다른 길을 따라갑니다."},
      {id:3,title:"비밀번호 맞추기",type:"반복 구조",description:"비밀번호가 틀렸을 때 다시 입력 단계로 돌아오도록 흐름을 완성해 보세요.",slots:[["시작",null],["비밀번호 입력받기","io"],["7777인가?","decision"],["예: 성공 출력","io"],["아니오: 다시 입력","process"],["종료",null]],bank:["예: 성공 출력","아니오: 다시 입력","비밀번호 입력받기","7777인가?"],output:"틀리면 다시 입력하고, 맞으면 성공합니다."}
    ],
    walkthrough:[
      {title:"1. 현재 시각 확인",text:"오전 7시 알람을 듣고 현재 시각을 확인한다.",symbol:"자료",shape:"▱",reason:"시간 정보를 입력받습니다."},
      {title:"2. 기상 및 세수",text:"침대에서 일어나 세수를 한다.",symbol:"처리",shape:"▭",reason:"해야 할 동작을 수행합니다."},
      {title:"3. 시간에 따라 선택",text:"7시 30분 이전인가? 예: 아침밥 / 아니오: 바로 출발",symbol:"판단",shape:"◇",reason:"조건에 따라 두 길로 나뉩니다."},
      {title:"4. 버스 타러 가기",text:"갈라진 길이 합쳐져 등교 버스를 타러 간다.",symbol:"처리 → 단말",shape:"▭ → ⬭",reason:"마지막 동작 후 흐름을 끝냅니다."}
    ]
  };
})();
