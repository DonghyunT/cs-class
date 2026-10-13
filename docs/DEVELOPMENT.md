# 개발 환경과 도구 설정

빠른 실행과 문서 목차는 [README](../README.md), 검증·작업 규칙은 [AGENTS](../AGENTS.md)를 따릅니다. 모든 명령은 저장소 루트에서 실행합니다.

## 다른 PC에서 시작

먼저 [HANDOFF의 현재 작업 상태](HANDOFF.md#현재-작업-상태)와 [PC 재개 안내](HANDOFF.md#다른-pc에서-이어가기)를 확인합니다. 완료된 작업의 기준은 `main`이며, 진행 중인 브랜치·미커밋 변경이 있으면 먼저 보존하고 이어갈 대상을 정합니다. 배포에 사용한 릴리스 SHA와 가져온 커밋이 같은지도 확인합니다.

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

에뮬레이터·Playwright를 이미 `scratch/`에 설치한 제한된 Windows 환경에서는 기존 캐시를 가리킵니다. `$env:FIREBASE_EMULATORS_PATH="$PWD\scratch\firebase-emulators"`, `$env:PLAYWRIGHT_BROWSERS_PATH="$PWD\scratch\playwright"`를 같은 검사 터미널에 설정합니다. Chromium이 기본 사용자 캐시인 `$env:LOCALAPPDATA\ms-playwright`에 이미 있으면 재설치하지 않고 그 경로를 사용합니다. Java가 PATH에 없으면 해당 PC에 설치한 Java 21+의 `bin`을 그 터미널 PATH 앞에 추가합니다. 설치된 Java 21+ 및 브라우저 캐시 경로는 아래와 같으며 캐시가 없는 새 PC는 최초 설치를 진행합니다.

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

실제 Firebase로 개발할 때만 [서버 설정 안내](FIREBASE_SETUP.md#다른-pc의-서버-설정)에 따라 환경파일과 관리자 인증을 별도 준비한 뒤 `npm run dev`를 실행합니다. `.env.local`과 관리자 키는 Git에 없으며 새 PC에 자동 전달되지 않습니다. 새 대화에서 이어갈 때의 요청문은 [HANDOFF](HANDOFF.md#새-대화에-붙일-요청문)를 따릅니다.

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
- 정상적인 Git 인계를 마친 뒤에는 전달한 커밋/브랜치와 최신 상태를 HANDOFF에 갱신합니다. 오래된 이식 묶음은 제작 시점의 참고본으로 구분하며 새 변경을 대신하지 않습니다.
- Git 전달 범위, 플러그인 확인, 로컬 demo export 전달 및 주의사항은 [HANDOFF](HANDOFF.md#다른-pc에서-이어가기)를 따릅니다.

### 기존 demo 기록을 복원해 보기

먼저 `/api/auth/config`가 `demo-cs-class`와 로컬9099/8080을 가리키는지 확인합니다. 실행 중인 기록은 종료 전에 새 Git 제외 폴더로 export합니다. 아래 경로는 예시이며 기존 백업을 덮어쓰지 않도록 바꿉니다.

```powershell
npx.cmd firebase emulators:export .\scratch\demo-before-switch --project demo-cs-class
```

확인한 로컬 앱·에뮬레이터를 종료한 뒤, 첫 터미널에서 전달받은 export를 import합니다. Auth와 Firestore가 모두 포함됐는지 확인하며 운영 프로젝트에는 실행하지 않습니다.

```powershell
npx.cmd firebase emulators:start --only auth,firestore --project demo-cs-class --import .\scratch\transferred-demo
```

두 번째 터미널에서 아래 명령으로 **시드 없이** 앱을 실행합니다. `testEnv`는 로컬 합성 인증·AI 설정이며 일반 `dev:emulator`의 시드 단계를 거치지 않습니다. 준비된 Java·캐시와 demo 전용 환경은 위 안내를 따릅니다.

```powershell
node --input-type=module -e "import { spawn } from 'node:child_process'; import { testEnv } from './scripts/local-test-env.mjs'; const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', 'localhost', '--port', '3000'], { stdio: 'inherit', env: { ...process.env, ...testEnv } }); app.on('exit', code => process.exit(code ?? 1));"
```

위 직접 실행은 합성 시간표 서버를 자동 시작하지 않습니다. `CS_TIMETABLE_FIXTURE=1`인 검사 터미널을 재사용한다면 [학교 시간표 안내](#학교-시간표-연동)에 따라4781 fixture도 별도로 준비합니다. 게스트로 재입장해 기존 반 공개 목록·작품·입력·제출 기록을 대조한 뒤 수정합니다. 종료 전에 새 export를 남깁니다. 이 절의 import는 Git 동기화와 별개이며 개인 기록·인증 자료를 공개 저장소에 넣지 않습니다.

## 로컬 게스트 입장

`npm run dev:emulator`가 [로컬 테스트 설정](../scripts/local-test-env.mjs)을 적용하고 [시드](../scripts/seed-emulator.mjs)에서 별도 게스트 학생 `21099`·교사를 준비합니다. 초기 시드는 로컬2-1·2-10반에 `programming-13`·`review-abstraction`·`review-sandwich`·`review-flowchart`를 공개하고 `review-sandwich`를 이번 수업으로 지정합니다. 학생·교사 로그인 카드의 게스트 버튼은 계정 입력 없이 각 대시보드로 이동합니다. 정책과 공유 계정의 범위는 [PRD](PRD.md#로컬-게스트-체험)를 따릅니다.

이번 수업은 로컬 게스트 교사의 수업 관리에서 바꿉니다. 세부 계정 정책과 공유 계정 범위는 [PRD](PRD.md#로컬-게스트-체험)를 따릅니다. 게스트 표시와 POST `/api/auth/guest`는 [서버 조건](../src/lib/server/guest-mode.ts)(`VERCEL` 부재, `demo-cs-class`, 로컬 9099/8080 에뮬레이터 환경)을 확인합니다. 실제 Firebase 연결(`npm run dev`)에는 게스트가 없습니다. 교사로 비밀번호 초기화를 시험하면 게스트 학생도 버튼 입장이 실패하므로 에뮬레이터를 재실행해 복구합니다.

실행 중인 로컬 에뮬레이터의 대상 검사는 `npm run test:e2e:running -- tests/guest-login.spec.ts`입니다. 환경 조건·요청 출처·역할/담당 반·계정 잠금·기록 복원·실패 입력 보존·모바일/키보드를 확인합니다. 이 검사는 게스트 접속과 합성 수업 기록을 변경하므로 수동 체험 중인 기록을 보존해야 할 때는 함께 실행하지 않습니다.

## 공통 선택 메뉴와 로그인 화면

앱에서 직접 구현하는 반·수업·프로그래밍 실습의 선택은 `src/components/ui/select.tsx`·`select.module.css`로 통일합니다. 설치된 Base UI의 Select를 사용하며 추가 의존성이 없습니다. 선택 값·비활성 상태·저장 전 이동 확인은 호출 화면에서 기존처럼 관리하고, 화면별 CSS는 배치와 크기만 조정합니다. 펼침창은 포털에 표시되어 대화상자와 좁은 화면에서 잘리지 않습니다.

로그인 구현은 `src/components/login-screen.tsx`와 인접 CSS Module에 있습니다. 비밀번호 방식의 인증 역할은 기존 `instructor`이며 공통 세션·권한 계약을 사용합니다. 디자인 기준은 [DESIGN](DESIGN.md#확정된-공통-기준), 검사는 `tests/interface-polish.spec.ts`의 로그인 실패/복원·담당 반 권한·키보드·대화상자·320/390/768/1440px와 기존 일정/교사/프로그래밍 흐름을 따릅니다. 선택 검사는 네이티브 `selectOption` 대신 combobox를 열고 실제 option을 선택합니다.

`src/lib/server/auth.ts`의 로그인 제한 장부는 같은 서버 인스턴스의 같은 키 요청을 Promise로 순서 처리해 동시 쓰기의 잠금 경합을 줄입니다. 처리 중인 키만 유지하고 성공·거부 후 마지막 요청이 끝나면 제거합니다. 제한 판정·횟수는 기존 Firestore 트랜잭션이 모든 인스턴스에 걸쳐 적용하며 출처·비밀번호 예산은 [제품 정책](PRD.md#로그인-정책)을 유지합니다. `tests/auth-security.spec.ts`의 27명 동시 입장·제한 거부 뒤 정상 요청과 후속 대시보드 검사를 같은 실행에서 확인합니다.

## 대시보드 파일럿

학생 `/student`·교사 `/teacher`는 공통 할 일·일정·수업 바로가기를 사용합니다. 학생의 전체 수업은 `/student/lessons`, 교사의 수업 설정은 `/teacher/classes`, 학생 진행·제출·계정은 `/teacher/students`, 전체 일정은 각각 `/student/schedule`·`/teacher/schedule`입니다. 교사 상세 링크의 `classId`·`lessonId`·`studentId`는 서버 권한 안에서 조회 조건으로 사용합니다. `SessionProvider`의 `useTeacherClass`는 UID·현재 담당 반을 검증한 탭 단위 `sessionStorage` 선택을 메뉴에 연결하며 실제 로그인/로그아웃·세션 종료 시 초기화합니다. 새 반 선택은 현재 URL만 갱신하고 다른 메뉴에는 `classId`만 전달합니다. 스토리지가 차단되면 메모리 선택을 사용합니다.

- 공통 화면·목록·일정·담당 CSS는 `src/components/dashboard/`에 둡니다. `use-saved-list.ts`는 두 목록의 직렬 저장·실패 의도·명시적 충돌 재시도를 공유합니다. `todos.tsx`는 이 큐로 개인 할 일의 즉시 삭제/완료 표시와 실패 시 삭제 행 복원을 처리하고 저장 중인 행만 잠급니다. 반 일정의 삭제 처리는 기존대로 유지합니다. 기존 학습 저장·이동 보호를 재사용하며 개인 체크가 `csWork`를 변경하지 않습니다.
- 교사 상세 화면은 `src/components/teacher/dashboard.tsx`·`teacher.module.css`에서 서버의 정식 수업 목록과 `openedLessonIds`에 함께 있는 수업만 표시·집계하고 `currentLessonId`로 이번 수업을 구분합니다. 정식 목록 밖의 이번 수업은 미지정으로 표시하며 과거 수업 ID는 DB에 보존합니다. 수업 설정 성공 알림은 `src/components/ui/toast.tsx`·`toast.module.css`와 설치된 Base UI Toast를 사용합니다. 화면별 manager를 만들고 동일 저장 알림은 갱신하며 반 전환 시 닫습니다. 기존 저장 실패·충돌·비밀번호 초기화 안내는 유지합니다.
- `tests/teacher-class-management.spec.ts`는 정식 열린 수업 표시·과거 ID 보존·이번 수업 미지정·열린 수업 없음·저장 실패와 재시도·토스트 타이머/초점·학생/교사 메뉴 일관성을 검사합니다. 공용 탐색 변경의 최종 검증에는 기존 `navigation.spec.ts`·`dashboard-pilot.spec.ts`·`platform.spec.ts`·`interface-polish.spec.ts`를 함께 포함합니다.
- 전체 일정의 오늘 이후/지난 목록은 `seoulToday()`로 나누며 지난 항목은 native details에 접고 삭제하지 않습니다. 상단 일정 등록은 기존 폼에만 초점을 옮겨 작성/수정 중 입력을 유지합니다. `tests/schedule-history.spec.ts`와 기존 `dashboard-pilot.spec.ts`·`timetable.spec.ts`·`loading-states.spec.ts`로 날짜 경계·편집·반/권한·503/409·좁은 창/키보드를 확인합니다. 홈의 다가오는5개·달력과 CRUD/revision은 유지합니다.
- 서버 저장과 권한은 `src/lib/server/planner.ts`, 계약·한국 날짜는 `src/lib/classroom/planner.ts`에서 관리합니다. 저장 모델은 [Firebase 안내](FIREBASE_SETUP.md#데이터와-남은-한계), 파일럿 가정·한도·미전송 내용의 경계는 [PRD](PRD.md#작은-버전의-경계와-저장-동작)를 따릅니다.
- 로컬 `dev:emulator`를 계속 실행한 상태에서 목록을 추가한 뒤 새로고침·로그아웃·같은 합성 계정 재로그인으로 복원을 확인합니다. 교사 입장의 강사는 담당 10·11반의 일정을 등록하고 해당 반의 합성 학생은 조회합니다. 운영 계정·자료는 사용하지 않습니다.
- `progress.ts`의 `submissionCountFor`는 알려진 미션의 최신 작품 수를 세며 교사 제출 인원과 대시보드 작품 수가 공유합니다. `lesson-navigation.ts`는 현재/진행 수업 정렬과 저장된 단계·미션의 이어갈 위치를 안내합니다. `tests/ui-dashboard-refinement.spec.ts`·`tests/ui-teacher-refinement.spec.ts`는 재로그인/UID/담당 범위·집계·필터·모바일 상세·5개 일정과 실제 화면 조작을 검사합니다.
- 대상 검사는 `tests/dashboard-pilot.spec.ts`·`tests/loading-states.spec.ts`입니다. 변경 중에는 실행 중인 에뮬레이터에서 `npm run test:e2e:running -- tests/<target>.spec.ts`로 확인하며 최종 통합은 [전체 검증](#검증)을 따릅니다.

Next.js 가이드는 설치본 `node_modules/next/dist/docs/`에 있습니다. 패치 버전 차이는 설치본을 기준으로 하고, 라이브러리 문서 확인 규칙은 AGENTS를 따릅니다.

### 교사 수업 준비와 실제 미리보기

- 도움 표시는 [help.ts](../src/lib/classroom/help.ts)의 `helpContextLabel`과 [HelpRequests](../src/components/classroom/help-requests.tsx)를 사용합니다. 기존 `lessonId/stage/mission`으로 수업·단계·미션을 읽고 GET 성공 때만 `lastCheckedAt`을 갱신합니다. 선택적 `onStatusChange({classId,count,lastCheckedAt,loading,error})`가 홈 상단 건수와 이동에 같은 결과를 전달합니다. 첫 성공 전 count는 null이며 반 전환 때 이전 반의 상태를 사용하지 않습니다. 기존30초 갱신·요청 UUID·저장본 조회/resolve API를 유지합니다.
- [반 준비표](../src/components/teacher/class-preparation-table.tsx)는 기존 `TeacherDashboard.classrooms/lessons`만 소비합니다. 설정 링크는 `/teacher/classes?classId=...&manage=1`이며 단일 값과 준비된 반을 확인한 뒤 [ManageLessons](../src/components/teacher/dialogs.tsx)를 엽니다. 닫을 때 native history로 manage를 지워 대화상자와 초점 복귀를 위해 조회 화면을 재생성하지 않습니다. 권한은 기존 teacher 응답과 설정 API가 확인합니다.
- `/teacher/preview/[id]?classId=...`의 서버 페이지와 평가 API는 교사/강사 세션·담당 반·기존 카탈로그의 일곱 수업을 확인합니다. 선택 화면에는 정식 네 수업만 표시하며 과거 세 수업의 직접 URL·API 호환은 유지합니다. [LessonPreview](../src/components/teacher/lesson-preview.tsx)와 [usePreviewWork](../src/components/teacher/use-preview-work.ts)는 실제 LessonShell/LessonEditor를 `mode="preview"`로 사용합니다. 학생 useWork를 조건부로 호출하거나 학생 계정으로 전환하지 않습니다. 작품은 컴포넌트 메모리에만 두며 초기화·새로고침·수업 변경·나가기 때 비웁니다.
- `POST /api/teacher-preview/[id]/evaluate`의 본문은 `{classId, work, action}`입니다. [teacher-preview.ts](../src/lib/server/teacher-preview.ts)는 알려진 Work 필드/수업별 ID/기존 draft·action 스키마로 strict 검사한 뒤 `validateDraft`·`applyAction`만 사용합니다. route는 본문 읽기 전 역할, 읽은 뒤 담당 반·수업을 재확인하며 Origin/요청 헤더 경계와 전용1MiB 전송 한도를 사용합니다. 현재 초안과 각 이전 검증/제출 작품의 기존 byte·항목 한도는 그대로 검사하고 학생 API 한도는 늘리지 않습니다. review/aiReview/교사 승인/학생 UID 입력은 채택하지 않습니다.
- preview는 학생 work/student/ai/help API와 학습·실제 제출·손들기 쓰기를 호출하지 않습니다. `flush`는 실제 Entry 입력을 메모리 초안으로 확정하고 실패에는 입력을 유지합니다. AI 요청과 교사 확인은 제한을 표시하고, 샌드위치는 로컬 규칙 해석, 자유 순서도는 기본 구조 확인까지만 제공합니다. `flowchart.tsx`의 학생 추상화 기록 GET도 mode 경계로 차단합니다. [공개 프로토타입](#프로그래밍-수업-프로토타입)의 미니 실행·탭 저장과 구분합니다.
- 대상 검사는 `tests/teacher-preparation.spec.ts`·`teacher-lesson-preview.spec.ts`·`teacher-preview-api.spec.ts`와 기존 `help-requests.spec.ts`·`help-races.spec.ts`·`teacher-class-management.spec.ts`입니다. UI/평가 권한·첫/재조회 실패·반 전환·숫자 정렬·URL 재접속/초점·정식 네 수업 선택·카탈로그 일곱 수업의 직접 URL/API 호환·평가 실패/한도·학생/AI 요청0건 및 학습 컬렉션 불변을 확인합니다. 인증 세션 확인과 학습 쓰기는 구분합니다.

### 학교 시간표 연동

공통 일정 계약은 `src/lib/classroom/planner.ts`, 공개 응답 검증·정보 교시 추출은 `src/lib/classroom/timetable.ts`, 요청·학교 공통 저장본·lease·재조회 제한은 `src/lib/server/timetable.ts`에 있습니다. 일정 API는 저장본만 읽으며 교사의 `/api/classroom/timetable/{classId}` POST와 인증된 `/api/cron/timetable` GET만 외부를 조회합니다. Cron 경로는 `src/app/api/cron/timetable/route.ts`, 시간·활성화 절차는 [서버 안내](FIREBASE_SETUP.md#학교-시간표-자동-갱신)에 모읍니다. 앱 일정 화면과 대시보드 달력은 직접 일정과 시간표를 함께 표시하고 외부 응답 검증 코드는 브라우저에 가져오지 않습니다.

`tests/timetable.spec.ts`는 합성 응답의 교시·변경·열람 제한·구조 거부, 학생/담당 반/전송/Cron 권한, 하루 중복·동시 실행·5분 간격, 중간 실패/잘못된 구조의 정상본 보존, 수동 일정과 입력 보존, 학생 화면·달력·327/390/768/1440px·키보드·콘솔을 검사합니다. 27회 동시 조회에서 외부 요청 증가 없음도 확인합니다. 자동 검사는 `scripts/timetable-fixture.mjs`의 127.0.0.1:4781 합성 서버를 사용합니다. Playwright webServer에서 `CS_TIMETABLE_FIXTURE=1`과 합성 Cron 인증값을 전달하며 fixture 전환은 Vercel이 아니고 프로젝트/두 에뮬레이터가 정확히 demo-cs-class·127.0.0.1:9099/8080일 때만 허용합니다. 운영 원본·교사 이름을 fixture로 저장하지 않습니다.

대상 단독 검사는 기존 준비 환경변수와 `CI=1`을 설정한 뒤 `npx.cmd firebase emulators:exec --only auth,firestore --project demo-cs-class "npx playwright test tests/timetable.spec.ts"`로 실행합니다. `npm run test:e2e -- tests/...`의 뒤 인자는 Firebase CLI에 전달되므로 대상 지정에 쓰지 않습니다. 실행 중 앱을 재사용하려면 그 앱도 fixture 설정으로 시작했는지 확인합니다. 원본 응답에는 JSON 끝 공백·줄바꿈 뒤 NUL 패딩이 올 수 있어 합성 응답도 이를 재현하며 다른 문자가 붙은 응답은 거부합니다. 수동 실제 학교 확인은 공개 조회와 demo 앱 연결까지 수행하고 정규화한 반·교시 결과만 남기며 운영 DB 쓰기로 대체하지 않습니다.

### 대시보드 성능 측정

[성능 검사](../tests/dashboard-performance.spec.ts)는 `demo-cs-class`·로컬 Auth/Firestore를 확인한 뒤 합성 학생·교사로 측정합니다. 교사는 담당 11개 반과 선택 반의 학생 30명, 학생은 열린 수업 3개를 사용합니다. 이전 테스트의 작품을 보존한 뒤 측정 조건을 초기화하고 종료 시 복원합니다. 첫 관찰과 연속 새로고침 5회를 구분하며 응답 본문 대신 결과의 SHA-256·시간·크기·요청 수만 보고서에 저장합니다.

위 Windows 검사 터미널 준비와 빌드 후 실행합니다. 기존 3000번 서버·에뮬레이터는 종료한 상태여야 합니다.

```powershell
$env:CI = "1"
$env:CS_PERF_LABEL = "before-or-after"
npx.cmd firebase emulators:exec --only auth,firestore --project demo-cs-class "playwright test tests/dashboard-performance.spec.ts"
```

보고서는 `test-results/`의 해당 검사 폴더에 `performance.json`으로 생성됩니다. 다음 실행에서 덮어쓰므로 비교할 파일은 Git 제외 `scratch/`에 먼저 복사합니다. 동일 PC·빌드 모드·fixture로 중앙값과 최댓값을 비교하고 첫 관찰은 별도 기록합니다. 화면 준비 시간은 Playwright 탐색부터 네 API 응답 완료와 스켈레톤 소멸 확인까지이며 브라우저 조작 비용도 포함합니다.

[공개 홈 측정 스크립트](../scripts/measure-public-home.mjs)는 별도의 비로그인 브라우저에서 운영 홈 첫 관찰과 연속 접속 5회를 확인합니다. 저장된 로그인·HAR·쿠키·헤더·응답 본문·캡처를 수집하지 않습니다. 기록 경로의 부모 폴더는 미리 준비합니다.

```powershell
node scripts/measure-public-home.mjs https://cs-class-donghyunt.vercel.app scratch/public-home-performance.json
```

운영 로그인 수치는 선생님이 직접 로그인한 Chrome의 F12 → Network → Fetch/XHR에서 새로고침 뒤 `session`·`teacher`·`todos`·`schedule`의 Time·Size만 확인합니다. 상세 요청·헤더·응답·HAR는 공유하지 않습니다. 운영과 로컬의 감소율을 계산하거나 첫 관찰을 서버 콜드 스타트로 단정하지 않습니다. 실제 관찰 결과와 후속 병목은 [HANDOFF](HANDOFF.md#교실-입장대시보드-조회-성능)에 남깁니다.

## EntryJS 실습

`programming-13`의 실습과 호환용 `entry-bot-lab` 엔진은 실제 `@entrylabs/entry` **4.0.23** 작업실을 사용합니다. 로컬 프로그래밍 실습은 [게스트 시드](#로컬-게스트-입장)를 준비한 뒤 열린 수업에서 시작하거나 교사 수업 관리에서 이번 수업으로 지정합니다. `entry-bot-lab`은 신규 공개·목록 노출 없이 전용 합성 반 설정과 직접 URL/API로 호환 검사를 유지합니다. 강사·학생 비밀번호는 위 로컬 테스트 설정을 따릅니다.

- `npm ci`의 `postinstall`과 `npm run dev`·`npm run build`의 준비 단계가 [자산 목록](../scripts/entryjs-assets.json)의 버전·SHA-512로 브라우저 파일을 준비합니다. npm 레지스트리·공식 Entry CDN·고정한 공식 예제 커밋을 사용하며 브라우저는 `/entryjs/vendor/`의 로컬 파일을 읽습니다. 첫 설치에는 인터넷과 `tar`가 필요합니다(Windows 기본 tar 또는 해당 OS의 tar). 자산·다운로드 캐시는 Git 제외 `public/entryjs/vendor/`·`scratch/entryjs/`에 생성됩니다. 필요하면 `npm run prepare:entryjs`로 다시 준비합니다. 무결성이 다른 파일은 빌드에 사용하지 않습니다.
- [작업실 HTML](../public/entryjs/workspace.html)·[브리지](../public/entryjs/workspace.js)는 `allow-scripts`만 허용한 iframe에서 실행합니다. Next.js 앱의 React 19와 EntryJS 보조 UI의 React 18을 분리합니다. iframe의 설정 저장소는 메모리이며 부모 화면의 쿠키·DOM·저장소에 접근할 수 없습니다. 공개 자산에만 CORS와 OPTIONS를 허용하고 수업 API의 인증·권한·Origin 검사는 유지합니다.
- Entry4.0.23의 일부 캔버스 조작 그림은 CORS 설정 없이 `new Image()`로 읽습니다. 브리지는 `Entry.init` 전에 해당 iframe의 이미지 생성에 `crossOrigin="anonymous"`를 지정하고 네이티브 이미지·prototype을 유지합니다. 기존 `/entryjs/*` CORS 헤더와 함께 EaselJS의 픽셀 기반 클릭 판정을 허용합니다. 질문 체크가 무반응이고 픽셀 읽기 보안 오류가 반복되면 요청의 CORS 설정을 확인하며, iframe에 `allow-same-origin`을 추가하거나 오류를 숨기지 않습니다. [프로그래밍 검사](../tests/programming-classroom.spec.ts)의 `entry-answer:`는 실제 캔버스 입력칸·체크 클릭, 한글·합성 IME Enter 보호, 자동 저장 대기·정지 뒤 재실행을 확인합니다. 숨은 입력창의 `fill`만으로 체크 버튼을 검증하지 않습니다.
- 질문칸의 `show()`는 자체적으로 초점을 줍니다. 브리지에서 같은 프레임에 `focus()`를 다시 호출하면 Entry4.0.23의 예약된 커서 타이머가 중복으로 남을 수 있으므로 재호출하지 않습니다. `Entry.init` 전 `CanvasInput.render`에 숨김 검사를 적용하여 종료 후 keyup·커서 callback이 입력칸을 다시 그리지 않도록 합니다. vendor 원문은 수정하지 않습니다. `entry-flicker:` 검사는 실제 응답 완료·수동 정지 뒤 두 커서 주기 동안 숨은 입력칸의 무대 재그리기 횟수를 확인합니다. DOM의 숨김 값이나 한 장의 캡처만으로 깜빡임 해소를 판정하지 않으며, 이 검사로 라이브러리의 모든 타이머 누수가 없다고 단정하지 않습니다.
- `Entry.loadProject()`는 이미지를 읽는 동안에도 동기 반환합니다. 브리지는 고정 무대 객체의 실제 이미지 `decode()`와 bounds를 확인한 뒤 `loaded`를 보내 실행·검증을 허용합니다. 준비 중에는 공용 `#workspace`를 `inert`로 두어 공개 체험의 내부 실행·편집도 막고, 잠금 메시지가 와도 준비 상태를 유지합니다. 준비 전 run 이벤트도 중지합니다. 실패는 기존 오류/다시 불러오기 경로로 처리하고 저장된 작품을 유지합니다. `entry-assets:`는 이미지 응답 보류 중 실행 비활성, 준비 후 실제 응답, 이미지 실패 때 작품 보존·재시도를 확인하며 [이름 체험 검사](../tests/name-entry-pilot.spec.ts)에도 내부 작업실 준비 경계를 포함합니다. DOM 생성이나 프로젝트 객체 반환만으로 무대 준비를 판정하지 않습니다.
- 학생 화면은 [EntryPracticeWorkspace](../src/components/student/entry-practice-workspace.tsx), 작품 읽기는 [entry-project.ts](../src/lib/classroom/entry-project.ts), 서버 조건 판정은 [solutions.ts](../src/lib/server/solutions.ts)에서 관리합니다. 네이티브 JSON-string 스크립트와 이전 미리보기 작품을 읽습니다. 시작·이동·시간 동안 말하기 블록과 상수 입력만 허용하고 고정한 엔트리봇·무대로 불러옵니다. 최대 50개 블록·직렬화된 작품 28KB, 이동 ±1000·말 80자·시간 0~10초를 지원합니다.
- 실행 결과는 중지 **전**에 수집합니다. EntryJS는 중지하면 오브젝트를 실행 전 상태로 되돌리고 `exportProject`도 실행을 중지하므로, 실행 중 자동 저장은 정지 상태의 작품에 현재 코드만 반영합니다. 15초가 지나면 실행을 멈춥니다. 이 과제의 서버 채점은 지원 블록의 연결 구조·상수 값을 검사하며 서버에서 EntryJS를 실행하지 않습니다. 다른 과제의 반복·입력·충돌·난수 검사는 별도 설계합니다.
- 네이티브 입력의 붙여넣기·IME는 `input`을 `keyup` 처리로 연결합니다. 단계 이동·화면 이동·검증·제출 전에는 편집기의 현재 작품을 읽고 저장하며 실패하면 이동을 멈춥니다. 드래그 중 임시 블록은 저장하지 않습니다. 작품을 불러올 때 작업실 `dReDraw`와 팔레트 `reDraw`의 예약을 순서대로 `flush()`한 뒤 편집을 허용합니다. 늦은 초기 갱신이 입력창을 닫지 않도록 하며, 자동 저장 이후 초점과 연속 입력도 검사합니다. EntryJS 팔레트 좌표 갱신에는 지연이 있으므로 UI 검사는 블록 모델의 좌표 준비 후 시작합니다.
- [EntryJS 브라우저 검사](../tests/entryjs-ui.spec.ts)는 실제 드래그·숫자 입력·실행·무대 복원·저장·검증·제출·재접속, 저장/파일 로딩 실패 복구, 좁은 창·Esc·키보드 가로 이동을 확인합니다. 라이브러리 번들과 공개된 라이선스·NOTICE·COPYING·패키지 메타데이터는 자산 준비 시 함께 보존합니다.
- `Classroom`은 사용자·수업 화면의 단계·넓게 보기·실습 집중 선택을 `LessonWorkspace`와 `LessonShell`에 전달합니다. 폭과 집중은 독립이며 같은 화면의 단계 왕복에 유지하고 새로고침/다른 수업에서는 기본 상태입니다. 집중은 프로그래밍·Entry·세 복습의 실습에서만 적용합니다. `PracticeGuidance`는 같은 children을 접어 편집기/iframe을 재생성하지 않으며 단계 바꾸기·실행·검증/제출·저장 오류·도움은 유지합니다. CSS로 배치만 바꾸며 iframe key/src와 작품을 유지합니다. 작업실 가까운 저장 표시는 기존 `useWork`를 사용하고 실제 제출·현재 작품의 검증과 구분합니다.
- 공개 이름 체험([NamePractice](../src/components/prototype/programming/name-practice.tsx)·[name-entry.ts](../src/lib/classroom/name-entry.ts))은 `/entryjs/workspace.html?exercise=name`을 사용합니다. 질문 → 대답 → 실제 말하기의 입력을 확인하며, 질문 필드의 한국어 IME와 조합 중 Enter를 처리합니다. 실행 이벤트 안의 전체 export는 엔진을 멈추므로 그 순간에는 코드만 복사합니다. 단계·미션·홈 이동 전에는 활성 입력을 확정하고 작품을 내보냅니다. 대상 검사는 `tests/name-entry-pilot.spec.ts`입니다.

## 프로그래밍 수업 프로토타입

`npm run dev:emulator` 뒤 [공개 체험](http://localhost:3000/prototype/programming)을 엽니다. 일반 개발은 `CI`를 설정하지 않고 실행합니다. 빌드 확인용으로 `$env:CI='1'`을 설정한 터미널에서는 `next start`가 실행되므로 소스 수정 반영을 확인하려면 다시 빌드하거나 일반 개발 모드로 시작합니다. 원본 PPT 없이도 소스로 체험을 재현할 수 있으며 차시 내용·PPT와의 차이는 [수업 자료 요약](reference/programming-13.md)에 있습니다.

### 코드 위치와 역할

| 파일 | 담당 |
| --- | --- |
| [page.tsx](../src/app/prototype/programming/page.tsx) | 공개 URL의 페이지·메타데이터 |
| [programming.tsx](../src/components/prototype/programming/programming.tsx) | 단계/학생·교사 시점·초안 복원/보관·이동 보호·Effect 초점·초기화 |
| [programming-concept.tsx](../src/components/student/programming-concept.tsx) | 조작형 개념 4개와 개념 확인 |
| [quiz.tsx](../src/components/prototype/programming/quiz.tsx) | 한 문항씩 풀이·회차 채점·오답 재도전 |
| [practice.tsx](../src/components/prototype/programming/practice.tsx) | 미니 블록 팔레트·조립·입력·실행 타이머·무대·조건 확인·완료·발견 기록 |
| [name-practice.tsx](../src/components/prototype/programming/name-practice.tsx)·[name-entry.ts](../src/lib/classroom/name-entry.ts) | 이름 미션의 실제 편집기·작품 읽기·실행 근거·조건 확인 |
| [support.tsx](../src/components/prototype/programming/support.tsx) | 도움 요청의 고정 문맥·교사 답변·학생 해결 표시 |
| [programming.module.css](../src/components/prototype/programming/programming.module.css) | 기능에 인접한 데스크톱/좁은 화면·상태·초점 스타일 |
| [programming-data.ts](../src/lib/classroom/programming-data.ts) | 운영·체험 공통 개념/퀴즈 데이터 |
| [programming.ts](../src/lib/prototype/programming.ts) | 체험 미션·타입·초기값·복원 검사·순수 `runProgram/checkMission` |
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

## 운영 프로그래밍 수업

`/classroom/programming-13`은 기존 계정·반별 수업 열기·서버 저장·교사 조회를 사용합니다. 공개 체험과 다른 계정 학습 기록입니다. [제품 기준](PRD.md#프로그래밍-13차시--실제-수업-구성)을 먼저 확인합니다.

- 수업은 `src/lib/classroom/programming-lesson.ts`, 미션·고정 자산·초안 파서·제한된 서버 검증기는 `programming-entry.ts`입니다. 허용 블록만 정규화하며 임의 JavaScript를 실행하지 않습니다. 최대 16줄·160블록·표현식 깊이 8, 작품별 UTF-8 32KiB·전체 초안 120KB를 제한합니다. API의 큰 본문 허용은 이 수업의 저장 요청에만 적용합니다.
- `src/components/student/programming-lesson.tsx`는 기존 개념 실험, 한 문제씩 퀴즈, 미션 이동을 구성합니다. `use-work.ts`의 직렬 저장과 이동 전 native 입력 확정을 사용합니다. 방향키 작품 복사는 처음 선택할 때만 수행합니다. 미션별 검증·제출은 `Work.missions`, 편집은 `draft.programming.projects`에 저장합니다.
- 공통 개념 UI는 `src/components/student/programming-concept.tsx`·인접 CSS, 문항 데이터는 `src/lib/classroom/programming-data.ts`, 이름 작품 처리는 `src/lib/classroom/name-entry.ts`에 둡니다. 운영 코드는 체험의 전체 상태나 초기값을 가져오지 않습니다. 체험의 탭 저장·복원은 기존 `lib/prototype/programming.ts`가 소유합니다.
- `public/entryjs/workspace.js`의 `exercise=programming&mission=...`는 목표별 팔레트와 고정 A/B 변수를 사용합니다. 질문·말하기는 실제 엔진 이벤트로 확인하며 방향키 미션은 실행을 유지해 키 이벤트를 받습니다. 실행 중 전체 export로 엔진을 멈추지 않는 기존 정책을 유지합니다.
- 이름 실행 확인은 `name-entry.ts`의 `checkNameMission(...).validNames`를 공유해 현재 작품에서 질문·대답·말하기를 끝낸 서로 다른 입력만 최대2개 셉니다. 실제 작품 변경·실행 ID·중지 여부를 확인하며 같은 이름 반복은 늘리지 않습니다. UI는0/2→1/2→2/2와 부족한 조건을 표시하고 재접속 후 작품/완료와 일시적인 실행 근거를 구분합니다. Entry 결과는 현재 X·Y이며 누적 이동 거리로 바꾸지 않습니다.
- 대상 검사는 `tests/programming-classroom.spec.ts`·`tests/programming-learning.spec.ts`입니다. 실제 Entry 팔레트 조립·질문·변수 계산·네 방향키·중지와 무대 복원·저장 실패·미완성 복원·독립 제출·27명 병렬 API 흐름과 개념·퀴즈 오답 재도전·교사 제출 화면을 포함합니다. 화면 아래 iframe은 Chromium이 그리기를 미룰 수 있으므로 작업실로 스크롤한 뒤 팔레트 좌표 준비를 확인합니다. 브라우저와 API가 같은 작품을 수정하는 검사에서는 화면 이동으로 자동 저장을 마친 뒤 새 버전을 조회합니다. 최종 통합은 아래 전체 검증을 따릅니다.

### 공통 수업 편집기와 집중 모드

[lesson-workspace.tsx](../src/components/student/lesson-workspace.tsx)의 StudentWorkEditor만 학생 `useWork`를 소유하고, [lesson-editor.tsx](../src/components/student/lesson-editor.tsx)는 `WorkController`·`LessonMode`·현재 작품과 화면 props를 받아 실제 표시/조작을 구성합니다. [read-editor-draft.ts](../src/components/student/read-editor-draft.ts)가 기존 Entry 입력 확정을 재사용하며 [work-controller.ts](../src/components/student/work-controller.ts)는 저장 훅의 타입 경계입니다.

일반 개념/퀴즈는 [LessonConceptPanel](../src/components/student/lesson-concept-panel.tsx)·[LessonQuizPanel](../src/components/student/lesson-quiz-panel.tsx)에 기존 JSX를 모았습니다. 선택 위치·체험 초기화 상태·행동/복구·저장/충돌·초점 요청은 LessonEditor에 남기고 표시 계산만 퀴즈 패널에 둡니다. 공통 답안/힌트는 개념 패널의 named export를 재사용합니다. DOM ID/key/disabled·기존 CSS와 학생/preview 컨트롤러의 소유권을 유지합니다.

집중 모드의 핵심 계약은 같은 iframe·편집기·입력·실행/AI 대기·저장 실패의 보존과 단계 왕복 시 선택 유지입니다. `tests/practice-focus.spec.ts` 및 기존 `lesson-shell.spec.ts`·`ui-workspace-refinement.spec.ts`·`review-practice-ui.spec.ts`·`sandwich-conversation.spec.ts`·`review-abstraction.spec.ts`·`review-flowchart.spec.ts`로 폭/집중 독립·Escape/초점·미완성 입력·실패·미션/단계·창 크기를 함께 검사합니다. 단순 JSX 이동을 그대로 복제한 별도 검사는 만들지 않고 실제 학생/preview 소비자의 회귀를 확인합니다.

## 실학생 명부 준비와 반별 발급

운영 적용은 실제 명부·학년도·Firebase 대상·복구 범위를 확인한 뒤 승인된 범위에서만 수행합니다. 아래 명령의 `--apply`는 학생 계정 또는 비공개 파일을 실제로 변경합니다. 첫 확인에는 `validate`와 기본 계획만 사용합니다. 모든 입력·전달·백업 파일은 Git 제외 `private/`에 두고 폴더의 Windows 접근 권한을 선생님만 볼 수 있도록 설정합니다. Git 제외는 파일 접근 보호를 대신하지 않습니다.

기존 Excel은 2학년의 `1반`~`11반` 시트, 첫 행의 `번호`·`학번`을 읽습니다. 학생별 번호는 1~27, 학번은 학년1자리+반2자리+번호2자리입니다. 이름·기존 공통 비밀번호 열은 복사하지 않습니다. 원본은 읽기만 하고 새 CSV는 기존 파일을 덮어쓰지 않습니다. 변환기는 Windows PowerShell 5의 한국어 해석을 위해 UTF-8 BOM으로 저장합니다.

명부가 없으면 같은 두 열을 가진 11개 시트로 작성합니다. 이번 PC의 빈 양식은 Git 제외 `outputs/classroom-readiness/학생명부_작성양식.xlsx`이며 실제 번호를 입력하면 학번을 자동 계산합니다. 없는 학생의 번호는 비워 두고, 작성한 파일은 Excel에서 계산·저장하여 `private/`에 별도로 보관합니다. 시트 이름과 첫 행의 두 제목을 유지하며 모든 반의 실제 자료가 준비된 뒤 변환합니다. 양식 산출물은 저장소 복제에 포함되지 않습니다.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/roster-from-xlsx.ps1 -Source '<실제 명부의 절대 경로>' -Output private/student-roster.csv
node scripts/student-roster.mjs --csv private/student-roster.csv --year 2026 --mode validate
# 실제 프로젝트 연결을 불러오지만 기본 동작은 읽기 전용 계획입니다.
node --env-file=.env.local scripts/student-roster.mjs --csv private/student-roster.csv --year 2026
```

전체 명부·기존 Account/Auth·반 기록·이메일 충돌을 사전 확인하고, 다른 명부나 학년도의 동일 학번은 거절합니다. 운영 대상은 `cs-class-f74c4`, 합성 검사는 demo 프로젝트·Auth9099/Firestore8080만 허용하며 혼합 설정·Vercel 실행을 거절합니다. 운영 전 현재 자료의 백업과 계정 충돌 처리를 별도로 검토합니다.

```powershell
# 승인 후 사전 등록: 최초 입장용 비밀번호를 아직 발급하지 않습니다.
node --env-file=.env.local scripts/student-roster.mjs --csv private/student-roster.csv --year 2026 --mode register --apply --confirm-project cs-class-f74c4
# 1반 수업 직전: 개별 임시값은 발급 후 30분 만료합니다.
node --env-file=.env.local scripts/student-roster.mjs --csv private/student-roster.csv --year 2026 --mode issue --class 2-1 --output private/class-1-new.ndjson --apply --confirm-project cs-class-f74c4
```

발급 파일의 `pending` 행에는 해당 학생의 임시값이 있습니다. 같은 학번의 `issued` 확인 행이 있는 것만 그 학생에게 개별 전달합니다. 공용 화면에 전체 파일을 띄우지 않으며 로그에는 비밀번호·학번 목록을 출력하지 않습니다. 이미 개인 비밀번호를 정한 학생은 일괄 재발급에서 거절하고 기존 교사 초기화 화면을 사용합니다. 11개 반을 일주일 전에 한꺼번에 발급하면 실제 수업 전에 만료되므로 등록과 발급을 분리합니다.

등록 중단은 Account를 비활성·잠금으로 보존합니다. 같은 명부·학년도·발급 도구 표시가 일치하는 중단만 `register`에 `--resume`를 더해 재개합니다. 기존 다른 계정은 채택하지 않습니다. 발급 중단은 완료된 학생과 실패 학생을 비공개 파일에서 확인하고, 남은 잠금은 [계정 변경 복구](FIREBASE_SETUP.md#계정-변경-장애-복구)를 사용합니다. 계정·작품을 삭제하고 다시 등록하는 방식으로 복구하지 않습니다.

등록된 명부의 수업 기록 백업은 `--mode backup --output private/learning-new.json --apply --confirm-project cs-class-f74c4`로 만듭니다. 반 설정·선택 학생의 비밀 없는 계정 정보·`csWork`를 포함하며 Auth 자격 증명·세션·임시값·일정/할 일은 제외합니다. 수업 편집을 멈춘 상태에서 캡처하고, 자동 복원·계정 이관·학년도 교체를 지원하는 전체 시스템 백업으로 해석하지 않습니다. 복원은 대상·기존 기록·복구 범위를 별도로 검토합니다. 검사 코드는 `tests/student-roster.spec.ts`이며 운영 자료를 사용하지 않습니다.

### 첫 실제 수업 확인 순서

1. 수업 전에 실제 학년도·명부·대상 반을 확인하고 위 변환·검증·계획을 먼저 실행합니다. 등록 적용과 기존 자료의 복구 범위를 확인한 뒤, 교사의 `수업 관리`에서 해당 반의 공개 수업·이번 수업을 확인합니다. 실제 수업 설정 변경은 확인한 대상과 승인 범위에 한정합니다.
2. 수업 직전에 해당 반의 임시값을 발급하고 완료된 발급만 학생별로 전달합니다. 학생은 최초 입장에서 본인 비밀번호를 설정하고, 배정된 반과 이번 수업 제목을 확인합니다. 만료·입장 실패는 교사가 해당 계정의 상태를 확인하며 공통 비밀번호로 우회하지 않습니다.
3. 학생 한 명의 학교 브라우저에서 개념·퀴즈·실습 진입과 실제 Entry 블록 입력·실행·중지를 확인합니다. 13차시는 기본 네 미션과 선택 도전을 구분하고, `저장 완료`·검증 통과·제출 완료를 각각 확인합니다. [수업 구성](PRD.md#프로그래밍-13차시--실제-수업-구성)과 완료 규칙을 바꾸지 않습니다.
4. 저장 실패 때 입력이 남는지, 재시도 뒤 같은 작업을 이어가는지 확인합니다. 학교망·실제 OS 입력기·로그아웃 후 재접속은 로컬 에뮬레이터 성공과 별도로 기록합니다. 확인할 때 학생 비밀번호·작품 원문을 공개 화면이나 로그에 남기지 않습니다.
5. 수업 종료 전 교사의 `학생 현황·계정`에서 해당 반의 진행과 제출을 확인합니다. 제출 학생 수와 작품 수를 구분하고, 학생은 저장 완료를 확인한 뒤 종료합니다. 다음 수업의 이어하기와 실제 사용 중 발견한 문제를 [HANDOFF](HANDOFF.md#현재-작업-상태)에 범위·환경과 함께 남깁니다.

## 알고리즘 복습 수업

제품 정책은 [PRD](PRD.md#알고리즘-선택-복습--2026-10-05-확정), 원본 이식·AI 품질 근거는 [참고 자료](reference/algorithm-review-integration.md), 현재 공개 상태는 [HANDOFF](HANDOFF.md)를 따릅니다. 세 복습은 이미 11반에 공개했으며 아래 공개 명령은 후속 변경·복구의 절차입니다. 문서 재개만으로 운영 계획을 다시 적용하지 않습니다.

- `src/lib/classroom/review/`에 원본 기준 순수 샌드위치/순서도 실행·검사·미션·추상화 데이터를 둡니다. React 화면은 `src/components/student/review/`에 모으고 기존 단일 저장 writer·revision·메모리 복구를 사용합니다. 학습 내용의 스냅샷과 화면 위치·탭을 구분합니다. 작품 수정 시 이전 제출본과 고정 교사 요청본은 유지합니다.
- 추상화는 저장된 `tutorialDone`으로 최초 맛보기 완료를 확인하고 기존 단계·초안·제출을 유지합니다. AI 요청 단계와 최신 초안을 고정해 늦은 응답이 다른 단계나 학생 입력을 덮지 않게 합니다. 3단계 후보는 처음 모두 핵심에 두고 선택한 항목만 버리며, 첫 계획 초안은 기존 작성 내용이 없을 때만 채택합니다. 대화 읽던 위치는 단계별 ref로 보관하고 DOM 갱신 뒤 Effect에서 복원합니다. 전송은 Enter, 줄바꿈은 Shift+Enter이며 조합 중 Enter를 전송하지 않습니다. `review-abstraction-v1-ux.spec.ts`에서 기존 기록·실패·재접속·클립보드·단계 왕복을 확인합니다.
- 순서도 연결 의미와 경로 검사는 기존 `FlowchartProject`·Map/Set·순수 실행기를 재사용합니다. 별도 그래프 라이브러리나 저장 스키마를 추가하지 않습니다. 다섯 실습의 작업실 높이는 공통 부모가 현재 캔버스 위치와 창 높이에서 계산하며, SVG 자체의 키보드 편집·포트 연결과 실행바는 검사합니다. `review-flowchart-v1-ui.spec.ts`는 V1 배치·다섯 단계 낮은 창·실제 계산/분기·긴 변수표/콘솔을 확인합니다.
- 실습 표현은 원작 SVG·색상·배치를 재사용합니다. `sandwich-stage.tsx`는 실행 상태만 받아 그림을 표시하고 `studio.module.css`는 복습 작업실의 공통 표현만 맡습니다. 추상화·샌드위치·순서도의 화면별 CSS는 담당 컴포넌트 옆에 둡니다. 원본의 전역 DOM 조작·인증·외부 호출은 옮기지 않습니다. `tests/review-practice-ui.spec.ts`에서 실제 기호 놓기·실행 강조·넓게 보기·320/390/820/821px·줄인 모션을 확인하고, 저장·AI·교사 경계는 기존 세 복습 검사와 함께 실행합니다. Chromium의 HTML 끌어놓기 검사는 목표 위에서 두 번 움직여 `dragover`와 실제 `drop`을 발생시킵니다.
- 순서도는 `flowchart.tsx`가 퍼즐·예시·자유 공방을, `flowchart-studio.tsx`가 기획서·처방전/리뷰/이미지 모달을 구성합니다. `flow-diagram.tsx`는 기호 편집·포트 연결·캔버스 이동·기호 옆 실행 조작, `flow-execution.tsx`는 실행 도구·모니터, `flowchart-export.ts`는 전체 문구·기획서·점검 상태의 PNG를 담당합니다. 순수 실행은 `flow-runner.mjs`·`flow-expressions.mjs`이며 문자열도 허용하지만 임의 JavaScript는 실행하지 않습니다. 기존 text/yes/no·연결·좌표는 호환 조회하고 배치 변경과 논리 변경을 구분합니다. 세부 회귀는 `review-flowchart-*.spec.ts`와 `review-flow-runner.test.mjs`에서 확인합니다.
- `POST /api/classroom/ai`는 `lessonId,task,requestId(UUID),revision,input,missionId?,planning?`를 받고 서버가 현재 작품·열린 수업·학생 권한을 재확인합니다. `planning`은 자유 순서도의 `flow-plan` 후보에만 사용하며 저장된 작품을 채택 전에 바꾸지 않습니다. 샌드위치 해석의 HMAC은 사용자·실행회차·명령 ID·원문·동작·제공자에 연결됩니다. 저장과 제출은 서명과 원본 실행 규칙을 다시 검사합니다.
- Solar 출력 스키마는 역할마다 후보·명령·기획 카드의 허용 범위를 제한합니다. 모호한 판정과 실행 명령이 함께 오면 실행하지 않고 입력을 보존합니다. 형식 오류·잘린 응답도 제공자가 반환한 사용 토큰은 집계합니다.
- 자유 순서도 리뷰의 조건 근거는 원래 조건 인덱스와 실제 기호 원문으로 제한합니다. 빈 줄은 초안·스냅샷에 보존하며 검토에서만 제외합니다. 같은 조건을 여러 갈래의 다른 표현으로 수행하면 여러 기호를 근거로 허용합니다. 무조건 필요한 행동은 근거 기호들을 건너뛰고 종료하는 경로가 있는지도 서버가 확인합니다. 조건부 행동의 적용 범위·자연어 의미는 AI 판정이므로 형식·근거·경로가 불명확하면 선생님 확인을 허용하는 `uncertain`으로 안내합니다. 이 검사를 모든 자연어 알고리즘의 정확성 증명으로 표현하지 않습니다. 순서도 리뷰는 `temperature=0`·`reasoning_effort=minimal`, 나머지는 `temperature=0.4`·`none`입니다. `flow-plan`은 목표·조건·핵심 정의와 기획 후보를 함께 제안하므로 출력 한도1600토큰, 나머지는800토큰이며 시간 제한은 유지합니다. 브라우저의 기존 결과 계약은 선택적인 `definition`으로 호환하고 실제 제공자의 `flow-plan` 응답에는 정의를 요구합니다.
- 교사 목록은 `WorkSummary`(해결 수·편집/검증·제출/미션·요청 상태)만 반환합니다. `GET /api/classroom/students/:uid/work/:lessonId`에서 담당 반 작품을 상세 조회하고 `POST .../review/:lessonId`의 `requestId,decision(approve|changes),message`로 처리합니다. 승인한 요청 ID/스냅샷과 현재 수정본을 분리하며 이전 요청의 처리를 거부합니다.
- `csAiUsage/{uid}`는 최근60초·한국 날짜의 학생별 공통 제한과 호출/토큰/지연/실패 집계를 저장합니다. `csAiRequests`는 요청 해시·처리 상태, `csAiCache`는 해시로 주소를 정한 역할/입력/작품/프롬프트 버전별 구조화 결과를 보관합니다. 캐시 유효기간은24시간입니다. 자유 상담의 입력·답변 전문은 두 컬렉션에 보관하지 않습니다. 완료된 상담 요청 ID는 추가 호출 없이 완료 안내를 반환하며 이전 전문은 브라우저 화면에서만 확인합니다.
- `firestore.indexes.json`의 두 AI 컬렉션 `expiresAt` TTL 정책을 공개 전에 적용·확인합니다. 만료 캐시는 즉시 재사용하지 않으며 실제 TTL 삭제 완료 시간과 캐시 유효기간을 구분합니다. 학생 작품·제출·요청본에는 TTL을 적용하지 않습니다. 서버 키·제공자 설정은 [연결 안내](FIREBASE_SETUP.md#복습-ai-서버-설정)를 따릅니다.

엔진·프로토콜·반 변경 계획의 순수 검사는 `npm run test:review`, 브라우저·저장·권한·경합은 `tests/review-*.spec.ts`로 확인합니다. Playwright는 `.spec.ts`만 수집합니다. 로컬 테스트 서버의 `CS_AI_FIXTURE=1`은 `demo-cs-class`+에뮬레이터+비배포 조건에서만 합성 제공자를 사용합니다. 형식/시간/연결/JSON 오류와 느린 응답을 실제 Solar 품질 검사로 표현하지 않습니다. 작은 실제 Solar 합성 예제집 검사에는 테스트 DB 시드나 운영 학생 계정을 사용하지 않습니다.

실제 Solar 품질 검사는 로컬 비공개 설정의 `UPSTAGE_API_KEY`가 준비된 뒤 수행합니다. `scripts/dev-emulator.mjs`는 테스트 제공자를 강제하므로 그대로 사용해 실제 Solar 성공으로 판정하지 않습니다. 이전 합성 캐시를 가져오지 않는 새 Auth9099/Firestore8080과 demo 환경·로컬 시드를 준비하고 Next 서버를 직접 실행해 `CS_AI_FIXTURE=0`을 적용합니다. 시작 전에 `/api/auth/config`의 demo 프로젝트·에뮬레이터를 확인하고, 캐시 재사용 응답을 실제 제공자 호출로 세지 않습니다. 제공자 키는 Next 서버에서만 읽고 Firebase CLI 부모 환경에 전달하거나 로그에 출력하지 않습니다.

실제 Solar 품질 검사의 평가 역할(샌드위치 명령, 추상화 도움/계획/상담/리뷰, 순서도 퍼즐/기획/리뷰), 세부 검증 기준과 AI 오판 한계는 [참고 자료의 실행 장부](reference/algorithm-review-integration.md#실행-장부)를 확인합니다.

반 공개는 기본 읽기 전용 계획부터 실행합니다. Git 제외 출력은 11개 반의 수업 ID·이번 수업·revision만 담으며 학생 기록·인증값을 포함하지 않습니다.

```powershell
node scripts/review-rollout.mjs --mode plan --phase sandwich --output scratch/review-lessons/sandwich-plan.json
# 저장한 계획의 11개 before/after와 실제 프로젝트를 확인한 뒤 적용합니다.
node scripts/review-rollout.mjs --mode apply --plan scratch/review-lessons/sandwich-plan.json --confirm-project cs-class-f74c4
```

`--phase abstraction`은 샌드위치+추상화, `--phase flowchart`는 세 복습을 엽니다. 각 검증·리뷰 단계 뒤 새 계획을 만듭니다. 폐기 테스트 ID만 열린 목록에서 제거하고 다른 수업 설정은 유지하며 새 복습을 이번 수업으로 자동 지정하지 않습니다. 11개 설정이 계획 후 바뀌면 전체 쓰기를 거부합니다. 반복 적용은 동일 완료 상태이면 추가 revision 없이 완료 안내합니다.

문제 발생 시 `CS_AI_PAUSED=1`을 적용한 배포로 AI 진입을 멈추고 아래처럼 해당 단계의 반 설정을 복원합니다. 복원도 적용 후 예상 설정/revision을 검사하므로 이후 교사 변경이 있으면 덮어쓰지 않습니다. 새 작품과 기존 기록은 보존합니다. 단계별 계획을 역순으로 연속 복원하면 앞 복원에서 증가한 revision 때문에 다음 계획이 거부됩니다. 전체 공개 전 설정으로 돌아갈 때는 원본 백업은 수정하지 않고 현재 공개 설정을 예상값으로 삼는 전체 복구 계획을 사용합니다. 복구할 열린/현재 수업은 원본과 같고 revision은 현재값보다1 증가하며, 11반 전체를 한 트랜잭션으로 검사·복원합니다.

```powershell
node scripts/review-rollout.mjs --mode restore --plan scratch/review-lessons/sandwich-plan.json --confirm-project cs-class-f74c4
```

전체 복구 계획 파일을 `--plan`에 지정하면 공개 전의 11반 설정을 복원합니다. 생성 당시 예상 revision을 검사하며, 이후 설정 변경이 있으면 거부합니다. 다른 PC에서 파일이 없다는 이유로 현재 반 설정을 임의로 덮어쓰거나 원본 백업의 revision을 직접 수정하지 않습니다.

## 검증

저장소 루트에서 실행합니다. Java 21+와 최초 `npx playwright install chromium`이 필요합니다. 실제 Firebase에 연결한 3000번 서버는 종료한 뒤 실행합니다.

```powershell
npm run lint
npm run typecheck
npm run test:review
npm run build
npm run test:e2e
```

`test:e2e`는 Auth·Firestore 에뮬레이터를 시작하고 종료합니다. 이미 `dev:emulator`가 실행 중일 때만 `npm run test:e2e:running`을 사용합니다. 테스트는 로컬 `demo-cs-class`를 확인한 뒤 가상 계정을 준비하며 운영 데이터는 사용하지 않습니다.

에뮬레이터가 꺼져 있을 때 대상 파일만 새로 검사하려면 위 Java·캐시 준비 후 다음처럼 자식 명령에 파일을 넣습니다. `npm run test:e2e -- ...`의 추가 인자는 Firebase CLI로 전달되므로 Playwright 옵션을 그 뒤에 붙이지 않습니다.

```powershell
node node_modules/firebase-tools/lib/bin/firebase.js emulators:exec --only auth,firestore --project demo-cs-class "node node_modules/@playwright/test/cli.js test tests/auth-security.spec.ts tests/dashboard-performance.spec.ts"
```

GitHub Actions는 `main`·`codex/**` push와 PR에서 lint·typecheck·test:review·build·E2E를 실행하며 E2E는 빌드된 앱을 `next start`로 실행해 검사합니다. 로컬 E2E는 개발 서버를 사용합니다. UI 확인 기준은 [AGENTS](../AGENTS.md)를 따릅니다. 구체적인 연결·운영상 한계는 [Firebase 연결 안내](FIREBASE_SETUP.md)를 확인합니다.

Windows에서 검사 뒤 `next start` 종료가 멈추면 이번 실행의 PID와 명령을 확인해 해당 테스트 서버만 종료합니다. Playwright는 서버 종료 후 최종 결과를 출력하므로 E2E 요약과 종료 코드까지 확인합니다.

PowerShell의 `Stop-Process`가 객체 참조 오류로 종료하지 못하면 검증한 같은 PID에 `[System.Diagnostics.Process]::GetProcessById($pilotServerPid).Kill()`을 사용할 수 있습니다. `$pilotServerPid`에는 이번 검사에서 시작한 `next start --hostname localhost --port 3000`임을 부모 스크립트·명령줄로 대조한 PID만 넣습니다. 다른 앱 서버·Node 프로세스를 일괄 종료하지 않습니다.

앱 테스트 주소는 `http://localhost:3000`입니다. 운영 쿠키 보안을 낮추지 않습니다. 빌드 후 PowerShell에서 `$env:CI='1'`을 설정하고 E2E를 실행하면 CI와 같은 `next start` 검사가 됩니다. 실행 후에는 해당 터미널의 기존 CI 환경값으로 복원합니다. 날짜별 실행 결과와 미검증 항목은 [HANDOFF](HANDOFF.md)에 기록합니다.

## 검증 노하우 (기능별)

에이전트 작업 시 아래 각 기능 영역의 검증 및 회귀 방지 기준을 확인합니다.

### 테스트 환경과 데이터 보호

- 테스트는 `demo-cs-class`와 로컬 9099·8080만 사용합니다. 실제 서버가 3000에서 실행 중이면 종료한 뒤 E2E를 실행합니다. 운영 DB에 테스트 시드·합성 계정을 넣지 않습니다.
- 병렬 수동 검사는 계정(게스트 포함)과 결과 폴더를 나누고 최종 통합은 단일 실행으로 확인합니다.
- 사용자가 로컬 미리보기로 작성한 기록은 서버 교체 전에 Git 제외 demo export로 보존합니다. 복원 값의 해시는 문서 ID·객체 키를 재귀 정렬하고 배열 순서는 보존해 비교합니다. Firestore export/import의 객체 키 순서만 바뀐 경우를 기록 손실로 오인하지 않습니다.
- 게스트 로그인·로그아웃을 하는 검사는 사용 중인 게스트 접속을 교체하므로 확인 흐름을 분리하고 최종 게스트 입장을 복구합니다. 단일 세션 정책을 낮추지 않습니다.
- 동시 입장처럼 별도 합성 계정을 만드는 검사는 종료 시 Auth 계정·DB 문서·제한 장부를 정리하고 공유 반 설정을 복원합니다. 공통 제한 장부의 잠금 경합이 발생하면 로그·같은 조건의 27명 동시 입장과 제한 거부 뒤 정상 요청을 확인하며 요청 수·제한을 낮춰 통과시키지 않습니다. 대상 단독 성공 뒤에도 후속 검사에 빈 반·정렬 조건이 있으면 두 파일을 이어서 검증합니다.
- 에뮬레이터 포트 충돌은 설정을 바꾸기 전에 사용 중인 PID·명령과 앱 `/api/auth/config`의 demo 프로젝트·호스트를 확인합니다. 제한된 실행에서 포트 조회 결과가 없다는 이유로 서버가 없다고 단정하지 않습니다. 빌드 교체 뒤에는 확인한 앱 테스트 서버만 재시작하되 `emulators:exec`의 자식을 종료하면 에뮬레이터도 함께 끝날 수 있어 포트를 다시 확인합니다. 로컬 에뮬레이터가 계속 실행 중일 때만 `test:e2e:running`을 사용하고 모두 종료됐으면 `test:e2e`로 새로 시작합니다.

### 학교 시간표 연동 검증

- 학교 시간표 검사는 [합성 서버 안내](#학교-시간표-연동)를 따릅니다. 기존 서버 재사용 전 fixture 설정도 확인하고 학교 공통 캐시·담당 반 제한을 검사 뒤 복원합니다.
- 실제 공개 응답의 끝 공백·줄바꿈·NUL도 재현하며 합성 검사와 실제 공개 API 연결을 구분합니다.
- 대상 지정 인자를 Firebase CLI에 넘기지 말고 `emulators:exec` 안의 Playwright 명령에 넣습니다. 예약 실행의 로컬 API 성공과 운영 Cron 실제 실행을 구분합니다.

### 제한된 Windows 환경 검사

- 제한된 Windows 환경에서 사용자 캐시 접근이 실패하면 이미 준비한 Git 제외 캐시를 `FIREBASE_EMULATORS_PATH`·`PLAYWRIGHT_BROWSERS_PATH`로 지정하고 Java 21+의 PATH를 확인합니다.
- `$env:` 설정은 터미널별이므로 새 PowerShell에서도 실행 전 준비합니다.
- Java·`tar`·Playwright의 자식 프로세스 `EPERM`과 Next 네이티브 컴파일러의 경로 확인 접근 거부는 설치·설정 오류와 구분하고 허용된 검사 실행에서 재확인합니다. 실제 경로·복사 가능한 준비 명령·최초 설치는 [다른 PC에서 시작](#다른-pc에서-시작)을 따릅니다. 기존 캐시를 확인하기 전에 같은 다운로드·설치를 반복하지 않습니다.

### Playwright 공통 환경

- CI의 E2E는 먼저 만든 빌드를 `next start`로 실행하고, 로컬은 개발 서버를 사용합니다. 두 경우 모두 에뮬레이터 환경변수를 명시하고 로컬 시드를 준비합니다.
- 홈 조작 검사는 데스크톱 고정 배치(`data-pinned=true`)가 준비된 뒤 시작해 초기화 도중의 클릭·앵커 이동과 혼동하지 않습니다.
- 같은 Playwright 페이지에서 계정·학습 시드를 교체할 때는 먼저 `about:blank`로 이동해 이전 편집기를 분리한 뒤 인증/시드를 준비합니다. 이전 Entry 자동 저장이 새 시드의 revision·미션을 덮는 경합을 제품의 복원 실패로 오인하지 않으며, 새 작업실의 실제 iframe 미션도 확인합니다.
- 비밀번호 변경 화면도 이미 `/student` 주소를 사용하므로 URL만으로 갱신 완료를 판정하지 않습니다. 변경·재로그인 뒤 직접 수업으로 이동하는 검사는 실제 대시보드 표시와 세션 준비를 기다립니다.
- E2E 앱 주소는 `http://localhost:3000`으로 통일합니다. Playwright API 쿠키 저장소는 HTTP의 `127.0.0.1`에서 운영 빌드의 Secure 쿠키를 보내지 않습니다. 테스트를 위해 운영 쿠키 보안을 낮추지 않습니다.

### UI 및 상호작용 공통

- UI 변경은 실제 화면·주요 조작·좁은 창·키보드 초점·콘솔을 확인합니다. 인증·저장 구현은 실패·권한 경계도 검증합니다.
- 홈 모션은 기본으로 켜집니다. `no-preference`·`reduce` 모두에서 기본 켜짐과 상단 줄이기/켜기를 확인합니다. 스크롤 전환뿐 아니라 단계 선택 후 빠른 방향키·Tab 이동, 첫·마지막 구간의 낮은 창·모바일 배치를 검증합니다.
- 포털 선택 메뉴의 Escape 검사는 실제 option이 표시된 뒤 실행하고, 부모 대화상자의 열림 상태와 메뉴로의 초점 복귀를 함께 확인합니다. 대화상자 단축키는 자동 초기 초점의 진입을 확인한 뒤 검사하며, 표시만으로 키보드 준비가 끝났다고 판단하지 않습니다.
- 기본 방향키 스크롤의 읽기 위치는 실제 `scrollend` 후 저장하고, 초점 이동 뒤 버튼 위치는 동일 좌표 조건의 재시도로 전체 표시를 확인합니다. 스크롤 중 여러 요소의 배치 관계는 한 evaluate에서 함께 측정해 시점이 다른 화면 좌표를 섞지 않습니다. 부드러운 스크롤의 중간값을 기준으로 삼지 않으며 허용오차·시간 제한을 늘려 통과시키지 않습니다.
- 학생 검색 URL은 빈 값·중복 키·기존 학생 바로가기와 조건 초기화 후 재접속을 함께 확인합니다. 공개 목록 변경으로 선택 메뉴의 항목이 사라질 때 이번 수업의 미지정 초안이 이전 선택으로 돌아오지 않는지 검사하고 체크박스 초점을 유지합니다.
- 목록의 첫 조회 대기·조회 실패만으로 미편집 화면의 메뉴·홈·로그아웃을 막지 않습니다. 실제 미전송 입력·저장 실패는 보존하고 이동 전에 저장을 확인하며 두 상태를 구분해 검사합니다.

### 순서도 실습 검증

- 순서도 캔버스 이동은 넓게 보기의 SVG 바깥 빈 영역에서도 검사합니다.
- 첫 포트 드래그 중 안내가 나타나도 캔버스와 대상 포트의 위치·크기가 바뀌지 않는지 확인하고, 입력 영역 누락을 검사 좌표 축소로 숨기지 않습니다.

### 샌드위치 실습 검증

- 샌드위치는 SVG 컨테이너의 폭뿐 아니라 실제 조리대 도형의 크기를 확인합니다. 낮은 창에서는 준비 안내 전체·입력·주 실행 버튼·조리대 안내의 위치를 함께 검사합니다.
- 긴 대화가 전체 패널을 늘리지 않는지, 실제 Home/End·읽던 위치·다음 요청 뒤 실패/확인 질문 보존을 확인합니다. 캡처는 입력 초안의 서버 저장과 버튼 활성화를 기다린 뒤 남깁니다.
- 샌드위치 명령은 Enter 전송·Shift+Enter 줄바꿈을 사용하며 한글 조합 확인 Enter(`isComposing`·229)를 전송하지 않습니다. 대기 중 중복 전송·다음 입력 보존을 검사하고, 대체 실행·마지막 명령 삭제·체험 중지/최종 단계로 보조 조작이 사라져도 Effect에서 관련 입력/시작 버튼으로 초점을 복구합니다. 자동 종료 때는 체험 밖의 초점을 빼앗지 않습니다.

### EntryJS 실습 검증

- EntryJS는 실제 팔레트 조립·입력·실행·중지 후 무대 복원·재접속을 검사합니다. 질문 응답은 실제 캔버스 입력칸·체크 클릭과 Enter를 함께 확인하며 숨은 입력창의 `fill`만으로 클릭 판정을 검증하지 않습니다.
- 정지 후 질문칸의 깜빡임은 숨김 값뿐 아니라 실제 무대 재그리기를 검사합니다. 질문 응답 대기와 엔진 실행 제한을 구분하고 실행 이벤트 안에서 전체 `exportProject`로 엔진을 멈추지 않도록 합니다.
- 단계/화면 이동 전 입력 확정, 실행 중 초안 보존, 이미지 CORS·질문칸 초점·팔레트 좌표 준비와 자산 설치는 [EntryJS 실습](#entryjs-실습)을 따릅니다.
- 화면 아래 Entry iframe은 Chromium이 프레임 그리기를 미룰 수 있습니다. 팔레트 검사 전 현재 미션의 iframe으로 스크롤하고 좌표 준비를 확인합니다. 미션 교체 중 이전 iframe의 분리와 새 작업실 로딩을 혼동하지 않습니다.
- 교사 체험의 실제 Entry 화면 검사는 그림 준비 후 실행 버튼 활성화를 확인합니다. 준비 중 초기화도 별도로 재현해 폐기된 iframe의 늦은 완료·오류 송신이 취소되는지 검사하고, 활성 작업실의 실제 이미지 실패 처리는 유지합니다.

### CSS 및 컴포넌트 구현 규칙

- 화면별 스타일은 담당 컴포넌트 옆에 두고 공통 CSS에는 실제 공통 규칙만 남깁니다. CSS 이동·분리 때는 프로덕션 빌드로 적용 순서를 확인합니다.
- 분리한 공통 부품의 규칙은 화면 부모의 같은 우선순위 규칙과 import 순서에 기대지 않도록 하고, 빌드 화면의 계산된 크기로 원본 보존을 확인합니다.
- 포털 대화상자의 화면별 규칙은 전역 `[data-slot]` 규칙과 우선순위가 같아 불러오는 순서에 따라 바뀌지 않도록 합니다.
- 공통 Skeleton의 화면별 크기는 화면 컨테이너로 한정해 공통 규칙보다 우선하도록 하고, 개발 화면뿐 아니라 빌드된 화면의 카드 형태·조작 영역을 확인합니다.

### 대시보드 및 화면 셸

- 학생·교사 대시보드는 [DESIGN](DESIGN.md#학생교사-대시보드)의 공통 시각 기준과 `AppShell` CSS Module을 사용합니다. 탐색 메뉴의 CSS 820px 경계와 `matchMedia` 821px 경계를 함께 유지하고, 태블릿·Escape·양방향 화면 크기 전환 초점을 검사합니다. 메뉴의 초점 대상에는 `visibility`를 지연하는 `transition-all`을 쓰지 않습니다. 화면 축소 시 CSS가 사이드바를 먼저 숨기며 초점을 지우는 순서도 처리하고, 본문 조작·클릭 뒤에는 초점을 빼앗지 않습니다.
- 학습 화면의 응답·단계 변경·순서 이동 뒤 초점은 React가 화면 갱신을 완료한 Effect에서 옮깁니다. `requestAnimationFrame`만으로 새 요소 생성이나 버튼 활성화를 기다리지 않습니다. 순서 이동의 키보드 검사도 각 이동의 실제 위치와 초점 복구를 확인한 뒤 다음 키를 보냅니다.
- 학생 수업은 `LessonShell`, 대시보드·교사 화면은 `AppShell`을 사용하며 접속 표현만 `SessionAccess`로 공유합니다. 학습 조회 대기/실패/성공에서 수업 상단을 교체하지 않습니다. 조회가 끝난 뒤에도 나가기의 초점과 열린 학생 메뉴가 유지되는지 확인하고, 편집기가 전달한 표시 정보는 답안·저장 상태의 별도 소유자가 되지 않도록 합니다.
- 학습 초안 복원과 실행 가능 여부의 검사를 구분합니다. 숫자 입력을 지운 상태처럼 편집 중인 값을 보관했다면 그대로 복원하며, 실행할 때 유효성을 확인합니다. 불완전 입력 하나 때문에 다른 답안·완료 기록까지 초기화하지 않는지 재접속으로 확인합니다.

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

### 실패 진단과 오류 번호

[http.ts](../src/lib/server/http.ts)의 `failure(error, {operation})`는 [failure-log.ts](../src/lib/server/failure-log.ts)의 안전한 레코드를 응답당 한 번 기록하고 같은 서버 생성 UUID를 `X-Request-ID`에 연결합니다. 레코드는 requestId·고정 작업명 enum·고정 분류 enum·HTTP status·UTC ISO timestamp 다섯 key만 사용합니다. 오류 name/message/stack/cause·Zod issue·요청 본문/동적 URL·학생 식별자·자격 증명은 로그로 복사하지 않으며 로그 출력 실패도 API 응답을 바꾸지 않습니다. 기존 응답 code/message/status와 정상 `session:null`은 유지합니다.

대상은 auth·classroom·시간표 Cron과 teacher-preview.evaluate route입니다. `tests/server-failure-logging.spec.ts`는 합성 sentinel과 허용 key/enum을, `server-failure-api.spec.ts`는 응답 ID·분류·중복 출력·익명 정상 session을 확인합니다. 실제 비밀·학생 자료를 넣어 검사하지 않습니다. 날짜별 빌드·전체 E2E 결과와 배포·현장 검증 상태는 [HANDOFF](HANDOFF.md#현재-작업-상태)에 기록합니다.

이전 구조·정적 시안은 [코드 보관함](../archive/README.md)과 Git 이력에서 확인합니다. 현재 실행·배포 기준은 저장소 루트의 앱과 [서버 설정](FIREBASE_SETUP.md#vercel-서버-설정)입니다.
