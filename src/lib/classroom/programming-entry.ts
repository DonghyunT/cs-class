import { buildNameProject } from "./name-entry";
import { CONTAINER_BLOCKS, ENTRYBOT_SPRITE, ENTRY_PALETTE, ENTRY_SPRITES, LIBRARY_SPRITES, MAX_ADDED_OBJECTS, MAX_FREE_OBJECTS, MISSION_BLOCKS, PALETTE_BLOCKS, TRUSTED_SPRITES, VALUE_BLOCKS, blockLabel, spritePictures } from "./entry-palette";

// `variables` shows A·B on the stage; `keyEvents` keeps the run waiting for arrow keys.
// `objects` missions grade every object's event code instead of only the dog's.
// `hint` is the summary line, `steps` the folded assembly order and `tip` one 💡 reason. They write
// block chips as `type: text` (the Entry block type and the filled-in block a student builds);
// read them with `hintParts`/`hintPlain`. `failure` is the grader's plain failure message.
export type ProgrammingMission = { id: string; title: string; goal: string; hint: string; steps: readonly string[]; tip?: string; failure: string; experiment: string; optional?: true; variables?: true; keyEvents?: true; objects?: true };

// Every mission across lessons, keyed by an id no other lesson reuses. Grading and
// saved records look missions up here; lessons list theirs in LESSON_MISSIONS.
export const PROGRAMMING_MISSIONS: readonly ProgrammingMission[] = [
  { id: "name", title: "강아지 이름 짓기", goal: "이름을 묻고, 입력한 이름을 말하게 해주세요.", hint: "묻기·대답은 ‘자료’, 말하기는 ‘생김새’ 꾸러미에 있어요.", steps: ["시작하기 아래에 `ask_and_wait: 이름을 묻고 대답 기다리기`", "그 아래에 `dialog: 대답을 말하기`"], tip: "‘대답’에는 방금 입력한 이름이 들어 있어요.", failure: "질문 다음에 말하기를 연결하고, 말하기 안에 ‘대답’을 넣어 보세요.", experiment: "초코와 보리처럼 서로 다른 이름으로 두 번 실행해 보세요." },
  { id: "multiply", title: "곱셈 계산기", goal: "두 수를 A와 B에 기억하고, 두 수의 곱을 말하게 해주세요.", hint: "묻기·변수는 ‘자료’, 곱하기는 ‘계산’ 꾸러미에 있어요.", steps: ["첫 번째 수 묻기 → `set_variable: A를 대답으로 정하기`", "두 번째 수 묻기 → `set_variable: B를 대답으로 정하기`(A▾를 B로)", "말하기 안에 `calc_basic: A 값 x B 값`"], tip: "다시 물으면 대답이 바뀌니, 묻자마자 저장해요.", failure: "첫 질문의 대답을 A에 저장한 뒤 두 번째 수를 물어보세요. B를 물으면 ‘대답’이 바뀌어요.", experiment: "6과 4, 3과 7을 입력해 보세요. 입력을 바꾸면 결과도 달라지나요?", variables: true },
  { id: "move", title: "시작 버튼으로 움직이기", goal: "시작하기 버튼을 누르면 강아지가 오른쪽으로 10만큼 움직이게 해주세요.", hint: "‘움직임’ 꾸러미에서 ‘방향을’ 말고 ‘이동 방향을’ 블록을 골라요.", steps: ["시작하기 아래에 `direction_absolute: 이동 방향을 90°로 정하기`", "그 아래에 `move_direction: 10만큼 움직이기`"], tip: "엔트리에서 90°는 오른쪽, 0°는 위쪽이에요.", failure: "시작하기 아래에 이동 블록을 연결해 보세요. 오른쪽 방향은 90°예요.", experiment: "실행 → 중지 → 다시 실행해 보세요. 시작 위치와 이동 결과를 비교해요." },
  { id: "keys", title: "방향키로 움직임 개선", goal: "네 방향키로 강아지를 각 방향으로 10만큼 움직이게 해주세요.", hint: "‘시작’ 꾸러미의 키 블록으로 방향키마다 한 줄씩 만들어요.", steps: ["`when_some_key_pressed: 위쪽 화살표 키를 눌렀을 때` 놓기", "그 아래에 `direction_absolute: 이동 방향을 0°로 정하기` → `move_direction: 10만큼 움직이기`", "같은 줄 3개 더: 오른쪽 키 90° · 아래쪽 키 180° · 왼쪽 키 270°"], tip: "키는 블록의 ▾를 눌러 바꿔요.", failure: "‘키를 눌렀을 때’ 아래에 방향을 정하고 움직여요. 위 0°·오른쪽 90°·아래 180°·왼쪽 270°예요.", experiment: "실행 후 무대를 클릭하고 네 방향키를 눌러 보세요.", keyEvents: true },
  // tests/fixtures/entry-legacy-keys.json pins the failure messages of name·multiply·average·move·keys; keep them byte-identical.
  { id: "average", title: "평균 계산기", goal: "두 수를 A와 B에 기억하고, 두 수의 평균 (A + B) ÷ 2를 말하게 해주세요.", hint: "곱셈 계산기처럼 먼저 저장하고, ‘계산’ 블록 두 개를 겹쳐요.", steps: ["`when_run_button_click: 시작하기 버튼을 클릭했을 때` → 첫 번째 수 묻기 → `set_variable: A를 대답으로 정하기`", "두 번째 수 묻기 → `set_variable: B를 대답으로 정하기`", "말하기 안에 `calc_basic: (A 값 + B 값) / 2`"], tip: "더하기 블록을 나누기 블록의 왼쪽 칸에 넣어야 먼저 더해요.", failure: "덧셈 블록을 나눗셈 블록 안에 넣어, 두 수를 먼저 더한 뒤 2로 나눠요.", experiment: "6과 4의 평균은 5예요. -2와 5를 넣으면 어떻게 될까요?", variables: true },
  { id: "pass", title: "시험 합격/불합격", goal: "점수를 묻고, 60점 이상이면 ‘합격’, 아니면 ‘불합격’을 말하게 해주세요.", hint: "만일 블록은 ‘흐름’, 비교 블록은 ‘판단’ 꾸러미에 있어요.", steps: ["`when_run_button_click: 시작하기 버튼을 클릭했을 때` → 점수 묻기 → `if_else: 만일 참(이)라면 아니면`", "조건 칸에 `boolean_basic_operator: 대답 ≥ 60`", "위 칸에 `dialog: 합격을 말하기`, 아래 칸에 `dialog: 불합격을 말하기`"], tip: "60점도 합격이니 ‘≥’(크거나 같다)를 골라요.", failure: "60에서 ‘합격’, 59에서 ‘불합격’이 나오는지 조건과 두 칸의 말을 확인해 보세요.", experiment: "59, 60, 100을 차례로 넣어 보세요. 60에서는 어떤 말이 나와야 할까요?" },
  { id: "freethrow", title: "자유투 평가", goal: "자유투 성공 개수를 묻고, 8개 이상이면 ‘훌륭해요!’, 5개 이상이면 ‘잘했어요!’, 그보다 적으면 ‘더 연습해 보자!’를 말하게 해주세요.", hint: "‘아니면’ 칸 안에 만일 블록을 하나 더 넣어 세 갈래를 만들어요.", steps: ["`when_run_button_click: 시작하기 버튼을 클릭했을 때` → 성공 개수 묻기 → `if_else: 만일 참(이)라면 아니면`", "조건 칸에 `boolean_basic_operator: 대답 ≥ 8`, 위 칸에 `dialog: 훌륭해요!를 말하기`", "아니면 칸에 같은 만일 블록, 조건은 `boolean_basic_operator: 대답 ≥ 5`", "안쪽 위 칸에 `dialog: 잘했어요!를 말하기`, 아래 칸에 `dialog: 더 연습해 보자!를 말하기`"], tip: "8부터 확인해야 9개가 ‘잘했어요!’로 빠지지 않아요.", failure: "8에서 ‘훌륭해요!’, 5에서 ‘잘했어요!’, 4에서 ‘더 연습해 보자!’가 나오는지 조건 순서와 말을 확인해 보세요.", experiment: "4, 5, 7, 8을 차례로 넣어 보세요. 5와 8은 기준과 같은 수예요. 어떤 말이 나와야 할까요?" },
  { id: "square", title: "정사각형 그리기", goal: "그리기를 시작한 뒤 ‘4번 반복하기’로 100만큼 움직이고 90°씩 회전해, 한 변이 100인 정사각형을 그려 주세요.", hint: "선은 ‘붓’, 반복은 ‘흐름’ 꾸러미에 있어요.", steps: ["`when_run_button_click: 시작하기 버튼을 클릭했을 때` → `start_drawing: 그리기 시작하기`", "`repeat_basic: 4번 반복하기` 안에 `move_direction: 100만큼 움직이기`, `direction_relative: 90° 회전하기`"], failure: "‘그리기 시작하기’ 뒤에, 반복 안에서 100만큼 움직이고 90°씩 도는지 확인해 보세요.", experiment: "반복 안에 ‘1초 기다리기’를 넣으면 그리는 과정을 천천히 볼 수 있어요." },
  { id: "polygon", title: "정다각형 그리기", goal: "변의 수를 묻고, 대답만큼 반복하며 360 ÷ 대답만큼 회전해 정다각형을 그려 주세요.", hint: "정사각형과 같은 틀에, 숫자 대신 ‘대답’과 계산을 넣어요.", steps: ["`when_run_button_click: 시작하기 버튼을 클릭했을 때` → 변의 수 묻기 → `start_drawing: 그리기 시작하기`", "`repeat_basic: 대답번 반복하기` 안에 `move_direction: 70만큼 움직이기`, `direction_relative: 90° 회전하기`", "90° 자리에 `calc_basic: 360 / 대답` 넣기", "반복 아래에 `stop_drawing: 그리기 멈추기` 먼저 놓기", "그다음 도형이 보이게 `locate_xy: x: -150 y: 0 위치로 이동하기`"], tip: "한 바퀴 360°를 변의 수로 나눈 만큼씩 돌아요.", failure: "반복 횟수에 ‘대답’, 회전 각도에 360 / 대답을 넣고, 이동은 ‘그리기 멈추기’ 뒤에 했는지 확인해 보세요.", experiment: "3, 5, 6을 넣어 정삼각형·정오각형·정육각형이 그려지는지 보세요. 도형이 무대 밖으로 나가면 변의 길이를 줄여 보세요." },
  { id: "tree", title: "나무 키우기", goal: "무대를 클릭할 때마다 ‘클릭 수’를 1씩 늘리고, 클릭 수가 5, 10, 15, 20, 25가 될 때마다 나무를 다음 모양으로 바꿔 주세요. 다 자라면 나무가 ‘성공~!’을 말해요.", hint: "코드는 ‘나무’에 만들어요. 오브젝트 목록에서 나무를 먼저 골라요.", steps: ["`mouse_clicked: 마우스를 클릭했을 때` → `change_variable: 클릭 수에 1만큼 더하기`(A▾를 ‘클릭 수’로)", "`_if: 만일 참(이)라면` 조건 칸에 `boolean_basic_operator: 클릭 수 값 = 5`", "만일 안에 `change_to_next_shape: 다음 모양으로 바꾸기`", "맨 아래 만일을 복제해 아래(바깥)에 붙이기를 4번, 5는 10·15·20·25로", "25일 때는 `dialog: 성공~!을 말하기`도 넣기"], tip: "복제하면 그 아래 블록까지 함께 복제돼요.", failure: "코드를 ‘나무’에 만들었는지, ‘클릭 수’를 골랐는지, 5·10·15·20·25에서 모양이 바뀌고 25에서 ‘성공~!’을 말하는지 확인해 보세요.", experiment: "4번·5번·6번째 클릭에서 나무 모양을 비교해 보세요. 25번 넘게 클릭해도 나무가 처음 모양으로 돌아가지 않는지도 보세요.", objects: true },
  { id: "safe", title: "도전 · 비밀번호 금고", goal: "대답이 1234가 될 때까지 비밀번호를 묻고, 맞히면 ‘금고가 열렸어요!’를 말하게 해주세요.", hint: "반복은 ‘흐름’, 비교는 ‘판단’ 꾸러미에 있어요.", steps: ["`when_run_button_click: 시작하기 버튼을 클릭했을 때` → `repeat_while_true: 참이 될 때까지 반복하기`", "조건 칸에 `boolean_basic_operator: 대답 = 1234`, 반복 안에 `ask_and_wait: 비밀번호를 묻고 대답 기다리기`", "반복 아래(바깥)에 `dialog: 금고가 열렸어요!를 말하기`"], tip: "묻기가 반복 안에 있어야 틀릴 때마다 다시 물어요.", failure: "묻기가 반복 안에, ‘금고가 열렸어요!’ 말하기가 반복 아래(바깥)에 있는지 확인해 보세요.", experiment: "틀린 번호를 몇 번 넣은 뒤 1234를 넣어 보세요. 질문이 몇 번 나왔나요?", optional: true },
  { id: "escape", title: "도전 · 방탈출", goal: "1번·2번 문제를 풀었으면 1, 못 풀었으면 0을 묻고 A·B에 저장한 뒤, 하나라도 풀었으면 ‘탈출 성공!’, 아니면 ‘탈출 실패’를 말하게 해주세요.", hint: "묻기·변수는 ‘자료’, 두 조건을 묶는 블록은 ‘판단’ 꾸러미에 있어요.", steps: ["`when_run_button_click: 시작하기 버튼을 클릭했을 때` → 1번 결과 묻기 → `set_variable: A를 대답으로 정하기`", "2번 결과 묻기 → `set_variable: B를 대답으로 정하기`", "`if_else: 만일 참(이)라면 아니면` 조건 칸에 ‘또는’ 블록 `boolean_and_or: 참 또는 거짓`", "‘또는’의 두 칸에 `boolean_basic_operator: A 값 = 1`, `boolean_basic_operator: B 값 = 1`", "위 칸에 `dialog: 탈출 성공!을 말하기`, 아래 칸에 `dialog: 탈출 실패를 말하기`"], tip: "‘또는’은 하나만 참이어도 참, ‘그리고’는 둘 다 참이어야 참이에요.", failure: "1과 0, 0과 1에서 ‘탈출 성공!’, 0과 0에서 ‘탈출 실패’가 나오는지 A·B 저장과 조건을 확인해 보세요.", experiment: "1과 0, 0과 1, 0과 0을 넣어 보세요. 여유가 있으면 1과 1에서 어떻게 될지 먼저 예상해 보세요.", optional: true, variables: true },
];

// A hint string split into plain text and `{ type, text }` block chips.
export type HintPart = string | { type: string; text: string };
const CHIP = /`([A-Za-z_]+): ([^`]+)`/;
export const hintParts = (text: string): HintPart[] => text.split(CHIP).flatMap<HintPart>((part, i, all) => i % 3 === 1 ? [{ type: part, text: all[i + 1] }] : i % 3 === 2 || !part ? [] : [part]);
export const hintPlain = (text: string) => text.replace(new RegExp(CHIP, "g"), "$2");

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
export const KEY_LABELS: Readonly<Record<string, string>> = { "37": "왼쪽", "38": "위쪽", "39": "오른쪽", "40": "아래쪽", "32": "스페이스", "13": "엔터" };
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
// Absolute moves and ‘방향을 정하기’ (the object's rotation) do not mean the same in Entry.
const SIMILAR_BLOCKS: Record<string, string> = { locate_x: "move_x", locate_y: "move_y", rotate_absolute: "direction_absolute" };

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
