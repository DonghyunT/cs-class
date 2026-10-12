# 이어갈 작업

## 현재 작업 상태

현재 로컬 작업: 2026-10-12(Asia/Seoul), 브랜치 `codex/student-ui-quiz-concept-flowchart`.

**10/12 추가 요청 — 계획 단계:** [브라우저 주석 11개 반영 계획](reference/student-lesson-feedback-plan-20261012.md)을 작성했습니다. 프로그래밍 제목/개념·진도 표시, 필수 맛보기·추상화 닥터/요소/처방전, V1 순서도 배치/조작을 다룹니다. 맛보기는 한 번 완료하면 이어가기로 사용자 확인을 받았습니다. 기존 미커밋 변경과 최신 V1 참고본을 보존했으며 이번 계획 작업에서 앱 코드는 수정하지 않았습니다. 다음 행동은 계획 검토 후 회차별 구현입니다. 아래 검증 결과는 직전 AI의 기록이며 이번에 다시 실행한 결과가 아닙니다.

최신 반영 사항 (로컬 미커밋 상태):
1. **퀴즈 UI 확장:** 학생 퀴즈 영역 최대 1240px로 확장 및 그리드 분할 비율 확대 (`programming-lesson.module.css`, `student.module.css`).
2. **개념 체험 카드형 구조화:** 제어 구조 3단계 카드, 알고리즘 5대 조건 5열 카드 및 컵 물 붓기 실험 카드(무한/유한 루프 비교), 식빵 잼 비교 카드 적용 (`concepts.tsx`, `concepts.module.css`).
3. **순서도 연구소 화살표 직선화:** 중심축 정렬로 수직선(`|`) 및 [예]/[아니오] 대칭 분기/합류 일직선화, 빈 슬롯 정답 가림 및 `Drop` 점선 배지 복원 (`flow-experience.ts`, `flow-diagram.tsx`, `flow-diagram.module.css`).
4. **테스트 수업 전면 숨김:** 학생·교사 대시보드, 수업 관리 다이얼로그, 확인할 수업 드롭다운, 교사 미리보기, 커뮤니티, 일정 플래너에서 구버전 테스트 수업(`sequence-lab`, `flowchart-lab`, `entry-bot-lab`)을 완전히 제외하고 정식 4개 수업(`programming-13`, `review-sandwich`, `review-flowchart`, `review-abstraction`)만 노출. 로컬 에뮬레이터 시드(`seed-emulator.mjs`) 및 실행 중인 DB 반영 완료.
5. **검증 완료:** `typecheck`, `test:review`(15/15), `lint`, `build`(22/22) 통과.
직전 AI 작업의 다음 행동 기록: 로컬 브라우저 검토 후 커밋 생성 및 원격 push / PR 준비.

직전 릴리스 마감: 2026-10-12(Asia/Seoul). **수업 UI·세 복습 V1 UX·순서도 후속의 구현·통합 검증·운영 배포를 완료했습니다. [PR #31](https://github.com/DonghyunT/cs-class/pull/31)을 `main@0429fa2`에 병합했으며, 검증 HEAD는 `287d1e4`입니다. 문서 마감 커밋은 앱·검사를 바꾸지 않습니다. 다른 PC에서는 최신 원격 main을 받고 아래 재개 안내부터 확인합니다.** 당시 마감 상태는 main·원격 동기화·미커밋/미추적 변경 없음입니다. 기존 변경을 모두 포함했고 로컬 작품8개·반 설정11개와 게스트 접속을 복원했습니다.

## 이번 변경과 검증

- **공통 수업 UI:** 모든 수업에 같은 LessonShell 헤더·나가기 위치·개념/퀴즈/실습 탭과4px 진도 막대를 사용합니다. 펼침 안내를 제거하고 다른 이번 수업 안내를 제목 아래 작은 이동 링크로 옮겼습니다. 기존 저장 확인·실패/충돌 접근·집중/넓게 보기·손들기·교사 메모리 체험을 유지합니다.
- **추상화:** 한 지도에서 일반 지도→노선도로 전환하며 제거할 지형·건물과 유지할 역/환승을 보여줍니다. 실전 워크북은 선택 맛보기와 독립적으로 열리며 상태→조건→생각 다이어트→처방전, 후보 추천/채택/수정·복사/인쇄를 제공합니다.
- **샌드위치:** 큰 조리대·오른쪽 명령 대화·누적 알고리즘, 완성 결과 재열기/복사를 복원했습니다. 초안·대화 읽던 위치·실패/확인 질문과 Enter/Shift+Enter/IME 구분을 보존합니다. 음성은 범위에 포함하지 않습니다.
- **순서도:** V1의 다섯 단계·퍼즐/예시/자유 공방 배치, 내부 글 편집·포트 연결·기획서 접기·기호 이동/정렬/삭제·캔버스 이동·한 단계/속도/실행 과정을 복원했습니다. 후속에서 조각의 한 번 사용/이동/복귀, 예시 공개 상태, 숫자/문자 계산과 직전 값, 기호 옆 입출력/갈래·통과 선, 추천/직접 두 탭·후보 검토·구조 점검·전체 PNG를 보완했습니다. 예시 이동과 새 연결은 기존 작품/선을 임의로 덮지 않습니다.
- **보존 경계:** useWork가 저장을 계속 소유하며 초안·현재 검증·이전 제출·완료를 구분합니다. 옛 text/yes/no·좌표·연결도 복원하고 배치 이동은 논리 검증과 분리합니다. 명시적 AI 요청과 학생 수정/늦은 응답/실패 보호, 상담 전문 비보관, 교사 체험 AI 제한을 유지합니다. 새 의존성·작품 저장 스키마·범용 틀은 추가하지 않았습니다.
- **방법과 리뷰:** Ponytail full, 파일 소유 분담과 공유 계약 순차 통합, 실패 재현→최소 수정→같은 조건 검증을 적용했습니다. 독립 리뷰의 후보 잔류를 수정했고 통합에서320px SVG 원점·현재 힌트/기호 선택자·Entry 준비 중 iframe 폐기 오류를 보완했습니다. 허용오차/시간 제한을 늘리지 않았습니다. [순서도 대조 분석과 구현표](reference/flowchart-v1-audit-20261011.md)에 근거를 남겼습니다.

10/11 Windows·Node24.19.0·Java21·demo-cs-class·Auth9099/Firestore8080·localhost3000·CI=1·빌드된 next start·합성 AI/시간표·단일 worker에서 **영향 범위114/114 단일 실행(7.2분), 실패/건너뜀/불안정0개**와 typecheck·lint·test:review15개·build가 통과했습니다. 실행 전후 소스·검사253파일의 SHA-256이 동일합니다. 같은 날 앞선318/318·326/326 전체 검사와10/10 운영 결과는 각각 당시 소스의 과거 근거이며 최신 결과와 합산하지 않습니다.

10/12 최종 [전체 PR CI38148575390](https://github.com/DonghyunT/cs-class/actions/runs/38148575390)는 Ubuntu·Node24·Java21·동일 demo 포트·빌드된 next start·단일 worker에서 **E2E344개 통과(22.2분), 실패/재시도0개, Windows 전용 .NET 명부 변환1개 제외**와 lint·typecheck·test:review15개·build가 통과했습니다. 첫 CI38145977953의 모바일 배치1개 실패 뒤 두 요소를 같은 evaluate에서 측정하도록 보완했습니다. 로컬 진단3회는 실제 간격24px였고 CI의 겹침은 재현되지 않았습니다. 보완 후 Windows 대상11/11·typecheck·lint가 통과했으며 허용오차·시간 제한·제품 배치는 유지했습니다. 검증 HEAD와 main 병합 커밋의 전체 Git tree는 `71b6a8d8081805cfa78135962c9d9a77f19e7796`로 동일합니다.

**화면 증거:** [헤더1920×1080](reference/lesson-ui-20261011/lesson-header-programming-1920.png), [지도1544×712](reference/lesson-ui-20261011/map-subway-1544.png), [추상화 처방전](reference/lesson-ui-20261011/abstraction-prescription-1544.png), [샌드위치1280×720](reference/lesson-ui-20261011/sandwich-1280.png), [순서도 자유1544×712](reference/lesson-ui-20261011/flowchart-fixed-free-1544.png), [자유390px](reference/lesson-ui-20261011/flowchart-fixed-free-390.png), [퍼즐1920×1080](reference/lesson-ui-20261011/flowchart-fixed-puzzle-1920.png), [처방전1544×712](reference/lesson-ui-20261011/flowchart-fixed-prescription-1544.png)는 합성 기록입니다. 순서도4장은 최신114개 실행에서 촬영했습니다. 1280×720·820/821px·390/320px·초점·넘침·재접속·실패/충돌·AI 늦은 응답·집중/넓게 보기·교사 체험을 검사했습니다.

## 통합·배포 상태

- **이번 승인과 대상:** 10/11 사용자의 현재 요청에 따라 이번 변경 전체를 GitHub `DonghyunT/cs-class`의 `main`과 Vercel `cs-class`(`prj_RUUtcTMukVY9kjudgDr6VA89KKxP`) Production에 반영합니다. 운영 주소는 [cs-class-donghyunt.vercel.app](https://cs-class-donghyunt.vercel.app)입니다. 로컬 기록·반 설정·계정·Firebase 규칙/인덱스·환경변수는 배포 범위에 포함하지 않습니다.
- **앱 릴리스 확인:** `main@0429fa2de3b51b74deb59ca76e9cd8b93d0cb067`, `dpl_6rznosEmUtNKLXnUj6xJ9BKvUtPr`, `cs-class-1quq02z3k-donghyunt.vercel.app`의 Production READY·icn1과 실제 운영 별칭 일치를10/12 확인했습니다. 이후 문서 마감 커밋은 앱·검사 변경을 포함하지 않으며 최신 main HEAD는 `git rev-parse HEAD`로 확인합니다. 중복 push CI는 취소하고 정확한 PR HEAD의 전체 CI로 검증했습니다.
- **운영 점검:** 10/12 익명 GET에서 auth config/session200·운영 프로젝트·에뮬레이터 없음·게스트 비활성, 학생/교사 로그인 HTML200, 보호된 학생/교사/질문/작품 API401 JSON, 이전 주소의307·경로 보존을 확인했습니다. 1280×720 공개 홈·학생 로그인 입력/버튼, 넘침 없음·브라우저 콘솔 오류0개를 확인했습니다. [운영 공개 홈 화면](reference/lesson-ui-20261011/production-home-20261012.png)은 실제 배포의 공개 화면입니다. 운영 계정 로그인·AI·저장/제출을 시험한 것은 아닙니다.
- **점검 한계:** Vercel 런타임 로그 MCP 조회는403으로 거부됐고 현재 PC에 대체 CLI가 없어 조회하지 못했습니다. 로그 오류0개나 실제 Google 로그인 성공으로 판정하지 않습니다. 로그 접근 설정·권한은 변경하지 않았습니다.
- **릴리스 전 복구 후보:** `main@ad1cf9cc35d11d5ed9a93d3ec0607dfec760a005`, `dpl_AuU3g5B5wUrY4FNDkAPpsyXz8CoZ`, `cs-class-amgh8uo5x-donghyunt.vercel.app`, Production READY·icn1과 운영 별칭 일치를 읽기 전용으로 확인했습니다. 복구를 실행한 것은 아닙니다. 설정/복구 절차는 [서버 안내](FIREBASE_SETUP.md#vercel-서버-설정)를 따릅니다.

## 다음에 이어갈 작업

1. 다른 PC의 기존 작업을 보존한 뒤 아래 순서로 최신 main과 실행 환경을 확인합니다. 낡은 이식 ZIP·작업 브랜치로 덮어쓰지 않습니다.
2. [첫 실제 수업 확인 순서](DEVELOPMENT.md#첫-실제-수업-확인-순서)에 따라 학교 PC·학교망·물리 IME·실학생 안내를 확인합니다. 추가 UI 수정은 새로운 요구와 영향 범위를 정해 진행합니다.
3. 운영 계정/반 공개·실제 자료 변경은 구체적인 대상과 영향/복구 범위를 별도로 확인합니다. 이번 배포 승인을 해당 자료 변경으로 확대하지 않습니다.

## 다른 PC에서 이어가기

**현재 PC의 브랜치·미커밋/미추적/미푸시 변경부터 확인합니다.** 원격 main으로 앱·검사·문서·합성 화면을 함께 받습니다. 이미 다른 PC에 작업이 있으면 보존하고 차이를 대조한 뒤 전환합니다. 강제 reset이나 옛 ZIP 적용을 사용하지 않습니다.

아래 `dev:emulator`는 기본 테스트 시드를 다시 준비합니다. 기존 demo 기록이 있으면 먼저 export하고, 별도 export를 import해 이어갈 때는 [기록 복원 안내](DEVELOPMENT.md#기존-demo-기록을-복원해-보기)에 따라 기본 시드 없는 서버를 시작합니다.

~~~powershell
git status -sb
git branch -vv
git fetch --prune origin
# 기존 변경을 보존하고 작업 트리가 정리된 뒤
git switch main
git merge --ff-only origin/main
git log -4 --oneline
npm.cmd ci
npm.cmd run dev:emulator
~~~

Node24·Java21+·Chromium과 캐시 준비는 [다른 PC 개발 안내](DEVELOPMENT.md#다른-pc에서-시작)를 따릅니다. `npm ci`가 EntryJS 자산을 준비합니다. 새 demo는 기본 시드 상태이므로 이 PC의 반 공개/이번 수업·게스트 작품과 동일하다고 가정하지 않습니다. 기존 로컬 기록이 있는 PC에서는 서버 교체/시드 전에 export하고 실제 포트·`/api/auth/config`의 demo 프로젝트/호스트를 확인합니다.

### 로컬 기록과 전달 경계

- Git은 앱·검사·문서·합성 화면을 전달합니다. `.env.local`·관리자 키·개인 스킬/플러그인 설정·`scratch/`·`outputs/`·node_modules·빌드/Java/브라우저 캐시와 실행 중 로컬 기록은 전달되지 않습니다. 운영 자료는 운영 DB에 유지됩니다.
- 이 PC의 최신 보존 기준은 Git 제외 `scratch/lesson-ui-release-20261011/pre-ci-fix-demo/`의 Auth/Firestore입니다. 첫 CI 실패 후 추가 로컬 검사 전에 새로 export했고 기본 시드 없이 import했습니다. 정상 게스트 재입장 전후 작품8/8·반 설정11/11의 문서 ID·전체 내용이 백업과 동일합니다. 비교는 객체 키를 재귀 정렬하고 배열 순서는 유지합니다. 근거는 `scratch/lesson-ui-release-20261011/verify-records.cjs`·`restored-check.json`입니다. 이전 회차 백업으로 덮지 않습니다.
- 동일 로컬 기록이 필요하면 위 export를 비공개 경로로 별도 전달하고 대상 PC의 기존 기록과 대조한 뒤 복원합니다. 공개 Git/문서에 인증·학생 자료를 넣지 않습니다. 이 PC는 에뮬레이터62502·최종 빌드 미리보기89183·합성 시간표59381을 유지하며 [로컬 순서도](http://localhost:3000/classroom/review-flowchart?from=lessons)가 게스트로 열려 있습니다. 복원 미리보기에서 시드를 다시 실행하지 않습니다.
- 운영 체험 계정의 안내 파일·명부·복구 파일도 비공개 자료입니다. [계정 안내](FIREBASE_SETUP.md#승인된-운영-테스트-계정)와 [명부 절차](DEVELOPMENT.md#실학생-명부-준비와-반별-발급)를 따르며 없는 값을 추측으로 재작성하지 않습니다.

### 새 대화에 붙일 요청문

> CS Class를 이어주세요. 현재 PC의 기존 Git 변경과 로컬 기록부터 보존하고 AGENTS.md → docs/HANDOFF.md → 필요한 PRD/DESIGN/DEVELOPMENT를 읽어주세요. 최신 원격 main·릴리스 SHA·현재 PC를 대조하고 과거 검사/승인을 새 결과나 권한으로 해석하지 마세요. 공통 LessonShell과 세 복습 V1 UX, 학생 useWork의 단일 저장 소유·초안/현재 검증/이전 제출/완료 구분, 같은 Entry iframe/작품/실행, 실패/미완성 입력/늦은 AI 응답 보호를 유지해주세요. 로컬 demo 기록·비밀 설정·개인 도구/캐시는 Git으로 이동하지 않으므로 환경과 기존 기록을 먼저 확인해주세요. 새로 수정할 부분은 제가 설명하겠습니다.

## 남은 한계와 다음 결정

- 최신 AI 검사는 합성 제공자 기준입니다. 운영 Solar 품질·브라우저200% 확대·물리 한글 입력기·실기기 터치/화면 읽기·학교망/신규 Google OAuth·실학생 이해도·프린터·자연 Cron은 별도 확인입니다.
- 순서도는 V1 기능/조작 흐름을 기준으로 하며 공통 셸·글꼴·저장/교사 확인은 CS Class 기준입니다. 전체 V1의 픽셀 동일성은 측정하지 않았습니다. 미전송 초안의 강제 종료 후 영구 복구는 보장하지 않으며 [저장 정책](PRD.md#작업-저장과-통신-비용)을 따릅니다.
- 이전 인증 키 재발급·9/28 의존성 중간 경고5개(운영2개)·Actions/Java Action 폐기 예고·반 조회 개선율은 이번 릴리스에서 새로 해결/측정하지 않았습니다. 과거 근거와 현재 성공 범위를 구분합니다.

## 과거 구현·검증·운영 근거

완료·대체된 상세 인계는 [10/11 릴리스 전 원문](archive/cs-class/2026-10-11-before-lesson-ui-release/HANDOFF.md)과 [SHA-256 manifest](archive/cs-class/2026-10-11-before-lesson-ui-release/manifest.json)에 Windows 바이트 그대로 보존했습니다. 앞선 릴리스는 [보관 목록](archive/README.md)을 따릅니다. 보관 원문은 당시 상태·승인이며 현재 작업 지시가 아닙니다. 기존 활성 문서의 아래 진입점을 유지합니다.

### 10/5 원작 실습 UI 복원 공개

[당시 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#105-원작-실습-ui-복원-공개)을 따릅니다.

### 10/5 세 복습 운영 공개

[당시 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#105-세-복습-운영-공개)을 따릅니다.

### 10/4 실제 수업·시간표 운영 릴리스

[당시 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#104-실제-수업시간표-운영-릴리스)을 따릅니다.

### 10/3 운영 테스트 계정 발급

[당시 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#103-운영-테스트-계정-발급)을 따릅니다.

## 교실 입장·대시보드 조회 성능

[당시 원문](archive/cs-class/2026-10-10-before-consulting-release/HANDOFF.md#교실-입장대시보드-조회-성능)을 따릅니다.
