# 이어갈 작업

## 현재 작업 상태

2026-10-13(Asia/Seoul). **문서 다이어트 1단계(규칙 확정 및 DEVELOPMENT·AGENTS 정리)를 완료하고 사용자 최종 확인 대기 중입니다.**
- 작업 브랜치: `codex/docs-slimming`
- 작업 커밋:
  - `b94738a`: `docs: preserve originals before documentation slimming [skip ci]` (원본 아카이브 및 SHA-256 매니페스트)
  - `8fd75ea`: `docs: clarify document responsibilities [skip ci]` (README 문서 기준 및 상태/기준 분리)
  - `c82fd18`: `docs: consolidate verification know-how into DEVELOPMENT [skip ci]` (DEVELOPMENT 낡은 이력 정리 및 기능별 검증 노하우 신설)
  - `cd1a045`: `docs: slim AGENTS.md and link verification know-how [skip ci]` (AGENTS.md 21.0KB -> 7.0KB 감량)
- 앱 소스 코드는 변경하지 않았습니다. A4 자체검증(상대 파일 링크 100% 유효, 앵커 헤더 일치, git diff --check 통과, 보관 해시 일치, 핵심 키워드/조건 보존)을 완료했습니다.
- 사용자 승인 전에는 main 병합 및 원격 push를 진행하지 않습니다. 후속 단계는 PRD/DESIGN 감량입니다.

2026-10-13 직전 릴리스: 사용자 요청의 수업 화면·순서도 수정과 운영 공개를 마쳤습니다. 앱·검사 `9576cd9`를 [PR #34](https://github.com/DonghyunT/cs-class/pull/34)로 병합했고 앱 릴리스 기준은 `main@8e32f7c`입니다. 문서 마감 브랜치 `codex/lesson-release-handoff`의 변경은 문서만 포함합니다. 이 문서에 적힌 검증은 아래 날짜·범위의 결과이며 문서 마감 뒤 새로 실행한 전체 검사로 표현하지 않습니다.

## 이번 릴리스의 변경

- 프로그래밍의 첫 개념에 프로그래밍·프로그래밍 언어·프로그램의 관계를 모으고, 기존 개념 ID·답안·완료 기록을 보존합니다. 현재 작품의 수동 제출 성공 뒤 다음 미션을 강조하고 초점을 옮기며 이전 미션도 같은 줄에서 선택합니다.
- 공통 수업 헤더는 화면 양끝 여백과 큰 제목·제목 옆 상태 배지를 사용합니다. 이번 수업 링크는 아래 줄에, 집중 모드 전환은 단계 탐색 줄 오른쪽에 둡니다. 복습의 중복 실습 제목과 넓게 보기 버튼을 제거합니다.
- 순서도 퍼즐1–3은 AI 진단 대신 실행 성공으로 복습 기록을 남깁니다. 자유 작업실은 기획서300px·색/아이콘/+ 추가 버튼·통합 도구·작은 팔레트·얇은 실행바를 사용합니다. 예시 공방은 실행 과정을 제거하고 상단 도구를 통합하며, 퍼즐의 출력 콘솔/다음 미션 공간과 분기선·캔버스 범위를 보완합니다.
- GIF의 검은 사각 겹침은 SVG 기본 초점 테두리였습니다. 기본 사각 테두리·드래그 중 글자 선택을 막고 스크롤 없는 초점을 지정했습니다. 도형의 선택·키보드 초점 표시와 실제 편집·연결·이동은 유지합니다.
- 추상화는 최초 한 번 맛보기·단계별 닥터 대화·관측 요소7개·선택한 요소만 버리기·자연어 계획/처방전을 제공합니다. 기존 초안·이전 제출·완료를 보존합니다. 학생 저장은 useWork, 교사 체험은 메모리 경계를 유지합니다.

확정 정책은 [PRD](PRD.md), 화면 기준은 [DESIGN](DESIGN.md), 설치·복구는 [DEVELOPMENT](DEVELOPMENT.md)에 모읍니다. 상세 작업 이력과 완료된 계획은 [정리 전 원문/해시](archive/cs-class/2026-10-13-before-lesson-release/manifest.json)에 보존했습니다.

## 검증 상태

| 날짜·환경 | 실제 범위·결과 | 한계 |
|---|---|---|
| 10/12–10/13 Windows·Node24·Java21·Chromium·demo Auth9099/Firestore8080·빌드된 next start | 화면 개선 전체 E2E384개 통과, skip/flaky/실행 오류0. FHD·낮은 창·모바일·모의200%·키보드·저장/제출 복구 확인 | 드래그 후속 수정 전 결과 |
| 10/13 같은 로컬 환경 | 드래그 후 순서도6파일 E2E46개 통과(2.5분), skip/flaky/실행 오류0. 타입·린트·빌드·기본 테두리 없는 실제 캡처 확인 | 전체384 이후 변경은 FlowDiagram TSX/CSS와 해당 회귀 검사3파일뿐임을 840파일 해시로 대조 |
| 10/13 릴리스 준비 | 순수 복습 엔진/AI 검사16개 통과. main부터 미추적 신규 검사까지 독립 리뷰에서 중요 결함 없음 | 운영 실제 로그인·AI·저장 성공을 뜻하지 않음 |
| 10/13 첫 Linux CI | 383개 통과·Windows 전용1개 skip·모바일 배치 계측1개 실패 | 초점이 iframe에 있는 화면 크기 변경 뒤 두 요소의 위치를 서로 다른 시점에 읽은 검사. 같은 evaluate에서 함께 읽도록 수정했으며 기준·허용오차는 유지 |
| 10/13 Windows·기존 빌드·demo | 수정한 작업실 검사5개 통과(26초), skip/flaky/오류0·타입 검사 통과. 390/320px의 실제 안내–작업실 간격16px 확인 | 앱 소스 변경 없이 테스트 계측만 수정한 9576cd9의 전체 CI 결과는 아래에 별도 기록 |
| 10/13 Linux GitHub CI·9576cd9·demo 에뮬레이터·빌드된 앱 | 타입·린트·빌드·순수 검사와 전체 E2E384개 통과(28.1분), 실패0 | Windows .NET 도구 전용1개만 의도적으로 skip. [최종 CI](https://github.com/DonghyunT/cs-class/actions/runs/38275942490)는 이전 로컬 결과와 구분 |

로컬 보고서는 Git 제외 `scratch/lesson-layout-round3-20261012/`와 `scratch/flowchart-drag-20261013/`에 있습니다. 최신 릴리스의 GitHub CI는 아래 통합·배포 절에서 별도로 기록합니다.

## 통합·배포 상태

대상은 GitHub `DonghyunT/cs-class`와 Vercel `cs-class`(`prj_RUUtcTMukVY9kjudgDr6VA89KKxP`) Production, [운영 주소](https://cs-class-donghyunt.vercel.app)입니다. [최종 CI](https://github.com/DonghyunT/cs-class/actions/runs/38275942490) 성공 뒤 PR34를 `8e32f7c890b21125e48f4155ad70c87c60d1aa23`에 병합했습니다. 자동 Git 배포 `dpl_91NMBykiTbhEjrRnRB2ZuTjPEJXy`의 READY·동일 SHA·icn1·운영 별칭을 확인했습니다. 문서 마감은 실행 소스와 설정을 바꾸지 않으므로 이후 main SHA와 이 앱 릴리스 SHA를 구분합니다.

10/13 07:48 KST 운영 읽기 전용 확인: `/api/auth/config`의 운영 Firebase 프로젝트·configured=true·emulatorHost=null·게스트 비활성, `/api/auth/session` 200·익명 session=null, 익명 학생/교사 조회와 인증 없는 Cron 각각401, 이전 sigma 주소의 경로·쿼리를 보존한307 이동을 확인했습니다. Chromium 학생/교사1280px·교사390px 로그인 화면에서 버튼 준비·가로 넘침 없음·page/console 오류0을 확인했습니다. 실제 Google OAuth 로그인·AI 호출·작품 저장은 시도하지 않았습니다. 근거는 Git 제외 `scratch/release-20261013/after-deploy/`에 있습니다.

앞선 9576cd9 Preview는 `git_info_fail`로 실패했고 운영 빌드는 정상 완료했습니다. 로그 API의403으로 Preview의 상세 원인은 확정하지 않았습니다. 운영 성공과 별개로 추후 Preview 배포가 반복 실패하면 Git 연결 상태와 해당 로그 접근을 점검합니다. 복구 기준은 이전 `main@5bb859c`·`dpl_FLZduiMH4ULDN9j9t6vkv9YGKwJF` READY·icn1이며 서버 설정·복구 절차는 [서버 안내](FIREBASE_SETUP.md#vercel-서버-설정)를 따릅니다.

## 다음에 이어갈 작업

1. 오늘 릴리스의 운영 화면에서 순서도 드래그·분기·출력 콘솔과 프로그래밍 제출 뒤 다음 미션 흐름을 사용자 관점에서 확인합니다. 새 요구사항은 여기서 이어받습니다.
2. [첫 실제 수업 확인 순서](DEVELOPMENT.md#첫-실제-수업-확인-순서)에 따라 학교 PC·학교망·물리 한글 입력기와 승인 계정의 실제 로그인/저장·실학생 사용을 확인합니다.
3. 실제 Solar 응답 품질과 호출/실패 집계를 관찰합니다. 로컬 합성 AI 결과를 실제 제공자 검증으로 확대하지 않습니다.

## 다른 PC에서 이어가기

`git status -sb` → `git branch -vv` → `git fetch --prune origin` → 이 문서와 실제 HEAD 대조 순서로 시작합니다. 기존 미커밋·미추적 파일과 로컬 기록을 보존한 뒤 의도한 브랜치로 전환합니다. 완료된 릴리스 뒤 깨끗한 main에서는 `git pull --ff-only origin main`으로 이어갑니다.

Node24·Java21+·Chromium과 PC별 준비는 [개발 안내](DEVELOPMENT.md#다른-pc에서-시작)를 따릅니다. `npm.cmd ci`가 EntryJS 자산을 준비합니다. 기본 dev:emulator는 시드를 다시 쓰므로 기존 기록이 있으면 먼저 export하고 [시드 없는 복원](DEVELOPMENT.md#기존-demo-기록을-복원해-보기)을 사용합니다.

### 로컬 기록과 전달 경계

이 PC의 최신 복원 기준은 Git 제외 `scratch/release-20261013/demo-before-ci-debug/`입니다. 추가 CI 계측 검증 전에 사용자가 수정한 최신 기록을 export하고 시드 없이 복원했습니다. 복원 직후 반11개·작품4개와 정렬 해시를 기록했고 미리보기 재연결 뒤에도 두 해시의 일치를 확인했습니다. `scratch/flowchart-drag-20261013/demo-before/`와 앞선 `scratch/lesson-layout-round3-20261012/demo-before/`·`scratch/feedback-20261012/demo-before-tests/`는 이전 시점의 보관본입니다. 이후 체험한 기록은 새 export로 남깁니다.

미리보기는 demo Auth9099/Firestore8080과 `node scratch/lesson-layout-round3-20261012/preview.mjs`의 빌드된 localhost3000을 사용하며 시드를 실행하지 않습니다. 학생 로그인·세션 API200과 demo 프로젝트/로컬 호스트를 확인했습니다. 기존 브라우저 쿠키의 실제 이어가기 성공까지 자동 검증한 결과는 아닙니다.

Git은 코드·검사·문서만 전달합니다. 비밀 설정·관리자 키·개인 도구·로컬 기록·scratch/outputs·node_modules·빌드/브라우저/Java 캐시는 별도입니다. 필요한 기록은 비공개 경로로 전달해 대상의 기존 기록과 대조합니다. 운영 체험 계정/명부는 [계정 안내](FIREBASE_SETUP.md#승인된-운영-테스트-계정)·[명부 절차](DEVELOPMENT.md#실학생-명부-준비와-반별-발급)를 따릅니다.

### 새 대화에 붙일 요청문

> CS Class의 오늘 릴리스를 이어주세요. Git 변경과 로컬 기록을 먼저 보존하고 AGENTS.md → docs/HANDOFF.md → 필요한 기준 문서를 읽어주세요. 최신 HEAD·배포 SHA·미커밋 상태와 과거 검증 범위를 구분해주세요. 공통 LessonShell·useWork 단일 저장·기존 초안/이전 제출·명시 AI·실패/지연 응답 보호를 유지해주세요. 새 수정 요구사항은 제가 설명하겠습니다.

## 남은 한계와 다음 결정

운영 계정 로그인·실제 AI·저장/제출, 물리 한글 입력기·학교망·실기기 터치/화면 읽기·실제200% 확대·프린터·자연 Cron은 해당 환경에서 확인합니다. 강제 종료한 미전송 초안의 복구 경계는 [저장 정책](PRD.md#작업-저장과-통신-비용)을 따릅니다. 이전 의존성/인증 키/운영 로그 접근의 미해결 기록은 보관 원문에 남아 있으며 이번 화면 릴리스로 해결됐다고 판단하지 않습니다.

## 과거 구현·검증·운영 근거

[문서 보관함](archive/README.md)에서 이전 릴리스·완료 계획·원문 해시를 확인합니다. 10/12 PR #32의 상세 배포·검증과 371/384/46개 검사 이력은 [이번 정리 전 인계](archive/cs-class/2026-10-13-before-lesson-release/HANDOFF.md)에 보존했습니다. 아래 앵커는 기존 문서의 진입점을 유지합니다.

### 10/5 원작 실습 UI 복원 공개

[당시 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#105-원작-실습-ui-복원-공개)을 따릅니다.

### 10/5 세 복습 운영 공개

[당시 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#105-세-복습-운영-공개)을 따릅니다.

### 10/4 실제 수업·시간표 운영 릴리스

[당시 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#104-실제-수업시간표-운영-릴리스)을 따릅니다.

### 10/3 운영 테스트 계정 발급

[당시 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#103-운영-테스트-계정-발급)을 따릅니다.

## 교실 입장·대시보드 조회 성능

[당시 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#교실-입장대시보드-조회-성능)을 따릅니다.
