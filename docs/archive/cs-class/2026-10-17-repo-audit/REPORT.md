# CS Class 저장소 전체 점검 보고서

| 항목 | 내용 |
|---|---|
| 작성일 | 2026-10-17 (Asia/Seoul) |
| 기준 커밋 | `main@8afb5fb` (`docs: record 10/17 release of #43`) |
| 점검 범위 | 저장소 전체. `archive/`, `docs/archive/`는 참고만 했고 `public/entryjs/`의 외부 엔트리 자산은 읽지 않음 |
| 점검 방법 | `ponytail-audit` 기준(정확성 → 안전 → 부하 → 테스트 → 속도 → 군살 순)으로 코드를 직접 읽음 |
| 실행 제약 | 읽기 전용. 파일 수정·커밋·브랜치 전환·push 없음. 운영 Firebase·Vercel 접근 없음. 테스트·빌드·전체 E2E 실행 없음 |
| 이 파일의 위치 | `scratch/`는 Git에서 제외되는 폴더라 이 PC에만 있음. 다른 PC나 에이전트와 공유하려면 문서 색인(README·check-docs)을 갱신해 `docs/`로 옮겨야 함 |

이 문서는 사람과 AI 에이전트가 모두 읽도록 썼습니다. 발견마다 `F1`~`F7` 번호를 붙였고, 판단 하나하나에 근거(파일:줄 번호와 코드 발췌)를 적었습니다. 확신도는 두 가지로 표시합니다.

- **확인됨:** 이 저장소의 코드나 문서를 읽어 직접 확인함
- **추정:** 저장소 밖의 동작(예: Firebase 서비스)에 기대고 있어 이 점검에서 확인하지 못함

---

## 1. 요약

**판정:** 전체적으로 건강합니다. 권한 검사, 수동 저장 흐름, 검사(E2E)가 촘촘합니다. 고칠 것 중에서는 로그인 입구(F1·F2)가 가장 급합니다.

| ID | 분류 | 한 줄 요약 | 위치 | 작업 크기 | 확신도 |
|---|---|---|---|---|---|
| F1 | 꼭 고칠 것 · 보안 | 로그인 시도 제한을 비밀번호마다 따로 셈. 비밀번호의 해시가 DB 문서 이름으로 남음 | `src/lib/server/auth.ts:105-107` | 작음 | 확인됨 (Firebase 자체 차단은 추정) |
| F2 | 꼭 고칠 것 · 버그 | Firebase 장애나 차단이 학생에게 "비밀번호 틀림"으로 보임 | `src/lib/server/auth.ts:121` | 작음 | 확인됨 |
| F3 | 꼭 고칠 것 · 저장 흐름 | 교사가 확인 요청을 처리하면 학생 화면에 "다른 탭" 충돌이 뜨고, 잘못 고르면 입력이 사라짐 | `src/lib/server/classroom.ts:146`, `:82` | 작음~중간 | 확인됨 (고치는 방법은 재현 검사로 확인 필요) |
| F4 | 고치면 좋음 · 운영 | 예상하지 못한 서버 오류는 원인이 로그에 남지 않음 | `src/lib/server/http.ts:33-39` | 작음 (정책 결정 필요) | 확인됨 |
| F5 | 고치면 좋음 · 정책 | Q&A에서 교사가 부적절한 글을 지울 수 없음 | `src/lib/server/community.ts:134` | 작음 (정책 결정 필요) | 확인됨 |
| F6 | 고치면 좋음 · 군살 | 프로그래밍 프로토타입이 정식 수업의 두 번째 사본임(약 1,144줄) | `src/components/prototype/` 외 | 중간 (삭제 위주) | 확인됨 |
| F7 | 고치면 좋음 · 문서 | AGENTS.md의 폴더 규칙이 실제 구조와 다름 | `AGENTS.md:25` | 작음 | 확인됨 |

**지금 당장 할 1개:** F1과 F2를 묶어 로그인 함수 하나(`src/lib/server/auth.ts:101-126`)를 고치는 작은 PR입니다. 같은 함수이고 검사 파일도 같아서(`tests/auth-security.spec.ts`) 한 번에 끝납니다. 모든 학생이 지나는 입구라 효과가 가장 큽니다. HANDOFF의 다음 작업 3번인 "실제 학교 PC 첫 수업 확인" 전에 하는 것이 좋습니다.

**줄일 수 있는 양:** 약 1,140줄(F6). 지울 수 있는 의존성은 없습니다(근거는 §7.13).

---

## 2. 점검 범위와 방법

### 2.1 읽은 문서

- `AGENTS.md`: 작업 지침과 금지 사항
- `docs/HANDOFF.md`: 현재 상태와 다음 작업. 진행 중인 작업은 없음
- `README.md`: 제품 개요, 규모(11개 반 × 최대 27명 = 최대 297명), 아키텍처 원칙
- `docs/PRD.md`: §역할 표(60~61줄), §4.2 프로토타입(163줄), §Q&A 삭제 정책(212줄)
- `docs/DEVELOPMENT.md`: AI 사용량 제한 설명(224줄)
- `docs/FIREBASE_SETUP.md`: Firestore 지역(서울), TTL, 로그인 제한 컬렉션 정리 계획(154줄)

### 2.2 읽은 코드

| 영역 | 파일 |
|---|---|
| API 입구 | `src/app/api/classroom/[...path]/route.ts`, `src/app/api/auth/[action]/route.ts`, `src/app/api/cron/timetable/route.ts`, `src/app/api/teacher-preview/[id]/evaluate/route.ts` |
| 서버 공통 | `src/lib/server/http.ts`, `firebase.ts`, `errors.ts`, `guest-mode.ts`, `failure-log.ts`, `temporary-password.mjs` |
| 인증 | `src/lib/server/auth.ts` (전체) |
| 학생 작업·교사 | `src/lib/server/classroom.ts` (전체), `src/lib/server/learning.ts` (스키마와 `applyAction`) |
| 커뮤니티·손들기·일정 | `src/lib/server/community.ts`, `help.ts`, `planner.ts`, `timetable.ts` (전체) |
| AI | `src/lib/server/review-ai.ts` (입력 검사와 사용량 트랜잭션, 109~160줄), `src/lib/classroom/review/ai-protocol.mjs` (`quotaWindow`) |
| 클라이언트 저장 | `src/components/student/use-work.ts` (전체), `work-recovery.ts`, `lesson-workspace.tsx`, `lesson-editor.tsx` (충돌 화면, 131~145줄), `src/components/teacher/use-preview-work.ts`, `src/lib/classroom/client.ts` |
| 세션 | `src/components/session-provider.tsx` (활동 갱신 부분) |
| 엔트리 | `src/components/student/entry-practice-workspace.tsx`(일부), `src/components/prototype/programming/name-practice.tsx`(일부) |
| 설정·배포 | `firestore.rules`, `firebase.json`, `vercel.json`, `firestore.indexes.json`, `package.json`, `components.json`, `.github/workflows/verify.yml`, `scripts/ci-policy.mjs`(ignore-build 부분), `playwright.config.ts`, `playwright.logic.config.ts` |
| 검사 | `tests/` 목록 전체와 줄 수. 다음 파일은 상태 코드 검사 부분을 읽음: `tests/classroom-api.spec.ts`, `auth-security.spec.ts`, `community.spec.ts`, `teacher-review-workflow.spec.ts`, `server-failure-logging.spec.ts` |

### 2.3 실행한 명령

모두 읽기 전용입니다.

- `git status`, `git log`, `git ls-files`: 상태와 파일 목록
- `wc -l`: 파일 크기
- `git grep` / `grep`: 호출처, 미사용 코드, 의존성 사용처, 오류 코드를 검사가 확인하는지, 비밀정보 패턴(값은 출력하지 않고 파일 이름만 확인)
- `node_modules/cn/package.json` 읽기: `cn` 패키지가 무엇인지 확인

### 2.4 가정한 사용량과 근거

한 번에 **한 반 27명**이 동시에 로그인하고 저장하며, 전체 계정은 **약 297개**라고 가정했습니다.

- `README.md` §1: "11개 반, 반별 최대 27명(전체 최대 297명 동시 접속 한도)"
- `tests/auth-security.spec.ts:78`: "같은 학교 출처의 27명 동시 입장이 모두 성공"이라는 검사가 이미 있음

### 2.5 발견으로 채택한 기준

- "이 입력이나 상황에서 이런 잘못된 결과가 난다"는 구체적인 사례가 있을 때만 발견으로 적었습니다.
- "안 쓰인다"고 판단하기 전에 `src`, `tests`, `scripts`, 설정 파일 전체를 검색했습니다.
- 코딩 스타일 취향, "고려해 보세요" 같은 막연한 걱정은 발견에서 뺐습니다.
- 고치는 방법은 가장 작은 변경을 제안했고, 지우는 쪽을 먼저 봤습니다.

---

## 3. 저장소 개요 (점검의 전제)

### 3.1 데이터 흐름

```
브라우저 (React 화면)
  └─ src/lib/classroom/client.ts  api()
       · 모든 요청에 X-CS-Class: 1 헤더와 X-CS-User(로그인한 uid) 헤더를 붙임
       ▼
Next.js API (Vercel 서울 icn1)
  ├─ /api/auth/[action]        → src/lib/server/auth.ts
  ├─ /api/classroom/[...path]  → classroom.ts · community.ts · help.ts · planner.ts · review-ai.ts
  ├─ /api/teacher-preview/...  → teacher-preview.ts (교사 체험, DB에 저장하지 않음)
  └─ /api/cron/timetable       → timetable.ts (매일 10:00 UTC = 19:00 KST)
       ▼
firebase-admin SDK (서버 전용 관리자 권한)
       ▼
Firestore (서울). Rules는 모든 직접 접근 거부
```

### 3.2 인증 방식

- **학생과 강사:** 서버가 Firebase에 비밀번호를 확인한 뒤 자체 세션을 엽니다(`auth.ts:101-126`). 세션 쿠키는 `uid.secret` 형태이고, DB에는 secret의 SHA-256 해시만 저장합니다(`auth.ts:85`).
- **교사:** Google 로그인입니다. 허용된 이메일 목록(`CS_TEACHER_EMAILS`)과 로그인 후 5분 안인지를 확인하고, 같은 로그인 정보의 재사용을 막습니다(`auth.ts:127-146`).
- **모든 API 요청:** `authorized()`(`auth.ts:45-52`)가 트랜잭션(여러 읽기·쓰기를 한 덩어리로 처리해 중간 상태가 안 생기게 하는 방식) 안에서 계정과 세션을 검증합니다.

### 3.3 저장 방식

학생이 저장 버튼이나 Ctrl+S를 누를 때만 `POST /api/classroom/work/{lessonId}`가 나갑니다. 요청에는 revision이 함께 갑니다. revision은 저장할 때마다 1씩 오르는 번호로, 두 곳에서 동시에 저장한 것을 알아내는 데 씁니다. 서버의 revision과 다르면 409(서버가 "기록이 서로 달라 저장하지 않았다"고 답하는 응답)가 납니다.

### 3.4 배포 게이트

`main`에 push되면 GitHub `app` 검사가 돌고, 이 검사가 성공해야 Vercel 운영에 반영됩니다(HANDOFF "배포 게이트"). 문서만 바뀐 커밋은 Vercel 빌드를 건너뜁니다(`vercel.json` `ignoreCommand`).

---

## 4. 요청받은 점검 항목별 결과

### 4.1 폴더·컴포넌트 구조 (student / home / ui 분리)

**판단:** 실제 구조는 기능별로 잘 나뉘어 있습니다. 다만 AGENTS.md의 규칙 문장이 실제 구조를 반영하지 못합니다(→ **F7**).

**근거:**
- 실제 폴더별 파일 수(`git ls-files src/components`): `student/` 27, `student/review/` 23, `home/` 13, `teacher/` 13, `ui/` 12, `dashboard/` 6, `prototype/programming/` 6, `classroom/` 3, `community/` 2, `explore/` 2, `settings/` 2
- `src/components/` 바로 아래에 파일 13개가 있습니다. 컴포넌트 8개(`app-shell.tsx`, `classroom.tsx`, `dashboard-art.tsx`, `login-screen.tsx`, `navigation-provider.tsx`, `session-access.tsx`, `session-provider.tsx`, `visuals.tsx`)와 CSS 5개입니다.
- 미사용 파일 검사: `src/components`와 `src/lib`의 파일마다 다른 곳에서 import하는지 검색했습니다. 걸린 것은 `src/lib/utils.ts` 하나인데, `components.json`의 `"utils": "@/lib/utils"` 설정이 shadcn 생성 도구에 쓰이므로 지우면 안 됩니다(§6.3).

### 4.2 학생 작업 저장 흐름(`useWork`)의 일관성

**판단:** 일관됩니다. 저장 API를 부르는 곳은 `useWork` 하나뿐이고, 자동 저장 타이머는 없습니다. 다만 교사 결정과 학생 저장이 만나는 경로에 결함이 하나 있습니다(→ **F3**).

**근거:**
- `saveWork`, `classroomApi.act`, `classroomApi.ai`를 부르는 곳은 모두 `src/components/student/use-work.ts`입니다(111, 153, 206, 238줄). `/api/classroom/work`를 직접 부르는 다른 화면은 없습니다(`grep useWork\(|saveWork|classroomApi\.(act|ai)`).
- `useWork(`를 쓰는 곳은 `src/components/student/lesson-workspace.tsx:53` 하나입니다.
- 교사 미리보기는 `src/components/teacher/use-preview-work.ts`가 같은 `WorkController` 모양(`work-controller.ts`)을 메모리로만 구현합니다. 저장 API를 부르지 않고 평가만 `previewEvaluate`로 요청합니다.
- 자동 저장 타이머 검사: `setTimeout`과 `setInterval`이 쓰인 곳을 모두 확인했습니다. 학생 수업 쪽은 애니메이션(`concepts.tsx:77,160`, `flowchart-concepts.tsx:80`, `sandwich.tsx:41`, `flow-execution.tsx:29`), 엔트리 응답 대기(`entry-practice-workspace.tsx:85` 4초, `:102` 20초), 수업 안내 갱신(`lesson-workspace.tsx:35`, 작품이 아니라 반 설정을 읽음)뿐입니다. 저장을 부르는 타이머는 없습니다. `debounce`는 검색 결과가 0건입니다.
- 저장 안전장치도 확인했습니다.
  - 같은 내용을 다시 보내면 서버가 쓰지 않고 이전 결과를 돌려줍니다(`classroom.ts:76`).
  - revision이 다르면 409를 냅니다(`classroom.ts:82`).
  - 화면을 떠날 때 3가지를 고르게 합니다(`register` → `navigation-provider`).
  - 결과가 불확실한 요청은 확인할 때까지 막습니다(`use-work.ts:161-164`, `work-recovery.ts`).
  - 미저장 초안은 메모리에만 두고, 로그아웃할 때 지웁니다(`use-work.ts:13-19`).

### 4.3 Firestore Rules와 클라이언트 권한 경계

**판단:** 경계 설계가 올바르고 검사도 됩니다. 브라우저는 DB에 직접 닿지 못하고, 모든 권한 검사는 서버 코드에 있습니다.

**근거:**
- `firestore.rules` 전체가 `match /{document=**} { allow read, write: if false; }`입니다. 직접 접근은 모두 거부됩니다.
- `tests/classroom-api.spec.ts:138-139`: 로그인한 학생의 토큰으로 Firestore REST에 직접 읽기·쓰기를 시도하면 403이 나는지 검사합니다.
- 서버 권한 검사의 예:
  - 학생은 자기 반만: `studentClass()` (`classroom.ts:24-29`), `community.ts:29`
  - 교사는 담당 반만: `classroom.ts:100`, `:126`, `:135`, `:153`, `help.ts:22,63,65`, `planner.ts:48`
  - 학생 비밀번호 초기화는 담당 반만: `auth.ts:254`
- 요청 위조 방지(CSRF: 다른 사이트가 사용자 몰래 요청을 보내는 공격): `http.ts:9`는 `X-CS-Class: 1` 헤더를 요구하고, `:16`은 Origin이 같은 사이트인지 확인합니다. 쿠키는 `sameSite: "strict"`, `httpOnly`입니다(`auth.ts:58`).
- 요청 크기 제한: 기본 32KB, 프로그래밍·복습 저장 192KB, 교사 체험 1MB(`route.ts:39`, `http.ts:24`).
- 이 경계를 확인하는 검사:
  - 다른 반이나 담당 밖 접근 403: `classroom-api.spec.ts:69,70,96,97`, `community.spec.ts:90-92,121-122`
  - 다른 사이트 Origin 403: `classroom-api.spec.ts:127`
  - 헤더 없음 403: `:128`
  - 크기 초과 413: `:129`
  - 다른 계정으로 보내기 401: `:48`
- 남은 구멍은 권한 경계 자체가 아니라 로그인 시도 제한입니다(→ **F1**).

### 4.4 테스트가 없는 위험 코드

**판단:** 검사가 많은 편입니다. 검사 코드가 약 16,000줄이고, 대상 코드는 CSS와 글꼴을 빼면 약 13,000줄입니다. 검사가 비어 있는 위험 경로는 두 개입니다.

**근거:**
- **한 계정에 서로 다른 비밀번호를 여러 번 넣는 경우:** `auth-security.spec.ts:57-58`은 같은 틀린 비밀번호를 12번 넣으면 429가 나는지만 검사합니다(→ **F1**).
- **교사 승인이나 수정 요청 뒤, 화면을 열어 둔 학생이 저장하는 경우:** `teacher-review-workflow.spec.ts`는 교사 쪽 결과와 DB 상태만 확인합니다(282~285줄). 학생 화면의 다음 저장은 검사하지 않습니다(→ **F3**).
- Firebase가 5xx를 돌려줄 때 로그인 응답을 확인하는 검사도 없습니다(→ **F2**).

### 4.5 합치거나 지울 수 있는 중복

**판단:** 큰 중복은 하나(F6, 약 1,144줄), 작은 중복은 하나(§6.2)입니다.

---

## 5. 발견 상세

### F1. 로그인 시도 제한을 비밀번호마다 따로 셈 · 비밀번호의 해시가 DB 문서 이름으로 남음

- **분류:** 꼭 고칠 것 · 보안
- **위치:** `src/lib/server/auth.ts:105-107`, `:22`, `:60-78`
- **확신도:** 코드 동작은 확인됨. Firebase 자체 차단 동작은 추정

**무엇이 문제인가**

```ts
// auth.ts:105-107
await limitLogin(`source:${source}`, 600, 60_000);                          // 출처(IP)당 1분에 600번
await limitLogin(`credential:${uid}:${hash(password)}`, 12, 15 * 60_000);   // (계정, 비밀번호) 한 쌍당 15분에 12번
```

1. 두 번째 제한의 이름에 비밀번호가 들어갑니다. 그래서 같은 계정이라도 **비밀번호가 다르면 제한도 새로 시작**합니다. 계정 하나 전체를 묶는 상한은 없고, 남는 것은 IP당 1분에 600번 제한뿐입니다. 106줄 주석("타인의 오답은 정상 비밀번호의 예산을 소모하지 않습니다")을 보면, 남이 일부러 틀려서 진짜 학생을 잠그는 일을 막으려는 의도적인 설계입니다.
2. `limitLogin`은 `csRateLimits/{hash(key)}` 문서를 만듭니다(`auth.ts:62`). 여기서 `hash`는 소금 없는 SHA-256입니다(`auth.ts:22`). 문서 이름은 `sha256("credential:student-2xxxx:" + sha256(비밀번호))`가 되고, 성공한 로그인도 포함해 시도할 때마다 생깁니다. 이 컬렉션은 자동으로 지워지지 않습니다. `docs/FIREBASE_SETUP.md:154`에 "후속 운영에서 보관 기간·정리 작업을 마련합니다"라고 적혀 있고, `firestore.indexes.json`의 TTL은 AI 컬렉션 두 개에만 있습니다.

**구체 사례**

- 스크립트를 쓸 줄 아는 학생이 집에서 친구 학번 `20101`에 `minsu1234`, `minsu12345`, … 처럼 서로 다른 비밀번호를 보냅니다. 서버 제한에는 1분에 600번까지 걸리지 않습니다.
- 학생 비밀번호 규칙은 "영문과 숫자를 섞어 8자 이상"이고 금지 목록은 6개뿐입니다(`auth.ts:169-170`). 그래서 이름+숫자 같은 약한 비밀번호가 많을 수 있습니다.
- DB 백업이나 서비스 계정 키가 새면, 공격자는 학번 약 300개 × 흔한 비밀번호 사전으로 위 문서 이름을 다시 계산해 맞춰 볼 수 있습니다. SHA-256은 계산이 빨라서 이런 추측이 쉽습니다.

**고치지 않으면**
- 학생 계정을 남이 차지하면 그 학생 이름으로 작품을 바꾸거나 Q&A에 글을 쓸 수 있습니다.
- Firebase가 자체적으로 계정을 막아 줄 수도 있습니다(추정). 그러면 이번에는 진짜 학생이 로그인하지 못하고, F2 때문에 "비밀번호 틀림"이라는 안내만 봅니다.

**가장 작은 수정**
- 107줄의 키를 `account:${uid}`로 바꿉니다(예: 15분에 60번). 계정 단위 상한이 생기고 비밀번호에서 나온 문서 이름도 더 생기지 않으니 두 문제가 함께 풀립니다.
- **대가:** 누가 일부러 60번 틀리면 그 학생은 15분 동안 잠깁니다. 손으로 60번 입력하기는 번거롭지만, 스크립트로는 가능합니다.
- **다른 방법:** 실패한 시도만 세도록 바꿉니다. 로그인이 성공한 뒤에는 기록하지 않는 구조라 조금 더 큽니다.
- 이미 쌓인 `csRateLimits` 문서를 지우는 것은 운영 DB 작업이므로 별도 승인이 필요합니다. 이 문서들은 횟수만 세므로 지워도 기능에는 영향이 없습니다.

**작업 크기:** 작음. 코드 1~2줄과 `tests/auth-security.spec.ts`에 "한 계정에 서로 다른 비밀번호 N번 → 429" 검사 1개를 더합니다.

**결정 필요:** 계정당 허용 횟수와 시간 창(예: 15분 60번)을 정해야 합니다.

---

### F2. Firebase 장애나 차단이 학생에게 "비밀번호 틀림"으로 보임

- **분류:** 꼭 고칠 것 · 버그 (같은 규칙이 두 곳에서 다르게 적용됨)
- **위치:** `src/lib/server/auth.ts:121`. 비교 대상은 `auth.ts:230-231`
- **확신도:** 확인됨

**무엇이 문제인가**

```ts
// 로그인 (auth.ts:121): ok가 아니면 이유와 관계없이 '비밀번호 확인' 안내
requireCondition(response.ok, 401, "INVALID_LOGIN", "학번 또는 비밀번호를 확인해 주세요.");

// 비밀번호 변경 (auth.ts:230-231): 서버 고장(5xx)을 따로 구분함
requireCondition(response.status < 500, 503, "PASSWORD_VERIFY", "현재 비밀번호를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
requireCondition(response.ok, 403, "CURRENT_PASSWORD", "현재 비밀번호를 확인해 주세요.");
```

같은 Firebase 호출(`signInWithPassword`)인데, 비밀번호 변경은 고장과 오답을 구분하고 로그인은 구분하지 않습니다. 또 401은 로그에서 `unauthenticated`로 분류됩니다(`failure-log.ts:failureCategory`). 그래서 장애였다는 사실이 로그에도 남지 않습니다.

**구체 사례**
- 첫 실제 수업 중에 Firebase Auth가 잠깐 5xx를 냅니다. 그러면 올바른 비밀번호를 넣은 27명 모두 "학번 또는 비밀번호를 확인해 주세요"를 봅니다.
- Firebase가 "시도 너무 많음"(`TOO_MANY_ATTEMPTS_TRY_LATER`)으로 계정을 막을 때도 같습니다. 이 응답은 HTTP 400입니다. 이것은 Firebase 공개 동작에 대한 일반 지식이고, 이 저장소에서 확인하지는 않았습니다.

**고치지 않으면**
- 교사는 비밀번호 문제로 오해하고 학생 비밀번호를 하나씩 초기화합니다(`resetStudentPassword`).
- 학생은 같은 비밀번호를 12번 넘게 다시 넣다가 429를 받습니다.

**가장 작은 수정**
- 121줄 앞에 230줄과 같은 한 줄 `requireCondition(response.status < 500, 503, …)`을 넣습니다.
- 원하면 Firebase 응답 본문의 `TOO_MANY_ATTEMPTS_TRY_LATER`를 읽어 429로 바꾸는 줄을 하나 더할 수 있습니다.

**작업 크기:** 작음. 1~2줄과 검사 1개입니다. 검사는 에뮬레이터에서 5xx를 재현하기 어려우므로 `fetch`를 대신하는 단위 검사로 하는 것이 쉽습니다.

---

### F3. 교사가 확인 요청을 처리하면 학생 화면에 "다른 탭" 충돌이 뜸

- **분류:** 꼭 고칠 것 · 저장 흐름 (입력이 사라질 수 있음, 검사 없음)
- **위치:** `src/lib/server/classroom.ts:146`(교사 결정), `:82`(학생 저장의 revision 검사)
- **확신도:** 문제 경로는 확인됨. 고치는 방법은 재현 검사로 확인해야 함

**무엇이 문제인가**

1. 복습 수업(추상화·샌드위치·순서도. `isReviewType`, `src/lib/classroom/review/project.ts:22`)에서 학생은 "선생님 확인 요청"(`request-review`, `learning.ts:88-91`)을 보낼 수 있습니다. 요청을 보낸 뒤에도 계속 고칠 수 있습니다. `teacher-review-workflow.spec.ts:285`의 "요청 후 수정 중인 목표"가 이 상황입니다.
2. 교사가 승인이나 수정 요청을 누르면 `decideReview`가 학생 작품의 revision을 1 올립니다.
   ```ts
   // classroom.ts:146
   work.revision++; work.updatedAt = Date.now(); tx.set(ref, { ...work, uid, classId: student.classId }); return work;
   ```
3. 화면을 열어 둔 학생의 브라우저는 예전 revision을 기억합니다. 학생 화면은 작품을 주기적으로 다시 읽지 않습니다. `lesson-workspace.tsx:27-35`의 30초 갱신은 반 설정(`studentClassroom`)만 읽습니다. 그래서 학생의 다음 저장은 여기서 409가 됩니다.
   ```ts
   // classroom.ts:82
   requireCondition(previous.revision === (save?.revision ?? act?.revision), 409, "REVISION_CONFLICT", "다른 탭에서 작업이 바뀌었어요. 현재 내용을 보관한 뒤 최신 기록을 확인해 주세요.");
   ```
4. 화면에는 "저장 기록이 서로 달라요"가 뜨고, 비교한 뒤 둘 중 하나를 고르게 합니다. "현재 입력을 새 버전으로 저장"과 "서버 기록으로 이어하기"입니다(`lesson-editor.tsx:131,145`). 뒤의 것을 고르면 학생 화면의 입력이 서버 기록으로 바뀝니다(`use-work.ts:272`).

**구체 사례**
- 학생이 순서도 자유 미션에서 확인 요청을 보내고 계속 고칩니다. 그 사이 교사가 "수정 요청"을 보냅니다. 학생이 저장을 누르면 탭을 연 적이 없는데도 "다른 탭에서 작업이 바뀌었어요"가 뜹니다.
- 학생이 "서버 기록으로 이어하기"를 고르면, 요청 뒤에 고친 내용이 사라집니다.

**고치지 않으면**
- 교사의 피드백이 학생에게 엉뚱한 충돌 안내로 먼저 도착합니다. 학생이 잘못 고르면 작업 일부가 사라집니다.
- 이 경로를 확인하는 검사가 없어서, 나중에 바뀌어도 알아차리지 못합니다.

**가장 작은 수정과 근거**
- 146줄에서 `work.revision++`를 빼는 방법이 가장 작습니다. 교사의 결정은 학생 초안(`draft`)을 바꾸지 않고, revision은 초안끼리 충돌하는지 감지하는 용도이기 때문입니다.
- 이렇게 해도 교사의 결정이 지워지지 않는 근거: 학생 저장(`mutateWork`)은 트랜잭션 안에서 최신 문서를 다시 읽고(`classroom.ts:63`), 그 위에 초안만 바꿔 씁니다(`classroom.ts:85`의 `{ ...previous, draft: … }`). 그 응답에는 교사의 결정이 들어 있고, 학생 화면이 그것을 받아 반영합니다(`use-work.ts:62-69` `adopt`).
- 함께 확인할 곳:
  - `src/components/student/work-recovery.ts`의 `hasActionResult`: revision이 1을 넘게 차이 나면 결과를 확인하지 못함. revision을 안 올리면 오히려 이 문제가 줄어듦
  - `src/components/student/review/flowchart.tsx:52-62`: 검증 실행 중 revision 비교
  - `tests/teacher-review-workflow.spec.ts`
- **순서:** 먼저 "교사 결정 → 열린 학생 화면에서 저장"을 재현하는 E2E 1개를 만들고, 실패하는 것을 확인한 뒤 고칩니다.

**작업 크기:** 작음~중간. 코드 1줄과 E2E 1개, 그리고 위 확인 지점 검토입니다.

---

### F4. 예상하지 못한 서버 오류는 원인이 로그에 남지 않음

- **분류:** 고치면 좋음 · 운영 (의도된 개인정보 보호 결정과 충돌하므로 결정 필요)
- **위치:** `src/lib/server/http.ts:33-39`, `src/lib/server/failure-log.ts`(`createFailureRecord`), `tests/server-failure-logging.spec.ts:13,64`
- **확신도:** 확인됨

**무엇이 문제인가**

```ts
// http.ts:35-39 (요약)
const status = service ? error.status : invalid ? 400 : 503;
// 예상하지 못한 오류 → 503, { code: "UNAVAILABLE", message: "서버에서 처리하지 못했어요…" }
return failureResponse(value, status, context, … "unexpected");
```

로그에 남는 것은 `requestId`, `operation`, `category`, `status`, `timestamp` 다섯 가지뿐입니다. 오류의 종류 이름이나 오류 코드는 남지 않습니다. 검사가 이 다섯 개 키를 그대로 고정합니다.

```ts
// tests/server-failure-logging.spec.ts:13
expect(Object.keys(record).sort()).toEqual(["category", "operation", "requestId", "status", "timestamp"]);
```

`failure-log.ts`의 주석("the response body never enters the log")과 검사에 쓰인 감시값(`sentinel`)을 보면, 개인정보가 로그에 새지 않게 하려는 **의도된 설계**입니다.

**구체 사례:** 첫 수업 중 일부 학생의 저장이 "서버에서 처리하지 못했어요"로 실패해도, Vercel 로그에는 `{"operation":"classroom.work.save","category":"unexpected","status":503,…}`만 남습니다. Firestore 일시 장애(`ABORTED`, `UNAVAILABLE`)인지, 코드의 `TypeError`인지, 환경변수 문제(`FIREBASE_NOT_CONFIGURED`, `firebase.ts:8`)인지 구분할 수 없습니다.

**고치지 않으면:** 혼자 운영하는 개발자가 장애 원인을 찾으려면 같은 상황을 다시 만들어야 합니다.

**가장 작은 수정:** 예상하지 못한 오류일 때만 `errorName`(예: `TypeError`)과 `errorCode`(Firestore 오류 코드 숫자나 `ABORTED` 같은 이름) 두 항목을 더합니다. 오류 메시지, 원인, 요청 내용은 계속 빼므로 개인정보 원칙도 지킵니다. 검사의 고정 키 목록도 함께 바꿔야 합니다.

**작업 크기:** 작음(약 5줄과 검사 수정).

**결정 필요:** 로그에 오류 종류 이름과 코드를 남겨도 되는지 정해야 합니다.

---

### F5. Q&A에서 교사가 부적절한 글을 지울 수 없음

- **분류:** 고치면 좋음 · 정책 확인 필요
- **위치:** `src/lib/server/community.ts:134`, `docs/PRD.md:212`, `docs/PRD.md:60-61`
- **확신도:** 확인됨

**무엇이 문제인가**

```ts
// community.ts:134 (deleteQuestion)
requireCondition(question.author.uid === account.uid, 403, "FORBIDDEN", "본인이 작성한 질문만 삭제할 수 있어요.");
```

- `docs/PRD.md:212`에 "교사라 하더라도 타인의 질문을 임의 삭제할 수 없습니다"라고 **의도된 정책**으로 적혀 있습니다. 검사도 교사의 삭제가 403인지 확인합니다(`tests/community.spec.ts:361-363`).
- 그런데 `docs/PRD.md:60-61`의 역할 표에는 선생님과 강사 모두 "학급 일정/Q&A 관리"라고 적혀 있습니다. 교사가 할 수 있는 것은 해결 표시를 바꾸는 것뿐입니다(`community.ts:121`).

**구체 사례:** 학생이 반 게시판에 친구를 놀리는 질문을 올리면, 그 학생이 지우기 전까지 앱 안에서는 지울 방법이 없습니다.

**고치지 않으면:** 교사가 Firebase 콘솔에서 운영 DB를 직접 고쳐야 합니다. 실수하면 다른 데이터까지 잃을 수 있고, 학교 안전 문제를 앱 안에서 처리하지 못합니다.

**가장 작은 수정:** 134줄 조건에 "담당 반 교사"를 더합니다. `storedQuestion()`(`community.ts:41-46`)이 이미 담당 반인지 확인하므로 조건 한 줄이면 됩니다. 검사 `community.spec.ts:363`의 기대값과 PRD 212줄도 고칩니다. 삭제 대신 "숨기기"를 원하면 범위가 커집니다(필드 추가, 목록 필터).

**작업 크기:** 작음(코드 1줄, 검사 1줄, 문서).

**결정 필요:** 교사에게 삭제를 허용할지, 숨기기만 허용할지, 지금 정책을 그대로 둘지 정해야 합니다.

---

### F6. 프로그래밍 프로토타입은 정식 수업의 두 번째 사본

- **분류:** 고치면 좋음 · 군살 (지우는 쪽)
- **위치와 크기(`wc -l`):**
  - `src/components/prototype/programming/` 6개 파일, 681줄
  - `src/lib/prototype/programming.ts` 135줄
  - `src/app/prototype/programming/page.tsx` 8줄
  - `tests/programming-prototype.spec.ts` 320줄
  - 합계 **1,144줄**
- **확신도:** 확인됨

**무엇이 문제인가**
- `docs/PRD.md:163`에 따르면 `/prototype/programming`은 "수업 흐름을 사전 검토할 수 있는 프로토타입"이고, 답안을 `sessionStorage`(브라우저 탭을 닫으면 사라지는 저장소)에만 둡니다.
- 지금은 정식 수업 `programming-13`(PRD §4.1)과 "교사 실제 수업 미리보기"(`src/components/teacher/lesson-preview.tsx`, `use-preview-work.ts`)가 같은 역할을 합니다.
- 엔트리 작업실과 주고받는 코드가 두 벌입니다. `prototype/programming/name-practice.tsx:31-90`과 `student/entry-practice-workspace.tsx:80-120`이 같은 구조입니다: `postMessage` export 요청, 4초 응답 대기, 20초 부팅 대기, `ready`/`loaded`/`changed`/`exported` 메시지 처리.
- `public/entryjs/workspace.js`에는 프로토타입 전용 메시지(`name-start` 207줄, `name-run` 70줄)도 남아 있습니다. 정식 수업도 이 메시지를 쓰는지는 이 점검에서 확인하지 않았습니다.
- 최근 기능 커밋(#39~#43)은 프로토타입 폴더를 건드리지 않았습니다(`git log -- src/components/prototype …`의 최신 커밋이 `a73c967`).

**구체 사례:** #43처럼 `workspace.js`를 바꿀 때마다 프로토타입도 계속 작동해야 하고, `tests/programming-prototype.spec.ts`를 함께 통과해야 합니다(`scripts/e2e-scope.mjs:64`가 이 검사를 프로그래밍 수업 범위에 묶음). 공개 링크(README 상단 "프로그래밍 프로토타입 체험")로 옛 수업 화면도 계속 보입니다.

**고치지 않으면:** 엔트리 관련 수정마다 두 화면을 맞추고 검사하는 비용이 들고, 학생이나 외부 사람이 옛 화면을 보게 됩니다.

**가장 작은 수정:** 다음을 함께 지웁니다.
- 위 네 경로
- README 링크와 PRD §4.2
- `scripts/e2e-scope.mjs:64` 연결
- `workspace.js`의 `name-start`/`name-run` 처리(정식 수업이 안 쓰는 것을 확인한 뒤에만)
- 다른 곳에서 쓰는 `src/lib/classroom/name-entry.ts`의 `checkNameMission`은 남깁니다(`entry-practice-workspace.tsx:12`).

**작업 크기:** 중간(대부분 삭제와 연결 정리).

**결정 필요:** 공개 페이지라서 지울지는 사용자가 정해야 합니다.

---

### F7. AGENTS.md의 폴더 규칙이 실제 구조와 다름

- **분류:** 고치면 좋음 · 문서
- **위치:** `AGENTS.md:25`
- **확신도:** 확인됨

**무엇이 문제인가**

```
AGENTS.md:25  - 컴포넌트 구조: 기능별 컴포넌트는 `src/components/student/`, `home/`에 두고, 공통 UI는 `ui/`에 배치합니다.
```

실제로는 `teacher/`, `dashboard/`, `community/`, `classroom/`, `settings/`, `explore/`, `prototype/` 폴더와 `src/components/` 바로 아래 파일 13개가 있습니다(§4.1). 이름이 비슷해 헷갈리는 것도 있습니다.
- `components/classroom.tsx`(수업 화면 입구, `src/app/classroom/[id]/page.tsx:3`에서 사용)와 `components/classroom/` 폴더(손들기 부품)
- 이름이 `dashboard.tsx`인 파일 3개: `dashboard/`, `student/`, `teacher/`

**구체 사례:** AGENTS.md만 읽은 새 에이전트가 교사 전용 부품을 `student/`에 넣을 수 있습니다.

**고치지 않으면:** 여러 에이전트와 PC가 같은 저장소를 쓰므로, 구조가 문서와 점점 더 어긋납니다.

**가장 작은 수정:** 25줄을 실제 폴더 목록과 역할로 고칩니다. 파일을 옮기거나 이름을 바꿀 필요는 없습니다.

**작업 크기:** 작음(문서 1~3줄). `node scripts/check-docs.mjs`로 확인합니다.

---

## 6. 작은 항목 (상위 목록에서 뺀 것)

### 6.1 쓰이지 않는 export `abstractionPresets`
- **위치:** `src/lib/classroom/review/abstraction-data.mjs:49`
- **근거:** `git grep abstractionPresets`(archive 제외)의 결과가 정의 한 줄뿐입니다. 이 파일을 import하는 곳은 `TUT_SCENARIOS`(`abstraction.tsx:6`)와 `STEP_PROMPTS`(`review-ai.ts:8`)만 가져갑니다.
- **판단:** 지워도 되지만, 효과가 작아서 상위 목록에서 뺐습니다.

### 6.2 같은 비교 함수 `sameDraft`가 여러 곳에 있음
- **위치:** `src/components/student/use-work.ts:20`과 `src/components/student/work-recovery.ts:6`은 내용이 같습니다(`JSON.stringify` 비교). `src/lib/server/classroom.ts:69`는 서버용으로 필드별로 비교하는 다른 함수입니다.
- **판단:** 클라이언트의 두 개는 하나로 합칠 수 있습니다. 효과가 작아서 뺐습니다.

### 6.3 `src/lib/utils.ts`는 지우면 안 됨 (발견 아님)
- **근거:** 코드에서 import하는 곳은 없습니다(ui 파일들은 `cn` 패키지를 직접 import함). 그러나 `components.json`의 `"utils": "@/lib/utils"` 설정을 shadcn 생성 도구가 씁니다.

---

## 7. 검토했지만 문제로 보지 않은 것 (근거 포함)

| # | 검토 대상 | 판단 | 근거 |
|---|---|---|---|
| 7.1 | 임시 비밀번호의 강도 | 문제 없음 | `temporary-password.mjs:9`: `T` + 9바이트 난수(72비트) + `9`. 30분 동안만 유효(`:12`). Firebase 쪽 비밀번호는 별도의 32바이트 난수(`:14`) |
| 7.2 | 27명이 동시에 로그인할 때 같은 제한 문서를 두고 경합 | 문제로 보지 않음 | 같은 학교 IP가 `csRateLimits` 문서 하나를 공유하지만, 27명 동시 입장 검사가 있음(`auth-security.spec.ts:78-97`). 서버는 서울(`vercel.json` `regions: ["icn1"]`), Firestore도 서울(`FIREBASE_SETUP.md:3,47`). 같은 서버 안에서는 순서대로 처리함(`auth.ts:63-77`). 운영 환경의 여러 서버 인스턴스에서는 실측하지 않음 |
| 7.3 | 세션 쿠키·세션 교체 | 문제 없음 | `httpOnly`, `sameSite: strict`, 운영에서 `secure`(`auth.ts:58`). DB에는 해시만 있고 시간 차이가 안 드러나는 방식으로 비교함(`:39`). 다른 계정으로 바뀌면 `X-CS-User`로 끊음(`:31-32`) |
| 7.4 | 게스트 로그인이 운영에서 열릴 위험 | 문제 없음 | `guest-mode.ts:1-5`: Vercel이 아니고, 프로젝트가 `demo-cs-class`이고, 에뮬레이터 주소가 정확하고, 게스트 비밀번호가 있을 때만 열림 |
| 7.5 | 에뮬레이터와 운영의 혼선 | 문제 없음 | `firebase.ts:9-12`: Vercel에서 에뮬레이터 설정이 있거나, 둘 중 하나만 설정됐거나, 에뮬레이터인데 `demo-` 프로젝트가 아니면 시작하지 않음 |
| 7.6 | Cron 인증 | 문제 없음 | `cron/timetable/route.ts:8-11`: 비밀값 16자 이상, 길이 확인 뒤 시간 차이가 안 드러나는 비교 |
| 7.7 | AI 비용과 남용 | 문제 없음 (참고 사항 있음) | 학생당 1분 15회, 하루 70회(`ai-protocol.mjs:3-8`, `review-ai.ts:152-153`, 트랜잭션 안). 24시간 캐시, `CS_AI_PAUSED` 일시중지 스위치(`review-ai.ts:124`), 45초 시간 제한(`:112`). 학교 전체 상한은 없음. 이론상 최대는 297명 × 70회 = 하루 20,790회 |
| 7.8 | 작품 문서가 Firestore 문서 한도(1MB)를 넘을 위험 | 문제 없음 (추정 계산) | 미션 하나의 정규화 작품은 최대 32KB(`programming-entry.ts:43`). 미션 5개면 초안이 약 160KB이고, 검증본·제출본 복사까지 합쳐도 약 480KB |
| 7.9 | 세션 활동 갱신 횟수 | 문제 없음 | `session-provider.tsx`: 활동이 있을 때 30초 이상 간격으로 1회, 쉬는 중에는 30초마다 조회. 한 반 기준 분당 쓰기 약 54회 |
| 7.10 | 자동 로그아웃 때 메모리 초안 삭제 | 의도된 정책 | README §3.2 "세션 종료 시 메모리 초안을 완전히 소멸". `use-work.ts:13-19` |
| 7.11 | 시간표 갱신 | 문제 없음 | `timetable.ts`: 갱신 담당 표시(90초), 5분 재시도 간격, 응답 1MB 상한, 리다이렉트 금지, 학교 일치 확인 |
| 7.12 | 손들기·커뮤니티 남용 | 문제 없음 | 손들기는 꺼져 있음(`features.ts`, `route.ts:19,38`). 손들기 1분 10회(`help.ts:47-49`), 커뮤니티 쓰기 1분 30회(`community.ts:51-57`), 답변 수 상한(`:107`) |
| 7.13 | 의존성 | 지울 것 없음 | `cn`은 shadcn-ui 공식 패키지(`node_modules/cn/package.json` 저장소 주소 `shadcn-ui/cn`). `shadcn`과 `tw-animate-css`는 `globals.css:2-3`에서 import. `class-variance-authority`는 `button.tsx`. `firebase`(클라이언트)는 Google 로그인. 나머지도 사용처 확인 |
| 7.14 | 비밀정보 노출 | 발견 없음 | 추적 파일(archive, entryjs 제외)에서 Google API 키, `sk-`, `up_`, 개인 키, `"private_key"` 패턴 0건. 값은 출력하지 않았음 |
| 7.15 | CI와 배포 게이트 | 문제 없음 | `verify.yml`: docs 모드에서는 무거운 단계를 건너뛰고, 그 밖에는 lint, typecheck, 단위 검사, build, 선별 E2E를 실행. `vercel.json` `ignoreCommand`로 문서 전용 커밋은 빌드 생략 |
| 7.16 | 로그인 제한 기록이 계속 쌓임 | F1에 포함 | 비용 영향은 작음. 문제는 비밀번호에서 나온 문서 이름이 남는 것 |
| 7.17 | 교사 대시보드 읽기량 | 문제로 보지 않음 | 반 하나(최대 27명)의 작품 문서를 한 번에 읽음(`classroom.ts:110`). 자동 재조회는 없앴고 수동 갱신만 있음(HANDOFF 10/14) |
| 7.18 | 한 줄에 많이 쓴 코드 | 발견에서 제외 (스타일) | 예: `classroom.ts:80`, `review-ai.ts`에 400자가 넘는 줄이 많음. 사람이 읽기 어렵지만 동작 문제는 아니므로 판단 기준(§2.5)에 따라 뺌 |

---

## 8. 확인하지 않은 것과 한계

- **운영 환경:** 실제 Firebase와 Vercel 설정(TTL이 정말 켜져 있는지, Firebase Auth 자체 차단, 환경변수)은 보지 않았습니다. 운영 접근은 금지 범위였습니다.
- **실행:** 테스트, 빌드, 린트, 타입 검사를 하나도 실행하지 않았습니다. 판단은 모두 코드를 읽고 내렸습니다.
- **읽지 않은 범위:** `public/entryjs/`(외부 엔트리 자산과 `workspace.js` 대부분), CSS 파일, `docs/reference/`, `archive/`, `docs/archive/`
- **부분만 읽음:** `review-ai.ts` 프롬프트 세부(26~108줄, 160줄 이후), `sandwich-engine.mjs`, `flow-*.mjs`, 개념 인터랙션 컴포넌트(`student/review/*`), `home/` 화면, `navigation-provider.tsx`, `teacher-preview.ts`, `solutions.ts`, `scripts/` 대부분
- **F3의 수정 방법**은 코드를 읽고 추론한 것입니다. 재현 검사로 먼저 확인해야 합니다.
- **실제 기기:** 휴대폰, 학교 PC, 학교망 동작은 확인하지 않았습니다(HANDOFF에서도 남은 작업임).

---

## 9. 권장 순서와 결정할 것

| 순서 | 작업 | 사용자가 정할 것 |
|---|---|---|
| 1 | F1 + F2: 로그인 함수(`auth.ts:101-126`) 정리, 검사 2개 추가 | 계정당 허용 횟수와 시간 창 |
| 2 | F3: 재현 E2E를 먼저 만들고 `classroom.ts:146` 수정 | 없음 |
| 3 | F7: AGENTS.md 25줄 갱신 | 없음 |
| 4 | F4: 오류 종류 이름과 코드를 로그에 추가 | 로그에 남길 항목 |
| 5 | F5: Q&A 교사 삭제 또는 숨기기 | 정책(삭제, 숨김, 현행 유지) |
| 6 | F6: 프로토타입 삭제 | 공개 페이지를 지울지 |
| (선택) | 운영 `csRateLimits` 문서 정리 | 운영 DB 작업 승인 |

각 작업은 AGENTS.md 규칙을 따릅니다: `codex/` 브랜치, 선별 검증, 전체 E2E는 사전 승인 시에만.

---

## 부록 A. 다음 에이전트를 위한 빠른 참조

- 저장 API를 부르는 곳은 `src/components/student/use-work.ts` 하나뿐입니다. 새 수업도 `useWork`를 씁니다(AGENTS.md).
- 권한 검사의 입구는 `authorized()`(`src/lib/server/auth.ts:45`)입니다. 학생은 `studentClass()`(`classroom.ts:24`), 교사는 `account.classIds.includes(...)`로 확인합니다.
- API 라우팅은 경로 배열로 직접 분기하는 파일 하나(`src/app/api/classroom/[...path]/route.ts`)입니다. 새 엔드포인트는 이 파일에 `operation` 이름(`failure-log.ts`의 목록)과 함께 추가합니다.
- 오류는 `requireCondition(조건, 상태, 코드, 한국어 메시지)`(`errors.ts:5`)로 냅니다. 예상하지 못한 오류는 503이 되고 로그에 원인이 남지 않습니다(F4).
