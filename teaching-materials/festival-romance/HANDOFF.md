# 페스티벌 로맨스 (`festival-romance`) 인수인계

갱신: 2026-11-24(Asia/Seoul)

## 1. 현재 작업 상태

- **진행 중 작업 없음.** 게임은 사이트의 복습 활동 `review-festival`로 공개돼 있습니다(23장면·12문항, 번들 약 2.6MB).
- **최근 반영:** #124(11/23) 프롤로그 `ch1-0`·장면 배경 3종(`lab`·`rain`·`lit`)·학생 테스터 6라운드 지적 반영, #123(11/23) 용량 경량화(17.2MB → 약 2MB)·문항과 오답 보강·놓친 문항 재도전. 세부는 각 PR 설명과 [정리 전 원문](../../docs/archive/cs-class/2026-11-24-before-docs-cleanup/festival-romance-HANDOFF.md), 그림 제작 기록은 [image-generation-notes.md](image-generation-notes.md)에 있습니다.
- **받아들이지 않기로 한 제안(다시 제안하지 않음):** 문항 단계·코드 줄을 늘리는 것, 정답 보기 길이 균형(오답 평균의 ±25%)을 깨는 문구, 정답을 알려 주는 단말기 문구, 취향 수준의 말투 변경.
- **교사용 도입 수업 원본 보존:** [dist/festival-lesson.html](dist/festival-lesson.html) · [public/festival-lesson.html](../../public/festival-lesson.html) (기존 3차시 27장면)은 `build.cjs`와 분리해 바이트 단위로 그대로 유지합니다.

## 2. 번들 산출물 및 검증 기록

- **산출물 무결성 ([qa/build-manifest.json](qa/build-manifest.json)):**
  - `public/festival-romance.html` ≡ `dist/festival-romance.html`: `2,609,220` bytes, SHA-256 `5949497096b348e5e7f5b462cf4a7dce7124c1487b45112eb9a534c60dbcf02b`
  - `public/festival-lesson.html` ≡ `dist/festival-lesson.html`: SHA-256 `8f73962cd5f71fad24e6eb001d60af2c705944e65e7b19b8de61213106c430b5` (원본 27장면 불변)
- **단위·패키지·서사·상태 테스트 (`node --test teaching-materials/festival-romance/tests/*.test.cjs`):** 61/61 통과 (`models` 14, `state` 10, `package` 3, `journey` 7, `refinement` 27)
- **Playwright 브라우저 QA (`node teaching-materials/festival-romance/qa/browser.cjs`):** 11항목 통과 (`errors: []`, `consoleErrors: []`, `remoteRequests: 0`, 프롤로그 등장 연출·밤 장면 연결, 단일 문항 재도전·`08`/`8.0` 잠금·대화창 클릭·`다시 맞출 콤비` 엔딩·임베드·모바일 스크린샷 검수 포함)
- **Playwright 재생 QA (`node teaching-materials/festival-romance/qa/playback-app.cjs`):** 4항목 통과 (`errors: []`, `consoleErrors: []`, `remoteRequests: 0`)

## 3. 다음에 이어갈 작업

1. **현장 확인:** 크롬북에서 학교 와이파이로 번들(약 2.6MB) 첫 로딩·캐시와 실기기 터치 조작·효과음을 확인합니다.
2. **향후 선택 개선(미착수):** `friendly` 선택지 + 고득점 시 연애 대신 협업/우정 전용 엔딩 분리, 학급 전체 문항별 오답 집계, 장 중간 진행의 새로고침 복원.

## 4. 자주 쓰는 실행 명령

빌드·검사 명령은 [README의 실행 명령](README.md#빌드테스트qa-명령)에 있습니다. 게임 파일을 바꾸면 위 2절의 세 검사를 모두 다시 돌리고 결과를 2절에 고쳐 적습니다.
