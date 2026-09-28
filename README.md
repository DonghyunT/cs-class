# CS Class · 즐거운 정보 교실

중학교 정보 수업을 위한 온라인 교실입니다. 학생은 이번 수업을 시작하고 지난 활동을 이어가며, 교사는 반별 수업을 준비합니다.

## 현재 기준 문서

| 문서 | 읽는 목적 |
| --- | --- |
| [HANDOFF](docs/HANDOFF.md) | 다른 PC·새 대화에서 이어갈 상태와 바로 다음 작업 |
| [PRD](PRD.md) | 확정된 제품·계정·권한 요구사항과 미결정 사항 |
| [DESIGN](DESIGN.md) | 승인된 홈 스타일, 로그인·대시보드 후속 기준, UI 컴포넌트 활용 |
| [AGENTS](AGENTS.md) | 개발·검증 절차와 프로젝트 주의사항 |
| [Firebase 연결](docs/FIREBASE_SETUP.md) | 실제 서비스 설정·가상 계정 검증·계정 복구 |
| 이 README | 폴더 구조·실행·검증·도구 설정 |

과거 프롬프트와 중간 검토 기록은 [원문 보관함](docs/archive/README.md)에 있습니다. 현재 지침으로 적용하지 않습니다.

## 저장소 한눈에 보기

**`cs-class/` 하나가 앱의 실행·개발 기준 폴더입니다.** 예전의 `platform/`으로 이동할 필요가 없습니다.

```mermaid
flowchart LR
    root["cs-class/ · 프로젝트 루트"]
    root --> src["src/ · 앱 구현<br/>app/ : 페이지·API·스타일<br/>components/ : 화면·공통 UI<br/>lib/ : 학습 계약·서버 인증·저장"]
    root --> support["public/ · 정적 파일<br/>scripts/ · 개발 도구 설정 보조<br/>scratch/ · 로컬 임시 작업, Git 제외"]
    root --> checks["tests/ · 브라우저 흐름 검사<br/>.github/workflows/ · GitHub 자동 검사"]
    root --> docs["docs/ · 이어갈 일·디자인 참고·과거 문서<br/>루트의 MD 파일 · 현재 기준과 안내"]
    root --> history["archive/ · 이전 V1 코드 원문<br/>outputs/ · 디자인 검토 등 산출물"]
```

| 주요 파일·하위 경로 | 역할 |
| --- | --- |
| `src/app/page.tsx`, `login/`, `student/`, `teacher/` | 홈·역할별 로그인·학생/교사 대시보드 |
| `src/app/classroom/`, `explore/` | 수업 활동과 둘러보기 화면 |
| `src/app/layout.tsx`, `globals.css`, `experience.css`, `public-home.css` | 공통 틀·기본 스타일·체험 화면·홈 스타일 |
| `src/app/icon.svg`, `fonts/` | 사이트 아이콘·한국어 글꼴과 라이선스 |
| `src/components/ui/`, `session-provider.tsx`, `navigation-provider.tsx` | 공통 UI·접속 상태·이동 전 저장 보호 |
| `src/lib/classroom/`, `src/lib/server/`, `src/app/api/` | 공통 데이터·학습 규칙·Firebase 인증과 저장 API |
| `docs/HANDOFF.md`, `docs/reference/`, `docs/archive/` | 다음 작업·승인된 화면과 UI 예제·과거 문서 원문 |
| `package.json`, `package-lock.json` | 실행 명령·의존성 목록과 다른 PC에서도 동일하게 설치할 버전 |
| `next.config.ts`, `tsconfig.json` | Next.js 실행·빌드 설정과 TypeScript 검사 범위·경로 별칭 |
| `eslint.config.mjs`, `playwright.config.ts` | 코드 검사와 브라우저 검사 설정 |
| `postcss.config.mjs`, `components.json` | Tailwind 스타일 처리와 shadcn UI 생성 설정 |
| `.gitignore`, `.vercelignore`, `.gitattributes` | Git 제외·배포 업로드 제외·보관 원문과 라이선스 보존 규칙 |
| `AGENTS.md`, `PRD.md`, `DESIGN.md` | 에이전트 작업 규칙·제품 요구사항·디자인 기준 |

`public/`은 현재 비어 있어 `.gitkeep`으로 위치만 보존합니다. `node_modules/`는 설치한 패키지, `.next/`는 빌드·개발 캐시, `next-env.d.ts`·`*.tsbuildinfo`는 자동 생성 타입 정보, `test-results/`·`playwright-report/`는 검사 결과입니다. 모두 Git에서 제외하며 직접 수정하지 않습니다.

`outputs/`는 과거 검토 산출물이며 현재 화면 기준은 `docs/reference/`와 DESIGN입니다. 산출물 전체를 일괄 추가하지 않습니다. 로컬 학생 계정 자료·Stitch 검토 폴더는 별도 제외 규칙으로 보호하고, `archive/`·`docs/archive/`는 현재 앱에서 실행하지 않습니다.

## 다른 PC에서 시작

**GitHub의 [`codex/login-policy-spec` 작업 브랜치](https://github.com/DonghyunT/cs-class/tree/codex/login-policy-spec)에서 이어갑니다.** `main`은 이전 공개 버전입니다. 현재 기능·다음 작업·검증 기록은 [HANDOFF](docs/HANDOFF.md)에 모았습니다.

Git·Node.js 24·Java 21+를 준비하고, 이 비공개 저장소에 접근할 수 있는 GitHub 계정으로 실행합니다. 아래 개발 모드는 Firebase 키나 실제 학생 자료 없이 사용할 수 있습니다.

```powershell
git clone --branch codex/login-policy-spec https://github.com/DonghyunT/cs-class.git
cd cs-class
npm ci
npm run dev:emulator
```

이미 복제한 PC라면 먼저 `git status`로 로컬 작업을 확인합니다. 작업 트리가 깨끗할 때 HANDOFF의 fetch·작업 브랜치 전환·pull 순서를 따르고 의존성을 설치합니다. Windows PowerShell에서 npm 스크립트 실행이 차단되면 `npm.cmd`·`npx.cmd`를 사용합니다.

[학생 입장](http://localhost:3000/login/student)에서 합성 학번 `20101`과 [테스트 설정의 초기 비밀번호](scripts/local-test-env.mjs)를 사용합니다. 첫 입장에는 본인 테스트 비밀번호로 바꿉니다. [교사 입장](http://localhost:3000/login/teacher)의 강사 계정은 같은 파일의 강사 비밀번호를 사용하며 10·11반을 확인합니다. `Ctrl+C`로 종료하면 에뮬레이터 기록은 보존되지 않습니다.

실제 Firebase로 개발할 때만 [서버 설정 안내](docs/FIREBASE_SETUP.md#다른-pc의-서버-설정)에 따라 환경파일과 관리자 인증을 별도 준비한 뒤 `npm run dev`를 실행합니다. `.env.local`과 관리자 키는 Git에 없으며 새 PC에 자동 전달되지 않습니다. Codex에서 저장소 루트를 열고 다음처럼 요청하면 됩니다.

> AGENTS.md와 docs/HANDOFF.md를 읽고 codex/login-policy-spec에서 CS Class를 이어가자. 먼저 로컬 변경과 원격 동기화를 확인하고 다음 작업 범위를 정하자.

루트 통합 전부터 사용한 PC에서는 이전 개발 서버를 종료하고 **저장소 루트에서 `npm ci`로 다시 설치**합니다. 편집기 작업 폴더·터미널 시작 위치가 `platform/`으로 지정되어 있다면 `cs-class/`로 바꿉니다. Git에 없던 옛 `platform/node_modules/`·`.next/` 캐시가 남을 수 있으며, 계속 Git·코드 검사에서 제외됩니다. 더는 사용하지 않지만 `.env`·개인 파일·미커밋 소스가 섞여 있지 않은지 확인하기 전에는 `platform/` 전체를 삭제하지 않습니다.

[로컬 앱](http://localhost:3000/)을 열고 [HANDOFF](docs/HANDOFF.md)를 읽으면 이어갈 수 있습니다. VS Code/Codex의 과거 대화가 없어도 이 문서와 저장소의 스크린샷을 기준으로 작업합니다.

## 현재 구현과 체험

- Firebase Auth·Firestore와 Next.js 서버 API를 연결했습니다. 학생·교사 대시보드, 반별 수업 지정, 학습 기록 저장·복원, 제출 조회·비밀번호 초기화를 제공합니다. 메모리 로그인 체험은 제거했습니다.
- 샘플 `순서가 만드는 알고리즘`은 개념 2개·퀴즈 3문항·순서 배열 실습 1개입니다. 개념 확인, 오답만 재도전, 접힌 힌트, 자유로운 단계 이동, 검증 후 제출을 구현했습니다. 제출 뒤 초안을 수정해도 이전 제출과 완료 기록이 남습니다.
- 단계별 퍼센트·완료 수를 표시하고 전체 상태는 `시작 전 / 진행 중 / 완료`입니다. 저장 실패는 성공으로 표시하지 않으며, 두 탭 충돌은 비교 후 직접 해결합니다. 링크와 브라우저 뒤로·앞으로 이동도 저장을 확인합니다.
- 실제 프로젝트는 `cs-class-f74c4`입니다. 사용자 제공 관리자 인증으로 연결했으며 로그인 제공자와 기본 반·서버 전용 DB 규칙을 설정했습니다. 임시 계정의 실제 인증→수업 지정→완료·제출→재로그인 복원→교사 조회 검증도 통과했고 시험 계정과 작업은 제거했습니다. 작업 브랜치의 자동 Preview 빌드와 별개로 실학생 계정 등록·운영 배포는 후속입니다.
- 실제 서비스 설정 없이 체험하려면 Java 21+를 준비한 뒤 `npm run dev:emulator`를 실행합니다. 로컬 학생 `20101`, `20102`, `21001`, `21101`과 강사를 만들며 합성 비밀번호는 [로컬 테스트 설정](scripts/local-test-env.mjs)에만 있습니다. 이 계정은 클라우드에는 없습니다.
- 실제 교사 Google 로그인은 등록된 허용 이메일만 통과합니다. localhost에서 선생님이 직접 Google 계정을 선택해 입장했고 실제 교사 대시보드 진입을 브라우저에서도 확인했습니다. 강사는 10·11반만 관리합니다. EntryJS·AI·Q&A와 정식 수업 콘텐츠는 후속 범위입니다.
- 한국어 글꼴 [Pretendard 1.3.9](https://github.com/orioncactus/pretendard)은 로컬 제공하며 [SIL OFL](src/app/fonts/OFL.txt)을 포함합니다. 실제 패키지 버전은 [package.json](package.json)과 잠금 파일을 따릅니다.
- 이전 정적 시안은 정리했습니다. 순서도 수업 예시 등 원본이 필요하면 Git의 `c7bc397:web/`에서 확인할 수 있습니다. 현재 실행·개발 대상은 루트의 앱 하나입니다.

## 검증

저장소 루트에서 실행합니다. Java 21+와 최초 `npx playwright install chromium`이 필요합니다. 실제 Firebase에 연결한 3000번 서버는 종료한 뒤 실행합니다.

```powershell
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

`test:e2e`는 Auth·Firestore 에뮬레이터를 시작하고 종료합니다. 이미 `dev:emulator`가 실행 중일 때만 `npm run test:e2e:running`을 사용합니다. 테스트는 로컬 `demo-cs-class`를 확인한 뒤 가상 계정을 준비하며 운영 데이터는 사용하지 않습니다.

GitHub Actions는 `main`·`codex/**` push와 PR에서 위 네 검사를 실행하며 E2E는 빌드된 앱을 `next start`로 실행해 검사합니다. 로컬 E2E는 개발 서버를 사용합니다. UI 확인 기준은 [AGENTS](AGENTS.md)를 따릅니다. 구체적인 연결·운영상 한계는 [Firebase 연결 안내](docs/FIREBASE_SETUP.md)를 확인합니다.

2026-09-28 최종 lint·typecheck·build와 CI 방식 전체 E2E **27개**를 통과했습니다. 실제 Firebase 왕복은 별도 임시 계정으로 확인했고 정리했으며, 실제 Google 교사 로그인도 localhost에서 확인했습니다. 호스팅 환경 검증은 배포 시 별도입니다.

## Stitch 연결

Codex의 **StitchDesign 플러그인과 MCP 설정은 PC별로 준비**합니다. 저장소 복제로 사용자 도구 설정이나 API 키가 옮겨지지는 않습니다. 기존 프로젝트는 [CS Class 랜딩페이지 디자인](https://stitch.withgoogle.com/projects/9952170337891001891)이며 ID·화면 조회 주의사항은 [HANDOFF](docs/HANDOFF.md#stitch-상태)에 있습니다.

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

- 연결된 Vercel 프로젝트는 `cs-class`입니다. **Root Directory는 비워 둡니다(저장소 루트).** Framework Preset은 Next.js, Node.js는 24.x이며 빌드·설치·출력 경로는 프레임워크 기본값을 사용합니다. Git 연동으로 작업 브랜치는 Preview, main은 Production에 배포됩니다. Vercel SSO 보호는 유지하며 배포된 앱도 가상 계정 시안입니다.
- Firebase `cs-class-f74c4`는 사용자가 승인한 연결 대상입니다. 실제 Auth·Firestore 연결을 검증했고 V1 프로젝트와 분리했습니다. `.env.local`과 외부 관리자 키는 PC별로 준비하며 저장소 복제로 전달되지 않습니다.
- 키·환경변수·학생 계정 엑셀·`백업용/`은 Git에 포함하지 않습니다. 학생 자료가 필요한 작업은 원래 PC의 자료를 별도 안전한 경로로 준비해야 합니다. UI 작업은 이 자료 없이 가능합니다.
- 최신 공개 홈 참고 이미지와 제공받은 [UI Component Lab](docs/reference/ui-component-lab/index.html)은 저장소에 포함했습니다. 외부 PC에서도 사용할 수 있으며 학생 개인정보가 들어 있지 않습니다.

## 협업 방식

선생님과 주요 화면을 대화하며 정하고, 합의한 범위 안에서는 실행·검증·수정을 자율적으로 진행합니다. 중요한 질문은 하나씩 묻습니다. 제품 결정은 PRD, 디자인 기준은 DESIGN, 작업 상태는 HANDOFF에 기록해 중복을 줄입니다. 비용·실제 데이터·접근 범위·전체 기술 전환은 협의합니다.
