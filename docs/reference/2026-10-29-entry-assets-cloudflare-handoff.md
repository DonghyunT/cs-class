# 엔트리 파일 Cloudflare 분리 — 자가검증·인계 보고서

작성: 2026-10-29(Asia/Seoul). **검토 자료이며 이전 구현·운영 반영은 미착수입니다.** 현재 규칙은 [AGENTS](../../AGENTS.md), 진행 상태는 [HANDOFF](../HANDOFF.md)가 기준입니다.

## 1. 요청과 인계 범위

- **배경:** 사용자가 Vercel 무료 CDN 요청 한도 75% 알림을 받았습니다. 당시 화면은 758,360/1,000,000회였고, 엔트리 정적 파일과 수업·인증 API 요청이 함께 집계됐습니다. 이 수치는 당시 표본이지 현재 사용량이 아닙니다.
- **목표:** 로그인·저장·채점은 Vercel, 데이터는 기존 Firebase에 두고 엔트리 공개 파일만 Cloudflare에서 직접 제공해 Vercel 요청을 줄이는 방안을 검토했습니다. 전체 앱 이전이나 Firebase 비용 절감이 아닙니다.
- **이번 승인:** 자가검증과 보고서 작성입니다. 이 문서는 코드 구현·패키지 설치·Cloudflare 게시·환경변수 변경·push·병합·운영 로그인·전체 E2E 실행의 승인이 아닙니다. 후속 작업은 AGENTS의 해당 승인 범위를 따릅니다.
- **Git 스냅샷:** `chore/entryjs-browser-cache`, HEAD `a876b7d`, 조회한 `origin/main`은 `694cc79`였습니다. 별도 에이전트의 하루 브라우저 캐시 변경이 앞선 1커밋으로 존재했습니다. 병합·운영 적용·CI 상태는 이 조사에서 확인하지 않았으므로 시작 전에 다시 조회하고, 해당 브랜치를 이전 작업용으로 바로 이어 쓰지 않습니다.

## 2. 결론과 실측 근거

**추천:** Cloudflare Workers Static Assets에 버전별 공개 파일을 배치하고 브라우저가 직접 요청합니다. 작업실 HTML·제어 JS/CSS와 iframe 보안 계약은 Vercel에 유지합니다. 서버 중계·리다이렉트로 파일을 전달하지 않습니다.

별도 포트의 로컬 HTTP 서버 두 개로 앱/파일 호스트를 재현했습니다. 기존 파일을 메모리에서만 변환했고 설치·실제 Cloudflare 접속·운영 DB 접근은 없었습니다. 캐시를 끈 Chromium 초기 로딩 결과입니다.

| 검증 경우 | 앱 서버 요청 | 파일 서버 요청 | 결과 |
| :--- | ---: | ---: | :--- |
| 프로그래밍 모드, 동일 주소 대조군 | 93 | 0 | 통과 |
| 같은 작품, 별도 주소의 파일 호스트 | 4 | 89 | 통과 |
| 기본 엔트리 작품, 별도 파일 호스트 | 4 | 74 | 통과 |

**수정 후 3건 통과·0건 실패.** 로딩·내보내기, 기존 파서 통과, 작품 의미 보존, 내보낸 JSON에 CDN 주소 없음, 캔버스 읽기 가능을 assert로 확인했습니다. 파일 누락·스크립트 오류·브리지 오류도 0건입니다. 앱 요청 4건에는 실험용 부모 HTML 1건과 작업실 HTML/JS/CSS 3건이 포함됩니다. 전체 서비스 절감률이나 Vercel 과금 실측으로 환산하지 않습니다.

자가검증에서 강화 검사가 처음에는 기본 1건 통과·기존 작품 1건 실패했습니다. 동일 주소 대조군에서도 오브젝트 이름 `공`이 깨졌고, 원인은 모의 부모 HTML의 UTF-8 지정 누락이었습니다. 문자셋을 지정한 뒤 위 3건과 대조군/CDN 결과의 동등성을 재확인했습니다. 앞선 대화의 단순 로딩 수치보다 이 표를 우선합니다. 실험은 일회성 `node` 표준입력으로 실행했으며 영구 테스트 파일로 보존하지 않았습니다.

## 3. 코드에서 확인한 변경 지점

| 근거 파일 | 현재 구조와 필요한 처리 |
| :--- | :--- |
| [workspace.html](../../public/entryjs/workspace.html) | 라이브러리 JS/CSS 주소가 고정돼 있습니다. 기존 순서를 유지하며 빌드 때 CDN용 HTML을 생성할 수 있습니다. 정적 HTML은 Next.js 환경변수를 직접 읽지 못합니다. |
| [workspace.js](../../public/entryjs/workspace.js) | `Entry.init`의 `libDir`, `Entry.loadProject`, `add-object`, `exportProject`가 경계입니다. `changed`·명시적 내보내기 모두 정규 경로로 반환해야 합니다. |
| [programming-entry.ts](../../src/lib/classroom/programming-entry.ts) | `parseProgrammingProject`는 그림 주소를 신뢰 목록과 정확히 비교합니다. `programmingProjectMatches`는 저장·검증·제출의 작품 동등성에 쓰이므로 약화하지 않습니다. |
| [entry-project.ts](../../src/lib/classroom/entry-project.ts), [name-entry.ts](../../src/lib/classroom/name-entry.ts) | 그림은 `vendor/`·`sprites/` 외에도 `/entryjs/name-dog.svg`에 있습니다. 폴더 두 개만 복사하면 누락됩니다. |
| [학생 작업실](../../src/components/student/entry-practice-workspace.tsx), [그림 선택기](../../src/components/student/entry-library-picker.tsx), [교사 작품 열람](../../src/components/teacher/entry-project-preview.tsx) | iframe 주소·그림/아이콘·새 오브젝트 전달을 함께 확인합니다. 학생 수업 미리보기도 공통 작업실을 사용합니다. |
| [prepare-entryjs.mjs](../../scripts/prepare-entryjs.mjs), [entryjs-assets.json](../../scripts/entryjs-assets.json) | 기존 SHA-512 검증을 재사용합니다. `.prepared`가 같으면 즉시 종료하므로 CDN 묶음/HTML 생성은 이 캐시와 별도로 실행해야 합니다. `public/entryjs/vendor/`는 Git 제외 생성물입니다. |
| [e2e-scope.mjs](../../scripts/e2e-scope.mjs) | 공통 엔트리 변경은 기초·조건·반복 검사에 연결돼 있습니다. 신규 CDN 보조 파일도 같은 선별 범위에 등록해야 합니다. |

## 4. 구현 시 지킬 설계 조건

1. **저장 형식 유지:** DB에는 기존 `/entryjs/…` 경로를 유지합니다. 표시할 때만 CDN 주소로 바꾸고, 작품 변경 통지·내보내기 전에 복원합니다. 학생 문장까지 바뀌는 JSON 전체 문자열 치환은 금지합니다. DB 일괄 변환·서버 그림 허용 목록 완화는 필요하지 않습니다.
2. **변환 범위 제한:** `objects[].sprite.pictures[]`의 그림 주소 필드 등 확인한 미디어 필드만 처리합니다. 정확한 CDN 호스트·릴리스 경로·허용 파일을 검증하고 임의 URL을 신뢰하지 않습니다. 실험의 단순 접두사 치환은 완성된 보안 구현이 아닙니다.
3. **iframe 유지:** `sandbox="allow-scripts"`, 발신 창·`event.origin`·채널 검사를 보존합니다. CDN 주소를 자유 입력 쿼리로 받아 스크립트를 실행하지 않습니다. 화면용 사본만 변환해 원본 초안과 비교 키가 오염되지 않게 합니다.
4. **경로 전수 확인:** HTML의 라이브러리, `libDir`가 만드는 소리/그림, 프로젝트 그림, 부모 화면의 썸네일, CSS의 상대/루트 경로를 확인합니다. CSS에는 `/media/…` 같은 별도 루트 참조도 있어 실제 사용·누락을 점검해야 합니다. 벤더 원문·기존 무결성 검사를 훼손하지 않습니다.
5. **버전 고정:** `/releases/<내용 기반 버전>/entryjs/…`를 사용하고 같은 버전을 덮어쓰지 않습니다. 버전 계산에는 라이브러리뿐 아니라 그림·소리·패키징 변경도 반영합니다. 현재·복구·사용 중 버전을 보존하고 누적 파일 수도 무료 한도 안인지 검사합니다.
6. **정적 호스트:** 서버 진입 파일 없이 `assets.directory`를 지정하고 `run_worker_first: false`로 직접 제공합니다. 버전 경로에 `Access-Control-Allow-Origin: *`, `Cache-Control: public, max-age=31536000, immutable`를 적용합니다. 공개 파일만 취급하며 인증 쿠키·키·학생 작품은 업로드하지 않습니다. 격리 iframe의 요청 출처가 `null`일 수 있어 CORS 검증에도 포함합니다.
7. **복구 가능:** 로컬/Vercel 원본 파일을 우선 유지합니다. CDN 설정을 비우고 재빌드·CI·배포해 원래 주소로 복귀할 수 있게 합니다. 즉시 전환은 아니며 이미 열린 탭에는 자동 적용되지 않습니다. 파일별 무제한 재시도·자동 대체로 버전을 섞지 않습니다.

## 5. 다음 에이전트의 순서와 완료 조건

1. **기준 재확인:** AGENTS → HANDOFF → 이 보고서 순서로 읽고 `git status -sb`, `git log -5 --oneline`, `git fetch --prune origin` 및 관련 PR/CI를 조회합니다. 캐시 변경의 실제 반영 여부와 개선 후 요청량을 확인합니다. 다른 작업을 보존하고, 구현을 요청받으면 최신 기준에서 별도 PR 경로로 시작합니다.
2. **재현을 정식 검사로 전환:** 원본을 그대로 보내지 말고 실제 화면처럼 파서의 `.project`를 전달합니다. 기본 작품은 `buildEntryProject`, 프로그래밍 작품은 `tests/fixtures/entry-legacy-objects.json`의 `ballBehindDog`와 `?exercise=programming&mission=move`를 사용합니다. UTF-8·정확한 MIME·CORS가 있는 두 주소에서 아래 동등성/오류 검사를 먼저 만듭니다.
3. **최소 구현:** 공개 CDN 기준 주소 한 곳, 파일 묶음 생성 스크립트, 빌드 시 HTML 생성, 미디어 경계 변환과 화면 이미지 연결을 구현합니다. 새 파일명·도구 버전은 구현 때 정합니다. 초기 설정이 비어 있으면 기존 로컬 파일로 동작해야 합니다.
4. **로컬 검증:** `demo-cs-class`·에뮬레이터에서 타입·린트·빌드와 파일 지정/선별 E2E를 실행합니다. 필요한 검사: `programming-classroom`, `manual-save-entry`, `programming-learning`, `programming-mission-navigation`, `entryjs-ui`, `conditionals`, `loops` 및 신규 CDN 검사입니다. 전체 E2E는 별도 승인 항목입니다.
5. **외부 반영:** 승인을 받은 뒤 Cloudflare 공개 파일 배포 → 응답/MIME/CORS/404/소리 로딩 확인 → 로컬 앱에서 실제 파일 호스트와 가상 작품 검증 → 학교망 접근 확인 → Vercel 연결 PR·CI·승인 범위 내 병합 순서입니다. 유료 기능·새 도메인·Preview는 전제로 하지 않습니다.
6. **효과·복구 확인:** 유사한 수업/PC/캐시 조건에서 호스트별 요청과 실패율을 비교합니다. 기존 작품의 저장·검증·제출·교사 열람이 정상이고 Vercel 파일 요청이 실제로 줄어야 완료입니다. 절차는 DEVELOPMENT/FIREBASE_SETUP의 해당 절에, 상태는 HANDOFF에 남깁니다.

| 필수 확인 | 통과 기준 |
| :--- | :--- |
| 기존·새 작품, 한글 이름/말풍선, 학생 변수·모양 변경 | 저장·재접속 후 의미 보존, CDN 주소 미잔류, 기존 검증·제출이 로딩만으로 무효화되지 않음 |
| `load`·새 오브젝트·`changed`·수동 내보내기·Ctrl+S | 모든 경계의 경로 복원과 기존 보안 검사 유지 |
| 실행·정지·그리기·소리·교사 인라인 실행 | 원래 기능 유지, 캔버스 보안·콘솔·파일 누락 오류 없음 |
| 외부 주소 위조·404·지연·호스트 차단 | 잘못된 주소 거부, 입력 보존, 반복 요청 폭주 없음 |
| 캐시 비움/재사용·이전 릴리스·CDN 설정 해제 | 버전 혼합 없음, Vercel 원본으로 복귀 가능 |

## 6. 한계와 공식 근거

- **확인하지 않음:** 실제 Cloudflare 배포, 학교망, 전체 앱 저장·채점·제출 E2E, 작품 수정 중 경합, 새 오브젝트 추가·모양 변경·모든 미션 실행, 장기 캐시·실제 장애·운영 절감률. 일회성 실험은 정식 회귀 검사를 대신하지 않습니다.
- 이 문서는 보고서 작성 단계입니다. 무료 유지나 특정 절감률을 보장하지 않으며 이미 쓴 Vercel 요청·Firebase/AI 사용료는 되돌아오지 않습니다.
- 문서 작성 검증: `node scripts/check-docs.mjs`(활성 문서 17개, 오류 0), `git diff --check origin/main` 통과. 문서·HANDOFF 링크만 작성했으며 앱 검사·커밋·push·배포는 하지 않았습니다.
- 공식 문서 확인일: 2026-10-29. [정적 요청 무료·무제한/저장 비용](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), [구성·직접 파일 제공](https://developers.cloudflare.com/workers/static-assets/binding/), [CORS·브라우저 캐시 헤더](https://developers.cloudflare.com/workers/static-assets/headers/), [무료 파일 수·개별 크기 한도](https://developers.cloudflare.com/workers/platform/limits/). 수치·서비스 조건은 실행 시 다시 확인합니다. 당시 로컬 `public/entryjs`는 1,297개·50.2MiB, 최대 파일 18,213,944바이트로 무료 20,000개·25MiB/파일 범위 안이었습니다. 실제 업로드와 보존 릴리스 전체는 별도 집계해야 합니다.
