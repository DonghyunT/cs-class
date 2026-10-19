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
