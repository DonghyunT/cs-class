# 2026-11-05 감사 후속 구현·검증

기준 `main`의 `ddf0fa2`, 작업 브랜치 `fix/classroom-activity-recovery`입니다. 사용자는 구현·검증·PR 생성까지만 승인했습니다. 병합·운영 배포·전체 E2E는 이 작업에 포함하지 않습니다.

## 변경

- 작업실의 실제 조작을 초당 최대 한 번 `activity` 메시지로 전달합니다. 함수 편집·방향키만으로 조작해도 세션 활동을 갱신하며, 공통 서버 보고 간격은 유지합니다. 합성 이벤트는 제외합니다.
- 소비자가 없는 `nameRun`·`name-start`·`name-run` 기록만 제거합니다. 질문 입력칸의 접근성·길이 제한, 실행 중 캡처, 질문 대기·실행 제한은 보존합니다.
- 공통 API는 일반 65초·AI 50초로 본문 읽기까지 제한합니다. 성공 응답을 읽지 못하면 `NETWORK` 오류로 입력을 보존하고, 저장 수동 재시도·불확실한 채점/제출 결과 확인을 재사용합니다. 자동 재전송은 없습니다.
- Firebase 비밀번호 오류 분류를 순수 함수로 분리했습니다. 네 가지 자격 증명 오류의 4xx만 오답으로 처리하고, 같은 문구를 담아도 5xx는 서비스 장애로 처리합니다.

현재 계약은 [개발 안내](../DEVELOPMENT.md#학생-수업-수동-저장-아키텍처-및-계약)를 따릅니다.

## 검증

- 실패 재현: 기존 코드에서 함수 편집 중 실제 자동 로그아웃, 일반 요청의 신호 누락, 성공 본문 오류를 빈 객체로 반환함을 확인했습니다. 인증 분류를 기존 로직 그대로 분리한 뒤 5xx 오답 분류도 재현했습니다.
- `npm.cmd run test:review -- --output=scratch/logic-final`: Node 검사 16개·로직 112개 통과.
- `npm.cmd run test:scope`: 37개 통과. `node --test tests/documentation.test.mjs`: 3개 통과.
- lint·typecheck·demo 환경의 `npm.cmd run build` 통과. 문서 링크·공백 검사 통과.
- 파일 지정 E2E 11개 스펙: 120개 통과·4개 건너뜀(일시 중지된 손들기 검사, 통과로 세지 않음). 별도 활동 메시지 빈도·합성 입력 무시·JavaScript 오류 검사 1개도 통과했습니다.
- 대상: `functions`, `manual-save-entry`, `work-action-recovery`, `auth-security`, `settings`, `first-entry`, `read-polling`, `classroom-api`, `programming-name-mission`, `programming-classroom`, `manual-save`의 `.spec.ts`. 명령은 `npx.cmd playwright test tests/<이름>.spec.ts ... --output=scratch/audit-e2e-isolated`, 추가 검사는 `tests/functions.spec.ts --grep '초당 한 번'`입니다.
- [PR #107](https://github.com/DonghyunT/cs-class/pull/107)의 첫 자동 CI는 정적·로직·빌드 검사를 통과했지만, 선별 E2E는 110개 통과·1개 실패했습니다. 함수 편집 버튼을 좌표로 누른 직후 편집 상태가 되기를 기다리는 준비 단계가 실패했습니다. SVG 그룹의 안정화를 기다려 클릭하고 드래그 대상을 ‘함수 정의하기’로 명시했습니다. 활동·로그아웃 검증은 유지했습니다. 로컬 production 빌드에서 해당 검사 `--repeat-each=3`은 3개 모두 통과했습니다(`scratch/ci-editor-stable`).
- 이어서 `tests/functions.spec.ts --grep '실제 조작만|실행 중 방향키만'` 2개, lint·typecheck·문서 단위 3개·링크·공백 검사도 통과했습니다. 수정본의 자동 CI 결과는 PR의 `app` 검사를 확인합니다.

## 환경과 남은 범위

초기 선별 실행은 다른 로컬 프로젝트의 에뮬레이터 포트 점유·Auth 기본 프로젝트 불일치로 중단했고 통과 결과로 세지 않습니다. 사용자 승인으로 그 프로젝트를 백업·임시 전환한 뒤 `demo-cs-class` 전용 에뮬레이터에서 재검증했습니다. 초기 실행이 다른 데모에 만든 합성 계정 2개는 정리했고, 복원 후 계정·Auth 설정·Firestore 레코드가 백업과 일치함을 대조했습니다. 비교 도구의 첫 실패 출력에 가상 계정 값이 포함되어 그 뒤로는 일치 여부·차이 필드 이름만 출력했습니다. 로컬 앱에서 재로그인이 필요할 수 있습니다.

독립 읽기 전용 코드 리뷰에서 실질 회귀 지적은 없었고, 활동 메시지 빈도 검사 보완을 반영했습니다. 전체 E2E, 실제 학교 PC, 운영 로그인·학생 데이터, 유료 AI 호출은 확인하지 않습니다.
