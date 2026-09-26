# CS Class 시안 배포 기록

> 2026-09-26 문서 개편 안내: 아래는 9월 25일의 확인 기록입니다. 이번에는 배포 상태를 재조회하거나 새로 배포하지 않았습니다. 현재 제품 방향은 [PRD](../PRD.md), 다음 작업은 [HANDOFF](HANDOFF.md)를 따릅니다.

갱신: 2026-09-25 KST. 이 문서는 **CS Class 새 저장소**의 배포만 기록합니다. 기존 V1 운영 배포 기록은 [V1 기록](archive/v1/docs/DEPLOYMENT.md)입니다.

| 항목 | 현재 확인 |
|---|---|
| GitHub | 비공개 [DonghyunT/cs-class](https://github.com/DonghyunT/cs-class) |
| 작업 브랜치 | `codex/cs-class-foundation` |
| 배포 커밋 | `869416f59c21aedaa871ab8c523d4603033786cb` |
| Vercel 프로젝트 | `cs-class` / `prj_RUUtcTMukVY9kjudgDr6VA89KKxP` |
| 프로젝트 Root Directory | `web`으로 생성 |
| 배포 | `dpl_BYLcdqDmetsSG7e7E7s8jgF92aBa` / `READY` |
| 주소 | [CS Class 시안](https://cs-class-donghyunt.vercel.app/) |
| 보호 | Vercel SSO 보호가 적용되어 비로그인 요청은 로그인 경로로 302 이동 |
| Vercel 분류 | API는 `target: production`으로 보고함. **학생 운영판이나 실제 자료 연결을 뜻하지 않음** |

## 확인한 결과

- 새 주소를 로그인된 브라우저에서 열어 `CS Class — 즐거운 정보 교실` 공개 첫 화면과 시안 안내를 확인했습니다.
- 비로그인 HTTP 요청은 Vercel SSO로 302 이동했습니다.
- 로그인된 브라우저에서 `/api/evaluation`은 `404 NOT_FOUND`였습니다. V1 평가 API가 새 배포에 포함되지 않았다는 경계 확인입니다.
- 로컬 브라우저에서 공개 → 학생 → 순서도 연구소 → 교사 흐름, 390px 화면, 개념 퀴즈 오답·재시도, 가상 학생 추가 중복 차단, 5단계 가상 제출, 교사 마감을 확인했습니다. 콘솔 오류 0건.
- 실제 Firebase·AI API·학생 인증·권한 검증은 전혀 수행하지 않았습니다. 이 배포는 시안입니다.

## 이후 운영 조건

대표 화면 피드백이 확정되기 전까지 실제 저장 기능을 연결하지 않습니다. 개발용 Firebase에서 가상 학생으로 저장과 권한을 확인하고, 실학생 투입 전 학교 보관 규정을 확인해야 합니다. 이 시안은 V1 `main`이나 운영 사이트를 바꾸지 않았습니다.
