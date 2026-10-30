# 완료 계획 원문 (2026-10-30)

2026-10-30 엔트리 라이브러리 파일을 Cloudflare로 나누는 작업(#97, 이어서 CDN 주소를 켠 PR)을 마치며 `docs/plans/`에서 뺀 완료 계획 1개입니다. `git mv`로 옮겨 내용은 바꾸지 않았고, 원래 경로·바이트·sha256은 [manifest.json](manifest.json)에 있습니다(바이트·해시는 Git에 저장된 LF 기준).

- `entry-assets-cloudflare.md`: `public/entryjs/vendor/`만 Cloudflare Workers 정적 파일로 옮긴 계획. §2에 설계와 이유, §3에 작업 루프·첫 업로드 기록, §5에 남는 위험이 있습니다.

계획의 "push 전" 같은 상태와 "승인 필요"는 당시 문맥이며 현재 지시가 아닙니다. 현재 절차는 [엔트리 라이브러리 CDN](../../../FIREBASE_SETUP.md#엔트리-라이브러리-cdn)과 [개발 안내 §4.1](../../../DEVELOPMENT.md#entryjs-실습)을 따릅니다. 원문의 상대 링크는 원래 위치 기준이며 보관 위치에 맞춰 고치지 않았습니다.
