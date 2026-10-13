# CS Class · 즐거운 정보 교실

중학교 정보 수업을 위한 온라인 교실입니다. 학생은 이번 수업을 시작하고 지난 활동을 이어가며, 교사는 반별 수업을 준비합니다.

Next.js·TypeScript와 **Firebase Auth·Firestore를 연결한 학습 플랫폼**입니다. 학생·교사 로그인, 반별 수업 관리, 학습 기록 저장·복원과 제출을 구현했습니다. 「프로그래밍의 기초」는 실제 EntryJS 편집기·무대를 사용하며, 문제 추상화·알고리즘 설계·순서도 연구소는 수업별 AI를 연결한 선택 복습 공간입니다. 실제 학생 계정 등록은 별도입니다.

수업 구성은 실제 EntryJS로 만든 [프로그래밍 13차시](docs/PRD.md#프로그래밍-13차시--실제-수업-구성)와 [세 복습 수업](docs/PRD.md#알고리즘-선택-복습--2026-10-05-확정)을 따릅니다. 복습 실습은 원작의 그림·색·조작을 살리고 성적에 반영하지 않습니다. [명부 준비·반별 발급 도구](docs/DEVELOPMENT.md#실학생-명부-준비와-반별-발급)도 마련했습니다. 현재 구현·검증·운영 반영과 남은 한계는 [HANDOFF](docs/HANDOFF.md#현재-작업-상태), 첫 실제 수업 준비는 [다음 작업](docs/HANDOFF.md#다음에-이어갈-작업)을 확인합니다.

모든 수업은 공통 헤더·개념/퀴즈/실습 탐색·진도 표시를 사용합니다. 세 복습은 V1의 실습 흐름을 복원하고 기존 작품·제출 기록을 보존합니다. 실습 집중 모드, 교사 반 준비표·실제 수업 미리보기와 안전한 실패 진단도 제공합니다. 최신 검증·배포 상태와 학교 환경 등 남은 확인 범위는 [HANDOFF](docs/HANDOFF.md#현재-작업-상태)에서 구분합니다.

학생·교사 공통 대시보드에 개인 할 일·이번 달 달력과 반 일정, 조회 대기 안내를 제공합니다. 금옥중학교 반별 정보 교시의 일일 갱신·교사용 갱신은 [시간표 연동](docs/DEVELOPMENT.md#학교-시간표-연동)을 따릅니다. 수업 목록·교사의 학생 현황과 수업 관리는 별도 메뉴에서 확인합니다. 로컬 확인은 [파일럿 실행 안내](docs/DEVELOPMENT.md#대시보드-파일럿)를 따릅니다.

학생/교사 진도 그래프·작은 목록/격자, 개인 설정, 우리 반 질문·답변·해결, 저장된 실습을 확인하는 손들기를 연결했습니다. 일정은 대시보드 달력에서 접근합니다. 기능 정책은 [PRD](docs/PRD.md), 검증 범위와 커밋·병합·운영 반영 상태는 [HANDOFF](docs/HANDOFF.md#현재-작업-상태)에서 확인합니다.

[운영 사이트 열기](https://cs-class-donghyunt.vercel.app) · 배포·접근 보호·실제 로그인 확인 범위와 진행 중인 작업은 [HANDOFF](docs/HANDOFF.md)를 먼저 확인합니다. 개발은 아래 에뮬레이터 모드로 진행할 수 있습니다.

학생 수업의 편집 내용은 상단 **저장** 버튼이나 **Ctrl+S**(Mac: Cmd+S)로 저장합니다. 저장 중 더 입력한 내용은 다음 저장 때 반영됩니다. 채점·제출·AI 요청·손들기는 필요한 작품을 함께 저장합니다. 읽는 단계나 미션만 바꾸면 저장 경고가 없으며, 수업 밖으로 나갈 때 미저장 내용이 있으면 **저장 후 나가기 / 저장하지 않고 나가기 / 취소**를 선택합니다. 새로고침·창 종료 전에 저장해주세요. 교사 체험은 이 창에서만 유지됩니다. 이 변경의 로컬 검증·운영 미반영 상태는 [HANDOFF](docs/HANDOFF.md#현재-작업-상태)를 확인합니다.

## 빠르게 시작하기

개발·로컬 관련 검사 → 작업 브랜치 push → 완료한 작업을 main에 반영 → CI와 Vercel 빌드 → 검사 성공 후 운영 공개 순서입니다. PR은 선택 사항이며 작업 브랜치에는 자동 CI·Preview가 없습니다. [검사·수동 실행](docs/DEVELOPMENT.md#검증)과 [Preview·배포](docs/FIREBASE_SETUP.md#vercel-서버-설정)를 확인합니다.

Node.js 24·Java 21+를 준비하고 **저장소 루트 `cs-class/`**에서 실행합니다.

```powershell
npm ci
npm run dev:emulator
```

Firebase 키 없이 사용하는 가상 계정 개발 모드입니다. [로컬 앱](http://localhost:3000/)을 열고, 실제 Firebase 연결은 [서버 설정](docs/FIREBASE_SETUP.md)을 따릅니다. Windows PowerShell에서 실행이 차단되면 `npm.cmd`·`npx.cmd`를 사용합니다. 새 PC의 저장소 복제·검증·Stitch 설정은 [개발 안내](docs/DEVELOPMENT.md)에 있습니다.

[프로그래밍 13차시 프로토타입](https://cs-class-donghyunt.vercel.app/prototype/programming)은 로그인 없이 개념–퀴즈–실습과 도움·교사 피드백을 체험하는 화면입니다. [로컬 체험](http://localhost:3000/prototype/programming)도 같은 경로로 열립니다. 이름 짓기는 실제 EntryJS, 다른 미션은 미니 작업실을 사용합니다. 학습 초안은 이 탭에만 보관하며 실제 수업 제출·교사 전송은 연결하지 않습니다. 최종 정책과 구분한 범위는 [PRD](docs/PRD.md#프로그래밍-13차시--경험-검토용-프로토타입)를 따릅니다.

**다른 PC에서 이어갈 때는** 기존 미커밋·미추적 변경을 보존하고 [HANDOFF의 현재 상태](docs/HANDOFF.md#현재-작업-상태)에서 기준 브랜치·릴리스 SHA·전달할 파일을 먼저 확인합니다. [재개 명령·전달 경계·새 대화용 요청문](docs/HANDOFF.md#다른-pc에서-이어가기)을 따라 진행하고, 설치·실행 환경은 [다른 PC 개발 안내](docs/DEVELOPMENT.md#다른-pc에서-시작)를 따릅니다.

## 필요한 문서 찾기

| 궁금한 것 | 읽을 문서 |
| --- | --- |
| 지금 어디까지 했고, 다음에 무엇을 하나요? | [HANDOFF · 이어갈 작업](docs/HANDOFF.md) |
| 어떤 기능과 계정·권한을 만들기로 했나요? | [PRD · 제품 요구사항](docs/PRD.md) |
| 화면·색·글꼴·움직임의 기준은 무엇인가요? | [DESIGN · 디자인 기준](docs/DESIGN.md) |
| 설치·검증·Stitch·개발 도구는 어디에 있나요? | [DEVELOPMENT · 개발 안내](docs/DEVELOPMENT.md) |
| Firebase·Google 로그인과 서버 비밀 설정은 어떻게 준비하나요? | [FIREBASE_SETUP · 서버 설정](docs/FIREBASE_SETUP.md) |
| 후속 기능의 비용 가정은 무엇인가요? | [운영비 예상안 · 참고 자료](docs/reference/OPERATING_COST_ESTIMATE.md) |
| 알고리즘 세 수업의 원본과 AI 품질 근거는 어디에 있나요? | [알고리즘 복습 · 원본 이식과 품질 검증](docs/reference/algorithm-review-integration.md) |
| 원본 PPT 없이 13차시 내용과 체험을 어떻게 파악하나요? | [프로그래밍 13차시 · 수업 자료와 체험 기록](docs/reference/programming-13.md) |
| 컨설팅의 개선 제안과 실행 순서는 무엇인가요? | [진단 보고서](docs/archive/cs-class/2026-10-10-before-consulting-release/project-consulting-2026-10-08.md) · [승인된 후속 개선 계획](docs/archive/cs-class/2026-10-10-before-consulting-release/consulting-improvement-plan-2026-10-08.md) |
| 수업에 들어간 뒤 사용하는 공통 UI는 어떻게 구성하나요? | [공통 수업 화면 기준](docs/DESIGN.md#수업-전용-공통-틀) |
| 완료된 구현 지시와 이전 판단 근거는 어디에 있나요? | [문서 보관함](docs/archive/README.md) |
| 에이전트는 어떤 규칙을 지켜야 하나요? | [AGENTS · 작업 규칙](AGENTS.md) |

문서별 담당 내용은 아래 기준을 따릅니다. 과거 프롬프트·검토 원문은 [문서 보관함](docs/archive/README.md), V1 초기 보관본과 GitHub 최신 소스 참고본은 [코드 보관함](archive/README.md)에 있으며 현재 작업 지침으로 적용하지 않습니다.

## 문서의 위치와 내용 기준

| 위치 | 맡는 내용 | 넣지 않는 내용 |
| --- | --- | --- |
| 루트 `README.md` | 프로젝트 소개·빠른 시작·파일과 문서 목차·배치 기준 | 상세 정책·날짜별 작업 일지 |
| 루트 `AGENTS.md` | 에이전트의 작업·검증 규칙과 반복 오류 예방책 | 대화 기록·과거 승인·패키지 목록·기능별 검증 상세 |
| `docs/PRD.md` | 확정 제품 정책·요구사항·명시적으로 구분한 제안과 미결정 | 테스트 횟수·커밋·배포 이력·화면별 UI 수치·완료 상태 서술 |
| `docs/DESIGN.md` | 시각·배치·상호작용·접근성 표현 기준 | 권한·저장 정책의 중복 명세·화면별 구현 일지·완료 상태 서술 |
| `docs/DEVELOPMENT.md` | 설치·실행·검증·기능별 검증 노하우·개발 도구·공통 계약의 코드 위치 | 실행마다 달라지는 검증 결과·과거 파일럿 일지·완료 상태 서술 |
| `docs/FIREBASE_SETUP.md` | Firebase 연결·서버 설정·데이터 구조·장애 복구 절차 | 비밀값·학생 자료·배포 완료 일지 |
| `docs/HANDOFF.md` | 현재 브랜치·미커밋 상태·구현/검증/배포 상태·남은 한계·다음 작업 | 다른 기준 문서의 전문·누적된 과거 작업 일지 |
| `docs/superpowers/plans/` | 실행 에이전트용 진행 중 계획·작업 순서·회귀/완료 조건 | 지속 정책의 중복·완료된 작업 이력 |
| `docs/reference/` | 화면·학습 예제·측정 원본·비용 추정 등 판단을 돕는 자료 | 확정 정책이나 자동 실행 지시 |
| `docs/archive/` | 완료·대체된 지시문과 과거 기준·검증 기록의 원문 | 현재 작업에 적용할 규칙 |

- **한 내용의 기준은 한 곳에 둡니다.** 다른 문서는 필요한 맥락만 요약하고 담당 문서의 절로 연결합니다. 문서가 충돌하면 수정 날짜만으로 결정하지 않고 사용자 합의·실제 코드·검증 근거를 확인합니다.
- **새 파일보다 기존 담당 문서 갱신을 먼저 검토합니다.** 독립된 독자·목적·갱신 주기가 생겼을 때만 별도 문서를 만들고, 이 목차에 역할을 등록합니다. 대화나 작업이 한 번 끝날 때마다 문서를 추가하지 않습니다.

저장·검증 개선은 [통합 계획](docs/superpowers/plans/2026-10-13-scoped-verification.md)을 검토 중입니다. 먼저 [저장 버튼·Ctrl+S 방식](docs/superpowers/plans/2026-10-13-manual-save.md)으로 편집 중 서버 호출을 줄이고, 이후 바꾼 기능에 필요한 검사만 선택합니다. 작품을 바꾸는 수정은 저장 후 새로고침 복원을 확인하며, 로그인 검사는 영향이 있을 때 포함합니다. 공통 기능이나 영향이 불분명한 변경은 전체 검사를 유지합니다. 현재 적용 여부는 [인계 문서](docs/HANDOFF.md#현재-작업-상태)에서 확인합니다.
- **상태와 기준을 구분합니다.** 제안·확정·구현·검증·배포를 같은 뜻으로 쓰지 않으며, 진행 상태와 완료 일지는 HANDOFF에만 둡니다. HANDOFF에는 확인 날짜·대상 브랜치/커밋·실제 검사 환경·남은 한계를 적고, 미커밋이면 그 사실을 첫머리에 표시합니다. 문서 갱신일을 외부 환경 재확인일로 사용하지 않습니다.
- **자료의 수명을 표시합니다.** 참고 자료는 목적·출처·검토일·적용 한계를 적습니다. 완료된 지시문이나 길어진 이력은 유효한 내용을 담당 문서에 반영한 뒤 보관합니다. 사소한 수정마다 전체 스냅샷을 만들지는 않습니다.
- **보관 원문은 그대로 둡니다.** `docs/archive/cs-class/YYYY-MM-DD-주제/`에 원문과 `manifest.json`의 원래 경로·보존 경로·SHA-256을 남기고 보관 목차에 이유를 적습니다. 옛 경로·승인·날짜는 원문에서 현대화하지 않으며 보관된 AGENTS는 `AGENTS-historical.md`처럼 자동 적용되지 않는 이름을 사용합니다.
- **이동은 참조 갱신까지가 한 작업입니다.** 활성 문서의 링크·앵커·본문 경로와 README 목차를 함께 수정합니다. 필요한 참고 자료는 Git에 포함하고, 비밀정보·학생 자료·로컬 임시 결과는 포함하지 않습니다. 임시 출력은 `scratch/`에 둡니다.

## 폴더 구조

```text
cs-class/
├─ README.md              처음 읽는 안내와 문서 목차
├─ AGENTS.md              에이전트 작업 규칙
├─ src/
│  ├─ app/                페이지·서버 API·레이아웃·스타일·글꼴
│  ├─ components/
│  │  ├─ home/            공개 홈의 구성·수업 시연·그래픽·입장창
│  │  ├─ ui/              버튼·입력창·대화상자 등 공통 UI
│  │  ├─ dashboard/       공통 대시보드·개인 할 일·반 일정·저장 상태
│  │  ├─ student/         열린 수업·학습·저장 상태
│  │  ├─ teacher/         학생 현황·반 준비·실제 수업 체험·수업/계정 대화상자
│  │  ├─ explore/         공개 수업 미리보기 그래픽·스타일
│  │  ├─ prototype/       programming/ 한 차시 체험·개념·퀴즈·실습·도움
│  │  └─ *.tsx            로그인·공통 셸·세션·이동 전 저장 보호
│  └─ lib/                classroom/ 계약·server/ 인증과 저장·prototype/ 체험 데이터·실행
├─ tests/                 홈·로그인·대시보드 브라우저 검사
├─ public/entryjs/        EntryJS 작업실·설치 시 생성되는 브라우저 자산
├─ scripts/               개발·에뮬레이터·EntryJS 자산 준비 도구
├─ docs/
│  ├─ PRD.md              제품 요구사항
│  ├─ DESIGN.md           디자인 기준
│  ├─ DEVELOPMENT.md      실행·검증·도구 설정
│  ├─ HANDOFF.md          현재 상태·다음 작업
│  ├─ FIREBASE_SETUP.md   Firebase 연결·검증·운영 복구
│  ├─ reference/          화면·UI 학습 자료·운영비 예상안
│  └─ archive/            과거 문서 원문과 보존 목록
├─ archive/               이전 V1 코드 원문과 보존 목록
├─ outputs/               검토 산출물·로컬 전용 자료
├─ scratch/               로컬 임시 작업 (Git 제외)
└─ .github/workflows/     GitHub 자동 검사
```

루트의 `package.json`·잠금 파일·Next.js·TypeScript·ESLint·Playwright·Tailwind 설정은 개발 도구가 사용하는 위치에 둡니다. 문서처럼 `docs/`로 옮기지 않습니다. `public/entryjs/vendor/`는 설치·빌드 때 생성하며 Git에서 제외합니다. 버전·무결성·실행 구조는 [EntryJS 개발 안내](docs/DEVELOPMENT.md#entryjs-실습)를 따릅니다.

`node_modules/`, `.next/`, `next-env.d.ts`, `*.tsbuildinfo`, `test-results/`, `playwright-report/`와 도구 로그는 설치·실행 중 생기는 파일입니다. Git에서 제외하며 직접 수정하지 않습니다. `outputs/` 전체를 일괄 추가하지 않습니다. 학생 계정 자료·키·`백업용/`은 로컬에만 보관합니다.

## 코드를 나누는 기준

- `app/`에는 URL별 페이지와 레이아웃을 둡니다. 화면이 단순하면 페이지 안에서 구현해도 됩니다.
- 서로 관련된 컴포넌트가 여러 개 생기면 `components/home/`처럼 기능별로 모읍니다. 상태와 조작이 한 단위인 부분을 함께 유지합니다.
- 여러 화면에서 쓰는 기본 부품은 `components/ui/`, 셸·브랜드 등 앱 공통 요소는 `components/`, 데이터·순수 함수는 `lib/`에 둡니다. 한 번 쓰는 작은 조각마다 폴더를 만들지는 않습니다.
- 홈의 시작점은 [public-home.tsx](src/components/home/public-home.tsx)입니다. 수업 시연·예제·역할 미리보기·포인터 효과를 같은 폴더에서 찾을 수 있습니다.
- `app/globals.css`는 글꼴·색상·기본 요소·공통 UI·브랜드를 담당합니다. 홈 스타일은 `components/home/public-home.css`, 셸·로그인·세션 안내·학생·교사·수업 미리보기 스타일은 담당 컴포넌트 옆의 CSS Module에 둡니다.
- 학생·교사 첫 화면은 `components/dashboard/dashboard.tsx`를 사용하며 목록·일정·스타일을 같은 폴더에 둡니다. 학생 수업 목록은 `app/student/lessons/page.tsx`로 연결합니다.
- 학생 수업은 `components/student/lesson-shell.tsx`의 공통 상단·단계 탐색, `lesson-workspace.tsx`의 학생 저장 래퍼와 `lesson-editor.tsx`의 공용 화면을 사용합니다. 일반 개념/퀴즈는 `lesson-concept-panel.tsx`·`lesson-quiz-panel.tsx`, 집중 모드의 접힌 안내는 `practice-guidance.tsx`에 둡니다. 복습 화면은 `student/review/`, 순수 실행·검사는 `lib/classroom/review/`에 모읍니다. 실제 교사 체험의 저장 경계는 [개발 안내](docs/DEVELOPMENT.md#교사-수업-준비와-실제-미리보기)를 따릅니다.
- 교사 상세 페이지는 `app/teacher/classes/page.tsx`·`app/teacher/students/page.tsx`입니다. `components/teacher/dashboard.tsx`가 조회·반 선택·학생 목록을, `dialogs.tsx`가 수업 설정·제출 작품 조회·비밀번호 초기화를 담당합니다. 준비표는 `class-preparation-table.tsx`, 교사 실제 수업 체험은 `app/teacher/preview/[id]/page.tsx`·`components/teacher/lesson-preview.tsx`·`use-preview-work.ts`와 전용 평가 API를 사용합니다. 함께 쓰는 날짜·오류 표현만 `presentation.ts`에 둡니다.
- `app/student/community`·`app/teacher/community`는 `components/community`의 반 질문으로, 각 `settings` 페이지는 `components/settings`의 개인 설정으로 연결합니다. 손들기 UI는 `components/classroom`, 권한과 저장은 `lib/server/community.ts`·`help.ts`·기존 인증 서비스가 담당합니다. 교사 공통 반 선택은 `components/teacher/teacher-toolbar.tsx`를 사용합니다.
- 프로그래밍 체험의 진입점은 [page.tsx](src/app/prototype/programming/page.tsx), 전용 UI와 CSS는 `components/prototype/programming/`, 체험 상태·순수 실행/조건 확인·복원은 [programming.ts](src/lib/prototype/programming.ts)에 둡니다. 운영·체험 공통 문항은 [programming-data.ts](src/lib/classroom/programming-data.ts), 공통 개념 UI·인접 CSS는 [programming-concept.tsx](src/components/student/programming-concept.tsx), 이름 작품 처리는 [name-entry.ts](src/lib/classroom/name-entry.ts)입니다. 대상 검사는 [programming-prototype.spec.ts](tests/programming-prototype.spec.ts)·[name-entry-pilot.spec.ts](tests/name-entry-pilot.spec.ts)이며 호환 경계는 개발 안내를 먼저 읽습니다.

## 로컬 개발과 실제 로그인

에뮬레이터의 [학생 입장](http://localhost:3000/login/student)·[교사 입장](http://localhost:3000/login/teacher)에서 `게스트 학생`·`게스트 교사`로 바로 체험합니다. 계정·기록의 수명과 일반 합성 계정 테스트는 [개발 안내](docs/DEVELOPMENT.md#로컬-게스트-입장)를 따릅니다. 운영 사이트에는 게스트 입장이 없습니다.

실제 교사 Google 로그인은 서버에 등록된 허용 이메일만 통과합니다. 실제 서비스의 학습 기록은 Firebase에 저장됩니다. 새 PC에 `.env.local`과 관리자 키는 자동으로 전달되지 않으며, [다른 PC 안내](docs/DEVELOPMENT.md#다른-pc에서-시작)를 따릅니다.

한국어 글꼴은 로컬 [Pretendard 1.3.9](https://github.com/orioncactus/pretendard)이며 [SIL OFL](src/app/fonts/OFL.txt)을 포함합니다.

## 협업 방식

선생님 혼자 개발하는 흐름에 맞춰 합의한 범위의 실행·검증·수정을 자율적으로 진행합니다. 작업 브랜치 push는 보관·전달용이고 Preview는 사용자 선택이 있을 때만 생성합니다. 중요한 질문은 하나씩 묻습니다. 제품 결정은 PRD, 디자인 기준은 DESIGN, 실행 설정은 DEVELOPMENT, 현재 상태와 다음 작업은 HANDOFF에 기록합니다. 비용·실제 데이터·접근 범위·전체 기술 전환은 협의합니다.
