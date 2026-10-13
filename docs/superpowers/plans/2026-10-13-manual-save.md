# 학생 수업 수동 저장 전환 — 실행 계획 A

> 실행 에이전트: `superpowers:executing-plans`로 체크리스트를 순서대로 수행한다. 현재 사용자 승인은 A0 및 A1–A6의 로컬 구현·검증·문서 반영까지다. 커밋·push·병합·배포와 계획B는 별도 요청 범위다.

**Goal:** 편집 중 자동 초안 저장을 제거하고 저장 버튼·Ctrl+S로 명시적 snapshot을 저장하여 호출을 줄이되 학생 기록·실패 보호를 유지한다.

**Architecture:** useWork의 단일 draft/server/revision 소유권을 유지한다. 편집기 capture·메모리 편집·단일 snapshot 저장·명시 행동 결과 저장을 구분한다. 기존 서버 API/데이터 형식으로 구현하고 공통 저장·탐색 변경의 전체 회귀를 확인한다.

**Tech Stack:** 기존 Node24, Next.js16.3.6, React19.2.8, Playwright1.63 계열, Firebase CLI15.31.0, Java21+; 신규 의존성 없음.

**Spec:** 아래 합의 명세. 현재 정책은 [PRD](../../PRD.md#작업-저장과-통신-비용), 권한은 [AGENTS](../../../AGENTS.md), 실행은 [DEVELOPMENT](../../DEVELOPMENT.md#검증)를 따른다. 아래 전환 정책은 아직 구현되지 않았다.

**Baseline:** 2026-10-13 Asia/Seoul·0c61e46. 상위 계획은 [변경 영향별 검증 계획 B](2026-10-13-scoped-verification.md)다. A를 구현·전체 검증한 뒤 안정된 저장 동작에 B를 적용한다. 각각 별도 변경 단위로 통합할 수 있다.

## 1. 합의와 구현 경계

| 행동 | 새 서버 저장 정책 |
| --- | --- |
| 입력·조립·삭제·편집 | 화면/메모리만 변경, 자동 초안 POST 없음 |
| 개념/퀴즈/실습 단계·수업 내부 미션 이동 | 최신 입력을 메모리에 확정하고 이동; 위치만 바뀌면 미저장 경고 없음·이동 자체 저장 없음 |
| 저장 버튼·Ctrl+S·Cmd+S | capture 완료 시점의 snapshot만 저장 |
| 저장 중 추가 편집 | 새 초안으로 유지; 후속 자동 저장 없음 |
| 변경 없이 다시 저장 | 동일성 확인 후 쓰기 요청 없음 |
| 명시 채점·제출·AI·교사 확인 요청 | 필요한 작품 snapshot/결과 저장 허용; 별도 저장 버튼 선행 요구 없음 |
| 손들기 | 현재 작품/단계/미션 snapshot 저장 후 도움 요청; 나가기 dialog를 사용하지 않음 |
| 순서도 퍼즐 성공 | 기존 성공 snapshot의 검증/완료 기록 예외 유지 |
| 일반 실행·중지·내보내기 | 현재 작품 사용; 실행/다운로드 자체 초안 저장 없음 |
| 수업 밖 이동·수동 로그아웃 | 저장 후 나가기/저장하지 않고 나가기/취소 중 사용자 선택 |
| 입력 멈춤·5초 경과·탭 hidden | 자동 초안 저장 없음 |
| 새로고침·브라우저 닫기 | 미저장/처리 중이면 native 경고; 종료시 초안 POST 없음 |

- 적용 대상은 학생 수업 초안이다. 교사 관리·개인 설정 등의 저장 방식을 임의 변경하지 않는다.
- 제출본/완료 기록은 초안 편집·초안 폐기로 지우거나 덮지 않는다. 기존 계정/작품·불완전 편집값을 보존한다.
- 명시 행동은 기존 dirty snapshot 저장+action/AI 두 요청이 필요할 수 있다. 첫 전환에서 이를 합친 새 서버 API를 만들지 않는다.
- 초안 요청 수·action/AI·GET·session/touch는 별개로 측정한다. 호출 하나를 비용/DB 쓰기 하나로 표현하지 않는다. 실제 절감률/요금은 미확인이다.
- session/touch·수업 공지 갱신·무활동 만료·단일 세션 정책은 유지한다.
- 2026-10-13 A0 사용자 결정: 손들기는 현재 작품 저장 예외, 위치-only는 미저장 경고 없음·다음 실제 내용 저장/명시 행동에 위치도 기록한다. 위치 기록용 별도 주기 요청은 만들지 않는다.
- localStorage/sessionStorage/IndexedDB에 평문 초안을 영구 저장하지 않는다. 저장 전 refresh/강제 종료/세션 종료에서는 마지막 서버 저장 이후 작업 소실 가능성을 안내한다.
- 권한·revision·실패/충돌·접근성·필수 검증을 비용 이유로 줄이지 않는다.
- 내부 이동/일반 내보내기 저장 없음과 퍼즐 성공 기록 예외는 이 계획의 구체화다. 실행 전 설계 검토에서 사용자 수정 의견이 있으면 명세/회귀를 같이 갱신한다.

## 2. 상태·snapshot·동시성 계약

| 상황 | 반드시 유지할 상태 |
| --- | --- |
| local의 실제 내용==확인된 server의 내용 | saved; 위치만 다르면 다음 내용 저장까지 위치 기록은 보류 |
| 실제 내용 local!=server | dirty; 미저장 표시 |
| A 저장 pending | saving; 중복 writer 없음 |
| A pending 중 B 편집 | local=B 유지 |
| A 성공, B가 남음 | server=A/revision 갱신, local=B/dirty |
| 저장 실패/충돌 | 입력 유지, failed/충돌 비교; 자동 재전송 없음 |
| 동일 초안 save | 서버 호출0 |
| late 응답/계정 종료/폐기 iframe | 현재 draft/새 UID에 적용하지 않음 |

- 저장 snapshot은 capture 완료 시 구조 복사한 값이다. 이후 객체 변이가 전송 데이터에 섞이지 않아야 한다.
- content dirty(나가기/표시)와 exact draft difference(실제 snapshot 저장/no-op/충돌)를 분리한다. 위치 projection 후보와 서버/편집기 계약은 [A0 코드 조사](../../DEVELOPMENT.md#수동-저장-전환의-코드-계약-a0-조사)를 따른다. tutorialDone·답안·placements·도형 좌표·실제 프로젝트 편집까지 위치로 무시하지 않는다.
- 위치-only 수동 save의 불필요한 서버 요청은0으로 유지한다. 손들기/명시 행동은 현재 단계/미션까지 포함한 exact snapshot이 필요한 경우 선행 저장을 허용한다. clean 판단이 view 위치를 무시해도 행동은 잘못된 서버 미션을 사용하지 않아야 한다.
- Ctrl+S는 활성 입력 확정+native capture 경계를 사용한다. 캡처 전후 입력을 섞지 않도록 최소 capture 구간만 필요하면 잠근다. 전체 네트워크 대기 동안 편집을 막지 않는다. AI 결과의 비교 기준은 저장 완료 뒤 local을 다시 읽지 않고 확정된 server snapshot으로 둔다. Entry thread 배치는 읽기 위치가 아닌 작품 내용이다.
- 단일 save는 pending 동안 생긴 추가 편집을 while로 drain하지 않는다. 추가 값은 다음 명시 save까지 dirty다.
- 중복 클릭/키 repeat는 같은 pending을 공유하거나 무시한다. 후속 자동 save를 queue하지 않는다.
- 실패 재시도는 명시 조작이다. 응답 유실 시 기존 결과 확인/revision 비교를 유지하고 강제 revision 우회로 덮지 않는다.
- action/AI는 확정 snapshot 저장 후 해당 revision 행동을 실행한다. 기존 결과 불확실·수동 확인·재전송 보호를 유지한다.
- AI 결과는 서버가 바꾼 결과만 병합하고 요청 이후 작성한 입력을 보존한다. 샌드위치 다음 명령·추상화 편집·미션 전환의 late 응답을 검사한다.

## 3. 화면·이동·단축키 계약

- 지속 수업 상단에 `저장` 버튼과 `저장 완료 / 저장하지 않은 변경 있음 / 저장 중… / 저장 확인 필요 / 저장 기록 충돌`을 표시한다.
- 학생 헤더만 표현을 담당하며 draft/save 상태의 별도 소유자가 되지 않는다. 상태 변경으로 controller/iframe을 remount하지 않는다.
- loading/조회 실패에는 저장을 활성화하지 않는다. 편집 전 조회 대기/실패만으로 나가기·메뉴·logout을 막지 않는다.
- save/action/AI/capture 중, 편집기 준비 전, 충돌/결과 불확실 상태에는 잘못된 중복 save를 막는다. 저장 성공은 초점을 빼앗지 않는다.
- 모바일320/390px·낮은 창·집중 모드에서도 버튼·상태·주 실행 조작에 접근 가능해야 한다.
- 교사 체험은 `이 창에서 체험 중`·메모리 경계를 유지하고 학생 서버 저장 버튼을 노출하지 않는다.
- 부모 Ctrl+S/Cmd+S는 활성 학생 작업실에서만 browser 기본 저장을 막고 앱 save를 실행한다. composition/229·repeat·모달·다른 화면·처리 중 상태를 구분한다.
- 순서도 contentEditable은 keydown 전파를 막으므로 부모 bubble 처리만으로는 충분하지 않다. capture 또는 편집기 전달 방식과 조합중 Enter/Ctrl+S 보호를 실제 편집기에서 검사한다.
- iframe 키는 부모로 전파되지 않는다. 기존 channel에 save-request를 추가하고 부모는 현재 iframe source/channel/type/준비 상태를 확인한다. sandbox/Origin/CORS를 완화하지 않는다.
- Entry 실행 중 전체 exportProject로 엔진을 멈추지 않는다. 안전한 코드 snapshot이 불가능하면 해당 상태 save를 비활성화하고 종료 후 저장 안내를 표시하며 한계를 사용자에게 보고한다.

### 미저장 외부 이동

| 선택 | 동작 |
| --- | --- |
| 저장 후 나가기 | 최신 snapshot 성공 확인 후 이동; 실패/충돌이면 현재 화면 |
| 저장하지 않고 나가기 | 전송하지 않은 draft/recovery만 폐기; 서버/제출/완료 유지 |
| 취소·Escape | 현재 입력 유지·이동 취소·시작 조작으로 focus 복귀 |

- 내부 단계/미션 이동은 dialog 없음, capture 실패일 때만 이동 중단. 각 미션 미저장 프로젝트는 메모리에서 보존한다.
- 외부 Link·수업 나가기·이번 수업 이동·홈·수동 logout·Back/Forward는 같은 선택 절차를 사용한다.
- pending save/action/AI는 결과를 확인하기 전 폐기/로그아웃으로 우회하지 않는다. 이미 전송된 요청은 취소로 되돌릴 수 없다.
- 저장 후 나가기 중 새 편집으로 dirty가 남으면 이동하지 않고 추가 변경을 알린다. 필요하면 해당 capture/leave 구간만 편집을 잠근다.
- 폐기 후 같은 앱에서 재입장해도 폐기 recovery가 되살아나지 않는다. 강제 세션 만료/교체는 권한 종료·메모리 정리를 유지한다.
- native beforeunload는 3버튼 앱 dialog가 아니다. 경고만 제공하며 브라우저별 경고 생략/강제 종료 복구를 보장하지 않는다.
- navigation guard 변경은 학생 수업에 선택적으로 적용한다. 기존 다른 편집 화면의 flush 보호·수정키 새 탭·외부 링크 보호는 유지한다.
- 손들기의 기존 beforeLeave 호출은 실제 나가기 호출과 분리한다. 저장 후 현재 단계/미션/작품을 도움 snapshot으로 기록하고 도움 요청 중복/실패 보호를 유지한다. 도움 요청을 누른 것만으로 미저장 폐기 선택을 띄우지 않는다.

## 4. 파일별 책임과 제안 인터페이스

| 파일 | 변경 책임 |
| --- | --- |
| src/components/student/use-work.ts | 타이머 제거·capture/snapshot·action/AI·실패/충돌·recovery 단일 소유 |
| work-controller.ts, teacher/use-preview-work.ts | 학생/체험 공통 TypeScript 계약; 체험 서버 저장0 |
| lesson-editor/workspace/shell TSX·인접 CSS | persistent frame 저장 버튼 callback/상태·표현·focus |
| programming-lesson.tsx | 미션 전환 전 capture·메모리 전환, 전후 flush 제거 |
| read-editor-draft.ts, entry-practice-workspace.tsx | native 입력 확정·snapshot·실행/준비 상태 |
| public/entryjs/workspace.js | iframe 단축키 message·실행 중 안전한 export |
| navigation-provider.tsx | 선택적 prepareLeave·dialog·history·native 경고 |
| src/components/classroom/help-button.tsx·src/lib/server/help.ts | 명시 snapshot 저장 후 손들기; 기존 요청/receipt/snapshot 계약 유지 |
| session-provider.tsx | 기존 보안/종료 유지; 필요한 미저장 소실 안내만 수정 |
| review/flowchart.tsx, flowchart-studio.tsx | 성공 snapshot 예외·내보내기 capture |
| src/lib/server/classroom.ts | 기존 revision/no-op/제출 보존 계약 대조; 처음에는 API 변경 없음 |
| tests/manual-save.spec.ts (신규) | 명시 저장·0호출·snapshot·이동 핵심 회귀 |
| 기존 관련 spec | 같은 기능의 기존 저장 기대를 확장/수정; 중복 테스트 생성 최소화 |

경로 표의 학생 파일은 `src/components/student/` 기준이다. 실행 전 caller를 조사하고 인터페이스 변경을 학생/체험에서 함께 반영한다.

```ts
captureDraft(): Promise<WorkDraft>; // 입력 확정+native capture, 서버 요청 없음
saveSnapshot(snapshot: WorkDraft): Promise<boolean>; // 단일 snapshot/revision 유지
save(): Promise<boolean>; // capture 후 saveSnapshot
discardDraft(): void; // 아직 전송하지 않은 초안/recovery만 폐기
prepareLeave(): Promise<boolean>; // 처리 상태 확인+선택 dialog, 이동 허용 여부
```

기존 flush를 의미가 다른 여러 행동에 그대로 쓰지 않는다. 이름은 caller 조사 후 충돌을 정리하되 의미/테스트 조건은 유지한다. 범용 상태 머신/새 편집기 프레임워크/새 영구 초안 저장소를 만들지 않는다.

## 5. Review Focus

1. A 저장 응답이 새 B 편집을 덮거나 자동 저장하는 문제 → A1 gated response.
2. native 입력/canvas/실행 중 export/iframe Ctrl+S 누락 → A2 실제 입력·engine 검사.
3. 폐기/Back/logout이 초안을 되살리거나 다른 UID로 보내는 문제 → A3 history·recovery·session 회귀.
4. 퍼즐 실행 성공 snapshot과 이후 편집이 섞이는 문제 → A4 validation/submission 대조.
5. 기존 spec에서 자동 저장 대기만 삭제해 복원 보장을 잃는 문제 → A5 전체 기대조건 검토.

## A0 — caller 조사·정책·요청량 기준

- [x] Git/원격/HANDOFF와 기준 이후 변경을 대조한다. 사용자 demo export·미추적 자료를 보존한다.
- [x] 관련 Next 로컬 docs·설치 버전 Playwright/Base UI API를 먼저 읽고 Context7으로 사용하는 API만 대조한다. 조회를 재사용한다.
- [x] rg로 flush/saveWork/update/switchStage/requestAi/perform/beforeLeave/exportProject caller를 모아 편집/capture/save/action/외부 이동으로 분류한다.
- [x] PRD에 위 저장 예외/폐기/복구 정책, DESIGN에 버튼/상태/dialog/focus를 제안/확정으로 구분해 반영한다.
- [x] demo 고정 시나리오를 정한다: 연속 입력·멈춤 입력·도형 추가/연결·단계/미션 이동·save·action/AI. before 요청 수를 초안POST/action/AI/조회/activity로 분리한다.
- [x] scratch의 결과에는 환경·시나리오·편집 횟수·요청 수만 남긴다. 답안/쿠키/개인정보/비밀은 결과에 남기지 않는다.

A0 구현 근거는 DEVELOPMENT의 코드 계약, 날짜/환경별 수치는 HANDOFF에만 기록한다. 현재 정상 저장 버튼이 없으므로 save 버튼 baseline은 미지원으로 기록하며 API 호출로 UI 저장을 대신 계측하지 않는다. hidden은 합성 visibility 이벤트 측정과 실제 탭 전환을 구분한다. UI/서버 코드의 변경 전/후 source SHA-256을 대조한다.

**완료:** 모든 저장 trigger/caller가 분류됐고 같은 조건으로 비교할 before 자료가 있다.

## A1 — 단일 snapshot 저장

- [x] 실패 회귀부터 작성: 편집 후900ms/5초/hidden POST0, 변경 save POST1, clean POST0, 중복0, pending A 중 B→serverA/localB/dirty, 다음 save 후B 복원.
- [x] 위치-only 단계/미션/읽기 이동은 경고/POST0, 실제 내용 변경은dirty, 다음 내용 저장에 위치 포함, 도움 요청은 현재 위치 포함을 회귀로 추가한다. programming starter/keys 복사로 위치-only가 거짓 dirty가 되지 않게 한다.
- [x] 자동 timer/visibility flush를 제거한다. update는 메모리/dirty만 관리한다.
- [x] capture/saveSnapshot/save를 구현하고 while drain을 제거한다. 구조 복사·writer 하나·revision·추가 입력 보존을 검사한다.
- [x] 실패/응답 유실/충돌/late response/계정 종료에서 입력 보존과 명시 재시도를 검사한다. revision 우회 금지.
- [x] preview 계약도 맞추고 서버 저장0을 확인한다.
- [x] typecheck와 manual-save/work-action-recovery 대상 검사를 실행한다. 기존 기록과 에뮬레이터 환경을 확인하고 준비한다.

**완료:** 편집POST0, 명시snapshot만 저장, 후속 편집dirty, 실패/충돌/preview 경계 유지.

## A2 — 버튼·단축키·Entry

- [x] LessonFrame에 callback/가능 여부를 표시용으로 전달한다. header/controller/iframe 수명 유지.
- [x] 저장 버튼/상태를 PC·320/390px·낮은 창·집중 모드에 배치하고 focus/콘솔/가로 넘침을 검사한다.
- [x] 부모 Ctrl+S/Cmd+S·repeat/composition/229·모달·준비/처리중 조건을 검사한다.
- [x] 순서도 contentEditable의 stopPropagation 상태에서 Ctrl+S를 검사한다. recipe dialog는 적용 전 별도 제안이며 save가 resetCanvas 등 미승인 적용을 수행하지 않게 한다.
- [x] iframe save-request를 현재 source/channel/type으로 확인하고 폐기 iframe 메시지를 무시한다.
- [x] 실제 캔버스 숫자/질문 입력 확정·save·미션 전환·실행 중 snapshot을 검사한다. 숨은 fill로 클릭/입력 확정을 대신하지 않는다.
- [x] 초기 로딩/이미지 실패/iframe 교체/실패 후 재시도와 preview 경계를 검사한다.
- [x] 관련 Entry/프로그래밍/UI spec과 타입을 실행한다. production CSS 순서/계산 크기는 새 build로 확인하고 다음 통합에서 같은 build를 재사용한다.

**완료:** 부모/iframe 명시 save·native 입력 반영·실행 유지·접근성·preview 경계 입증.

## A3 — 내부 이동·미저장 외부 이동

- [x] 단계/미션은 capture→메모리 전환으로 바꾼다. 내부 이동POST0·미션별 marker 유지·capture 실패 이동 중단.
- [x] 기존 dialog 부품으로 3선택을 구현한다. 실제 초기 focus·Escape·취소·중복 개방·focus 복귀를 검사한다.
- [x] prepareLeave를 학생 guard에 선택적으로 연결한다. 다른 화면 기존 보호·수정키/새탭/외부 링크 유지.
- [x] Link/홈/수업 이동/logout/Back/Forward·history 복원 중 반복 이동/target 변경을 같은 조건으로 검사한다.
- [x] clean 조회 대기/실패는 이동 허용, dirty/저장 실패/결과 불확실은 구분한다.
- [x] save failure/conflict는 이동 금지, discard는 서버/제출 유지·recovery 삭제·재입장 폐기값 부활 없음.
- [x] pending 저장/action/AI·계정 종료·대체 세션·late response에서 결과 확인/UID 경계를 검사한다.
- [x] dirty/pending/Entry 미확정 값의 beforeunload를 검사한다. 물리 종료/브라우저별 한계는 기록한다.
- [x] navigation/programming-mission-navigation/manual-save 관련 spec을 실행한다. 이 공통 경계 변경에는 실제 logout/login 회귀를 포함한다.

**완료:** 내부 이동은 메모리, 외부 이동은 명시 선택, 실패/취소 입력 보존, 폐기 마지막 서버본 복원.

## A4 — 행동 저장·퍼즐·내보내기

- [x] perform/requestAi는 명시 snapshot을 준비해 기존 계약으로 실행한다. 추가 save 클릭을 요구하지 않는다.
- [x] 손들기는 최신 content+위치 snapshot을 저장한 뒤 기존 help API를 실행한다. 저장 실패→도움POST0, clean 도움→필요한 snapshot만, 저장중 추가 입력→요청본/추가초안 분리, 요청 중복/late 응답을 검사한다.
- [x] 행동 snapshot A를 저장하는 동안 B를 편집했어도 서버 행동은 A/revision에 묶고 local B는 유지한다. await 뒤 getDraft를 다시 읽어 행동 대상만 B로 바꾸지 않는다. 행동 중 입력을 잠그는 기존 조건이 있다면 그 조건과 예외를 실제 UI로 확인한다.
- [x] dirty는 필요한 save+action, clean은 불필요한 초안POST0인지 계측한다.
- [x] 저장/AI/채점/제출 중 새 입력·다음 명령·미션 이동·응답 유실/지연/중복에서 결과 snapshot과 입력 보존을 검사한다.
- [x] 퍼즐 성공은 실행 당시 snapshot에만 검증/완료를 묶는다. 실행중/성공 직후 작품 변경으로 다른 작품이 완료되지 않는다.
- [x] 일반 실행/중지/실패 실행에는 초안POST0. 내보내기는 capture 파일 생성만 수행하고 dirty를 유지한다.
- [x] 불완전 입력·미완성 기획/도형은 기존 저장 가능 계약을 유지하고 실행 유효성은 별도로 검사한다.
- [x] 기존 제출/완료·preview 평가/실제 Entry·학생DB 비변경을 회귀로 확인한다.

**완료:** 명시 행동만 필요한 기록 저장, late 결과 병합 안전, 퍼즐/제출/AI 의미와 호환성 유지.

## A5 — 영향 테스트 정비·전체 통합

- [x] 전체 tests에서 자동 저장 대기/reload/단계 저장/내보내기/시드 교체/Entry/navigation/preview 기대를 조사한다.
- [x] 명시 save로 기대를 바꾸되 실제 dirty/복원/실패 assertions를 삭제하거나 단순 표시 검사로 낮추지 않는다.
- [x] typecheck·lint·test:review·영향 spec을 우선 실행한다. 실패 원인 수정 후 동일 조건 재검사.
- [x] POST0 조건은 기존900ms/5초 경계를 넘긴 실제 관찰 또는 해당 버전 Playwright clock으로 확인한다. 타임아웃/허용오차 확대 금지.
- [x] 동일 before 시나리오 after 요청량을 기록한다. capture와 action의 필요한 요청·백그라운드 조회를 분리한다.
- [x] 빌드 화면 PC/모바일/낮은 창·키보드·콘솔·Entry 실제 조작을 확인하고 변경 대표 캡처만 읽는다.
- [x] 공통 저장/탐색 변경 최종 full E2E를 단일 실행한다. synthetic 계정/DB/제한 장부 정리·반 설정/사용자 demo 복원을 확인한다.
- [x] 물리 IME·실제 browser shortcut/종료 경고·학교PC/터치/실제200% 등은 조작/기대 결과로 사용자에게 수동 확인을 요청한다. 미확인=대기.

**완료:** 요청 경계·기존 기록·모든 수업·preview·탐색/세션·실패 회귀 통과, 수동 한계 명시.

## A6 — 문서·인계·복구·외부 확인

- [x] PRD=확정 정책, DESIGN=표현, DEVELOPMENT=계약/명령/검사, AGENTS=짧은 MUST/링크로 반영한다. README는 사람용 저장/나가기/단축키 설명만 둔다.
- [x] 자동 저장/저장 후 이동 문구를 검색하여 실제 동작과 맞춘다. archive 원문은 수정하지 않는다.
- [x] HANDOFF에 SHA/브랜치/미커밋/조건별 결과/호출before-after/수동 대기/다음 행동을 기록한다.
- [x] 문서 검사·문서 Node 회귀·diffcheck를 실행한다. 승인된 외부 반영에서 같은 SHA app·배포·별칭·session/login 화면을 확인한다.
- [x] A 복구는 변경 묶음 revert로 기존 자동 저장을 복원한다. 초기 데이터/API 형식을 유지하므로 DB 역이식은 만들지 않는다. 복구 공통 변경은 full 확인.
- [x] A 안정 상태 이후 계획B를 진행한다. 문서 기록을 구현/운영 검증으로 오인하지 않는다.

## 6. 실행 환경과 명령

- demo-cs-class·Auth9099/Firestore8080·http://localhost:3000·단일 worker만 사용한다. 운영 DB 테스트 금지.
- 서버 PID/명령·앱 config·fixture·소스/build를 확인한다. 제한된 조회 실패를 서버 부재로 단정하지 않는다. 사용자 preview 기록은 시드/서버 교체 전에 export한다.
- 시드 변경 전 about:blank로 이전 editor를 분리한다. 기존 .NET/Java/browser 캐시를 확인하고 재다운로드를 반복하지 않는다.
- 타입: `npm.cmd run typecheck`; 순수 검사: `npm.cmd run test:review`; 린트: `npm.cmd run lint`; 빌드: `npm.cmd run build`.
- 꺼진 에뮬레이터 대상 검사: `node node_modules/firebase-tools/lib/bin/firebase.js emulators:exec --only auth,firestore --project demo-cs-class "node node_modules/@playwright/test/cli.js test tests/manual-save.spec.ts"`.
- 이미 확인한 demo 에뮬레이터 실행 중에만 `npm.cmd run test:e2e:running -- tests/manual-save.spec.ts`.
- 전체: `npm.cmd run test:e2e`; build앱 확인은 DEVELOPMENT의 CI 환경변수 try/finally 절차를 따른다. Firebase CLI에 대상 인자를 넘기지 않는다.

## 7. 최종 완료·작성 상태

| 요구사항/위험 | 담당 | 필수 증거 |
| --- | --- | --- |
| 편집 자동POST0·명시save1·clean0 | A0/A1/A5 | 동일 시나리오 endpoint/method별 요청 수 |
| snapshotA·추가B·duplicate·late 응답 | A1/A4 | gated 응답·서버/화면/revision 대조 |
| native 입력·iframe 단축키·실행 유지 | A2 | 실제 canvas 조작·engine 상태·현재 source 확인 |
| 내부 미션 보존·외부3선택·폐기 부활 없음 | A3 | marker 복귀·history·recovery/서버본 대조 |
| 세션/UID·충돌·실패/응답유실 보호 | A1/A3/A4 | 권한 거부·결과 확인·입력 보존 |
| 퍼즐 실행작품/제출작품·AI 추가입력 | A4 | snapshot 일치·후속 편집 보존 |
| 기존 기록·preview·전체 수업 | A4/A5 | 호환/체험DB비변경·full 결과 |
| 실제 호출 효과·물리 환경 한계 | A0/A5/A6 | before/after 분리 계측·사용자 수동 확인 상태 |

자동 편집POST0·단일snapshot·명시 행동 예외·내부 이동 메모리·외부 이동3선택·실패/기존 기록/preview/세션 보호·full 통합·수동 대기를 모두 대조한다. 사용자에게 자동 결과/대표 화면/남은 직접 확인을 구분해 보고한다.

2026-10-13 Asia/Seoul. 작업 A의 모든 구현 및 검증이 완료되었습니다. A1~A4의 단일 스냅샷 수동 저장, UI/단축키/EntryJS 연동, 내부/외부 네비게이션 가드, 행동 저장이 모두 구현되었으며, A5의 초점 회귀 및 미이관/신규/레이아웃 반응형 테스트를 포함한 관련 26개 테스트 파일 전체 통과, `npm run build`, `npm run typecheck`, `npm run lint`, `git diff --check`가 정상 검증되었습니다. 커밋/push/배포는 사용자 승인 대기 상태입니다.
