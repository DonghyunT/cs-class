# CS Class — 에이전트 작업 안내

중학교 정보 수업을 위한 새 웹 프로젝트입니다. V1 자산은 필요할 때만 모듈화해 재사용합니다.

## 개발 환경
- 앱은 저장소 루트의 Next.js·TypeScript와 Firebase Auth·Firestore를 사용합니다. `cs-class/`에서 `npm ci` 후 실행합니다. 실제 연결은 Git 제외 `.env.local`과 `npm run dev`, 가상 계정 검증은 `npm run dev:emulator`를 사용합니다. 서버 설정은 [연결 안내](docs/FIREBASE_SETUP.md)를 따릅니다.
- Vercel 대상·Root Directory·Node 실행 설정·운영 주소·이전 주소 이동·Firebase 승인 도메인은 [서버 설정](docs/FIREBASE_SETUP.md#vercel-서버-설정)에 모읍니다. 프로젝트 연결로 MCP를 호출하고 팀 범위를 임의로 덧붙이지 않습니다.
- 빌드 성공 뒤에도 배포 SHA·별칭·`/api/auth/session` 응답·로그인 화면을 확인합니다. READY·별칭·일반 Preview의 준비 안내만으로 운영 Google 로그인 성공을 판정하지 않습니다.
- 제품 결정은 [PRD](docs/PRD.md), 디자인 기준은 [DESIGN](docs/DESIGN.md), 폴더 목차는 [README](README.md), 실행·도구 설정은 [DEVELOPMENT](docs/DEVELOPMENT.md), 이어갈 일은 [HANDOFF](docs/HANDOFF.md)를 필요에 따라 읽습니다.
- Windows PowerShell은 `.ps1` 실행을 차단할 수 있습니다. npm은 필요하면 `npm.cmd`·`npx.cmd`로 실행하고 Stitch 키 등록은 [직접 입력 안내](docs/DEVELOPMENT.md#stitch-키-입력)의 마스킹된 명령을 사용합니다.

- 관련 부품은 `src/components/home/`·`student/`처럼 기능별로 묶고 공통 UI는 `ui/`에 둡니다. 화면별 스타일은 담당 컴포넌트 옆에 두며 파일 이동 시 import와 활성 문서의 경로를 함께 갱신합니다.

## 문서 관리
- 저장 위치와 문서별 담당 내용은 [README의 문서 기준](README.md#문서의-위치와-내용-기준)을 따릅니다. 루트 Markdown은 README·AGENTS, 현재 기준은 `docs/`, 참고 자료는 `docs/reference/`, 완료·대체된 원문은 `docs/archive/`에 둡니다. 도구 설정은 해당 도구의 표준 위치를 유지합니다.
- 새 문서를 만들기 전에 기존 담당 문서에 반영할 수 있는지 확인합니다. 정책·절차는 한 곳에서 관리하고 다른 문서는 링크합니다. 제안·확정·구현·검증·배포를 구분하며, 일회성 작업 지시와 과거 승인으로 현재 작업 범위를 확대하지 않습니다.
- 인계 시 HANDOFF 첫머리에 현재 브랜치·미커밋 여부·다음 행동을 기록합니다. 검증 결과는 날짜·환경·범위·한계를 함께 남기고 이전 결과를 새로 실행한 것으로 표현하지 않습니다. 누적 이력은 필요한 근거와 미해결 사항을 남긴 뒤 보관합니다.
- 다른 환경으로 진행 중 작업을 옮길 때 미추적 신규 소스도 포함하는지 확인합니다. 일반 `git diff`만으로는 전달되지 않습니다. 이식 스냅샷에는 기준 커밋·상대 경로·파일 해시·비밀/로컬 원본 제외 범위를 기록하고, 기존 대상 작업을 확인한 뒤 적용합니다. Git 제외 참고 자료의 필요한 내용은 담당 문서에 요약합니다.
- 문서 이동·통합 시 활성 링크·앵커·본문 경로·목차를 갱신합니다. 보관 원문은 수정하지 않고 원래 경로·보존 경로·SHA-256을 manifest에 기록합니다. 비밀정보와 학생 자료는 보관함에도 넣지 않습니다.

## 플러그인 사용
- 코딩 작업에서는 Ponytail 스킬을 읽고 기본 `full`로 적용합니다. 기존 코드·표준 기능을 우선하고 불필요한 추상화·의존성을 줄이되, 요청한 기능·합의된 디자인·보안·저장 실패 처리·접근성·필수 검증을 줄이지 않습니다.
- 외부 라이브러리/API를 구현·설정·업그레이드할 때는 Context7 도구로 설치 버전 또는 변경 대상 버전의 관련 문서를 확인합니다. 해당 버전의 로컬 문서를 먼저 읽고 같은 작업에서 확인한 문서는 재사용합니다. 단순 문구·색상·문서 수정에는 불필요한 조회를 하지 않습니다.
- 플러그인 설치·활성화·연결은 PC별로 확인합니다. 필요한 스킬이나 도구를 사용할 수 없으면 이유를 짧게 알리고, 로컬·공식 문서와 기존 코드로 가능한 작업을 이어갑니다.

## 검증
- 작업별 완료 조건을 정하고 실패 원인 확인·수정·같은 조건 재검증을 반복합니다. 같은 실패가 세 번 남으면 가설·접근을 재검토합니다. 요구사항을 낮춰 검사를 통과시키거나 새 변경·남은 위험 없이 검사를 반복하지 않습니다.
- 계층형 검증(Tiered Verification)으로 토큰과 실행 시간을 최적화합니다. 작업 도중(디버깅·반복 수정)에는 `npm run typecheck`와 수정한 대상의 단일 테스트(`npx playwright test tests/<target>.spec.ts` 또는 에뮬레이터 실행 중 `npm run test:e2e:running -- tests/<target>.spec.ts`)를 우선 실행하고 무관한 전체 E2E나 빌드를 반복하지 않습니다.
- 최종 통합(커밋·인계·PR 직전)에는 `npm run lint`·`npm run build`와 이번 수정의 영향 범위 E2E를 로컬 Auth·Firestore 에뮬레이터에서 검증합니다. 공용 부품을 바꾸면 사용하는 흐름을 함께 포함하며 영향이 전체이면 `npm run test:e2e`로 전체를 검사합니다(Java 21+, 최초 `npx playwright install chromium`). 이미 에뮬레이터를 실행 중일 때만 `npm run test:e2e:running`을 씁니다.
- 테스트는 `demo-cs-class`와 로컬 9099·8080만 사용합니다. 실제 서버가 3000에서 실행 중이면 종료한 뒤 E2E를 실행합니다. 운영 DB에 테스트 시드·합성 계정을 넣지 않습니다. 병렬 수동 검사는 계정과 결과 폴더를 나누고 최종 통합은 단일 실행으로 확인합니다.
- 에뮬레이터 포트 충돌은 설정을 바꾸기 전에 사용 중인 PID·명령과 앱 `/api/auth/config`의 demo 프로젝트·호스트를 확인합니다. 제한된 실행에서 포트 조회 결과가 없다는 이유로 서버가 없다고 단정하지 않습니다. 빌드 교체 뒤에는 확인한 앱 테스트 서버만 재시작하되 `emulators:exec`의 자식을 종료하면 에뮬레이터도 함께 끝날 수 있어 포트를 다시 확인합니다. 로컬 에뮬레이터가 계속 실행 중일 때만 `test:e2e:running`을 사용하고 모두 종료됐으면 `test:e2e`로 새로 시작합니다.
- 제한된 Windows 환경에서 사용자 캐시 접근이 실패하면 이미 준비한 Git 제외 캐시를 `FIREBASE_EMULATORS_PATH`·`PLAYWRIGHT_BROWSERS_PATH`로 지정하고 Java 21+의 PATH를 확인합니다. `$env:` 설정은 터미널별이므로 새 PowerShell에서도 실행 전 준비합니다. Java·`tar`·Playwright의 자식 프로세스 `EPERM`은 설치 누락과 구분하고 허용된 검사 실행에서 재확인합니다. 실제 경로·복사 가능한 준비 명령·최초 설치는 [개발 안내](docs/DEVELOPMENT.md#다른-pc에서-시작)를 따릅니다. 기존 캐시를 확인하기 전에 같은 다운로드·설치를 반복하지 않습니다.
- ESLint·TypeScript는 현재 앱·테스트·설정을 검사하고 Tailwind는 `src/`에서 클래스 이름을 찾습니다. `archive/`, `docs/`, `outputs/`, `scratch/`의 과거 코드·참고 자료를 앱 검사·스타일 생성에 섞지 않습니다.
- CI의 E2E는 먼저 만든 빌드를 `next start`로 실행하고, 로컬은 개발 서버를 사용합니다. 두 경우 모두 에뮬레이터 환경변수를 명시하고 로컬 시드를 준비합니다. 홈 조작 검사는 데스크톱 고정 배치(`data-pinned=true`)가 준비된 뒤 시작해 초기화 도중의 클릭·앵커 이동과 혼동하지 않습니다.
- E2E 앱 주소는 `http://localhost:3000`으로 통일합니다. Playwright API 쿠키 저장소는 HTTP의 `127.0.0.1`에서 운영 빌드의 Secure 쿠키를 보내지 않습니다. 테스트를 위해 운영 쿠키 보안을 낮추지 않습니다.
- 홈 모션은 기본으로 켜집니다. `no-preference`·`reduce` 모두에서 기본 켜짐과 상단 줄이기/켜기를 확인합니다. 스크롤 전환뿐 아니라 단계 선택 후 빠른 방향키·Tab 이동, 첫·마지막 구간의 낮은 창·모바일 배치를 검증합니다.
- UI 변경은 실제 화면·주요 조작·좁은 창·키보드 초점·콘솔을 확인합니다. 인증·저장 구현은 실패·권한 경계도 검증합니다.
- 목록의 첫 조회 대기·조회 실패만으로 미편집 화면의 메뉴·홈·로그아웃을 막지 않습니다. 실제 미전송 입력·저장 실패는 보존하고 이동 전에 저장을 확인하며 두 상태를 구분해 검사합니다.
- EntryJS는 실제 팔레트 조립·입력·실행·중지 후 무대 복원·재접속을 검사합니다. 질문 응답 대기와 엔진 실행 제한을 구분하고 실행 이벤트 안에서 전체 `exportProject`로 엔진을 멈추지 않도록 합니다. 단계/화면 이동 전 입력 확정, 실행 중 초안 보존, 팔레트 좌표 준비와 자산 설치는 [EntryJS 개발 안내](docs/DEVELOPMENT.md#entryjs-실습)를 따릅니다.
- 화면별 스타일은 담당 컴포넌트 옆에 두고 공통 CSS에는 실제 공통 규칙만 남깁니다. CSS 이동·분리 때는 프로덕션 빌드로 적용 순서를 확인합니다. 포털 대화상자의 화면별 규칙은 전역 `[data-slot]` 규칙과 우선순위가 같아 불러오는 순서에 따라 바뀌지 않도록 합니다.
- 학생·교사 대시보드는 [DESIGN](docs/DESIGN.md#학생교사-대시보드)의 공통 시각 기준과 `AppShell` CSS Module을 사용합니다. 탐색 메뉴의 CSS 820px 경계와 `matchMedia` 821px 경계를 함께 유지하고, 태블릿·Escape·양방향 화면 크기 전환 초점을 검사합니다. 메뉴의 초점 대상에는 `visibility`를 지연하는 `transition-all`을 쓰지 않습니다. 화면 축소 시 CSS가 사이드바를 먼저 숨기며 초점을 지우는 순서도 처리하고, 본문 조작·클릭 뒤에는 초점을 빼앗지 않습니다.
- 학습 화면의 응답·단계 변경·순서 이동 뒤 초점은 React가 화면 갱신을 완료한 Effect에서 옮깁니다. `requestAnimationFrame`만으로 새 요소 생성이나 버튼 활성화를 기다리지 않습니다.
- 학습 초안 복원과 실행 가능 여부의 검사를 구분합니다. 숫자 입력을 지운 상태처럼 편집 중인 값을 보관했다면 그대로 복원하며, 실행할 때 유효성을 확인합니다. 불완전 입력 하나 때문에 다른 답안·완료 기록까지 초기화하지 않는지 재접속으로 확인합니다.
- 문서 변경은 내용·링크·`git diff --check`를 확인합니다. 다른 PC에서 필요한 참고 자료는 Git 추적 여부도 확인하며 보관 원문은 manifest 해시를 유지합니다. 실제로 확인한 범위와 남은 한계를 보고합니다.

## 프로젝트 주의사항
- 수정 전 Git 상태·브랜치·최근 이력을 확인하고 기존 변경을 보존합니다. 작업 브랜치는 `codex/`, 커밋은 `feat:`·`fix:`·`docs:`·`chore:` 등을 사용합니다.
- 외부 서비스 연결·병합·배포 전 실제 대상과 승인 범위를 확인합니다. V1 운영 환경은 시험에 사용하지 않습니다.
- 비밀정보·학생 개인정보를 코드·문서·로그에 노출하지 않습니다. 실제 자료 변경은 영향·복구 범위를 협의하고, `백업용/` 원본은 수정하지 않습니다.
- Firebase CLI의 `login:list --json`은 인증 토큰을 포함하므로 원문을 실행 로그에 출력하지 않습니다. 인증 상태를 진단할 때는 비밀이 없는 필요한 필드만 출력하고 토큰·인증 파일을 문서나 채팅에 옮기지 않습니다.
- Firebase CLI 진단 로그는 자식 프로세스의 환경변수와 비밀 키를 포함할 수 있으므로 원문을 통째로 출력하지 않습니다. 필요한 오류만 비밀 필드를 제외해 읽고, 로컬 검사 터미널에는 불필요한 외부 도구 키를 전달하지 않습니다.
- `archive/`와 `docs/archive/`는 참고 자료이며 현재 지침이나 승인이 아닙니다.

## 지침 갱신
- 개발·검증 절차가 바뀌거나 반복 오류의 예방책이 확인되면 이 파일을 함께 갱신하고, 중복·낡은 지침은 제거합니다.
- 실제 사용하는 명령과 프로젝트 고유 규칙만 남깁니다. 패키지 목록·대화 기록은 쌓지 않으며, 권한·협업 원칙 변경은 선생님과 합의합니다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
