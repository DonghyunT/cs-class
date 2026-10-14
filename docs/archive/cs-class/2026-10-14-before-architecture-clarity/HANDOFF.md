# 이어갈 작업

## 현재 작업 상태

2026-10-14(Asia/Seoul). CI 실패 수정(`a874e37`)과 문서 보정(`cef2b64`)을 `main@0c32a3b1a8d4ccc69f4475f94c47b8c38b4e5ada`에 통합하고 운영 공개를 마쳤습니다. 사용자의 명시 요청에 따라 **이번 릴리스는 GitHub CI 없이** 로컬 검증을 재사용했습니다. 최신 문서 마감 HEAD와 아래 앱 배포 SHA는 구분합니다. 아래 이전 PC 작업과 A0 조사는 과거 기록입니다.

- **통합·CI 생략:** `codex/fix-manual-save-navigation-ci`의 검증된 트리와 릴리스 트리가 동일함을 확인한 뒤 `main`에 push했습니다. 릴리스 메시지의 `[skip ci]`로 같은 SHA의 Actions 실행은 생성되지 않았습니다. Vercel Git 자동 빌드는 완료됐지만 운영 별칭이 이전 배포를 유지해 수동 Promote API로 이번 배포를 공개했습니다. 기존 workflow·GitHub `app` 배포 검사 설정은 변경하지 않았으며 다음 일반 릴리스는 기존 CI 판정을 따릅니다.
- **운영 배포:** 10/14 12:33 KST 확인. Vercel `cs-class` Production의 `dpl_8GKENV11fbMUPpSVUERMPNBFvdKF`·READY·icn1·위 릴리스 SHA와 실제 [운영 별칭](https://cs-class-donghyunt.vercel.app)의 배포 ID 일치를 확인했습니다. 직전 복구 후보는 `faaa82a0d001f11d49aafee3a65a4544cabdc71e`·`dpl_3hbBQeC2YXT949GXW32KL4QAQiyX`입니다.
- **운영 확인 범위:** 익명 `/api/auth/config` 200·configured=true·emulatorHost=null, `/api/auth/session` 200·session=null, 익명 학생/교사 수업 API 각각401·SIGNED_OUT, 학생/교사 로그인 페이지 각각200을 확인했습니다. 인앱 Chromium 약700px에서 두 로그인 화면과 활성 버튼을 확인했고 관찰한 콘솔 오류/경고는0입니다. 실제 계정 로그인·Google OAuth·AI·학생 저장/제출은 이번 배포 확인에서 실행하지 않았습니다.

- **후속 문서 보정:** DEVELOPMENT의 `useWork` 호출·반환 함수·저장 상태 검사·백업 필수 인자를 실제 코드와 맞췄고, 고정 검사 개수·시간 안내를 목록 조회 및 실행별 기록으로 바꿨습니다. DESIGN은 전역 CSS 토큰과 컴포넌트별 색상 규격을 구분합니다. 문서 검사 2개·활성 문서12개 링크/앵커·diffcheck·독립 리뷰 통과, 현재 E2E 목록403개/61파일을 확인했습니다. 앱·검사·설정 변경 없이 문서만 수정해 빌드·E2E는 새로 실행하지 않았습니다. 백업 예시는 CLI 인자 검사와 대조했으며 실제 명부·운영 백업은 실행하지 않았습니다.

- **원격 CI:** [c3b2485 검사](https://github.com/DonghyunT/cs-class/actions/runs/38437567017)는 E2E 401개 통과·1개 실패·1개 생략입니다. `.gitignore` 변경이 미분류되어 전체 검사로 승격됐고, 프로그래밍의 수업 나가기 검사에서 실패했습니다.
- **원인·수정:** Entry 캡처 응답 뒤에 열리는 확인창을 클릭 직후 `isVisible()` 한 번으로 조회해 지나치는 경합입니다. 실제 미저장 입력을 명시하고 확인창 표시를 기다린 뒤 폐기·이동 및 서버의 기존 발견 기록 보존을 검사합니다. 제품 코드·저장 정책은 변경하지 않습니다.
- **진단:** 정상 로컬 실행은 통과했으나 캡처 응답에 500ms 지연을 준 합성 진단에서 확인창이 열린 채 동일한 URL 대기 실패를 재현했고, 수정 후 같은 지연 조건에서 1개 통과했습니다. 응답을 무기한 보류한 앞선 진단은 4초 캡처 제한에 걸린 별도 실패로 구분합니다. 진단 장치는 최종 검사에서 제거했습니다. 의도적 실패 실행의 trace ZIP 정리에 Windows `EBUSY`가 있었으며 원인 판정은 PNG·DOM 캡처로 확인했습니다.
- **재사용한 로컬 검증:** Windows·Node24.19.0·Java21·Playwright1.63/Chromium·빌드된 `next start`·demo Auth9099/Firestore8080에서 관련 E2E 5파일(`programming-classroom`, `manual-save-entry`, `manual-save`, `navigation`, `lesson-smoke`) 35개 통과(3.9분), 실패·생략0입니다. 타입·린트·정책/문서 회귀15개·활성 문서12개 링크/앵커·diffcheck와 독립 리뷰를 마쳤습니다. 앱 빌드는 변경 전 1회 성공했고 실행 코드가 동일해 재사용했습니다. 전체 E2E는 새로 실행하지 않았습니다. 상세 진단은 Git 제외 `scratch/ci-navigation-fix/`에 있으며 코드·검사·문서만 Git으로 전달합니다. 위 운영 빌드·공개와 구분되는 배포 전 로컬 결과입니다.

### 이전 PC의 수동 저장·문서 정비

2026-10-14 이전 PC의 문서 시스템 리팩토링 기록: 1차 기준 `ac67a5d`, 2차 정비 `be14f8d`.
- **문서 체계 현대화 (1차 커밋 완료 `ac67a5d`):**
  - `AGENTS.md`: 62행 압축 단일 가이드라인 및 엄격한 가드레일 정립.
  - `docs/PRD.md`: SDD 사양 기반 제품 요구사항 계약으로 재구축 (활동 분모 일치: `programming-13`: 14, `review-abstraction`: 7, `review-sandwich`: 7, `review-flowchart`: 10).
- **문서 체계 현대화 (2차 개편 완료):**
  - `README.md`: 현대적 쇼케이스 포맷(기능 카드, Mermaid 다이어그램, 일원화된 SSOT 문서 색인표, 플랫 스퀘어 배지).
  - `docs/DESIGN.md`: 실제 CSS 변수 및 색상 코드 1:1 일치, 경직된 금지어 배제 및 목적 지향적 UI 권장 원칙(Design Considerations) 도입.
  - `docs/DEVELOPMENT.md`: 623행에서 260행으로 대폭 슬림화. 투 트랙 브랜치 전략(Fast-Track vs PR-Track), 계층형 검증 티어, 사용자 직접 브라우저 검증(`--ui`, `--headed`), 4단계 신규 수업 체크리스트 확립.
- **수동 저장 전환 및 선별 검증 파이프라인 (2026-10-13 검증 완료):**
  - 수동 저장(`useWork`, `Ctrl+S`, `NavigationProvider`) 및 4개 수업 전체 선별 E2E 파이프라인(`scripts/e2e-scope.mjs`, `tests/lesson-smoke.spec.ts`) 안정화 완료.
  - 문서 검증: `node scripts/check-docs.mjs` (Active documents: 12, errors: 0).
  - 단위 검증: `npm run test:scope` (13 pass), `npm run test:review` (16 pass).

재개 근거: Git 추적 문서인 이 HANDOFF와 현재 코드, Git 제외 상세 작업 장부 `scratch/manual-save-implementation/`입니다. 새 소스 `src/components/student/work-draft.ts`, 새 검사 2개(`tests/manual-save.spec.ts`, `tests/manual-save-entry.spec.ts`)와 계획 2개(`docs/superpowers/plans/`)는 신규 파일입니다.

### A0 변경 전 조사 근거

2026-10-13(Asia/Seoul) 이 PC의 **A0 조사 완료** 상태: `codex/verification-plan`·기준/원격 `0c61e46`, 계획2개·README·PRD·DESIGN·DEVELOPMENT·HANDOFF 미커밋 문서 변경 있음. 다음 행동은 아래 조사 결과와 [수동 저장 계획A](superpowers/plans/2026-10-13-manual-save.md)를 검토한 뒤 승인된 A1–A6를 진행하는 것입니다. [검증 계획B](superpowers/plans/2026-10-13-scoped-verification.md)는 A 안정화 이후입니다. 제품 소스·추적된 테스트·CI 설정 변경, 새 앱 빌드·전체 E2E·커밋/push/배포는 하지 않았습니다. 아래 이전 CI/배포 결과와 이번 합성 계측 결과를 구분합니다.

### 수동 저장 A0 조사·변경 전 요청 수

- 사용자 추가 결정: 손들기는 **현재 작품을 저장하고 요청**하는 명시 예외. 위치만 바뀌면 **미저장 경고 없음**, 다음 내용 저장/명시 행동에 위치 포함.
- 코드 계약/caller/읽기 위치 projection·기획서 제안/적용 경계는 [수동 저장 아키텍처](DEVELOPMENT.md#학생-수업-수동-저장-아키텍처-및-계약), 제안 정책은 PRD/DESIGN, 실행/회귀는 계획A에 반영했습니다. 미해결 사용자 선택은 없으며 projection 후보·Entry metadata 정규화는 구현 시 실제 caller로 확인합니다.
- 환경: 10/13 Windows·Node24.19.0·Java21·Playwright1.63.0/Chromium·현재 소스의 next dev, fresh demo-cs-class Auth9099/Firestore8080·localhost3000·AI fixture·단일 worker. 시작 전 netstat/PID/API 교차 조회에서 기존 앱/에뮬레이터 없음 확인. 기존 export를 import/덮어쓰기하지 않고 새 합성 환경만 사용했으며 게스트 세션은 사용하지 않았습니다.
- 보존/무변경: 미커밋 문서4개를 scratch before-docs에 복사하고 source/config288파일 SHA-256 전후 일치(변경0)를 확인했습니다. 다른 미추적 outputs는 수정하지 않았습니다. 두 계측 종료 후 3000/8080/9099/4400/4500/4781 LISTENING 없음 확인.
- 실행: scratch 임시 Playwright spec2개 각각 성공(요약2.3분/37.3초); 실제 시나리오17개+기존 정상 저장 버튼 미지원1항목. 첫 준비 실행은 임시 config 기준 cwd 때문에 MODULE_NOT_FOUND로 실패했고 제품 문제가 아니며 cwd를 루트로 지정한 뒤 실행했습니다. 전체 E2E/운영 검증이 아닙니다.

| 합성 시나리오 | 초안 POST | 명시 행동·기타 요청 |
| --- | --- | --- |
| 추상화16자 연속 입력·80ms 간격 | 1 | 없음 |
| 추상화3번 편집·각1400ms 멈춤 | 3 | 없음 |
| 추상화24번 편집·300ms 간격 | 3 | 없음 |
| 미저장 내용 편집 직후 단계 이동 | 2 | 없음 |
| 내용 변경 없는 단계 이동 | 1 | 없음 |
| 미저장 주제 입력 직후 AI 후보 요청 | 1 | AI POST1 |
| 저장 응답 보류 중 A→B 추가 편집 | 2 | 없음 |
| 미저장 내용 편집 직후 손들기 | 1 | help POST1 |
| 순서도 도형1개 추가 | 1 | auth/activity POST1 별도 |
| 순서도 포트2개 키보드 연결 | 1 | 없음 |
| 순서도 문구 편집 직후 내보내기 | 1 | 없음 |
| 순서도 문구 편집 직후 수업 나가기 | 1 | 도착 화면 API1 |
| 미저장 개념 답안 선택 직후 정답 확인 | 1 | action POST1 |
| 내용 변경 없는8초 대기 | 0 | 없음 |
| 프로그래밍 새 미션 이동·기본 작품 초기화/capture | 2 | 없음 |
| 프로그래밍 기존 미션으로 돌아가기 | 1 | 없음 |
| 미저장 입력 직후 합성 hidden 이벤트 | 1 | 실제 탭 전환 측정 아님 |

근거는 Git 제외 `scratch/manual-save-a0-20261013/`의 baseline/supplement JSON·spec/config/launch·로그·source hash summary입니다. 준비용 인증/시드/API와 메인 화면 로딩은 계측 행에서 제외했습니다. 본문·쿠키·학생 개인정보를 계측 JSON에 저장하지 않았습니다. 기존 화면에는 일반 저장 버튼이 없어 save 버튼 요청 수는 미지원이며 API 호출로 대신 계산하지 않았습니다. hidden은 visibilityState override+이벤트의 합성 측정입니다. 단일 PC/dev/합성 작업의 관찰값으로 일반 평균·production 호출량·Firestore 과금·절감률을 주장하지 않습니다. 실제 채점/AI 품질/퍼즐 성공 자동 기록 전체·물리 IME/탭 전환/운영은 A0 범위에서 입증하지 않았습니다.

2026-10-13(Asia/Seoul). **개인 개발 CI·Preview·운영 공개 전환을 main@d62be05까지 반영했습니다. 최종 문서 마감 SHA는 Git HEAD, 검사 상태는 Actions에서 대조합니다.**

- 작업 브랜치 push는 자동 CI·Preview 없음, main은 문서/전체 검사, 수동 실행은 전체 검사입니다. GitHub app을 Vercel Production 공개 조건으로 연결하고 같은 SHA의 성공 후 운영 전환을 확인했습니다. 관련 E2E 자동 선택은 후속 작업입니다.
- 로컬 판정/문서 회귀8개·추가 코드 린트·활성 문서10개 링크/앵커·diffcheck 통과. 독립 검토의 새 문서 누락·없는 비교 SHA 처리를 반영했습니다. 앱·DB·실학생 자료·보관 원문은 변경하지 않았습니다.
- [초기 CI](https://github.com/DonghyunT/cs-class/actions/runs/38344538720): b6e2968·app28분37초·E2E384개 통과/Windows 전용1개 skip. [보완 CI](https://github.com/DonghyunT/cs-class/actions/runs/38347670921): d62be05·app30분57초·E2E 단계28분54초·384개 통과/1개 skip. 실행별 시간 차이를 캐시의 효과로 단정하지 않습니다.
- 운영은 dpl_AnfXRBKDiGcjiFT8WTvJYHNi9N6C·READY·d62be05·운영 별칭을 확인했습니다. 앞선 빌드는 31초 후 Running Checks로 이전 운영을 유지하다 app 성공 후 공개됐습니다. 익명 config/session·학생/교사 로그인200 및 /.git/HEAD·config404를 확인했으며 실제 계정 로그인·저장은 시도하지 않았습니다.
- 사용자 요청의 [수동 Preview](https://cs-class-8xi3e5096-donghyunt.vercel.app)는 b6e2968·READY입니다. 익명 접근은 Vercel 인증으로 이동하고 운영 Firebase 비밀정보가 없어 로그인 버튼은 비활성화됩니다. 화면 확인용이며 추가 CI·운영 교체는 만들지 않았습니다.
- [문서 CI](https://github.com/DonghyunT/cs-class/actions/runs/38347033466)는 8fd1b2a·app9초·설치/빌드/E2E 생략입니다. 당시 Vercel은 .git 전체 제외로 비교에 실패해 재빌드했으며 d62be05에서 인증 config·hooks·logs·FETCH_HEAD 제외를 유지하고 비교 메타데이터를 남겼습니다. [보완 후 문서 CI](https://github.com/DonghyunT/cs-class/actions/runs/38350518613)는 f9b449c·app15초 성공, 설치/빌드/E2E 모두 생략입니다. Vercel dpl_8uvpN7XGepqDfawL31tAHkn442YM의 Documents only: skip app build·CANCELED를 확인했고 운영은 d62be05를 유지합니다.
- 앞선 정책 정비는 PR36의 65413a0와 PR37의 43a9cea로 반영됐습니다. 순서도 퍼즐 자동 제출·초안 복구·보관 CRLF 기준은 유지하며 검사 명령은 DEVELOPMENT, 배포는 FIREBASE_SETUP을 따릅니다.
### 이번 조사에서 확인한 근거

| 확인일·대상 | 실제 확인 | 한계 |
| --- | --- | --- |
| 10/13 Windows·수정 전 `22392d8` | 로컬 `npm run build` 1회 성공·전체49.8초, 컴파일11.6초·타입24.8초·정적 생성4.4초 | 제한 환경의 경로 접근 거부 뒤 허용된 실행으로 측정. 캐시가 있는 이 PC의 단일 관찰이며 이번 문서 수정 후 재빌드 결과가 아님 |
| 10/13 조회·GitHub CI `9576cd9` | [PR 실행](https://github.com/DonghyunT/cs-class/actions/runs/38275942490)의 app job31분2초·E2E 단계28분21초·빌드36초·타입12초·린트22초. 같은 커밋의 [push 실행](https://github.com/DonghyunT/cs-class/actions/runs/38275936434)도 시작됐다가 취소됨 | 기존 실행 기록을 읽었으며 CI·로컬 전체 E2E를 새로 실행하지 않음. E2E 단계 시간에는 에뮬레이터 준비·종료가 포함됨 |
| 10/13 전환 전 GitHub 조회 | 저장소 비공개 확인. 당시 workflow는 push·PR마다 전체 E2E, npm 캐시만 사용하며 단일 worker 유지 | 요금제·잔여 한도는 미확인. main 보호 규칙·ruleset 조회는 요금제 관련403으로 확인하지 못함 |

검사 절차는 [DEVELOPMENT](DEVELOPMENT.md#검증), 자동화 변경은 [CI 후속 작업](#ci-개선-후속-작업)을 따릅니다.

### 문서 정비 통합·배포 확인

- 10/13 12:14 KST PR #36을 `main@65413a06e8b5c9ac80c439c5c678e19bdac6a83a`에 병합했습니다. Vercel `cs-class` Production 배포 `dpl_DujKyFxLvMzEWRfQqSTd8QV5rk2c`의 READY·동일 SHA·icn1·운영 별칭을 확인했습니다. 아래 수업 앱 릴리스의 실행 코드는 그대로입니다.
- 자동 시작된 [PR CI](https://github.com/DonghyunT/cs-class/actions/runs/38340328278)는 린트·타입·순수 검사·빌드까지 통과한 뒤 전체 E2E 단계에서 취소했습니다. 중복 push CI와 main 병합 CI도 취소했습니다. `9576cd9` 이후 전체 변경 파일이 문서·보관 원문·`.gitattributes`·`.gitignore`에 한정되고 실행 코드·검사·의존성·실행 설정이 동일함을 확인하여 기존 [전체 CI 성공](https://github.com/DonghyunT/cs-class/actions/runs/38275942490)을 재사용했습니다. 이번 E2E가 새로 통과했다는 뜻이 아닙니다. 당시 workflow는 문서 변경에도 전체 검사를 시작했으며 위 전환 전 기록입니다.
- 운영 읽기 전용 확인: `/api/auth/config` 200·운영 프로젝트·configured=true·emulatorHost=null, `/api/auth/session` 200·익명 session=null, 익명 학생/교사 API 각각401을 확인했습니다. 인앱 Chromium 657px에서 학생·교사 로그인 화면과 버튼 준비, 학생 화면 가로 넘침 없음, 확인한 콘솔 오류/경고0을 확인했습니다. 실제 계정 로그인·AI·저장은 이번 문서 배포에서 시도하지 않았습니다.
- 당시 자동 승인 검토에서 main 직접 push·`[skip ci]`가 거부되어 PR37 경로로 기록을 전달했습니다. 이는 과거 결과이며 현재 PR 필수 지침이 아닙니다. 이후 main·검사·운영 SHA는 각각 대조합니다.


2026-10-13 직전 앱 릴리스: 사용자 요청의 수업 화면·순서도 수정과 운영 공개를 마쳤습니다. 앱·검사 `9576cd9`를 [PR #34](https://github.com/DonghyunT/cs-class/pull/34)로 병합했고 앱 릴리스 기준은 `main@8e32f7c`입니다. 이후 문서 커밋·배포 SHA와 구분하며 아래 수업 릴리스 검증은 당시 날짜·범위의 결과입니다.

## 이번 릴리스의 변경

- 프로그래밍의 첫 개념에 프로그래밍·프로그래밍 언어·프로그램의 관계를 모으고, 기존 개념 ID·답안·완료 기록을 보존합니다. 현재 작품의 수동 제출 성공 뒤 다음 미션을 강조하고 초점을 옮기며 이전 미션도 같은 줄에서 선택합니다.
- 공통 수업 헤더는 화면 양끝 여백과 큰 제목·제목 옆 상태 배지를 사용합니다. 이번 수업 링크는 아래 줄에, 집중 모드 전환은 단계 탐색 줄 오른쪽에 둡니다. 복습의 중복 실습 제목과 넓게 보기 버튼을 제거합니다.
- 순서도 퍼즐1–3은 AI 진단 대신 실행 성공으로 복습 기록을 남깁니다. 자유 작업실은 기획서300px·색/아이콘/+ 추가 버튼·통합 도구·작은 팔레트·얇은 실행바를 사용합니다. 예시 공방은 실행 과정을 제거하고 상단 도구를 통합하며, 퍼즐의 출력 콘솔/다음 미션 공간과 분기선·캔버스 범위를 보완합니다.
- GIF의 검은 사각 겹침은 SVG 기본 초점 테두리였습니다. 기본 사각 테두리·드래그 중 글자 선택을 막고 스크롤 없는 초점을 지정했습니다. 도형의 선택·키보드 초점 표시와 실제 편집·연결·이동은 유지합니다.
- 추상화는 최초 한 번 맛보기·단계별 닥터 대화·관측 요소7개·선택한 요소만 버리기·자연어 계획/처방전을 제공합니다. 기존 초안·이전 제출·완료를 보존합니다. 학생 저장은 useWork, 교사 체험은 메모리 경계를 유지합니다.

확정 정책은 [PRD](PRD.md), 화면 기준은 [DESIGN](DESIGN.md), 설치·복구는 [DEVELOPMENT](DEVELOPMENT.md)에 모읍니다. 상세 작업 이력과 완료된 계획은 [정리 전 원문/해시](archive/cs-class/2026-10-13-before-lesson-release/manifest.json)에 보존했습니다.

## 검증 상태

| 날짜·환경 | 실제 범위·결과 | 한계 |
|---|---|---|
| 10/12–10/13 Windows·Node24·Java21·Chromium·demo Auth9099/Firestore8080·빌드된 next start | 화면 개선 전체 E2E384개 통과, skip/flaky/실행 오류0. FHD·낮은 창·모바일·모의200%·키보드·저장/제출 복구 확인 | 드래그 후속 수정 전 결과 |
| 10/13 같은 로컬 환경 | 드래그 후 순서도6파일 E2E46개 통과(2.5분), skip/flaky/실행 오류0. 타입·린트·빌드·기본 테두리 없는 실제 캡처 확인 | 전체384 이후 변경은 FlowDiagram TSX/CSS와 해당 회귀 검사3파일뿐임을 840파일 해시로 대조 |
| 10/13 릴리스 준비 | 순수 복습 엔진/AI 검사16개 통과. main부터 미추적 신규 검사까지 독립 리뷰에서 중요 결함 없음 | 운영 실제 로그인·AI·저장 성공을 뜻하지 않음 |
| 10/13 첫 Linux CI | 383개 통과·Windows 전용1개 skip·모바일 배치 계측1개 실패 | 초점이 iframe에 있는 화면 크기 변경 뒤 두 요소의 위치를 서로 다른 시점에 읽은 검사. 같은 evaluate에서 함께 읽도록 수정했으며 기준·허용오차는 유지 |
| 10/13 Windows·기존 빌드·demo | 수정한 작업실 검사5개 통과(26초), skip/flaky/오류0·타입 검사 통과. 390/320px의 실제 안내–작업실 간격16px 확인 | 앱 소스 변경 없이 테스트 계측만 수정한 9576cd9의 전체 CI 결과는 아래에 별도 기록 |
| 10/13 Linux GitHub CI·9576cd9·demo 에뮬레이터·빌드된 앱 | 타입·린트·빌드·순수 검사와 전체 E2E384개 통과(28.1분), 실패0 | Windows .NET 도구 전용1개만 의도적으로 skip. [최종 CI](https://github.com/DonghyunT/cs-class/actions/runs/38275942490)는 이전 로컬 결과와 구분 |

로컬 보고서는 Git 제외 `scratch/lesson-layout-round3-20261012/`와 `scratch/flowchart-drag-20261013/`에 있습니다. 최신 릴리스의 GitHub CI는 아래 통합·배포 절에서 별도로 기록합니다.

## 통합·배포 상태

대상은 GitHub `DonghyunT/cs-class`와 Vercel `cs-class`(`prj_RUUtcTMukVY9kjudgDr6VA89KKxP`) Production, [운영 주소](https://cs-class-donghyunt.vercel.app)입니다. [최종 CI](https://github.com/DonghyunT/cs-class/actions/runs/38275942490) 성공 뒤 PR34를 `8e32f7c890b21125e48f4155ad70c87c60d1aa23`에 병합했습니다. 자동 Git 배포 `dpl_91NMBykiTbhEjrRnRB2ZuTjPEJXy`의 READY·동일 SHA·icn1·운영 별칭을 확인했습니다. 문서 마감은 실행 소스와 설정을 바꾸지 않으므로 이후 main SHA와 이 앱 릴리스 SHA를 구분합니다.

10/13 이번 작업의 읽기 전용 재확인: 최신 운영 배포는 `dpl_CEmktc1PFdUxZ9TVMK8umEHUB2Ah`·READY·`main@22392d8bcd3e4cb87d0417a8fc946578f329639a`이며 운영 별칭을 확인했습니다. 같은 대화에서 이 배포 로그의 `npm run build`→`next build`도 확인했습니다. 이는 앞선 문서 커밋의 배포이며 `codex/workflow-docs` 변경을 배포한 결과가 아닙니다. CI를 기다리는 배포 보호 설정과 실제 계정 로그인·저장은 이번 조사에서 확인하지 않았습니다.

10/13 07:48 KST 운영 읽기 전용 확인: `/api/auth/config`의 운영 Firebase 프로젝트·configured=true·emulatorHost=null·게스트 비활성, `/api/auth/session` 200·익명 session=null, 익명 학생/교사 조회와 인증 없는 Cron 각각401, 이전 sigma 주소의 경로·쿼리를 보존한307 이동을 확인했습니다. Chromium 학생/교사1280px·교사390px 로그인 화면에서 버튼 준비·가로 넘침 없음·page/console 오류0을 확인했습니다. 실제 Google OAuth 로그인·AI 호출·작품 저장은 시도하지 않았습니다. 근거는 Git 제외 `scratch/release-20261013/after-deploy/`에 있습니다.

앞선 9576cd9 Preview는 `git_info_fail`로 실패했고 운영 빌드는 정상 완료했습니다. 로그 API의403으로 Preview의 상세 원인은 확정하지 않았습니다. 운영 성공과 별개로 추후 Preview 배포가 반복 실패하면 Git 연결 상태와 해당 로그 접근을 점검합니다. 복구 기준은 이전 `main@5bb859c`·`dpl_FLZduiMH4ULDN9j9t6vkv9YGKwJF` READY·icn1이며 서버 설정·복구 절차는 [서버 안내](FIREBASE_SETUP.md#vercel-서버-설정)를 따릅니다.

## 다음에 이어갈 작업

1. **신규 수업 추가 및 확장:** [수업 추가 4단계 체크리스트](DEVELOPMENT.md#신규-수업-추가-및-선별-검증-연동-체크리스트)에 따라 신규 수업 추가 시 `src/components/student/` 격리, `useWork` 수동 저장 연결, 상태 배지 단언 E2E 작성, `scripts/e2e-scope.mjs` 선별 등록 절차를 준수합니다.
2. **투 트랙 브랜치 & 통합 정책 준수:** 일상 기능/수업 추가는 Fast-Track(`codex/` ➔ 선별 검증 ➔ `main` 반영)으로 빠르게 진행하고, 대규모 아키텍처 개편 및 방향성 피벗은 PR-Track(GitHub PR 발행 ➔ Diff 리뷰 ➔ CI 확인)을 활용합니다. 큰 변경 시에는 에이전트가 로컬 전체 E2E 실행 여부를 사전에 질문하여 승인을 얻습니다.
3. **현장 수업 확인:** [첫 실제 수업 확인 순서](DEVELOPMENT.md#첫-실제-수업-확인-순서)에 따라 학교 PC·학교망·물리 한글 입력기 환경에서 승인 계정의 실제 로그인/저장과 실학생 사용성을 점검합니다.

<a id="ci-개선-후속-작업"></a>
### CI 및 선별 검증 운영 현황
- 2026-10-13 선별 검증 파이프라인(`scripts/e2e-scope.mjs`, `scripts/ci-policy.mjs`, `tests/lesson-smoke.spec.ts`) 구축 완료 후 `main`에 성공적으로 안착되었습니다.
- 이번 원격 조회에서 `faaa82a`는 샌드위치 선별 E2E 30개 통과(2.2분), `c3b2485`는 `.gitignore` 미분류로 전체 검사에 승격된 것을 확인했습니다. CI 선택 기준은 [DEVELOPMENT](DEVELOPMENT.md#검증)를 따르며 최신 실행의 결과는 첫머리에 기록합니다.

## 다른 PC에서 이어가기

`git status -sb` → `git branch -vv` → `git fetch --prune origin` → 이 문서와 실제 HEAD 대조 순서로 시작합니다. 기존 미커밋·미추적 파일과 로컬 기록을 보존한 뒤 의도한 브랜치로 전환합니다. 완료된 릴리스 뒤 깨끗한 main에서는 `git pull --ff-only origin main`으로 이어갑니다.

Node24·Java21+·Chromium과 PC별 준비는 [개발 안내](DEVELOPMENT.md#다른-pc에서-시작)를 따릅니다. `npm.cmd ci`가 EntryJS 자산을 준비합니다. 기본 dev:emulator는 시드를 다시 쓰므로 기존 기록이 있으면 먼저 export하고 [시드 없는 복원](DEVELOPMENT.md#기존-demo-기록을-복원해-보기)을 사용합니다.

### 로컬 기록과 전달 경계

이 PC의 최신 복원 기준은 Git 제외 `scratch/release-20261013/demo-before-ci-debug/`입니다. 추가 CI 계측 검증 전에 사용자가 수정한 최신 기록을 export하고 시드 없이 복원했습니다. 복원 직후 반11개·작품4개와 정렬 해시를 기록했고 미리보기 재연결 뒤에도 두 해시의 일치를 확인했습니다. `scratch/flowchart-drag-20261013/demo-before/`와 앞선 `scratch/lesson-layout-round3-20261012/demo-before/`·`scratch/feedback-20261012/demo-before-tests/`는 이전 시점의 보관본입니다. 이후 체험한 기록은 새 export로 남깁니다.

미리보기는 demo Auth9099/Firestore8080과 `node scratch/lesson-layout-round3-20261012/preview.mjs`의 빌드된 localhost3000을 사용하며 시드를 실행하지 않습니다. 학생 로그인·세션 API200과 demo 프로젝트/로컬 호스트를 확인했습니다. 기존 브라우저 쿠키의 실제 이어가기 성공까지 자동 검증한 결과는 아닙니다.

Git은 코드·검사·문서만 전달합니다. 비밀 설정·관리자 키·개인 도구·로컬 기록·scratch/outputs·node_modules·빌드/브라우저/Java 캐시는 별도입니다. 필요한 기록은 비공개 경로로 전달해 대상의 기존 기록과 대조합니다. 운영 체험 계정/명부는 [계정 안내](FIREBASE_SETUP.md#승인된-운영-테스트-계정)·[명부 절차](DEVELOPMENT.md#실학생-명부-준비와-반별-발급)를 따릅니다.

### 새 대화에 붙일 요청문

> CS Class의 개인 개발 CI·배포 전환을 이어주세요. 작업 브랜치 보관 push와 main 공개를 구분하고 Preview는 사용자 선택 후 생성해주세요. CI 범위·Production app 검사 연결·문서 빌드 생략의 실제 상태는 이 문서 첫머리를 확인해주세요. Git 변경과 로컬 기록을 먼저 보존하고 AGENTS.md → docs/HANDOFF.md → 필요한 기준 문서를 읽어주세요. 최신 HEAD·배포 SHA·미커밋 상태와 과거 검증 범위를 구분해주세요. 공통 LessonShell·useWork 단일 저장·기존 초안/이전 제출·명시 AI·실패/지연 응답 보호를 유지해주세요. 새 수정 요구사항은 제가 설명하겠습니다.

## 남은 한계와 다음 결정

운영 계정 로그인·실제 AI·저장/제출, 물리 한글 입력기·학교망·실기기 터치/화면 읽기·실제200% 확대·프린터·자연 Cron은 해당 환경에서 확인합니다. 강제 종료한 미전송 초안의 복구 경계는 [저장 정책](PRD.md#작업-저장과-통신-비용)을 따릅니다. 이전 의존성/인증 키/운영 로그 접근의 미해결 기록은 보관 원문에 남아 있으며 이번 화면 릴리스로 해결됐다고 판단하지 않습니다.

## 과거 구현·검증·운영 근거

[문서 보관함](archive/README.md)에서 이전 릴리스·완료 계획·원문 해시를 확인합니다. 10/12 PR #32의 상세 배포·검증과 371/384/46개 검사 이력은 [이번 정리 전 인계](archive/cs-class/2026-10-13-before-lesson-release/HANDOFF.md)에 보존했습니다. 아래 앵커는 기존 문서의 진입점을 유지합니다.

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
