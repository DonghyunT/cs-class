# 구조 정리 셀프 실행 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 체크박스와 실제 검증 결과를 함께 갱신합니다.

**Goal:** 홈 스타일과 학생 작업 복구 로직을 찾기 쉽게 분리하고, HANDOFF를 현재 작업 안내로 정리합니다.

**Architecture:** CSS 선택자·선언·적용 순서를 그대로 유지한 영역 분리입니다. `useWork`는 상태와 요청 순서를 계속 소유하고, 상태 없는 복구 판별 함수 두 개만 별도 모듈로 옮깁니다. 완료 기록은 새 보관본에 원문 그대로 남깁니다.

**Tech Stack:** 기존 Next.js 16.3.6·React 19.2.8·TypeScript·Playwright·Node 도구만 사용합니다. 의존 패키지는 추가하지 않습니다.

**Spec:** [PRD의 수동 저장 계약](../../PRD.md#학생-수업의-수동-저장-정책), [DESIGN](../../DESIGN.md), 사용자의 이번 요청과 직전 합의한 세 작업입니다.

**실행:** 이 대화의 에이전트가 직접 수행합니다. 사용자께서 계획 작성 후 수정 착수를 요청하셨으므로 계획만 작성하고 멈추지 않습니다. 작업 브랜치는 `codex/architecture-clarity`, 시작 기준은 `6c778dd`입니다.

## 유지할 계약

- 학생 작업 소유자는 `useWork` 하나입니다. 수동 저장·기존 답안·이전 제출·revision·불확실한 결과 확인·AI 대기 중 입력 보존을 바꾸지 않습니다.
- 교사 체험과 공개 프로토타입의 저장 경계를 유지합니다. 파서·도메인 타입의 위치는 이번에 변경하지 않습니다.
- CSS 클래스·선택자·선언·중단점·모션·포커스·우선순위가 같아야 합니다. CSS Module 전환과 전역 범위 변경은 별도 작업입니다.
- 개발·검사는 `demo-cs-class`·Auth9099·Firestore8080만 사용합니다. 기존 export를 덮어쓰거나 시드로 기존 기록을 교체하지 않습니다.
- 기존 `archive/`·`docs/archive/` 파일은 수정하지 않습니다. 새 보관 폴더에 원문과 해시를 추가합니다.
- 원격 push·병합·배포·Preview 생성은 이번 요청에 포함하지 않습니다. 로컬 전체 E2E는 [개발 안내](../../DEVELOPMENT.md#검증)의 사전 승인 조건을 따릅니다.

## 추가로 확인할 실패 조건

- 저장 응답이 늦게 도착해도 학생이 그 뒤에 작성한 입력이 남아야 합니다.
- 결과 조회에 응답이 있더라도 다른 수업·다른 revision·다른 작품을 성공으로 오인하면 안 됩니다.
- 기존 복습 작품에서 schema 기본값이 누락된 경우 복구 판단이 내용을 자동 변경하면 안 됩니다.
- 홈의 반응형·모션 규칙이 앞쪽 기본 규칙보다 먼저 적용되는 식으로 순서가 바뀌면 안 됩니다.
- 인수인계 정리 후 기존 앵커·최신 복원 위치·운영 확인 한계가 사라지면 안 됩니다.

## Task 1: 홈 CSS를 영역별로 분리

**Files:** `src/components/home/public-home.css`를 수정하고 같은 폴더에 `public-home-base.css`, `home-hero.css`, `lesson-story.css`, `role-preview.css`, `public-home-finale.css`를 만듭니다.

**Interfaces:** 기존 `app/page.tsx`는 계속 `public-home.css` 하나를 가져옵니다. 엔트리의 CSS import가 원래 순서로 다섯 영역을 펼치고, 공통 반응형·모션·마지막 덮어쓰기 규칙은 그 뒤에 둡니다. 다른 작업과 공유하는 인터페이스가 없습니다.

- [x] 원본 CSS와 PostCSS 구문 트리의 순서를 Git 제외 작업 장부에 기록합니다.
- [x] 기본/입장 선택창 → 히어로/픽셀 그림 → 수업 시연 → 역할 안내 → 하단 입장/푸터를 연속 구간으로 나눕니다. 첫 경계는 `.landing-hero`, `.landing-story`, `.landing-roles`, `.landing-finale`입니다.
- [x] `public-home.css`의 다섯 import와 나머지 후행 규칙을 연결해 원본과 선언·선택자·순서가 같은지 확인합니다. **Expected:** 펼친 CSS 본문과 원본 일치, 구문 트리 변화 없음.
- [x] 타입·린트·프로덕션 빌드 뒤 홈 검사 `tests/landing.spec.ts`를 실행합니다. **Expected:** 기존 반응형·모션·키보드·다섯 장면 동작 유지.

**완료 기준:** 2,003행의 파일을 담당 영역으로 탐색할 수 있고, 엔트리는 의존 순서와 공통 후행 규칙만 담당합니다. 행 수 목표를 맞추기 위해 규칙을 재정렬하지 않습니다.

## Task 2: 작업 복구 판별을 분리하고 빠르게 검증

**Files:** `src/components/student/work-recovery.ts`, `tests/work-recovery.test.ts`, `playwright.logic.config.ts`를 만들고 `use-work.ts`·`package.json`을 수정합니다.

**Interfaces:** `hasRecoveryFields(value: Work): boolean`, `hasActionResult(before: Work, action: WorkAction, next: Work): boolean`를 제공합니다. `useWork`의 호출 위치와 반환 계약은 그대로입니다. 새로운 상태·이벤트·네트워크·타이머를 만들지 않습니다.

- [x] 테스트를 먼저 작성합니다. 실행 가능한 최소 시그니처로 긍정 사례가 실패하는 것을 확인한 뒤 기존 판별 본문을 옮깁니다. **Expected RED:** 유효 결과를 아직 확인하지 못해 기대값 `true`와 다름. import 오류는 행동 검증 실패로 계산하지 않습니다.
- [x] 보존할 사례를 검사합니다: 유효 기록/잘못된 revision/기본값 누락/잘못된 필드, 개념 확인, 퀴즈 채점·재시도, 교사 요청, 실습 검증·제출, 프로그래밍·순서도 미션, 다른 수업·다른 작품·예상 범위를 넘는 revision. 기대값은 직접 지정합니다.
- [x] 두 함수와 필요한 순수 의존만 이동합니다. JSON 동일성·작품 비교·기본값 누락 거절·revision 범위의 기존 판단을 바꾸지 않습니다. **Expected GREEN:** 모든 경계 검사 통과.
- [x] 서버를 시작하지 않는 기존 Playwright 도구용 `playwright.logic.config.ts`에서 `**/*.test.ts`를 실행합니다. `test:review`에 이 경로를 연결해 기존 CI가 함께 실행하게 합니다. E2E 설정·선별 매핑은 변경하지 않습니다.
- [x] 리뷰 검사·타입·린트와 저장/복구 관련 E2E를 확인합니다. **Expected:** 단일 저장 소유권과 실패/응답 유실/추가 입력/이탈 동작 유지.

**완료 기준:** 훅에서 두 판별 본문이 사라지고, 복구 정책의 중요한 분기가 브라우저·에뮬레이터 없이 실행됩니다. 테스트마다 데이터 보호와 관련된 실제 오판을 잡는 역할이 있어야 합니다.

## Task 3: HANDOFF를 현재 상태 문서로 정리

**Files:** `docs/HANDOFF.md`·`docs/DEVELOPMENT.md`를 수정하고 `docs/archive/cs-class/2026-10-14-before-architecture-clarity/`에 기존 HANDOFF와 출처 manifest를 추가합니다.

**Interfaces:** 최신 코드·운영 기록·검증 한계·복원 위치를 그대로 찾을 수 있습니다. 기존 앵커는 명시 id로 유지하고 새 보관본으로 연결합니다. 기존 보관 파일은 변경하지 않습니다.

- [x] 수정 전 HANDOFF를 바이트 그대로 복사하고 SHA-256 일치를 확인합니다. **Expected:** 보관본과 기준 원문 동일.
- [x] 현재 작업, 최신 릴리스/운영 기록, 실제 검증 범위, 다음 작업, 로컬 기록 보존, 남은 한계만 남깁니다. 완료 전 A0 지시·이전 릴리스 상세는 보관본 링크로 바꿉니다.
- [x] DEVELOPMENT의 `networkidle` 예시를 저장 상태·자동 재시도 단언·필요한 응답 대기로 보정합니다. 정책은 바꾸지 않습니다.
- [x] 문서 검사·문서 회귀·기존 앵커 보존·보관본 해시·diffcheck를 확인합니다. **Expected:** 링크/앵커 오류 0, 기존 보관 원문 변경 0, 최신 정보 누락 없음.

**완료 기준:** 현재 문서에서 지금 이어갈 작업이 분명하고, 삭제된 상세 근거도 새 보관본에서 찾을 수 있습니다.

## Task 4: 종합 검증과 독립 리뷰

- [x] 공통 훅·스타일·설정 변경이므로 선별 판정은 `full`로 기록합니다. 사용자가 관련 검사+공통 스모크를 선택해 로컬 전체 E2E는 실행하지 않았습니다.
- [x] `node scripts/check-docs.mjs`, 정책/문서 검사, `npm.cmd run test:review`, `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`를 실행합니다. 이미 같은 코드·설정으로 확인한 결과는 불필요하게 반복하지 않습니다.
- [x] 전체 E2E 승인 시 보존된 사용자 기록과 분리된 demo 검사 환경에서 실행합니다. 미승인 시 홈·저장/복구·공통 스모크를 실행하고 전체 검사 미실행을 명시합니다.
- [x] `requesting-code-review` 절차에 따라 마지막에 한 번 새 문맥의 리뷰를 받습니다. 중요 회귀는 수정하고 해당 검사를 다시 확인합니다.
- [x] 계획 체크박스와 HANDOFF에 실제 결과·미확인 사항을 기록하고 로컬 변경을 전달합니다. 원격 반영은 별도 요청 전까지 하지 않습니다.

## 작업 장부

Git 제외 `scratch/architecture-clarity/progress.md`에 작업별 근거·검사·결정을 기록합니다. 새 체크아웃·의존 설치 비용을 피하기 위해 깨끗한 기존 체크아웃의 작업 브랜치에서 수행합니다. 현재 localhost/에뮬레이터 포트는 비어 있으며, 기존 복원 export는 검사 시드와 별도로 보존합니다.

## 실행 결과 — 2026-10-14

- CSS: 2,003행 엔트리를 영역5파일+공통 후행 규칙으로 분리. 펼친 내용 원본 일치.
- useWork: 상태 조정 본문·두 판별 본문 동일성 확인, 순수 복구12개 RED→GREEN.
- HANDOFF: 30,111바이트 원문 보존, 기존 앵커 유지, 현재 문서 정리. 기존 보관551파일과 사용자 export6파일 보존.
- 검증: 리뷰/복구28·정책/문서15, 타입·린트·빌드, 관련7파일 E2E54개 통과(2.3분). 전체 E2E는 사용자 선택으로 미실행.
- 독립 리뷰: Critical/Important 없음. 보관 출처가 Windows 체크아웃(CRLF)임을 새 메타데이터에 보완.
- 실행 환경: 임시 Git·Next 경로의 샌드박스 접근 거부는 동일 명령의 허용된 실행으로 확인. Java21은 기존 scratch runtime 재사용.
- 결과 전달: 로컬 구현 전달 후 사용자가 작업 브랜치 push·main 대상 PR 등록·GitHub 전체 CI 실행을 승인했습니다. main 병합은 사용자가 직접 수행합니다. CI 결과는 PR과 해당 HEAD의 Actions 실행에 기록하며 자동 머지·Preview 생성은 하지 않습니다.
