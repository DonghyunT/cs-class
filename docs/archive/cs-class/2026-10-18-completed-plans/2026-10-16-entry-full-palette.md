# 엔트리 전체 블록 팔레트 계획

작성·점검: 2026-10-16 · 상태: 구현 완료·로컬 선별 검증 중(`codex/entry-full-palette`, 미푸시) · 대상 수업: `programming-13` 프로그래밍의 기초

**목표:** 학생이 엔트리 원본처럼 여러 카테고리의 블록을 자유롭게 쓰게 하되, 미션 채점은 지금처럼 서버가 결정적으로 판정합니다.
**접근(B):** 블록 목록을 두 겹으로 나눕니다. **수업 팔레트**에 있는 블록은 작업실 표시·저장·복원·교사 열람이 모두 됩니다. **미션 블록** 밖의 블록은 검증 단계에서만 "이 미션은 ○○ 블록으로 확인해요"라고 안내하고 통과시키지 않습니다. 새 의존성·클라이언트 채점·임의 코드 실행은 추가하지 않습니다.
**정책 근거:** [PRD](../../PRD.md), [DEVELOPMENT §4.1](../../DEVELOPMENT.md#entryjs-실습), [AGENTS](../../../AGENTS.md). 저장은 기존 `useWork` 수동 저장을 그대로 씁니다.

**사용자 결정(2026-10-16):** ① 추린 팔레트를 씁니다. 소리·글상자·신호·리스트·AI·확장·하드웨어는 보이지 않습니다. ② 시작 신호에 붙지 않은 블록 더미는 채점에서 무시하고 안내하지 않습니다.

## 0. 실측으로 확인한 사실(엔트리 4.0.23, 로컬 dev 서버)

구현 전제가 되는 동작을 실제 작업실에서 확인했습니다. 임시 확인 페이지는 Git 제외 `public/entryjs/vendor/` 아래에 두었다가 삭제했습니다.

1. **팔레트:** 아래 §1의 8개 카테고리, 104개 블록이 모두 `Entry.block`에 존재하고 블록 메뉴에 빠짐없이 표시됩니다.
2. **팔레트 적용 시점:** `EntryStatic.getAllBlocks`는 `Entry.init` **전에** 바꿔야 합니다. 초기화 뒤 바꾸고 `blockMenu.setMenu()`를 불러도 반영되지 않습니다. 미션 이동 시 iframe을 URL로 다시 만드는 현재 방식은 유지합니다.
3. **내보내기 형식:** 모든 블록이 `statements` 필드를 내보냅니다. 반복·조건이 아닌 블록은 `[]`, 반복·조건 블록은 팔레트에서 끌어오면 `[[]]`, `if_else`는 `[[], []]`입니다. 블록마다 `movable`·`deletable`·`emphasized`·`readOnly`·`copyable`·`assemble`·`extensions`가 붙습니다.
4. **원문 크기:** 블록 8개(값 블록 포함) 원문이 약 6KB입니다. 블록 하나에 약 600바이트이므로 현재 원문 상한 80,000자는 노드 상한 160보다 먼저 걸립니다.
5. **값 블록 타입:** `text`·`number`·`angle`·`True`·`False`·`color` 6가지입니다(`True`·`False`는 `params: [null]`, `color`는 `["#FF0000"]`). 값은 문자열이 기본이지만 숫자로 내보내지는 경우도 있습니다(`text` `[10]`).
6. **드롭다운 값:** 모두 문자열입니다. 예: 키 코드 `"81"`, 연산자 `PLUS`·`EQUAL`·`AND`, 대상 `entrybot`·`self`·`mouse`·`all`, 변수 `cs-A`, 기타 `until`·`speak`·`WIDTH`·`FRONT`·`x`·`QUOTIENT`·`square`·`START`·`HIDE`·`YEAR`·`toUpperCase`·`color`·`number`. 아직 고르지 않은 동적 드롭다운은 `null`입니다.
7. **실행 감시:** 기존 `workspace.js` 감시기에서 복제본 반복은 끝까지 실행되고 중지하면 복제본이 지워집니다. `기다리기` 뒤의 동작도 정상 종료(`finished`)되고, 붓 그리기도 정상 종료되며 중지 시 위치가 복원됩니다. 무한 반복은 기존 15초 제한(`timeout`)으로 멈춥니다.

## 1. 수업 팔레트(공유 목록 + 동기화 검사)

- [x] `src/lib/classroom/entry-palette.ts`에 아래 목록과 블록별 한국어 이름표를 둡니다. 이름표는 구현 시 `public/entryjs/vendor/entry/extern/lang/ko.js`의 `Lang.Blocks` 템플릿(예: `repeat_basic: '%1 번 반복하기 %2'`)에서 한 번 뽑아 `%n`을 정리한 뒤 상수로 넣습니다(실행 중 ko.js 의존 없음).

| 카테고리 | 블록 |
|---|---|
| `start` | `when_run_button_click` `when_some_key_pressed` `mouse_clicked` `mouse_click_cancled` `when_object_click` `when_object_click_canceled` |
| `flow` | `wait_second` `repeat_basic` `repeat_inf` `repeat_while_true` `stop_repeat` `continue_repeat` `_if` `if_else` `wait_until_true` `stop_object` `restart_project` `when_clone_start` `create_clone` `delete_clone` `remove_all_clones` |
| `moving` | `move_direction` `bounce_wall` `move_x` `move_y` `move_xy_time` `locate_x` `locate_y` `locate_xy` `locate_xy_time` `locate` `locate_object_time` `rotate_relative` `direction_relative` `rotate_by_time` `direction_relative_duration` `rotate_absolute` `direction_absolute` `see_angle_object` `move_to_angle` |
| `looks` | `show` `hide` `dialog_time` `dialog` `remove_dialog` `add_effect_amount` `change_effect_amount` `erase_all_effects` `change_scale_size` `set_scale_size` `stretch_scale_size` `reset_scale_size` `flip_x` `flip_y` `change_object_index` |
| `brush` | `brush_stamp` `start_drawing` `stop_drawing` `set_color` `change_thickness` `set_thickness` `start_fill` `stop_fill` `set_fill_color` `set_random_color` `change_brush_transparency` `set_brush_tranparency` `brush_erase_all` |
| `judgement` | `is_clicked` `is_object_clicked` `is_press_some_key` `reach_something` `is_type` `boolean_basic_operator` `boolean_and_or` `boolean_not` |
| `calc` | `calc_basic` `calc_rand` `coordinate_mouse` `coordinate_object` `quotient_and_mod` `calc_operation` `get_project_timer_value` `choose_project_timer_action` `set_visible_project_timer` `get_date` `distance_something` `length_of_string` `count_match_string` `combine_something` `char_at` `substring` `index_of_string` `replace_string` `reverse_of_string` `change_string_case` |
| `variable` | `ask_and_wait` `get_canvas_input_value` `set_visible_answer` `get_variable` `change_variable` `set_variable` `show_variable` `hide_variable` |

  - 제외 근거: 신호(`message_*`), 장면(`when_scene_start`·`start_scene` 등, 장면 1개), 모양 바꾸기(`change_to_some_shape`·`change_to_next_shape`, 모양 1개), 리스트·함수·변수 추가 버튼, 계정·강의 블록(`get_user_name`·`check_lecture_goal` 등), 소리, 글상자(`text_*`), 데이터 분석·AI·확장·하드웨어.
  - 반복·조건 블록(`CONTAINER_BLOCKS`): `repeat_basic` `repeat_inf` `repeat_while_true` `_if`(안쪽 1개), `if_else`(안쪽 2개).
  - 값 블록(`VALUE_BLOCKS`): `text` `number` `angle` `True` `False` `color`.
- [x] `workspace.js`는 번들되지 않고, 격리 iframe(불투명 출처)이라 같은 서버의 JSON을 `fetch`하려면 CORS 헤더가 따로 필요합니다. 그래서 **목록을 `workspace.js`에 복제**하고, 단위 검사로 `entry-palette.ts`와 같은지 확인합니다(블록 ID와 순서 비교).
- [x] `workspace.js`의 `EntryStatic.getAllBlocks`에서 `programming`일 때는 미션과 관계없이 수업 팔레트를 돌려줍니다. `namePilot` 프로토타입 분기와 비프로그래밍 분기는 그대로 둡니다. 할당 위치는 지금처럼 `Entry.init` 앞입니다(§0-2).
- [x] `keys` 미션의 `when_some_key_pressed` 기본 키를 위쪽(`38`)으로 바꾸는 기존 코드는 유지합니다.
- [x] `Entry.init`의 비활성 옵션(`messageEnable`·`listEnable`·`functionEnable`·`expansionDisable`·`aiUtilizeDisable`·`hardwareEnable`·`soundeditable` 등)은 바꾸지 않습니다.
- [x] 미션 블록은 기존 "블록 연결 힌트" 영역에 "이번 미션 블록"으로 안내합니다.

## 2. 저장 파서: 넓게 보존하되 기존 키는 그대로

`parseProgrammingProject`는 저장 정제기이자 채점 입력이고, 그 `key`가 검증·제출 기록 비교(`programmingProjectMatches`)와 실행 기록(이름 미션) 비교에 쓰입니다. **기존 작품의 `key`와 정규화 결과가 한 글자도 바뀌지 않는 것**이 가장 중요한 조건입니다.

- [x] **기존 12종은 지금의 정제 분기를 그대로 둡니다.** 일반 규칙으로 합치면 키가 바뀝니다. 예: 엔트리는 `get_variable`을 `["cs-A", null]`로 내보내지만 지금 정제기는 `["cs-A"]`로 줄입니다. 끝의 `null`을 남기면 곱셈·평균 작품의 키가 바뀝니다.
- [x] **새 블록은 일반 규칙으로 정제합니다.**
  - 타입은 수업 팔레트 또는 값 블록만 받고, 그 밖은 거부합니다(조작된 저장 차단).
  - `params`: 하위 블록(재귀), 문자열(180자 이하), 유한 숫자, `null`만 받고 길이는 그대로 둡니다. 드롭다운 값은 미완성 상태를 보존하도록 `null`도 받습니다(§0-6).
  - `statements`: `CONTAINER_BLOCKS`에만 출력합니다. 안쪽 스레드 수는 블록 정의(1 또는 2)와 같아야 하고, 각 스레드는 같은 규칙으로 정제합니다. 그 밖의 블록은 입력의 `statements: []`를 버리고 출력하지 않습니다. 기존 블록의 출력 모양을 유지하기 위해서입니다.
  - `id`·`x`·`y` 정리는 기존 규칙을 씁니다.
- [x] 지금은 어느 줄의 맨 위에 오느냐로 값 블록 여부를 정합니다(`reporters` 분기). 새 블록에서는 위치와 관계없이 타입으로만 판정합니다. 떨어진 값 블록 더미도 보존되고 채점에서는 무시됩니다.
- [x] 상한
  - 원문 입력 상한: 80,000 → 250,000자로 올립니다(§0-4). 이 값은 클라이언트에서 받은 원문을 읽을 때만 쓰입니다. 서버에는 정규화된 문자열만 저장됩니다(`readEntryDraft`가 `project.project`를 저장).
  - 노드 160·깊이 8·스레드 16·한 줄 40은 유지합니다. 깊이와 노드 수는 `statements` 안쪽까지 셉니다. 정규화된 노드는 약 100바이트라 160개여도 서버 한도(작품당 32KB, `learning.ts`)보다 충분히 작습니다. 상한을 넘으면 기존 저장 실패 문구를 보여 줍니다.
- [x] `semantic`(→ `key`)은 `CONTAINER_BLOCKS`일 때만 `statements`를 포함합니다. `order`는 안쪽 블록까지 깊이 우선으로 펼칩니다(`lesson-editor.tsx`의 블록 개수 표시용).
- [x] `work-draft.ts`의 `scriptContent`(미저장 변경 판정)도 같은 규칙으로 `statements`를 포함합니다. 지금은 반복 안쪽을 고쳐도 "변경 없음"으로 보입니다.
- [x] **실행 기록 키 통일:** 이름 미션의 실행 기록은 `parseProgrammingProject(...).key`로 저장하는데(`entry-practice-workspace.tsx`), `checkNameMission`은 `parseNameProject(...).key`로 비교합니다. 지금은 우연히 같지만 새 파서는 키 모양이 달라질 수 있습니다. `checkNameMission`이 `parseProgrammingProject`를 쓰도록 바꿉니다. `parseNameProject`는 이름 짓기 프로토타입(`name-practice.tsx`)에만 남깁니다.

## 3. 채점: 미션 블록만, 밖의 블록은 안내

- [x] `entry-palette.ts`에 미션별 허용 블록을 상수로 둡니다. 지금 인터프리터가 처리하는 집합과 같습니다.
  - `name`: `when_run_button_click` `ask_and_wait` `dialog_time` + 값 `text` `number` `get_canvas_input_value` `combine_something`
  - `multiply`·`average`: 위 + `set_variable` `get_variable` `calc_basic`
  - `move`: `when_run_button_click` `move_direction` `direction_absolute` + 값 `number` `angle`
  - `keys`: `move` + `when_some_key_pressed`
- [x] `checkProgrammingMission`에서 해석 전에 **채점 대상 줄**을 검사합니다. 채점 대상은 그 미션의 신호(`click` 또는 방향키 `37~40`)로 시작하는 줄이며, 값 블록과 `statements`까지 재귀로 봅니다. 허용 밖 블록이 있으면 첫 블록의 이름표를 넣어 실패시킵니다. 예: "이번 미션은 기본 블록으로 확인해요. ‘(2)초 기다리기’ 블록을 빼고 다시 검증해 주세요."
- [x] 시작 신호가 없는 블록 더미와 다른 이벤트(오브젝트 클릭·마우스 클릭·복제본 시작 등) 줄은 채점에서 무시하고 안내하지 않습니다(사용자 결정 ②). 지금 `run()`의 신호별 줄 필터가 이미 이렇게 동작합니다.
- [x] `checkNameMission`의 구조 검사 앞에서 같은 허용 목록 문구를 씁니다(`missionBlockIssue` 먼저, 수업은 `parse` 인자로 `parseProgrammingProject` 전달). 이름 미션 실행 기록은 화면 안내용이고 최종 판정은 서버 인터프리터라는 점은 그대로입니다.
- [x] 한계를 안내 문구에 정직하게 담습니다. 반복으로 5씩 두 번 움직이면 화면은 맞게 움직여도 검증은 통과하지 않습니다.

## 4. 표시·교사 화면

- [x] `programmingProjectLines`(교사 작품 보기·손들기)는 새 블록을 `entry-palette.ts` 이름표로 보여 주고, `statements`는 줄 앞에 `└`와 들여쓰기를 붙여 펼칩니다. 기존 12종 문구는 바꾸지 않습니다.
- [x] `entry-practice-workspace.tsx`의 "이번 미션의 블록과 입력값을 확인해 주세요" 경고는 파서가 `null`일 때만 나옵니다. 새 파서에서는 팔레트 밖 블록이나 상한 초과일 때만 `null`이 됩니다.
- [x] 실행 감시(`workspace.js`)는 그대로 둡니다(§0-7).

## 5. 선별 검증 연결

- [x] `scripts/e2e-scope.mjs`의 `programming-13` 패턴에 `^src/lib/classroom/(?:programming-entry|name-entry|entry-palette)\.ts$`를 추가합니다. 지금은 이 파일들이 미분류라 CI가 공통 스모크만 돌립니다. 필요하면 `tests/e2e-scope.test.mjs`의 예상값도 함께 고칩니다.
- [x] `src/lib/server/learning.ts`, `src/components/student/work-draft.ts`·`read-editor-draft.ts`는 여러 수업이 함께 쓰므로 패턴에 넣지 않습니다. 이 파일을 고치면 CI는 전체 등록 수업 스모크로 검증합니다. 로컬에서는 아래 선별 검사를 직접 실행합니다.

## 6. 검사

- [x] 단위 `tests/entry-palette.test.ts`(`playwright.logic.config.ts`, `npm run test:review`에 포함)
  - `workspace.js`에 복제한 목록 = `entry-palette.ts` 목록(카테고리·블록 ID·순서).
  - **기존 키 고정:** 미션 5개의 기존 작품 예시(`tests/programming-classroom.spec.ts`의 생성 방식 재사용)에서 변경 전 `key`·`order`·정규화 문자열을 상수로 떠 두고, 변경 후에도 같은지 비교합니다. 이 검사를 구현보다 먼저 씁니다.
  - §0-3 형식(메타 필드·`statements: [[]]`·`[[],[]]`·`True`·`color`·`null` 드롭다운)의 원문이 정제 → 재조립 → 재정제 후 같은 `key`를 냅니다.
  - 팔레트 밖 타입, `statements` 개수 불일치, 깊이·노드 초과, 원문 250,000자 초과는 거부합니다.
  - 채점 줄의 허용 밖 블록(값 블록 안·반복 안 포함)은 이름표가 담긴 실패 문구, 떨어진 더미와 다른 이벤트 줄은 무시.
  - 반복 안쪽만 바꿨을 때 `programmingProjectMatches`가 `false`, `scriptContent`가 다름.
- [x] E2E 선별: `tests/programming-classroom.spec.ts`, `tests/entryjs-ui.spec.ts`, `tests/manual-save-entry.spec.ts`, `tests/programming-mission-navigation.spec.ts` + `tests/lesson-smoke.spec.ts`
  - 작업실 카테고리 탭이 정확히 8개이고 소리·글상자·AI·확장·하드웨어 탭은 없음.
  - 미션 밖 블록(예: `wait_second`, `repeat_basic` 안에 `move_direction`)을 연결 → 저장 → 새로고침 → 그대로 복원.
  - 검증하면 안내 문구가 나오고, 블록을 빼면 통과 → 제출 완료. 기존 제출 기록이 "수정됨"으로 바뀌지 않음.
  - 무한 반복 실행이 시간 제한 안에 멈추고, 저장·이탈 확인창이 정상 동작. → 별도 E2E는 추가하지 않았습니다(§0-7 실측, 기존 이탈·저장 검사로 대신).
  - 기존 테스트가 직접 넣던 블록 위치·탭 이름 가정이 팔레트 확장으로 깨지지 않는지 확인합니다. 블록 메뉴 스크롤 위치가 바뀌므로 끌기 좌표를 쓰는 검사가 있으면 수정합니다.
- [x] 린트·타입·문서 검사. 전체 E2E는 사용자 승인 시에만 실행합니다.

## 7. 문서

- [x] DEVELOPMENT §4.1: 수업 팔레트·미션 블록 두 겹 구조, `workspace.js` 복제 목록과 동기화 검사, 기존 키 고정 규칙.
- [x] PRD 실습 정책: "미션 밖 블록은 저장되지만 검증은 미션 블록으로만, 떨어진 블록은 무시."
- [ ] HANDOFF: 진행 상태(푸시·PR 승인 후 기록).

## 진행 방식

- 지금 브랜치(`codex/dashboard-calendar-lesson-header`)는 화면 정리 작업입니다. 엔트리 변경은 저장 형식과 채점을 건드리므로 **별도 브랜치·PR**(예: `codex/entry-full-palette`)로 나누고, 이 계획 문서도 그 브랜치로 옮깁니다.
- 순서: 6의 "기존 키 고정" 검사 → 2 파서 → 1 팔레트·`workspace.js` → 3 채점 → 4 표시 → 5 선별 연결 → 6 나머지 검사 → 7 문서.
- 위험이 가장 큰 곳은 2번입니다. 기존 12종 분기를 일반 규칙으로 합치거나 모든 블록에 `statements`를 붙이면 기존 작품의 키가 바뀝니다. 그러면 검증·제출 기록이 "수정됨"으로 보이고, 이름 미션 실행 기록이 사라집니다.

## 2단계: 이벤트 실행 유지 · 실행 버튼 정리 · 오브젝트 추가

작성: 2026-10-16 · 같은 브랜치에서 진행(사용자 결정). 채점은 계속 **강아지(`entrybot`) 오브젝트의 미션 신호 줄**만 봅니다. 다른 오브젝트의 코드는 떨어진 블록처럼 저장·실행·교사 열람만 됩니다.

### 실측(엔트리 4.0.23)

- `objectaddable`은 `objectEditable`이 켜져 있어야 동작합니다. 켜면 무대 아래에 "+ 오브젝트 추가하기"와 오브젝트 목록·속성 편집(이름·x·y·크기·방향·회전 방식)이 나타납니다. 엔트리 자체 "▶ 시작하기" 버튼도 원래부터 무대 아래에 있습니다.
- 추가 버튼은 `openSpriteManager` 이벤트만 보냅니다. 그림 고르는 창은 엔트리 서버 목록을 쓰므로 직접 만들어야 합니다. `Entry.container.addObject(model, 0)`으로 추가하면 목록 맨 위에 들어가고 선택되며, 내보내기 순서도 맨 앞이 됩니다. 그래서 **주인공은 위치가 아니라 `id === "entrybot"`으로 찾습니다.**
- 삭제 버튼으로 강아지도 지워집니다. 모든 삭제는 `Entry.container.removeObject(id)`를 거치므로 여기서 `entrybot`을 막습니다.
- 실행 중 `entity.parent.id`로 블록을 실행한 오브젝트를 알 수 있습니다(이름 미션 실행 기록 필터에 사용).

### A. 이벤트 줄이 있으면 실행 유지

- [x] `workspace.js` 감시기는 **모든 오브젝트**의 실행 중인 코드가 비었는지 봅니다.
- [x] 이벤트로 시작하는 줄(`when_some_key_pressed`·`mouse_clicked`·`mouse_click_cancled`·`when_object_click`·`when_object_click_canceled`)이 어느 오브젝트에든 있으면 자동 종료하지 않습니다. 처음 비는 순간 결과와 이름 실행 기록은 `finished`로 한 번 보내고, `waiting` 알림을 보내 "이벤트를 기다리고 있어요. 다 해 봤으면 실행 정지를 눌러 주세요."를 보여 줍니다. 정지나 15초 제한으로 끝납니다. 방향키 미션의 기존 동작은 바꾸지 않습니다.
- [x] 이름 미션 실행 기록(`ask`·`answer`·`say`)은 강아지 오브젝트의 블록만 기록합니다.

### B. 실행 버튼 하나로

- [x] 툴바의 "실행하기"를 없애고 엔트리의 "▶ 시작하기"(실행 중 "정지")를 씁니다. 툴바에는 초기화·넓게 보기만 남깁니다. 방향키 패드는 그대로입니다.
- [x] Escape로 작업실을 나오면 초점은 초기화 버튼으로 갑니다.
- [x] 테스트의 `실행하기` 클릭·준비 대기(`toBeEnabled`)는 공용 도우미(작업실 안 "시작하기" 클릭, 초기화 버튼 활성으로 준비 확인)로 바꿉니다.

### C. 오브젝트 추가

- [x] 그림: `public/entryjs/sprites/`에 직접 그린 단순 SVG 8개(공·별·하트·사과·구름·돌·깃발·나무)를 둡니다. 라이선스 걱정이 없고 외부 요청이 없습니다. 목록(`ENTRY_SPRITES`: id·이름·파일·크기)은 `entry-palette.ts` 한 곳에 둡니다.
- [x] 흐름: 엔트리 추가 버튼 → iframe이 `add-object-request` 전송 → 수업 화면이 그림 고르기 대화상자(`ui/dialog`)를 엶 → 선택하면 화면이 오브젝트 모델을 만들어 `add-object`로 전송 → iframe이 `addObject(model, 0)` 후 변경 알림. 미리보기(교사 체험)도 같은 흐름이며 메모리에만 남습니다.
- [x] `workspace.js`: 프로그래밍 수업에서만 `objectEditable`·`objectaddable`·`objectdeletable`을 켭니다(이름 프로토타입·`entry-bot-lab`은 그대로). `removeObject`에서 `entrybot` 삭제를 막습니다. 실행 중 내보내기와 불러오기 후 블록 위치 복원은 오브젝트별로 처리하고, 위치 복원은 강아지 코드 기준입니다.
- [x] 저장 파서
  - 오브젝트 1~6개, `entrybot`은 정확히 1개. **오브젝트가 강아지뿐이면 결과·키·정규화가 지금과 같습니다**(기존 고정 검사 유지).
  - 추가 오브젝트: id(`[\w-]{1,30}`, 중복·`entrybot` 금지), 이름(20자), 그림은 `ENTRY_SPRITES`의 파일과 일치해야 하고 서버가 목록에서 다시 조립합니다. 위치 x·y는 ±1000, 크기 0.05~5배, 방향·회전은 유한 수, 보이기 여부, 회전 방식(`free`·`vertical`·`none`), 코드는 강아지와 같은 블록 규칙입니다.
  - 노드 상한은 작품 전체 240, 줄 수는 오브젝트당 16입니다. 저장 한도 32KB는 그대로입니다.
  - 강아지의 위치·크기는 지금처럼 고정해서 다시 조립합니다(채점이 처음 위치 0,0 기준).
  - `key`·`order`·미저장 판정·교사 화면은 추가 오브젝트가 있을 때만 확장합니다. 교사 화면은 `[공] …`처럼 오브젝트 이름을 앞에 붙입니다.
- [x] 채점(`checkProgrammingMission`·`missionBlockIssue`)은 강아지 코드만 봅니다. 다른 오브젝트 코드는 무시합니다.

### 심포지엄 후속(리뷰어 3명 합의 1~5)

- [x] 원래 블록의 일반 규칙 낙하 차단, 교사 화면 줄별 보호, 예상 밖 오류 문구 숨김(`MissionError`).
- [x] 정규화 수렴(이름 trim·slice·trim), 크기 부호 유지, 두 번 정규화 일치 검사.
- [x] `params` 길이 8 이하, 서버 정규화본 저장과 `MAX_PROJECT_BYTES` 공유, 편집기 한도 초과 안내.
- [x] 추가 후 강아지 재선택과 안내, `gradeKey`로 이름 실행 기록, 비슷한 블록(`dialog`·`move_x`·`rotate_absolute`) 대체 안내, 다른 오브젝트에만 시작 줄이 있을 때 안내.
- [x] 복제·붙여넣기 관문, 대기 문구 '정지하기'·"키를 누르거나 오브젝트를 클릭해 보세요", 대기 후 15초 초과·정지 결과 표시.
- 보류: 미션 블록을 분류 맨 앞에 두기, 교사 화면 새 블록 입력값 표시, 이벤트 대기 시간을 15초에서 빼기, 엔트리 내부 API 존재 검사, 커밋 3개로 나누기. 선별 실행기 문제는 별도 세션에서 처리 중.

### 검사

- [x] 단위: 오브젝트 순서가 바뀌어도 강아지를 찾음, 추가 오브젝트 왕복 보존·키 변화, 허용 밖 그림·중복 id·`entrybot` 없음·7개 이상 거부, 다른 오브젝트 코드는 채점 무시, 기존 고정 검사 통과.
- [x] E2E: 오브젝트 추가 → 코드 연결 → 저장 → 새로고침 복원, 강아지 삭제 막힘, 이벤트 줄이 있으면 실행 유지 후 무대 클릭에 반응·정지로 종료, 이름 미션에서 다른 오브젝트·이벤트 줄이 있어도 두 번 실행 확인 2/2, 기존 선별 검사(실행 버튼 교체 반영).
