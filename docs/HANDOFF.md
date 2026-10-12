# 이어갈 작업

## 현재 작업 상태

2026-10-12(Asia/Seoul). 브랜치 `codex/student-ui-quiz-concept-flowchart`, 기준 `fe93533`. **주석 11개 구현·통합 검증 중이며 아직 미커밋·미배포입니다.** 사용자는 [계획](reference/student-lesson-feedback-plan-20261012.md)의 구현·필요한 간결한 그래프 활용·문맥 보존·문서 정리와 판단에 따른 배포를 승인했습니다.

다른 AI의 기존 17개 추적 변경과 미추적 V1 참고본·계획을 보존해 이어갔습니다. 코드 보존본과 해시는 Git 제외 `scratch/feedback-20261012/baseline/`·`baseline-manifest.json`에 있습니다. 진행·소유권·판단 근거는 같은 폴더의 `progress.md`로 관리합니다. 다음 행동은 관련 E2E → 최종 lint/typecheck/순수 검사/build·전체 E2E → 독립 리뷰 조치 → 로컬 기록 복원 → PR·CI·병합·운영 확인입니다.

## 이번 변경과 검증

- 제목은 **프로그래밍의 기초**로 통일하고 프로그래밍·프로그래밍 언어·프로그램을 첫 개념에서 설명합니다. 계산 안내를 제거하고 실제 0%에만 짧은 시작 장식을 표시합니다. 수업/문항 ID·정답·진도 분모는 유지합니다.
- 추상화 맛보기는 최초 한 번 필수이며 옛 워크북의 단계·초안·이전 제출은 보존합니다. 두 탐색 막대를 제거하고 Step·이전/다음으로 진행합니다. 단계별 닥터 대화·읽던 위치·상황 기반 요소 7개와 개별 버리기/복구·3~5개 계획·처방전 편집/복사/인쇄를 제공합니다.
- 순서도는 V1 기획서240px·기호 보관함100px·실행 과정220px 배치와 다섯 단계의 실제 가용 높이, 흰 변수표/검정 콘솔, 자유 공방의 부동 실행바를 사용합니다. 하단 inspector를 제거하고 실제 SVG 편집·키보드/포트 연결·오류 이동·되돌리기를 유지합니다. 기존 그래프·실행기를 재사용하며 새 의존성/저장 스키마는 추가하지 않았습니다.
- 이전 작업의 퀴즈 폭·개념 카드/실험·순서도 중심 정렬·Drop 표시와 정식 네 수업 목록 필터를 유지합니다. 숨긴 과거 수업의 직접 조회와 기존 기록 호환을 검사하고 교사 개수와 일정 저장을 보완합니다.
- 학생 저장은 useWork가 계속 소유합니다. 현재 수정본·검증·이전 제출·완료와 교사 체험 메모리 경계를 유지합니다. AI는 명시적으로 요청하고 늦은 응답·실패·작성 중 입력을 보존합니다.

최종 단일 실행의 환경·개수·화면·실패 조치와 한계는 실행을 마친 뒤 이곳에 기록합니다. 직전 AI와 이전 릴리스의 성공 기록은 이번 변경을 검증한 결과가 아닙니다.

## 통합·배포 상태

- 대상은 GitHub `DonghyunT/cs-class`와 Vercel `cs-class`(`prj_RUUtcTMukVY9kjudgDr6VA89KKxP`) Production, 운영 주소는 [cs-class-donghyunt.vercel.app](https://cs-class-donghyunt.vercel.app)입니다. 배포 전 원격 main과 실제 별칭/프로젝트를 다시 확인했습니다. 새 릴리스 SHA·CI·배포·운영 검사는 아직 기록할 결과가 없습니다.
- 수정 전 운영 배포는 `dpl_7Rrd5E1p5qv1fAcauKqMr5Qry5Mp` READY이며 현재 운영 별칭과 일치했습니다. 실제 복구 절차와 대상 확인은 [서버 안내](FIREBASE_SETUP.md#vercel-서버-설정)를 따릅니다.
- 배포는 앱·검사·문서만 다룹니다. 운영 학생 자료·계정·반 설정·Firebase 규칙/인덱스·환경변수 변경은 이번 범위에 포함하지 않습니다.

## 다음에 이어갈 작업

1. 현재 검증과 독립 리뷰의 실패/지적을 같은 조건에서 해결하고 전체 검사·복원을 마감합니다.
2. 승인된 배포를 끝낸 뒤 SHA·별칭·인증 응답·공개 로그인 화면을 확인합니다. READY나 HTTP200을 실제 학생/Google 로그인 성공으로 표현하지 않습니다.
3. [첫 실제 수업 확인 순서](DEVELOPMENT.md#첫-실제-수업-확인-순서)에 따라 학교 PC·학교망·물리 IME·실학생 사용을 확인합니다.

## 다른 PC에서 이어가기

먼저 Git 상태·현재 브랜치·미커밋/미추적 파일과 로컬 demo 기록을 확인하고 보존합니다. 진행 중 브랜치를 원격 main이나 오래된 ZIP으로 덮지 않습니다. `git status -sb` → `git branch -vv` → `git fetch --prune origin` → 최신 인계와 실제 HEAD 대조 순서로 시작합니다. 작업 트리가 정리된 뒤에만 의도한 브랜치로 전환합니다.

Node24·Java21+·Chromium·Windows 캐시와 설치 명령은 [다른 PC 개발 안내](DEVELOPMENT.md#다른-pc에서-시작)를 따릅니다. `npm.cmd ci`가 EntryJS 자산을 준비합니다. `dev:emulator`는 기본 시드를 다시 쓰므로 기존 기록이 있으면 먼저 export합니다. 기존 export를 이어볼 때는 [기본 시드 없는 복원](DEVELOPMENT.md#기존-demo-기록을-복원해-보기)을 사용합니다.

### 로컬 기록과 전달 경계

- 이 회차의 보존 기준은 Git 제외 `scratch/feedback-20261012/demo-before-tests/`의 Auth·Firestore 전체 export입니다. 검사가 끝나면 기본 시드 없이 import하고 객체 키를 재귀 정렬한 해시로 작품·반 설정을 비교합니다. 현재는 검사 중이며 복원 완료로 표현하지 않습니다.
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
