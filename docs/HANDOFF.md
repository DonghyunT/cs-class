# 이어갈 작업

갱신: 2026-09-28. 새 PC·새 대화에서는 이 문서 → [PRD](PRD.md) → [DESIGN](DESIGN.md) 순서로 읽습니다. 실행·검증·도구 설정은 [DEVELOPMENT](DEVELOPMENT.md), 폴더·문서 목차는 [README](../README.md)에 있습니다.

## 다음 작업과 확정된 결정

- 공개 홈은 사용자 만족을 확인했습니다. 학생·교사 로그인과 대시보드에도 같은 스타일을 적용합니다.
- **로그인은 중앙 집중형으로 확정했습니다.** 무엇을 어디에 입력할지 직관적으로 보이게 합니다. 좌우 분할 유지 여부를 다시 묻지 않습니다.
- 다음 작업은 학생·교사 로그인 시안입니다. 학번·비밀번호, 교사 Google·강사 비밀번호, 첫 입장 비밀번호 변경, 잘못된 입력 상태를 함께 다룹니다.
- 로그인 → 학생 대시보드 → 교사 대시보드 순으로 진행하는 방향입니다. 대시보드 세부 배치는 **사용자와 대화하며 천천히** 정합니다.
- 후속 로그인·대시보드의 Stitch 생성과 스타일 구현은 아직 하지 않았습니다. 현재 코드는 이전 시안이며, 이번 폴더 정리는 디자인 변경이 아닙니다.

새 대화에는 다음과 같이 입력하면 됩니다.

> docs/HANDOFF.md, docs/PRD.md, docs/DESIGN.md를 읽고 이어서 작업하자. 홈 디자인은 확정했고 다음은 중앙 집중형 학생·교사 로그인이다. Stitch 스킬과 MCP를 활용하되 로그인부터 함께 다듬고, 대시보드는 나와 대화하면서 진행하자.

## 현재 구현

| 영역 | 상태 |
| --- | --- |
| 공개 홈 | 픽셀 캔버스·중앙 목차·움직임 툴팁·통합 입장 선택창 |
| 수업 미리보기 | 한 프레임에서 이번 수업 → 개념학습 → 퀴즈 → 실습 → 이어하기. 퀴즈·비트 직접 조작 |
| 공간 안내·마무리 | 학생·교사 미리보기, 남색 입장 구간, `cs·` 푸터 |
| 학생 시안 | 학번 입장·필수 비밀번호 변경·이번 수업·열린 수업·최근 활동·필터·빈 상태 |
| 교사 시안 | 반 선택·이번 수업과 열린 수업 지정·학번 검색·초기화 확인창. 강사는 10·11반 |
| 인증·저장 | 화면 체험만 구현. Firebase·Google OAuth·서버 권한·영속 저장 미구현 |
| 수업 내용 | 예시 세 개와 둘러보기 기록. 실제 콘텐츠는 후속 작업 |

가상 데이터는 메모리에만 있고 새로고침하면 초기화됩니다. UI 역할 구분을 실제 보안 경계로 취급하지 않습니다. 체험 계정은 README, 계정·권한 요구사항은 PRD를 따릅니다.

## 코드와 참고 화면

| 위치 | 용도 |
| --- | --- |
| [home/public-home.tsx](../src/components/home/public-home.tsx) | 홈 전체 구성·모션 상태 |
| [home/lesson-story.tsx](../src/components/home/lesson-story.tsx) | 다섯 단계 시연·스크롤·키보드 선택 |
| [home/lesson-examples.tsx](../src/components/home/lesson-examples.tsx) | 개념·퀴즈·비트 실습 예제 |
| [home/role-preview.tsx](../src/components/home/role-preview.tsx) | 학생·교사 공간 미리보기 |
| [home/reactive-surface.tsx](../src/components/home/reactive-surface.tsx) | 시연·역할 화면이 공유하는 포인터 효과 |
| [home/home-art.tsx](../src/components/home/home-art.tsx), [home/home-entry.tsx](../src/components/home/home-entry.tsx) | 픽셀 그래픽·움직임 툴팁·입장 선택창 |
| [public-home.css](../src/app/public-home.css) | 홈 스타일·반응형·모션 |
| [login-screen.tsx](../src/components/login-screen.tsx) | 다음에 손볼 로그인·비밀번호 변경 시안 |
| [app-shell.tsx](../src/components/app-shell.tsx), [학생](../src/app/student/page.tsx)·[교사](../src/app/teacher/page.tsx) 페이지 | 대시보드·공통 메뉴 |
| [demo-provider.tsx](../src/components/demo-provider.tsx), [demo-data.ts](../src/lib/demo-data.ts) | 실제 서비스가 아닌 메모리 체험 상태·데이터 |
| [landing.spec.ts](../tests/landing.spec.ts), [platform.spec.ts](../tests/platform.spec.ts) | 홈·로그인·대시보드 회귀 검증 |

홈은 [데스크톱](reference/home-hero-1440.png)·[모바일](reference/home-hero-390.png), 선택창은 [데스크톱](reference/home-entry-1440.png)·[320px](reference/home-entry-320.png), 나머지는 [공간 안내](reference/home-role-anchor.png)·[마지막 화면](reference/home-finale-1440.png)에서 확인합니다. 이 파일들은 Git에 포함됩니다. `outputs/design-review/`는 초기 시안이며 현재 홈보다 우선하지 않습니다.

색·문구·배치·UI Component Lab 활용은 DESIGN을 따릅니다. 코드 수정 시 특히 아래 동작을 유지합니다.

- 홈 모션은 사용자 요청으로 OS 설정과 관계없이 기본 켜짐입니다. 상단에서 줄이면 고정 시연·장식 모션을 해제하되 조작은 유지합니다. 새로고침하면 기본값으로 돌아옵니다. 다른 화면은 OS 설정을 따릅니다.
- 고정 시연은 폭 960px 이상·높이 680px 이상에서 사용합니다. 모바일·낮은 창은 직접 단계 선택이며, 수동 선택은 새로운 사용자 스크롤 전까지 유지합니다.
- 활성 패널은 즉시 보이게 해 빠른 방향키·Tab 이동에서도 초점이 유지되어야 합니다. 픽셀 그래픽은 클릭 영역을 고정하고 내부 그림만 움직입니다.
- 공간 안내 앵커는 제목 `#classrooms`에 있습니다. 입장 선택창의 초점 순환·복귀, Escape·바깥 클릭·닫기 버튼을 유지합니다.
- 개념학습·퀴즈·실습은 수업 구성의 예시이며 모든 수업의 진입 순서를 강제하는 정책이 아닙니다.

## Stitch 상태

- 프로젝트: [CS Class 랜딩페이지 디자인](https://stitch.withgoogle.com/projects/9952170337891001891), ID `9952170337891001891`.
- 다른 PC에는 [연결 안내](DEVELOPMENT.md#stitch-연결)에 따라 별도 설정합니다. 키는 `STITCH_API_KEY` 환경변수로만 참조하며 문서·채팅·로그에 노출하지 않습니다.
- 프로젝트·화면 조회와 기존 화면 수정을 확인했습니다. 허용 도구는 `get_project`, `list_screens`, `get_screen`, `edit_screens`입니다. 생성 작업에서는 필요한 도구 가용성을 확인합니다.
- 프로젝트 테마의 초기 `Plus Jakarta Sans`보다 **DESIGN의 Pretendard·색·컴포넌트 기준이 우선**입니다. 로컬 홈 수정이 Stitch에 자동 반영되지는 않습니다.
- `list_screens`에서 수정 결과가 누락될 수 있어 아래 결과 ID로 `get_screen`을 호출합니다. 수정 응답만으로 기존 캔버스가 덮어써졌다고 단정하지 않습니다.

| 화면 | 최초 ID | 수정 결과 ID |
| --- | --- | --- |
| 홈 데스크톱 | `43f4bb0b48b0429ea7827b5fec944945` | `b9fcd8f02ce3462c89ce9f653285f699` |
| 홈 모바일 | `e157096258184c8190a44a9ba31585d8` | `5fdd1894a36a4c1e93b378b4a334abe8` |
| 초기 브랜드 | `d355390e8e2b472093273fbb1855ffc5` | 로컬 학사모 브랜드가 현재 기준 |

생성 HTML·정적 시안 서버 8766은 초기 참고이며 현재 앱은 3000에서 실행합니다. HTML은 원래 PC의 Git 제외 경로 `outputs/stitch-review/2026-09-27/`에 있고, 다른 PC에서는 화면 ID로 조회할 수 있습니다. 이전 프롬프트·검토 원문은 [홈 체크포인트](archive/cs-class/2026-09-27-home-checkpoint/manifest.json)에 보존했습니다.

## 다른 PC에서 참고할 것

- [UI Component Lab](reference/ui-component-lab/index.html) 네 파일은 원문 그대로 Git에 포함했습니다. 디자인 활용 기준은 [DESIGN](DESIGN.md#9-ui-component-lab-활용)을 따릅니다.
- 실제 학생 계정 엑셀은 원래 PC의 `outputs/01a0de21-d7f4-7c03-8abf-2e213c2bf7fc/`에만 있습니다. 초기 비밀번호·API 키·개인 설정·`백업용/`·캐시·임시 출력도 Git에 포함하지 않으며, UI 작업에는 필요하지 않습니다.
- StitchDesign·MCP·브라우저 연결은 PC별 설정입니다. Figma 편집은 미검증입니다. Context7은 이번 정리에서 Next.js·React 문서 조회를 확인했습니다. 다른 PC의 실제 가용성은 다시 확인합니다.
- Vercel 프로젝트·로컬 환경·이전 `platform/` 설치 주의사항은 [DEVELOPMENT](DEVELOPMENT.md)를 따릅니다.

## 이번 구조 정리 · 2026-09-28

- 루트에는 README·AGENTS를 두고 PRD·DESIGN은 `docs/`로 이동했습니다. 긴 실행·도구 설정은 DEVELOPMENT로 옮기고 HANDOFF는 현재 상태와 다음 작업 중심으로 줄였습니다.
- 공개 홈의 기존 컴포넌트를 `src/components/home/`에 모으고 큰 파일을 역할별로 분리했습니다. 동작·마크업·스타일·의존성·URL은 유지합니다.
- 공통 CSS에는 기존 화면 규칙과 덮어쓰기 규칙이 누적되어 있습니다. 후속 로그인·대시보드 개선에서 해당 스타일을 정리하고 화면을 비교합니다.
- lint·typecheck·프로덕션 build와 로컬 개발 서버 대상 E2E 12개를 통과했습니다. 데스크톱·390px 홈과 320px 입장창의 생성된 스크린샷도 확인했습니다. 기존 E2E에는 좁은 창·키보드·모션·콘솔·로그인·대시보드 흐름이 포함됩니다.
- 분리한 함수·상수 12개와 이동한 그래픽·입장창의 내용을 원본과 대조했습니다. PRD·DESIGN은 상대 링크만 바꿨고, 활성 문서 로컬 링크·앵커 80개와 보관 원문 362개 파일의 SHA-256을 확인했습니다.
- 처음에는 옛 API 경로가 남은 `.next` 타입 캐시가 검사를 막았으나 개발 서버·빌드 재생성 후 통과했습니다. 외부 서비스 설정·병합·배포는 변경하지 않았습니다.

## 이전 기준점과 검증 기록

홈 구현은 [PR #2](https://github.com/DonghyunT/cs-class/pull/2), 이전 정적 시안 정리·Next.js 배포 전환은 [PR #3](https://github.com/DonghyunT/cs-class/pull/3), 저장소 루트 통합은 [PR #5](https://github.com/DonghyunT/cs-class/pull/5)에 있습니다. 과거 검사·배포 결과는 해당 PR의 시점 기준이며 현재 브랜치의 결과와 구분합니다.

이전 홈 검증은 데스크톱·낮은 창·320px 모바일, 스크롤·방향키·빠른 Tab·터치, 두 OS 움직임 설정, 모달 초점·콘솔과 학생·교사 체험을 포함했습니다. 실제 계정·서버 권한·영속 데이터·동시 사용·전체 접근성 인증은 검증 범위 밖입니다.
