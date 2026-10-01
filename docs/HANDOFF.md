# 이어갈 작업

갱신: 2026-10-01(Asia/Seoul). 현재 구현·검증·배포 상태와 다음 행동을 확인하는 시작점입니다. 정책은 [PRD](PRD.md), 표현은 [DESIGN](DESIGN.md), 실행은 [DEVELOPMENT](DEVELOPMENT.md), 서버 설정은 [FIREBASE_SETUP](FIREBASE_SETUP.md)을 따릅니다. 누적 이력은 [보관함](archive/README.md)에 있습니다.

## 현재 작업 상태

| 항목 | 확인 상태 |
| --- | --- |
| 브랜치·미커밋 | `codex/continuation-ready-20261001`, 기준 HEAD `de147cc122ec8839e4e88c78e76ee3d405827332`. 게스트·개인 할 일·로그인/Select/홈 안내와 문서 정리가 미커밋. 새 소스·검사·보관 원문도 함께 전달해야 함. 시작 전 실제 Git 상태 확인 |
| 구현 | 로컬 학생/교사 게스트, 개인 할 일의 즉시 반영·행별 대기·실패 복원, 동등한 교사 로그인 버튼, 공통 둥근 Select, 홈 안내 문구 정리 완료 |
| 검증 | 10/1 새 프로덕션 빌드·demo 에뮬레이터의 최종 전체 E2E **73개 통과**(4.8분). lint·typecheck·build 통과. 문서·보관 해시는 아래 확인 범위 참조 |
| 통합·배포 | 사용자 요청으로 이번 변경을 검증→push/PR→main 병합→Production 확인할 예정. 현재 운영 기준은 이전 `de147cc`이며 이번 UI가 운영에 반영됐다고 판단하지 않음 |
| 다음 행동 | 최종 검증과 문서 검토 후 위 릴리스를 완료하고, 최신 main을 다른 PC의 시작점으로 사용 |

### 이번 변경의 범위

- 게스트는 같은 로컬 테스트 10반을 사용하는 학생·교사 계정으로 기존 인증·세션·권한·저장을 체험합니다. 표시와 서버 요청에 동일한 환경 조건을 적용합니다. [제품 정책](PRD.md#로컬-게스트-체험), [준비·복구](DEVELOPMENT.md#로컬-게스트-입장)를 따릅니다.
- 개인 할 일의 추가·수정·완료·삭제를 즉시 보여 주고 저장 중인 행만 잠급니다. 실패 시 삭제 행은 원래 위치에 복원하며 변경 의도와 이동 보호를 유지합니다. 기존 직렬 저장 큐를 사용하고 반 일정은 기존 저장 동작을 유지합니다. [정책](PRD.md#작은-버전의-경계와-저장-동작), [코드·검사](DEVELOPMENT.md#대시보드-파일럿)를 따릅니다.
- Google 아래에 같은 크기의 `교사 비밀번호 로그인` 버튼을 배치하고 반·수업·실습 선택 메뉴를 공통 Select로 정리했습니다. 홈 안내는 `화면 안의 버튼을 눌러 보세요`이며 화살표를 제거했습니다. [표현 기준](DESIGN.md#확정된-공통-기준), [코드·검사](DEVELOPMENT.md#공통-선택-메뉴와-로그인-화면)를 따릅니다.
- 새 의존성·운영 계정·학생 자료·Firebase 규칙·외부 서비스 설정은 변경하지 않았습니다. 합성 계정과 시드는 demo 로컬 환경에만 사용합니다.

### 이번 릴리스의 검증

10/1 Windows·Node 24.19.0·Java 21·Chromium·`CI=1`·`localhost:3000`의 새 프로덕션 빌드와 새 `demo-cs-class` Auth9099/Firestore8080에서 최종 전체 E2E **73개가 단일 실행으로 통과**했습니다(4.8분·종료 코드 0). lint·typecheck·build도 통과했습니다. 실제 운영 DB·계정은 사용하지 않았습니다. 대상에는 기존 인증/세션/권한/저장/EntryJS와 새 게스트·낙관적 목록·공통 UI 검사가 포함됩니다.

새 UI/목록 검사는 지연 중 다른 행 조작·삭제 실패 복원·재시도/재접속, 로그인 실패 입력 보존·역할/담당 반, 320/390/768/1440px·키보드/초점·메뉴/부모 대화상자 Escape·빈 선택 저장·콘솔을 포함합니다. 이전 단계의 메뉴 준비 전 Escape 실패는 실제 option 표시와 부모 대화상자 열림 상태를 확인하도록 보완했습니다. 이전 10/1 단계별 검사는 [정리 전 원문](archive/cs-class/2026-10-01-before-local-ui-release/HANDOFF.md)에 있으며 이번 실행으로 표현하지 않습니다.

문서 정리 후 활성 문서 10개의 로컬 링크/앵커·Git 전달 266건, 보관 원문 381개의 작업/스테이징 SHA-256 762건, 참고 화면 6개의 해시/치수와 `git diff --check`를 확인했습니다. 대체된 PRD 초기 기능 구상·옛 `platform/` 이식 안내·HANDOFF 누적 이력은 현재 문서에서 정리했으며 [원문 5개와 SHA-256](archive/cs-class/2026-10-01-before-local-ui-release/manifest.json)을 보존합니다.

## 통합·배포 상태

대상은 GitHub `DonghyunT/cs-class`, Vercel `cs-class`(`prj_RUUtcTMukVY9kjudgDr6VA89KKxP`), Production 브랜치 `main`입니다. 운영 주소는 [CS Class](https://cs-class-donghyunt.vercel.app), 설정은 [서버 안내](FIREBASE_SETUP.md#vercel-서버-설정)를 따릅니다. 10/1 MCP에서 해당 프로젝트·Next.js·Node 24.x·기존 운영 도메인을 조회했으며 설정은 변경하지 않았습니다.

이번 PR·병합 SHA·CI·배포 SHA/READY/별칭·운영 API/UI 확인 결과는 완료 후 이 절에 기록합니다. Preview는 운영 인증정보가 없는 별도 환경이며 그 준비 안내를 Production 로그인 성공으로 판단하지 않습니다.

이전 이름 파일럿은 [PR #14](https://github.com/DonghyunT/cs-class/pull/14)로 병합됐습니다. 공개 프로토타입의 이름 미션은 실제 EntryJS 4.0.23, 다른 미션은 미니 작업실이며 운영 수업 제출·실제 교사 전송·AI를 연결하지 않습니다. 이전 PR/CI·배포·63개 검사·운영 체험과 Google OAuth의 확인 한계는 [보관 원문](archive/cs-class/2026-10-01-before-local-ui-release/HANDOFF.md#통합배포-상태)에 있습니다.

## 다른 PC에서 이어가기

완료된 작업은 **최신 `main`**으로 시작합니다. [설치 안내](DEVELOPMENT.md#다른-pc에서-시작)에 따라 복제하거나, 기존 변경을 보존한 뒤 `git fetch origin` → `git switch main` → `git pull --ff-only`로 갱신합니다. 로컬 HEAD와 `origin/main`을 대조하고 새 수정은 `codex/` 브랜치에서 시작합니다. 진행 중 작업의 미추적 파일은 [이식 절차](DEVELOPMENT.md#진행-중-작업을-다른-환경으로-옮기기)까지 확인합니다.

- 앱·검사·현재 문서·필요한 참고 자료는 Git에 포함합니다. `.env.local`·관리자 키·학생 자료·원 PPT·Java/에뮬레이터/Chromium 캐시·PC별 플러그인 설정은 별도이며 UI 개발과 자동 검사에는 운영 키가 필요 없습니다.
- 로컬 게스트는 `npm run dev:emulator`로 준비합니다. 종료하면 기록은 사라지고 같은 역할의 새 게스트 입장은 이전 접속을 종료합니다. 운영 사이트에는 게스트가 없습니다.
- [13차시 자료 요약](reference/programming-13.md)·[9/30 참고 화면 메타데이터](reference/programming-13/screenshots.json)를 함께 전달합니다. 참고 화면은 당시 미니 작업실이며 현재 Entry 이름 미션이나 새 Select의 화면 증거로 사용하지 않습니다. 체험 탭의 답안은 다른 PC로 이동하지 않습니다.
- 과거 이식 ZIP은 제작 시점의 복구용 스냅샷입니다. 최신 main에 덮어쓰지 않습니다. 과거 대화·도구 세션을 복원할 필요 없이 담당 문서와 실제 코드로 이어갑니다.

### 새 에이전트가 먼저 읽을 순서

1. AGENTS와 이 문서로 Git 상태·검증/배포 범위·미해결 사항을 확인합니다.
2. 요청한 기능의 PRD 정책과 DESIGN 표현 기준을 읽고 현재 코드를 대조합니다.
3. DEVELOPMENT의 실행·대상 검사를 사용합니다. 실제 서버 연결이 필요한 경우에만 FIREBASE_SETUP을 읽습니다.

### 새 대화에 붙여 넣을 요청문

> CS Class를 이어가자. AGENTS.md와 docs/HANDOFF.md를 읽고 현재 브랜치·HEAD·미커밋/미추적 변경과 origin/main 동기화를 먼저 확인해줘. 기존 작업을 보존하고 현재 요청에 필요한 PRD·DESIGN·DEVELOPMENT의 담당 절과 코드를 대조하자. 로컬 검사는 demo 에뮬레이터와 게스트를 사용하고 과거 이식 ZIP을 최신 main에 덮어쓰지 말아줘.

## 교실 입장·대시보드 조회 성능

대시보드 트랜잭션 일괄 조회는 이전 릴리스에 포함됐습니다. 9/30 같은 Windows 프로덕션 빌드·로컬 에뮬레이터에서 첫 관찰과 반복 5회로 비교한 결과·요청 수·응답 해시는 [측정 메타데이터](reference/dashboard-performance/2026-09-30.json), 상세 표·운영 관찰은 [보관 원문](archive/cs-class/2026-10-01-before-programming-release/HANDOFF.md)에 있습니다. 이번에 새 측정한 값이 아니며 실제 RPC·청구 문서 수·운영 개선율은 확인하지 않았습니다.

운영 세션·입장 지연은 별도 후속입니다. `HomeEntry` → `SessionProvider.refresh()` → 인증 라우트 → 서버 `readSession/identity/authorized`를 [측정 절차](DEVELOPMENT.md#대시보드-성능-측정)로 나누어 확인합니다. 쿠키 없는 익명 요청은 계정 Firestore 조회 전에 끝납니다.

## 남은 한계와 다음 결정

- 제품: 파일럿 최종 한도·실학생 적용 반/등록·초기 비밀번호 전달·학생 공개 범위·학년도/수업 버전·보관/백업 정책은 [PRD의 다음 결정](PRD.md#다음에-결정할-것)을 따릅니다. 도움·Q&A·AI·작품집·교사 콘텐츠 편집기는 후속 후보입니다.
- EntryJS: 지원 블록·실행·저장 경계는 [개발 안내](DEVELOPMENT.md#entryjs-실습)를 따릅니다. 다른 미션의 실제 Entry 전환·범용 실행 검사·자유 제작·전체 블록의 키보드/터치와 실제 OS IME 후보창 확인은 남습니다.
- 복구: 운영 학습/목록의 미전송 초안은 메모리에만 남습니다. [운영 저장 정책](PRD.md#작업-저장과-통신-비용)과 공개 체험의 [탭 보관·도움 메모리](DEVELOPMENT.md#상태와-저장-경계)를 구분합니다.
- 인증정보: 9/30 노출된 Stitch 키 재발급과 9/29 Firebase CLI 인증 폐기·재연결 완료 여부는 미확인입니다. 키·원문 로그를 보관하지 않으며 검사 터미널에서 불필요한 비밀 환경변수를 제외합니다.
- 도구: 9/28 `npm audit` 중간 경고 5개(운영 2개)는 이전 미해결 기록이며 이번에 의존성을 변경하거나 재검사하지 않았습니다. 이전 10/1 CI의 Node 20 기반 Actions·`setup-java@v4` 폐기 예정 경고·Ubuntu 이미지 이전 예고도 후속입니다.
- 운영: 새로운 Google OAuth 세션 생성과 실학생 사용성·수업 시간·평가 타당성은 확인한 범위가 아닙니다. 익명 API/UI·합성 계정 검사와 구분해 별도로 확인합니다.
