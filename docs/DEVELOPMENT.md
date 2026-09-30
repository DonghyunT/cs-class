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

에뮬레이터·Playwright를 이미 `scratch/`에 설치한 제한된 Windows 환경에서는 기존 캐시를 가리킵니다. `$env:FIREBASE_EMULATORS_PATH="$PWD\scratch\firebase-emulators"`, `$env:PLAYWRIGHT_BROWSERS_PATH="$PWD\scratch\playwright"`를 같은 검사 터미널에 설정합니다. Java가 PATH에 없으면 해당 PC에 설치한 Java 21+의 `bin`을 그 터미널 PATH 앞에 추가합니다. 2026-09-30 이 체크아웃의 예시는 `scratch/tools/java/jdk-21.0.12.1+1-jre/bin`이며 다른 PC에 같은 경로가 있다고 가정하지 않습니다. 캐시가 없는 새 PC는 최초 설치를 진행합니다.

이 PC의 새 PowerShell에서는 저장소 루트에서 아래 준비 명령을 함께 실행합니다. `$env:` 설정은 해당 터미널에만 적용되므로 이전 검사 터미널에서 설정했더라도 다시 필요합니다. 로컬 Java·캐시가 없는 다른 PC에서는 위 설치 안내를 먼저 따릅니다.

```powershell
$env:PATH = "$PWD\scratch\tools\java\jdk-21.0.12.1+1-jre\bin;$env:PATH"
$env:XDG_CONFIG_HOME = "$PWD\scratch\firebase-cli-config"
$env:FIREBASE_EMULATORS_PATH = "$PWD\scratch\firebase-emulators"
Remove-Item Env:STITCH_API_KEY -ErrorAction SilentlyContinue
npm.cmd run dev:emulator
```

`where.exe java`·`java -version`이 되는데도 제한된 실행에서 Java·`tar`·Playwright 자식 프로세스가 `EPERM`이면 설치 실패로 단정하지 않습니다. 허용된 로컬 검사 실행에서 같은 명령을 확인합니다. 위 Stitch 키 제거는 검사 터미널에만 적용하며 사용자 저장 설정을 지우지 않습니다. Firebase CLI 진단 로그에는 실행 환경 전체가 포함될 수 있으므로 원문을 출력하거나 공유하지 않습니다.

[학생 입장](http://localhost:3000/login/student)에서 합성 학번 `20101`과 [테스트 설정의 초기 비밀번호](../scripts/local-test-env.mjs)를 사용합니다. 첫 입장에는 본인 테스트 비밀번호로 바꿉니다. [교사 입장](http://localhost:3000/login/teacher)의 강사 계정은 같은 파일의 강사 비밀번호를 사용하며 10·11반을 확인합니다. `Ctrl+C`로 종료하면 에뮬레이터 기록은 보존되지 않습니다.

실제 Firebase로 개발할 때만 [서버 설정 안내](FIREBASE_SETUP.md#다른-pc의-서버-설정)에 따라 환경파일과 관리자 인증을 별도 준비한 뒤 `npm run dev`를 실행합니다. `.env.local`과 관리자 키는 Git에 없으며 새 PC에 자동 전달되지 않습니다. Codex에서 저장소 루트를 열고 다음처럼 요청하면 됩니다.

> AGENTS.md와 docs/HANDOFF.md를 읽고 CS Class를 이어가자. 먼저 현재 브랜치·미커밋 변경·원격 동기화를 확인하고 진행 중인 작업과 다음 범위를 정하자.

루트 통합 전부터 사용한 PC에서는 이전 개발 서버를 종료하고 **저장소 루트에서 `npm ci`로 다시 설치**합니다. 편집기 작업 폴더·터미널 시작 위치가 `platform/`으로 지정되어 있다면 `cs-class/`로 바꿉니다. Git에 없던 옛 `platform/node_modules/`·`.next/` 캐시가 남을 수 있으며, 계속 Git·코드 검사에서 제외됩니다. 더는 사용하지 않지만 `.env`·개인 파일·미커밋 소스가 섞여 있지 않은지 확인하기 전에는 `platform/` 전체를 삭제하지 않습니다.

[로컬 앱](http://localhost:3000/)을 열고 [HANDOFF](HANDOFF.md)를 읽으면 이어갈 수 있습니다. VS Code/Codex의 과거 대화가 없어도 이 문서와 저장소의 스크린샷을 기준으로 작업합니다.

## 대시보드 파일럿

학생 `/student`·교사 `/teacher`는 공통 할 일·일정·수업 바로가기를 사용합니다. 학생의 전체 수업은 `/student/lessons`, 교사의 수업 설정은 `/teacher/classes`, 학생 진행·제출·계정은 `/teacher/students`, 전체 일정은 각각 `/student/schedule`·`/teacher/schedule`입니다. 교사 상세 링크의 `classId`·`lessonId`·`studentId`는 서버 권한 안에서 조회 조건으로 사용합니다.

- 공통 화면·목록·일정·담당 CSS는 `src/components/dashboard/`에 둡니다. `use-saved-list.ts`는 두 목록의 직렬 저장·실패 의도·명시적 충돌 재시도를 공유합니다. 기존 학습 저장·이동 보호를 재사용하며 개인 체크가 `csWork`를 변경하지 않습니다.
- 서버 저장과 권한은 `src/lib/server/planner.ts`, 계약·한국 날짜는 `src/lib/classroom/planner.ts`에서 관리합니다. 저장 모델은 [Firebase 안내](FIREBASE_SETUP.md#데이터와-남은-한계), 파일럿 가정·한도·미전송 내용의 경계는 [PRD](PRD.md#작은-버전의-경계와-저장-동작)를 따릅니다.
- 로컬 `dev:emulator`를 계속 실행한 상태에서 목록을 추가한 뒤 새로고침·로그아웃·같은 합성 계정 재로그인으로 복원을 확인합니다. 교사 입장의 강사는 담당 10·11반의 일정을 등록하고 해당 반의 합성 학생은 조회합니다. 운영 계정·자료는 사용하지 않습니다.
- 변경 중에는 `npm run typecheck`와 `npm run test:e2e:running -- tests/dashboard-pilot.spec.ts`의 관련 단일 검사를 우선합니다. 최종 통합은 아래 전체 검사로 진행합니다. 대표 검사는 권한·응답 유실·동시 수정·실패 복구·IME/키보드·7개 너비와 화면 기록을 포함합니다.

이 구현에서는 의존성을 추가하지 않았습니다. 설치된 Next.js 16.3.6의 `node_modules/next/dist/docs/`와 Firebase Admin 14.5.0·React 19.2.8의 로컬 자료를 읽고 Context7 문서를 함께 확인했습니다. Context7은 Next/React 각각 16.2.9/19.2.7 색인으로 확인했으며 정확한 패치의 차이는 설치본을 기준으로 확인했습니다.

## EntryJS 실습

`entry-bot-lab`은 실제 `@entrylabs/entry` **4.0.23** 작업실을 사용합니다. 교사가 해당 수업을 반에 공개하면 학생의 열린 수업에 나타납니다. 에뮬레이터에서는 교사 입장의 강사 계정으로 10반 수업 관리에서 엔트리봇 수업을 공개하고, 합성 학생 `21001`로 입장해 실습 탭을 선택하면 확인할 수 있습니다. 강사·학생 비밀번호는 위 로컬 테스트 설정을 따릅니다.

- `npm ci`의 `postinstall`과 `npm run dev`·`npm run build`의 준비 단계가 [자산 목록](../scripts/entryjs-assets.json)의 버전·SHA-512로 브라우저 파일을 준비합니다. npm 레지스트리·공식 Entry CDN·고정한 공식 예제 커밋을 사용하며 브라우저는 `/entryjs/vendor/`의 로컬 파일을 읽습니다. 첫 설치에는 인터넷과 `tar`가 필요합니다(Windows 기본 tar 또는 해당 OS의 tar). 자산·다운로드 캐시는 Git 제외 `public/entryjs/vendor/`·`scratch/entryjs/`에 생성됩니다. 필요하면 `npm run prepare:entryjs`로 다시 준비합니다. 무결성이 다른 파일은 빌드에 사용하지 않습니다.
- [작업실 HTML](../public/entryjs/workspace.html)·[브리지](../public/entryjs/workspace.js)는 `allow-scripts`만 허용한 iframe에서 실행합니다. Next.js 앱의 React 19와 EntryJS 보조 UI의 React 18을 분리합니다. iframe의 설정 저장소는 메모리이며 부모 화면의 쿠키·DOM·저장소에 접근할 수 없습니다. 공개 자산에만 CORS와 OPTIONS를 허용하고 수업 API의 인증·권한·Origin 검사는 유지합니다.
- 학생 화면은 [EntryPracticeWorkspace](../src/components/student/entry-practice-workspace.tsx), 작품 읽기는 [entry-project.ts](../src/lib/classroom/entry-project.ts), 서버 조건 판정은 [solutions.ts](../src/lib/server/solutions.ts)에서 관리합니다. 네이티브 JSON-string 스크립트와 이전 미리보기 작품을 읽습니다. 시작·이동·시간 동안 말하기 블록과 상수 입력만 허용하고 고정한 엔트리봇·무대로 불러옵니다. 최대 50개 블록·직렬화된 작품 28KB, 이동 ±1000·말 80자·시간 0~10초를 지원합니다.
- 실행 결과는 중지 **전**에 수집합니다. EntryJS는 중지하면 오브젝트를 실행 전 상태로 되돌리고 `exportProject`도 실행을 중지하므로, 실행 중 자동 저장은 정지 상태의 작품에 현재 코드만 반영합니다. 15초가 지나면 실행을 멈춥니다. 이 과제의 서버 채점은 지원 블록의 연결 구조·상수 값을 검사하며 서버에서 EntryJS를 실행하지 않습니다. 다른 과제의 반복·입력·충돌·난수 검사는 별도 설계합니다.
- 네이티브 입력의 붙여넣기·IME는 `input`을 `keyup` 처리로 연결합니다. 단계 이동·화면 이동·검증·제출 전에는 편집기의 현재 작품을 읽고 저장하며 실패하면 이동을 멈춥니다. 드래그 중 임시 블록은 저장하지 않습니다. 작품을 불러올 때 작업실 `dReDraw`와 팔레트 `reDraw`의 예약을 순서대로 `flush()`한 뒤 편집을 허용합니다. 늦은 초기 갱신이 입력창을 닫지 않도록 하며, 자동 저장 이후 초점과 연속 입력도 검사합니다. EntryJS 팔레트 좌표 갱신에는 지연이 있으므로 UI 검사는 블록 모델의 좌표 준비 후 시작합니다.
- [EntryJS 브라우저 검사](../tests/entryjs-ui.spec.ts)는 실제 드래그·숫자 입력·실행·무대 복원·저장·검증·제출·재접속, 저장/파일 로딩 실패 복구, 좁은 창·Esc·키보드 가로 이동을 확인합니다. 라이브러리 번들과 공개된 라이선스·NOTICE·COPYING·패키지 메타데이터는 자산 준비 시 함께 보존합니다.

공식 근거: [설치 예제](https://github.com/entrylabs/example/tree/main/base), [프로젝트 API](https://docs.playentry.org/entryjs/api/2024-02-29-api.html), [실행 이벤트](https://docs.playentry.org/entryjs/api/2024-02-29-event.html). Context7에서 EntryJS를 찾지 못해 고정 버전 패키지의 README·배포 소스와 공식 문서를 확인했습니다.

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
- 테마의 과거 Plus Jakarta Sans보다 현재 DESIGN의 Pretendard·색·컴포넌트 기준이 우선입니다. 이번 LMS 구현에서는 새 Stitch 생성을 하지 않았습니다.

| 화면 | 최초 ID | 수정 결과 ID |
| --- | --- | --- |
| 홈 데스크톱 | `43f4bb0b48b0429ea7827b5fec944945` | `b9fcd8f02ce3462c89ce9f653285f699` |
| 홈 모바일 | `e157096258184c8190a44a9ba31585d8` | `5fdd1894a36a4c1e93b378b4a334abe8` |
| 초기 브랜드 | `d355390e8e2b472093273fbb1855ffc5` | 로컬 작은 학사모가 현재 기준 |

## 외부 환경과 로컬 전용 자료

- 연결된 Vercel 프로젝트는 `cs-class`입니다. **Root Directory는 비워 둡니다(저장소 루트).** Framework Preset은 Next.js, Node.js는 24.x이며 빌드·설치·출력 경로는 프레임워크 기본값을 사용합니다. Git 연동으로 작업 브랜치는 Preview, main은 Production에 배포됩니다. Vercel SSO 보호는 유지합니다. Production은 승인된 Firebase에 연결하고, 일반 Preview에는 운영 비밀값을 넣지 않습니다.
- Vercel 프로젝트 ID는 `prj_RUUtcTMukVY9kjudgDr6VA89KKxP`입니다. MCP는 프로젝트 연결로 호출하고 팀 범위를 임의로 덧붙이지 않습니다. `teamId`를 덧붙일 때의 403을 전체 연결 불가로 해석하지 않습니다. 응답에 루트 경로가 없으면 Build and Deployment 설정 화면에서 확인합니다.
- Firebase의 승인 대상·서버 설정·복구 절차는 [Firebase 안내](FIREBASE_SETUP.md), 실제 연결 확인 기록은 [HANDOFF](HANDOFF.md)를 따릅니다.
- 키·환경변수·학생 계정 엑셀·`백업용/`은 Git에 포함하지 않습니다. 학생 자료가 필요한 작업은 원래 PC의 자료를 별도 안전한 경로로 준비해야 합니다. UI 작업은 이 자료 없이 가능합니다.
- 최신 공개 홈 참고 이미지와 제공받은 [UI Component Lab](reference/ui-component-lab/index.html)은 저장소에 포함했습니다. 외부 PC에서도 사용할 수 있으며 학생 개인정보가 들어 있지 않습니다.

## 공통 데이터 계약을 수정할 때

제품 의미·권한·저장 정책은 [PRD](PRD.md)를 따릅니다. 구현의 공통 시작점은 [types.ts](../src/lib/classroom/types.ts), [client.ts](../src/lib/classroom/client.ts), [progress.ts](../src/lib/classroom/progress.ts)이며 학생·교사 화면이 같은 세션·탐색 보호·서버 API를 사용합니다.

- 학번 같은 표시 식별자와 서버 사용자 식별자를 구분하고, 역할·담당 반은 검증된 서버 정보에서 받습니다.
- 수업 안에서 안정적인 활동 식별자를 사용하고 응답·미응답·오답·해결을 구분합니다. 두 화면의 진행은 같은 서버 기록으로 계산합니다.
- 검증 결과는 작업 버전에 연결합니다. 제출본·편집 중 초안, 학습 완료·저장 상태를 구분합니다.
- 인증 만료·권한 부족·통신 실패·버전 충돌을 구분합니다. 재시도가 중복 제출을 만들거나 늦은 저장이 최신 작업을 덮어쓰지 않도록 합니다.
- 공유 계약 변경은 학생·교사 양쪽 영향과 실패·권한 경계를 함께 검증합니다. 모의 데이터·에뮬레이터 검증과 실제 연결 결과를 구분합니다.

## 이전 구조를 확인해야 할 때

- 루트 통합은 [PR #5](https://github.com/DonghyunT/cs-class/pull/5)에 있습니다. 통합 전 `e2dfaf1`(PR #4) 버전을 다시 빌드해 운영하려면 코드와 함께 Vercel Root Directory도 `platform`으로 맞춰야 합니다. 이미 만들어진 배포로 되돌리는 작업과 구분하고, 실제 변경은 대상·승인 범위를 확인한 뒤 진행합니다.
- 이전 정적 시안 네 파일은 `c7bc397:web/`에 있습니다. 예를 들어 `git show c7bc397:web/curriculum.js`로 순서도 수업 예시를 확인할 수 있습니다. 현재 개발 대상은 루트의 앱 하나이며, 옛 수업 콘텐츠가 새 앱에 모두 이식됐다는 뜻은 아닙니다.
