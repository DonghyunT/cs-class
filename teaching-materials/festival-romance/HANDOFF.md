# 페스티벌 로맨스 (`festival-romance`) 인수인계

갱신: 2026-11-15(Asia/Seoul) · 브랜치: `feat/festival-character-v7`

## 1. 현재 작업 상태

- **학생용 CS 복습 게임 개편(Phase 2~4 반영·검증 완료):** [dist/festival-romance.html](dist/festival-romance.html) · [public/festival-romance.html](../../public/festival-romance.html)을 3개 챕터·22장면·12문항(`ch1-q1`~`ch3-q4`)·3갈래 엔딩(`썸 시작`/`찐친`/`어색한 사이`) 구조로 개편해 빌드와 테스트·Playwright QA를 통과했습니다([개편 설계안](../../docs/plans/festival-romance-review-game.md)).
- **v3 개편(1~3장 반영):** [구현 계획](../../docs/plans/festival-romance-v3.md)의 엔진 기반과 1장을 사용자가 확인한 뒤, 학생 테스터 10명(Haiku max) 검토 루프를 3회 돌려 2·3장까지 고쳤습니다. 평균 점수는 1차 → 3차에 개연성 2.5→3.6, 활동 적절성 3.1→3.8, 재미 3.5→3.4, 복습 3.2→4.0이고 치명 지적은 0건입니다(10명 모두 아직 SATISFIED는 아님). 고치기 전 실행은 하트에 반영하지 않는 '버그 재현', 하루 대사 남녀 두 가지(3장 모두), 마음 선택지에 친근한 세 번째 답, 2장에서 선을 그으면 3장 일부 대사가 달라짐(`when: cold|warm`). 남은 결정은 아래 다음 작업 1번입니다.
- **교사용 도입 수업 원본 보존:** [dist/festival-lesson.html](dist/festival-lesson.html) · [public/festival-lesson.html](../../public/festival-lesson.html) (기존 3차시 27장면)은 `build.cjs`와 분리해 바이트 단위로 그대로 유지했습니다.
- **캐릭터 시트 v13 적용:** 현재 빌드는 [haru-boy-v13.png](assets/haru-boy-v13.png) · [haru-girl-v13.png](assets/haru-girl-v13.png)(`1536×2048` 3×2, `FESTIVAL_SPRITE_ROWS: { boy: 2, girl: 2 }`)를 씁니다. v3의 세 인물을 칸 경계에 닿지 않게 분리하고(이웃 칸 조각이 비치던 문제 해소, 인물 88% 축소), Codex 내장 imagegen으로 놀람(3)·머쓱함(4) 표정을 더했습니다. 장난기(5)는 환한 웃음 복사본입니다. 제작 기록은 [이미지 제작 기록](image-generation-notes.md#겹침-분리표정-추가-v13-2026-11-15)에 있습니다.

## 2. 번들 산출물 및 검증 기록

- **산출물 무결성 ([qa/build-manifest.json](qa/build-manifest.json)):**
  - `public/festival-romance.html` ≡ `dist/festival-romance.html`: `12,553,132` bytes, SHA-256 `f8b59e74f5fc83daafb74a7dcf2886072209f2b9e59295f1ef0488c7f5cdfbcc`
  - `public/festival-lesson.html` ≡ `dist/festival-lesson.html`: SHA-256 `8f73962cd5f71fad24e6eb001d60af2c705944e65e7b19b8de61213106c430b5` (원본 27장면 불변, 10/19 기준 검증은 [제작·검수 기록](제작-검수-기록.md))
- **단위·패키지·서사·상태 테스트 (`node --test teaching-materials/festival-romance/tests/*.test.cjs`):** 49/49 통과
  - `models.test.cjs` (14), `state.test.cjs` (7), `package.test.cjs` (3), `journey.test.cjs` (7), `refinement.test.cjs` (18)
  - 하트 문항 11개(`ch1-q1`~`q4`·`ch2-q1`~`q4`·`ch3-q1`~`q3`)의 미션 목표와 1장 도입 대사·인용·대화 질문은 고칠 방법 대신 목표만 말하고, 하루의 한마디는 풀기 전엔 중립 문구, 정답 뒤에 개념 요약(`observe`)을 보여 줍니다(`refinement.test.cjs`가 정답 단서 재유입을 막음). 파이썬 문자열 금지, 정답 보기 길이 오답 평균 ±25%, 대화형 문항 구조, 남녀 대사 구조도 테스트합니다.
- **Playwright 브라우저 QA (`node teaching-materials/festival-romance/qa/browser.cjs`):** 10항목 통과(재현 규칙·6장 테스트·선 그은 뒤 3장 대사 확인 포함) (`errors: []`, `consoleErrors: []`, `remoteRequests: 0`)
  - 학생 모드 은닉·순차 해금, 첫 시도 하트 규칙·오답 재도전 0하트·새로고침/이전버튼 치트 방지(`festival-romance.game.v2`), 12문항 완주 및 3갈래 엔딩(`11/12 찐친`, `12/12+cold 찐친`→재도전 `썸 시작`, `≤6 어색한 사이`), `이미 본 대사 건너뛰기`, 모바일 `390×844` 가로 넘침 0건(순서 바꾸기를 버튼만으로 완료), 새 학생 챕터 카드 숨김·예전 저장 이어하기, 대사 한 줄 이전(버튼·← 키)·응답→선택지·결과→활동 재풀이 하트 불변, 남녀 말투 전환, 2턴 대화(1턴 정답·2턴 오답 → 하트 없음, 2턴만 재도전, 초점 이동)·390px 터치 기기 키보드만으로 순서 바꾸기, 길 안내 실제 방향키·44px 버튼, 이미 푼 문항 재오답 시 기록·안내 없음, `?mode=teacher` 전 시뮬레이터 오답 힌트, `?embed=1` (`127.0.0.1` 동일 출처 HTTP 호스트에서 `postMessage` `festival:init`/`festival:state`/`festival:complete` 및 `localStorage` 0회 접근 확인), 원본 `festival-lesson.html` 27장면 무오류 로드 확인.
- **Playwright 재생 QA (`node teaching-materials/festival-romance/qa/playback-app.cjs`):** 8항목 통과 (`reducedMotion: 'reduce'` / `'no-preference'` 조명 4회·다각형 3/4/6종·일시정지/재개·내각 함정·모달 보류·장면 이탈 정리·앱 메시지 UI·`390×844`·원본 27장면 무오류 로드)
- **시각 검수(`teaching-materials/festival-romance/qa-results/`):** 데스크톱(`1366×768`) 3갈래 엔딩·퀴즈 오답·마음 선택지·임베드·교사 메모·원본 수업, 모바일(`390×844`), `expressions-v3-{boy,girl}.png` 및 `playback-*.png` 확인.
  - 경미한 시각 메모: `390px`에서 하트 획득/실패 일시 배지(`.heart-delta`)가 상단 안내 줄 위로 잠깐 겹치고, `girl` v3 슬롯 1 좌측 끝에 1px 미세 인접 프레임 경계가 보이나 최종 3×2 시트 교체 시 해소될 범위입니다.
  - `?embed=1`의 `postToParent`는 `src/app.js`가 `window.location.origin`(`!== 'null'`)을 `targetOrigin`으로 사용하므로, `file://` 직접 열기에서는 브라우저 정책상 전달되지 않고 실제 서비스와 같은 `http(s)://` 동일 출처 환경에서 동작합니다.

## 3. 다음에 이어갈 작업

1. **4차 학생 검토(선택):** 교사 결정(2026-11-15)을 반영했습니다 — 1장 6번은 1단원 개념 '숫자 대신 변수로 계산하기'(티켓 나누기, 블록 표기 바꾸기)로 교체했고, 12/12 + 친근한 답만 고른 경우는 지금처럼 썸 엔딩입니다. 새 1장 6번은 학생 테스터가 아직 보지 않았으므로, 필요하면 `node teaching-materials/festival-romance/qa/student-review-pack.cjs`로 검토 자료를 만든 뒤 학생 테스터 검토를 한 번 더 돌립니다.
2. **캐릭터 시트:** v13(겹침 분리·놀람·머쓱함)을 적용했습니다. 장난기 표정이나 체형 보정 시안(`haru-girl-v8.png` 등)으로 바꾸려면 같은 3×2 규격으로 만들어 `build.cjs`의 파일 이름만 바꿉니다(PNG 높이로 `rows`를 자동 감지).
3. **Phase 5 메인 앱 임베드:** `cs-class` 본 사이트 내 복습 활동에서 `/festival-romance.html?embed=1`을 iframe으로 띄우고 `festival:init`/`festival:state`/`festival:complete`와 `useWork` 수동 저장을 연동합니다.
4. **현장 확인:** 실제 학교 교실 프로젝터(교사용 `/festival-lesson.html`·`?mode=teacher`)와 학생 태블릿/크롬북(학생용 `/festival-romance.html`)에서 가독성과 터치 조작을 최종 점검합니다.

## 4. 자주 쓰는 실행 명령

저장소를 최신으로 받은 뒤([개발 안내 §1.5](../../docs/DEVELOPMENT.md#15-다른-pc에서-진행-중-작업-이어가기)) 이 자료는 아래 명령으로 빌드·검사합니다.

```powershell
node teaching-materials/festival-romance/build.cjs
node --test teaching-materials/festival-romance/tests/*.test.cjs
node teaching-materials/festival-romance/qa/browser.cjs
node teaching-materials/festival-romance/qa/playback-app.cjs
```
