import type { FlowCard } from "@/lib/classroom/review/project";

type Preset = {
  id: string;
  title: string;
  current: string;
  goal: string;
  conditions: string[];
  core: string[];
  cards: Omit<FlowCard, "id">[];
};

const sequence = (text: string): Omit<FlowCard, "id"> => ({ type: "sequence", text, yes: "", no: "" });
const selection = (text: string, yes: string, no: string): Omit<FlowCard, "id"> => ({ type: "selection", text, yes, no });

// V1 처방전의 레시피를 기존 답안 형식으로 옮깁니다. 채택할 때 카드 ID를 새로 부여합니다.
export const flowchartPresets: Preset[] = [
  {
    id: "weather", title: "오늘 날씨별 옷차림 추천",
    current: "등교할 때 오늘 기온에 맞는 옷차림을 정하지 못한 상태",
    goal: "오늘 기온에 맞는 옷차림 결정",
    conditions: ["현재 기온을 확인하고 기온에 맞는 옷을 고를 것"], core: ["현재 기온", "옷차림"],
    cards: [sequence("오늘 현재 기온 확인하기"), selection("현재 기온이 4℃ 이하인가?", "두꺼운 롱패딩 착용", "가벼운 외투 착용"), sequence("등교 외출 준비 완료")],
  },
  {
    id: "school", title: "지각 방지 등교 작전",
    current: "아침에 일어나 등교 버스를 타기 위해 준비해야 하는 상태",
    goal: "8시 10분 등교 버스 탑승",
    conditions: ["8시 10분 전에 정류장에 도착할 것"], core: ["현재 시각", "알람 소리"],
    cards: [sequence("오전 7시 알람 듣고 기상"), sequence("세수 후 교복 착용"), selection("현재 시각이 7시 40분 이전인가?", "아침 식사 후 정류장 이동", "서둘러 정류장으로 이동"), sequence("등교 버스 안전 탑승")],
  },
  {
    id: "sandwich", title: "통새우 샌드위치 조리",
    current: "샌드위치 재료가 준비되어 있지만 아직 조리하지 않은 상태",
    goal: "맛있는 통새우 샌드위치 완성",
    conditions: ["속 재료를 올리고 식빵 두 장으로 덮어 완성할 것"], core: ["식빵", "딸기잼", "통새우", "치즈"],
    cards: [sequence("식빵 2장 굽기"), sequence("식빵에 딸기잼 바르기"), sequence("양상추와 통새우 올리기"), selection("치즈를 녹여 먹을 것인가?", "전자레인지 20초 데우기", "신선한 상태로 계속 조리"), sequence("나머지 식빵 덮고 자르기")],
  },
  {
    id: "login", title: "비밀번호 5회 검증",
    current: "아이디와 비밀번호를 확인해 로그인을 해야 하는 상태",
    goal: "최대 5회 안에 비밀번호를 검증하고 성공 여부에 따라 처리",
    conditions: ["입력한 비밀번호가 일치할 때만 로그인할 것", "비밀번호 입력은 최대 5회까지만 허용할 것", "5회 모두 실패하면 계정을 잠글 것"], core: ["입력 아이디", "입력 비밀번호", "시도 횟수", "로그인 성공 여부"],
    cards: [sequence("아이디 입력 후 시도 횟수를 0, 로그인 성공 여부를 거짓으로 정하기"), { type: "loop", text: "시도 횟수가 5 미만이고 아직 로그인에 성공하지 않은 동안", yes: "비밀번호를 입력받고 시도 횟수를 1 늘린다. 비밀번호가 일치하면 로그인 성공 여부를 참으로 바꾼다.", no: "" }, selection("로그인에 성공했는가?", "서비스 메인 화면 진입", "5회 실패 안내와 계정 잠금")],
  },
  {
    id: "study", title: "25분 집중 뽀모도로 타이머",
    current: "공부를 시작하려는데 스마트폰 때문에 집중하기 어려운 상태",
    goal: "25분 집중 공부 후 5분 휴식",
    conditions: ["공부 시간 25분 동안 집중한 뒤 5분간 쉴 것"], core: ["공부 시간(분)", "타이머 알람"],
    cards: [sequence("스마트폰 방해금지 설정"), sequence("25분 집중 타이머 시작"), { type: "loop", text: "공부 시간이 25분 미만인 동안", yes: "필기와 공부에만 몰입", no: "" }, sequence("알람 시 5분간 스트레칭 휴식")],
  },
];

export const flowchartQuickIdeas = [
  { id: "vending", title: "자판기 음료수", current: "목이 마른데 동전을 쥐고 자판기 앞에 서 있는 상태", goal: "동전을 투입하여 원하는 시원한 음료수를 뽑아 마시는 상태" },
  { id: "bus", title: "등교 버스", current: "아침 7시 40분에 일어나서 등교 버스 도착 시간을 모르는 상태", goal: "버스 도착 시간을 확인하고 지각하지 않고 등교 버스에 탑승하는 상태" },
  { id: "recycle", title: "페트병 분리수거", current: "다 마신 플라스틱 음료수 페트병에 라벨이 붙어 있는 상태", goal: "라벨을 떼어내고 세척 후 플라스틱 수거함에 올바르게 분리수거하는 상태" },
  { id: "study", title: "25분 집중 공부", current: "공부를 시작하려는데 스마트폰 때문에 집중력이 흐트러지는 상태", goal: "25분 집중 타이머를 가동하고 알람이 울릴 때까지 공부를 마치는 상태" },
];
