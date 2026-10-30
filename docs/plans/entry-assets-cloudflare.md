# 엔트리 라이브러리 파일 Cloudflare 분리 계획

작성: 2026-10-30(Asia/Seoul). 상태: **구현 중(`feat/entry-assets-cloudflare`), push 전**. 근거 조사는 [인계 보고서](../reference/2026-10-29-entry-assets-cloudflare-handoff.md)입니다. 이 계획은 그 보고서의 추천안을 더 작게 줄인 것입니다.

## 1. 문제와 목표

10/30 오전 Vercel 무료 한도(최근 30일)는 CDN 요청 865K/1M, 함수 호출 767K/1M, Active CPU 3h7m/4h입니다. 엔트리 수업이 있는 날은 하루 10만~18만 건을 쓰고, 많이 쓴 날(10/21~)이 집계에서 빠지는 것은 11/20 무렵입니다. #94(브라우저 하루 캐시)·#95(프록시를 사전 요청에만)는 다시 들어올 때와 함수 호출을 줄였지만, PC마다 처음 여는 작업실의 라이브러리 파일 요청(약 90건)은 그대로 Vercel로 갑니다.

**목표:** 엔트리 라이브러리(`public/entryjs/vendor/`)만 Cloudflare Workers 정적 파일(무료 플랜도 정적 요청 무료·무제한)에서 직접 받게 해 Vercel 요청을 줄입니다. 앱 전체 이전은 하지 않습니다(10/30 사용자와 정함: 무료 플랜 CPU 10ms, Next.js 어댑터 beta, `firebase-admin` 호환 위험).

## 2. 정한 설계와 이유

| 항목 | 정한 것 | 이유 |
| :--- | :--- | :--- |
| 옮기는 파일 | `public/entryjs/vendor/`만 | 작업실 HTML·JS·CSS는 Vercel에 둡니다. `workspace.js`가 부모 창과 `location.origin`으로 메시지를 주고받아 같은 주소여야 하고, 9월 이후 20번 바뀔 만큼 자주 고쳐서 버전이 어긋나면 위험합니다. |
| 작품 속 그림 주소 | 바꾸지 않음 | 저장된 `/entryjs/sprites/…`·`/entryjs/vendor/…/media/` 주소는 작업실 주소(Vercel) 기준으로 그대로 열립니다. 한 번에 몇 건이고 하루 캐시가 있어, 보고서의 JSON 주소 변환(저장·검증·제출 경계마다 복원)을 하지 않아도 됩니다. 남는 Vercel 요청은 검사로 셉니다. |
| 주소 전환 위치 | 빌드 때 `scripts/prepare-entryjs.mjs`가 `workspace.html`의 `/entryjs/vendor/` 주소를 CDN 주소로 바꿈 | 정적 HTML은 환경변수를 못 읽습니다. `VERCEL_ENV=production` 빌드에서만 바꾸고, 로컬·CI·E2E는 지금처럼 로컬 파일을 씁니다. Vercel 설정은 바꾸지 않습니다. |
| CDN 주소 | 저장소의 설정 파일 한 곳(주소가 비어 있으면 로컬 파일) | 되돌리기는 이 값을 비우는 커밋 하나입니다. |
| 버전 | `/<라이브러리 지문>/vendor/…`(지문은 이미 `.prepared`에 쓰는 `entryjs-assets.json` SHA-256) | 라이브러리를 올리면 주소가 바뀌어 섞이지 않습니다. |
| 안전장치 | 운영 빌드가 CDN에 그 지문의 표시 파일이 있는지 확인하고, 없으면 로컬 주소로 빌드 | CDN을 먼저 올리지 않고 라이브러리를 바꿔도 운영이 깨지지 않습니다. |
| 작업실 `libDir` | HTML의 `entry.min.js` 주소에서 계산 | 하드코딩 없이 로컬·CDN 모두 맞습니다. |
| Cloudflare 쪽 | Worker 코드 없이 정적 파일만(`_headers`로 CORS `*`·1년 `immutable` 캐시) | 서버 코드가 없으면 요청이 무료·무제한입니다. 소리 로더의 사전 요청(OPTIONS) 처리 여부는 구현 때 확인하고, 필요할 때만 최소 Worker를 둡니다. |

## 3. 작업 루프

작업마다 **만들기 → 그 루프의 완료 기준 확인 → 커밋**을 한 바퀴 돌고 다음으로 넘어갑니다(10/30 사용자 요청). 완료 기준을 못 채우면 다음 루프로 가지 않고, 같은 방법이 두 번 실패하면 멈추고 기록합니다. 전체 E2E는 승인받지 않았으므로 돌리지 않습니다.

| 루프 | 만들 것 | 완료 기준 |
| :--- | :--- | :--- |
| L1 작업실 `libDir` | `workspace.js`가 `libDir`를 HTML의 `entry.min.js` 주소에서 계산 | 지금(로컬 주소)과 동작이 같음: 파일 지정 E2E `entryjs-ui`·`programming-classroom` 통과 |
| L2 주소 바꾸기 | 설정 파일(`scripts/entryjs-cdn.json`)과 `scripts/entryjs-cdn.mjs`(HTML 바꾸기·지문 확인), `prebuild` 연결 | 단위 검사 통과(주소 비면 그대로, 운영 빌드만 바꿈, CDN에 지문 없으면 그대로). 바꾼 HTML이 Git에 남지 않음 |
| L3 CDN 모드 E2E | Playwright가 가짜 CDN(`https://entry-cdn.test`)을 로컬 파일로 응답하는 새 검사 | 작업실 로딩·실행·소리·저장, 라이브러리 요청이 앱 서버로 0건, 저장된 작품에 CDN 주소 없음. 남는 앱 서버 요청 수를 기록 |
| L4 Cloudflare 묶음 | 묶음 만들기(`_headers`·`version.txt`), `wrangler` devDependency(10/30 승인)·설정, `npm run deploy:entry-cdn` | `wrangler dev`로 로컬에서 CORS·캐시 헤더·소리 사전 요청(OPTIONS)·404 확인. 실제 배포는 하지 않음 |
| L5 연결·문서 | `scripts/e2e-scope.mjs` 연결, DEVELOPMENT §4.1·FIREBASE_SETUP 절차, HANDOFF | `test:scope`·`check-docs`·`git diff --check origin/main` 통과 |
| QA | 이 계획을 모르는 리뷰어(서브에이전트)가 diff를 검토, typecheck·lint·build, 선별 E2E 전부(`programming-classroom`, `manual-save-entry`, `programming-learning`, `programming-mission-navigation`, `entryjs-ui`, `conditionals`, `loops`, 새 검사) | 지적을 고치거나 이유를 남김, 검사 통과 개수 기록 |

QA 뒤 커밋까지만 합니다. push·PR, Cloudflare 첫 배포(사용자 로그인 필요), 학교 PC에서 `workers.dev` 접속 확인은 사용자에게 다시 묻습니다.

## 4. 반영 순서(push 뒤, 승인 필요)

1. 사용자가 `npx wrangler login`으로 로그인하면 `npm run deploy:entry-cdn`으로 Cloudflare에 올립니다.
2. 학교 PC에서 CDN 주소의 파일 하나가 열리는지 봅니다. 막히면 이 방법은 중단합니다.
3. 설정 파일에 CDN 주소를 넣고 PR → CI → 병합합니다. 공개 뒤 작업실을 열어 라이브러리 파일이 CDN에서 오는지 확인합니다.
4. 며칠 동안 Vercel 사용량 그래프로 효과를 봅니다.

## 5. 남는 위험

- 라이브러리를 바꿀 때 CDN에는 최신 버전만 남습니다. 바꾸는 순간 열려 있던 탭은 다시 열어야 합니다(라이브러리는 9/30 이후 바뀌지 않음).
- 학교망이 `workers.dev`를 막으면 쓸 수 없습니다.
- CDN 장애 때 자동으로 Vercel 파일로 돌아가지 않습니다. 설정을 비우고 다시 배포해야 합니다.
