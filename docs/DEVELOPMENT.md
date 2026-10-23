# 개발 환경 및 엔지니어링 가이드 (Development Guide)

갱신: 2026-10-22(Asia/Seoul). 빠른 실행과 저장소 소개는 [README](../README.md), 에이전트 핵심 행동 지침은 [AGENTS](../AGENTS.md), 기능 요구사항은 [PRD](PRD.md), 화면 디자인 시스템은 [DESIGN](DESIGN.md), 인계 상태는 [HANDOFF](HANDOFF.md)를 따릅니다. 모든 명령어는 저장소 루트에서 실행합니다.

---

## 1. 빠른 시작 및 로컬 개발 환경 (Quick Start)
<a id="다른-pc에서-시작"></a>
<a id="제한된-windows-환경-검사"></a>

### 1.1 시스템 요구사항
- **Node.js:** `v24.x` (LTS) 중 24.12 이상(`firebase` 13의 `@firebase/app`·`@firebase/auth`가 `>=24.12.0` 요구)
- **Java:** `JDK 21+` (Firebase Auth/Firestore 에뮬레이터 구동용, `java -version` 확인). Windows는 PC마다 `winget install EclipseAdoptium.Temurin.21.JDK`로 설치한 뒤 터미널과 에이전트 앱을 다시 엽니다.
- **Chromium(E2E):** `npx playwright install --only-shell chromium` (PowerShell 차단 시 `npx.cmd`)
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
> - 설치 없이 임시로 쓰는 JDK라면 그 `bin` 디렉터리를 터미널 PATH 앞에 추가합니다:
>   `$env:PATH = "C:\path\to\jdk-21\bin;$env:PATH"`

### 1.3 로컬 게스트 계정 및 테스트 자격 증명
<a id="로컬-게스트-입장"></a>

- **접속 주소:** `http://localhost:3000`
- **에뮬레이터 포트:** Auth `9099`, Firestore `8080`, Web App `3000` (프로젝트 ID: `demo-cs-class`)
- **게스트 즉시 로그인:**
  - **학생 게스트:** 로그인 화면 아래 `빠르게 체험하기`의 `게스트 학생` (학번 `21099`, 2학년 10반)
  - **교사 게스트:** 같은 곳의 `게스트 교사` (교사 권한, 2학년 1~11반 담당, 처음 화면은 1반)
- **그 밖의 합성 계정:** 학생 `20101`, 강사 `instructor` 등은 [scripts/seed-emulator.mjs](../scripts/seed-emulator.mjs)가 만듭니다.
- **합성 테스트 계정 초기 비밀번호:** [scripts/local-test-env.mjs](../scripts/local-test-env.mjs)에 정의되어 있으며 실제 비밀정보는 포함하지 않습니다.

### 1.4 에뮬레이터 데이터 보존 및 복원 (Export/Import)

<a id="기존-demo-기록을-복원해-보기"></a>
<a id="테스트-환경과-데이터-보호"></a>

에뮬레이터 종료(`Ctrl+C`) 시 로컬 데이터는 초기화됩니다. 작성 중인 작업실 작품이나 반 설정을 백업하고 이어보려면 Git 제외 scratch 경로로 내보내고 가져옵니다:

```powershell
# 현재 에뮬레이터 데이터 내보내기 (서버 종료 전 실행)
npx.cmd firebase emulators:export .\scratch\demo-backup --project demo-cs-class

# 백업 데이터 가져오며 에뮬레이터 시작
npx.cmd firebase emulators:start --only auth,firestore --project demo-cs-class --import .\scratch\demo-backup
```

`npm run dev:emulator`는 시작할 때마다 `scripts/seed-emulator.mjs`로 합성 계정·반 설정을 다시 씁니다. 가져온 기록을 그대로 앱에서 보려면, 위처럼 에뮬레이터를 `--import`로 띄운 뒤 두 번째 터미널에서 아래 명령으로 **시드 없이** 앱만 실행합니다. `testEnv`가 demo 프로젝트와 로컬 에뮬레이터(9099/8080)를 가리키므로 운영에 연결되지 않습니다.

```powershell
node --input-type=module -e "import { spawn } from 'node:child_process'; import { testEnv } from './scripts/local-test-env.mjs'; const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', 'localhost', '--port', '3000'], { stdio: 'inherit', env: { ...process.env, ...testEnv } }); app.on('exit', code => process.exit(code ?? 1));"
```

이 방법은 합성 시간표 서버를 자동으로 띄우지 않습니다(필요하면 [학교 시간표 연동](#학교-시간표-연동) 참고). 종료 전에 새 export를 남기며, export는 개인 기록이므로 저장소에 넣지 않습니다.

### 1.5 다른 PC에서 진행 중 작업 이어가기
- HEAD·브랜치·기존 차이를 먼저 확인하고 기록을 보존합니다. 진행 중 작업은 [HANDOFF](HANDOFF.md#현재-작업-상태)에 적힌 브랜치로 `git fetch origin` → `git switch <브랜치>` → `npm ci` 순서로 이어 갑니다. HANDOFF 현재 작업 상태에 브랜치가 없으면 이어갈 브랜치는 없습니다. 원격의 다른 브랜치는 squash 병합 뒤 남은 PR 브랜치일 수 있어 git 조상 관계로 병합이 보이지 않으므로, PR 상태로 확인하며 이어 쓰지 않습니다.
- 다른 PC·앱이 올린 커밋을 받은 뒤 검사 전에 `npm ls --depth=0`을 돌려 `invalid`가 있으면 `npm ci`를 다시 합니다.
- Git은 코드·검사·문서만 전달합니다. 비밀 설정·관리자 키·로컬 에뮬레이터 기록·`scratch/`는 비공개 경로로 따로 옮기고 기존 기록과 대조합니다. 운영 계정·명부는 [서버 안내](FIREBASE_SETUP.md#승인된-운영-테스트-계정)와 아래 [명부 절차](#실학생-명부-준비와-반별-발급)를 따릅니다.

---

## 2. 브랜치 전략 및 수업 개발 워크플로우 (Workflow & Checklist)

### 2.1 위험도별 반영 경로
<a id="위험도별-반영-경로"></a>

변경의 위험도에 따라 두 경로 중 하나로 `main`에 반영합니다. 애매하면 PR 경로를 고릅니다. 아래 PR 경로의 대상이 이 문서에서 말하는 "큰 변경"입니다.

| 경로 | 대상 | 절차 |
| :--- | :--- | :--- |
| **PR 경로** | 학생 데이터·인증·권한·작업 저장 흐름(`useWork`)·Firestore 규칙·로그에 남기는 정보의 범위, 여러 화면이 함께 쓰는 공통 틀(`LessonShell`, `globals.css`), 신규 수업 추가(선별 검증기 등록 포함), 에이전트 규칙과 권한(`AGENTS.md`의 "검증 및 배포 규칙"·"절대 금지 사항", `.claude/` 설정), 배포와 검증 설정(`vercel.json`, `.vercelignore`, `firebase.json`, `firestore.indexes.json`, `.github/workflows/`, `playwright*.config.ts`, CI가 실행하는 `scripts/*.mjs`), 의존성 변경, 그리고 아래 직접 push 대상에 없는 모든 변경 | 작업 브랜치 → 로컬 검증(§3의 Tier 1~2) → GitHub PR(자동 리뷰·CI) → squash 병합 → [공개 후 확인](FIREBASE_SETUP.md#ci와-운영-공개) |
| **직접 push 경로** | 다음에 해당하는 작은 변경만: 문서(`README.md`·`AGENTS.md`·`docs/` 아래 `*.md` — CI가 문서로 보는 범위, 단 위 에이전트 규칙 변경은 제외), 이미 있는 한 수업·한 화면의 문구·스타일·표시용 화면 코드(서버 API 호출·저장·권한 처리를 바꾸지 않는 것), `tests/` 아래 파일만 바꾸는 변경(단 `tests/fixtures/entry-legacy-*.json` 제외) | 로컬 검증(§3의 Tier 1~2, 문서만 바꾸면 `node scripts/check-docs.mjs`와 `git diff --check origin/main`만) → `main`에 직접 push → `main` CI 결과 확인. CI는 `main`에서 한 번 실행됩니다 |

- **작업 브랜치 이름:** 기능은 `feat/<이름>`, 버그는 `fix/<이름>`, 문서·설정·정리는 `chore/<이름>`입니다.
- **커밋 메시지:** 영어 명령형 제목(예: `Limit student logins per account`)과, 무엇을 왜 바꿨는지 적는 본문으로 씁니다. 직접 push 경로에서는 로컬에서 돌린 검사 파일과 통과 개수를 본문에 적습니다. 로컬 결과는 GitHub에 남지 않기 때문입니다.
- **승인:** push와 병합은 [AGENTS의 승인 범위](../AGENTS.md#검증-및-배포-규칙) 안에서 합니다. PR 경로는 작업을 시작할 때 전체 E2E 실행 여부도 함께 정합니다.
- **직접 push 뒤 CI 실패:** 운영은 이전 버전 그대로입니다. 곧바로 고친 커밋을 올리거나 `git revert`로 되돌리며, 실패를 둔 채 다른 변경을 올리지 않습니다.
- **설치 스크립트 검토:** 의존성을 추가·업데이트하면 `npm approve-scripts --allow-scripts-pending`으로 설치 스크립트가 있는 패키지를 확인하고, 스크립트 내용을 읽은 뒤 `npm approve-scripts <패키지>`로 그 버전만 승인해 `package.json`의 `allowScripts`에 남깁니다. 검토 없이 `--all`로 한꺼번에 승인하지 않습니다.

### 2.2 신규 수업 추가 4단계 체크리스트
<a id="신규-수업-추가-및-선별-검증-연동-체크리스트"></a>

새로운 수업을 추가할 때 모든 개발자와 AI 에이전트는 아래 4단계를 순서대로 완료해야 합니다:

#### 1단계: 컴포넌트 분리 (`src/components/student/...`)
- **컴포넌트 위치:** `src/components/student/<수업ID>.tsx` 또는 전용 하위 폴더(`review/<수업ID>.tsx`).
- **공통 셸 구성:** [`LessonWorkspace`](../src/components/student/lesson-workspace.tsx) 또는 [`LessonEditor`](../src/components/student/lesson-editor.tsx)로 감싸 공통 헤더·진도율 바·저장 상태 배지 영역을 확보합니다.
- **엔트리 수업:** 새 컴포넌트 없이 `practice.type: "programming"` 수업 정의(예: [`conditionals-lesson.ts`](../src/lib/classroom/conditionals-lesson.ts))를 만들면 공통 개념·퀴즈 화면과 엔트리 실습 화면을 씁니다. 미션은 `PROGRAMMING_MISSIONS`·`LESSON_MISSIONS`([§4.1](#41-entryjs-4023-실습-환경)의 수업별 미션), 미션별 허용 블록은 `MISSION_BLOCKS`, 채점 규칙은 `programming-grader.ts`에 함께 등록합니다. 규칙이 없는 미션은 통과하지 않습니다. 공통 개념 화면의 그림은 [`concept-visual.tsx`](../src/components/student/concept-visual.tsx)의 `CONCEPT_VISUALS`에 개념 ID로 등록하며(없으면 그림 없이 표시), 수업의 첫 작품은 `emptyWork`가 `missionStarter`로 만듭니다. 수업 정의는 `catalog.ts`의 `LESSONS`(공개 시 `RELEASED_LESSONS`), 개념·퀴즈 정답은 서버 `solutions.ts`, 강아지 없는 미션은 `FREE_MISSIONS`에 등록합니다. 빠뜨리지 않으려면 기존 엔트리 수업 ID(`loops`)를 저장소 전체에서 검색해 같은 자리에 모두 넣습니다(`seed-emulator.mjs`, `tests/e2e-scope.test.mjs` 포함).
- **수업 내용 점검:** 개념·퀴즈·미션 문구와 피드백은 [PRD §3.1](PRD.md#31-수업-3단계-라이프사이클-및-진도-측정)·[§3.4](PRD.md#수업-내용-기준)와 [DESIGN §2.2·§5.1](DESIGN.md#22-타이포그래피-스케일-typography-rules)로 점검합니다.

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
- **엔트리 수업:** 힌트·조립 순서대로 만든 작품이 서버 검증을 통과하는지(`tests/entry-palette.test.ts`), 그린 선·말풍선이 실행 직후 무대에 남는지, 1,024px 가로에서 작업실 전체가 보이는지 확인합니다.

#### 4단계: 선별 검증기 등록 (`scripts/e2e-scope.mjs` & `tests/lesson-smoke.spec.ts`)
- [`scripts/e2e-scope.mjs`](../scripts/e2e-scope.mjs)의 `LESSON_MAPPINGS`에 수업 패턴과 테스트 파일을 등록합니다:
  ```javascript
  "<수업ID>": {
    lessonId: "<수업ID>",
    patterns: [/^src\/components\/student\/<수업ID>(?:\.tsx|\.module\.css)$/],
    tests: ["tests/<수업ID>.spec.ts"]
  }
  ```
- 엔트리 수업은 컴포넌트 파일이 없으므로 공통 묶음 `ENTRY_SHARED`와 수업 정의 파일 패턴으로 등록합니다(예: `conditionals`):
  ```javascript
  "<수업ID>": {
    lessonId: "<수업ID>",
    patterns: [...ENTRY_SHARED, /^src\/lib\/classroom\/<수업ID>-(?:lesson|data)\.ts$/, /^tests\/<수업ID>\.spec\.ts$/],
    tests: ["tests/<수업ID>.spec.ts"]
  }
  ```
- [`tests/lesson-smoke.spec.ts`](../tests/lesson-smoke.spec.ts)의 `ALL_LESSON_IDS`에 수업 ID를 넣고, 같은 파일에 그 수업의 저장·새로고침 복원 검사 블록을 추가합니다.
- `tests/lesson-ui-consistency.spec.ts`의 `lessons`에 새 수업을 넣어 공통 헤더·버튼 이름 검사를 받게 합니다.

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
빠른 개발 피드백을 위해 검증은 가벼운 순서대로 계층화되어 있습니다:

| 티어 | 검증 범위 | 실행 명령 | 실행 시점 |
| :--- | :--- | :--- | :--- |
| **Tier 1: 초경량 단위 검증** | 순수 로직, 문서, 정책 | `npm run test:scope`<br>`npm run test:review`<br>`node scripts/check-docs.mjs`<br>`git diff --check origin/main` | 커밋 전(문서만 바꾼 커밋은 `check-docs`·`git diff --check`만) |
| **Tier 1.5: 정적 검사** | 타입 안정성, 린트 | `npm run lint`<br>`npm run typecheck` | 커밋 전 필수(문서만 바꾼 커밋은 생략) |
| **Tier 2: 선별 E2E (Scoped)** | 변경된 수업 + 공통 스모크 | `npm run test:e2e:scope:running` (서버 구동 중)<br>`npm run test:e2e:scope` (원스톱) | push 전(문서만 바꾼 커밋은 생략) |
| **Tier 3: 전체 E2E (Full Suite)** | 전체 회귀 검증 | `npm run test:e2e` | **사용자 승인 시에만** (아래 §3.2) |

`test:review`는 기존 Node 리뷰 검사와 [`playwright.logic.config.ts`](../playwright.logic.config.ts)의 `tests/*.test.ts`를 실행합니다. 이 TypeScript 검사 경로는 브라우저 fixture를 쓰지 않으며 앱 서버·에뮬레이터를 시작하지 않습니다.

검사 개수는 `npx playwright test --list`로 현재 E2E 목록을 조회하고, 순수 TypeScript 목록은 `npx playwright test --config=playwright.logic.config.ts --list`로 확인합니다. 실행 시간은 검사 범위·PC/CI 환경·캐시·에뮬레이터 준비 상태에 따라 달라지므로 고정된 상한으로 안내하지 않습니다. 검증 범위와 결과는 직접 push는 커밋 본문, PR 경로는 PR 설명에 남기고, HANDOFF에는 §6.2 기준의 요약만 적습니다.

### 3.2 로컬 에이전트 vs 깃허브 CI 검증 매트릭스
로컬과 CI 모두 평시에는 **선별 검증 및 코어 스모크**를 기본으로 삼아 자원과 시간을 절약합니다:

| 구분 | 로컬 에이전트 실행 | 깃허브 CI 실행 (`.github/workflows/verify.yml`) |
| :--- | :--- | :--- |
| **직접 push 경로** | Tier 1~2를 통과시키고 결과를 커밋 본문에 적습니다(문서만 바꾸면 [§2.1](#위험도별-반영-경로)의 문서 검사만). 등록 수업 변경은 선별 E2E(`test:e2e:scope:running`)를 돌리고, 미분류 파일이 섞이면 아래 안내대로 검사 파일을 직접 고릅니다 | `main` push에서 한 번 실행합니다. 마지막 성공 main CI 이후 변경을 누적 비교해 문서만이면 E2E를 생략하고, 등록 수업 변경이면 해당 E2E와 공통 스모크를, 미분류 파일이 있으면 아래 `smoke` 모드를 실행합니다 |
| **PR 경로** | 직접 push 경로와 같은 로컬 검사를 돌리고 결과는 PR 설명에 적습니다. 전체 E2E 실행 여부는 작업을 시작할 때 사용자와 정합니다 | PR과 `main` push에서 각각 실행합니다. `main` 실행은 배포 게이트 신호이기도 합니다 |
| **미분류 파일(서버·공통·설정·검사 파일)이 있을 때** | 로컬 선별 도구는 `full`을 내고 멈추므로, 아래 안내대로 검사 파일을 직접 고릅니다 | `smoke` 모드로 전체 등록 수업 스모크와 확인된 관련 수업 검사를 실행합니다. 비교 기준이 없거나 조회에 실패해도 전체 검사로 승격하지 않습니다 |
| **전체 E2E** | **사용자의 명시적 요청 또는 에이전트 질문 후 사전 승인 시에만 실행** | **GitHub Actions의 `workflow_dispatch` 수동 실행으로만 수행** |

**미분류 파일이 있을 때의 로컬 검사:** 로컬 선별 도구(`npm run test:e2e:scope`)는 수업에 매핑되지 않은 파일(서버·공통·설정·검사 파일 등)이 하나라도 있으면 `full`을 내고 멈춥니다. CI는 같은 경우 `smoke`로 낮춥니다. 이때는 전체 E2E를 돌리지 말고, 바꾼 코드를 직접 사용하는 검사 파일과 공통 스모크를 에뮬레이터가 실행 중인 상태에서 `npm run test:e2e:running -- tests/<파일>.spec.ts tests/lesson-smoke.spec.ts`로 돌립니다(예: `src/lib/server/auth.ts` → `auth-security`·`settings`·`guest-login`). **파일을 지정하지 않으면 전체 E2E가 실행되므로** 반드시 파일을 지정합니다. 전체 E2E가 필요하다고 판단되면 사용자에게 묻습니다. 검사 파일을 직접 고를 때는 바꾼 파일 이름·API 경로(예: `/api/classroom/classes`)를 `git grep -l "<이름>" -- tests`로 찾아 나온 검사를 모두 포함합니다(예: 수업 설정 → `classroom-api`·`teacher-class-management`).

`:running` 명령은 3000번에 떠 있는 앱을 그대로 씁니다. `npm run dev:emulator`로 띄운 앱은 `CS_TIMETABLE_FIXTURE` 없이 가짜 시간표 서버를 켜지 않아 `timetable` 검사가 실패하고 실제 시간표 사이트로 요청이 갈 수 있습니다. 직접 고른 검사에 `timetable`이 있으면 앱과 에뮬레이터를 모두 끄고(3000·8080·9099 비움) `npx.cmd firebase emulators:exec --only auth,firestore --project demo-cs-class "npx playwright test tests/<파일>.spec.ts"`로 돌립니다(Playwright가 가짜 시간표 서버와 함께 앱을 띄웁니다).

자동 CI의 `app`에는 비문서 변경의 정책·단위 검사, lint, typecheck, 빌드와 위 선별/스모크 검사가 포함됩니다. 스모크 성공을 전체 회귀 검증 성공으로 해석하지 않습니다. PR 경로에서 전체 검사가 필요하면 별도로 승인받아 병합 전에 PR 브랜치에서 `gh workflow run verify.yml --ref <브랜치>`로 실행합니다(`main`에서 돌리면 실패를 공개 뒤에 압니다). 수동 실행 결과는 PR에 실행 SHA·범위와 함께 기록합니다. `main` push의 `app` 성공은 Vercel 운영 반영의 조건이기도 하며, 그 규칙(`[skip ci]` 금지·검사 이름 변경 순서 등)은 [서버 안내](FIREBASE_SETUP.md#ci와-운영-공개)가 단일 기준입니다.

[`run-selected-e2e.mjs`](../scripts/run-selected-e2e.mjs)는 자동 GitHub 실행에서 남아 있는 `full` 계획과 알 수 없는 모드를 실행 전에 거절합니다. 로컬 실행은 `--plan`이나 `CS_E2E_PLAN_PATH`를 명시하지 않으면 남은 `scratch/ci/e2e-plan.json`을 읽지 않고 범위를 매번 새로 계산하며, 결과가 `full`이면 이유만 출력하고 멈춥니다. 사용자 승인 후에만 `--full`을 붙여 실행합니다(예: `npm run test:e2e:scope -- --full`). `smoke` 모드는 수업 필터를 해제해 전체 등록 수업을 확인하고, 등록 수업만의 `affected` 모드는 해당 수업에 한정합니다. [PR 이벤트](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request)와 [수동 실행](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)은 GitHub 공식 안내를 따릅니다.

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
<a id="코드-위치와-역할"></a>

- **자산 및 무결성:** `npm ci` 시 `scripts/prepare-entryjs.mjs`가 SHA-512 검증 후 `public/entryjs/vendor/`에 브라우저 자산을 준비합니다.
- **iframe 격리:** 작업실(`public/entryjs/workspace.html`)과 브리지(`workspace.js`)는 `allow-scripts`만 허용한 격리 iframe에서 구동되며 부모의 쿠키나 세션에 접근할 수 없습니다.
- **이미지 CORS & 포커스:** `Entry.init` 전 이미지 생성에 `crossOrigin="anonymous"`를 적용하여 픽셀 클릭 판정을 보장합니다. 질문창 커서 깜빡임 방지를 위해 중복 `focus()` 호출을 제한합니다.
- **수동 저장 연동:** 실행 중 전체 내보내기 대신 정지 상태의 코드만 반영하며, `useWork`를 통해 단일 불변 스냅샷으로 저장합니다.
- **수업 팔레트와 블록 문장 변환:** 팔레트·이름표·미션별 허용 블록은 [`entry-palette.ts`](../src/lib/classroom/entry-palette.ts) 한 곳에 둡니다. 격리 iframe은 이 모듈을 가져올 수 없어 `workspace.js`의 `PROGRAMMING_PALETTE`에 복사본을 두며, `tests/entry-palette.test.ts`가 두 목록이 같은지 확인합니다. `EntryStatic.getAllBlocks`는 `Entry.init` 전에 바꿔야 반영됩니다. [`programming-entry.ts`](../src/lib/classroom/programming-entry.ts)의 `formatEntryNode`와 `entryBlockCategory`는 전체 106종 팔레트 블록(기존 12종 + 확장 94종)의 입력 슬롯(`params`), 드롭다운 라벨, 연산자 기호를 교사 열람용 한국어 문장과 8개 카테고리 색상으로 변환합니다.
- **저장 파서와 기존 키:** `parseProgrammingProject`는 원래 12종 블록을 기존 분기 그대로 정제하고, 그 밖의 팔레트 블록만 일반 규칙(원래 `params`, 반복·조건 블록에만 `statements`)으로 보존합니다. 이 순서를 바꾸면 기존 작품의 `key`가 달라져 검증·제출 기록과 이름 미션 실행 기록이 어긋납니다. `tests/fixtures/entry-legacy-keys.json`이 기존 키·정규화·채점 결과를 고정하며, 이 파일과 `entry-legacy-objects.json`을 다시 만들거나 고치는 변경은 `tests/`만 바꾸더라도 PR 경로로 합니다. 의도한 형식 변경이 아닌데 검사가 실패하면 고정 파일이 아니라 파서를 고칩니다.
- **실행·이벤트 및 내부 패치 방어:** 프로그래밍 수업은 툴바 실행 버튼 없이 엔트리의 "시작하기/정지하기"를 씁니다(`entry-bot-lab`은 툴바 버튼 유지). 감시기는 모든 오브젝트의 실행 코드가 비면 끝내되, 이벤트로 시작하는 줄이 있으면 결과와 이름 실행 기록을 `finished`로 한 번 보내고 `waiting`을 알린 뒤 정지·15초까지 유지합니다. 실행되는 줄(시작·이벤트 블록으로 시작하는 줄)에 붓 블록(`start_drawing`·`start_fill`)이 있는 실행도 시작 줄이 끝난 뒤 정지하지 않고 같은 대기 상태로 두며(`waiting`의 `drawing`), 엔트리는 정지할 때 선·채우기·위치·말풍선을 처음 상태로 되돌리기 때문입니다(도장은 남으므로 대상이 아님). 15초 강제 종료 타이머(`activeTime`)는 매 틱 유휴 여부(`idle`)를 먼저 판정해 질문 대기(`awaitingAnswer`)와 이벤트 대기(`waitingIdle`)를 시간 누적에서 제외하며, 사용자 입력(`keydown`, `mousedown`, `touchstart`, 부모 창의 `key` 메시지)이 들어오면 `activeTime`을 0으로 초기화합니다. `workspace.js`에서 EntryJS 내부 함수(`CanvasInput.prototype.render`, `Entry.block.*.func`/`def`, `Entry.container.*`)를 패치할 때는 `typeof ... === "function"` 존재 검사를 먼저 거칩니다. 이름 실행 기록은 강아지(`entity.parent.id === "entrybot"`)의 묻기·말하기만 남깁니다. 테스트는 `tests/emulator.ts`의 `entryStart`·`entryStop`·`entryReset` 도우미를 씁니다.
- **오브젝트 추가:** 프로그래밍 수업에서만 `objectEditable`·`objectaddable`·`objectdeletable`을 켭니다. `objectEditable`이 켜져 있어야 `objectaddable`이 동작합니다. 엔트리 추가 버튼의 `openSpriteManager`를 `add-object-request`로 전달하면 수업 화면이 `ENTRY_SPRITES` 대화상자를 열고, 고른 그림으로 만든 모델을 `add-object`로 보냅니다. `removeObject`는 불러오는 중이 아니면 `entrybot` 삭제를 막습니다. 엔트리는 새 오브젝트를 목록 맨 앞에 넣으므로 파서는 강아지를 `id`로 찾고, 추가 오브젝트의 그림은 목록 파일과 일치할 때만 받아 다시 조립합니다. 오브젝트가 강아지뿐이면 키·정규화는 이전과 같습니다.
- **강아지 없는 작품(조건·반복 수업):** `isFreeMission` 미션은 `workspace.html?...&free=1&locked=…`으로 열고 `pictureeditable`(모양 탭)을 켭니다. 그림판(`.entryPlaygroundPainter`)은 CSS로 숨기고 `openPictureManager`·`clonePicture`·`_removePicture`·`painter.newPicture`(‘새로 그리기’는 관리자 창을 거치지 않고 믿을 수 없는 빈 그림을 바로 더함)는 `picture-locked`로 막습니다. `LOCKED_OBJECTS`의 오브젝트와 마지막 오브젝트는 지울 수 없습니다. 파서는 `entrybot`이 없고 그림이 신뢰 목록에 있는 작품을 `free`(`mainIndex -1`)로 읽어 모든 오브젝트를 같은 방식으로 다시 조립합니다(최대 `MAX_FREE_OBJECTS` 12개). 채점과 `missionBlockIssue`는 시작 줄을 가진 한 오브젝트를 보고, 여러 오브젝트에 나뉘면 같은 문구로 화면 토스트와 검증 실패를 냅니다.
- **엔트리 오브젝트 묶음:** 그림은 `public/entryjs/sprites/library/`, 목록은 `src/lib/classroom/entry-library.json`(`LIBRARY_SPRITES`)입니다. 바꾸려면 `scripts/entry-library-picks.json`(분류별 엔트리 오브젝트 id)을 고친 뒤 `node scripts/fetch-entry-library.mjs`를 돌려 커밋합니다. 스크립트는 엔트리 사이트의 오브젝트 목록을 읽어 모양 10장까지 내려받고 위험한 SVG를 버립니다. 앱은 실행 중 엔트리 사이트에 접속하지 않습니다. 출처 조건은 같은 폴더의 `NOTICE.md`에 있습니다.
- **정규화·복제 제약:** 원래 12종 블록이 자기 분기 조건에 맞지 않으면 일반 규칙으로 넘기지 않고 거부합니다(교사 작품 보기 오류 방지). 파서는 정규화가 한 번에 수렴하도록 이름을 자른 뒤 다시 다듬고, 엔트리가 음수로 뒤집은 크기는 부호를 유지합니다. 서버는 받은 원문 대신 자체 정규화본을 저장하고 `MAX_PROJECT_BYTES`(32,768)를 클라이언트와 공유합니다. 파서 결과의 `gradeKey`(강아지 코드만)는 이름 미션 실행 기록에, `key`(작품 전체)는 검증·제출 비교에 씁니다. 엔트리의 복제·붙여넣기(`addCloneObject`)는 강아지 복제와 6개 초과를 막고, 추가 직후에는 강아지를 다시 선택합니다. 채점 오류 중 인터프리터가 의도한 `MissionError`만 학생에게 보이고, 나머지는 미션의 채점 실패 문구(`failure`)로 대신합니다.
- **수업별 미션:** 미션 정의는 `programming-entry.ts`의 `PROGRAMMING_MISSIONS` 한 곳에 두고, 미션 ID는 수업이 달라도 겹치지 않게 짓습니다. 미션의 `hint`는 화면의 한 줄 요약, `steps`는 접힌 번호 조립 순서, `tip`은 💡 한 줄(선택), `failure`는 채점 실패 문구(필수, 칩 없는 평문)입니다. 힌트 문구는 블록 칩을 `` `블록종류: 보이는 글자` ``(예: `` `set_variable: A를 대답으로 정하기` ``)로 쓰고 화면은 `hintParts`, 평문 비교는 `hintPlain`으로 읽습니다(문구 기준은 [DESIGN §5.1](DESIGN.md#프로그래밍-13차시--경험-검토용-표현)). `tests/fixtures/entry-legacy-keys.json`이 name·multiply·average·move·keys의 실패 문구를 고정하므로 이 다섯 `failure`는 바꾸지 않습니다. `tests/entry-palette.test.ts`가 칩의 블록 종류가 그 미션의 검증 블록인지, 칩 글자에 그 블록의 고정 낱말이 있는지(`CHIP_WORDS`), 칩 밖 백틱·`( )`·'팔레트에서는'이 없는지, 단계 수·길이 상한, 조립 순서대로 만든 해답이 채점을 통과하고 그 해답의 블록이 모두 칩이나 낱말(묻기·말하기·대답·값)로 나오는지(시작 작품에 없는 시작 블록 포함), 그 해답의 값(횟수·각도·비교식·말할 글자·키·변수에 정할 값·‘그리고’/‘또는’)이 해답 순서대로 단계에 나오는지, 블록 칩이 해답의 블록 순서대로 처음 나오는지 확인합니다. 끼울 자리를 말하는 낱말(안에·아래(바깥))은 자동으로 확인하지 않습니다. 학생에게 보이는 블록 목록은 `missionBlockTypes`(팔레트 순서)와 `PALETTE_TEXT`(실제 팔레트 표기)이며, 미션에 블록을 더하면 `PALETTE_TEXT`에도 넣습니다. 수업마다 보여 주는 미션은 `LESSON_MISSIONS`의 `active`이며, 수업에서 뺀 미션은 `retired`에 두어 옛 저장본만 읽을 수 있게 합니다. 초안 저장은 `active`·`retired` 작품을 모두 받고 선택 미션이 `active`가 아니면 첫 미션으로 바꿉니다. 검증·제출·교사 미리보기 행동은 `active`만 받습니다. 미션의 `variables`(무대에 A·B 표시)·`keyEvents`(방향키 대기)는 iframe 주소의 `vars=1`·`keys=1`로 전달하고, 채점기 `checkProgrammingMission`은 고정 입력이 학생 화면 코드에 실리지 않도록 [`src/lib/server/programming-grader.ts`](../src/lib/server/programming-grader.ts)에 둡니다.
- **모양이 여러 개인 오브젝트:** `entry-palette.ts`의 `LESSON_SPRITES`는 수업 시작 작품에만 쓰는 그림(나무 6단계·물뿌리개 2개·흙)이고, 저장 검증은 고르기 목록과 합친 `TRUSTED_SPRITES`로 합니다. 저장된 그림 목록은 모두 한 그림 묶음에 속해야 하며 서버가 묶음 정의로 다시 만듭니다. 모양 id는 `<오브젝트 id>-pic`, `-pic2`, …이고, 보이는 모양은 `picture`(두 번째부터의 번호)로 저장해 첫 모양인 옛 작품의 키를 바꾸지 않습니다(`tests/fixtures/entry-legacy-objects.json`). 나무 미션의 ‘클릭 수’(`cs-clicks`)는 시작 작품에 있을 때만 프로젝트 변수로 유지합니다. 미션별 첫 작품은 `missionStarter`가 만들며 처음 진입·다시 만들기·미저장 비교가 같은 값을 씁니다.
- **해석기 의미:** 채점기는 엔트리 4.0.23 블록 정의를 따릅니다. 비교는 빈칸이 아닌 숫자 글자를 숫자로 바꾸고(`=`는 엄격 비교), 몫·나머지는 버림 나눗셈입니다. 움직임은 이동 방향과 오브젝트 방향의 합으로 계산하며, `( )번 반복하기`는 횟수를 내림하고 음수는 오류입니다. `move_x`·`move_y`는 좌표를 더하고, 시간이 있는 블록(`move_xy_time`·`locate_xy_time`·`rotate_by_time`·`direction_relative_duration`)은 엔트리 프레임이 끝난 상태(끝점·더한 각도)로 한 번에 옮기며 초는 결과에 쓰지 않습니다. `move_to_angle`은 오브젝트 방향과 상관없이 그 각도로 움직입니다. `calc_basic`의 더하기는 엔트리 `Entry.Utils.isNumber`처럼 한쪽이 숫자가 아닌 글자면 이어 붙이고(빈칸은 지금처럼 숫자 오류), 말하기 두 블록은 `speak`·`think`를 같은 방식으로 다룹니다. 결과를 바꾸지 않는 `HARMLESS_BLOCKS`(`entry-palette.ts`)는 건너뜁니다. `될 때까지`는 조건이 거짓인 동안, `인 동안`은 참인 동안 돕니다. 한 번 실행에서 블록 20,000개·글자 500자·말하기 50번·반복 1,000번·선 200개를 넘으면 실패로 처리해 서버 트랜잭션 시간을 묶습니다.
- **채점 범위:** `missionBlockIssue`가 미션 신호로 시작하는 줄(값 블록·반복 안쪽 포함)에서 미션 밖 블록을 찾아 이름표로 안내하고, 서버 인터프리터는 그 뒤에만 실행합니다. 모든 미션의 `MISSION_BLOCKS`에는 `HARMLESS_BLOCKS`가 더해지고, 학생에게 보이는 블록 목록(`missionBlockTypes`)에서는 이 묶음과 같은 뜻으로 받는 움직임·시간 회전 블록(`ALSO_ACCEPTED`), 미션별로 받지만 알리지 않는 블록(`UNLISTED`, 정사각형·정다각형의 말하기)이 빠집니다. `MISSION_BLOCKS`에 넣는 동작 블록은 해석기 분기가 있어야 하며(없으면 ‘시작 블록은 맨 위에…’로 떨어짐), `tests/entry-palette.test.ts`의 안전장치 테스트가 블록마다 확인합니다. 움직임 미션(`move`·`keys`)에는 절대 위치 블록(`locate_x`·`locate_y`·`locate_xy(_time)`)을 넣지 않고(해석기가 늘 (0, 0)에서 시작해 절대 이동이 통과함), `rotate_absolute`는 오브젝트 방향을 정하므로 `direction_absolute`와 같게 보지 않으며, `move`·`keys`·`square`에는 묻기를 넣지 않습니다(`asksQuestion`이 실행 결과 표시를 말하기로 바꿈). 말은 글자·숫자만 남겨 결과별 핵심어로 보고(다른 결과 낱말이 이 낱말을 품으면 먼저 지움), 마지막 질문 뒤에 말한 줄 전체로 판정합니다(질문 전 인사는 입력과 무관하므로 제외). 이름은 입력에서 온 줄, 곱셈·평균은 입력으로 계산한 마지막 줄, A·B는 처음 저장한 입력값, 금고는 마지막 질문 뒤의 ‘열렸’ 한 줄과 반복 안의 질문(첫 질문만 반복 앞 허용)을 봅니다. 도형은 이어진 같은 방향의 선을 하나로(‘두 바퀴 이상 그린 반복 안’ 여부는 모든 조각의 그리고), 앞서 그린 선과 겹치는 선은 빼고 판정하되(겹친 선이 반복 밖이면 남은 선도 반복 밖으로 봄), 정다각형은 합친 선 수가 변 수의 배수일 때만 겹친 선을 빼서 고정 반복 횟수가 통과하지 못하게 합니다(숨은 변 수 3~8의 최소공배수 840이 선 상한 200을 넘음). 모든 변이 두 바퀴 이상에서 선을 그린 반복 안에서 그려지고(`repeated`, 반복이 끝날 때 그 안에서 그린 선에 표시하므로 한 바퀴에만 그린 반복은 반복으로 치지 않음), 어느 반복이든 두 번째 바퀴부터 그린 변이 하나는 있어야 해서(`again`) ‘1번 반복하기’로 감싸거나 일부 변만 반복으로 그린 도형은 떨어집니다. 방향키 미션은 한 기계에서 네 키 줄을 두 가지 순서로 차례로 실행해 키마다의 x·y 변화를 봅니다. 통과하지 못하면 `생각하기`를 말로 치고 한 번 더 채점해 통과하면 ‘생각하기’ 안내를 내고, 결과 미션(`RESULT_WORDS`)은 `wordingOnly`로 다시 채점해(`branchesRight`: 숫자를 뺀 뒤 모든 경우에 같은 줄은 빼고, 결과 낱말이 있는 줄이 한 결과의 경우에서만 나오며, 경우마다 결과 낱말이 있는 첫 줄이 기대한 낱말을 품음) 통과하면 목표의 결과 말(`RESULT_PHRASES`)을 인용한 `wordingMessage`를 냅니다. 시작 줄이 0개면 그 시작 블록(‘시작하기 버튼을 클릭했을 때’, 방향키는 ‘위쪽 화살표 키를 눌렀을 때’ 등) 아래에 연결하라고, 2개 이상이면 한 줄로 이으라고 안내하며, 0개일 때의 문구는 `entry-legacy-keys.json`이 고정합니다(2026-10-23에 블록 이름을 넣은 문구로 바꿈). 금고에서 마지막 입력(1234) 뒤 반복 안에서 또 물으면 반복이 멈추지 않는다고 안내합니다. 이름 미션은 화면 검사 `checkNameMission`과 `workspace.js` 실행 기록도 `dialog`를 `dialog_time`처럼 다루고 `HARMLESS_BLOCKS`는 기록 없이 건너뜁니다.

### 4.2 알고리즘 복습 연구소
<a id="알고리즘-복습-수업"></a>

- **코드 구조:** `src/lib/classroom/review/`에 순수 엔진(샌드위치, 순서도 실행기, 추상화 데이터)을 두고, 화면 컴포넌트는 `src/components/student/review/`에 배치합니다.
- **순서도 (`flowchart.tsx`):** 퍼즐 실습(3열), 예시 공방(2열), 자유 공방(4열). 임의 JS 실행 없이 순수 표현식 인터프리터(`flow-runner.mjs`)로 동작합니다.
- **AI 엔드포인트 (`POST /api/classroom/ai`):** HMAC 기반 요청 검증, 학생별 사용량 장부(`csAiUsage/{uid}`, 한도는 [PRD §4.3](PRD.md#43-선택-복습-수업-공통-정책)), 결과 TTL 캐시(24시간)를 적용합니다.
- **실제 AI 품질 검사:** 유료인 실제 Solar 호출 검사는 필요한 변경·진단 범위를 먼저 정한 뒤 돌립니다. 기대한 판정이 나올 때까지 반복하지 않고, 운영 DB에 합성 계정·작품을 넣지 않습니다.

### 4.3 대시보드 및 교사 미리보기
<a id="대시보드-파일럿"></a>
<a id="교실-입장대시보드-조회-성능"></a>
<a id="대시보드-및-화면-셸"></a>

- **반 선택 세션:** `SessionProvider`의 `useTeacherClass`는 탭 단위 `sessionStorage`로 선택 반을 관리하며 URL 쿼리(`?classId=...`)와 연동됩니다.
- **교사 수업 미리보기 (`/teacher/preview/[id]`):** `LessonPreview`와 `usePreviewWork`는 실제 `LessonShell`을 `mode="preview"`로 렌더링하며, 학생 학습 컬렉션 쓰기를 엄격히 차단하고 컴포넌트 메모리에서만 동작합니다.
- **교사 제출 작품 열람 및 인라인 실행 (`SubmissionViewer` · `EntryProjectPreview`):** 화면·폭·`Escape` 순서는 [DESIGN §4.4](DESIGN.md#학생교사-대시보드)를 따르며, 파싱 실패 시에만 번호 목록으로 폴백합니다. E2E 검사에서는 iframe 언마운트 경합을 막기 위해 `무대 처음 위치로` 버튼이 활성화된 뒤 `Escape`를 입력합니다.
- **읽기 최적화·손들기 중지 검사:** `tests/help-paused.spec.ts`, `tests/read-polling.spec.ts`로 손들기 중지·교사 수동 조회·권한·느린 응답 경합과 학생 포커스 재조회 30초 간격·활동 기록 뒤 세션 확인 생략, PC 시계가 서버보다 빠르거나 느려도 활동 기록이 30초에 한 번이고 바로 로그아웃하지 않는지를 확인합니다. 손들기 활성 모드 검사(`help-requests`, `help-races`, 관련 UI 검사)는 보존하되 공유 설정이 false이면 명시적으로 생략하며 이를 통과로 집계하지 않습니다. 복구 시 설정을 true로 변경한 뒤 재빌드하여 활성 모드 검사를 실행합니다. 공유 설정은 `src/lib/classroom/features.ts`의 `CLASSROOM_HELP_ENABLED`입니다. `tests/read-usage.spec.ts`는 공개 수업 4개·학생 27명·담당 반 11개의 10분 가상 시간 요청 샘플이며 과금 실측이 아닙니다. 다른 Playwright 실행과 병렬로 돌릴 때는 `--output` 경로를 분리해야 합니다. 활동 갱신 응답은 계정 쓰기를 표본에서 빼려고 fixture로 두고 세션 비용은 별도 모형으로 계산합니다.

### 4.4 학교 시간표 연동 Fixture
<a id="학교-시간표-연동"></a>

- 자동 테스트에서는 `scripts/timetable-fixture.mjs`의 `127.0.0.1:4781` 로컬 합성 서버를 사용합니다.
- `CS_TIMETABLE_FIXTURE=1` 환경변수와 함께 실행 시 외부 실제 나이스/학교 서버 호출 없이 안정적인 시간표 조회 흐름을 검증합니다.

---

## 5. 운영 도구 및 트러블슈팅 (Tools & Troubleshooting)

### 5.1 학생 명부 및 계정 관리 도구
<a id="실학생-명부-준비와-반별-발급"></a>

실제 학생 계정의 등록·발급은 실제 명부·학년도·Firebase 대상·복구 범위를 확인한 뒤 승인된 범위에서만 전용 스크립트로 합니다. `--apply`는 학생 계정이나 비공개 파일을 실제로 바꿉니다. 모든 입력·전달·백업 파일은 Git 제외 `private/`에 두고, 폴더 접근 권한을 선생님만 볼 수 있게 설정합니다(Git 제외가 파일 접근 보호를 대신하지는 않습니다).

1. **명부 변환:** 기존 Excel(2학년 `1반`~`11반` 시트, 첫 행 `번호`·`학번`)을 CSV로 바꿉니다. 이름·공통 비밀번호 열은 복사하지 않고 원본은 읽기만 합니다.
2. **검증과 계획(읽기 전용):** `validate`로 형식을, 기본 모드(`plan`)로 기존 계정·반 기록·이메일 충돌을 확인합니다. 다른 명부나 학년도의 같은 학번은 거절합니다.
3. **사전 등록:** `register`는 계정을 만들되 최초 입장 비밀번호는 아직 발급하지 않습니다. 중단되면 계정을 비활성·잠금으로 남기며, 같은 명부·학년도의 중단만 `--resume`으로 재개합니다.
4. **반별 발급:** 수업 직전에 `issue`로 반별 임시값(30분 만료)을 만듭니다. 교사가 명단에서 뺀(사용 중지) 학생은 건너뛰고 요약의 `offList`에 수만 셉니다. 출력 파일에서 `issued` 확인 행이 있는 학생에게만 개별 전달하고, 공용 화면에 전체 파일을 띄우지 않습니다. 11개 반을 미리 한꺼번에 발급하면 수업 전에 만료됩니다. 관리자 키가 없어도 교사 화면 `학생 현황·계정`에서 같은 30분 임시값을 발급합니다: 학생별 `비밀번호 초기화`(이미 개인 비밀번호를 정한 학생 포함) 또는 아직 정하지 않은 학생만 고르는 `임시 비밀번호 한꺼번에 발급`(쪽지 인쇄). 프로젝터를 끄고 발급합니다. 반 전체 첫 입장에는 같은 화면의 `첫 입장 열기`로 반 공통 코드를 프로젝터에 띄우는 방법도 있습니다([PRD §5.6](PRD.md#교사-대시보드의-1차-범위)). 첫 수업에 쓸 방법은 [HANDOFF](HANDOFF.md#다음에-이어갈-작업)의 사용자 결정을 따릅니다.
5. **수업 기록 백업:** `backup`은 반 설정·비밀 없는 계정 정보·`csWork`만 담습니다. 자동 복원이나 전체 시스템 백업이 아닙니다.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/roster-from-xlsx.ps1 -Source '<명부의 절대 경로>' -Output private/student-roster.csv
node scripts/student-roster.mjs --csv private/student-roster.csv --year 2026 --mode validate
# 기본 모드는 plan(읽기 전용)입니다.
node --env-file=.env.local scripts/student-roster.mjs --csv private/student-roster.csv --year 2026
node --env-file=.env.local scripts/student-roster.mjs --csv private/student-roster.csv --year 2026 --mode register --apply --confirm-project cs-class-f74c4
node --env-file=.env.local scripts/student-roster.mjs --csv private/student-roster.csv --year 2026 --mode issue --class 2-1 --output private/class-2-1.ndjson --apply --confirm-project cs-class-f74c4
node --env-file=.env.local scripts/student-roster.mjs --csv private/student-roster.csv --year 2026 --mode backup --output private/backup.json --apply --confirm-project cs-class-f74c4
```

발급이 중단되면 완료·실패 학생을 비공개 파일에서 확인하고, 남은 잠금은 [계정 변경 장애 복구](FIREBASE_SETUP.md#계정-변경-장애-복구)를 씁니다. 계정·작품을 지우고 다시 등록하는 방식으로 복구하지 않습니다. 검사 코드는 `tests/student-roster.spec.ts`이며 운영 자료를 쓰지 않습니다.

#### 첫 실제 수업 확인 순서

1. **수업 전:** 실제 학년도·명부·대상 반을 확인합니다. 이미 등록한 반은 다시 하지 않고, 아직 등록하지 않은 반만 명부 CSV·관리자 키가 있는 PC에서 위 변환·검증·계획·등록을 합니다. 교사의 `수업 관리`에서 해당 반의 공개 수업과 이번 수업을 확인합니다.
2. **수업 직전:** 해당 반을 [명부 절차](#실학생-명부-준비와-반별-발급) 4단계 중 사용자가 정한 방법(`issue`, 교사 화면 학생별 초기화·일괄 발급, 또는 반 공통 `첫 입장 열기`)으로 입장시키고, 개별 임시값은 완료된 것만 학생별로 전달합니다. 학생은 최초 입장에서 본인 비밀번호를 정하고 배정된 반과 이번 수업 제목을 확인합니다. 만료·입장 실패는 교사가 계정 상태를 확인하며, 예전 공통 비밀번호(`CS_INITIAL_PASSWORD` 등)로 우회하지 않습니다.
3. **수업 중:** 학생 한 명의 학교 브라우저에서 개념·퀴즈·실습 진입과 실제 엔트리 블록 입력·실행·정지를 확인합니다. 프로그래밍 수업은 기본 네 미션과 선택 도전을 구분하고 `저장 완료`·검증 통과·제출 완료를 각각 확인합니다.
4. **저장 확인:** 저장 실패 때 입력이 남는지, 재시도 뒤 같은 작업을 이어가는지 확인합니다. 학교망·실제 입력기·로그아웃 후 재접속은 로컬 에뮬레이터 결과와 따로 기록합니다. 학생 비밀번호·작품 원문을 공개 화면이나 로그에 남기지 않습니다.
5. **수업 종료 전:** 교사의 `학생 현황·계정`에서 진행과 제출을 확인합니다(제출 학생 수와 작품 수를 구분). 발견한 문제는 범위·환경과 함께 [HANDOFF](HANDOFF.md#남은-한계와-다음-결정)에 남깁니다.

### 5.2 실패 진단 및 에러 로깅 규격
<a id="실패-진단과-오류-번호"></a>
<a id="공통-데이터-계약을-수정할-때"></a>

- 서버 오류 응답은 `src/lib/server/failure-log.ts`를 통해 고정된 5개 필드(`requestId`, `operation`, `category`, `status`, `timestamp`)를 구조화 로깅합니다. 분류가 `unexpected`인 오류에만 허용 목록에 있는 `errorName`(오류 종류, 예: `TypeError`)과 `errorCode`(Firestore gRPC 상태 이름, 예: `ABORTED`, 또는 `FIREBASE_NOT_CONFIGURED` 같은 서버 설정 코드)를 더하고, 목록 밖의 값은 남기지 않습니다. 오류 메시지·스택·원인은 기록하지 않습니다. 실패한 API 응답(4xx·5xx)의 헤더 `X-Request-ID`가 로그의 `requestId`입니다.
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
- **Stitch 디자인 연동:** API 키는 `STITCH_API_KEY` 환경변수로만 관리하며(설정 스크립트 `scripts/Set-StitchApiKey.ps1`) 저장소나 로그에 노출하지 않습니다.
- **Claude Code 전용 설정:** `.claude/`는 Claude Code만 읽으며, 다른 에이전트의 동작과 공통 규칙은 [AGENTS](../AGENTS.md)를 따릅니다.
  - `settings.json`은 `.env*.local`·서비스 계정 키 읽기와 Firestore 삭제·Firebase 배포 도구를 막습니다.
  - 매번 확인받는 것: 운영 Firebase 도구, GitHub 도구의 직접 쓰기, Vercel 승격·배포, 강제 push(`--force`, `-f`, `+` 참조), 원격 브랜치 삭제(`git push`의 `--delete`·`-d`, `gh pr merge`의 `--delete-branch`·`-d`), `--mirror`·`--prune` push, `gh pr merge --admin`.
  - 일반 `git push`와 `gh pr merge`는 확인 없이 실행됩니다. 언제 해도 되는지는 [AGENTS의 승인 범위](../AGENTS.md#검증-및-배포-규칙)가 정합니다.
  - 이 규칙은 명령 문자열만 비교하는 실수 방지 장치입니다. 다른 형태로 쓴 명령(예: 콜론으로 원격 브랜치를 지우는 `git push origin :이름`, `-uf`처럼 묶어 쓴 짧은 옵션)은 잡지 못하므로 보안 경계로 여기지 않습니다.
  - `launch.json`은 내장 미리보기용 `dev:emulator` 실행 설정입니다.

---

## 6. 문서 작성 기준
<a id="문서-작성-기준"></a>

사람과 모든 에이전트가 같은 기준으로 문서를 고칩니다.

### 6.1 주제별 단일 위치
한 주제는 한 문서에만 쓰고, 다른 문서에는 링크만 둡니다. 같은 규칙을 여러 곳에 쓰면 한 곳만 바뀌어 나머지가 틀리게 됩니다.

| 주제 | 단일 위치 |
| :--- | :--- |
| 에이전트 금지사항·승인 범위 | [AGENTS](../AGENTS.md) |
| 반영 경로·검증 방법·명령 | 이 문서 §2~3 |
| 제품 정책·사용 한도·권한 | [PRD](PRD.md) |
| 화면·토큰·접근성 | [DESIGN](DESIGN.md) |
| 배포 게이트·운영 절차·운영 환경 현황 | [FIREBASE_SETUP](FIREBASE_SETUP.md) |
| 현재 진행·최근 반영·다음 작업·남은 한계 | [HANDOFF](HANDOFF.md) |
| 지난 원문 | [보관함](archive/README.md) |

문서끼리 답이 다르면 위 표의 단일 위치가 이깁니다. 단 AGENTS의 '검증 및 배포 규칙'·'절대 금지 사항'이 모든 문서보다 우선합니다. HANDOFF의 날짜 붙은 사용자 결정과 절차 문서가 다르면 사용자에게 확인하고 절차 문서를 고칩니다. 어긋남을 본 에이전트는 작업 범위 안이면 사본을 링크로 바꾸고, 범위 밖이면 HANDOFF 다음 작업에 적습니다.

### 6.2 쓰기 규칙
- **절차와 상태를 나눕니다.** 절차 문서에는 절차만 씁니다. "현재 ~되어 있다" 같은 상태는 FIREBASE_SETUP 끝의 운영 환경 현황 표(마지막 확인일 포함)나 HANDOFF에만 씁니다.
- **HANDOFF는 짧게 유지합니다.**
  - "최근 반영"에는 PR 경로 변경과 사용자에게 보이는 변경을 적습니다. 5개까지 두고, 항목마다 무엇·검증·한계를 2~3줄로 씁니다. 항목은 PR 번호(직접 push는 커밋 제목)로 식별하고, 전체 E2E를 돌렸는지 반드시 적습니다.
  - 5개를 넘으면 가장 오래된 항목을 지웁니다. 지우기 전에 아직 유효한 한계는 "남은 한계"로 옮깁니다. 원문은 Git과 PR에 남습니다.
  - HANDOFF 전체는 약 8KB 이내로 유지합니다. 10,000바이트(줄바꿈 LF 기준)를 넘거나 최근 반영이 5개를 넘으면 `node scripts/check-docs.mjs`가 실패합니다.
- **기록은 반영과 함께 씁니다.** HANDOFF 기록은 반영하는 같은 PR·커밋 안에서, 병합 전에 알 수 있는 검증만으로 씁니다. 병합 뒤 알게 된 실패·우회·복구·현장 확인은 다음 반영에 함께 쓰고, 다음 반영이 없거나 그 사실이 다음 작업을 막으면 HANDOFF·운영 환경 현황만 고치는 문서 커밋으로 남깁니다. '병합 완료'·배포 ID만 적는 커밋은 만들지 않습니다. 배포 ID·시각은 이상·우회·복구가 있을 때만 적습니다.
- **계획 문서는 진행 중일 때만 둡니다.** 진행 중인 작업 계획은 도구의 기본 저장 경로와 관계없이 `docs/plans/`에 두고(폴더는 필요할 때 만듭니다) HANDOFF 현재 작업 상태에서 링크하며, 끝나면 보관 스냅샷으로 옮깁니다. HANDOFF에서 링크되지 않은 계획이 있으면 `check-docs`가 실패합니다. 현재 동작의 기준으로 계획 문서를 가리키지 않습니다.
- **진행 중 브랜치를 남깁니다.** 진행 중 브랜치가 있으면 HANDOFF 현재 작업 상태에 이름과 남은 일을 적습니다.
- **구조를 바꿀 때는 원문을 남깁니다.** 문서의 절을 크게 추가·삭제·이동하거나 문서를 옮길 때, 다른 문서가 고정 경로로 가리킬 수 있도록 원문을 `docs/archive/cs-class/<날짜>-<이름>/`에 README와 manifest(sha256 포함)와 함께 남기고 [보관함 목록](archive/README.md)에 항목을 추가합니다.
- **갱신일은 규칙이 바뀔 때만 고칩니다.** 각 문서 첫머리의 "갱신:" 날짜는 규칙·정책·절차의 내용이 바뀔 때만 고치고, 표현만 다듬을 때는 두지 않습니다.
- **도구 중립으로 씁니다.** 여러 에이전트가 함께 읽으므로 특정 도구 이름에 기대는 규칙을 쓰지 않습니다. 도구 전용 설정은 그 도구의 폴더(예: `.claude/`)에 두고 §5.3처럼 따로 설명합니다.
