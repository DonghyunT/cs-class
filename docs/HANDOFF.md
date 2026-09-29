# 이어갈 작업

갱신: 2026-09-29. 이 문서는 **현재 상태·검증 범위·다음 행동**을 관리합니다. 제품 정책은 [PRD](PRD.md), 화면 기준은 [DESIGN](DESIGN.md), 실행은 [DEVELOPMENT](DEVELOPMENT.md), 서버 연결·복구는 [FIREBASE_SETUP](FIREBASE_SETUP.md)을 따릅니다.

## 현재 작업 상태

| 항목 | 2026-09-29 이번 PC 확인 |
| --- | --- |
| 재개 기준 | `git pull --ff-only origin main`·`git fetch origin --prune`로 최신 main `84163e9` 동기화 완료 |
| 현재 브랜치 | `codex/curriculum-verification-entryjs`, `codex/verify-production-login`에서 분기 |
| 미커밋 변경 | 없음 (작업 트리 깨끗함, 커밋 및 푸시 완료) |
| 열린 PR | [PR #10](https://github.com/DonghyunT/cs-class/pull/10) — 정식 수업 추가 및 서버 정답 분리, EntryJS 실습 연동 |
| 코드 릴리스 | [PR #9](https://github.com/DonghyunT/cs-class/pull/9), main `83dca8a` — 스타일·교사 모듈·문서 관리 기준 정리 |
| 보존 상태 | 이전 `codex/verify-production-login` 커밋(`f2ab190`)은 원격에 푸시 보존됨 |
| 검증 | 이번 PC lint 0·typecheck 0·build(14개 SSG 페이지) 통과·Firebase 에뮬레이터 E2E **34개 전원 통과**(0 실패) |
| 운영 배포 | 최신 main `84163e9`의 [CI](https://github.com/DonghyunT/cs-class/actions/runs/36537362806) 성공·[Production](https://vercel.com/donghyunt/cs-class/DcP9rYcdDQs2v8LrNnLeh492dXcC) READY, SHA 일치 |
| 운영 주소 | `cs-class-donghyunt.vercel.app`의 로그인 화면 HTTP 200. 이전 `cs-class-sigma.vercel.app`은 로그인 경로·쿼리를 유지하며 307 이동 |
| 미확인 사항 | 운영 학생의 학습 저장·제출 왕복, 이전 진단에 사용한 Firebase CLI 인증의 폐기·재연결 완료 여부. Vercel 런타임 오류 조회는 이번에도 403 |
| 브랜치 정리 | `codex/trim-styles-teacher-modules` 원격·로컬 삭제, main에 포함된 로컬 `codex/login-policy-spec` 삭제 |
| 바로 이어갈 일 | 운영 로그인·도메인 점검은 아래 범위로 확인. 다음은 학생 공개·계정 등록 범위 또는 정식 수업을 사용자와 정함 |

이전 작업에서 사용자가 구조·문서 정리 보존, main 병합·운영 배포와 완료 브랜치 정리를 승인해 수행했습니다. 대상은 GitHub `DonghyunT/cs-class`와 Vercel `cs-class`입니다. 제품 정책·실학생 자료·서비스 접근 보호는 바꾸지 않았습니다. 이 완료 기록은 이후 별도 작업의 승인이 아닙니다. 이번 PC에서는 최신 상태를 받은 뒤 사용자가 선택한 운영 로그인·도메인 점검을 진행했습니다.

기존 복제본은 `git status --short --branch`로 미커밋 작업을 먼저 확인합니다. 변경이 있으면 보존하고 바로 main으로 전환하거나 덮어쓰지 않습니다. 깨끗한 작업 트리에서 `git fetch origin --prune` → `git switch main` → `git pull --ff-only` 후 새 `codex/` 브랜치를 만듭니다. 처음 받는 PC의 설치·실행은 [개발 안내](DEVELOPMENT.md#다른-pc에서-시작)를 따릅니다. Firebase 키 없이 `npm run dev:emulator`로 개발할 수 있습니다.

새 대화에 전달할 내용:

> AGENTS.md와 docs/HANDOFF.md를 읽고 CS Class를 이어가자. 현재 브랜치는 `codex/curriculum-verification-entryjs`이며, 정식 수업 추가(순서도, 엔트리봇 블록 코딩)와 과제별 정답·검증 서버 분리, EntryJS 실습 작업실, 34개 E2E 테스트 전체 통과가 완료된 상태다. 문서 역할은 README, 제품 정책은 PRD, 화면 기준은 DESIGN을 따르자. 다음으로 작업 커밋 및 PR 생성, 또는 실학생 계정 등록/공개 준비를 진행하자.

## 구현 상태와 남은 한계

| 영역 | 구현된 범위 |
| --- | --- |
| 인증 | 학생 학번·비밀번호, 교사 Google 허용 목록, 강사 로그인·담당 반 권한, 최초·초기화 후 변경, 무활동 만료·중복 접속 종료 |
| 학생 | 이번 수업·열린 수업, 단계별 진행·이어하기, 자동 저장·재접속 복원 |
| 정식 수업 | `sequence-lab`(순서와 문제 해결), `flowchart-lab`(순서도로 나타내는 일상), `entry-bot-lab`(엔트리봇의 첫 걸음 - EntryJS 실습) |
| 실습·검증 | 순서도 카드 재배열 + EntryJS 블록 조립/시뮬레이션 실습, 서버 독립 솔루션 레지스트리 기반 채점/조건 검증 |
| 제출 | 서버 검증·제출 저장, 기존 제출본과 수정 중 작업 구분, 교사 제출물 뷰어에서 엔트리 프로젝트 블록 확인 |
| 교사 | 반 선택·수업 지정·열린 수업 관리·학생별 진행·제출 작품 조회·비밀번호 초기화 |

AI·Q&A·실학생 일괄 등록은 후속입니다. 브라우저 세션 복원·미전송 초안 복구와 데이터 보관의 한계는 [Firebase 안내](FIREBASE_SETUP.md#데이터와-남은-한계)를 따릅니다.

## 현재 변경과 검증 근거

### 2026-09-29 스타일·교사 모듈 정리 — 로컬 검증 완료

- 미사용 UI 3개·옛 `experience.css`를 제거하고 홈·셸·세션·미리보기 스타일을 담당 컴포넌트에 모았습니다. 전체 소스 CSS는 7,373줄에서 3,220줄로 줄었습니다. 빈 줄을 포함하고 파일 끝 빈 줄을 제외한 비교입니다.
- 교사 화면은 `src/components/teacher/`의 대시보드·대화상자·날짜/오류 표현·스타일로 나누고 `src/app/teacher/page.tsx`에는 진입점만 남겼습니다. 기존 9개 함수 본문은 동일하며 포털 대화상자의 스타일 적용 순서 의존성을 제거해 여백을 유지했습니다. 코드 목차는 [README](../README.md#코드를-나누는-기준)를 따릅니다.
- 디자인·인증·권한·저장·채점 정책과 의존성을 유지했습니다. 수업별 정답·검증 데이터 구조는 정식 수업 추가 때 정리하기로 했습니다.
- lint·typecheck·프로덕션 build와 `next start` + 로컬 Auth·Firestore 에뮬레이터의 E2E **33개**를 통과했습니다. `demo-cs-class` 합성 계정만 사용했습니다.
- 변경 전 `e0a4eff`와 **46개 화면 캡처**가 일치했습니다. 홈·역할 선택·로그인·수업 미리보기·입장 안내·학생 학습 세 단계·교사 대시보드·관리/초기화 대화상자를 포함합니다. 대시보드는 320·390·600·768·820·821·1024·1440px에서 확인했습니다. 비교 시 홈 모션을 줄이고 동적 확인 시각을 가렸으며 모션·키보드·초점·콘솔·저장 실패/충돌은 기존 E2E로 검증했습니다.
- 일회성 비교 도구·캡처·로그는 Git 제외 `scratch/structure-review/`에 있습니다. 다른 PC의 공통 검증은 기존 `tests/`와 개발 안내를 사용합니다. 실제 Firebase·운영 자료를 변경하거나 운영 로그인·저장을 새로 검증하지 않았습니다. 사용한 서버·에뮬레이터는 종료했습니다.

### 2026-09-29 문서 역할·배치 정리

- [README의 문서 기준](../README.md#문서의-위치와-내용-기준)에 담당 내용·저장 위치·신규 문서 기준·중복 방지·보관 절차를 명시하고 AGENTS에서 연결했습니다.
- 완료한 BUILD_BRIEF와 정리 전 기준·상태 문서 6개를 [원문·SHA-256 목록](archive/cs-class/2026-09-29-before-doc-roles/manifest.json)에 보존했습니다. 공통 계약은 DEVELOPMENT, 반복 검증 원칙은 AGENTS에 유지했습니다. 과거 분담 지시를 후속 작업의 자동 승인으로 이어받지 않습니다.
- 비용 예상안은 [참고 자료](reference/OPERATING_COST_ESTIMATE.md)로 옮겼습니다. 요금·외부 서비스 상태는 재조회하지 않았으며 검토일과 적용 한계를 표시했습니다.
- 활성 문서의 정책·절차 중복과 과거 진행 문구를 정리했습니다. 안내·기준·참고·보관 목차 10개 문서의 로컬 링크·앵커 136개, 기존·신규 보관 파일 368개의 SHA-256, Git 제외 여부와 `git diff --check`를 확인했습니다. 신규 참고 자료·보존본은 모두 PR #9에 포함했고, 새 보존본 6개는 커밋의 실제 바이트로도 해시가 일치했습니다. 이번 배포 기록 갱신은 문서만 수정하며 검증 결과를 새로 실행한 것으로 표현하지 않습니다.

## 통합·배포 상태

### 2026-09-29 이번 PC 재개·운영 로그인 점검

- 미커밋 변경이 없던 main `6961ef4`에서 최신 `84163e9`까지 커밋 6개를 fast-forward로 받았습니다. 원격 정리 후 열린 PR과 미완료 원격 작업 브랜치는 없었으며, 이번 작업은 `codex/verify-production-login`에서 진행했습니다.
- 최신 main의 [CI](https://github.com/DonghyunT/cs-class/actions/runs/36537362806)는 성공이고, [Production 배포](https://vercel.com/donghyunt/cs-class/DcP9rYcdDQs2v8LrNnLeh492dXcC)는 READY이며 SHA가 `84163e9`와 일치했습니다. 운영·Preview의 `NODE_OPTIONS` 값과 적용 대상을 읽어 기존 실행 설정도 확인했습니다.
- 운영 `/login/teacher`는 HTTP 200, `/api/auth/config`는 승인 프로젝트 `cs-class-f74c4`·올바른 Auth 도메인·에뮬레이터 미사용으로 응답했습니다. 쿠키 없는 `/api/auth/session`은 HTTP 200 JSON·`configured: true`·`session: null`·`SIGNED_OUT`이며 `no-store, private`였습니다. 비밀값과 쿠키는 출력하지 않았습니다.
- 이전 `sigma`의 `/login/teacher?from=domain-check`는 HTTP 307로 운영 도메인의 같은 경로·쿼리로 이동했습니다. Vercel 도메인 조회도 같은 이동 설정과 두 도메인의 검증 완료를 반환했습니다.
- 사용자 Chrome에서 Google 계정 선택 창까지 정상 진입했습니다. 도구가 팝업 클릭을 완료하지 못해 사용자가 등록된 계정을 직접 선택했고, 이후 `/teacher`의 교사 대시보드·2학년 1반·학생 0명을 확인했습니다. 새로고침 후에도 세션이 유지됐고, 로그인된 홈의 `교실 입장`은 역할 선택 없이 `/teacher`로 이동했습니다. 대시보드 새로고침 뒤 조회한 콘솔 경고·오류는 없었습니다.
- 이 PC의 기존 관리자 연결로 `scripts/check-firebase.mjs`를 실행해 Firestore·Auth 관리자 읽기 성공, 이메일/비밀번호·Google 제공자 활성화, 운영 도메인의 Firebase 승인 목록 포함을 확인했습니다. 출력은 상태·도메인만 사용했습니다.
- 비로그인 학생·교사·수업 작업 API는 모두 HTTP 401·`SIGNED_OUT`, 익명 Firestore 학급 조회는 HTTP 403·`PERMISSION_DENIED`였습니다. 운영 학생의 학습 저장·제출은 이번 점검 범위에 포함되지 않았습니다. Vercel 런타임 오류 조회는 403으로 거부돼 서버 로그에 오류가 없다고 판정하지 않습니다.
- 이번 PC의 설치·로컬 검증: `npm ci` 완료, Node.js 24.19.0·로컬 Java 21.0.12.1·Chromium 캐시 확인, lint·typecheck·프로덕션 build 통과. 빌드는 첫 실행의 샌드박스 `spawn EPERM` 뒤 실행 권한이 허용된 환경에서 성공했습니다. `CI=1`의 `next start`와 로컬 `demo-cs-class` Auth·Firestore 에뮬레이터로 E2E **33개**를 통과했고 종료 코드 0을 확인했습니다. 테스트 서버·에뮬레이터 종료 뒤 3000·8080·9099에 남은 서버가 없었습니다. 운영 화면 증거는 Git 제외 `scratch/production-login/teacher-production.png`에 있습니다.

### 2026-09-29 운영 도메인·로그인 진단 후 인계

- 문서 마감 커밋 `3be2c75`의 [main CI](https://github.com/DonghyunT/cs-class/actions/runs/36525784258)는 lint·typecheck·build·E2E 33개 성공이며 [Production 배포](https://vercel.com/donghyunt/cs-class/5pYDqw9EnVguxaDaW2GiLxjgpTNp)는 READY였습니다. 미병합 작업 때문에 이전 코드가 운영된 상황은 아니었습니다.
- `sigma`에서 교사 Google 로그인이 실패했을 때 화면의 도메인 설정 안내와 Firebase의 OAuth 승인 도메인 오류를 확인했습니다. 정식 운영 주소는 기존 Firebase 승인 도메인인 `donghyunt`로 유지합니다. 설정 기준은 [서버 설정](FIREBASE_SETUP.md#vercel-서버-설정)에 있습니다.
- 인계 시 Vercel에서 `donghyunt`의 Production 연결과 `sigma` → `donghyunt` 307 설정이 이미 반영된 것을 조회했습니다. 내장 브라우저로 이전 `/login/teacher` 주소가 새 도메인의 같은 경로로 이동하며 Google 버튼이 활성화되고 콘솔 경고·오류가 없음을 확인했습니다. 이번 인계에서 도메인·인증·DB 설정을 추가 변경하지 않았습니다.
- 도메인 정리 후 실제 Google 계정 로그인·세션 생성·대시보드·DB 왕복은 재검증하지 않았습니다. 사용자 계정으로 [운영 교사 로그인](https://cs-class-donghyunt.vercel.app/login/teacher)을 확인하는 것이 남아 있습니다. 화면 준비 확인을 로그인 완료로 해석하지 않습니다.
- 진단 중 Firebase CLI의 인증 목록 JSON이 예상과 달리 토큰을 도구 로그에 출력해 사용자에게 알렸습니다. 값은 저장소에 보존하지 않았고, 해당 CLI 인증의 폐기·재연결 완료 여부는 미확인입니다. 기존 인증을 새 PC로 복사하지 않고 새 PC에서 직접 로그인하며, 원래 인증의 폐기 여부는 별도로 확인합니다. 재발 방지 절차는 AGENTS에 반영했습니다.
- 이번 인계 보강은 문서만 변경합니다. 활성 문서 링크·보관 해시·Git 차이를 확인하고 원격 main에 반영하며, 후속 커밋의 자동 CI·배포 결과는 해당 SHA로 조회합니다. 이전 코드 검증 기록을 새 로컬 실행 결과로 바꾸지 않습니다.

### 2026-09-29 구조·문서 정리 배포

- 최종 작업 커밋 `063bae0`의 [push CI](https://github.com/DonghyunT/cs-class/actions/runs/36525063374)·[PR CI](https://github.com/DonghyunT/cs-class/actions/runs/36525096639)가 모두 성공했습니다. lint·typecheck·build·E2E 33개를 통과했고 PR #9를 `83dca8a`로 squash 병합했습니다. 병합된 전체 파일이 검증 커밋과 동일한 것도 확인했습니다. 병합된 [main CI](https://github.com/DonghyunT/cs-class/actions/runs/36525441224)도 lint·typecheck·build·E2E 33개를 모두 통과했습니다. 이후 문서 갱신의 실행은 GitHub에서 커밋별로 구분합니다.
- `83dca8a`의 [Production 배포](https://vercel.com/donghyunt/cs-class/amXbWgHKQh7a2cn5gVPKBHQq9e3f)는 READY이며 [운영 주소](https://cs-class-donghyunt.vercel.app)에 연결됐습니다. 후속 문서 커밋도 Git 연동 배포를 만들 수 있으므로 최신 Production SHA는 해당 main 커밋과 대조합니다.
- 운영 교사 로그인 화면을 내장 브라우저로 열어 정상 표시·Google 로그인 버튼 활성화·콘솔 경고/오류 없음을 확인했습니다. 실제 Google 계정 로그인·대시보드 내부·DB 저장 왕복은 새로 시험하지 않았습니다.
- 도구로 운영 `/api/auth/session`을 직접 읽는 요청은 접근 거부됐고, 브라우저의 API 직접 탐색은 `ERR_BLOCKED_BY_CLIENT`였습니다. Vercel 런타임 로그 조회도 403이어서 오류가 없다고 판정하지 않습니다. 화면 준비 완료와 실제 세션 JSON·로그·계정 흐름 검증을 구분합니다. 기존 SSO 보호·운영 자료는 유지했습니다.
- 작업 브랜치는 PR 병합과 main 파일 일치를 확인한 뒤 삭제했습니다. 예전 로그인 정책 브랜치도 main에 포함됐고 다른 worktree가 사용하지 않음을 확인한 뒤 로컬에서 삭제했습니다.

### 이전 확인 기록

- 2026-09-28 PR #6의 main `88ab44f`를 운영 배포하고 실제 허용 Google 계정으로 교사 대시보드·담당 11반·학생 0명을 확인했습니다. 앞서 승인된 클라우드 합성 계정으로 학습 저장·재접속·교사 제출 조회와 익명 Firestore 403을 확인한 뒤 임시 계정·기록을 정리했습니다.
- 2026-09-29 PR #7의 main `1c320ab`에서 대시보드 배포 READY·운영 별칭 연결을 확인했습니다. Vercel SSO 보호의 비로그인 302를 확인했으며, 해당 배포의 실제 Google 로그인·DB 왕복을 새로 검증하지는 못했습니다.
- PR #8 당시 기준 커밋 `e0a4eff`에는 로그인·입장 수정이 포함됩니다. 당시 로컬 E2E는 33개였습니다. 도구의 보호된 URL 접근 제한과 사용자의 Chrome 접속 관찰을 구분합니다.
- 상세 PR·CI·배포 URL, 화면 기록, 환경별 검사 한계는 [정리 전 HANDOFF](archive/cs-class/2026-09-29-before-doc-roles/HANDOFF.md)에 보존했습니다. 배포 이력은 학생 공개·실자료 변경의 포괄 승인이 아닙니다.

## 다음 작업

1. **현재 인계 기록부터 보존합니다.** 첫머리의 작업 브랜치와 미커밋 문서 변경을 확인한 뒤 다음 작업을 정합니다. 다른 PC의 설치·도구 준비는 개발 안내를 따릅니다. 완료된 구조 정리를 다시 시작하지 않습니다.
2. **운영 학생 준비 범위를 정합니다.** 적용할 반·학번·초기 비밀번호 전달 방법, 학생 공개 시 Vercel 보호 범위를 확인합니다. 기존 자료 자동 이관이나 297명 일괄 생성은 하지 않습니다. 이번에 확인한 운영 로그인·교사 조회·비로그인 차단과 구분해 실제 학생의 학습 저장·제출을 검증합니다.
3. **정식 수업을 추가합니다.** 과제별 정답·검증 구조를 먼저 정리하고 EntryJS는 작은 과제로 실행·초기화·채점·제출을 검증합니다. AI·Q&A는 PRD의 확정 정책과 미결정을 구분해 연결합니다.
4. **운영 한계를 해소합니다.** 보관·백업·복구 정책과 실제 호출량을 확인합니다. 2026-09-28 `npm audit`의 중간 경고 5개(운영 범위 2개, `uuid/gaxios`·개발 CLI OpenTelemetry/PubSub 경로)는 당시 미해결 기록입니다. 이번에는 재검사하지 않았으며 후속 의존성 점검에서 확인합니다. 무관한 강제 메이저 다운그레이드는 적용하지 않았습니다.

## 참고 자료와 PC별 상태

- 합성 계정 화면: [학생 데스크톱](reference/dashboards/2026-09-29/student-1440.png)·[학생 모바일](reference/dashboards/2026-09-29/student-390.png), [교사 데스크톱](reference/dashboards/2026-09-29/teacher-1440.png)·[교사 모바일](reference/dashboards/2026-09-29/teacher-390.png), [학생 로그인](reference/login/2026-09-29/student-390.png)·[교사 로그인](reference/login/2026-09-29/teacher-1440.png). 표현 기준은 [DESIGN](DESIGN.md)에 있습니다.
- `.env.local`, 관리자 JSON·비밀번호·학생 계정 엑셀·`백업용/`은 Git에 없습니다. 원래 학생 자료는 원래 PC의 `outputs/01a0de21-d7f4-7c03-8abf-2e213c2bf7fc/`, 옛 Stitch 결과는 `outputs/stitch-review/2026-09-27/`에만 있습니다. UI 작업에 학생 자료는 필요하지 않습니다.
- 플러그인·인증·Java·캐시는 PC별로 준비합니다. 이 PC의 임시 Java는 `scratch/tools/java/`에만 있으며 Git으로 전달되지 않습니다. Stitch 프로젝트·화면 ID와 Vercel 연결 설정은 [DEVELOPMENT](DEVELOPMENT.md)를 따릅니다.
- 이전 원문과 해시는 [문서 보관함](archive/README.md)에 있습니다. 보존본 내부의 상대 경로·현재 상태·승인 표현은 당시 기준입니다.
