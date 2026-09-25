# CS Class 다른 PC·에이전트 인수인계

갱신: 2026-09-25. 이 문서는 새 **CS Class** 저장소의 현재 상태만 다룹니다. V1 운영 기준은 원래 `algorithm-studio` 저장소의 문서를 보세요.

## 읽는 순서

`AGENTS.md` → `INTENT.md` → `PRD.md` → 이 문서. 이후 `git status`, `git branch`, `git log -n 5`, `git fetch origin`으로 실제 Git 상태를 확인합니다. 새 PC에서 `main`을 무조건 운영 기준으로 보지 마세요.

## Git·환경

- 새 로컬 폴더: `D:\workspace\cs-class`.
- 새 비공개 원격: `https://github.com/DonghyunT/cs-class`.
- V1 전체 이력 복제 기준: `98781bd6e506e3ab5b1be08c39677e658215dba9`. 새 저장소 `main`은 이 기준본이며 CS Class 변경은 `codex/cs-class-foundation`에서 진행 중입니다.
- 원본 V1: `D:\workspace\algorithm-studio`, `DonghyunT/algorithm-studio`; 운영 사이트·평가 DB는 그대로 유지합니다.
- 새 배포 대상은 `web/`만입니다. 루트의 V1 `api/` 및 `js/data/firebase-config.js`를 사용하지 마세요.
- 별도 Vercel 프로젝트 `cs-class` (`prj_RUUtcTMukVY9kjudgDr6VA89KKxP`)의 [보호된 시안 주소](https://cs-class-donghyunt.vercel.app/)가 `869416f`에서 `READY`입니다. Vercel은 이를 `production` 대상으로 표시하지만 실제 학생 운영판이 아닙니다. [새 배포 기록](CS_CLASS_DEPLOYMENT.md)을 보세요. 기존 [V1 배포 기록](DEPLOYMENT.md)을 CS Class 현재 배포로 읽지 마세요.
- Firebase 실제 운영 후보: `cs-class-f74c4` (Firestore Standard, `asia-northeast3`). 아직 연결하지 않았습니다. 별도 개발용 Firebase는 아직 만들지 않았습니다. 기존 `donghyun-algo`나 V2 개발 프로젝트에 시안 데이터를 쓰지 않습니다.
- 비밀 키, 비공개 문항·정답, 학생 기록은 Git/PR/로그에 넣지 않습니다.

## 현재 작업

`web/index.html`, `styles.css`, `curriculum.js`, `app.js`에 가상 시안을 구현했습니다. 공개 어두운 홈, 밝은 학생·교사 홈, 순서도 연구소 개념·응용·5단계 실습, 가상 제출·마감·계정·기록실 화면입니다. 상태는 브라우저 탭의 `sessionStorage`에만 저장됩니다. 실제 학생 계정, 서버 저장, AI 검사, 제출, V1 자유 연결 캔버스는 **구현되지 않았습니다**.

## 바로 할 일

1. 시안의 대표 화면과 교실 흐름을 선생님과 검토하고 수정합니다.
2. 시안의 로컬·보호 배포 브라우저 확인에서 남은 좁은 화면·키보드·움직임 줄이기 조건을 피드백에 맞춰 보완합니다.
3. 별도 개발용 Firebase를 만들고 보안 규칙/인증/저장/API를 구현합니다. 실학생이 아닌 가상 계정으로 권한·재접속·제출·마감 회귀를 확인합니다.
4. 학생 자료 투입 전 학교의 학생별 작업·성적 보관 규정을 원문으로 확인합니다.
5. 한 반 일반 학습 시범 후 필요할 때만 수행평가 이관을 별도 논의합니다.

## 로컬 실행

`python -m http.server 8765 --bind 127.0.0.1 --directory web` → `http://127.0.0.1:8765/`. 자세한 범위와 확인 결과는 [PRD](../PRD.md)를 보세요.
