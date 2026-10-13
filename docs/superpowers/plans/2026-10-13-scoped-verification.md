# 수동 저장과 변경 영향별 검증 — 통합 로드맵·실행 계획 B

> 에이전트 실행: `superpowers:executing-plans`를 적용한다. 계획A의 A1–A6 로컬 구현·검증은 승인되어 진행 중이다([HANDOFF](../../HANDOFF.md#현재-작업-상태)). 이 문서의 계획B는 계획 작성까지이며 구현·커밋·push·병합·배포는 별도 요청 범위다. 실행 시 현재 승인 범위를 대조한다.

**Goal:** 수동 저장 전환 이후 변경 영향에 따라 검증 범위를 선택하고, 작품을 바꾸는 수정에서는 명시 저장·새로고침 복원을 유지하면서 반복 실행·이미지 분석 비용을 줄인다.

**Architecture:** 기존 Node 판정 스크립트에 명시적 코드→검사 매핑을 추가한다. 기존 Playwright 테스트와 단일 worker를 사용하며 미확인 경로는 전체 검사로 처리한다. 자동 조작 후 필요한 결과만 에이전트가 분석한다.

**Tech Stack:** 기존 Node 24, Next.js 16.3.6, Playwright 1.63 계열, Firebase CLI 15.31.0, Java 21+; 신규 의존성 없음.

**Spec:** 이 문서의 합의 요구사항이 이번 변경의 명세다. 기존 절차는 [DEVELOPMENT의 검증](../../DEVELOPMENT.md#검증), 권한은 [AGENTS](../../../AGENTS.md)를 따른다. 구현 후 지속 정책은 DEVELOPMENT로 이관하고 이 계획은 보관한다.

**Baseline:** `origin/main@0c61e46`, 2026-10-13 Asia/Seoul. 현재 자동화는 docs/full 두 모드이며 일반 코드 변경은 전체 E2E다. 아래 affected 모드·선택표·기본 흐름은 구현 제안이며 현재 기능이 아니다.

## 통합 실행 순서

1. **A: [학생 수업 수동 저장 계획](2026-10-13-manual-save.md)** — caller/요청량 조사 → 단일 snapshot 저장 → 버튼/부모·iframe 단축키 → 내부 이동/미저장 외부 이동 → 채점/제출/AI/퍼즐 예외 → 전체 회귀 → 지속 정책/복구.
2. **B: 이 문서의 작업 1–7** — A의 안정된 저장 동작을 기준으로 매핑 조사 → 영향별 기본 검사 → 선택 판정 → runner → CI → 문서 → 실제 효과 확인/복구.
3. A와 B는 별도 변경 단위로 검토·통합한다. A 공통 저장/탐색 변경과 B 테스트 인프라 변경은 각각 full 대상이다. 같은 코드/조건의 전체 검사 결과는 재사용하되 A 성공으로 새 B 변경까지 통과했다고 판단하지 않는다.
4. 현재 요청은 계획 개정까지다. 설계 제안·구현·로컬 검증·실제 CI·운영 확인을 구분하고 실행 전 승인 범위를 대조한다.

## 합의 요구사항과 경계

- 수업 조립/입력/편집 변경: 준비된 인증 → 해당 수업 → 변경 조작 → 명시 저장 → 새로고침 복원을 검사한다. 국소 작업에 실제 로그인/로그아웃/재로그인을 일괄 적용하지 않는다.
- 문구/배치·읽기 표시·일반 실행만 바뀌어 작품 데이터에 영향이 없으면 로컬 기본 저장 검사를 생략할 수 있다. 자동 CI는 diff 내용을 추측하지 않고 증명된 전용 경로의 보수적 검사 묶음을 실행한다.
- 문서·문구·색상만 바꾸면 불필요한 저장/로그인 테스트를 추가하지 않는다. 국소 UI는 해당 화면·조작·좁은 창·초점·콘솔을 확인한다.
- 수업 전용 저장/제출 변경은 해당 수업의 실패·중복·늦은 응답·기존 기록 보존·나갔다 다시 열기를 포함한다. 사용자별 조회/세션 식별에 영향이 있으면 실제 재로그인을 추가한다. 공통 저장/인증 변경은 전체 검사다.
- 테스트 실행과 캡처 생성은 Playwright가 담당한다. 에이전트는 요약·실패 정보·필요한 대표 캡처만 읽는다. Computer use는 사용자가 요청할 때만 사용한다.
- 자동 검사로 확인하지 못한 항목은 수동 조작 순서·기대 결과·확인하지 못한 이유를 사용자에게 전달한다. 사용자에게 전체 화면을 막연히 검사하도록 요청하지 않는다.
- 수동 확인 대기·미확인 항목을 통과로 기록하지 않는다. 실제 Google OAuth·물리 IME·실기기는 합성 환경과 구분한다.
- docs/affected/full 판정 중 불확실성은 full로 승격한다. 수동 workflow 실행은 항상 full이다.
- 인증·세션·학생 식별/발급·공통 저장·DB 구조/규칙·의존성·실행 설정·검사 정책/테스트 인프라는 full이다.
- 공용 부품은 소비 화면을 모두 증명했을 때만 선택 검사 후보가 된다. 이번 첫 적용에서는 공용 부품을 full로 유지한다.
- 기능별 선택표의 초기 자동 적용은 샌드위치·순서도·추상화의 검증된 전용 경로에 한정한다. 프로그래밍·교사/학생 관리·대시보드는 조사 결과를 기록하되 이번에 범위를 증명하지 못하면 full을 유지한다.
- 단일 worker, 기존 제한/타임아웃/허용오차, 실패 처리, 접근성, 데이터 보호를 유지한다. 재시도나 병렬화로 실패를 감추지 않는다.
- demo-cs-class, Auth 9099, Firestore 8080, http://localhost:3000만 검사한다. 운영 시드·합성 계정 생성 금지. 기존 수동 체험 자료는 서버/시드 변경 전에 export한다.
- 로컬 최종 관련 검사와 같은 조건의 CI 결과를 재사용한다. 변경/환경 차이 없이 전체 검사를 반복하지 않는다.

## 검증 선택 기준

| 변경 유형 | 로컬 작업 중 | 마무리/자동화 |
| --- | --- | --- |
| 문서 | 내용·링크·앵커·공백 | docs: 판정 회귀·문서 검사, 앱 설치/빌드/E2E 생략 |
| 문구·색상 | 해당 요소·조작·대표 캡처 | 증명된 전용 경로이면 affected; 그 외 full |
| 국소 배치/메뉴 | 해당 화면·키보드·좁은 창·콘솔 | 관련 정적 검사·빌드·선택된 화면 E2E |
| 수업 조립/입력/편집 | 타입·재현·관련 회귀 | 린트·타입·빌드·명시 저장/reload·관련 E2E |
| 수업 일반 실행/읽기 표시 | 관련 실행/표시·기존 기록 비변경 | 데이터 변경이 없으면 로컬 저장 smoke 생략 가능 |
| 수업 전용 저장/제출 | 위 조건 + 실패/중복/늦은 응답/기존 기록 | 기본 흐름·저장 회귀 포함 |
| 교사 관리/대시보드 | 역할/담당 반·실패·재접속·영향 학생 화면 | 초기 자동 선택은 full 유지 |
| 공용 부품 | 소비 경로와 공통 계약 조사 | 초기 full; 별도 검토 후 축소 가능 |
| 인증/공통 저장/설정/미분류 | 권한·실패·호환성 | full |

자동화는 소스 diff에서 문구/색상과 행동 변경을 추측하지 않는다. 증명된 수업 전용 경로는 해당 수업 검사 묶음을 실행한다. 더 작은 로컬 검사 선택은 작업자의 영향 분석으로 결정한다.

## 문서의 독자와 소유권

| 문서 | 독자 | 작성 형태와 담당 내용 |
| --- | --- | --- |
| AGENTS.md | 에이전트 | 짧은 MUST/조건/금지, 지속 검증 기준으로 링크 |
| DEVELOPMENT.md 검증 절 | 에이전트·개발자 | 결정표·명령·선택표의 근거·실패 대응; 기술 용어와 정확한 경로 사용 |
| 이 실행 계획 | 실행 에이전트 | 인터페이스·작업 순서·회귀 조건·완료 기준 |
| README.md | 사람 | 무엇이 달라지는지·어디서 확인하는지, 짧은 설명과 링크 |
| HANDOFF.md | 이어받는 에이전트 | 브랜치·미커밋·다음 행동·실제 결과·환경·미확인 범위 |
| 작업 완료 응답/수동 확인 안내 | 사용자 | 동작·확인 결과·실행할 조작 중심, 내부 파일 목록 최소화 |

별도 인간용 보고서 파일을 만들지 않는다. PRD/DESIGN의 제품 정책과 완료된 보관 원문은 수정하지 않는다. 매핑의 실행 목록은 코드에서만 소유하며 문서에 같은 목록을 복제하지 않는다.

## 파일 구조와 인터페이스

- 수정: `scripts/ci-policy.mjs` — 성공한 main 기준 SHA·누적 diff·docs/affected/full·Actions 요약. 기존 ignore-build는 문서만 생략한다.
- 신규: `scripts/e2e-scope.mjs` — 명시적 매핑과 순수 선택 함수. 범용 의존성 분석기·glob 엔진을 만들지 않는다.
- 신규: `scripts/run-selected-e2e.mjs` — 판정 JSON 검증 후 기존 Firebase/Playwright CLI를 호출하고 종료 코드를 전달한다.
- 수정: `tests/ci-policy.test.mjs` — 기존 docs/full·성공 기준·Vercel 회귀 유지 및 affected 누적 판정 추가.
- 신규: `tests/e2e-scope.test.mjs` — 선택·승격·runner 입력 및 실패 전파 검사.
- 신규: `tests/lesson-smoke.spec.ts` — 선택한 수업별 준비된 인증/편집/명시 저장/reload 복원. 실제 로그인 UI는 인증/공통 저장 회귀에 남긴다. 전용 저장 입력은 작은 수업별 어댑터로 유지한다.
- 수정 가능: 기존 수업별 spec — 누락된 실패 회귀를 확장한다. 새 파일을 수업마다 자동 생성하지 않는다.
- 수정: `.github/workflows/verify.yml`, `package.json` — 선택 runner 연결·작은 정책 검사·실패 아티팩트 보관.
- 수정: `AGENTS.md`, `docs/DEVELOPMENT.md`, `docs/HANDOFF.md`, `README.md` — 문서별 담당 범위만 갱신한다.

공통 결과 계약:

```ts
type E2EPlan = {
  mode: "docs" | "affected" | "full";
  base: string | null;
  reason: string;
  lessonIds: string[];
  testFiles: string[];
};
```

- `selectE2E(files: string[]): Omit<E2EPlan, "base">` (`e2e-scope.mjs`): 동기 순수 함수, 출력 정렬·중복 제거. full은 lessonIds/testFiles가 빈 배열이고 전체 실행을 뜻한다. docs의 빈 배열은 E2E 생략이다.
- `selectScope(env, baseline?, diff?)` (`ci-policy.mjs`): 기존 호출 방식을 유지하고 E2EPlan을 반환한다. docs 판정 후 나머지는 selectE2E로 넘긴다.
- `scope` CLI: 기존 mode/base 출력에 `scratch/ci/e2e-plan.json` 저장 및 `plan` 경로 출력을 추가한다. 없는 부모 폴더는 생성한다.
- runner: `node scripts/run-selected-e2e.mjs --plan scratch/ci/e2e-plan.json`, 실행 중인 검증된 demo 환경에는 `--running`을 추가한다.
- runner의 외부 인자는 계획 파일 경로와 위 플래그만 허용한다. 테스트 파일/수업 ID는 검증된 JSON에서 읽는다. arbitrary command 실행 기능은 만들지 않는다.
- smoke 선택은 `CS_SMOKE_LESSON_IDS`의 JSON 배열로 전달한다. 변수 부재 시 등록된 전체 smoke 수업, 잘못된 값/빈 선택/미지원 ID는 오류다.

## Review Focus

1. API 인증 준비를 실제 로그인 검사로 오인하거나 모든 국소 변경에 로그인 UI를 강제하지 않는다 — 작업 2의 인증 준비/저장 smoke와 full 인증 회귀를 구분.
2. 선택 성공을 새로운 기준으로 사용한 뒤 이전 변경 검사가 빠지지 않는다 — 작업 3의 누적 변경/실패 이후 문서 변경/선택 성공 이후 변경 회귀.
3. 전용 화면이 공통 서버 모듈을 바꾸는 경우 전용 검사로 축소되지 않는다 — 작업 1·3의 full 경로 우선·혼합 변경 회귀.
4. 잘못된 선택 목록이 0개 테스트 성공으로 끝나지 않는다 — 작업 4의 JSON/등록 ID/실제 파일/수집 개수 검사.
5. 재시드/이전 편집기의 pending 저장/미리보기 재사용이 학생 기록 또는 테스트 상태를 덮지 않는다 — 작업 2·5의 준비·복원·깨끗한 단일 실행 확인.

## 작업 1 — 코드와 검사 연결 근거 확정

**Files:** scripts/e2e-scope.mjs (다음 작업에서 생성), 기존 수업 spec/소스, DEVELOPMENT 검증 절.

- [ ] 수동 저장 계획A의 안정된 구현/검증 기준을 확인한다. 자동 저장 기대가 남은 spec을 선택 검사로 등록하지 않는다.
- [ ] 최신 Git 상태·원격·HANDOFF를 확인한다. 계획 기준 이후 변경이 있으면 diff를 조사한다. 사용자 로컬 기록·미추적 파일을 보존한다.
- [ ] 기존 spec의 test 이름·준비 함수·DB 변경·로그인 방법·복원 로직을 조사한다. 단순 파일 이름으로 필요한 검사를 확정하지 않는다.
- [ ] 각 후보 경로의 import/caller를 추적한다. 수업 선택→editor→전용 화면→저장→API→서버 판정까지 조사한다.
- [ ] 수업별 조사 결과를 DEVELOPMENT에 `source boundary / dependent contracts / existing tests / missing assertions / full triggers` 형태로 기록한다.
- [ ] 초기 후보: `review/sandwich.tsx`, `sandwich-stage.tsx`, `sandwich.module.css`, `sandwich-engine.mjs` → 샌드위치. `review/abstraction.tsx`, `abstraction.module.css`, `abstraction-data.mjs` → 추상화. 순서도 화면/엔진은 공유 소비 경로를 먼저 확인한다.
- [ ] 후보 검사: 샌드위치 `review-sandwich.spec.ts`, `sandwich-conversation.spec.ts`; 추상화 `review-abstraction.spec.ts`, `review-abstraction-v1-ux.spec.ts`; 순서도 `review-flowchart*.spec.ts`, `flowchart-auto-completion.spec.ts`. `review-practice-ui`, `practice-focus`, `lesson-feedback-workspace` 등 혼합 수업 검사는 본문을 읽고 관련 소비가 있으면 파일 전체를 포함한다.
- [ ] `use-work.ts`, `work-controller.ts`, 공용 lesson shell/editor/workspace, `src/lib/server/**`, 공통 review project/AI protocol, 실행 설정은 초기 full 목록에 둔다. 서버 전용 수업 함수가 필요해도 범위를 증명하기 전 full이다.
- [ ] 세 수업 밖 경로·공용 순수 함수의 미확인 caller는 full로 남긴다. 각 allow 항목은 근거가 있는 정확한 경로로 등록하며 폴더 전체를 쉽게 허용하지 않는다.

**완료:** 각 allow 경로에 검사 파일·기본 흐름 대상·실제 소비 근거가 있다. 세 수업 모두 등록할 수 있다는 가정 없이 증명된 것만 다음 작업에 넘긴다.

## 작업 2 — 영향에 맞는 수업 기본 흐름과 부족한 회귀 보완

**Files:** tests/lesson-smoke.spec.ts, tests/emulator.ts (기존 helper 재사용), 필요한 기존 수업 spec.

- [ ] 설치 버전의 Playwright 로컬 문서를 읽고 Context7으로 사용하는 locator·수집·환경 전달 API만 확인한다. 동일 작업에서 재사용한다.
- [ ] 기존 `readyStudent()`는 API 인증/비밀번호 준비용임을 명시한다. smoke는 준비된 인증으로 시작하며 실제 UI 로그인 회귀는 full에 유지한다.
- [ ] 지원 수업 어댑터를 `lessonId / openPractice / writeDraft / expectRestored`로 구성한다. DB로 테스트 결과를 대신 만들지 않고 UI로 입력한다.
- [ ] 샌드위치: 확정한 입력 초안 또는 성공 명령의 실제 저장 계약을 조사해 marker를 작성·복원한다. 미전송 값이 저장 대상이라고 추측하지 않는다.
- [ ] 추상화: 최초 맛보기 처리 후 현재/목표의 marker를 작성한다. 순서도: 편집 가능한 기호 marker 또는 연결을 작성한다. 완료/제출과 초안 복원을 구분한다.
- [ ] 준비된 인증→대상 수업→marker 입력→명시 저장→저장 완료→reload→marker 복원을 검사한다. 실제 작품이 바뀌는 조작을 선택하며 저장 표시만으로 성공을 판정하지 않는다.
- [ ] 저장 전용 변경은 실패/기존 기록/나갔다 다시 열기를 확장한다. 세션별 조회/사용자 식별 영향이 있을 때만 실제 logout/login을 추가한다.
- [ ] 선택 수업 ID가 없거나 미지원/빈 배열이면 실패하게 한다. 전체 실행에서는 모든 등록 수업을 수집한다.
- [ ] 기존 학생/반/작품 변경 범위를 조사해 before/after 복원한다. 시드 교체 전 about:blank로 이전 편집기를 분리하며 별도 합성 계정 사용 시 Auth·DB·제한 장부를 정리한다.
- [ ] 저장/제출 변경 후보의 실패·중복·응답 유실/지연·불완전 입력·이전 제출 보존이 기존 spec에 있는지 확인한다. 없는 조건만 기존 spec에 회귀를 추가한다.
- [ ] 해당 수업 기본 흐름을 실패 조건으로 먼저 실행한 뒤 최소 구현하고 동일 조건으로 재검사한다. 에뮬레이터가 이미 실행 중인 경우에만 `npm.cmd run test:e2e:running -- tests/lesson-smoke.spec.ts`를 사용한다.

**완료:** 데이터 변경의 명시 저장/reload 후 같은 marker가 복원된다. 기록 정리/복원이 끝나고 필요한 실패 회귀가 포함된다. 로그인 UI 검사와 준비된 인증 smoke를 구분한다.

## 작업 3 — 보수적인 선택 판정

**Files:** scripts/e2e-scope.mjs, scripts/ci-policy.mjs, tests/e2e-scope.test.mjs, tests/ci-policy.test.mjs.

- [ ] 다음 실패 테스트를 먼저 작성한다: 문서만→docs; 빈 diff→full; 전용 경로→affected+smoke; 두 수업→합집합; 문서+전용→affected; 전용+공통 저장→full; 미분류→full; 수동 실행→full; 비교 실패→full.
- [ ] 작업 1의 exact-path 매핑을 코드로 등록한다. 순수 review engine 변경은 기존 `test:review` 실행이 포함되도록 유지한다. 부분 선택이어도 lint/typecheck/build/test:review는 첫 적용에서 유지한다.
- [ ] 테스트/선택 정책/runner/workflow/의존성/환경 설정 변경은 full로 우선 처리한다. 삭제·이동은 `--no-renames`의 양쪽 경로를 판단하며 allow 경로가 실제 사라진 경우 full로 처리한다.
- [ ] 기존 성공한 main push baseline 탐색을 유지한다. 실패/취소/수동/현재/nonancestor 기준 제외와 누적 비교를 보존한다.
- [ ] 회귀: 실패한 코드 후 문서 push→full 또는 해당 누적 기능 검사; 앞선 affected 성공 후 다른 수업 변경→다른 수업 검사; 앞선 실패한 수업+새 수업→둘 다 검사. 안전한 선택 성공은 다음 baseline으로 사용할 수 있다.
- [ ] `ignore-build`는 기존 docs-only 조건을 유지한다. affected 코드 변경은 Vercel 빌드를 생략하지 않는다.
- [ ] 판정 결과에 base/reason/lessonIds/testFiles를 넣고 Actions 출력과 JSON에 같은 값을 기록한다. 전용 scope 테스트를 기존 정책/문서 검사 단계에 추가한다.
- [ ] `node --test tests/ci-policy.test.mjs tests/e2e-scope.test.mjs tests/documentation.test.mjs`를 실행한다. mock뿐 아니라 실제 임시 Git 저장소에서 누적 변경/이동/없는 SHA 회귀를 확인한다.

**완료:** 모든 불확실성이 full로 귀결되고 누적 변경을 누락하지 않는다. 기존 문서 경량 검사·Vercel 문서 빌드 생략 계약이 유지된다.

## 작업 4 — 선택 실행기와 실패 기록

**Files:** scripts/run-selected-e2e.mjs, tests/e2e-scope.test.mjs, package.json.

- [ ] 실행기 실패 회귀: 없는 JSON/잘못된 mode/빈 affected/미지원 수업/존재하지 않는 spec/중복 항목/경로 이탈/테스트 수집 0개를 거부한다.
- [ ] JSON은 schema와 등록 목록으로 검증한다. `--list` 수집 결과에서 선택 spec과 smoke 대상이 실제 수집됐는지 확인한다. 불일치는 실패하며 조용히 생략하지 않는다.
- [ ] Playwright는 `process.execPath`와 설치된 CLI JS 경로로 spawn한다. 파일 목록은 argv 배열로 전달하고 임의 shell 문자열을 실행하지 않는다.
- [ ] 기본 실행은 Firebase CLI JS의 `emulators:exec --only auth,firestore --project demo-cs-class`를 사용한다. 자식 명령은 고정 `node scripts/run-selected-e2e.mjs --running`이며 계획 절대 경로는 환경변수로 전달한다. 사용자 입력을 자식 명령 문자열에 삽입하지 않는다.
- [ ] `--running`은 demo 프로젝트/두 호스트 확인 후 사용한다. `CI` 유무에 따른 dev/start 차이를 기존 스크립트대로 유지한다. CI는 먼저 build한 뒤 next start다.
- [ ] full은 전체 spec, affected는 정확한 선택 파일+선택 smoke, docs는 E2E 실행 없음이다. full에서는 상속된 `CS_SMOKE_LESSON_IDS`를 제거하여 모든 등록 수업을 수집한다. stdout은 요약 중심이되 실패 진단은 파일에 보존한다. 종료 코드/시그널/에뮬레이터 실패를 상위 실행에 전달한다.
- [ ] 실패 캡처/trace의 기존 설정을 유지한다. 성공 시 캡처는 UI가 변경된 대표 화면만 읽고, 캡처 생성과 에이전트 이미지 분석을 구분한다. 전체 성공 캡처/영상 저장 옵션을 기본으로 켜지 않는다.
- [ ] package.json에 `test:scope`(Node 정책/문서 회귀), `test:e2e:scope`(선택 runner)만 추가한다. 기존 전체 검사 명령은 유지한다.

**완료:** 0개 검사/자식 실패가 성공으로 바뀌지 않는다. 같은 계획을 로컬과 CI가 해석하며 학생 자료/비밀을 결과 파일에 담지 않는다.

## 작업 5 — 로컬 통합 후 CI 연결

**Files:** .github/workflows/verify.yml, 기존 테스트 설정(필요한 경우만).

- [ ] 기존 서버 PID·명령·demo 환경·fixture를 확인한다. 사용 중인 기록이 있으면 export하고 해시를 기록한다. 충돌 시 포트를 바꾸거나 잘못된 서버를 종료하지 않는다.
- [ ] `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run test:scope`, `npm.cmd run test:review`를 실행한다. 새 코드/테스트 오류를 먼저 수정한다.
- [ ] `npm.cmd run build`를 한 번 실행한 뒤 각 등록 수업의 선택 실행을 확인한다. 기본 smoke·혼합 수업·필요한 회귀가 실제 실행되는지 결과 목록을 대조한다.
- [ ] 정책/인프라 변경의 최종 통합은 full이므로 전체 E2E를 한 번 실행한다. 관련 선택 실행은 선택기의 연결 검증, 전체 실행은 앱 회귀 검증이며 목적을 구분한다.
- [ ] workflow의 설치/캐시/정적 검사/빌드/Java/Chromium 조건을 `mode != docs`로 수정한다. 기존 `mode == full` 조건을 남겨 affected가 무검사 성공하는 오류를 방지한다.
- [ ] E2E 단계는 선택 runner를 사용한다. `app` job 이름·운영 공개 gate·main push/수동 full·단일 worker·push concurrency는 유지한다.
- [ ] 실패 시에만 `test-results`의 캡처/trace/요약을 Actions artifact로 보관한다. 보존 기간은 7일, 운영 환경파일/쿠키 원문/학생 자료 포함 금지. 예상 결과 목록은 Actions 요약에 남긴다.
- [ ] workflow 안의 모든 mode 조건·출력 경로·수집 실패 전파를 검토한다. 변경한 외부 action/API는 해당 버전 공식 문서/Context7 확인 범위를 기록한다.

**완료:** docs는 앱 검사 생략, affected는 빌드+선택 E2E, full은 전체 E2E다. 선택 모드도 app 성공 전에 필요한 검사가 끝난다.

## 작업 6 — 문서·인계·사용자 확인 방식 반영

**Files:** AGENTS.md, DEVELOPMENT.md, README.md, HANDOFF.md.

- [ ] AGENTS에는 범위 판정·Playwright 기본·computer use 명시 요청 조건·수동 확인 전달만 짧게 추가하고 세부 기준은 DEVELOPMENT를 링크한다.
- [ ] DEVELOPMENT에 현재 구현 상태와 선택 명령·범위 승격·기본 흐름·결과 재사용 기준을 반영한다. 제안/구현/실행 확인을 구분한다.
- [ ] README에는 사람에게 필요한 설명과 DEVELOPMENT 링크만 남긴다. 에이전트 인터페이스/회귀 목록을 복제하지 않는다.
- [ ] HANDOFF 첫머리에 현재 브랜치·미커밋·다음 행동을 기록한다. 날짜/OS/소스 SHA/선택 목록/실제 수집·통과 수/실행 시간/실패·skip/한계를 남긴다.
- [ ] 사용자 수동 확인 양식: `확인 이유 / 시작 화면·계정 / 조작 1–N / 기대 결과 / 알려주실 정보`. 저장값/개인정보를 채팅으로 요청하지 않는다.
- [ ] 보고는 `자동 검사 결과 / 확인한 대표 화면 / 미확인 및 사용자 확인 요청`으로 구분한다. 수동 확인이 필요하면 해당 완료 조건은 대기로 기록한다.
- [ ] `node scripts/check-docs.mjs`, `node --test tests/documentation.test.mjs`, `git diff --check`로 문서·링크·공백을 검사한다.

**완료:** 에이전트는 정확한 조건/명령으로 실행할 수 있고 사용자는 변경·확인·남은 조작을 이해할 수 있다. 지속 기준은 중복되지 않는다.

## 작업 7 — 승인된 외부 검증·효과 측정·복구

- [ ] 사용자 승인 범위에 포함된 때만 작업 브랜치 push·수동 CI·main 반영·Preview/운영 공개를 수행한다. 이번 계획 작성은 해당 실행을 승인한 것으로 해석하지 않는다.
- [ ] 테스트 정책 변경 커밋 자체는 full이다. main 반영 후 같은 SHA의 app 성공·배포 SHA·운영 별칭·익명 session/login 화면을 확인한다. 선택 검사만 성공했다고 운영 실제 로그인/저장을 성공으로 기록하지 않는다.
- [ ] 이후 승인된 실제 전용 수업 변경에서 affected를 확인한다. 시간 측정만을 위해 무의미한 코드 변경이나 배포를 만들지 않는다.
- [ ] 각 실행의 base/head·mode·testFiles·수집/실행 개수·Actions app/E2E 시간·공개 대기 시간을 기록한다. 서로 다른 변경/캐시 상태의 단일 결과로 절감률을 단정하지 않는다.
- [ ] 선택 누락/0개 실행/범위 오판이 있으면 자동 선택을 중지한다. 승인된 수동 full 실행 후 원인을 수정하며 통과 기준을 낮추지 않는다.
- [ ] 복구는 해당 CI 선택 변경을 되돌려 기존 docs/full 정책과 전체 E2E를 사용한다. Vercel app gate는 해제하지 않는다. 복구 변경도 full로 검증한다.
- [ ] 구현·검증 완료 후 계획을 docs/archive로 옮길 때 원본 해시/manifest·활성 링크를 갱신한다. 실제 CI 확인이 남아 있으면 계획을 완료 보관하지 않는다.

**최종 완료 조건:** 증명된 전용 변경은 관련 검사+필요한 데이터 변경/명시 저장/reload 복원을 실행한다. 로그인/로그아웃은 인증·공통 저장·세션 식별 영향에 맞춰 적용한다. 공통/불명확 변경은 full, 문서는 docs다. 검사 누락이 성공으로 처리되지 않으며 필요한 수동 확인·실제 CI·운영 한계를 명시한다.

## 이번 계획 작성의 상태

2026-10-13 Asia/Seoul. `main`을 `0c61e46`으로 fast-forward한 뒤 `codex/verification-plan`에서 계획A의 A0 조사·scratch 합성 before 계측·문서 개정을 마쳤다. 손들기 저장 예외/위치-only 경고 없음 결정을 반영했고 모든 국소 수정의 실제 login/logout 필수는 제거했다. 제품 구현/추적된 테스트 추가/CI 실행/커밋/push/배포 없음. 초기 경로/검사 연결은 조사 후보이며 작업 1의 본문·소비 경로 검토를 통과하기 전 allow 목록으로 사용하지 않는다.
