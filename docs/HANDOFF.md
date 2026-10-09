# 이어갈 작업

## 현재 작업 상태

갱신: 2026-10-10(Asia/Seoul). **현재 브랜치 `main`, 기능 릴리스 기준 `08b06f4c422f20ca35143446d7c9ac0229904e03`입니다. 기존 미배포 컨설팅 개선과 R0~R8을 PR #30으로 병합하고 Vercel Production 반영을 확인했습니다. 기능→검사 보정→병합→인계 문서 마감의 순서를 유지하며, 문서 마감까지 원격 main과 동기화하고 미커밋 변경 없이 마칩니다.** 확인한 PR head와 병합 트리는 정확히 같습니다. 후속 문서 커밋은 앱·검사 트리를 바꾸지 않으며 최신 문서 HEAD는 `git log -4 --oneline`으로 확인합니다. 로컬 사용자 미리보기 세션47509·기존 기록·작업 탭은 유지했고 복원 서버에서 시드 검사를 다시 실행하지 않았습니다. 실제 학교 환경 확인은 아래 다음 작업으로 남습니다.

## 수업 적용 통합 — 10/10 로컬 완료

- **학생 결과(R1~R2):** 이름 미션의 서로 다른 정상 실행0/2→2/2와 구조/실행 부족 안내, 시작 블록의 다음 행동, 정확한 X/Y와 진도 계산 설명을 구현했습니다. 집중 모드는 프로그래밍·일반 Entry·샌드위치·추상화·순서도의 다섯 실습에 적용합니다. 같은 iframe·작품·실행/질문 대기·대화 읽던 위치와 오류/저장/손들기를 보존하며 넓게 보기와 독립적으로 작동합니다. 저장·채점·필수 제출 기준은 유지합니다.
- **교사 결과(R3~R4):** 손들기의 수업/단계/미션·마지막 성공 조회·동일 목록 건수, 담당 반 준비표와 정확한 설정 진입을 제공합니다. 수업 미리보기는 실제7수업의 공통 화면에 메모리 컨트롤러를 연결합니다. 전용 평가 API는 교사·담당 반·CSRF·strict 입력을 확인하고 기존 순수 판정을 재사용합니다. 학생 기록·실제 제출·손들기·AI 사용 기록을 쓰지 않으며, AI/교사 확인의 제한과 로컬 규칙/기본 구조 확인 범위를 화면에 명시합니다. 학생 useWork의 저장 소유권은 유지합니다.
- **운영·정리(R5~R7):** 지난 일정 접기·기존 등록폼 진입, 실패 응답 번호와 허용한5개 필드(UUID/고정 operation/고정 category/status/UTC 시각)의 서버 로그를 구현했습니다. 오류 원문·동적 URL·학생 식별자·본문은 기록하지 않습니다. 개념/퀴즈 표시만 작은 부품으로 분리하고 실제 샌드위치 치수에 맞춰 DESIGN의190px을300px로 정정했습니다. 새 의존성·DB 스키마·영구 장부는 추가하지 않았습니다.
- **방법·독립 검토:** 공유 셸/편집기는 주 에이전트가 순차 통합하고 독립 준비표·일정·로그는 소유 범위를 정해 병렬 처리했습니다. Ponytail full·의존 관계에 따른 작업 분해·계층형 검증으로 공유 파일 충돌과 반복 전체 실행을 줄였습니다. 별도 리뷰가 찾은 미리보기 컨트롤러의 반복 렌더·초기화 초점·실행 기록의 grid 폭·접힌 대화의 읽던 위치 문제를 같은 조건의 RED→GREEN으로 수정했습니다. 마지막 실제 개념 체험 초기화의 초점 전달도 기존 Shell Effect에 새 요청을 전달하도록 보완했습니다.
- **최종 새 검사(R8):** Windows·Java21·demo-cs-class·Auth9099/Firestore8080·localhost3000·CI=1 새 next start·합성 AI/시간표·단일 worker에서 전체 **300/300 단일 실행(16.2분), 실패/건너뜀/불안정0개, 종료0**입니다. 마지막 typecheck·lint·test:review12개·build도 종료0입니다. 최초 전체295/300에서 기존 Entry 자동 저장과 새 시드의 경합·중복 locator·메뉴 닫기·실제 초기화 초점을 조사했고, 검사 준비/선택과 제품 초점을 수정해 동일6조건50.5초 성공 뒤 전체를 재실행했습니다. 이전 결과와 합산하지 않습니다. 원본은 Git 제외 `scratch/classroom-release-20261009/full-final.log`·`full-final-report.json`·`full-final-results/`와 개별 정적 검사 로그입니다.
- **최종 빌드의 실제 치수·조작:** 1840px 교사 미리보기의 Entry 작업 폭은 기본1170·집중1446·넓게1523·집중+넓게1799px입니다. 집중 때 목표 줄을 위에 유지하므로 편집기 document top은499.3→613.4px이며 폭 증가가 세로 스크롤 감소를 보장하지는 않습니다. 1280×720 샌드위치 교사 미리보기는 SVG 높이300·실제 조리대 폭687.8·첫 입력 높이44·대화 높이143.4px입니다. 학생 낮은 창의 전체 준비 안내/입력/실행과 조리대 폭490px 초과는 별도 전체 E2E에서 확인했습니다. 390×720 가로 넘침 없음·Escape 집중 종료/버튼 초점 복귀·등록폼 초점·교사 콘솔 오류0개도 실제 브라우저에서 확인했습니다.
- **검토용 화면 증거:** [학생 샌드위치1280×720](reference/consulting-20261009/classroom-release-sandwich-1280.png), [Entry 보기 전환 뒤 실제 응답](reference/consulting-20261009/classroom-release-entry-view-transition.png), [교사 미리보기의 미완성 입력·이전 체험 제출 유지](reference/consulting-20261009/classroom-release-teacher-preview-memory.png)는 최종300개 실행에서 만든 합성 계정 화면입니다. 마지막 이미지는 말하기 시간을 지운 편집 초안과 이전 체험 제출1/4를 동시에 보존한 상태입니다. 실제 학생/개인 목록 캡처는 릴리스에 포함하지 않습니다.
- **원본 기록·접속 복원:** 시작 시점 최신 `demo-backup/`의 Auth/Firestore를 기본 시드 없이 import하고 최종 next start를 세션47509로 유지했습니다. 백업6파일의 해시는 변하지 않았습니다. 공개 설정의 demo·Auth127.0.0.1:9099·게스트 활성과 담당2-10반의 이번 programming-13/열린4수업을 확인했습니다. 정상 게스트 학생 입장 뒤 기존 전체12/31·프로그래밍 개념4/4·실습2/4·순서 놀이 완료를 대시보드에서 확인했습니다. 복원 후 학생 답안 편집·검증·제출은 하지 않았고 교사 조작은 메모리 미리보기/목록/초점 확인에 한정했습니다. 임시 viewport를 초기화하고 [학생 화면](http://localhost:3000/student)을 사용자 브라우저에 남겼습니다. 이 복원 미리보기에서 시드 검사를 다시 실행하지 않습니다.
- **R9 운영 반영·남은 범위:** [PR #30](https://github.com/DonghyunT/cs-class/pull/30)의 원격 전체 검사가 성공한 뒤 `main`에 병합하고 운영 SHA·별칭·icn1·익명 API·기존 교사 인증/조회·로그인 화면을 확인했습니다. 정확한 커밋/배포 근거는 아래 통합 절을 따릅니다. 로컬 기록·시드·운영 반 설정을 복사하지 않았습니다. 실제 브라우저200%·물리 OS 한글 입력기·학교망·신규 Google OAuth·실학생 이해도는 직접 확인 대기입니다.

**검토 경로:** [학생 대시보드](http://localhost:3000/student), [교사 홈/손들기](http://localhost:3000/teacher?classId=2-10), [담당 반 준비표](http://localhost:3000/teacher/classes?classId=2-10), [실제 수업 미리보기](http://localhost:3000/teacher/preview/programming-13?classId=2-10), [일정](http://localhost:3000/teacher/schedule?classId=2-10). 교사 경로는 정상 게스트 교사 입장 후 확인합니다.

## 통합·배포 상태

- **승인 범위:** 기존 미배포 컨설팅 개선과 수업 적용 R1~R7의 소스·검사·문서·합성 화면 증거를 함께 반영합니다. 실제 자료/계정/반 공개 설정·환경변수·Firebase 규칙/인덱스 변경은 포함하지 않습니다.
- **실제 대상:** GitHub `DonghyunT/cs-class`의 `main`, Vercel `cs-class`(`prj_RUUtcTMukVY9kjudgDr6VA89KKxP`), 운영 [cs-class-donghyunt.vercel.app](https://cs-class-donghyunt.vercel.app). 저장소 루트·Next.js·Node24·함수icn1와 서버 설정은 [FIREBASE_SETUP](FIREBASE_SETUP.md#vercel-서버-설정)을 따릅니다.
- **커밋 순서와 트리:** 기준 `12c8a35`→기능 `3bf458f`→검사 보정 `d689d35`→병합 `08b06f4c422f20ca35143446d7c9ac0229904e03`→문서 마감입니다. [PR #30](https://github.com/DonghyunT/cs-class/pull/30)의 검증 head는 `d689d3550e466391a23c5e04df6edcaad2949c64`이며 병합 tree는 둘 다 `7b51bda4dca66438d5ded851d64cfe7b535aa2c9`입니다. 공개 이력을 수정하거나 강제 reset/push하지 않았습니다. 기능/검사의 신규 파일과 합성 화면을 포함한 커밋 범위·원본 해시를 대조했습니다.
- **최종 원격 검증:** [CI run37958759210](https://github.com/DonghyunT/cs-class/actions/runs/37958759210), Ubuntu·Node24·Java21·demo-cs-class·Auth9099/Firestore8080·localhost3000·빌드된 next start·합성 AI/시간표·단일 worker에서 lint/typecheck/test:review12개/build/전체 E2E가 성공했습니다. 총300개 중 **299개 통과(22.9분), Windows/.NET 명부 변환1개는 기존 OS 조건으로 정상 제외, 실패0개**입니다. 위 Windows300/300은 별도 실행이며 합산하지 않습니다. 최초 원격297/2실패/1제외의 두 실패는 키보드/초점 스크롤 완료 전 위치 측정 경합입니다. scrollend와 동일 좌표 poll만 보정했고 앱·허용오차·타임아웃은 유지했습니다. 중복 push CI만 비용 절감을 위해 취소했고 PR의 전체 검사는 끝까지 실행했습니다. 같은 병합 트리의 중복 CI는 merge 메시지의 기존 `[skip ci]` 방식으로 생략했습니다.
- **기능 배포 확인 근거:** `dpl_ER34EQQCyoPRwohJwFy7jnjCYqaN`, `cs-class-btvbl4ac1-donghyunt.vercel.app`, Production READY·`08b06f4c422f20ca35143446d7c9ac0229904e03`·icn1입니다. primary 별칭 `cs-class-donghyunt.vercel.app`을 조회해 같은 배포 ID/SHA를 확인했고 `cs-class-sigma.vercel.app`·git-main 별칭도 연결됐습니다. 기능 배포 후의 문서 마감 커밋은 앱/검사를 바꾸지 않습니다. 문서 푸시 뒤에도 최신 main의 실제 Production SHA·별칭·공개 응답을 다시 확인하는 마감 절차를 사용합니다.
- **운영 요청·화면 확인:** 10/10 01:53~01:55 KST의 primary 운영 주소에서 config/session JSON200·configured=true·실제 프로젝트·emulatorHost=null·guest=false·익명 session=null을 확인했습니다. 익명 학생/교사/손들기/미리보기 평가401, 실패 응답 번호 존재, 이전 주소의 동일 경로307 이동을 확인했습니다. 승인된 기존 instructor 로그인200·교사/손들기 API200·준비표/프로그래밍 미리보기 HTML200·로그아웃200이며 담당 반 설정의 ID/revision/이번/열린 수업을 조회 전후 비교해 동일했습니다. 학습/설정 쓰기는 하지 않았습니다. 공개 로그인 화면은 Google/비밀번호 버튼 활성·콘솔 오류0개를 확인했습니다. 인증된 미리보기의 클라이언트 조작은 로컬/CI 근거이며 운영 HTML200을 실제 조작 성공으로 확대하지 않습니다. 신규 Google OAuth는 확인 대기입니다.
- **운영 로그·Preview 한계:** 기능 배포의 16:51 UTC 이후 확인 시간대 error/fatal 수준별 집계는 빈 목록이었습니다. 이 결과는 선택 배포·시간대의 집계에 한정하며 전체 운영 무오류를 뜻하지 않습니다. Preview는 기존 Vercel SSO302로 공개 API 확인이 제한됐고 보호를 낮추지 않았습니다. READY/별칭이나 Preview를 신규 Google 로그인 성공으로 해석하지 않습니다.
- **복구 기준:** 릴리스 전 `main@12c8a3504aea501e49a2512c9d1a8f79c9d7e4cd`의 `dpl_BFjuhvUeLyHR9MxkEDqcjnuTBvsJ`를 애플리케이션 복구 후보로 보존합니다. 실제 rollback/DB 복구를 실행한 것은 아닙니다. 운영 자료·반 설정·환경변수·규칙/인덱스를 이번 반영에서 변경하지 않았으며 복구 절차는 [서버 설정](FIREBASE_SETUP.md#vercel-서버-설정)을 따릅니다.

## 다음에 이어갈 작업

1. 학교 PC에서 최신 main을 동기화하고 아래 인계 순서로 환경을 확인합니다. 기존 미커밋/미추적/미푸시 작업과 로컬 기록을 먼저 보존하며 옛 계획 브랜치·이식 ZIP으로 최신 구현을 덮어쓰지 않습니다.
2. 기능 배포 뒤 운영 반의 이번/열린 수업을 로컬과 구분해 확인하고, 기존 승인 체험 계정으로 첫 수업 리허설을 이어갑니다. 운영 설정 변경·계정 발급·실제 명부는 대상/학년도/복구 범위를 별도로 확정합니다. [첫 실제 수업 절차](DEVELOPMENT.md#첫-실제-수업-확인-순서)를 따릅니다.
3. 학교 PC·학교망·실제200%·물리 한글 입력기·신규 Google OAuth·실학생 안내 이해도를 직접 확인합니다. 현재 자동 검증을 현장 성공으로 표현하지 않습니다.

## 다른 PC에서 이어가기

먼저 해당 PC의 브랜치·미커밋/미추적/미푸시 변경을 보존합니다. 이번 릴리스와 문서 마감은 원격 main에서 이어갑니다. 기능 기준은 위 병합 SHA이며 후속 문서 HEAD까지 동기화합니다. 옛 계획 브랜치·이식 ZIP으로 최신 구현을 덮어쓰지 않습니다.

~~~powershell
git status -sb
git fetch --prune origin
git branch -vv
# 기존 변경을 보존하고 작업 트리가 정리된 뒤
git switch main
git merge --ff-only origin/main
git log -4 --oneline
~~~

분기한 로컬 main은 강제 reset/push 대신 차이를 대조합니다. 새 소스·검사·참고 PNG와 이 문서의 릴리스 기준이 있는지 확인하고 [다른 PC 준비](DEVELOPMENT.md#다른-pc에서-시작)의 Node24·Java21+·EntryJS·Chromium/캐시를 준비합니다. `npm.cmd ci`가 EntryJS 자산을 설치하며, 새 demo는 `npm.cmd run dev:emulator`의 기본 시드로 시작합니다. 기존 캐시를 확인하기 전에 다운로드를 반복하지 않습니다. 다른 PC의 작업·환경·비공개 파일은 직접 확인 전까지 미확인입니다.

### 로컬 기록과 전달 경계

- Git으로 옮기는 것은 앱/검사/문서/합성 화면 증거입니다. `.env.local`·관리자 키·개인 스킬/도구 설정·`scratch/`·`outputs/`·node_modules·빌드/Java/브라우저/EntryJS 캐시·실행 중 에뮬레이터 기록은 옮겨지지 않습니다.
- 이 PC의 최신 보존 기준은 Git 제외 `scratch/classroom-release-20261009/demo-backup/`의 Auth/Firestore export6파일과 `demo-backup-hashes.json`입니다. 최종 검사 뒤 기본 시드 없이 복원했고 학생 진도12/31·프로그래밍 제출2/4를 확인했습니다. 동일 기록이 필요하면 비공개 경로로 별도 전달하고 대상의 기존 기록과 비교한 뒤 복원합니다. 더 오래된 PC/회차 백업으로 덮어쓰지 않습니다.
- 새 PC의 수업 공개/이번 수업·합성 학생 기록은 새 시드 상태입니다. 현재 이 PC의 게스트 접속/반 준비가 복제됐다고 가정하지 않습니다. 포트·`/api/auth/config`의 demo 프로젝트/호스트/fixture를 확인하고 운영 연결 앱과 검사 서버를 혼용하지 않습니다.
- 운영 체험 계정의 비밀번호·명부·반 설정 복구 파일은 Git 제외 비공개 자료입니다. [승인 체험 계정 안내](FIREBASE_SETUP.md#승인된-운영-테스트-계정)와 [명부 절차](DEVELOPMENT.md#실학생-명부-준비와-반별-발급)를 따르며 없는 파일을 추측으로 재작성하지 않습니다.

### 새 대화에 붙일 요청문

> CS Class 작업을 이어주세요. 먼저 현재 PC의 Git 변경을 보존하고 AGENTS.md → docs/HANDOFF.md → 필요한 PRD/DESIGN/DEVELOPMENT를 읽어주세요. 원격 main과 실제 배포 SHA·CI·남은 현장 확인은 HANDOFF 최신 절을 기준으로 하며 옛 계획의 미착수 상태로 되돌리지 마세요. 기존 컨설팅 개선·다섯 실습 집중 모드·교사 준비표/7수업 메모리 미리보기·안전한 실패 로그를 유지해주세요. 학생 useWork의 단일 저장 소유, 답안/완료/체험 분리, 같은 Entry iframe/작품/실행과 오류/입력 보존을 지켜주세요. 실제200%·물리 OS IME·신규 Google OAuth·학교망·실학생 이해도는 직접 확인 대기입니다. 로컬 AI는 fixture이며 demo 기록·비밀 설정·캐시는 PC별이므로 현재 환경과 기존 기록부터 확인해주세요. 실제 운영 자료 변경은 제가 요청한 대상/복구 범위로 진행해주세요.

## 검증과 검토 자료

최신 로컬 근거는 위 Windows300/300 단일 실행과 합성 화면3장이며, 최종 Linux PR CI의299통과/Windows 전용1제외를 별도 기록했습니다. 두 환경 모두 순수 검사12개·타입·린트·빌드를 확인했습니다. 원본 로그/trace/report와 안전한 CI·병합·배포·공개/교사/브라우저/집계 proof JSON은 Git 제외 `scratch/classroom-release-20261009/`에 있습니다. 다른 PC에는 Git으로 기록한 SHA·CI 링크·날짜/환경/한계를 전달합니다. 원본이 없으면 과거 근거로 읽고 필요한 영향 검사를 새로 실행합니다. 정책은 [PRD](PRD.md), 디자인은 [DESIGN](DESIGN.md), 실행/검증은 [DEVELOPMENT](DEVELOPMENT.md), 서버는 [FIREBASE_SETUP](FIREBASE_SETUP.md), 작업 기준은 [AGENTS](../AGENTS.md) 한 곳씩에서 관리합니다.

## 남은 한계와 다음 결정

- 실제200%·OS IME·실기기 터치·화면 읽기 음성·EntryJS 전체 블록의 접근성·실학생 이해도/피로도는 자동 검사로 입증하지 않았습니다. 신규 Google OAuth·학교망·자연 Cron도 별도 확인입니다.
- 순서도 AI의 합성 작품 오판은 기존 교사 확인 경로로 보완하며 실제 AI 품질을 이번 fixture 검사로 입증하지 않습니다. 원작 음성 입출력·픽셀 동일성·범용 자유 제작은 이번 추가 범위가 아닙니다.
- 미전송 초안의 강제 종료 후 영구 복구는 보장하지 않습니다. 저장 실패·충돌·이전 제출본 보존은 [저장 정책](PRD.md#작업-저장과-통신-비용)을 따릅니다.
- 이전 인증 키 폐기/재발급·9/28 의존성 중간 경고5개(운영2개)·Actions/Java Action 폐기 예고와 로그인 반 조회 개선율은 이번 릴리스에서 새로 해결/측정하지 않았습니다. 상세 과거 근거는 아래 보존 원문을 따릅니다.

## 과거 구현·검증·운영 근거

누적 이력은 [10/10 릴리스 전 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md)과 [SHA-256 보존 목록](archive/cs-class/2026-10-10-before-consulting-release/manifest.json)에 바이트 그대로 보존했습니다. 아래 제목은 기존 활성 링크의 진입점이며 당시 기록·승인·실행 세션을 현재 상태로 해석하지 않습니다.

### 직전 Entry 구현·로컬 검증 기록

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#직전-entry-구현로컬-검증-기록)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.

## Entry 질문칸 깜빡임·무대 준비 — 10/9 수정·로컬 완료

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#entry-질문칸-깜빡임무대-준비--109-수정로컬-완료)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.

## 이름 미션 조건 검증 — 10/9 현재 작품으로 정상 통과 확인

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#이름-미션-조건-검증--109-현재-작품으로-정상-통과-확인)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.

## Entry 질문 응답 — 10/9 체크 무반응 수정·로컬 완료

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#entry-질문-응답--109-체크-무반응-수정로컬-완료)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.

## 브라우저 주석 — 10/9 수업 탭·Entry 상단 정리 로컬 완료

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#브라우저-주석--109-수업-탭entry-상단-정리-로컬-완료)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.

## 브라우저 주석 — 10/9 홈·실습 배치 로컬 완료

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#브라우저-주석--109-홈실습-배치-로컬-완료)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.

## 컨설팅 후속4~5 — 10/9 로컬 완료

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#컨설팅-후속45--109-로컬-완료)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.

## 컨설팅 후속1~3 — 10/9 로컬 완료

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#컨설팅-후속13--109-로컬-완료)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.

## 스크롤바 공간 고정 — 10/9 로컬 완료

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#스크롤바-공간-고정--109-로컬-완료)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.

## 브라우저 주석 3개 — 10/9 로컬 완료

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#브라우저-주석-3개--109-로컬-완료)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.

## 컨설팅 개선 — 10/9 로컬 완료

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#컨설팅-개선--109-로컬-완료)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.

## 10/8 마감 기준의 릴리스 상태

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#108-마감-기준의-릴리스-상태)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.

## 학급 UI·설정·질문·손들기 — 10/7 최신 로컬 통합

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#학급-ui설정질문손들기--107-최신-로컬-통합)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.

## 학생 대시보드 진도 그래프 — 10/7 로컬 구현

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#학생-대시보드-진도-그래프--107-로컬-구현)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.

## 테스트 계정으로 첫 수업 리허설 — 10/7 재개

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#테스트-계정으로-첫-수업-리허설--107-재개)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.

## 학생 학습 화면 개선 계획 재개

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#학생-학습-화면-개선-계획-재개)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.

### 10/7 학급 기능 운영 공개

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#107-학급-기능-운영-공개)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.

### 10/7 이전 학생 UI 운영 공개

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#107-이전-학생-ui-운영-공개)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.

### 10/5 원작 실습 UI 복원 공개

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#105-원작-실습-ui-복원-공개)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.

### 10/5 세 복습 운영 공개

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#105-세-복습-운영-공개)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.

### 10/4 실제 수업·시간표 운영 릴리스

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#104-실제-수업시간표-운영-릴리스)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.

### 10/3 운영 테스트 계정 발급

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#103-운영-테스트-계정-발급)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.

## 교실 입장·대시보드 조회 성능

당시 구현·검증·운영 확인과 한계는 [보존 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#교실-입장대시보드-조회-성능)을 따릅니다. 현재 실행·배포 상태는 위 최신 절을 확인합니다.
