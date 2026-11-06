# 검사 누락 보완과 CI 재사용 구현 계획

> **For agentic workers:** 사용자가 지정한 대로 계획은 superpowers, 구현·검증은 ponytail을 따릅니다. 아래 작업을 현재 세션에서 순서대로 구현합니다.

**Goal:** 교사 CI 검사 누락과 로컬 검사 실행 누락을 줄인 뒤, 검증된 코드의 중복 CI 단계를 생략합니다.

**Architecture:** 첫 PR은 기존 `SMOKE_RELATED`에 교사 파일을 역할별로 연결하고 기존 명령을 `check`로 묶습니다. 두 번째 PR은 실제 검사한 코드의 지문과 성공 기록을 PR·main에서 공통으로 확인하며, 증명이 없으면 기존 검사를 실행합니다.

**Tech Stack:** Node.js 24, npm scripts, node:test, Playwright, GitHub Actions.

**Spec:** 이 대화에서 합의한 두 PR 범위(2026-11-07). 브랜치는 `chore/check-and-teacher-scope`, `chore/ci-verified-fingerprint`입니다.

## Global Constraints

- 기존 학생 스모크와 공통 서버·인증·저장 파일의 보수적인 판정을 유지합니다.
- 새 패키지와 운영 데이터·Firebase·Vercel 설정 변경은 없습니다. 검사는 `demo-cs-class` 에뮬레이터와 합성 데이터만 사용합니다.
- 전체 E2E는 별도 승인되지 않았으므로 실행하지 않습니다. 병합·공개 후 확인은 사용자가 승인했습니다.
- PR마다 관련 문서와 HANDOFF를 정리합니다. 첫 PR 공개 후 최신 main에서 두 번째 PR을 시작합니다.

## Review Focus

- 교사 파일과 학생 파일·미분류 파일이 섞여도 교사 관련 검사와 학생 스모크를 보존합니다(작업 1).
- Windows 경로·중복 파일·이름만 비슷한 미등록 파일을 정확히 처리합니다(작업 1).
- 포크·실패·취소·기록 없음·조회 실패는 검증 결과를 재사용하지 않습니다(작업 2).
- 문서만 달라진 경우 재사용하고 코드·workflow 변경 및 실제 검사한 병합 결과 불일치에는 재검사합니다(작업 2).
- verified의 연속 실행에서도 마지막 성공 기록을 남기며 실패 뒤에는 기록하지 않습니다(작업 2).

## 작업 1 — 로컬 검사 통합과 교사 CI 누락 보완

**Files:** `package.json`, `scripts/e2e-scope.mjs`, `tests/e2e-scope.test.mjs`, `tests/ci-policy.test.mjs`, `AGENTS.md`, `docs/DEVELOPMENT.md`, `docs/HANDOFF.md`.

**Interfaces:** 기존 `smokeRelatedTests(files)`와 `selectScope(env, ...)`의 반환 형식을 유지합니다. 로컬의 미분류 파일은 계속 수동 선별합니다.

- [x] 4그룹(수업 관리·미리보기·수행평가·작품 검토)의 관련 검사 선택, 그룹 합집합·중복 제거·공통 서버 제외 테스트를 추가하고 실패를 확인합니다.
- [x] `SMOKE_RELATED`에 실제 교사 파일을 명시적으로 연결합니다. 공유 교사 파일은 필요한 그룹 모두에 연결합니다.
- [x] `test:scope`에 문서 검사 3개를 포함하고 `check`에 `test:scope → lint → typecheck → test:review → check-docs → git diff --check origin/main`을 연결합니다. 기존 문서 전용 단축 절차는 유지합니다.
- [x] `npm run check`와 교사 4그룹·학생 스모크의 명시적 선별 E2E를 실행합니다. 실패 0과 실행 개수를 기록하고 diff·민감정보·문서를 검토합니다.
- [x] 첫 PR의 CI·자동 리뷰를 확인하고 squash 병합합니다. main CI·운영 SHA·별칭·익명 API·로그인 화면을 확인합니다.

## 작업 2 — 검사 지문에 따른 재사용과 중복 단계 생략

**Files:** `scripts/ci-policy.mjs`, `tests/ci-policy.test.mjs`, `.github/workflows/verify.yml`, `docs/DEVELOPMENT.md`, `docs/FIREBASE_SETUP.md`, `docs/HANDOFF.md`, 완료 계획 보관함.

**Interfaces:** `findVerifiedRun(env, request = fetch, fingerprint = codeFingerprint)`가 같은 저장소의 성공한 PR 실행 중 현재 지문에 맞는 성공 기록을 찾습니다. `findTestedRun`의 같은 브랜치 마지막 성공 실행만 조회하는 정책은 유지하고 기록 확인만 공유합니다.

- [x] 성공 기록·포크/기록 누락/실패/조회 오류·문서/코드 변경·workflow 생략 조건 테스트를 먼저 추가해 실패를 확인합니다.
- [x] PR·main의 기록 확인을 작은 공통 함수로 맞추고 main의 원본 tree 비교와 shortcut을 제거합니다. 기록은 성공한 `app` 작업의 마지막 성공 step에서만 인정합니다.
- [x] verified에서 npm/Next 캐시·설치·lint·타입·로직·빌드·E2E를 생략하고 정책·문서 검사와 마지막 지문 기록은 유지합니다.
- [ ] `npm run check`로 관련 검사를 확인합니다. 문서 커밋을 추가한 실제 PR 실행에서 verified와 step 생략을 확인합니다.
- [ ] 완료 계획을 내용 그대로 보관하고 문서를 정리해 두 번째 PR을 squash 병합합니다. main도 실제 지문으로 재사용하고 운영 공개가 정상인지 확인합니다.

## 검증과 완료 기준

각 PR은 로컬 검사 결과·개수, CI 성공, 공개 후 확인을 갖춰야 합니다. 최종 보고에는 실행하지 않은 전체 E2E와 운영 로그인·저장 검증을 구분하고, 실제 CI 소요 시간만 적습니다. API 조회·CI 실패는 원인을 확인하고 수정하며 게이트를 우회하지 않습니다.
