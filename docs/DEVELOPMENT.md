# 개발 환경과 도구 설정

빠른 실행과 문서 목차는 [README](../README.md), 검증·작업 규칙은 [AGENTS](../AGENTS.md)를 따릅니다. 모든 명령은 저장소 루트에서 실행합니다.

## 다른 PC에서 시작

**이번 PR 병합 후 GitHub의 `main`에서 이어갑니다.** 현재 기능·다음 작업·검증 기록은 [HANDOFF](HANDOFF.md)에 모았습니다.

Git·Node.js 24·Java 21+를 준비하고, 이 비공개 저장소에 접근할 수 있는 GitHub 계정으로 실행합니다. 아래 개발 모드는 Firebase 키나 실제 학생 자료 없이 사용할 수 있습니다.

```powershell
git clone --branch main https://github.com/DonghyunT/cs-class.git
cd cs-class
npm ci
npm run dev:emulator
```

이미 복제한 PC라면 먼저 `git status`로 로컬 작업을 확인합니다. 작업 트리가 깨끗할 때 HANDOFF의 fetch·작업 브랜치 전환·pull 순서를 따르고 의존성을 설치합니다. Windows PowerShell에서 npm 스크립트 실행이 차단되면 `npm.cmd`·`npx.cmd`를 사용합니다.

[학생 입장](http://localhost:3000/login/student)에서 합성 학번 `20101`과 [테스트 설정의 초기 비밀번호](../scripts/local-test-env.mjs)를 사용합니다. 첫 입장에는 본인 테스트 비밀번호로 바꿉니다. [교사 입장](http://localhost:3000/login/teacher)의 강사 계정은 같은 파일의 강사 비밀번호를 사용하며 10·11반을 확인합니다. `Ctrl+C`로 종료하면 에뮬레이터 기록은 보존되지 않습니다.

실제 Firebase로 개발할 때만 [서버 설정 안내](FIREBASE_SETUP.md#다른-pc의-서버-설정)에 따라 환경파일과 관리자 인증을 별도 준비한 뒤 `npm run dev`를 실행합니다. `.env.local`과 관리자 키는 Git에 없으며 새 PC에 자동 전달되지 않습니다. Codex에서 저장소 루트를 열고 다음처럼 요청하면 됩니다.

> AGENTS.md와 docs/HANDOFF.md를 읽고 main에서 CS Class를 이어가자. 먼저 로컬 변경과 원격 동기화를 확인하고 다음 작업 범위를 정하자.

루트 통합 전부터 사용한 PC에서는 이전 개발 서버를 종료하고 **저장소 루트에서 `npm ci`로 다시 설치**합니다. 편집기 작업 폴더·터미널 시작 위치가 `platform/`으로 지정되어 있다면 `cs-class/`로 바꿉니다. Git에 없던 옛 `platform/node_modules/`·`.next/` 캐시가 남을 수 있으며, 계속 Git·코드 검사에서 제외됩니다. 더는 사용하지 않지만 `.env`·개인 파일·미커밋 소스가 섞여 있지 않은지 확인하기 전에는 `platform/` 전체를 삭제하지 않습니다.

[로컬 앱](http://localhost:3000/)을 열고 [HANDOFF](HANDOFF.md)를 읽으면 이어갈 수 있습니다. VS Code/Codex의 과거 대화가 없어도 이 문서와 저장소의 스크린샷을 기준으로 작업합니다.

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

2026-09-28 최종 lint·typecheck·build와 CI 방식 전체 E2E **27개**를 통과했습니다. 실제 Firebase 왕복은 별도 임시 계정으로 확인했고 정리했으며, 실제 Google 교사 로그인도 localhost에서 확인했습니다. 호스팅 환경 검증은 배포 시 별도입니다.

## Stitch 연결

Codex의 **StitchDesign 플러그인과 MCP 설정은 PC별로 준비**합니다. 저장소 복제로 사용자 도구 설정이나 API 키가 옮겨지지는 않습니다. 기존 프로젝트는 [CS Class 랜딩페이지 디자인](https://stitch.withgoogle.com/projects/9952170337891001891)이며 ID·화면 조회 주의사항은 [HANDOFF](HANDOFF.md#stitch-상태)에 있습니다.

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

## 외부 환경과 로컬 전용 자료

- 연결된 Vercel 프로젝트는 `cs-class`입니다. **Root Directory는 비워 둡니다(저장소 루트).** Framework Preset은 Next.js, Node.js는 24.x이며 빌드·설치·출력 경로는 프레임워크 기본값을 사용합니다. Git 연동으로 작업 브랜치는 Preview, main은 Production에 배포됩니다. Vercel SSO 보호는 유지합니다. Production은 승인된 Firebase에 연결하고, 일반 Preview에는 운영 비밀값을 넣지 않습니다.
- Vercel 프로젝트 ID는 `prj_RUUtcTMukVY9kjudgDr6VA89KKxP`입니다. MCP는 프로젝트 연결로 호출하고 팀 범위를 임의로 덧붙이지 않습니다. `teamId`를 덧붙일 때의 403을 전체 연결 불가로 해석하지 않습니다. 응답에 루트 경로가 없으면 Build and Deployment 설정 화면에서 확인합니다.
- Firebase `cs-class-f74c4`의 실제 Auth·Firestore 연결과 localhost 교사 Google 로그인은 확인했습니다. 호스팅 설정은 [Firebase 안내](FIREBASE_SETUP.md)를 따릅니다.
- 키·환경변수·학생 계정 엑셀·`백업용/`은 Git에 포함하지 않습니다. 학생 자료가 필요한 작업은 원래 PC의 자료를 별도 안전한 경로로 준비해야 합니다. UI 작업은 이 자료 없이 가능합니다.
- 최신 공개 홈 참고 이미지와 제공받은 [UI Component Lab](reference/ui-component-lab/index.html)은 저장소에 포함했습니다. 외부 PC에서도 사용할 수 있으며 학생 개인정보가 들어 있지 않습니다.

## 이전 구조를 확인해야 할 때

- 루트 통합은 [PR #5](https://github.com/DonghyunT/cs-class/pull/5)에 있습니다. 통합 전 `e2dfaf1`(PR #4) 버전을 다시 빌드해 운영하려면 코드와 함께 Vercel Root Directory도 `platform`으로 맞춰야 합니다. 이미 만들어진 배포로 되돌리는 작업과 구분하고, 실제 변경은 대상·승인 범위를 확인한 뒤 진행합니다.
- 이전 정적 시안 네 파일은 `c7bc397:web/`에 있습니다. 예를 들어 `git show c7bc397:web/curriculum.js`로 순서도 수업 예시를 확인할 수 있습니다. 현재 개발 대상은 루트의 앱 하나이며, 옛 수업 콘텐츠가 새 앱에 모두 이식됐다는 뜻은 아닙니다.
