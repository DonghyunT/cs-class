module.exports = {
  "id": 1,
  "title": "첫 메시지",
  "subject": "프로그래밍 기초",
  "subtitle": "축제 전날, 평범했던 알림 하나",
  "duration": "약 12분",
  "recap": "축제 전날 밤, 축제앱의 채팅 알림이 도착했습니다. 보내 온 사람은 하루입니다.",
  "scenes": [
    {
      "id": "ch1-1",
      "kind": "story",
      "title": "알림 하나",
      "topic": "이야기의 시작",
      "minutes": "0:40",
      "background": "night",
      "lines": [
        {
          "speaker": "내 생각",
          "role": "narration",
          "text": "잠들기 전에 내일 축제 시간표를 보려고 축제앱을 켰다. 상단에 채팅 알림이 하나 떠 있었다.",
          "expression": 0
        },
        {
          "speaker": "축제앱",
          "role": "system",
          "text": "하루에게서 새 메시지가 도착했습니다.",
          "expression": 0
        },
        {
          "speaker": "하루",
          "role": "haru",
          "text": "내일 축제 누구랑 가? 아직 안 정했으면 나랑 같이 다닐래?",
          "expression": 1
        }
      ],
      "shortLines": [
        {
          "speaker": "내 생각",
          "role": "narration",
          "text": "잠들기 전에 내일 축제 시간표를 보려고 축제앱을 켰다. 상단에 채팅 알림이 하나 떠 있었다.",
          "expression": 0
        },
        {
          "speaker": "하루",
          "role": "haru",
          "text": "내일 축제 누구랑 가? 아직 안 정했으면 나랑 같이 다닐래?",
          "expression": 1
        }
      ],
      "teacher": {
        "ask": "하루에게 어떤 말로 답하고 싶은지 자유롭게 생각해 볼까요?",
        "answer": "이 장면의 답은 이야기 선택이며 말투에 정답은 없습니다. 뒤의 전송 활동에서는 별도의 준비 완료 답장을 고르고, 전송 버튼을 눌러야 그 초안이 실제로 발송됩니다.",
        "watch": "학생의 실제 연애 경험이나 특정 친구를 이야기하게 하지 않습니다.",
        "short": "하루의 초대를 읽고 두 말투 중 하나로 답합니다. 어느 답도 같은 이야기로 이어집니다."
      },
      "channel": "축제앱 · 하루와 채팅",
      "choices": [
        "좋아. 나도 너랑 같이 가고 싶어.",
        "좋아. 대신 길 안내는 네가 맡아."
      ],
      "choiceReplies": [
        [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "진짜? 물어보길 잘했다. 사진 부스도 가고 싶고 공연도 보고 싶어.",
            "expression": 3
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "같이 고르면 더 재밌을 것 같아서.",
            "expression": 1
          },
          {
            "speaker": "내 생각",
            "role": "narration",
            "text": "내일 시간표를 다시 열었다. 혼자 볼 때는 지나쳤던 부스들이 눈에 들어왔다.",
            "expression": 0
          }
        ],
        [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "맡겨 둬. 길 잃으면 같이 헤매는 걸로.",
            "expression": 5
          },
          {
            "speaker": "나",
            "role": "me",
            "text": "그건 길 안내가 아닌데?",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "농담이야. 사진 부스도 가고 공연도 보자. 같이 고르면 더 재밌을 것 같아서.",
            "expression": 2
          }
        ]
      ]
    },
    {
      "id": "ch1-2",
      "kind": "concept",
      "experiment": "terms",
      "title": "같은 초대 문장, 두 표현",
      "topic": "프로그래밍 언어와 프로그램",
      "minutes": "1:10",
      "quote": "같은 축제 초대 문장을 블록과 텍스트로 표현해 실행해 봅니다.",
      "flow": {
        "intro": [
          {
            "speaker": "축제앱",
            "role": "system",
            "text": "이 장면은 채팅 기능을 만드는 방법을 살펴보는 확장 활동입니다. 실제 답장은 뒤에서 보냅니다.",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "같은 초대 문장을 블록과 글자로 표현하면 실행 결과도 같을까?",
            "expression": 0
          }
        ],
        "shortIntro": [
          {
            "speaker": "축제앱",
            "role": "system",
            "text": "이 장면은 채팅 기능을 만드는 방법을 살펴보는 확장 활동입니다. 실제 답장은 뒤에서 보냅니다.",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "같은 초대 문장을 블록과 글자로 표현하면 실행 결과도 같을까?",
            "expression": 0
          }
        ],
        "options": [
          {
            "key": "greeting",
            "label": "블록과 글자로 같은 인사를 실행해 본다"
          }
        ],
        "responses": {
          "default": [
            {
              "speaker": "하루",
              "role": "haru",
              "text": "두 표현 모두 같은 초대 문장을 보여 주네. 그럼 초대장도 만들어 보자.",
              "expression": 0
            }
          ]
        }
      },
      "teacher": {
        "ask": "블록 표현과 글자 표현을 바꾸어도 화면에 나오는 말은 같을까요?",
        "answer": "표현하는 언어는 달라도 두 프로그램은 ‘내일 축제 같이 다닐래?’라는 같은 문장을 출력합니다. 언어는 명령을 표현하는 약속, 프로그램은 명령의 모음, 프로그래밍은 만들고 실행하며 고치는 과정입니다.",
        "watch": "프로그래밍 언어, 프로그램, 프로그래밍을 서로 다른 뜻으로 설명합니다.",
        "short": "확장 활동입니다. 기본 이야기에서는 생략하며 목차에서 직접 열 수 있습니다."
      },
      "observe": "표현 방법을 바꿔도 출력이 같은지 확인합니다.",
      "optional": true,
      "channel": "축제앱 · 하루와 채팅"
    },
    {
      "id": "ch1-3",
      "kind": "concept",
      "experiment": "invitation",
      "title": "이름이 들어간 초대장",
      "topic": "입력 · 처리 · 출력",
      "minutes": "1:40",
      "quote": "이름을 받아 초대장 문장을 만들고 화면에 보여 줍니다.",
      "flow": {
        "intro": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "축제앱에서 같이 갈 사람에게 초대장을 보낼 수 있대. 링크 하나 보낼게.",
            "expression": 0
          },
          {
            "speaker": "축제앱",
            "role": "system",
            "text": "하루의 축제 초대장 · 받을 이름을 입력해 주세요.",
            "expression": 0
          },
          {
            "speaker": "나",
            "role": "me",
            "text": "이름은 내가 적으면 되는 거지?",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "응. 채팅은 여기서 하고, 초대장은 앱 안의 초대장 메뉴에서 받으면 돼.",
            "expression": 0
          }
        ],
        "shortIntro": [
          {
            "speaker": "축제앱",
            "role": "system",
            "text": "하루가 축제앱 채팅으로 초대장 링크를 보냈습니다. 초대장을 받을 이름을 입력해 주세요.",
            "expression": 0
          }
        ],
        "options": [
          {
            "key": "create",
            "label": "내 이름이 들어간 초대장, 받아 볼게."
          },
          {
            "key": "tease",
            "label": "초대장까지? 제대로 준비했네."
          }
        ],
        "responses": {
          "default": [
            {
              "speaker": "하루",
              "role": "haru",
              "text": "{{ticketName}} 이름으로 잘 나왔네. 내일 입구에서 보여 주면 돼.",
              "expression": 0
            },
            {
              "speaker": "나",
              "role": "me",
              "text": "저장했어. 내일 챙겨 갈게.",
              "expression": 0
            }
          ]
        },
        "choiceReplies": {
          "create": [
            {
              "speaker": "하루",
              "role": "haru",
              "text": "이름이 들어가니까 이제 진짜 우리 약속 같네.",
              "expression": 1
            }
          ],
          "tease": [
            {
              "speaker": "하루",
              "role": "haru",
              "text": "첫 초대인데, 조금 신경 썼지.",
              "expression": 5
            }
          ]
        }
      },
      "teacher": {
        "ask": "이름을 바꾸어 실행하면 초대장의 어느 부분이 달라질까요?",
        "answer": "입력한 이름을 받아 문장에 연결한 뒤 완성된 초대장을 화면에 출력합니다.",
        "watch": "이름 입력은 자료이고, 초대장 만들기 버튼을 누르는 것은 실행 사건입니다.",
        "short": "기본 이름과 다른 이름으로 한 번씩 실행합니다."
      },
      "observe": "입력한 이름이 처리 과정을 거쳐 초대장에 표시되는지 확인합니다.",
      "channel": "축제앱 · 하루와 채팅"
    },
    {
      "id": "ch1-4",
      "kind": "concept",
      "experiment": "variable",
      "title": "약속 시각을 기억해 둬",
      "topic": "변수에 값 저장하기",
      "minutes": "1:50",
      "quote": "같은 변수에 새 시각을 저장했을 때 남는 값을 확인합니다.",
      "flow": {
        "intro": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "나는 준비팀 일이 네 시쯤 끝나. 조금 일찍 만나서 부스를 둘러봐도 좋고.",
            "expression": 0
          },
          {
            "speaker": "나",
            "role": "me",
            "text": "공연 준비도 하는 거야?",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "마지막에 운동장에서 빛그림 점등식을 해. 조명 위치 정하는 걸 맡았어.",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "같이 구경할 시간은 충분해. 앱에 적힌 기본 시각을 우리 만날 시각으로 바꿔 두자.",
            "expression": 0
          }
        ],
        "shortIntro": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "준비팀 일은 네 시쯤 끝나. 앱의 기본 시각을 우리 만날 시각으로 바꿔 두자.",
            "expression": 0
          }
        ],
        "options": [
          {
            "key": "early",
            "label": "네 시에 만나자.",
            "params": {
              "time": "16:00"
            }
          },
          {
            "key": "before-show",
            "label": "다섯 시는 어때?",
            "params": {
              "time": "17:00"
            }
          }
        ],
        "responses": {
          "default": [
            {
              "speaker": "하루",
              "role": "haru",
              "text": "그럼 {{meetingTime}}에 정문에서 만나자. 늦어질 것 같으면 연락해 줘.",
              "expression": 0
            },
            {
              "speaker": "나",
              "role": "me",
              "text": "알겠어. 나도 미리 연락할게.",
              "expression": 0
            }
          ]
        }
      },
      "teacher": {
        "ask": "화면의 첫 시각을 다른 시각으로 새로 정하면 두 시각이 모두 남을까요?",
        "answer": "아닙니다. 같은 변수에 새 값을 저장하면 이전 값이 교체됩니다. 어느 시각을 골라도 새로 정한 시각 하나가 남습니다.",
        "watch": "이번 변수는 주인공 이름이 아니라 이야기에서 다시 쓸 약속 시각을 저장합니다.",
        "short": "시각을 하나 고르고 변수에 저장된 값을 확인합니다."
      },
      "observe": "고른 약속 시각이 변수에 저장되고 같은 변수의 이전 값이 바뀌는지 확인합니다.",
      "channel": "축제앱 · 하루와 채팅"
    },
    {
      "id": "ch1-5",
      "kind": "concept",
      "experiment": "answer",
      "optional": true,
      "title": "가장 최근에 들은 대답",
      "topic": "대답과 변수",
      "minutes": "1:20",
      "quote": "하루: “이름과 장소를 차례로 물으면 대답 칸에는 마지막 말이 남겠네.”",
      "flow": {
        "intro": [
          {
            "speaker": "하루",
            "text": "초대장 앱에서 이름을 묻고 장소도 물어보네. 두 대답이 어디에 남는지 확인해 보자.",
            "expression": 0
          }
        ],
        "shortIntro": [
          {
            "speaker": "하루",
            "text": "초대장 앱에서 이름을 묻고 장소도 물어보네. 두 대답이 어디에 남는지 확인해 보자.",
            "expression": 0
          }
        ],
        "options": [
          {
            "key": "ask-twice",
            "label": "두 질문 뒤 대답 칸을 확인한다"
          }
        ],
        "responses": {
          "default": [
            {
              "speaker": "하루",
              "text": "이름과 장소를 따로 저장해 두면 약속을 다시 확인하기 편하겠다.",
              "expression": 0
            }
          ]
        }
      },
      "teacher": {
        "ask": "이름을 묻고 장소를 물으면 대답 칸과 이름 변수에는 각각 무엇이 남을까요?",
        "answer": "대답 칸에는 가장 최근에 입력한 정문이 남습니다. 이름을 계속 쓰려면 첫 대답 직후 별도 변수에 저장해야 합니다.",
        "watch": "대답 칸은 질문과 답을 모두 모아 두는 목록이 아닙니다.",
        "short": "확장 활동입니다. 기본 이야기에서는 생략하며 목차에서 직접 열 수 있습니다."
      },
      "observe": "마지막 대답은 바뀌지만 먼저 저장한 이름 변수는 남는지 확인합니다.",
      "channel": "축제앱 · 하루와 채팅"
    },
    {
      "id": "ch1-6",
      "kind": "concept",
      "experiment": "event",
      "title": "답장을 전송하는 신호",
      "topic": "사건이 프로그램을 시작해요",
      "minutes": "1:40",
      "quote": "선택한 문장이 준비되었습니다. 어떤 사건이 전송 명령을 실행할까요?",
      "flow": {
        "intro": [
          {
            "speaker": "내 생각",
            "role": "narration",
            "text": "초대장을 받고 시각도 정했다. 채팅창으로 돌아오니 하루가 내일 준비할 것을 보내 놓았다.",
            "expression": 0
          },
          {
            "speaker": "하루",
            "role": "haru",
            "text": "편한 신발 신고 와. 여기저기 많이 걷게 될 것 같아.",
            "expression": 0
          },
          {
            "speaker": "내 생각",
            "role": "narration",
            "text": "내일 준비는 끝났다. 이제 마지막 답장만 보내면 된다.",
            "expression": 0
          }
        ],
        "shortIntro": [
          {
            "speaker": "하루",
            "role": "haru",
            "text": "내일 편한 신발 신고 와. 많이 걷게 될 것 같아. 준비됐으면 답장 줘.",
            "expression": 0
          }
        ],
        "options": [
          {
            "key": "casual",
            "label": "준비 완료! 시간 맞춰 갈게.",
            "params": {
              "text": "준비 완료! 시간 맞춰 갈게."
            }
          },
          {
            "key": "warm",
            "label": "초대장 챙겼어. 내일 기대할게.",
            "params": {
              "text": "초대장 챙겼어. 내일 기대할게."
            }
          }
        ],
        "responses": {
          "casual": [
            {
              "speaker": "하루",
              "role": "haru",
              "text": "좋아. 내일 정문에서 보자. 길 안내도 준비해 둘게.",
              "expression": 5
            },
            {
              "speaker": "나",
              "role": "me",
              "text": "알겠어. 나도 가 보고 싶은 부스 찾아볼게.",
              "expression": 0
            }
          ],
          "warm": [
            {
              "speaker": "하루",
              "role": "haru",
              "text": "나도 기대돼. 내일 정문에서 만나자.",
              "expression": 1
            },
            {
              "speaker": "나",
              "role": "me",
              "text": "응. 잘 자. 내일 보자.",
              "expression": 0
            }
          ]
        }
      },
      "teacher": {
        "ask": "문장을 고르는 것과 전송 버튼을 누르는 것은 같은 사건일까요?",
        "answer": "문장을 고르면 전송할 자료가 준비됩니다. ‘전송 버튼을 눌렀을 때’ 연결한 명령이 실행되어야 메시지가 보내집니다.",
        "watch": "사람이 생각하거나 문장을 고른 것만으로 프로그램이 실행되는 것은 아닙니다.",
        "short": "문장을 고르고 전송 버튼을 눌러 두 단계의 차이를 확인합니다."
      },
      "observe": "고른 문장은 초안으로 남고 전송 버튼을 누른 뒤에야 발송되는지 확인합니다.",
      "channel": "축제앱 · 하루와 채팅"
    },
    {
      "id": "ch1-7",
      "kind": "concept",
      "experiment": "map",
      "optional": true,
      "title": "방향키로 정문 찾기",
      "topic": "시작 버튼과 방향키는 다른 신호",
      "minutes": "1:10",
      "quote": "하루: “정문은 오른쪽 세 칸이래. 지도를 켜고 키 신호를 살펴보자.”",
      "teacher": {
        "ask": "시작 버튼을 누르는 것과 오른쪽 키를 누르는 것은 같은 신호일까요?",
        "answer": "서로 다른 사건입니다. 지도에 초점을 둔 뒤 방향키를 누르면 그 키에 연결한 이동이 실행됩니다.",
        "watch": "방향각은 선택 설명입니다. 이 장면의 핵심은 시작 버튼과 방향키가 서로 다른 사건이라는 점입니다.",
        "short": "확장 활동입니다. 기본 이야기에서는 생략하며 목차에서 직접 열 수 있습니다."
      },
      "observe": "시작 버튼 신호는 이동시키지 않고, 지도에서 방향키를 눌렀을 때 이동하는지 확인합니다.",
      "channel": "축제앱 · 하루와 채팅"
    },
    {
      "id": "ch1-8",
      "kind": "story",
      "title": "내일의 약속",
      "topic": "답장을 보낸 뒤",
      "minutes": "1:30",
      "background": "night",
      "lines": [
        {
          "speaker": "하루",
          "role": "haru",
          "text": "앱으로 초대장도 보냈고 시간도 정했네. 내일 {{meetingTime}}에 정문에서 보자.",
          "expression": 0
        },
        {
          "speaker": "나",
          "role": "me",
          "text": "응. 점등식도 같이 볼 수 있어?",
          "expression": 0
        },
        {
          "speaker": "하루",
          "role": "haru",
          "text": "그럼. 내가 만든 조명도 있는데 한 자리가 아직 비어 있어. 내일 같이 골라 줬으면 좋겠어.",
          "expression": 0
        },
        {
          "speaker": "내 생각",
          "role": "narration",
          "text": "초대장 화면을 한 번 더 보고 알람을 맞췄다. 내일은 조금 일찍 나가야겠다.",
          "expression": 0
        }
      ],
      "shortLines": [
        {
          "speaker": "하루",
          "role": "haru",
          "text": "앱으로 초대장도 보냈고 시간도 정했네. 내일 {{meetingTime}}에 정문에서 보자.",
          "expression": 0
        },
        {
          "speaker": "하루",
          "role": "haru",
          "text": "그럼. 내가 만든 조명도 있는데 한 자리가 아직 비어 있어. 내일 같이 골라 줬으면 좋겠어.",
          "expression": 0
        },
        {
          "speaker": "내 생각",
          "role": "narration",
          "text": "초대장 화면을 한 번 더 보고 알람을 맞췄다. 내일은 조금 일찍 나가야겠다.",
          "expression": 0
        }
      ],
      "teacher": {
        "ask": "답장 선택과 실제 전송 사건 중 어떤 행동이 메시지를 보냈나요?",
        "answer": "ch1-6에서 별도로 고른 준비 완료 답장이 전송 버튼 사건으로 발송되었습니다. 첫 장면의 이야기 선택과 구분하며, 두 말투 모두 같은 만남으로 이어집니다.",
        "watch": "학생의 답장 말투에 정답이나 점수가 붙지 않습니다.",
        "short": "전날 밤의 약속을 확인하고 이 차시를 정리합니다. 다음 날은 2차시에서 시작합니다."
      },
      "channel": "축제앱 · 하루와 채팅"
    },
    {
      "id": "ch1-9",
      "kind": "summary",
      "title": "이제, 직접 만들 차례",
      "topic": "첫 메시지의 원리",
      "minutes": "1:00",
      "cards": [
        [
          "입력 · 처리 · 출력",
          "이름을 받아 문장을 만들고 화면에 보여줘요."
        ],
        [
          "변수",
          "약속 시각처럼 다시 쓸 값을 저장해요. 새 값은 이전 값을 바꿔요."
        ],
        [
          "사건",
          "전송 버튼이나 키 같은 신호에 연결한 명령을 실행해요."
        ]
      ],
      "extra": "프로그래밍 언어로 명령을 표현해 프로그램을 만들고, 실행하며 고치는 과정이 프로그래밍입니다.",
      "mission": "여기서 잠깐 멈춰 사이트 실습을 하거나, 아래 버튼으로 축제날 이야기를 이어 가세요.",
      "teacher": {
        "ask": "입력한 이름을 초대장에 넣고, 약속 시각을 기억하게 하려면 무엇을 사용하면 될까요?",
        "answer": "이름을 입력받아 문장에 넣고, 약속 시각은 변수에 저장해 다시 사용할 수 있습니다.",
        "watch": "이야기 선택은 말투의 선택이고, 개념 확인에는 입력·변수·사건의 정확한 뜻을 사용합니다.",
        "short": "세 카드의 제목을 읽고 사이트 실습으로 전환합니다."
      },
      "channel": "축제앱 · 하루와 채팅"
    }
  ]
};
