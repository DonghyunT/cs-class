# CS Class · 즐거운 정보 교실

중학교 정보 수업을 위한 온라인 교실입니다. 학생은 이번 수업을 시작하고 지난 활동을 이어가며, 교사는 반별 수업을 준비합니다.

Next.js·TypeScript와 **Firebase Auth·Firestore를 연결한 학습 플랫폼**입니다. 학생·교사 로그인, 반별 수업 관리, 학습 기록 저장·복원과 제출을 구현했습니다. 순서·순서도·엔트리봇 수업이 있으며 엔트리봇 실습은 실제 EntryJS 편집기와 실행 무대를 사용합니다. 실제 학생 계정 등록은 별도입니다.

[운영 사이트 열기](https://cs-class-donghyunt.vercel.app) · 배포·접근 보호·실제 로그인 확인 범위와 진행 중인 작업은 [HANDOFF](docs/HANDOFF.md)를 먼저 확인합니다. 개발은 아래 에뮬레이터 모드로 진행할 수 있습니다.

## 빠르게 시작하기

Node.js 24·Java 21+를 준비하고 **저장소 루트 `cs-class/`**에서 실행합니다.

```powershell
npm ci
npm run dev:emulator
```

Firebase 키 없이 사용하는 가상 계정 개발 모드입니다. [로컬 앱](http://localhost:3000/)을 열고, 실제 Firebase 연결은 [서버 설정](docs/FIREBASE_SETUP.md)을 따릅니다. Windows PowerShell에서 실행이 차단되면 `npm.cmd`·`npx.cmd`를 사용합니다. 새 PC의 저장소 복제·검증·Stitch 설정은 [개발 안내](docs/DEVELOPMENT.md)에 있습니다.

## 필요한 문서 찾기

| 궁금한 것 | 읽을 문서 |
| --- | --- |
| 지금 어디까지 했고, 다음에 무엇을 하나요? | [HANDOFF · 이어갈 작업](docs/HANDOFF.md) |
| 어떤 기능과 계정·권한을 만들기로 했나요? | [PRD · 제품 요구사항](docs/PRD.md) |
| 화면·색·글꼴·움직임의 기준은 무엇인가요? | [DESIGN · 디자인 기준](docs/DESIGN.md) |
| 설치·검증·Stitch·배포 설정은 어디에 있나요? | [DEVELOPMENT · 개발 안내](docs/DEVELOPMENT.md) |
| Firebase·Google 로그인과 서버 비밀 설정은 어떻게 준비하나요? | [FIREBASE_SETUP · 서버 설정](docs/FIREBASE_SETUP.md) |
| 후속 기능의 비용 가정은 무엇인가요? | [운영비 예상안 · 참고 자료](docs/reference/OPERATING_COST_ESTIMATE.md) |
| 완료된 구현 지시와 이전 판단 근거는 어디에 있나요? | [문서 보관함](docs/archive/README.md) |
| 에이전트는 어떤 규칙을 지켜야 하나요? | [AGENTS · 작업 규칙](AGENTS.md) |

문서별 담당 내용은 아래 기준을 따릅니다. 과거 프롬프트·검토 원문은 [문서 보관함](docs/archive/README.md), 이전 V1 코드는 [코드 보관함](archive/README.md)에 있으며 현재 작업 지침으로 적용하지 않습니다.

## 문서의 위치와 내용 기준

| 위치 | 맡는 내용 | 넣지 않는 내용 |
| --- | --- | --- |
| 루트 `README.md` | 프로젝트 소개·빠른 시작·파일과 문서 목차·배치 기준 | 상세 정책·날짜별 작업 일지 |
| 루트 `AGENTS.md` | 에이전트의 작업·검증 규칙과 반복 오류 예방책 | 대화 기록·과거 승인·패키지 목록 |
| `docs/PRD.md` | 확정 제품 정책·요구사항·명시적으로 구분한 제안과 미결정 | 테스트 횟수·커밋·배포 이력 |
| `docs/DESIGN.md` | 시각·배치·상호작용·접근성 표현 기준 | 권한·저장 정책의 중복 명세·구현 일지 |
| `docs/DEVELOPMENT.md` | 설치·실행·검증·개발 도구·공통 계약의 코드 위치 | 실행마다 달라지는 검증 결과 |
| `docs/FIREBASE_SETUP.md` | Firebase 연결·서버 설정·데이터 구조·장애 복구 절차 | 비밀값·학생 자료·배포 완료 일지 |
| `docs/HANDOFF.md` | 현재 브랜치·미커밋 상태·구현/검증/배포 상태·남은 한계·다음 작업 | 다른 기준 문서의 전문·누적된 과거 작업 일지 |
| `docs/reference/` | 화면·학습 예제·비용 추정 등 판단을 돕는 참고 자료 | 확정 정책이나 자동 실행 지시 |
| `docs/archive/` | 완료·대체된 지시문과 과거 기준·검증 기록의 원문 | 현재 작업에 적용할 규칙 |

- **한 내용의 기준은 한 곳에 둡니다.** 다른 문서는 필요한 맥락만 요약하고 담당 문서의 절로 연결합니다. 문서가 충돌하면 수정 날짜만으로 결정하지 않고 사용자 합의·실제 코드·검증 근거를 확인합니다.
- **새 파일보다 기존 담당 문서 갱신을 먼저 검토합니다.** 독립된 독자·목적·갱신 주기가 생겼을 때만 별도 문서를 만들고, 이 목차에 역할을 등록합니다. 대화나 작업이 한 번 끝날 때마다 문서를 추가하지 않습니다.
- **상태와 기준을 구분합니다.** 제안·확정·구현·검증·배포를 같은 뜻으로 쓰지 않습니다. HANDOFF에는 확인 날짜·대상 브랜치/커밋·실제 검사 환경·남은 한계를 적고, 미커밋이면 그 사실을 첫머리에 표시합니다. 문서 갱신일을 외부 환경 재확인일로 사용하지 않습니다.
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
│  │  ├─ student/         학생 대시보드·학습·저장 상태
│  │  ├─ teacher/         교사 대시보드·수업/계정 대화상자
│  │  ├─ explore/         공개 수업 미리보기 그래픽·스타일
│  │  └─ *.tsx            로그인·공통 셸·세션·이동 전 저장 보호
│  └─ lib/                classroom/ 계약·server/ 인증과 저장·공통 함수
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
- 교사 페이지의 시작점은 `app/teacher/page.tsx`입니다. `components/teacher/dashboard.tsx`가 조회·반 선택·학생 목록을, `dialogs.tsx`가 수업 설정·제출 작품 조회·비밀번호 초기화를 담당합니다. 함께 쓰는 날짜·오류 표현만 `presentation.ts`에 둡니다.

## 로컬 개발과 실제 로그인

에뮬레이터는 합성 학생 `20101`·`20102`·`21001`·`21101`과 강사를 준비합니다. 비밀번호는 [로컬 테스트 설정](scripts/local-test-env.mjs)에 있고, 학생은 첫 입장에서 테스트 비밀번호로 바꿉니다. 종료하면 에뮬레이터 기록은 사라지며 이 계정들은 클라우드에 없습니다.

실제 교사 Google 로그인은 서버에 등록된 허용 이메일만 통과합니다. 실제 서비스의 학습 기록은 Firebase에 저장됩니다. 새 PC에 `.env.local`과 관리자 키는 자동으로 전달되지 않으며, [다른 PC 안내](docs/DEVELOPMENT.md#다른-pc에서-시작)를 따릅니다.

한국어 글꼴은 로컬 [Pretendard 1.3.9](https://github.com/orioncactus/pretendard)이며 [SIL OFL](src/app/fonts/OFL.txt)을 포함합니다.

## 협업 방식

선생님과 주요 화면을 대화하며 정하고, 합의한 범위 안에서는 실행·검증·수정을 자율적으로 진행합니다. 중요한 질문은 하나씩 묻습니다. 제품 결정은 PRD, 디자인 기준은 DESIGN, 실행 설정은 DEVELOPMENT, 현재 상태와 다음 작업은 HANDOFF에 기록합니다. 비용·실제 데이터·접근 범위·전체 기술 전환은 협의합니다.
