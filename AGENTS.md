# CS Class — 에이전트 작업 지침

중학교 정보 수업을 위한 Next.js·TypeScript, Firebase Auth·Firestore 기반 웹 프로젝트입니다. V1 자산은 필요할 때만 모듈화해 재사용합니다.

## 핵심 실행 명령 (Commands)
- 로컬 개발 실행: `npm run dev:emulator` (Windows PowerShell 차단 시 `npm.cmd`·`npx.cmd`)
- 선별 E2E 검증: `npm run test:e2e:scope` (에뮬레이터 실행 중일 때: `npm run test:e2e:scope:running`)
- 단위/문서 검증: `node scripts/check-docs.mjs` && `npm run test:review`
- 린트 및 타입 검사: `npm run lint` && `npm run typecheck`

## 작업별 참조 문서 (Index)
작업 시작 시 이 파일과 [HANDOFF](docs/HANDOFF.md)를 먼저 읽고 해당 문서로 이동합니다.

| 작업 유형 | 최우선 참조 문서 | 확인 범위 |
| :--- | :--- | :--- |
| 제품 기능·요구사항·저장 정책 | [PRD](docs/PRD.md) | 기능 정책, 권한 경계, 수동 저장 기준 |
| 화면 레이아웃·UI·상호작용 | [DESIGN](docs/DESIGN.md) | 수업 공통 틀, 색상, 포커스, 반응형 기준 |
| 개발 환경·체크리스트·검증 | [DEVELOPMENT](docs/DEVELOPMENT.md) | [반영 경로](docs/DEVELOPMENT.md#위험도별-반영-경로), [수업 추가 체크리스트](docs/DEVELOPMENT.md#신규-수업-추가-및-선별-검증-연동-체크리스트), 에뮬레이터 |
| Firebase·배포·서버 설정 | [FIREBASE_SETUP](docs/FIREBASE_SETUP.md) | Vercel 배포 및 검증, Rules, 복구 절차 |
| 저장소 구조·문서 목차 | [README](README.md) | 폴더 구조, 문서별 역할 분담 기준 |
| 현재 진행 상태·남은 작업 | [HANDOFF](docs/HANDOFF.md) | 현재 상태, 최근 반영·검증, 다음 작업, 남은 한계 |
| 문서 수정 | [DEVELOPMENT §6](docs/DEVELOPMENT.md#문서-작성-기준) | 주제별 단일 위치, HANDOFF 작성 기준 |

## 아키텍처 & 수업 개발 규칙
- **환경 분리:** 테스트 및 개발은 `demo-cs-class` 및 에뮬레이터(Auth 9099 / Firestore 8080)만 사용합니다.
- **컴포넌트 구조:** 화면별 폴더에 둡니다. 학생 수업은 `src/components/student/`(복습 수업은 `student/review/`), 교사는 `teacher/`, 홈은 `home/`, 대시보드는 `dashboard/`, 우리 반 질문은 `community/`, 손들기는 `classroom/`, 탐색은 `explore/`, 설정은 `settings/`, 공통 UI는 `ui/`, 프로그래밍 프로토타입은 `prototype/`입니다. 앱 전체 틀(`app-shell`, 세션, 이동, 로그인)은 `src/components/` 바로 아래에 둡니다.
- **수업 수동 저장:** 학생 작업은 반드시 공통 훅 [`useWork`](src/components/student/use-work.ts)를 사용합니다 (모범 코드: `src/components/student/review/flowchart.tsx`).
- **신규 수업 추가:** 신규 수업 추가 시 [개발 안내의 수업 추가 체크리스트](docs/DEVELOPMENT.md#신규-수업-추가-및-선별-검증-연동-체크리스트) 4단계를 필수 준수합니다.
- **구현 원칙:** 가장 단순한 구현을 우선하고, 외부 라이브러리·API는 공식 문서와 대조합니다. 같은 방법이 3회 연속 실패하면 가설을 다시 세웁니다.

## 검증 및 배포 규칙
- **검증:** 기본은 단위·정적 검사와 선별 E2E입니다. 전체 E2E는 로컬에서는 사용자 사전 승인, GitHub에서는 명시적인 `workflow_dispatch` 수동 실행으로만 하며, PR 업데이트·병합은 그 승인이 아닙니다. 세부는 [DEVELOPMENT §3](docs/DEVELOPMENT.md#검증)을 따릅니다.
- **위험도별 반영:** 학생 데이터·인증·권한·저장 흐름·공통 틀·배포/검증 설정·의존성을 바꾸면 PR 경로(작업 브랜치 → PR → squash 병합)로, 그 밖의 작은 변경은 로컬 검증 뒤 `main`에 직접 push합니다. 애매하면 PR로 갑니다. 브랜치 이름은 `feat/`·`fix/`·`chore/`입니다. 세부는 [DEVELOPMENT §2.1](docs/DEVELOPMENT.md#위험도별-반영-경로)을 따릅니다.
- **승인 범위:** 작업을 시작할 때 사용자가 정한 범위(예: "CI 통과하면 병합까지") 안에서는 push·병합을 다시 묻지 않습니다. 강제 push, 원격 브랜치 삭제, 범위 밖 반영, 운영 DB·Firebase 작업은 따로 묻습니다. Preview는 사용자가 요청할 때만 만듭니다.
- **배포 게이트:** `main` push의 GitHub `app` 검사 성공이 Vercel Production 반영 조건입니다. 커밋 메시지에 `[skip ci]`를 쓰지 않고, `app` 이름을 바꾸거나 게이트를 우회·제거하기 전, 그리고 공개 후 확인은 [CI와 운영 공개](docs/FIREBASE_SETUP.md#ci와-운영-공개)를 따릅니다.

## 절대 금지 사항 (Strict Guardrails)
- ❌ **비밀정보 노출 금지:** 토큰, 환경변수, 학생 비밀번호, 비밀 키를 코드·문서·로그·채팅에 절대 노출하지 않습니다.
- ❌ **운영 DB 격리:** 운영 DB에 테스트 시드나 합성 계정을 넣지 않습니다. 사용자 승인으로 만든 [운영 체험 계정 12개](docs/FIREBASE_SETUP.md#승인된-운영-테스트-계정)가 유일한 예외이며, 더 만들지 않습니다.
- ❌ **보관 원문 불변:** `archive/` 및 `docs/archive/`의 보관 원문은 절대 수정하지 않습니다. 보관함 목록(`docs/archive/README.md`, `docs/archive/manifest.json`)에는 새 스냅샷 항목 추가와, 이동으로 깨진 경로 갱신만 허용합니다.
- ❌ **자동 저장 타이머 신설 금지:** 학생 수업 컴포넌트에 개별 `debounce` 자동 저장 타이머를 신설하지 않습니다.
- ❌ **미승인 원격 반영 금지:** 위 승인 범위를 벗어난 push·병합·원격 변경을 하지 않습니다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
