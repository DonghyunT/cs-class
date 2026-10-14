# 개발 환경 및 엔지니어링 가이드 (Development Guide)

갱신: 2026-10-14(Asia/Seoul). 빠른 실행과 저장소 소개는 [README](../README.md), 에이전트 핵심 행동 지침은 [AGENTS](../AGENTS.md), 기능 요구사항은 [PRD](PRD.md), 화면 디자인 시스템은 [DESIGN](DESIGN.md), 인계 상태는 [HANDOFF](HANDOFF.md)를 따릅니다. 모든 명령어는 저장소 루트에서 실행합니다.

---

## 1. 빠른 시작 및 로컬 개발 환경 (Quick Start)
<a id="다른-pc에서-시작"></a>
<a id="제한된-windows-환경-검사"></a>

### 1.1 시스템 요구사항
- **Node.js:** `v24.x` (LTS)
- **Java:** `JDK 21+` (Firebase Auth/Firestore 에뮬레이터 구동용, `java -version` 확인)
- **Git & PowerShell / Bash**

### 1.2 저장소 복제 및 로컬 실행
```powershell
git clone --branch main https://github.com/DonghyunT/cs-class.git
cd cs-class
npm ci
npm run dev:emulator
```

> [!TIP]
> - Windows PowerShell에서 스크립트 실행 권한 차단 시 `npm.cmd` 및 `npx.cmd`를 사용합니다.
> - Windows 사용자 캐시에서 `EPERM` 접근 오류 발생 시 Git 제외 폴더 캐시를 지정합니다:
>   `npm.cmd ci --cache .\scratch\npm-cache --no-audit --no-fund`
> - Java PATH가 누락된 경우, 설치된 JDK 21의 `bin` 디렉터리를 터미널 PATH 앞에 추가합니다:
>   `$env:PATH = "C:\path\to\jdk-21\bin;$env:PATH"`

### 1.3 로컬 게스트 계정 및 테스트 자격 증명
<a id="로컬-게스트-입장"></a>

- **접속 주소:** `http://localhost:3000`
- **에뮬레이터 포트:** Auth `9099`, Firestore `8080`, Web App `3000` (프로젝트 ID: `demo-cs-class`)
- **게스트 즉시 로그인:**
  - **학생 게스트:** 학생 로그인 카드 하단의 `게스트로 체험하기` 클릭 (계정: `21099`, 합성 학번 `20101` 등)
  - **교사 게스트:** 교사 로그인 카드 하단의 `게스트로 체험하기` 클릭 (10·11반 담당 강사 권한)
- **합성 테스트 계정 초기 비밀번호:** [scripts/local-test-env.mjs](../scripts/local-test-env.mjs)에 정의되어 있으며 실제 비밀정보는 포함하지 않습니다.

### 1.4 에뮬레이터 데이터 보존 및 복원 (Export/Import)

읽기 최적화의 선별 검사는 `tests/help-paused.spec.ts`, `tests/read-polling.spec.ts`로 손들기 중지·교사 수동 조회·권한·느린 응답 경합을 확인합니다. 손들기 활성 모드 검사(`help-requests`, `help-races`, 관련 UI 검사)는 보존하되 공유 설정이 false이면 명시적으로 생략하며 이를 통과로 집계하지 않습니다. 복구 시 설정을 true로 변경한 뒤 재빌드하여 활성 모드 검사를 실행합니다. `tests/read-usage.spec.ts`는 공개 수업 4개·학생 27명·담당 반 11개의 10분 가상 시간 요청 샘플이며 과금 실측이 아닙니다. 다른 Playwright 실행과 병렬로 돌릴 때는 `--output` 경로를 분리해야 합니다. 가상 시계와 서버 시계가 어긋나 활동 갱신 응답은 측정용 fixture로 분리하고 세션 비용은 별도 모형으로 계산합니다.
<a id="기존-demo-기록을-복원해-보기"></a>
<a id="테스트-환경과-데이터-보호"></a>

에뮬레이터 종료(`Ctrl+C`) 시 로컬 데이터는 초기화됩니다. 작성 중인 작업실 작품이나 반 설정을 백업하고 이어보려면 Git 제외 scratch 경로로 내보내고 가져옵니다:

```powershell
# 현재 에뮬레이터 데이터 내보내기 (서버 종료 전 실행)
npx.cmd firebase emulators:export .\scratch\demo-backup --project demo-cs-class

# 백업 데이터 가져오며 에뮬레이터 시작
npx.cmd firebase emulators:start --only auth,firestore --project demo-cs-class --import .\scratch\demo-backup
```

---

## 2. 브랜치 전략 및 수업 개발 워크플로우 (Workflow & Checklist)

### 2.1 투 트랙 브랜치 & 통합 전략 (Two-Track Integration)
프로젝트는 빠른 반복(Vibe Coding)과 시스템 안정성을 동시에 보장하기 위해 작업 규모별 투 트랙을 채택합니다:

1. **Fast-Track (일상적 작업 / 단일 수업 개발):**
   - **대상:** 신규 수업 추가, 개별 화면 UI 다듬기, 국소 버그 수정.
   - **워크플로우:** `codex/<feature>` 브랜치 작업 ➔ 로컬 선별 검증 통과 ➔ 사용자 확인 후 `main`에 직접 반영(Fast-Forward 병합 또는 직접 푸시).
2. **PR-Track (대규모 작업 / 아키텍처 피벗 / 공통 모듈 전면 개편):**
   - **대상:** 공통 아키텍처 수정(`useWork`, `SessionProvider`), 데이터 모델 개편, 디렉터리 구조 재편, 방향성 전환.
   - **워크플로우:** `feature/<name>` 또는 `refactor/<name>` 브랜치 ➔ 선별 검증 및 단위 검증 통과 ➔ **GitHub Pull Request(PR)** 발행 ➔ 웹에서 시각적 Diff 및 변경 영향도 리뷰 ➔ CI 통과 확인 후 `main`에 안전 병합.

### 2.2 신규 수업 추가 4단계 체크리스트
<a id="신규-수업-추가-및-선별-검증-연동-체크리스트"></a>

새로운 수업을 추가할 때 모든 개발자와 AI 에이전트는 아래 4단계를 순서대로 완료해야 합니다:

#### 1단계: 컴포넌트 분리 (`src/components/student/...`)
- **컴포넌트 위치:** `src/components/student/<수업ID>.tsx` 또는 전용 하위 폴더(`review/<수업ID>.tsx`).
- **공통 셸 구성:** [`LessonWorkspace`](../src/components/student/lesson-workspace.tsx) 또는 [`LessonEditor`](../src/components/student/lesson-editor.tsx)로 감싸 공통 헤더·진도율 바·저장 상태 배지 영역을 확보합니다.

#### 2단계: 저장 상태 연동 (`useWork`)
- [`LessonWorkspace`의 `StudentWorkEditor`](../src/components/student/lesson-workspace.tsx)처럼 서버에서 받은 `initial: Work`와 로그인한 계정의 `uid`로 공통 훅 [`useWork`](../src/components/student/use-work.ts)를 초기화합니다:
  ```typescript
  const controller = useWork(initial, uid);
  const { draft, update, save, saveState } = controller;
  ```
- Entry 작업실은 기존 `StudentWorkEditor`처럼 네이티브 작품을 읽는 함수를 준비해 `useWork(initial, uid, readEditorDraft)`로 전달합니다.
- **수업 컴포넌트 연결:** 하위 수업 컴포넌트는 이미 생성한 `controller`를 전달받아 사용합니다. 같은 작품에 `useWork`를 중복 생성하지 않습니다.
- **수동 저장 연동:** 상단 '저장' 버튼에는 `save`를 전달하며, 키보드 `Ctrl+S` / `Cmd+S`도 같은 `save()`를 호출합니다.
- **이탈 가드:** `useWork`가 `NavigationProvider`에 현재 작품의 가드를 등록합니다. 미저장 내용이 있으면 외부 이동 전에 `저장 후 나가기`, `저장하지 않고 나가기`, `취소`를 선택합니다.
- **금지:** 컴포넌트 내부에 독자적인 `debounce` 자동 저장 타이머를 신설하지 않습니다.

#### 3단계: E2E 테스트 작성 (`tests/<수업ID>.spec.ts`)
- 수업 입력칸에서 실제 내용을 편집한 뒤 단축키 또는 저장 버튼을 조작하고, 상단 `role="status"`의 `저장 완료`를 단언합니다. 버튼 이름은 저장 전후 모두 `저장`입니다:
  ```typescript
  await page.keyboard.press("Control+s");
  await expect(page.locator('[data-lesson-shell] header [role="status"]')).toHaveText("저장 완료");
  ```
- 저장 버튼으로 검사할 때는 기존 [`saveDraft(page)` 검사 도우미](../tests/emulator.ts)를 재사용할 수 있습니다.
- 변경 후 다른 화면 이동 시 이탈 가드 모달(`저장 후 나가기`, `저장하지 않고 나가기`, `취소`) 노출을 확인합니다.

#### 4단계: 선별 검증기 등록 (`scripts/e2e-scope.mjs` & `tests/lesson-smoke.spec.ts`)
- [`scripts/e2e-scope.mjs`](../scripts/e2e-scope.mjs)의 `LESSON_MAPPINGS`에 수업 패턴과 테스트 파일을 등록합니다:
  ```javascript
  "<수업ID>": {
    lessonId: "<수업ID>",
    patterns: [/^src\/components\/student\/<수업ID>(?:\.tsx|\.module\.css)$/],
    tests: ["tests/<수업ID>.spec.ts"]
  }
  ```
- [`tests/lesson-smoke.spec.ts`](../tests/lesson-smoke.spec.ts) 대상 수업 목록에 추가하여 공통 저장·복원 스모크에 포함합니다.

### 2.3 학생 수업 수동 저장 아키텍처 및 코드 계약
<a id="학생-수업-수동-저장-아키텍처-및-계약"></a>
<a id="수동-저장-전환의-코드-계약-a0-조사"></a>

학생 수업의 작업 저장은 자동 저장을 배제하고 명시적인 수동 저장(Manual Save) 아키텍처를 따릅니다. 제품 정책은 [PRD](PRD.md#학생-수업의-수동-저장-정책)를 따릅니다.

| 컴포넌트 / 훅 | 저장 책임 및 코드 계약 |
| :--- | :--- |
| [`useWork.update`](../src/components/student/use-work.ts) | 메모리 편집 및 내용 비교; 자동 네트워크 POST 없음 |
| `useWork.captureDraft` | 필요 시 네이티브 작품을 읽어 메모리 초안에 반영; 캡처 중 추가 편집도 보존 |
| `useWork.save` / `flush` | 사용자 명시 행동용; 단일 불변 스냅샷/단일 writer; 추가 편집은 dirty로 유지 |
| `useWork.perform` / `requestAi` | AI 요청 비교 기준은 확정된 서버 스냅샷이며 대기 중 추가 편집도 보존 |
| [`work-draft.ts`](../src/components/student/work-draft.ts) | `stage`·미션 위치 등 읽기 뷰는 내용 비교에서 제외; 실제 답안·배치·코드만 내용(Dirty)으로 판정 |
| [`work-recovery.ts`](../src/components/student/work-recovery.ts) | 서버 복구 기록의 형식·기본값 누락과 원래 요청의 수업·revision·작품 결과를 판별; 상태 변경·네트워크 전송은 `useWork`가 전담 |
| [`navigation-provider.tsx`](../src/components/navigation-provider.tsx) | `prepareLeave` / `save` / `discard` 3선택 이탈 가드. 외부 링크, 브라우저 뒤로가기, 로그아웃 보호 |
| [`HelpButton`](../src/components/classroom/help-button.tsx) | 손들기 요청 시 현재 작품의 exact 스냅샷을 먼저 서버에 저장 후 도움 요청 POST 전송 |
| [`LessonShell`](../src/components/student/lesson-shell.tsx) | 저장 버튼과 상태 배지 노출; `useWork`와 Entry 브리지가 창/iframe 단축키를 같은 `save`로 전달 |

- **Content Dirty vs. Exact Snapshot Difference:** 화면 이동 경고는 학생의 실제 작업 내용 변화(Content Dirty)만 감지하며, 탭 위치나 스크롤 좌표만 바뀐 경우에는 경고창 없이 이동합니다.

---

## 3. 검증 및 테스트 체계 (Verification & Testing Matrix)
<a id="검증"></a>
<a id="용어와-현재-자동화"></a>
<a id="변경-영향별-검사-기준"></a>
<a id="실행-방법"></a>
<a id="변경-영향별-선별-검증"></a>
<a id="ci-개선-후속-작업"></a>

### 3.1 계층형 검증 티어 (Tiered Verification)
일상적인 빠른 개발 피드백(Vibe Coding)을 위해 검증은 가벼운 순서대로 계층화되어 있습니다:

| 티어 | 검증 범위 | 실행 명령 | 권장 실행 시점 |
| :--- | :--- | :--- | :--- |
| **Tier 1: 초경량 단위 검증** | 순수 로직, 문서, 정책 | `npm run test:scope`<br>`npm run test:review`<br>`node scripts/check-docs.mjs` | 파일 저장 시, 상시 반복 |
| **Tier 1.5: 정적 검사** | 타입 안정성, 린트 | `npm run lint`<br>`npm run typecheck` | 커밋 전 필수 |
| **Tier 2: 선별 E2E (Scoped)** | 변경된 수업 + 공통 스모크 | `npm run test:e2e:scope:running` (서버 구동 중)<br>`npm run test:e2e:scope` (원스톱) | 기능 구현 완료 시 (기본) |
| **Tier 3: 전체 E2E (Full Suite)** | 전체 회귀 검증 | `npm run test:e2e` | **사용자 명시 요청 시에만** |

`test:review`는 기존 Node 리뷰 검사와 [`playwright.logic.config.ts`](../playwright.logic.config.ts)의 `tests/*.test.ts`를 실행합니다. 이 TypeScript 검사 경로는 브라우저 fixture를 쓰지 않으며 앱 서버·에뮬레이터를 시작하지 않습니다.

검사 개수는 `npx playwright test --list`로 현재 E2E 목록을 조회하고, 순수 TypeScript 목록은 `npx playwright test --config=playwright.logic.config.ts --list`로 확인합니다. 실행 시간은 검사 범위·PC/CI 환경·캐시·에뮬레이터 준비 상태에 따라 달라지므로 고정된 상한으로 안내하지 않습니다. 날짜·환경·범위별 실제 결과는 [HANDOFF의 검증 기록](HANDOFF.md#현재-작업-상태)에 남깁니다.

### 3.2 로컬 에이전트 vs 깃허브 CI 검증 매트릭스
로컬과 CI 모두 평시에는 **선별 검증 및 코어 스모크**를 기본으로 삼아 자원과 시간을 절약합니다:

| 구분 | 로컬 에이전트 실행 | 깃허브 CI 실행 (`.github/workflows/verify.yml`) |
| :--- | :--- | :--- |
| **일상 커밋 (Fast-Track)** | 선별 E2E(`test:e2e:scope:running`) 및 단위 검증만 실행 | PR 업데이트·main push에서 마지막 성공 main CI 이후 변경을 누적 비교. 문서만이면 E2E 생략, 등록된 수업 변경이면 해당 E2E와 공통 스모크 실행 |
| **공통 모듈·설정·미분류 변경 시** | 코어 스모크 통과 후, 에이전트가 사용자에게 전체 E2E 실행 여부를 질문 | `smoke` 모드로 전체 등록 수업 스모크와 확인된 관련 수업 검사 실행. 비교 기준이 없거나 조회에 실패해도 전체 검사로 승격하지 않음 |
| **전체 E2E** | **사용자의 명시적 요청 또는 에이전트 질문 후 사전 승인 시에만 실행** | **GitHub Actions의 `workflow_dispatch` 수동 실행으로만 수행** |

자동 CI의 `app`에는 비문서 변경의 정책·단위 검사, lint, typecheck, 빌드와 위 선별/스모크 검사가 포함됩니다. 스모크 성공을 전체 회귀 검증 성공으로 해석하지 않습니다. 큰 변경의 전체 검사가 필요하면 별도로 승인받아 수동 실행합니다. 수동 실행 결과는 PR에 실행 SHA·범위와 함께 기록합니다.

[`run-selected-e2e.mjs`](../scripts/run-selected-e2e.mjs)는 자동 GitHub 실행에서 남아 있는 `full` 계획과 알 수 없는 모드를 실행 전에 거절합니다. `smoke` 모드는 수업 필터를 해제해 전체 등록 수업을 확인하고, 등록 수업만의 `affected` 모드는 해당 수업에 한정합니다. [PR 이벤트](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request)와 [수동 실행](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)은 GitHub 공식 안내를 따릅니다.

> [!IMPORTANT]
> **전체 E2E 실행 및 선제적 질문 원칙:**
> - 평시 로컬 개발에서는 터미널 점유 및 컨텍스트 스위칭을 방지하기 위해 전체 E2E를 절대 임의로 실행하지 않습니다.
> - **실행 조건:**
>   1. **사용자의 명시적 요청:** 사용자가 "전체 E2E 돌려줘"라고 직접 지시한 경우.
>   2. **큰 변경 작업 시 에이전트의 선제적 확인:** 인증, 공통 데이터 계약, `useWork` 코어, 전역 스타일 등 변경 규모가 큰 작업인 경우, 에이전트가 먼저 *"대규모 변경이 발생했으므로 로컬 전체 E2E를 돌려볼까요?"*라고 질문하고 **사용자의 확인 및 승인을 받은 후** 실행합니다.

### 3.3 사용자 직접 브라우저 검증 및 대화형 디버깅
에이전트의 자동 단언 외에도, 개발자가 브라우저를 직접 띄워 눈으로 확인하고 상호작용할 수 있습니다:

```powershell
# 1. Playwright 대화형 UI 모드로 타깃 검사 실행 (시간 역행 디버깅, DOM 탐색)
npx playwright test tests/<대상>.spec.ts --ui

# 2. 브라우저 화면(Headed)을 띄운 상태로 E2E 실행
npm run test:e2e:running -- tests/<대상>.spec.ts --headed

# 3. 로컬 에뮬레이터 환경에서 직접 브라우저 수동 검증
# 브라우저에서 http://localhost:3000 접속 후 게스트 버튼으로 바로 조작
```

### 3.4 디버깅 및 Flaky 방지 원칙
- **임의 지연 금지:** `waitForTimeout`이나 임의의 `sleep`으로 타이밍 문제를 회피하지 않습니다.
- **기대 상태 대기:** 저장 배지의 `toHaveText()` 또는 `await expect(locator).toBeVisible()`처럼 자동 재시도하는 단언으로 준비 상태를 확인합니다. 필요한 경우 특정 요청의 응답을 기다린 뒤 화면 상태도 단언합니다. `networkidle`이나 클릭 직후 한 번의 `isVisible()` 조회를 준비 완료 기준으로 쓰지 않습니다. [Playwright 공식 권고](https://playwright.dev/docs/best-practices#use-web-first-assertions)를 따릅니다.
- **수동 저장 이탈 검사:** Entry 작업실은 현재 작품을 비동기로 캡처한 뒤 이탈 확인창을 엽니다. 미저장 입력을 명시한 시나리오는 `expect(dialog).toBeVisible()` 후 나가기 선택과 서버 기록 보존을 확인합니다. 클릭 직후 `isVisible()` 한 번으로 확인창을 건너뛰지 않습니다.
- **원인 분석:** 실패 시 `test-results/` 폴더의 스크린샷과 Playwright 트레이스 zip을 열어 실제 렌더링 상태를 확인합니다.

---

## 4. 핵심 도메인 모듈 개발 가이드 (Core Modules Guide)
<a id="검증-노하우-기능별"></a>

### 4.1 EntryJS 4.0.23 실습 환경
<a id="entryjs-실습"></a>
<a id="운영-프로그래밍-수업"></a>
<a id="프로그래밍-수업-프로토타입"></a>
<a id="코드-위치와-역할"></a>

- **자산 및 무결성:** `npm ci` 시 `scripts/prepare-entryjs.mjs`가 SHA-512 검증 후 `public/entryjs/vendor/`에 브라우저 자산을 준비합니다.
- **iframe 격리:** 작업실(`public/entryjs/workspace.html`)과 브리지(`workspace.js`)는 `allow-scripts`만 허용한 격리 iframe에서 구동되며 부모의 쿠키나 세션에 접근할 수 없습니다.
- **이미지 CORS & 포커스:** `Entry.init` 전 이미지 생성에 `crossOrigin="anonymous"`를 적용하여 픽셀 클릭 판정을 보장합니다. 질문창 커서 깜빡임 방지를 위해 중복 `focus()` 호출을 제한합니다.
- **수동 저장 연동:** 실행 중 전체 내보내기 대신 정지 상태의 코드만 반영하며, `useWork`를 통해 단일 불변 스냅샷으로 저장합니다.

### 4.2 알고리즘 복습 연구소
<a id="알고리즘-복습-수업"></a>

- **코드 구조:** `src/lib/classroom/review/`에 순수 엔진(샌드위치, 순서도 실행기, 추상화 데이터)을 두고, 화면 컴포넌트는 `src/components/student/review/`에 배치합니다.
- **순서도 (`flowchart.tsx`):** 퍼즐 실습(3열), 예시 공방(2열), 자유 공방(4열). 임의 JS 실행 없이 순수 표현식 인터프리터(`flow-runner.mjs`)로 동작합니다.
- **AI 엔드포인트 (`POST /api/classroom/ai`):** HMAC 기반 요청 검증, 학생별 사용량 제한(`csAiUsage/{uid}`: 60초 15회 / 1일 70회), 결과 TTL 캐시(24시간)를 적용합니다.

### 4.3 대시보드 및 교사 미리보기
<a id="대시보드-파일럿"></a>
<a id="교실-입장대시보드-조회-성능"></a>
<a id="대시보드-및-화면-셸"></a>

- **반 선택 세션:** `SessionProvider`의 `useTeacherClass`는 탭 단위 `sessionStorage`로 선택 반을 관리하며 URL 쿼리(`?classId=...`)와 연동됩니다.
- **교사 수업 미리보기 (`/teacher/preview/[id]`):** `LessonPreview`와 `usePreviewWork`는 실제 `LessonShell`을 `mode="preview"`로 렌더링하며, 학생 학습 컬렉션 쓰기를 엄격히 차단하고 컴포넌트 메모리에서만 동작합니다.

### 4.4 학교 시간표 연동 Fixture
<a id="학교-시간표-연동"></a>

- 자동 테스트에서는 `scripts/timetable-fixture.mjs`의 `127.0.0.1:4781` 로컬 합성 서버를 사용합니다.
- `CS_TIMETABLE_FIXTURE=1` 환경변수와 함께 실행 시 외부 실제 나이스/학교 서버 호출 없이 안정적인 시간표 조회 흐름을 검증합니다.

---

## 5. 운영 도구 및 트러블슈팅 (Tools & Troubleshooting)

### 5.1 학생 명부 및 계정 관리 도구
<a id="실학생-명부-준비와-반별-발급"></a>
<a id="첫-실제-수업-확인-순서"></a>

실제 학생 명부의 계정 생성 및 관리는 승인된 환경에서 전용 스크립트로 수행합니다 (모든 입력/출력 파일은 Git 제외 `private/`에 보관):

```powershell
# 1. 명부 검증 및 사전 계획 수립 (읽기 전용)
node scripts/student-roster.mjs --csv private/student-roster.csv --year 2026 --mode validate

# 2. 반별 최초 임시 접속값 발급 (30분 만료)
node --env-file=.env.local scripts/student-roster.mjs --csv private/student-roster.csv --year 2026 --mode issue --class 2-1 --output private/class-2-1.ndjson --apply --confirm-project cs-class-f74c4

# 3. 비상 시 수업 기록 백업
node --env-file=.env.local scripts/student-roster.mjs --csv private/student-roster.csv --year 2026 --mode backup --output private/backup.json --apply --confirm-project cs-class-f74c4
```

### 5.2 실패 진단 및 에러 로깅 규격
<a id="실패-진단과-오류-번호"></a>
<a id="공통-데이터-계약을-수정할-때"></a>

- 서버 오류 응답은 `src/lib/server/failure-log.ts`를 통해 고정된 5개 필드(`requestId`, `operation`, `category`, `status`, `timestamp`)만 구조화 로깅합니다.
- 학생 식별자, 인증 토큰, 비밀번호, Zod 에러 상세 등 민감 정보는 로그로 복사하지 않습니다.

### 5.3 트러블슈팅 FAQ
<a id="ui-및-상호작용-공통"></a>
<a id="css-및-컴포넌트-구현-규칙"></a>
<a id="외부-환경과-로컬-전용-자료"></a>
<a id="stitch-연결"></a>
<a id="stitch-상태"></a>

- **포트 충돌 (9099, 8080, 3000):** 기존 에뮬레이터 프로세스가 비정상 종료된 경우, 해당 포트를 점유한 Node 프로세스를 식별하여 종료합니다:
  ```powershell
  Get-NetTCPConnection -LocalPort 9099,8080,3000 -ErrorAction SilentlyContinue | Select-Object OwningProcess -Unique
  ```
- **Playwright Secure 쿠키 이슈:** E2E 앱 주소는 항상 `http://localhost:3000`을 사용합니다. `127.0.0.1`에서는 운영 빌드의 Secure 쿠키 전송이 차단될 수 있습니다.
- **Stitch 디자인 플러그인:** Codex Stitch 연동 키는 `STITCH_API_KEY` 환경변수로만 관리하며 저장소나 로그에 노출하지 않습니다.
