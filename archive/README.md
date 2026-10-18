# 코드 보관함

현재 앱의 위치와 실행 방법은 [루트 README](../README.md)를 따릅니다. 이 보관함은 실행·배포 대상이 아닙니다.

## GitHub 최신 V1 참고본

2026-10-12(Asia/Seoul)에 [DonghyunT/algorithm-studio](https://github.com/DonghyunT/algorithm-studio)의 기본 브랜치 `main`을 읽기 전용으로 확인했습니다. 최신 커밋은 `bc8d51f659d9cb0bcb131ee04a467545f8fc96af`이며 커밋 시각은 2026-10-02 13:01:16 KST입니다. [최신 참고본 안내](algorithm-studio/2026-10-12-bc8d51f/README.md)와 [파일별 보존·제외 목록](algorithm-studio/2026-10-12-bc8d51f/manifest.json)을 함께 확인합니다.

이 참고본은 소스·설계를 대조하기 위한 스냅샷입니다. 검사/운영 결과·캡처와 개인 식별정보가 포함된 일부 파일은 제외했고, Firebase DB·학생 자료·Git 제외 비밀 설정·전체 Git 이력은 수집하지 않았습니다. 원본 `AGENTS.md`는 내용 그대로 `AGENTS-historical.md`에 보존해 현재 지침으로 적용되지 않도록 했습니다.

이 자료의 운영 대상·지침은 과거 V1 기준입니다. Firebase 설정과 관리·채점 도구를 실행하지 마세요. 새 앱에는 필요한 콘텐츠나 로직을 검토해서 선택적으로 가져옵니다.

최근 CS Class 이식에서 사용한 V1 기준도 `bc8d51f`입니다. 이식 근거는 [알고리즘 복습 이식 기록](../docs/archive/cs-class/2026-10-18-completed-plans/algorithm-review-integration.md#원본과-이식-경계)을 따릅니다. 이후 갱신도 기존 원문을 덮어쓰지 않고 날짜·커밋이 다른 경로에 추가합니다.

외부 Git 원문을 추출할 때는 `git -c core.autocrlf=false archive`로 Windows의 줄바꿈 변환을 끄고 Git blob·SHA-256을 대조합니다. 새 보관 경로의 `.gitattributes`도 함께 유지해 다른 PC에서 체크아웃할 때 원문 해시가 바뀌지 않도록 합니다.

## 삭제한 9/26 V1 보관본

2026-09-26에 옮겨 둔 `archive/v1/`(V1 코드·검사 결과·감사 캡처)과 그 보존 목록 `archive/manifest.json`, `docs/archive/v1/`(V1 문서)은 2026-10-18에 사용자 승인으로 삭제했습니다. 위 참고본의 옛판이라 내용이 겹치고, 참고본이 개인 식별정보 때문에 제외한 파일이 남아 있었기 때문입니다.

필요하면 삭제 직전 커밋에서 되살립니다: `git checkout b053c2e -- archive/v1 archive/manifest.json docs/archive/v1`. 개편 전 원래 경로의 전체 시안은 `cs-class-prototype-2026-09-26` 태그로도 복구할 수 있습니다.
