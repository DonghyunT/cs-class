// Original lesson questions, bc8d51f.
export const UNIT_QUIZ_DATA = {
  abstraction: {
    title: "💡 문제 추상화 쏙쏙 퀴즈",
    desc: "문제의 핵심만 쏙 뽑아내는 추상화 개념을 확인해 보세요!",
    questions: [
      {
        id: 1,
        q: "화가 몬드리안의 나무 그림이나 지하철 노선도처럼, 복잡하고 불필요한 세부 사항은 덜어내고 꼭 필요한 핵심만 남기는 과정을 무엇이라고 할까요?",
        options: [
          { text: "① 알고리즘 인코딩", correct: false },
          { text: "② 추상화", correct: true },
          { text: "③ 알고리즘 분류", correct: false },
          { text: "④ 완전 탐색", correct: false }
        ],
        explanation: "정답은 ②번입니다! '추상화'는 복잡한 문제에서 불필요한 정보는 버리고, 문제 해결에 꼭 필요한 핵심 요소(특징)만 뽑아내는 생각의 다이어트 기법입니다."
      },
      {
        id: 2,
        q: "문제 상황을 분석할 때 '문제가 발생하기 전의 원래 상태'를 [초기 상태]라고 합니다. 그렇다면 '문제가 완전히 해결된 바라는 최종 모습'을 무엇이라고 할까요?",
        options: [
          { text: "① 제약 조건", correct: false },
          { text: "② 현재 상태", correct: false },
          { text: "③ 목표 상태", correct: true },
          { text: "④ 중간 상태", correct: false }
        ],
        explanation: "정답은 ③번입니다! 문제 해결은 [현재 상태]에서 제약 [조건]을 지키며 [목표 상태]에 도달하는 과정입니다."
      },
      {
        id: 3,
        q: "거대하고 복잡한 문제를 한 번에 해결하기 어려울 때, 작고 다루기 쉬운 여러 개의 작은 하위 문제로 쪼개어 해결하는 방법을 무엇이라고 할까요?",
        options: [
          { text: "① 문제 분해", correct: true },
          { text: "② 무한 반복", correct: false },
          { text: "③ 자료 은닉", correct: false },
          { text: "④ 강제 실행", correct: false }
        ],
        explanation: "정답은 ①번입니다! 복잡한 문제를 작은 단위로 쪼개어 하나씩 해결하는 기법을 '문제 분해'라고 합니다."
      },
      {
        id: 4,
        q: "복잡한 문제에서 문제 해결과 직접적인 관련이 없는 불필요한 정보(노이즈)를 덜어내고, 꼭 필요한 핵심 데이터나 기준만 남기는 것을 무엇이라고 할까요?",
        options: [
          { text: "① 핵심 요소 추출", correct: true },
          { text: "② 무조건 외우기", correct: false },
          { text: "③ 무작위 대입", correct: false },
          { text: "④ 프로그램 복사", correct: false }
        ],
        explanation: "정답은 ①번입니다! 문제 해결에 꼭 필요한 핵심 데이터와 기준만 뽑아내는 과정을 '핵심 요소 추출(생각 다이어트)'이라고 합니다."
      }
    ]
  },

  algorithm: {
    title: "🤖 알고리즘 설계 쏙쏙 퀴즈",
    desc: "컴퓨터에게 일을 시키기 위한 완벽한 레시피와 5대 조건을 점검해 보세요!",
    questions: [
      {
        id: 1,
        q: "컴퓨터에게 내리는 명령어는 '적당히 빵을 굽는다'처럼 애매하면 안 되고, 누구나 똑같이 이해할 수 있도록 명확해야 합니다. 이 알고리즘 조건을 무엇이라고 할까요?",
        options: [
          { text: "① 유한성", correct: false },
          { text: "② 명확성", correct: true },
          { text: "③ 입력", correct: false },
          { text: "④ 최적성", correct: false }
        ],
        explanation: "정답은 ②번입니다! '명확성'은 알고리즘의 각 단계가 모호하지 않고 명확하게 정의되어야 한다는 조건입니다."
      },
      {
        id: 2,
        q: "알고리즘은 명령을 계속 수행하다가 언젠가는 반드시 끝나야(종료되어야) 합니다. 영원히 멈추지 않는 무한 루프에 빠지면 안 된다는 이 조건은?",
        options: [
          { text: "① 유한성", correct: true },
          { text: "② 수행 가능성", correct: false },
          { text: "③ 다중성", correct: false },
          { text: "④ 출력성", correct: false }
        ],
        explanation: "정답은 ①번입니다! '유한성'은 한정된 횟수의 단계를 거친 후 반드시 작업이 끝나야 한다는 조건입니다."
      },
      {
        id: 3,
        q: "알고리즘의 모든 명령어는 컴퓨터나 사람이 실제로 실행할 수 있어야 한다는 조건을 무엇이라고 할까요?",
        options: [
          { text: "① 수행 가능성", correct: true },
          { text: "② 무한 반복성", correct: false },
          { text: "③ 다중 선택성", correct: false },
          { text: "④ 불확실성", correct: false }
        ],
        explanation: "정답은 ①번입니다! '수행 가능성'은 주어진 명령어가 현실적으로 실행 가능한 동작이어야 한다는 조건입니다."
      },
      {
        id: 4,
        q: "라면 끓이기처럼 명령어를 위에서 아래로 차례대로 하나씩 실행하는 알고리즘의 가장 기본적인 제어 구조는 무엇일까요?",
        options: [
          { text: "① 선택 구조", correct: false },
          { text: "② 순차 구조", correct: true },
          { text: "③ 반복 구조", correct: false },
          { text: "④ 분기 구조", correct: false }
        ],
        explanation: "정답은 ②번입니다! '순차 구조'는 정해진 순서대로 하나씩 차례차례 명령을 실행하는 가장 기본적인 흐름입니다."
      }
    ]
  },

  flowchart: {
    title: "📐 순서도 기호 쏙쏙 퀴즈",
    desc: "알고리즘 표현의 기초가 되는 4대 순서도 표준 기호를 확인해 보세요!",
    questions: [
      {
        id: 1,
        q: "순서도에서 알고리즘의 [시작]과 [끝(종료)]을 나타내는 둥근 타원(모서리가 둥근 사각형) 기호의 이름은 무엇일까요?",
        options: [
          { text: "① 단말 ⬭", correct: true },
          { text: "② 판단 ◇", correct: false },
          { text: "③ 처리 ▭", correct: false },
          { text: "④ 입출력 ▱", correct: false }
        ],
        explanation: "정답은 ①번입니다! '단말' 기호는 순서도의 가장 첫 시작과 최종 종료를 알리는 기호입니다."
      },
      {
        id: 2,
        q: "'현재 기온을 입력받는다' 또는 '추천 옷차림을 화면에 출력한다'처럼 데이터를 입력받거나 결과를 출력할 때 사용하는 평행사변형 기호는?",
        options: [
          { text: "① 처리 ▭", correct: false },
          { text: "② 입출력 ▱", correct: true },
          { text: "③ 판단 ◇", correct: false },
          { text: "④ 단말 ⬭", correct: false }
        ],
        explanation: "정답은 ②번입니다! '입출력' 기호는 외부에서 자료를 받거나 처리된 결과를 보여줄 때 사용하는 평행사변형 모양입니다."
      },
      {
        id: 3,
        q: "'기온이 4℃ 이하인가?'처럼 조건을 따져서 [예(참)] 또는 [아니오(거짓)]의 두 갈래 길로 나눌 때 사용하는 마름모 모양의 기호는?",
        options: [
          { text: "① 단말 ⬭", correct: false },
          { text: "② 처리 ▭", correct: false },
          { text: "③ 판단 ◇", correct: true },
          { text: "④ 입출력 ▱", correct: false }
        ],
        explanation: "정답은 ③번입니다! '판단' 기호는 마름모 모양으로, 조건의 참/거짓에 따라 실행 흐름을 나눌 때(선택 구조) 사용합니다."
      },
      {
        id: 4,
        q: "순서도에서 명령이나 계산, 데이터 가공 등의 구체적인 동작 처리를 나타내는 직사각형 모양의 기호는 무엇일까요?",
        options: [
          { text: "① 처리 ▭", correct: true },
          { text: "② 단말 ⬭", correct: false },
          { text: "③ 판단 ◇", correct: false },
          { text: "④ 입출력 ▱", correct: false }
        ],
        explanation: "정답은 ①번입니다! 직사각형 모양의 '처리' 기호는 명령을 실행하거나 계산을 수행하는 구체적인 동작을 나타냅니다."
      }
    ]
  }
};
