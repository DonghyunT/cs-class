import type { Lesson } from "../types";
import quiz from "./quiz.json";

function concept(id: string, title: string, explanation: string, example: string, prompt: string, right: string, wrong: string) {
  return { id, title, explanation, example, question: { id, prompt, options: [{ id: "0", label: right }, { id: "1", label: wrong }], hint: explanation } };
}
export const REVIEW_LESSONS: Lesson[] = [
  { id: "review-abstraction", mode: "review", title: "문제 추상화", category: "알고리즘 · 선택 복습", description: "상태와 목표를 찾고, 핵심만 남겨 해결 계획을 세워 봅니다.",
    concepts: [
      concept("essential", "핵심만 남기는 생각", "추상화는 목적에 꼭 필요한 정보를 남기고 불필요한 세부 사항을 덜어내는 과정이에요.", "지하철 노선도는 실제 거리보다 역과 환승 연결을 잘 보여 줘요.", "환승할 역을 찾을 때 필요한 정보는?", "역 이름과 노선의 연결", "역 벽의 색과 광고"),
      concept("state", "현재에서 목표로", "현재 상태와 목표 상태를 구분하고, 지켜야 할 조건을 찾으면 문제를 더 정확하게 정의할 수 있어요.", "현재: 지각이 잦다 / 목표: 정시에 도착한다 / 조건: 버스 첫차 시간", "‘정시에 학교에 도착한다’는?", "목표 상태", "현재 상태"),
      concept("decompose", "분해하고 핵심을 고르기", "큰 문제를 작은 문제로 나눈 뒤 해결에 필요한 데이터와 기준을 골라요.", "여행 계획을 교통·숙소·예산 문제로 나눌 수 있어요.", "문제 분해의 예는?", "여행을 교통·숙소·예산으로 나누기", "문제와 무관한 정보를 모두 모으기"),
    ], quiz: quiz.abstraction, practice: { type: "abstraction", title: "추상화 닥터", description: "현재 상태·목표·조건·핵심 요소·해결 계획을 정리해 처방전을 남겨요.", blocks: [] } },
  { id: "review-sandwich", mode: "review", title: "알고리즘 설계", category: "알고리즘 · 선택 복습", description: "샌드위치 로봇에게 명확한 명령을 내리고, 결과를 관찰하며 고쳐 봅니다.",
    concepts: [
      concept("clear", "컴퓨터는 추측하지 않아요", "알고리즘의 각 명령은 모호하지 않고 누구나 같은 뜻으로 이해할 수 있어야 해요.", "‘적당히 꺼내’보다 ‘빵 봉지를 열고 식빵 두 장을 꺼내’가 명확해요.", "더 명확한 명령은?", "식빵 두 장을 접시에 놓는다", "빵을 적당히 준비한다"),
      concept("finite", "알고리즘의 다섯 조건", "알고리즘은 다섯 조건을 지켜요. 입력(처음에 받는 자료, 없어도 돼요)·출력(내놓는 결과)·명확성(누가 읽어도 뜻이 하나)·유한성(언젠가 반드시 끝남)·수행 가능성(실제로 할 수 있는 명령)이에요.", "컵에 물 붓기를 영원히 반복하면 유한성을 지키지 못해요.", "반드시 언젠가 끝나야 한다는 조건은?", "유한성", "입력"),
      concept("structure", "순차·선택·반복", "명령을 순서대로 수행하고, 조건으로 길을 나누고, 필요한 만큼 반복할 수 있어요.", "우유가 있으면 우유를 넣고, 없으면 물을 넣어요.", "‘우유가 있으면 넣는다’는?", "선택 구조", "순차 구조만 사용"),
    ], quiz: quiz.algorithm, practice: { type: "sandwich", title: "샌드위치 로봇", description: "준비 행동부터 차근차근 명령해 보세요. 잼·땅콩버터·치즈로 여러 레시피를 만들 수 있어요.", blocks: [] } },
  { id: "review-flowchart", mode: "review", title: "순서도 연구소", category: "알고리즘 · 선택 복습", description: "세 가지 퍼즐과 자유 작품으로 생각의 흐름을 연결해 봅니다.",
    concepts: [
      concept("symbols", "기호로 나타내는 절차", "단말(‘끝’이라는 뜻)은 시작과 끝, 처리는 행동과 계산, 입출력은 데이터의 입력과 출력, 판단은 조건을 나타내요.", "‘키를 입력한다’는 입출력, ‘키가 150 이상인가?’는 판단이에요.", "조건을 적는 기호는?", "판단(마름모)", "처리(직사각형)"),
      concept("branches", "선과 분기 읽기", "화살표는 실행 순서예요. 판단에서는 예·아니오를 표시해 어느 길로 갈지 알려 줘요.", "키가 150 이상이면 탑승, 아니면 대기해요.", "판단 기호에서 나가는 길에 필요한 것은?", "예·아니오 표시", "항상 같은 다음 단계"),
      concept("loop", "돌아가는 길도 설계해요", "반복은 조건을 다시 확인하도록 앞 단계에 연결해요. 끝나는 길도 있어야 해요.", "비밀번호가 틀리면 다시 입력하고, 맞으면 로그인해요.", "비밀번호가 틀렸을 때 연결할 곳은?", "비밀번호 입력 단계", "바로 종료"),
    ], quiz: quiz.flowchart, practice: { type: "flowchart", title: "순서도 연구소", description: "순차·선택·반복 퍼즐을 완성하고 자유 작품을 설계해요. 예시 공방은 원하는 만큼 연습할 수 있어요.", blocks: [] } },
];
