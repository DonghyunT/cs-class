import "server-only";
import type { WorkDraft } from "../classroom/types";
import { runnableEntryBlocks } from "../classroom/entry-project";

export interface OrderingSolution {
  type: "ordering";
  expectedOrder: string[];
  successMessage: string;
  failureMessage: string;
}

export interface EntryCriterionCheck {
  id: string;
  label: string;
  check: (entryProject: string | null | undefined, draft: WorkDraft) => { passed: boolean; message: string };
}

export interface EntrySolution {
  type: "entryjs";
  criteria: EntryCriterionCheck[];
  successMessage: string;
  failureMessage: string;
}

export interface LessonSolution {
  lessonId: string;
  conceptAnswers: Record<string, string>;
  quizAnswers: Record<string, string>;
  quizFeedback?: Record<string, { correct: string; incorrect?: string }>;
  practice: OrderingSolution | EntrySolution;
}

export const SOLUTIONS: Record<string, LessonSolution> = {
  "sequence-lab": {
    lessonId: "sequence-lab",
    conceptAnswers: { algorithm: "clear", sequence: "save" },
    quizAnswers: { q1: "a", q2: "b", q3: "c" },
    practice: {
      type: "ordering",
      expectedOrder: ["start", "input", "greeting", "output", "end"],
      successMessage: "이름을 입력받고 인사말을 보여 주는 순서가 완성됐어요. 제출하면 실습이 완료돼요.",
      failureMessage: "시작 → 이름 입력 → 인사말 만들기 → 화면에 보여 주기 → 종료의 흐름을 생각해 보세요.",
    },
  },
  "flowchart-lab": {
    lessonId: "flowchart-lab",
    conceptAnswers: { terminal: "process", decision: "decision" },
    quizAnswers: { fq1: "b", fq2: "a", fq3: "c" },
    quizFeedback: {
      fq1: { correct: "맞았어요. 참과 거짓에 따라 흐름이 나뉘는 조건은 마름모(판단) 기호에 적어요." },
      fq2: { correct: "맞았어요. 판단 기호에서 나가는 길에는 ‘예’와 ‘아니오’처럼 조건의 결과를 적어 주어야 해요." },
      fq3: { correct: "맞았어요. 앞선 동작이 끝나야 다음 동작을 할 수 있는 순차 구조의 원리예요." },
    },
    practice: {
      type: "ordering",
      expectedOrder: ["f_start", "f_water", "f_boil", "f_noodle", "f_serve", "f_end"],
      successMessage: "라면을 끓이는 전체 순서도가 올바른 순차 구조로 완성됐어요. 제출하면 실습이 완료돼요.",
      failureMessage: "시작 → 물 500mL 붓기 → 물 끓이기 → 면과 스프 넣기 → 그릇에 담기 → 종료의 순서를 확인해 보세요.",
    },
  },
  "entry-bot-lab": {
    lessonId: "entry-bot-lab",
    conceptAnswers: { block_order: "down", start_click: "flag" },
    quizAnswers: { eq1: "a", eq2: "b", eq3: "c" },
    quizFeedback: {
      eq1: { correct: "맞았어요. 10만큼 이동하는 동작을 3번 실행하므로 총 30만큼 이동해요." },
      eq2: { correct: "맞았어요. 지정한 시간 동안 말풍선을 띄우는 생김새 카테고리의 블록이에요." },
      eq3: { correct: "맞았어요. 오류의 원인을 찾아 차근차근 고치는 과정을 디버깅이라고 불러요." },
    },
    practice: {
      type: "entryjs",
      criteria: [
        {
          id: "crit_start",
          label: "시작 블록 하나가 맨 위에 연결되어 있나요?",
          check: (entryProject) => {
            const passed = runnableEntryBlocks(entryProject).length > 0;
            return {
              passed,
              message: passed ? "시작하기 블록 하나가 맨 위에 연결되어 있어요." : "‘시작하기 버튼을 클릭했을 때’ 블록 하나를 가장 위에 놓아 주세요.",
            };
          },
        },
        {
          id: "crit_move",
          label: "시작 신호 뒤에 10만큼 앞으로 움직이나요?",
          check: (entryProject) => {
            const blocks = runnableEntryBlocks(entryProject);
            const moves = blocks.filter((block) => block.type === "move_direction");
            const passed = moves.length > 0 && moves.reduce((sum, block) => sum + block.amount, 0) === 10;
            return {
              passed,
              message: passed ? "시작 신호 뒤에 10만큼 앞으로 움직여요." : "시작 블록 아래에 ‘이동 방향으로 10만큼 움직이기’ 블록을 연결해 주세요.",
            };
          },
        },
        {
          id: "crit_say",
          label: "움직인 뒤 ‘안녕!’을 2초 동안 말하나요?",
          check: (entryProject) => {
            const blocks = runnableEntryBlocks(entryProject);
            const speechIndex = blocks.findIndex((block) => block.type === "dialog_time");
            const speech = blocks[speechIndex];
            const moves = blocks.slice(0, speechIndex).filter((block) => block.type === "move_direction");
            const passed = speech?.type === "dialog_time" && speech.text === "안녕!" && speech.seconds === 2 && speech.mode === "speak" &&
              moves.length > 0 && moves.reduce((sum, block) => sum + block.amount, 0) === 10 &&
              blocks.filter((block) => block.type === "dialog_time").length === 1 &&
              blocks.slice(speechIndex + 1).every((block) => block.type !== "move_direction");
            return {
              passed,
              message: passed ? "움직인 뒤 ‘안녕!’을 2초 동안 말해요." : "이동 블록 아래에 ‘안녕!’을 2초 동안 말하기 블록을 연결해 주세요.",
            };
          },
        },
      ],
      successMessage: "엔트리봇이 시작 신호에 맞춰 앞으로 걷고 인사말을 건네는 프로그램이 완성됐어요! 제출하면 실습이 완료돼요.",
      failureMessage: "시작 블록 하나를 맨 위에 놓고, 앞으로 움직인 뒤 ‘안녕!’을 말하도록 연결해 보세요.",
    },
  },
};

export function getLessonSolution(lessonId: string): LessonSolution | undefined {
  return SOLUTIONS[lessonId];
}
