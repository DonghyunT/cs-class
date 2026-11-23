# 페스티벌 로맨스 (`festival-romance`) 인수인계

갱신: 2026-11-23(Asia/Seoul) · 브랜치 `feat/festival-prologue`

## 1. 현재 작업 상태

- **프롤로그와 장면 배경 추가 (11/23):** 이야기가 바로 버그 제보로 시작해 몰입이 약하다는 교사 의견에 따라 도입 장면과 그림 4장을 더했습니다.
  - **프롤로그 `ch1-0`:** 1장 맨 앞에 문항 없는 이야기 장면(대사 8줄, 약 50초)을 넣었습니다. 축제 전날 오후 정보실에서 혼자 앱을 고치는 하루를 보고, 말은 못 걸고 포스터 QR만 찍어 둡니다. 하루 첫 대사 전에는 캐릭터를 숨겼다가 등장시키고(`entrance`), 그 줄에 이름표(`nameplate`), 마지막 줄에 포스터 소품(`poster`)을 띄웁니다.
  - **기존 장면과 연결:** 1장 요약(`recap`)에서 버그 제보 내용을 빼 프롤로그 앞에서 미리 알려 주지 않게 했고, `ch1-1` 첫 줄을 "낮에 찍어 둔 QR이 생각나 가입했다"로 바꿨습니다. 하루의 "우리 반 {{name}} 맞지?"와 "정보 시간에 네가 제일 깔끔하게 하던데"는 그대로 두어 낮 장면의 복선을 받습니다.
  - **장면 전용 배경 3종:** `lab`(프롤로그 정보실), `rain`(`ch2-4`·`ch2-5` 소나기 교정), `lit`(`ch3-7` 점등 뒤 밤 운동장). `background()`가 기존 세 톤(`day`·`night`·`dusk`)의 글자·그늘 규칙을 빌려 씁니다. 제작 기록은 [image-generation-notes.md](image-generation-notes.md)에 있습니다.
  - **용량:** 그림 4장(WebP 합계 약 465KB)을 넣어 번들이 `1,983,602` → `2,609,374` bytes(약 2.6MB)가 됐습니다.
  - **학생 테스터 검토 루프:** 읽기 전용 학생 테스터가 대본([student-review-pack.cjs](qa/student-review-pack.cjs), 대사별 표정·분기 조건 포함)과 화면 캡처를 6라운드 검토했습니다(Codex `gpt-6.2-sol` 7명 × 3라운드, Codex 한도 소진 뒤 Opus 5명 × 3라운드). 판정 기준은 '심각·중요 지적 0건이면 만족'이고, 6라운드에서 5명 모두 만족했습니다. 그 뒤 사소한 지적 일부와 직접 검토에서 찾은 낡은 설명을 더 고쳤습니다.
    - **질문·해설:** 12문항의 굵은 질문이 채점 범위와 같아지게 고쳤습니다(예: 경품 순서는 10·5·3장 모두, 드론은 '고른 도형을 딱 한 바퀴에'). 비교·AND·NOT 문항은 정답 낱말 없이 무엇을 확인하는지 보이게 했고(`쉬는 시간에도, 티켓이 모자랄 때도 닫히게`, `비 오는 날은 실내, 그 밖엔 야외`), AND 문항 오답 하나를 '조건을 잘못 넣은 ~이고' 카드로 바꿔 정답만 '~거나'가 없는 상황을 없앴습니다. 틀린 해설(암호 반복 오답, 드론 '닫혀요', 카운터 '정하기')과 결과 미리보기를 실제 동작에 맞췄습니다.
    - **이야기·표정:** 엔딩 배경에 맞춰 '노을' 표현을 밤으로, `아까 점심땐`을 `아까 벤치에선`으로, 하루의 부스 근무를 3시 반까지로 고쳤습니다. 경품은 '큰 키링 한 쌍'으로 통일했고, 서 있는 자세로 보일 수 없는 손 흔들기 서술을 뺐습니다. 표정 8곳을 대사에 맞췄고 `ch1-1`도 하루 첫 대사에서 등장합니다.
    - **선을 그은 경로:** `ch3-4`·`ch3-6` 대사와 하트가 적은 엔딩에 cold 전용 줄을 더했고, 리포트 안내를 '선을 그은 장을 처음부터 다시 해 마음 선택을 모두 바꾸면'으로 통일했습니다. 조건 대사는 `S.hasColdBefore`로 지금 장면보다 앞의 선택만 봅니다(엔딩 뒤 장을 다시 할 때 아직 다시 고르지 않은 답이 앞 대사에 반영되던 문제). 7~10하트 cold 찐친 엔딩은 본 대사 기록 키를 따로 씁니다.
    - **화면:** 개막 조명이 20개 넘게 깜빡일 때 마지막 숫자를 실제 횟수로, 숫자 문항 안내를 '칸에 바로 적거나 −/+로'로 바꿨습니다. 엔딩 도형 불빛은 제목 카드 뒤에서 밤하늘로 옮기고 윤곽만 빛나게 했습니다.
    - **받아들이지 않은 제안:** 문항 단계·코드 줄을 늘리는 제안, 정답 보기 길이 균형(오답 평균의 ±25%)을 깨는 문구, 정답을 알려 주는 단말기 문구, 취향 수준의 말투 변경.
- **학생용 CS 복습 게임 개선 (11/23):** 다각도 플레이테스트·문항 감사·UX/기술 점검을 바탕으로 다음을 개선했습니다.
  - **용량 88.5% 경량화:** 6개 자산의 WebP 변환본([haru-boy-v15.webp](assets/haru-boy-v15.webp) 등, 원본 PNG 보존)과 `build.cjs` PNG/WebP 크기 감지를 적용해 번들을 `17,241,141` bytes → `1,979,921` bytes(~1.9MB)로 줄였습니다.
  - **문항·오답·버그 보강:** `ch3-q1` `observe`의 `(2 × 2 = 4번)` 오류를 고치고 2번씩 깜빡이는 묶음(`blinksPerCycle: 2`, 4번 반복 = 8번)으로 업그레이드했으며, `ch1-q2`·`ch1-q4`·`ch2-q1`~`q3`·`ch3-q3`·`ch3-q4`의 허수아비 보기를 실제 오개념 보기로 교체하고 `ch1-q3`·`ch2-q1`·`ch3-q4`에 결과 미니 시각화를 더했습니다. `renderers.number`의 `08`/`8.0` 비교·증감 버튼 소수점 버그와 0하트 장 재진입 덮어쓰기 버그도 고쳤습니다.
  - **게임성·포용성·재도전 개선:** `썸 시작` 기준을 `11/12` 이상으로 완화(`12/12`는 `✨ 퍼펙트 12/12` 배지), `awkward` 엔딩을 `다시 맞출 콤비 💪`로 순화, `ch3-6`에 2장 `cold` 이어받기 추가, 장 완료·엔딩 리포트에서 **놓친 문항만 1개씩 바로 재도전**(`startSingleQuestionRetry`) 지원, 1~3장 핵심 개념 11카드를 접이식 정리로 통합, 대화창 클릭 진행·Web Audio 효과음(설정 토글)·모바일 배지/아바타·임베드 제출 배지를 반영했습니다.
  - **실전 QA 후속 다듬기 (P1·P2 반영):** `[data-experiment]` 오타와 `ArrowLeft` 퀴즈 이탈 방지, 대화 `Enter` 진행, 엔딩 리포트 도형 불빛 색상 우선순위, 단일 문항 재도전(`singleRetry`) 새로고침 유지, `#heart-delta` 장면 전환 정리, `ch3-q1` 재도전 대사(`4번 반복으로 8번 깜빡임`)·`ch3-q2` 최대값(`359`)·`ch3-q4` 교사 해설·`ch1-q2`/`ch1-q4` 오답 문구 교정, 비숫자 입력 안내 토스트, 모바일 44px 터치 영역·태블릿 여백·`work-details.tsx` 리포트 여백까지 다듬었습니다.
- **교사용 도입 수업 원본 보존:** [dist/festival-lesson.html](dist/festival-lesson.html) · [public/festival-lesson.html](../../public/festival-lesson.html) (기존 3차시 27장면)은 `build.cjs`와 분리해 바이트 단위로 그대로 유지했습니다.

## 2. 번들 산출물 및 검증 기록

- **산출물 무결성 ([qa/build-manifest.json](qa/build-manifest.json)):**
  - `public/festival-romance.html` ≡ `dist/festival-romance.html`: `2,609,374` bytes, SHA-256 `a8bd212cc8f5c5b5c125ff264994b9ca462e5b273544569ffeddf98e40628adf`
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
