# 이어갈 작업

갱신: 2026-10-14(Asia/Seoul). 아래 현재 작업과 운영 릴리스 기록을 구분합니다. 확정 기능은 [PRD](PRD.md), 화면은 [DESIGN](DESIGN.md), 실행·검증은 [DEVELOPMENT](DEVELOPMENT.md), 작업 규칙은 [AGENTS](../AGENTS.md)를 따릅니다.

## 현재 작업 상태

2026-10-14(Asia/Seoul). 홈 CSS 분할, `useWork` 복구 판정 적출, `HANDOFF.md` 아카이빙 및 CI 정책 복원을 담은 [PR #38](https://github.com/DonghyunT/cs-class/pull/38)이 `main@d79fa44ee997d386695c3db918dc142126b44fab`에 병합되었습니다. GitHub Actions `app` 검사 통과 후 Vercel Production 배포 및 라이브 도메인 연결을 확인했습니다.

- **홈 CSS 분할 검증:** 5개 영역으로 분할된 홈 스타일에 대해 로컬 `next start`(port 3000) 환경에서 [`tests/landing.spec.ts`](../tests/landing.spec.ts) 7개 브라우저 E2E 검사를 직접 실행하여 전원 통과(22.3초)했습니다. 반응형(320px/FHD), 모션 줄이기, 5장면 스크롤 핀 전환, 키보드 조작 모두 정상입니다.
- **작업 복구 단위 검증:** `hasRecoveryFields`·`hasActionResult`를 `src/components/student/work-recovery.ts`로 적출하고 `playwright.logic.config.ts` 기반 단위 검사 12개 통과를 확인했습니다. `npm run test:review`에 연동되어 28개 검사가 가동됩니다.
- **CI 정책 최적화:** 공통·설정 변경 시 자동 CI가 30분 전체 E2E로 승격되던 동작을 방지하고 등록 수업 스모크 모드(2~3분)로 전환했습니다. 전체 E2E는 `workflow_dispatch` 수동 실행으로만 수행됩니다.
- **원격 배포 확인:** Vercel `cs-class` Production의 배포 `AnF6N1UGxnBnuJX6ojMtQyv58WpD`·READY·icn1와 [운영 별칭](https://cs-class-donghyunt.vercel.app)의 일치를 확인했습니다. 익명 `/api/auth/config`·`/api/auth/session` 200, 학생/교사 로그인 페이지 200, 비인가 `/api/classroom/*`의 401 SIGNED_OUT 정상 응답을 확인했습니다.

## 최신 운영 릴리스 기록

10/14 19:35 KST 확인. 구조 정리 및 CI 정책 개선이 적용된 최신 릴리스입니다.

- **앱 릴리스 기준:** `main@d79fa44ee997d386695c3db918dc142126b44fab` (PR #38).
- **운영 배포:** Vercel `cs-class` Production 배포 `AnF6N1UGxnBnuJX6ojMtQyv58WpD`·READY·icn1·운영 별칭 일치. 직전 복구 후보는 `0c32a3b1a8d4ccc69f4475f94c47b8c38b4e5ada`·`dpl_8GKENV11fbMUPpSVUERMPNBFvdKF`입니다.
- **운영 확인 범위:** 익명 config/session 200, 학생/교사 로그인 200, 비인가 `/api/classroom/*` 401 SIGNED_OUT, 분할된 CSS 번들 청크(`0bwhr_evpr584.css`) 정상 서빙 확인. 실제 계정 로그인·Google OAuth·AI·학생 저장은 실행하지 않았습니다.

## 검증 상태

| 날짜·대상 | 확인 결과 | 한계 |
|---|---|---|
| 10/14 구조 정리·Windows·Node24.19.0·Java21.0.12.1·Chromium·빌드된 next start·새 demo 에뮬레이터 | 홈·수동 저장·Entry 저장·행동 복구·이탈·공통 스모크·교사 체험7파일54개 통과(2.3분), 실패/생략0. 리뷰/복구28개·정책/문서15개·타입·린트·프로덕션 빌드 통과. 독립 리뷰 Critical/Important 없음 | 사용자 선택으로 전체 E2E 미실행. 실제 운영 로그인·AI·저장·배포 검증 아님. 최초 제한 실행의 임시 Git/Next Windows 경로 접근 거부는 허용된 동일 명령에서 통과 |
| 이전 10/14 CI 수정·배포 전 | Windows·Node24.19.0·Java21·Chromium·빌드된 next start·demo에서 저장/Entry/이탈/프로그래밍/스모크5파일35개 통과(3.9분), 타입·린트·정책/문서15개 통과 | 현재 구조 정리의 통과 결과가 아님. 당시 앱 코드가 같아 기존 빌드를 재사용했고 전체 E2E는 새로 실행하지 않음 |
| 이전 원격 CI c3b2485 | 401개 통과·1개 실패·1개 생략 | Entry 캡처 이후 확인창을 클릭 직후 isVisible 한 번으로 놓친 경합. 수정 후 같은 지연 조건1개 통과. [원격 기록](https://github.com/DonghyunT/cs-class/actions/runs/38437567017) |

현재 검사 개수는 목록 조회로 확인하며 과거 개수·시간을 고정 상한으로 쓰지 않습니다. 상세 합성 진단은 Git 제외 `scratch/ci-navigation-fix/`, 이번 구조 정리의 근거는 `scratch/architecture-clarity/`에 있습니다.

## 다음에 이어갈 작업

1. PR의 후속 정책 변경과 최신 선별/스모크 CI 결과를 확인한 뒤 사용자가 수동 병합합니다. PR 업데이트는 자동 CI를 실행하며 전체 E2E를 반복하지 않습니다. 기존 전체 CI는 `178f4d8`의 기록이고, PR CI는 GitHub의 임시 병합 ref를 checkout하므로 실행의 대상 HEAD·기준 main을 함께 확인합니다.
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
