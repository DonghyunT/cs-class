# 페스티벌 로맨스 (`festival-romance`) 인수인계

갱신: 2026-11-23(Asia/Seoul) · 브랜치 `feat/festival-prologue`

## 1. 현재 작업 상태

- **프롤로그와 장면 배경 추가 (11/23):** 이야기가 바로 버그 제보로 시작해 몰입이 약하다는 교사 의견에 따라 도입 장면과 그림 4장을 더했습니다.
  - **프롤로그 `ch1-0`:** 1장 맨 앞에 문항 없는 이야기 장면(대사 8줄, 약 50초)을 넣었습니다. 축제 전날 오후 정보실에서 혼자 앱을 고치는 하루를 보고, 말은 못 걸고 포스터 QR만 찍어 둡니다. 하루 첫 대사 전에는 캐릭터를 숨겼다가 등장시키고(`entrance`), 그 줄에 이름표(`nameplate`), 마지막 줄에 포스터 소품(`poster`)을 띄웁니다.
  - **기존 장면과 연결:** 1장 요약(`recap`)에서 버그 제보 내용을 빼 프롤로그 앞에서 미리 알려 주지 않게 했고, `ch1-1` 첫 줄을 "낮에 찍어 둔 QR이 생각나 가입했다"로 바꿨습니다. 하루의 "우리 반 {{name}} 맞지?"와 "정보 시간에 네가 제일 깔끔하게 하던데"는 그대로 두어 낮 장면의 복선을 받습니다.
  - **장면 전용 배경 3종:** `lab`(프롤로그 정보실), `rain`(`ch2-4`·`ch2-5` 소나기 교정), `lit`(`ch3-7` 점등 뒤 밤 운동장). `background()`가 기존 세 톤(`day`·`night`·`dusk`)의 글자·그늘 규칙을 빌려 씁니다. 제작 기록은 [image-generation-notes.md](image-generation-notes.md)에 있습니다.
  - **용량:** 그림 4장(WebP 합계 약 465KB)을 넣어 번들이 `1,983,602` → `2,609,129` bytes(약 2.6MB)가 됐습니다.
- **학생용 CS 복습 게임 개선 (11/23):** 다각도 플레이테스트·문항 감사·UX/기술 점검을 바탕으로 다음을 개선했습니다.
  - **용량 88.5% 경량화:** 6개 자산의 WebP 변환본([haru-boy-v15.webp](assets/haru-boy-v15.webp) 등, 원본 PNG 보존)과 `build.cjs` PNG/WebP 크기 감지를 적용해 번들을 `17,241,141` bytes → `1,979,921` bytes(~1.9MB)로 줄였습니다.
  - **문항·오답·버그 보강:** `ch3-q1` `observe`의 `(2 × 2 = 4번)` 오류를 고치고 2번씩 깜빡이는 묶음(`blinksPerCycle: 2`, 4번 반복 = 8번)으로 업그레이드했으며, `ch1-q2`·`ch1-q4`·`ch2-q1`~`q3`·`ch3-q3`·`ch3-q4`의 허수아비 보기를 실제 오개념 보기로 교체하고 `ch1-q3`·`ch2-q1`·`ch3-q4`에 결과 미니 시각화를 더했습니다. `renderers.number`의 `08`/`8.0` 비교·증감 버튼 소수점 버그와 0하트 장 재진입 덮어쓰기 버그도 고쳤습니다.
  - **게임성·포용성·재도전 개선:** `썸 시작` 기준을 `11/12` 이상으로 완화(`12/12`는 `✨ 퍼펙트 12/12` 배지), `awkward` 엔딩을 `다시 맞출 콤비 💪`로 순화, `ch3-6`에 2장 `cold` 이어받기 추가, 장 완료·엔딩 리포트에서 **놓친 문항만 1개씩 바로 재도전**(`startSingleQuestionRetry`) 지원, 1~3장 핵심 개념 11카드를 접이식 정리로 통합, 대화창 클릭 진행·Web Audio 효과음(설정 토글)·모바일 배지/아바타·임베드 제출 배지를 반영했습니다.
  - **실전 QA 후속 다듬기 (P1·P2 반영):** `[data-experiment]` 오타와 `ArrowLeft` 퀴즈 이탈 방지, 대화 `Enter` 진행, 엔딩 리포트 도형 불빛 색상 우선순위, 단일 문항 재도전(`singleRetry`) 새로고침 유지, `#heart-delta` 장면 전환 정리, `ch3-q1` 재도전 대사(`4번 반복으로 8번 깜빡임`)·`ch3-q2` 최대값(`359`)·`ch3-q4` 교사 해설·`ch1-q2`/`ch1-q4` 오답 문구 교정, 비숫자 입력 안내 토스트, 모바일 44px 터치 영역·태블릿 여백·`work-details.tsx` 리포트 여백까지 다듬었습니다.
- **교사용 도입 수업 원본 보존:** [dist/festival-lesson.html](dist/festival-lesson.html) · [public/festival-lesson.html](../../public/festival-lesson.html) (기존 3차시 27장면)은 `build.cjs`와 분리해 바이트 단위로 그대로 유지했습니다.

## 2. 번들 산출물 및 검증 기록

- **산출물 무결성 ([qa/build-manifest.json](qa/build-manifest.json)):**
  - `public/festival-romance.html` ≡ `dist/festival-romance.html`: `2,609,129` bytes, SHA-256 `aed94fdfeb89ce96ff6d4b040210f9f904bca4b772d820092e3b95a1f11a7316`
  - `public/festival-lesson.html` ≡ `dist/festival-lesson.html`: SHA-256 `8f73962cd5f71fad24e6eb001d60af2c705944e65e7b19b8de61213106c4430b5` (원본 27장면 불변)
- **단위·패키지·서사·상태 테스트 (`node --test teaching-materials/festival-romance/tests/*.test.cjs`):** 61/61 통과 (`models` 14, `state` 10, `package` 3, `journey` 7, `refinement` 27)
- **Playwright 브라우저 QA (`node teaching-materials/festival-romance/qa/browser.cjs`):** 11항목 통과 (`errors: []`, `consoleErrors: []`, `remoteRequests: 0`, 프롤로그 등장 연출·밤 장면 연결, 단일 문항 재도전·`08`/`8.0` 잠금·대화창 클릭·`다시 맞출 콤비` 엔딩·임베드·모바일 스크린샷 검수 포함)
- **Playwright 재생 QA (`node teaching-materials/festival-romance/qa/playback-app.cjs`):** 4항목 통과 (`errors: []`, `consoleErrors: []`, `remoteRequests: 0`)

## 3. 다음에 이어갈 작업

1. **현장 확인:** 크롬북에서 학교 와이파이로 번들(약 2.6MB) 첫 로딩·캐시와 실기기 터치 조작·효과음을 확인합니다.
2. **향후 선택 개선(미착수):** `friendly` 선택지 + 고득점 시 연애 대신 협업/우정 전용 엔딩 분리, 학급 전체 문항별 오답 집계, 장 중간 진행의 새로고침 복원.

## 4. 자주 쓰는 실행 명령

저장소를 최신으로 받은 뒤([개발 안내 §1.5](../../docs/DEVELOPMENT.md#15-다른-pc에서-진행-중-작업-이어가기)) 이 자료는 아래 명령으로 빌드·검사합니다.

```powershell
node teaching-materials/festival-romance/build.cjs
node --test teaching-materials/festival-romance/tests/*.test.cjs
node teaching-materials/festival-romance/qa/browser.cjs
node teaching-materials/festival-romance/qa/playback-app.cjs
```
