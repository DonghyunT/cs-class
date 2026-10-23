# 이미지 제작 기록

이 자료의 캐릭터와 배경은 기본 내장 이미지 생성 도구(imagegen)로 제작했습니다. CLI/API 우회 경로는 사용하지 않았습니다. 현재 HTML은 남녀 6표정 v6를 사용하며, 작은 의상 배지는 사용자 제공 교표를 참조했습니다. 아래는 버전별 제작 기록입니다.

## 캐릭터

- 남학생: `haru-boy-prompt-v2.txt`
- 여학생: `haru-girl-prompt-v2.txt`
- 확정 이미지: `haru-boy-character-sheet-v2.png`, `haru-girl-character-sheet-v2.png`
- 비교 시트에서 한 표정씩 CSS 배경 위치로 표시합니다. v2와 v3는 3표정이었던 이전 버전이며 현재 HTML은 아래 v6를 사용합니다.

## 축제 전날 밤 배경

```text
Use case: illustration-story. Create a wide landscape 16:9 background painting for an innocent Korean middle-school visual novel. A cozy student's study corner at night, seen at eye level: a simple light wood desk along the left edge with a closed notebook and pencil case, soft amber desk lamp, a window toward the right showing a quiet deep blue evening sky and distant warm city windows, a small potted plant on the sill, muted cream walls and dusty navy curtains. The central and right foreground should be visually simple with space for a waist-up character and dialogue UI overlay. Refined Korean 2D visual-novel background art with clean perspective, subtle painted texture, restrained rich navy, soft amber and muted cream palette. Gently anticipatory mood, calm rather than dramatic. Do not include people, photographs of people, readable text, school logos, screens with text, letters, UI, watermarks or speech bubbles. Keep the scene uncluttered, warm and age-neutral.
```

## 축제 마지막 운동장 배경

```text
Use case: illustration-story. Background art only for the final chapter of a gentle Korean middle-school festival visual novel. Wide landscape 16:9, an ordinary Korean school sports field at blue-hour twilight just after sunset, dark lavender-blue sky with a few warm peach clouds, distant low school building at the left edge, a small simple student performance stage far in the background, warm string lights hanging along the edges and across the upper sky, very subtle geometric light decorations near the stage. A large calm open foreground and open center-right for a character overlay. Magical feeling created by ordinary school festival lighting rather than fantasy: warm golden bulbs against muted dusky violet, quiet intimate youthful mood, no dramatic spotlights or crowded concert. Match a refined clean hand-painted Korean 2D visual-novel background style with gentle cel-painted shapes and subtle watercolor texture. No people or silhouettes, no readable writing, no UI, no logos, no signs, no watermarks, no phones, no character faces. Stage stays small and distant, the sports field remains clearly recognizable.
```

## 축제 오후 배경

```text
Use case: illustration-story. Asset: wide 16:9 background art for an original Korean middle-school visual novel about an innocent school festival. A welcoming contemporary Korean middle-school courtyard and entrance at late golden hour, warm ivory school building with broad windows, a leafy ginkgo tree, simple student festival stalls in the distance, subtle strings of warm small lights and understated apricot/navy festival bunting, gently glowing sky with peach clouds becoming soft lavender. Quiet, inviting, youthful atmosphere, refined hand-painted 2D Korean visual novel background with clean perspective, restrained watercolor texture and soft cel-painted shapes, detailed enough to feel lived in but clear large shapes for a classroom projector. Composition leaves open paved courtyard in the center and right for a waist-up character overlay, while leafy branches and building frame the edges. Landscape panorama, eye-level viewpoint, polished art direction. No people, no silhouettes, no cars, no readable text, no signage letters, no logos, no watermark, no UI, no speech bubbles. Do not paint the characters or the interface. This is a school with no fantasy castle elements.
```



## 이전 적용 캐릭터 v3

기본 내장 imagegen 편집 모드로 제작했습니다. 최종 출력: `haru-boy-character-sheet-v3.png`, `haru-girl-character-sheet-v3.png`. 편집 원본은 이전 승인 캐릭터이며, 같은 의상·작은 배지를 유지합니다. PNG는 1536×1024, 투명 배경, 512px 폭 표정 3열입니다.

공통 최종 프롬프트:

```text
Revise this wholesome fully clothed character sprite atlas. The current face reads too young. Make a noticeably more mature 19-to-20-year-old university freshman through FACE and OVERALL proportions, in a refined semi-realistic Korean romance webtoon style instead of a big-eyed childlike anime style.
Keep the same cream cardigan with small red round crest, white collared shirt, navy bag and strap, dark lower garment. Keep original coverage and loose modest clothing fit. No sexualized styling or anatomy. All 3 expressions have the same identity: neutral friendly / thoughtful slightly shy / warm smile. Same pose with bag held.
Deliver a transparent-alpha 1536x1024 sheet with 3 aligned 512px columns, same pose, head position and scale, hair top to upper thighs, small margin above heads, no borders, text or backdrop. Maturity should be clearly visible while preserving the production layout.
```

남성 추가 지시: short Korean ivy-league haircut, closely cropped sides around ears and nape, short side-brushed top exposing about 60% of forehead, thicker eyebrows, longer jaw and nose, less round cheeks, eyes about 25% smaller, natural broader shoulders and longer arms, healthy unexaggerated proportions.

여성 추가 지시: same shoulder-length hairstyle, longer face, less round cheeks, defined nose, almond eyes about 25% smaller, natural jaw, smaller head relative to torso, longer arms, healthy unexaggerated proportions without anatomical emphasis.

## 6표정 v4 검토 시안 (2026-10-19)

사용자 요청: 얼굴은 조금 더 귀엽게 다듬고 남녀의 체형 매력을 살리며, 표정 디테일을 유지한 채 최대 6개로 확장합니다. 기존 v3 남녀 이미지를 각각 편집 대상으로 기본 내장 imagegen에 전달했습니다. 머리·크림색 카디건·흰 셔츠·빨간 배지·남색 가방을 유지하고, 20세 청년 비율과 단정한 의상을 기준으로 제작했습니다.

- `assets/haru-boy-v4-preview.png`: 1086×1448, 3열×2행. 얼굴 볼선과 눈매를 부드럽게 하고 자연스러운 어깨·팔·허리 실루엣을 요청했습니다.
- `assets/haru-girl-v4-preview.png`: 1024×1536, 3열×2행. 부드러운 볼선·생기 있는 눈매와 자연스러운 허리선·카디건 드레이프를 요청했습니다.
- 표정 순서(왼쪽 위부터): 기본 미소, 수줍음, 환한 웃음, 놀람, 고민, 장난스러운 자신감. 눈썹·시선·눈의 벌어짐·입매로 감정을 구분하도록 요청했습니다.
- 생성 요청은 투명 배경, 동일 자세·크기·머리 위치, 3:4 시트였으나 실제 출력 크기와 칸 비율이 서로 다릅니다. PNG를 열어 육안으로 6표정을 확인했으며, 두 파일의 RGBA와 모서리·중앙 경계 픽셀 alpha=0을 확인했습니다. 전체 배경의 투명도·셀 정렬·가장자리 품질은 아직 확정하지 않았습니다. 남성형 수줍음과 고민은 걱정하는 인상에 가까워 추가 조정 후보입니다.

v4는 비교용 시안으로 보관하며, 현재 게임 적용본은 아래 v6입니다.

### 수줍음 교체용 v5 시안

사용자는 다른 다섯 표정은 괜찮으며 수줍음만 조금 더 귀엽기를 원했습니다. v4 남녀 시트를 각각 참조해 수줍음 한 장씩만 따로 생성했습니다. 파일은 `assets/haru-boy-shy-v5-preview.png`, `assets/haru-girl-shy-v5-preview.png`입니다. 기존 시트와 다른 표정은 수정하지 않았습니다.

요청한 변화: 눈썹 긴장과 미간 주름을 풀고, 살짝 피하는 시선·올라간 입꼬리·볼과 귀의 홍조로 칭찬받아 기쁘지만 쑥스러운 표정을 표현합니다. 얼굴·머리·의상·가방·자세·성인 비율은 유지하도록 요청했습니다. 생성 결과의 얼굴 표정을 육안으로 확인했습니다. 게임 표시와 시트 조립은 아직 하지 않았고, 여성형 주변의 갈색 잔여 배경과 남성형 외곽의 색 번짐은 적용 전에 정리가 필요합니다.

### 게임 적용 v6

v4 시트와 승인된 v5 수줍음을 각각 참조해 기본 내장 imagegen으로 남녀 시트를 다시 조립했습니다. 요청은 다른 다섯 표정·인물·의상 유지, 두 번째 표정만 기분 좋은 수줍음으로 교체, 투명 배경·3열×2행·같은 머리와 어깨 위치였습니다. 결과에 남은 투명 가장자리와 이웃 칸의 조각은 설치된 이미지 처리 라이브러리로 정리하고, 프레임 아래 몸통은 첫 프레임을 공유해 자세 흔들림을 줄였습니다. 새 의존성을 추가하지 않았습니다.

- 적용 파일: `assets/haru-boy-v6.png`, `assets/haru-girl-v6.png`.
- 규격: 각각 1536×2048 RGBA, 칸당 512×1024, 위 행 미소·수줍음·환한 웃음 / 아래 행 놀람·고민·장난기.
- 배경 잔여물을 제외한 인물 연결 영역을 보존하고 얼굴 기준 위치를 맞췄습니다. 대본의 `expression`은 0~5입니다.
- 브라우저의 회색 바탕 6표정 비교 화면과 실제 대화·활동 화면에서 확인합니다. 원본 시안은 보존하고, 빌드는 완성 PNG만 읽으므로 다른 PC에서 이미지 도구나 별도 라이브러리 설치가 필요하지 않습니다.

## 축제앱 전용 그림 (2026-10-19)

기본 내장 imagegen으로 앱에서 온 문구를 구별할 휴대폰 그림을 새로 만들었습니다. 투명 배경의 정면 스마트폰, 남색 테두리·크림색 화면·별 모양 채팅 앱 표식·빈 말풍선, 기존 축제 게임과 어울리는 부드러운 그림체를 요청했습니다. 인물·브랜드·글자·숫자는 넣지 않았습니다.

- 적용 파일: `assets/festival-app-phone.png`, 256×384 RGBA. 설치된 이미지 라이브러리로 크기와 PNG 용량만 줄였습니다.
- 사용 위치: 축제앱 알림·하루와 채팅하는 대화 틀과 앱 기능 활동 머리글. 작은 화면에서도 실제 문구는 읽을 수 있는 HTML로 남깁니다.
- 검수: 실제 Chrome 1366px·390px에서 이미지 로드·메시지 구별·가로 넘침 없음을 확인했습니다.

## 6표정 v7 시안 (2026-10-22)

사용자는 남학생의 인상·체형을 더 남성적으로 바꾸고, 짧은 머리의 길이는 유지하면서 풍성한 볼륨을 낮추기를 요청했습니다. 승인한 기본 시안의 얼굴·체형·자세를 참조해 내장 imagegen으로 남녀 각각 6표정 시트를 제작했습니다. CLI/API 우회나 별도 이미지 편집 코드는 사용하지 않았습니다.

- `assets/haru-boy-v7-preview.png`: 선명한 눈썹·턱선, 넓은 어깨, 차분한 짧은 검은 머리, 소매를 걷은 흰 교복 셔츠·남색 바지·가방입니다.
- `assets/haru-girl-v7-preview.png`: 승인한 얼굴·어깨 길이 머리·크림색 가디건·흰 셔츠·남색 치마·가방을 유지했습니다.
- 공통 교표는 작은 빨간 원과 흰 꽃잎 문양이며, 사용자 요청으로 ‘금옥’ 글자를 없앴습니다. 원본 로고의 글자를 포함한 복제가 아닌, 승인한 글자 없는 문양의 생성 이미지입니다.
- 두 파일 모두 1086×1448 RGBA, 3열×2행입니다. 왼쪽 위부터 미소·수줍음·환한 웃음 / 놀람·고민·장난기입니다.
- 프롬프트의 핵심은 승인 시안의 인물·머리·착장·체형·작은 교표 유지, 표정만 변경, 같은 자세와 머리 위치, 위 표정 순서, 투명 배경이었습니다. 기본 시트 제작 뒤 여백·가장자리 정리를 각각 한 번 더 요청했으나, 프레임 배치가 더 일정한 첫 시트를 보관했습니다.
- PNG 두 파일의 열림·규격·알파 채널을 검사하고, Chrome의 회색 배경 위에서 12표정을 육안으로 확인했습니다. 미리보기에서 보인 빨강·노랑 조각은 대부분 거의 투명한 픽셀이며, 실제 브라우저 표시에서는 눈에 띄지 않았습니다. 검토 캡처는 Git 제외 `scratch/festival-v7-qa/`에만 있습니다.

v7은 표정 검토용 시안입니다. 칸 경계의 팔·가방 여백과 몸통·교표의 미세한 차이를 게임용으로 정렬하지 않았습니다. 현재 빌드와 공개 HTML은 기존 v6를 그대로 사용합니다. 이후 적용할 때 기존 CSS의 칸별 잘림과 표정 전환을 먼저 확인해야 합니다.

## 남학생 6표정 v8 재검토 시안 (2026-10-22)

사용자는 남학생 v7의 얼굴과 체형이 승인한 단독 시안보다 가늘고 부드러워졌다고 지적했습니다. v7 제작 때 구버전 v6 시트를 배치·표정 참조로 함께 전달했으며, 결과에서 구버전의 인상이 섞이는 문제가 있었습니다. v8은 구버전 시트를 참조하지 않고 승인 단독 시안 하나만 내장 imagegen에 전달했습니다.

- 기준 원본: `assets/haru-boy-v8-reference.png`(1024×1536 RGBA). 작은 글자 없는 교표, 차분한 짧은 머리, 흰 교복 셔츠의 승인 단독 시안을 파일로 보관해 다른 PC에서도 같은 기준을 쓸 수 있게 했습니다.
- 6표정 시트: `assets/haru-boy-v8-preview.png`(1254×1254 RGBA, 3열×2행). 표정 순서는 v7과 같습니다. 여학생은 수정하지 않았습니다.
- 핵심 프롬프트: 승인 시안의 얼굴 너비·턱·눈썹·목·어깨·팔·체형을 유지하고 눈·눈썹·입매만 변경, 수줍음에도 골격과 자신감 유지, 교표 글자 없음, 원본의 인물 비율을 누르지 않는 정사각형 시트. 출력 칸 비율은 2:3이며 기존 게임용 1:2와 다릅니다.
- Chrome에서 승인 원본과 6표정을 나란히 표시해 육안으로 비교했습니다. PNG 두 파일의 열림·규격·RGBA·원본 SHA-256 일치를 확인했습니다. 첫 PNG 검증은 메타데이터를 읽은 뒤 `verify()`를 호출하는 검사 코드의 순서 오류로 실패했으며, 파일을 다시 열어 검증하는 방식으로 고쳐 2개를 재검사했습니다. 이미지 파일 손상은 없었습니다.

사용자는 v8의 2·4번째 표정이 어색하다는 의견을 주었고, 아래 v9에서 수정했습니다. v8은 게임에 적용하지 않았습니다. v7 남학생을 확정 이미지로 사용하지 않습니다. 게임용 칸 정렬·몸통 고정·표정 전환은 아직 확인하지 않았습니다.

## 남학생 2·4번째 표정 v9 수정 (2026-10-22)

사용자가 미술 개념을 확인한 뒤 수정하기를 요청해 다음 자료를 읽었습니다. 영상 전체를 수강한 것은 아니며, 강의의 공개 글 설명과 아래 웹 자료를 확인했습니다.

- [Ron Lemen의 Proko 드로잉 강의](https://www.proko.com/lesson/the-secret-to-drawing-emotions): 얼굴의 큰 입체 구조와 비례를 먼저 잡고 눈 안쪽 모서리를 기준으로 간격을 유지하며, 입을 열 때는 턱 관절을 중심으로 아래턱이 움직이게 합니다. 이목구비를 따로 고치기보다 얼굴 전체의 선과 형태가 같은 감정을 전달하는지 봅니다.
- [Raquel Arellano의 표정 드로잉 설명](https://tips.clip-studio.com/en-us/articles/2203): 얼굴 구조 안에서 눈썹·눈·입을 함께 바꾸고 감정의 강도에 맞춰 변형합니다.
- [Dacher Keltner의 수줍음·당혹감 연구 설명](https://greatergood.berkeley.edu/article/item/born_to_blush): 시선 회피와 웃음을 조절하는 입 움직임을 다룹니다. 이를 기쁜 수줍음의 연출에 적용했습니다.
- [Paul Ekman Group의 놀람 설명](https://www.paulekman.com/universal-emotions/what-is-surprise/): 올라간 눈썹·열린 윗눈꺼풀·이완되어 벌어진 턱을 함께 확인하고, 입과 눈 주변의 긴장이 큰 두려움과 구분합니다.

v8에 대한 제작자의 판단은 2번째의 극단적인 옆 시선·비대칭 눈썹이 수줍음보다 장난기로, 4번째의 안쪽만 올라간 눈썹과 비스듬한 입이 놀람보다 걱정으로 읽힌다는 것이었습니다. 내장 imagegen에 v8과 승인 단독 시안만 전달해 두 얼굴을 중심으로 편집했습니다.

- 2번째: 과한 곁눈질을 줄이고 시선을 낮추며, 눈썹의 긴장을 풀고 작게 억제한 미소와 옅은 홍조를 요청했습니다.
- 4번째: 눈썹 안쪽과 바깥쪽을 함께 올리고 윗눈꺼풀을 열며, 힘을 뺀 작은 타원형 입과 자연스러운 아래턱 움직임을 요청했습니다. 첫 결과에도 걱정하는 눈썹이 남아 이 얼굴만 한 차례 더 조정했습니다.
- 결과: `assets/haru-boy-v9-preview.png`(1254×1254 RGBA, 정사각형 3열×2행). 원본의 남성적인 얼굴·목·어깨·착장과 작은 글자 없는 교표를 유지하도록 요청했으며, 나머지 네 표정의 완전한 픽셀 동일성을 보장하는 편집은 아닙니다.
- 확인: PNG 1개를 검사하고 Chrome에서 수정 전후 얼굴 4개를 확대 비교했습니다. 페이지 오류 0개이며 캡처는 Git 제외 `scratch/festival-v7-qa/boy-v9-final-face-comparison.png`입니다. 생성 이미지의 알파 채널은 유지했으며 별도 이미지 편집 코드는 사용하지 않았습니다.

v9은 사용자 재검토용입니다. 기존 버전·여학생·공개 HTML은 수정하지 않았으며, 게임용 칸 정렬과 실제 표정 전환은 확인하지 않았습니다.

## 남학생 가벼운 다운펌 v10 시안 (2026-10-22)

사용자가 v9에 전반적으로 가벼운 다운펌을 요청했습니다. v9 시트 하나만 내장 imagegen에 전달해 6표정 모두 옆머리·관자놀이·귀 위의 뜨는 끝을 눌러 정리하고, 윗머리 볼륨을 약 8~12%만 낮추도록 요청했습니다. 수치는 프롬프트의 의도이며 결과의 실측값은 아닙니다. 머리 길이·가르마·앞머리 방향·이마 노출·모발 결을 유지하고, 얼굴·수정한 표정·체형·착장·작은 글자 없는 교표는 바꾸지 않는 것이 기준입니다.

- 결과: `assets/haru-boy-v10-preview.png`(1254×1254 RGBA, 정사각형 3열×2행). 투명 배경을 유지한 6표정 시안입니다.
- 확인: PNG 1개의 열림·규격·알파·원본 SHA-256 일치, Chrome에서 6표정의 헤어와 수줍음·놀람 유지 여부를 육안 확인했습니다. 페이지 오류 0개이며 캡처는 Git 제외 `scratch/festival-v7-qa/boy-v10-gray.png`입니다.

기존 버전과 여학생은 보존했습니다. 게임 적용·실제 표정 전환은 확인하지 않았으며 사용자 재검토 전입니다.

## 남학생 얼굴 음영 v11 시안 (2026-10-22)

사용자는 전반적인 이목구비는 마음에 들며 얼굴 음영만 화장처럼 보이지 않도록 다듬기를 요청했습니다. 내장 imagegen으로 v10 시트의 얼굴 색·음영을 편집했습니다. 첫 결과에도 눈꺼풀 위의 붉은 갈색 음영이 남아, 그 부분을 주변 피부색에 가깝게 낮추는 편집을 한 차례 더 했습니다.

- 요청한 변화: 6표정 모두 눈가의 붉은 갈색 색 띠와 두꺼운 테두리를 줄이고 얇은 눈꺼풀 선으로 정리, 볼·콧대의 강한 색조와 입술의 붉은색·광택 완화, 턱 아래 등 입체감을 위한 자연스러운 그림자는 유지했습니다. 이목구비의 모양·간격·시선·표정·남성적인 골격·가벼운 다운펌·착장은 유지하도록 요청했습니다. 생성 편집이므로 얼굴 외 영역의 완전한 픽셀 동일성을 보장하지는 않습니다.
- 결과: `assets/haru-boy-v11-preview.png`(1254×1254 RGBA, 정사각형 3열×2행). 첫 중간 시안 대신 두 번째 결과를 보관했으며 기존 v10과 여학생은 보존했습니다.
- 확인: PNG 1개의 열림·규격·알파·생성 원본 SHA-256 일치를 검사했습니다. Chrome에서 6표정과 수정 전후 얼굴 2개를 비교했고 페이지 오류 0개입니다. 캡처는 Git 제외 `scratch/festival-v7-qa/boy-v11-gray.png`, `boy-v11-shading-comparison.png`입니다.

v11은 사용자 재검토용이며 게임에 적용하지 않았습니다. 공개 HTML·운영 사이트·여학생은 변경하지 않았습니다.
