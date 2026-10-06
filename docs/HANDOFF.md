# 이어갈 작업

갱신: 2026-10-07(Asia/Seoul). **현재 브랜치 `codex/student-learning-readability`; 학생 UI1~12차와 담당 문서·신규 모듈·참고 화면을 이번 커밋에 보존하며 미커밋 변경을 정리합니다. 다음 행동은 PR/CI 확인 → main 병합 → 기존 Production 배포 확인 → 최종 인계입니다.** 로컬 최종 빌드 전체178개가 단일 실행에서 통과했습니다. 선생님이 이 흐름과 실제 브라우저200%·물리 OS 한글 입력기 두 항목만 미확인으로 남기는 2번 방안을 승인했습니다.

제품 정책은 [PRD](PRD.md), 시각·조작은 [DESIGN](DESIGN.md), 실행은 [DEVELOPMENT](DEVELOPMENT.md), 서버는 [FIREBASE_SETUP](FIREBASE_SETUP.md)을 따릅니다. 앞선1~7차의 상세 이력은 [마감 전 원문](archive/cs-class/2026-10-06-student-learning-close/HANDOFF.md)과 [보존 해시](archive/cs-class/2026-10-06-student-learning-close/manifest.json)에 있습니다. 원문과 해시는 변경하지 않았습니다.

## 현재 작업 상태

| 항목 | 현재 상태 |
| --- | --- |
| Git | `origin=https://github.com/DonghyunT/cs-class.git`. 작업 브랜치는 `codex/student-learning-readability`; 재개 기준ad4699d(앱603b8ee)에8~12차를 추가했습니다. main=origin/main=b8806a5를 재확인했고 merge-base8668cb0과 main의 파일 차이는 없습니다. 신규 소스5개·합성 참고 PNG3개도 포함합니다. 강제 reset/push하지 않았습니다. |
| 범위 | 한 개념/문항 표시·자유 이동·학습 위치·기본/수동 실습 폭·LessonShell·7개 수업의 공통 배치와 추상화/순서도/프로그래밍 체험, 워크북/Entry 주변 읽기, 홈/학생 보조색을 구현했습니다. |
| 소유·경계 | `useWork` 단독 저장 소유, 수업/문항/미션 ID·서버·채점·완료 계약을 유지했습니다. 체험 초기화와 저장 답안·완료·작품은 분리합니다. 새 의존성·DB 형식·인증/규칙/환경변수 변경은 없습니다. |
| 실행 | Windows·Node24.19.0·Java21.0.12.1·Chromium·demo Auth9099/Firestore8080·localhost:3000. 최종 E2E는 `CI=1`의 `next start`와 새 합성 시드·AI/시간표 fixture입니다. 실행 후 앱/에뮬레이터는 종료됐으며 다른 PC의 demo 백업을 복원하지 않았습니다. |
| 운영 | 기존 Vercel cs-class / Firebase cs-class-f74c4 / Production b8806a5·icn1·dpl_4QmJQKVPnKuA8tS8ogkmEXqRPZiA를 확인했습니다. 이번 UI는 아직 main에 병합/공개하지 않았습니다. 운영 DB·실학생 자료·새 합성 계정·유료 Solar 호출은 변경하지 않습니다. |

## 학생 학습 화면 개선 계획 재개

[12회차 계획](reference/student-learning-readability-plan.md)은 요구와 실행 근거를, [수업 전용 틀 계획](reference/student-lesson-shell-plan.md)은 추가 설계·구현 근거를 관리합니다.

- 한 개념/한 문항을 크게 표시하며 자유 이동합니다. 선택 위치·답안·완료를 구분하고 재접속은 첫 미완료/미답변·오답에서 시작합니다. 체험 초기화는 답안·완료를 지우지 않습니다.
- 학생 수업은 LessonShell, 대시보드·열린 수업·교사는 AppShell입니다. 나가기·제목·저장·학생 메뉴·단계 탐색을 모으고 낮거나 좁은 창에서는 일반 흐름으로 읽습니다.
- 실습은 기본 폭으로 진입합니다. 수동 넓게 보기는 같은 수업의 단계/미션에서 유지하며 새로고침·다른 수업은 기본입니다. 같은 Entry iframe·편집기·작품을 유지합니다.
- 추상화는 남길 이유·동일5역/4연결의 두 지도·상태/조건/목표·펼치는 작은 단계, 순서도는 실제 기호·150cm 경계·틀림의 입력 복귀와 맞음의 종료를 제공합니다. 프로그래밍은 관찰 질문·큰 표시·초기화를 추가하고 두 체험의 말풍선 결과를 분리했습니다.
- 워크북 입력과 도움·결과를 가깝게 두고 순서도 캔버스의 공간을 늘렸습니다. 크기 전환은 초기 시작 기호와 사용자가 옮긴 위치를 구분해 보존합니다. 실제 Entry는1000px/660px(700px 이하620px)을 유지합니다. 홈·학생 안내에 warm 토큰을 소량 쓰고 파랑 주요 조작과 역할/오류 색은 유지합니다.

## 검증과 검토 자료

**10/7 이 PC의 실제 새 검사입니다. 이전603b8ee 결과를 이번 검증으로 세지 않습니다.** 최종 앱 소스 변경은00:43:16 KST이며 이후 두 탭 검사의 대기만 보강했습니다. 아래 최종 전체는 같은 최종 프로덕션 빌드에서 실행했습니다.

| 검사 | 결과·한계 |
| --- | --- |
| 정적·빌드·순수 | 최종 앱 lint/typecheck/Next16.3.6 build 통과. 검사 보강 후 전체 lint/typecheck도 통과. 변경 없는 엔진/AI/반 계획 순수12개는 이번 실행 중 통과했습니다. |
| 단원·Entry 영향 | 추상화 새3개+기존5개, 순서도9개와 출력 기호/조건 경계, 프로그래밍 공개/새 체험, 실제 Entry·프로그래밍·작업실 영향12개와 합성 IME를 확인했습니다. 팔레트 조립·입력·실행/중지/무대 복원·동일 iframe·미완성 초안·저장503/409 보존을 포함합니다. |
| 첫 전체·앱 수정 | 178개 중177개/1실패(11.0분). 390px 시작 기호의 스크롤/크기 전환 문제를 재현·수정하고 두 파일14개를 연속 재검증했습니다(1.3분). 원래 범위 조건·수동 wheel/pan·편집 초점·작품/저장을 유지했습니다. |
| 두 번째 전체·검사 수정 | 178개 중177개/1실패(10.8분). 두 탭 충돌 검사가 이전 저장 표시를 읽어 요청을 겹치게 한 원인을 trace의 요청/응답·버전·멱등 저장으로 확인했습니다. 응답 답안·revision 증가를 기다리도록 검사만 고쳤으며 기존 충돌/보존/해결 조건·앱/서버는 유지했습니다. 해당 파일4개 통과(30.1초). |
| 최종 전체 | `CI=1 npm.cmd run test:e2e`, 새 demo·프로덕션 빌드에서 **178/178 단일 실행 통과(10.6분)**. 두 실패를 합쳐 통과로 세거나 검사 조건을 낮추지 않았습니다. |
| 시각·독립 리뷰·문서 | 공개 홈/pc0~pc3의12개 크기 조합과 단원/대시보드 실제 캡처·좁은 창·키보드·콘솔을 확인했습니다. warm 글자5.04:1·새 기호 경계3:1 이상. 전체 diff/새 모듈·두 후속 수정의 독립 리뷰에 남은P1/P2가 없습니다. 문서 링크179개·diff 검사 통과, 보관 원문 해시 동일입니다. |

결과 원본은 Git 제외 `scratch/round8-*`, `round9-*`, `round10-*`, `readability-built-public-20261007`, `readability-full-first-failure-20261007`, `readability-full-second-failure-20261007`와 최종 `test-results/`입니다. 다른 PC에 필요한 [8~12차 대표 PNG3장](reference/student-learning-readability-plan.md#812차-구현의-합성-검토-화면)은 Git에 포함합니다. 합성 캡처·자동 검사는 실제 학생 이해도 개선의 증거가 아닙니다.

## 다음에 이어갈 작업

1. 현재 검증한 소스/문서를 커밋하고 원격 main을 보존해 병합 준비합니다. PR의 CI를 확인한 뒤 승인된 main 병합·Production 배포를 진행합니다.
2. 배포 SHA·별칭·icn1·익명 session/권한·로그인 화면·이전 주소 이동을 확인하고 실제 결과로 이 문서를 마감합니다. READY나 로그인 버튼만으로 실제 Google OAuth 성공을 판정하지 않습니다.
3. 실제200%·물리 OS IME는 합의된 미확인입니다. 네이티브 조작은 자동 승인 검토가 현재 브라우저 URL을 확인하지 못해 차단했습니다. CSS zoom·합성 composition을 대체 근거로 세지 않습니다.
4. UI 공개 후 첫 실제 수업은 [첫 수업 절차](DEVELOPMENT.md#첫-실제-수업-확인-순서)의 학년도·명부·반·개별 발급부터 별도 확정합니다. 신규 Google OAuth·학교망·자연 Cron·실제 Solar 품질/예산·실학생 관찰은 별도 범위입니다.


## 다른 PC에서 이어가기

먼저 그 PC의 미커밋·미추적 변경과 현재 브랜치를 보존합니다. 현재 작업은 아래 origin 브랜치입니다. main이나 옛 이식 ZIP으로 덮어쓰지 않습니다.

```powershell
git status -sb
git fetch origin
git branch -vv
```

로컬에 작업 브랜치가 **없을 때만**:

```powershell
git switch --track -c codex/student-learning-readability origin/codex/student-learning-readability
```

이미 있을 때는 기존 변경을 보존하고 해당 브랜치로 이동한 뒤 `git merge --ff-only origin/codex/student-learning-readability`로 받습니다. 분기해 있으면 자동 reset/강제 push 대신 차이를 대조합니다. 받은 tip·README·HANDOFF·계획/참고 PNG가 있는지 확인하고, [새 PC 준비](DEVELOPMENT.md#다른-pc에서-시작)의 Node24·Java21+·EntryJS·Chromium·캐시를 준비합니다. 에뮬레이터는 실제 Firebase 키 없이 `npm.cmd ci` 후 `npm.cmd run dev:emulator`로 시작합니다. 기존 캐시를 확인하기 전에 다운로드를 반복하지 않습니다.

### 로컬 기록과 전달 경계

- **다른 PC의 마감 시점 로컬 기록:** `scratch/handoff-20261006/demo-review-backup.json`에 합성20102의 계정/목록/AI 장부/반/일정과 작품5건, 합계9개 존재 문서를 읽어 보존했습니다. `backup-demo.mjs`는 앱 설정과 demo 호스트를 확인하는 읽기 전용 보존 도구입니다. 당시 앱·기록을 되돌리거나 서버를 종료하지 않았습니다. 이번 PC에서는 이 백업이 없으며 앞선 검사 전8건/7건/4건 백업으로 최신 체험을 덮어쓰지 않습니다.
- **Git에 옮겨지는 것:** 현재 브랜치의 커밋·추적 소스·새 CSS/테스트·문서·참고 PNG입니다. 미추적 소스는 없습니다. **옮겨지지 않는 것:** `.env.local`·관리자 키·개인 도구/스킬 설정·`scratch/`·`outputs/`·node_modules·빌드/Java/브라우저/EntryJS 캐시·실행 중 에뮬레이터 기록입니다. 비밀값/계정/학생 자료는 채팅·문서·Git에 추가하지 않습니다. 동일 demo 기록이 필요하면 지정한 비공개 경로로 따로 전달하고 대상의 기존 기록을 비교한 뒤 복원합니다.
- 새 PC의 demo는 새 시드로 시작합니다. 수업을 교사 화면에서 다시 열 수 있으며, 이 PC의 공개 합성20102 준비 상태가 그대로 있다고 가정하지 않습니다. 앱/에뮬레이터 포트와 `/api/auth/config`의 projectId·호스트·fixture를 확인하고 운영 앱3000과 테스트 서버를 혼용하지 않습니다.
- 로컬 원본 복구 계획은 `scratch/review-lessons/production-full-restore-plan-release-20261005.json` 및 단계별 계획입니다. 반 설정만 복구하며 현재 revision이 다르면 거부합니다. 없는 PC에서 추측으로 재작성·적용하지 않습니다. 빈 명부 양식은 `outputs/classroom-readiness/학생명부_작성양식.xlsx`, 이전 검사 원본은 `scratch/concept-layout-20261006/`·`lesson-shell-20261006/` 등입니다.

### 새 대화에 붙일 요청문

> CS Class 작업을 이어주세요. 먼저 기존 Git 변경을 보존하고 AGENTS.md → docs/HANDOFF.md → 필요한 PRD/DESIGN/DEVELOPMENT를 읽어주세요. 원격 브랜치·최신 구현/검증/배포 상태는 HANDOFF 첫머리를 확인하고 옛 계획의 미착수 상태로 되돌리지 마세요. 학생 UI1~12차·선생님 피드백·LessonShell·공통 개념 배치의 근거는 두 계획서에 있습니다. 단일 useWork의 저장 소유, 답안/완료/체험 분리, 수동 폭과 실제 Entry iframe 유지 계약을 보존해주세요. 실제200%·물리 OS IME는 합의된 미확인 항목입니다. 로컬 AI는 fixture이며 demo 기록·비밀 설정·캐시는 PC별이므로 환경과 기존 기록부터 확인해주세요. 다음 운영 자료 변경은 제가 요청하는 범위로 진행해주세요.

## 통합·배포 상태

**아래는10/3~10/5의 과거 운영 확인입니다. 이번 마감에서 운영 상태를 다시 조회하지 않았습니다.** [운영 사이트](https://cs-class-donghyunt.vercel.app), Firebase `cs-class-f74c4`, Vercel `cs-class`입니다. 학생 UI 작업 브랜치는 main에 미병합입니다.

- 함수 지역 조정은 [PR25](https://github.com/DonghyunT/cs-class/pull/25)의 `986bf56` → main `eacb020`이며 함수 `icn1`·DB `asia-northeast3`, 뒤 문서 배포의 SHA/별칭·익명 API·로그인 화면 확인은 [당시 기록](archive/cs-class/2026-10-06-student-learning-close/HANDOFF.md#105-서버-함수-지역-조정)에 있습니다. 실제 신규 Google OAuth/학교망 검증과 구분합니다.

### 10/5 원작 실습 UI 복원 공개

`12b00e7` → PR23 → main `448d61f`의 원작 실습 표현·검증/운영 확인은 [당시 기록](archive/cs-class/2026-10-06-student-learning-close/HANDOFF.md#105-원작-실습-ui-복원-공개)에 있습니다. 이번 학생 UI 작업의 배포 근거가 아닙니다.

### 10/5 세 복습 운영 공개

`9ac8142` → PR21 → main `6bad59b`,11반의 세 선택 복습 공개·반 설정 보존·TTL ACTIVE 확인은 [당시 기록](archive/cs-class/2026-10-06-student-learning-close/HANDOFF.md#105-세-복습-운영-공개)에 있습니다. 수업별 실제 Solar 품질·오판은 [실행 장부](reference/algorithm-review-integration.md#실행-장부)를 따릅니다. 같은 운영 시험을 반복하라는 승인이 아닙니다.

### 10/4 실제 수업·시간표 운영 릴리스

PR18의 프로그래밍13·명부 도구·시간표, 인증된 갱신/플랫폼 수동 Run200과 자연 Cron 미확인은 [당시 기록](archive/cs-class/2026-10-06-student-learning-close/HANDOFF.md#104-실제-수업시간표-운영-릴리스)에 있습니다. 자연 예약은 실제 로그와 `checkedAt`을 다음 점검에서 확인합니다.

### 10/3 운영 테스트 계정 발급

승인된 학생11개·교사1개 일회 발급은 [당시 기록](archive/cs-class/2026-10-06-student-learning-close/HANDOFF.md#103-운영-테스트-계정-발급)을 따릅니다. 발급 원문은 비공개이며 이 승인을 신규 운영 계정/반복 시드로 확대하지 않습니다.

## 교실 입장·대시보드 조회 성능

10/5 익명 `/api/auth/session` 연속6회의 미국 지역 중앙213ms → 서울 안정 측정48ms는 [당시 측정](archive/cs-class/2026-10-06-student-learning-close/HANDOFF.md#교실-입장대시보드-조회-성능)이며 배포 직후 느린 표본도 포함했습니다. 로그인된 메뉴/반 조회 개선율은 미측정입니다. 운영 로그403·Observability Plus402로 확인하지 못한 범위와 [추가 측정 절차](DEVELOPMENT.md#대시보드-성능-측정)를 구분합니다.

## 남은 한계와 다음 결정

- 실제200%·OS IME·실기기 터치·화면 읽기 음성·EntryJS 전체 블록의 접근성·실학생 이해도/피로도는 자동 검사로 입증하지 않았습니다. 신규 Google OAuth·학교망·자연 Cron도 별도 확인입니다.
- 원작 음성 입출력·픽셀 단위 동일성·범용 자유 제작은 추가하지 않았습니다. 순서도 AI의 타당한 합성 작품 오판은 교사 확인 경로로 보완하며 실제 AI 품질을 이번 fixture 검사로 입증하지 않습니다.
- 미전송 초안의 강제 종료 후 영구 복구는 보장하지 않습니다. 저장 실패·충돌·이전 제출본 보존은 [저장 정책](PRD.md#작업-저장과-통신-비용)을 따릅니다.
- 이전 Stitch/Firebase CLI 인증 폐기·재발급,9/28 의존성 중간 경고5개(운영2개), Actions/Java Action 폐기 예고는 과거 미확인 후속입니다. 이번 마감에서 새로 해결했다고 표현하지 않습니다.
