# 페스티벌 로맨스 (`festival-romance`) 인수인계

갱신: 2026-11-15(Asia/Seoul) · 브랜치: `feat/festival-character-v7`

## 1. 현재 작업 상태

- **학생용 CS 복습 게임 개편(Phase 2~4 반영·검증 완료):** [dist/festival-romance.html](dist/festival-romance.html) · [public/festival-romance.html](../../public/festival-romance.html)을 3개 챕터·22장면·12문항(`ch1-q1`~`ch3-q4`)·3갈래 엔딩(`썸 시작`/`찐친`/`어색한 사이`) 구조로 개편해 빌드와 테스트·Playwright QA를 통과했습니다([개편 설계안](../../docs/plans/festival-romance-review-game.md)).
- **교사용 도입 수업 원본 보존:** [dist/festival-lesson.html](dist/festival-lesson.html) · [public/festival-lesson.html](../../public/festival-lesson.html) (기존 3차시 27장면)은 `build.cjs`와 분리해 바이트 단위로 그대로 유지했습니다.
- **임시 v3 스프라이트 운용:** 현재 빌드는 [haru-boy-v3.png](assets/haru-boy-v3.png) · [haru-girl-v3.png](assets/haru-girl-v3.png) (`1536×1024`, `FESTIVAL_SPRITE_ROWS: { boy: 1, girl: 1 }`)를 `spriteCrop` 6표정 슬롯으로 매핑해 사용하며, `assets/` 내 후보 시트([haru-boy-v6.png](assets/haru-boy-v6.png), [haru-girl-v7-preview.png](assets/haru-girl-v7-preview.png), 로컬 시안 `haru-girl-v8.png`)를 바탕으로 Phase 1 최종 `1536×2048` 3×2 시트 확정 교체 대기 상태입니다.

## 2. 번들 산출물 및 검증 기록

- **산출물 무결성 ([qa/build-manifest.json](qa/build-manifest.json)):**
  - `public/festival-romance.html` ≡ `dist/festival-romance.html`: `15,167,492` bytes, SHA-256 `9ca74a575401ef2e4946219f1a6b27d31e46c5933fed9b09eedadc039d530a21`
  - `public/festival-lesson.html` ≡ `dist/festival-lesson.html`: SHA-256 `8f73962cd5f71fad24e6eb001d60af2c705944e65e7b19b8de61213106c430b5` (원본 27장면 불변, 10/19 기준 검증은 [제작·검수 기록](제작-검수-기록.md))
- **단위·패키지·서사·상태 테스트 (`node --test teaching-materials/festival-romance/tests/*.test.cjs`):** 27/27 통과
  - `models.test.cjs` (10), `state.test.cjs` (6), `package.test.cjs` (3), `journey.test.cjs` (4), `refinement.test.cjs` (4)
- **Playwright 브라우저 QA (`node teaching-materials/festival-romance/qa/browser.cjs`):** 9항목 통과 (`errors: []`, `consoleErrors: []`, `remoteRequests: 0`)
  - 학생 모드 은닉·순차 해금, 첫 시도 하트 규칙·오답 재도전 0하트·새로고침/이전버튼 치트 방지(`festival-romance.game.v2`), 12문항 완주 및 3갈래 엔딩(`11/12 찐친`, `12/12+cold 찐친`→재도전 `썸 시작`, `≤6 어색한 사이`), `이미 본 대사 건너뛰기`, 모바일 `390×844` 가로 넘침 0건, `?mode=teacher` 전 시뮬레이터 오답 힌트, `?embed=1` (`127.0.0.1` 동일 출처 HTTP 호스트에서 `postMessage` `festival:init`/`festival:state`/`festival:complete` 및 `localStorage` 0회 접근 확인), 원본 `festival-lesson.html` 27장면 무오류 로드 확인.
- **Playwright 재생 QA (`node teaching-materials/festival-romance/qa/playback-app.cjs`):** 8항목 통과 (`reducedMotion: 'reduce'` / `'no-preference'` 조명 4회·다각형 3/4/6종·일시정지/재개·내각 함정·모달 보류·장면 이탈 정리·앱 메시지 UI·`390×844`·원본 27장면 무오류 로드)
- **시각 검수(`teaching-materials/festival-romance/qa-results/`):** 데스크톱(`1366×768`) 3갈래 엔딩·퀴즈 오답·마음 선택지·임베드·교사 메모·원본 수업, 모바일(`390×844`), `expressions-v3-{boy,girl}.png` 및 `playback-*.png` 확인.
  - 경미한 시각 메모: `390px`에서 하트 획득/실패 일시 배지(`.heart-delta`)가 상단 안내 줄 위로 잠깐 겹치고, `girl` v3 슬롯 1 좌측 끝에 1px 미세 인접 프레임 경계가 보이나 최종 3×2 시트 교체 시 해소될 범위입니다.
  - `?embed=1`의 `postToParent`는 `src/app.js`가 `window.location.origin`(`!== 'null'`)을 `targetOrigin`으로 사용하므로, `file://` 직접 열기에서는 브라우저 정책상 전달되지 않고 실제 서비스와 같은 `http(s)://` 동일 출처 환경에서 동작합니다.

## 3. 다음에 이어갈 작업

1. **Phase 1 캐릭터 시트 확정:** `haru-girl-v8.png`·남학생 시안을 `1536×2048` 3×2 시트로 확정해 `haru-boy-v3.png`/`haru-girl-v3.png` 자리와 교체하고 `node teaching-materials/festival-romance/build.cjs`를 다시 실행합니다(`build.cjs`가 PNG IHDR로 `rows: 2`를 자동 반영).
2. **Phase 5 메인 앱 임베드:** `cs-class` 본 사이트 내 복습 활동에서 `/festival-romance.html?embed=1`을 iframe으로 띄우고 `festival:init`/`festival:state`/`festival:complete`와 `useWork` 수동 저장을 연동합니다.
3. **현장 확인:** 실제 학교 교실 프로젝터(교사용 `/festival-lesson.html`·`?mode=teacher`)와 학생 태블릿/크롬북(학생용 `/festival-romance.html`)에서 가독성과 터치 조작을 최종 점검합니다.

## 4. 자주 쓰는 실행 명령

저장소를 최신으로 받은 뒤([개발 안내 §1.5](../../docs/DEVELOPMENT.md#15-다른-pc에서-진행-중-작업-이어가기)) 이 자료는 아래 명령으로 빌드·검사합니다.

```powershell
node teaching-materials/festival-romance/build.cjs
node --test teaching-materials/festival-romance/tests/*.test.cjs
node teaching-materials/festival-romance/qa/browser.cjs
node teaching-materials/festival-romance/qa/playback-app.cjs
```
