# 이어갈 작업

갱신: 2026-10-05(Asia/Seoul). 현재 정책은 [PRD](PRD.md), 화면 기준은 [DESIGN](DESIGN.md), 실행은 [DEVELOPMENT](DEVELOPMENT.md), 서버 대상은 [FIREBASE_SETUP](FIREBASE_SETUP.md)을 따릅니다. 완료한 릴리스의 상세 기록은 [보관함](archive/README.md)에 있습니다.

## 현재 작업 상태

| 항목 | 상태 |
| --- | --- |
| 브랜치·미커밋 | `codex/classroom-response-region`, 기준 main `dd5db67`. 원작 실습 복원은 PR #23·#24로 병합·운영 반영했습니다. 현재 서버 지역 설정과 담당 문서만 수정하며 커밋 뒤 미커밋 없음 |
| 승인 범위 | 2026-10-05 사용자 승인 [통합 구현 기준](reference/algorithm-review-integration.md). 운영 비밀 변수 등록·사용자의 직접 결제 연결·AI TTL 활성화·단계별 공개를 완료했습니다. 18:42 KST에 11반 모두 세 복습이 열려 있으며 학생 계정·명부·기존 작품은 변경하지 않았습니다 |
| 다음 행동 | 서울 함수 지역 변경의 독립 리뷰·전체 CI 뒤 운영에 반영하고 배포 지역·SHA·별칭·인증 응답을 확인합니다. 실제 계정의 반 선택·메뉴 이동 체감은 새로고침 뒤 관찰합니다 |
| 사용자 선택 | 반은 메뉴·새로고침 동안만 기억하고 실제 재로그인하면 기본 반. 기본 실습 화면을 간결하게 하고 넓게 보기는 학생이 선택 |
| 검증 | 이번 지역 설정: Windows·Node24·Java21·Chromium·demo Auth9099/Firestore8080·`next start`, typecheck/lint/build·순수12개·학생/교사/반 선택/메뉴/저장/권한/실습 영향32개 성공(1.4분). 실제 운영 지역 변경·전체 CI는 아래 성능 기록에서 구분합니다. 이전 원작 UI의 전체 CI/배포는 아래 릴리스 기록을 유지합니다 |

## 이번 작업의 구현·수업 준비

- 원작 실습 표현을 복원했습니다. 샌드위치의 `980×450` 조리대·재료/칼·8종 상태·명령 대화/누적 기록·단계별 재생, 추상화의 색상 워크북·상황/고민 카드·핵심/노이즈·닥터/처방전, 순서도의 기호 보관함·실제 끌어놓기/키보드 배치·실행 기호 강조·계획/자유 캔버스를 연결했습니다. 세 실습의 넓게 보기·Escape 복귀는 기존 AppShell을 재사용합니다. 320/390/820/821px·줄인 모션·콘솔·실제 그림·저장/재접속/제출/교사 요청을 확인했습니다. 캔버스 창 축소 시 첫 기호가 잘리는 실패를 재현하고 화면 중심 보존 후 같은 조건을 통과했습니다. 원작 음성 입력/읽기는 추가하지 않았으며 픽셀 단위 동일성을 주장하지 않습니다. 캡처는 Git 제외 `scratch/review-lessons/review-*-original-ui-*.png`입니다. 소스650개·브라우저 빌드40개에서 서버 비밀값 포함0건을 확인했습니다.
- 복원 커밋 `d3c73ca` 독립 리뷰 P1/P2 없음·P3 한 건(실패한 도포의 칼 움직임). 실제 빌드에서 중간 재생 위치의 실패를 재현하고 오류 단계에는 움직임을 적용하지 않도록 수정·검사를 보강했습니다. 이 수정 때문에 이전 SHA의 CI 두 실행은 취소했으며 성공 결과로 세지 않습니다.
- 알고리즘 세 복습의 학생·교사 흐름을 구현했습니다. 응답 유실 복구·제공자 오류의 교사 확인·불완전 입력·이전 제출본을 보존합니다. 최종 독립 리뷰의 목록 잘림·캔버스 초기화·퍼즐 실행 보정을 재현 후 수정했습니다. 실제 Solar에서 발견한 타 역할 명령 혼입·모호한 판정의 실행 명령·필수 조건 false pass도 보강했고, 빈 줄 P2는 수정·독립 재검토를 마쳤습니다. 실제 연결·근거 검사의 검증 범위와 남은 한계는 [구현 기준](reference/algorithm-review-integration.md)을 따릅니다. 키는 Production Sensitive·Git 제외 로컬 파일에만 두며 코드·로그·문서에 원문을 보관하지 않습니다. 운영 키 등록 승인 대기는 해소됐습니다.
- 운영 반 설정은 샌드위치→추상화→순서도 순서로 각각 백업/계획·11반 원자적 적용·읽기 전용 대조를 마쳤습니다. 2-1의 열린 테스트 세 수업만 제외했고 11반 모두 새 복습 세 개·이번 수업 null입니다. revision은 2-1이6→9, 나머지0→3입니다. 기존 강아지 설정 등 다른 설정과 작품/계정은 보존합니다. Firestore `(default)`·Standard·서울에서 인덱스/필드 override를 백업한 뒤 AI 요청·캐시 TTL 두 항목만 적용해 17:48 KST에 ACTIVE를 확인했습니다. 학생 작품·제출에는 TTL을 적용하지 않았습니다.

- 열린 수업 첫 조회는 공통 스켈레톤을 재사용하고, 수동 새로고침·재시도는 처리 표시를 제공하며 기존 기록·버튼 초점을 유지합니다. 실패·느린 조회 중에도 화면 탐색은 가능합니다. 진행 상세·저장 안내의 가독성과 순서 이동·힌트 터치 영역을 보강했으며 학습·제출 규칙과 DB 계약은 유지했습니다.
- 계층형 검증으로 지연·실패·재시도 검사부터 실행하고, 영향 범위의 저장·재접속·실제 Entry 조립/실행/중지·제출을 확인했습니다. 독립 리뷰에서 Critical/Important 0, 카드 전용 CSS의 글자 크기 override 1건을 발견해 수정했습니다. 별도로 빌드 캡처에서 공통 Skeleton 규칙의 크기 override를 발견해 수정 전 카드 형태 검사의 실패를 재현하고, 화면 컨테이너로 CSS 우선순위를 한정해 수정했습니다. 최종 빌드 검사24개는 실패0이며 마지막 수정의 독립 리뷰도 추가 지적 없이 완료했습니다. 실제 화면 읽기 프로그램의 음성 출력은 검사하지 않았습니다. 화면·검사 산출물은 Git 제외 `scratch/ui-polish-2026-10-05/final/`, 수정 전 재현은 같은 폴더 상위의 `skeleton-red/`에 둡니다. 검사용 앱·에뮬레이터는 종료하고 3000·9099·8080의 리스너가 없음을 확인했습니다.
- 합성 명부 검사는 11반297명 Excel 변환의 원문 보존·이름/기존 비밀번호 제외, 충돌 거절, 등록·반별30분 발급·개인 비밀번호 변경·기존 작품 보존·제한된 백업을 확인했습니다. 실제 학생 자료는 읽거나 등록하지 않았습니다. 빈 작성 양식 `outputs/classroom-readiness/학생명부_작성양식.xlsx`는 이 PC에 있으며 Git 제외입니다. 운영 적용 절차·첫 수업 순서는 [개발 안내](DEVELOPMENT.md#실학생-명부-준비와-반별-발급)를 따릅니다.
- 사용자와 `grilling`·`ui-ux-pro-max`·`prioritize-features`로 범위를 확정한 [세 복습 통합 계획](reference/algorithm-review-integration.md)의 로컬 구현·검증을 마쳤습니다. 기존 우리 반 질문 제안보다 이 통합을 우선했습니다. 구현·작은 대상 검사·독립 리뷰·회귀 수정의 루프를 적용했고, 원본 엔진/데이터와 기존 단일 저장 writer를 재사용해 의존성 추가를 피했습니다.
- 2026-10-05 원본 `D:\workspace\algorithm-studio`를 읽기 전용으로 확인했습니다. 운영 기준 main `bc8d51f`의 세 수업 데이터·실습 엔진은 로컬 HEAD `df0bd75`와 동일합니다(퀴즈의 버튼 스타일·속성 차이 제외). 보관된 V1 순서도 엔진은 차이가 있어 이번 구현은 지정 원본을 대조했습니다. 원본 운영 AI·제출·학생 자료는 조회/변경하지 않았습니다.

## 이전 1~7번 UI 개선의 경계

기존 색·글꼴·학습 완료 기준·DB 계약·외부 호출/예약을 유지합니다. `submissionCountFor`는 제출 학생과 최신 미션 작품 수를 구분하고, 선택 평균 도전은 기본 네 미션 완료에서 제외합니다. 자동 저장·검증 통과·제출 저장 성공은 별도 상태이며 수정 중에도 이전 제출본/완료는 보존합니다.

루프 엔지니어링은 담당 파일·공통 인터페이스를 명시한 세 작업으로 나누고 작은 변경·대상 검사·독립 검토·수정 순서로 적용했습니다. 최종 공통 화면 변경만 lint/build/전체 E2E에 통합했습니다. 저장되지 않는 개념/퀴즈 위치를 약속하던 안내는 검토 후 단계명으로 수정했고, 넓게 보기의 모바일 메뉴→데스크톱 전환은 React 갱신 뒤 본문 초점으로 처리했습니다. 새 의존성과 범용 상태 관리 모듈은 추가하지 않았습니다. 일회 장부/차이 출력은 정리하며 필요한 로컬 화면·검토/실행 증거만 Git 제외 `scratch/release-verification/2026-10-05-ui/`에 보존합니다. 아래 실행 사실은 다른 PC에서도 이 문서로 확인할 수 있습니다.

## 통합·배포 상태

프로젝트 `cs-class`/`cs-class-f74c4`, [운영 사이트](https://cs-class-donghyunt.vercel.app)입니다. 세 복습 통합과 11반 공개를 완료했습니다. 이전 기능 릴리스와 작업 재개 시 확인은 아래에 구분합니다.

### 10/5 원작 실습 UI 복원 공개

- 기능 `12b00e7dd6559059836eb34b1b9f3a768159ce7b` → [PR #23](https://github.com/DonghyunT/cs-class/pull/23) → main `448d61f512940211859d31bc49421b1145e3f646`, 전체 트리 차이 없음. [PR CI](https://github.com/DonghyunT/cs-class/actions/runs/37299369055)·[브랜치 CI](https://github.com/DonghyunT/cs-class/actions/runs/37299363271)는 lint/typecheck/순수12개/build와 각각 전체135개 성공·Windows 기본 .NET 명부 변환1개 제외입니다. E2E는12.0/10.7분, 전체 job14분39초/13분9초입니다. Windows 로컬은 같은 수정본 영향26개 성공(1.6분)이며 이전27개에 반 설정 CLI 복구도 포함합니다.
- `d3c73ca` 고정 독립 리뷰의 P3(실패 도포의 칼 이동)를 실제 빌드 중간 재생에서 재현·수정했습니다. `12b00e7` 재검토는 해당 P3 해결·P1/P2/추가 지적 없음입니다. 원작 SVG/색·실제 기호 놓기·실행 강조·320/390/820/821px·모션 줄이기·키보드/초점/44px·콘솔·작성/제출/교사 요청과 기존 강아지 작업실을 확인했습니다. 초기 화면 외 작성된 처방전·자유 순서도의 모바일 캡처도 확인했습니다.
- 배포 `dpl_ArsRbzJJqkKQuXHt6QQLPtTEdTJu`/`cs-class-di8ugl37e-donghyunt.vercel.app`: READY·Production·위 main SHA·운영 별칭 일치.20:10 KST `/api/auth/config`는 configured=true·`cs-class-f74c4`·에뮬레이터 없음·게스트 비활성화, `/api/auth/session`은200/세션없음 JSON이며 익명 학생/교사/AI API는401입니다. 실제 학생 로그인 화면의 준비·입력 가능·초점·콘솔 오류0을 확인했습니다. 새 계정을 운영에 넣거나 실제 Solar/Google OAuth를 실행하지 않았습니다.
- 배포 전후11반의 열린 수업/이번 수업/revision을 읽기 전용으로 대조해 동일함을 확인했습니다. 운영 AI 집계는0레코드/0호출이며 새 유료 AI 호출은 없습니다. 소스650개·브라우저 빌드40개에서 서버 비밀값 포함0건입니다. 로컬 검증 계정/공유 반 설정을 복구하고 격리 미리보기 작품을 정리한 뒤3000·9099·8080과 에뮬레이터 보조 포트의 리스너가 없음을 확인했습니다.
- 원작 음성 입출력·픽셀 단위 동일성·실기기 터치 끌기·화면 읽기 프로그램 음성·새 Google OAuth·학교망은 이번 검증 범위에 포함하지 않습니다. 실제 Solar의 기존 오판 한계는 [실행 장부](reference/algorithm-review-integration.md#실행-장부)를 유지합니다. 이 후속 기록은 문서만 변경하며 검증한 기능 코드와 동일함을 확인한 뒤 내용/링크/`git diff --check`로 검사합니다.

### 10/5 세 복습 운영 공개

- 구현 `9ac8142667dea3bbd0c146be99d6fa5fed762521` → [PR #21](https://github.com/DonghyunT/cs-class/pull/21) → main `6bad59bfe2c8e71ff5cea7a6bacdbef7eba0df73`, 전체 트리 차이 없음. [PR CI](https://github.com/DonghyunT/cs-class/actions/runs/37289819986)·[브랜치 CI](https://github.com/DonghyunT/cs-class/actions/runs/37289813560)는 lint/typecheck/순수12개/build와 전체130개 성공·Windows 전용1개 제외입니다. 기존 Windows 전체130개는 `c892d66`의 결과(8.9분)이며 이후 최신 영향19개와 Linux 전체 결과를 구분합니다.
- 배포 `dpl_F72EVtuCbrewSa6V4MEixHPv1bcA`/`cs-class-a3mdztiow-donghyunt.vercel.app`: READY·Production·위 main SHA·운영 별칭 일치. 18:40 KST 운영 `/api/auth/config`는200/configured=true/승인 프로젝트/에뮬레이터 없음/게스트 비활성화, `/api/auth/session`은200/세션없음 JSON이며 인증 없는 학생·교사·AI API는401입니다. 실제 화면에서 학생1280px 입장 버튼과 교사390px Google 버튼 준비·가로 넘침 없음·콘솔 오류0을 확인했습니다. Google 버튼 준비를 새 OAuth 세션 성공으로 표현하지 않습니다.
- 18:41~18:42 KST 샌드위치→추상화→순서도 11반 공개를 각각 적용했습니다. 단계별 before/after/revision 대조와 마지막 계획 재적용의 `already-completed`를 확인했습니다. 운영 AI 장부는18:42 시점0문서/0호출이며 운영 학생 자료로 품질 검사를 하지 않았습니다.
- Git 제외 `scratch/review-lessons/production-{sandwich,abstraction,flowchart}-plan-release-20261005.json`과 전후 점검 JSON을 이 PC에 보존합니다. 전체 공개 전 설정으로 한 번에 복구하는 `production-full-restore-plan-release-20261005.json`은 원본 백업을 유지하며 현재 공개 설정/revision에 맞춰 준비했습니다. 원본 revision을 되살리지 않고 현재값을 증가시킵니다. 독립 리뷰 P1/P2 없음이며 실행은 [복구 절차](DEVELOPMENT.md#알고리즘-복습-수업)를 따릅니다. 이 파일들은 Git clone에 포함되지 않으므로 다른 PC에서 복구하려면 비공개로 따로 전달해야 합니다.
- 동일 전체 복구 계획의 프로젝트 ID만 demo로 바꿔 새 로컬 Auth9099/Firestore8080에서 실제 CLI 복구·반복 적용·중간 설정 변경의 전체 거부·다른 필드 보존을 확인했습니다. 운영에서는 복구를 실행하지 않았습니다. 이 추가 확인은 기존 전체 E2E 결과와 별도입니다.
- 키 원문은 추적647파일·브라우저 배포37파일·당시 로컬 작업34파일 검사에서0건입니다. Production Sensitive와 Git 제외 로컬 ACL 제한을 확인했고 임시 비밀 참조를 정리했습니다. 실제 AI 오판·합성 유료 호출·미검증 범위는 [실행 장부](reference/algorithm-review-integration.md#실행-장부)를 따릅니다.

### 10/5 작업 재개 시 운영 확인

배포 `dpl_7fm4yHqSxDEoxcfHLTRN14ixGtPT`/`cs-class-l270i37wx-donghyunt.vercel.app`은 READY·Production이며 기준 main `3712e99cb894c78d2f3f5e47faecc4e6fa1fc759`와 운영 별칭이 일치했습니다. 운영 익명 `/api/auth/config`는 200·configured=true·`cs-class-f74c4`·에뮬레이터 없음·게스트 비활성화, `/api/auth/session`은 200·세션없음 JSON입니다. 새 Google OAuth 로그인·실학교 사용·자연 Cron은 확인하지 않았습니다. 아래 02:26 기능 릴리스 결과와 이번 작업의 배포 완료를 혼동하지 않습니다.

### 10/5 교실 UI 개선 릴리스

- [PR #19](https://github.com/DonghyunT/cs-class/pull/19), 기능 커밋 `ff55eb5` → main `de4ebd625ed8fae03931b3372cbb68ac59fc1ae3`. 두 트리의 diff 없음. [PR CI](https://github.com/DonghyunT/cs-class/actions/runs/37219625115) 성공: lint/typecheck/build·전체108통과/Windows 전용1개 제외(9.1분). [브랜치 CI](https://github.com/DonghyunT/cs-class/actions/runs/37219622164)도 같은108개 성공(7.7분).
- Windows 로컬은 프로덕션 빌드 `next start`·demo Auth9099/Firestore8080·단일 worker로 전체109개 실행(6.6분) 후 위 게스트 파일5개를 새 에뮬레이터에서 재검증했습니다. 제품 코드는 두 실행 사이에 변경하지 않았습니다. 신규12개를 포함해 실제 Entry 팔레트 조립/입력/실행/중지/저장/검증/제출/재접속·27명 동시 API·권한/실패 경계·학교 합성 시간표를 검사했습니다. 기본1280px 실습 iframe 시작은 기존1031px에서740px 이내로 확인했고, 같은 iframe/작품·320/390/820/821px·초점·콘솔을 확인했습니다. 화면 밖 모바일 iframe은 스크롤 후 실제 그리기를 확인해 촬영했습니다.
- 운영 배포 `dpl_DcZ2QN8dT9qkEwAJKi6byAvXYobo`/`cs-class-7d0y1ykip-donghyunt.vercel.app`: READY·Production·위 main SHA·운영 별칭 일치를 확인했습니다. 생성~준비 약40초. 운영 익명 `/api/auth/config`는 configured=true·승인 Firebase 프로젝트·에뮬레이터 없음·게스트 비활성화, `/api/auth/session`은200/세션없음 JSON입니다. 학생/교사 수업 API와 인증 없는 Cron은401, 이전 sigma 주소는 경로/쿼리를 유지해307 이동했습니다. 학생1280px·교사1280/390px 로그인 조작 준비·화면·콘솔 오류0을 확인했습니다. 새 배포의 최근5분5xx 집계 조회는 결과없음이며 전체 운영 이력의 무오류 주장으로 확대하지 않습니다.
- 작업별/전체 독립 검토에서 Critical/Important0. ordinary Entry 교사 문구의 입력값/표현식만 바뀐 UI fixture 보강은 비차단 후속1건이며 현재 `practiceMatches` 구현과 기존 의미 비교/Entry 검사는 통과했습니다. 실제 새 Google OAuth 세션·실학생·학교망·OS IME·자연 Cron은 이번 검증에서 시도하지 않았습니다. 운영 계정·명부·수업 설정·학습 기록 변경 없음.

### 10/4 실제 수업·시간표 운영 릴리스

[PR #18](https://github.com/DonghyunT/cs-class/pull/18)에서 실제 13차시·명부·금옥중학교 정보 시간표를 병합했습니다. 최종 Windows 97개와 Linux CI 96개/Windows 전용1개 제외, 운영 익명 API·Cron 인증/중복·공개26개 첫 저장과 플랫폼 수동 Run 200을 확인했습니다. 당시 SHA·배포ID·CI·실제 공개 연결·합성 검사 범위는 [보존 원문](archive/cs-class/2026-10-05-before-ui-refinement/HANDOFF.md#104-실제-수업시간표-운영-릴리스)에 있습니다. 첫 자연 예약은 10/5 한국19:00~19:59로 아직 관측하지 않았으며 이번 UI 작업에서 검증했다고 표현하지 않습니다.

### 10/3 운영 테스트 계정 발급

사용자가 승인한 운영 체험 학생11개·교사1개와 담당1~11반의 일회 발급 근거는 [보존 원문](archive/cs-class/2026-10-05-before-ui-refinement/HANDOFF.md#103-운영-테스트-계정-발급)에 있습니다. 발급 원문/비밀은 Git에 넣지 않습니다. 이번 복습 통합은 반별 열린 수업만 변경했으며 운영 계정·명부·학습 기록은 유지했습니다.

## 다른 PC에서 이어가기

1. AGENTS와 현재 작업 상태를 읽고 Git 브랜치·미커밋/미추적 파일을 보존합니다. 완료한 main을 fetch/pull하며 과거 이식 ZIP을 최신 코드 위에 덮어쓰지 않습니다.
2. 요청의 [PRD](PRD.md)·[DESIGN](DESIGN.md) 담당 절과 실제 코드를 대조합니다. 캐시·Java·EntryJS·에뮬레이터 준비는 [개발 안내](DEVELOPMENT.md#다른-pc에서-시작)를 따릅니다.
3. 새 실행 결과는 날짜·환경·범위·한계를 따로 적습니다. 과거 결과를 새 검증으로 표현하지 않습니다. 실학생 명부 작성/등록은 [별도 절차](DEVELOPMENT.md#실학생-명부-준비와-반별-발급)를 따릅니다.

## 교실 입장·대시보드 조회 성능

### 10/5 서버 함수 지역 조정

사용자가 메뉴·반 선택 등 전반적인 지연을 보고했습니다. 운영 `dd5db67`의 Vercel 배포 `dpl_BKFecLGRTpybC1eBwsK6hBoNPTzq`는 `regions: ["iad1"]`(미국 동부)였으며 Firestore `(default)` 메타데이터는 서울 `asia-northeast3`였습니다. 인증과 반 조회·저장이 이 DB를 사용하는 코드 경로를 대조했습니다. 장거리 통신은 공통 지연 요인이므로 `vercel.json`의 함수 지역만 서울 `icn1`로 지정합니다. 설정과 복구 절차는 [서버 기준](FIREBASE_SETUP.md#vercel-서버-설정)을 따릅니다. 화면·학습 규칙·단일 저장 writer·실패 시 이동 차단·계정/반 설정/작품·Cron 시각은 변경하지 않습니다.

- Windows 로컬 프로덕션 빌드·demo 에뮬레이터에서 typecheck/lint/build·순수12개·영향32개 성공(1.4분). 학생 단계/메뉴/저장 실패·다른 탭 충돌, 교사 반 선택/수업 설정/필터, 실제 실습 조작과 권한 경계를 확인했습니다. 새 유료 AI 호출이나 운영 합성 계정/시드는 없습니다. 전체 CI·독립 리뷰·운영 서울 배치의 확인은 공개 뒤 기록합니다.
- 변경 전20:39 KST 운영 익명 `/api/auth/session`은 첫316ms, 연속5회 중앙값213ms·최대218ms였습니다. 응답은200/세션없음이며 쿠키·헤더·응답 전문은 보관하지 않았습니다. 이 수치는 인증된 교사/학생 조회나 DB 통신을 측정하지 않으므로 반 선택의 개선율로 표현하지 않습니다. Git 제외 `scratch/review-lessons/anonymous-session-before-20261005.json`에 시간·SHA·지역·표본만 보관합니다.
- 운영 로그 도구는 해당 로그 범위403으로 실패했고 지연 집계 도구는 Observability Plus 요구402로 반환했습니다. 로그 없음으로 해석하거나 유료 업그레이드를 적용하지 않았습니다. 배포 메타데이터·공식 지역 설정과 익명 응답으로 검증하며 실제 로그인한 반 선택·학교망 지연과 개선 폭은 미측정입니다.

일괄 조회는 이전 릴리스에 포함됐습니다. 9/30 로컬 측정은 [메타데이터](reference/dashboard-performance/2026-09-30.json)와 [보존 기록](archive/cs-class/2026-10-01-before-programming-release/HANDOFF.md)에 있으며 이번 UI 작업의 새 운영 수치가 아닙니다. 운영 입장·세션 지연은 [측정 절차](DEVELOPMENT.md#대시보드-성능-측정)에 따라 별도 확인합니다. 실제 RPC·청구 문서 수·학교망 성능·운영 개선율은 확인하지 않았습니다.

## 남은 한계와 다음 결정

- 실학생 명부·초기 전달·학년도/수업 버전·보관/백업·실제 학교 브라우저의 세션 복원, 도움/Q&A/AI/작품집/교사 콘텐츠 편집은 [PRD](PRD.md#다음에-결정할-것)의 후속입니다.
- EntryJS 전체 블록의 키보드/터치·실제 OS IME, 범용 자유 제작·실학교 사용성/수업 시간/평가 타당성은 이번 범위 밖입니다. 미전송 초안은 메모리에 남으며 강제 종료 복구는 [저장 정책](PRD.md#작업-저장과-통신-비용)을 따릅니다.
- 이전 Stitch/Firebase CLI 인증 폐기·재발급 여부, 9/28 의존성 중간 경고5개(운영2개), Actions/Java Action 폐기 예고는 기존 미확인 후속입니다. 이번에 새 검사나 해결로 표현하지 않습니다.
- 실제 새 Google OAuth 세션 생성·학교망·자연 Cron 실행은 로컬 합성 검사와 운영 익명 확인의 한계로 남습니다.
