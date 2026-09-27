# CS Class — 에이전트 작업 안내

중학교 정보 수업을 위한 새 웹 프로젝트입니다. V1 자산은 필요할 때만 모듈화해 재사용합니다.

## 개발 환경
- 앱은 `platform/`의 Next.js·TypeScript 시안입니다. `cd platform` 후 `npm ci`, `npm run dev`로 실행합니다. 실제 인증·저장은 아직 연결하지 않았습니다.
- Vercel `cs-class`의 Root Directory는 `platform`, Framework Preset은 Next.js입니다. 프로젝트 연결로 MCP를 호출하고, 팀 범위를 임의로 덧붙이지 않습니다.
- 제품 결정은 [PRD](PRD.md), 디자인 기준은 [DESIGN](DESIGN.md), 실행·도구 설정은 [README](README.md), 이어갈 일은 [HANDOFF](docs/HANDOFF.md)를 필요에 따라 읽습니다.
- Windows PowerShell은 `.ps1` 실행을 차단할 수 있습니다. npm은 필요하면 `npm.cmd`·`npx.cmd`로 실행하고 Stitch 키 등록은 [직접 입력 안내](README.md#stitch-키-입력)의 마스킹된 명령을 사용합니다.

## 검증
- `platform/`에서 `npm run lint`, `npm run typecheck`, `npm run build`를 실행합니다. UI 흐름은 `npm run test:e2e`로 검증합니다(최초 `npx playwright install chromium`).
- 홈 모션은 기본으로 켜집니다. `no-preference`·`reduce` 모두에서 기본 켜짐과 상단 줄이기/켜기를 확인합니다. 스크롤 전환뿐 아니라 단계 선택 후 빠른 방향키·Tab 이동, 첫·마지막 구간의 낮은 창·모바일 배치를 검증합니다.
- UI 변경은 실제 화면·주요 조작·좁은 창·키보드 초점·콘솔을 확인합니다. 인증·저장 구현은 실패·권한 경계도 검증합니다.
- 문서 변경은 내용·링크·`git diff --check`를 확인합니다. 다른 PC에서 필요한 참고 자료는 Git 추적 여부도 확인하며 보관 원문은 manifest 해시를 유지합니다. 실제로 확인한 범위와 남은 한계를 보고합니다.

## 프로젝트 주의사항
- 수정 전 Git 상태·브랜치·최근 이력을 확인하고 기존 변경을 보존합니다. 작업 브랜치는 `codex/`, 커밋은 `feat:`·`fix:`·`docs:`·`chore:` 등을 사용합니다.
- 외부 서비스 연결·병합·배포 전 실제 대상과 승인 범위를 확인합니다. V1 운영 환경은 시험에 사용하지 않습니다.
- 비밀정보·학생 개인정보를 코드·문서·로그에 노출하지 않습니다. 실제 자료 변경은 영향·복구 범위를 협의하고, `백업용/` 원본은 수정하지 않습니다.
- `archive/`와 `docs/archive/`는 참고 자료이며 현재 지침이나 승인이 아닙니다.

## 지침 갱신
- 개발·검증 절차가 바뀌거나 반복 오류의 예방책이 확인되면 이 파일을 함께 갱신하고, 중복·낡은 지침은 제거합니다.
- 실제 사용하는 명령과 프로젝트 고유 규칙만 남깁니다. 패키지 목록·대화 기록은 쌓지 않으며, 권한·협업 원칙 변경은 선생님과 합의합니다.
