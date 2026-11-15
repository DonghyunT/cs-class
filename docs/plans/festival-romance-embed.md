# 축제 복습 게임을 복습 활동으로 넣기 구현 계획

> **에이전트 작업자용:** 이 계획은 superpowers:executing-plans(또는 subagent-driven-development)로 과제 단위로 실행합니다. 단계는 `- [ ]` 체크박스로 추적합니다.

작성: 2026-11-15 · 상태: 계획만 작성, **아래 결정 D1~D6을 사용자에게 확인받은 뒤 시작** · 경로: PR 경로(신규 수업·작업 저장 흐름), 브랜치 `feat/festival-embed`. 전체 E2E 실행 여부는 시작할 때 사용자와 정합니다.

**목표:** 지금 주소로만 여는 학생용 복습 게임 `/festival-romance.html`을 사이트의 네 번째 복습 활동 `review-festival`로 넣습니다. 학생이 로그인한 채 게임을 하고, 진행이 학생 계정에 저장돼 다른 기기에서 이어 하며, 교사는 장별 하트와 엔딩을 봅니다.

**구조:** 게임은 이미 임베드 모드(`?embed=1`, 메모리 저장, `festival:init`/`festival:state`/`festival:complete`)가 있습니다. 게임 쪽 계약을 조금 보강하고(과제 1), 복습 저장 형식에 `festival` 종류를 더한 뒤(과제 2), 실습 단계에서 게임을 iframe으로 띄워 `useWork` 컨트롤러와 연결합니다(과제 3). 교사 화면(과제 4), 검사(과제 5), 문서(과제 6)를 이어서 하고, 파일 크기 줄이기(과제 7)는 선택입니다.

**기술:** Next.js 앱(`src/`), zod 스키마, 게임 단일 HTML 번들(`teaching-materials/festival-romance/build.cjs`), `node --test`, Playwright. 새 패키지 없음(과제 7에서 필요하면 먼저 묻기).

**근거:** [보관된 게임 설계안 Phase 5](../archive/cs-class/2026-11-15-completed-plans/festival-romance-review-game.md), 게임 [README](../../teaching-materials/festival-romance/README.md)의 임베드 계약, 2026-11-15 사이트 연결 지점 조사(아래 파일·줄 번호는 `main@5b882c1` 기준).

## 사용자 결정 (시작 전 확인)

| 번호 | 정할 것 | 추천 | 이유 / 대안 |
| :--- | :--- | :--- | :--- |
| D1 | 개념·퀴즈 단계 | 다른 복습처럼 **개념 3장·퀴즈 3문항을 짧게 두고 실습 = 게임** | 진행률(`progress.ts:52-60`)·채점 데이터(`src/lib/server/solutions.ts:187`의 `UNIT_QUIZ_DATA[type]`)·완료 판정을 공통 코드 변경 없이 씁니다. 대안 "게임만"은 세 곳의 공통 코드를 바꿔야 하고 다른 복습과 흐름이 달라집니다. |
| D2 | 저장 시점 | 헤더 `저장`·Ctrl+S(게임 안에서 눌러도) + **장이 끝날 때 자동 저장** + 엔딩에서 자동 제출 | 게임이 약 25분이라 저장을 잊고 닫으면 잃습니다. 엔딩 자동 제출은 순서도의 "퍼즐 성공 완료"와 같은 예외입니다(`PRD.md:115`). 장 끝 자동 저장은 새 예외라 PRD에 한 줄 더합니다(타이머가 아닌 사건 저장, 학생당 최대 3회). 대안: 수동 저장만(나가기 경고에 의존). |
| D3 | 게임 파일을 여는 주소 | **엔트리 작업실처럼 두 번째 운영 도메인 `cs-class-sigma.vercel.app`에서 열기** | 같은 주소에서 불투명 sandbox로 열면 크롬이 캐시를 쓰지 않아(`entry-workspace-frame.ts:6`) 열 때마다 17MB를 받습니다. 다른 사이트라 `allow-same-origin`을 줘도 앱 쿠키에 닿지 못합니다([FIREBASE_SETUP](../FIREBASE_SETUP.md#엔트리-작업실-주소)). `next.config.ts:27`의 이동 규칙에서 게임 파일만 빼면 됩니다. 로컬·에뮬레이터는 같은 주소 + `allow-scripts allow-forms`. |
| D4 | 게임 속 이름 | **사이트 닉네임을 게임 이름으로 넘기고, 게임 이름은 따로 저장하지 않음** | 게임 이름은 학생이 자유롭게 적는 글이라 실명일 수 있습니다. 사이트에 이미 있는 닉네임을 쓰면 새 개인정보를 모으지 않습니다. `story` 값(예: `ticketName`)에 이름이 들어가는지도 확인해 같은 규칙을 적용합니다. 대안: 게임에서 적은 이름을 그대로 저장(먼저 묻는 일). |
| D5 | 교사에게 보일 것 | 장별 하트(4개 중)·총 하트(12개 중)·엔딩·차갑게 선을 그었는지·첫 시도에 놓친 문항 | 수업 뒤 다시 짚을 개념을 고르기 위해서입니다. 성적에는 넣지 않습니다(복습은 성적·진행률 합계 제외, `PRD.md:234-237`). |
| D6 | `복습 완주` 배지 | **그대로 둠(복습 4개를 모두 해야 받음)** | `achievements.ts:102`의 분모가 복습 개수라, 이미 3개를 마친 학생은 게임을 끝내야 다시 받습니다. 대안: 게임을 분모에서 빼기. |

## 전체 제약

- 학생 작업은 공통 훅 `useWork` 하나로만 저장합니다. 개별 `debounce` 자동 저장 타이머를 만들지 않습니다([AGENTS](../../AGENTS.md)).
- 서버 저장 형식은 zod `.strict()`이고 모든 필드에 길이·개수 상한을 둡니다. 초안 JSON은 160,000바이트 이하(`src/lib/server/learning.ts:48`), 수업 id는 `review-`로 시작해야 요청 192,000바이트 한도를 받습니다(`src/app/api/classroom/[...path]/route.ts:42`).
- iframe에 `allow-same-origin`은 **다른 사이트(D3)일 때만** 줍니다. 같은 주소에서 `allow-scripts`와 함께 주면 게임이 sandbox를 풀고 학생 쿠키로 `/api/classroom`을 부를 수 있습니다.
- 게임 원본 수업 `public/festival-lesson.html`·`dist/festival-lesson.html`은 바이트 단위로 바꾸지 않습니다. 저장 키 `festival-romance.game.v2`(주소로 여는 학생의 기존 기록)는 그대로 둡니다.
- 주소로 여는 기존 방식(`/festival-romance.html`)도 계속 동작해야 합니다.

## 검토할 점 (테스트가 직접 다루지 않는 위험)

1. **장 중간에 다시 열기:** 저장에 `activeRuns`가 빠지면 다시 연 학생이 같은 문항을 첫 시도로 다시 풀어 하트를 얻습니다. 과제 1에서 저장 항목에 넣고, 과제 5에서 "틀린 뒤 저장 → 다시 열기 → 하트 없음"을 확인합니다.
2. **두 기기에서 동시에 열기:** 저장 번호(revision)가 어긋나면 서버가 409로 거절합니다. 기존 충돌 안내가 iframe 화면에서도 보이는지 봅니다.
3. **수업이 닫힌 뒤 저장:** 교사가 수업을 닫으면 저장이 거절됩니다(`server/classroom.ts:68`). 게임 진행이 사라진 것처럼 보이지 않게 기존 저장 실패 문구가 나와야 합니다.
4. **학교 와이파이 첫 로딩:** 17MB를 처음 받는 시간과, 두 번째부터 캐시(304)가 되는지 크롬북에서 확인합니다(D3의 효과).
5. **게임 안의 Ctrl+S:** 부모 창의 단축키 처리(`use-work.ts:333-344`)는 iframe 안 키를 받지 못해, 그대로 두면 브라우저의 '페이지 저장' 창이 뜹니다. 과제 1·3에서 저장 요청 메시지로 바꿉니다.

---

### 과제 1: 게임 쪽 임베드 계약 보강

**파일:** 수정 `teaching-materials/festival-romance/src/app.js`(`buildEmbedPayload` 53-72, `postToParent` 73-79, keydown 703-707, `festival:init` 수신 709-725), `src/state.js`(필요하면), 테스트 `tests/state.test.cjs`·`tests/refinement.test.cjs`, QA `qa/browser.cjs`(임베드 확인), 빌드 산출물 `dist/`·`public/festival-romance.html`·`qa/build-manifest.json`

**계약(과제 3이 그대로 씀):**

| 방향 | `type` | 내용 |
| :--- | :--- | :--- |
| 게임 → 사이트 | `festival:ready` | 데이터 없음. 스크립트가 준비되면 한 번 보냄(`'*'` 대상, 내용이 없어 안전) |
| 사이트 → 게임 | `festival:init` | `{ payload: 저장 상태 또는 null, nickname: 사이트 닉네임 }` (D4) |
| 게임 → 사이트 | `festival:state` | `buildEmbedPayload()` + `activeRuns` |
| 게임 → 사이트 | `festival:save-request` | 데이터 없음. 게임 안에서 Ctrl/⌘+S |
| 게임 → 사이트 | `festival:complete` | `festival:state` 내용 + `outcome` |

- [ ] 실패할 테스트 먼저: (1) `buildEmbedPayload` 결과를 `sanitizeGameState`에 넣으면 `activeRuns`가 그대로 돌아온다, (2) 임베드 QA에서 부모가 **다른 포트(다른 출처)** 일 때 `festival:ready` → `init` → `festival:state`가 부모에 도착한다, (3) 게임 안 Ctrl+S가 `festival:save-request`를 보내고 기본 동작을 막는다, (4) `init`에 `nickname`이 오면 이름 입력 없이 그 이름을 쓴다.
- [ ] `postToParent`의 대상 출처를 `location.origin` 대신 **처음 받은 `festival:init`의 `e.origin`** 으로 바꿉니다(다른 도메인에서 열면 지금 코드는 메시지를 버립니다). `init` 전에는 `festival:ready`만 보냅니다.
- [ ] `buildEmbedPayload`에 `activeRuns`를 넣고, D4에 따라 `nickname`은 내보내지 않으며 `story`에 이름이 들어가는 필드가 있으면 같이 뺍니다.
- [ ] 빌드 후 `node --test teaching-materials/festival-romance/tests/*.test.cjs`, `qa/browser.cjs`, `qa/playback-app.cjs` 통과, 주소로 여는 기존 흐름(로컬 저장) 그대로인지 확인. 커밋 `Extend the festival embed contract for the classroom frame`.

### 과제 2: 복습 저장 형식과 수업 정의

**파일:** 수정 `src/lib/classroom/types.ts:39`(`PracticeType`), `src/lib/classroom/review/project.ts`(15 스키마 합집합, 22 `isReviewType`, 24-27 `initialReviewProject`, 30-35 `projectSnapshot`, 42-61 `basicReviewCheck`), `src/lib/classroom/review/lessons.ts`(`REVIEW_LESSONS`), `src/lib/classroom/review/quiz.json`(D1의 퀴즈), 테스트 `tests/lesson-navigation.test.ts:8-11`, `tests/lesson-feedback.test.ts:13,25-36,98-101`, 새 로직 테스트(예: `tests/festival-project.test.ts`)

**만드는 것:** `festivalSchema`(`type: "festival"` + 과제 1의 `festival:state` 필드, `.strict()`, 상한 포함), `initialReviewProject("festival")`(빈 게임 상태), `basicReviewCheck`의 완료 조건 = 3장 완료(`endingOutcome`이 있음).

- [ ] 실패할 테스트 먼저: 과제 1 QA에서 뽑은 실제 상태 예시를 스키마가 받는다 / 모르는 키·긴 문자열·많은 장면 id를 거절한다 / 가장 큰 상태(모든 장면을 본 뒤)가 160,000바이트보다 한참 작다 / 3장 미완료는 `basicReviewCheck` 실패.
- [ ] 수업 `review-festival` 추가: `mode: "review"`, 제목 `내일, 축제에서 만나`, D1의 개념 3장(순차·변수 / 조건·논리 / 반복)과 퀴즈. 목록 순서는 기존 복습 뒤(`lesson-navigation.ts:8`).
- [ ] 목록 개수·순서를 고정한 기존 테스트를 새 수업에 맞게 고치고, 고친 이유를 커밋 본문에 적습니다. `npm run check` 통과. 커밋 `Add the festival review project type`.

### 과제 3: 학생 화면의 게임 틀

**파일:** 새 `src/components/student/review/festival.tsx`, 수정 `src/components/student/lesson-editor.tsx`(18-20 import, 44 `DraftComparison`, 53 `reviewType`, 74 `keepPractice`, 184 컴포넌트 선택), `src/components/classroom.tsx:13`(`canWiden`), `src/components/student/lesson-shell.tsx:27`(`reviewFocused`), `src/lib/classroom/work-draft.ts:43-50`(필요하면), `next.config.ts:27`(D3), iframe 주소·sandbox는 `src/lib/classroom/entry-workspace-frame.ts`와 같은 방식(작업실 호스트가 있으면 그 호스트, 없으면 같은 주소)

**쓰는 것:** 과제 1의 메시지 계약, 과제 2의 `festival` 프로젝트, 모범 코드 `flowchart.tsx`(`controller.getDraft()`·`controller.update` 102-105, 자동 제출 50-67).

- [ ] 받는 메시지는 `event.source === frame.contentWindow`와 기대 출처를 모두 확인합니다(엔트리 `entry-practice-workspace.tsx:122`와 같은 방식).
- [ ] `festival:ready` → 저장된 상태와 사이트 닉네임으로 `festival:init` / `festival:state` → `controller.update` / `festival:save-request` → `controller.save()` / 장이 끝남(D2) → 저장 / `festival:complete` → 저장 후 `validate-practice` → `submit-practice`.
- [ ] 단계를 오가도 17MB iframe을 다시 불러오지 않게 `keepPractice`에 넣습니다. 교사 미리보기(`mode="preview"`)에서는 받은 상태를 저장하지 않습니다.
- [ ] iframe에 `title`(화면 읽기용 이름)을 주고, 키보드 포커스가 게임 안으로 들어가는지 봅니다.
- [ ] 로컬 에뮬레이터에서 직접 열어 한 장을 끝까지 하고 저장·새로고침·이어하기, 브라우저 콘솔 오류 0건. 커밋 `Show the festival game as the review practice`.

### 과제 4: 교사 화면

**파일:** 수정 `src/components/teacher/work-details.tsx:17-26`(`ReviewProjectPreview`), 필요하면 `src/lib/classroom/achievements.ts:16,53,102`(D6)

- [ ] `festival` 분기: D5의 항목(장별 하트·총 하트·엔딩·차갑게 선 그음·첫 시도에 놓친 문항)을 표로 보여 줍니다. 놓친 문항 이름은 게임의 장 정의에서 가져오고 사이트 쪽에 다시 적지 않습니다(방법은 과제 시작 때 정하고 Ruling으로 남김).
- [ ] 교사 미리보기에서 학생 상태가 그대로 열리는지 확인(`teacher-preview.ts:28,66-70,90-91`가 같은 스키마로 다시 검사). 커밋 `Show festival hearts and endings to teachers`.

### 과제 5: 검사와 선별 검증 등록

**파일:** 새 `tests/review-festival.spec.ts`, 수정 `tests/lesson-smoke.spec.ts:5-14,41+`(`ALL_LESSON_IDS`·저장/복원 블록), `scripts/e2e-scope.mjs:78-125`(`LESSON_MAPPINGS`), `tests/lesson-ui-consistency.spec.ts:18,69-70`, 필요하면 `scripts/seed-emulator.mjs:14`·`scripts/lib/review-rollout.mjs:2-4`

- [ ] `review-festival.spec.ts`: 교사가 수업을 연다 → 학생이 실습에서 게임이 뜬다 → 한 장면 진행 후 게임 안 Ctrl+S → 새로고침하면 같은 장면 / 틀린 뒤 저장 → 다시 열면 그 문항 하트 없음(검토할 점 1) / 엔딩 직전 상태에서 끝내면 제출되고 교사 화면에 하트가 보인다.
- [ ] 게임 조작은 iframe 안(`frameLocator`)에서 하고, 긴 진행은 저장 상태를 미리 넣어 줄입니다.
- [ ] `npm run check`, `npm run test:e2e:scope` 통과(개수 기록). 커밋 `Cover the festival review in scoped E2E`.

### 과제 6: 문서

**파일:** `docs/PRD.md`(수업 표 162-164, D2면 저장 예외 115 부근), `docs/DESIGN.md` §5.2(243 이후), `docs/DEVELOPMENT.md` §4.2, `README.md`, `teaching-materials/festival-romance/README.md`·`HANDOFF.md`(Phase 5 완료), `docs/HANDOFF.md`(최근 반영, 이 계획을 보관함으로)

- [ ] 바뀐 규칙·파일 이름은 `git grep`으로 사본을 찾아 고칩니다. `node scripts/check-docs.mjs` 통과.

### 과제 7 (선택): 게임 파일 크기 줄이기

**파일:** `teaching-materials/festival-romance/build.cjs`(그림 넣는 부분 50-51), QA 표정 캡처

- [ ] 그림을 PNG 대신 WebP로 넣어 17MB를 줄입니다(얼마나 줄지는 해 봐야 압니다). 변환 도구가 이미 설치돼 있는지 먼저 보고, 없으면 패키지 추가를 사용자에게 묻습니다.
- [ ] 표정 6개를 남녀 모두 눈으로 비교해 깨짐·색 변화가 없는지 확인합니다.

## 끝났다고 보는 기준

- 학생이 `review-festival`을 열어 끝까지 하고, 다른 기기에서 이어 하며, 교사가 하트·엔딩을 봅니다(로컬 에뮬레이터 + 선별 E2E).
- 주소로 여는 `/festival-romance.html`과 원본 `/festival-lesson.html`이 그대로 동작합니다.
- 병합 뒤 [공개 후 확인](../FIREBASE_SETUP.md#ci와-운영-공개)과, 실제 수업에서 크롬북 첫 로딩 시간을 HANDOFF에 적습니다.
