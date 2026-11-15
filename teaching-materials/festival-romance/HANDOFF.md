# 페스티벌 로맨스 (`festival-romance`) 인수인계

갱신: 2026-11-16(Asia/Seoul) · 게임은 `main`에 반영(#120), 복습 활동 임베드는 `feat/festival-embed` PR(병합 전)

## 1. 현재 작업 상태

- **학생용 CS 복습 게임 개편(Phase 2~5 완료):** [dist/festival-romance.html](dist/festival-romance.html) · [public/festival-romance.html](../../public/festival-romance.html)을 3개 챕터·22장면·12문항(`ch1-q1`~`ch3-q4`)·3갈래 엔딩(`썸 시작`/`찐친`/`어색한 사이`) 구조로 개편해 빌드와 테스트·Playwright QA를 통과했습니다([개편 설계안](../../docs/archive/cs-class/2026-11-15-completed-plans/festival-romance-review-game.md)).
- **v3 개편(1~3장 반영):** [구현 계획](../../docs/archive/cs-class/2026-11-15-completed-plans/festival-romance-v3.md)의 엔진 기반과 1장을 사용자가 확인한 뒤, 학생 테스터 10명(Haiku max) 검토 루프를 3회 돌려 2·3장까지 고쳤습니다. 평균 점수는 1차 → 3차에 개연성 2.5→3.6, 활동 적절성 3.1→3.8, 재미 3.5→3.4, 복습 3.2→4.0이고 치명 지적은 0건입니다(10명 모두 아직 SATISFIED는 아님). 고치기 전 실행은 하트에 반영하지 않는 '버그 재현', 하루 대사 남녀 두 가지(3장 모두), 마음 선택지에 친근한 세 번째 답, 2장에서 선을 그으면 3장 일부 대사가 달라짐(`when: cold|warm`). 교사가 직접 해 본 뒤(2026-11-15) 문제가 길고 현학적이라는 지적에 따라 12문항을 모두 한 번의 선택이나 짧은 조작(약 30~60초, 미션 60자 이하·대화 1턴·블록 4줄·바꿀 블록 1개)으로 줄였고, 장별 예상 시간은 13~14분에서 약 8분이 됐습니다. 이어서 교사 피드백(문제 글씨가 작고 한눈에 안 들어옴, 드롭다운 대신 카드, "버그 N" 제목이 무서움, 3장 1번 조건이 모호함, 3장 끝 제목에 `{{shapeName}}`이 그대로 보임)에 따라 12문항을 모두 큰 카드 3장 선택형(지금 상황 → 고칠 줄 강조 코드 → 질문 → 카드, 고르면 실행 결과·이유)으로 통일하고 제목을 `EP N · …`로 바꿨습니다. 그 뒤 교사 요청으로 제어 구조 3문항(2장 4번 자판기 줄 순서 옮기기, 3장 1번 조명 반복 횟수·2번 드론 회전각 숫자 적기)은 직접 조작·단답형으로 바꾸고, 하루 대사 15줄의 표정을 v15 그림(미소·수줍음·웃음·놀람·곤란·장난기)에 맞게 다시 골랐습니다. 이어서 2·3장 조건을 "비가 오지 않으면"처럼 자연스러운 말로 바꾸고, 3장 도형 선택지를 '드론 쇼'로 맞췄으며, 단답형은 실행 과정(전구가 하나씩 켜짐·드론이 한 변씩 그림)을 보여 준 뒤 결과를 냅니다. 교사가 다시 해 보고 대체로 괜찮다고 확인해(11/15) #120으로 공개했습니다.
- **교사용 도입 수업 원본 보존:** [dist/festival-lesson.html](dist/festival-lesson.html) · [public/festival-lesson.html](../../public/festival-lesson.html) (기존 3차시 27장면)은 `build.cjs`와 분리해 바이트 단위로 그대로 유지했습니다.
- **캐릭터 시트 v15 적용:** 현재 빌드는 [haru-boy-v15.png](assets/haru-boy-v15.png) · [haru-girl-v15.png](assets/haru-girl-v15.png)(`1536×2048` 3×2, `FESTIVAL_SPRITE_ROWS: { boy: 2, girl: 2 }`)를 씁니다. 순서는 미소·수줍음·환한 웃음 / 놀람·곤란·장난기입니다. v13 표정 칸은 바탕에 얼굴 조각을 붙인 합성이라 앞머리가 끊겼고, 보정으로도 한계가 있어 교사 요청(2026-11-15)으로 미소 칸을 레퍼런스 삼아 Codex 내장 imagegen으로 표정마다 전신을 새로 그렸습니다. 미소 칸은 v13 바탕과 픽셀 동일하고, 새 5칸은 위치·크기만 맞췄습니다(합성 없음). 제작 기록은 [이미지 제작 기록](image-generation-notes.md#표정-새로-그리기-v15-2026-11-15)에 있습니다.

## 2. 번들 산출물 및 검증 기록

- **산출물 무결성 ([qa/build-manifest.json](qa/build-manifest.json)):**
  - `public/festival-romance.html` ≡ `dist/festival-romance.html`: `17,241,141` bytes, SHA-256 `20f91e23e7e721687d2609df7aefd217c2ecbbcf13ab61f35f44161c444fba2c`
  - `public/festival-lesson.html` ≡ `dist/festival-lesson.html`: SHA-256 `8f73962cd5f71fad24e6eb001d60af2c705944e65e7b19b8de61213106c430b5` (원본 27장면 불변, 10/19 기준 검증은 [제작·검수 기록](제작-검수-기록.md))
- **단위·패키지·서사·상태 테스트 (`node --test teaching-materials/festival-romance/tests/*.test.cjs`):** 55/55 통과
  - `models.test.cjs` (14), `state.test.cjs` (7), `package.test.cjs` (3), `journey.test.cjs` (7), `refinement.test.cjs` (24)
  - 하트 문항 12개의 미션 목표·도입 대사·인용·대화 질문은 고칠 방법 대신 목표만 말하고, 하루의 한마디는 풀기 전엔 중립 문구, 정답 뒤에 개념 요약(`observe`)을 보여 줍니다(`refinement.test.cjs`가 정답 단서 재유입을 막음). 카드 구조(카드 문항마다 카드 3장·정답 1개·카드마다 실행 결과·오답마다 이유, 상황 1~2줄·코드 4줄 이하)·제어 구조 조작·단답형 3문항(처음 상태가 버그, 정답이 입력 범위 안, 드론 회전각 × 변의 수 = 360)·2·3장 조건의 자연어 표기·도형 선택지의 드론 쇼 명칭, `EP N` 제목, 드롭다운·대화형 보기 없음, 제목 `{{변수}}` 치환, 파이썬 문자열 금지, 정답 보기 길이 오답 평균 ±25%, 대화형 문항 구조, 남녀 대사 구조, 문항 크기 상한(미션·개념 60자, 도입 3줄, 대화 1턴, 블록 4줄·바꿀 블록 1개, 예상 시간 1:30 이하)도 테스트합니다.
- **Playwright 브라우저 QA (`node teaching-materials/festival-romance/qa/browser.cjs`):** 10항목 통과(카드 9문항·조작·단답형 3문항 화면, 1366×768 한 화면, 틀린 시도 결과와 이유, 처음 상태 실행 잠금, 44px 버튼, 키보드만으로 카드 선택, 화면에 `{{` 없음 포함) (`errors: []`, `consoleErrors: []`, `remoteRequests: 0`)
  - 학생 모드 은닉·순차 해금, 첫 시도 하트 규칙·오답 재도전 0하트·새로고침/이전버튼 치트 방지(`festival-romance.game.v2`), 12문항 완주 및 3갈래 엔딩(`11/12 찐친`, `12/12+cold 찐친`→재도전 `썸 시작`, `≤6 어색한 사이`), `이미 본 대사 건너뛰기`, 모바일 `390×844` 가로 넘침 0건(순서 바꾸기를 버튼만으로 완료), 새 학생 챕터 카드 숨김·예전 저장 이어하기, 대사 한 줄 이전(버튼·← 키)·응답→선택지·결과→활동 재풀이 하트 불변, 남녀 말투 전환, 1턴 대화 오답 → 하트 없음·재도전, 상단 하트 표시 `1장` 표기·390px 터치 기기 키보드만으로 순서 바꾸기, 길 안내 실제 방향키·44px 버튼, 이미 푼 문항 재오답 시 기록·안내 없음, `?mode=teacher` 전 시뮬레이터 오답 힌트, `?embed=1` (부모와 게임을 서로 다른 포트(다른 출처)로 띄워 `festival:ready` → `festival:init` → `festival:state`·`festival:save-request`·`festival:chapter-complete` 전달과 `localStorage` 0회 접근 확인), 원본 `festival-lesson.html` 27장면 무오류 로드 확인.
- **Playwright 재생 QA (`node teaching-materials/festival-romance/qa/playback-app.cjs`):** 4항목 통과(원본 27장면 무오류 로드, 앱 메시지 UI·`390×844`, 움직임 줄이기 켜기·끄기 각각에서 드론 경로를 한 변씩 그린 뒤 결과 표시). 예전 조명·다각형 재생 검사 6항목은 해당 조작 화면을 바꾸며 지웠습니다.
- **시각 검수(`teaching-materials/festival-romance/qa-results/`):** 데스크톱(`1366×768`) 3갈래 엔딩·퀴즈 오답·마음 선택지·임베드·교사 메모·원본 수업, 모바일(`390×844`), `expressions-v3-{boy,girl}.png` 및 `playback-*.png` 확인.
  - 경미한 시각 메모: `390px`에서 하트 획득/실패 일시 배지(`.heart-delta`)가 상단 안내 줄 위로 잠깐 겹치고, `girl` v3 슬롯 1 좌측 끝에 1px 미세 인접 프레임 경계가 보이나 최종 3×2 시트 교체 시 해소될 범위입니다.
  - `?embed=1`의 `postToParent`는 처음 받은 `festival:init`의 `e.origin`을 대상 출처로 삼아(`'null'`이면 `'*'`) 부모가 다른 도메인이어도 전달됩니다. 그 전에는 `festival:ready`만 보냅니다.

## 3. 다음에 이어갈 작업

1. **학생 테스터 재검토(선택):** 다시 돌린다면 풀이 시간 상한(문항당 약 1분)과 카드 3장·직접 조작 형식을 지시에 넣습니다. 검토 자료는 `node teaching-materials/festival-romance/qa/student-review-pack.cjs`로 만듭니다.
2. **캐릭터 시트:** v15(표정 5개 새로 그림)를 적용했습니다. 남학생 수줍음·장난기는 소매 윤곽이 미소 칸보다 약 9~10px 넓어, 표정이 바뀔 때 소매가 살짝 움직여 보일 수 있습니다. 거슬리면 해당 칸만 같은 요청문으로 다시 그립니다(요청문은 이미지 제작 기록). 다른 시안으로 바꾸려면 같은 3×2 규격으로 만들어 `build.cjs`의 파일 이름만 바꿉니다(PNG 높이로 `rows`를 자동 감지).
3. **Phase 5 메인 앱 임베드(구현 완료, 병합 전):** [복습 활동 계획](../../docs/archive/cs-class/2026-11-16-completed-plans/festival-romance-embed.md)대로 복습 활동 `review-festival`로 넣었고 브랜치 `feat/festival-embed`의 PR에서 사용자 확인을 기다립니다. 병합 뒤에도 주소 `/festival-romance.html`로 여는 방식은 그대로 동작합니다.
4. **현장 확인:** 크롬북에서 학교 와이파이로 첫 로딩에 걸리는 시간(17MB)과 두 번째부터 캐시가 되는지(D3, 두 번째 도메인 `cs-class-sigma.vercel.app`)를 봅니다. 실제 학교 교실 프로젝터(교사용 `/festival-lesson.html`·`?mode=teacher`)와 학생 태블릿/크롬북(학생용)에서 가독성과 터치 조작도 점검합니다.

## 4. 자주 쓰는 실행 명령

저장소를 최신으로 받은 뒤([개발 안내 §1.5](../../docs/DEVELOPMENT.md#15-다른-pc에서-진행-중-작업-이어가기)) 이 자료는 아래 명령으로 빌드·검사합니다.

```powershell
node teaching-materials/festival-romance/build.cjs
node --test teaching-materials/festival-romance/tests/*.test.cjs
node teaching-materials/festival-romance/qa/browser.cjs
node teaching-materials/festival-romance/qa/playback-app.cjs
```
