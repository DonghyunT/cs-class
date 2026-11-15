# 축제 복습 게임을 복습 활동으로 넣기 구현 계획

> **에이전트 작업자용:** 이 계획은 superpowers:executing-plans(또는 subagent-driven-development)로 과제 단위로 실행합니다. 단계는 `- [ ]` 체크박스로 추적합니다.

작성: 2026-11-15 · 상태: 사용자 결정 완료(11/15), 과제 1부터 착수 대기 · 경로: PR 경로(신규 수업·작업 저장 흐름), 브랜치 `feat/festival-embed`. 검증은 선별 E2E이며 전체 E2E는 돌리지 않고, PR CI 뒤 **사용자가 화면을 보고 병합을 정합니다**.

**목표:** 지금 주소로만 여는 학생용 복습 게임 `/festival-romance.html`을 사이트의 복습 활동 `review-festival`로 넣습니다. 학생이 로그인한 채 화면을 꽉 채운 게임을 하고, 진행이 학생 계정에 저장돼 다른 기기에서 이어 하며, 교사는 장별 하트·엔딩·첫 시도에 놓친 문항을 봅니다.

**구조:** 게임은 이미 임베드 모드(`?embed=1`, 메모리 저장, `festival:init`/`festival:state`/`festival:complete`)가 있습니다. 게임 쪽 계약을 조금 보강하고(과제 1), 개념·퀴즈 없이 실습만 있는 복습 종류 `festival`을 더한 뒤(과제 2), 게임을 화면 가득 iframe으로 띄워 `useWork` 컨트롤러와 연결합니다(과제 3). 교사 화면·배지(과제 4), 검사(과제 5), 문서(과제 6)를 이어서 하고, 파일 크기 줄이기(과제 7)는 선택입니다.

**기술:** Next.js 앱(`src/`), zod 스키마, 게임 단일 HTML 번들(`teaching-materials/festival-romance/build.cjs`), `node --test`, Playwright. 새 패키지 없음(과제 7에서 필요하면 먼저 묻기).

**근거:** [보관된 게임 설계안 Phase 5](../archive/cs-class/2026-11-15-completed-plans/festival-romance-review-game.md), 게임 [README](../../teaching-materials/festival-romance/README.md)의 임베드 계약, 2026-11-15 사이트 연결 지점 조사와 사용자 결정(아래 파일·줄 번호는 `main@66f3cc1` 기준).

## 사용자 결정 (2026-11-15 확인)

| 번호 | 정한 것 | 결정 | 구현에 주는 영향 |
| :--- | :--- | :--- | :--- |
| D1 | 개념·퀴즈 | **게임만.** 한 페이지를 게임이 꽉 채우고 필요한 버튼은 여백에 | 개념·퀴즈 0개. 진행률은 빈 단계를 100%로 치고 전체 비율에서 빼므로(`progress.ts:52-68`) 제출 하나로 완료됩니다. 새 기록은 `practice` 단계에서 시작하고(`progress.ts:29`), 채점 데이터 조회(`src/lib/server/solutions.ts:185-189`)가 퀴즈 없는 종류를 받아야 합니다. 단계 바꾸기·실습 집중 모드는 숨깁니다. |
| D1-화면 | 버튼 배치 | **옆 여백에 세로 막대**, 옆 여백이 없는 창은 위쪽 한 줄로 자동 전환 | 크롬북 창(약 1366×657)은 게임을 창 높이만큼 키우고 왼쪽 막대에 나가기·저장·저장 상태·(켜져 있으면) 도움·학생 메뉴. 태블릿 세로(768×1024) 같은 창은 얇은 위쪽 줄. |
| D2 | 저장 시점 | 저장 버튼·게임 안 Ctrl+S + **장이 끝날 때 자동 저장** + 엔딩에서 자동 제출 | 장 끝 자동 저장은 새 저장 예외라 PRD에 한 줄 더합니다(타이머가 아닌 사건 저장, 학생당 최대 3회). 엔딩 자동 제출은 순서도의 "퍼즐 성공 완료"와 같은 예외입니다(`PRD.md:115`). |
| D3 | 게임 주소 | **두 번째 운영 도메인 `cs-class-sigma.vercel.app`** | 다른 사이트라 `allow-same-origin`을 줘도 앱 쿠키에 닿지 못하고, 크롬 캐시가 돼 학생마다 처음 한 번만 17MB를 받습니다([FIREBASE_SETUP](../FIREBASE_SETUP.md#엔트리-작업실-주소)). `next.config.ts:27`의 이동 규칙에서 게임 파일만 뺍니다. 로컬·에뮬레이터는 같은 주소 + `allow-scripts allow-forms`. |
| D4 | 게임 속 이름 | **게임에서 직접 입력하고 그 이름을 계정에 저장** | 학생이 적는 글이라 실명일 수 있습니다. 게임의 이름 정리 규칙(`normalizeNickname`)으로 길이를 제한해 그대로 저장하고, 교사 화면에는 보이지 않습니다(D5에 없음). PRD 저장 항목에 적습니다. |
| D5 | 교사 화면 | **장별·총 하트, 엔딩 종류, 첫 시도에 놓친 문항** | 마음 선택(차갑게 선 그음)은 보이지 않습니다. 성적에는 넣지 않습니다(`PRD.md:234-237`). |
| D6 | 복습 배지 | **기존 복습 3개와 별도로 둠** | 기존 3개는 보관 성격이라, 게임은 `복습 완주` 배지(`achievements.ts:53,102`)의 계산에서 빼고 분류 이름도 따로 씁니다(예: `정보 1~3단원 복습 게임`). |

## 전체 제약

- 학생 작업은 공통 훅 `useWork` 하나로만 저장합니다. 개별 `debounce` 자동 저장 타이머를 만들지 않습니다([AGENTS](../../AGENTS.md)).
- 서버 저장 형식은 zod `.strict()`이고 모든 필드에 길이·개수 상한을 둡니다. 초안 JSON은 160,000바이트 이하(`src/lib/server/learning.ts:48`), 수업 id는 `review-`로 시작해야 요청 192,000바이트 한도를 받습니다(`src/app/api/classroom/[...path]/route.ts:42`).
- iframe에 `allow-same-origin`은 **다른 사이트(D3)일 때만** 줍니다. 같은 주소에서 `allow-scripts`와 함께 주면 게임이 sandbox를 풀고 학생 쿠키로 `/api/classroom`을 부를 수 있습니다.
- 게임 원본 수업 `public/festival-lesson.html`·`dist/festival-lesson.html`은 바이트 단위로 바꾸지 않습니다. 저장 키 `festival-romance.game.v2`(주소로 여는 학생의 기존 기록)는 그대로 둡니다.
- 주소로 여는 기존 방식(`/festival-romance.html`)도 계속 동작해야 합니다. 기존 복습 3개의 화면·배지·진행률은 바뀌지 않아야 합니다.

## 검토할 점 (테스트가 직접 다루지 않는 위험)

1. **장 중간에 다시 열기:** 저장에 `activeRuns`가 빠지면 다시 연 학생이 같은 문항을 첫 시도로 다시 풀어 하트를 얻습니다. 과제 1에서 저장 항목에 넣고, 과제 5에서 "틀린 뒤 저장 → 다시 열기 → 하트 없음"을 확인합니다.
2. **두 기기에서 동시에 열기:** 저장 번호(revision)가 어긋나면 서버가 409로 거절합니다. 기존 충돌 안내가 세로 막대 화면에서도 보이는지 봅니다.
3. **수업이 닫힌 뒤 저장:** 교사가 수업을 닫으면 저장이 거절됩니다(`src/lib/server/classroom.ts:68`). 진행이 사라진 것처럼 보이지 않게 기존 저장 실패 문구가 막대에 나와야 합니다.
4. **학교 와이파이 첫 로딩:** 17MB를 처음 받는 시간과, 두 번째부터 캐시(304)가 되는지 크롬북에서 확인합니다(D3의 효과).
5. **화면 비율 경계:** 세로 막대와 위쪽 줄이 바뀌는 경계 근처(예: 1280×720, 1024×768)에서 버튼이 게임을 가리거나 게임이 잘리지 않는지 봅니다. 게임 안 Ctrl+S는 부모 창 단축키(`use-work.ts:333-344`)에 닿지 않으므로 저장 요청 메시지로 바꿉니다(과제 1·3).

---

### 과제 1: 게임 쪽 임베드 계약 보강

**파일:** 수정 `teaching-materials/festival-romance/src/app.js`(`buildEmbedPayload` 53-72, `postToParent` 73-79, keydown 703-707, `festival:init` 수신 709-725), `src/state.js`(필요하면), 테스트 `tests/state.test.cjs`·`tests/refinement.test.cjs`, QA `qa/browser.cjs`(임베드 확인), 빌드 산출물 `dist/`·`public/festival-romance.html`·`qa/build-manifest.json`

**계약(과제 3이 그대로 씀):**

| 방향 | `type` | 내용 |
| :--- | :--- | :--- |
| 게임 → 사이트 | `festival:ready` | 데이터 없음. 스크립트가 준비되면 한 번 보냄(`'*'` 대상, 내용이 없어 안전) |
| 사이트 → 게임 | `festival:init` | `{ payload: 저장 상태 또는 null }` |
| 게임 → 사이트 | `festival:state` | `buildEmbedPayload()` + `activeRuns` (이름 `nickname` 포함, D4) |
| 게임 → 사이트 | `festival:save-request` | 데이터 없음. 게임 안에서 Ctrl/⌘+S |
| 게임 → 사이트 | `festival:chapter-complete` | `{ chapterId }`. 장 결과 화면이 처음 나올 때(D2) |
| 게임 → 사이트 | `festival:complete` | `festival:state` 내용 + `outcome` |

- [ ] 실패할 테스트 먼저: (1) `buildEmbedPayload` 결과를 `sanitizeGameState`에 넣으면 `activeRuns`가 그대로 돌아온다, (2) 임베드 QA에서 부모가 **다른 포트(다른 출처)** 일 때 `festival:ready` → `init` → `festival:state`가 부모에 도착한다, (3) 게임 안 Ctrl+S가 `festival:save-request`를 보내고 기본 동작을 막는다, (4) 장을 끝내면 `festival:chapter-complete`가 그 장 번호로 한 번 온다.
- [ ] `postToParent`의 대상 출처를 `location.origin` 대신 **처음 받은 `festival:init`의 `e.origin`** 으로 바꿉니다(다른 도메인에서 열면 지금 코드는 메시지를 버립니다). `init` 전에는 `festival:ready`만 보냅니다.
- [ ] `buildEmbedPayload`에 `activeRuns`를 넣습니다. 임베드 모드의 전체 화면 버튼은 지금처럼 숨깁니다.
- [ ] 빌드 후 `node --test teaching-materials/festival-romance/tests/*.test.cjs`, `qa/browser.cjs`, `qa/playback-app.cjs` 통과, 주소로 여는 기존 흐름(로컬 저장) 그대로인지 확인. 커밋 `Extend the festival embed contract for the classroom frame`.

### 과제 2: 실습만 있는 복습 종류 `festival`

**파일:** 수정 `src/lib/classroom/types.ts:39`(`PracticeType`), `src/lib/classroom/review/project.ts`(15 스키마 합집합, 22 `isReviewType`, 24-27 `initialReviewProject`, 30-35 `projectSnapshot`, 42-61 `basicReviewCheck`), `src/lib/classroom/review/lessons.ts`(`REVIEW_LESSONS`), `src/lib/classroom/progress.ts:29`(`emptyWork` 시작 단계), `src/lib/server/solutions.ts:185-189`(`getLessonSolution`), 테스트 `tests/lesson-navigation.test.ts:8-11`, `tests/lesson-feedback.test.ts:13,25-36,98-101`, 새 로직 테스트(예: `tests/festival-project.test.ts`)

**만드는 것:** `festivalSchema`(`type: "festival"` + 과제 1의 `festival:state` 필드, `.strict()`, 상한 포함), `initialReviewProject("festival")`(빈 게임 상태), `basicReviewCheck`의 완료 조건 = 3장 완료(`endingOutcome`이 있음), 수업 `review-festival`(`mode: "review"`, 제목 `내일, 축제에서 만나`, D6의 별도 분류, `concepts: []`, `quiz: []`).

- [ ] 실패할 테스트 먼저: 과제 1 QA에서 뽑은 실제 상태 예시를 스키마가 받는다 / 모르는 키·긴 문자열·많은 장면 id를 거절한다 / 가장 큰 상태(모든 장면을 본 뒤)가 160,000바이트보다 한참 작다 / 3장 미완료는 `basicReviewCheck` 실패 / `emptyWork(review-festival)`이 `practice`에서 시작한다 / `getLessonSolution("review-festival")`이 퀴즈 없이 돌아온다 / `progressFor`가 제출 하나로 `completed`이다.
- [ ] 목록 개수·순서를 고정한 기존 테스트를 새 수업에 맞게 고치고, 고친 이유를 커밋 본문에 적습니다. `npm run check` 통과. 커밋 `Add the festival review project type`.

### 과제 3: 학생 화면 — 게임이 꽉 찬 페이지

**파일:** 새 `src/components/student/review/festival.tsx`, 수정 `src/components/student/lesson-editor.tsx`(18-20 import, 44 `DraftComparison`, 53 `reviewType`, 74 `keepPractice`, 단계 탭·`navigation`, 184 컴포넌트 선택), `src/components/student/lesson-shell.tsx`(27 `reviewFocused`·`canFocus`, 머리줄 배치)·`lesson-shell.module.css`, `src/components/classroom.tsx:13`(`canWiden`), `src/lib/classroom/work-draft.ts:43-50`(필요하면), `next.config.ts:27`(D3), iframe 주소·sandbox는 `src/lib/classroom/entry-workspace-frame.ts`와 같은 방식(작업실 호스트가 있으면 그 호스트, 없으면 같은 주소)

**쓰는 것:** 과제 1의 메시지 계약, 과제 2의 `festival` 프로젝트, 모범 코드 `flowchart.tsx`(`controller.getDraft()`·`controller.update` 102-105, 자동 제출 50-67).

- [ ] **배치(D1-화면):** 머리줄 컴포넌트는 그대로 쓰고(저장·나가기 경고·도움·로그아웃 동작을 새로 만들지 않음), `festival`일 때 CSS로 왼쪽 세로 막대(폭 약 104px)로 세웁니다. 게임 영역은 남은 폭과 창 높이(`100dvh`)를 채웁니다. 옆 여백이 없는 비율에서는 얇은 위쪽 한 줄로 바뀝니다. 기준: 1366×657에서 게임 높이 = 창 높이이고 막대가 게임을 가리지 않음, 768×1024에서 위쪽 줄. 제목 `h1`은 화면 읽기용으로만 남깁니다. 단계 바꾸기·실습 집중 모드 버튼은 숨기고, 막대 배경은 게임 여백 색(`#242b39` 계열)에 맞춥니다.
- [ ] 받는 메시지는 `event.source === frame.contentWindow`와 기대 출처를 모두 확인합니다(엔트리 `entry-practice-workspace.tsx:122`와 같은 방식).
- [ ] `festival:ready` → 저장된 상태로 `festival:init` / `festival:state` → `controller.update` / `festival:save-request` → `controller.save()` / `festival:chapter-complete` → 저장(D2) / `festival:complete` → 저장 후 `validate-practice` → `submit-practice`.
- [ ] 17MB iframe을 다시 불러오지 않게 `keepPractice`에 넣습니다. 교사 미리보기(`mode="preview"`)에서는 받은 상태를 저장하지 않습니다.
- [ ] iframe에 `title`(화면 읽기용 이름)을 주고, 키보드 포커스가 막대 → 게임 순서로 이동하는지 봅니다.
- [ ] 로컬 에뮬레이터에서 직접 열어 한 장을 끝까지 하고 자동 저장·새로고침·이어하기, 1366×657·768×1024·390×844 화면, 브라우저 콘솔 오류 0건. 커밋 `Show the festival game as a full-page review`.

### 과제 4: 교사 화면과 배지

**파일:** 수정 `src/components/teacher/work-details.tsx:17-26`(`ReviewProjectPreview`), `src/lib/classroom/achievements.ts`(53 `lessonBadgesFor`의 복습 분기, 102 `review-complete` 분모)

- [ ] `festival` 분기(D5): 장별 하트(4개 중)·총 하트(12개 중)·엔딩 종류·첫 시도에 놓친 문항(EP 번호와 제목)을 보여 줍니다. 놓친 문항 이름은 게임의 장 정의에서 가져오고 사이트 쪽에 다시 적지 않습니다(방법은 과제 시작 때 정하고 Ruling으로 남김).
- [ ] D6: `review-festival`은 `review-complete` 배지를 주지 않고 분모에서도 빠집니다. 기존 복습 3개의 배지 결과가 그대로인지 테스트로 고정합니다.
- [ ] 교사 미리보기에서 학생 상태가 그대로 열리는지 확인(`src/lib/server/teacher-preview.ts:28,66-70,90-91`가 같은 스키마로 다시 검사). 커밋 `Show festival hearts and endings to teachers`.

### 과제 5: 검사와 선별 검증 등록

**파일:** 새 `tests/review-festival.spec.ts`, 수정 `tests/lesson-smoke.spec.ts:5-14,41+`(`ALL_LESSON_IDS`·저장/복원 블록), `scripts/e2e-scope.mjs:78-125`(`LESSON_MAPPINGS`), `tests/lesson-ui-consistency.spec.ts:18,69-70`, `tests/concept-layout.spec.ts:35,57-73`(개념 없는 수업 건너뛰기), 필요하면 `tests/read-usage.spec.ts:36`·`scripts/seed-emulator.mjs:14`·`scripts/lib/review-rollout.mjs:2-4`

- [ ] `review-festival.spec.ts`: 교사가 수업을 연다 → 학생이 열면 게임이 바로 꽉 찬다 → 한 장면 진행 후 게임 안 Ctrl+S → 새로고침하면 같은 장면 / 장을 끝내면 자동 저장 / 틀린 뒤 저장 → 다시 열면 그 문항 하트 없음(검토할 점 1) / 엔딩 직전 상태에서 끝내면 제출되고 교사 화면에 하트·엔딩·놓친 문항이 보인다.
- [ ] 게임 조작은 iframe 안(`frameLocator`)에서 하고, 긴 진행은 저장 상태를 미리 넣어 줄입니다.
- [ ] `npm run check`, `npm run test:e2e:scope` 통과(개수 기록). 커밋 `Cover the festival review in scoped E2E`.

### 과제 6: 문서

**파일:** `docs/PRD.md`(수업 표 162-164, 저장 예외 115 부근에 장 끝 저장, 저장 항목에 게임 속 이름), `docs/DESIGN.md` §5.2(243 이후, 꽉 찬 화면·세로 막대), `docs/DEVELOPMENT.md` §4.2, `README.md`, `teaching-materials/festival-romance/README.md`·`HANDOFF.md`(Phase 5 완료), `docs/HANDOFF.md`(최근 반영, 이 계획을 보관함으로)

- [ ] 바뀐 규칙·파일 이름은 `git grep`으로 사본을 찾아 고칩니다. `node scripts/check-docs.mjs` 통과.

### 과제 7 (선택): 게임 파일 크기 줄이기

**파일:** `teaching-materials/festival-romance/build.cjs`(그림 넣는 부분 50-51), QA 표정 캡처

- [ ] 그림을 PNG 대신 WebP로 넣어 17MB를 줄입니다(얼마나 줄지는 해 봐야 압니다). 2026-11-15 확인 결과 `sharp`는 설치돼 있지 않으므로, 다른 변환 방법이 없으면 패키지 추가를 사용자에게 묻습니다.
- [ ] 표정 6개를 남녀 모두 눈으로 비교해 깨짐·색 변화가 없는지 확인합니다.

## 끝났다고 보는 기준

- 학생이 `review-festival`을 열면 게임이 화면을 채우고, 끝까지 하면 제출되며, 다른 기기에서 이어 합니다. 교사는 하트·엔딩·놓친 문항을 봅니다(로컬 에뮬레이터 + 선별 E2E).
- 주소로 여는 `/festival-romance.html`과 원본 `/festival-lesson.html`, 기존 복습 3개가 그대로 동작합니다.
- PR CI 뒤 사용자가 화면을 보고 병합을 정합니다. 병합 뒤 [공개 후 확인](../FIREBASE_SETUP.md#ci와-운영-공개)과, 실제 수업에서 크롬북 첫 로딩 시간을 HANDOFF에 적습니다.

## 착수 기록

- 2026-11-15: `main@66f3cc1`에서 브랜치를 만들었고, 시작 전 `npm run check`(로직 테스트 120 포함)가 통과했습니다. 의존성 이상 0건, Java 21, Firebase CLI 15.31, Playwright 1.63(크롬 포함)을 확인했습니다.
