# 이어갈 작업

갱신: 2026-10-06(Asia/Seoul). **사용자 요청으로 여기서 작업을 마감합니다. 작업 브랜치는 `codex/student-learning-readability`, 최신 앱 소스·검사는 `603b8ee`입니다. 이 문서를 포함한 마감 커밋을 같은 이름의 origin 브랜치에 보존하고 미커밋 없이 인계합니다.** 1~7차와 사용 피드백, 수업 전용 틀, 7개 수업의 공통 개념 배치를 구현했습니다. 실제200% 확대·OS 한글 입력기 확인은 남았고8~12차는 미착수입니다. 새 기능·main 병합·운영 배포를 자동 시작하지 않습니다.

제품 정책은 [PRD](PRD.md), 시각·조작 기준은 [DESIGN](DESIGN.md), 실행 절차는 [DEVELOPMENT](DEVELOPMENT.md), 서버 대상은 [FIREBASE_SETUP](FIREBASE_SETUP.md)을 따릅니다. 단계별 검사·리뷰·배포 상세는 [마감 전 원문](archive/cs-class/2026-10-06-student-learning-close/HANDOFF.md)과 [보존 해시](archive/cs-class/2026-10-06-student-learning-close/manifest.json)에 남겼습니다. 보관본의 당시 미완료·로컬 전용 표현은 최신 상태가 아닙니다.

## 현재 작업 상태

| 항목 | 인계 상태 |
| --- | --- |
| Git·원격 | `origin=https://github.com/DonghyunT/cs-class.git`. 이 마감 커밋까지 `origin/codex/student-learning-readability`에서 이어갑니다. 최초 계획 브랜치 `codex/session-handoff-20261005`나 main만 받으면 최신 UI가 없습니다. 최종 tip은 `git log -1 --oneline`으로 확인합니다. |
| main과의 관계 | 10/6 마감 때 fetch하여 `main=origin/main=b8806a5`를 확인했습니다. 앱 기준 `603b8ee`에서 main 쪽1개/작업 쪽8개 커밋이 분기합니다(마감 문서 커밋 제외). main 쪽1개는 과거 세션 문서 정리입니다. 자동 병합·reset하지 않았으며 향후 PR에서 문서 차이를 대조합니다. |
| 구현·검토 | 최초1~7차=`1757414`, 큰 조리대·대화=`a178ba5`, 조작/배치 피드백=`7600b82`, 수업 전용 틀=`fe10311`, 공통 개념 배치=`603b8ee`. 선생님 직접 체험 피드백은 반영·재검증했고 ‘많이 나아졌다’는 확인을 받았습니다. 새 공통 개념 화면은 후속 검토할 수 있습니다. |
| 로컬 실행 | 마감 때 localhost:3000 앱·Auth9099·Firestore8080 실행을 확인하고 유지했습니다. 앱은 `603b8ee`의 프로덕션 빌드(`CI=1`, `next start`), projectId=`demo-cs-class`, emulatorHost=`127.0.0.1:9099`입니다. PID·포트는 다음 실행에서 다시 확인합니다. |
| AI·운영 경계 | 로컬은 `CS_AI_FIXTURE=1`의 합성 응답입니다. 실제 Solar 호출·품질·비용 검증이 아닙니다. 이번 UI 작업과 마감에서 운영 DB·실학생 자료 변경·main 병합·운영 배포를 하지 않았습니다. 원격 브랜치 보존을 Production 반영으로 세지 않습니다. |

## 학생 학습 화면 개선 계획 재개

[12회차 계획](reference/student-learning-readability-plan.md)은 원래 명세·회차 경계를, [수업 전용 틀 계획](reference/student-lesson-shell-plan.md)은 추가 설계·적용 판단을 맡습니다. 계획의 체크박스를 전체 완료 선언으로 사용하지 말고 아래 구현·검증 경계를 먼저 읽습니다.

- **학생에게 읽기 편한 흐름:** 한 개념/한 문항을 크게 보여주되 자유 이동합니다. 개념 선택·확인 답안·완료를 구분하고, 재접속은 첫 미완료 개념/첫 미답변 또는 첫 오답에서 시작합니다. 체험 초기화는 답안·완료를 지우지 않습니다. 자동 단계 이동을 강요하지 않습니다.
- **실습과 대화:** 실제 샌드위치 조리대 도형을 크게 했습니다. 오른쪽은 시간순 대화와 아래 입력, 실행 기록은 두 열 전체 폭입니다. Enter 전송·Shift+Enter 줄바꿈, 조합 확인 Enter 제외(`isComposing`·229)입니다. 평소 실행은 하나이고 실패 때만 ‘AI 없이 실행’을 제공합니다. 새 레시피는 대화창 근처, 재실행/되돌리기는 접힌 기록 도구, 체험 초기화는 체험 근처에 둡니다.
- **폭은 학생이 선택:** 실습 진입·새로고침은 기본 폭입니다. ‘작업실 넓게 보기’로 확장하고 같은 수업의 단계 왕복/미션 변경에서는 수동 선택을 유지합니다. 같은 편집기·Entry iframe·작품을 유지합니다. 이전 자동 확대 계획보다 선생님의 후속 선택을 우선합니다.
- **수업 전용 틀:** 학생 `/classroom/[id]`는 대시보드 사이드바 없이 수업 나가기·제목·저장 상태·학생 메뉴·개념/퀴즈/실습 탐색을 사용합니다. 대시보드/열린 수업/교사 화면은 기존 AppShell입니다. `from=dashboard|lessons`만 복귀 경로로 쓰며 직접/알 수 없는 출처는 열린 수업으로 돌아갑니다. 상단 고정은821px 이상 폭·801px 이상 높이, 낮고 좁은 창에서는 일반 흐름입니다.
- **모든 수업의 공통 개념 배치:** 현재 catalog7개(기존 일반3개·프로그래밍13·복습3개)를 같은 구조로 맞췄습니다. 최대1120px의 왼쪽 목록/오른쪽 본문,760px 이하 상단 목록,420px 이하 한 열입니다. 제목·설명 → 예시/기존 체험 → 확인/피드백 → 이전/다음 순서이며 마지막 개념에서 퀴즈로 이어집니다. 목록 제목16px·설명14px 이상, 조작44px 이상입니다. 공통 CSS만 공유하고 새 활동 내용까지 확장한 것은 아닙니다.
- **유지할 구현 경계:** WorkEditor의 `use-work`가 학습·저장을 단독 소유합니다. LessonShell은 표현과 탐색을 맡고, memo로 상단 변경 때문에 편집기/iframe이 재생성되지 않게 합니다. 학습 갱신 후 초점은 Effect에서 옮깁니다. 새 저장소·API·DB 형식·의존성을 추가하지 않았습니다. 저장 실패/충돌·미완성 입력·기존 제출본을 보존합니다.

### 이어갈 코드와 검사

| 대상 | 먼저 읽을 파일 |
| --- | --- |
| 전용 틀·복귀·상단 메뉴 | `src/components/student/lesson-shell.tsx`와 인접 CSS, `src/components/classroom.tsx` |
| 단계·개념/퀴즈 어댑터·초점 | `src/components/student/lesson-workspace.tsx`, 저장 소유자 `use-work.ts` |
| 공통 개념 표현·프로그래밍 | `src/components/ui/concept-layout.module.css`, `src/components/prototype/programming/concept.tsx`, `src/components/student/programming-lesson.tsx` |
| 수업별 기존 체험 | `src/components/student/review/`의 `concepts.tsx`·`sandwich.tsx`·`abstraction.tsx`·`flowchart.tsx`와 인접 CSS |
| 내용·완료·서버 계약 | `src/lib/classroom/catalog.ts`·`progress.ts`·`types.ts`·`review/lessons.ts`, `src/lib/server/learning.ts` |
| 관련 회귀 검사 | `tests/concept-layout.spec.ts`, `learning-readability.spec.ts`, `sandwich-conversation.spec.ts`, `student-ui.spec.ts`, `programming-learning.spec.ts`, `programming-prototype.spec.ts` 및 수업 전용 틀 검사 |

## 검증과 검토 자료

**아래는10/6 구현 때 실행한 결과이며 이번 문서 마감에서 앱 검사를 다시 실행하지 않았습니다.** Windows·Node24·Java21·Chromium·demo Auth9099/Firestore8080·localhost:3000의 빌드 앱에서 검사했습니다. 순차 통과와 한 번의 전체 통과를 구분합니다.

| 소스 기준 | 실제 근거·한계 |
| --- | --- |
| `603b8ee` 공통 개념 | typecheck/lint/프로덕션 build 통과. 새 검사2개는 이전 소스에서 실패를 확인한 뒤 수정했습니다. 7개 수업×1440/821/760/390/320px의 배치·크기·넘침·페이지 오류, 일반6개 수업의 답안/피드백 복원·마지막 퀴즈 이동을 확인했습니다. |
| 같은 빌드의 영향 검사 | 관련6개 파일32개 중31개 통과(3.1분). 순서 실습의 연속 Enter가 이전 이동의 Effect 초점을 앞서는 검사 결함을 위치/초점 대기로 보강했습니다. 앱 소스는 그대로 두고 `student-ui`4개+새 개념2개를 함께 재검증해6개 통과(44.6초). ‘32개 단일 실행 모두 통과’로 표현하지 않습니다. |
| 실제 브라우저 확인 | 합성20102 계정의 기존 답안·완료·개념 선택·제목 초점, 콘솔 오류0을 확인했습니다. 실제200%와 OS 입력기 확인은 제외합니다. |
| `fe10311` 전용 틀의 과거 전체 | 전체167개 중166개 통과(14.1분). 숨겨진 로그아웃을 직접 찾던 기존 검사1개를 학생 메뉴를 여는 실제 흐름으로 수정해 단독 통과(23.4초). 이후 공통 개념 변경의 새 전체 검사로 재사용하지 않습니다. |
| 이번 마감 | 문서 로컬 연결342개·앵커 누락0, 보관 원문 SHA-256 일치, 참고 PNG11장 추적, 최신 demo 백업의 Git 제외와 `git diff --check`를 확인했습니다. 최종 원격 SHA와 작업 트리는 마감 커밋 기준으로 대조합니다. 새 기능·앱 소스 변경은 없습니다. |

최신 [공통 개념 화면](reference/student-learning-readability/concept-common-layout-after-20261006.png), [전용 틀 개념](reference/student-learning-readability/lesson-shell-concept-after-20261006.png), [전용 틀 실습](reference/student-learning-readability/lesson-shell-practice-after-20261006.png), [기본 폭](reference/student-learning-readability/practice-default-after-20261006.png), [대화·실행 기록](reference/student-learning-readability/practice-conversation-after-20261006.png)은 Git에 있습니다. PNG는 각 당시 소스의 검토 자료이며 실제 학생 관찰 근거는 아닙니다. 세부 명령·재현·로그 경로는 [마감 전 원문](archive/cs-class/2026-10-06-student-learning-close/HANDOFF.md#모든-수업의-공통-개념-배치--2026-10-06)에 있습니다.

## 다음에 이어갈 작업

1. **재개할 범위부터 확인:** Git과 아래 환경을 확인하고 새 공통 개념 화면을 검토합니다. 이미 반영한 직접 체험 피드백을 처음부터 반복하지 않습니다. 실제 브라우저200%에서 개념/퀴즈/실습·메뉴·Tab/Shift+Tab·글자/버튼/넘침을 확인한 뒤100%로 복귀합니다. CSS zoom/창 축소는 대체 근거가 아닙니다. OS 한글 입력기로 조합 확인 Enter와 다음 Enter 전송을 확인합니다. localhost 접근은 현재 가능하며 과거 저장된 차단 때문에 다시 권한을 묻지 않습니다.
2. **사용자가 이어서 요청하면 8~12차:** 8 추상화(남길 정보/이유·연결 지도·상태/조건·분해), 9 순서도(기호·140/160 분기·오답 복귀/정답 종료·캔버스), 10 프로그래밍/실제 EntryJS의 관찰·읽기, 11 사이트 보조색, 12 최종 통합입니다. 각 회차의 정확한 완료 조건은 [계획 6절](reference/student-learning-readability-plan.md#6-구현-작업과-인터페이스)을 따릅니다. 공통 개념 배치 구현을 8~10차 체험 완료로 간주하지 않습니다.
3. **시간/비용 효율:** 반복 수정은 typecheck+대상 검사와 실제 조작, 최종 인계는 lint/build+영향 E2E로 확인합니다. 공용 부품의 영향이 전체면 최종 전체를 한 번 실행합니다. 12차는 순수 `test:review`·전체 빌드 E2E·남은 화면/접근성 검증을 포함합니다. 새 변경·실패·위험이 없으면 이미 확인한 검사를 반복하지 않습니다.
4. **별도 후속:** 첫 실제 수업의 학년도/명부/적용 반·등록/발급은 [첫 수업 절차](DEVELOPMENT.md#첫-실제-수업-확인-순서)를 따르고 실제 대상·복구 범위를 확인합니다. 학교망/로그인/저장/제출/교사 확인·자연 Cron, 실제 Solar 품질/예산·PRD 미결정은 별도 범위입니다. 이 UI 인계만으로 운영 변경을 시작하지 않습니다.

## 다른 PC에서 이어가기

먼저 그 PC의 미커밋·미추적 변경과 현재 브랜치를 보존합니다. 현재 작업은 아래 origin 브랜치입니다. main이나 옛 이식 ZIP으로 덮어쓰지 않습니다.

```powershell
git status -sb
git fetch origin
git branch -vv
```

로컬에 작업 브랜치가 **없을 때만**:

```powershell
git switch --track -c codex/student-learning-readability origin/codex/student-learning-readability
```

이미 있을 때는 기존 변경을 보존하고 해당 브랜치로 이동한 뒤 `git merge --ff-only origin/codex/student-learning-readability`로 받습니다. 분기해 있으면 자동 reset/강제 push 대신 차이를 대조합니다. 받은 tip·README·HANDOFF·계획/참고 PNG가 있는지 확인하고, [새 PC 준비](DEVELOPMENT.md#다른-pc에서-시작)의 Node24·Java21+·EntryJS·Chromium·캐시를 준비합니다. 에뮬레이터는 실제 Firebase 키 없이 `npm.cmd ci` 후 `npm.cmd run dev:emulator`로 시작합니다. 기존 캐시를 확인하기 전에 다운로드를 반복하지 않습니다.

### 로컬 기록과 전달 경계

- **이번 종료 시점의 최신 로컬 기록:** `scratch/handoff-20261006/demo-review-backup.json`에 합성20102의 계정/목록/AI 장부/반/일정과 작품5건, 합계9개 존재 문서를 새로 읽어 보존했습니다. `backup-demo.mjs`는 앱 설정과 demo 호스트를 확인하는 읽기 전용 보존 도구입니다. 현재 앱·기록을 되돌리거나 서버를 종료하지 않았습니다. 앞선 검사 전8건/7건/4건 백업으로 최신 체험을 덮어쓰지 않습니다.
- **Git에 옮겨지는 것:** 현재 브랜치의 커밋·추적 소스·새 CSS/테스트·문서·참고 PNG입니다. 미추적 소스는 없습니다. **옮겨지지 않는 것:** `.env.local`·관리자 키·개인 도구/스킬 설정·`scratch/`·`outputs/`·node_modules·빌드/Java/브라우저/EntryJS 캐시·실행 중 에뮬레이터 기록입니다. 비밀값/계정/학생 자료는 채팅·문서·Git에 추가하지 않습니다. 동일 demo 기록이 필요하면 지정한 비공개 경로로 따로 전달하고 대상의 기존 기록을 비교한 뒤 복원합니다.
- 새 PC의 demo는 새 시드로 시작합니다. 수업을 교사 화면에서 다시 열 수 있으며, 이 PC의 공개 합성20102 준비 상태가 그대로 있다고 가정하지 않습니다. 앱/에뮬레이터 포트와 `/api/auth/config`의 projectId·호스트·fixture를 확인하고 운영 앱3000과 테스트 서버를 혼용하지 않습니다.
- 로컬 원본 복구 계획은 `scratch/review-lessons/production-full-restore-plan-release-20261005.json` 및 단계별 계획입니다. 반 설정만 복구하며 현재 revision이 다르면 거부합니다. 없는 PC에서 추측으로 재작성·적용하지 않습니다. 빈 명부 양식은 `outputs/classroom-readiness/학생명부_작성양식.xlsx`, 이전 검사 원본은 `scratch/concept-layout-20261006/`·`lesson-shell-20261006/` 등입니다.

### 새 대화에 붙일 요청문

> CS Class의 마감 작업을 이어주세요. 먼저 기존 Git 변경을 보존하고 origin/codex/student-learning-readability의 최신 마감 커밋을 확인해주세요. AGENTS.md → docs/HANDOFF.md → 필요한 PRD/DESIGN/DEVELOPMENT와 두 계획서를 읽어주세요. 1~7차·선생님 사용 피드백·LessonShell·7개 수업의 개념 배치는 구현했고 앱 기준은603b8ee입니다. 기록/저장의 단독 소유와 실제 Entry iframe을 유지해주세요. 실제200%·OS 입력기 확인은 남았고8~12차는 미착수이며, 제가 요청하는 범위로 이어주세요. 로컬 AI는 fixture이고 운영 변경/배포는 별도입니다. 다른 PC의 demo 기록·비밀 설정·캐시는 자동 전달되지 않으므로 환경과 현재 기록부터 확인해주세요.

## 통합·배포 상태

**아래는10/3~10/5의 과거 운영 확인입니다. 이번 마감에서 운영 상태를 다시 조회하지 않았습니다.** [운영 사이트](https://cs-class-donghyunt.vercel.app), Firebase `cs-class-f74c4`, Vercel `cs-class`입니다. 학생 UI 작업 브랜치는 main에 미병합입니다.

- 함수 지역 조정은 [PR25](https://github.com/DonghyunT/cs-class/pull/25)의 `986bf56` → main `eacb020`이며 함수 `icn1`·DB `asia-northeast3`, 뒤 문서 배포의 SHA/별칭·익명 API·로그인 화면 확인은 [당시 기록](archive/cs-class/2026-10-06-student-learning-close/HANDOFF.md#105-서버-함수-지역-조정)에 있습니다. 실제 신규 Google OAuth/학교망 검증과 구분합니다.

### 10/5 원작 실습 UI 복원 공개

`12b00e7` → PR23 → main `448d61f`의 원작 실습 표현·검증/운영 확인은 [당시 기록](archive/cs-class/2026-10-06-student-learning-close/HANDOFF.md#105-원작-실습-ui-복원-공개)에 있습니다. 이번 학생 UI 작업의 배포 근거가 아닙니다.

### 10/5 세 복습 운영 공개

`9ac8142` → PR21 → main `6bad59b`,11반의 세 선택 복습 공개·반 설정 보존·TTL ACTIVE 확인은 [당시 기록](archive/cs-class/2026-10-06-student-learning-close/HANDOFF.md#105-세-복습-운영-공개)에 있습니다. 수업별 실제 Solar 품질·오판은 [실행 장부](reference/algorithm-review-integration.md#실행-장부)를 따릅니다. 같은 운영 시험을 반복하라는 승인이 아닙니다.

### 10/4 실제 수업·시간표 운영 릴리스

PR18의 프로그래밍13·명부 도구·시간표, 인증된 갱신/플랫폼 수동 Run200과 자연 Cron 미확인은 [당시 기록](archive/cs-class/2026-10-06-student-learning-close/HANDOFF.md#104-실제-수업시간표-운영-릴리스)에 있습니다. 자연 예약은 실제 로그와 `checkedAt`을 다음 점검에서 확인합니다.

### 10/3 운영 테스트 계정 발급

승인된 학생11개·교사1개 일회 발급은 [당시 기록](archive/cs-class/2026-10-06-student-learning-close/HANDOFF.md#103-운영-테스트-계정-발급)을 따릅니다. 발급 원문은 비공개이며 이 승인을 신규 운영 계정/반복 시드로 확대하지 않습니다.

## 교실 입장·대시보드 조회 성능

10/5 익명 `/api/auth/session` 연속6회의 미국 지역 중앙213ms → 서울 안정 측정48ms는 [당시 측정](archive/cs-class/2026-10-06-student-learning-close/HANDOFF.md#교실-입장대시보드-조회-성능)이며 배포 직후 느린 표본도 포함했습니다. 로그인된 메뉴/반 조회 개선율은 미측정입니다. 운영 로그403·Observability Plus402로 확인하지 못한 범위와 [추가 측정 절차](DEVELOPMENT.md#대시보드-성능-측정)를 구분합니다.

## 남은 한계와 다음 결정

- 실제200%·OS IME·실기기 터치·화면 읽기 음성·EntryJS 전체 블록의 접근성·실학생 이해도/피로도는 자동 검사로 입증하지 않았습니다. 신규 Google OAuth·학교망·자연 Cron도 별도 확인입니다.
- 원작 음성 입출력·픽셀 단위 동일성·범용 자유 제작은 추가하지 않았습니다. 순서도 AI의 타당한 합성 작품 오판은 교사 확인 경로로 보완하며 실제 AI 품질을 이번 fixture 검사로 입증하지 않습니다.
- 미전송 초안의 강제 종료 후 영구 복구는 보장하지 않습니다. 저장 실패·충돌·이전 제출본 보존은 [저장 정책](PRD.md#작업-저장과-통신-비용)을 따릅니다.
- 이전 Stitch/Firebase CLI 인증 폐기·재발급,9/28 의존성 중간 경고5개(운영2개), Actions/Java Action 폐기 예고는 과거 미확인 후속입니다. 이번 마감에서 새로 해결했다고 표현하지 않습니다.
