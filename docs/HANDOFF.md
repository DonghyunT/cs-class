# 이어갈 작업

갱신: 2026-10-06(Asia/Seoul). **작업 브랜치 `codex/student-learning-readability`, 1~7차와 후속 휴먼 리뷰의 큰 조리대·시간순 대화를 로컬 커밋으로 보존했고 미커밋 변경은 없습니다. 후속 typecheck/lint/build·빌드 영향10개·독립 재검토를 마쳤습니다. 다음 행동은 수정 화면의 휴먼 리뷰와 미확인인 실제200% 확대 검사입니다.** 사용자가 7차까지 구현을 요청했고8~12차는 미착수입니다. 제품 정책은 [PRD](PRD.md), 화면 기준은 [DESIGN](DESIGN.md), 실행은 [DEVELOPMENT](DEVELOPMENT.md), 서버 대상은 [FIREBASE_SETUP](FIREBASE_SETUP.md)을 따릅니다. 이전 운영 작업의 상세 기록은 [앞선 세션 보존본](archive/cs-class/2026-10-05-session-close/manifest.json)에 있습니다.

## 현재 작업 상태

| 항목 | 상태 |
| --- | --- |
| 브랜치·미커밋 | `codex/student-learning-readability`에 소스·신규 테스트·담당 문서·합성 검토 PNG4장을 로컬 커밋으로 보존했습니다. 시작 HEAD=`3b31c06`,최초1~7차=`1757414`,현재 tip은 `git log -1 --oneline`으로 확인합니다. 미커밋 없음. 인계 브랜치와 main은 보존하며 아직 push/병합/배포하지 않았습니다. |
| 코드 기준·원격 확인 | 10/6 원격 조회와 정리 뒤 `main=origin/main=b8806a5`를 확인했습니다. 계획 작성 기준 `8668cb0`과 그 main의 트리는 같습니다. 앱 코드는 정리 과정에서 변경하지 않았습니다. 새 PC에서는 원격이 더 바뀌었는지 다시 확인하며 임의로 병합/덮어쓰지 않습니다. |
| 이번 구현 | 1~7차와 후속 샌드위치 피드백: 약2:1 큰 조리대/대화·하단 입력·시간순 명령/응답·실패/확인 질문 보존·기록 내부 스크롤. 서버 요청/DB/채점/실습 엔진·의존성은 변경하지 않았습니다. |
| 검증 | 후속 최종 소스의typecheck/lint/build와 빌드 영향10개 통과(1.2분),독립 리뷰P2 해결 확인. 최초 `1757414`의전체151개 중150개+기존 기대값1개 재검증·순수12개는 과거 결과이며 이번 변경 뒤 새 전체 실행이 아닙니다. [실행 장부](reference/student-learning-readability-plan.md#실행-장부-2026-10-06-로컬-demo)를 확인합니다. |
| 다음 행동 | **수정한 대표 수업 휴먼 리뷰**와 실제200% 확인을 받습니다. 읽기 편함·체험의 의미·첫 행동/결과/재시도와 필요한 수정·재검증을 반영한 뒤에만8차로 확장합니다. 8~12차는 미착수입니다. |
| 작업 경계·한계 | demo 로컬 합성 계정/작품만 사용하고 검사 뒤 반 설정을 복원했습니다. 운영 서버·실학생 자료·main·원격 인계는 변경하지 않았습니다. 사용자가 접근 허용 및 설정의 ‘허용’ 표시를 확인했지만, 도구는 저장된 차단을 계속 반환했습니다. 실제200%는 미확인이며 자동 검증을 해당 검사의 대체로 세지 않습니다. 배포와 실제 학생 효과도 미확인입니다. |

### 7차 휴먼 리뷰 반영 — 2026-10-06

선생님이 제공한 원작 비교 화면을 기준으로 샌드위치의 큰 조리대와 실제 대화 표현을 보완했습니다. 기존320~380px 명령 패널과 최신 결과 우선 순서는 [계획5절](reference/student-learning-readability-plan.md#5-실습-작업-공간과-입력결과의-거리)의 새 배분으로 대체합니다. 1854×717에서 조리대 실제 폭900px 이상·대화 폭500px 이상과 주방으로 스크롤했을 때의 입력 노출,1920×1080,1280×720 초기 입력/AI 주 버튼/조리대 안내를 확인했습니다. 900px 이하 세로 배치·320px 가로 넘침·14px 이상 보조 글자도 유지합니다.

최종Windows·demo Auth9099/Firestore8080·`localhost:3000`의 **새 프로덕션 빌드**에서 관련10개를 단일 실행으로 통과했습니다(1.2분). 명령 대기 중 다음 입력·503·409·이전 제출본·되돌리기/재실행/새 레시피·재접속·실제Home/End 스크롤과 읽던 위치·실패/확인 질문의 시간순 보존을 포함합니다. 공유CSS의 추상화·순서도 조작/폭/초점과 콘솔도 확인했습니다. 명령 입력은 AI 대기 중 유지하며,실행 없는 질문/연결 실패 대화는 이 화면을 열어둔 동안 보존합니다. 재접속·단계 이동 후에는 기존 저장 계약의 실행 명령만 복원합니다.

명령은 `node node_modules/@playwright/test/cli.js test tests/sandwich-conversation.spec.ts tests/learning-readability.spec.ts tests/review-practice-ui.spec.ts --grep 'sandwich-layout|큰 화면|명령과 로봇|원작 조리대|추상화는|세 실습|순서도 보관함|한 번에 지시' --reporter=list --output=scratch/readability-20261006/refinement-final-built`입니다. 앱은 `CI=1`의 `next start`이고 검사 터미널의CI만 제거해 기존 서버를 재사용했습니다. 결과·큰 화면/대화 캡처는 `refinement-final-built/`에 있습니다. 독립 리뷰가 지적한 실패/확인 질문 소실과 최종 화면에서 발견한 낮은 창의 준비 안내 잘림은 먼저 재현한 뒤 수정·재검증했습니다. 독립 재검토에서 추가 주요 지적은 없었습니다. 캡처는 초안의 실제 서버 저장과 실행 버튼 활성화를 기다렸습니다. 최초 전체151개 검사를 이번 UI 한정 수정의 새 결과로 세지 않습니다.

현재 [낮은 창 실습](reference/student-learning-readability/practice-after-20261006.png)과 [큰 조리대·대화](reference/student-learning-readability/practice-conversation-after-20261006.png)를 검토합니다. 브라우저 도구는 사용자에게 허용으로 표시된 기존 로컬 탭도 저장된 차단으로 거절했습니다. 우회하지 않았으며 실제200%는 계속 미확인입니다.

### 7차 검증과 검토 자료 — 2026-10-06

아래 전체 검증은 최초1~7차 커밋 `1757414`의 과거 근거입니다. 후속 샌드위치 변경의 현재 검증은 위 절을 따릅니다.

Windows·Node24.19·Java21·Chromium, `demo-cs-class` Auth9099/Firestore8080, `http://localhost:3000`의 Next16.3.6 프로덕션 빌드(`CI=1`, `next start`)에서 확인했습니다. 새 가독성 검사15개와 홈·대시보드·공통 셸·공개 프로토타입·수업별 저장/제출·실제 EntryJS 조립/실행/중지/복원·27명 동시 입장을 전체 실행에 포함했습니다. 실패한 기존 프로그래밍 검사는 재접속을 무조건 첫 문항으로 기대하던 부분이며, 첫 미답변 표시와 첫 문항으로 돌아가 기존 답안/실습 기록 보존을 함께 확인하도록 갱신했습니다.

실행은 `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run test:review`, `CI=1`의 `npm.cmd run test:e2e`와 같은 빌드 서버를 재사용한 `node node_modules/@playwright/test/cli.js test tests/programming-classroom.spec.ts --grep '저장 실패는 미션 이동' --output scratch/readability-20261006/programming-recheck --reporter=line`입니다. 후자는 Playwright의 기존 서버 재사용을 위해 검사 터미널의 CI 값을 제거했고 앱 서버 자체는 계속 `next start`입니다. 전체 실행 실패 기록은 `scratch/readability-20261006/full-last-run.json`, 재검증은 `programming-recheck/`에 남깁니다. 문서4개의 로컬 링크138개·앵커78개 누락0과 `git diff --check`, 출발 PNG3장 해시 보존도 확인했습니다.

대표 [개념](reference/student-learning-readability/concept-after-20261006.png)·[퀴즈](reference/student-learning-readability/quiz-after-20261006.png)·[낮은 창 실습](reference/student-learning-readability/practice-after-20261006.png)을 Git에 포함합니다. 전체 화면 행렬과 실제 글자/조작 크기·입력/버튼/안내의 위치 기록은 `scratch/readability-20261006/after/`의 PNG/JSON입니다. 1440/1920/1280·821/820·390/320px를 검사했고, 1280×720 초기 실습의 입력·AI 주 버튼·조리대 안내가 모두 화면 안에 들어옵니다. 글자 대비는5.04/4.92/6.33:1, 의미 있는 새 경계는3.21:1이며 [DESIGN](DESIGN.md#알고리즘-선택-복습)에 사용 색을 기록했습니다. 실제200%와 학생 이해도·피로도 개선은 이 근거에서 제외합니다.

작업 종료 시 검토용 로컬 빌드 서버와 demo 에뮬레이터를 실행해 두었습니다. [학생 로그인](http://localhost:3000/login/student)의 **합성 학생20102 / 공개 테스트 비밀번호 `student-test-7319`**로 알고리즘 설계를 열 수 있습니다. 이는 운영 계정이 아니며 AI도 로컬 fixture 응답입니다. 최종 검사 후2-1반에 검토용 수업을 열고 계정의 초기 비밀번호 변경 단계를 준비했습니다. 변경 전 반 설정은 `scratch/readability-20261006/human-review-class-before.json`에 있고 에뮬레이터 종료/재시드로 복원할 수 있습니다. 다른 PC에서는 [개발 환경 준비](DEVELOPMENT.md#다른-pc에서-시작)를 따른 뒤 수업을 다시 엽니다.

남은 확대 확인은 실제 브라우저 메뉴의 확대를200%로 설정하고 개념 목록·잼/반복/선택 체험·퀴즈 번호와 미답변 이동·실습 입력/실행을 조작합니다. 자연스러운 세로 스크롤·Tab/Shift+Tab 초점·글자/버튼 겹침·페이지 가로 넘침을 확인하고100%로 되돌립니다. 현재 도구가 ‘허용’ 표시와 달리 접근을 차단하므로 직접 확인하거나 앱 권한 상태를 새로 읽을 수 있는 다음 실행에서 확인합니다. 미확인인 필수 검사와 휴먼 리뷰가 남아7차 인계 완료로 표시하지 않습니다.

## 학생 학습 화면 개선 계획 재개

**기준 문서는 [학생 학습 화면 가독성·체험 개선 계획](reference/student-learning-readability-plan.md)입니다.** 사용자와 합의한 명세·회차/검증 통합·완료 기준과 실행 장부를 함께 읽습니다. 10/6 사용자가 요청한 실행 범위는7차까지이며 8차 확장은 휴먼 리뷰 후 진행합니다.

- **이미 결정한 것:** 데스크톱 PC 중심, 파랑 주요색 + 살구/주황 보조색, 한 개념/한 문항을 크게 표시하되 자유 이동, 실습 기본 넓음 + 같은 수업에서 수동 폭 선택 유지입니다. 운영 4개 수업을 다루고 사이트의 기존 안내/예시에도 보조색을 소량 적용합니다. 정확한 범위·수치·문항/체험 연결은 계획서가 단일 기준입니다.
- **반영한 성찰:** 큰 그림과 관찰 질문·실제 조건에 맞는 결과를 연결합니다. 모호한 명령은 예시 로봇의 해석으로 설명합니다. 실습의 좌우 여백뿐 아니라 빈 세로 공간·입력/결과 거리도 개선하고, 위치/답안/작품·저장 실패/충돌·초점을 보존합니다.
- **구현 순서:** 1 기준 확인 → 2 보조색/읽기 기준 → 3 개념 탐색/위치 → 4 알고리즘 체험 → 5 단일 퀴즈 → 6 폭/초점 → 7 샌드위치/대표 수업 → 8 추상화 → 9 순서도 → 10 프로그래밍/EntryJS → 11 사이트 보조색 → 12 최종 통합입니다. 세부 범위와 인터페이스는 계획서 6절을 따릅니다.
- **검증만 통합:** 새 동작·의존성이 큰 실패·위치/저장/초점/작품 보존은 회차마다 즉시 확인합니다. 넓은 개념/퀴즈 화면 검토는 5차, 실습/전체 인계는 7차, 확장 후 최종 검증은 12차입니다. 긴 파일 전체를 회차마다 반복하지 않습니다. 7·12차 전체 E2E는 빌드 앱에서 실행하고 동일 결과의 포함 관계/변경 영향을 확인해 근거를 재사용합니다. 통합 대기는 통과로 표시하지 않습니다.
- **멈출 지점:** 1~7차 구현·필수 기술/인계 검증을 마치면 **휴먼 리뷰 대기**로 남깁니다. 읽기 편함·중학생에게 명료한 체험/설명·목표/첫 행동/결과/재시도 흐름을 선생님께서 확인하시기 전에는 8차를 시작하지 않습니다. 2·4차의 인상/교육적 표현은 7차 완성 화면에서 함께 확인합니다.
- **출발 자료:** 원본 참고 화면은 계획서 [9절](reference/student-learning-readability-plan.md#9-사용자가-제공한-출발-화면)의 PNG 3장입니다. 사용자 제공 화면을 그대로 복사한 것이며 이번 개선의 검증 캡처는 아닙니다.
- **재개 환경:** Node24·Java21+·Chromium·demo 에뮬레이터와 실제 포트를 확인합니다. Ponytail(full)·Context7 등 스킬/도구는 PC별로 확인하고, 없으면 이유를 알린 뒤 가능한 로컬/공식 문서와 기존 코드로 이어갑니다. 개발 절차를 별도 복제하지 않고 [새 PC 준비](DEVELOPMENT.md#다른-pc에서-시작)를 따릅니다.

### 10/5 계획 인계의 무결성 (과거 기록)

아래 표는 `829b48f`에 보존한 최초 계획/원본 PNG의 해시입니다. **계획서는10/6 실행 장부가 추가됐으므로 현재 파일의 해시와 다릅니다.** 현재 소스·신규 CSS/테스트·문서는 작업 브랜치 전체 변경을 전달해야 합니다. `.env.local`·관리자 키·실학생 자료·개인 도구 설정·`scratch/` 검사 결과는 전달 범위 밖입니다.

텍스트 SHA-256은 UTF-8·LF로 정규화한 내용 기준이고 PNG는 원본 바이트 기준입니다. Git의 CRLF 설정 때문에 텍스트 해시를 원시 파일 바이트와 직접 비교하지 않습니다.

| 상대 경로 | SHA-256 |
| --- | --- |
| `docs/reference/student-learning-readability-plan.md` | `f5d7c952c2dd3597191a956a590496d6aef68b2305e91051f50d16bf16493165` |
| `docs/reference/student-learning-readability/concept-before.png` | `5780f7b5d24f2fd6b3382ee476177d0e9cff96e2c0a0b80a3349e914de461181` |
| `docs/reference/student-learning-readability/quiz-before.png` | `637ed57fdf2385c2821180be951808c48857c168b7c9e9e0e1cacaa0fd7f7937` |
| `docs/reference/student-learning-readability/practice-before.png` | `73e4f95fde2fba79755323c508bd9b6dbd9f1f7bf0d8ed15bc66c780c16d0ab5` |

### 이번 인계의 확인 범위

2026-10-05 Windows에서 인계 문서 3개의 로컬 링크68개·앵커32개 누락0, 계획/PNG의 SHA-256 4개 일치, 12개 회차의 미착수 표시와 문서 공백/끝 줄을 확인했습니다. PNG 3장은 원본/복사 해시도 일치하며 `829b48f`에 문서/PNG 6개만 포함하고 원격 일치·미커밋 없음도 확인했습니다. 10/6 브랜치 정리 후에는 HANDOFF 기록만 갱신합니다. 앱 typecheck/lint/build/E2E를 새로 실행한 것으로 기록하지 않습니다. 다른 PC의 실제 파일/환경은 직접 확인 전까지 미확인입니다. 아래 운영 릴리스 수치와 앞선 마감 검사는 과거 기록이며 이번 계획의 구현 성공 근거가 아닙니다.

### 브랜치 정리 — 2026-10-06

사용자가 완료 브랜치의 정리를 요청했습니다. 원격 10개·로컬 11개를 확인하고 열린 PR 0개·현재 worktree 1개·미커밋 없음·main 포함 여부를 검사한 뒤 **로컬/원격 각각 2개**만 남겼습니다. `main`은 기준 코드, `codex/session-handoff-20261005`는 아직 main에 없는 이번 계획의 인계 브랜치입니다. 해당 계획을 병합 완료 브랜치로 오인해 삭제하지 않았습니다.

| 정리한 브랜치 | 범위 | main 반영 근거 | 정리 시 tip |
| --- | --- | --- | --- |
| `codex/algorithm-review-lessons` | 로컬/원격 | PR21 병합·main 조상 | `9ac8142` |
| `codex/classroom-response-region` | 로컬/원격 | PR25 병합·main 조상 | `986bf56` |
| `codex/classroom-response-release` | 로컬/원격 | PR26 병합·main 조상 | `afde46e` |
| `codex/home-preview-anchor` | 로컬/원격 | PR17 병합본 `1365242`와 전체 tree 동일 | `455cab0` |
| `codex/original-practice-ui` | 로컬/원격 | PR23 병합·main 조상 | `12b00e7` |
| `codex/original-practice-ui-release` | 로컬/원격 | PR24 병합·main 조상 | `d47f2de` |
| `codex/review-release-record` | 로컬/원격 | PR22 병합·main 조상 | `bc361b6` |
| `codex/security-classroom-auth` | 원격 | PR16 병합본 `2d34a81`과 전체 tree 동일 | `1a502ed` |
| `codex/continuation-prep` | 로컬 | PR13 병합·main 조상, 원격은 이미 없었음 | `709cbb1` |
| `codex/student-ui-polish` | 로컬 | main 조상·별도 미병합 커밋 없음 | `1449fc1` |

두 squash 병합 브랜치는 단순 조상 판정 대신 해당 main 병합본의 전체 tree 일치를 확인했습니다. 원격 삭제는 각 tip의 예상 SHA를 지정한 lease와 원자적 push로 수행해 조사 뒤 새로 갱신된 브랜치를 삭제하지 않도록 했습니다. 로컬 main은 `3712e99`에서 `b8806a5`로 fast-forward하고 오래된 원격 추적 참조도 prune했습니다. 삭제한 브랜치의 구현·문서는 main과 병합 PR에 남습니다. 앱·계획서·참고 PNG·현재 worktree는 변경하지 않았으며 Git 상태와 문서만 검사했습니다.

다른 PC의 로컬 목록은 자동으로 없어지지 않습니다. 재개할 때 `git fetch --prune origin`으로 원격 추적 목록을 정리하고, 그 PC의 미커밋·미추적·미병합 변경을 확인한 뒤 완료 로컬 브랜치를 정리합니다. 이 PC의 삭제 목록을 다른 PC에 일괄 적용하거나 `reset --hard`를 실행하지 않습니다.

## 지금 사용할 수 있는 것

- 「강아지와 시작하는 프로그래밍」: 개념 네 활동·퀴즈 다섯 문항·실제 EntryJS 기본 네 미션·선택 평균 도전, 미션별 저장/검증/제출과 교사 조회입니다. 공개 `/prototype/programming`은 별도 체험으로 유지합니다.
- 문제 추상화·알고리즘 설계·순서도 연구소: 선택 복습이며 성적 미반영입니다. 원작의 색상 워크북·샌드위치 조리대/재료/칼·순서도 기호/캔버스/실행 강조를 살렸습니다. 수업별 Solar AI, 작품 스냅샷과 고정 교사 요청본, 저장 실패·충돌·재접속 처리를 연결했습니다.
- 학생·교사 대시보드와 목록: 개인 할 일·반 일정·시간표, 조회 스켈레톤·재시도/새로고침 표시, 단계/미션 진행과 저장 안내, 44px 조작 영역과 넓게 보기를 제공합니다. 교사 반 선택은 메뉴 이동·새로고침 동안 기억하고 실제 재로그인 시 기본 반으로 돌아갑니다.
- 명부 준비·반별 발급·제한된 백업 도구는 합성 자료로 검사했습니다. 실학생 등록·초기 전달은 후속이며 [첫 수업 절차](DEVELOPMENT.md#실학생-명부-준비와-반별-발급)를 따릅니다.

## 통합·배포 상태

[운영 사이트](https://cs-class-donghyunt.vercel.app), Firebase `cs-class-f74c4`, Vercel `cs-class`입니다. 아래는 10/5에 확인한 기능 릴리스 근거이며 문서 마감에서 앱 검사를 새로 실행한 결과가 아닙니다.

### 10/5 서버 함수 지역 조정

운영 함수의 미국 동부 `iad1`과 Firestore 서울 `asia-northeast3`가 떨어져 있음을 실제 메타데이터로 확인했습니다. `vercel.json`의 함수 지역만 서울 `icn1`로 지정했고 저장·권한·학습·Cron 규칙은 유지했습니다. [PR #25](https://github.com/DonghyunT/cs-class/pull/25)의 기능 `986bf56`과 병합 main `eacb020`의 트리는 동일합니다.

- Windows·Node24·Java21·Chromium·demo Auth9099/Firestore8080·`next start`: typecheck/lint/build·순수12개·영향32개 성공(1.4분), 독립 리뷰 P1/P2 없음. [Linux PR CI](https://github.com/DonghyunT/cs-class/actions/runs/37304913398)는 전체135개 성공·Windows .NET 전용1개 제외(12.0분)입니다. 동일 트리의 중복 push/main CI 취소는 성공으로 세지 않습니다.
- 기록 후 main `9af5b9de5e4b6a6416166745c9fe4e345f490be9`의 배포 `dpl_5Y1oimfL1eRXSeSHTTfQcQNzdQ8L`/`cs-class-qvjui5k1c-donghyunt.vercel.app`에서 READY·Production·`regions: ["icn1"]`·SHA·정식 별칭 일치를 확인했습니다. 기능 검증본과 앱/설정은 같습니다.21:14 KST config200/configured=true/승인 프로젝트/에뮬레이터 없음/게스트 비활성화, 익명 session200/세션없음과 학생·교사·AI401을 확인했습니다. 로그인 화면/학번 초점/콘솔 오류0은 직전 기능 배포의21:03~21:04 확인입니다.
- 배포 전후11반의 열린/이번 수업/revision은 동일했고 운영 AI 집계는21:03 시점2→2호출·실패0이었습니다. 실제 사용 집계를 초기화하거나 검사 호출로 해석하지 않습니다. 새 유료 AI 호출·운영 합성 계정/시드는 없었습니다.

### 10/5 원작 실습 UI 복원 공개

기능 `12b00e7` → [PR #23](https://github.com/DonghyunT/cs-class/pull/23) → main `448d61f`로 공개했습니다. 기존 저장·AI·교사 기능을 유지하고 실습 표현을 원작에 맞췄습니다. Windows 최종 영향26개·순수12개·typecheck/lint/build, Linux PR/브랜치 전체135개·Windows 전용1개 제외가 통과했습니다. 실제 그림·끌어놓기/키보드·초점/44px·320/390/820/821px·모션 줄이기·콘솔·작성/재접속/제출/교사 요청을 확인했고 독립 재검토의 추가 지적은 없었습니다. 초기 칼 움직임·캔버스 잘림의 재현/수정과20:10 운영 확인은 [보존 기록](archive/cs-class/2026-10-05-session-close/HANDOFF.md#105-원작-실습-ui-복원-공개)에 있습니다.

### 10/5 세 복습 운영 공개

기능 `9ac8142` → [PR #21](https://github.com/DonghyunT/cs-class/pull/21) → main `6bad59b`로 공개했습니다. Windows `c892d66` 전체130개와 이후 영향19개, Linux 최종 전체130개·Windows 전용1개 제외를 구분합니다. 18:41~18:42 KST 샌드위치→추상화→순서도 순서로 백업/계획·11반 원자적 적용·전후 대조를 완료했습니다. 새 복습을 이번 수업으로 자동 지정하지 않았고 기존 강아지 설정·작품·계정은 보존했습니다.

사용자가 Firebase 결제 계정을 직접 연결한 뒤 AI 요청/캐시 TTL 두 항목의 ACTIVE를17:48에 확인했습니다. Production Sensitive와 Git 제외 로컬 설정의 보안 기준은 [서버 설정](FIREBASE_SETUP.md#복습-ai-서버-설정), 실제 Solar 품질과 오판은 [실행 장부](reference/algorithm-review-integration.md#실행-장부)를 따릅니다. 반 설정 복구 파일은 아래 로컬 자료 절에 있고 적용 절차는 [개발 안내](DEVELOPMENT.md#알고리즘-복습-수업)에 있습니다.

### 10/4 실제 수업·시간표 운영 릴리스

[PR #18](https://github.com/DonghyunT/cs-class/pull/18)의 13차시·명부 도구·금옥중학교 시간표는 운영에 반영했습니다. Windows97개·Linux96개/Windows 전용1개 제외, 인증된 첫 갱신과 플랫폼 수동 Run200은 [당시 보존 기록](archive/cs-class/2026-10-05-before-ui-refinement/HANDOFF.md#104-실제-수업시간표-운영-릴리스)에 있습니다. 10/5 첫 자연 예약의 관측 결과는 미확인이며 다음 점검에서 로그/`checkedAt`을 대조합니다.

### 10/3 운영 테스트 계정 발급

사용자가 승인한 학생11개·교사1개의 일회 발급 근거는 [보존 기록](archive/cs-class/2026-10-05-before-ui-refinement/HANDOFF.md#103-운영-테스트-계정-발급)에 있습니다. 발급 원문은 Git에 넣지 않으며 반복 자동 검사·새 운영 계정 생성에 이 승인을 적용하지 않습니다.

## 교실 입장·대시보드 조회 성능

10/5 같은 PC의 익명 `/api/auth/session` 측정은 아래와 같습니다. 각 표본은 첫 요청 뒤 연속5회이며 로그인한 반 조회나 DB 통신의 측정이 아닙니다.

| 시간(KST)·지역 | 첫 요청 | 이후5회 중앙값 / 최대 |
| --- | --- | --- |
| 20:39·미국 `iad1` | 316ms | 213ms / 218ms |
| 21:03·서울 `icn1`, 배포 직후 | 2163ms | 47ms / 1626ms |
| 21:04·서울 `icn1`, 추가 측정 | 158ms | 48ms / 56ms |

배포 직후의 느린 요청도 포함합니다. 사용자는 이후 응답이 훨씬 빨라졌다고 확인했습니다. 실제 메뉴/반 선택의 정량 개선율·학교망·초기 지연 원인은 미측정이며 저장 확인이나 AI 응답의 대기를 없앤 변경은 아닙니다. 원본 표본은 Git 제외 `scratch/review-lessons/anonymous-session-{before,after,settled}-20261005.json`에 있습니다. 운영 로그 도구403·Observability Plus 요구402로 해당 로그/집계는 확인하지 못했으며 유료 업그레이드는 하지 않았습니다. 추가 진단은 [측정 절차](DEVELOPMENT.md#대시보드-성능-측정)를 따릅니다. 이전9/30 측정은 [과거 메타데이터](reference/dashboard-performance/2026-09-30.json)와 구분합니다.

## 다음에 이어갈 작업

1. **학생 학습 화면 개선:** 위 [계획 재개](#학생-학습-화면-개선-계획-재개)를 따라 1차부터 시작합니다. 7차 기술/인계 검증 뒤 선생님 휴먼 리뷰를 기다립니다. 아래 실제 수업 준비를 이번 UI 구현 범위에 섞지 않습니다.
2. **첫 실제 수업 준비:** 학년도·실제 명부·첫 적용 반을 확인하고 명부 변환/검증/읽기 전용 계획을 준비합니다. 등록·발급·반 설정 변경은 대상과 영향·복구 범위를 확인한 뒤 승인된 범위에서 수행합니다. [수업 전 확인 순서](DEVELOPMENT.md#첫-실제-수업-확인-순서)를 사용합니다.
3. **학교에서 흐름 확인:** 입장·개인 비밀번호 변경·활동·저장/재접속·제출·교사 확인, 브라우저 종료/창 복원 후 세션, 메뉴/반 선택 체감과 자연 Cron을 확인합니다. 실제 자료를 쓰는 관찰과 로컬 합성 검사를 구분해 기록합니다.
4. **사용 결과로 후속 결정:** 복습 AI의 호출/토큰/지연/실패와 교사 확인 사례를 보고 월 예산·품질 보강을 정합니다. 도움/Q&A·작품집·교사 콘텐츠 편집·평가·학년도/수업 버전·보관/백업 정책은 [PRD의 미결정](PRD.md#다음에-결정할-것)이며 일괄 구현을 시작하지 않습니다.

## 다른 PC에서 이어가기

- 이번 계획은 **`codex/session-handoff-20261005`의 인계 커밋**으로 받습니다. `main`에는 계획이 포함됐는지 확인하지 않았으므로 `main`만 받는 것으로 대체하지 않습니다. 기존 체크아웃이면 먼저 `git status -sb`로 미커밋/미추적 변경을 보존한 뒤 `git fetch origin`으로 원격을 확인합니다. 대상 브랜치가 로컬에 없으면 `git switch --track origin/codex/session-handoff-20261005`, 이미 있으면 `git switch codex/session-handoff-20261005` 뒤 `git pull --ff-only origin codex/session-handoff-20261005`를 사용합니다. 기존 변경을 reset/덮어쓰지 않고 분기 이력이 다르면 상태를 먼저 대조합니다.
- 받은 브랜치의 `git log -1 --oneline`·계획 파일·원본 PNG 3장·위 해시를 확인하고 `AGENTS.md` → HANDOFF → 계획서를 읽습니다. 새 PC의 소스가 작성 기준과 달라졌으면 영향부터 대조하며 계획 수치를 임의로 바꾸지 않습니다. 과거 이식 ZIP을 최신 코드 위에 덮어쓰지 않습니다. 개발 환경·Java/캐시/EntryJS·에뮬레이터는 [새 PC 준비](DEVELOPMENT.md#다른-pc에서-시작)를 따릅니다.
- `.env.local`·관리자 키·개인 스킬/도구 설정·`outputs/`·`scratch/`는 Git clone으로 옮겨지지 않습니다. 비밀값·학생자료를 채팅/문서/Git에 넣지 않고 필요한 파일만 지정한 비공개 경로로 따로 전달합니다. 실제 자료를 바꾸기 전 현재 값을 다시 확인합니다.
- 로컬 복구 계획: `scratch/review-lessons/production-full-restore-plan-release-20261005.json`과 단계별 `production-{sandwich,abstraction,flowchart}-plan-release-20261005.json`. 원본 백업을 유지하며 현재값/revision이 계획과 다르면 전체 적용을 거부합니다. 학생 작품·기존 기록은 보존합니다. 파일이 없는 PC에서 추측으로 복구하지 않습니다.
- 참고 캡처/검사: `scratch/review-lessons/`·`scratch/ui-polish-2026-10-05/final/`·`scratch/release-verification/2026-10-05-ui/`. 빈 명부 양식은 `outputs/classroom-readiness/학생명부_작성양식.xlsx`입니다. 앞선 지역 검사 종료 시 앱/에뮬레이터를 정리했으며 재개할 때 포트 상태를 다시 확인합니다.

### 새 대화에 붙일 요청문

> 학생 학습 화면 개선 계획을 이어서 실행해주세요. 먼저 현재 Git 상태와 기존 변경을 보존하고, origin/codex/session-handoff-20261005의 인계 기록이 있는지 확인해주세요. AGENTS.md, docs/HANDOFF.md의 '학생 학습 화면 개선 계획 재개', docs/reference/student-learning-readability-plan.md와 원본 참고 PNG 3장을 읽어주세요. 계획의 1~5절 명세와 6절의 12개 구현 회차를 그대로 기준으로 삼고 1차부터 시작해주세요. 새 동작/중요 실패는 즉시 검사하고 넓은 검증은 5·7·12차에 통합하며 통합 대기를 통과로 세지 마세요. 1~7차 구현과 필수 기술/인계 검증까지 진행한 뒤 휴먼 리뷰 대기로 멈추고 검토 자료를 남겨주세요. 제 확인 전에는 8차 이후 확장과 운영 배포를 진행하지 마세요. 이미 합의한 색상·PC 중심·단일 개념/문항·실습 폭을 처음부터 다시 제안하지 말고, 실행 중 실제로 새 결정이 필요한 문제만 질문해주세요.

## 남은 한계와 다음 결정

- 실제 새 Google OAuth·학교망·자연 Cron, 실기기 터치 끌기·OS IME·화면 읽기 프로그램 음성·EntryJS 전체 블록의 접근성은 이번 검사에서 확인하지 않았습니다. 로그인 버튼 준비와 익명 API 정상 응답을 실제 OAuth 성공으로 표현하지 않습니다.
- 원작 음성 입출력·픽셀 단위 동일성·범용 자유 제작은 추가하지 않았습니다. 순서도 AI는 타당한 두 합성 작품을 불확실/보완으로 판정한 한계가 남으며 교사 확인 경로를 사용합니다.
- 미전송 초안은 메모리에 남고 강제 종료의 영구 복구는 보장하지 않습니다. 저장 실패·충돌·이전 제출본 보존은 [저장 정책](PRD.md#작업-저장과-통신-비용)을 따릅니다.
- 이전 Stitch/Firebase CLI 인증 폐기·재발급 여부,9/28 의존성 중간 경고5개(운영2개), Actions/Java Action 폐기 예고는 기존 미확인 후속입니다. 이번 문서 정리에서 새 점검·해결로 표현하지 않습니다.
