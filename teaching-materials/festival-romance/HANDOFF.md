# 페스티벌 로맨스 (`festival-romance`) 인수인계

갱신: 2026-11-23(Asia/Seoul) · 브랜치 `feat/improve-festival-review`

## 1. 현재 작업 상태

- **학생용 CS 복습 게임 개선 (11/23):** 다각도 플레이테스트·문항 감사·UX/기술 점검을 바탕으로 다음을 개선했습니다.
  - **용량 88.5% 경량화:** 6개 자산의 WebP 변환본([haru-boy-v15.webp](assets/haru-boy-v15.webp) 등, 원본 PNG 보존)과 `build.cjs` PNG/WebP 크기 감지를 적용해 번들을 `17,241,141` bytes → `1,979,921` bytes(~1.9MB)로 줄였습니다.
  - **문항·오답·버그 보강:** `ch3-q1` `observe`의 `(2 × 2 = 4번)` 오류를 고치고 2번씩 깜빡이는 묶음(`blinksPerCycle: 2`, 4번 반복 = 8번)으로 업그레이드했으며, `ch1-q2`·`ch1-q4`·`ch2-q1`~`q3`·`ch3-q3`·`ch3-q4`의 허수아비 보기를 실제 오개념 보기로 교체하고 `ch1-q3`·`ch2-q1`·`ch3-q4`에 결과 미니 시각화를 더했습니다. `renderers.number`의 `08`/`8.0` 비교·증감 버튼 소수점 버그와 0하트 장 재진입 덮어쓰기 버그도 고쳤습니다.
  - **게임성·포용성·재도전 개선:** `썸 시작` 기준을 `11/12` 이상으로 완화(`12/12`는 `✨ 퍼펙트 12/12` 배지), `awkward` 엔딩을 `다시 맞출 콤비 💪`로 순화, `ch3-6`에 2장 `cold` 이어받기 추가, 장 완료·엔딩 리포트에서 **놓친 문항만 1개씩 바로 재도전**(`startSingleQuestionRetry`) 지원, 1~3장 핵심 개념 11카드를 접이식 정리로 통합, 대화창 클릭 진행·Web Audio 효과음(설정 토글)·모바일 배지/아바타·임베드 제출 배지를 반영했습니다.
  - **실전 QA 후속 다듬기 (P1·P2 반영):** `[data-experiment]` 오타와 `ArrowLeft` 퀴즈 이탈 방지, 대화 `Enter` 진행, 엔딩 리포트 도형 불빛 색상 우선순위, 단일 문항 재도전(`singleRetry`) 새로고침 유지, `#heart-delta` 장면 전환 정리, `ch3-q1` 재도전 대사(`4번 반복으로 8번 깜빡임`)·`ch3-q2` 최대값(`359`)·`ch3-q4` 교사 해설·`ch1-q2`/`ch1-q4` 오답 문구 교정, 비숫자 입력 안내 토스트, 모바일 44px 터치 영역·태블릿 여백·`work-details.tsx` 리포트 여백까지 다듬었습니다.
- **교사용 도입 수업 원본 보존:** [dist/festival-lesson.html](dist/festival-lesson.html) · [public/festival-lesson.html](../../public/festival-lesson.html) (기존 3차시 27장면)은 `build.cjs`와 분리해 바이트 단위로 그대로 유지했습니다.

## 2. 번들 산출물 및 검증 기록

- **산출물 무결성 ([qa/build-manifest.json](qa/build-manifest.json)):**
  - `public/festival-romance.html` ≡ `dist/festival-romance.html`: `1,983,602` bytes, SHA-256 `636eb431976c7ebaedacbc2d42d99260bb0166e888af5f8822bb41e2ca8c6688`
  - `public/festival-lesson.html` ≡ `dist/festival-lesson.html`: SHA-256 `8f73962cd5f71fad24e6eb001d60af2c705944e65e7b19b8de61213106c4430b5` (원본 27장면 불변)
- **단위·패키지·서사·상태 테스트 (`node --test teaching-materials/festival-romance/tests/*.test.cjs`):** 60/60 통과 (`models` 14, `state` 10, `package` 3, `journey` 7, `refinement` 26)
- **Playwright 브라우저 QA (`node teaching-materials/festival-romance/qa/browser.cjs`):** 10항목 통과 (`errors: []`, `consoleErrors: []`, `remoteRequests: 0`, 단일 문항 재도전·`08`/`8.0` 잠금·대화창 클릭·`다시 맞출 콤비` 엔딩·임베드·모바일 스크린샷 검수 포함)
- **Playwright 재생 QA (`node teaching-materials/festival-romance/qa/playback-app.cjs`):** 4항목 통과 (`errors: []`, `consoleErrors: []`, `remoteRequests: 0`)

## 3. 다음에 이어갈 작업

1. **현장 확인:** 크롬북에서 학교 와이파이로 경량화된 번들(약 1.9MB) 첫 로딩·캐시와 실기기 터치 조작·효과음을 확인합니다.
2. **향후 선택 개선(미착수):** `friendly` 선택지 + 고득점 시 연애 대신 협업/우정 전용 엔딩 분리, 학급 전체 문항별 오답 집계, 장 중간 진행의 새로고침 복원.

## 4. 자주 쓰는 실행 명령

저장소를 최신으로 받은 뒤([개발 안내 §1.5](../../docs/DEVELOPMENT.md#15-다른-pc에서-진행-중-작업-이어가기)) 이 자료는 아래 명령으로 빌드·검사합니다.

```powershell
node teaching-materials/festival-romance/build.cjs
node --test teaching-materials/festival-romance/tests/*.test.cjs
node teaching-materials/festival-romance/qa/browser.cjs
node teaching-materials/festival-romance/qa/playback-app.cjs
```
