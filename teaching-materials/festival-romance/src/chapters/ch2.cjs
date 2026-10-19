module.exports = {
  "id": 2,
  "title": "너랑 가는 길",
  "subject": "조건",
  "subtitle": "같은 약속, 달라지는 축제 길",
  "duration": "약 13분",
  "recap": "하루와 {{meetingTime}}에 정문에서 만나기로 했습니다. 초대장에는 {{ticketName}} 이름이 적혀 있습니다.",
  "scenes": [
    {
      "id": "ch2-1",
      "kind": "story",
      "title": "일찍 온 사람 둘",
      "topic": "지난 이야기 · 정문 약속",
      "minutes": "0:40",
      "background": "day",
      "lines": [
        {
          "speaker": "내 생각",
          "role": "narration",
          "text": "약속한 {{meetingTime}}보다 조금 일찍 정문에 도착했다. 하루는 이미 안내판 옆에 서 있었다.",
          "expression": 0
        },
        {
          "speaker": "하루",
          "role": "haru",
          "text": "나도 방금 왔어. 안내판 보고 있던 참이야.",
          "expression": 2
        },
        {
          "speaker": "축제 안내판",
          "role": "system",
          "text": "하루 님 입장: 12분 전.",
          "expression": 1
        },
        {
          "speaker": "나",
          "role": "me",
          "text": "생각보다 안내판을 오래 봤네?",
          "expression": 0
        },
        {
          "speaker": "하루",
          "role": "haru",
          "text": "갈 만한 곳이 많더라고. 너 오면 같이 고르려고 기다렸어.",
          "expression": 2
        },
        {
          "speaker": "내 생각",
          "role": "narration",
          "text": "하루가 들고 있던 축제 지도 한쪽이 여러 번 접혀 있었다.",
          "expression": 0
        }
      ],
      "shortLines": [
        {
          "speaker": "내 생각",
          "role": "narration",
          "text": "약속한 {{meetingTime}}보다 조금 일찍 정문에 도착했다. 하루는 이미 안내판 옆에 서 있었다.",
          "expression": 0
        },
        {
          "speaker": "하루",
          "role": "haru",
          "text": "나도 방금 왔어. 안내판 보고 있던 참이야.",
          "expression": 2
        },
        {
          "speaker": "축제 안내판",
          "role": "system",
          "text": "하루 님 입장: 12분 전.",
          "expression": 1
        },
        {
          "speaker": "하루",
          "role": "haru",
          "text": "갈 만한 곳이 많더라고. 너 오면 같이 고르려고 기다렸어.",
          "expression": 2
        }
      ],
      "teacher": {
        "ask": "안내판은 어떤 값을 저장했다가 화면에 보여 준 걸까요?",
        "answer": "입장 시각처럼 저장된 값을 처리해 출력한 장면으로 연결합니다.",
        "watch": "이 장면은 저장된 값과 출력의 예시입니다. 하루의 말이 조건문의 정답은 아닙니다.",
        "short": "안내판과 하루의 대사를 읽고 부스 선택으로 넘어갑니다."
      },
      "channel": "축제 현장 · 함께 다니는 중"
    },
    {
      "id": "ch2-2",
      "kind": "concept",
      "experiment": "math",
      "optional": true,
      "title": "두 사람의 평균 티켓",
      "topic": "산술 연산과 괄호",
      "minutes": "1:40",
      "quote": "하루: “내 기록엔 6장, 네 기록엔 4장이야. 두 사람 평균을 계산해 볼까?”",
      "teacher": {
        "ask": "6 + 4 ÷ 2와 (6 + 4) ÷ 2의 결과는 왜 다를까요?",
        "answer": "괄호가 없으면 나눗셈부터 해서 8, 괄호가 있으면 합 10을 2로 나눠 평균 5입니다. 7÷2의 몫은 3, 나머지는 1입니다.",
        "watch": "평균 계산은 선택 확장입니다. 이 값은 부스 입장권 수를 결정하지 않습니다.",
        "short": "확장 활동입니다. 기본 이야기에서는 생략하며 목차에서 직접 열 수 있습니다."
      },
      "channel": "축제 현장 · 함께 다니는 중"
    },
    {
      "id": "ch2-3",
      "kind": "concept",
      "experiment": "compare",
      "title": "어느 부스에 들어갈 수 있을까?",
      "topic": "비교와 그리고 · 입장 판단",
      "minutes": "1:30",
      "quote": "하루: “입장권은 쓰지 않고 보유 수만 확인하는 체험이래. 필요한 수 이상인지 살펴보자.”",
      "flow": {
        "intro": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "사진 부스가 저쪽이고 게임 부스는 그 옆이래.",
            "expression": 2
          },
          {
            "speaker": "나",
            "role": "me",
            "text": "아까부터 지도를 보고 있었던 거야?",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "네가 좋아할 만한 것도 찾아봤어. 먼저 어디 가고 싶어?",
            "expression": 2
          },
          {
            "speaker": "내 생각",
            "role": "narration",
            "text": "안내판에는 필요한 입장권 수와 운영 시작 여부가 함께 적혀 있었다.",
            "expression": 0
          }
        ],
        "shortIntro": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "어느 부스부터 갈까? 필요한 입장권 수와 운영 시작 여부를 함께 확인하자.",
            "expression": 2
          }
        ],
        "options": [
          {
            "key": "photo",
            "label": "사진 한 장 찍자.",
            "params": {
              "booth": "photo",
              "threshold": 6
            }
          },
          {
            "key": "game",
            "label": "게임 부스부터 가 보자.",
            "params": {
              "booth": "game",
              "threshold": 4
            }
          }
        ],
        "responses": {
          "allowed": [
            {
              "speaker": "하루",
              "role": "haru",
              "text": "{{boothName}}에 들어갈 수 있대. 같이 들어가자. 네가 먼저 해 볼래?",
              "expression": 2
            },
            {
              "speaker": "나",
              "role": "me",
              "text": "좋아. 다음에는 네 차례야.",
              "expression": 0
            }
          ],
          "blocked": [
            {
              "speaker": "하루",
              "role": "haru",
              "text": "{{boothName}}에 가려면 표가 더 필요하네. 다른 곳을 먼저 둘러보다가 다시 오자.",
              "expression": 2
            },
            {
              "speaker": "나",
              "role": "me",
              "text": "응. 같이 갈 데는 아직 많으니까.",
              "expression": 0
            }
          ],
          "wait": [
            {
              "speaker": "하루",
              "role": "haru",
              "text": "{{boothName}}은 아직 운영 전이네. 시간 좀 남았으니까 주변을 먼저 둘러볼까?",
              "expression": 2
            },
            {
              "speaker": "나",
              "role": "me",
              "text": "좋아. 문 열면 다시 와 보자.",
              "expression": 0
            }
          ]
        }
      },
      "teacher": {
        "ask": "입장권 수가 기준과 같고 부스도 운영 중이면 들어갈 수 있을까요? 둘 중 하나라도 거짓이면 어떻게 될까요?",
        "answer": "기준 이상은 ≥이며, 같은 수를 포함합니다. 입장권 수 기준과 운영 상태를 그리고(AND)로 연결해 모두 참일 때만 입장 가능합니다.",
        "watch": "이 실험은 입장 자격을 확인하며 입장권을 차감하지 않습니다. 기준과 같을 때도 포함하는 ≥를 사용합니다.",
        "short": "선택한 부스의 기준을 보유 수와 비교합니다."
      },
      "observe": "입장권 비교 결과와 운영 상태를 그리고로 연결해, 두 조건이 모두 참일 때만 입장 가능한지 확인합니다.",
      "channel": "축제 현장 · 함께 다니는 중"
    },
    {
      "id": "ch2-4",
      "kind": "concept",
      "experiment": "and",
      "title": "입장 신호에 필요한 두 조건",
      "topic": "논리 연산 · 그리고",
      "minutes": "1:30",
      "quote": "하루: “입장권이 있는지, 부스가 운영 중인지 둘 다 확인해야 입장할 수 있대.”",
      "flow": {
        "intro": [
          {
            "speaker": "하루",
            "text": "{{boothName}}에 들어가려면 입장권 기준을 채우고 운영도 시작해야 한대. 두 가지를 같이 확인해 보자.",
            "expression": 2
          }
        ],
        "shortIntro": [
          {
            "speaker": "하루",
            "text": "{{boothName}}에 들어가려면 입장권 기준을 채우고 운영도 시작해야 한대. 두 가지를 같이 확인해 보자.",
            "expression": 2
          }
        ],
        "options": [
          {
            "key": "check",
            "label": "두 조건의 입장 신호를 확인한다"
          }
        ],
        "responses": {
          "ready": [
            {
              "speaker": "하루",
              "text": "{{boothName}}도 준비됐네. 같이 들어가자. 네가 먼저 해 볼래?",
              "expression": 2
            }
          ],
          "wait": [
            {
              "speaker": "하루",
              "text": "{{boothName}}에 지금은 들어갈 수 없나 봐. 그동안 다른 곳을 둘러보자.",
              "expression": 2
            }
          ]
        }
      },
      "teacher": {
        "ask": "입장권 보유 수 기준 충족과 부스 운영 시작이 모두 필요하다면 한 조건이 거짓일 때 결과는 어떨까요?",
        "answer": "AND는 두 조건이 모두 참일 때만 참입니다. 한 조건이라도 거짓이면 대기 신호가 됩니다.",
        "watch": "입장권 보유 수 조건은 앞 장면의 결과를 이어받습니다. 두 체크박스를 바꾸면 가정한 상황의 참·거짓을 비교할 수 있습니다.",
        "short": "확장 활동입니다. 기본 이야기에서는 생략하며 목차에서 직접 열 수 있습니다."
      },
      "observe": "입장권 보유와 부스 운영이 모두 참일 때만 입장 신호가 켜지는지 봅니다.",
      "channel": "축제 현장 · 함께 다니는 중",
      "optional": true
    },
    {
      "id": "ch2-5",
      "kind": "concept",
      "experiment": "or",
      "title": "비를 피할 수 있는 방법",
      "topic": "논리 연산 · 또는 · 아니다",
      "minutes": "1:20",
      "quote": "하루: “우산이나 실내 통로 중 하나만 있어도 비를 피할 수 있을까?”",
      "flow": {
        "intro": [
          {
            "speaker": "하루",
            "text": "비가 올 것 같은데 우산 챙겼어? 실내 통로도 있는지 확인해 보자.",
            "expression": 2
          }
        ],
        "shortIntro": [
          {
            "speaker": "하루",
            "text": "비가 올 것 같은데 우산 챙겼어? 실내 통로도 있는지 확인해 보자.",
            "expression": 2
          }
        ],
        "options": [
          {
            "key": "check-method",
            "label": "비를 피할 방법을 조건으로 확인한다"
          }
        ],
        "responses": {
          "default": [
            {
              "speaker": "하루",
              "text": "움직이기 전에 지도도 보자. 비가 와도 다닐 길이 있는지 확인하게.",
              "expression": 2
            }
          ]
        }
      },
      "teacher": {
        "ask": "우산이 없고 실내 통로가 열려 있으면 OR 결과는 무엇일까요? ‘우산이 있다’를 NOT로 뒤집으면 어떤 뜻일까요?",
        "answer": "OR는 두 조건 중 하나 이상이 참이면 참이며, 둘 다 참이어도 참입니다. NOT는 ‘우산이 있다’의 참·거짓을 뒤집어 ‘우산이 없다’를 판단합니다.",
        "watch": "OR는 정확히 하나만 참이라는 뜻이 아닙니다. NOT는 별개의 비 조건이 아니라 같은 ‘우산이 있다’ 조건의 참·거짓을 뒤집습니다.",
        "short": "확장 활동입니다. 기본 이야기에서는 생략하며 목차에서 직접 열 수 있습니다."
      },
      "observe": "OR는 우산이나 실내 통로 중 하나 이상이 참이면 참인지, NOT는 ‘우산이 있다’를 ‘우산이 없다’로 뒤집는지 확인합니다.",
      "channel": "축제 현장 · 함께 다니는 중",
      "optional": true
    },
    {
      "id": "ch2-6",
      "kind": "concept",
      "experiment": "route",
      "title": "날씨에 맞는 길을 고르자",
      "topic": "또는·아니다와 선택 구조",
      "minutes": "1:50",
      "quote": "하루: “비가 오면 실내 부스로 가고, 맑으면 야외 공연부터 보자.”",
      "flow": {
        "intro": [
          {
            "speaker": "내 생각",
            "role": "narration",
            "text": "다음 부스로 가려는데 운동장 쪽에서 바람이 불었다. 사람들이 하늘을 한 번씩 올려다봤다.",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "비가 올 것 같은데. 우산 챙겼어?",
            "expression": 2
          },
          {
            "speaker": "나",
            "role": "me",
            "text": "안 가져왔어. 멀리 돌아가야 하나?",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "여기 실내 통로도 있대. 비가 오는지, 피할 방법이 있는지 같이 보고 정하자.",
            "expression": 2
          }
        ],
        "shortIntro": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "비가 오는지, 우산이나 실내 통로가 있는지 보고 다음 길을 정하자.",
            "expression": 2
          }
        ],
        "options": [
          {
            "key": "choose-route",
            "label": "현재 날씨에 맞는 길을 확인한다"
          }
        ],
        "responses": {
          "indoor": [
            {
              "speaker": "하루",
              "role": "haru",
              "text": "실내로 가자. 저 통로 끝에 부스가 더 있대.",
              "expression": 2
            },
            {
              "speaker": "나",
              "role": "me",
              "text": "좋아. 이번에는 내가 지도 볼게.",
              "expression": 0
            }
          ],
          "outdoor": [
            {
              "speaker": "하루",
              "role": "haru",
              "text": "비가 안 오니까 야외 공연부터 보자. 아직 앞자리가 비어 있어.",
              "expression": 2
            },
            {
              "speaker": "나",
              "role": "me",
              "text": "빨리 가자. 같이 보고 싶은 공연이 있었어.",
              "expression": 0
            }
          ],
          "wait": [
            {
              "speaker": "하루",
              "role": "haru",
              "text": "비를 피해서 갈 방법이 없네. 조금 기다렸다 가자.",
              "expression": 2
            },
            {
              "speaker": "나",
              "role": "me",
              "text": "괜찮아. 여기 앉아서 다음에 갈 곳 골라도 되겠다.",
              "expression": 0
            }
          ]
        }
      },
      "teacher": {
        "ask": "비가 오는데 우산은 없고 실내 통로는 열려 있으면 갈 수 있을까요? 둘 다 없다면요?",
        "answer": "우산 OR 실내 통로 중 하나 이상이 참이면 비를 피할 방법이 있습니다. 비가 오고 둘 다 없으면 기다립니다. 비가 오지 않으면 야외로 갑니다. NOT(비가 온다)는 비가 오지 않는다는 판단입니다.",
        "watch": "OR는 둘 다 참이어도 참입니다. NOT는 같은 비 조건을 뒤집습니다. 한 번의 실행에서는 한 경로만 선택합니다.",
        "short": "비와 맑음 경로를 한 번씩 실행합니다."
      },
      "observe": "우산 또는 실내 통로가 있으면 비를 피할 방법이 있습니다. 비가 아니다의 판단도 확인하고 한 경로를 실행합니다.",
      "channel": "축제 현장 · 함께 다니는 중"
    },
    {
      "id": "ch2-7",
      "kind": "concept",
      "experiment": "prize",
      "title": "교환권으로 받는 기념품",
      "topic": "여러 경우로 나누는 선택",
      "minutes": "1:40",
      "quote": "하루: “입장권과 별도로 기념품 교환권을 받았어. 교환권 수로 기념품을 확인해 보자.”",
      "flow": {
        "intro": [
          {
            "speaker": "내 생각",
            "role": "narration",
            "text": "함께 돌아다니다 보니 부스에서 받은 기념품 교환권이 꽤 모였다.",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "이거 그냥 주머니에 넣어 뒀는데, 기념품이랑 바꿀 수 있대.",
            "expression": 2
          },
          {
            "speaker": "나",
            "role": "me",
            "text": "어떤 게 있는데?",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "키링이랑 별 스티커. 오늘 같이 다닌 기념으로 하나 남기면 좋겠다.",
            "expression": 2
          }
        ],
        "shortIntro": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "부스에서 받은 기념품 교환권으로 오늘 기념품 하나 남기자. 무엇을 받을 수 있을까?",
            "expression": 2
          }
        ],
        "options": [
          {
            "key": "exchange",
            "label": "기념품 교환권 수로 기념품을 확인한다"
          }
        ],
        "responses": {
          "large": [
            {
              "speaker": "하루",
              "text": "{{prizeName}} 받았네. 가방에 달면 멀리서도 바로 알아보겠다.",
              "expression": 2
            }
          ],
          "small": [
            {
              "speaker": "하루",
              "text": "{{prizeName}}이면 네 가방에 잘 어울리겠다. 달아 볼래?",
              "expression": 2
            }
          ],
          "sticker": [
            {
              "speaker": "하루",
              "text": "{{prizeName}}는 초대장에 붙이면 예쁘겠다. 네 이름 옆에 붙여 줄까?",
              "expression": 2
            }
          ],
          "default": [
            {
              "speaker": "하루",
              "text": "{{prizeName}}도 챙겼으니 잠깐 쉬었다 가자.",
              "expression": 2
            }
          ]
        }
      },
      "teacher": {
        "ask": "기념품 교환권이 6장이면 8장 이상과 5장 이상 중 어느 분기에서 멈출까요?",
        "answer": "8장 이상은 거짓, 5장 이상은 참이므로 작은 키링입니다. 8장이면 첫 조건만 참이라 큰 키링 하나를 받습니다.",
        "watch": "기념품 교환권은 기념품 교환용이며 입장권과 별개입니다. 조건은 위에서부터 검사합니다.",
        "short": "6장과 8장를 실행해 두 경로를 비교합니다."
      },
      "observe": "기념품 교환권 수에 따라 위에서부터 조건을 검사해 기념품 하나만 선택하는지 확인합니다.",
      "channel": "축제 현장 · 함께 다니는 중"
    },
    {
      "id": "ch2-8",
      "kind": "story",
      "title": "잠깐 쉬어 가는 길",
      "topic": "선택한 경로와 기념품",
      "minutes": "1:20",
      "background": "day",
      "lines": [
        {
          "speaker": "내 생각",
          "role": "narration",
          "text": "{{routeDescription}} 기념품으로 받은 {{prizeName}}도 챙기고 벤치에 잠깐 앉았다.",
          "expression": 0
        },
        {
          "speaker": "하루",
          "role": "haru",
          "text": "이따 운동장에도 같이 가자. 어제 말한 빛그림 점등식을 준비해야 하거든.",
          "expression": 2
        },
        {
          "speaker": "나",
          "role": "me",
          "text": "운동장 조명들이 한꺼번에 켜지는 거지?",
          "expression": 0
        },
        {
          "speaker": "하루",
          "role": "haru",
          "text": "응. 준비팀이 앱에서 불빛 움직임을 미리 보고 조명 위치를 정해. 마지막에 내가 맡은 자리 하나를 너랑 같이 채우고 싶었어.",
          "expression": 2
        },
        {
          "speaker": "나",
          "role": "me",
          "text": "그럼 내가 골라도 돼?",
          "expression": 0
        },
        {
          "speaker": "하루",
          "role": "haru",
          "text": "같이 고르려고 기다린 거야. 공연 끝나기 전에 가 보자.",
          "expression": 2
        }
      ],
      "shortLines": [
        {
          "speaker": "내 생각",
          "role": "narration",
          "text": "{{routeDescription}} 기념품으로 받은 {{prizeName}}도 챙기고 벤치에 잠깐 앉았다.",
          "expression": 0
        },
        {
          "speaker": "나",
          "role": "me",
          "text": "그럼 내가 골라도 돼?",
          "expression": 0
        },
        {
          "speaker": "하루",
          "role": "haru",
          "text": "같이 고르려고 기다린 거야. 공연 끝나기 전에 가 보자.",
          "expression": 2
        }
      ],
      "teacher": {
        "ask": "같은 규칙에서 입력을 바꾸면 어떤 결과가 달라졌나요?",
        "answer": "날씨 입력은 이동 경로를 바꾸고, 기념품 교환권 수는 기념품 선택을 바꿉니다. 입장권 수는 기념품 교환에서 차감하지 않습니다.",
        "watch": "기념품 교환용 기념품 교환권과 부스 입장권을 구분합니다. 이야기에는 실행 결과가 반영됩니다.",
        "short": "선택한 경로와 기념품을 확인하고 운동장 약속으로 넘어갑니다."
      },
      "channel": "축제 현장 · 함께 다니는 중"
    },
    {
      "id": "ch2-9",
      "kind": "summary",
      "title": "조건에 따라 달라지는 길",
      "topic": "조건 수업 정리",
      "minutes": "1:00",
      "cards": [
        [
          "비교 연산",
          "두 값을 비교한 결과는 참·거짓이에요. 같은 값까지 포함하려면 ≥·≤를 써요."
        ],
        [
          "논리 연산",
          "그리고·또는·아니다로 여러 조건을 묶어 하나의 판단을 만들어요."
        ],
        [
          "선택 구조",
          "조건을 검사해 실행할 명령을 정해요. 경계값도 확인해요."
        ]
      ],
      "extra": "순차: 차례대로 실행 / 선택: 조건에 따라 실행 / 반복: 같은 명령을 여러 번 실행",
      "mission": "사이트에서 평균 계산과 조건에 따른 판정 미션을 직접 만들어 보세요.",
      "teacher": {
        "ask": "보유 수가 기준과 정확히 같을 때도 포함하려면 어떤 비교를 써야 할까요?",
        "answer": "‘크거나 같다(≥)’ 또는 ‘작거나 같다(≤)’처럼 같은 값을 포함하는 비교를 사용합니다.",
        "watch": "숫자 계산 결과와 참·거짓인 판단 결과를 구분합니다.",
        "short": "각 카드에서 한 문장씩 읽고 사이트 실습으로 전환합니다."
      },
      "channel": "축제 현장 · 함께 다니는 중"
    }
  ]
};
