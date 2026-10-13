# CS Class — 에이전트 작업 안내

중학교 정보 수업을 위한 Next.js·TypeScript, Firebase Auth·Firestore 기반 웹 프로젝트입니다. V1 자산은 필요할 때만 모듈화해 재사용합니다.

## 개발 환경과 원칙
- 앱은 저장소 루트에서 `npm ci` 후 실행합니다. 로컬 검증은 `npm run dev:emulator`, 실제 Firebase 연결은 Git 제외 `.env.local`과 `npm run dev`를 사용합니다. Windows PowerShell에서 실행 차단 시 `npm.cmd`·`npx.cmd`를 사용합니다.
- 서버·Vercel 배포·Firebase 설정 및 장애 복구는 [FIREBASE_SETUP](docs/FIREBASE_SETUP.md#vercel-서버-설정)을 따릅니다. 배포 성공 판정은 READY 상태뿐 아니라 실제 배포 SHA·별칭·`/api/auth/session` 응답과 로그인 화면까지 확인합니다.
- 제품 결정은 [PRD](docs/PRD.md), 디자인 기준은 [DESIGN](docs/DESIGN.md), 폴더 목차·배치 기준은 [README](README.md), 실행·환경 절차는 [DEVELOPMENT](docs/DEVELOPMENT.md), 현재 진행 상태·남은 작업은 [HANDOFF](docs/HANDOFF.md)를 따릅니다.
- 관련 컴포넌트는 `src/components/home/`·`student/`처럼 기능별로 묶고 공통 UI는 `ui/`에 둡니다. 화면별 스타일은 담당 컴포넌트 옆에 두며 파일 이동 시 import와 활성 문서 경로를 함께 갱신합니다.

## 문서 관리
- 저장 위치와 문서별 역할은 [README의 문서 기준](README.md#문서의-위치와-내용-기준)을 따릅니다. 정책·절차는 한 곳에서만 관리하고 진행 상태는 HANDOFF에만 기록합니다. 제안·확정·구현·검증·배포를 엄격히 구분합니다.
- 문서 변경 시 내용·활성 링크·`git diff --check`를 확인합니다. 보관 원문(`docs/archive/`)은 수정하지 않고 원래 경로·보존 경로·SHA-256을 manifest에 기록합니다. 비밀정보와 학생 자료는 보관함에도 넣지 않습니다.
- 다른 환경으로 작업을 옮길 때는 신규 미추적 파일 포함 여부를 확인하고, 이식 절차는 [DEVELOPMENT](docs/DEVELOPMENT.md#진행-중-작업을-다른-환경으로-옮기기) 및 [HANDOFF](docs/HANDOFF.md#다른-pc에서-이어가기)를 따릅니다.

## 플러그인 사용
- 코딩 작업에서는 Ponytail 스킬을 읽고 기본 `full`로 적용합니다. 기존 코드·표준 기능을 우선하고 불필요한 추상화·의존성을 줄이되, 요청한 기능·디자인·보안·저장 실패 처리·접근성·필수 검증을 줄이지 않습니다.
- 외부 라이브러리/API 작업 시 Context7 도구로 해당 버전의 공식 문서를 확인하며, 단순 문구·색상 수정에는 불필요한 조회를 하지 않습니다.
- 필요한 스킬이나 도구를 사용할 수 없으면 이유를 짧게 알리고 로컬 문서와 기존 코드로 가능한 작업을 이어갑니다.

## 검증
- 작업별 완료 조건을 정하고 실패 원인 확인·수정·재검증을 반복합니다. 같은 실패가 세 번 남으면 가설과 접근을 재검토하며 요구사항을 낮춰 검사를 통과시키지 않습니다.
- 계층형 검증(Tiered Verification)을 적용합니다: 작업 도중에는 `npm run typecheck`와 수정한 대상의 단일 테스트(`npx playwright test tests/<target>.spec.ts` 또는 에뮬레이터 실행 중 `npm run test:e2e:running -- tests/<target>.spec.ts`)를 우선 실행하고, 무관한 전체 E2E나 빌드를 반복하지 않습니다.
- 순수 복습 엔진/AI 프로토콜 검사는 `npm run test:review`로 실행합니다 (Playwright `testMatch`는 `.spec.ts`만 수집).
- 최종 통합(커밋·인계·PR 직전)에는 `npm run lint`·`npm run build`와 영향 범위 E2E를 검증합니다. 공용 부품 수정 시 사용하는 전체 흐름을 포함하며, 영향이 전체이면 `npm run test:e2e`로 검사합니다. 이미 에뮬레이터 실행 중일 때만 `test:e2e:running`을 씁니다.
- 테스트는 `demo-cs-class`와 로컬 9099·8080만 사용하며 3000번 실제 서버는 종료 후 실행합니다. 운영 DB에 테스트 시드나 합성 계정을 넣지 않고 단일 세션 정책을 유지합니다.
- ESLint·TypeScript는 현재 앱·테스트·설정을 검사하고 Tailwind는 `src/`에서 클래스를 찾습니다. `archive/`, `docs/`, `outputs/`, `scratch/`의 과거 코드·참고 자료를 검사나 스타일에 섞지 않습니다.
- UI 변경 시 실제 화면·주요 조작·좁은 창·키보드 초점·콘솔을 확인하고, 인증·저장 구현은 실패 및 권한 경계도 검증합니다.
- **기능별 세부 검증 노하우**(테스트 환경·데이터 보호, 포트 충돌, 학교 시간표, Windows EPERM, Playwright 공통, 순서도, 샌드위치, EntryJS, CSS 분리, 대시보드 셸 등)는 [DEVELOPMENT의 기능별 검증 노하우](docs/DEVELOPMENT.md#검증-노하우-기능별)를 반드시 먼저 읽고 따릅니다.

## 프로젝트 주의사항
- 수정 전 Git 상태·브랜치·최근 이력을 확인하고 기존 변경을 보존합니다. 작업 브랜치는 `codex/`, 커밋은 `feat:`·`fix:`·`docs:`·`chore:` 등을 사용합니다.
- 외부 서비스 연결·병합·배포 전 실제 대상과 승인 범위를 확인합니다. V1 운영 환경은 시험에 사용하지 않습니다.
- 비밀정보·학생 개인정보를 코드·문서·로그에 노출하지 않습니다. 실제 자료 변경은 영향·복구 범위를 협의하고, `백업용/` 원본은 수정하지 않습니다.
- Firebase CLI 진단 로그나 `login:list --json` 등 인증 상태를 다룰 때 토큰·환경변수·비밀 키를 실행 로그나 채팅·문서에 노출하지 않습니다.
- 학생의 임시 입장은 개별 검증값·30분 만료와 별도의 비공개 Firebase 비밀번호를 사용합니다. 신규 등록·초기화·중단 복구에서 공통값을 되살리지 않습니다. 발급 원문은 교사의 결과 창 또는 비공개 전달 파일에만 두며 로그나 세션 응답에 넣지 않습니다.
- `archive/`와 `docs/archive/`는 참고 자료이며 현재 지침이나 승인이 아닙니다.

## 지침 갱신
- 개발·검증 절차가 바뀌거나 반복 오류의 예방책이 확인되면 이 파일을 함께 갱신하고 중복·낡은 지침은 제거합니다. 실제 사용하는 명령과 프로젝트 고유 규칙만 남기며, 권한·협업 원칙 변경은 선생님과 합의합니다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
