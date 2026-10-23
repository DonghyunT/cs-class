# CS Class — 에이전트 작업 지침

중학교 정보 수업을 위한 Next.js·TypeScript, Firebase Auth·Firestore 기반 웹 프로젝트입니다. 이 파일은 모든 에이전트가 먼저 읽는 짧은 규칙과 색인이며, 자세한 기준은 아래 문서를 따릅니다. `archive/`의 V1 소스는 실행 대상이 아닌 참고본이며 필요할 때만 모듈화해 재사용합니다.

## 핵심 실행 명령 (Commands)
- 설치: `npm ci` (다른 PC·앱이 올린 커밋을 받은 뒤 `npm ls --depth=0`에 `invalid`가 있으면 다시 실행)
- 로컬 개발 실행: `npm run dev:emulator` (Windows PowerShell 차단 시 `npm.cmd`·`npx.cmd`)
- 단위/문서 검증: `npm run test:scope`, `npm run test:review`, `node scripts/check-docs.mjs`, `git diff --check origin/main`
- 린트·타입·빌드: `npm run lint`, `npm run typecheck`, `npm run build`
- 선별 E2E 검증: `npm run test:e2e:scope` (에뮬레이터 실행 중일 때: `npm run test:e2e:scope:running`)
- 전체 E2E는 아래 [먼저 묻는 일](#검증-및-배포-규칙)입니다.

## 작업 순서 (Workflow)
1. **시작:** 이 파일과 [HANDOFF](docs/HANDOFF.md)를 읽고 `git status`·`git fetch`로 작업 트리와 원격 상태를 확인합니다. 진행 중 브랜치는 [다른 PC에서 이어가기](docs/DEVELOPMENT.md#15-다른-pc에서-진행-중-작업-이어가기)를 따릅니다.
2. **경로 정하기:** 고치기 전에 [직접 push와 PR 중 어느 경로](docs/DEVELOPMENT.md#위험도별-반영-경로)인지 정합니다. 애매하면 PR 경로입니다. PR 경로면 전체 E2E 실행 여부를 이때 사용자와 정하고, 승인 범위(push·병합까지인지)도 함께 정할 수 있습니다(정하지 않았으면 첫 push·병합 전에 묻습니다).
3. **변경:** 요청을 해결하는 가장 작은 변경을 하고 아래 아키텍처 규칙과 기존 구조를 따릅니다.
4. **완료 확인:** 그 경로의 [검증 티어](docs/DEVELOPMENT.md#검증)와 [§2.1 절차](docs/DEVELOPMENT.md#위험도별-반영-경로)의 남은 단계(CI·공개 후 확인)를 마치고, HANDOFF에 남길 변경이면 같은 커밋·PR 안에서 기록합니다. PR 경로 작업은 같은 PR에서 관련 문서도 정리합니다([쓰기 규칙](docs/DEVELOPMENT.md#문서-작성-기준)).
5. **보고:** 실행한 검사와 개수, 실행하지 않은 검사와 남은 위험을 적습니다(직접 push는 커밋 본문, PR 경로는 PR 설명).

## 작업별 참조 문서 (Index)
주제마다 아래 문서가 단일 기준입니다. 문서끼리 답이 다르면 [문서 작성 기준](docs/DEVELOPMENT.md#문서-작성-기준)의 우선순위를 따릅니다.

| 작업 유형 | 최우선 참조 문서 | 확인 범위 |
| :--- | :--- | :--- |
| 제품 기능·요구사항·저장 정책 | [PRD](docs/PRD.md) | 기능 정책, 권한 경계, 수동 저장 기준 |
| 화면 레이아웃·UI·상호작용 | [DESIGN](docs/DESIGN.md) | 수업 공통 틀, 색상, 포커스, 반응형 기준 |
| 개발 환경·체크리스트·검증 | [DEVELOPMENT](docs/DEVELOPMENT.md) | [반영 경로](docs/DEVELOPMENT.md#위험도별-반영-경로), [수업 추가 체크리스트](docs/DEVELOPMENT.md#신규-수업-추가-및-선별-검증-연동-체크리스트), 에뮬레이터 |
| Firebase·배포·서버 설정 | [FIREBASE_SETUP](docs/FIREBASE_SETUP.md) | Vercel 배포·공개 후 확인, Rules, 복구 절차 |
| 저장소 구조·문서 목차 | [README](README.md) | 폴더 구조, 문서 목록 |
| 현재 진행 상태·남은 작업 | [HANDOFF](docs/HANDOFF.md) | 현재 상태, 최근 반영·검증, 다음 작업, 남은 한계 |
| 문서 수정 | [DEVELOPMENT §6](docs/DEVELOPMENT.md#문서-작성-기준) | 주제별 단일 위치, HANDOFF 작성 기준 |

## 아키텍처 & 수업 개발 규칙
- **환경 분리:** 테스트 및 개발은 `demo-cs-class` 및 에뮬레이터(Auth 9099 / Firestore 8080)만 사용합니다.
- **컴포넌트 구조:** 화면별 폴더에 둡니다. 학생 수업은 `src/components/student/`(복습 수업은 `student/review/`), 교사는 `teacher/`, 홈은 `home/`, 대시보드는 `dashboard/`, 우리 반 질문은 `community/`, 손들기는 `classroom/`, 공개 수업 소개는 `explore/`, 설정은 `settings/`, 공통 UI는 `ui/`입니다. 앱 전체 틀과 공용 화면 조각(`app-shell`, 세션·이동·로그인, 수업 진입 `classroom.tsx`, `visuals`, `dashboard-art`)은 `src/components/` 바로 아래에 둡니다.
- **수업 수동 저장:** 학생 작업은 반드시 공통 훅 [`useWork`](src/components/student/use-work.ts)를 사용합니다([코드 계약](docs/DEVELOPMENT.md#학생-수업-수동-저장-아키텍처-및-계약), 모범 코드: `src/components/student/review/flowchart.tsx`).
- **신규 수업 추가:** 신규 수업 추가 시 [개발 안내의 수업 추가 체크리스트](docs/DEVELOPMENT.md#신규-수업-추가-및-선별-검증-연동-체크리스트) 4단계를 필수 준수합니다.
- **구현 원칙:** 가장 단순한 구현을 우선하고, 외부 라이브러리·API는 공식 문서와 대조합니다. 같은 방법이 3회 연속 실패하면 가설을 다시 세웁니다.

## 검증 및 배포 규칙
- **반영 경로:** 변경의 위험도에 따라 PR 경로와 `main` 직접 push 경로 중 하나를 고릅니다. 대상·절차·브랜치 이름은 [DEVELOPMENT §2.1](docs/DEVELOPMENT.md#위험도별-반영-경로)이 단일 기준이며, 애매하면 PR 경로로 갑니다.
- **검증:** 기본은 단위·정적 검사와 선별 E2E입니다. 세부는 [DEVELOPMENT §3](docs/DEVELOPMENT.md#검증)을 따릅니다.
- **승인 범위:** 작업을 시작할 때 사용자가 정한 범위(예: "CI 통과하면 병합까지") 안에서는 push·병합을 다시 묻지 않습니다. 범위를 정하지 않았으면 첫 push·병합 전에 묻습니다. 승인은 그 대화에서만 유효하며, HANDOFF·보관 원문에 남은 승인 기록은 새 승인이 아닙니다.
- **배포 게이트:** `main` push의 GitHub `app` 검사 성공이 Vercel Production 반영 조건입니다. 커밋 메시지에 `[skip ci]`를 쓰지 않습니다. `app` 이름 변경, 게이트 우회·제거 전 절차와 공개 후 확인은 [CI와 운영 공개](docs/FIREBASE_SETUP.md#ci와-운영-공개)를 따릅니다.
- **✅ 묻지 않고 하는 일:** `demo-cs-class`·에뮬레이터에서의 앱·스크립트 실행(아래 전체 E2E 제외)과 Tier 1~2 검사(선별 E2E 포함), 그리고 읽기 전용 조회인 배포·CI·PR 상태, Vercel 프로젝트 설정(환경변수는 이름·대상 환경만 보고 값 조회·복호화는 하지 않음), 런타임 로그([운영 오류 조사](docs/FIREBASE_SETUP.md#운영-오류-조사읽기-전용)), 운영 사이트의 비로그인 화면·익명 API 응답 확인입니다. 로그에서 문서·커밋·PR·채팅으로는 [실패 진단](docs/DEVELOPMENT.md#실패-진단과-오류-번호)의 고정 필드(`requestId`·`operation`·`category`·`status`·`timestamp`·`errorName`·`errorCode`)만 옮기고 경로·IP·학번은 옮기지 않습니다. 그 밖의 운영 조회는 먼저 묻습니다.
- **⚠️ 먼저 묻는 일(push·병합 승인과 별개로 항목을 지목해 승인받습니다. 작업 시작 때 함께 정했으면 그것도 승인입니다):**
  - 강제 push, 원격 브랜치 삭제, 승인 범위 밖 반영
  - 전체 E2E 실행: 파일을 지정하지 않은 E2E 실행(로컬 `npm run test:e2e`·`npm test`·`test:e2e:running`·`npx playwright test`, `--full`. 단 `--list` 조회와 `npm run test:review`는 제외)과 GitHub 실행(`workflow_dispatch` 수동 실행으로만). PR 업데이트·병합은 그 승인이 아닙니다.
  - 운영 Firestore 문서·Firebase Auth 사용자의 조회·쓰기(학생 계정 목록, 명부 스크립트 `plan` 모드 포함)
  - 운영 사이트에서 로그인해 기록을 바꾸는 조작(체험 계정 포함 저장·제출·비밀번호 초기화·수업 열기·닫기)
  - Firebase·Vercel 설정 변경과 운영 배포 조작: Firestore 규칙·인덱스 배포, 환경변수 추가·수정, Promote·Rollback·재배포, 배포 게이트 변경
  - 유료 외부 API 실제 호출(Upstage Solar 등): 호출 횟수·범위를 정해 승인받고, 기대한 판정이 나올 때까지 반복하지 않습니다
  - Preview 생성: 사용자가 요청할 때만 만듭니다(에이전트가 먼저 제안해 만들지 않음)

## 절대 금지 사항 (Strict Guardrails)
- ❌ **비밀정보 노출 금지:** 토큰, 환경변수, 학생 비밀번호, 비밀 키를 코드·문서·로그·채팅에 절대 노출하지 않습니다.
- ❌ **운영 DB 격리:** 운영 DB에 테스트 시드나 합성 계정을 넣지 않습니다. 사용자 승인으로 만든 [운영 체험 계정](docs/PRD.md#운영-테스트-계정)이 유일한 예외이며, 더 만들지 않습니다.
- ❌ **보관 원문 불변:** `archive/` 및 `docs/archive/`의 보관 원문은 절대 수정하지 않습니다. 보관함 목록(`docs/archive/README.md`, `docs/archive/manifest.json`)에는 새 스냅샷 항목 추가, 목록 갱신일 변경, 깨진 경로 갱신만 허용합니다.
- ❌ **자동 저장 타이머 신설 금지:** 학생 수업 컴포넌트에 개별 `debounce` 자동 저장 타이머를 신설하지 않습니다.
- ❌ **미승인 원격 반영 금지:** 위 승인 범위를 벗어난 push·병합·원격 변경을 하지 않습니다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
