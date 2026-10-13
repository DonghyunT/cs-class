# 수동 저장과 변경 영향별 검증 — 통합 로드맵·실행 계획 B

> **상태:** 계획 B(영향별 선별 검증 체계)의 모든 구현, 단위 테스트, 경량 스모크 테스트, 선별 실행기 검증, CI 연동 및 문서 반영이 완료되었습니다. 작업 A(`3e341a3`)에 이어 독립 커밋으로 기록합니다.

**Goal:** 수동 저장 전환 이후 코드 변경의 영향도에 따라 E2E 검증 범위를 지능적으로 선택(`affected` 모드)하여, 매번 30분 이상 소요되는 398개 전체 E2E 실행 비용을 크게 줄이면서도, 불확실하거나 공통 영향이 있는 경로는 무조건 전체 검사(`full` 모드)로 안전하게 격상하여 품질을 보장한다.

**Architecture:**
- `scripts/e2e-scope.mjs`: diff 기반 명시적 파일 매핑 및 순수 선택 함수 (`selectE2E`)
- `scripts/ci-policy.mjs`: 성공한 main 기준 누적 diff 산출, 로컬 미커밋 변경 포함, `E2EPlan` JSON 생성
- `scripts/run-selected-e2e.mjs`: 계획 JSON을 검증하고 필요한 Playwright spec 및 smoke 테스트를 안전하게 실행하는 runner
- `tests/lesson-smoke.spec.ts`: 선별된 수업의 '인증 준비 → 대표 조작 마커 작성 → 명시 저장 → 새로고침 복원'을 수업당 5~8초 내외로 초고속 검증하는 경량 안전망
- `.github/workflows/verify.yml`: `mode != docs` 조건에서 빌드 및 선별 E2E runner 연동

**Tech Stack:** Node 24, Next.js 16.3.6, Playwright 1.63 계열, Firebase CLI 15.31.0, Java 21+; 신규 외부 의존성 없음.

**Baseline:** `codex/verification-plan@3e341a3` (Base: `origin/main@0c61e46`).

---

## 1. 핵심 합의 사항과 설계 원칙

1. **선별 검증(`affected`) 대상 수업 범위 (4개 수업 전체)**
   - 샌드위치, 순서도, 추상화뿐만 아니라 **프로그래밍(EntryJS 포함)까지 포함하여 4개 학생 수업 전체**를 1차 `affected` 대상으로 등록한다.
   - 교사 관리, 학생 관리, 대시보드, 인증, 공통 저장(`use-work`), DB 규칙/API 등은 초기 `full`을 안전하게 유지한다.

2. **혼합 테스트 파일의 안전한 포함**
   - 특정 수업 수정 시 전용 spec뿐 아니라 `review-practice-ui.spec.ts`, `practice-focus.spec.ts`, `lesson-feedback-workspace.spec.ts` 등 해당 수업을 다루는 **혼합 테스트 파일도 안전하게 검사 목록에 포함**한다.

3. **로컬 미커밋 감지 및 CI 수동 실행 정책**
   - 로컬 개발 환경 실행 시에는 아직 커밋되지 않은 작업 트리(Working Tree + Staged)의 변경까지 모두 합산하여 영향 범위를 판정한다.
   - GitHub Actions 웹 수동 실행(`workflow_dispatch`)은 항상 전체 검사(`full`, 398개 E2E)로 실행한다.

4. **스모크 테스트(`tests/lesson-smoke.spec.ts`) 설계**
   - 각 수업당 가장 대표적인 1개의 UI 조작(기호 배치, 명령 생성, 후기 입력 등)으로 **수업당 5~8초 내에 '마커 입력 → 명시 저장 → 새로고침 복원'을 신속하고 확실하게 검증**한다.
   - 실제 로그인 폼을 거치지 않고 준비된 인증(`readyStudent`)을 사용하여 속도와 결정성을 극대화한다.

5. **브랜치 및 커밋 단위**
   - 현재 브랜치(`codex/verification-plan`)에서 작업 B를 구현하고, 별도 커밋(`feat: add scoped e2e test runner and ci policy`)으로 분리 기록한다.

---

## 2. 검증 모드 분류 및 계약

```ts
export type E2EPlan = {
  mode: "docs" | "affected" | "full";
  base: string | null;
  reason: string;
  lessonIds: string[]; // ["review-sandwich", "review-flowchart", "review-abstraction", "programming"]
  testFiles: string[]; // 실행할 .spec.ts 목록
};
```

| 모드 | 조건 | 실행 범위 | Vercel 배포 관계 |
| :--- | :--- | :--- | :--- |
| **`docs`** | 문서/마크다운/메타데이터만 변경 | 문서 검사만 수행 (Next.js 빌드 및 E2E 생략) | Vercel 앱 빌드 생략 |
| **`affected`** | 4개 수업 전용 경로 국소 변경 | Next.js 빌드 + 해당 수업 전용/혼합 spec + `lesson-smoke.spec.ts` | CI app job 성공 시 Vercel 배포 승인 |
| **`full`** | 공통 컴포넌트, 인증, DB, 인프라 변경, 불확실성, CI 수동 실행 | Next.js 빌드 + 398개 전체 E2E 실행 | CI app job 성공 시 Vercel 배포 승인 |

---

## 3. 세부 실행 작업 (Tasks 1–6)

### 작업 1 — 4개 수업 경로 및 테스트 매핑 확정
- **담당 파일:** `scripts/e2e-scope.mjs` (매핑 테이블), `docs/DEVELOPMENT.md`
- **세부 내용:**
  - 4개 수업군별 전용 소스 경로와 매핑 테스트 목록 확정:
    - **샌드위치 (`review-sandwich`):** `src/components/student/review/sandwich*.tsx`, `*.module.css`, `sandwich-engine.mjs` → `tests/review-sandwich.spec.ts`, `tests/sandwich-conversation.spec.ts`, `tests/review-practice-ui.spec.ts`
    - **순서도 (`review-flowchart`):** `src/components/student/review/flowchart*.tsx`, `flow-*.tsx`, `flowchart.module.css` → `tests/review-flowchart*.spec.ts`, `tests/flowchart-auto-completion.spec.ts`, `tests/review-practice-ui.spec.ts`
    - **추상화 (`review-abstraction`):** `src/components/student/review/abstraction*.tsx`, `abstraction.module.css`, `abstraction-data.mjs` → `tests/review-abstraction*.spec.ts`, `tests/review-practice-ui.spec.ts`
    - **프로그래밍 (`programming`):** `src/components/student/programming-lesson.tsx`, `entry-practice-workspace.tsx`, `public/entryjs/**` → `tests/programming-*.spec.ts`, `tests/entryjs-ui.spec.ts`, `tests/manual-save-entry.spec.ts`, `tests/practice-focus.spec.ts`
  - 공통 혼합 테스트(`tests/lesson-feedback-workspace.spec.ts`)를 관련 수업 변경 시 안전하게 포함.
  - 공용 부품(`use-work.ts`, `lesson-shell.*`, `lesson-editor.tsx`, `src/lib/server/**`, 설정 파일 등)은 모두 `full` 트리거로 정의.
- **완료 조건:** `e2e-scope.mjs`에 정확한 파일 경로 매핑 정의 완료.

### 작업 2 — 수업별 경량 스모크 테스트 구현 (`tests/lesson-smoke.spec.ts`)
- **담당 파일:** `tests/lesson-smoke.spec.ts`, `tests/emulator.ts`
- **세부 내용:**
  - `CS_SMOKE_LESSON_IDS` 환경변수(JSON 배열)를 읽어 지정된 수업만 실행 (환경변수 없을 시 등록된 4개 수업 모두 실행).
  - 4개 수업 어댑터 구현 (`openPractice`, `writeDraft`, `expectRestored`):
    - 샌드위치: 조리대에서 재료 선택하여 명령 추가 → 수동 저장(`Ctrl+S` 또는 저장 버튼) → 새로고침 → 명령 및 조리대 상태 복원 확인.
    - 순서도: 퍼즐 기호 배치 또는 기호 문구 변경 → 수동 저장 → 새로고침 → 기호 및 문구 복원 확인.
    - 추상화: 핵심 요소 카드 선택 → 수동 저장 → 새로고침 → 선택 상태 복원 확인.
    - 프로그래밍: 후기 `<textarea>`에 고유 마커 텍스트 입력 → 수동 저장 → 새로고침 → 텍스트 복원 확인.
  - 수업당 5~8초 내외의 빠른 속도로 동작하도록 최소 필수 조작만 수행.
- **완료 조건:** 단독 실행(`npx playwright test tests/lesson-smoke.spec.ts`) 시 4개 수업 모두 깨끗하게 통과.

### 작업 3 — 보수적 선택 판정기 및 단위 테스트 작성
- **담당 파일:** `scripts/e2e-scope.mjs`, `scripts/ci-policy.mjs`, `tests/e2e-scope.test.mjs`, `tests/ci-policy.test.mjs`
- **세부 내용:**
  - `selectE2E(files)`: 변경 파일 목록을 입력받아 `mode`, `reason`, `lessonIds`, `testFiles`를 반환하는 순수 함수.
    - 문서만 변경 시 `docs`
    - 전용 경로만 변경 시 `affected` (해당 spec + smoke)
    - 두 수업 동시 변경 시 두 수업 테스트의 합집합
    - 공통 파일 포함 또는 불확실 경로 시 `full`
    - 파일 목록이 비었거나 비교 실패 시 `full`
  - `ci-policy.mjs`:
    - CI 환경: 마지막 성공 커밋 vs HEAD 누적 diff 추출.
    - 로컬 환경: `git diff --name-only <base>` + unstaged + staged 미커밋 변경을 모두 합산하여 판정.
    - 수동 실행(`workflow_dispatch`): 항상 `full` 반환.
    - 판정 결과를 `scratch/ci/e2e-plan.json`으로 저장.
  - `tests/e2e-scope.test.mjs` & `tests/ci-policy.test.mjs`: 모든 케이스에 대한 단위 테스트 작성 및 통과 확인.
- **완료 조건:** `node --test tests/e2e-scope.test.mjs tests/ci-policy.test.mjs` 100% 통과.

### 작업 4 — 선별 실행기(Runner) 구현 및 package.json 연결
- **담당 파일:** `scripts/run-selected-e2e.mjs`, `package.json`
- **세부 내용:**
  - `scripts/run-selected-e2e.mjs`:
    - `--plan <path>`로 계획 JSON 파일을 읽고 유효성(schema, 0개 실행 방지) 검증.
    - `--running`: 이미 에뮬레이터/서버가 켜져 있는 로컬 환경 지원.
    - 기본 모드: Firebase 에뮬레이터(`firebase emulators:exec`) 내에서 Playwright CLI 호출.
    - `affected`: 전달받은 `testFiles` + `tests/lesson-smoke.spec.ts`를 argv로 전달하여 실행. `CS_SMOKE_LESSON_IDS` 환경변수 주입.
    - `full`: 전체 spec 실행 (`tests/lesson-smoke.spec.ts`는 전수 실행).
    - `docs`: E2E 생략 메시지 출력 후 정상 종료(0).
    - 자식 프로세스의 실패 코드 및 시그널을 그대로 상위로 전파.
  - `package.json`에 스크립트 추가:
    - `"test:scope"`: 정책 및 스코프 단위 테스트 실행 (`node --test tests/ci-policy.test.mjs tests/e2e-scope.test.mjs`)
    - `"test:e2e:scope"`: 로컬 영향 판정 후 선별 E2E 실행 runner 호출
- **완료 조건:** `run-selected-e2e.mjs`를 통한 선별 실행이 의도대로 동작함을 검증.

### 작업 5 — 로컬 종합 통합 검증 및 CI Workflow 연동
- **담당 파일:** `.github/workflows/verify.yml`
- **세부 내용:**
  - `.github/workflows/verify.yml`:
    - `app` job에서 `scripts/ci-policy.mjs` 실행 결과를 바탕으로 조건 분기:
      - `mode != 'docs'`일 때 종속성 설치, 빌드(`npm run build`), Java/에뮬레이터 준비.
      - E2E 단계에서 `node scripts/run-selected-e2e.mjs --plan scratch/ci/e2e-plan.json` 호출.
      - 실패 시에만 `test-results` artifact 보관.
  - 로컬 환경 종합 검증:
    - `npm.cmd run typecheck`
    - `npm.cmd run lint`
    - `npm.cmd run test:scope`
    - `npm.cmd run test:review`
    - `tests/lesson-smoke.spec.ts` 실행 확인
- **완료 조건:** 모든 로컬 검사 통과 및 CI workflow 파일 문법/조건 무결성 확인.

### 작업 6 — 문서 마감 및 커밋
- **담당 파일:** `AGENTS.md`, `docs/DEVELOPMENT.md`, `README.md`, `docs/HANDOFF.md`
- **세부 내용:**
  - `AGENTS.md`: 변경 영향별 검증 실행 원칙 짧게 추가.
  - `docs/DEVELOPMENT.md`: 영향별 검사 기준표 및 사용 명령(`npm run test:e2e:scope`) 갱신.
  - `docs/HANDOFF.md`: 작업 B 구현 완료 상태 및 인계 사항 갱신.
  - `git diff --check` 공백 오류 확인.
  - `feat: add scoped e2e test runner and ci policy` 커밋 생성.
- **완료 조건:** 문서 검사 통과 및 깔끔한 git log 생성.

---

## 4. 안전 및 롤백 대책

- **0개 테스트 통과 방지:** Playwright `--list`로 수집된 테스트 수가 0개이거나 매핑된 파일이 실제로 존재하지 않으면 즉시 에러(exit code 1)로 중단된다.
- **불확실성 격상:** diff 파싱 실패, 신규 미매핑 파일, 공통 모듈 수정 등 의심스러운 모든 상황은 안전하게 `full`(전체 E2E)로 승격된다.
- **롤백 절차:** 문제 발생 시 작업 B 커밋만 revert하면 기존의 안전한 docs/full 전체 검사 체계로 즉시 복구된다.
