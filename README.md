# CS Class · 즐거운 정보 교실

중학교 정보 수업을 위한 온라인 교실입니다. 학생은 이번 수업을 시작하고 지난 활동을 이어가며, 교사는 반별 수업을 준비합니다.

현재는 Next.js·TypeScript로 만든 **화면 체험 시안**입니다. 공개 홈과 학생·교사 입장을 체험할 수 있으며, 실제 인증·저장·수업 콘텐츠는 아직 연결하지 않았습니다.

## 빠르게 시작하기

Node.js 24를 준비하고 **저장소 루트 `cs-class/`**에서 실행합니다.

```powershell
npm ci
npm run dev -- --hostname 127.0.0.1 --port 3000
```

[로컬 앱](http://127.0.0.1:3000/)을 엽니다. Windows PowerShell에서 실행이 차단되면 `npm.cmd`·`npx.cmd`를 사용합니다. 새 PC의 저장소 복제·검증·Stitch 설정은 [개발 안내](docs/DEVELOPMENT.md)에 있습니다.

## 필요한 문서 찾기

| 궁금한 것 | 읽을 문서 |
| --- | --- |
| 지금 어디까지 했고, 다음에 무엇을 하나요? | [HANDOFF · 이어갈 작업](docs/HANDOFF.md) |
| 어떤 기능과 계정·권한을 만들기로 했나요? | [PRD · 제품 요구사항](docs/PRD.md) |
| 화면·색·글꼴·움직임의 기준은 무엇인가요? | [DESIGN · 디자인 기준](docs/DESIGN.md) |
| 설치·검증·Stitch·배포 설정은 어디에 있나요? | [DEVELOPMENT · 개발 안내](docs/DEVELOPMENT.md) |
| 에이전트는 어떤 규칙을 지켜야 하나요? | [AGENTS · 작업 규칙](AGENTS.md) |

현재 결정은 위 문서에 기록합니다. 과거 프롬프트·검토 원문은 [문서 보관함](docs/archive/README.md), 이전 V1 코드는 [코드 보관함](archive/README.md)에 있으며 현재 작업 지침으로 적용하지 않습니다.

## 폴더 구조

```text
cs-class/
├─ README.md              처음 읽는 안내와 문서 목차
├─ AGENTS.md              에이전트 작업 규칙
├─ src/
│  ├─ app/                페이지·공통 레이아웃·스타일·글꼴
│  ├─ components/
│  │  ├─ home/            공개 홈의 구성·수업 시연·그래픽·입장창
│  │  ├─ ui/              버튼·입력창·대화상자 등 공통 UI
│  │  └─ *.tsx            로그인·교실·공통 셸·체험 상태
│  └─ lib/                가상 데이터·공통 함수
├─ tests/                 홈·로그인·대시보드 브라우저 검사
├─ public/                정적 파일 (현재 위치만 보존)
├─ scripts/               개발 도구 설정 보조
├─ docs/
│  ├─ PRD.md              제품 요구사항
│  ├─ DESIGN.md           디자인 기준
│  ├─ DEVELOPMENT.md      실행·검증·도구 설정
│  ├─ HANDOFF.md          현재 상태·다음 작업
│  ├─ reference/          승인된 화면·UI 학습 자료
│  └─ archive/            과거 문서 원문과 보존 목록
├─ archive/               이전 V1 코드 원문과 보존 목록
├─ outputs/               검토 산출물·로컬 전용 자료
├─ scratch/               로컬 임시 작업 (Git 제외)
└─ .github/workflows/     GitHub 자동 검사
```

루트의 `package.json`·잠금 파일·Next.js·TypeScript·ESLint·Playwright·Tailwind 설정은 개발 도구가 사용하는 위치에 둡니다. 문서처럼 `docs/`로 옮기지 않습니다. `public/`은 현재 `.gitkeep`으로 위치만 보존합니다.

`node_modules/`, `.next/`, `next-env.d.ts`, `*.tsbuildinfo`, `test-results/`, `playwright-report/`와 도구 로그는 설치·실행 중 생기는 파일입니다. Git에서 제외하며 직접 수정하지 않습니다. `outputs/` 전체를 일괄 추가하지 않습니다. 학생 계정 자료·키·`백업용/`은 로컬에만 보관합니다.

## 코드를 나누는 기준

- `app/`에는 URL별 페이지와 레이아웃을 둡니다. 화면이 단순하면 페이지 안에서 구현해도 됩니다.
- 서로 관련된 컴포넌트가 여러 개 생기면 `components/home/`처럼 기능별로 모읍니다. 상태와 조작이 한 단위인 부분을 함께 유지합니다.
- 여러 화면에서 쓰는 기본 부품은 `components/ui/`, 셸·브랜드 등 앱 공통 요소는 `components/`, 데이터·순수 함수는 `lib/`에 둡니다. 한 번 쓰는 작은 조각마다 폴더를 만들지는 않습니다.
- 홈의 시작점은 [public-home.tsx](src/components/home/public-home.tsx)입니다. 수업 시연·예제·역할 미리보기·포인터 효과를 같은 폴더에서 찾을 수 있습니다.
- 스타일은 `app/globals.css` → `experience.css` 순서로 공통 적용하고, 홈은 `public-home.css`를 추가합니다. 앞선 스타일을 뒤에서 덮어쓰는 규칙이 있으므로, 향후 로그인·대시보드 개선 때 해당 화면의 규칙과 시각 검증을 함께 정리합니다.

## 체험 계정

**체험 데이터는 메모리에만 유지되며 새로고침하면 초기화됩니다.** Google 버튼도 실제 OAuth가 아닌 화면 체험입니다. 실제 비밀번호를 입력하지 않습니다.

| 역할 | 입장 방법 |
| --- | --- |
| 학생 | `20101` / `class-demo` |
| 빈 교실 학생 | `21101` / `class-demo` |
| 교사 | Google 로그인 화면 체험 버튼 |
| 강사 | `teacher-demo` · 10·11반 범위 |

학생은 첫 입장에 시안용 새 비밀번호를 설정합니다. 한국어 글꼴은 로컬 [Pretendard 1.3.9](https://github.com/orioncactus/pretendard)이며 [SIL OFL](src/app/fonts/OFL.txt)을 포함합니다.

## 협업 방식

선생님과 주요 화면을 대화하며 정하고, 합의한 범위 안에서는 실행·검증·수정을 자율적으로 진행합니다. 중요한 질문은 하나씩 묻습니다. 제품 결정은 PRD, 디자인 기준은 DESIGN, 실행 설정은 DEVELOPMENT, 현재 상태와 다음 작업은 HANDOFF에 기록합니다. 비용·실제 데이터·접근 범위·전체 기술 전환은 협의합니다.
