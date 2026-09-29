# Firebase 연결과 검증

갱신: 2026-09-28. 승인 대상은 `cs-class-f74c4`, 기본 Firestore Standard DB는 서울(`asia-northeast3`)입니다. V1이나 도구가 이전에 가리키던 다른 프로젝트를 사용하지 않습니다.

## 현재 연결

- 사용자 제공 서비스 계정으로 Auth·Firestore 읽기를 확인했습니다. 키 원본은 저장소 밖에 있으며 Git 제외 `.env.local`은 경로만 참조합니다.
- 이메일/비밀번호 로그인과 Google 로그인을 켰습니다. 교사 이메일 허용 목록은 서버 환경변수에 저장합니다. 2학년 1~11반의 빈 설정을 만들었으며 실제 학생 계정은 아직 등록하지 않았습니다.
- 검증한 `firestore.rules`를 해당 프로젝트에 적용했습니다. [PR #6](https://github.com/DonghyunT/cs-class/pull/6) 병합으로 Vercel Production 배포를 완료했습니다. 일반 Preview는 운영 DB에 연결하지 않으며, 실제 로그인 검증과 빌드 성공을 구분합니다.
- 임시 합성 계정으로 실제 서버 로그인→반 수업 지정→개념·퀴즈 완료→실습 검증·제출→재로그인 복원→교사 조회를 확인했습니다. 직접 Firestore 접근 거부도 확인했고 임시 계정 두 개와 기록을 삭제하고 시험 반을 복원했습니다.
- localhost와 운영 주소에서 선생님이 직접 허용 Google 계정으로 입장했고, 교사 대시보드·담당 11반 목록과 1·11반 조회를 브라우저에서 확인했습니다. 운영 데이터에 추가 시험 계정을 넣지 않았으며 상세 범위는 [배포 기록](HANDOFF.md#통합배포-상태)을 따릅니다.

## 다른 PC의 서버 설정

화면·학습 흐름 개발과 자동 검사는 [README의 에뮬레이터 실행](DEVELOPMENT.md#다른-pc에서-시작)만으로 가능합니다. 아래는 실제 `cs-class-f74c4`에 연결해야 할 때만 사용합니다.

이미 설정한 PC의 연결을 이어갈 때는 기존 `.env.local`과 관리자 JSON을 본인이 관리하는 안전한 경로로 따로 옮기고 `GOOGLE_APPLICATION_CREDENTIALS`만 새 PC의 경로로 맞춥니다. 같은 프로젝트의 교사 허용 목록·초기/초기화 비밀번호 설정은 유지합니다. Git이나 채팅에 파일·값을 올리지 않습니다. 아래 설정 도구는 기존 환경파일이 없는 최초 준비용이며 공통 비밀번호를 새로 생성합니다.

1. [Firebase 서비스 계정 설정](https://console.firebase.google.com/project/cs-class-f74c4/settings/serviceaccounts/adminsdk)에서 준비한 인증 JSON을 저장소 밖의 본인만 접근하는 위치에 둡니다. 키 파일·내용을 채팅, Git, 화면 캡처에 넣지 않습니다.
2. Firebase CLI에 해당 프로젝트 권한이 있는 계정으로 로그인합니다. 저장소 루트에서 아래 명령의 경로와 교사 이메일을 실제 값으로 바꿉니다. 기존 `.env.local`이 있으면 덮어쓰지 않고 중단합니다.

```powershell
node scripts/configure-local-firebase.mjs "D:/private/firebase-admin.json" "teacher@example.com"
node --env-file=.env.local scripts/check-firebase.mjs
npm run dev -- --hostname localhost --port 3000
```

Google 로그인을 확인할 때는 승인된 `localhost`를 사용해 [교사 입장](http://localhost:3000/login/teacher)을 엽니다. 내장 웹뷰에서 Google이 로그인을 제한하면 일반 Chrome/Edge에서 엽니다. 임의의 Preview 주소를 승인 도메인에 일괄 추가하지 않습니다.

설정 도구는 공개 웹 설정을 CLI에서 읽고 관리자 파일 경로·교사 이메일·서로 다른 무작위 초기/초기화 비밀번호를 `.env.local`에 작성합니다. 실제 학생을 등록하기 전 선생님이 해당 값을 안전하게 확인하고 전달 방식을 정해야 합니다. 비밀번호는 로그에 출력하지 않습니다. [.env.example](../.env.example)은 변수명 안내입니다.

| 설정 | 용도 |
|---|---|
| `FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY`, `FIREBASE_AUTH_DOMAIN` | 선택한 Firebase 웹 프로젝트 |
| `GOOGLE_APPLICATION_CREDENTIALS` | 로컬 관리자 JSON의 절대 경로(ADC) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | 호스팅의 서버 전용 비밀 환경변수 대안 |
| `CS_TEACHER_EMAILS` | Google 로그인 허용 이메일, 여러 개는 쉼표로 구분 |
| `CS_INITIAL_PASSWORD`, `CS_RESET_PASSWORD` | 서로 다른 초기/초기화 비밀번호 |

호스팅에는 로컬 파일 경로를 옮기지 않습니다. 승인된 호스팅의 서버 비밀 설정 또는 해당 플랫폼의 관리형 인증을 사용하며, 비공개 키를 `NEXT_PUBLIC_*`로 등록하지 않습니다. Auth·Firestore 에뮬레이터 변수는 호스팅에 넣지 않습니다. 현재 코드는 Vercel에서 에뮬레이터 변수가 감지되면 거부합니다.

## Vercel 서버 설정

운영 주소는 [CS Class](https://cs-class-donghyunt.vercel.app)입니다. 2026-09-28 사용자 승인으로 해당 도메인을 Firebase Authentication 허용 목록에 추가했습니다. Vercel `cs-class`에는 위 표의 Firebase 웹 설정 3개, 관리자 JSON, 교사 허용 목록, 초기·초기화 비밀번호 총 7개를 **Production 전용 Secret**으로 등록했습니다. 일반 Preview에는 운영 인증정보를 넣지 않습니다.

Preview와 Production 양쪽에 일반 설정 `NODE_OPTIONS=--experimental-require-module`을 등록해야 합니다. Firebase Admin 14의 `jwks-rsa`가 ESM 전용 `jose`를 불러오는데, Vercel은 이 Node 기능을 기본으로 끕니다. 설정 없이 빌드와 로컬 검사가 통과해도 배포 API 시작 시 `ERR_REQUIRE_ESM`으로 실패합니다. [Vercel 공식 실행 설정](https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration#experimental-nodejs-require-of-es-module)을 적용하며, 의존성을 임의로 낮추지 않습니다.

환경변수 변경은 새 배포부터 적용됩니다. 배포 후 `/api/auth/session`이 JSON으로 응답하는지 확인합니다. Firebase 키가 없는 일반 Preview는 `configured: false`와 로그인 준비 안내가 정상입니다. Production에서는 Google 교사 로그인·대시보드 읽기를 확인하고 비로그인 사용자의 수업 API 거부도 검사합니다. 배포 완료만으로 실제 로그인 성공을 판정하지 않습니다.

현재 운영 주소에도 기존 Vercel SSO 보호가 적용됩니다. Vercel에 로그인하지 않은 요청은 앱 API에 도달하기 전 302 인증 이동으로 차단됩니다. 새 PC에서는 Vercel 계정 로그인 후 앱의 Google 로그인을 진행합니다. 학생 공개 배포 때는 이 보호의 적용 범위와 실제 학생 계정 등록을 함께 결정합니다.

## 실제 프로젝트 초기화와 시험

`node --env-file=.env.local scripts/init-firebase.mjs`는 추가할 빈 반을 먼저 보여줍니다. `--apply`는 이메일/비밀번호 로그인 활성화와 없는 반 생성만 수행하며 기존 반·학생 기록을 덮어쓰지 않습니다. Google 제공자는 콘솔에서 지원 이메일과 함께 설정합니다.

실학생 계정은 자동으로 297명을 생성하지 않았습니다. 최초 적용 반·학번 목록·초기 비밀번호 전달을 확인한 뒤 Auth UID `student-학번`, 서버 `csAccounts`를 함께 등록해야 합니다. 이름·연락처는 현재 모델에 필요하지 않습니다. 강사 계정은 별도 발급하며 담당 반은 10·11반입니다.

`check-cloud-flow.mjs`는 별도 로컬 3001번 서버가 실제 승인 프로젝트에 연결됐는지 확인합니다. 기본 실행은 계획만 표시하고, `--apply`는 빈 11반과 충돌하지 않는 임시 학생·강사 UID가 있을 때만 시험합니다. 계정 등록을 시작한 운영 환경에서 반복 실행하는 도구가 아닙니다. 서버와 브라우저의 모든 최종 상태 검증을 이 스크립트 하나로 대신하지 않습니다.

## 로컬 자동 검사

Java 21+와 Node.js 24를 사용합니다. Java를 별도 위치에 설치했다면 해당 터미널의 `JAVA_HOME`과 `PATH`에만 지정할 수 있습니다. CI는 `setup-java`를 사용합니다.

```powershell
npm ci
npx playwright install chromium
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

테스트는 `demo-cs-class`, Auth `127.0.0.1:9099`, Firestore `127.0.0.1:8080`만 사용합니다. 테스트 시드는 4명의 가상 학생과 가상 강사를 준비하고 작업 규칙·권한·세션·저장 충돌·네트워크 실패·이력 이동·모바일 화면을 검사합니다. UI에서 사용하는 합성 비밀번호는 [local-test-env.mjs](../scripts/local-test-env.mjs)에 있으며 실제 서비스 비밀번호가 아닙니다.

앱 테스트 주소는 `http://localhost:3000`입니다. Playwright API 쿠키 저장소가 로컬 HTTP의 Secure 쿠키를 지원하는 호스트 이름을 사용하며, 운영 쿠키 보안을 낮추지 않습니다. 빌드 후 PowerShell에서 `$env:CI='1'`을 설정하고 E2E를 실행하면 CI와 같은 `next start` 검사가 됩니다. 2026-09-28 이 방식으로 전체 27개와 lint·typecheck·build를 통과했습니다.

## 계정 변경 장애 복구

Auth 비밀번호 변경 뒤 DB 확정이 실패하면 이전 접속을 살리지 않고 `authBusy`와 작업 시각을 남겨 잠급니다. 잠금은 자동으로 풀지 않습니다. 일시 오류를 무시하고 DB의 잠금 필드만 삭제하지 않습니다.

1. 해당 앱 서버를 멈추고 진행 중인 계정 변경 요청이 끝났는지 확인합니다.
2. `node --env-file=.env.local scripts/recover-account.mjs 20101`로 승인 프로젝트와 잠금 상태를 확인합니다.
3. 대상 학번·서버 중단을 확인한 뒤 같은 명령에 `--apply-app-stopped`를 붙입니다.

복구는 초기화 비밀번호 재설정, 기존 토큰·세션 폐기, 다음 입장 변경 요구를 모두 수행한 뒤 잠금을 풉니다. 학습 기록은 건드리지 않으며 중간 실패 시 잠금을 유지해 재시도할 수 있습니다. 로컬 에뮬레이터에서 복구 후 기록 보존·기존 세션 거부를 검사했습니다.

## 데이터와 남은 한계

- `csAccounts`: 역할·반·변경 필요 여부·세션 해시·무활동 시각. 평문 개인 비밀번호를 저장하지 않습니다.
- `csClasses`: 공개 수업·이번 수업·revision. 이미 열린 수업은 유지합니다.
- `csWork`: 학생별 초안·풀이 결과·검증·최근 제출본·revision. 완료는 서버가 판정합니다.
- `csRateLimits`, `csGoogleExchanges`: 로그인 제한과 Google 로그인 토큰 재사용 방지. 후속 운영에서 보관 기간·정리 작업을 마련합니다.
- 학생 10분(9분 경고), 교사/강사 4시간 무활동 만료입니다. 자동 저장·조회는 활동으로 취급하지 않습니다. 새 로그인만 기존 세션을 바꿉니다.
- 세션 쿠키는 HttpOnly·SameSite=Strict, 배포 환경 Secure이며 지속 만료일을 넣지 않습니다. 브라우저의 세션 복원 기능은 쿠키를 복구할 수 있어 창 닫기를 절대적인 로그아웃 보장으로 취급하지 않습니다. 공용 PC에서는 로그아웃을 사용합니다.
- 미저장 답안은 현재 화면 메모리에만 유지합니다. 서버 저장이 실패한 채 강제로 창을 닫거나 세션을 종료한 뒤의 복구는 보장하지 않습니다. 다른 사용자에게 남지 않도록 브라우저 영속 저장소에 답안을 남기지 않습니다.
- 현재는 수업 하나입니다. 수업 버전 변경·학년도 전환·실학생 대량 등록·심화·EntryJS·AI·Q&A는 후속 작업입니다.
- 2026-09-28 의존성 점검에서 `npm audit` 중간 수준 경고 5개(운영 의존성 범위 2개)가 남았습니다. `uuid/gaxios`, 개발 CLI의 OpenTelemetry/PubSub 경로이며 high/critical은 없었습니다. 무관한 강제 메이저 다운그레이드를 적용하지 않았고 업스트림 갱신을 추적해야 합니다.

공식 설정: [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup), [Application Default Credentials](https://docs.cloud.google.com/docs/authentication/provide-credentials-adc).
