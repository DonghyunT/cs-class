import { buildNameProject } from "./name-entry";
import { CONTAINER_BLOCKS, ENTRYBOT_SPRITE, ENTRY_PALETTE, ENTRY_SPRITES, LIBRARY_SPRITES, MAX_ADDED_OBJECTS, MAX_FREE_OBJECTS, MISSION_BLOCKS, PALETTE_BLOCKS, TRUSTED_SPRITES, VALUE_BLOCKS, blockLabel, spritePictures } from "./entry-palette";

// `variables` shows A·B on the stage; `keyEvents` keeps the run waiting for arrow keys.
// `objects` missions grade every object's event code instead of only the dog's.
// `hint` is the on-screen hint; `failure` (default `hint`) is the grader's failure message.
export type ProgrammingMission = { id: string; title: string; goal: string; hint: string; failure?: string; steps: readonly string[]; experiment: string; optional?: true; variables?: true; keyEvents?: true; objects?: true };

// Every mission across lessons, keyed by an id no other lesson reuses. Grading and
// saved records look missions up here; lessons list theirs in LESSON_MISSIONS.
export const PROGRAMMING_MISSIONS: readonly ProgrammingMission[] = [
  { id: "name", steps: ["(시작) ‘시작하기 버튼을 클릭했을 때’ 아래에 (자료) ‘( )을(를) 묻고 대답 기다리기’(팔레트에서는 ‘안녕! 을(를) 묻고 대답 기다리기’)를 붙이고, 칸의 ‘안녕!’을 ‘이름이 뭐니?’ 같은 질문으로 바꿔요.","그 아래에 (생김새) ‘( )을(를) ( )초 동안 말하기’(팔레트에서는 ‘안녕! 을(를) 4 초 동안 말하기’)를 붙여요. 초가 없는 말하기 블록은 이 미션 검증에 쓰지 않아요.","(자료) ‘대답’을 말하기 블록의 첫 칸에 끼워요. 방금 입력한 이름이 ‘대답’에 들어 있어요.","인사말을 붙이고 싶으면 (계산) ‘( )와(과) ( )를 합치기’(팔레트에서는 ‘안녕! 과(와) 엔트리 을(를) 합친 값’)의 두 칸에 ‘내 이름은 ’과 ‘대답’을 넣고, 그 블록을 말하기 칸에 끼워요."], title: "강아지 이름 짓기", goal: "이름을 묻고, 입력한 이름을 말하게 해주세요.", hint: "질문 다음에 ‘( )을(를) ( )초 동안 말하기’(팔레트에서는 ‘안녕! 을(를) 4 초 동안 말하기’)를 연결하고, 그 안에 ‘대답’을 넣어 보세요.", failure: "질문 다음에 말하기를 연결하고, 말하기 안에 ‘대답’을 넣어 보세요.", experiment: "초코와 보리처럼 서로 다른 이름으로 두 번 실행해 보세요." },
  { id: "multiply", steps: ["‘시작하기 버튼을 클릭했을 때’ 아래에 (자료) ‘( )을(를) 묻고 대답 기다리기’(팔레트에서는 ‘안녕! 을(를) 묻고 대답 기다리기’)를 붙이고 ‘안녕!’을 ‘첫 번째 수는?’으로 바꿔요.","바로 아래에 (자료) ‘변수를 ( )(으)로 정하기’(팔레트에서는 ‘A 를 10 (으)로 정하기’)를 붙여 변수는 A, 값 칸에는 ‘대답’을 넣어요. 다음 질문을 하면 ‘대답’이 새 입력으로 바뀌므로 그 전에 A에 옮겨 둬요.","두 번째 수를 묻고, 같은 방법으로 B에 ‘대답’을 저장해요.","(생김새) ‘( )을(를) ( )초 동안 말하기’(팔레트에서는 ‘안녕! 을(를) 4 초 동안 말하기’)를 붙이고, 그 첫 칸에 (계산) ‘( ) 사칙연산 ( )’(팔레트에서는 ‘10 x 10’)을 넣어요. 두 칸에는 (자료) ‘변수 값’(팔레트에서는 ‘A 값’)으로 A와 B를 넣어요."], title: "곱셈 계산기", goal: "두 수를 A와 B에 기억하고, 두 수의 곱을 말하게 해주세요.", hint: "첫 질문의 대답을 A에 저장한 뒤 두 번째 수를 물어보세요. B를 물으면 ‘대답’이 바뀌어요.", experiment: "6과 4, 3과 7을 입력해 보세요. 입력을 바꾸면 결과도 달라지나요?", variables: true },
  { id: "move", steps: ["‘시작하기 버튼을 클릭했을 때’ 아래에 (움직임) ‘이동 방향을 ( )(으)로 정하기’(팔레트에서는 ‘이동 방향을 90°(으)로 정하기’)를 붙이고 90°로 정해요. 오른쪽은 90°예요.","그 아래에 (움직임) ‘이동 방향으로 ( )만큼 움직이기’(팔레트에서는 ‘이동 방향으로 10만큼 움직이기’)를 붙이고 10을 넣어요.","강아지가 이미 오른쪽을 보고 있으면 1번은 빼도 돼요."], title: "시작 버튼으로 움직이기", goal: "시작하기 버튼을 누르면 강아지가 오른쪽으로 10만큼 움직이게 해주세요.", hint: "시작하기 아래에 이동 블록을 연결해 보세요. 오른쪽 방향은 90°예요.", experiment: "실행 → 중지 → 다시 실행해 보세요. 시작 위치와 이동 결과를 비교해요." },
  { id: "keys", steps: ["(시작) ‘키를 눌렀을 때’를 네 개 놓고(팔레트에서는 처음 키가 위쪽 화살표로 보여요), 키 칸을 위쪽·오른쪽·아래쪽·왼쪽 화살표로 하나씩 바꿔요.","각 줄 아래에 (움직임) ‘이동 방향을 ( )(으)로 정하기’(팔레트에서는 ‘이동 방향을 90°(으)로 정하기’)를 붙이고 위 0°·오른쪽 90°·아래 180°·왼쪽 270°로 정해요.","그 아래에 (움직임) ‘이동 방향으로 ( )만큼 움직이기’(팔레트에서는 ‘이동 방향으로 10만큼 움직이기’)를 붙이고 10을 넣어요.","‘시작하기 버튼을 클릭했을 때’ 줄은 그대로 두어도, 지워도 돼요."], title: "방향키로 움직임 개선", goal: "네 방향키로 강아지를 각 방향으로 10만큼 움직이게 해주세요.", hint: "‘키를 눌렀을 때’ 아래에 방향을 정하고 움직여요. 위 0°·오른쪽 90°·아래 180°·왼쪽 270°예요.", experiment: "실행 후 무대를 클릭하고 네 방향키를 눌러 보세요.", keyEvents: true },
  // tests/fixtures/entry-legacy-keys.json pins the failure messages of name·multiply·average·move·keys; to change their hint, keep the old wording in `failure`.
  { id: "average", steps: ["엔트리봇에 (시작) ‘시작하기 버튼을 클릭했을 때’를 놓고, 아래에 (자료) ‘( )을(를) 묻고 대답 기다리기’(팔레트에서는 ‘안녕! 을(를) 묻고 대답 기다리기’)로 첫 번째 수를 물어요.","바로 아래에 (자료) ‘변수를 ( )(으)로 정하기’(팔레트에서는 ‘A 를 10 (으)로 정하기’)로 A에 ‘대답’을 저장해요. 두 번째 질문을 하면 ‘대답’이 바뀌기 때문이에요.","두 번째 수를 묻고 B에 ‘대답’을 저장해요.","(계산) ‘( ) 사칙연산 ( )’(팔레트에서는 ‘10 / 10’)을 놓고 오른쪽 칸에 2를 넣어요. 왼쪽 칸에는 ‘10 + 10’ 모양의 사칙연산 블록을 넣고, 두 칸에 (자료) ‘변수 값’(팔레트에서는 ‘A 값’)으로 A와 B를 넣어요. 더하기가 나눗셈 안에 있어야 먼저 더해요.","(생김새) ‘( )을(를) 말하기’(팔레트에서는 ‘안녕! 을(를) 말하기’)를 붙이고, 완성한 계산 블록을 그 첫 칸에 넣어요."], title: "평균 계산기", goal: "두 수를 A와 B에 기억하고, 두 수의 평균 (A + B) ÷ 2를 말하게 해주세요.", hint: "덧셈 블록을 나눗셈 블록 안에 넣어, 두 수를 먼저 더한 뒤 2로 나눠요.", experiment: "6과 4의 평균은 5예요. -2와 5를 넣으면 어떻게 될까요?", variables: true },
  { id: "pass", steps: ["엔트리봇에 ‘시작하기 버튼을 클릭했을 때’를 놓고, 아래에 (자료) ‘( )을(를) 묻고 대답 기다리기’(팔레트에서는 ‘안녕! 을(를) 묻고 대답 기다리기’)로 점수를 물어요.","그 아래에 (흐름) ‘만일 ( )(이)라면 / 아니면’(팔레트에서는 ‘만일 참 (이)라면 아니면’)을 붙여요. 칸이 위·아래 두 개인 블록이에요. 칸이 하나인 ‘만일 ( )(이)라면’과 헷갈리지 마세요.","(판단) ‘( ) 비교 ( )’(팔레트에서는 ‘10 ≥ 10’)를 만일의 조건 칸에 넣고, 왼쪽 칸에 ‘대답’, 오른쪽 칸에 60을 넣어요.","위 칸에는 ‘합격’, ‘아니면’ 아래 칸에는 ‘불합격’을 말하는 (생김새) ‘( )을(를) 말하기’(팔레트에서는 ‘안녕! 을(를) 말하기’)를 넣어요."], title: "시험 합격/불합격", goal: "점수를 묻고, 60점 이상이면 ‘합격’, 아니면 ‘불합격’을 말하게 해주세요.", hint: "‘만일 (대답 ≥ 60)’의 위쪽엔 ‘합격’, 아래쪽엔 ‘불합격’ 말하기를 연결해요.", experiment: "59, 60, 100을 차례로 넣어 보세요. 60에서는 어떤 말이 나와야 할까요?" },
  { id: "freethrow", steps: ["이 작품은 성공 개수를 한 번만 물어요. 엔트리봇에 ‘시작하기 버튼을 클릭했을 때’를 놓고 (자료) ‘( )을(를) 묻고 대답 기다리기’(팔레트에서는 ‘안녕! 을(를) 묻고 대답 기다리기’)를 붙여요.","틀부터 만들어요. (흐름) ‘만일 ( )(이)라면 / 아니면’(팔레트에서는 ‘만일 참 (이)라면 아니면’)을 붙이고, 그 블록의 ‘아니면’ 칸 안에 같은 블록을 하나 더 넣어요. 말을 넣을 칸이 위·가운데·아래 세 곳이 돼요.","(판단) ‘( ) 비교 ( )’(팔레트에서는 ‘10 ≥ 10’)로 바깥 만일의 조건 칸에 (대답 ≥ 8), 안쪽 만일의 조건 칸에 (대답 ≥ 5)를 넣어요. 큰 기준 8을 먼저 확인해야 9개가 ‘잘했어요!’로 빠지지 않아요.","세 칸에 차례로 ‘훌륭해요!’, ‘잘했어요!’, ‘더 연습해 보자!’를 말하는 (생김새) ‘( )을(를) 말하기’(팔레트에서는 ‘안녕! 을(를) 말하기’)를 넣어요."], title: "자유투 평가", goal: "자유투 성공 개수를 묻고, 8개 이상이면 ‘훌륭해요!’, 5개 이상이면 ‘잘했어요!’, 그보다 적으면 ‘더 연습해 보자!’를 말하게 해주세요.", hint: "‘아니면’ 안에 ‘만일’을 한 번 더 넣어요. 큰 기준 8부터 확인해요.", experiment: "4, 5, 7, 8을 차례로 넣어 보세요. 5와 8은 기준과 같은 수예요. 어떤 말이 나와야 할까요?" },
  { id: "square", steps: ["엔트리봇에 ‘시작하기 버튼을 클릭했을 때’를 놓고, 아래에 (붓) ‘그리기 시작하기’를 붙여요. 이 블록이 있어야 지나간 길에 선이 남아요.","그 아래에 (흐름) ‘( )번 반복하기’(팔레트에서는 ‘10번 반복하기’)를 붙이고 4를 넣어요.","반복 안에 (움직임) ‘이동 방향으로 ( )만큼 움직이기’(팔레트에서는 ‘이동 방향으로 10만큼 움직이기’)(100)와 ‘이동 방향을 ( )만큼 회전하기’(팔레트에서는 ‘이동 방향을 90°만큼 회전하기’)(90°)를 차례로 넣어요. ‘방향을 ( )만큼 회전하기’는 엔트리봇 모양까지 함께 돌리며, 어느 쪽을 써도 정사각형이 그려져요.","실행이 끝나도 선은 남아 있어요. 다 봤으면 무대 아래 ‘정지하기’를 눌러요."], title: "정사각형 그리기", goal: "그리기를 시작한 뒤 ‘4번 반복하기’로 100만큼 움직이고 90°씩 회전해, 한 변이 100인 정사각형을 그려 주세요.", hint: "‘그리기 시작하기’ 뒤에 ‘4번 반복하기’를 놓고, 안에 100만큼 움직이기와 90° 회전하기를 넣어요.", experiment: "반복 안에 ‘1초 기다리기’를 넣으면 그리는 과정을 천천히 볼 수 있어요." },
  { id: "polygon", steps: ["‘시작하기 버튼을 클릭했을 때’ 아래에 (자료) ‘( )을(를) 묻고 대답 기다리기’(팔레트에서는 ‘안녕! 을(를) 묻고 대답 기다리기’)로 변의 수를 묻고, 그 아래에 (붓) ‘그리기 시작하기’를 붙여요.","(흐름) ‘( )번 반복하기’(팔레트에서는 ‘10번 반복하기’)를 붙이고 횟수 칸에 ‘대답’을 넣어요.","반복 안에 (움직임) ‘이동 방향으로 ( )만큼 움직이기’(팔레트에서는 ‘이동 방향으로 10만큼 움직이기’)와 ‘이동 방향을 ( )만큼 회전하기’(팔레트에서는 ‘이동 방향을 90°만큼 회전하기’)를 넣고, 움직이기 칸에는 70을 넣어요.","회전 각도 칸에 (계산) ‘( ) 사칙연산 ( )’(팔레트에서는 ‘10 / 10’)을 넣고, 왼쪽에 360, 오른쪽에 ‘대답’을 넣어요. 한 바퀴 360°를 변의 수만큼 나누어 돌아요."], title: "정다각형 그리기", goal: "변의 수를 묻고, 대답만큼 반복하며 360 ÷ 대답만큼 회전해 정다각형을 그려 주세요.", hint: "반복 횟수엔 ‘대답’, 회전 각도엔 (360 ÷ 대답)을 넣어요.", experiment: "3, 5, 6을 넣어 정삼각형·정오각형·정육각형이 그려지는지 보세요. 도형이 무대 밖으로 나가면 변의 길이를 줄여 보세요." },
  { id: "tree", steps: ["오브젝트 목록에서 ‘나무’를 골라요. 코드는 나무에 만들어요.","(시작) ‘마우스를 클릭했을 때’를 놓아요. 무대 어디를 클릭해도 실행돼요.","그 아래에 (자료) ‘변수에 ( )만큼 더하기’(팔레트에서는 앞 칸이 변수 이름, 뒤 칸이 10)를 붙이고 변수는 ‘클릭 수’, 값은 1로 해요.","(흐름) ‘만일 ( )(이)라면’(팔레트에서는 ‘만일 참 (이)라면’)을 다섯 개 이어 붙이고, 조건 칸마다 (판단) ‘( ) 비교 ( )’(팔레트에서는 ‘10 = 10’)로 (클릭 수 = 5), (= 10), (= 15), (= 20), (= 25)를 만들어요. 클릭 수는 (자료) ‘변수 값’에서 골라요. ‘=’를 써야 그 수가 될 때 한 번만 모양이 바뀌어요.","각 만일 안에 (생김새) ‘다음 모양으로 바꾸기’를 넣고, 25일 때는 ‘성공~!’을 말하는 ‘( )을(를) 말하기’(팔레트에서는 ‘안녕! 을(를) 말하기’)도 넣어요."], title: "나무 키우기", goal: "무대를 클릭할 때마다 ‘클릭 수’를 1씩 늘리고, 클릭 수가 5, 10, 15, 20, 25가 될 때마다 나무를 다음 모양으로 바꿔 주세요. 다 자라면 나무가 ‘성공~!’을 말해요.", hint: "‘나무’ 오브젝트를 고르고, ‘마우스를 클릭했을 때’(무대 어디를 눌러도 실행) 아래에 ① 클릭 수 1 더하기 ② 5·10·15·20·25마다 ‘만일 → 다음 모양으로 바꾸기’를 이어요.", experiment: "4번·5번·6번째 클릭에서 나무 모양을 비교해 보세요. 25번 넘게 클릭해도 나무가 처음 모양으로 돌아가지 않는지도 보세요.", objects: true },
  { id: "safe", steps: ["엔트리봇에 ‘시작하기 버튼을 클릭했을 때’를 놓고, 아래에 (흐름) ‘( )이(가) 될 때까지 반복하기’(팔레트에서는 ‘참 이 될 때까지 반복하기’)를 붙여요.","조건 칸에 (판단) ‘( ) 비교 ( )’(팔레트에서는 ‘10 = 10’)로 (대답 = 1234)를 만들어 넣어요. 이 조건이 참이 되면 반복을 멈춰요.","반복 안에 (자료) ‘( )을(를) 묻고 대답 기다리기’(팔레트에서는 ‘안녕! 을(를) 묻고 대답 기다리기’)로 비밀번호를 물어요. 묻기가 반복 안에 있어야 틀릴 때마다 다시 물어요.","반복 블록 아래(바깥)에 ‘금고가 열렸어요!’를 말하는 (생김새) ‘( )을(를) 말하기’(팔레트에서는 ‘안녕! 을(를) 말하기’)를 붙여요. 반복 안에 두면 틀릴 때마다 말해요."], title: "도전 · 비밀번호 금고", goal: "대답이 1234가 될 때까지 비밀번호를 묻고, 맞히면 ‘금고가 열렸어요!’를 말하게 해주세요.", hint: "‘(대답 = 1234)이(가) 될 때까지 반복하기’ 안에 묻기, 반복 뒤에 말하기를 연결해요.", experiment: "틀린 번호를 몇 번 넣은 뒤 1234를 넣어 보세요. 질문이 몇 번 나왔나요?", optional: true },
  { id: "escape", steps: ["‘시작하기 버튼을 클릭했을 때’ 아래에서 1번 문제를 풀었는지(1 또는 0) 묻고, 바로 (자료) ‘변수를 ( )(으)로 정하기’(팔레트에서는 ‘A 를 10 (으)로 정하기’)로 A에 ‘대답’을 저장해요. 2번도 묻고 B에 저장해요.","(흐름) ‘만일 ( )(이)라면 / 아니면’(팔레트에서는 ‘만일 참 (이)라면 아니면’)을 붙여요.","(판단) ‘( ) 그리고/또는 ( )’(팔레트에서는 ‘참 또는 거짓’)를 놓고, 두 칸에 ‘( ) 비교 ( )’(팔레트에서는 ‘10 = 10’)로 만든 (A = 1)과 (B = 1)을 넣어요. 가운데가 ‘또는’인지 확인해요.","완성한 판단 블록을 만일의 조건 칸에 넣고, 위 칸에 ‘탈출 성공!’, 아래 칸에 ‘탈출 실패’를 말하게 해요."], title: "도전 · 방탈출", goal: "1번·2번 문제를 풀었으면 1, 못 풀었으면 0을 묻고 A·B에 저장한 뒤, 하나라도 풀었으면 ‘탈출 성공!’, 아니면 ‘탈출 실패’를 말하게 해주세요.", hint: "‘( ) 그리고/또는 ( )’를 ‘또는’으로 바꾸고 (A = 1)과 (B = 1)을 넣어요.", experiment: "1과 0, 0과 1, 0과 0을 넣어 보세요. 여유가 있으면 1과 1에서 어떻게 될지 먼저 예상해 보세요.", optional: true, variables: true },
];

// `active` missions are shown and can be checked. `retired` ones only keep old saved work readable.
const LESSON_MISSIONS: Readonly<Record<string, { active: readonly string[]; retired?: readonly string[] }>> = {
  // The average calculator moved to conditionals; earlier average work stays readable here.
  "programming-13": { active: ["name", "multiply", "move", "keys"], retired: ["average"] },
  conditionals: { active: ["average", "pass", "freethrow", "escape"] },
  loops: { active: ["square", "polygon", "tree", "safe"] },
};
// These lessons start without the dog: every object is equal and students pick from the Entry library.
const FREE_MISSIONS: ReadonlySet<string> = new Set([...LESSON_MISSIONS.conditionals.active, ...LESSON_MISSIONS.loops.active]);
export const isFreeMission = (id: string) => FREE_MISSIONS.has(id);
// Starter objects the mission needs; they cannot be deleted.
export const LOCKED_OBJECTS: Readonly<Record<string, readonly string[]>> = { tree: ["can", "tree"] };
export const missionById = (id: string) => PROGRAMMING_MISSIONS.find((m) => m.id === id);
export const missionsFor = (lessonId: string) => (LESSON_MISSIONS[lessonId]?.active ?? []).map((id) => missionById(id)!);
export const requiredMissionsFor = (lessonId: string) => missionsFor(lessonId).filter((m) => !m.optional);
export const isLessonMission = (lessonId: string, id: string) => !!LESSON_MISSIONS[lessonId]?.active.includes(id);
export const isKnownLessonMission = (lessonId: string, id: string) => isLessonMission(lessonId, id) || !!LESSON_MISSIONS[lessonId]?.retired?.includes(id);
export const knownMissionCount = (lessonId: string) => (LESSON_MISSIONS[lessonId]?.active.length ?? 0) + (LESSON_MISSIONS[lessonId]?.retired?.length ?? 0);
export type EntryNode = { id?: string; type: string; params: unknown[]; statements?: EntryNode[][]; x?: number; y?: number };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

// An object added from the sprite list or a starter project. The dog (`entrybot`) is fixed.
// `picture` is the shown shape's index; it is left out for the first shape so older keys stay the same.
export type AddedObject = {
  id: string; name: string; sprite: string; rotateMethod: "free" | "vertical" | "none";
  entity: { x: number; y: number; scaleX: number; scaleY: number; rotation: number; direction: number; visible: boolean };
  threads: EntryNode[][];
  picture?: number;
};

// Shape ids are rebuilt from the object id: the first is `<id>-pic` as before, then `<id>-pic2`, ….
export const pictureId = (objectId: string, index: number) => index ? `${objectId}-pic${index + 1}` : `${objectId}-pic`;

export function entryObjectModel(added: AddedObject): Record<string, unknown> {
  const sprite = TRUSTED_SPRITES.find((item) => item.id === added.sprite)!;
  const shapes = spritePictures(sprite), several = shapes.length > 1;
  const pictures = shapes.map((shape, i) => ({ id: pictureId(added.id, i), name: several ? `${sprite.name}_${i + 1}` : sprite.name, imageType: shape.file.endsWith(".png") ? "png" : "svg", fileurl: shape.file, thumbUrl: shape.file, dimension: { width: shape.width, height: shape.height } }));
  const shown = shapes[added.picture ?? 0];
  return {
    id: added.id, name: added.name, script: added.threads, objectType: "sprite", rotateMethod: added.rotateMethod, scene: "scene1",
    selectedPictureId: pictures[added.picture ?? 0].id, lock: false, sprite: { sounds: [], pictures },
    entity: { ...added.entity, regX: shown.width / 2, regY: shown.height / 2, width: shown.width, height: shown.height },
  };
}

// A new object from the sprite list, placed to the right of the dog and spread out.
// Dog-free lessons pick from the Entry library: objects get a similar size and backgrounds fill the stage.
export function newAddedObject(spriteId: string, existing: number, free = false): AddedObject | null {
  const sprite = free ? LIBRARY_SPRITES.find((item) => item.id === spriteId) : ENTRY_SPRITES.find((item) => item.id === spriteId);
  if (!sprite) return null;
  const id = `obj-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const background = "category" in sprite && sprite.category === "background";
  const scale = !free ? 0.5 : background ? Math.max(480 / sprite.width, 270 / sprite.height) : Math.min(1, 120 / Math.max(sprite.width, sprite.height));
  const size = Math.round(scale * 1000) / 1000;
  return { id, name: sprite.name, sprite: sprite.id, rotateMethod: "free", threads: [],
    entity: { x: background ? 0 : (free ? -120 : 100) + (existing % 3) * (free ? 120 : 50), y: background ? 0 : 60 - Math.floor(existing / 3) * 80, scaleX: size, scaleY: size, rotation: 0, direction: 90, visible: true } };
}

const placed = (id: string, sprite: string, name: string, entity: Partial<AddedObject["entity"]>): AddedObject => ({ id, name, sprite, rotateMethod: "free", threads: [], entity: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, direction: 90, visible: true, ...entity } });
// A mission's first project: the dog, the Entrybot for dog-free lessons, or the tree mission's
// watering can, growing tree and soil.
export function missionStarter(missionId: string): string {
  if (missionId === "tree") return buildProgrammingProject(undefined, [
    placed("can", "watering-can", "물뿌리개", { x: -150, y: 40, scaleX: 0.32, scaleY: 0.32 }),
    placed("tree", "tree-growth", "나무", { x: 110, y: -10, scaleX: 0.8, scaleY: 0.8 }),
    placed("soil", "soil", "흙", { scaleX: 0.5, scaleY: 0.5 }),
  ], -1, true);
  if (isFreeMission(missionId)) return buildProgrammingProject(undefined, [placed("bot", ENTRYBOT_SPRITE, "엔트리봇", { scaleX: 0.4, scaleY: 0.4 })], -1);
  return buildProgrammingProject();
}

// Same per-mission limit the server enforces on the normalized project.
export const MAX_PROJECT_BYTES = 32_768;
// Raw EntryJS exports carry ~600 bytes of metadata per block; the request schema accepts this much.
export const MAX_RAW_PROJECT_CHARS = 250_000;
const projectBytes = (project: unknown) => new TextEncoder().encode(JSON.stringify(project)).length;

// The tree mission's ‘클릭 수’ variable, shown on the stage.
export const COUNTER = { id: "cs-clicks", name: "클릭 수" } as const;

export function buildProgrammingProject(threads?: EntryNode[][], added: AddedObject[] = [], mainIndex = 0, counter = false): string {
  const p = JSON.parse(buildNameProject()!);
  p.variables.push(...["A", "B"].map((name, i) => ({ id: `cs-${name}`, name, variableType: "variable", value: 0, visible: false, x: -210, y: 130 - i * 30, object: null, isCloud: false, isRealTime: false })));
  if (counter) p.variables.push({ id: COUNTER.id, name: COUNTER.name, variableType: "variable", value: 0, visible: true, x: -225, y: 125, object: null, isCloud: false, isRealTime: false });
  if (threads) p.objects[0].script = threads;
  // Entry lists objects front to back; added objects keep their saved order around the dog.
  // A negative mainIndex is a dog-free project.
  if (mainIndex < 0) p.objects = added.map(entryObjectModel);
  else if (added.length) p.objects.splice(0, 1, ...added.slice(0, mainIndex).map(entryObjectModel), p.objects[0], ...added.slice(mainIndex).map(entryObjectModel));
  return JSON.stringify(p);
}

// The editor's media, objects and variables are fixed. Preserve incomplete
// literal inputs here; validity for execution is checked separately below.
// `key` compares whole saved works (validation/submission). `gradeKey` covers only
// the dog's code, which is all grading and the name mission's run records use.
export function parseProgrammingProject(raw: unknown): { project: Record<string, unknown>; key: string; gradeKey: string; bytes: number; threads: EntryNode[][]; order: string[]; added: AddedObject[]; mainIndex: number; free: boolean } | null {
  if (typeof raw !== "string" || raw.length > MAX_RAW_PROJECT_CHARS) return null;
  try {
    const p = JSON.parse(raw);
    if (!object(p) || !Array.isArray(p.objects) || p.objects.length < 1 || p.objects.length > MAX_FREE_OBJECTS || !p.objects.every(object)) return null;
    const shownFile = (o: Record<string, unknown>) => {
      const pictures = object(o.sprite) && Array.isArray(o.sprite.pictures) ? o.sprite.pictures.filter(object) : [];
      return (pictures.find((pic) => pic.id === o.selectedPictureId) ?? pictures[0])?.fileurl;
    };
    // A single object is the dog, as before objects could be added, unless it shows a trusted
    // sprite. Otherwise find the dog by id; a project without it is dog-free (mainIndex -1).
    const only = p.objects[0] as Record<string, unknown>;
    const single = p.objects.length === 1 && only.id !== "entrybot" && !TRUSTED_SPRITES.some((item) => spritePictures(item).some((shape) => shape.file === shownFile(only)));
    const mainIndex = single ? 0 : p.objects.findIndex((o: Record<string, unknown>) => o.id === "entrybot");
    if ((mainIndex >= 0 && p.objects.length > 1 + MAX_ADDED_OBJECTS) || p.objects.filter((o: Record<string, unknown>) => o.id === "entrybot").length > 1) return null;
    let count = 0;
    const reporters = ["text", "number", "angle", "get_canvas_input_value", "get_variable", "combine_something", "calc_basic"];
    const fail = (): never => { throw Error(); };
    // The original blocks must match their own branch. Letting a malformed one fall
    // through to the generic rule would hand the interpreter and teacher view a shape they cannot read.
    const legacy = new Set([...reporters, "when_run_button_click", "when_some_key_pressed", "ask_and_wait", "set_variable", "move_direction", "direction_absolute", "dialog_time"]);
    function clean(value: unknown, expression = false, depth = 0): EntryNode {
      if (!object(value) || typeof value.type !== "string" || !Array.isArray(value.params) || ++count > 240 || depth > 8) throw Error();
      const { type, params } = value;
      const expr = (v: unknown) => clean(v, true, depth + 1);
      let next: unknown[];
      let statements: EntryNode[][] | undefined;
      if (expression && ["text", "number", "angle"].includes(type) && ["string", "number"].includes(typeof params[0]) && String(params[0]).length <= 180) next = [params[0]];
      else if (expression && type === "get_canvas_input_value") next = [null];
      else if (expression && type === "get_variable" && ["cs-A", "cs-B", COUNTER.id].includes(String(params[0]))) next = [params[0]];
      else if (expression && type === "combine_something") next = [null, expr(params[1]), null, expr(params[3]), null];
      else if (expression && type === "calc_basic" && ["PLUS", "MINUS", "MULTI", "DIVIDE"].includes(String(params[1]))) next = [expr(params[0]), params[1], expr(params[2])];
      else if (!expression && type === "when_run_button_click") next = [null];
      else if (!expression && type === "when_some_key_pressed" && /^\d{1,3}$/.test(String(params[1])) && Number(params[1]) <= 255) next = [null, String(params[1])];
      else if (!expression && type === "ask_and_wait") next = [expr(params[0]), null];
      else if (!expression && type === "set_variable" && ["cs-A", "cs-B", COUNTER.id].includes(String(params[0]))) next = [params[0], expr(params[1]), null];
      else if (!expression && ["move_direction", "direction_absolute"].includes(type)) next = [expr(params[0]), null];
      else if (!expression && type === "dialog_time" && ["speak", "think"].includes(String(params[2]))) next = [expr(params[0]), expr(params[1]), params[2], null];
      // The branches above keep the original lesson blocks' saved shape and keys.
      // Other palette blocks keep their native params; only containers keep statements.
      else if (!legacy.has(type) && (PALETTE_BLOCKS.has(type) || VALUE_BLOCKS.has(type)) && params.length <= 8) {
        next = params.map((v) => v === null || v === undefined ? null : object(v) ? expr(v) : (typeof v === "string" && v.length <= 180) || (typeof v === "number" && Number.isFinite(v)) ? v : fail());
        const lists = CONTAINER_BLOCKS[type];
        if (lists) {
          const inner = value.statements ?? Array.from({ length: lists }, () => []);
          if (!Array.isArray(inner) || inner.length !== lists) throw Error();
          statements = inner.map((t: unknown) => { if (!Array.isArray(t) || t.length > 40) throw Error(); return t.map((n) => clean(n, object(n) && reporters.includes(String(n.type)), depth + 1)); });
        }
      }
      else throw Error();
      return { type, params: next, ...(statements ? { statements } : {}), ...(typeof value.id === "string" && /^[\w-]{1,80}$/.test(value.id) ? { id: value.id } : {}), ...(typeof value.x === "number" && Number.isFinite(value.x) ? { x: Math.max(-2000, Math.min(2000, value.x)) } : {}), ...(typeof value.y === "number" && Number.isFinite(value.y) ? { y: Math.max(-2000, Math.min(2000, value.y)) } : {}) };
    }
    const scriptOf = (o: Record<string, unknown>): EntryNode[][] => {
      const script = typeof o.script === "string" ? JSON.parse(o.script) : o.script ?? [];
      if (!Array.isArray(script) || script.length > 16) throw Error();
      return script.map((t: unknown) => { if (!Array.isArray(t) || t.length > 40) throw Error(); return t.map((n) => clean(n, object(n) && reporters.includes(String(n.type)))); });
    };
    const threads = mainIndex < 0 ? [] : scriptOf(p.objects[mainIndex]);
    const ids = new Set<string>();
    const num = (v: unknown, min: number, max: number, fallback: number) => typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
    // Entry flips scaleX negative for vertical rotation; keep the sign and limit the size.
    const scale = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v !== 0 ? Math.sign(v) * Math.max(0.05, Math.min(5, Math.abs(v))) : 0.5;
    const added: AddedObject[] = p.objects.filter((_: unknown, i: number) => i !== mainIndex).map((o: Record<string, unknown>) => {
      if (typeof o.id !== "string" || !/^[\w-]{1,30}$/.test(o.id) || o.id === "entrybot" || ids.has(o.id)) throw Error();
      ids.add(o.id);
      const pictures = object(o.sprite) && Array.isArray(o.sprite.pictures) ? o.sprite.pictures.filter(object) : [];
      const picture = pictures.find((pic) => pic.id === o.selectedPictureId) ?? pictures[0];
      // Pictures are rebuilt from the trusted sprite list; no other image can be saved, and
      // every listed picture must belong to the same sprite.
      const sprite = TRUSTED_SPRITES.find((item) => spritePictures(item).some((shape) => shape.file === picture?.fileurl));
      // Entry's picture tab can duplicate a shape; keep each shape once.
      if (sprite) pictures.splice(0, pictures.length, ...pictures.filter((pic, i) => pictures.findIndex((other) => other.fileurl === pic.fileurl) === i));
      const files = sprite ? spritePictures(sprite).map((shape) => shape.file) : [];
      if (!sprite || pictures.length > files.length || !pictures.every((pic) => files.includes(String(pic.fileurl)))) throw Error();
      const shown = files.indexOf(String(picture!.fileurl));
      const e = object(o.entity) ? o.entity : {};
      return {
        id: o.id, name: typeof o.name === "string" && o.name.trim() ? o.name.trim().slice(0, 20).trim() : sprite.name, sprite: sprite.id,
        rotateMethod: o.rotateMethod === "vertical" || o.rotateMethod === "none" ? o.rotateMethod : "free",
        entity: { x: num(e.x, -1000, 1000, 0), y: num(e.y, -1000, 1000, 0), scaleX: scale(e.scaleX), scaleY: scale(e.scaleY), rotation: num(e.rotation, -3600, 3600, 0), direction: num(e.direction, -3600, 3600, 90), visible: e.visible !== false },
        threads: scriptOf(o),
        ...(shown ? { picture: shown } : {}),
      };
    });
    const semantic = (n: EntryNode): unknown => ({ type: n.type, params: n.params.map((v) => object(v) && typeof v.type === "string" ? semantic(v as EntryNode) : v), ...(n.statements ? { statements: n.statements.map((t) => t.map(semantic)) } : {}) });
    const flat = (t: EntryNode[]): string[] => t.flatMap((n) => [n.type, ...(n.statements ?? []).flatMap(flat)]);
    const code = (list: EntryNode[][]) => list.map((t) => t.map(semantic));
    // The click counter exists only in projects that started with it (the tree mission).
    const counter = Array.isArray(p.variables) && p.variables.some((v: unknown) => object(v) && v.id === COUNTER.id);
    const project = JSON.parse(buildProgrammingProject(threads, added, mainIndex, counter));
    // Projects with only the dog keep the original key so saved checks still match.
    // Dog-free projects grade every object's code.
    const free = mainIndex < 0;
    const gradeKey = JSON.stringify(free ? added.map((o) => code(o.threads)) : code(threads));
    const key = added.length ? JSON.stringify({ main: code(threads), mainIndex, added: added.map((o) => ({ ...o, threads: code(o.threads) })), ...(counter ? { counter } : {}) }) : gradeKey;
    return { project, threads, added, mainIndex, free, order: [...threads, ...added.flatMap((o) => o.threads)].flatMap(flat), key, gradeKey, bytes: projectBytes(project) };
  } catch { return null; }
}

export function programmingProjectMatches(a: unknown, b: unknown) {
  const current = parseProgrammingProject(a), saved = parseProgrammingProject(b);
  return !!current && !!saved && current.key === saved.key;
}

const BLOCK_CATEGORY: Readonly<Record<string, string>> = Object.fromEntries(
  ENTRY_PALETTE.flatMap((group) => group.blocks.map((block) => [block, group.category])),
);
export const entryBlockCategory = (type: string): string => BLOCK_CATEGORY[type] ?? (VALUE_BLOCKS.has(type) ? "calc" : "flow");

const DROPDOWN_LABELS: Readonly<Record<string, string>> = {
  color: "색깔", brightness: "밝기", transparency: "투명도",
  WIDTH: "가로", HEIGHT: "세로", width: "가로", height: "세로",
  speak: "말하기", think: "생각하기",
  START: "시작", STOP: "정지", RESET: "초기화", SHOW: "보이기", HIDE: "숨기기",
  self: "자신", entrybot: "강아지", mouse: "마우스 포인터", wall: "벽", edge: "화면 끝", all: "모든 코드",
  thisThread: "이 코드", thisOnly: "이 오브젝트의 다른 코드", otherThread: "다른 오브젝트의 코드",
  FRONT: "맨 앞", FORWARD: "앞으로", BACKWARD: "뒤로", BACK: "맨 뒤",
  QUOTIENT: "몫", MOD: "나머지",
  square: "제곱", root: "제곱근", sin: "사인", cos: "코사인", tan: "탄젠트", abs: "절댓값", floor: "버림", ceil: "올림", round: "반올림",
  toUpperCase: "대문자", toLowerCase: "소문자", toUpper: "대문자", toLower: "소문자",
  YEAR: "연도", MONTH: "월", DAY: "일", HOUR: "시", MINUTE: "분", SECOND: "초",
  number: "숫자", string: "문자", en: "영문", ko: "한글",
};
const KEY_LABELS: Readonly<Record<string, string>> = { "37": "왼쪽", "38": "위쪽", "39": "오른쪽", "40": "아래쪽", "32": "스페이스", "13": "엔터" };
const COMPARE_LABELS: Readonly<Record<string, string>> = {
  EQUAL: "=", NOT_EQUAL: "≠", GREATER: ">", LESS: "<", SMALLER: "<", GREATER_OR_EQUAL: "≥", LESS_OR_EQUAL: "≤", SMALLER_OR_EQUAL: "≤",
};
const REPORTER_BLOCKS: ReadonlySet<string> = new Set([
  ...VALUE_BLOCKS,
  ...ENTRY_PALETTE.find((g) => g.category === "judgement")!.blocks,
  ...ENTRY_PALETTE.find((g) => g.category === "calc")!.blocks.filter((b) => !["choose_project_timer_action", "set_visible_project_timer"].includes(b)),
  "get_canvas_input_value", "get_variable",
]);

const variableName = (id: string) => id === COUNTER.id ? COUNTER.name : id.replace("cs-", "변수 ");

export function formatEntryNode(node: EntryNode): string {
  const keyName = (v: unknown) => v === null || v === undefined ? "( )" : KEY_LABELS[String(v)] ?? `${v}번`;
  const val = (n: EntryNode, index: number): string => {
    const v = n.params[index];
    if (v === null || v === undefined) return "( )";
    if (object(v) && typeof v.type === "string") return expression(v as EntryNode);
    const s = String(v);
    if (s.startsWith("cs-")) return variableName(s);
    return DROPDOWN_LABELS[s] ?? s;
  };
  const expression = (n: EntryNode): string => {
    if (n.type === "get_canvas_input_value") return "대답";
    if (n.type === "get_variable") return n.params[0] ? variableName(String(n.params[0])) : "변수 값";
    // Shape ids end in -pic (1st), -pic2, -pic3, …
    if (n.type === "get_pictures") return n.params[0] ? `${Number(/-pic(\d*)$/.exec(String(n.params[0]))?.[1] || 1)}번` : "( )";
    if (n.type === "combine_something") return `${val(n, 1)} + ${val(n, 3)}`;
    if (n.type === "calc_basic") return `(${val(n, 0)} ${({ PLUS: "+", MINUS: "−", MULTI: "×", DIVIDE: "÷" })[n.params[1] as "PLUS"] ?? val(n, 1)} ${val(n, 2)})`;
    if (["text", "number", "angle", "color"].includes(n.type)) return String(n.params[0]);
    if (n.type === "True") return "참";
    if (n.type === "False") return "거짓";
    if (n.type === "boolean_basic_operator") return `(${val(n, 0)} ${COMPARE_LABELS[String(n.params[1])] ?? val(n, 1)} ${val(n, 2)})`;
    if (n.type === "boolean_and_or") return `(${val(n, 0)} ${n.params[1] === "OR" ? "또는" : "그리고"} ${val(n, 2)})`;
    if (n.type === "boolean_not") return `${val(n, 1)}(이)가 아니다`;
    if (n.type === "is_press_some_key") return `${keyName(n.params[0])} 키가 눌러져 있는가?`;
    if (n.type === "reach_something") return `${val(n, 1)}에 닿았는가?`;
    if (n.type === "is_type") return `${val(n, 0)}이(가) ${val(n, 2)}인가?`;
    if (n.type === "calc_rand") return `${val(n, 1)}부터 ${val(n, 3)} 사이의 무작위 수`;
    if (n.type === "coordinate_mouse") return `마우스 ${val(n, 1)} 좌표`;
    if (n.type === "coordinate_object") return n.params[1] ? `${val(n, 1)}의 ${val(n, 3)}` : "오브젝트의 좌표·값";
    if (n.type === "quotient_and_mod") return `${val(n, 1)} / ${val(n, 3)}의 ${val(n, 5)}`;
    if (n.type === "calc_operation") return `${val(n, 1)}의 ${val(n, 3)}`;
    if (n.type === "get_date") return `현재 ${val(n, 1)}`;
    if (n.type === "distance_something") return `${val(n, 1)}까지의 거리`;
    if (n.type === "length_of_string") return `${val(n, 1)}의 글자 수`;
    if (n.type === "count_match_string") return `${val(n, 0)}에서 ${val(n, 2)}의 개수`;
    if (n.type === "char_at") return `${val(n, 1)}의 ${val(n, 3)}번째 글자`;
    if (n.type === "substring") return `${val(n, 1)}의 ${val(n, 3)}~${val(n, 5)}번째 글자`;
    if (n.type === "index_of_string") return `${val(n, 1)}에서 ${val(n, 3)}의 위치`;
    if (n.type === "replace_string") return `${val(n, 1)}의 ${val(n, 3)}을(를) ${val(n, 5)}(으)로 바꾸기`;
    if (n.type === "reverse_of_string") return `${val(n, 1)} 뒤집기`;
    if (n.type === "change_string_case") return `${val(n, 1)}의 ${val(n, 3)} 바꾸기`;
    return blockLabel(n.type);
  };
  const line = (n: EntryNode): string => {
    if (n.type === "when_run_button_click") return "시작하기 버튼을 클릭했을 때";
    if (n.type === "when_some_key_pressed") return `${keyName(n.params[1])} 키를 눌렀을 때`;
    if (n.type === "ask_and_wait") return `${expression(n.params[0] as EntryNode)} · 묻고 대답 기다리기`;
    if (n.type === "set_variable") return `${variableName(String(n.params[0]))}에 ${expression(n.params[1] as EntryNode)} 저장하기`;
    if (n.type === "change_to_next_shape") return n.params[0] === "prev" ? "이전 모양으로 바꾸기" : "다음 모양으로 바꾸기";
    if (n.type === "change_to_some_shape") return `${val(n, 0)} 모양으로 바꾸기`;
    if (n.type === "dialog_time") return `${expression(n.params[0] as EntryNode)} · ${expression(n.params[1] as EntryNode)}초 동안 ${n.params[2] === "speak" ? "말하기" : "생각하기"}`;
    if (n.type === "direction_absolute") return `이동 방향을 ${expression(n.params[0] as EntryNode)}°로 정하기`;
    if (n.type === "move_direction") return `이동 방향으로 ${expression(n.params[0] as EntryNode)}만큼 움직이기`;
    if (REPORTER_BLOCKS.has(n.type)) return `${expression(n)} · 아직 연결하지 않은 블록`;
    if (n.type === "repeat_while_true") return `${val(n, 0)}${n.params[1] === "while" ? "인 동안" : "이(가) 될 때까지"} 반복하기`;
    if (n.type === "stop_object") return n.params[0] ? `${val(n, 0)} 멈추기` : "코드 멈추기";
    if (n.type === "create_clone") return n.params[0] && n.params[0] !== "self" ? `${val(n, 0)}의 복제본 만들기` : "복제본 만들기";
    if (n.type === "move_xy_time") return `${val(n, 0)}초 동안 x: ${val(n, 1)} y: ${val(n, 2)}만큼 움직이기`;
    if (n.type === "locate_xy") return `x: ${val(n, 0)} y: ${val(n, 1)} 위치로 이동하기`;
    if (n.type === "locate_xy_time") return `${val(n, 0)}초 동안 x: ${val(n, 1)} y: ${val(n, 2)} 위치로 이동하기`;
    if (n.type === "locate") return `${val(n, 0)} 위치로 이동하기`;
    if (n.type === "locate_object_time") return `${val(n, 0)}초 동안 ${val(n, 1)} 위치로 이동하기`;
    if (n.type === "rotate_by_time") return `${val(n, 0)}초 동안 방향을 ${val(n, 1)}만큼 회전하기`;
    if (n.type === "direction_relative_duration") return `${val(n, 0)}초 동안 이동 방향을 ${val(n, 1)}만큼 회전하기`;
    if (n.type === "see_angle_object") return `${val(n, 0)} 쪽 바라보기`;
    if (n.type === "move_to_angle") return `${val(n, 0)} 방향으로 ${val(n, 1)}만큼 움직이기`;
    if (n.type === "dialog") return `${val(n, 0)}을(를) ${n.params[1] === "think" ? "생각하기" : "말하기"}`;
    if (n.type === "add_effect_amount") return `${val(n, 0)} 효과를 ${val(n, 1)}만큼 주기`;
    if (n.type === "change_effect_amount") return `${val(n, 0)} 효과를 ${val(n, 1)}(으)로 정하기`;
    if (n.type === "stretch_scale_size") return `${val(n, 0)} 크기를 ${val(n, 1)}만큼 늘이기`;
    if (n.type === "change_object_index") return n.params[0] ? `${val(n, 0)} 보내기` : "앞뒤 순서 바꾸기";
    if (n.type === "set_color") return n.params[0] !== null && n.params[0] !== undefined ? `그리기 색을 ${val(n, 0)}(으)로 정하기` : "그리기 색 정하기";
    if (n.type === "set_fill_color") return n.params[0] !== null && n.params[0] !== undefined ? `채우기 색을 ${val(n, 0)}(으)로 정하기` : "채우기 색 정하기";
    if (n.type === "change_variable") return `${n.params[0] ? val(n, 0) : "변수"}에 ${val(n, 1)}만큼 더하기`;
    if (n.type === "show_variable") return `${n.params[0] ? val(n, 0) : "변수"} 보이기`;
    if (n.type === "hide_variable") return `${n.params[0] ? val(n, 0) : "변수"} 숨기기`;
    if (n.type === "choose_project_timer_action" || n.type === "set_visible_project_timer") return n.params[1] ? `초시계 ${val(n, 1)}` : blockLabel(n.type);
    if (n.type === "set_visible_answer") return n.params[0] ? `대답 ${val(n, 0)}` : blockLabel(n.type);
    const label = blockLabel(n.type);
    return label.includes("( )") ? label.replace("( )", val(n, 0)) : label;
  };
  try { return line(node); } catch { return "읽지 못한 블록"; }
}

export function programmingProjectLines(raw: unknown): string[] {
  // Inner blocks of repeat/if are listed under their block with └.
  const lines = (thread: EntryNode[], depth: number): string[] => thread.flatMap((n) => [
    `${depth ? `${"  ".repeat(depth - 1)}└ ` : ""}${formatEntryNode(n)}`,
    ...(n.statements ?? []).flatMap((inner, i) => [...(i ? [`${"  ".repeat(depth)}아니면`] : []), ...lines(inner, depth + 1)]),
  ]);
  const parsed = parseProgrammingProject(raw);
  if (!parsed) return ["작품을 읽지 못했어요. 저장된 원문은 보존돼요."];
  // The dog's code comes first; added objects follow with their names.
  return [...parsed.threads.flatMap((thread) => lines(thread, 0)), ...parsed.added.flatMap((o) => {
    const code = o.threads.flatMap((thread) => lines(thread, 0));
    return code.length ? code.map((text) => `[${o.name}] ${text}`) : [`[${o.name}] 코드 없음`];
  })];
}

// Blocks students often reach for instead of the mission block.
const SIMILAR_BLOCKS: Record<string, string> = { dialog: "dialog_time", move_x: "move_direction", rotate_absolute: "direction_absolute" };

// Graded lines start with a signal this mission's interpreter runs. Loose blocks
// and other event lines stay in the work but are not graded.
// Events an object mission's grader fires on every object.
const OBJECT_EVENTS = ["when_run_button_click", "mouse_clicked", "when_object_click"];

export function missionBlockIssue(id: string, raw: unknown): string | null {
  const p = parseProgrammingProject(raw), allowed = MISSION_BLOCKS[id], mission = missionById(id);
  if (!p || !allowed) return null;
  const starts = (t: EntryNode[]) => t[0]?.type === "when_run_button_click" || (!!mission?.keyEvents && t[0]?.type === "when_some_key_pressed" && ["37", "38", "39", "40"].includes(String(t[0].params[1])));
  // Dog-free projects grade the start line of whichever object owns it, so it must be one object.
  const owners = p.free && !mission?.objects ? p.added.filter((o) => o.threads.some(starts)) : [];
  if (owners.length > 1) return `시작하기 코드가 ${owners.slice(0, 3).map((o) => `‘${o.name}’`).join(", ")}에 나뉘어 있어요. 이번 미션의 시작하기 코드는 한 오브젝트에만 두세요.`;
  const graded = mission?.objects
    ? [...p.threads, ...p.added.flatMap((o) => o.threads)].filter((t) => OBJECT_EVENTS.includes(t[0]?.type))
    : (p.free ? p.added.flatMap((o) => o.threads) : p.threads).filter(starts);
  const outside = (n: EntryNode): string | undefined => allowed.has(n.type) ? [...n.params.filter((v): v is EntryNode => object(v) && typeof v.type === "string"), ...(n.statements ?? []).flat()].map(outside).find(Boolean) : n.type;
  const type = graded.flat().map(outside).find(Boolean);
  if (type) {
    const instead = SIMILAR_BLOCKS[type];
    return instead && allowed.has(instead) ? `이번 미션은 ‘${blockLabel(type)}’ 대신 ‘${blockLabel(instead)}’ 블록으로 확인해요. 바꿔서 다시 검증해 주세요.` : `이번 미션은 기본 블록으로 확인해요. ‘${blockLabel(type)}’ 블록을 빼고 다시 검증해 주세요.`;
  }
  const elsewhere = !p.free && !mission?.objects && !graded.length && p.added.find((o) => o.threads.some((t) => t[0]?.type === "when_run_button_click"));
  return elsewhere ? `강아지가 아니라 ‘${elsewhere.name}’에 시작하기 줄이 있어요. 오브젝트 목록에서 강아지를 고른 뒤 코드를 만들어 주세요.` : null;
}
