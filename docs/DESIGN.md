# Design System: CS Class Student Home

## 1. Visual Theme & Atmosphere
A bright, calm classroom workspace for Korean middle-school learners. Daily-app balanced density (5/10), measured layout variation (4/10), restrained motion (2/10). Make the next learning action obvious and let the lesson content carry the visual identity. Keep the page warm and approachable without turning it into a game dashboard.

## 2. Color Palette & Roles
- **Paper Canvas** (#F5F7FA) — page background.
- **White Surface** (#FFFFFF) — focused learning areas and navigation.
- **Ink** (#1F2937) — primary Korean text.
- **Quiet Slate** (#667085) — secondary labels and supporting copy.
- **Line** (#E4E8EF) — separators and low-emphasis borders.
- **Class Blue** (#1D4ED8) — the single primary accent for the main action, current step, and keyboard focus.
- Use the established flowchart colors only inside flowchart examples: purple terminal, green data, orange decision, blue process. Pair color with shape and text; never use color alone to explain a symbol.
- Do not introduce gradients, neon, or extra decorative colors.

## 3. Typography Rules
- Use Noto Sans KR with a Korean-capable system sans-serif fallback.
- Page title: 26–30 px, semibold. Section titles: 17–20 px. Body: 15–16 px with relaxed line spacing. Metadata may be 13–14 px but must remain readable.
- Use weight, spacing, and alignment for hierarchy. Keep long learning descriptions around 65 characters per line.
- Use tabular numerals only for progress counts; never invent scores or statistics.

## 4. Component Styling
- Primary button: solid Class Blue, at least 44 px high, clear verb label, visible keyboard focus, subtle pressed feedback.
- Secondary actions: text or quiet outline treatment.
- Use a bordered surface only when it clarifies the current lesson or a distinct learning step. Prefer open space and dividers for the rest.
- Progress: show completed counts as text plus a simple bar or step marker; do not imply a grade.
- Saved/submission states: pair a short Korean label with a small status marker. Keep draft saved and final submission states separate.
- Icons must have a text label or accessible name.

## 5. Layout Principles
- Desktop: compact left navigation and a centered, readable content area with a clear featured continuation area, a four-step learning path, and one concise work-status area.
- The featured area should combine the current topic, precise progress summary, a small flowchart motif, and one primary continue action. Do not repeat the same progress facts elsewhere.
- Learning stages remain freely navigable; show progress without locked, disabled, or prerequisite states.
- At widths below 768 px, collapse to one column and a simple compact navigation. Keep every action reachable without horizontal page scrolling.
- Keep the student home focused on current class learning. Avoid analytics, social feeds, teacher rosters, and unrelated assignment widgets.

## 6. Motion & Interaction
- Keep the reading and learning overview still. Use short opacity/transform feedback only for hover, focus, and press; honor reduced-motion preferences.
- Do not use perpetual shimmer, bouncing, or auto-playing animation.

## 7. Anti-Patterns
- No fake school names, class schedules, deadlines, classmates, teacher messages, grades, scores, streaks, or invented lesson titles.
- No “오늘 할 일” checklist unless the product has real teacher-authored tasks.
- No locked steps, dead buttons, or misleading submission labels.
- No generic three-column KPI cards, stock-photo hero, oversized marketing banner, decorative gradients, neon glows, or emoji decoration.
- No tiny body text, icon-only navigation without labels, or color-only status meaning.
