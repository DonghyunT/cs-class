# 이어갈 작업

갱신: 2026-09-30. 현재 상태·검증 범위·다음 행동을 관리합니다. 정책은 [PRD](PRD.md), 화면 기준은 [DESIGN](DESIGN.md), 실행은 [DEVELOPMENT](DEVELOPMENT.md), 서버 설정·복구는 [FIREBASE_SETUP](FIREBASE_SETUP.md)을 따릅니다.

## 현재 작업 상태

| 항목 | 2026-09-30 확인 |
| --- | --- |
| 저장소·작업 브랜치 | `DonghyunT/cs-class` · 로컬 `codex/dashboard-visual-polish`. 2026-09-30 이 PC에서 `origin/main`의 `a5ca4aa`를 받은 뒤 분기 |
| 미커밋 상태 | 없음. 현재 대시보드 시각 개선 소스·검사·문서를 로컬 브랜치에 포함. 원격 push는 아직 하지 않음 |
| 통합·배포 | 현재 브랜치는 PR·병합·배포 전. 직전 기능 릴리스인 [PR #11](https://github.com/DonghyunT/cs-class/pull/11)의 Production READY·읽기 전용 점검과 구분 |
| 검증 | 현재 브랜치: Windows Node 24.19.0·Java 21.0.12.1에서 lint·typecheck·build·빌드 앱의 전체 로컬 에뮬레이터 E2E **46개 통과**. 직전 릴리스의 Linux PR·main CI는 아래에 별도 기록 |
| 브랜치 정리 | 이 PC의 이전 로컬 작업 브랜치 2개는 보존. 현재 작업에는 사용하지 않음 |
| 다음 행동 | 학생·교사 대시보드의 새 화면을 검토하고 필요한 시각 조정을 반영. PR·병합·배포와 실학생 적용 범위는 별도 결정 |

## 현재 대시보드 시각 개선

- 학생·교사 공통 홈에 옅은 파랑의 이번 수업 배경, 할 일의 라일락, 일정의 살구색 아이콘·날짜 강조를 적용했습니다. 버튼과 초점의 주요 색은 파랑으로 유지했습니다. 이번 달 미니 달력은 한국 날짜의 오늘과 저장된 일정이 있는 날을 표시하고 아래에 다가오는 일정 최대 3개를 계속 보여줍니다. 월 이동·일정 수정은 대시보드 달력에 넣지 않았으며 전체 일정 메뉴에서 기록을 확인합니다.
- 2026-09-30 Windows에서 `npm run typecheck`·`npm run lint`·`npm run build`, `CI=1 npm run test:e2e`를 실행했습니다. `demo-cs-class`의 Auth 9099·Firestore 8080과 빌드 앱 `http://localhost:3000`만 사용했고, 전체 46개가 통과했습니다. 기존 대시보드 검사는 학생·교사 1440·1024·821·820·768·390·320px, 메뉴/초점·할 일/일정 저장과 실패 복구·콘솔 오류를 확인하며 이번 달 날짜 수·오늘·같은 날 일정 개수 검사를 추가했습니다. 학생·교사 1440·390px 캡처를 직접 확인했습니다.
- 이 PC는 Java 실행 파일이 PATH에 없어 검사 터미널에 `scratch/tools/java/jdk-21.0.12.1+1-jre/bin`을 임시 지정했습니다. Firebase 에뮬레이터는 Git 제외 `scratch/firebase-emulators`에 준비했습니다. 초기 제한 실행의 Java·tar·Playwright 자식 프로세스 `EPERM`은 허용된 로컬 검사 실행에서 해소됐으며, 코드 오류로 취급하지 않았습니다. 운영 계정·DB·배포는 이번 작업에서 사용하거나 변경하지 않았습니다.

## 대시보드 파일럿 구현과 이전 릴리스 검증

- 첫 화면은 개인 `내 할 일`, 실제 수업/제출 기록의 다음 행동, 다가오는 일정과 작은 `이번 수업` 바로가기입니다. 학생의 수업·필터·이어하기·복습은 `/student/lessons`, 교사의 수업 운영은 `/teacher/classes`, 학생 진행·제출·계정은 `/teacher/students`에 있습니다.
- 내 할 일은 체크박스·한 줄 입력·인라인 수정·완료/해제·삭제를 지원합니다. 반 일정은 제목·한국 날짜·선택 수업 연결로 구성하며 교사·강사는 담당 반을 수정하고 학생은 본인 반을 조회합니다. 서버 세션으로 권한을 확인하고 직접 Firestore 접근은 차단합니다.
- 저장 실패 시 변경 의도를 보존하고 이동을 막습니다. 명시적 재시도는 최신 목록에 해당 변경만 적용하며 응답 유실·동시 변경·계정 교체 후 늦은 응답을 처리합니다. 개인 체크는 학습 완료·제출 기록을 바꾸지 않습니다. 한도·충돌·미전송 내용의 경계는 [PRD](PRD.md#작은-버전의-경계와-저장-동작)를 따릅니다.

### 검증 환경과 결과

2026-09-30 Windows PowerShell, Node 24.19.0·Java 21.0.12.1·로컬 Chromium에서 `demo-cs-class`, Auth 9099·Firestore 8080, 앱 `http://localhost:3000`만 사용했습니다. Git 제외 캐시를 재사용했고 운영 계정·DB에는 시드나 합성 자료를 넣지 않았습니다.

| 검사 | 확인 범위와 결과 |
| --- | --- |
| 정적 검사·빌드 | 이번 릴리스 `npm run lint`·`npm run typecheck`·`npm run build` 통과 |
| 전체 E2E | 실행 중인 로컬 demo 에뮬레이터·개발 서버에서 `npm run test:e2e:running` 단일 worker **46개** 통과(4.5분·종료 코드 0). 기존 38개와 [파일럿 8개](../tests/dashboard-pilot.spec.ts) |
| 저장·인증·권한 | 본인/담당 반·직접 DB 차단·만료, 재로그인 복원, 조회/저장 실패·응답 유실·동시 수정·계정 교체, 일정 CRUD/학생 조회 |
| 실제 UI | 빠른 Enter·IME·인라인 수정·Tab/Space·Esc·모바일 체크. 1440/1024/821/820/768/390/320px, 메뉴·양방향 크기 전환 초점, 수업 필터/이어하기·교사 상세 링크. 정상 경로 콘솔/페이지 오류 0건 |
| 문서·자료 | 활성 문서 8개의 로컬 링크/앵커·`git diff --check` 통과. 보관 원문 62개·논의용 이미지 3장의 SHA-256이 작업 파일과 Git 저장 바이트 모두 일치하며 메타프롬프트 원문도 유지. 외부 링크 일괄 검사는 별도 |

릴리스 검증에서 첫 목록 조회가 늦을 때 미편집 상태의 홈·메뉴·로그아웃도 막히는 문제를 수정했습니다. 조회 지연·실패의 회귀 검사를 추가하고 기존 실패 보호·로그인/탐색 등 관련 8개를 먼저 통과한 뒤 전체 46개를 통합 검증했습니다. 앞선 45개 프로덕션 빌드 검사와 보강 검사 상세는 보관 원문에 있습니다.

[학생 1440px](reference/dashboard-pilot/2026-09-30/student-1440.png)·[학생 390px](reference/dashboard-pilot/2026-09-30/student-390.png)·[교사 1440px](reference/dashboard-pilot/2026-09-30/teacher-1440.png)·[교사 390px](reference/dashboard-pilot/2026-09-30/teacher-390.png)는 파일럿의 프로덕션 빌드(`next start`)·합성 계정으로 촬영했습니다. 운영 학생 화면이 아닙니다. [논의용 원본 3장](DESIGN.md#대시보드-파일럿--노션을-참고한-내-할-일)도 수정 없이 Git에 포함합니다.

새로고침·로그아웃/재로그인 복원은 에뮬레이터를 계속 실행한 조건입니다. 종료 후 데이터 유지·운영 학생 저장·제출은 이 검사로 보장하지 않습니다. Java PATH 오류의 해결과 새 터미널 준비는 [개발 안내](DEVELOPMENT.md#다른-pc에서-시작)를 따릅니다.

## 통합·배포 상태

연결 대상은 GitHub `DonghyunT/cs-class`, Vercel `cs-class`(`prj_RUUtcTMukVY9kjudgDr6VA89KKxP`), Production 브랜치 `main`입니다. [운영 주소](https://cs-class-donghyunt.vercel.app)·이전 주소 이동·환경 설정은 [서버 안내](FIREBASE_SETUP.md#vercel-서버-설정)를 따릅니다.

- PR [#11](https://github.com/DonghyunT/cs-class/pull/11)은 머리 `f1f54e29e3ac2744535acd973324040cff827dad`를 병합 커밋 `d2fcfa8991a3a99e887de83074e6811a51cf3675`로 통합했습니다. 두 커밋의 파일 트리가 같음을 확인했습니다.
- [push CI](https://github.com/DonghyunT/cs-class/actions/runs/36684508409)·[PR CI](https://github.com/DonghyunT/cs-class/actions/runs/36684521124)·[main CI](https://github.com/DonghyunT/cs-class/actions/runs/36685157563)는 새 Linux 설치·lint·typecheck·build·전체 에뮬레이터 E2E **46개**까지 통과했습니다. 기능 릴리스의 고정된 근거이며 후속 문서 커밋의 최신 결과는 [main 실행 목록](https://github.com/DonghyunT/cs-class/actions/workflows/verify.yml?query=branch%3Amain)에서 확인합니다.
- 같은 병합 SHA의 [Vercel Production](https://vercel.com/donghyunt/cs-class/F5gPaUrExi2Wc5yJkXp7A3MMRUdU) `dpl_F5gPaUrExi2Wc5yJkXp7A3MMRUdU`가 READY이며 운영 별칭을 확인했습니다. Preview `dpl_HgZEjGsPV92HbbnE9WeBpuB37CmP`도 READY입니다. 보호된 Preview 본문은 연결 권한 부족으로 확인하지 못했습니다. 인계 문서의 후속 main 커밋은 앱 파일이 동일하며 같은 Git 배포 경로를 사용합니다.
- 2026-09-30 운영 읽기 전용 GET 점검에서 `/api/auth/session`·`/api/auth/config`는 200이고 `cs-class-f74c4` 연결·에뮬레이터 없음·익명 세션을 확인했습니다. 비로그인 학생·교사·할 일·일정 API는 401, 로그인·새 메뉴 경로와 EntryJS 공개 작업실은 200, 이전 주소의 경로·쿼리는 운영 주소로 307 이동합니다.
- Chromium에서 학생·교사 로그인 화면과 Google 버튼의 준비 후 활성화를 확인했습니다. 해당 화면의 콘솔 오류·경고는 0건입니다. 실제 Google 로그인·운영 학생의 할 일/일정 저장·학습 제출은 새로 실행하지 않았습니다. Vercel 런타임 로그 조회는 403으로 실패했으므로 오류 로그가 없다고 판정하지 않습니다. 이번 Firestore 변경은 설명 주석뿐이며 별도 규칙 배포는 필요하지 않습니다.
- `codex/curriculum-verification-entryjs`의 머리가 기존 PR #10의 머리와 같고 병합 파일 트리와도 일치함을 확인했습니다. `codex/verify-production-login`은 그 머리의 조상으로 함께 포함됐습니다. 두 원격 브랜치와 PR #11의 `codex/dashboard-pilot-brief`를 확인한 SHA에 한해 삭제하고 로컬 파일럿 브랜치도 정리했습니다.

이전 EntryJS PR [#10](https://github.com/DonghyunT/cs-class/pull/10), 38개 검사·운영 읽기 전용 점검, 완료한 파일럿 메타프롬프트와 최초 로컬 검증의 상세 근거는 [정리 전 원문과 SHA-256](archive/cs-class/2026-09-30-before-dashboard-release/manifest.json)에 있습니다. 이전 결과를 새 릴리스 검증으로 표현하지 않습니다.

## 다른 PC에서 이어가기

1. [개발 안내](DEVELOPMENT.md#다른-pc에서-시작)에 따라 Git·Node 24·Java 21+와 저장소 접근을 준비합니다. 완료한 파일럿이 포함된 원격 `main`은 `a5ca4aa`입니다. 현재 시각 개선 브랜치는 이 PC에만 있으므로 다른 PC로 옮기기 전 원격 반영 여부를 확인합니다.
2. 기존 PC의 미커밋 변경을 보존하고, 깨끗한 작업 트리에서 `git fetch origin --prune`로 원격 상태를 확인합니다. 시각 개선을 이어가려면 해당 브랜치가 원격에 반영된 뒤 가져오고, 별도 작업은 `main`에서 새 `codex/` 브랜치를 만듭니다. 새 PC는 README의 복제 안내를 따릅니다.
3. 루트에서 `npm ci`, 최초 `npx playwright install chromium`을 실행한 뒤 `npm run dev:emulator`로 확인합니다. EntryJS 자산은 자동 준비되며 Java·브라우저·플러그인·인증·`scratch/` 캐시는 PC마다 준비합니다.
4. `.env.local`·관리자 키·학생 원본은 Git으로 전달되지 않습니다. 실제 Firebase 연결이 필요할 때만 [서버 설정](FIREBASE_SETUP.md#다른-pc의-서버-설정)을 따르고 각 PC에서 직접 인증합니다.

> AGENTS.md와 docs/HANDOFF.md를 읽고 CS Class를 이어가자. 현재 브랜치·미커밋 변경·원격 동기화를 확인하고 최신 main에서 새 codex/ 브랜치를 만들자. 대시보드 파일럿의 현재 화면과 남은 범위를 확인한 뒤 다음 작업을 진행하자.

## 남은 한계와 다음 결정

- 현재 시각 개선은 로컬 브랜치에서만 검증했으며 PR·CI·운영 화면 결과가 아닙니다. 이번 달 미니 달력은 일정 날짜를 보여주는 읽기용이며 월 탐색·날짜별 편집은 후속입니다.
- 내 할 일의 본인 전용 공개 범위·반 일정 권한·안내 역할·목록 한도는 [파일럿 기본안](PRD.md#파일럿-기본안--최종-운영-정책과-구분)입니다. 알림·반복·외부 연동·Q&A·개인 할 일 공유는 후속이며 최종 운영 정책·실학생 적용은 별도 합의합니다.
- 실제 Google 로그인과 운영 학생의 새 할 일/일정 저장·학습 제출은 이번 릴리스에서 새로 확인하지 않았습니다. 배포 READY·로컬/CI 통과와 구분합니다.
- EntryJS 서버 채점은 지원한 세 블록의 구조·상수 값을 검사합니다. 반복·조건·입력·충돌·난수·자유 제작, 전체 블록 조립의 키보드/모바일 터치 검증은 후속입니다. 현재 확인 범위는 [개발 안내](DEVELOPMENT.md#entryjs-실습)를 따릅니다.
- 실학생 등록·초기 비밀번호 전달·학생 공개 범위, 수업 버전/학년도 전환·보관/백업 정책과 AI·교사 콘텐츠 편집기·확인 요청은 미결정 또는 미구현입니다.
- 2026-09-29 진단 중 노출된 기존 Firebase CLI 인증의 폐기·재연결 완료 여부는 미확인입니다. 인증 파일을 복사하지 않고 새 PC에서 직접 로그인합니다.
- 2026-09-28 `npm audit`의 중간 경고 5개(운영 2개, `uuid/gaxios`·개발 CLI 경로)는 이전 미해결 기록입니다. 이번에 재검사하거나 의존성을 변경하지 않았습니다.
- 미전송 초안은 현재 화면 메모리에만 보존됩니다. 강제 종료 뒤 복구 경계는 [서버 안내](FIREBASE_SETUP.md#데이터와-남은-한계)를 따릅니다.

과거 승인·프롬프트·배포 이력은 [문서 보관함](archive/README.md)에 있습니다. 보관 원문은 당시 시점·경로 기준이며 현재 지침이 아닙니다.
