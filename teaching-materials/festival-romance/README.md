# 내일, 축제에서 만나 (`festival-romance`)

중학교 정보 정규 1~3단원 핵심 개념을 스토리·실습·퀴즈로 복습하는 독립 실행형 HTML 웹 게임입니다. 외부 서버·CDN 없이 단일 HTML 파일로 동작합니다.

## 파일 구성과 보존 원칙

- **학생용 CS 복습 게임 (현재 주 빌드 대상):** [dist/festival-romance.html](dist/festival-romance.html) / [public/festival-romance.html](../../public/festival-romance.html) (`/festival-romance.html`)
  - 3개 챕터, 총 22장면, 12문항(`ch1-q1`~`ch3-q4`) 구성
- **교사용 도입 수업 자료 (원본 보존):** [dist/festival-lesson.html](dist/festival-lesson.html) / [public/festival-lesson.html](../../public/festival-lesson.html) (`/festival-lesson.html`)
  - 기존 3차시 27장면 도입 수업 자료를 바이트 단위로 그대로 보존하며 `build.cjs`가 덮어쓰지 않습니다.
- **소스 및 빌드:**
  - `src/`: [shell.html](src/shell.html), [styles.css](src/styles.css), [models.js](src/models.js), [state.js](src/state.js), [experiments.js](src/experiments.js), [app.js](src/app.js)
  - `src/chapters/`: [ch1.cjs](src/chapters/ch1.cjs), [ch2.cjs](src/chapters/ch2.cjs), [ch3.cjs](src/chapters/ch3.cjs)
  - 빌드 스크립트: [build.cjs](build.cjs) (자산 인라인, PNG IHDR 기반 `FESTIVAL_SPRITE_ROWS` 자동 감지, `qa/build-manifest.json` 생성)
- **개편 설계 문서:** [festival-romance-review-game.md](../../docs/plans/festival-romance-review-game.md)

## 챕터·평가·엔딩 규칙

| 챕터 | 정규 단원·주제 | 평가 문항 | 특징 |
| :--- | :--- | :--- | :--- |
| 1장 (`ch1`) | 순차·입출력·변수·대답·방향키 사건과 방향각(1단원) | `ch1-q1`~`ch1-q4` (4문항) | 환영 화면 블록 순서·초대장 [이름] 저장 위치·길 안내 방향각·티켓 나누기를 변수로 계산 — 모두 카드 3장 중 고르기 |
| 2장 (`ch2`) | 비교·논리(`AND`/`OR`/`NOT`)·조건 분기 | `ch2-q1`~`ch2-q4` (4문항) | 7장 이상 비교 기호·쉬는 부스 또는→그리고·날씨 안내 아니다(카드 3장) · 자판기 줄 순서를 ↑·↓로 직접 옮기기 + 1차 마음 선택지 |
| 3장 (`ch3`) | 횟수 반복·다각형 외각·조건 반복·카운터 | `ch3-q1`~`ch3-q4` (4문항) | 반복 횟수·드론 회전각을 숫자로 적고 실행(조명 깜빡임·드론 경로) · 암호 반복 조건·카운터 더하기(카드 3장) + 2차 마음 선택지 + 엔딩 리포트 |

- **문항 화면:** 하트 문항은 위쪽이 같은 틀입니다(지금 상황 1~2줄 → 블록 코드 4줄 이하, 고칠 줄 강조 → 질문). 객관식이 어울리는 9문항은 큰 카드 3장(`renderers.quiz`)이고, 고르면 그 코드의 실행 결과와 이유가 나옵니다. 제어 구조 3문항은 직접 조작·단답형입니다: 2장 4번 자판기는 줄 순서를 ↑·↓로 옮기기(`renderers.order`), 3장 1번 조명·2번 드론은 코드 속 숫자 칸에 횟수·회전각 적기(`renderers.number`). 조작·단답형은 처음(버그) 상태나 방금 실행한 상태로는 실행할 수 없고, 바꾼 뒤 처음 실행이 첫 시도입니다. 드롭다운은 쓰지 않으며, 구성·제목(`EP N · …`)은 `tests/refinement.test.cjs`가 확인합니다.

- **첫 시도 정답 하트 규칙 (`src/state.js`):**
  - 각 문항을 **첫 시도**에 통과하면 `+1 ♥`(최대 `12 ♥`)를 얻습니다.
  - 오답 후 재도전해 통과하면 `0 ♥`로 다음 장면에 진행하며, 해당 문항은 회차 오답 기록(`missedThisRun`)과 엔딩 리포트에 남습니다.
  - 챕터 재도전 시 최고 하트 기록은 유지되고, 해당 챕터의 차가운 선택지(`coldChoices`) 기록은 비워집니다.
- **3갈래 엔딩 (`computeEndingOutcome`):**
  - **썸 시작 (`some`):** `hearts >= 12` (12/12 만점)이고 `coldChoices` 거절이 없는 경우
  - **찐친 (`friend`):** `hearts`가 `7~11`이거나, `hearts >= 12`이지만 `coldChoices`에서 선을 그은 경우(12/12 차가운 선택 분기 포함)
  - **어색한 사이 (`awkward`):** `hearts <= 6` (0~6)

## 실행 모드와 캐릭터 자산

- **기본 학생 모드 (`/festival-romance.html`):** 처음 온 학생은 `새 이야기 시작`(이름·하루 성별)으로만 시작(진행 기록이 생기면 챕터 카드·이어하기 표시), 순차 챕터 해금(1장 완료 시 2장 해금, 2장 완료 시 3장 해금), 이전 버튼·← 키는 대사 한 줄씩(첫 줄에서는 이전 장면) 되돌아가며 하트 기록은 바뀌지 않음, 목차(`#contents-button`)·교사 도구(`#teaching-tools`)·설정 내 교사 옵션 숨김, `localStorage` 키 `festival-romance.game.v2` 저장, 이미 본 장면(`seenScenes`)에 대한 `이미 본 대사 건너뛰기` 지원.
- **교사 모드 (`?mode=teacher`):** 전체 챕터 즉시 해금, 목차·교사 메모·간결 대화·엔딩 미리보기 패널 활성화.
- **임베드 모드 (`?embed=1`):** `body`와 `#stage`에 `data-embed="true"` 적용, `#fullscreen` 숨김, `createMemoryStorage` 사용으로 `localStorage` 접근 0회, `parent.postMessage`(`festival:init`, `festival:state`, `festival:complete`) 브리지 제공(메인 앱 연동은 Phase 5 예정).
- **하루 말투:** 하루의 감정 대사는 `text: { boy, girl }`로 성별마다 조금 다르게 쓰고(문장 끝·감탄사 정도), CS 설명·앱 화면·내레이션·주인공 대사는 공통입니다. 학생 화면에는 파이썬 코드를 쓰지 않습니다(엔트리 블록 표현만).
- **캐릭터 스프라이트:** 현재 번들은 [haru-boy-v15.png](assets/haru-boy-v15.png)와 [haru-girl-v15.png](assets/haru-girl-v15.png)(`1536×2048` 3×2, `FESTIVAL_SPRITE_ROWS: { boy: 2, girl: 2 }`)를 씁니다. 위 행 미소·수줍음·환한 웃음, 아래 행 놀람·곤란·장난기입니다. 미소 칸은 v13 바탕 그대로이고 나머지 5칸은 미소 칸을 레퍼런스로 표정마다 전신을 새로 그려 위치만 맞췄습니다(얼굴 합성 없음). 1행 시트(`1536×1024`)를 넣으면 `build.cjs`가 `rows: 1`로 감지해 3표정을 6칸에 나눠 씁니다.

- **보존된 원본 자료의 검증 기준:** V1 3차시 27장면 도입 수업(`/festival-lesson.html`) 검수 이력은 [제작·검수 기록](제작-검수-기록.md)에 보존되어 있으며, v2 개편 검증·남은 작업은 [HANDOFF.md](HANDOFF.md)에 있습니다.

## 빌드·테스트·QA 명령

```powershell
# 1. 단일 HTML 번들 빌드 (dist/festival-romance.html, public/festival-romance.html, qa/build-manifest.json)
node teaching-materials/festival-romance/build.cjs

# 2. 단위·번들·서사·회귀 테스트
node --test teaching-materials/festival-romance/tests/*.test.cjs

# 3. Playwright 브라우저 E2E 및 반응형·엔딩·임베드 QA
node teaching-materials/festival-romance/qa/browser.cjs

# 4. 복습 앱 주요 시뮬레이터·모션 옵션 QA
node teaching-materials/festival-romance/qa/playback-app.cjs

# 5. 학생 테스터(사람·AI)용 검토 자료: 전체 대본(남녀 대사·활동·힌트)과 활동 캡처 → qa-results/student-review/
node teaching-materials/festival-romance/qa/student-review-pack.cjs
```

QA 스크린샷과 리포트 JSON은 `teaching-materials/festival-romance/qa-results/`(Git 제외)에 생성됩니다.
