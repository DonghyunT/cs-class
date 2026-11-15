# 페스티벌 로맨스 v3 (개연성·조작 활동·말투) 구현 계획

> **에이전트 작업자용:** 이 계획은 superpowers:executing-plans(또는 subagent-driven-development)로 과제 단위로 실행합니다. 단계는 `- [ ]` 체크박스로 추적합니다.

작성: 2026-11-15 · 상태: 1단계(엔진 기반)·2단계(1장) 구현·검증 완료, 사용자 1장 확인 대기 · 3단계(2·3장)는 1장 확인 뒤 이 문서에 이어 씁니다.

**목표:** 학생용 복습 게임 `/festival-romance.html`을 "축제 앱 하나를 같이 고치는 이야기"로 다시 묶고, 객관식 위주 활동을 블록 조작·대화 선택 중심으로 바꾸며, 시작 제한·줄 단위 이전 버튼·남녀 말투를 넣습니다.

**구조:** 엔진(`src/app.js`·`state.js`·`models.js`·`experiments.js`)을 먼저 바꾸고(1단계), 새 활동 엔진 두 개(`arrange`, 대화형 `quiz`)와 1장 대본을 함께 바꾼 뒤(2단계) 사용자에게 1장을 확인받습니다. 2·3장(3단계)은 그 피드백을 반영해 같은 방식으로 진행합니다.

**기술:** 단일 HTML 번들(`build.cjs`), 순수 JavaScript·CSS·SVG, `node --test`, Playwright QA 스크립트. 새 패키지 없음.

**근거:** [개편 설계안](festival-romance-review-game.md), 2026-11-15 사용자 요구 7개(아래 요구 번호)와 그 브레인스토밍 결과(이 문서에 반영).

## 사용자 요구와 결정

| 번호 | 요구 | 결정 |
| :--- | :--- | :--- |
| R1 | 첫 화면 하루 문구가 어색함 | "버그 좀 같이 잡아 줄래? …끝나면, 축제도 같이 돌자." (성별 고르기 전 화면이라 공통 문구) |
| R2 | 처음엔 `새 이야기 시작`으로만 시작 | 진행 기록이 없으면 챕터 카드 숨김·`startChapter`가 온보딩으로 보냄. 교사 모드·이어하기·기존 저장은 그대로 |
| R3 | 남녀 말투 살짝 다르게(오글거리지 않게) | 하루의 감정 대사만 `{boy, girl}`로 둘. 아래 말투 기준 |
| R4 | 이전 버튼이 일반 대사에서도 동작 | 대사 안 한 줄 뒤로, 첫 줄이면 이전 장면. 활동 직후 이전은 활동 화면으로(다시 풀어도 하트 변화 없음) |
| R5 | 파이썬 코드 제거 | 1장 2번을 "엔트리 블록 vs 하루의 손글씨 순서 메모"로 바꾸고 `renderers.terms` 삭제. `festival-lesson.html`은 보존 원본이라 그대로 |
| R6 | 개연성 최우선(플레이 시간 늘어도 됨) | 모든 활동을 하루가 만든 축제 앱 하나 안의 기능으로 묶고, 화폐는 `축제 티켓` 하나, 장면 간 숫자를 이어 씀. 목표 약 40분 |
| R7 | 객관식·주관식 최소, 대사 선택지·조작 활동 | 순서 바꾸기(`arrange`)·조작 시뮬레이션·2턴 대화 선택. 3장 4번은 3턴 대화 |

## 전체 제약

- 외부 라이브러리·CDN·새 npm 패키지를 쓰지 않습니다(단일 HTML 오프라인 동작 유지).
- 학생 화면에 파이썬 코드를 보이지 않습니다. 코드 표현은 엔트리 블록 문장만 씁니다.
- 풀기 전에 보이는 문구(미션 목표, 도입 대사, 하루의 한마디, 대화 질문)에 고칠 방법을 쓰지 않습니다. `tests/refinement.test.cjs`의 정답 단서 검사를 새 문항까지 넓힙니다.
- 하트 규칙: 문항의 **첫 채점 실행(또는 첫 대화 답)**이 첫 시도입니다. 채점 전 무료 시험 실행을 두지 않습니다. 틀린 뒤 다시 풀면 `0 ♥`.
- 저장 키 `festival-romance.game.v2`와 임베드 payload `version:2`를 유지합니다(저장 형식 변경 없음).
- `public/festival-lesson.html`·`dist/festival-lesson.html`은 바이트 단위로 바꾸지 않습니다.
- 조작 요소는 모두 `<button>`·스테퍼로 44px 이상, 키보드로 조작 가능, 끌기만 되는 조작 금지, `ctx.reducedMotion()`을 따릅니다. `←/→` 키는 대사 이동에 쓰므로 활동 안에서 가로채지 않습니다.
- 말투 기준(R3): 둘 다 반말·같은 정보·같은 실수. 남: 짧은 문장, `-다/-냐/-지/-거든/-자`, 쑥스러움은 말 돌리기. 여: `-어/-지?/-잖아/-네/-래?`, 쑥스러움은 말끝 흐리기, `ㅠㅠ`·`…`는 가볍게. 금지: 애교체(`-용/-당`), 소유욕 대사, 비속어, `오냐` 같은 낡은 말, 성적 뉘앙스. CS 설명·앱·내레이션·주인공 대사는 남녀 공통.

## 검토 초점

1. 오답 뒤 이전→다음으로 돌아와 다시 풀면 하트가 생기면 안 됩니다(과제 3 테스트).
2. 온보딩 없이 챕터 카드로 시작했던 기존 저장도 `이어하기`와 카드가 보여야 합니다(과제 1 테스트).
3. `{boy, girl}` 대사가 `escape()`만 거치는 칸(제목·카드·퀴즈 보기)에 들어가 `[object Object]`가 보이면 안 됩니다(과제 2 테스트).
4. 390px 터치·키보드만으로 순서 바꾸기를 끝낼 수 있어야 합니다(과제 5 QA).
5. 대화 2턴 중 1턴은 맞고 2턴에서 틀리면 하트를 잃고 2턴만 다시 풉니다. 이전으로 갔다 와도 두 번 기록되지 않아야 합니다(과제 6 테스트).

---

## 1단계: 엔진 기반

### Task 1: 새 이야기 시작으로만 첫 진입 (R2)

**파일:** 수정 `teaching-materials/festival-romance/src/app.js`(`syncTitle` 160~178, `showTitle` 189, `startChapter`), `qa/browser.cjs`(305~307, 임베드 623 부근)

**인터페이스:** 만듦 `canPickChapter(): boolean` = `isTeacher || hasAnyProgress()`(기존 `hasAnyProgress` 156 재사용)

- [ ] QA에 실패할 확인 추가: 새 학생 첫 화면에서 `#chapter-list`·`#resume-button`이 숨겨져 있고, 온보딩 완료 뒤 새로고침하면 `#chapter-list`가 보임. 진행 기록만 있고 `onboarded:false`인 저장을 `localStorage`에 넣고 열면 카드와 이어하기가 보임. 임베드에서 `festival:init` 전엔 `#chapter-list` 숨김.
- [ ] `node teaching-materials/festival-romance/qa/browser.cjs` → 새 확인에서 실패
- [ ] `startChapter` 첫 줄 `if(!canPickChapter()){openOnboarding();return;}`, `syncTitle`에서 `#chapter-list.hidden=!canPickChapter()`, `showTitle`의 안내 문구를 진행 기록이 없을 때 "새 이야기 시작을 눌러 하루와의 이야기를 시작해 보세요."로
- [ ] 빌드 후 browser QA·`qa/playback-app.cjs`(교사 경로) 통과
- [ ] 커밋 `feat(festival-romance): 첫 진입을 새 이야기 시작으로 제한`

### Task 2: 남녀별 대사 구조 (R3 구조)

**파일:** 수정 `src/state.js`(내보내기), `src/app.js:50`(`interpolate`), 테스트 `tests/state.test.cjs`, `tests/journey.test.cjs`

**인터페이스:** 만듦 `S.variantText(value, variant): string` — `value`가 `{boy, girl}` 객체면 `value[variant] ?? value.boy`, 아니면 그대로

- [ ] 테스트 `variantText는 문자열을 그대로, 객체는 성별로 고르고 없으면 boy로` : `variantText('a','girl')==='a'`, `variantText({boy:'b',girl:'g'},'girl')==='g'`, `variantText({boy:'b',girl:'g'},'boy')==='b'`, `variantText({boy:'b'},'girl')==='b'`
- [ ] 테스트 `성별 대사 객체는 text·line에만, 두 키 모두, 같은 {{변수}}` : 전 챕터 데이터를 훑어 `boy` 또는 `girl` 키가 있는 객체는 키가 정확히 `boy`·`girl`, 둘 다 빈 문자열 아님, 부모 키가 `text` 또는 `line`, 두 문장의 `{{...}}` 집합이 같음
- [ ] `node --test teaching-materials/festival-romance/tests/*.test.cjs` → 첫 테스트 실패
- [ ] `variantText` 구현·내보내기, `interpolate`가 `S.variantText(value,state.variant)`를 먼저 적용
- [ ] 테스트 통과, 커밋 `feat(festival-romance): 하루 대사를 성별로 나눌 수 있게`

### Task 3: 줄 단위 이전 버튼 (R4)

**파일:** 수정 `src/app.js`(`dialogue` 240, `initStory` 289, `flowIntro` 316, `activity` 342~415, `finishActivity` 418, `initEnding`·엔딩 리포트, `showScene` 559 삭제, 버튼 659, 키 676), `qa/browser.cjs`(328~329, 356~360)

**인터페이스:** 만듦 `setBackward(fn|null)`(이전 버튼 disabled 동기화, `disposeScene`에서 비움), `goBack()`, `sceneBack(): (()=>void)|null`(`nextIndex(-1)>=0`이면 `()=>move(-1)`), `dialogue(lines,{...,startLine=0,onBack=sceneBack()})`, `initEnding(scene,outcome,{startLine})`

뒤로 가는 곳(첫 줄·대사 아닌 화면에서): 이야기→`sceneBack()`, 선택 응답→같은 장면 선택지(`startLine:Infinity`), 도입→`sceneBack()`, 활동→도입 마지막 줄(도입이 없으면 `sceneBack()`), 활동 결과 대사→`activity()`, 엔딩 리포트→엔딩 대사 마지막 줄, 요약→`sceneBack()`. 장 첫 장면에서는 이전 장으로 넘어가지 않습니다(`startChapter(...,0)`이 회차 기록을 지우므로 이전 경로에서 절대 호출 금지).

- [ ] QA 확인 추가: ch1-1에서 →로 `2 / N`, 이전 버튼으로 `1 / N`(버튼이 켜져 있음), ←키도 같음. 선택 응답에서 이전 → 선택지 다시 보임. ch1-q2 첫 시도 정답 뒤 결과 대사에서 이전 → 다시 풀어도 총 하트 그대로. 기존 356~360 확인은 "ch1-1 제목이 보일 때까지 이전 → 다시 앞으로 → 오답 기록 1 유지"로 바꿈
- [ ] browser QA 실행 → 새 확인 실패
- [ ] `forward/setForward`와 같은 모양으로 `backward` 구현, 위 표대로 각 화면에서 `setBackward` 호출, 버튼·←키를 `goBack`에 연결
- [ ] 빌드 후 테스트·browser·playback QA 모두 통과, 커밋 `feat(festival-romance): 대사 한 줄 단위 이전 버튼`

### Task 4: 선택지 순서 섞기 (R7 공정성)

**파일:** 수정 `src/models.js`, `src/experiments.js`(`renderers.quiz` 81~), 테스트 `tests/models.test.cjs`, `tests/refinement.test.cjs`

**인터페이스:** 만듦 `M.seededOrder(seed: string, length: number): number[]` — 같은 `seed`면 항상 같은 순열(문자열 해시 + 작은 PRNG). `renderers.quiz`와 과제 6 대화 단계가 `questionId`(단계는 `questionId:단계번호`)로 보기 순서를 정함

- [ ] 테스트: 같은 seed 두 번 같은 결과, `0..length-1`의 순열, `['ch1-q1','ch1-q2','ch3-q4']` 중 하나 이상은 정답이 첫 칸이 아님
- [ ] 테스트(refinement): 채점 선택지마다 정답 보기 글자 수가 오답 평균의 ±25% 안
- [ ] 실패 확인 → 구현 → 기존 퀴즈 보기 문구 길이 조정 → 통과(QA 풀이는 `data-quiz-choice` 키로 누르므로 순서 무관)
- [ ] 커밋 `feat(festival-romance): 선택지 순서를 문항별로 섞기`

---

## 2단계: 1장 완성 (R1·R3·R5·R6·R7)

### Task 5: 순서 바꾸기 활동 엔진 `arrange`

**파일:** 수정 `src/experiments.js`(새 `renderers.arrange`), `src/models.js`, `src/styles.css`, 테스트 `tests/models.test.cjs`

**인터페이스:**
- 장면 `goal` 모양: `{blocks:[{id,label,indent?:boolean}], initialOrder:string[], acceptOrders:string[][], wrongHints:{[blockId]:string}, defaultWhy:string, simulate?:string}`
- 만듦 `M.evaluateArrange(order: string[], goal): {correct: boolean, firstWrongId: string|null}` — `acceptOrders` 중 하나와 같으면 정답, 아니면 가장 많이 맞는 정답 순서와 처음 어긋나는 블록 id
- `renderers.arrange`: 블록 행마다 ↑·↓ 버튼(필요하면 `반복 안으로/밖으로` 토글), `aria-live`로 "3번째 줄로 이동" 안내, `실행` 한 번이 채점 실행. 틀리면 `wrongHints[firstWrongId] || defaultWhy`로 `show(...,{valid:false,failWhy})`, 맞으면 `show(...,{valid:true})`

- [ ] 테스트: `evaluateArrange`가 정답 순서·두 번째 허용 순서·첫 블록만 틀린 순서(`firstWrongId`)·빈 배열을 올바르게 판정
- [ ] 실패 확인 → `evaluateArrange`·렌더러·CSS(390px에서 한 줄에 블록 하나) 구현 → 통과
- [ ] 커밋 `feat(festival-romance): 블록 순서 바꾸기 활동 엔진`

### Task 6: 대화형 선택 `quiz.style:'chat'`

**파일:** 수정 `src/experiments.js`(`renderers.quiz`), `src/styles.css`, 테스트 `tests/models.test.cjs` 또는 `tests/journey.test.cjs`

**인터페이스:** 장면 `quiz` 모양 `{style:'chat', steps:[{prompt, choices:[{key,label,correct?,why}]}]}`. 각 단계 채점은 기존 `M.gradeQuizAnswer(step,key)` 재사용. 하루 말풍선 + 답 버튼 3~4개, 보기 순서는 `seededOrder(questionId+':'+i)`. 틀리면 그 단계에서 `ctx.fail(why)`(하트 잃음)하고 그 단계만 다시, 마지막 단계 정답에서 `ctx.complete`

- [ ] 테스트(데이터 검사): `style:'chat'` 문항은 단계마다 정답이 정확히 1개, 보기 3~4개, 오답마다 `why` 있음
- [ ] 실패 확인 → 구현 → 통과. 브라우저에서 "1단계 정답·2단계 오답 → 하트 0, 2단계만 다시" 확인(과제 9 QA에 포함)
- [ ] 커밋 `feat(festival-romance): 하루와의 대화형 선택 문항`

### Task 7: 1장 대본 다시 쓰기·파이썬 제거·첫 화면 문구

**파일:** 수정 `src/chapters/ch1.cjs`, `src/shell.html:30`, `src/experiments.js`(`renderers.terms` 122~127·`questions.terms` 57 삭제)

1장 흐름(각 줄 끝은 다음 활동으로 이어지는 이유):

| 장면 | 내용 | 다음으로 이어지는 이유 |
| :--- | :--- | :--- |
| 1-1 | 밤 11:14, 주인공이 베타 앱 환영 화면에서 `" 님, 환영해요!"`를 보고 `버그 제보`를 누름 → 1분 만에 하루가 답장(정보 시간 이름을 알아봄) | 주인공이 버그를 직접 봄 |
| 1-2 (q1) | 하루가 환영 블록과 손글씨 순서 메모를 보여 줌. 둘 다 순서가 틀림 | 방금 제보한 버그 |
| 1-3 (q2) | "테스트 겸 나한테 친구 초대 보내 봐" → 초대 카드가 "정문 님", 티켓 3장(기본 6 + 가입 보너스 3이어야 9) | 앱의 다음 화면 시험 |
| 1-4 | 초대장에 만날 시각(`meetingTime`) 입력. 하루: 부스 근무는 4시까지, 저녁 점등은 공연팀과 함께 | 앱 시험이 약속으로 |
| 1-5 (q3) | 초대장 `길 안내` 버튼 → 미니맵 버그 | 주인공이 자기 초대장 버튼을 누름 |
| 1-6 (q4) | 초대장 `티켓 반씩 나누기`: 두 사람 티켓 9장·5장을 똑같이 나누는 평균이 7이 아니라 11.5로 나옴 → 고치면 한 사람당 7장, 이걸 2장짜리 게임에 쓰면 3번·1장 남음 | 1-3의 숫자가 이어짐 |
| 1-7 | 자정 마무리. "내일 부스 게이트·경품·저녁 점등도 다 이 앱이야" | 2·3장 예고 |

- [ ] 1장 하루 감정 대사를 남녀 두 가지로(과제 2 형식). `오냐` 대사 등 금지 표현 제거, 주인공의 차가운 첫 대사("인사만 하던 사이…") 순화
- [ ] `ch1.cjs`에서 `파이썬`·`print(`·`input(` 0건, `renderers.terms` 삭제, 첫 화면 문구를 R1 결정대로
- [ ] `refinement.test.cjs` 금지 문자열에 `파이썬`·`print(`·`input(` 추가, `answerHints`에 ch1-q1·ch1-q2 추가 → 테스트 통과
- [ ] 커밋 `feat(festival-romance): 1장 대본을 축제 앱 하나의 흐름으로 다시 쓰기`

### Task 8: 1장 활동 교체

**파일:** 수정 `src/chapters/ch1.cjs`(각 문항 `experiment`·`goal`·`flow`), `src/experiments.js`(`map`·`math` 확장), `tests/refinement.test.cjs`(문항-활동 표 37~65)

| 문항 | 새 활동 | 첫 시도 정답 |
| :--- | :--- | :--- |
| ch1-q1 | `arrange`: `시작` 아래 `묻기`/`[이름] 정하기`/`말하기` 순서 맞추기 → 실행하면 가짜 앱이 이름을 묻고 초대장 표시 | 첫 실행에서 `{{name}} 님의 축제 초대장` |
| ch1-q2 | (사용자 1장 확인 뒤 변경) 하루의 초대장 블록과 실행 기록(대답·이름·장소·티켓 칸)을 보고 하루와 2턴 대화: ① 이름이 '정문'이 된 까닭 ② 고칠 방법(받자마자 저장 + 보너스는 더하기). 순서 바꾸기는 1번만 | 두 턴 모두 첫 선택 정답 |
| ch1-q3 | `map` 확장: 시작 신호 칩(시작/→/↑)과 0·90·180·270 나침반 버튼, 실제로 →나 시작을 눌러 한 칸씩 이동 | 처음 실제로 움직인 실행이 정문 도착 |
| ch1-q4 | `math` 확장: `9 + 5 ÷ 2` 사이 틈을 눌러 괄호 넣기 → 계산 순서 애니메이션, 이어서 대화 1턴("3.5번 탄다고?") 보기: 3번·1장 남음 / 3.5번 / 4번(반올림) / 1번·3장 남음 | 괄호와 대화 답 모두 첫 시도 |

- [ ] `refinement.test.cjs`의 문항-활동 표를 새 활동으로 갱신 → 실패 확인 → 데이터·렌더러 확장 → 통과
- [ ] 미션 목표·도입 대사에 정답 단서 없음(과제 7에서 넓힌 검사 통과)
- [ ] 커밋 `feat(festival-romance): 1장 활동을 조작·대화형으로 교체`

### Task 9: 1장 검증·문서·사용자 확인

**파일:** 수정 `qa/browser.cjs`(`solveCurrentChallenge` 112~, ch1 오답 키 334·363), `qa/playback-app.cjs`(필요 시), `teaching-materials/festival-romance/HANDOFF.md`·`README.md`, `docs/HANDOFF.md`

- [ ] QA 풀이를 새 활동에 맞게 고침, 검토 초점 4·5 확인 추가(390px에서 버튼만으로 `arrange` 완료, 대화 2턴 오답 처리), 남학생/여학생 전환 시 같은 장면의 대사가 바뀌는지 확인
- [ ] 실행: `node teaching-materials/festival-romance/build.cjs`, `node --test teaching-materials/festival-romance/tests/*.test.cjs`, `node teaching-materials/festival-romance/qa/browser.cjs`, `node teaching-materials/festival-romance/qa/playback-app.cjs`, `node scripts/check-docs.mjs` → 모두 통과(테스트 개수 기록)
- [ ] 1장 스크린샷(데스크톱·390px, 남/여) 확인, HANDOFF 해시·테스트 수·남은 작업 갱신
- [ ] 커밋·PR #120 브랜치 push, **사용자에게 1장 확인 요청**(말투·재미·개연성). 피드백을 3단계 과제에 반영

## 3단계: 2·3장 (1장 확인 뒤 상세화)

이미 정한 방향만 적고, 과제는 1장 피드백 뒤 위와 같은 형식으로 씁니다.

- **2장:** 부스 앱 게이트 하나를 재사용(사진 부스 경계값 → 같은 모듈의 다음 부스에서 AND 버그), 비 → 앱 우천 안내, 새 연결 장면 2-4b(실내 부스 스탬프 모으기, 톤 선택), 모은 스탬프로 경품 교환. 활동: ch2-q1 손님 줄 게이트(5·6·7장), ch2-q2 부스 스태프와 대화 2턴, ch2-q3 날씨 3가지 상황 경로, ch2-q4 `arrange`로 `만일` 줄 순서
- **3장:** 과학동아리 드론 + 하루가 짠 엔트리 점등 대본, 큐시트 4개 순서대로. 잠금 암호는 "어젯밤 정한 약속 시각"(게임 밖 표현 "1챕터" 제거), 엔딩의 "내일 축제 끝나고" → "이번 주말에". 활동: ch3-q1 횟수 스테퍼 + 대화 1턴, ch3-q2 각도 ±1/±10 스테퍼, ch3-q3 `arrange`로 `묻기` 위치 + `=`/`≠` 토글(10번 검사 뒤 "무한 반복!" 중단), ch3-q4 하루와 3턴 대화
- **썸 엔딩 고백:** "제보자 이름 보고, 다른 팀원한테 안 넘기고 내가 답장했어."(1-1과 연결)

## 실행 방식

같은 파일(`app.js`·`experiments.js`·`ch1.cjs`)을 여러 과제가 차례로 고치고 대본 말투를 한 사람이 일관되게 써야 하므로, 한 세션이 순서대로 구현하고(executing-plans) 1장 완료 시점에 새 검토자 1명이 전체 변경을 봅니다.
