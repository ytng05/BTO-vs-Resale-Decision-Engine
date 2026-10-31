# Button

Bootstrap 5 buttons customised through variables: one filled action per view, everything else outline or link.

- **Primary** `.btn.btn-primary` – `primary` (ink) fill, `on-primary` (white) text, optionally led by a 32–34px `accent` (pink) disc holding an ink arrow or play mark. The single main action on a screen (Next, Compare, Save).
- **Secondary** `.btn.btn-outline-secondary` – transparent with a `border` outline, `text-primary` text (Back, Cancel).
- **Tertiary** `.btn.btn-link` – `text-primary`, no underline until hover; slate for quiet actions like Back.
- **Destructive** `.btn.btn-danger` – `danger` fill, white text. Counts as the screen's one filled button.
- Sizes: default padding `space-3` × `space-5`; `.btn-sm` is `space-2` × `space-4`. Pill-shaped (`radius-pill`) at every size, weight 500. Touch target at least 44px.
- States: primary hover goes to `primary-hover`, other fills darken ~10%; focus shows a 2px `focus-ring` with a 2px `bg-page` offset; disabled drops to 50% opacity with no hover or focus.

The consumer supplies the label (sentence case, a verb), `type`, a `data-cy` hook and, for icon-only buttons, an `aria-label`.
