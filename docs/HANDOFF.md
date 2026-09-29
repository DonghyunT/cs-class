# 이어갈 작업

갱신: 2026-09-30. 현재 상태·검증 범위·다음 행동을 관리합니다. 제품 정책은 [PRD](PRD.md), 화면 기준은 [DESIGN](DESIGN.md), 실행은 [DEVELOPMENT](DEVELOPMENT.md), 서버 설정·복구는 [FIREBASE_SETUP](FIREBASE_SETUP.md)을 따릅니다.

## 현재 작업 상태

| 항목 | 2026-09-30 확인 |
| --- | --- |
| 저장소·작업 브랜치 | `DonghyunT/cs-class` · `main` |
| 미커밋 상태 | 없음. EntryJS 구현·검증·병합·운영 배포 기록을 원격 `main`에 반영함 |
| PR | [#10](https://github.com/DonghyunT/cs-class/pull/10) — 2026-09-30 병합, 순서도·엔트리봇 수업과 서버 솔루션 분리, 실제 EntryJS 실습 |
| 검증 | Node 24.19.0·Java 21.0.12.1·Windows에서 lint·typecheck·build·전체 E2E **38개 통과**. [main CI](https://github.com/DonghyunT/cs-class/actions/runs/36601913490)도 새 Linux 설치부터 전체 E2E 38개까지 통과 |
| 배포 | `49ed3c6439e4d9ee4d7862ae99a2b372a619e4d2`의 Vercel Production `dpl_E8wV1Ts1my4nemUskiEeEM82UDBi` READY, [운영 주소](https://cs-class-donghyunt.vercel.app)의 읽기 전용 점검 통과. 최신 문서 커밋의 CI·배포는 각 서비스에서 SHA를 대조 |
| 다음 행동 | 다른 PC에서 최신 `main`과 이 문서를 읽고, 다음 EntryJS 과제의 학습 목표·지원 블록·검사 조건을 결정. 실학생 적용 범위와 데이터 정책은 별도 협의 |

이번 작업에서 사용자는 실제 EntryJS 실습 하나의 구현과 완료 후 커밋·병합·배포·문서 정리를 요청했습니다. 대상은 위 GitHub 저장소와 Vercel `cs-class`입니다. 실제 학생 계정 등록·DB 시험·도메인/접근 보호 변경은 범위에 포함하지 않았습니다. 완료 기록을 다음 작업의 자동 승인으로 사용하지 않습니다.

## 구현과 이번 검증

- 수업은 `sequence-lab`(순서와 문제 해결), `flowchart-lab`(순서도), `entry-bot-lab`(엔트리봇의 첫 걸음)입니다. 학생·교사 화면은 같은 수업별 서버 기록을 사용합니다.
- 엔트리봇은 실제 `@entrylabs/entry` **4.0.23** 편집기와 실행 엔진을 사용합니다. 시작 → 오른쪽으로 총 10 이동 → ‘안녕!’을 2초 동안 말하기 과제입니다. 시작 블록 하나에서 학생이 이동·말하기 블록을 연결합니다. 지원 블록·자산 설치·샌드박스·실행 제한은 [EntryJS 개발 안내](DEVELOPMENT.md#entryjs-실습)에 있습니다.
- 실제 프로젝트 JSON의 연결 구조와 입력값을 서버에서 검증합니다. 분리된 코드·잘못된 시작/동작 순서·이동 거리·인사말·시간·생각하기 모드를 통과시키지 않습니다. 입력값 변경은 이전 검증을 무효화하며, 이전 제출본·완료 기록은 재제출 성공까지 유지합니다. 교사 제출 뷰어도 실제 제출된 값으로 표시합니다.
- 자동 저장·재접속 복원, 단계/화면 이동 직전 입력 확정, 저장/자산 로딩 실패 후 복구, 실행 중 초기 무대 보존을 연결했습니다. 작업실·팔레트의 초기 갱신 예약을 순서대로 완료해 입력창이 늦게 닫히는 문제를 수정했고, 자동 저장 뒤 연속 입력도 검사합니다. 이전 자체 미리보기 작품도 읽고 지원 블록으로 변환합니다. 잘못된 저장본은 자동 삭제하지 않습니다.
- 2026-09-30 Windows에서 `npm run lint`, `npm run typecheck`, `npm run build`, `CI=1 npm run test:e2e`를 확인했습니다. 전체 **38개**는 기존 인증·권한·저장·탐색·홈 검사와 실제 EntryJS 조립/입력/실행/무대 복원/검증/제출/수정본 복원, 저장·로딩 실패 복구, 320·390·768px 배치·Esc 초점·키보드 가로 이동을 포함합니다. 정상 EntryJS 경로의 브라우저 오류가 없음을 확인했습니다.
- 테스트는 `demo-cs-class`, Auth `127.0.0.1:9099`, Firestore `127.0.0.1:8080`, 앱 `http://localhost:3000`의 합성 계정만 사용했습니다. 이전 문서의 34개 결과는 자체 미리보기 당시 검사이며 이번 38개 결과를 대신하지 않습니다.
- [데스크톱 1440px](reference/entryjs/2026-09-30/desktop-1440.png)·[모바일 390px](reference/entryjs/2026-09-30/mobile-390.png)는 위 프로덕션 빌드의 합성 계정 화면이며 Git에 포함합니다. 운영 학생 화면이 아닙니다.

## 통합·배포 상태

PR [#10](https://github.com/DonghyunT/cs-class/pull/10)은 검증한 파일 내용과 동일한 병합 커밋 `a22f3fd38c7441de311bd82e4507d526c7f9575e`로 스쿼시 병합했습니다. 머리 `0b9f33482f453ac904edfe669bcddb43e5e654f9`의 [push CI](https://github.com/DonghyunT/cs-class/actions/runs/36600618197)와 [PR CI](https://github.com/DonghyunT/cs-class/actions/runs/36600625704)는 새 Linux 설치부터 38개 E2E까지 통과했고, Preview `dpl_2XbPKvtTAa3soFZ346LPGuhmdqeR`은 READY입니다. 보호된 Preview 본문의 조회는 연결 권한 부족으로 확인하지 못했습니다.

병합 직후 `a22f3fd`의 main push 이벤트·Production 배포는 나타나지 않았습니다(2026-09-30 01:58 KST 확인). 이어서 문서 상태를 갱신한 `49ed3c6439e4d9ee4d7862ae99a2b372a619e4d2`를 `main`에 직접 push했고, [main CI](https://github.com/DonghyunT/cs-class/actions/runs/36601913490)가 새 Linux 설치·lint·typecheck·build·전체 E2E **38개**를 통과했습니다. 해당 SHA의 Vercel Production `dpl_E8wV1Ts1my4nemUskiEeEM82UDBi`도 READY입니다. 애플리케이션 파일은 병합 커밋과 동일하며 이 추가 커밋은 문서만 변경했습니다.

2026-09-30 운영 [CS Class](https://cs-class-donghyunt.vercel.app)를 Chromium에서 읽기 전용으로 점검했습니다. `/api/auth/session`과 `/api/auth/config`는 200이며 Firebase 연결 설정이 확인됐고 에뮬레이터 주소는 없었습니다. 비로그인 학생·교사·작품 API는 401이었습니다. EntryJS 공개 작업실과 4.0.23 자산은 200, 자산 CORS와 OPTIONS 응답은 정상이며, 이전 주소의 로그인 경로·쿼리는 운영 주소로 307 이동했습니다. 교사 로그인 화면의 Google 버튼은 서비스 준비 후 활성화됐습니다. 같은 운영 자산으로 격리된 EntryJS 작업실에 세 블록을 올려 실행해 무대의 `x=10`, ‘안녕!’ 말하기, 종료 뒤 `x=0` 복원과 브라우저 오류 0건을 확인했습니다. 실제 운영 Google 로그인·학생 계정 저장·제출은 이번 배포에서 실행하지 않았습니다. 서버 설정·이전 주소·Firebase 승인 도메인은 [서버 설정](FIREBASE_SETUP.md#vercel-서버-설정)을 따릅니다.

이전 2026-09-29 점검에서는 main `84163e9`의 CI·Production READY, 운영 로그인 화면·세션 JSON·비로그인 API 차단, 사용자의 실제 Google 교사 로그인·대시보드·새로고침 세션 유지를 확인했습니다. 이번 배포의 검증 결과로 표현하지 않습니다. 상세 이력은 [정리 전 원문과 SHA-256](archive/cs-class/2026-09-30-before-entryjs-handoff/manifest.json)에 보존했습니다.

## 다른 PC에서 이어가기

1. [개발 안내](DEVELOPMENT.md#다른-pc에서-시작)에 따라 Git·Node 24·Java 21+를 준비합니다. 기존 체크아웃은 미커밋 변경을 먼저 보존하고 깨끗한 main에서 `git fetch origin`·`git pull --ff-only`로 갱신합니다. 새 작업은 `codex/` 브랜치에서 시작합니다.
2. 저장소 루트에서 `npm ci`와 최초 `npx playwright install chromium`을 실행합니다. EntryJS 자산은 자동 준비됩니다. Java·브라우저·플러그인·인증·캐시는 PC별이며 이 PC의 `scratch/tools/java/`는 Git으로 전달되지 않습니다.
3. `npm run dev:emulator`를 실행합니다. 엔트리봇 실습의 강사/학생 확인 방법은 [EntryJS 개발 안내](DEVELOPMENT.md#entryjs-실습)를 따릅니다. 실제 Firebase 개발이 필요할 때만 본인이 관리하는 안전한 경로로 환경파일·관리자 인증을 준비합니다.
4. 다음 요청 예시: “AGENTS.md와 docs/HANDOFF.md를 읽고 최신 main과 미커밋 상태부터 확인하자. EntryJS 엔트리봇 실습은 구현됐으니 다음 과제의 학습 목표와 검사 조건을 정하자.”

## 남은 한계와 다음 결정

- 이번 실습의 서버 채점은 지원한 세 블록의 구조·상수 값을 검사합니다. 반복·조건·사용자 입력·충돌·난수·자유 제작과 범용 서버 실행 검사, 전체 블록 조립의 키보드/모바일 터치 검증은 후속입니다. AI·Q&A·교사 콘텐츠 편집기·교사 확인 요청도 미구현입니다.
- 실학생 적용 반·학번·초기 비밀번호 전달·학생 공개 범위, 학년도/수업 버전 전환·보관/백업 정책은 별도 합의합니다. 운영 DB에 이번 테스트 계정·작품을 넣지 않았습니다.
- 실제 Google 로그인과 운영 학생 저장·제출은 이번 작업에서 새로 확인하지 않았습니다. Vercel 런타임 로그는 기존에 403으로 제한됐으며 로그가 없다고 판정하지 않습니다.
- 2026-09-29 진단 중 노출된 기존 Firebase CLI 인증의 폐기·재연결 완료 여부는 미확인입니다. 인증 파일을 새 PC로 복사하지 말고 새 PC에서 직접 로그인합니다. 비밀값을 보존하거나 다시 출력하지 않았습니다.
- 2026-09-28 `npm audit`의 중간 경고 5개(운영 2개, `uuid/gaxios`·개발 CLI 경로)는 이전 미해결 기록입니다. 이번 변경에서 다시 검사하거나 무관한 강제 다운그레이드를 하지 않았습니다.
- `.env.local`, 관리자 JSON·비밀번호·학생 엑셀·`백업용/`은 Git에 없습니다. 미전송 초안은 현재 화면 메모리에만 보존되므로 강제 종료 뒤 복구 한계는 [서버 안내](FIREBASE_SETUP.md#데이터와-남은-한계)를 따릅니다.

대시보드·로그인의 기존 참고 화면은 [DESIGN](DESIGN.md), 원문·해시는 [문서 보관함](archive/README.md)에 있습니다. 보관 원문의 경로·현재 상태·승인은 당시 기준입니다.
