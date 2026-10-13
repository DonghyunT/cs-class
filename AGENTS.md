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
| 개발 환경·체크리스트·검증 | [DEVELOPMENT](docs/DEVELOPMENT.md) | [수업 추가 체크리스트](docs/DEVELOPMENT.md#신규-수업-추가-및-선별-검증-연동-체크리스트), 에뮬레이터 |
| Firebase·배포·서버 설정 | [FIREBASE_SETUP](docs/FIREBASE_SETUP.md) | Vercel 배포 및 검증, Rules, 복구 절차 |
| 저장소 구조·문서 목차 | [README](README.md) | 폴더 구조, 문서별 역할 분담 기준 |
| 현재 진행 상태·남은 작업 | [HANDOFF](docs/HANDOFF.md) | 기준 커밋, SHA, CI 결과, 다음 작업 |

## 아키텍처 & 수업 개발 규칙
- **환경 분리:** 테스트 및 개발은 `demo-cs-class` 및 에뮬레이터(Auth 9099 / Firestore 8080)만 사용합니다.
- **컴포넌트 구조:** 기능별 컴포넌트는 `src/components/student/`, `home/`에 두고, 공통 UI는 `ui/`에 배치합니다.
- **수업 수동 저장:** 학생 작업은 반드시 공통 훅 [`useWork`](src/components/student/use-work.ts)를 사용합니다 (모범 코드: `src/components/student/review/flowchart.tsx`).
- **신규 수업 추가:** 신규 수업 추가 시 [개발 안내의 수업 추가 체크리스트](docs/DEVELOPMENT.md#신규-수업-추가-및-선별-검증-연동-체크리스트) 4단계를 필수 준수합니다.
- **도구/스킬:** 가장 단순한 구현(Ponytail full) 우선, 외부 API는 Context7 대조, 3회 연속 실패 시 가설을 재검토합니다.

## 검증 및 배포 규칙
- **선별 검증:** 단일 수업 변경 시 해당 E2E + 등록 공통 스모크(`tests/lesson-smoke.spec.ts`) 실행. 공통 모듈/설정 변경 시 전체 E2E(`full`) 자동 승격.
- **결과 재사용:** 동일 코드·설정 조건이면 로컬 전체 E2E를 반복하지 않고 단위/선별 검증 후 GitHub CI를 활용합니다.
- **배포 검증:** Vercel 배포 시 [서버 설정의 판정 기준](docs/FIREBASE_SETUP.md#vercel-서버-설정)을 준수합니다.
- **작업 브랜치:** `codex/` 브랜치에서 작업 권장. Preview는 사용자 명시 요청 시에만 생성합니다.

## 절대 금지 사항 (Strict Guardrails)
- ❌ **비밀정보 노출 금지:** 토큰, 환경변수, 학생 비밀번호, 비밀 키를 코드·문서·로그·채팅에 절대 노출하지 않습니다.
- ❌ **운영 DB 격리:** 운영 DB에 임의의 테스트 시드나 합성 계정을 절대 넣지 않습니다.
- ❌ **보관 원문 불변:** `archive/` 및 `docs/archive/` 과거 보관 파일은 절대 수정하지 않습니다.
- ❌ **자동 저장 타이머 신설 금지:** 학생 수업 컴포넌트에 개별 `debounce` 자동 저장 타이머를 신설하지 않습니다.
- ❌ **미승인 원격 반영 금지:** 작업 브랜치나 main 푸시 전 사용자 승인 범위를 벗어난 원격 반영을 하지 않습니다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
