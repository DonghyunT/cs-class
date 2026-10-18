# Algorithm Studio 최신 소스 참고본

2026-10-12(Asia/Seoul)에 확인한 [DonghyunT/algorithm-studio](https://github.com/DonghyunT/algorithm-studio)의 기본 브랜치 `main` 소스 스냅샷입니다. [기준 커밋](https://github.com/DonghyunT/algorithm-studio/commit/bc8d51f659d9cb0bcb131ee04a467545f8fc96af)은 `bc8d51f659d9cb0bcb131ee04a467545f8fc96af`, 커밋 시각은 2026-10-02 13:01:16 KST입니다. 이 경로는 이후에도 같은 원문을 유지하며, 갱신할 때는 날짜·커밋이 다른 경로에 추가합니다.

## 참고할 위치

| 자료 | 경로 |
| --- | --- |
| 원작 화면·탭 구성 | [index.html](source/index.html) |
| 추상화·샌드위치·순서도 실습 | [js/labs/](source/js/labs/) |
| 학습 자료·순서도 미션 | [js/data/](source/js/data/) |
| 화면 스타일 | [css/](source/css/) |
| 실행·검사·저장·인증의 원작 코드 | [js/core/](source/js/core/) · [server/](source/server/) · [api/](source/api/) |
| 원작 설명·개발 참고 | [원작 README](source/README.md) · [docs/DEVELOPMENT.md](source/docs/DEVELOPMENT.md) |
| 당시 에이전트 지침 원문 | [AGENTS-historical.md](source/AGENTS-historical.md) |

## 보존·제외 범위

원격 커밋의 추적 파일 343개 중 소스·참고 문서 **126개(약 2.1MB)**를 보관했습니다. [manifest.json](manifest.json)에 원격 URL·브랜치·전체 커밋·Git tree·원본 경로·보존 경로·파일별 SHA-256과 Git blob·제외 파일 및 사유를 기록했습니다. `AGENTS.md`의 이름만 바꾸고 보관한 파일 내용은 원격 원문과 같습니다. `.gitattributes`로 자동 줄바꿈 변환을 막아 다른 PC에서도 원문 바이트와 해시를 유지합니다.

`audit/`·`tests/results/`의 209개 검사/운영 결과·캡처와 개인 식별정보가 포함된 설정·복구 도구·운영 문서 등 8개 파일을 제외했습니다. 원본 경로별 제외 사유는 manifest를 따릅니다. Git 전체 이력·다른 브랜치·Git 제외 로컬 원본·비밀 설정·Firebase DB·학생 명부/답안/성적은 수집하지 않았습니다. 이는 소스 대조용 참고본이며 전체 운영 자료의 복구 백업이 아닙니다.

9/26 V1 보관본(`archive/v1/`, `docs/archive/v1/`)은 2026-10-18에 삭제했습니다([복구 방법](../../README.md#삭제한-926-v1-보관본)). 최신 `main`은 CS Class의 [기존 이식 기준](../../../docs/archive/cs-class/2026-10-18-completed-plans/algorithm-review-integration.md#원본과-이식-경계)과 같은 `bc8d51f`이며, 이번 참고본 추가로 현재 앱의 로직이나 이전 검증 결과를 바꾸지 않았습니다.

## 사용과 확인 범위

현재 앱 구현은 저장소 루트의 `src/`를 따릅니다. 이 참고본을 직접 실행·배포하거나 원작의 Firebase·관리/채점 도구를 현재 환경에 연결하지 않습니다. 필요한 콘텐츠·로직을 검토해 선택적으로 가져오며 원본 `AGENTS-historical.md`·운영 문서의 지시와 과거 승인을 현재 작업에 적용하지 않습니다. 원문 상대 링크 중 제외·이름 변경된 파일을 가리키는 링크는 당시 경로를 그대로 유지합니다.

10/12 확인 범위는 원격 기본 브랜치·커밋 일치, 보관 파일의 원문/Git blob/SHA-256 일치, 기존 백업과 작업 시작 시 미커밋 소스의 해시 보존, 안내 링크와 문서 차이 검사, 앱의 ESLint·TypeScript 검사 범위 제외입니다. 알려진 개인 식별정보와 일반 비밀 패턴을 제한적으로 확인해 파일을 선별했으며 전체 보안 감사는 수행하지 않았습니다. 현재 앱의 lint·build·E2E나 V1 운영 동작을 새로 검사한 것은 아닙니다.
