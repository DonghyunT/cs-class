# 이어갈 작업

갱신: 2026-09-29. **1차 LMS 구현과 실제 Firebase 연결을 마쳤고, 홈 기준으로 재정리한 학생·교사 대시보드를 main에 병합·운영 배포했습니다.** 다음 대화에서는 이 문서 → [PRD](PRD.md) → [DESIGN](DESIGN.md) 순서로 읽습니다. 실행은 [README](../README.md), 서버 설정은 [Firebase 안내](FIREBASE_SETUP.md)를 따릅니다.

## 다른 PC에서 재개

Firebase 구현·문서·홈 구조와 학생·교사 대시보드 정리를 main에 반영했습니다. **main이 재개 기준**입니다. 실행·Java·로컬 에뮬레이터 준비는 [DEVELOPMENT](DEVELOPMENT.md#다른-pc에서-시작)를 따릅니다. 새 PC는 실제 Firebase 키 없이도 개발할 수 있습니다.

기존 복제본은 먼저 로컬 변경을 확인하고, 작업 트리가 깨끗할 때 아래 명령을 실행합니다.

```powershell
git status --short --branch
git fetch origin
git switch main
git pull --ff-only
npm ci
npm run dev:emulator
```

다음 개발은 main에서 새 `codex/` 브랜치를 만들어 진행합니다. 실제 Firebase에 연결하려면 Git에 없는 환경파일과 관리자 인증을 본인이 관리하는 안전한 방법으로 따로 준비합니다.

## 통합·배포 상태

**최신 UI 릴리스는 2026-09-29 [PR #7](https://github.com/DonghyunT/cs-class/pull/7)을 main에 병합한 `1c320ab`입니다.** [운영 배포](https://vercel.com/donghyunt/cs-class/5xHki8Fm6rjcUGakkXF75xpyqt7y)는 READY이고 [운영 주소](https://cs-class-donghyunt.vercel.app)에 연결됐습니다. 새 화면의 검증·접근 제한은 아래 대시보드 정리 기록을 따릅니다.

### 2026-09-28 Firebase 통합 기록

- 사용자가 현재까지의 구현을 검증한 뒤 main 병합·운영 배포하도록 승인했습니다. 이전 브랜치의 병합 보류 기록은 이번 승인으로 대체합니다.
- 통합 대상은 Firebase·학습 구현 `8c08ec5`와 구조 정리 `3f9cf7f`입니다. API·학습 로직은 유지하고, 공개 홈 컴포넌트 분리와 최신 문서의 경로·상태를 함께 반영했습니다.
- 실제 `cs-class-f74c4`에서 Auth·Firestore 읽기, Google·비밀번호 제공자 활성화와 서버 전용 DB 규칙을 다시 확인했습니다. 일반 Preview에는 운영 비밀값을 넣지 않습니다.
- 통합 상태에서 lint·typecheck·프로덕션 build와 에뮬레이터 E2E 27개를 통과했습니다. 활성 문서 링크·앵커와 보관 원문 362개 해시도 확인했습니다.
- [PR #6](https://github.com/DonghyunT/cs-class/pull/6)은 최신 커밋 `e5886f1`의 push·PR CI 전체 성공 후 main에 병합했습니다(`88ab44f`, 2026-09-28 22:14 KST). 병합된 main의 [CI](https://github.com/DonghyunT/cs-class/actions/runs/36427234255)도 통과했습니다.
- Preview 실제 API 검사에서 Firebase Admin의 `ERR_REQUIRE_ESM`을 발견해 Vercel 공식 실행 옵션을 Preview·Production에 추가했습니다. 새 Preview의 `/api/auth/session` HTTP 200, 로그인 준비 안내·버튼 비활성과 콘솔 오류 없음을 확인했습니다. 원인·설정은 [Firebase 안내](FIREBASE_SETUP.md#vercel-서버-설정)에 기록했습니다.
- 승인받은 Firebase 환경변수 7개는 Production 전용 Secret으로 등록했고, Google 로그인 허용 도메인에 `cs-class-donghyunt.vercel.app`을 추가했습니다. 임시 업로드 파일은 제거했고 원본 키·로컬 환경파일은 유지했습니다.
- [운영 배포](https://vercel.com/donghyunt/cs-class/Hne73NjJQf4hvvMxideSBjQQsFSi)는 `88ab44f`로 READY입니다. [운영 주소](https://cs-class-donghyunt.vercel.app)에서 사용자가 직접 Google 로그인을 마쳤고, 브라우저에서 교사 대시보드·담당 11반 목록·등록 학생 0명·콘솔 오류 없음을 확인했습니다. [확인 화면](reference/releases/2026-09-28-production-teacher.png)을 남겼습니다.
- 기존 Vercel SSO 보호를 유지합니다. Vercel 비로그인 요청은 앱 앞에서 302 인증 이동으로 차단됩니다. 새 PC에서는 소유자 Vercel 로그인도 필요하며, 학생에게 일반 공개하는 단계는 별도입니다. 운영에서 학생 계정 생성·비밀번호 변경·학습 제출을 반복 시험하지 않았습니다. 저장·실패·권한 검증은 로컬 E2E와 이전에 정리 완료한 클라우드 왕복 기록을 따릅니다.

## 완료한 범위

| 영역 | 현재 동작 |
| --- | --- |
| 인증 | 학생 학번·비밀번호, 교사 Google 허용 목록, 강사 비밀번호와 10·11반 권한. 최초·초기화 후 비밀번호 변경, 무활동 만료, 새 로그인 시 이전 세션 종료 |
| 학생 | 이번 수업·열린 수업, 단계별 퍼센트와 완료 수, 전체 시작 전/진행 중/완료, 자동 저장·재접속 복원 |
| 샘플 수업 | `sequence-lab`: 개념 2개·퀴즈 3문항·순서 배열 실습 1개. 개념 확인, 오답만 재도전, 선택형 힌트, 자유로운 단계 이동 |
| 제출 | 서버 검증 → 학생 제출 → 저장 성공 시 완료. 제출 후 수정 중에도 기존 제출본·완료 유지 |
| 교사 | 반 선택·이번 수업 지정·열린 수업 관리·학생별 진행·제출 작품 조회·비밀번호 초기화 |
| Firebase | 승인된 `cs-class-f74c4`, 서울 기본 DB. 2026-09-28 두 로그인 제공자·11개 빈 반·서버 전용 Firestore 규칙·등록 학생 0명을 확인한 기록이며 이번 검사는 로컬 에뮬레이터 범위 |

사용자는 메타프롬프팅 후 구현과 메인·학생·교사 분담을 승인했습니다. 구현 보류는 과거 단계의 요청입니다. [BUILD_BRIEF](BUILD_BRIEF.md)는 완료한 1차 작업의 범위·공통 계약·검증 기준이며 이후 작업을 자동으로 시작하라는 지시가 아닙니다.

공개 홈과 중앙 집중형 로그인은 승인된 디자인입니다. 미리보기 데이터와 실제 학습 기록을 구분합니다. 실제 수업·작업은 서버 API를 사용하며, 로컬 에뮬레이터의 합성 계정은 클라우드에 등록하지 않습니다.

## 2026-09-29 대시보드 화면 정리

- 다른 PC의 작업을 반영해 깨끗한 main을 `6961ef4`까지 fast-forward했습니다. 해당 main의 [GitHub CI](https://github.com/DonghyunT/cs-class/actions/runs/36428192249)는 성공했고 재개 시 열린 PR·이슈는 없었습니다.
- [PR #7](https://github.com/DonghyunT/cs-class/pull/7)의 최종 커밋 `ca8f5e4`를 검증한 뒤 사용자의 승인에 따라 main `1c320ab`로 squash 병합했습니다. 병합된 파일 전체가 검증 브랜치와 같은지 확인했고, Ponytail·Context7 사용 기준도 AGENTS에 반영했습니다.
- 학생·교사 화면의 파랑·본문색·제목·여백·카드·탐색을 홈 기준으로 맞췄습니다. 이번 수업의 정적 픽셀 그래픽은 공통 컴포넌트로 표현하고 학생 집계는 제목 옆에, 교사 집계는 하나의 요약 영역에 모았습니다. 좁은 화면은 진행 정보를 읽을 수 있게 재배치했습니다.
- 공통 메뉴는 820px 이하에서 열고 821px부터 사이드바를 표시합니다. 옛 전역 CSS의 강제 숨김과 버튼 `visibility` 전환으로 생긴 메뉴 표시·초점 문제를 수정하고 Escape·양방향 화면 크기 전환 회귀 검사를 추가했습니다. 데스크톱에서 태블릿으로 줄일 때 사이드바 안의 초점은 메뉴 버튼으로 복귀하며 본문 조작의 초점은 유지합니다.
- 최종 lint·typecheck·프로덕션 build와 `next start` + 로컬 Auth·Firestore 에뮬레이터의 전체 E2E **28개**를 통과하고 종료 코드 0을 확인했습니다. 구성: 홈 7·API 8·탐색/이력 이동 5·운영 복구 1·플랫폼 3·학생 4. Windows의 테스트 서버 종료 대기는 해당 실행의 PID를 확인해 정리했고 대처 방법을 DEVELOPMENT에 남겼습니다.
- 최종 커밋의 [push CI](https://github.com/DonghyunT/cs-class/actions/runs/36509726318)와 [PR CI](https://github.com/DonghyunT/cs-class/actions/runs/36509731521), 병합된 [main CI](https://github.com/DonghyunT/cs-class/actions/runs/36510124961)가 모두 성공했습니다. 자동 리뷰의 데스크톱 → 태블릿 초점 지적은 먼저 재현한 뒤 수정·회귀 검사하여 해결 처리했습니다.
- 별도 실제 화면 검사에서 학생 개념·퀴즈 기록 저장 → 실습 검증/제출 → 교사 작품 조회, 반 전환·검색/빈 상태·수업 관리 창, 메뉴 Tab 순환·Escape 초점 복귀를 확인했습니다. 320·390·600·768·820·821·1024·1440px 배치와 가로 넘침, 브라우저 오류를 확인했고 오류는 없었습니다.
- main `1c320ab`의 [운영 배포](https://vercel.com/donghyunt/cs-class/5xHki8Fm6rjcUGakkXF75xpyqt7y)는 READY이며 운영 별칭 연결을 확인했습니다. 운영 `/`·`/api/auth/session`·`/login/teacher`의 비로그인 GET은 모두 HTTP 302로 Vercel 인증에 이동합니다. 기존 SSO 보호가 적용된 상태입니다.
- 현재 PC의 Vercel 연결은 재인증 후에도 보호된 배포 URL 접근을 거부했고 런타임 로그도 확인하지 못했습니다. 이번 운영 배포에서 앱 세션 API 응답·Google 로그인·대시보드 내부·DB 왕복을 새로 검증하지 않았습니다. 실제 Firebase 키 없이 `demo-cs-class`의 합성 계정으로 한 기능 검증과 구분하며 이전 실제 계정 확인은 위 2026-09-28 기록을 따릅니다.

프로덕션 빌드의 로컬 화면: [학생 데스크톱](reference/dashboards/2026-09-29/student-1440.png)·[학생 모바일](reference/dashboards/2026-09-29/student-390.png), [교사 데스크톱](reference/dashboards/2026-09-29/teacher-1440.png)·[교사 모바일](reference/dashboards/2026-09-29/teacher-390.png). 화면의 학번·인원·진행률은 합성 테스트 기록입니다. 최신 표현 기준은 [DESIGN](DESIGN.md#학생교사-대시보드)을 따릅니다.

## 다음 작업

1. **운영 준비 범위를 정합니다.** 적용할 반·학번 목록·초기 비밀번호 전달 방법을 확인한 뒤 학생 계정을 등록합니다. 기존 자료를 자동 이관하거나 297명을 일괄 생성하지 않습니다.
2. **배포 후 실제 사용을 준비합니다.** 최종 호스팅 도메인의 로그인·권한·저장 상태와 서버 설정은 아래 배포 기록 및 Firebase 안내를 확인합니다. 실제 학생 계정은 별도 승인 없이 등록하지 않습니다.
3. **정식 수업을 추가합니다.** 현재 샘플은 흐름 검증용입니다. EntryJS는 작은 과제에서 실행·초기화·채점·제출을 먼저 검증하고 AI·Q&A는 합의한 정책에 따라 별도 연결합니다.

제품 정책을 다시 정하지 않습니다. 기본 활동만 완료 조건에 포함하며 심화·자유시간 자동 처리는 미정입니다. Q&A의 질문/답변·해결/다시 열기 권한과 AI 오류의 교사 확인 경로는 PRD에 보존했습니다. 월 4만 원은 참고 예산이며 무료 AI API의 공급자·조건은 후속 확인합니다. [운영비 예상안](OPERATING_COST_ESTIMATE.md)은 가정이 포함된 비교 자료입니다.

새 대화에는 다음처럼 전달하면 됩니다.

> AGENTS.md와 docs/HANDOFF.md를 읽고 main에서 CS Class를 이어가자. 먼저 로컬 변경과 원격 동기화·배포 기록을 확인하고 새 codex/ 브랜치에서 다음 작업을 정하자. 기존 완료·제출·권한 정책을 유지하며 실제 학생 등록은 별도로 논의하자.

## 실행과 검증

- Node.js 24, 자동 검사에는 Java 21+가 필요합니다. 프로젝트 루트에서 실행하며 Windows에서는 필요하면 `npm.cmd`·`npx.cmd`를 사용합니다.
- 실제 Firebase: Git 제외 `.env.local`과 외부 관리자 JSON을 준비한 뒤 `npm run dev`. Google 로그인은 `http://localhost:3000/login/teacher`에서 확인합니다.
- 가상 계정 체험: `npm run dev:emulator`. 합성 계정은 [로컬 테스트 설정](../scripts/local-test-env.mjs), 자동 검사는 `npm run test:e2e`를 사용합니다. 실제 3000번 서버와 동시에 실행하지 않습니다.
- GitHub 작업 브랜치는 Preview, main은 Production을 배포합니다. 일반 Preview는 운영 DB에 연결하지 않으며 로그인 서비스 미설정 안내가 정상입니다. Firebase를 포함한 기능 검사는 로컬 에뮬레이터로 수행합니다.
- 이전 구현은 원격 CI에서 학습 초점 이동의 간헐적 실패를 수정했습니다. 응답·단계 변경·순서 이동 뒤 초점은 React 갱신 이후 Effect에서 처리하는 규칙을 유지합니다.
- 검증을 위해 띄웠던 미리보기·에뮬레이터는 정리 후 종료합니다. 다음 작업 때 위 명령으로 다시 시작합니다. 이 PC의 임시 Java는 `scratch/tools/java/`에만 있으며 Git으로 전달되지 않습니다.

### 검증 근거와 범위

- 1차 구현에서 lint·typecheck·build와 프로덕션 `next start` + 로컬 Firebase 에뮬레이터의 E2E **27개**를 통과했습니다. 구성: 홈 7·API 8·이력 이동 4·운영 복구 1·플랫폼 3·학생 4. 원격 CI 실행 결과와 구분합니다.
- 저장 실패·느린 응답·두 탭 충돌·뒤로/앞으로 이동, 비밀번호 초기화·권한 경계·세션 만료, 좁은 화면·키보드·초점·콘솔을 검사했습니다. 테스트 주소는 Secure 쿠키 전송을 위해 `localhost`로 통일하며 보안을 낮추지 않습니다.
- 실제 Firebase에서 임시 계정 로그인 → 수업 지정 → 개념·퀴즈·실습 제출 → 재로그인 복원 → 교사 조회 및 익명 Firestore 403을 확인했습니다. 시험 계정 2개와 기록을 삭제하고 시험 반을 빈 설정으로 복원했습니다.
- 실제 허용 Google 계정의 localhost 및 운영 주소 로그인과 교사 대시보드 진입을 사용자·브라우저에서 확인했습니다. 담당 반 11개·등록 학생 0명 상태였습니다. 운영 확인 범위는 위 통합·배포 기록을 따릅니다.
- 이번 정리 후에도 lint·typecheck·build와 같은 방식의 E2E **27개**를 다시 통과했습니다. 미리보기의 실제 배치·키보드 진입·콘솔도 확인했습니다. 사용하지 않는 체험용 인증·반 상태와 그림 컴포넌트를 제거하고 안내 문구를 바로잡았으며 새 기능·권한 변경·의존성 추가는 없습니다.

### 유지할 경계

- 저장·완료 판정과 권한 검사는 서버가 수행합니다. 응답 순서·사용자 교체·두 탭 충돌·이동 전 저장 보호를 단순한 화면 처리로 대체하지 않습니다.
- 미저장 초안은 화면 메모리에만 남고 세션 종료·계정 교체 때 비웁니다. 강제 창 닫기 후 미전송 초안 복구는 보장하지 않습니다. 브라우저의 세션 복원 때문에 창 닫기를 확실한 로그아웃으로 취급하지 않습니다.
- 비밀번호 변경 장애 복구, 의존성 중간 경고 5개(운영 범위 2개), 데이터 보관·정리 후속 사항은 [Firebase 안내](FIREBASE_SETUP.md#데이터와-남은-한계)에 기록했습니다. 강제 메이저 다운그레이드는 하지 않았습니다.

## 코드와 시각 기준 위치

| 위치 | 역할 |
| --- | --- |
| `src/lib/classroom/`, `src/lib/server/`, `src/app/api/` | 데이터 계약·진행 계산·인증·권한·서버 저장 |
| `src/components/session-provider.tsx`, `navigation-provider.tsx` | 세션·활동과 이동 전 저장 보호 |
| `src/components/app-shell.tsx`, `app-shell.module.css`, `dashboard-art.tsx` | 로그인 후 공통 탐색·시각 기준·정적 픽셀 그래픽 |
| `src/components/student/`, `src/app/teacher/` | 학생 학습·교사 수업/계정 관리 |
| `src/components/home/`, `src/app/public-home.css`, `src/lib/demo-data.ts` | 공개 홈·수업 미리보기 |
| `tests/`, `scripts/` | 흐름·권한 회귀 검사, 환경 설정·에뮬레이터·운영 복구 |

홈의 모션·반응형·키보드 주의사항은 [AGENTS](../AGENTS.md#검증)와 [DESIGN](DESIGN.md)에 모읍니다. 승인된 화면은 [홈 데스크톱](reference/home-hero-1440.png)·[모바일](reference/home-hero-390.png), [입장 선택창](reference/home-entry-1440.png)·[320px](reference/home-entry-320.png), [공간 안내](reference/home-role-anchor.png)·[마지막 화면](reference/home-finale-1440.png)입니다. [UI Component Lab](reference/ui-component-lab/index.html)은 보존된 참고 원문이며 현재 앱 런타임이 아닙니다.

## Stitch 상태

- 프로젝트: [CS Class 랜딩페이지 디자인](https://stitch.withgoogle.com/projects/9952170337891001891). 키는 `STITCH_API_KEY`로만 참조하며 [README](DEVELOPMENT.md#stitch-연결)에 PC별 설정을 설명합니다.
- 확인한 도구는 `get_project`, `list_screens`, `get_screen`, `edit_screens`입니다. 목록에 누락되면 아래 화면 ID로 조회합니다. 로컬 수정은 Stitch에 자동 반영되지 않습니다.
- 테마의 과거 Plus Jakarta Sans보다 현재 DESIGN의 Pretendard·색·컴포넌트 기준이 우선입니다. 이번 LMS 구현에서는 새 Stitch 생성을 하지 않았습니다.

| 화면 | 최초 ID | 수정 결과 ID |
| --- | --- | --- |
| 홈 데스크톱 | `43f4bb0b48b0429ea7827b5fec944945` | `b9fcd8f02ce3462c89ce9f653285f699` |
| 홈 모바일 | `e157096258184c8190a44a9ba31585d8` | `5fdd1894a36a4c1e93b378b4a334abe8` |
| 초기 브랜드 | `d355390e8e2b472093273fbb1855ffc5` | 로컬 작은 학사모가 현재 기준 |

## PC별 자료와 이전 이력

- `.env.local`, 관리자 JSON·비밀번호·학생 계정 엑셀·`백업용/`·임시 산출물은 Git에 없습니다. 원래 학생 자료는 `outputs/01a0de21-d7f4-7c03-8abf-2e213c2bf7fc/`, 옛 Stitch 결과는 `outputs/stitch-review/2026-09-27/`에만 있습니다. 학생 자료는 UI 작업에 필요하지 않습니다.
- 플러그인과 인증은 PC별 설정입니다. Context7에서 Next.js·React 구조 가이드를 확인했습니다. 설치된 Next.js 문서와 함께 참고하며 다른 PC의 도구 가용성은 다시 확인합니다.
- Vercel `cs-class`(`prj_RUUtcTMukVY9kjudgDr6VA89KKxP`)는 Root Directory 빈 값·Next.js·Node.js 24.x·기존 SSO 보호를 사용합니다. MCP에 임의의 `teamId`를 붙이지 않습니다.
- 홈·앱 정리·루트 통합 이력은 [PR #2](https://github.com/DonghyunT/cs-class/pull/2), [PR #3](https://github.com/DonghyunT/cs-class/pull/3), [PR #5](https://github.com/DonghyunT/cs-class/pull/5)에 있습니다. `e2dfaf1` 이전 구조로 복구할 때는 Vercel Root Directory도 `platform`으로 맞춰야 합니다.
- 옛 수업 원문은 `git show c7bc397:web/curriculum.js`, 정리 전 상세 인수인계는 `git show ba0dbc7:docs/HANDOFF.md`로 읽습니다. 과거 문서 원문·해시는 [보관 목록](archive/cs-class/2026-09-27-home-checkpoint/manifest.json)에 유지했습니다. 과거 승인·검증 기록을 현재 배포·병합 승인으로 해석하지 않습니다.
