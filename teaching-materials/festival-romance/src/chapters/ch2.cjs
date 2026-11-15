module.exports = {
  "id": 2,
  "title": "낮의 교정, 흔들리는 조건문",
  "subject": "선택 제어와 논리 연산",
  "subtitle": "부스 입장 게이트부터 소나기 대피까지, 삐걱거리는 분기 잡기",
  "duration": "약 10분",
  "recap": "약속한 {{meetingTime}}보다 먼저 정문에 나와 기다리고 있던 하루. 그런데 활기찬 축제 교정은 시작부터 버그 투성이 조건문으로 시끌벅적합니다.",
  "scenes": [
    {
      "id": "ch2-1",
      "kind": "story",
      "title": "12분 전부터 기다린 사람",
      "topic": "축제 당일 · 정문 앞 만남",
      "minutes": "1:00",
      "background": "day",
      "channel": "축제 교정 · 함께 다니는 중",
      "lines": [
        {
          "speaker": "내 생각",
          "role": "narration",
          "text": "약속한 {{meetingTime}}보다 조금 일찍 정문에 도착했는데, 하루가 이미 안내판 앞에서 발을 동동 구르며 손을 흔들고 있었다.",
          "expression": 0
        },
        {
          "speaker": "하루",
          "role": "haru",
          "text": "{{vocative}}!! 왔구나! 나도 방금 막 도착해서 지도 보고 있던 참이야!",
          "expression": 2
        },
        {
          "speaker": "축제앱",
          "role": "system",
          "text": "하루 (12분 전): 정문 앞 도착 완료! 서두르지 말고 천천히 조심해서 와~",
          "expression": 0
        },
        {
          "speaker": "나",
          "role": "me",
          "text": "방금 막 도착했다면서 알림은 12분 전에 찍혀 있는데?",
          "expression": 5
        },
        {
          "speaker": "하루",
          "role": "haru",
          "text": "어, 어…?! 시간 로그를 그렇게 세세하게 볼 줄은 몰랐지… 그, 그냥 너 기다리면서 부스 동선 좀 짜고 있었어!",
          "expression": 1
        }
      ],
      "shortLines": [
        {
          "speaker": "하루",
          "role": "haru",
          "text": "{{vocative}}! 나도 방금 왔어— 아, 12분 전 알림 들켰네. 아무튼 내가 야심 차게 짠 부스부터 보러 가자!",
          "expression": 1
        }
      ],
      "choices": [
        {
          "key": "sweet",
          "label": "나도 너 오래 기다리게 하기 싫어서 조금 서둘렀어.",
          "reply": [
            {
              "speaker": "하루",
              "role": "haru",
              "text": "진, 진짜?! 그럼 우리 둘 다 일찍 온 셈이네… 헤헤, 왠지 기분 좋다.",
              "expression": 1
            },
            {
              "speaker": "하루",
              "role": "haru",
              "text": "자, 나 믿고 따라와! 내가 조건문 코딩으로 멋지게 만들어 둔 포토 부스부터 가자!",
              "expression": 2
            }
          ]
        },
        {
          "key": "tease",
          "label": "12분 전부터 대기면 거의 정문 마스코트 알바 수준인데?",
          "reply": [
            {
              "speaker": "하루",
              "role": "haru",
              "text": "야 놀리지 마 ㅋㅋ 남는 시간에 포토 부스 게이트까지 직접 코딩해 놨단 말이야!",
              "expression": 5
            },
            {
              "speaker": "하루",
              "role": "haru",
              "text": "감동할 준비해라, 에이스! 바로 앞 인생네컷 부스로 출발!",
              "expression": 2
            }
          ]
        }
      ],
      "teacher": {
        "ask": "축제앱이 하루의 도착 시각을 보여 주는 것은 앞서 배운 어떤 개념과 이어질까요?",
        "answer": "메시지와 보낸 시각을 변수·자료로 저장했다가 화면에 출력한 것입니다.",
        "watch": "일상적인 호감 표현 선택지에는 하트 감점이 없습니다.",
        "short": "정문에서 하루와 만나 축제 부스로 출발합니다."
      }
    },
    {
      "id": "ch2-2",
      "kind": "concept",
      "graded": true,
      "questionId": "ch2-q1",
      "conceptTitle": "비교 연산자와 경계값 (≥)",
      "experiment": "compare",
      "title": "버그 5 · 6장 이상인데 6장은 튕기는 포토 부스",
      "topic": "제어 구조 · 비교 연산자와 경계값",
      "minutes": "2:00",
      "background": "day",
      "channel": "축제 교정 · 함께 다니는 중",
      "quote": "하루: \"6장 이상이면 입장인데 우리 손에 딱 6장이 들려 있거든? 근데 왜 게이트가 '거짓 · 입장 불가'래?!\"",
      "goalPrompt": "'6장 이상이면 입장' 규칙대로 6장을 가진 두 사람이 포토 부스에 입장할 수 있게 조건식을 고치세요!",
      "observe": "조건에 따라 갈라지는 선택 구조에서 비교 연산 결과는 항상 '참' 또는 '거짓'이며, '이상'은 같은 수도 포함하므로 ≥를 써야 합니다.",
      "goal": {
        "booth": "photo",
        "threshold": 6,
        "initialOperator": ">",
        "expectedOperator": "≥",
        "initialTickets": 6,
        "wrongHints": {
          ">": "6 > 6 은 거짓이에요! '>'는 6보다 큰 7장부터만 참이라서, 딱 6장인 우리가 경계값에 걸려 탈락한 거예요. 같은 수(6)도 포함하는 '크거나 같다(≥)'를 써야 해요!",
          "=": "'='를 쓰면 딱 6장일 때만 참이 되고 7장, 8장 가진 친구들은 다 막혀 버려요! '6장 이상'을 표현하려면 ≥를 고르세요.",
          "≠": "'≠'는 6장이 아닐 때만 참이라서 오히려 6장을 들고 있는 우리가 입장할 수 없어요!",
          "<": "'<'는 6장보다 적을 때만 참이라 조건이 정반대로 작동해요!",
          "≤": "'≤'는 6장 이하라서 티켓이 7장 이상이면 거짓이 돼요! 6장 '이상'은 ≥랍니다."
        },
        "defaultWhy": "비교 연산의 결과는 숫자가 아니라 '참' 또는 '거짓'이에요! 기준(6장)과 같을 때도 포함하려면 ≥를 선택하세요."
      },
      "flow": {
        "intro": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "짜잔! 여기 내가 맡은 인생네컷 포토 부스야. 조건에 따라 화면이 갈라지는 '선택 구조'로 멋지게 짰지!",
            "expression": 2
          },
          {
            "speaker": "부스 단말기",
            "role": "system",
            "text": "보유 입장권: 6장 / 입장 조건: 6장 이상 → [비교 결과: 거짓 · 입장 불가!]",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "뭐야?! 야, 우리 손에 딱 6장 있잖아! 6장 이상이면 들어가야지 왜 결과가 '거짓'이 뜨냐고?!",
            "expression": 3
          },
          {
            "speaker": "나",
            "role": "me",
            "text": "딱 6장일 때만 막힌다고? 조건식에 쓴 비교 연산자부터 같이 보자.",
            "expression": 0
          }
        ],
        "shortIntro": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "입장권이 딱 6장인데 '6장 이상' 부스에서 자꾸 거짓이 뜨며 튕겨! 비교 연산자를 고쳐 줘!",
            "expression": 3
          }
        ],
        "wrongReaction": {
          "expression": 3,
          "line": "삐빅! 또 입장 거부 떴어!! 경계값 6장이 딱 포함되려면 어떤 비교 기호를 써야 하지?!"
        },
        "firstTrySuccess": [
          {
            "speaker": "부스 단말기",
            "role": "system",
            "text": "6 ≥ 6 → 참! 포토 부스 게이트가 열립니다 📸",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "우와, '>' 하나를 '≥'로 바꿨더니 바로 열렸다!! 6 > 6은 거짓, 6 ≥ 6은 참이라는 거구나!",
            "expression": 3
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "그나저나… 우리 첫 축제 인생네컷인데, 조금 떨리는데 잘 나오겠지?",
            "expression": 1
          }
        ],
        "retrySuccess": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "휴, 이제야 문 열렸네! '이상'은 같은 숫자까지 포함해서 ≥를 쓰고, 비교 결과는 참·거짓이라는 거 확실히 외웠어!",
            "expression": 0
          }
        ]
      },
      "teacher": {
        "ask": "순차·선택·반복 제어 구조 중 이 장면은 무엇이며, 6장 이상에서 6장이 탈락한 까닭은 무엇일까요?",
        "answer": "조건에 따라 실행이 달라지는 선택 구조입니다. '>'는 같을 때 거짓이므로 경계값 6을 포함하려면 '≥'를 써야 하며 비교 결과는 항상 참 또는 거짓입니다.",
        "watch": "비교 연산의 결과를 숫자(예: 59)로 답하거나 '>'와 '≥'의 경계값을 혼동하는 오류를 짚어 줍니다.",
        "short": "경계값 6장에서 '>'를 '≥'로 고쳐 포토 부스에 입장합니다."
      }
    },
    {
      "id": "ch2-3",
      "kind": "concept",
      "graded": true,
      "questionId": "ch2-q2",
      "conceptTitle": "논리 연산 · 그리고(AND)",
      "experiment": "and",
      "title": "버그 6 · 문 닫은 게임 부스에 손님 들이는 게이트",
      "topic": "논리 연산 · 그리고(AND)",
      "minutes": "1:50",
      "background": "day",
      "channel": "축제 교정 · 함께 다니는 중",
      "quote": "부스 스태프: \"학생들! 우리 지금 휴식 중이라 문 닫았는데 왜 게이트가 자꾸 어서 오세요래?!\"",
      "goalPrompt": "입장권도 있고 부스도 운영 중일 때만 문이 열리도록 두 조건을 잇는 논리 연산을 고치고 판단 결과를 확인하세요!",
      "observe": "'그리고(AND)'는 연결한 두 조건이 모두 참일 때만 참이고, 하나라도 거짓이면 거짓입니다.",
      "goal": {
        "mode": "fix-and",
        "a": true,
        "b": false,
        "lockInputs": true,
        "expectedOp": "and",
        "expectedResult": false,
        "wrongHints": {
          "or": "'또는(OR)'으로 연결하면 티켓만 있어도 부스가 닫혀 있는데 문이 열려 버려요! 두 조건이 모두 참일 때만 들어가려면 '그리고(AND)'를 골라야 해요.",
          "wrongOp": "둘 중 하나만 맞으면 들어가는 '또는'이 아니라, 두 조건이 모두 참일 때만 통과하는 '그리고(AND)'가 필요합니다!",
          "wrongTruth": "티켓 조건은 참이지만, 지금 부스 운영 중 조건은 '거짓'이에요! '참 그리고 거짓'의 판단 결과는 참일까요, 거짓일까요?"
        },
        "defaultWhy": "논리 연산자를 '그리고(AND)'로 고치고, '참 그리고 거짓'의 결과인 '거짓(아직 입장 불가)'을 선택해 실행하세요!"
      },
      "flow": {
        "intro": [
          {
            "speaker": "내 생각",
            "role": "narration",
            "text": "사진을 찍고 옆 게임 부스로 넘어오자마자, 부스 안에서 핫도그를 물고 뛰어나온 스태프와 눈이 마주쳤다.",
            "expression": 0
          },
          {
            "speaker": "부스 단말기",
            "role": "system",
            "text": "입장권 충족(참) · 부스 운영 중(거짓) → [판정: 입장 가능! 문 열림]",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "헉, 죄송해요!! 분명 '부스 운영 중' 체크가 꺼져 있는데 왜 게이트가 열렸지?!",
            "expression": 3
          },
          {
            "speaker": "나",
            "role": "me",
            "text": "운영 중이 아닌데 열렸다면… 두 조건을 이어 붙인 방법이 수상한데?",
            "expression": 0
          }
        ],
        "shortIntro": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "부스가 휴식 중(거짓)인데도 게이트가 자꾸 열려! 논리 연산을 고치고 '참·거짓' 결과를 맞혀 봐!",
            "expression": 3
          }
        ],
        "wrongReaction": {
          "expression": 4,
          "line": "어라? 스태프가 아직도 핫도그 들고 문 닫으려 뛰어오고 있어! '그리고(AND)'랑 참/거짓 결과를 다시 확인하자!"
        },
        "firstTrySuccess": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "휴— 다행이다! '그리고(AND)'는 두 조건이 둘 다 참일 때만 참이라서, 부스 닫혔을 땐 딱 거짓으로 막아 주는구나!",
            "expression": 2
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "스태프분 핫도그 마저 드실 동안 우린 옆 구경이나 하자 ㅋㅋ",
            "expression": 5
          }
        ],
        "retrySuccess": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "이제 문 안 열리네! '그리고'는 하나만 거짓이어도 결과가 거짓이라는 거 확실히 알겠어.",
            "expression": 0
          }
        ]
      },
      "teacher": {
        "ask": "입장권 기준 충족(참)과 부스 운영 중(거짓)을 '그리고(AND)'로 이으면 결과는 무엇일까요?",
        "answer": "AND는 두 조건이 모두 참일 때만 참이므로 한쪽이라도 거짓이면 결과는 거짓(입장 대기)입니다.",
        "watch": "앞 조건만 참이어도 통과하는 OR와 둘 다 참이어야 하는 AND를 혼동하지 않게 합니다.",
        "short": "닫힌 부스 사례에서 OR를 AND로 고치고 거짓 판정을 확인합니다."
      }
    },
    {
      "id": "ch2-4",
      "kind": "concept",
      "graded": true,
      "questionId": "ch2-q3",
      "conceptTitle": "논리 연산 · 또는(OR) · 아니다(NOT)",
      "experiment": "route",
      "title": "버그 7 · 비 오는데 야외로 내보내는 날씨 앱",
      "topic": "논리 연산 · 또는(OR) · 아니다(NOT)",
      "minutes": "2:00",
      "background": "day",
      "channel": "축제 교정 · 함께 다니는 중",
      "quote": "하루: \"빗방울 떨어지는데 내 앱이 자꾸 야외 공연장으로 가래! 우산도 없는데 실내 통로도 못 찾고!\"",
      "goalPrompt": "비가 올 때는 야외로 가지 않고, 우산이나 실내 통로 중 하나만 있어도 비를 피할 수 있도록 두 조건을 고쳐 실내 부스로 대피하세요!",
      "observe": "'또는(OR)'은 하나 이상 참(둘 다 참 포함)이면 참이고, '아니다(NOT)'는 참과 거짓을 반대로 뒤집습니다.",
      "goal": {
        "mode": "fix-logic",
        "rain": true,
        "umbrella": false,
        "passage": true,
        "expectedConnector": "or",
        "expectedRainCheck": "not",
        "wrongHints": {
          "and": "우산과 실내 통로를 '그리고(AND)'로 묶으면 우산이 없을 때 실내 통로가 열려 있어도 비를 피할 수 없다고 판단해요! 둘 중 하나만 있어도(심지어 둘 다 참이어도!) 피할 수 있으므로 '또는(OR)'을 써야 해요.",
          "connector": "비가 올 때 우산이나 실내 통로 중 하나 이상만 참이면 실내로 이동할 수 있어요! 연결자를 '또는(OR)'으로 바꾸세요.",
          "not": "첫 줄이 '만일 (조건)이라면 → 야외 공연'이에요! 야외로 가려면 비가 오지 않아야 하므로, '비가 온다'를 뒤집은 '아니다(비가 온다)'를 써야 해요!"
        },
        "defaultWhy": "야외 조건은 '아니다(비가 온다)'로, 비 피할 조건은 '우산 또는 실내 통로'로 고쳐 실행해 보세요!"
      },
      "flow": {
        "intro": [
          {
            "speaker": "내 생각",
            "role": "narration",
            "text": "그때 갑자기 운동장 하늘에서 굵은 빗방울이 후두둑 떨어졌다. 부스 앞 학생들이 일제히 우산을 펼쳤다.",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "어, 비 온다! 나 우산 안 챙겼는데… {{vocative}}, 너는?!",
            "expression": 4
          },
          {
            "speaker": "나",
            "role": "me",
            "text": "나도 없는데. 저기 본관 실내 통로 열려 있지 않아? 네가 만든 날씨 길안내 앱 켜 봐.",
            "expression": 0
          },
          {
            "speaker": "축제앱",
            "role": "system",
            "text": "[날씨 안내] 비가 온다(참) → 야외 공연장으로 이동! (우산 거짓 · 실내 통로 참 → 대기)",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "어떡해 내 앱이 비 맞고 야외로 뛰래!! 조건을 어딘가 거꾸로 짰나 본데?!",
            "expression": 3
          }
        ],
        "shortIntro": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "비가 오고 우산은 없지만 실내 통로는 열렸어! NOT랑 OR를 바르게 고쳐서 비를 피하자!",
            "expression": 4
          }
        ],
        "wrongReaction": {
          "expression": 4,
          "line": "으악, 빗방울 더 세지는데 앱이 아직도 야외로 가거나 대기하래! NOT(아니다)랑 OR(또는)을 다시 살펴보자!"
        },
        "firstTrySuccess": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "아싸!! 비 한 방울 안 맞고 실내 통로로 쏙 들어왔다! 우산 또는 실내 통로 둘 중 하나만 참이어도(둘 다 참이어도!) OR은 참이구나!",
            "expression": 2
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "그리고 비가 오지 않을 때를 판단할 땐 '아니다(비가 온다)'로 뒤집어 쓰는 거, 완전 깔끔해!",
            "expression": 1
          }
        ],
        "retrySuccess": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "휴, 이제야 실내 부스로 잘 안내하네! 비 다 맞을 뻔했는데 살았다.",
            "expression": 0
          }
        ]
      },
      "teacher": {
        "ask": "우산이 없고 실내 통로만 열렸을 때 OR 결과는 무엇이며, NOT은 어떤 역할을 할까요?",
        "answer": "OR는 하나 이상 참(둘 다 참도 포함)이면 참이므로 실내로 이동합니다. NOT은 '비가 온다'의 참·거짓을 반대로 뒤집습니다.",
        "watch": "OR를 '정확히 하나만 참'으로 오해하거나, NOT이 별개 조건을 만든다고 착각하지 않도록 지도합니다.",
        "short": "NOT(비가 온다)과 우산 OR 실내 통로를 바르게 고쳐 실내로 대피합니다."
      }
    },
    {
      "id": "ch2-5",
      "kind": "concept",
      "graded": true,
      "questionId": "ch2-q4",
      "conceptTitle": "다중 선택(만일~아니면) 분기 순서",
      "experiment": "prize",
      "title": "버그 8 · 스탬프 10장 모았는데 스티커가 웬 말?!",
      "topic": "다중 선택 · 위에서부터 검사하는 분기 순서",
      "minutes": "2:00",
      "background": "day",
      "channel": "축제 교정 · 함께 다니는 중",
      "quote": "하루: \"우리 둘이 10장이나 모았는데 왜 VIP 큰 키링 대신 별 스티커가 나와?! 분명 세 조건 다 넣었는데!\"",
      "goalPrompt": "교환권 10장을 넣으면 큰 키링이 나오도록 경품 자판기의 다중 선택 조건을 고치세요!",
      "observe": "'만일 ~ 아니면' 구조는 위에서부터 차례로 검사해 처음 참이 된 분기 하나만 실행하고 아래는 건너뜁니다.",
      "goal": {
        "mode": "fix-order",
        "tickets": 10,
        "tiers": [
          { "key": "large", "min": 10, "label": "큰 키링" },
          { "key": "small", "min": 5, "label": "작은 키링" },
          { "key": "sticker", "min": 3, "label": "별 스티커" }
        ],
        "initialOrder": "asc",
        "expectedOrder": "desc",
        "wrongHints": {
          "asc": "위에서부터 차례로 검사할 때 '교환권 ≥ 3'이 맨 위에 있으면 10 ≥ 3도 참이 되어 첫 분기에서 바로 별 스티커를 주고 끝나요! 아래쪽 '≥ 5'와 '≥ 10'은 아예 검사조차 못 하므로, 가장 큰 조건(≥ 10)부터 위쪽에 놓아야 해요!"
        },
        "defaultWhy": "다중 선택은 위에서부터 처음 참이 되는 분기 하나만 실행해요! 큰 기준(≥ 10 → ≥ 5 → ≥ 3) 순서로 배치해 보세요."
      },
      "flow": {
        "intro": [
          {
            "speaker": "내 생각",
            "role": "narration",
            "text": "실내 통로 게임 부스를 휩쓸고 다닌 끝에, 우리 손엔 무려 기념품 교환권 10장이 모였다.",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "야, 10장 채웠어!! 대박, 이제 내 야심작 경품 자판기에서 커플… 아니, 기념 '큰 키링' 뽑자!!",
            "expression": 2
          },
          {
            "speaker": "경품 자판기",
            "role": "system",
            "text": "교환권 10장 투입 → ① (10 ≥ 3) 참! → 지급 상품: [별 스티커]",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "잠깐만. 지금 내 손바닥 위에 떨어진 거 별 스티커 한 장 맞지…? 내 큰 키링 어디 갔어?!",
            "expression": 3
          },
          {
            "speaker": "나",
            "role": "me",
            "text": "10장이면 3장 이상도 맞긴 하지… 자판기가 조건을 어떤 순서로 검사하는지 보자.",
            "expression": 5
          }
        ],
        "shortIntro": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "교환권 10장을 넣었는데 별 스티커가 나왔어! 다중 선택 조건 순서를 고쳐서 큰 키링을 받아 보자!",
            "expression": 3
          }
        ],
        "wrongReaction": {
          "expression": 4,
          "line": "또 별 스티커만 툭 떨어졌어…! 조건을 어떤 순서로 위에서부터 검사해야 10장이 큰 키링으로 갈까?"
        },
        "firstTrySuccess": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "드디어 나왔다!! 왕 큰 키링!! 내 가방이랑 네 가방에 하나씩 달면 딱이겠다!!",
            "expression": 2
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "만일~아니면은 위에서부터 처음 참을 만나면 아래는 건너뛰니까, 제일 까다로운 10장 이상부터 검사해야 하는 거구나!",
            "expression": 0
          }
        ],
        "retrySuccess": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "와, 큰 키링 받았다! 조건 순서 하나 바꿨을 뿐인데 결과가 완전히 달라지네.",
            "expression": 0
          }
        ]
      },
      "teacher": {
        "ask": "교환권이 10장일 때 '≥ 3'을 '≥ 10'보다 먼저 검사하면 왜 문제가 될까요?",
        "answer": "10은 3 이상이기도 하므로 첫 조건에서 바로 참이 되어 별 스티커 분기만 실행하고 아래 분기는 검사하지 않기 때문입니다. 큰 범위부터 차례로 검사해야 합니다.",
        "watch": "다중 선택에서 여러 조건이 동시에 실행되는 것이 아니라, 위에서 처음 참인 분기 하나만 실행됨을 강조합니다.",
        "short": "작은 조건 우선 순서를 큰 조건 우선(≥ 10 → ≥ 5 → ≥ 3)으로 고칩니다."
      }
    },
    {
      "id": "ch2-6",
      "kind": "story",
      "heartChoice": true,
      "title": "비 그친 교정의 벤치 · 마음 선택지 ①",
      "topic": "마음 선택지 · 저녁 약속",
      "minutes": "1:00",
      "background": "day",
      "channel": "축제 교정 · 함께 다니는 중",
      "lines": [
        {
          "speaker": "내 생각",
          "role": "narration",
          "text": "소나기가 그치고 교정에 맑은 햇살이 비쳤다. 우리는 받은 {{prizeName}}을 나란히 흔들어 보며 벤치에 잠깐 앉았다.",
          "expression": 0
        },
        {
          "speaker": "하루",
          "role": "haru",
          "text": "아참 {{vocative}}, 저녁 노을 질 때 운동장에서 하는 빛그림 점등식 기억나?",
          "expression": 0
        },
        {
          "speaker": "하루",
          "role": "haru",
          "text": "사실 내가 맡은 중앙 드론 조명 자리가 하나 남았는데… 다른 준비팀 애들이 채우자는 거 내가 일부러 비워 뒀거든.",
          "expression": 1
        },
        {
          "speaker": "하루",
          "role": "haru",
          "text": "버그 고쳐 달라는 핑계 말고… 그냥 오늘 너랑 같이 있는 게 좋아서. 이따 저녁에도 나랑 계속 같이 있어 줄래?",
          "expression": 1
        }
      ],
      "shortLines": [
        {
          "speaker": "하루",
          "role": "haru",
          "text": "사실 운동장 점등식 중앙 자리, 일부러 비워 뒀어. 그냥 너랑 같이 있고 싶어서… 이따 저녁에도 같이 있어 줄래?",
          "expression": 1
        }
      ],
      "choices": [
        {
          "key": "warm",
          "label": "당연하지. 네가 만든 거 옆에 내 조명도 나란히 띄우고 싶은걸.",
          "cold": false,
          "reply": [
            {
              "speaker": "하루",
              "role": "haru",
              "text": "진짜?! …방금 한 말 절대 취소 못 한다?",
              "expression": 3
            },
            {
              "speaker": "하루",
              "role": "haru",
              "text": "헤헤, 좋아! 그럼 공연 시작 전에 운동장으로 같이 가자. 네 자리 딱 비워 뒀어!",
              "expression": 1
            },
            {
              "speaker": "내 생각",
              "role": "narration",
              "text": "하루가 가방에 {{prizeName}}을 매달며 환하게 웃었다. 발걸음이 아까보다 한결 가벼워 보였다.",
              "expression": 0
            }
          ]
        },
        {
          "key": "cold",
          "label": "그냥 준비팀 마감이 급해서 부르는 거지? 시간 맞춰 작업 마무리만 돕고 갈게.",
          "cold": true,
          "reply": [
            {
              "speaker": "하루",
              "role": "haru",
              "text": "아… 어? 그, 그렇구나…",
              "expression": 3
            },
            {
              "speaker": "하루",
              "role": "haru",
              "text": "하하, 내가 괜히 혼자 들떠서 사적인 말처럼 했네. 미안, 딱 작업 마무리까지만 잘 해보자. 고마워.",
              "expression": 4
            },
            {
              "speaker": "내 생각",
              "role": "narration",
              "text": "하루가 멋쩍게 웃으며 고개를 돌렸다. 방금 전까지 반짝이던 표정이 조용히 식은 것 같았다.",
              "expression": 0
            }
          ]
        }
      ],
      "teacher": {
        "ask": "이 장면은 이야기 분기에 어떤 영향을 미칠까요?",
        "answer": "마음 선택지입니다. 거리를 두는 선택(cold)을 고르면 모든 문제를 맞혀도 최종 결말이 '썸 시작' 대신 '찐친'으로 분기합니다.",
        "watch": "학생이 자신의 선택이 관계 엔딩 조건에 영향을 준다는 점을 자연스럽게 느끼게 합니다.",
        "short": "하루의 고백성 제안에 대한 태도를 선택합니다."
      }
    },
    {
      "id": "ch2-7",
      "kind": "summary",
      "title": "2챕터 완료 · 낮의 교정 돌파",
      "topic": "선택 제어와 논리 연산 정리",
      "minutes": "0:40",
      "background": "day",
      "channel": "축제 교정 · 함께 다니는 중",
      "cards": [
        [
          "비교 연산과 경계값",
          "비교 결과는 항상 참·거짓이에요. 기준과 같은 수까지 포함하려면 ≥·≤를 사용해요."
        ],
        [
          "논리 연산 AND · OR · NOT",
          "AND는 둘 다 참일 때만 참, OR은 하나 이상 참(둘 다 참 포함)이면 참, NOT은 참·거짓을 뒤집어요."
        ],
        [
          "다중 선택 분기 순서",
          "'만일 ~ 아니면'은 위에서부터 검사해 처음 참이 된 분기 하나만 실행하고 아래는 건너뛰어요."
        ]
      ],
      "extra": "순차(차례대로) · 선택(조건에 따라) · 반복(여러 번 되풀이) 세 가지 제어 구조가 프로그램을 이룹니다.",
      "mission": "이제 노을 진 운동장으로 이동해 마지막 빛그림 점등식의 반복 버그를 해결해 보세요!",
      "teacher": {
        "ask": "경계값(≥), 논리 연산(AND·OR·NOT), 분기 순서 중 실생활에서 가장 자주 틀리는 부분은 어디였나요?",
        "answer": "'>'와 '≥'의 경계값 오차와 다중 선택에서 작은 조건을 먼저 적는 순서 버그가 대표적입니다.",
        "watch": "2챕터 결과를 확인하고 3챕터(노을 진 운동장)로 이어집니다.",
        "short": "2챕터 핵심 카드를 확인하고 3챕터로 이동합니다."
      }
    }
  ]
};
