import type { Lesson } from "./types";
import { buildEntryProject } from "./entry-project";
import { PROGRAMMING_LESSON } from "./programming-lesson";
import { CONDITIONALS_LESSON } from "./conditionals-lesson";
import { REVIEW_LESSONS } from "./review/lessons";

export const SAMPLE_LESSON: Lesson = {
  id: "sequence-lab",
  title: "순서가 만드는 알고리즘",
  description: "할 일을 나누고, 알맞은 순서로 연결해 봅니다.",
  category: "알고리즘 · 순차 구조",
  concepts: [
    {
      id: "algorithm",
      title: "알고리즘은 해결 절차예요",
      explanation: "알고리즘은 어떤 문제를 해결하기 위한 구체적인 절차입니다. 다른 사람도 따라 할 수 있도록 무엇을 할지 분명하게 설명해야 합니다.",
      example: "‘물을 마신다’는 목표예요. ‘컵을 준비한다 → 물을 따른다 → 마신다’는 목표를 이루는 절차예요.",
      question: {
        id: "algorithm",
        prompt: "다른 사람이 그대로 따라 할 수 있는 설명은 무엇일까요?",
        options: [{ id: "vague", label: "물을 적당히 준비한다" }, { id: "clear", label: "컵에 물을 200mL 따른다" }],
        hint: "양과 행동이 구체적으로 정해져 있는지 살펴보세요.",
      },
    },
    {
      id: "sequence",
      title: "순서에 따라 결과가 달라져요",
      explanation: "순차 구조에서는 명령을 정해진 순서대로 하나씩 실행합니다. 앞의 행동이 끝나야 할 수 있는 다음 행동이 있는지 생각해 보세요.",
      example: "‘손에 비누를 묻힌다 → 손을 문지른다 → 물로 헹군다’는 순서예요. 헹군 뒤 비누를 묻히면 결과가 달라져요.",
      question: {
        id: "sequence",
        prompt: "파일에 새 내용을 적은 뒤, 그 내용을 남기려면 무엇을 해야 할까요?",
        options: [{ id: "close", label: "저장하지 않고 창을 닫아요" }, { id: "save", label: "내용을 저장해요" }],
        hint: "화면에서 바뀐 내용이 실제 기록으로 남는 순간을 생각해 보세요.",
      },
    },
  ],
  quiz: [
    { id: "q1", prompt: "‘로봇이 교실 문까지 가게 하기’에서 더 구체적인 명령은 무엇인가요?", options: [{ id: "a", label: "앞으로 3칸 이동한다" }, { id: "b", label: "문 쪽으로 잘 이동한다" }, { id: "c", label: "알아서 움직인다" }], hint: "로봇이 스스로 추측하지 않아도 되는 명령을 골라 보세요." },
    { id: "q2", prompt: "입력한 숫자를 화면에 보여 주려면 어떤 순서가 맞나요?", options: [{ id: "a", label: "숫자 출력 → 숫자 입력" }, { id: "b", label: "숫자 입력 → 숫자 출력" }, { id: "c", label: "입력 없이 숫자 출력" }], hint: "화면에 보여 줄 값을 먼저 알아야 해요." },
    { id: "q3", prompt: "같은 행동들로 만든 알고리즘도 순서를 바꾸면 어떻게 될까요?", options: [{ id: "a", label: "결과는 항상 같아요" }, { id: "b", label: "항상 더 빨라져요" }, { id: "c", label: "결과가 달라질 수 있어요" }], hint: "양말과 신발을 신는 순서를 바꿔 생각해 보세요." },
  ],
  practice: {
    type: "ordering",
    title: "입력한 이름으로 인사하기",
    description: "이름을 입력받고 ‘안녕, 이름!’이라는 인사말을 만든 뒤 화면에 보여 주세요. 시작과 끝도 알맞은 위치에 놓아야 합니다.",
    blocks: [
      { id: "output", label: "만든 인사말을 화면에 보여 준다" },
      { id: "end", label: "종료" },
      { id: "input", label: "이름을 입력받는다" },
      { id: "start", label: "시작" },
      { id: "greeting", label: "입력한 이름으로 인사말을 만든다" },
    ],
  },
};

export const FLOWCHART_LESSON: Lesson = {
  id: "flowchart-lab",
  title: "순서도로 나타내는 일상",
  description: "기호의 의미를 익히고, 라면 끓이기 문제 해결 순서도를 완성해 봅니다.",
  category: "알고리즘 · 순서도",
  concepts: [
    {
      id: "terminal",
      title: "시작과 끝은 단말, 행동은 처리예요",
      explanation: "순서도에서 둥근 모서리의 타원(단말)은 알고리즘의 시작과 끝을 나타내고, 직사각형(처리)은 실제로 수행할 연산이나 동작을 나타냅니다.",
      example: "‘시작’과 ‘종료’는 단말 기호, ‘물 500mL 붓기’나 ‘두 수 더하기’는 처리 기호에 적어요.",
      question: {
        id: "terminal",
        prompt: "'손에 비누를 묻히고 문지른다'처럼 실제로 실행할 행동에 알맞은 순서도 기호는?",
        options: [
          { id: "terminal", label: "단말 (타원)" },
          { id: "process", label: "처리 (직사각형)" },
        ],
        hint: "명령이나 계산을 실제로 실행하는 기호를 골라 보세요.",
      },
    },
    {
      id: "decision",
      title: "조건에 따라 길을 나누는 판단 기호",
      explanation: "마름모(판단) 기호는 조건을 확인하고 [예]와 [아니오]처럼 두 가지 이상의 길로 나눌 때 사용합니다.",
      example: "‘비가 오는가?’라는 질문에서 [예]이면 ‘우산 챙기기’, [아니오]이면 ‘그냥 출발하기’로 흐름이 나뉘어요.",
      question: {
        id: "decision",
        prompt: "'키가 150cm 이상인가?'처럼 조건에 따라 다른 행동을 하려면 어떤 기호를 써야 할까요?",
        options: [
          { id: "decision", label: "판단 (마름모)" },
          { id: "terminal", label: "단말 (타원)" },
        ],
        hint: "조건을 확인하고 길을 나누는 기호를 생각해 보세요.",
      },
    },
  ],
  quiz: [
    {
      id: "fq1",
      prompt: "신호등이 초록불인지 확인하고 건너는 순서도에서 '초록불인가?'는 어떤 기호에 적어야 할까요?",
      options: [
        { id: "a", label: "단말 (타원)" },
        { id: "b", label: "판단 (마름모)" },
        { id: "c", label: "입출력 (평행사변형)" },
      ],
      hint: "참과 거짓에 따라 행동이 달라지는 조건이에요.",
    },
    {
      id: "fq2",
      prompt: "순서도에서 판단 기호(마름모)에서 나오는 화살표에 꼭 있어야 하는 것은 무엇인가요?",
      options: [
        { id: "a", label: "‘예’ 또는 ‘아니오’ 같은 조건의 결과 표시" },
        { id: "b", label: "시작 기호로 바로 가는 화살표" },
        { id: "c", label: "새로운 변수 이름" },
      ],
      hint: "조건을 만족했을 때와 만족하지 않았을 때 어느 쪽으로 가야 하는지 알려 주어야 해요.",
    },
    {
      id: "fq3",
      prompt: "라면 끓이기 순서도에서 '물 끓이기' 전에 '물 붓기'가 와야 하는 이유는 무엇일까요?",
      options: [
        { id: "a", label: "순서도 기호의 개수를 맞추기 위해서" },
        { id: "b", label: "단말 기호 다음에 바로 판단 기호가 올 수 없어서" },
        { id: "c", label: "앞선 행동의 결과가 다음 행동의 준비가 되는 순차 구조이기 때문에" },
      ],
      hint: "냄비에 물이 없으면 물을 끓일 수 없어요.",
    },
  ],
  practice: {
    type: "ordering",
    title: "라면 끓이기 순서도 완성하기",
    description: "단말과 처리 기호를 올바른 순차 구조로 연결해 라면 끓이기 알고리즘을 완성해 보세요.",
    blocks: [
      { id: "f_water", label: "[처리] 냄비에 물 500mL 붓기" },
      { id: "f_end", label: "[단말] 종료" },
      { id: "f_start", label: "[단말] 시작" },
      { id: "f_serve", label: "[처리] 그릇에 담아 완성하기" },
      { id: "f_boil", label: "[처리] 물 끓이기" },
      { id: "f_noodle", label: "[처리] 면과 스프 넣기" },
    ],
  },
};

export const ENTRY_BOT_LESSON: Lesson = {
  id: "entry-bot-lab",
  title: "엔트리봇의 첫 걸음",
  description: "블록 코딩의 원리를 배우고, 엔트리봇이 앞으로 걷고 인사말을 건네도록 만들어 봅니다.",
  category: "블록 코딩",
  concepts: [
    {
      id: "block_order",
      title: "블록은 위에서 아래로 차례대로 실행돼요",
      explanation: "엔트리에서는 블록을 아래로 붙여 조립합니다. 컴퓨터는 위쪽에 있는 블록부터 하나씩 차례대로 실행해요.",
      example: "‘앞으로 이동’ 블록 아래에 ‘안녕! 말하기’ 블록을 붙이면 먼저 걷고 나서 인사해요.",
      question: {
        id: "block_order",
        prompt: "블록을 위에서 아래로 세 개 조립했을 때 실행 순서는 어떻게 될까요?",
        options: [
          { id: "down", label: "위쪽 블록부터 아래쪽 블록 순서로 실행돼요" },
          { id: "up", label: "아래쪽 블록부터 위쪽 블록 순서로 실행돼요" },
        ],
        hint: "글을 읽는 방향처럼 위에서 아래로 흘러가요.",
      },
    },
    {
      id: "start_click",
      title: "시작 버튼을 누르면 시작 블록이 반응해요",
      explanation: "프로그램을 시작하려면 어떤 신호가 필요합니다. 엔트리에서는 ‘시작하기 버튼을 클릭했을 때’ 블록이 프로그램의 출발점 역할을 합니다.",
      example: "‘시작하기 버튼을 클릭했을 때’ 블록이 없으면 실행 버튼을 눌러도 블록들이 움직이지 않아요.",
      question: {
        id: "start_click",
        prompt: "화면의 시작하기(재생) 버튼을 눌렀을 때 연결된 블록을 실행하려면 가장 위에 어떤 블록이 있어야 할까요?",
        options: [
          { id: "flag", label: "시작하기 버튼을 클릭했을 때" },
          { id: "stop", label: "모든 코드 멈추기" },
        ],
        hint: "실행을 출발시키는 시작 카테고리의 블록이에요.",
      },
    },
  ],
  quiz: [
    {
      id: "eq1",
      prompt: "엔트리에서 '이동 방향으로 10만큼 움직이기' 블록을 세 번 실행하면 엔트리봇은 얼마나 이동할까요?",
      options: [
        { id: "a", label: "30만큼 이동해요" },
        { id: "b", label: "10만큼만 이동해요" },
        { id: "c", label: "제자리로 돌아와요" },
      ],
      hint: "10만큼 움직이는 동작이 3번 반복돼요.",
    },
    {
      id: "eq2",
      prompt: "엔트리봇이 2초 동안 ‘반가워!’라고 말하게 하려면 어떤 블록을 써야 할까요?",
      options: [
        { id: "a", label: "이동 방향을 2도로 정하기" },
        { id: "b", label: "‘반가워!’를 2초 동안 말하기" },
        { id: "c", label: "2번 반복하기" },
      ],
      hint: "말풍선을 띄우는 생김새 블록이에요.",
    },
    {
      id: "eq3",
      prompt: "조립한 블록을 실행했을 때 원하는 대로 움직이지 않는다면 가장 먼저 해야 할 일은 무엇일까요?",
      options: [
        { id: "a", label: "컴퓨터를 다시 켠다" },
        { id: "b", label: "문제를 포기하고 다른 과목을 공부한다" },
        { id: "c", label: "블록이 연결된 순서와 입력한 숫자를 차근차근 확인한다 (디버깅)" },
      ],
      hint: "오류의 원인을 찾아 수정하는 과정을 디버깅이라고 해요.",
    },
  ],
  practice: {
    type: "entryjs",
    title: "엔트리봇 앞으로 걷고 인사하기",
    description: "시작하기 버튼을 클릭했을 때 엔트리봇이 오른쪽으로 10만큼 이동한 뒤 ‘안녕!’을 2초 동안 말하도록 블록을 연결하세요.",
    blocks: [
      { id: "when_run_button_click", label: "시작하기 버튼을 클릭했을 때" },
      { id: "move_direction", label: "이동 방향으로 10만큼 움직이기" },
      { id: "dialog_time", label: "‘안녕!’을 2초 동안 말하기" },
    ],
    criteria: [
      { id: "crit_start", label: "시작 블록 하나가 맨 위에 연결되어 있나요?" },
      { id: "crit_move", label: "시작 신호 뒤에 10만큼 앞으로 움직이나요?" },
      { id: "crit_say", label: "움직인 뒤 ‘안녕!’을 2초 동안 말하나요?" },
    ],
    defaultProject: buildEntryProject(["when_run_button_click"]),
  },
};

export const LESSONS: Lesson[] = [SAMPLE_LESSON, FLOWCHART_LESSON, ENTRY_BOT_LESSON, PROGRAMMING_LESSON, CONDITIONALS_LESSON, ...REVIEW_LESSONS];
// Keep historical definitions readable; only completed lessons can be newly opened.
export const RELEASED_LESSONS: Lesson[] = [PROGRAMMING_LESSON, CONDITIONALS_LESSON, ...REVIEW_LESSONS];

export function findLesson(id: string) {
  return LESSONS.find((lesson) => lesson.id === id);
}
