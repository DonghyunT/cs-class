# CS Class · 즐거운 정보 교실

학생이 지금 할 수업을 쉽게 찾고, 열린 수업을 자유롭게 복습하며, 교사가 반마다 다른 진도를 이끄는 정보 학습 공간을 만들고 있습니다.

**현재는 제품·작업환경을 구체화하는 초기 단계입니다.** web/에는 가상 시안이 있고, 새 디자인과 기술 기반은 아직 구현하지 않았습니다. Next.js·TypeScript·Tailwind CSS·shadcn/ui는 추천 후보입니다.

## 작업을 이어갈 때

1. [AGENTS.md](AGENTS.md): 에이전트 역할·자율적 탐색·안전과 협업
2. [INTENT.md](INTENT.md): 교육 목적과 제품의 지향
3. [PRD.md](PRD.md): 합의한 기능·구현 상태·미결정 사항
4. [HANDOFF](docs/HANDOFF.md): 현재 작업 위치와 다음 단계

[디자인 방향](docs/DESIGN.md) · [작업환경](docs/TOOLING.md) · [문서 지도](docs/README.md)

## 현재 가상 시안 실행

Python이 준비된 환경에서 저장소 루트 기준:

```powershell
python -m http.server 8765 --bind 127.0.0.1 --directory web
```

http://127.0.0.1:8765/ 에서 확인합니다. 공개·학생·교사 홈, 개념·응용 퀴즈와 클릭 실습을 시연하며 상태는 sessionStorage에 저장합니다. 실제 로그인·서버 저장·AI 검사·학생 제출을 구현한 서비스가 아닙니다.

## 독립적인 새 제품

이 저장소는 비공개 DonghyunT/cs-class입니다. V1 전체 Git 이력을 기준 커밋 98781bd에서 계승했지만, V1 기능·화면·기술을 그대로 유지할 의무는 없습니다. 과거 자료는 [보관함](docs/archive/README.md)에 분리했습니다.

V1 코드·설정·전용 검사·운영 도구는 [코드 보관함](archive/README.md)으로 분리했습니다. main이 CS Class의 새 기준이며 이후 기능 작업은 main에서 새 작업 브랜치를 만듭니다. 현재 CS Class 시안 배포 루트는 web/입니다. 새 환경을 구성할 때 Firebase·API·배포 대상을 확인해 기존 운영 자료와 분리합니다.

[CS Class 시안 배포 기록](docs/CS_CLASS_DEPLOYMENT.md)은 2026-09-25 확인 당시의 근거입니다. 실제 학생 운영판이나 현재 실시간 상태를 의미하지 않습니다.
