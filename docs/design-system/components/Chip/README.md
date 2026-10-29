# Chip

Choices drawn as pills: single-select (flat type) with radios, or multi-select (what matters to you) with checkboxes, optionally grouped under centred section labels.

- Markup: a `<fieldset>` with a `<legend>`, then `.chip-group` holding one `label.chip` per option: a visually hidden `input.chip__input` – `type="radio"` for one answer, `type="checkbox"` for several – followed by `span.chip__face`. Real inputs, so keyboard, forms and screen readers work with no script.
- Icons: an optional 18px `svg.chip__icon` at the start of the face – Lucide-style outline, 1.6px ink stroke, `aria-hidden`. Never emoji.
- Groups: give each group's `<legend>` the `.divider-label` class (centred uppercase label, 12px, 0.12em tracking, slate, with `border` rules either side) and centre the pills with `.chip-group--center`. Two to four groups per screen.
- Shape: `radius-pill`, `1px border`, white, at least 44px tall, `space-2` × `space-5` padding, Plus Jakarta Sans 15px medium, `space-2` gaps.
- States: hover tints `surface-disabled`; **selected is `accent-soft` (blush) with an `accent` border and ink text** (12.6:1); keyboard focus adds the 2px `focus-ring` with an offset; disabled is `surface-disabled` with `text-tertiary`.
- Close the screen with one centred `.btn.btn-primary.btn-wide` (up to 26rem wide). For multi-select, show the count beside it ("3 selected") so people know their picks registered.
- Single-select: up to about six options, else a `.form-select`. Multi-select: up to about six per group.

The consumer supplies the legend and group labels, a shared `name`, each `value`, label and icon, the checked options (`v-model` in Vue) and `data-cy` hooks such as `plan-matters-parents`.
