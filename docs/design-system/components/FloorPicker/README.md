# FloorPicker

Picks a floor band with round "lift buttons" beside an HDB block; the chosen band lights up on the block.

- Markup: a `<fieldset>` with a `<legend>` ("Floor") and caption ("Press your lift button"); inside `.floor-picker`, an `svg.floor-picker__block` and a `.lift-panel` of `label.lift-button` items, each a hidden `input.lift-button__input[type=radio]` plus `span.lift-button__face`. Order top to bottom, highest band first, like a lift panel.
- Bands: `value` 1 = 1–6, 2 = 7–12, 3 = 13–24, 4 = 25+. The block's `.floor-picker__band--N` rect lights up through CSS `:has()` when radio N is checked – no script.
- Lift buttons: 48px (`space-8`) circles, `1px border`, `bg-surface-raised`, numbers in Plus Jakarta Sans 13px semibold with tabular figures, inside a `radius-pill` rail on `bg-surface` with `border-subtle` and `shadow-sm`. **Selected lights up**: `primary` (ink) fill, white number and a 2px ink ring. Keyboard focus adds a `focus-ring` outline.
- Block: white body, `bg-feature` windows, ink outline, void-deck pillars; the selected band in `accent` (pink) at 75%.
- Each input carries an `aria-label` like "Floors 7–12", since the face shows only numbers.

The consumer supplies the bands (relabel the faces and `aria-label`s if the ruleset uses other ranges), the checked value (`v-model`) and `data-cy` hooks such as `plan-floor-1-6`.
