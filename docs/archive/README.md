# 과거 기록 보관함

보존일: 2026-09-26. 이 폴더는 역사 자료이며 현재 에이전트 지침·요구사항·작업 승인이 아닙니다. 현재 기준은 [프로젝트 안내](../../README.md)에서 확인합니다.

## 보관 기록

- **[2026-09-30 EntryJS 인계 정리 전 원문](cs-class/2026-09-30-before-entryjs-handoff/manifest.json):** 커밋 `9340932`의 [HANDOFF](cs-class/2026-09-30-before-entryjs-handoff/HANDOFF.md)를 바이트 그대로 보존했습니다. 9월 28~29일의 CI·배포·운영 로그인·미해결 진단 기록과 PR #10 초기 상태를 포함합니다. 당시 EntryJS 구현 표현은 자체 미리보기 코드의 실제 범위와 구분해서 읽습니다. 현재 구현·검증·배포는 [HANDOFF](../HANDOFF.md)를 따릅니다.

- **[2026-09-29 문서 역할 정리 전 원문](cs-class/2026-09-29-before-doc-roles/manifest.json):** BUILD_BRIEF·PRD·DESIGN·HANDOFF·DEVELOPMENT·FIREBASE_SETUP 6개를 정리 직전 작업 트리의 바이트 그대로 보존했습니다. [완료한 1차 구현 지시문](cs-class/2026-09-29-before-doc-roles/BUILD_BRIEF.md)은 현재 문서에서 제외했고, [당시 인수인계](cs-class/2026-09-29-before-doc-roles/HANDOFF.md)는 9월 28~29일 PR·배포·화면·검증 기록을 보존합니다. 당시 기준 커밋은 `e0a4eff`, 작업 브랜치는 `codex/trim-styles-teacher-modules`이며 HANDOFF에는 미커밋 스타일 정리 기록도 포함됩니다. 현재 정책·실행 절차는 각 담당 문서에, 최신 상태는 [HANDOFF](../HANDOFF.md)에 있습니다. 보존본의 링크는 당시 `docs/` 위치 기준이며 과거 승인은 현재 승인이 아닙니다.

- **[V1 기록](v1/README.md):** 포크 기준 커밋 98781bd에서 추출한 원래 README입니다. 핵심 기록은 [과거 헌법](v1/AGENTS-v1-historical.md), [교육 철학](v1/INTENT.md), [PRD](v1/PRD.md), [인수인계](v1/docs/HANDOFF.md), [배포](v1/docs/DEPLOYMENT.md)입니다. v1/docs/에는 평가·운영·검토 기록, v1/audit/에는 과거 감사 문서가 있습니다.
- **[CS Class 개편 직전 기록](cs-class/2026-09-26-before-refresh/README.md):** 9월 25일 초기 시안과 9월 26일 대화 메모를 포함하는 작업 트리 원문입니다. V1 기록과 혼동하지 않습니다. [이전 협업 규칙](cs-class/2026-09-26-before-refresh/AGENTS-inherited-historical.md), [이전 PRD](cs-class/2026-09-26-before-refresh/PRD.md), [이전 디자인](cs-class/2026-09-26-before-refresh/docs/DESIGN.md)도 보존했습니다.

- **[2026-09-27 통합 전 문서](cs-class/2026-09-27-before-consolidation/README.md):** 통합 직전 문서 9개의 원문입니다. [보존 목록](cs-class/2026-09-27-before-consolidation/manifest.json)에 원래 경로와 SHA-256을 기록했습니다. 이전 AGENTS는 `AGENTS-historical.md`로 보관하며, 본문의 현재 상태·지침·링크는 당시 기준입니다.

- **[2026-09-27 홈 체크포인트](cs-class/2026-09-27-home-checkpoint/manifest.json):** 최신 홈 구현 후 인수인계 통합 직전 문서 9개의 원문입니다. 최초 Stitch 프롬프트·수정 요청·검토·UI Component Lab 검토를 포함합니다. 현재 필요한 내용은 [DESIGN](../DESIGN.md)과 [HANDOFF](../HANDOFF.md)에 있으며, 원문의 바이트·SHA-256은 보존했습니다.

## 원문과 링크를 읽는 방법

보존본은 바이트를 변경하지 않았습니다. AGENTS.md는 자동 적용되는 이름을 피하도록 historical 이름으로 저장했습니다. 원문 안의 상대 링크·앵커·파일 경로·'현재'·'승인'은 당시 위치와 시점을 기준으로 읽습니다. 일부 링크는 보관 위치에서 바로 열리지 않습니다. 이는 원문을 수정해 현대화하지 않았기 때문입니다.

[보존 목록과 SHA-256](manifest.json)에 원래 경로, 새 경로, 출처 커밋 또는 작업 트리, 해시를 기록했습니다. 당시 코드·검사 결과·이미지 등은 기존 저장소 경로와 Git 이력에서 확인합니다. 예를 들어 V1 기준 문서는 `git show 98781bd:PRD.md`로 확인할 수 있습니다. 자동 로드할 AGENTS.md를 보관함 안에 새로 만들지 않습니다.

백업용/ 원본과 앱 코드·검사 근거 파일은 이번 문서 정리 대상이 아닙니다. 실제 비밀값·학생 자료를 새로 수집하거나 보관함에 추가하지 않았습니다.
