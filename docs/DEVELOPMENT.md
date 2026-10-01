# 개발 환경과 도구 설정

빠른 실행과 문서 목차는 [README](../README.md), 검증·작업 규칙은 [AGENTS](../AGENTS.md)를 따릅니다. 모든 명령은 저장소 루트에서 실행합니다.

## 다른 PC에서 시작

먼저 [HANDOFF의 현재 작업 상태](HANDOFF.md#현재-작업-상태)를 확인합니다. 완료된 작업의 기준은 `main`이며, 진행 중인 브랜치·미커밋 변경이 있으면 먼저 보존하고 이어갈 대상을 정합니다.

Git·Node.js 24·Java 21+를 준비하고, 이 비공개 저장소에 접근할 수 있는 GitHub 계정으로 실행합니다. 아래 개발 모드는 Firebase 키나 실제 학생 자료 없이 사용할 수 있습니다.

```powershell
git clone --branch main https://github.com/DonghyunT/cs-class.git
cd cs-class
npm ci
npm run dev:emulator
```

이미 복제한 PC라면 먼저 `git status --short --branch`로 로컬 작업을 확인합니다. 작업 트리가 깨끗하고 main에서 새 작업을 시작하기로 정한 경우에만 `git fetch origin`, `git switch main`, `git pull --ff-only` 순서로 갱신하고 새 `codex/` 브랜치를 만듭니다. Windows PowerShell에서 npm 스크립트 실행이 차단되면 `npm.cmd`·`npx.cmd`를 사용합니다.

Windows의 사용자 npm 캐시에서 `EPERM`이 발생하면 저장소의 Git 제외 캐시로 설치합니다: `npm.cmd ci --cache .\scratch\npm-cache --no-audit --no-fund`. Java·에뮬레이터·브라우저의 로컬 설치와 캐시는 Git으로 다른 PC에 전달되지 않습니다.

Firebase CLI가 사용자 설정 파일 접근을 거부하면 로컬 에뮬레이터용 터미널에서 `$env:XDG_CONFIG_HOME="$PWD\scratch\firebase-cli-config"`를 설정한 뒤 실행합니다. CLI 설정을 Git 제외 폴더에 분리하며 실제 Firebase 로그인용 터미널에는 적용하지 않습니다.

에뮬레이터·Playwright를 이미 `scratch/`에 설치한 제한된 Windows 환경에서는 기존 캐시를 가리킵니다. `$env:FIREBASE_EMULATORS_PATH="$PWD\scratch\firebase-emulators"`, `$env:PLAYWRIGHT_BROWSERS_PATH="$PWD\scratch\playwright"`를 같은 검사 터미널에 설정합니다. Chromium이 기본 사용자 캐시인 `$env:LOCALAPPDATA\ms-playwright`에 이미 있으면 재설치하지 않고 그 경로를 사용합니다. Java가 PATH에 없으면 해당 PC에 설치한 Java 21+의 `bin`을 그 터미널 PATH 앞에 추가합니다. 2026-10-01 확인한 두 PC의 경로는 아래와 같으며 다른 PC에도 있다고 가정하지 않습니다. 캐시가 없는 새 PC는 최초 설치를 진행합니다.

이 PC의 새 PowerShell에서는 저장소 루트에서 아래 준비 명령을 함께 실행합니다. `$env:` 설정은 해당 터미널에만 적용되므로 이전 검사 터미널에서 설정했더라도 다시 필요합니다. 로컬 Java·캐시가 없는 다른 PC에서는 위 설치 안내를 먼저 따릅니다.

```powershell
$csJavaBin = @(
    "$PWD\scratch\tools\java\runtime\jdk-21.0.12.1+1\bin",
    "$PWD\scratch\tools\java\jdk-21.0.12.1+1-jre\bin"
) | Where-Object { Test-Path -LiteralPath (Join-Path $_ 'java.exe') } | Select-Object -First 1
if ($csJavaBin) { $env:PATH = "$csJavaBin;$env:PATH" }
java -version
$env:XDG_CONFIG_HOME = "$PWD\scratch\firebase-cli-config"
$env:FIREBASE_EMULATORS_PATH = "$PWD\scratch\firebase-emulators"
$csBrowserCache = @("$PWD\scratch\playwright", "$env:LOCALAPPDATA\ms-playwright") |
    Where-Object { (Test-Path -LiteralPath $_) -and (Get-ChildItem -LiteralPath $_ -Directory -Filter 'chromium*') } | Select-Object -First 1
if ($csBrowserCache) { $env:PLAYWRIGHT_BROWSERS_PATH = $csBrowserCache }
Get-ChildItem Env: | Where-Object { $_.Name -match '(TOKEN|SECRET|PASSWORD|API_KEY|CREDENTIAL)' } |
    ForEach-Object { Remove-Item -LiteralPath ('Env:' + $_.Name) }
npm.cmd run dev:emulator
```

`where.exe java`·`java -version`이 되는데도 제한된 실행에서 Java·`tar`·Playwright 자식 프로세스가 `EPERM`이면 설치 실패로 단정하지 않습니다. 허용된 로컬 검사 실행에서 같은 명령을 확인합니다. 위 비밀 환경변수 제거는 demo 검사 터미널에만 적용하며 사용자 저장 설정을 지우지 않습니다. 실제 Firebase 연결용 터미널에는 적용하지 않습니다. Firebase CLI 진단 로그에는 실행 환경 전체가 포함될 수 있으므로 원문을 출력하거나 공유하지 않습니다.

[학생 입장](http://localhost:3000/login/student)·[교사 입장](http://localhost:3000/login/teacher) 아래의 게스트 버튼으로 바로 체험할 수 있습니다. 일반 합성 학번 `20101`은 [테스트 설정의 초기 비밀번호](../scripts/local-test-env.mjs)로 입장한 뒤 본인 테스트 비밀번호로 바꿉니다. 교사 입장의 강사 계정은 같은 파일의 강사 비밀번호를 사용하며 10·11반을 확인합니다. `Ctrl+C`로 종료하면 에뮬레이터 기록은 보존되지 않습니다.

실제 Firebase로 개발할 때만 [서버 설정 안내](FIREBASE_SETUP.md#다른-pc의-서버-설정)에 따라 환경파일과 관리자 인증을 별도 준비한 뒤 `npm run dev`를 실행합니다. `.env.local`과 관리자 키는 Git에 없으며 새 PC에 자동 전달되지 않습니다. Codex에서 저장소 루트를 열고 다음처럼 요청하면 됩니다.

> AGENTS.md와 docs/HANDOFF.md를 읽고 CS Class를 이어가자. 먼저 현재 브랜치·미커밋 변경·원격 동기화를 확인하고 진행 중인 작업과 다음 범위를 정하자.

[로컬 앱](http://localhost:3000/)을 열고 [HANDOFF](HANDOFF.md)를 읽으면 이어갈 수 있습니다. VS Code/Codex의 과거 대화가 없어도 이 문서와 저장소의 스크린샷을 기준으로 작업합니다.

### 진행 중 작업을 다른 환경으로 옮기기

Git으로 전달할 수 있으면 신규 파일까지 커밋·push하고, 완료된 작업은 검증한 `main`으로 이어갑니다. 로컬 이식 ZIP은 커밋 전 작업을 보존하는 대안입니다. 완료된 `main`과 진행 중인 작업 파일을 구분하며 일반 `git diff`에는 미추적 신규 파일이 들어가지 않으므로 아래 두 목록을 함께 확인합니다.

```powershell
git status --short --branch
git rev-parse HEAD
git diff --stat
git ls-files --others --exclude-standard
```

- 현재 브랜치·기준 커밋·미추적 파일·이식 묶음의 이름은 HANDOFF에서 확인합니다. 미커밋 작업은 원격 복제본에 없을 수 있으므로 새 소스·대상 검사·담당 문서가 함께 포함됐는지 확인합니다.
- 이식 묶음은 저장소 전체가 아닌 진행 중 파일의 스냅샷입니다. `TRANSFER.md`와 `handoff-manifest.json`을 먼저 읽고 SHA-256·기준 커밋·대상 파일의 기존 변경을 확인한 뒤 적용합니다. 깨끗한 별도 체크아웃에서 기준 커밋으로 `codex/` 브랜치를 만들고 `workspace/` 아래 파일을 같은 상대 경로로 복사하는 방식이 가장 단순합니다.
- 이미 수정 중인 PC에서는 파일을 통째로 덮어쓰지 않고 기준 파일과 양쪽 변경을 비교해 합칩니다. 미추적 파일의 이름 충돌도 확인합니다. `.git`·비밀 설정·학생 자료·원본 PPT·캐시를 복사하는 방식으로 이식하지 않습니다.
- 정상적인 Git 인계를 마친 뒤에는 전달한 커밋/브랜치와 최신 상태를 HANDOFF에 갱신합니다. 오래된 이식 묶음은 제작 시점의 참고본으로 구분하고 새 변경을 대신하지 않습니다. 생성된 스냅샷은 원격 동기화나 커밋 완료를 뜻하지 않습니다.
- 새 PC의 플러그인은 Ponytail 스킬과 Context7 도구가 실제로 있는지 확인합니다. 설치 경로는 PC마다 다르며 대화에서 쓴 에이전트 이름·도구 호출 상태도 자동 복원되지 않습니다. 사용 가능한 스킬·로컬 문서·실제 코드로 이어갑니다.

## 로컬 게스트 입장

`npm run dev:emulator`가 [로컬 테스트 설정](../scripts/local-test-env.mjs)을 적용하고 [시드](../scripts/seed-emulator.mjs)에서 별도 게스트 학생 `21099`·교사를 준비합니다. 10반에 순서·순서도·엔트리봇을 공개하고 순서 수업을 이번 수업으로 지정합니다. 버튼 두 개는 학생·교사 로그인 카드에 함께 있으며 계정 입력 없이 각 대시보드로 이동합니다. 정책과 공유 계정의 범위는 [PRD](PRD.md#로컬-게스트-체험)를 따릅니다.

표시와 POST `/api/auth/guest`는 [서버 조건](../src/lib/server/guest-mode.ts)을 같이 확인합니다. `VERCEL`이 없고, `FIREBASE_PROJECT_ID=demo-cs-class`·`FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`·`FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`·서버 전용 `CS_TEST_GUEST_PASSWORD`가 모두 준비되어야 합니다. 파일을 배포에서 제외하는 방식이 아니라 동일한 코드가 실행 환경으로 표시와 요청을 판정합니다. 테스트 비밀번호를 브라우저에 전달하지 않으며 기존 Firebase 인증과 서버 세션을 사용합니다. `npm run dev`의 실제 Firebase 연결에는 게스트가 없습니다. 교사로 비밀번호 초기화를 시험하면 게스트 학생도 기존 정책에 따라 버튼 입장이 실패하므로 로컬 에뮬레이터를 종료·재실행해 계정을 복구합니다. 재실행하면 기존 로컬 기록도 사라집니다.

실행 중인 로컬 에뮬레이터의 대상 검사는 `npm run test:e2e:running -- tests/guest-login.spec.ts`입니다. 환경 조건·요청 출처·역할/담당 반·계정 잠금·기록 복원·실패 입력 보존·모바일/키보드를 확인합니다. 이 검사를 실행하면 게스트 학생의 순서 수업 기록을 초기화하므로 수동 체험 중인 기록을 보존해야 할 때는 검사를 함께 실행하지 않습니다.

## 공통 선택 메뉴와 로그인 화면

앱에서 직접 구현하는 반·수업·프로그래밍 실습의 선택은 `src/components/ui/select.tsx`·`select.module.css`로 통일합니다. 설치된 Base UI의 Select를 사용하며 추가 의존성이 없습니다. 선택 값·비활성 상태·저장 전 이동 확인은 호출 화면에서 기존처럼 관리하고, 화면별 CSS는 배치와 크기만 조정합니다. 펼침창은 포털에 표시되어 대화상자와 좁은 화면에서 잘리지 않습니다.

로그인 구현은 `src/components/login-screen.tsx`와 인접 CSS Module에 있습니다. 비밀번호 방식의 인증 역할은 기존 `instructor`이며 공통 세션·권한 계약을 사용합니다. 디자인 기준은 [DESIGN](DESIGN.md#확정된-공통-기준), 검사는 `tests/interface-polish.spec.ts`의 로그인 실패/복원·담당 반 권한·키보드·대화상자·320/390/768/1440px와 기존 일정/교사/프로그래밍 흐름을 따릅니다. 선택 검사는 네이티브 `selectOption` 대신 combobox를 열고 실제 option을 선택합니다.

## 대시보드 파일럿

학생 `/student`·교사 `/teacher`는 공통 할 일·일정·수업 바로가기를 사용합니다. 학생의 전체 수업은 `/student/lessons`, 교사의 수업 설정은 `/teacher/classes`, 학생 진행·제출·계정은 `/teacher/students`, 전체 일정은 각각 `/student/schedule`·`/teacher/schedule`입니다. 교사 상세 링크의 `classId`·`lessonId`·`studentId`는 서버 권한 안에서 조회 조건으로 사용합니다.

- 공통 화면·목록·일정·담당 CSS는 `src/components/dashboard/`에 둡니다. `use-saved-list.ts`는 두 목록의 직렬 저장·실패 의도·명시적 충돌 재시도를 공유합니다. `todos.tsx`는 이 큐로 개인 할 일의 즉시 삭제/완료 표시와 실패 시 삭제 행 복원을 처리하고 저장 중인 행만 잠급니다. 반 일정의 삭제 처리는 기존대로 유지합니다. 기존 학습 저장·이동 보호를 재사용하며 개인 체크가 `csWork`를 변경하지 않습니다.
- 서버 저장과 권한은 `src/lib/server/planner.ts`, 계약·한국 날짜는 `src/lib/classroom/planner.ts`에서 관리합니다. 저장 모델은 [Firebase 안내](FIREBASE_SETUP.md#데이터와-남은-한계), 파일럿 가정·한도·미전송 내용의 경계는 [PRD](PRD.md#작은-버전의-경계와-저장-동작)를 따릅니다.
- 로컬 `dev:emulator`를 계속 실행한 상태에서 목록을 추가한 뒤 새로고침·로그아웃·같은 합성 계정 재로그인으로 복원을 확인합니다. 교사 입장의 강사는 담당 10·11반의 일정을 등록하고 해당 반의 합성 학생은 조회합니다. 운영 계정·자료는 사용하지 않습니다.
- 대상 검사는 `tests/dashboard-pilot.spec.ts`·`tests/loading-states.spec.ts`입니다. 변경 중에는 실행 중인 에뮬레이터에서 `npm run test:e2e:running -- tests/<target>.spec.ts`로 확인하며 최종 통합은 [전체 검증](#검증)을 따릅니다.

Next.js 가이드는 설치본 `node_modules/next/dist/docs/`에 있습니다. 패치 버전 차이는 설치본을 기준으로 하고, 라이브러리 문서 확인 규칙은 AGENTS를 따릅니다. 이번 조회 구현의 SDK 근거는 아래 성능 측정 절에 있습니다.

### 대시보드 성능 측정

[성능 검사](../tests/dashboard-performance.spec.ts)는 `demo-cs-class`·로컬 Auth/Firestore를 확인한 뒤 합성 학생·교사로 측정합니다. 교사는 담당 11개 반과 선택 반의 학생 30명, 학생은 열린 수업 3개를 사용합니다. 이전 테스트의 작품을 보존한 뒤 측정 조건을 초기화하고 종료 시 복원합니다. 첫 관찰과 연속 새로고침 5회를 구분하며 응답 본문 대신 결과의 SHA-256·시간·크기·요청 수만 보고서에 저장합니다.

위 Windows 검사 터미널 준비와 빌드 후 실행합니다. 기존 3000번 서버·에뮬레이터는 종료한 상태여야 합니다.

```powershell
$env:CI = "1"
$env:CS_PERF_LABEL = "before-or-after"
npx.cmd firebase emulators:exec --only auth,firestore --project demo-cs-class "playwright test tests/dashboard-performance.spec.ts"
```

보고서는 `test-results/`의 해당 검사 폴더에 `performance.json`으로 생성됩니다. 다음 실행에서 덮어쓰므로 비교할 파일은 Git 제외 `scratch/`에 먼저 복사합니다. 동일 PC·빌드 모드·fixture로 중앙값과 최댓값을 비교하고 첫 관찰은 별도 기록합니다. 화면 준비 시간은 Playwright 탐색부터 네 API 응답 완료와 스켈레톤 소멸 확인까지이며 브라우저 조작 비용도 포함합니다. 설치된 Firebase Admin 14.5.0의 Firestore 9.2.0 소스·타입과 Context7 `/googleapis/nodejs-firestore`에서 트랜잭션 `getAll`의 읽기 일관성·참조 순서·누락 문서 동작을 확인했습니다.

[공개 홈 측정 스크립트](../scripts/measure-public-home.mjs)는 별도의 비로그인 브라우저에서 운영 홈 첫 관찰과 연속 접속 5회를 확인합니다. 저장된 로그인·HAR·쿠키·헤더·응답 본문·캡처를 수집하지 않습니다. 기록 경로의 부모 폴더는 미리 준비합니다.

```powershell
node scripts/measure-public-home.mjs https://cs-class-donghyunt.vercel.app scratch/public-home-performance.json
```

운영 로그인 수치는 선생님이 직접 로그인한 Chrome의 F12 → Network → Fetch/XHR에서 새로고침 뒤 `session`·`teacher`·`todos`·`schedule`의 Time·Size만 확인합니다. 상세 요청·헤더·응답·HAR는 공유하지 않습니다. 운영과 로컬의 감소율을 계산하거나 첫 관찰을 서버 콜드 스타트로 단정하지 않습니다. 실제 관찰 결과와 후속 병목은 [HANDOFF](HANDOFF.md#교실-입장대시보드-조회-성능)에 남깁니다.

## EntryJS 실습

`entry-bot-lab`은 실제 `@entrylabs/entry` **4.0.23** 작업실을 사용합니다. 교사가 해당 수업을 반에 공개하면 학생의 열린 수업에 나타납니다. 에뮬레이터 시드는 10반에 엔트리봇을 공개합니다. 교사 수업 관리에서 공개 상태를 확인하고 합성 학생 `21001` 또는 게스트 학생으로 실습 탭을 선택합니다. 강사·학생 비밀번호는 위 로컬 테스트 설정을 따릅니다.

- `npm ci`의 `postinstall`과 `npm run dev`·`npm run build`의 준비 단계가 [자산 목록](../scripts/entryjs-assets.json)의 버전·SHA-512로 브라우저 파일을 준비합니다. npm 레지스트리·공식 Entry CDN·고정한 공식 예제 커밋을 사용하며 브라우저는 `/entryjs/vendor/`의 로컬 파일을 읽습니다. 첫 설치에는 인터넷과 `tar`가 필요합니다(Windows 기본 tar 또는 해당 OS의 tar). 자산·다운로드 캐시는 Git 제외 `public/entryjs/vendor/`·`scratch/entryjs/`에 생성됩니다. 필요하면 `npm run prepare:entryjs`로 다시 준비합니다. 무결성이 다른 파일은 빌드에 사용하지 않습니다.
- [작업실 HTML](../public/entryjs/workspace.html)·[브리지](../public/entryjs/workspace.js)는 `allow-scripts`만 허용한 iframe에서 실행합니다. Next.js 앱의 React 19와 EntryJS 보조 UI의 React 18을 분리합니다. iframe의 설정 저장소는 메모리이며 부모 화면의 쿠키·DOM·저장소에 접근할 수 없습니다. 공개 자산에만 CORS와 OPTIONS를 허용하고 수업 API의 인증·권한·Origin 검사는 유지합니다.
- 학생 화면은 [EntryPracticeWorkspace](../src/components/student/entry-practice-workspace.tsx), 작품 읽기는 [entry-project.ts](../src/lib/classroom/entry-project.ts), 서버 조건 판정은 [solutions.ts](../src/lib/server/solutions.ts)에서 관리합니다. 네이티브 JSON-string 스크립트와 이전 미리보기 작품을 읽습니다. 시작·이동·시간 동안 말하기 블록과 상수 입력만 허용하고 고정한 엔트리봇·무대로 불러옵니다. 최대 50개 블록·직렬화된 작품 28KB, 이동 ±1000·말 80자·시간 0~10초를 지원합니다.
- 실행 결과는 중지 **전**에 수집합니다. EntryJS는 중지하면 오브젝트를 실행 전 상태로 되돌리고 `exportProject`도 실행을 중지하므로, 실행 중 자동 저장은 정지 상태의 작품에 현재 코드만 반영합니다. 15초가 지나면 실행을 멈춥니다. 이 과제의 서버 채점은 지원 블록의 연결 구조·상수 값을 검사하며 서버에서 EntryJS를 실행하지 않습니다. 다른 과제의 반복·입력·충돌·난수 검사는 별도 설계합니다.
- 네이티브 입력의 붙여넣기·IME는 `input`을 `keyup` 처리로 연결합니다. 단계 이동·화면 이동·검증·제출 전에는 편집기의 현재 작품을 읽고 저장하며 실패하면 이동을 멈춥니다. 드래그 중 임시 블록은 저장하지 않습니다. 작품을 불러올 때 작업실 `dReDraw`와 팔레트 `reDraw`의 예약을 순서대로 `flush()`한 뒤 편집을 허용합니다. 늦은 초기 갱신이 입력창을 닫지 않도록 하며, 자동 저장 이후 초점과 연속 입력도 검사합니다. EntryJS 팔레트 좌표 갱신에는 지연이 있으므로 UI 검사는 블록 모델의 좌표 준비 후 시작합니다.
- [EntryJS 브라우저 검사](../tests/entryjs-ui.spec.ts)는 실제 드래그·숫자 입력·실행·무대 복원·저장·검증·제출·재접속, 저장/파일 로딩 실패 복구, 좁은 창·Esc·키보드 가로 이동을 확인합니다. 라이브러리 번들과 공개된 라이선스·NOTICE·COPYING·패키지 메타데이터는 자산 준비 시 함께 보존합니다.

공식 근거: [설치 예제](https://github.com/entrylabs/example/tree/main/base), [프로젝트 API](https://docs.playentry.org/entryjs/api/2024-02-29-api.html), [실행 이벤트](https://docs.playentry.org/entryjs/api/2024-02-29-event.html). Context7에서 EntryJS를 찾지 못해 고정 버전 패키지의 README·배포 소스와 공식 문서를 확인했습니다.

### 13차시의 실제 EntryJS 적용 검토

2026-10-01 이름 미션 하나를 실제 EntryJS에 연결했습니다. 기존 `entry-bot-lab`의 팔레트·서버 검사·저장은 유지하며 공개 체험만 이름 전용 설정을 사용합니다.

- [NamePractice](../src/components/prototype/programming/name-practice.tsx)는 `/entryjs/workspace.html?exercise=name`을 사용합니다. 격리·source/opaque origin/channel 검사는 기존 방식입니다. 허용 블록은 `when_run_button_click`, 이전 초안의 키 시작을 보존하는 `when_some_key_pressed`, `ask_and_wait`, `get_canvas_input_value`, `dialog_time`, `combine_something`입니다. 초기 작품에는 시작 블록만 있고 [강아지 자산](../public/entryjs/name-dog.svg)은 기존 lucide 강아지 그림을 재사용했습니다.
- [name-entry.ts](../src/lib/prototype/name-entry.ts)는 허용 AST·고정 무대를 복원하며 ID·좌표를 제외한 작품 키와 실행 ID로 근거를 연결합니다. 질문 → 실제 대답 → 해당 대답을 사용한 실제 말하기가 서로 다른 두 입력에서 확인되어야 합니다. 인사 문구는 자유입니다. 지금 확인은 시작 버튼 아래 한 줄의 프로그램만 지원하며 복원과 실행 가능성은 구분합니다.
- [브리지](../public/entryjs/workspace.js)의 이름 전용 기록은 질문·응답·실제 말풍선을 중지 전에 수집합니다. 네이티브 질문창을 사용하고 검사 목적으로 답을 주입하지 않습니다. 질문 응답 대기를 제외한 실행 시간 15초가 지나면 중지합니다. 질문 필드의 한국어 `input/keyup`과 조합 중 Enter를 처리합니다. 실행 이벤트 안의 전체 export는 엔진을 멈추므로 그 순간에는 코드만 복사합니다.
- v2 상태는 `cs-class-programming-prototype-v2`에 저장합니다. v1이 있으면 순서·시작 신호·미완성 입력 그대로 옮기며 v1 키를 삭제하지 않습니다. 이름만 변환 실패하면 다른 답안·완료를 보존하고 이전 미니 코드 또는 `nameImportRaw`를 읽기 전용으로 제공합니다. 작품/원문 각각 100,000자, 전체 JSON 500,000자 상한을 저장·복원에 함께 적용합니다.
- 이동·도움·확인·완료 전에 활성 입력을 확정하고 작품을 내보냅니다. 단계·미션·교사/홈 이동은 탭 저장까지 확인하며 실패 시 작업실을 유지합니다. 초기 로딩/파일 실패만 있고 실제 편집이 없으면 저장된 초안으로 이동할 수 있습니다. 도움은 `mini | entry`의 고정 작품·실행 스냅샷이며 실제 전송은 없습니다. 실행 근거/확인 결과는 화면 메모리로, 단계/미션 이동·새로고침 후에는 다시 실행합니다.
- 변경 중에는 typecheck와 [파일럿 검사](../tests/name-entry-pilot.spec.ts)를 사용합니다. 공개 체험·공용 EntryJS 브리지의 영향 범위를 함께 확인할 때는 다음 대상 검사를 사용합니다: `npm run test:e2e:running -- tests/name-entry-pilot.spec.ts tests/programming-prototype.spec.ts tests/entryjs-ui.spec.ts`. 이 명령은 로컬 demo 에뮬레이터가 실행 중일 때만 씁니다. 최종 통합은 [검증](#검증)을 따르고 실제 실행 범위·한계는 HANDOFF에 남깁니다.

곱셈/평균·방향키 미션의 실제 Entry 전환, 운영 Lesson/Work 편입, 서버 범용 실행 검사·AI·교사 전송은 후속 설계입니다. Context7 검색의 Entry UI 라이브러리를 EntryJS 근거로 쓰지 않으며 위 [공식 API/이벤트](#entryjs-실습)와 설치본 4.0.23을 확인합니다.

## 프로그래밍 수업 프로토타입

`npm run dev:emulator` 뒤 [공개 체험](http://localhost:3000/prototype/programming)을 엽니다. 일반 개발은 `CI`를 설정하지 않고 실행합니다. 빌드 확인용으로 `$env:CI='1'`을 설정한 터미널에서는 `next start`가 실행되므로 소스 수정 반영을 확인하려면 다시 빌드하거나 일반 개발 모드로 시작합니다. 원본 PPT 없이도 소스로 체험을 재현할 수 있으며 차시 내용·PPT와의 차이는 [수업 자료 요약](reference/programming-13.md)에 있습니다.

### 코드 위치와 역할

| 파일 | 담당 |
| --- | --- |
| [page.tsx](../src/app/prototype/programming/page.tsx) | 공개 URL의 페이지·메타데이터 |
| [programming.tsx](../src/components/prototype/programming/programming.tsx) | 단계/학생·교사 시점·초안 복원/보관·이동 보호·Effect 초점·초기화 |
| [concept.tsx](../src/components/prototype/programming/concept.tsx) | 조작형 개념 4개와 개념 확인 |
| [quiz.tsx](../src/components/prototype/programming/quiz.tsx) | 한 문항씩 풀이·회차 채점·오답 재도전 |
| [practice.tsx](../src/components/prototype/programming/practice.tsx) | 미니 블록 팔레트·조립·입력·실행 타이머·무대·조건 확인·완료·발견 기록 |
| [name-practice.tsx](../src/components/prototype/programming/name-practice.tsx)·[name-entry.ts](../src/lib/prototype/name-entry.ts) | 이름 미션의 실제 편집기·작품 읽기·실행 근거·조건 확인 |
| [support.tsx](../src/components/prototype/programming/support.tsx) | 도움 요청의 고정 문맥·교사 답변·학생 해결 표시 |
| [programming.module.css](../src/components/prototype/programming/programming.module.css) | 기능에 인접한 데스크톱/좁은 화면·상태·초점 스타일 |
| [programming.ts](../src/lib/prototype/programming.ts) | 개념/퀴즈/미션 데이터·타입·초기값·복원 검사·순수 `runProgram/checkMission` |
| [programming-prototype.spec.ts](../tests/programming-prototype.spec.ts) | 순수 실행/복원·전체 체험·키보드/좁은 창·저장 실패의 4개 검사 |

기존 `Stage`·Brand·Button·NavigationProvider를 재사용합니다. 공개 체험은 운영 Lesson/Work·서버 저장에서 분리되어 있습니다. 공통 루트의 `SessionProvider`는 기존처럼 세션 확인을 수행하므로 이 체험을 ‘HTTP/API 요청이 전혀 없는 앱’으로 설명하지 않습니다. 체험 자체는 로그인을 요구하지 않고 학습 기록을 서버에 보내지 않습니다.

### 상태와 저장 경계

| 상태 | 위치·수명 | 재접속/이동 때의 동작 |
| --- | --- | --- |
| 단계·개념 확인 답안/완료·퀴즈 회차/풀이/해결·미션별 코드·입력·완료·발견 기록 | `sessionStorage`, 키 `cs-class-programming-prototype-v2`, `version: 2` (v1 원문 유지) | 같은 탭의 새로고침에 복원. 다른 기기/사용자 계정의 서버 기록이 아님 |
| 개념 실험의 표현 방식·이름·A/B·강아지 위치 | Concept 컴포넌트 메모리 | 개념 단계에서 나갔다 돌아오면 기본 실험값. 개념 확인 기록은 유지 |
| 마지막 실행·실행 중 타이머·무대 위치·조건 확인 결과 | Practice 컴포넌트 메모리 | 미션/단계/시점 변경·새로고침에 지속 실행하지 않음. 미션별 코드와 완료 기록은 보존 |
| 도움의 코드/입력/실행(Entry는 요청 버튼, mini는 패널을 연 순간)·예시 요청·교사 답변·해결 표시 | 루트/도움 UI 메모리 | 최신 코드와 분리된 스냅샷. 새로고침하면 사라지며 하나의 요청 체험만 지원 |
| 학생·교사 모드·도움 패널·입력 중 도움 문장 | 화면 메모리 | 서버 역할·메시지 발송·권한을 나타내지 않음 |

보관은 hydration 뒤 Effect에서 읽고 이벤트의 최신 상태를 ref로 유지합니다. 단계/페이지 이동 전 최신 입력을 보관하며 저장 실패 때 입력을 유지하고 재시도를 안내합니다. `sessionStorage` 읽기 실패·quota/쓰기 실패·잘못된 버전/구조를 구분해 읽고, 실제 학생용 서버 저장 정책은 [PRD](PRD.md#작업-저장과-통신-비용)를 따릅니다. 브라우저 세션 복원·탭 복제는 환경별로 다르므로 `sessionStorage`를 개인정보 보안이나 기기 간 백업 장치로 사용하지 않습니다.

복원은 허용된 초안의 모양을 검사하고 실행은 실행 가능한 값을 따로 검사합니다. 이동량 입력을 지우거나 긴 숫자 `100.0000`을 입력한 상태도 보존합니다. 이 때문에 전체 답안·완료 기록을 초기화하지 않습니다. 지원하지 않는 종류·손상된 JSON·범위를 넘는 구조는 실행에 사용하지 않습니다. 원 저장 형식을 바꾸면 버전/초안 처리도 함께 갱신합니다.

### 미니 실행과 조작의 경계

- 미션별 최대 32블록이며 허용 enum·입력 길이를 검사합니다. 실습의 A/B는 유한한 수 ±1000, 이동량은 실행 때 1~100입니다. 개념 실험의 A/B UI 범위는 ±100으로 실습과 별도입니다. 실행 무대의 좌표 한계는 x ±180/y ±100입니다.
- `runProgram`은 허용 명령을 결정적으로 처리하며 임의 코드/eval을 실행하지 않습니다. 여러 시작 블록을 신호별로 구분하고 대답·A/B·말풍선·방향·좌표의 실행 발자국을 반환합니다. `checkMission`은 여러 입력과 실제 발자국으로 해당 미션만 확인합니다.
- 실제 실행 결과·조건 확인·완료 표시는 별도입니다. 평균 도전은 기본 3미션 집계에서 제외하며 완료 뒤 편집이 이전 완료 기록을 취소하지 않습니다. 최신 코드로 다시 확인할 수 있게 표시합니다.
- 실행 중 코드 편집을 잠그고 중지/무대 초기화는 시작 상태로 되돌립니다. 컴포넌트 정리와 미션/단계 이동은 타이머를 취소합니다. 방향키는 무대 자체에 초점이 있을 때만 동작하여 숫자/문장 입력을 가로채지 않습니다.
- 팔레트 클릭·네이티브 드래그, 블록 드래그/위·아래 버튼·삭제를 지원합니다. 단계 탭은 좌우/Home/End로 선택하며 초점 이동은 React 갱신 뒤 Effect에서 처리합니다. `체험 처음부터`는 확인 후 학습 기록·도움·컴포넌트 내부 실험/실행 상태를 함께 초기화합니다.

### 처음 체험하는 순서

1. 개념에서 블록/텍스트를 바꾸고 실행합니다. 다음 개념의 이름·A/B·방향을 바꾸며 짧은 확인 문제를 풉니다. 단계는 완료 전에 자유롭게 오갑니다.
2. 퀴즈에서 일부러 하나를 틀리고 결과를 본 뒤 오답만 재도전합니다. 상단 전체 해결 수와 이번 회차 분모를 비교합니다.
3. 실습에서 블록을 클릭/드래그로 더하고 입력·순서를 바꿔 실행합니다. 실행 발자국과 조건 확인 뒤 완료 표시·발견 기록을 남기고 새로고침해 복원을 봅니다.
4. 곱셈 계산기의 A 저장을 빠뜨리고 실행한 뒤 `막혔어요` → `도움 요청 체험하기` → `요청받은 선생님 화면 보기`를 선택합니다. 직접 피드백을 남기고 학생 시점으로 돌아와 코드를 고칩니다.
5. 학생이 `다시 해보고 해결했어요`를 선택한 뒤 교사 시점에서 요청 당시 코드와 최신 코드 차이를 확인합니다. 교사 답변은 실제 전송이나 AI 호출이 아닙니다. 새로고침 시 이 도움 요청이 사라지는 안내도 확인합니다.

변경 중에는 `npm run typecheck`와 실행 중인 로컬 에뮬레이터의 `npm run test:e2e:running -- tests/programming-prototype.spec.ts`를 우선 실행합니다. 필요하면 [실제 EntryJS 검사](../tests/entryjs-ui.spec.ts)도 해당 범위로 확인합니다. 최종 앱 통합은 아래 공통 검증, 문서만 수정한 작업은 내용·활성 링크/앵커·`git diff --check`·이식 파일 목록/해시를 확인하고 앱 검사 과거 결과와 구분해 기록합니다.

## 검증

저장소 루트에서 실행합니다. Java 21+와 최초 `npx playwright install chromium`이 필요합니다. 실제 Firebase에 연결한 3000번 서버는 종료한 뒤 실행합니다.

```powershell
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

`test:e2e`는 Auth·Firestore 에뮬레이터를 시작하고 종료합니다. 이미 `dev:emulator`가 실행 중일 때만 `npm run test:e2e:running`을 사용합니다. 테스트는 로컬 `demo-cs-class`를 확인한 뒤 가상 계정을 준비하며 운영 데이터는 사용하지 않습니다.

GitHub Actions는 `main`·`codex/**` push와 PR에서 위 네 검사를 실행하며 E2E는 빌드된 앱을 `next start`로 실행해 검사합니다. 로컬 E2E는 개발 서버를 사용합니다. UI 확인 기준은 [AGENTS](../AGENTS.md)를 따릅니다. 구체적인 연결·운영상 한계는 [Firebase 연결 안내](FIREBASE_SETUP.md)를 확인합니다.

Windows에서 검사 뒤 `next start` 종료가 멈추면 이번 실행의 PID와 명령을 확인해 해당 테스트 서버만 종료합니다. Playwright는 서버 종료 후 최종 결과를 출력하므로 E2E 요약과 종료 코드까지 확인합니다.

PowerShell의 `Stop-Process`가 객체 참조 오류로 종료하지 못하면 검증한 같은 PID에 `[System.Diagnostics.Process]::GetProcessById($pilotServerPid).Kill()`을 사용할 수 있습니다. `$pilotServerPid`에는 이번 검사에서 시작한 `next start --hostname localhost --port 3000`임을 부모 스크립트·명령줄로 대조한 PID만 넣습니다. 다른 앱 서버·Node 프로세스를 일괄 종료하지 않습니다.

앱 테스트 주소는 `http://localhost:3000`입니다. 운영 쿠키 보안을 낮추지 않습니다. 빌드 후 PowerShell에서 `$env:CI='1'`을 설정하고 E2E를 실행하면 CI와 같은 `next start` 검사가 됩니다. 실행 후에는 해당 터미널의 기존 CI 환경값으로 복원합니다. 날짜별 실행 결과와 미검증 항목은 [HANDOFF](HANDOFF.md)에 기록합니다.

## Stitch 연결

Codex의 **StitchDesign 플러그인과 MCP 설정은 PC별로 준비**합니다. 저장소 복제로 사용자 도구 설정이나 API 키가 옮겨지지는 않습니다. 기존 프로젝트는 [CS Class 랜딩페이지 디자인](https://stitch.withgoogle.com/projects/9952170337891001891)이며 ID·화면 조회 주의사항은 [아래 Stitch 상태](#stitch-상태)에 있습니다.

Codex 사용자 설정 `~/.codex/config.toml`의 기존 설정을 보존하면서 다음 서버 항목을 사용합니다. 같은 이름의 서버가 있으면 중복 추가하지 않습니다.

```toml
[mcp_servers.stitch]
url = "https://stitch.googleapis.com/mcp"
env_http_headers = { "X-Goog-Api-Key" = "STITCH_API_KEY" }
enabled_tools = ["get_project", "list_screens", "get_screen", "edit_screens"]
startup_timeout_sec = 30
tool_timeout_sec = 180
```

### Stitch 키 입력

Windows PowerShell에 아래 블록을 붙여넣고 입력 안내가 나오면 본인의 키를 입력합니다. 입력은 숨겨지고 현재 Windows 사용자 환경변수에만 저장합니다. 실행 정책을 바꾸거나 키를 채팅·명령 인자·저장소에 적지 않습니다.

```powershell
& {
    $stitchSecret = Read-Host 'Stitch API 키' -AsSecureString
    try {
        $stitchValue = [Net.NetworkCredential]::new('', $stitchSecret).Password.Trim()
        if ($stitchValue.Length -lt 20 -or $stitchValue -match '\s') { throw '키 형식을 확인해 주세요.' }
        [Environment]::SetEnvironmentVariable('STITCH_API_KEY', $stitchValue, 'User')
        '등록 완료. Codex를 완전히 종료한 뒤 다시 열어 주세요.'
    }
    finally { $stitchValue = $null; $stitchSecret.Dispose() }
}
```

macOS·Linux에서는 Codex를 시작하는 환경에 같은 이름의 환경변수를 안전하게 설정합니다. 재시작 후 `codex mcp get stitch --json`으로 URL·환경변수 참조를 확인하고 프로젝트를 조회합니다. 현재 허용 도구는 조회·기존 화면 수정이며, 새 시안 작업에서 필요한 도구의 가용성은 다시 확인합니다.

### Stitch 상태

- 프로젝트: [CS Class 랜딩페이지 디자인](https://stitch.withgoogle.com/projects/9952170337891001891). 키는 `STITCH_API_KEY`로만 참조하며 [Stitch 연결](#stitch-연결)에 PC별 설정을 설명합니다.
- 확인한 도구는 `get_project`, `list_screens`, `get_screen`, `edit_screens`입니다. 목록에 누락되면 아래 화면 ID로 조회합니다. 로컬 수정은 Stitch에 자동 반영되지 않습니다.
- 테마의 과거 Plus Jakarta Sans보다 현재 DESIGN의 Pretendard·색·컴포넌트 기준이 우선입니다.

| 화면 | 최초 ID | 수정 결과 ID |
| --- | --- | --- |
| 홈 데스크톱 | `43f4bb0b48b0429ea7827b5fec944945` | `b9fcd8f02ce3462c89ce9f653285f699` |
| 홈 모바일 | `e157096258184c8190a44a9ba31585d8` | `5fdd1894a36a4c1e93b378b4a334abe8` |
| 초기 브랜드 | `d355390e8e2b472093273fbb1855ffc5` | 로컬 작은 학사모가 현재 기준 |

## 외부 환경과 로컬 전용 자료

- Vercel 프로젝트·Git 배포·Root Directory·Node 실행 설정·접근 보호와 Firebase 연결·복구는 [서버 설정](FIREBASE_SETUP.md#vercel-서버-설정)에 모읍니다. 확인 날짜·배포 결과는 HANDOFF에서 관리합니다.
- 키·환경변수·학생 계정 엑셀·`백업용/`은 Git에 포함하지 않습니다. 학생 자료가 필요한 작업은 원래 PC의 자료를 별도 안전한 경로로 준비해야 합니다. UI 작업은 이 자료 없이 가능합니다.
- 최신 공개 홈 참고 이미지와 제공받은 [UI Component Lab](reference/ui-component-lab/index.html)은 저장소에 포함했습니다. 외부 PC에서도 사용할 수 있으며 학생 개인정보가 들어 있지 않습니다.

## 공통 데이터 계약을 수정할 때

제품 의미·권한·저장 정책은 [PRD](PRD.md)를 따릅니다. 구현의 공통 시작점은 [types.ts](../src/lib/classroom/types.ts), [client.ts](../src/lib/classroom/client.ts), [progress.ts](../src/lib/classroom/progress.ts)이며 학생·교사 화면이 같은 세션·탐색 보호·서버 API를 사용합니다.

- 정책의 식별자·권한·초안/제출·완료 의미를 위 계약에 반영하고, 서버 인증은 `src/lib/server/auth.ts`, 수업 저장은 `classroom.ts`·`learning.ts`, 목록 저장은 `planner.ts`에서 함께 확인합니다.
- 변경한 계약을 쓰는 학생·교사 양쪽 호출부를 찾고 만료·권한 부족·통신 실패·버전 충돌·늦은 응답을 대상으로 검사합니다. 환경별 실제 결과는 HANDOFF에 남깁니다.

이전 구조·정적 시안은 [코드 보관함](../archive/README.md)과 Git 이력에서 확인합니다. 현재 실행·배포 기준은 저장소 루트의 앱과 [서버 설정](FIREBASE_SETUP.md#vercel-서버-설정)입니다.
