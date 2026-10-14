# 이어갈 작업

갱신: 2026-10-14(Asia/Seoul). 아래 현재 작업과 운영 릴리스 기록을 구분합니다. 확정 기능은 [PRD](PRD.md), 화면은 [DESIGN](DESIGN.md), 실행·검증은 [DEVELOPMENT](DEVELOPMENT.md), 작업 규칙은 [AGENTS](../AGENTS.md)를 따릅니다.

## 현재 작업 상태

작업 브랜치 `codex/architecture-clarity`, 시작 기준 `main@6c778dd9e2796fbbe6b9c8bf8c8b6f2cf25a41fd`입니다. [셀프 계획서](superpowers/plans/2026-10-14-architecture-clarity.md)로 구조 정리를 수행하고 [PR #38](https://github.com/DonghyunT/cs-class/pull/38)을 등록했습니다. 사용자가 병합 전 CI 정책 복원을 요청해 같은 PR에 후속 수정합니다. main 병합은 사용자가 직접 수행하며 자동 머지는 사용하지 않습니다. 원격 CI의 최신 결과는 PR과 해당 HEAD의 Actions 실행에서 확인합니다.

- 홈 CSS를 기본/입장 선택창, 히어로, 수업 시연, 역할 안내, 하단 입장/푸터로 분리했습니다. 기존 `public-home.css`를 단일 진입점으로 유지하며 공통 반응형·모션·후행 규칙은 마지막에 둡니다. import를 펼친 내용과 원본이 정확히 일치합니다.
- `hasRecoveryFields`·`hasActionResult`를 `student/work-recovery.ts`로 옮겼습니다. `useWork`의 상태·저장·AI·이탈 책임은 그대로입니다. 서버 없는 `playwright.logic.config.ts`의 복구 경계 검사 12개가 통과했고 `test:review`에 연결했습니다.
- HANDOFF의 과거 상세를 [구조 정리 전 원문](archive/cs-class/2026-10-14-before-architecture-clarity/HANDOFF.md)으로 바이트 그대로 보존했습니다. 기존 보관 파일은 변경하지 않습니다. DEVELOPMENT의 대기 기준에서 `networkidle` 권고를 보정했습니다.
- 구조 정리 당시 공통 훅·스타일·설정의 영향 판정은 `full`이었고, 사용자가 **관련 검사와 공통 스모크만** 실행하도록 선택했습니다. 로컬 전체 E2E는 실행하지 않았습니다. 관련7파일54개·리뷰/복구28개·정책/문서15개와 타입·린트·빌드를 통과했습니다. 읽기 전용 독립 리뷰의 Critical/Important 지적은 없었고 보관 출처를 Windows 작업 트리로 명시하라는 제안을 반영했습니다.
- 구조 정리 커밋 `178f4d8`의 [수동 전체 CI](https://github.com/DonghyunT/cs-class/actions/runs/38539265058)는 성공했습니다. E2E402개 통과·Windows 전용1개 생략·실패0, E2E28.8분·job31분18초입니다. 이 결과를 후속 CI 설정 변경까지 검사한 결과로 읽지 않습니다.
- 후속 정책: PR·main의 자동 CI는 선별/전체 등록 수업 스모크이며 전체 E2E는 `workflow_dispatch` 수동 실행만 허용합니다. 공통 변경·비교 실패·남아 있는 `full` 계획도 자동 전체 실행 사유로 쓰지 않습니다. 앱 런타임 코드는 후속 정책 수정에서 변경하지 않습니다.
- 후속 로컬 검증: 정책/러너·문서19개, 리뷰/복구28개, lint·typecheck·문서 링크/앵커·diff 검사 통과. 읽기 전용 독립 리뷰에서 조치가 필요한 유의미한 결함은 없었습니다. 후속 원격 결과는 최신 PR 자동 CI와 PR 본문에 기록합니다.

## 최신 운영 릴리스 기록

다음은 이전 작업에서 **10/14 12:33 KST에 확인한 기록**입니다. 이번 구조 정리에서 운영 상태를 재조회하거나 새 코드를 공개한 결과가 아닙니다.

- 앱 릴리스 기준은 `main@0c32a3b1a8d4ccc69f4475f94c47b8c38b4e5ada`입니다. CI 실패 수정 `a874e37`과 문서 보정 `cef2b64`를 통합했고, 문서 마감 HEAD `6c778dd`와 앱 배포 SHA를 구분합니다.
- 사용자 요청으로 당시 GitHub CI를 생략하고 동일 실행 트리의 로컬 검증을 재사용했습니다. `[skip ci]`로 해당 SHA의 Actions 실행은 생성되지 않았습니다. Vercel 자동 빌드 후 운영 별칭이 이전 배포에 남아 수동 Promote API로 공개했습니다. 기존 workflow·GitHub app 배포 검사 설정은 유지됐으며 다음 일반 릴리스는 기존 정책을 따릅니다.
- 운영 배포는 `dpl_8GKENV11fbMUPpSVUERMPNBFvdKF`·READY·icn1·위 앱 SHA와 [운영 별칭](https://cs-class-donghyunt.vercel.app)의 배포 ID 일치를 확인한 기록입니다. 직전 복구 후보는 `faaa82a0d001f11d49aafee3a65a4544cabdc71e`·`dpl_3hbBQeC2YXT949GXW32KL4QAQiyX`입니다. 복구 절차는 [FIREBASE_SETUP](FIREBASE_SETUP.md#vercel-서버-설정)을 따릅니다.
- 당시 익명 config/session 및 학생·교사 로그인 페이지 200, 익명 수업 API 401·SIGNED_OUT, 인앱 Chromium 로그인 버튼·콘솔 오류/경고0을 확인했습니다. 실제 계정 로그인·Google OAuth·AI·학생 저장/제출은 실행하지 않았습니다.

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
