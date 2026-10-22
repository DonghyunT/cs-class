// The programming lesson's EntryJS palette. public/entryjs/workspace.js keeps a
// copy because the sandboxed iframe cannot import this module; a logic test keeps
// both lists equal. Labels follow EntryJS 4.0.23 ko.js wording with ( ) for inputs.
import library from "./entry-library.json";
export const ENTRY_PALETTE = [
  { category: "start", blocks: ["when_run_button_click", "when_some_key_pressed", "mouse_clicked", "mouse_click_cancled", "when_object_click", "when_object_click_canceled"] },
  { category: "flow", blocks: ["wait_second", "repeat_basic", "repeat_inf", "repeat_while_true", "stop_repeat", "continue_repeat", "_if", "if_else", "wait_until_true", "stop_object", "restart_project", "when_clone_start", "create_clone", "delete_clone", "remove_all_clones"] },
  { category: "moving", blocks: ["move_direction", "bounce_wall", "move_x", "move_y", "move_xy_time", "locate_x", "locate_y", "locate_xy", "locate_xy_time", "locate", "locate_object_time", "rotate_relative", "direction_relative", "rotate_by_time", "direction_relative_duration", "rotate_absolute", "direction_absolute", "see_angle_object", "move_to_angle"] },
  { category: "looks", blocks: ["show", "hide", "change_to_some_shape", "change_to_next_shape", "dialog_time", "dialog", "remove_dialog", "add_effect_amount", "change_effect_amount", "erase_all_effects", "change_scale_size", "set_scale_size", "stretch_scale_size", "reset_scale_size", "flip_x", "flip_y", "change_object_index"] },
  { category: "brush", blocks: ["brush_stamp", "start_drawing", "stop_drawing", "set_color", "change_thickness", "set_thickness", "start_fill", "stop_fill", "set_fill_color", "set_random_color", "change_brush_transparency", "set_brush_tranparency", "brush_erase_all"] },
  { category: "judgement", blocks: ["is_clicked", "is_object_clicked", "is_press_some_key", "reach_something", "is_type", "boolean_basic_operator", "boolean_and_or", "boolean_not"] },
  { category: "calc", blocks: ["calc_basic", "calc_rand", "coordinate_mouse", "coordinate_object", "quotient_and_mod", "calc_operation", "get_project_timer_value", "choose_project_timer_action", "set_visible_project_timer", "get_date", "distance_something", "length_of_string", "count_match_string", "combine_something", "char_at", "substring", "index_of_string", "replace_string", "reverse_of_string", "change_string_case"] },
  { category: "variable", blocks: ["ask_and_wait", "get_canvas_input_value", "set_visible_answer", "get_variable", "change_variable", "set_variable", "show_variable", "hide_variable"] },
] as const;

export const PALETTE_BLOCKS: ReadonlySet<string> = new Set(ENTRY_PALETTE.flatMap((group) => group.blocks));
// Literal inputs EntryJS nests inside other blocks.
// `get_pictures` is the shape dropdown inside ‘( ) 모양으로 바꾸기’.
export const VALUE_BLOCKS: ReadonlySet<string> = new Set(["text", "number", "angle", "True", "False", "color", "get_pictures"]);
// Blocks with inner block lists, and how many lists EntryJS exports for each.
export const CONTAINER_BLOCKS: Readonly<Record<string, number>> = { repeat_basic: 1, repeat_inf: 1, repeat_while_true: 1, _if: 1, if_else: 2 };

const START = ["when_run_button_click", "text", "number"];
// Blocks that run in Entry without changing what any mission grades (waits, bubbles, looks,
// brush colours). Every mission accepts them and the interpreter skips them.
export const HARMLESS_BLOCKS: ReadonlySet<string> = new Set(["wait_second", "remove_dialog", "show", "hide", "set_visible_answer", "show_variable", "hide_variable", "set_color", "change_thickness", "set_thickness", "set_random_color", "set_fill_color", "start_fill", "stop_fill", "change_brush_transparency", "set_brush_tranparency", "brush_stamp", "add_effect_amount", "change_effect_amount", "erase_all_effects", "change_scale_size", "set_scale_size", "stretch_scale_size", "reset_scale_size", "flip_x", "flip_y", "change_object_index", "color"]);
// Both speech blocks have a 말하기/생각하기 choice; only 말하기 counts as saying.
const SAY = ["dialog_time", "dialog"];
export const THINKING_MESSAGE = "말풍선이 ‘생각하기’로 되어 있어요. 말하기 블록에서 ‘생각하기’를 ‘말하기’로 바꿔 주세요.";
const NAME = [...START, "ask_and_wait", ...SAY, "get_canvas_input_value", "combine_something"];
const VARIABLES = ["set_variable", "get_variable"];
// Relative moves only: the interpreter starts every run at (0, 0), so an absolute move
// (‘x: ( ) 위치로 이동하기’) would pass ‘move right 10’ without moving.
const MOVE = [...START, "move_direction", "move_x", "move_y", "move_xy_time", "move_to_angle", "direction_absolute", "angle"];
const PEN = [...MOVE, ...SAY, "start_drawing", "stop_drawing", "repeat_basic", "direction_relative", "rotate_relative", "rotate_by_time", "direction_relative_duration", "locate_xy", "locate_xy_time", "brush_erase_all"];
const CHOICE = [...NAME, ...VARIABLES, "_if", "if_else", "boolean_basic_operator", "boolean_and_or", "boolean_not", "True", "False", "calc_basic", "quotient_and_mod"];
const mission = (blocks: string[]) => new Set([...blocks, ...HARMLESS_BLOCKS]);
// Same-meaning moves and timed turns the interpreter also accepts. The block list shown to
// students leaves them out (with the harmless set) so it keeps the blocks the mission is about.
const ALSO_ACCEPTED: ReadonlySet<string> = new Set(["move_x", "move_y", "move_xy_time", "move_to_angle", "locate_xy_time", "rotate_by_time", "direction_relative_duration"]);
// The blocks each mission's server interpreter understands. Other palette blocks
// are saved and shown, but a graded line that uses them is not validated.
// Move, keys and square never ask: asking switches the run report to speech.
export const MISSION_BLOCKS: Readonly<Record<string, ReadonlySet<string>>> = {
  name: mission(NAME),
  multiply: mission([...NAME, ...VARIABLES, "calc_basic"]),
  average: mission([...NAME, ...VARIABLES, "calc_basic"]),
  move: mission(MOVE),
  keys: mission([...MOVE, "when_some_key_pressed"]),
  pass: mission(CHOICE),
  freethrow: mission(CHOICE),
  escape: mission(CHOICE),
  square: mission(PEN),
  polygon: mission([...PEN, ...VARIABLES, "ask_and_wait", "get_canvas_input_value", "calc_basic"]),
  safe: mission([...CHOICE, "repeat_while_true", "repeat_inf", "stop_repeat"]),
  tree: mission(["when_run_button_click", "mouse_clicked", "when_object_click", "text", "number", "True", "False", "change_variable", ...VARIABLES, "_if", "if_else", "boolean_basic_operator", "boolean_and_or", "calc_basic", "change_to_next_shape", "change_to_some_shape", "get_pictures", ...SAY, "repeat_inf", "locate", "is_clicked"]),
};

export const BLOCK_LABELS: Readonly<Record<string, string>> = {
  when_run_button_click: "시작하기 버튼을 클릭했을 때", when_some_key_pressed: "키를 눌렀을 때", mouse_clicked: "마우스를 클릭했을 때", mouse_click_cancled: "마우스 클릭을 해제했을 때", when_object_click: "오브젝트를 클릭했을 때", when_object_click_canceled: "오브젝트 클릭을 해제했을 때",
  wait_second: "( )초 기다리기", repeat_basic: "( )번 반복하기", repeat_inf: "계속 반복하기", repeat_while_true: "( )이(가) 될 때까지 반복하기", stop_repeat: "반복 중단하기", continue_repeat: "이번 반복 건너뛰기", _if: "만일 ( )(이)라면", if_else: "만일 ( )(이)라면 / 아니면", wait_until_true: "( )이(가) 될 때까지 기다리기", stop_object: "코드 멈추기", restart_project: "처음부터 다시 실행하기", when_clone_start: "복제본이 처음 생성되었을 때", create_clone: "복제본 만들기", delete_clone: "이 복제본 삭제하기", remove_all_clones: "모든 복제본 삭제하기",
  move_direction: "이동 방향으로 ( )만큼 움직이기", bounce_wall: "화면 끝에 닿으면 튕기기", move_x: "x 좌표를 ( )만큼 바꾸기", move_y: "y 좌표를 ( )만큼 바꾸기", move_xy_time: "( )초 동안 x·y만큼 움직이기", locate_x: "x: ( ) 위치로 이동하기", locate_y: "y: ( ) 위치로 이동하기", locate_xy: "x·y 위치로 이동하기", locate_xy_time: "( )초 동안 x·y 위치로 이동하기", locate: "( ) 위치로 이동하기", locate_object_time: "( )초 동안 ( ) 위치로 이동하기", rotate_relative: "방향을 ( )만큼 회전하기", direction_relative: "이동 방향을 ( )만큼 회전하기", rotate_by_time: "( )초 동안 방향을 회전하기", direction_relative_duration: "( )초 동안 이동 방향 회전하기", rotate_absolute: "방향을 ( )(으)로 정하기", direction_absolute: "이동 방향을 ( )(으)로 정하기", see_angle_object: "( ) 쪽 바라보기", move_to_angle: "( ) 방향으로 ( )만큼 움직이기",
  show: "모양 보이기", hide: "모양 숨기기", change_to_some_shape: "( ) 모양으로 바꾸기", change_to_next_shape: "다음 모양으로 바꾸기", dialog_time: "( )을(를) ( )초 동안 말하기", dialog: "( )을(를) 말하기", remove_dialog: "말풍선 지우기", add_effect_amount: "효과를 ( )만큼 주기", change_effect_amount: "효과를 ( )(으)로 정하기", erase_all_effects: "효과 모두 지우기", change_scale_size: "크기를 ( )만큼 바꾸기", set_scale_size: "크기를 ( )(으)로 정하기", stretch_scale_size: "크기를 ( )만큼 늘이기", reset_scale_size: "원래 크기로 되돌리기", flip_x: "상하 모양 뒤집기", flip_y: "좌우 모양 뒤집기", change_object_index: "앞뒤 순서 바꾸기",
  brush_stamp: "도장 찍기", start_drawing: "그리기 시작하기", stop_drawing: "그리기 멈추기", set_color: "그리기 색 정하기", change_thickness: "그리기 굵기를 ( )만큼 바꾸기", set_thickness: "그리기 굵기를 ( )(으)로 정하기", start_fill: "채우기 시작하기", stop_fill: "채우기 멈추기", set_fill_color: "채우기 색 정하기", set_random_color: "붓의 색을 무작위로 정하기", change_brush_transparency: "붓의 투명도를 ( )%만큼 바꾸기", set_brush_tranparency: "붓의 투명도를 ( )%로 정하기", brush_erase_all: "모든 붓 지우기",
  is_clicked: "마우스를 클릭했는가?", is_object_clicked: "오브젝트를 클릭했는가?", is_press_some_key: "키가 눌러져 있는가?", reach_something: "( )에 닿았는가?", is_type: "( )이(가) ( )인가?", boolean_basic_operator: "( ) 비교 ( )", boolean_and_or: "( ) 그리고/또는 ( )", boolean_not: "( )(이)가 아니다",
  calc_basic: "( ) 사칙연산 ( )", calc_rand: "( )부터 ( ) 사이의 무작위 수", coordinate_mouse: "마우스 좌표", coordinate_object: "오브젝트의 좌표·값", quotient_and_mod: "( ) / ( )의 몫·나머지", calc_operation: "( )의 수학 연산", get_project_timer_value: "초시계 값", choose_project_timer_action: "초시계 시작·정지·초기화", set_visible_project_timer: "초시계 보이기·숨기기", get_date: "현재 날짜·시간", distance_something: "( )까지의 거리", length_of_string: "( )의 글자 수", count_match_string: "( )에서 ( )의 개수", combine_something: "( )와(과) ( )를 합치기", char_at: "( )의 ( )번째 글자", substring: "( )의 ( )~( )번째 글자", index_of_string: "( )에서 ( )의 위치", replace_string: "( )의 ( )을(를) ( )(으)로 바꾸기", reverse_of_string: "( ) 뒤집기", change_string_case: "( )의 대소문자 바꾸기",
  ask_and_wait: "( )을(를) 묻고 대답 기다리기", get_canvas_input_value: "대답", set_visible_answer: "대답 보이기·숨기기", get_variable: "변수 값", change_variable: "변수에 ( )만큼 더하기", set_variable: "변수를 ( )(으)로 정하기", show_variable: "변수 보이기", hide_variable: "변수 숨기기",
  text: "글자", number: "숫자", angle: "각도", True: "참", False: "거짓", color: "색", get_pictures: "모양",
};

// Sprites students can add as objects. Saved objects must use one of these files.
export const ENTRY_SPRITES = [
  { id: "ball", name: "공", file: "/entryjs/sprites/ball.svg", width: 120, height: 120 },
  { id: "star", name: "별", file: "/entryjs/sprites/star.svg", width: 120, height: 120 },
  { id: "heart", name: "하트", file: "/entryjs/sprites/heart.svg", width: 120, height: 110 },
  { id: "apple", name: "사과", file: "/entryjs/sprites/apple.svg", width: 110, height: 120 },
  { id: "cloud", name: "구름", file: "/entryjs/sprites/cloud.svg", width: 150, height: 96 },
  { id: "rock", name: "돌", file: "/entryjs/sprites/rock.svg", width: 130, height: 96 },
  { id: "flag", name: "깃발", file: "/entryjs/sprites/flag.svg", width: 100, height: 130 },
  { id: "tree", name: "나무", file: "/entryjs/sprites/tree.svg", width: 120, height: 140 },
] as const;
// Sprites with several shapes that a lesson's starter project places. They are
// not in the picker. Pictures are from the official Entry material 「클릭! 나무 키우기」
// (NAVER Connect Foundation, free for education with attribution).
export const LESSON_SPRITES = [
  { id: "tree-growth", name: "나무 키우기", file: "/entryjs/sprites/tree-1.svg", width: 220, height: 240,
    pictures: [1, 2, 3, 4, 5, 6].map((n) => ({ file: `/entryjs/sprites/tree-${n}.svg`, width: 220, height: 240 })) },
  { id: "watering-can", name: "물뿌리개", file: "/entryjs/sprites/watering-can-1.png", width: 377, height: 253,
    pictures: [{ file: "/entryjs/sprites/watering-can-1.png", width: 377, height: 253 }, { file: "/entryjs/sprites/watering-can-2.png", width: 275, height: 242 }] },
  { id: "soil", name: "흙", file: "/entryjs/sprites/soil.png", width: 960, height: 540 },
] as const;
export type EntrySprite = { id: string; name: string; file: string; width: number; height: number; pictures?: readonly { file: string; width: number; height: number }[] };
// Official Entry objects bundled by scripts/fetch-entry-library.mjs for the dog-free lessons
// (NAVER Connect Foundation, free for education with attribution).
export const LIBRARY_CATEGORIES = [
  ["entrybot", "엔트리봇"], ["people", "사람"], ["animal", "동물"], ["plant", "식물"], ["vehicle", "탈것"], ["building", "건물"],
  ["food", "음식"], ["environment", "환경"], ["thing", "물건"], ["fantasy", "판타지"], ["interface", "인터페이스"], ["background", "배경"],
] as const;
export type LibrarySprite = EntrySprite & { category: (typeof LIBRARY_CATEGORIES)[number][0]; thumb: string };
export const LIBRARY_SPRITES: readonly LibrarySprite[] = (library as Omit<LibrarySprite, "file" | "width" | "height">[]).map((s) => ({ ...s, ...s.pictures![0] }));
// The dog-free lessons' starting object: the classic walking Entrybot.
export const ENTRYBOT_SPRITE = "e557fe88b77e7209c34993968";
// Every sprite a saved object may use, picker or lesson.
export const TRUSTED_SPRITES: readonly EntrySprite[] = [...ENTRY_SPRITES, ...LESSON_SPRITES, ...LIBRARY_SPRITES];
export const spritePictures = (sprite: EntrySprite) => sprite.pictures ?? [{ file: sprite.file, width: sprite.width, height: sprite.height }];
export const MAX_ADDED_OBJECTS = 5;
// Dog-free projects: every object is equal, up to this many.
export const MAX_FREE_OBJECTS = 12;

export const blockLabel = (type: string) => BLOCK_LABELS[type] ?? "기타 블록";
// Mission blocks shown to students; literal inputs are left out.
export const missionBlockLabels = (id: string) => [...(MISSION_BLOCKS[id] ?? [])].filter((type) => !VALUE_BLOCKS.has(type)).map(blockLabel);
