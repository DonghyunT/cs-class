# CS Class — 에이전트 작업 안내

중학교 정보 수업을 위한 새 웹 프로젝트입니다. V1 자산은 필요할 때만 모듈화해 재사용합니다.

## 개발 환경
- 앱은 저장소 루트의 Next.js·TypeScript와 Firebase Auth·Firestore를 사용합니다. `cs-class/`에서 `npm ci` 후 실행합니다. 실제 연결은 Git 제외 `.env.local`과 `npm run dev`, 가상 계정 검증은 `npm run dev:emulator`를 사용합니다. 서버 설정은 [연결 안내](docs/FIREBASE_SETUP.md)를 따릅니다.
- Vercel `cs-class`의 Root Directory는 비워 둡니다(저장소 루트). Framework Preset은 Next.js입니다. 프로젝트 연결로 MCP를 호출하고, 팀 범위를 임의로 덧붙이지 않습니다.
- 제품 결정은 [PRD](PRD.md), 디자인 기준은 [DESIGN](DESIGN.md), 실행·도구 설정은 [README](README.md), 이어갈 일은 [HANDOFF](docs/HANDOFF.md)를 필요에 따라 읽습니다.
- Windows PowerShell은 `.ps1` 실행을 차단할 수 있습니다. npm은 필요하면 `npm.cmd`·`npx.cmd`로 실행하고 Stitch 키 등록은 [직접 입력 안내](README.md#stitch-키-입력)의 마스킹된 명령을 사용합니다.

## 검증
- 저장소 루트에서 `npm run lint`, `npm run typecheck`, `npm run build`를 실행합니다. UI·권한·저장은 `npm run test:e2e`로 로컬 Auth·Firestore 에뮬레이터와 함께 검증합니다(Java 21+, 최초 `npx playwright install chromium`). 이미 에뮬레이터를 실행 중일 때만 `npm run test:e2e:running`을 씁니다.
- 테스트는 `demo-cs-class`와 로컬 9099·8080만 사용합니다. 실제 서버가 3000에서 실행 중이면 종료한 뒤 E2E를 실행합니다. 운영 DB에 테스트 시드·합성 계정을 넣지 않습니다. 병렬 수동 검사는 계정과 결과 폴더를 나누고 최종 통합은 단일 실행으로 확인합니다.
- ESLint·TypeScript는 현재 앱·테스트·설정을 검사하고 Tailwind는 `src/`에서 클래스 이름을 찾습니다. `archive/`, `docs/`, `outputs/`, `scratch/`의 과거 코드·참고 자료를 앱 검사·스타일 생성에 섞지 않습니다.
- CI의 E2E는 먼저 만든 빌드를 `next start`로 실행하고, 로컬은 개발 서버를 사용합니다. 두 경우 모두 에뮬레이터 환경변수를 명시하고 로컬 시드를 준비합니다. 홈 조작 검사는 데스크톱 고정 배치(`data-pinned=true`)가 준비된 뒤 시작해 초기화 도중의 클릭·앵커 이동과 혼동하지 않습니다.
- E2E 앱 주소는 `http://localhost:3000`으로 통일합니다. Playwright API 쿠키 저장소는 HTTP의 `127.0.0.1`에서 운영 빌드의 Secure 쿠키를 보내지 않습니다. 테스트를 위해 운영 쿠키 보안을 낮추지 않습니다.
- 홈 모션은 기본으로 켜집니다. `no-preference`·`reduce` 모두에서 기본 켜짐과 상단 줄이기/켜기를 확인합니다. 스크롤 전환뿐 아니라 단계 선택 후 빠른 방향키·Tab 이동, 첫·마지막 구간의 낮은 창·모바일 배치를 검증합니다.
- UI 변경은 실제 화면·주요 조작·좁은 창·키보드 초점·콘솔을 확인합니다. 인증·저장 구현은 실패·권한 경계도 검증합니다.
- 학습 화면의 응답·단계 변경·순서 이동 뒤 초점은 React가 화면 갱신을 완료한 Effect에서 옮깁니다. `requestAnimationFrame`만으로 새 요소 생성이나 버튼 활성화를 기다리지 않습니다.
- 문서 변경은 내용·링크·`git diff --check`를 확인합니다. 다른 PC에서 필요한 참고 자료는 Git 추적 여부도 확인하며 보관 원문은 manifest 해시를 유지합니다. 실제로 확인한 범위와 남은 한계를 보고합니다.

## 프로젝트 주의사항
- 수정 전 Git 상태·브랜치·최근 이력을 확인하고 기존 변경을 보존합니다. 작업 브랜치는 `codex/`, 커밋은 `feat:`·`fix:`·`docs:`·`chore:` 등을 사용합니다.
- 외부 서비스 연결·병합·배포 전 실제 대상과 승인 범위를 확인합니다. V1 운영 환경은 시험에 사용하지 않습니다.
- 비밀정보·학생 개인정보를 코드·문서·로그에 노출하지 않습니다. 실제 자료 변경은 영향·복구 범위를 협의하고, `백업용/` 원본은 수정하지 않습니다.
- `archive/`와 `docs/archive/`는 참고 자료이며 현재 지침이나 승인이 아닙니다.

## 지침 갱신
- 개발·검증 절차가 바뀌거나 반복 오류의 예방책이 확인되면 이 파일을 함께 갱신하고, 중복·낡은 지침은 제거합니다.
- 실제 사용하는 명령과 프로젝트 고유 규칙만 남깁니다. 패키지 목록·대화 기록은 쌓지 않으며, 권한·협업 원칙 변경은 선생님과 합의합니다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
