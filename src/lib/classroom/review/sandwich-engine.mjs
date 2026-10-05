// Extracted from algorithm-studio bc8d51f; browser/UI state removed.

export function initialSandwich() { return {
      bagOpened: false, breadOnPlate: 0, jamOpened: false, pbOpened: false,
      cheeseUnwrapped: false, cheeseOnBread: null, cheesePlasticIncluded: false,
      knifeHolding: 'none', bread1Spread: 'none', bread2Spread: 'none',
      isFlippedCover: false, completed: false
    }; }

export function reviewSandwich(state) {
      const hasJam = (state.bread1Spread.includes('jam') || state.bread2Spread.includes('jam'));
      const hasJamEdge = (state.bread1Spread === 'jam_edge' || state.bread2Spread === 'jam_edge');
      const hasPB = (state.bread1Spread.includes('pb') || state.bread2Spread.includes('pb'));
      const hasPBEdge = (state.bread1Spread === 'pb_edge' || state.bread2Spread === 'pb_edge');
      const hasCheese = state.cheeseOnBread !== null;
      const isPlastic = state.cheesePlasticIncluded;
      const isStickyOutside = (!state.isFlippedCover && state.bread2Spread !== 'none');

      let title = "맞춤형 샌드위치";
      let review = "";
      let isFlawless = true;
      let badgeType = "perfect";

      if (isPlastic) {
        title = "플라스틱 비닐 치즈 샌드위치";
        review = "⚠️ 치즈 비닐을 벗기지 않고 그대로 넣었습니다! 이대로 먹으면 배탈나요. 🏥";
        isFlawless = false;
        badgeType = "clumsy";
      } else if (isStickyOutside) {
        title = "손잡이 끈적 샌드위치";
        review = "⚠️ '마주보게 포개어라'는 지시가 없어서 잼/버터가 샌드위치 바깥면에 그대로 노출되었습니다! 잡는 순간 손이 끈적끈적 대참사 발생! 🍯";
        isFlawless = false;
        badgeType = "clumsy";
      } else if (hasJamEdge || hasPBEdge) {
        title = "모서리 테두리 샌드위치";
        review = "⚠️ '넓은 면'이라는 지시가 없어서 식빵 윗모서리 테두리에만 잼/버터를 발랐습니다! 속은 퍽퍽한 사막 샌드위치입니다! 🏜️";
        isFlawless = false;
        badgeType = "clumsy";
      } else if (!hasJam && !hasPB && !hasCheese) {
        title = "속 빈 맨식빵 샌드위치";
        review = "⚠️ 아무런 재료도 바르지 않고 맨 빵 두 장만 덮었습니다. 다이어트에는 좋을지도요? 🍞";
        isFlawless = false;
        badgeType = "clumsy";
      } else {
        if (hasJam && hasPB && hasCheese) title = "트리플 PB&J 치즈 샌드위치";
        else if (hasJam && hasPB) title = "정통 PB&J (딸기잼+땅콩버터) 샌드위치";
        else if (hasJam && hasCheese) title = "달콤 짭짤 딸기잼 치즈 샌드위치";
        else if (hasPB && hasCheese) title = "고소 짭짤 땅콩버터 치즈 샌드위치";
        else if (hasJam) title = "달콤한 딸기잼 샌드위치";
        else if (hasPB) title = "고소한 땅콩버터 샌드위치";
        else if (hasCheese) title = "클래식 체다 치즈 샌드위치";

        review = "✨ 마주보게 깔끔하게 포개고 재료도 정석대로 도포된 완벽한 샌드위치입니다! 미슐랭 셰프가 인정합니다. 👏";
        badgeType = "perfect";
      }

      return { title, review, isFlawless, badgeType, isStickyOutside };
    }

export function parseSandwichCommand(text) {
      const t = text.trim();
      const clauses = t.split(/(?:하고|한 뒤|한 후|다음에|그리고|,|\n)\s*/).filter(Boolean);
      if (clauses.length > 1) {
        const results = clauses.map(clause => parseSandwichCommand(clause));
        if (results.some(result => !result || result.type !== 'ACTION')) return { type:'CLARIFY', clarify_message:'동작을 한 문장씩 나누어 입력해 주세요.' };
        return { type:'ACTION', actions:results.flatMap(result=>result.actions) };
      }
      const actions = [];

      if (t.includes('알아서') || t.includes('대충') || t.includes('맛있게') || (t.includes('샌드위치') && t.includes('만들어') && !t.includes('열') && !t.includes('발라'))) {
        return { type: 'CLARIFY', clarify_message: "로봇은 '알아서'라는 명령을 이해할 수 없습니다. 빵 봉지를 열어야 할까요, 잼 뚜껑을 열까요? 구체적인 첫 단계를 지시해주세요!" };
      }

      if (t.includes('봉지') || t.includes('봉다리')) {
        if (t.includes('열') || t.includes('뜯') || t.includes('까') || t.includes('개봉') || t.includes('풀')) {
          actions.push('OPEN_BAG');
        }
      }

      if (t.includes('식빵') || t.includes('빵')) {
        if (t.includes('꺼내') || t.includes('놓') || t.includes('올려') || t.includes('배치') || t.includes('준비')) {
          if (t.includes('2') || t.includes('두') || t.includes('두장') || t.includes('둘')) {
            actions.push('TAKE_BREAD', 'TAKE_BREAD');
          } else {
            actions.push('TAKE_BREAD');
          }
        }
      }

      if (t.includes('잼') && (t.includes('뚜껑') || t.includes('따') || t.includes('열'))) {
        if (!t.includes('발라') && !t.includes('묻혀') && !t.includes('떠')) actions.push('OPEN_JAM');
      }
      if ((t.includes('땅콩') || t.includes('버터')) && (t.includes('뚜껑') || t.includes('따') || t.includes('열'))) {
        if (!t.includes('발라') && !t.includes('묻혀') && !t.includes('떠')) actions.push('OPEN_PB');
      }

      if (t.includes('치즈') && (t.includes('비닐') || t.includes('껍질') || t.includes('포장')) && (t.includes('벗') || t.includes('까') || t.includes('뜯') || t.includes('제거'))) {
        actions.push('UNWRAP_CHEESE');
      }

      if ((t.includes('칼에') || t.includes('나이프에')) && (t.includes('묻') || t.includes('떠') || t.includes('발라') || t.includes('퍼'))) {
        if (t.includes('땅콩') || t.includes('버터')) actions.push('SCOOP_PB');
        else actions.push('SCOOP_JAM');
      }

      if (t.includes('발라') || t.includes('칠해') || t.includes('도포') || t.includes('문질')) {
        const isTargetBread2 = t.includes('식빵2') || t.includes('식빵 2') || t.includes('오른쪽');
        const isFlat = t.includes('넓은') || t.includes('표면') || t.includes('면적') || t.includes('골고루') || t.includes('가운데');
        const isPB = t.includes('땅콩') || t.includes('버터');

        if (isTargetBread2) {
          if (isPB) actions.push(isFlat ? 'SPREAD_PB_BREAD2_FLAT' : 'SPREAD_PB_BREAD2_EDGE');
          else actions.push(isFlat ? 'SPREAD_JAM_BREAD2_FLAT' : 'SPREAD_JAM_BREAD2_EDGE');
        } else {
          if (isPB) actions.push(isFlat ? 'SPREAD_PB_BREAD1_FLAT' : 'SPREAD_PB_BREAD1_EDGE');
          else actions.push(isFlat ? 'SPREAD_JAM_BREAD1_FLAT' : 'SPREAD_JAM_BREAD1_EDGE');
        }
      }

      if (t.includes('치즈') && (t.includes('올려') || t.includes('얹') || t.includes('넣'))) {
        if (t.includes('식빵2') || t.includes('오른쪽')) actions.push('PUT_CHEESE_BREAD2');
        else actions.push('PUT_CHEESE_BREAD1');
      }

      if (t.includes('덮') || t.includes('합쳐') || t.includes('포개') || t.includes('완성')) {
        if (t.includes('마주') || t.includes('뒤집') || t.includes('안쪽')) {
          actions.push('COVER_BREAD_FLIPPED');
        } else {
          actions.push('COVER_BREAD_NORMAL');
        }
      }

      if (actions.length > 0) {
        if (actions.length>1 && !actions.every(action=>action==='TAKE_BREAD')) return {type:'CLARIFY',clarify_message:'순서가 바뀌지 않도록 동작을 하나씩 나누어 입력해 주세요.'};
        return { type: 'ACTION', actions: actions };
      }
      return null;
    }

export function stepSandwich(state, action) {
      switch(action) {
        case 'OPEN_BAG':
          state.bagOpened = true;
          return { success: true, name: "봉지 열기", msg: "빵 봉지를 열었습니다." };

        case 'TAKE_BREAD':
          if (!state.bagOpened) return { success: false, name: "식빵 꺼내기", msg: "오류: 빵 봉지가 닫혀 있습니다!" };
          state.breadOnPlate = Math.min(state.breadOnPlate + 1, 2);
          return { 
            success: true, 
            name: "식빵 꺼내기", 
            msg: state.breadOnPlate === 1 ? "식빵 1을 접시 왼쪽에 놓았습니다." : "식빵 2를 접시 오른쪽에 놓았습니다." 
          };

        case 'OPEN_JAM':
          state.jamOpened = true;
          return { success: true, name: "딸기잼 뚜껑 열기", msg: "딸기잼 뚜껑을 열었습니다." };

        case 'OPEN_PB':
          state.pbOpened = true;
          return { success: true, name: "땅콩버터 뚜껑 열기", msg: "땅콩버터 뚜껑을 열었습니다." };

        case 'UNWRAP_CHEESE':
          state.cheeseUnwrapped = true;
          return { success: true, name: "치즈 비닐 제거", msg: "치즈의 비닐 포장을 벗겨냈습니다." };

        case 'SCOOP_JAM':
          if (!state.jamOpened) return { success: false, name: "딸기잼 뜨기", msg: "오류: 딸기잼 뚜껑이 닫혀 있습니다!" };
          state.knifeHolding = 'jam';
          return { success: true, name: "딸기잼 뜨기", msg: "칼에 딸기잼을 묻혔습니다." };

        case 'SCOOP_PB':
          if (!state.pbOpened) return { success: false, name: "땅콩버터 뜨기", msg: "오류: 땅콩버터 뚜껑이 닫혀 있습니다!" };
          state.knifeHolding = 'pb';
          return { success: true, name: "땅콩버터 뜨기", msg: "칼에 땅콩버터를 묻혔습니다." };

        case 'SPREAD_JAM_BREAD1_EDGE':
          if (state.breadOnPlate === 0) return { success: false, name: "식빵1 잼 도포", msg: "오류: 접시에 식빵이 없습니다!" };
          if (state.knifeHolding !== 'jam') return { success: false, name: "식빵1 잼 도포", msg: "오류: 칼에 딸기잼이 없습니다!" };
          state.bread1Spread = 'jam_edge';
          state.knifeHolding = 'none';
          return { success: true, name: "식빵1 모서리 도포", msg: "⚠️ [글자 그대로 실행]: '넓은 면' 지시가 없어 식빵 1 윗모서리 테두리에만 잼을 발랐습니다!" };

        case 'SPREAD_PB_BREAD1_EDGE':
          if (state.breadOnPlate === 0) return { success: false, name: "식빵1 땅콩버터 도포", msg: "오류: 접시에 식빵이 없습니다!" };
          if (state.knifeHolding !== 'pb') return { success: false, name: "식빵1 땅콩버터 도포", msg: "오류: 칼에 땅콩버터가 없습니다!" };
          state.bread1Spread = 'pb_edge';
          state.knifeHolding = 'none';
          return { success: true, name: "식빵1 모서리 도포", msg: "⚠️ [글자 그대로 실행]: '넓은 면' 지시가 없어 식빵 1 윗모서리 테두리에만 땅콩버터를 발랐습니다!" };

        case 'SPREAD_JAM_BREAD1_FLAT':
          if (state.breadOnPlate === 0) return { success: false, name: "식빵1 잼 도포", msg: "오류: 접시에 식빵이 없습니다!" };
          if (state.knifeHolding !== 'jam') return { success: false, name: "식빵1 잼 도포", msg: "오류: 칼에 딸기잼이 없습니다!" };
          state.bread1Spread = 'jam_flat';
          state.knifeHolding = 'none';
          return { success: true, name: "식빵1 잼 도포", msg: "식빵 1 넓은 면에 딸기잼을 골고루 펴 발랐습니다." };

        case 'SPREAD_PB_BREAD1_FLAT':
          if (state.breadOnPlate === 0) return { success: false, name: "식빵1 땅콩버터 도포", msg: "오류: 접시에 식빵이 없습니다!" };
          if (state.knifeHolding !== 'pb') return { success: false, name: "식빵1 땅콩버터 도포", msg: "오류: 칼에 땅콩버터가 없습니다!" };
          state.bread1Spread = 'pb_flat';
          state.knifeHolding = 'none';
          return { success: true, name: "식빵1 땅콩버터 도포", msg: "식빵 1 넓은 면에 땅콩버터를 골고루 발랐습니다." };

        case 'SPREAD_JAM_BREAD2_EDGE':
          if (state.breadOnPlate < 2) return { success: false, name: "식빵2 잼 도포", msg: "오류: 접시에 식빵 2가 없습니다!" };
          if (state.knifeHolding !== 'jam') return { success: false, name: "식빵2 잼 도포", msg: "오류: 칼에 딸기잼이 없습니다!" };
          state.bread2Spread = 'jam_edge';
          state.knifeHolding = 'none';
          return { success: true, name: "식빵2 모서리 도포", msg: "⚠️ [글자 그대로 실행]: '넓은 면' 지시가 없어 식빵 2 윗모서리 테두리에만 잼을 발랐습니다!" };

        case 'SPREAD_PB_BREAD2_EDGE':
          if (state.breadOnPlate < 2) return { success: false, name: "식빵2 땅콩버터 도포", msg: "오류: 접시에 식빵 2가 없습니다!" };
          if (state.knifeHolding !== 'pb') return { success: false, name: "식빵2 땅콩버터 도포", msg: "오류: 칼에 땅콩버터가 없습니다!" };
          state.bread2Spread = 'pb_edge';
          state.knifeHolding = 'none';
          return { success: true, name: "식빵2 모서리 도포", msg: "⚠️ [글자 그대로 실행]: '넓은 면' 지시가 없어 식빵 2 윗모서리 테두리에만 땅콩버터를 발랐습니다!" };

        case 'SPREAD_JAM_BREAD2_FLAT':
          if (state.breadOnPlate < 2) return { success: false, name: "식빵2 잼 도포", msg: "오류: 접시에 식빵 2가 없습니다!" };
          if (state.knifeHolding !== 'jam') return { success: false, name: "식빵2 잼 도포", msg: "오류: 칼에 딸기잼이 없습니다!" };
          state.bread2Spread = 'jam_flat';
          state.knifeHolding = 'none';
          return { success: true, name: "식빵2 잼 도포", msg: "식빵 2 넓은 면에 딸기잼을 골고루 펴 발랐습니다." };

        case 'SPREAD_PB_BREAD2_FLAT':
          if (state.breadOnPlate < 2) return { success: false, name: "식빵2 땅콩버터 도포", msg: "오류: 접시에 식빵 2가 없습니다!" };
          if (state.knifeHolding !== 'pb') return { success: false, name: "식빵2 땅콩버터 도포", msg: "오류: 칼에 땅콩버터가 없습니다!" };
          state.bread2Spread = 'pb_flat';
          state.knifeHolding = 'none';
          return { success: true, name: "식빵2 땅콩버터 도포", msg: "식빵 2 넓은 면에 땅콩버터를 골고루 발랐습니다." };

        case 'PUT_CHEESE_BREAD1':
          if (state.breadOnPlate === 0) return { success: false, name: "치즈 올리기", msg: "오류: 접시에 식빵 1이 없습니다!" };
          state.cheeseOnBread = 1;
          if (!state.cheeseUnwrapped) {
            state.cheesePlasticIncluded = true;
            return { success: true, name: "치즈 올리기", msg: "💥 [오류]: 비닐을 안 벗겨서 플라스틱째 식빵 1 위에 얹었습니다!" };
          }
          return { success: true, name: "치즈 올리기", msg: "치즈를 식빵 1 위에 얹었습니다." };

        case 'PUT_CHEESE_BREAD2':
          if (state.breadOnPlate < 2) return { success: false, name: "치즈 올리기", msg: "오류: 접시에 식빵 2가 없습니다!" };
          state.cheeseOnBread = 2;
          if (!state.cheeseUnwrapped) {
            state.cheesePlasticIncluded = true;
            return { success: true, name: "치즈 올리기", msg: "💥 [오류]: 비닐을 안 벗겨서 플라스틱째 식빵 2 위에 얹었습니다!" };
          }
          return { success: true, name: "치즈 올리기", msg: "치즈를 식빵 2 위에 얹었습니다." };

        case 'COVER_BREAD_NORMAL':
          if (state.breadOnPlate < 2) return { success: false, name: "식빵 덮기", msg: "오류: 덮을 두 번째 식빵이 접시에 없습니다!" };
          state.completed = true;
          state.isFlippedCover = false;
          return { success: true, name: "식빵 덮기", msg: "식빵 2를 식빵 1 위에 덮었습니다." };

        case 'COVER_BREAD_FLIPPED':
          if (state.breadOnPlate < 2) return { success: false, name: "마주보게 덮기", msg: "오류: 덮을 두 번째 식빵이 접시에 없습니다!" };
          state.completed = true;
          state.isFlippedCover = true;
          return { success: true, name: "마주보게 덮기", msg: "식빵 2를 뒤집어 잼/버터 면이 마주보도록 깔끔하게 포개었습니다." };

        default:
          return { success: false, name: "알 수 없음", msg: `알 수 없는 명령: ${action}` };
      }
    }

export const sandwichActions = ["OPEN_BAG", "TAKE_BREAD", "OPEN_JAM", "OPEN_PB", "UNWRAP_CHEESE", "SCOOP_JAM", "SCOOP_PB", "SPREAD_JAM_BREAD1_EDGE", "SPREAD_PB_BREAD1_EDGE", "SPREAD_JAM_BREAD1_FLAT", "SPREAD_PB_BREAD1_FLAT", "SPREAD_JAM_BREAD2_EDGE", "SPREAD_PB_BREAD2_EDGE", "SPREAD_JAM_BREAD2_FLAT", "SPREAD_PB_BREAD2_FLAT", "PUT_CHEESE_BREAD1", "PUT_CHEESE_BREAD2", "COVER_BREAD_NORMAL", "COVER_BREAD_FLIPPED"];

export function replaySandwich(commands) { const state = initialSandwich(); const steps = commands.flatMap(command => command.actions.map(action => ({ action, ...stepSandwich(state, action), state: { ...state } }))); return { state, steps, review: reviewSandwich(state) }; }

