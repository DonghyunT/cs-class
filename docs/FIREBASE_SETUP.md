# Firebase 연결과 검증

문서 갱신: 2026-10-02. 실제 환경 확인 날짜·범위는 HANDOFF를 따릅니다. 승인 대상은 `cs-class-f74c4`, 기본 Firestore Standard DB는 서울(`asia-northeast3`)입니다. V1이나 도구가 이전에 가리키던 다른 프로젝트를 사용하지 않습니다.

## 연결 기준

실제 환경은 이메일/비밀번호·Google 제공자, 서버의 교사 허용 목록과 서버 전용 Firestore 규칙을 사용합니다. 관리자 키 원본은 저장소 밖에 두고 Git 제외 `.env.local`은 경로만 참조합니다. 실제 연결·배포·로그인 확인의 날짜와 한계는 [HANDOFF](HANDOFF.md#통합배포-상태)에 기록합니다. 이 문서의 설정 절차가 계정 등록이나 운영 변경의 승인을 뜻하지 않습니다.

## 다른 PC의 서버 설정

화면·학습 흐름 개발과 자동 검사는 [개발 안내의 에뮬레이터 실행](DEVELOPMENT.md#다른-pc에서-시작)만으로 가능합니다. 아래는 실제 `cs-class-f74c4`에 연결해야 할 때만 사용합니다.

이미 설정한 PC의 연결을 이어갈 때는 기존 `.env.local`과 관리자 JSON을 본인이 관리하는 안전한 경로로 따로 옮기고 `GOOGLE_APPLICATION_CREDENTIALS`만 새 PC의 경로로 맞춥니다. 같은 프로젝트의 교사 허용 목록과 과거 공통값 재사용 거부 설정은 유지합니다. Git이나 채팅에 파일·값을 올리지 않습니다. 아래 설정 도구는 기존 환경파일이 없는 최초 준비용입니다.

1. [Firebase 서비스 계정 설정](https://console.firebase.google.com/project/cs-class-f74c4/settings/serviceaccounts/adminsdk)에서 준비한 인증 JSON을 저장소 밖의 본인만 접근하는 위치에 둡니다. 키 파일·내용을 채팅, Git, 화면 캡처에 넣지 않습니다.
2. Firebase CLI에 해당 프로젝트 권한이 있는 계정으로 로그인합니다. 저장소 루트에서 아래 명령의 경로와 교사 이메일을 실제 값으로 바꿉니다. 기존 `.env.local`이 있으면 덮어쓰지 않고 중단합니다.

```powershell
node scripts/configure-local-firebase.mjs "D:/private/firebase-admin.json" "teacher@example.com"
node --env-file=.env.local scripts/check-firebase.mjs
npm run dev -- --hostname localhost --port 3000
```

Google 로그인을 확인할 때는 승인된 `localhost`를 사용해 [교사 입장](http://localhost:3000/login/teacher)을 엽니다. 내장 웹뷰에서 Google이 로그인을 제한하면 일반 Chrome/Edge에서 엽니다. 임의의 Preview 주소를 승인 도메인에 일괄 추가하지 않습니다.

설정 도구는 공개 웹 설정을 CLI에서 읽고 관리자 파일 경로·교사 이메일·호환용 초기/초기화 설정값을 `.env.local`에 작성합니다. 이 공통값은 학생에게 전달하거나 운영 계정 발급에 사용하지 않습니다. 실제 발급은 아래 학생별 임시값 생성 기준을 따릅니다. 비밀번호는 로그에 출력하지 않습니다. [.env.example](../.env.example)은 변수명 안내입니다.

| 설정 | 용도 |
|---|---|
| `FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY`, `FIREBASE_AUTH_DOMAIN` | 선택한 Firebase 웹 프로젝트 |
| `GOOGLE_APPLICATION_CREDENTIALS` | 로컬 관리자 JSON의 절대 경로(ADC) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | 호스팅의 서버 전용 비밀 환경변수 대안 |
| `CS_TEACHER_EMAILS` | Google 로그인 허용 이메일, 여러 개는 쉼표로 구분 |
| `CS_INITIAL_PASSWORD`, `CS_RESET_PASSWORD` | 과거 공통값의 개인 비밀번호 재사용 거부와 demo fixture용. 운영 임시 입장 인증에는 사용하지 않음 |

호스팅에는 로컬 파일 경로를 옮기지 않습니다. 승인된 호스팅의 서버 비밀 설정 또는 해당 플랫폼의 관리형 인증을 사용하며, 비공개 키를 `NEXT_PUBLIC_*`로 등록하지 않습니다. Auth·Firestore 에뮬레이터 변수와 로컬 게스트용 `CS_TEST_GUEST_PASSWORD`는 호스팅에 넣지 않습니다. 게스트 준비 조건은 [개발 안내](DEVELOPMENT.md#로컬-게스트-입장)에 있습니다. 현재 코드는 Vercel에서 에뮬레이터 변수가 감지되면 거부합니다.

## Vercel 서버 설정

연결 프로젝트는 `cs-class`(`prj_RUUtcTMukVY9kjudgDr6VA89KKxP`)입니다. Root Directory는 비워 둔 저장소 루트, Framework Preset은 Next.js, Node.js는 24.x이며 빌드·설치·출력은 프레임워크 기본값을 사용합니다. Git 연동의 작업 브랜치는 Preview, `main`은 Production입니다. MCP는 프로젝트 연결로 호출하고 팀 범위를 임의로 덧붙이지 않습니다. 응답에 루트 설정이 없으면 Build and Deployment 화면에서 확인합니다. 한 도구의 403을 전체 연결 불가로 일반화하지 않습니다.

운영 주소는 [CS Class](https://cs-class-donghyunt.vercel.app)입니다. 2026-09-28 사용자 승인으로 해당 도메인을 Firebase Authentication 허용 목록에 추가했습니다. Vercel `cs-class`에는 위 표의 Firebase 웹 설정 3개, 관리자 JSON, 교사 허용 목록, 초기·초기화 비밀번호 총 7개를 **Production 전용 Secret**으로 등록했습니다. 일반 Preview에는 운영 인증정보를 넣지 않습니다.

운영 도메인은 Vercel 프로젝트의 Production에 `cs-class-donghyunt.vercel.app`을 연결하고, 이전 `cs-class-sigma.vercel.app`은 해당 주소로 307 이동하도록 유지합니다. 공유 링크와 로그인 확인에는 운영 주소를 사용합니다. Vercel 도메인 연결과 Firebase Authentication의 승인 도메인은 별도 설정입니다. 다른 주소에서 Google 로그인이 실패하면 최종 접속 도메인과 Firebase의 도메인 오류를 먼저 확인하며, 임의의 배포·Preview 주소를 승인 목록에 추가해 해결하지 않습니다. 설정 변경 뒤에는 이전 주소의 경로 유지와 실제 Google 로그인·세션 생성을 구분해 검증합니다.

Preview와 Production 양쪽에 일반 설정 `NODE_OPTIONS=--experimental-require-module`을 등록해야 합니다. Firebase Admin 14의 `jwks-rsa`가 ESM 전용 `jose`를 불러오는데, Vercel은 이 Node 기능을 기본으로 끕니다. 설정 없이 빌드와 로컬 검사가 통과해도 배포 API 시작 시 `ERR_REQUIRE_ESM`으로 실패합니다. [Vercel 공식 실행 설정](https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration#experimental-nodejs-require-of-es-module)을 적용하며, 의존성을 임의로 낮추지 않습니다.

환경변수 변경은 새 배포부터 적용됩니다. 배포 후 `/api/auth/session`이 JSON으로 응답하는지 확인합니다. Firebase 키가 없는 일반 Preview는 `configured: false`와 로그인 준비 안내가 정상입니다. Production에서는 Google 교사 로그인·대시보드 읽기를 확인하고 비로그인 사용자의 수업 API 거부도 검사합니다. 배포 완료만으로 실제 로그인 성공을 판정하지 않습니다.

Vercel 프로젝트의 기존 SSO 보호 설정은 유지합니다. 보호가 적용되는 주소에서는 앱 API에 도달하기 전에 Vercel 인증 화면으로 이동할 수 있습니다. 프로젝트 도메인·Preview·배포별 주소의 적용 범위를 구분하며, 이전 배포 주소에서 관찰한 302를 모든 운영 도메인의 현재 동작으로 일반화하지 않습니다. 학생 공개 배포 때는 이 보호의 실제 적용 범위와 학생 계정 등록을 함께 결정합니다.

## 실제 프로젝트 초기화와 시험

`node --env-file=.env.local scripts/init-firebase.mjs`는 추가할 빈 반을 먼저 보여줍니다. `--apply`는 이메일/비밀번호 로그인 활성화와 없는 반 생성만 수행하며 기존 반·학생 기록을 덮어쓰지 않습니다. Google 제공자는 콘솔에서 지원 이메일과 함께 설정합니다.

실학생 계정은 자동으로 297명을 생성하지 않았습니다. 최초 적용 반·학번 목록·초기 비밀번호 전달을 확인한 뒤 Auth UID `student-학번`, 서버 `csAccounts`를 함께 등록해야 합니다. 이름·연락처는 현재 모델에 필요하지 않습니다. 강사 계정은 별도 발급하며 담당 반은 10·11반입니다.

`check-cloud-flow.mjs`는 로컬 3001번의 공개 설정만 읽으며 서버 신원을 입증하지 않습니다. `--apply`는 네트워크·관리자 초기화 전에 거부합니다. 운영 합성 계정 생성·비밀번호 전달 검사는 폐기했고 자동 검증은 로컬 demo 에뮬레이터에서만 수행합니다. 운영 확인은 배포 SHA·익명 API·실제 승인 계정의 사용자 흐름을 구분합니다.

## 로컬 자동 검사

설치·실행 명령과 CI 방식은 [DEVELOPMENT의 검증](DEVELOPMENT.md#검증)을 따릅니다. Firebase 검사는 `demo-cs-class`, Auth `127.0.0.1:9099`, Firestore `127.0.0.1:8080`만 사용합니다. 합성 계정은 [local-test-env.mjs](../scripts/local-test-env.mjs)에 정의하며 운영 계정·자료를 사용하지 않습니다.

## 계정 변경 장애 복구

Auth 비밀번호 변경 뒤 DB 확정이 실패하면 이전 접속을 살리지 않고 `authBusy`와 작업 시각을 남겨 잠급니다. 잠금은 자동으로 풀지 않습니다. 일시 오류를 무시하고 DB의 잠금 필드만 삭제하지 않습니다.

1. 해당 앱 서버를 멈추고 진행 중인 계정 변경 요청이 끝났는지 확인합니다.
2. `node --env-file=.env.local scripts/recover-account.mjs 20101`로 승인 프로젝트와 잠금 상태를 확인합니다.
3. 대상 학번·서버 중단을 확인한 뒤 같은 명령에 `--apply-app-stopped --credential-file "D:/private/student-20101-new.json"`을 붙입니다. 본인만 접근할 수 있는 새 파일을 지정하며 기존 파일은 덮어쓰지 않습니다.

복구는 학생별 임시값을 전달 파일에 확보하고 별도의 Firebase 무작위 비밀번호, 기존 토큰·세션 폐기, 다음 입장 변경 요구를 모두 수행한 뒤 잠금을 풉니다. 비밀번호는 로그에 출력하지 않습니다. 성공 안내 후 파일을 해당 학생에게만 전달하고 안전하게 삭제합니다. 중간 실패 시 잠금을 유지하며 새 파일로 다시 실행합니다. 학습 기록은 건드리지 않습니다.

### 보안 수정 적용과 남은 공급자 경계

학생별 임시 발급·만료·재발급 운영은 [PRD](PRD.md#학생-비밀번호와-초기화)를 따릅니다. 기존 정상 개인 계정·교사 Google 로그인·학습 기록을 이 배포에서 일괄 변경하지 않습니다. 공통값을 쓰는 변경 필요 계정은 개별 재발급이 필요합니다. 최초 등록은 `temporary-password.mjs`의 생성 결과에서 Firebase용 값과 학생용 값을 분리하고 `temporaryPassword` 검증값·만료를 함께 등록해야 하며 기존 엑셀 공통값을 그대로 넣지 않습니다.

개인 비밀번호 계정은 Firebase REST로 앱 장부 밖에서 인증·비밀번호 변경을 시도할 수 있습니다. 임시 입장은 이 경로에서 차단했지만 정상 개인 비밀번호는 호환성을 유지합니다. Firebase Console의 Authentication 비밀번호 정책(Require·최소 8자·영문/숫자)과 Identity Toolkit 남용 방어·할당량을 운영 수업의 동시 입장 규모에 맞춰 별도로 확인합니다. 설정의 현재 강제 여부는 이 코드 검사로 입증하지 않으며 실제 변경은 기존 사용자의 영향을 확인한 뒤 적용합니다. 관련 공식 문서: [비밀번호 정책](https://firebase.google.com/docs/auth/web/password-auth#recommended_set_a_password_policy), [할당량](https://firebase.google.com/docs/auth/limits).

2026-10-02 기존 Firebase CLI 로그인으로 승인 프로젝트 `config`를 읽기 전용 조회했습니다(HTTP 200). 이메일/비밀번호 인증은 활성화돼 있고 응답에 `passwordPolicyConfig`가 없습니다. 운영 네이티브 8자 정책이 강제된 것으로 보고하지 않습니다. 후속 정책을 적용할 때 기존 사용자의 입장을 막는 `forceUpgradeOnSignin`을 먼저 확인하며, 현재 릴리스는 이 설정·계정·학생 자료를 변경하지 않았습니다.

## 데이터와 남은 한계

- `csAccounts`: 역할·반·변경 필요 여부·세션 해시·무활동 시각. 평문 개인 비밀번호를 저장하지 않습니다.
- `csClasses`: 공개 수업·이번 수업·revision. 이미 열린 수업은 유지합니다.
- `csWork`: 학생별 초안·풀이 결과·검증·최근 제출본·revision. 완료는 서버가 판정합니다.
- `csTodos/{uid}`: 본인 개인 할 일의 `revision`과 `items`(항목 ID·텍스트·완료 의도). 서버 세션 UID만 사용하고 교사도 다른 사용자의 목록을 조회하지 않습니다.
- `csSchedules/{classId}`: 반 일정의 `revision`과 `items`(항목 ID·제목·한국 날짜·선택 수업 ID). 학생은 본인 반 조회만, 교사·강사는 담당 반 조회·수정만 허용합니다. 계정·반 권한·열린 수업을 같은 서버 트랜잭션에서 확인합니다.
- 데이터는 서버 API로만 접근하며 직접 Firestore 접근은 차단합니다. 쓰기는 Origin·세션 UID·revision을 검사합니다. 재시도·동시 변경·한도·일정의 제품 의미는 [PRD](PRD.md#작은-버전의-경계와-저장-동작)를 기준으로 합니다.
- `csRateLimits`, `csGoogleExchanges`: 로그인 제한과 Google 로그인 토큰 재사용 방지. 후속 운영에서 보관 기간·정리 작업을 마련합니다.
- 무활동 만료·연장·동시 접속·저장 기록의 제품 정책은 [PRD의 로그인 정책](PRD.md#로그인-정책)에 모읍니다. 서버 세션은 계정의 세션 해시·활동 시각과 대조합니다.
- 세션 쿠키는 HttpOnly·SameSite=Strict, 배포 환경 Secure이며 지속 만료일을 넣지 않습니다. 브라우저의 세션 복원 기능은 쿠키를 복구할 수 있어 창 닫기를 절대적인 로그아웃 보장으로 취급하지 않습니다. 공용 PC에서는 로그아웃을 사용합니다.
- 미전송 초안과 강제 종료 후 복구 경계는 [PRD의 저장 정책](PRD.md#작업-저장과-통신-비용), 미해결 제품·운영 과제는 [HANDOFF](HANDOFF.md#남은-한계와-다음-결정)에 있습니다. EntryJS 실행·자산·검사는 [개발 안내](DEVELOPMENT.md#entryjs-실습)를 따릅니다.
- 의존성 점검의 미해결 항목·확인 날짜는 [HANDOFF](HANDOFF.md#남은-한계와-다음-결정)에 기록합니다.

공식 설정: [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup), [Application Default Credentials](https://docs.cloud.google.com/docs/authentication/provide-credentials-adc).
