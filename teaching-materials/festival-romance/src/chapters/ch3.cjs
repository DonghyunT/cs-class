module.exports = {
  "id": 3,
  "title": "마지막 불이 켜지면",
  "subject": "반복",
  "subtitle": "오늘의 불빛, 내일의 약속",
  "duration": "약 13분",
  "recap": "하루는 축제 준비팀에서 빛그림 점등식의 조명 배치를 맡았습니다. 함께 채울 자리 하나를 남겨 두었다고 했습니다.",
  "scenes": [
    {
      "id": "ch3-1",
      "kind": "story",
      "title": "마지막 공연 10분 전",
      "topic": "지난 이야기 · 운동장에서 만나",
      "minutes": "0:40",
      "background": "dusk",
      "lines": [
        {
          "speaker": "내 생각",
          "role": "narration",
          "text": "운동장 가장자리에 작은 조명들이 놓여 있었다. 아직 꺼져 있지만 바닥에는 여러 도형의 윤곽이 그려져 있었다.",
          "expression": 0
        },
        {
          "speaker": "하루",
          "role": "haru",
          "text": "이게 빛그림 점등식이야. 마지막 공연이 끝나면 이 조명들이 같이 켜져.",
          "expression": 2
        },
        {
          "speaker": "나",
          "role": "me",
          "text": "아까 말한 빈자리가 여기구나.",
          "expression": 0
        },
        {
          "speaker": "하루",
          "role": "haru",
          "text": "응. 앱에서 깜빡임을 시험하고, 우리가 만든 도형 배치도를 진행팀에 보내면 돼.",
          "expression": 2
        },
        {
          "speaker": "나",
          "role": "me",
          "text": "네가 준비한 것들 옆에 내 것도 들어가는 거네.",
          "expression": 0
        },
        {
          "speaker": "하루",
          "role": "haru",
          "text": "그래서 너랑 같이 하고 싶었어. 우선 불이 제대로 켜지는지부터 봐줄래?",
          "expression": 2
        }
      ],
      "shortLines": [
        {
          "speaker": "내 생각",
          "role": "narration",
          "text": "운동장 가장자리에 작은 조명들이 놓여 있었다. 아직 꺼져 있지만 바닥에는 여러 도형의 윤곽이 그려져 있었다.",
          "expression": 0
        },
        {
          "speaker": "나",
          "role": "me",
          "text": "네가 준비한 것들 옆에 내 것도 들어가는 거네.",
          "expression": 0
        },
        {
          "speaker": "하루",
          "role": "haru",
          "text": "그래서 너랑 같이 하고 싶었어. 우선 불이 제대로 켜지는지부터 봐줄래?",
          "expression": 2
        }
      ],
      "teacher": {
        "ask": "같은 불빛 동작을 여러 번 실행하려면 명령을 어떻게 묶으면 좋을까요?",
        "answer": "켜기·기다리기·끄기처럼 이어지는 명령을 한 묶음으로 만들고 반복할 수 있습니다.",
        "watch": "이야기의 조명 배치도는 반복과 도형 명령을 확인하는 도입입니다.",
        "short": "하루의 부탁과 조명 장치의 역할을 읽고 활동으로 넘어갑니다."
      },
      "channel": "운동장 · 빛그림 점등식"
    },
    {
      "id": "ch3-2",
      "kind": "concept",
      "experiment": "repeatCompare",
      "optional": true,
      "title": "같은 동작을 묶어 보기",
      "topic": "반복으로 같은 명령 줄이기",
      "minutes": "1:20",
      "quote": "삐빅: “켜기, 기다리기, 끄기를 네 번 적는 방법과 반복 블록을 비교합니다.”",
      "teacher": {
        "ask": "같은 명령을 한 번만 적어도 반복 블록 안에 넣으면 여러 번 실행될까요?",
        "answer": "네 번 복사한 명령과 네 번 반복하는 블록은 같은 명령 묶음을 네 번 실행합니다.",
        "watch": "명령을 적은 줄 수와 실제 실행 횟수는 다를 수 있습니다.",
        "short": "확장 활동입니다. 기본 이야기에서는 생략하며 목차에서 직접 열 수 있습니다."
      },
      "channel": "운동장 · 빛그림 점등식"
    },
    {
      "id": "ch3-3",
      "kind": "concept",
      "experiment": "count",
      "title": "불빛 동작을 몇 번 반복할까?",
      "topic": "정해진 횟수만큼 반복",
      "minutes": "1:30",
      "quote": "하루: “켜기, 기다리기, 끄기가 한 묶음이야. 몇 번 실행할지 정해 보자.”",
      "flow": {
        "intro": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "조명 배치를 정하기 전에 켜졌다 꺼지는 동작부터 시험해야 해.",
            "expression": 2
          },
          {
            "speaker": "나",
            "role": "me",
            "text": "몇 번 정도 확인해 볼까?",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "우리가 알아보기 좋게 세어 보자. 몇 번 반복할래?",
            "expression": 2
          }
        ],
        "shortIntro": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "점등식에 쓸 조명이 켜졌다 꺼지는지 시험하자. 몇 번 반복할까?",
            "expression": 2
          }
        ],
        "options": [
          {
            "key": "three",
            "label": "세 번 실행",
            "params": {
              "times": 3
            }
          },
          {
            "key": "four",
            "label": "네 번 실행",
            "params": {
              "times": 4
            }
          },
          {
            "key": "six",
            "label": "여섯 번 실행",
            "params": {
              "times": 6
            }
          }
        ],
        "responses": {
          "default": [
            {
              "speaker": "하루",
              "text": "{{times}}번 잘 깜빡였네. 이제 조명 놓을 모양도 같이 정해 보자.",
              "expression": 2
            }
          ]
        }
      },
      "teacher": {
        "ask": "네 번 반복 안에 켜기→기다리기→끄기가 있으면 무엇을 네 번 할까요?",
        "answer": "안쪽 명령 묶음 전체를 네 번 실행합니다. 10만큼 움직이기를 네 번 하면 총 40만큼 움직입니다.",
        "watch": "화면의 표시는 완료한 묶음 수입니다. 반복 몸체에는 켜기·기다리기·끄기가 모두 들어 있습니다.",
        "short": "원하는 횟수를 골라 한 번씩 보거나 전체 실행으로 확인합니다."
      },
      "observe": "선택한 횟수만큼 안쪽 명령 묶음 전체가 실행되는지 확인합니다.",
      "channel": "운동장 · 빛그림 점등식"
    },
    {
      "id": "ch3-4",
      "kind": "concept",
      "experiment": "polygon",
      "title": "우리 모양의 조명 배치도",
      "topic": "정다각형과 한 바퀴 360°",
      "minutes": "2:10",
      "quote": "선택한 모양에 맞게 이동과 회전을 반복합니다.",
      "flow": {
        "intro": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "시험은 잘 됐네. 이제 우리가 맡은 자리의 모양을 정하면 돼.",
            "expression": 2
          },
          {
            "speaker": "나",
            "role": "me",
            "text": "다른 조명은 네가 전부 정한 거야?",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "응. 그래서 하나는 남겨 뒀어. 너는 어떤 모양이 좋아?",
            "expression": 2
          }
        ],
        "shortIntro": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "이제 함께 채울 조명 자리의 모양을 고르자. 어떤 모양이 좋아?",
            "expression": 2
          }
        ],
        "options": [
          {
            "key": "triangle",
            "label": "삼각형 조명",
            "params": {
              "sides": 3
            }
          },
          {
            "key": "square",
            "label": "사각형 조명",
            "params": {
              "sides": 4
            }
          },
          {
            "key": "hexagon",
            "label": "육각형 조명",
            "params": {
              "sides": 6
            }
          }
        ],
        "responses": {
          "triangle": [
            {
              "speaker": "하루",
              "text": "삼각형 조명은 처음 만들어 봤어. 생각보다 예쁘다.",
              "expression": 2
            },
            {
              "speaker": "나",
              "text": "다른 조명 옆에 놓으면 잘 어울리겠다.",
              "expression": 1
            },
            {
              "speaker": "하루",
              "text": "응. 그 자리는 너랑 같이 만든 걸 놓고 싶었어.",
              "expression": 2
            }
          ],
          "square": [
            {
              "speaker": "하루",
              "role": "haru",
              "text": "사각형 조명도 예쁘다. 다른 조명 옆에 놓으면 잘 어울리겠어.",
              "expression": 2
            },
            {
              "speaker": "나",
              "role": "me",
              "text": "좋아. 우리 둘 다 잘 보이는 쪽에 놓자.",
              "expression": 0
            }
          ],
          "hexagon": [
            {
              "speaker": "하루",
              "text": "육각형 조명도 예쁘네. 우리 둘 다 눈에 잘 보이는 쪽에 놓자.",
              "expression": 2
            },
            {
              "speaker": "나",
              "text": "좋아. 공연 시작하면 같이 보러 오자.",
              "expression": 1
            }
          ]
        }
      },
      "teacher": {
        "ask": "정삼각형을 그릴 때 실제 회전각은 안쪽 각도 60°와 같을까요?",
        "answer": "다릅니다. 실제 회전은 바깥각 120°입니다. 정n각형은 한 바퀴 360°를 n번 나누므로 회전각은 360÷n입니다.",
        "watch": "삼각형은 120°, 사각형은 90°, 육각형은 60° 회전합니다. 시작점에 돌아오는 것만으로 정다각형이 되는 것은 아닙니다.",
        "short": "선택한 모양에 맞는 회전각으로 배치도를 한 번 완성합니다."
      },
      "observe": "이동 뒤 방향이 어떻게 바뀌는지, 한 바퀴 360°를 몇 번에 나눠 도는지 관찰합니다.",
      "channel": "운동장 · 빛그림 점등식"
    },
    {
      "id": "ch3-5",
      "kind": "concept",
      "experiment": "until",
      "title": "약속 시각으로 디지털 카드 열기",
      "topic": "조건이 참이 되면 반복 종료",
      "minutes": "1:50",
      "quote": "하루: “약속 시각을 네 자리 숫자로 입력하면 카드가 열릴 거야.”",
      "flow": {
        "intro": [
          {
            "speaker": "내 생각",
            "role": "narration",
            "text": "배치도를 저장하자 하루가 휴대폰 화면을 내 쪽으로 돌렸다. 축제앱에 작은 디지털 카드가 떠 있었다.",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "점등식 기다리는 동안 이거 한번 열어 봐. 조명 준비하면서 같이 써 뒀어.",
            "expression": 2
          },
          {
            "speaker": "나",
            "role": "me",
            "text": "암호도 걸어 놨네?",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "정문에서 만나기로 한 시각이야. 숫자 네 자리로 넣으면 돼.",
            "expression": 2
          }
        ],
        "shortIntro": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "점등식을 기다리는 동안 축제앱의 디지털 카드를 열어 봐. 암호는 정문에서 만나기로 한 시각이야.",
            "expression": 2
          }
        ],
        "options": [
          {
            "key": "open-card",
            "label": "안내를 보고 약속 시각으로 카드를 연다"
          }
        ],
        "responses": {
          "default": [
            {
              "speaker": "하루",
              "role": "haru",
              "text": "카드 읽었어? 오늘 같이 와 줘서 고맙다고 말하고 싶었어.",
              "expression": 2
            },
            {
              "speaker": "나",
              "role": "me",
              "text": "나도 오늘 같이 다녀서 좋았어.",
              "expression": 0
            },
            {
              "speaker": "하루",
              "role": "haru",
              "text": "그럼 우리 조명 켜지는 것도 같이 보자. 마지막 공연이 끝나면 곧 켜질 거야.",
              "expression": 2
            }
          ]
        }
      },
      "teacher": {
        "ask": "약속 시각을 네 자리로 입력할 때 첫 답이 틀리고 다음 답이 맞으면 질문은 몇 번 나올까요?",
        "answer": "예를 들어 17:00은 1700으로 입력합니다. 오답 뒤 정답을 입력하면 두 번 묻고, 조건이 참이면 반복을 멈춥니다.",
        "watch": "‘될 때까지’는 조건을 먼저 확인하며 거짓인 동안 반복합니다. 조건이 참일 때 계속하는 while과 구분합니다.",
        "short": "힌트를 확인하고 틀린 값 뒤에 약속 시각을 입력해 카드를 엽니다."
      },
      "observe": "조건이 거짓이면 다시 입력을 묻고, 약속 시각과 같아져 참이 되면 반복이 끝나는지 확인합니다.",
      "channel": "운동장 · 빛그림 점등식"
    },
    {
      "id": "ch3-6",
      "kind": "concept",
      "experiment": "forever",
      "title": "공연 동안 계속 반짝이기",
      "topic": "계속 반복과 멈추는 기준",
      "minutes": "1:10",
      "quote": "삐빅: “계속 반복 안에 멈추는 명령이 없으면 아래 명령으로 넘어가지 않습니다.”",
      "flow": {
        "intro": [
          {
            "speaker": "하루",
            "text": "공연 동안은 조명이 계속 깜빡이게 하자. 잠깐 시험하고 멈춰 볼까?",
            "expression": 2
          }
        ],
        "shortIntro": [
          {
            "speaker": "하루",
            "text": "공연 동안은 조명이 계속 깜빡이게 하자. 잠깐 시험하고 멈춰 볼까?",
            "expression": 2
          }
        ],
        "options": [
          {
            "key": "run-stop",
            "label": "조명을 실행한 뒤 프로그램을 정지한다"
          }
        ],
        "responses": {
          "default": [
            {
              "speaker": "하루",
              "text": "조명은 잘 들어오네. 시험은 여기까지 하고 이제 공연 준비하자.",
              "expression": 2
            }
          ]
        }
      },
      "teacher": {
        "ask": "계속 반복 아래에 있는 명령은 반복을 멈추지 않아도 실행될까요?",
        "answer": "반복을 빠져나오지 않으면 다음 명령으로 진행하지 않습니다. 프로그램 정지는 전체 실행을 멈추는 동작입니다.",
        "watch": "반복 중단과 프로그램 전체 정지를 구분합니다.",
        "short": "확장 활동입니다. 기본 이야기에서는 생략하며 목차에서 직접 열 수 있습니다."
      },
      "observe": "프로그램 정지는 전체 실행을 멈추며 반복 아래 명령을 실행하지 않는지 확인합니다.",
      "channel": "운동장 · 빛그림 점등식",
      "optional": true
    },
    {
      "id": "ch3-7",
      "kind": "concept",
      "experiment": "counter",
      "title": "다섯 번 준비하면 완성",
      "topic": "변수로 세고, 조건으로 모양 바꾸기",
      "minutes": "1:30",
      "quote": "하루: “버튼을 누를 때마다 하나씩 세고, 다섯이 되면 완성 모양으로 바꾸자.”",
      "flow": {
        "intro": [
          {
            "speaker": "하루",
            "text": "이제 마지막 준비 확인만 하면 돼. 우리가 만든 {{shapeName}} 조명도 넣어 뒀어.",
            "expression": 2
          }
        ],
        "shortIntro": [
          {
            "speaker": "하루",
            "text": "이제 마지막 준비 확인만 하면 돼. 우리가 만든 {{shapeName}} 조명도 넣어 뒀어.",
            "expression": 2
          }
        ],
        "options": [
          {
            "key": "prepare",
            "label": "준비 확인 다섯 개를 마친다"
          }
        ],
        "responses": {
          "default": [
            {
              "speaker": "하루",
              "text": "이제 {{shapeName}} 조명까지 준비 끝났네. 같이 켜 보자.",
              "expression": 2
            }
          ]
        }
      },
      "teacher": {
        "ask": "0에서 시작해 클릭할 때마다 1을 더하면 다섯 번 뒤 값은 몇일까요?",
        "answer": "5입니다. 준비 횟수 ≥ 5가 참이 되어 완성 모양으로 바뀝니다.",
        "watch": "버튼 클릭 사건이 한 번씩 실행됩니다. 반복 블록이 자동으로 다섯 번 실행되는 장면과 구분합니다.",
        "short": "확장 활동입니다. 기본 이야기에서는 생략하며 목차에서 직접 열 수 있습니다."
      },
      "observe": "버튼을 누를 때마다 변수가 1씩 늘고, 5 이상에서 완성 상태가 되는지 확인합니다.",
      "channel": "운동장 · 빛그림 점등식",
      "optional": true
    },
    {
      "id": "ch3-8",
      "kind": "story",
      "ending": true,
      "title": "마지막 불이 켜지면",
      "topic": "이야기의 마지막 장면",
      "minutes": "1:20",
      "background": "dusk",
      "lines": [
        {
          "speaker": "내 생각",
          "role": "narration",
          "text": "마지막 공연이 끝나고 점등 안내가 나왔다. 우리가 만든 {{shapeName}} 조명이 다른 불빛들과 함께 켜졌다.",
          "expression": 0
        },
        {
          "speaker": "하루",
          "text": "아까 안내판에 내가 12분 전에 왔다고 나왔잖아. 학교에는 그보다 더 일찍 왔어.",
          "expression": 2
        },
        {
          "speaker": "하루",
          "text": "네가 먼저 와 있으면 혼자 기다릴 수도 있으니까. 나도 빨리 나오고 싶었고.",
          "expression": 2
        },
        {
          "speaker": "내 생각",
          "text": "하루가 일찍 나온 게 괜히 기분 좋았다. 내일은 내가 먼저 기다려도 좋겠다고 생각했다.",
          "expression": 1,
          "role": "narration"
        },
        {
          "speaker": "하루",
          "text": "오늘 같이 다녀서 좋았어. 내일도 같이 하교할래?",
          "expression": 2
        }
      ],
      "shortLines": [
        {
          "speaker": "내 생각",
          "role": "narration",
          "text": "마지막 공연이 끝나고 점등 안내가 나왔다. 우리가 만든 {{shapeName}} 조명이 다른 불빛들과 함께 켜졌다.",
          "expression": 0
        },
        {
          "speaker": "하루",
          "text": "사실 학교에는 더 일찍 와 있었어. 네가 먼저 와서 기다릴 수도 있으니까.",
          "expression": 2
        },
        {
          "speaker": "하루",
          "text": "오늘 같이 다녀서 좋았어. 내일도 같이 하교할래?",
          "expression": 2
        }
      ],
      "choices": [
        "응. 정문에서 기다릴게.",
        "좋아. 내일은 내가 먼저 가 있을게."
      ],
      "choiceReplies": [
        [
          {
            "speaker": "하루",
            "text": "좋아. 내일 수업 끝나고 연락할게.",
            "expression": 2
          }
        ],
        [
          {
            "speaker": "하루",
            "text": "그럼 내일은 내가 너 찾으러 갈게. 정문에서 보자.",
            "expression": 2
          }
        ]
      ],
      "choiceReply": "내일 정문에서 만나기로 약속했다.",
      "teacher": {
        "ask": "오늘 만든 조명 배치도와 반복 실험에서 어떤 개념을 찾을 수 있나요?",
        "answer": "정다각형의 회전각을 360°와 변의 수로 구하고, 반복 횟수와 조건에 따라 조명 상태를 완성했습니다.",
        "watch": "마지막 답장에도 정답은 없습니다. 실제 선택한 모양과 약속 시각을 이야기에서 회수합니다.",
        "short": "완성된 모양과 정문에서의 작은 배려를 확인한 뒤 답장을 고릅니다."
      },
      "channel": "운동장 · 빛그림 점등식"
    },
    {
      "id": "ch3-9",
      "kind": "summary",
      "title": "END, 그리고 실행",
      "topic": "세 챕터의 마지막 약속",
      "minutes": "1:00",
      "cards": [
        [
          "횟수 반복",
          "안쪽 명령 묶음을 정해진 횟수만큼 실행해요."
        ],
        [
          "조건 반복",
          "조건을 먼저 확인하고, 참이 되면 멈춰요."
        ],
        [
          "변수와 조건",
          "횟수를 기억하고, 값에 따라 모양을 바꿀 수 있어요."
        ]
      ],
      "extra": "한 바퀴 360° ÷ 변의 수 = 한 번의 회전각. 계속 반복은 멈추는 명령이나 프로그램 정지가 필요해요.",
      "endingMessage": "{{vocative}}, 내일도 같이 걷자.",
      "mission": "사이트에서 도형·나무·금고 미션을 여러분의 코드로 완성해 보세요.",
      "teacher": {
        "ask": "입력·조건·반복 중 오늘 장면에서 발견한 원리를 하나씩 말해 볼까요?",
        "answer": "초대장 이름 입력, 입장·경품 조건, 조명 반복처럼 이야기의 사례를 수업 용어로 바꿔 말합니다.",
        "watch": "이번 기초 개념 이야기는 여기서 완결됩니다. 다음 단원은 새로운 테마로 시작할 수 있습니다.",
        "short": "마지막 메시지와 세 카드 제목을 읽고 사이트 실습으로 전환합니다."
      },
      "channel": "운동장 · 빛그림 점등식"
    }
  ]
};
