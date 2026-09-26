# CS Class · 즐거운 정보 교실

중학교 정보 수업을 이어서 할 수 있는 교실형 LMS입니다. 공개 화면에서는 수업의 구조와 짧은 개념 소개를 보고, 학생은 자기 반에서 학습·제출하며, 교사는 수업과 학생 현황을 관리하는 방향입니다.

## 먼저 읽기

1. [AGENTS.md](AGENTS.md): 작업 규칙. 이 문서는 별도 승인 없이 수정하지 않습니다.
2. [INTENT.md](INTENT.md): 교육 목적과 CS Class에 적용하는 원칙.
3. [PRD.md](PRD.md): 합의된 요구사항과 구현·검증 상태의 단일 기준.
4. [docs/HANDOFF.md](docs/HANDOFF.md): 현재 작업 브랜치, 환경, 남은 일.

## 저장소와 운영 경계

- 이 저장소는 V1 `DonghyunT/algorithm-studio`의 **전체 Git 이력**을 복제하여 시작한 비공개 `DonghyunT/cs-class`입니다. 기준 커밋은 `98781bd6e506e3ab5b1be08c39677e658215dba9`입니다.
- 기존 V1의 `main`, Vercel 운영 사이트, Firebase `donghyun-algo`, 수행평가 자료는 이 프로젝트의 운영 대상이 아닙니다. 수행평가는 별도 이관 전까지 V1에서 진행합니다.
- **새 서비스로 배포할 루트는 `web/`뿐**입니다. 저장소 루트에 남은 V1의 `index.html`, `api/`, `js/data/firebase-config.js` 등을 CS Class 배포 대상으로 선택하지 마세요. 기존 Firebase로 되돌아가는 설정도 금지합니다.
- 별도로 만든 Firebase `cs-class-f74c4`는 실제 운영 후보입니다. 첫 시안은 Firebase와 AI API를 연결하지 않습니다. 개발용 Firebase에서 가상 학생 흐름을 검증한 뒤, 학생 자료 저장 전 학교 보관 규정을 확인합니다.

## 현재 시안 실행

PowerShell에서 저장소 루트로 이동한 후:

```powershell
python -m http.server 8765 --bind 127.0.0.1 --directory web
```

브라우저에서 `http://127.0.0.1:8765/`을 엽니다. `web/`은 빌드 도구 없는 HTML/CSS/Vanilla JS입니다.

시안에는 공개 첫 화면, 가상 학생·교사 대시보드, 순서도 연구소 개념·응용 퀴즈와 5단계 클릭 경로가 있습니다. 가상 학습 상태는 `sessionStorage`에만 남습니다. 화면 상단 안내처럼 실제 계정, 서버 저장, AI 검사, 제출은 아직 없습니다. 5단계의 기호는 순서만 바꾸는 시안이며 V1의 자유 연결 캔버스를 이관한 상태가 아닙니다.

## 배포와 다음 단계

새 Vercel 프로젝트는 `web/`을 Root Directory로 사용합니다. [CS Class 시안](https://cs-class-donghyunt.vercel.app/)은 Vercel 로그인 보호 아래 배포됐고 실제 학생 자료와 연결되지 않았습니다. [배포 근거](docs/CS_CLASS_DEPLOYMENT.md)를 확인하세요. 대표 화면 검토 후 개발용 Firebase에서 인증·저장·권한·제출 버전을 구현하며, 학생을 넣기 전에 학교 규정에 따른 보관·삭제 범위를 확인합니다. 상세 순서는 [PRD.md](PRD.md)와 [HANDOFF](docs/HANDOFF.md)를 따릅니다.
