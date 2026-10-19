# 이미지 제작 기록

이 자료의 캐릭터와 배경은 기본 내장 이미지 생성 도구(imagegen)로 제작했습니다. CLI/API 우회 경로는 사용하지 않았습니다. 현재 캐릭터는 사용자 요청에 따라 청년 외형으로 수정한 남녀 v3이며, 작은 의상 배지는 사용자 제공 교표를 참조했습니다. 아래는 후속 수정에 사용할 제작 프롬프트입니다.

## 캐릭터

- 남학생: `haru-boy-prompt-v2.txt`
- 여학생: `haru-girl-prompt-v2.txt`
- 확정 이미지: `haru-boy-character-sheet-v2.png`, `haru-girl-character-sheet-v2.png`
- 비교 시트에서 한 표정씩 CSS 배경 위치로 표시합니다. 표정 3개를 같은 위치와 크기로 맞춘 투명 PNG입니다. v2는 이전 검토본으로 보존하며 현재 HTML은 v3를 사용합니다.

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



## 현재 적용 캐릭터 v3

기본 내장 imagegen 편집 모드로 제작했습니다. 최종 출력: `haru-boy-character-sheet-v3.png`, `haru-girl-character-sheet-v3.png`. 편집 원본은 이전 승인 캐릭터이며, 같은 의상·작은 배지를 유지합니다. PNG는 1536×1024, 투명 배경, 512px 폭 표정 3열입니다.

공통 최종 프롬프트:

```text
Revise this wholesome fully clothed character sprite atlas. The current face reads too young. Make a noticeably more mature 19-to-20-year-old university freshman through FACE and OVERALL proportions, in a refined semi-realistic Korean romance webtoon style instead of a big-eyed childlike anime style.
Keep the same cream cardigan with small red round crest, white collared shirt, navy bag and strap, dark lower garment. Keep original coverage and loose modest clothing fit. No sexualized styling or anatomy. All 3 expressions have the same identity: neutral friendly / thoughtful slightly shy / warm smile. Same pose with bag held.
Deliver a transparent-alpha 1536x1024 sheet with 3 aligned 512px columns, same pose, head position and scale, hair top to upper thighs, small margin above heads, no borders, text or backdrop. Maturity should be clearly visible while preserving the production layout.
```

남성 추가 지시: short Korean ivy-league haircut, closely cropped sides around ears and nape, short side-brushed top exposing about 60% of forehead, thicker eyebrows, longer jaw and nose, less round cheeks, eyes about 25% smaller, natural broader shoulders and longer arms, healthy unexaggerated proportions.

여성 추가 지시: same shoulder-length hairstyle, longer face, less round cheeks, defined nose, almond eyes about 25% smaller, natural jaw, smaller head relative to torso, longer arms, healthy unexaggerated proportions without anatomical emphasis.
