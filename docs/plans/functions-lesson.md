# 함수 수업 추가 계획

작성: 2026-11-01(Asia/Seoul). 진행 중 계획입니다. 반영하면 학생이 보는 구성은 [PRD §4](../PRD.md#4-수업-카탈로그-명세), 구현 세부는 [DEVELOPMENT §4.1](../DEVELOPMENT.md#41-entryjs-4023-실습-환경)로 옮기고 이 문서는 보관합니다. 1차안을 Codex·Gemini(agy) 두 검토자와 함께 고친 판입니다(§13). 승인된 설계의 구현 계획은 §14입니다.

## 1. 의도와 목표

- **의도:** 네 번째 엔트리 정규 수업으로 **함수와 디버깅**을 더합니다. 교과서(길벗 2022 개정 중학교 정보) 128~135쪽 「함수와 디버깅」을 따릅니다. 학생이 첫 화면에서 "함수 = 어려운 수학"으로 겁먹지 않도록, **용어보다 몸으로 하는 비트 만들기를 먼저** 하고 용어는 활동 뒤에 붙입니다(사용자 결정).
- **목표:** 학생이 ① 함수는 이름 붙인 명령 묶음이고 ② 만들기(정의)만으로는 실행되지 않으며 부르기(호출)를 해야 실행되고 ③ 정의를 고치면 부르는 모든 곳이 바뀌며 ④ 예상과 다른 결과를 찾아 고치고 다시 실행한다(디버깅)는 것을 설명하고 엔트리에서 해 볼 수 있습니다.
- **하지 않는 것:** 값을 넣는 함수(매개변수)·값을 돌려주는 함수·지역 변수, 소리 블록, 다른 수업 작품을 이어 쓰는 과제, 서술형 답안.
- **실패로 보는 것(돌아가도 실패):**
  - 미션은 통과했는데 정의와 호출의 차이를 모름(예: 함수 밖에서 그려도 통과).
  - 비트 활동이 길어져 실습 시간을 잡아먹음, 또는 쑥스러운 학생이 지목되어 흥미를 잃음.
  - 맞게 만든 작품을 채점이 떨어뜨림(숨은 조건, 이름 검사).
  - 함수 편집 중 저장·검증·이동이 작품을 잃거나 '저장 완료'를 잘못 보여 줌.
  - 함수가 없는 기존 작품의 키·검증 기록이 바뀜.
- **도입 비유:** 교과서 첫 예시인 달고나 틀과 공장 비유는 '같은 것을 많이 찍는다'가 강조되어 지난 반복 수업과 구별되지 않고, 이번 수업의 함수에는 재료도 제품도 없어 도입에서 쓰지 않습니다. 값을 넣는 함수를 다룰 때 붕어빵 틀 비유로 씁니다(§11).

## 2. 사용자 결정

2026-11-01 사용자가 아래 제안을 모두 승인했습니다. 전체 E2E 실행과 push·병합 승인 범위는 구현을 시작할 때 따로 정합니다.

| 항목 | 결정 | 이유 |
| :--- | :--- | :--- |
| 수업 ID·이름 | `functions` · 「나만의 명령, 함수」 | 주제명 ID 규칙([PRD §4.4](../PRD.md#44-신규-수업-메타데이터-스키마-규약-lesson-metadata-contract)) |
| 값을 넣는 함수 | 넣지 않음 | 정의·호출에 집중. 교과서 동물 레이싱(135쪽)은 선생님 시연으로 |
| 고양이 미션 방향키 | ←·→ 두 개 | 20분 안에 기본 미션 셋을 끝내도록 |
| 기본 미션 셋을 이 시간에 모두 끝내야 하는지 | 한 차시 안 완료를 목표로 하되, 못 끝낸 학생은 다음 시간 앞 10분에 이어 하기 | 미완료는 진도에 미완료로 남음([PRD §3.1](../PRD.md#31-수업-3단계-라이프사이클-및-진도-측정)). 끝내야 한다면 시작 작품에 더 많이 채워 줌 |
| 반영 경로 | PR 경로 | 새 수업·저장 파서 변경([DEVELOPMENT §2.1](../DEVELOPMENT.md#위험도별-반영-경로)). 전체 E2E 여부는 시작할 때 정함 |

## 3. 40분 수업 흐름

| 구간 | 시간 | 내용 |
| :--- | :--- | :--- |
| 도입 | 5분(넘으면 4번 순서를 건너뜀) | 비트 만들기(§4) |
| 개념 | 8분 | 앱 개념 카드 5개(§5) |
| 퀴즈 | 5분 | 앱 퀴즈 5문항(§6) |
| 실습 | 20분 | 선생님 시연 3 → 고양이 걸음 5 → 창문 두 개 6 → 고장 난 도형 4 → 제출 확인 2 |
| 정리 | 2분 | "오늘 만든 함수 이름 하나와, 어디서 불렀는지" 한 줄 말하기 |

시연 3분은 엔트리에서 [속성]-[함수]-[함수 추가하기] → 함수 편집 창에서 블록 넣기 → 편집 창의 저장 → 블록 꾸러미에 생긴 함수 블록 끼우기까지 한 번 보여 주는 시간입니다. 시간 배분은 처음 해 보는 학생 기준으로 풀어 보기 전까지 **확인하지 않은 값**입니다(§10).

## 4. 도입: 비트 만들기 (교사 진행, 앱 밖)

소리는 **쿵(두 손바닥으로 책상) · 짝(박수)** 두 가지뿐입니다. 옆 반이 신경 쓰이면 쿵을 무릎 치기로 바꿉니다. 시작 전에 **"선생님이 이름을 부르면 다 같이 쳐요. 치기 쑥스러우면 손가락으로 조용히 두드리거나 보기만 해도 돼요"**라고 신호를 먼저 알려 줍니다. 아무도 지목하거나 바로잡지 않습니다.

| 순서 | 교사 | 학생 | 남는 생각 (용어는 아직 말하지 않음) |
| :--- | :--- | :--- | :--- |
| 1. 적기만 하기 | **【비트】 = 쿵 · 쿵 · 짝**을 적고 잠깐 기다린 뒤 "지금 무슨 소리가 났나요?" | 아무도 치지 않음 | 적어 두기만 하면 아무 일도 없다 |
| 2. 부르기 | "비트!" → "비트, 비트!" | 쿵쿵짝 → 쿵쿵짝 쿵쿵짝 | 이름을 부르면 묶음이 차례로 실행된다 |
| 3. 곡 만들기 | **【브레이크】 = 짝 · 짝 · 짝 · "예!"**를 더 적고 악보 **비트 → 비트 → 브레이크 → 비트** | 악보대로 연주 | 이름을 이어 부르면 큰 곡이 된다 |
| 4. 반복과 함께 | 악보를 **비트 4번 반복 → 브레이크**로 바꿈 | 연주 | 반복은 몇 번 할지 정하고, 이름은 언제든 다시 부른다 |
| 5. 한 곳만 고치기 | 【비트】를 **쿵 · 짝 · 짝**으로 고치고 3번 악보를 다시 | 바뀐 비트로 연주 | 묶음 하나를 고치고 다시 연주하니 비트가 나오는 곳이 모두 바뀌었다 |

마무리 말: "칠판에 묶음을 적은 건 **함수 정의**, 이름을 부른 건 **함수 호출**이에요. 수학 시간의 함수와 닮은 점도 있지만, 오늘은 **이름 붙인 명령 묶음**만 생각하면 돼요." 모둠 발표와 '없는 이름 넣기'는 시간 때문에 넣지 않습니다. 디버깅은 실습의 고장 난 도형 미션에서 처음 다룹니다.

## 5. 개념 5개

공통 개념 화면(설명·예시·확인 문제)을 씁니다. 데이터에서는 첫 보기가 정답이고 화면에서는 `SHOWN`으로 섞습니다([PRD §3.4](../PRD.md#수업-내용-기준)). 같은 대상은 끝까지 같은 이름·값으로 씁니다: **비트·브레이크, 고양이 걸음, 창문 그리기(한 변 50, 창문 두 개)**.

| ID | 제목 | 설명 | 예시 | 확인 문제 → 정답 / 다른 보기 |
| :--- | :--- | :--- | :--- | :--- |
| `fc0` | 이름 하나로 여러 동작을 | 여러 명령을 하나로 묶고 이름을 붙이면, 이름만 불러도 묶인 명령이 차례로 실행돼요. 엔트리가 처음부터 주는 블록과 달리 내가 직접 만드는 '나만의 명령'이고, 이것을 함수라고 해요. | 【비트】 = 쿵·쿵·짝. "비트!" 하고 부르면 세 동작을 차례로 해요. | ‘비트 → 비트’를 연주하면 쿵은 모두 몇 번? → **4번** / 2번, 3번 |
| `fc1` | 만들기(정의)와 부르기(호출) | 함수를 만드는 것을 정의, 이름을 불러 실행하는 것을 호출이라고 해요. 정의만 하고 부르지 않으면 함수 안의 블록은 실행되지 않아요. 엔트리에서는 [속성]-[함수]-[함수 추가하기]로 만들고, 블록 꾸러미에 생긴 함수 블록을 끼워서 불러요. | 칠판에 비트를 적어만 두었을 때는 아무 소리도 나지 않았어요. | ‘고양이 걸음’ 함수를 만들기만 하고 어디에서도 부르지 않았어요. 시작하기를 누르면? → **아무 일도 일어나지 않아요** / 한 번 실행돼요, 계속 반복돼요 |
| `fc2` | 반복과 함수는 달라요 | 반복은 같은 일을 몇 번 할지, 언제까지 할지 정해요. 함수는 명령 묶음에 이름을 붙여 두고 필요한 곳 어디서든 불러요. 둘을 함께 쓸 수도 있어요. | 악보 ‘비트 4번 반복 → 브레이크 → 비트’에는 반복과 함수가 함께 있어요. | 곡의 맨 처음과 맨 끝, 떨어진 두 곳에 같은 동작 묶음을 넣으려 해요. 묶음을 한 번만 만들어 두고 두 곳에서 쓰는 방법은? → **묶음을 함수로 만들어 두 곳에서 불러요** / ‘2번 반복하기’ 안에 넣어요, 두 곳에 블록을 하나씩 다시 조립해요 |
| `fc3` | 정의를 고치면 모두 바뀌어요 | 함수 안을 고친 뒤 다시 실행하면, 그 함수를 부르는 모든 곳에 고친 내용이 쓰여요. 같은 블록을 여러 번 조립할 때보다 고치기 쉽고 실수가 줄어요. | ‘창문 그리기’를 두 곳에서 불러 한 변이 50인 창문 두 개를 그렸어요. 함수 안의 50을 80으로 고치고 다시 실행하면 두 창문이 모두 커져요. | ‘창문 그리기’를 두 곳에서 불러요. 두 창문을 모두 크게 하려면? → **함수 안의 길이 하나만 고쳐요** / 부르는 곳 두 군데를 모두 고쳐요, 함수를 하나 더 만들어요 |
| `fc4` | 오류를 찾아 고치는 디버깅 | 프로그램이 예상대로 움직이지 않는 상태를 오류라고 해요. 오류 찾기 → 원인 생각하기 → 고치기 → 다시 실행해 확인하기 순서로 고치는 과정을 디버깅이라고 해요. | 정오각형이 닫히지 않으면 회전 각도를 살펴보고, 360 ÷ 5 = 72°로 고친 뒤 다시 실행해요. | 코드를 고친 뒤 꼭 해야 하는 일은? → **다시 실행해 결과를 확인해요** / 바로 제출해요, 코드를 모두 지우고 새로 만들어요 |

개념 그림(`CONCEPT_VISUALS`)은 `fc0`에 비트 악보 카드, `fc2`에 '반복 상자 안의 함수 블록', `fc3`에 창문 두 개만 둡니다.

## 6. 퀴즈 5문항

반복 수업처럼 코드 줄을 읽고 결과를 고릅니다. 함수 정의는 엔트리 표기대로 `함수 정의하기 [이름]`으로 쓰고, 안쪽 블록은 `└`로 들여 씁니다. 개념에서 가르친 내용만 묻습니다(함수 안의 함수는 묻지 않음).

| ID | 장면 | 묻는 것 → 정답 / 다른 보기 |
| :--- | :--- | :--- |
| `calls` | `함수 정의하기 [별 찍기]` └ 도장 찍기 └ 이동 방향으로 50만큼 움직이기 / `시작하기 버튼을 클릭했을 때` └ 별 찍기 └ 별 찍기 └ 별 찍기 | 도장은 몇 번 찍힐까요? → **3번** / 1번(정의는 한 번뿐), 6번 |
| `repeat-call` | `함수 정의하기 [사각형 그리기]` └ 4번 반복하기 └└ 이동 방향으로 100만큼 움직이기 └└ 이동 방향을 90°만큼 회전하기 / `시작하기` └ 3번 반복하기 └└ 사각형 그리기 | ‘움직이기’는 모두 몇 번 실행될까요? → **12번** / 7번, 4번 |
| `edit-definition` | `함수 정의하기 [창문 그리기]` └ 그리기 시작하기 └ 4번 반복하기 └└ 이동 방향으로 50만큼 움직이기 └└ 이동 방향을 90°만큼 회전하기 └ 그리기 멈추기 / `시작하기` └ 창문 그리기 └ x 좌표를 100만큼 바꾸기 └ 창문 그리기 | 함수 안의 50을 80으로 고치고 다시 실행하면? → **두 창문 모두 한 변이 80** / 첫 창문만 80, 고치기 전처럼 둘 다 50 |
| `reset-bug` | `함수 정의하기 [점수 준비]` └ 점수를 0으로 정하기 / `시작하기` └ 계속 반복하기 └└ 점수 준비 └└ 만일 (마우스를 클릭했는가?)라면 └└└ 점수에 1만큼 더하기 | 클릭해도 점수가 1을 넘지 않는 까닭은? → **반복할 때마다 ‘점수 준비’가 점수를 0으로 되돌려서** / ‘더하기’가 실행되지 않아서, 함수 안에서는 변수를 바꿀 수 없어서 |
| `missing-call` | (`edit-definition`과 같은 ‘창문 그리기’) / `시작하기` └ 창문 그리기 └ x 좌표를 100만큼 바꾸기 | 창문이 하나만 그려졌어요. 무엇을 고칠까요? → **마지막에 ‘창문 그리기’를 한 번 더 불러요** / 함수 안에 ‘2번 반복하기’를 넣어요, x 좌표 블록을 지워요 |

`reset-bug`는 나중 블록깨기 수업의 '처음 상태로 되돌리기'로 이어집니다.

## 7. 실습 미션 (기본 3 + 선택 1)

모두 독립 작품이고 강아지 없는 작업실([PRD §4.1.3](../PRD.md#413-조건반복-수업의-강아지-없는-작업실))을 씁니다. 학생은 반복 수업에서 정사각형·정다각형을 이미 그려 봤습니다. **함수 이름은 채점하지 않습니다**(안내에만 씀). 대신 결과가 **함수 호출 안에서** 나왔는지를 봅니다(§8.4).

| 순서·미션 | 목표(학생에게 보이는 말) | 시작 작품 | 통과 기준 |
| :--- | :--- | :--- | :--- |
| 1 `cat-walk` 고양이 걸음 (교과서 134쪽) | ‘고양이 걸음’ 함수에 ‘다음 모양으로 바꾸기’를 넣어요. ←·→ 키를 누르면 그 방향으로 10만큼 움직인 뒤 고양이 걸음을 불러요. | 고양이(모양 5개) 하나 | 두 키를 여러 순서로 눌러 키마다 x가 ±10, 키마다 모양이 한 번 바뀜. 모양 바뀜은 **두 키가 같은 함수**를 부른 호출 안에서 일어나야 함 |
| 2 `windows` 창문 두 개 | ‘창문 그리기’ 함수로 한 변이 50인 정사각형을 그려요. 위치를 옮겨 한 번 더 불러, **서로 닿지 않는** 창문 두 개를 만들어요. | 엔트리봇 | 같은 함수의 **서로 다른 두 호출**이 각각 한 변 50인 닫힌 정사각형을 하나씩 그림. 두 정사각형의 테두리가 닿지 않음. 함수 밖에서 그린 선이 있으면 실패. 함수 안에서 반복을 쓰든 풀어 쓰든 통과 |
| 3 `fix-shapes` 고장 난 도형 고치기 (교과서 133쪽) | 정호의 코드는 정사각형·정오각형·정육각형을 그려야 하는데 이상하게 그려져요. 디버깅해서 세 도형을 모두 완성해요. | **고장 난 작품**(§8.6) | 한 변 50인 닫힌 정사각형·정오각형·정육각형이 각각 서로 다른 함수의 호출에서 그려짐. '시작 블록으로 다시 만들기'는 고장 난 작품으로 되돌림 |
| 선택 `flower` 꽃 피우기 | ‘꽃잎’ 함수(한 변 50인 정사각형)를 반복 안에서 6번 부르고, 부를 때마다 60°씩 돌아 꽃을 만들어요. | 엔트리봇 | 두 바퀴 이상 도는 반복 안의 호출 6개가 각각 정사각형을 그리고, 정사각형이 60°씩 돌아가 있음. 진도·완료 판정에는 넣지 않음 |

실패 안내 예시: "선이 함수 밖에서 그려졌어요. 그리는 블록을 함수 안으로 옮겨 보세요." / "창문 함수를 한 번만 불렀어요. 위치를 옮긴 뒤 한 번 더 불러 보세요." / "두 창문이 붙어 있어요. 더 멀리 옮긴 뒤 불러 보세요."

`windows`·`flower`의 조립 순서는 함수 맨 앞에 ‘그리기 시작하기’, 맨 끝에 ‘그리기 멈추기’를 넣게 안내해서 함수 사이의 이동에 선이 생기지 않게 합니다.

## 8. 앱 구현 범위

엔트리 4.0.23은 함수를 지원하지만 앱은 꺼 두었습니다(`public/entryjs/workspace.js`의 `functionEnable: false`, [PRD §4.1](../PRD.md#41-정규-수업-프로그래밍의-기초) '함수는 제공하지 않습니다'). 엔트리는 함수를 `functions: [{ id, type, localVariables, useLocalVariables, content }]`(`content`는 블록 줄을 JSON 문자열로 저장)로 내보내고, 호출 블록 종류는 `func_<함수 id>`입니다.

1. **사전 확인(코드 변경 전, 버리는 실험):** 함수 수업에서만 `functionEnable`을 켰을 때 수업 팔레트에 함수 메뉴가 뜨는지, 함수 편집 창이 격리 iframe·잠금 CSS와 충돌하지 않는지, 편집 중임을 알 수 있는 엔트리 상태 값이 무엇인지, 내보낸 함수 정의의 실제 모양(첫 블록·이름 블록·본문), 함수 삭제·이름 바꾸기 때 호출 블록이 어떻게 남는지를 확인해 이 문서에 적습니다.
2. **함수 편집 중 저장·검증·이동:** 함수 편집 창이 열려 있으면 작업실 작품을 읽어 오는 공통 단계(`captureDraft`가 쓰는 내보내기)가 "함수 편집 창에서 ‘저장’이나 ‘취소’를 먼저 눌러 주세요"로 **거절**합니다. 그래서 이 단계를 거치는 모든 동작, 곧 앱의 `저장`(Ctrl+S 포함)·조건 검증·제출·'저장 후 나가기'·**개념/퀴즈/실습 단계 바꾸기·미션 바꾸기**가 진행되지 않고 지금 작업실과 편집 창을 그대로 둡니다. 어느 동작도 이전 스냅샷으로 대신 진행하지 않고, '저장 완료'를 보여 주지 않습니다. 지금은 단계 바꾸기(`use-work.ts`의 `switchStage`)와 미션 바꾸기(`programming-lesson.tsx`의 `select`, 미션마다 작업실을 새로 만듦)도 이 단계를 거치므로, 막지 않으면 편집 중인 함수가 사라질 수 있습니다(가설). 이 거절은 **저장 실패가 아니라 잠깐 기다려 달라는 신호**로 따로 다룹니다.
   - **먼저 막기:** 작업실은 함수 편집 창이 열리고 닫힐 때 부모 화면에 알리고, 작품 읽기를 거치는 동작은 시작하기 전에 이 상태를 보고 안내만 띄운 채 멈춥니다.
   - **그래도 거절이 오면(경합):** 작품을 읽어 오는 모든 지점과 그것을 감싼 오류 처리가 이 신호를 실패가 아닌 중단으로 다룹니다. 지금 코드에서는 실습 버튼의 첫 내보내기(`entry-practice-workspace.tsx`의 `act` → `readProject`, `preparing` 해제가 `finally`에 없음)와 `use-work.ts`의 `captureDraft`·`flush`·`switchStage`·`prepareLeave`입니다. 이들은 실패하면 `fail()`로 `blocked`를 켜고 저장 상태를 '실패'로 바꿔, 편집 창을 닫은 뒤에도 검증·제출(`perform`)이 다시 저장할 때까지 막힙니다.
   - 이 신호에는 `fail()`을 부르지 않고, 저장 상태·오류 표시를 바꾸지 않으며(`flush`는 이전 저장 상태로 되돌림), `preparing` 같은 진행 표시는 `finally`에서 항상 풉니다. 진짜 실패·충돌 처리는 지금대로 둡니다.
   - 편집 창을 닫으면 따로 저장·재시도하지 않아도 저장·검증·제출·단계/미션 바꾸기가 바로 됩니다. 편집 창을 자동으로 닫아 저장하는 방식은 학생이 의도하지 않은 반쯤 만든 함수를 저장할 수 있어 쓰지 않습니다.
3. **편집기 잠금:** 다른 수업은 지금처럼 끕니다. 함수 수업은 일반 함수만 받고 값 반환 함수(`function_create_value`)·매개변수(`function_param_string`·`function_param_boolean`)·지역 변수는 편집기에서 숨기거나 막습니다(기존 `variable-locked` 방식). 서버도 같은 것을 거절합니다(§8.3).
4. **채점기:** `func_<id>`를 만나면 정의 본문을 실행합니다. 호출할 때마다 **호출 기록**(호출 번호·함수 id·자신을 부른 호출 번호)을 하나 만들고, 그린 선과 모양 바뀜에는 **바로 그 선을 그린 호출**의 번호를 붙입니다. 어떤 호출의 결과를 볼 때는 그 호출과 그 안에서 부른 호출들의 선을 함께 봅니다. 그래서 `집 그리기` 함수 안에서 `창문 그리기`를 두 번 부르거나 `flower`의 반복을 다른 함수로 감싸도 통과합니다. 판정 규칙은 다음과 같습니다.
   - `cat-walk`: 키를 누를 때마다 모양이 한 번 바뀌고, 그 바뀜이 두 키 모두 같은 함수의 호출 안에서(그 호출이 부른 호출 포함) 일어남.
   - `windows`: 같은 함수의 서로 다른 두 호출이 각각 한 변 50인 닫힌 정사각형 하나를 그림.
   - `fix-shapes`: 서로 다른 세 함수의 호출이 각각 정사각형·정오각형·정육각형 하나를 그림.
   - `flower`: 반복 안에서 실행된 같은 함수의 호출 6개가 각각 정사각형 하나를 그림.
   - 바깥에서 감싸는 함수가 있어도 위 판정을 막지 않습니다.

   도형 판정은 선을 **호출별로 나눈 뒤** 기존처럼 보이는 선으로 합쳐 기하 판정(닫힘·같은 변·같은 회전각)만 합니다. 반복 수업의 '두 바퀴 이상 그린 반복 안' 조건(`regular`의 `repeated`·`again`)은 이 수업 도형에 쓰지 않고, `flower`의 호출에만 '두 바퀴 이상 도는 반복 안' 조건을 둡니다. 키 미션은 고양이 오브젝트를 실행 주체로 넘겨 모양 바뀜을 기록합니다(지금 `run()`은 주체 없이 실행). 호출 깊이는 20을 넘으면 실패시키고, 블록 20,000개 등 기존 실행 한도를 함께 씁니다.
5. **저장 파서 (`programming-entry.ts`):** `functions`를 읽어 검증하고 다시 조립합니다.
   - 받는 것: `type`이 일반 함수, 지역 변수 없음, 정의 첫 블록이 `function_create`이고 이름은 글자 이름 블록만(매개변수 블록 거절), 본문은 팔레트 블록과 이 작품의 `func_<id>`만.
   - 상한: 함수 10개, 이름 20자(다듬은 뒤), 기존 블록 수·중첩 한도와 `MAX_PROJECT_BYTES`(32,768)를 함수 본문까지 합쳐 적용.
   - id: 엔트리가 만든 형식만 받고, 작품에 없는 함수를 부르는 블록은 학생 변수의 '대상 없음'처럼 저장은 하되 교사 문장은 '대상 없음', 채점기는 실행될 때 다시 연결하라는 문구로 실패.
   - **함수가 없는 작품의 `key`는 바꾸지 않습니다**(학생 변수와 같은 방식). `tests/fixtures/entry-legacy-keys.json`이 그대로 통과해야 합니다.
   - `missionBlockIssue`는 채점 줄에서 **닿을 수 있는 함수 정의만** 따라가며(서로 부르는 함수도 한 번씩만) 미션 허용 블록을 검사하고, 호출 블록은 이 작품의 함수면 허용합니다.
6. **시작 작품 (`missionStarter`):**
   - `cat-walk`: 고양이 하나, 가운데, 첫 모양, 코드 없음.
   - `fix-shapes`: 엔트리봇이 (−200, 0)에서 오른쪽을 보고 그리기 멈춘 상태. 함수 셋은 모두 `그리기 시작하기 → N번 반복하기(이동 방향으로 50만큼 움직이기, 이동 방향을 360/N°만큼 회전하기) → 그리기 멈추기`이고, 오류는 둘입니다: **오각형의 회전이 90°**, **육각형 호출이 빠짐**. 시작하기 줄은 `사각형 그리기 → x 좌표를 130만큼 바꾸기 → 오각형 그리기 → x 좌표를 130만큼 바꾸기`(여기에 육각형 그리기를 더해야 함)입니다. 닫힌 도형은 출발점·방향으로 돌아오므로 세 도형은 대략 x −200~−150, −85~−5, 35~135에 그려져 서로 닿지 않고 무대(가로 ±240) 안에 들어갑니다(계산값, 실제 무대에서 확인).
7. **화면 쪽 연결:**
   - 미저장 판단(`src/components/student/work-draft.ts`의 `programmingContent`)에 함수를 넣어, 함수 본문만 고쳐도 저장할 변경으로 봅니다(함수가 없으면 지금 모양 그대로).
   - 실행 감시(`workspace.js`의 `keepsDrawing`)가 실행 줄에서 부르는 함수 본문의 붓 블록까지 보게 합니다. 지금은 실행 줄의 블록만 봐서, 함수 안에서만 그리면 실행이 끝날 때 선이 지워질 수 있습니다(가설, 사전 확인에서 재현).
   - 교사 열람: 함수 정의는 "함수 ‘창문 그리기’"와 본문 블록 목록, 호출은 "‘창문 그리기’ 부르기".
8. **수업 데이터·등록:** `functions-data.ts`·`functions-lesson.ts`, `catalog.ts`(반복 수업 다음), 서버 `solutions.ts`, `PROGRAMMING_MISSIONS`·`LESSON_MISSIONS`·`MISSION_BLOCKS`·`FREE_MISSIONS`, 함수 메뉴 블록은 `entry-palette.ts`와 `workspace.js` 복사본 양쪽, [수업 추가 체크리스트](../DEVELOPMENT.md#신규-수업-추가-및-선별-검증-연동-체크리스트) 1~4단계.
9. **문서:** PRD §4 표와 새 절(§4.1.4), PRD §4.1의 '함수는 제공하지 않습니다' 문구, DEVELOPMENT §4.1의 함수 저장·채점, HANDOFF.

## 9. 빌더에게 맡기는 것

함수 편집 중 상태를 읽는 정확한 방법, 잠금 방식(숨김·막기), 내부 자료 구조와 파일 나누기, 실패 안내 문구의 최종 다듬기, 세 도형의 정확한 좌표(닿지 않는 범위 안), 교사 열람 문장의 세부 표기. §8의 규칙을 바꾸지 않는 범위에서 정합니다.

## 10. 검증 계획

- **단위:** 파서(함수 있음·없음·대상 없음·상한 초과·매개변수/값 함수 거절), 채점(미션별 통과 해답, 함수 밖 선, 한 번만 호출, 같은 자리 두 번 호출, 붙은 창문, 키마다 다른 함수, 재귀·서로 부르는 함수, **다른 함수로 감싼 창문·꽃은 통과**), 안내대로 만든 해답 통과(`tests/entry-palette.test.ts`), 기존 고정 키 회귀 없음.
- **선별 E2E:** 함수 만들기 → 호출 → 저장 → 새로고침 복원, 함수 본문만 고친 뒤 미저장 표시, 함수 편집 중 Ctrl+S·검증·제출·다른 화면 이동·단계 바꾸기·미션 바꾸기(모두 막히고 편집 내용이 남는지, 실습 버튼의 첫 내보내기를 포함해 각 동작을 거절당한 뒤 편집 창을 닫으면 저장·재시도 없이 바로 되고 진행 중 표시가 남지 않는지), 함수 이름 바꾸기·삭제·편집 취소, 함수 안에서만 그린 선이 실행 뒤 남는지, 미션별 검증·제출, 교사 작품 보기, 1,024px 작업실.
- **시간:** 처음 해 보는 학생 기준으로 기본 미션 셋을 풀어 실습 20분 배분(§3)을 확인합니다. 선생님 미리보기 시간만으로는 판단하지 않습니다.

## 11. 제외한 것과 이유

- **값을 넣는 함수:** §2. 다음 단계로 둘 때는 붕어빵 틀(같은 틀에 팥·슈크림만 바꿔 넣기) 비유로 도입합니다.
- **소리로 연주하는 '비트 메이커' 미션:** 도입과 바로 이어지지만 소리 블록·소리 탭·소리 채점을 새로 열어야 합니다.
- **함수 안의 함수 퀴즈:** 개념에서 가르치지 않으므로 뺐습니다. 미션에서 학생이 써도 통과합니다.
- **블록깨기 코드를 함수로 묶는 도전, 서술형 설명:** 독립 작품 원칙과 앱 기능 밖입니다. 설명은 정리 2분에 말로 합니다.
- **도입의 모둠 발표·'없는 이름' 순서:** 5분을 넘기기 쉬워 뺐습니다.

## 12. 위험

- 함수 편집 창은 엔트리가 작업판을 바꾸는 별도 상태라 저장·감시와 어긋날 수 있습니다. §8.1에서 먼저 확인합니다.
- 함수 정의가 작품 크기를 늘립니다. 고장 난 도형 시작 작품이 32,768바이트 안에 들어가는지 확인합니다.
- 시간 배분(§3)과 도입 5분은 실제 수업 전까지 확인하지 않은 값입니다.

## 13. 검토 기록

1차안(11/1)을 Codex와 Gemini(agy)가 따로 검토했고 둘 다 '고치면 동의'였습니다. 반영한 것: 함수 편집 중 저장 규칙 확정(둘), 가르치지 않은 '함수 안의 함수' 퀴즈 교체(둘), 이름·값 통일(둘), 미션 순서를 쉬운 고양이 걸음부터(agy), 도입 신호 미리 알리기·5분 상한·지목 금지(Codex), 개념 문구 정확도(수학 함수, 고친 뒤 다시 실행, 반복의 정의, Codex), `fc2` 보기 모호성(Codex), 반복 조건을 도형 판정에서 분리(Codex), 호출별로 선 나누기(Codex), 미저장 판단·실행 감시 연결(Codex), 파서·`missionBlockIssue` 규칙과 시작 작품 명세(둘). 반영하지 않은 것: 편집 창 자동 닫기(§8.2의 이유, 둘 다 동의), 함수 안 블록 구성만 보는 정적 채점(같은 자리에 두 번 부르고 함수 밖에서 하나 더 그리는 작품을 거르지 못함, agy 동의).

2차안에서 agy는 동의했고 Codex는 두 가지를 더 짚었습니다. ① '가장 바깥 호출'로만 세면 다른 함수로 감싼 바른 작품이 떨어집니다 → 호출 기록에 부른 호출 번호를 두는 방식으로 바꿈(§8.4). ② 단계·미션 바꾸기도 작품을 읽어 오므로 함수 편집 중 내용이 사라질 수 있습니다 → 작품 읽기 단계 자체에서 거절(§8.2).

3차안에서 Codex는 동의했고 agy가 한 가지를 짚었습니다. 작품 읽기의 거절이 지금처럼 `fail()`을 거치면 저장 실패로 잠겨, 편집 창을 닫은 뒤에도 검증·제출이 막힙니다 → 함수 편집 중 거절은 저장 실패와 따로 다루도록 함(§8.2).

4차안에서 agy는 동의했고 Codex가 한 가지를 짚었습니다. 실패로 잠그는 곳이 `captureDraft` 하나가 아니라 실습 버튼의 첫 내보내기·`flush`·`switchStage`·`prepareLeave`에도 있습니다 → 편집 상태를 먼저 확인해 막고, 경합으로 거절이 와도 모든 지점이 중단으로 다루게 함(§8.2).

**5차안(11/1)에서 Codex·agy 모두 남은 필수 수정 없이 동의했습니다.** 두 검토자 모두 파일을 고치거나 검사를 실행하지 않았고, 실제 동작과 수업 시간은 확인하지 않은 상태입니다. 1라운드 요청에 '이 문서만으로 구현 계획을 세울 수 있는지'(빌더 점검)를 함께 넣었고, 남은 질문 가운데 사용자만 답할 수 있는 것은 §2에 모았습니다.

## 14. 구현 계획

> **에이전트 작업자용:** 필수 하위 스킬 — superpowers:subagent-driven-development(권장) 또는 superpowers:executing-plans로 과제를 하나씩 수행합니다. 단계는 체크박스(`- [ ]`)로 추적합니다.

**목표:** 네 번째 엔트리 정규 수업 `functions`(「나만의 명령, 함수」)를 만들고, 엔트리 함수를 이 수업에서만 켜서 저장·교사 열람·서버 채점까지 이어지게 합니다.

**구조:** 엔트리 함수 정의를 작품 파서가 검증해 다시 조립하고(함수가 없으면 지금과 같은 키), 서버 채점기는 `func_<id>` 호출을 호출 기록과 함께 실행해 "어느 호출이 그렸는지"로 미션을 판정합니다. 작업실은 함수 편집 상태를 부모 화면에 알리고, 작품을 읽는 모든 동작은 편집 중이면 실패가 아닌 중단으로 멈춥니다.

**기술:** Next.js·TypeScript, EntryJS 4.0.23(격리 iframe `public/entryjs/workspace.js`), Playwright(로직 검사 `playwright.logic.config.ts`, E2E `playwright.config.ts`), Firebase 에뮬레이터(`demo-cs-class`).

**설계(근거):** 이 문서 §1~§13. 각 과제는 설계의 절 번호(§)를 따릅니다.

### 14.1 전체 제약

- 반영 경로는 PR 경로, 브랜치는 `feat/functions-lesson`. 전체 E2E 실행과 push·병합 승인 범위는 시작할 때 사용자에게 묻습니다([AGENTS](../../AGENTS.md) 승인 범위).
- 함수가 없는 작품의 `key`·정규화·채점 결과는 바뀌지 않습니다. `tests/fixtures/entry-legacy-keys.json`·`entry-legacy-objects.json`은 고치지 않습니다.
- 다른 수업(`programming-13`·`conditionals`·`loops`)의 작업실에서는 함수 메뉴가 계속 보이지 않습니다.
- 일반 함수만 받습니다. 값 반환 함수(`function_create_value`)·매개변수(`function_param_string`·`function_param_boolean`)·지역 변수는 편집기와 서버 양쪽에서 거절합니다.
- 상한: 함수 10개, 이름 20자(다듬은 뒤), 호출 깊이 20, 기존 블록 수(작품 전체 240개)·중첩 8단계·`MAX_PROJECT_BYTES` 32,768바이트는 함수 본문을 합쳐 적용합니다.
- 함수 이름은 채점하지 않습니다. 호출 블록은 id(`func_<id>`)로만 연결합니다.
- 함수 편집 중 거절 안내 문구: "함수 편집 창에서 ‘저장’이나 ‘취소’를 먼저 눌러 주세요."
- 학생 수업 컴포넌트에 `debounce` 자동 저장 타이머를 만들지 않습니다. 저장은 `useWork`만 씁니다.
- 수업 문구(개념·퀴즈·미션)는 설계 §5~§7의 값을 그대로 씁니다(창문 그리기·한 변 50·창문 두 개, 고양이 걸음, 비트·브레이크).

### 14.2 검토에서 볼 곳

과제별 테스트가 직접 다루지 않지만 학생이 실제로 부딪힐 입력입니다. 각 줄의 테스트는 맡은 과제에 넣었습니다.

1. **아직 부르고 있는 함수를 지움:** 저장은 되고, 교사 화면은 '대상 없음', 검증은 "함수를 다시 연결해 주세요" 문구로 실패해야 합니다(과제 2·4).
2. **함수가 자기 자신을 부름(재귀):** 서버가 멈추지 않고 호출 깊이 문구로 실패해야 합니다(과제 4).
3. **함수 편집 창 안에서 Ctrl+S:** iframe이 보내는 `save-request`도 막혀 '저장 완료'가 뜨지 않아야 합니다(과제 6).
4. **이름이 같은 함수 두 개, 또는 이름을 바꾼 함수:** id로만 연결되므로 저장·채점이 그대로여야 합니다(과제 2·4).
5. **다른 엔트리 수업의 옛 작품:** 함수 메뉴가 보이지 않고 키가 그대로여야 합니다(과제 2·6).

---

### Task 1: 사전 확인(버리는 실험)과 실제 내보내기 고정 파일

설계 §8.1. 코드는 커밋하지 않고, 관찰 결과와 고정 파일만 남깁니다.

**파일:**
- 만들기: `tests/fixtures/entry-function-export.json`(실제 엔트리 내보내기: 강아지 없는 작품, 함수 `창문 그리기` 하나를 시작하기 줄에서 두 번 부름)
- 고치기: `docs/plans/functions-lesson.md` §8.1 아래에 "사전 확인 결과" 단락

**산출물(뒤 과제가 쓰는 사실):** 편집 중임을 알려 주는 엔트리 상태 또는 이벤트 이름, 편집 창이 열리고 닫힐 때 잡을 수 있는 지점, 내보낸 `functions[i].content`의 첫 블록·이름 블록 모양, 함수 블록이 나오는 팔레트 분류 이름, 함수 삭제·이름 바꾸기 뒤 호출 블록의 모양, 함수 안에서만 그린 선이 실행 끝에 지워지는지.

- [ ] **1단계:** 에뮬레이터를 켜고(`npm run dev:emulator`) `public/entryjs/workspace.js`에서 `functionEnable: false`를 `programming`으로 임시로 바꾼 뒤, 반복 수업 정사각형 미션 작업실에서 함수를 만들고 부르고 이름을 바꾸고 지워 봅니다.
- [ ] **2단계:** 브라우저 콘솔에서 `Entry.exportProject()` 결과를 받아 고정 파일로 저장하고, 위 산출물 항목을 설계 문서에 적습니다(확인한 사실과 추측을 나눔).
- [ ] **3단계:** 함수 본문에만 붓 블록을 넣고 실행해 선이 남는지 봅니다(설계 §8.7 가설 재현).
- [ ] **4단계:** `workspace.js` 임시 변경을 되돌리고 `git diff --stat`에 고정 파일과 설계 문서만 있는지 확인합니다.
- [ ] **5단계: 커밋**

```bash
git add tests/fixtures/entry-function-export.json docs/plans/functions-lesson.md
git commit -m "Record Entry function export shape for the functions lesson"
```

### Task 2: 작품 파서·조립에 함수 더하기

설계 §8.5. 함수 정의를 읽고 검증해 다시 조립합니다.

**파일:**
- 고치기: `src/lib/classroom/programming-entry.ts`(`parseProgrammingProject`, `buildProgrammingProject`, `clean`)
- 테스트: `tests/entry-palette.test.ts`

**인터페이스:**
- 쓰는 것: 과제 1 고정 파일의 함수 모양.
- 만드는 것:
  - `export type ProgramFunction = { id: string; name: string; body: EntryNode[] }`
  - `export const MAX_FUNCTIONS = 10`
  - `export const functionCallId = (type: string): string | null` — `func_<id>`면 id, 아니면 `null`
  - `parseProgrammingProject` 반환값에 `functions: ProgramFunction[]`
  - `buildProgrammingProject(threads?, added?, mainIndex?, counter?, variables?, functions: readonly ProgramFunction[] = [])` — 엔트리가 다시 읽을 수 있는 `functions` 항목을 만듦

- [ ] **1단계: 실패하는 테스트 쓰기** — `tests/entry-palette.test.ts`에 다음 테스트를 더합니다.
  - `"함수 정의와 호출을 저장하고 다시 읽어도 같다"`: 고정 파일을 읽어 `parseProgrammingProject` → `functions.length === 1`, `functions[0].name === "창문 그리기"`, 본문 블록 종류에 `start_drawing`·`repeat_basic`·`stop_drawing`이 있고, 시작하기 줄에 `func_<그 id>`가 두 번 있음. `JSON.stringify(parsed.project)`를 다시 읽으면 `key`가 같음.
  - `"함수가 없는 작품의 키는 그대로다"`: 기존 `"기존 미션 블록만 쓴 작품은 키·순서·정규화·채점 결과가 바뀌지 않는다"`가 그대로 통과하고, 고정 파일에서 함수를 뺀 작품의 `key`에 `functions`가 없음.
  - `"값 반환 함수·매개변수·지역 변수·상한 초과 함수는 읽지 않는다"`: `type`을 값 함수로, 이름 칸에 `function_param_string`, `useLocalVariables: true`, 함수 11개를 각각 넣으면 `null`. 25자 이름은 거절하지 않고 앞뒤 공백을 다듬어 20자로 잘라 받음(학생 변수 이름과 같은 규칙).
  - `"없는 함수를 부르는 블록도 저장하고, 이름이 같은 함수는 id로 구분한다"`(검토 1·4): 함수를 지운 작품은 읽히고 호출 블록이 남음. 이름이 같은 두 함수는 둘 다 읽히고 각자 id로 연결됨.
- [ ] **2단계:** `npx playwright test -c playwright.logic.config.ts tests/entry-palette.test.ts` → 새 테스트 실패 확인.
- [ ] **3단계: 구현** — `clean`은 `functionCallId(type)`가 있고 `params`가 비었을 때 호출 노드를 받습니다(작품에 없는 id도 받음). 함수 본문은 같은 `clean`·같은 `count`로 읽어 블록 수 상한을 함께 씁니다. 키는 함수가 있을 때만 객체 키에 `functions`(id 순 정렬, `{ id, name, body: code(...) }`)를 넣습니다. 학생 변수 처리와 같은 방식입니다.
- [ ] **4단계:** 같은 명령으로 전체 통과 확인, `npm run typecheck`.
- [ ] **5단계: 커밋**

```bash
git add src/lib/classroom/programming-entry.ts tests/entry-palette.test.ts
git commit -m "Parse and rebuild Entry functions in programming projects"
```

### Task 3: 교사 문장·미션 블록 검사·미저장 판단

설계 §8.5 마지막 항목, §8.7의 미저장 판단·교사 열람.

**파일:**
- 고치기: `src/lib/classroom/programming-entry.ts`(`formatEntryNode`, `programmingProjectLines`, `missionBlockIssue`), `src/components/student/work-draft.ts`(`programmingContent`)
- 테스트: `tests/entry-palette.test.ts`

**인터페이스:**
- 쓰는 것: 과제 2의 `ProgramFunction`, `functionCallId`.
- 만드는 것: `formatEntryNode(node, names, functionNames?: Readonly<Record<string, string>>)` — 호출은 `‘창문 그리기’ 부르기`, 없는 함수는 `‘대상 없음’ 부르기`. `programmingProjectLines`는 함수마다 `함수 ‘창문 그리기’` 줄과 들여 쓴 본문 줄을 먼저 보여 줌.

- [ ] **1단계: 실패하는 테스트 쓰기**
  - `"교사 작품 보기는 함수 정의와 호출을 보여 준다"`: 고정 파일 → 줄에 `함수 ‘창문 그리기’`, `‘창문 그리기’ 부르기` 두 번. 지운 함수 호출은 `‘대상 없음’ 부르기`.
  - `"채점 줄에서 부르는 함수 본문도 미션 블록으로 검사한다"`: `windows` 미션 허용 밖 블록(`ask_and_wait`)을 함수 본문에 넣으면 `missionBlockIssue`가 그 블록 이름을 안내. 채점 줄이 부르지 않는 함수의 본문은 검사하지 않음. 서로 부르는 두 함수에서도 끝남.
  - `"함수 본문만 바꿔도 미저장으로 본다"`: 본문의 50을 80으로 바꾼 두 초안은 `sameWorkContent`가 `false`.
- [ ] **2단계:** 로직 검사 실행 → 실패 확인.
- [ ] **3단계: 구현** — `missionBlockIssue`는 채점 줄에서 `func_<id>`를 만나면 방문한 id 집합을 들고 그 함수 본문으로 들어갑니다. 호출 노드는 작품에 있는 함수면 허용합니다. `programmingContent`는 함수가 있을 때만 `functions`를 넣습니다.
- [ ] **4단계:** 로직 검사·`npm run typecheck` 통과.
- [ ] **5단계: 커밋**

```bash
git add src/lib/classroom/programming-entry.ts src/components/student/work-draft.ts tests/entry-palette.test.ts
git commit -m "Show functions to teachers and check reachable function bodies"
```

### Task 4: 채점기의 함수 실행과 호출 기록

설계 §8.4. 미션 규칙은 과제 5의 미션 id를 씁니다(`cat-walk`·`windows`·`fix-shapes`·`flower`).

**파일:**
- 고치기: `src/lib/server/programming-grader.ts`
- 테스트: `tests/entry-palette.test.ts`

**인터페이스:**
- 쓰는 것: 과제 2의 `functions`.
- 만드는 것(채점기 내부): `Stroke`에 `call: number | null`, 모양 바뀜 기록 `{ call: number | null; at: number }[]`, 호출 기록 `Map<number, { fn: string; parent: number | null }>`, `const MAX_CALL_DEPTH = 20`. 판정 도우미 `within(call, root)`(부모를 따라 올라가 `root`에 닿으면 참).

- [ ] **1단계: 실패하는 테스트 쓰기** — `"함수 미션은 호출 기록으로 판정한다"`에 다음을 넣습니다(작품은 테스트 도우미로 조립).
  - 통과: 창문 함수를 두 번 부른 작품, 반복 없이 네 변을 풀어 쓴 창문 함수, `집 그리기` 함수 안에서 창문을 두 번 부른 작품, 꽃잎을 반복 안에서 6번 부르는 꽃, 그 반복을 다른 함수로 감싼 꽃.
  - 실패: 함수 밖에서 그린 선(문구 "선이 함수 밖에서 그려졌어요"), 한 번만 부름(문구 "한 번 더 불러 보세요"), 같은 자리에 두 번 부르고 함수 밖에서 하나 더 그림, 테두리가 닿는 두 창문(문구 "더 멀리 옮긴 뒤"), 고양이의 ←·→가 서로 다른 함수를 부름, 재귀 호출(호출 깊이 문구, 검토 2), 지운 함수를 부름(다시 연결 문구, 검토 1).
- [ ] **2단계:** 로직 검사 실행 → 실패 확인.
- [ ] **3단계: 구현** — `exec`에서 `functionCallId`가 있으면 깊이를 확인하고 호출 번호를 새로 매겨 정의 본문을 `exec`합니다. `goTo`가 만드는 선과 모양 바뀜에 지금 호출 번호를 붙입니다. 도형은 판정할 호출마다 `within`으로 선을 모아 기존 `visible`로 합친 뒤 기하만 봅니다(`repeated`·`again`은 보지 않음). `flower`만 그 호출이 두 바퀴 이상 도는 반복 안에서 실행됐는지 봅니다. 키 미션은 `run(signal, inputs, m)`에 고양이 `Actor`를 넘기도록 실행 주체 인자를 더합니다. 실패 문구는 `MissionError`로 던집니다.
- [ ] **4단계:** 로직 검사 전체 통과(기존 미션 회귀 없음), `npm run typecheck`.
- [ ] **5단계: 커밋**

```bash
git add src/lib/server/programming-grader.ts tests/entry-palette.test.ts
git commit -m "Run Entry functions in the grader with invocation records"
```

### Task 5: 수업 내용과 미션 등록

설계 §5~§7, §8.6, §8.8. 수업은 `LESSONS`에만 넣고 `RELEASED_LESSONS`는 과제 7에서 넣습니다.

**파일:**
- 만들기: `src/lib/classroom/functions-data.ts`(`functionConcepts`, `functionQuestions`, 반복 수업 데이터와 같은 모양: 개념 `retry`, 퀴즈 `scene`·`explanation`·`why`), `src/lib/classroom/functions-lesson.ts`(`FUNCTIONS_LESSON`, `SHOWN`으로 정답 위치 섞기)
- 고치기: `src/lib/classroom/programming-entry.ts`(`PROGRAMMING_MISSIONS` 4개, `LESSON_MISSIONS.functions`, `FREE_MISSIONS`, `missionStarter`의 `cat-walk`·`fix-shapes`, `ProgrammingMission`에 `functions?: true`), `src/lib/classroom/entry-palette.ts`(`MISSION_BLOCKS` 4개, 함수 블록 표기), `src/lib/server/solutions.ts`, `src/lib/classroom/catalog.ts`(`LESSONS`의 `LOOPS_LESSON` 다음), `src/components/student/concept-visual.tsx`(`fc0`·`fc2`·`fc3`)
- 테스트: `tests/entry-palette.test.ts`(해답 목록), `tests/lesson-feedback.test.ts`

**인터페이스:**
- 만드는 것: 미션 id `cat-walk`·`windows`·`fix-shapes`·`flower`(선택, `optional: true`), 수업 id `functions`, 개념 id `fc0`~`fc4`, 퀴즈 id `calls`·`repeat-call`·`edit-definition`·`reset-bug`·`missing-call`. 모든 함수 미션은 `functions: true`, `cat-walk`는 `keyEvents: true`.

- [ ] **1단계: 실패하는 테스트 쓰기**
  - 해답 목록 테스트에 네 미션의 해답을 더하고, 기대 수업 목록에 `"functions"`를 넣습니다. 안내(steps)대로 만든 해답이 통과하고, 칩·값 순서 검사가 그대로 통과해야 합니다.
  - `"고장 난 도형 시작 작품은 오각형 90°와 육각형 호출 누락만 고치면 통과한다"`: `missionStarter("fix-shapes")`는 실패, 회전 72°와 육각형 호출을 더하면 통과. 세 도형의 좌표가 겹치지 않고 무대 ±240 안.
  - `lesson-feedback.test.ts`에 `functions` 줄(개념 5개·퀴즈 5개, 보기 3개).
- [ ] **2단계:** 로직 검사 실행 → 실패 확인.
- [ ] **3단계: 구현** — 개념·퀴즈 문구는 설계 §5·§6을 그대로, 오답 `why`·`retry`는 [PRD §3.1](../PRD.md#31-수업-3단계-라이프사이클-및-진도-측정) 피드백 기준으로 씁니다. 미션 `steps`는 함수 만들기 → 본문 블록 → 호출 순서이고, `windows`·`flower`는 함수 맨 앞 `그리기 시작하기`, 맨 끝 `그리기 멈추기`를 안내합니다. `MISSION_BLOCKS`는 반복 수업 `PEN`을 바탕으로 하고 `cat-walk`는 `MOVE`·`when_some_key_pressed`·`change_to_next_shape`를 씁니다. 함수 호출은 미션 블록 검사에서 `functionCallId`로 따로 허용합니다(과제 3).
- [ ] **4단계:** 로직 검사·`npm run typecheck`·`npm run lint` 통과.
- [ ] **5단계: 커밋**

```bash
git add src/lib/classroom/functions-data.ts src/lib/classroom/functions-lesson.ts src/lib/classroom/programming-entry.ts src/lib/classroom/entry-palette.ts src/lib/server/solutions.ts src/lib/classroom/catalog.ts src/components/student/concept-visual.tsx tests/entry-palette.test.ts tests/lesson-feedback.test.ts
git commit -m "Add the functions lesson content and missions"
```

### Task 6: 작업실의 함수 메뉴와 편집 중 보호

설계 §8.2, §8.3, §8.7의 실행 감시. 과제 1에서 확인한 편집 상태 지점을 씁니다.

**파일:**
- 고치기: `public/entryjs/workspace.js`(`fn=1`일 때만 `functionEnable`, 함수 팔레트 분류, 값 함수·매개변수·지역 변수 막기, 편집 상태 알림, 편집 중 `export` 거절, `keepsDrawing`이 부르는 함수 본문까지 보기), `src/lib/classroom/entry-palette.ts`(함수 분류 공유 목록 `FUNCTION_PALETTE`, `workspace.js` 복사본과 같은지 검사), `src/components/student/entry-practice-workspace.tsx`(iframe 주소에 `fn=1`, 편집 상태 저장, `readProject` 거절과 안내, `act`의 `finally`), `src/components/student/use-work.ts`(`captureDraft`·`flush`·`switchStage`·`prepareLeave`)
- 만들기: `src/components/student/function-editing.ts`(`export class FunctionEditingError extends Error`, `export const FUNCTION_EDITING_MESSAGE`)
- 테스트: `tests/entry-palette.test.ts`(팔레트 복사본), `tests/functions.spec.ts`(E2E, 과제 7에서 나머지 추가)

**인터페이스:**
- iframe → 부모 메시지 `{ type: "function-editing", editing: boolean }`. 편집 중 `export` 요청에는 `{ type: "exported", id, refused: "function-editing" }`.
- **거절 지점은 `readProject()` 하나입니다.** 편집 상태가 참이면 iframe에 묻지 않고, 편집 중 거절(`refused`)이 오면 받는 즉시 `FUNCTION_EDITING_MESSAGE` 안내(기존 `toasts`, 경고)를 띄우고 `FunctionEditingError`로 실패합니다. 상단 저장·Ctrl+S·iframe의 `save-request`·검증·제출·미션 바꾸기(`programming-lesson.tsx`의 `select`)·단계 바꾸기·'저장 후 나가기'가 모두 이 지점을 거치므로 따로 막지 않습니다. `readEntryDraft`는 이 오류를 바꾸지 않고 넘깁니다.
- `use-work.ts`: `captureDraft`는 `FunctionEditingError`면 `fail()` 없이 다시 던집니다. `flush`·`switchStage`·`prepareLeave`는 이 오류를 잡으면 `fail()`을 부르지 않고, `flush`는 시작 전 저장 상태로 되돌린 뒤, 셋 다 `false`를 돌려줍니다. 오류 표시(`error`)는 바꾸지 않습니다. 다른 오류는 지금처럼 `fail()`합니다.
- `act`(실습 버튼)는 `readProject` 결과와 상관없이 `finally`에서 `setPreparing(false)`합니다.

- [ ] **1단계: 실패하는 테스트 쓰기** — `tests/functions.spec.ts`에:
  - `"다른 엔트리 수업에는 함수 메뉴가 없다"`(검토 5): `loops` 정사각형 작업실에서 함수 분류가 보이지 않음.
  - `"함수 편집 중에는 저장·검증·제출·이동이 멈추고, 편집 창을 닫으면 바로 된다"`: 편집 창을 연 채 상단 `저장`, Ctrl+S(작업실 안에서 눌러 `save-request` 경로, 검토 3), `조건 검증`, 미션 바꾸기, 개념 탭 이동, 다른 화면 링크를 차례로 시도 → 매번 안내가 보이고 `[role="status"]`가 `저장 완료`로 바뀌지 않으며 편집 창 내용이 남음. 편집 창의 저장을 누른 뒤 상단 `저장` 한 번으로 `저장 완료`, 이어서 `조건 검증`이 바로 동작(재시도 버튼 없음).
  - `"함수 안에서만 그린 선이 실행 뒤 남는다"`.
- [ ] **2단계:** 에뮬레이터 실행 중 `npx playwright test tests/functions.spec.ts` → 실패 확인.
- [ ] **3단계: 구현** — 위 인터페이스대로. 진짜 실패·충돌 처리는 바꾸지 않습니다.
- [ ] **4단계:** 위 E2E, 로직 검사, `npm run typecheck`·`npm run lint`, 기존 `tests/manual-save-entry.spec.ts`·`tests/programming-mission-navigation.spec.ts` 통과.
- [ ] **5단계: 커밋**

```bash
git add public/entryjs/workspace.js src/lib/classroom/entry-palette.ts src/components/student/entry-practice-workspace.tsx src/components/student/use-work.ts src/components/student/function-editing.ts tests/entry-palette.test.ts tests/functions.spec.ts
git commit -m "Enable Entry functions for the functions lesson and guard function editing"
```

### Task 7: 공개 등록·선별 검증·문서

설계 §8.8~§8.9, §10. [수업 추가 체크리스트](../DEVELOPMENT.md#신규-수업-추가-및-선별-검증-연동-체크리스트) 3~4단계.

**파일:**
- 고치기: `src/lib/classroom/catalog.ts`(`RELEASED_LESSONS`), `scripts/seed-emulator.mjs`, `scripts/e2e-scope.mjs`(`functions` 매핑, `ENTRY_SHARED` 패턴), `tests/e2e-scope.test.mjs`(공유 파일 기대 목록에 `"functions"`), `tests/lesson-smoke.spec.ts`(`ALL_LESSON_IDS`·저장 복원 블록), `tests/lesson-ui-consistency.spec.ts`, `tests/lesson-navigation.test.ts`, `tests/functions.spec.ts`(미션별 검증·제출, 새로고침 복원, 교사 작품 보기, 1,024px), `docs/PRD.md`(§4 표, 새 §4.1.4, §4.1의 '함수는 제공하지 않습니다'), `docs/DEVELOPMENT.md`(§4.1 함수 저장·채점·편집 보호), `docs/HANDOFF.md`(최근 반영, 계획 링크 정리)
- 옮기기: 이 계획 문서를 `docs/archive/cs-class/<날짜>-completed-plans/`로(보관함 목록·manifest 갱신)

- [ ] **1단계: 실패하는 테스트 쓰기** — `tests/functions.spec.ts`에 `"네 미션을 안내대로 만들면 검증·제출되고 새로고침 뒤 복원된다"`, `"교사 작품 보기에 함수 정의와 호출이 보인다"`, `"1,024px에서 작업실과 함수 편집 창이 다 보인다"`. 등록 관련 기대값(`e2e-scope.test.mjs`, `lesson-navigation.test.ts`, `lesson-smoke`)을 먼저 고칩니다.
- [ ] **2단계:** `npm run test:scope`, 로직 검사, `npx playwright test tests/functions.spec.ts` → 실패 확인.
- [ ] **3단계: 구현** — 등록·문서를 고칩니다. PRD에는 학생이 보는 구성과 통과 기준만, 구현 세부는 DEVELOPMENT §4.1에만 씁니다([문서 작성 기준](../DEVELOPMENT.md#문서-작성-기준)).
- [ ] **4단계: 검증** — `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:scope`, `npm run test:review`, `node scripts/check-docs.mjs`, `git diff --check origin/main`, `npm run test:e2e:scope`(선별 E2E). 전체 E2E는 사용자 승인이 있을 때만.
- [ ] **5단계:** 선생님 미리보기로 네 미션을 풀어 보고, 처음 해 보는 학생 기준 풀어 보기로 실습 20분 배분을 확인해 HANDOFF 남은 한계에 결과를 적습니다(설계 §10).
- [ ] **6단계: 커밋** — 이번 과제에서 바꾼 파일만 이름으로 넣고, PR 설명에 실행한 검사와 개수, 실행하지 않은 검사를 적습니다.

```bash
git commit -m "Release the functions lesson with scoped tests and docs"
```
