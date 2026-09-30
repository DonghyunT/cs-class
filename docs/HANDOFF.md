# 이어갈 작업

갱신: 2026-10-01(Asia/Seoul). 과거 대화 없이도 현재 상태와 다음 작업을 이해하는 시작점입니다. 정책은 [PRD](PRD.md), 화면 기준은 [DESIGN](DESIGN.md), 실행은 [DEVELOPMENT](DEVELOPMENT.md), 서버 설정은 [FIREBASE_SETUP](FIREBASE_SETUP.md)을 따릅니다.

## 현재 작업 상태

| 항목 | 확인 상태 |
| --- | --- |
| 브랜치·미커밋 | 10/1 마감 시 `main`·`origin/main` 동기화, 미커밋 없음. 기능 병합 커밋 `56e5a1fa49804e77d6359bd0074368dae709bc0f` 뒤에는 README/HANDOFF의 인계 결과만 갱신했습니다. 최신 HEAD는 시작 전 `git status --short --branch`·`git log -1`로 확인 |
| 통합·배포 | 사용자의 10/1 요청으로 [PR #13](https://github.com/DonghyunT/cs-class/pull/13) 병합 완료. 병합 커밋의 CI 전체 55개 통과·Vercel Production READY·운영 별칭·인증 API·체험/로그인 화면 확인. 후속 문서 커밋도 Git 자동 배포 대상으로 같은 앱·테스트를 유지 |
| 구현 | 공개 `/prototype/programming`: 조작형 개념·퀴즈 재도전·미니 블록 실습·도움/교사 피드백 체험. 릴리스 정리에서는 앱·API·DB·의존성을 유지하고 기존 EntryJS 검사의 실패 주입 순서만 보정 |
| 새 검증 | 10/1 Windows Node 24.19.0·Java 21.0.12.1·Chromium, lint·typecheck·프로덕션 build 통과. `next start`·localhost:3000·`demo-cs-class` Auth 9099/Firestore 8080에서 최종 전체 E2E **55개 통과**(2.8분·종료 코드 0). GitHub PR·브랜치·병합 `main` CI도 통과 |
| 다음 행동 | 다른 PC에서 최신 `main`을 받아 아래 읽기 순서·새 대화 요청문으로 시작. 다음 기능 수정은 기존 EntryJS 재사용 범위·13차시 첫 미션을 검토하고 구체 범위를 정하는 것 |

## 새 에이전트가 먼저 읽을 순서

1. [AGENTS](../AGENTS.md)와 위 상태표를 읽고 Git 상태·HEAD·원격 동기화를 확인합니다. 새 PC의 기존 수정과 미추적 파일을 보존합니다.
2. [프로토타입/사용자 피드백](PRD.md#프로그래밍-13차시--경험-검토용-프로토타입)과 [완성형 경험 후보](PRD.md#학교-수업-완성형의-경험-후보)에서 확정 목표·제안·구현을 구분합니다.
3. [13차시 자료](reference/programming-13.md)에서 PPT 내용·미션 통합·체험 화면을, [DESIGN](DESIGN.md#프로그래밍-13차시--경험-검토용-표현)에서 조작/피드백의 목적을 확인합니다.
4. [프로토타입 코드/상태](DEVELOPMENT.md#프로그래밍-수업-프로토타입), [기존 EntryJS](DEVELOPMENT.md#entryjs-실습), [13차시 적용 검토](DEVELOPMENT.md#13차시의-실제-entryjs-적용-검토) 순서로 읽고 실제 코드를 확인합니다.
5. 다음 구체 수정 범위를 정합니다. 이번 릴리스로 실제 교사 전송·AI·실학생 운영·실행기 교체를 함께 구현하기로 결정한 것은 아닙니다.

## 다음 작업 시작점

첫 목표는 [선생님 학교의 수업을 깊게 완성하는 공간](PRD.md#목적과-첫-범위)입니다. **개념–퀴즈–실습**의 기본 틀은 유지합니다. 학생 실습 도움, 심화·자유 제작, 작품집, 반 안의 질문·작품 교류와 교사 수업 편집은 후보로 논의했으며 성공 기준·우선순위·도움/평가 정책 전체는 미정입니다.

### 2026-10-01 받은 피드백과 이어갈 일

- 사용자는 **전반적인 구조는 괜찮다**고 평가했습니다. 기본 흐름 유지의 재확인이며 세부 UI·문항·정책 전체의 최종 승인과 구분합니다.
- **실습은 실제 EntryJS를 사용했어도 좋았겠다는 의견**을 남겼습니다. 저장소에는 실제 EntryJS 기반 `entry-bot-lab`이 있습니다. 미니 작업실 선택은 EntryJS 사용 불가나 최종 기술 결정이 아닙니다.
- 구체 수정은 다음으로 미뤘고 처음에는 문서/이식 자료 정리만 요청했습니다. 이후 이번 대화에서 현재 결과의 병합·배포까지 요청했습니다. 후속 기능 수정 범위는 여전히 별도로 정합니다.
- 작은 기술 검토의 출발점은 기존 iframe/자산/브리지를 재사용한 **이름 묻기·대답 말하기 미션**입니다. 기존 팔레트·프로젝트 파서는 3블록/상수만 지원하므로 변수·입력·연산·방향·키 신호는 단계적으로 검토합니다.
- 먼저 정할 경계는 공개 체험 유지/운영 수업 편입, 원 PPT 4미션·장면 구성과 현재 3미션 통합의 유지 여부, 실제 Entry 작품 형식과 기존 탭 초안의 보존 방식입니다. 도움 전송·AI·교사 편집기는 후속 후보입니다.

### 프로그래밍 13차시 프로토타입

- [운영 체험](https://cs-class-donghyunt.vercel.app/prototype/programming), [로컬 체험](http://localhost:3000/prototype/programming), [범위](PRD.md#프로그래밍-13차시--경험-검토용-프로토타입), [실행·코드 위치](DEVELOPMENT.md#프로그래밍-수업-프로토타입). 제공한 `정보 13차시 수업(프로그래밍).pptx`의 17장 텍스트·실습 블록 이미지를 9/30 읽었고 원본은 수정하지 않았습니다. 원 PPT·추출 미디어는 Git 제외이며 학습 내용과 차이는 참고 자료에 요약했습니다.
- 개념 4개와 퀴즈 5문항·오답 재도전, 이름·변수 A/B 곱셈·방향키의 기본 3미션과 평균 도전입니다. 팔레트 클릭/드래그, 입력·순서·삭제, 신호별 실행·중지·무대 복원·실행 발자국·여러 입력의 조건 확인을 지원합니다.
- 도움 요청 당시 코드·입력·실행을 고정해 교사 시점에서 피드백을 남기고 학생이 해결 표시합니다. 도움/응답은 새로고침에 사라지고 학습 초안·완료 기록만 같은 탭에 복원합니다. 실제 교사 전송·AI·평가/제출·Entry 파일 저장은 연결하지 않았습니다.
- 9/30 구현은 Ponytail full, Next.js 16.3.6 설치본/React README와 Context7 문서를 확인했습니다. 당시 reviewer가 초안 복원과 실행 가능성 분리·방향 설정 순서·도움 이동/초점 문제를 재현했고 수정 후 확인했습니다. 의존성 추가·운영 인증 변경은 없었습니다.
- **이전 검증(9/30):** lint·typecheck·build와 프로덕션 빌드의 전체 55개 E2E 통과(2.7분·종료 코드 0). 대상 4개는 전체 흐름·음수/0/평균·네 방향·미완성/긴 숫자 복원·저장 실패/재시도·키보드·320/390/768/1024px·움직임 줄이기·콘솔을 포함했습니다. 데스크톱/모바일 화면과 320/390px 개념 4종의 조작·가로 넘침 없음·브라우저 오류 0건을 확인했습니다.
- 참고 화면 6개와 촬영 날짜·치수·SHA-256을 함께 전달합니다. 이전 화면을 이번에 새로 촬영한 것으로 표현하지 않습니다. 새 검증과 운영 확인은 아래를 따릅니다.

## 이번 릴리스와 검증

- 10/1 로컬 lint·typecheck·프로덕션 build 통과. 최초 제한 실행의 빌드는 컴파일 뒤 자식 프로세스 `EPERM`이어서 허용된 환경에서 동일 명령을 실행해 통과했습니다.
- 최종 전체 E2E **55개 통과**(2.8분·종료 코드 0). 준비한 Java/Firestore/Chromium 캐시, `npm run test:e2e`, `CI=1`의 프로덕션 빌드·새 로컬 에뮬레이터로 단일 실행했습니다. 이전 `emulators:exec` 포트 충돌과 앱 자식 종료 시 에뮬레이터도 종료되는 수명을 먼저 해결했습니다.
- 첫 전체 실행은 54개 통과·기존 EntryJS 검사 1개 시간 초과였습니다. trace에서 초기 정규화 POST 실패 안내가 숫자칸 클릭 도중 화면을 밀었음을 확인했습니다. [대상 검사](../tests/entryjs-ui.spec.ts)는 편집칸 초점 준비 뒤 실패를 주입하도록 보정했고 저장 실패·이동 보호·입력 확정·복원·좁은 창 조건은 유지합니다. 설치 Playwright 1.63.0 README/타입과 Context7의 해당 버전 문서를 확인했습니다. 수정 뒤 대상 3개 통과(54초), lint/typecheck 통과 후 위 최종 전체 실행을 확인했습니다.
- 활성 문서 9개의 로컬 링크/앵커·Git 전달 여부 245건, 참고 화면 6개의 SHA-256/치수, 프로토타입 소스·검사 9개의 기존 스냅샷과 Git 저장 내용의 바이트 일치를 확인했습니다. Windows `core.autocrlf=true`로 체크아웃의 줄끝만 LF→CRLF로 바뀌었고 코드 변경은 없습니다. 문서/코드 보관 원문 376개의 작업 파일·스테이징 SHA-256 752건과 `git diff --check`도 통과했습니다. 병합·배포 결과를 기록한 뒤 같은 문서 검사를 다시 확인했습니다.
- 이전 55개·대시보드 51개 검사, 문서 링크 221건, 23파일 이식 ZIP 검증은 [릴리스 전 원문](archive/cs-class/2026-10-01-before-programming-release/HANDOFF.md)에 보존했습니다. 당시 결과를 이번 재실행으로 표현하지 않습니다.
- 운영 학생 자료·계정·Firebase 규칙·비밀 설정은 변경하지 않았습니다. 합성 검사는 `demo-cs-class`·로컬 9099/8080만 사용합니다.

## 통합·배포 상태

대상은 GitHub `DonghyunT/cs-class`, Vercel `cs-class`(`prj_RUUtcTMukVY9kjudgDr6VA89KKxP`), Production 브랜치 `main`입니다. 운영 주소는 [CS Class](https://cs-class-donghyunt.vercel.app)이며 설정은 [서버 안내](FIREBASE_SETUP.md#vercel-서버-설정)에 모읍니다.

- 기능 커밋 `709cbb14f576264d424272b54dc8c0705e2a5f0e`를 [PR #13](https://github.com/DonghyunT/cs-class/pull/13)에서 10/1 01:36 KST에 `main`의 `56e5a1fa49804e77d6359bd0074368dae709bc0f`로 병합했습니다. 병합 트리는 검증한 기능 커밋과 같습니다. [PR CI](https://github.com/DonghyunT/cs-class/actions/runs/36744354132)는 55개/3.1분, 브랜치 CI도 성공했으며 [병합 main CI](https://github.com/DonghyunT/cs-class/actions/runs/36745415277)는 lint·typecheck·build·전체 E2E 55개/3.0분을 통과했습니다. CI는 로컬 Auth·Firestore 에뮬레이터만 사용합니다.
- 병합 커밋의 [Production 배포](https://vercel.com/donghyunt/cs-class/3ZpfkT1V2J6Hcsvt8TjeXvN8r8n2) `dpl_3ZpfkT1V2J6Hcsvt8TjeXvN8r8n2`·SHA `56e5a1f`·READY·운영 별칭 `cs-class-donghyunt.vercel.app`을 확인했습니다. Vercel 화면의 Root Directory 비움·Next.js 기본 빌드/설치·Node 24.x도 확인했고 설정은 바꾸지 않았습니다. 후속 인계 문서 커밋은 같은 앱·테스트입니다. 다른 PC에서 확인할 때는 최신 문서 HEAD를 Git 로그에서 읽고 해당 Git 배포의 SHA·READY·운영 별칭·API를 함께 확인합니다.
- 운영 익명 요청: `/api/auth/session` HTTP 200 JSON·`configured: true`·`session: null`·`SIGNED_OUT`, `/api/auth/config`의 프로젝트 `cs-class-f74c4`·에뮬레이터 없음, 학생/교사/할 일/일정 API 모두 401. 이전 주소 `/login/teacher?source=release-check`는 같은 경로·쿼리로 공식 주소에 307 이동했습니다. 키·쿠키·응답의 개인정보는 기록하지 않았습니다.
- Chrome의 운영 체험 화면·개념 명령 실행과 교사 로그인 화면의 Google 버튼 활성 상태를 확인했고 두 화면의 콘솔 오류는 0건이었습니다. [기능 Preview](https://cs-class-fwmfi0ywz-donghyunt.vercel.app/prototype/programming)에서는 이름 미션의 팔레트 조립·실행·조건 확인도 통과했습니다. 좁은 창·키보드·저장 실패/복원 등의 자세한 범위는 로컬/CI 검사이며 운영에서 전부 반복한 것은 아닙니다.
- Google 계정 선택 창은 열렸으나 개인 계정 접근 단계에서 자동 승인 검토가 추가 사용자 승인이 필요하다고 거절했습니다. 새 Google OAuth 세션 생성·교사 대시보드 조회는 이번 완료 확인 범위에 포함하지 않습니다. 서버 런타임 로그 MCP도 프로젝트 호출에서 팀 ID 필수 오류로 조회하지 못했습니다. 일반 Preview의 `configured: false`·로그인 준비 안내나 Production READY만으로 실제 Google 로그인 성공을 판정하지 않습니다.
- 이전 [PR #12](https://github.com/DonghyunT/cs-class/pull/12)의 로컬/CI 51개·운영 API/대시보드 확인은 9/30 결과입니다. 당시 Chrome의 기존 교사 세션으로 조회했고 새 Google OAuth 로그인은 반복하지 않았습니다. 상세 SHA·CI·주소·로그 조회 한계는 [보관 원문](archive/cs-class/2026-10-01-before-programming-release/HANDOFF.md)에 있습니다.

## 다른 PC에서 이어가기

**최신 `main`이 기본 시작점**입니다. [설치 안내](DEVELOPMENT.md#다른-pc에서-시작)대로 새로 복제하거나, 기존 PC에서는 변경을 보존한 뒤 `git fetch origin` → `git switch main` → `git pull --ff-only`로 갱신합니다. 위 기능 병합 커밋이 이력에 있고 로컬 HEAD와 `origin/main`이 같은지 확인합니다. 새 수정은 `codex/` 브랜치에서 시작합니다. `.env.local`·관리자 키·Java/브라우저 캐시·플러그인은 Git으로 전달되지 않으며 UI 개발과 자동 검사는 운영 키 없이 가능합니다.

### 다른 환경으로 옮길 자료

- 릴리스 대상은 프로토타입 소스 8개·검사 1개, [13차시 수업 요약](reference/programming-13.md)·체험 화면 6개·[메타데이터](reference/programming-13/screenshots.json), PRD/DESIGN/DEVELOPMENT의 맥락과 이 인계입니다. 기존 EntryJS 소스·설치 스크립트·공통 UI도 저장소에 있습니다. 정리 전 인계 원문과 manifest의 바이트 해시를 함께 보존합니다.
- 이전 Git 제외 `scratch/handoff/cs-class-2026-10-01-handoff.zip`은 **병합 전 23파일의 과거 스냅샷**입니다. 최신 `main`을 받은 PC에 덮어쓰지 않습니다. 별도 복구가 필요할 때만 [이식 절차](DEVELOPMENT.md#진행-중-작업을-다른-환경으로-옮기기)와 안의 `TRANSFER.md`·manifest를 따릅니다.
- 원 PPT·추출 그림·학생 자료·비밀 설정·캐시는 전달하지 않습니다. 원 PPT 없이도 현재 체험과 학습 목적은 재현할 수 있고, 정확한 PPT 장면/그림·파일 저장 절차를 확인하는 작업에만 원본이 필요합니다.
- 이전 완성형 HTML 시안은 대화의 시각화 영역에만 있으나 세 장면의 후보 경험은 PRD에 보존했습니다. 대화나 도구의 세션·에이전트 상태를 복원할 필요는 없습니다. 새 PC의 Ponytail/Context7 가용성은 따로 확인합니다.

### 새 대화에 붙여 넣을 요청문

> CS Class를 이어가자. AGENTS.md와 docs/HANDOFF.md의 읽기 순서를 따라 현재 브랜치·HEAD·미커밋/미추적 변경과 원격 main 동기화를 먼저 확인하고 기존 작업을 보존해줘. 1차 목표는 내 학교의 수업을 깊게 완성하는 공간이고 기본 틀은 개념–퀴즈–실습이야. `/prototype/programming`의 전반 구조는 괜찮았고 실습은 실제 EntryJS를 활용해도 좋겠다고 의견을 줬어. PRD의 피드백·완성형 후보 경험, 13차시 수업 요약, DEVELOPMENT의 미니 작업실/기존 EntryJS 경계와 적용 검토를 읽고 이번 구체 수정 범위를 정하자. 최신 main에 예전 이식 ZIP을 덮어쓰지 말고, 현재 체험의 배포를 실제 교사 전송·AI·실학생 운영이나 실행기 교체의 결정으로 확대하지 말아줘.

## 교실 입장·대시보드 조회 성능

대시보드 트랜잭션 일괄 조회는 이전 릴리스에 포함됐습니다. 9/30 같은 Windows 프로덕션 빌드·로컬 에뮬레이터·교사 11반/선택 반 30명·학생 열린 수업 3개에서 첫 관찰+반복 5회로 비교했습니다. 원 수치·요청 수·응답 해시는 [측정 메타데이터](reference/dashboard-performance/2026-09-30.json), 상세 표·운영 관찰은 [보관 원문](archive/cs-class/2026-10-01-before-programming-release/HANDOFF.md)에 있습니다.

- 반복 중앙값: 교사 화면 준비 686→166ms, 교사 수업 580→75ms, 교사 일정 113→51ms. 학생 화면 준비 153→143ms. API는 전후 접속당 4회이며 응답 해시·크기는 같았습니다. 실제 물리 RPC·청구 문서 수나 운영 개선율은 측정하지 않았습니다.
- 운영 세션·입장 지연은 별도 후속입니다. 기존 로그인 관찰의 세션 중앙값 627ms, 비로그인 반복 중앙값 211ms는 변경 전후 비교나 서버 콜드 스타트 판정이 아닙니다.
- 분석 시작점은 `HomeEntry` 입장 준비 → `SessionProvider.refresh()` → `client.ts` → 인증 라우트 → 서버 `readSession/identity/authorized`·Firebase 초기화입니다. 쿠키 없는 익명 요청은 `identity()`에서 끝나 Firestore 계정 조회를 하지 않습니다. [측정 절차](DEVELOPMENT.md#대시보드-성능-측정)로 요청 시작·응답·로그인 계정 조회·목록을 분리하고 가장 작은 개선 후보를 정합니다.

## 남은 한계와 다음 결정

- 제품: 파일럿 최종 한도·실학생 적용, 최초 반/학생 등록·초기 비밀번호 전달·공개 범위, 학년도/수업 버전·보관/백업 정책이 남습니다. 도움·Q&A·AI·작품집·교사 콘텐츠 편집기는 후속 후보입니다.
- EntryJS: 현재 3블록/상수 구조·지원 범위와 실제 드래그·입력·실행·중지/재접속 검사는 [개발 안내](DEVELOPMENT.md#entryjs-실습)를 따릅니다. 변수/입력·반복/조건·자유 제작·전체 블록의 키보드/터치 검증은 남습니다.
- 복구: 운영 학습/대시보드의 미전송 초안은 메모리에만 남습니다. [운영 저장 정책](PRD.md#작업-저장과-통신-비용)과 공개 체험의 [탭 보관·도움 메모리](DEVELOPMENT.md#상태와-저장-경계)를 구분합니다. 탭의 체험 답안 자체는 다른 PC로 이동하지 않습니다.
- 인증정보: 9/30 진단 중 노출된 Stitch 키 재발급과 9/29 Firebase CLI 인증 폐기·재연결 완료 여부는 미확인입니다. 원문 로그·키를 보관하지 않으며 검사 터미널에서 불필요한 도구 키를 제외합니다.
- 의존성: 9/28 `npm audit` 중간 경고 5개(운영 2개, `uuid/gaxios`·개발 CLI)는 이전 미해결 기록입니다. 이번 릴리스에서 재검사·의존성 변경은 하지 않았습니다. 10/1 성공한 CI의 Node 20 기반 Actions·`setup-java@v4` 폐기 예정 경고와 Ubuntu 이미지 이전 예고도 후속 도구 갱신 대상으로 남깁니다.
- 운영 검증: 새로운 Google OAuth 로그인, 실학생 사용성·수업 시간·평가 타당성은 새로 확인한 범위만 별도로 기록합니다. 이전 세션·합성 검사를 해당 성공으로 확대하지 않습니다.

과거 원문과 검증 근거는 [보관함](archive/README.md)을 따릅니다. 당시 승인과 지침은 현재 작업 범위를 확대하지 않습니다.
