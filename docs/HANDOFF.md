# 이어갈 작업

갱신: 2026-10-16(Asia/Seoul). 아래 현재 작업과 운영 릴리스 기록을 구분합니다. 확정 기능은 [PRD](PRD.md), 화면은 [DESIGN](DESIGN.md), 실행·검증은 [DEVELOPMENT](DEVELOPMENT.md), 작업 규칙은 [AGENTS](../AGENTS.md)를 따릅니다.

## 현재 작업 상태

**PR 검토 대기(2026-10-16, `codex/dashboard-calendar-lesson-header`):** 로컬 화면 확인 뒤 남은 아쉬운 점은 "이번 수업이 다른 수업일 때만 수업 헤더가 높아지는 것"이었습니다. 이번 수업 링크를 제목 아래에서 `수업 나가기` 옆 알약형 링크로 옮겨 821px 이상에서 링크 유무와 관계없이 헤더 높이(약 69px)를 같게 했고, 820px 이하는 제목 아래에 둡니다(`05c35bc`, [DESIGN](DESIGN.md) §4.1). `tests/lesson-ui-consistency.spec.ts`와 공통 스모크 선별 8개, 린트·타입·문서 검사를 통과했습니다. 821px 부근에서 저장 상태 문구가 줄바꿈되어 헤더가 약 100px가 되는 것은 이전부터 있던 현상입니다. 변경 내용은 대시보드 달력 `일~토` 전환·주말 글자색, 교사 이번 수업 카드를 학생과 같은 좌측 진도/우측 수업 순서로 정렬하고 `수업 미리보기` 추가, 교사 일정 링크 `일정 관리`, 수업 헤더 821px 이상 좌(나가기)/중앙(제목)/우(저장·메뉴) 3구획, 실습 집중 모드 알약형 아이콘 버튼. 기준은 [DESIGN](DESIGN.md) §4.1·§4.4입니다.

- 린트·타입·문서·`test:review` 통과. 새 demo 에뮬레이터에서 대시보드·달력·헤더·집중 모드 관련 11파일과 공통 스모크 선별 98개 중 97개 통과, 1개(437px 교사 카드 높이 336px>320px)를 모바일 여백 축소로 고친 뒤 해당 대시보드 3파일 25개 재실행 통과. 전체 E2E는 실행하지 않았습니다.
- 이 PC의 Git Bash에는 Java PATH가 없어 Git 제외 `scratch/tools/java/runtime/jdk-21.0.12.1+1/bin`을 앞에 붙여 실행했고, Playwright headless Chromium(`chromium_headless_shell-1243`)을 새로 설치했습니다. 대표 스크린샷은 Git 제외 `scratch/dashboard-header-shots/`에 있습니다.
- 개념 인터랙션 고도화(파트 3)는 수업별로 나눠 신규 수업 이후 진행하기로 했습니다.
- 다른 PC에서 이어가기: `git fetch origin` → `git switch codex/dashboard-calendar-lesson-header` → `npm ci`. JDK 21 `bin`을 PATH 앞에 추가하고(`scratch/`는 Git으로 전달되지 않음), E2E를 돌리려면 `npx playwright install --only-shell chromium`이 필요합니다. 화면 확인은 `npm run dev:emulator` 후 `http://localhost:3000`의 게스트 입장을 사용합니다.

2026-10-14 후속 정책인 **교사 현황 수동 갱신·손들기 일시 중지**는 `main@a3ad3090926798c43589f6a30298f22b1f9de1a6`에 반영됐습니다. [최종 계획·검증 기록](superpowers/plans/2026-10-14-manual-refresh-help-pause.md)을 현재 동작의 기준으로 봅니다.

- **원격·운영 상태(10/15 조회):** 같은 SHA의 GitHub CI `app`은 성공했습니다. 미분류 파일(`firestore.indexes.json`)이 있어 smoke 모드가 되었고 선택된 검사는 `tests/lesson-smoke.spec.ts` 1개뿐이므로, 아래 전용 검사 17개는 CI가 아니라 로컬 결과입니다. Vercel Production 배포 `dpl_AXSEpYeQCJsstHdZgXUCxSmag5FP`는 READY이며 운영 별칭에 연결돼 있습니다. 새 복합 인덱스의 Firebase 배포 여부는 확인하지 않았습니다.
- **배포 게이트(10/15):** 이 배포 당시 Vercel Deployment Checks는 제거된 상태였고(사용자 확인) 빌드 완료(13:03:24Z)가 CI 성공(13:04:47Z)보다 앞섰습니다. 전체 CI의 긴 대기를 피하려고 제거했던 것을 사용자가 10/15에 대시보드에서 GitHub `app`(Production)으로 다시 연결했고 화면에 항목이 표시됩니다. 연결 뒤 첫 비문서 push에서 Checks 단계와 운영 반영 대기를 아직 확인하지 않았습니다. 유지 규칙은 [CI와 운영 공개](FIREBASE_SETUP.md#ci와-운영-공개)를 따릅니다.

- 공유 `CLASSROOM_HELP_ENABLED = false`로 학생/교사 손들기 UI와 전용 래퍼를 언마운트하고 모든 help GET·POST를 DB 접근 전에 `403 / HELP_DISABLED`로 막습니다. 코드·기록·인덱스는 보존하며 복구는 설정 변경과 재빌드·배포가 필요합니다.
- 교사 홈·학생 현황·수업 관리의 타이머·포커스 재조회를 제거했습니다. 최초 진입·반/수업 변경·수동 갱신·자체 변경 작업 후 반영과 늦은 응답 방지는 유지합니다. 학생 안내·인증·활동·수동 저장 정책은 유지합니다.
- 새 demo·빌드된 앱에서 압축 선별 17개 통과(1.1분), 프로덕션 빌드·린트·타입·문서 검사 통과. 모바일/태블릿/데스크톱의 가로 넘침 검사와 대표 스크린샷 검토에서 손들기 빈자리 문제는 확인되지 않았고 CSS는 변경하지 않았습니다. 활성 모드 손들기 검사는 보존하되 실행하지 않았으며 전체 E2E도 미실행입니다.
- 10분 가상 시간에서 손들기 요청·교사 현황 정기 조회가 0회였습니다. 하루 4반×27명×45분·담당 반11개 모형의 정기 읽기는 약 29,520회로, 초기 진입·수동 갱신·저장·채점·재시도는 별도입니다. 실제 과금이나 하루 한도 내 운영을 보장하지 않습니다. 원자료는 Git 제외 `scratch/manual-refresh-help-pause/` 및 `scratch/firestore-read-optimization/manual-help-paused-usage.json`입니다.

### 1차 최적화 기록(후속 정책 적용 전)

2026-10-14 읽기 최적화는 `codex/firestore-read-optimization`에서 구현·검증했습니다(기준 `3a06cf0`). 이 구간은 당시 로컬 측정 기록이며 이후 후속 정책과 함께 위 `a3ad309`로 반영됐습니다. [작업 계획·측정 해석](superpowers/plans/2026-10-14-firestore-read-optimization.md)을 먼저 확인합니다.

- 교사 현황 60초·포커스 재조회 간격 30초, 학생 손들기 평상시 60초·대기 중 30초, 주기 전환의 즉시 재조회 방지, 조회 중복·이전 응답 방지, 취소 충돌 재조회, 대기 요청만 조회하는 쿼리와 복합 인덱스를 반영했습니다.
- 학생 수업 화면도 열린 수업 전체 작품을 30초마다 읽던 경로를 발견해 `GET /api/classroom/student/class`로 축소했습니다. 안내 갱신은 기존 30초·포커스 방식을 유지하고 작품·저장·인증 정책은 유지했습니다.
- 프로덕션 빌드·린트·타입·문서 검사, 리뷰/복구 28개·정책 17개 통과. 새 demo의 `next start`·Chromium에서 관련 12파일 선별 77개는 최초 76개 통과/1개 기존 30초 타이머 가정으로 실패했고, 해당 가정을 60초로 수정한 교사 리뷰 검사 파일 6개가 재실행에서 모두 통과했습니다. 같은 앱 빌드의 최종 사용량 샘플 1개도 통과했습니다. 전체 E2E는 실행하지 않았습니다.
- 공개 수업 4개·27명·담당 반 11개·10분 가상 시간의 정기 요청은 교사 과제/학생 손들기 각각 20→10회, 학생 수업 안내는 전체 작품 조회20회→반 설정 조회20회입니다. 문서 읽기 모형과 정상 30초 세션 갱신 가정으로 약 54% 절감이지만 하루 4반×45분의 정기 읽기만 약 5.7만 회입니다. **하루 4만 회 목표는 미충족**이며 종전 4.4만 회 예측은 안내 조회 누락으로 폐기합니다. 실제 과금·학생 행동량 실측으로 표현하지 않습니다.
- 독립 리뷰의 앱 중요 회귀 지적은 없었고, 공개 수업 없는 초기 측정 시드 지적은 공개 수업 조건의 전후 재측정으로 보완했습니다. 원자료와 실패·복구 기록은 Git 제외 `scratch/firestore-read-optimization/`에 있습니다.

2026-10-14(Asia/Seoul). 홈 CSS 분할, `useWork` 복구 판정 적출, `HANDOFF.md` 아카이빙 및 CI 정책 복원을 담은 [PR #38](https://github.com/DonghyunT/cs-class/pull/38)이 `main@d79fa44ee997d386695c3db918dc142126b44fab`에 병합되었습니다. GitHub Actions `app` 검사 성공과 Vercel Production 배포 READY·라이브 도메인 연결을 각각 확인했습니다. 두 확인의 선후 관계는 기록하지 않았습니다.

- **홈 CSS 분할 검증:** 5개 영역으로 분할된 홈 스타일에 대해 로컬 `next start`(port 3000) 환경에서 [`tests/landing.spec.ts`](../tests/landing.spec.ts) 7개 브라우저 E2E 검사를 직접 실행하여 전원 통과(22.3초)했습니다. 반응형(320px/FHD), 모션 줄이기, 5장면 스크롤 핀 전환, 키보드 조작 모두 정상입니다.
- **작업 복구 단위 검증:** `hasRecoveryFields`·`hasActionResult`를 `src/components/student/work-recovery.ts`로 적출하고 `playwright.logic.config.ts` 기반 단위 검사 12개 통과를 확인했습니다. `npm run test:review`에 연동되어 28개 검사가 가동됩니다.
- **CI 정책 최적화:** 공통·설정 변경 시 자동 CI가 30분 전체 E2E로 승격되던 동작을 방지하고 등록 수업 스모크 모드(2~3분)로 전환했습니다. 전체 E2E는 `workflow_dispatch` 수동 실행으로만 수행됩니다.
- **원격 배포 확인:** Vercel `cs-class` Production의 배포 `AnF6N1UGxnBnuJX6ojMtQyv58WpD`·READY·icn1와 [운영 별칭](https://cs-class-donghyunt.vercel.app)의 일치를 확인했습니다. 익명 `/api/auth/config`·`/api/auth/session` 200, 학생/교사 로그인 페이지 200, 비인가 `/api/classroom/*`의 401 SIGNED_OUT 정상 응답을 확인했습니다.

### 엔트리 전체 팔레트·오브젝트 추가(`codex/entry-full-palette`, 2026-10-16)

[계획·실측·심포지엄 기록](superpowers/plans/2026-10-16-entry-full-palette.md)을 기준으로 봅니다. 프로그래밍 수업 작업실에 104블록 수업 팔레트, 미션 밖 블록 저장·검증 안내, 이벤트 줄 실행 유지, 엔트리 '시작하기' 단일 실행 버튼, 오브젝트 추가(그림 8종·최대 5개, 강아지 삭제·복제 불가, 채점은 강아지 코드만)를 넣었습니다. 기존 작품 키·정규화는 `tests/fixtures/entry-legacy-keys.json`으로 고정했습니다.

- 단위 `entry-palette` 14개·`test:review` 26개·`test:scope`·린트·타입·문서 통과. 새 demo 에뮬레이터에서 프로그래밍 수업 매핑·교사 미리보기·작업실 배치·classroom-api·공통 스모크 85개 중 84개 통과, 1개는 다른 세션의 파일 정리로 Playwright 기록 파일이 사라진 실패라 단독 재실행에서 통과. 전체 E2E 미실행.
- 리뷰어 3명(교실 UX·보안·아키텍처) 심포지엄 합의 1~5를 반영했습니다. 보류 항목은 계획 문서에 적었습니다.
- 내장 브라우저는 격리 iframe을 막으므로 엔트리 화면 확인은 일반 Chrome/Edge에서 합니다. 실제 화면 확인은 아직 사용자 몫입니다.

## 최신 운영 릴리스 기록

10/16 10:33 KST 확인. Firestore 읽기 최적화 및 교사 현황 수동 갱신·손들기 일시 중지가 적용된 최신 릴리스입니다.

- **앱 릴리스 기준:** `main@a3ad3090926798c43589f6a30298f22b1f9de1a6`.
- **운영 배포:** Vercel `cs-class` Production 배포 `dpl_AXSEpYeQCJsstHdZgXUCxSmag5FP`·READY·운영 별칭 일치. 직전 복구 후보는 `d79fa44ee997d386695c3db918dc142126b44fab`·`AnF6N1UGxnBnuJX6ojMtQyv58WpD`입니다.
- **운영 확인 범위:** 익명 `/api/auth/config`·`/api/auth/session` 200, 학생/교사 로그인 200, 비인가 `/api/classroom/student` 401 `SIGNED_OUT`, 비활성 `/api/classroom/help` 403 `HELP_DISABLED` 정상 응답 확인. 실제 계정 로그인·Google OAuth·AI·학생 저장은 실행하지 않았습니다.

## 검증 상태

| 날짜·대상 | 확인 결과 | 한계 |
|---|---|---|
| 10/14 구조 정리·Windows·Node24.19.0·Java21.0.12.1·Chromium·빌드된 next start·새 demo 에뮬레이터 | 홈·수동 저장·Entry 저장·행동 복구·이탈·공통 스모크·교사 체험7파일54개 통과(2.3분), 실패/생략0. 리뷰/복구28개·정책/문서15개·타입·린트·프로덕션 빌드 통과. 독립 리뷰 Critical/Important 없음 | 사용자 선택으로 전체 E2E 미실행. 실제 운영 로그인·AI·저장·배포 검증 아님. 최초 제한 실행의 임시 Git/Next Windows 경로 접근 거부는 허용된 동일 명령에서 통과 |
| 이전 10/14 CI 수정·배포 전 | Windows·Node24.19.0·Java21·Chromium·빌드된 next start·demo에서 저장/Entry/이탈/프로그래밍/스모크5파일35개 통과(3.9분), 타입·린트·정책/문서15개 통과 | 현재 구조 정리의 통과 결과가 아님. 당시 앱 코드가 같아 기존 빌드를 재사용했고 전체 E2E는 새로 실행하지 않음 |
| 이전 원격 CI c3b2485 | 401개 통과·1개 실패·1개 생략 | Entry 캡처 이후 확인창을 클릭 직후 isVisible 한 번으로 놓친 경합. 수정 후 같은 지연 조건1개 통과. [원격 기록](https://github.com/DonghyunT/cs-class/actions/runs/38437567017) |

현재 검사 개수는 목록 조회로 확인하며 과거 개수·시간을 고정 상한으로 쓰지 않습니다. 상세 합성 진단은 Git 제외 `scratch/ci-navigation-fix/`, 이번 구조 정리의 근거는 `scratch/architecture-clarity/`에 있습니다.

## 다음에 이어갈 작업

다음 단계는 배포 게이트의 첫 동작 확인과 실제 수업 행동량 확인입니다. 4반 무료 한도 운영을 아직 보장하지 않습니다. 손들기 중지 앱에는 관련 인덱스 배포가 선행 필수 조건은 아니며, 재활성화 전에 오래된 대기 요청 처리 기준·인덱스 준비·활성 모드 검사를 확인합니다. 승인 없는 운영 기록 정리·인증 캐시·운영 테스트 시드·Preview 생성은 하지 않습니다.

1. 다음 비문서 push에서 Vercel 배포의 Checks(`app`) 대기와 운영 반영 순서를 확인해 위 배포 게이트 기록을 확정합니다. 확인 전에는 게이트가 동작한다고 기록하지 않습니다. 기존 전체 CI는 `178f4d8`의 기록이며, 자동 CI는 전체 E2E를 반복하지 않습니다.
2. 신규 수업은 [4단계 체크리스트](DEVELOPMENT.md#신규-수업-추가-및-선별-검증-연동-체크리스트)를 따릅니다. 학생 저장은 공통 `useWork`, 교사 체험은 메모리 경계를 유지합니다.
3. 실제 학교 PC·학교망·물리 한글 입력기에서 [첫 수업 확인](DEVELOPMENT.md#첫-실제-수업-확인-순서)을 수행합니다. 운영 실제 로그인·AI·저장/제출, 터치·화면 읽기·200% 확대·프린터·자연 Cron은 아직 해당 환경에서 확인할 사항입니다.

## CI 및 선별 검증 운영 현황

<a id="ci-개선-후속-작업"></a>

등록 수업 변경은 해당 검사와 공통 스모크, GitHub 자동 CI의 공통·설정·미분류 변경 또는 비교 기준 불명은 전체 등록 수업 스모크로 검증합니다. 확인된 관련 수업 검사는 함께 유지합니다. 전체 E2E는 로컬 사용자 사전 승인 또는 GitHub의 명시적인 수동 실행을 따릅니다. 최신 설정은 [DEVELOPMENT](DEVELOPMENT.md#검증)·실제 workflow와 대조하며 과거 보관 문서의 자동 전체 승격을 현재 지시로 읽지 않습니다.

## 다른 PC에서 이어가기

HEAD·브랜치·기존 차이를 먼저 확인하고, 기록을 보존한 뒤 의도한 작업 상태로 이동합니다. Node24·Java21+·Chromium 준비는 [개발 안내](DEVELOPMENT.md#다른-pc에서-시작)를 따릅니다. 기본 `dev:emulator`는 시드를 다시 쓰므로 기존 기록이 있으면 먼저 export하고 [시드 없는 복원](DEVELOPMENT.md#기존-demo-기록을-복원해-보기)을 사용합니다.

### 로컬 기록과 전달 경계

이 PC의 사용자 기록 복원 기준은 Git 제외 `scratch/release-20261013/demo-before-ci-debug/`입니다. 이전 복원 때 반11개·작품4개와 정렬 해시 일치를 확인했습니다. 이후 체험 기록은 새 export로 보존하며 위 export가 항상 최신이라는 가정은 하지 않습니다. 이번 검사는 기존 export를 가져오지 않은 새 demo 환경에서 수행했고 검사 후 종료했습니다. 보존 export6파일과 기존 보관551파일의 해시 일치를 확인했습니다.

이전 로컬 미리보기는 demo Auth9099/Firestore8080과 `scratch/lesson-layout-round3-20261012/preview.mjs`의 빌드된 localhost3000을 사용했고 시드를 실행하지 않았습니다. 기존 브라우저 쿠키로 실제 이어가기까지 확인한 결과는 아닙니다.

Git은 코드·검사·문서만 전달합니다. 비밀 설정·관리자 키·로컬 기록·scratch·의존성·빌드/도구 캐시는 별도입니다. 필요한 기록은 비공개 경로로 전달해 기존 기록과 대조합니다. 운영 계정·명부는 [서버 안내](FIREBASE_SETUP.md#승인된-운영-테스트-계정)·[명부 절차](DEVELOPMENT.md#실학생-명부-준비와-반별-발급)를 따릅니다.

## 과거 구현·검증·운영 근거

아래 기존 앵커는 과거 문서의 진입점을 보존합니다. 해당 상세는 [구조 정리 전 HANDOFF](archive/cs-class/2026-10-14-before-architecture-clarity/HANDOFF.md)와 [출처·원문 해시](archive/cs-class/2026-10-14-before-architecture-clarity/manifest.json)에 있습니다. 더 이전 자료는 [보관함](archive/README.md)을 따릅니다. 보관 원문의 '현재', '승인', '다음 행동'은 당시 문맥입니다.

<a id="이전-pc의-수동-저장문서-정비"></a>
<a id="a0-변경-전-조사-근거"></a>
<a id="수동-저장-a0-조사변경-전-요청-수"></a>
<a id="이번-조사에서-확인한-근거"></a>
<a id="문서-정비-통합배포-확인"></a>
<a id="이번-릴리스의-변경"></a>
<a id="통합배포-상태"></a>
<a id="새-대화에-붙일-요청문"></a>
<a id="남은-한계와-다음-결정"></a>
<a id="105-원작-실습-ui-복원-공개"></a>
<a id="105-세-복습-운영-공개"></a>
<a id="104-실제-수업시간표-운영-릴리스"></a>
<a id="103-운영-테스트-계정-발급"></a>
<a id="교실-입장대시보드-조회-성능"></a>
