# 이어갈 작업

## 현재 작업 상태

2026-10-13(Asia/Seoul). 현재 `codex/lesson-layout-round3`, 기준 로컬 커밋 `a73c967`이며 후속 화면 요청10개를 구현·검증한 미커밋 변경과 신규 `tests/programming-mission-navigation.spec.ts`가 있습니다. 헤더/단계 줄 집중 모드·기획서300px·예시 공방 도구 통합·퍼즐 보관함/콘솔·SVG 잘림/분기·프로그래밍 제출 뒤 다음 미션 초점을 반영했습니다. 다음 행동은 실행 중인 로컬 미리보기에서 사용성을 확인하는 것입니다. 운영 반영·배포는 하지 않았습니다.

10/13 후속 GIF의 드래그 겹침을 재현했습니다. SVG 기호에 브라우저 기본 초점 사각 테두리가 기존 도형 선택 표시와 함께 그려졌으며, 반복 이동의 좌표는 정상이었습니다. 공통 FlowDiagram에서 기본 사각 테두리와 텍스트 선택을 막고 드래그 시작 시 스크롤 없는 초점을 지정했습니다. 도형의 선택/키보드 초점 테두리·문구 편집은 유지합니다. [드래그 회귀 검사](../tests/review-flowchart-canvas-fixes.spec.ts)는 30개 중간 좌표의 포인터 추종·다른 기호 위치·중복 기호 없음·텍스트 선택 없음·저장/재접속·키보드 이동과 미선택 기호의 초점 표시를 확인합니다. Windows·Chromium·demo Auth9099/Firestore8080·빌드된 `next start`에서 순서도 관련 6개 파일의 **E2E46개 통과**(2.5분, skip/flaky/실행 오류0), 타입 검사·린트·프로덕션 빌드·diff 검사를 통과했습니다. 실제 빌드 캡처에서도 기본 사각 테두리가 사라졌습니다. 실행 보고서와 캡처는 Git 제외 `scratch/flowchart-drag-20261013/`에 있습니다. 이번 후속 수정 뒤 전체 앱 E2E를 재실행하지는 않았습니다.

최근 로컬 체험의 Auth/Firestore 기록은 새 Git 제외 `scratch/flowchart-drag-20261013/demo-before/`에서 시드 없이 복원했습니다. 반11개·작품4개는 새 `records-before.json`의 정렬 해시와 복원 직후·서버 시작 뒤 일치합니다. `scratch/lesson-layout-round3-20261012/demo-before/`는 이전 체험 시점의 보관본입니다. demo Auth9099/Firestore8080과 드래그 수정이 포함된 최종 빌드의 `http://localhost:3000` 미리보기를 실행 중입니다. 이 PC의 보존용 실행은 `node scratch/lesson-layout-round3-20261012/preview.mjs`이며 기본 시드를 실행하지 않습니다. 새 체험 후 서버를 교체할 때는 새 demo export를 먼저 남깁니다.

앞선 화면 요청10개의 검증(드래그 후속 수정 전): 10/12–10/13 Windows·Node24·Java21·Chromium, demo 전용 Auth/Firestore·합성 AI/시간표, 빌드된 `next start`·단일 worker에서 **전체 E2E384개 통과**(21.3분, skip/flaky/실행 오류0). 타입 검사·린트·프로덕션 빌드·순수 엔진/AI 검사16개와 문서 링크400개도 통과했습니다. FHD·1544px·낮은 창·821/820px·390/320px·CSS200% 모의 확대, 실제 드래그/입력·키보드 초점·저장/제출 복구와 캡처를 확인했습니다. 검증 중 확대 문항의 초점 여유와 공통 나가기 위치·이번 수업 링크44px를 보완했고, 낡은 배치 기대값과 저장/스크롤/iframe 준비 대기의 검사5개를 수정해 대상 통과 뒤 전체 단일 실행으로 재확인했습니다. 실제 운영 로그인·AI·학생 자료는 검사하거나 변경하지 않았습니다.

## 직전 로컬 구현 기준

2026-10-12(Asia/Seoul). 최신 원격 `main@5bb859ce`에서 `codex/lesson-feedback-round2`를 만들고 승인된 후속 주석 8개를 구현했습니다. 소스·검사·문서·합성 화면을 이 브랜치의 로컬 커밋으로 정리했고 미커밋은 없습니다. 원격 반영·병합·배포는 하지 않았습니다. 다음 행동은 아래 변경과 화면을 확인하고 원격 반영·배포 범위를 정하는 것입니다.

새 첫 개념 pc4를 추가하되 기존 pc0~3와 프로토타입 숫자 0~3을 유지합니다. 세 복습의 중복 제목/넓게 보기는 상단 집중 모드로 통합하고, 순서도 1~3은 AI 없이 실행 종료→기존 서버 검증→확인된 제출로 자동 기록합니다. 자유 공방 도구를 묶고 스크롤바·보관함 간격·추가 카드 색·실행바 두께를 다듬었습니다. 저장은 useWork 단일 소유와 기존 스키마/복구 경로를 유지합니다.

10/12 후속 검증: Windows·Node24·Java21·Chromium, 빌드된 `next start`·단일 worker에서 **전체 E2E 371개 통과**(21.0분, skip/flaky/실행 오류 0). lint·typecheck·순수 엔진/AI 검사 16개·프로덕션 빌드와 독립 리뷰를 통과했습니다. 신규 E2E 14개는 새 첫 개념/옛 기록 호환·자유 공방·자동 기록과 검증/제출 응답 분실·확정 거절 뒤 재시도·중지 후 초점·교사 체험 메모리 경계를 검사합니다. 독립 리뷰의 확정 요청 거절 뒤 재실행 문제와 기록 대기 중 중지 후 초점 문제는 실패 재현→수정→같은 조건 통과로 확인했습니다. 로컬 demo Auth9099/Firestore8080·합성 AI/시간표만 사용했으며 실제 운영 로그인·AI·학생 저장을 검사하거나 변경하지 않았습니다. 아래 357개·운영 배포 증거는 직전 릴리스의 기록이며 이번 변경의 검증으로 간주하지 않습니다.

빌드 화면: [순서도 자유 공방 1544×712](reference/lesson-feedback-round2-20261012/flowchart-free-1544.png)·[새 첫 개념과 옛 기록 보존](reference/lesson-feedback-round2-20261012/programming-intro.png). 합성 계정/작품의 화면이며 운영 학생 자료가 아닙니다.

## 직전 배포 기준

2026-10-12(Asia/Seoul). **주석 11개 구현·전체 검증·운영 배포를 완료했습니다.** 문서 마감 병합 후 기준 브랜치는 `main`이며 미커밋은 없습니다. 앱 릴리스는 [PR #32](https://github.com/DonghyunT/cs-class/pull/32)의 `main@6f8f76078b682962e673ca4a95599cebd2c55328`이고, 후속 문서 커밋은 앱 소스를 바꾸지 않습니다. 완료 조건은 [10/12 계획](reference/student-lesson-feedback-plan-20261012.md)을 따릅니다.

다른 AI의 기존 17개 추적 변경과 미추적 V1 참고본·계획을 보존해 통합했습니다. 초기화·기존 변경 되돌리기를 하지 않았습니다. 수정 전 147개 파일의 코드 보존본과 해시는 Git 제외 `scratch/feedback-20261012/baseline/`·`baseline-manifest.json`, 진행·판단 근거는 같은 폴더의 `progress.md`에 있습니다. GitHub 최신 V1 `main@bc8d51f`의 [참고본 126개](../archive/algorithm-studio/2026-10-12-bc8d51f/README.md)는 원문·파일 해시를 고정했고 기존 V1 보관본도 유지합니다.

## 직전 릴리스 변경과 검증

- 제목은 **프로그래밍의 기초**로 통일하고 프로그래밍·프로그래밍 언어·프로그램을 첫 개념에서 설명합니다. 계산 안내를 제거하고 실제 0%에만 짧은 시작 장식을 표시합니다. 수업/문항 ID·정답·진도 분모는 유지합니다.
- 추상화 맛보기는 최초 한 번 필수이며 옛 워크북의 단계·초안·이전 제출은 보존합니다. 두 탐색 막대를 제거하고 Step·이전/다음으로 진행합니다. 단계별 닥터 대화·읽던 위치·상황 기반 요소 7개와 개별 버리기/복구·3~5개 계획·처방전 편집/복사/인쇄를 제공합니다.
- 순서도는 V1 기획서240px·기호 보관함100px·실행 과정220px 배치와 다섯 단계의 실제 가용 높이, 흰 변수표/검정 콘솔, 자유 공방의 부동 실행바를 사용합니다. 하단 inspector를 제거하고 실제 SVG 편집·키보드/포트 연결·오류 이동·되돌리기를 유지합니다. 기존 그래프·실행기를 재사용하며 새 의존성/저장 스키마는 추가하지 않았습니다.
- 이전 작업의 퀴즈 폭·개념 카드/실험·순서도 중심 정렬·Drop 표시와 정식 네 수업 목록 필터를 유지합니다. 숨긴 과거 수업의 직접 조회와 기존 기록 호환을 검사하고 교사 개수와 일정 저장을 보완합니다.
- 학생 저장은 useWork가 계속 소유합니다. 현재 수정본·검증·이전 제출·완료와 교사 체험 메모리 경계를 유지합니다. AI는 명시적으로 요청하고 늦은 응답·실패·작성 중 입력을 보존합니다.

10/12 검증: Windows·Node24·Java21·Chromium, 로컬 `demo-cs-class` Auth9099/Firestore8080·합성 AI/시간표·빌드된 `next start`에서 단일 worker로 **E2E 357개 통과**(21.9분, skip/flaky 0). lint·typecheck·순수 엔진/AI 검사·프로덕션 빌드와 독립 리뷰를 마쳤습니다. [GitHub CI](https://github.com/DonghyunT/cs-class/actions/runs/38210542085)는 최종 작업 HEAD `58d503fb`에서 같은 검사와 **Linux E2E 356개 통과·Windows .NET 변환 검사 1개 제외**를 확인했습니다(26.1분).

통합 중 발견한 검사 조건은 실제 공개 네 수업·필수 맛보기·새 접근성 이름/속도 선택에 맞췄습니다. Home의 늦은 scrollend 경합은 각 키의 이동 완료를 기다리고, 순서도 휠은 실제 넘침이 있는 1280px 창에서 양·음 방향을 검사합니다. 기존 시간 제한·중심 오차·초점·저장·권한 기준은 유지했습니다. 앱·검사·스크립트/설정 275개 해시 `362872a3713ac3b849d79de14adc018016994cff701604f4bf5be96479e2e27b`가 전체 실행과 병합 뒤 일치했습니다.

최종 합성 화면: [0% 시작 표시](reference/lesson-feedback-20261012/progress-zero.png), [순서도 1689px](reference/lesson-feedback-20261012/flowchart-1689.png)·[390px](reference/lesson-feedback-20261012/flowchart-390.png), [추상화 처방전](reference/lesson-feedback-20261012/abstraction-prescription-1920.png)·[인쇄](reference/lesson-feedback-20261012/abstraction-prescription-print.png). 로컬 합성 계정/입력이며 운영 학생 자료가 아닙니다. 처방전 캡처에는 빈 계획 편집값 보존 검사도 포함됩니다.

## 직전 릴리스 통합·배포 상태

- 대상은 GitHub `DonghyunT/cs-class`와 Vercel `cs-class`(`prj_RUUtcTMukVY9kjudgDr6VA89KKxP`) Production, 운영 주소는 [cs-class-donghyunt.vercel.app](https://cs-class-donghyunt.vercel.app)입니다. 10/12 15:32 KST PR #32를 병합했습니다. 앱 배포 `dpl_6wNWZWaBPPQm9NUv4XQ2AgDe2tLP`·`cs-class-qkzt6i60y-donghyunt.vercel.app`은 READY·`icn1`이며 `main@6f8f760`과 운영 별칭의 배포 ID/프로젝트가 일치했습니다. 후속 문서 배포의 최종 SHA·운영 별칭 대조 결과도 [PR #32 릴리스 기록](https://github.com/DonghyunT/cs-class/pull/32)에 함께 기록합니다.
- 15:35 KST 운영 읽기 전용 검사: auth config의 configured=true·guest=false·emulator=null, 익명 session200/null·학생 API401, 이전 sigma 주소307/정확한 운영 주소 이동을 확인했습니다. 실제 학생/교사 로그인 화면을 1280×720·390×790에서 열어 버튼 활성화·가로 넘침 없음·브라우저 오류0을 확인했고 보호된 추상화 수업은 로그인으로 이동했습니다. 운영 로그인·AI·저장/제출 성공을 검사한 결과는 아닙니다.
- 수정 전 운영 배포는 `dpl_7Rrd5E1p5qv1fAcauKqMr5Qry5Mp` READY이며 시작 당시 운영 별칭과 일치했습니다. 실제 복구 절차와 대상 확인은 [서버 안내](FIREBASE_SETUP.md#vercel-서버-설정)를 따릅니다.
- 배포는 앱·검사·문서만 다룹니다. 운영 학생 자료·계정·반 설정·Firebase 규칙/인덱스·환경변수 변경은 이번 범위에 포함하지 않습니다.

## 다음에 이어갈 작업

1. [첫 실제 수업 확인 순서](DEVELOPMENT.md#첫-실제-수업-확인-순서)에 따라 학교 PC·학교망·물리 IME·승인 계정의 실제 로그인/저장·실학생 사용을 확인합니다.
2. 최신 프롬프트의 실제 Solar 응답 품질과 호출/실패 집계를 수업에서 관찰합니다. 로컬 합성 AI 성공을 실제 제공자 품질 검증으로 확대하지 않습니다.

## 다른 PC에서 이어가기

먼저 Git 상태·현재 브랜치·미커밋/미추적 파일과 로컬 demo 기록을 확인하고 보존합니다. 진행 중 브랜치를 원격 main이나 오래된 ZIP으로 덮지 않습니다. `git status -sb` → `git branch -vv` → `git fetch --prune origin` → 최신 인계와 실제 HEAD 대조 순서로 시작합니다. 작업 트리가 정리된 뒤에만 의도한 브랜치로 전환합니다.

Node24·Java21+·Chromium·Windows 캐시와 설치 명령은 [다른 PC 개발 안내](DEVELOPMENT.md#다른-pc에서-시작)를 따릅니다. `npm.cmd ci`가 EntryJS 자산을 준비합니다. `dev:emulator`는 기본 시드를 다시 쓰므로 기존 기록이 있으면 먼저 export합니다. 기존 export를 이어볼 때는 [기본 시드 없는 복원](DEVELOPMENT.md#기존-demo-기록을-복원해-보기)을 사용합니다.

### 로컬 기록과 전달 경계

- 이 회차의 보존 기준은 Git 제외 `scratch/feedback-20261012/demo-before-tests/`의 Auth 설정/계정·Firestore 전체 export입니다. 최종 검사 뒤 기본 시드 없이 모두 import했습니다. 반11개·기존 작품6개의 객체 키를 재귀 정렬한 해시 `caf2002c5c982912e4d37b00858dab6afc93622a098d65f3854109972cdf745e`가 검사 전과 일치했습니다. 기존 서버 세션도 복원했고, 새 게스트 로그인으로 원래 접속을 교체하지 않았습니다. 기존 브라우저 쿠키의 실제 이어가기까지 검사한 것은 아닙니다.
- Git은 앱·검사·문서·합성 화면만 전달합니다. 비밀 설정·관리자 키·개인 도구·로컬 기록·scratch/outputs·node_modules·빌드/브라우저/Java 캐시는 별도입니다. 기록이 필요한 다른 PC에는 비공개 경로로 전달하고 대상의 기존 기록과 대조합니다.
- 운영 체험 계정/명부 원문은 Git에 넣지 않습니다. [계정 안내](FIREBASE_SETUP.md#승인된-운영-테스트-계정)와 [명부 절차](DEVELOPMENT.md#실학생-명부-준비와-반별-발급)를 따릅니다.

### 새 대화에 붙일 요청문

> CS Class를 이어주세요. 현재 PC의 Git 변경과 로컬 기록을 먼저 보존하고 AGENTS.md → docs/HANDOFF.md → 필요한 PRD/DESIGN/DEVELOPMENT를 읽어주세요. 최신 브랜치·HEAD·릴리스 근거를 대조하고 과거 검사/승인을 새 결과로 표현하지 마세요. LessonShell·단일 useWork 저장·옛 초안/이전 제출·명시 AI와 늦은 응답/실패 보호를 유지해주세요. 새 수정 범위는 제가 설명하겠습니다.

## 남은 한계와 다음 결정

최신 AI 검사는 로컬 합성 제공자 기준이며 이번 프롬프트의 실제 Solar 품질은 별도입니다. 운영 계정 로그인·AI·저장/제출, 물리 한글 입력기·학교망·실기기 터치/화면 읽기·200% 확대·프린터·자연 Cron은 해당 환경에서 확인합니다. 강제 종료한 미전송 초안의 영구 복구는 [저장 정책](PRD.md#작업-저장과-통신-비용)을 따릅니다. 이전 의존성/인증 키/운영 로그 접근 관련 미해결 기록은 아래 원문에 보존했으며 이번 작업의 해결 결과로 확대하지 않습니다.

## 과거 구현·검증·운영 근거

직전 인계와 다른 AI의 미커밋 기록·PR #31/이전 CI·운영 증거는 [10/12 구현 전 원문](archive/cs-class/2026-10-12-before-feedback-release/HANDOFF.md)과 [SHA-256 manifest](archive/cs-class/2026-10-12-before-feedback-release/manifest.json)에 바이트 그대로 보존했습니다. 앞선 이력은 [보관 목록](archive/README.md)을 따릅니다. 다음 진입점은 기존 활성 링크를 유지합니다.

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
