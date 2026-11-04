# UI.md — Design system and UI rulebook

> Version 1.2 · Owner: seat 4 (frontend core + styling) · Last updated: 2026-10-29
> Propose changes by pull request against this file. A change to a token value needs sign-off from seat 4
> and seat 5 (since it affects Cypress screenshots/visual state), and should update `StyleGuide.vue` in the
> same PR.

This file is the single source of truth for how the app looks. If a screen disagrees with this file, the
screen is wrong, not the file — raise a PR to change the rule instead of improvising in a component.

Since 1.2 the look is the **Calm** direction (mist page, ink, blush and pink, Plus Jakarta Sans). The brand
book, token list and per-component guidance with HTML previews are in `docs/design-system/`.

---

## 0. Page roles (D35)

Three pages, one question each. The user moves through them in this order: Plan → Results → Dashboard.

| Page | Route | The question it answers | What lives here |
|---|---|---|---|
| Onboarding | `/plan` | "Tell us about your situation." | The 3-step stepper: household, Path A (BTO), Path B (resale). Submitting goes to Results. |
| Results | `/results` | "Which path, and when?" | The verdict: break-even sentence, path cards (compact), heatmap, timing panel, why-the-gap panel, net position over time chart, save scenario. |
| Dashboard | `/dashboard` | "What is this result made of, and what if my assumptions change?" | The detail: what-if sliders with the Resale Price Index history chart beside them, cost table, grants table with reasons and source links, size and price comparison, PHG map, MOP and EIP notes, how-the-net-position-adds-up chart. |

Separate pages: Sources (`/sources`, always in the nav), My scenarios (`/scenarios`) and scenario compare
(`/scenarios/compare`).

- A new feature goes on the page whose question it answers. If it answers neither, raise it with the team before
  building it.
- Results links on to the Dashboard ("Open the dashboard"); the Dashboard links back to Results.
- The path cards are one component, `PathOutcomeCard`, with a `compact` prop: compact on Results, full on the
  Dashboard, so the two can't drift (agreed in D35; not done yet).

## 1. Principles

| # | Principle | Why | Do | Don't |
|---|---|---|---|---|
| 1 | One primary action per screen | Reduces decision fatigue, matches Apple-style focus | One filled `btn-primary` per view | Two filled primary buttons side by side |
| 2 | Whitespace is a layout tool, not leftover space | Calm, premium feel needs room to breathe | Use the spacing scale (§5) between sections | Cram sections together to "fit more" |
| 3 | Every state is designed, not default | Unstyled loading/error/empty states look unfinished | Design loading, empty, and error for every data view | Ship a view that only handles the happy path |
| 4 | Colour carries meaning, not just style | Keeps the palette calm and makes exceptions legible | Reserve semantic colours for status only | Use "danger red" for a merely urgent-looking button |
| 5 | Tokens over values | Lets the whole app re-theme from one file | `color: $text-secondary` | `color: #707B9A` typed directly in a component |
| 6 | Mobile is not an afterthought | Graded from iPhone 6 (375px) up | Build and check the 375px layout first | Build desktop first and "make it responsive" later |
| 7 | Every interactive element is testable | Cypress needs stable hooks | Add `data-cy` when you add the element | Add `data-cy` only when a test fails without it |

---

## 2. Colour

### 2.1 Brand palette (Calm)

| Name | Token | Hex | Role |
|---|---|---|---|
| Mist | `$color-mist` | `#F3F3F5` | **Main page background** |
| White | `$color-white` | `#FFFFFF` | Cards, modals, navbar pills |
| Periwinkle | `$color-periwinkle` | `#E9ECF6` | The one feature card on a screen, hover, info fill |
| Blush | `$color-blush` | `#FBD5E5` | Soft pink fills: selected chips, step halo, version badge |
| Pink | `$color-pink` | `#F5A3C7` | Accent fill, and resale in charts |
| Pink deep | `$color-pink-deep` / `--color-pink-deep` | `#F08AB6` | Edge of the accent disc |
| Berry | `$color-berry` / `--color-berry` | `#B23A78` | The only pink allowed as text or a thin mark |
| Accent tint | `$accent-tint` / `--accent-tint` | `#FDF0F6` | A picked tile or option (with an ink border) |
| Indigo | `$indigo` / `--indigo` | `#3D4A8F` | BTO label and icon on the indigo tints |
| Indigo tint | `$indigo-tint` / `--indigo-tint` | `#F3F5FB` | BTO side of a comparison panel |
| Indigo tint strong | `$indigo-tint-strong` / `--indigo-tint-strong` | `#E3E6F4` | Icon well on the indigo tint |
| Border strong | `$border-strong` / `--border-strong` | `#B9BFCD` | Hover border on tiles; switch track |
| Ink | `$color-ink` | `#1D1D24` | Primary text, primary buttons, BTO in charts |
| Slate | `$color-slate` | `#5F6373` | Secondary text and labels |

### 2.2 Verified contrast

Ratios below are calculated with the WCAG 2.1 relative-luminance formula. AA for normal text needs **4.5:1**;
AA for large text (≥24px, or ≥19px bold) and for icons needs **3.0:1**.

| Colour on background | Ratio | Normal text | Large text / icons |
|---|---|---|---|
| Ink on Mist | 15.12 | ✅ PASS | ✅ PASS |
| Ink on White | 16.75 | ✅ PASS | ✅ PASS |
| Slate on Mist | 5.39 | ✅ PASS | ✅ PASS |
| Slate on White | 5.97 | ✅ PASS | ✅ PASS |
| Berry on White | 5.57 | ✅ PASS | ✅ PASS |
| Berry on Mist | 5.03 | ✅ PASS | ✅ PASS |
| Tertiary (`#9A9DB0`) on Mist | 2.42 | ❌ fail | ❌ fail |
| Pink on White | 1.92 | ❌ fail | ❌ fail |
| Pink on Mist | 1.73 | ❌ fail | ❌ fail |

**Rule:** only **Ink**, **Slate** and **Berry** may be text or icon colour on Mist or White. Pink, Blush and
Periwinkle are **fill colours only**: never body text, never a small icon's only colour. Tertiary is for
placeholders and decoration only.

**Fills checked separately** (text on a solid fill):

| Fill | Text | Ratio | Verdict |
|---|---|---|---|
| Ink (`$primary`) | White | 16.75 | ✅ PASS |
| `$primary-hover` (`#3A3A44`) | White | 11.24 | ✅ PASS |
| Pink | Ink | 8.73 | ✅ PASS |
| Blush | Ink | 12.57 | ✅ PASS |
| Periwinkle | Ink | 14.20 | ✅ PASS |

### 2.3 Legacy token: `$universe-text`

Kept as an alias of Ink so existing code that links or highlights with it still builds. New code uses
`$text-primary` or `$primary`. Links, the active nav item and the active step are ink.

### 2.4 Neutral scale

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `$text-primary` | `#1D1D24` (Ink) | Headings, primary body text | 15.12 on Mist — PASS |
| `$text-secondary` | `#5F6373` (Slate) | Secondary/supporting text, labels | 5.39 on Mist, 5.97 on White — PASS |
| `$text-tertiary` | `#9A9DB0` | Placeholder text, decoration | 2.42 on Mist — fails AA; **never body copy** |
| `$border` | `#DFE2EA` | Input borders, outline buttons, dividers | not text |
| `$border-subtle` | `#ECEDF2` | Faint dividers | not text |
| `$surface-disabled` | `#F0F1F5` | Disabled inputs and buttons, skeleton blocks, hover tint | not text |

### 2.5 Surfaces

| Token | Hex | Use |
|---|---|---|
| `$bg-app` | `#FFFFFF` | **The page background on every route** (4 Nov 2026, D45) |
| `$bg-subtle` | `#F3F3F5` (Mist) | Pale fills inside cards and controls: slider tracks, steppers, tags |
| `$bg-page` | `#F3F3F5` (Mist) | Legacy name for `$bg-subtle`, kept because components use `var(--bg-page)` as a pale fill. New code: `$bg-app` for the page, `$bg-subtle` for a fill |
| `$bg-surface` | `#FFFFFF` | Cards, panels |
| `$bg-surface-raised` | `#FFFFFF` | Modals, popovers |
| `$accent-fill-3` | `#E9ECF6` (Periwinkle) | The single highlighted ("feature") card on a screen, with a 1px white edge |

**Decided trade-off (updated 4 Nov 2026, D45):** every page is now white, like Home and the Dashboard already
were, so a white card has no colour step from the page at all. **Every white box on the page MUST carry a 1px
`$border-subtle` border** (Bootstrap's `.card` does; `.quiet-panel` in `_components.scss` is the lighter version for strips: border,
no shadow); cards may also keep `$shadow-sm`. Tinted boxes (path panels, semantic banners) separate
by their fill. Never ship a white box with neither a border nor a fill.

### 2.6 Primary action and tints

| Token | Hex | Use |
|---|---|---|
| `$primary` | `#1D1D24` (Ink) | Primary buttons, links, focus rings, active step |
| `$primary-hover` | `#3A3A44` | Primary button hover/active |
| `$on-primary` | `#FFFFFF` | Text on a primary fill |
| `$focus-ring` | `#1D1D24` (Ink) | 2px focus ring with a 2px `$bg-page` offset |
| `$accent-fill-1` | `#F5A3C7` (Pink) | Accent disc, resale series, progress marks — not text |
| `$accent-fill-2` | `#FBD5E5` (Blush) | Selected chip, step halo, version badge, current nav pill |
| `$accent-fill-3` | `#E9ECF6` (Periwinkle) | Feature card, hover tint, info banner fill |

**Action is ink.** There is one filled ink button per screen. Pink is warmth, not text.

### 2.7 Semantic colours

`$success` and `$warning` darkened slightly for the Calm backgrounds so text passes AA everywhere (#82 review); the rest unchanged from 1.1:

| Token | Hex | Use | Text on Mist | Text on its own fill |
|---|---|---|---|---|
| `$success` | `#2C7756` | Positive status, success badges | 4.88 — PASS | 4.61 — PASS (on `#E3F0E9`) |
| `$success-fill` | `#E3F0E9` | Success banner background | — | — |
| `$warning` | `#8E621D` | Caution status, "not yet verified" badges | 4.84 — PASS | 4.75 — PASS (on `#FBF0DD`) |
| `$warning-fill` | `#FBF0DD` | Warning banner background | — | — |
| `$danger` | `#B3372C` | Errors, failed validation, destructive actions | 5.41 — PASS | 5.00 (on `#FAE6E3`) — PASS |
| `$danger-fill` | `#FAE6E3` | Error banner background | — | — |
| `$info` | `#5F6373` (= Slate) | Informational banners | 5.39 — PASS | 5.06 (on `#E9ECF6`) — PASS |
| `$info-fill` | `#E9ECF6` (= Periwinkle) | Info banner background | — | — |

**Rule:** semantic colours are reserved for status communication only (validation, alerts, badges). Never use
`$danger` for a merely "important" button, and never use `$success` decoratively. Success and warning text
pass 4.5:1 on Mist, white, periwinkle and their own fills; still pair the colour with a word, never colour alone.

### 2.8 Dark mode (optional, not required for this project)

Not required for IS216 grading, but tokens are structured so it's possible later: a `[data-theme="dark"]`
block would remap `$bg-page` to a deep ink, `$text-primary` to Mist, and keep Pink as the accent. Check every
pair against §2.2 before shipping if attempted.

---

## 3. Data-visualisation colour

For charts and any grid/matrix visual (e.g. a heatmap), use the Calm palette, never arbitrary chart-library
defaults:

- **Path colours (4 Nov 2026, D45): one colour per path, on every page.** Components ask for the path, never
  for ink or a pink of their own: BTO / Path A is `--path-bto` (Indigo `#3D4A8F`, 8:1 on white; text, bars,
  dots, card edges), with `--path-bto-fill` and `--path-bto-tint` for tiles and pale panels. Resale / Path B is
  `--path-resale` (Berry, text, 5.57:1 on white) and `--path-resale-bar` (Pink, bars, dots, charts), with
  `--path-resale-fill` and `--path-resale-tint`. Ink stays the colour of text and buttons, so BTO no longer
  reads as "plain text". Unplayed or neutral marks use `$border`.
- **Pink is only 1.92:1 on white, so resale never relies on colour.** It also sits below the baseline
  (timeline bars), uses a dotted line (line charts), or carries a text label.
- **Heatmap:** Indigo (`$path-bto`) where BTO is ahead, Pink (`$path-resale-bar`) where resale is ahead, `$border` for a tie. Cells keep a text
  `title`/`aria-label` stating the value in words.
- **Never colour-only.** Every chart needs a legend or inline label; every heatmap cell needs a text
  tooltip/`title`/`aria-label` stating its value and meaning, not just a fill colour. A matrix or heatmap
  must be DOM- or SVG-rendered (not canvas) so both accessibility and Cypress can read it — see §14.

---

## 4. Typography

| Role | Font |
|---|---|
| Everything: headings, body, labels, UI text, numbers | **Plus Jakarta Sans** |

Plus Jakarta Sans is open-source under the SIL Open Font License (OFL). Load weights 400, 500 and 600 from
Google Fonts with `font-display: swap` (the `<link>` is in `client/index.html`). Credit line for the
presentation/README: *"Plus Jakarta Sans by Tokotype, licensed under the SIL Open Font License."* Confirm the
exact current licence text on the font's Google Fonts page before submission.

```scss
$font-heading: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
$font-body:    'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
```

**Rule:** headings are weight 500, **never bold**, with tight tracking. Body is 400; labels and buttons 500.

### Type scale

| Token | Size (mobile) | Size (desktop, ≥lg) | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|---|
| `display` | 2.25rem / 36px | 3rem / 48px | 500 | 1.1 | -0.025em |
| `h1` | 1.75rem / 28px | 2.25rem / 36px | 500 | 1.15 | -0.02em |
| `h2` | 1.375rem / 22px | 1.5rem / 24px | 500 | 1.25 | -0.015em |
| `h3` | 1.125rem / 18px | 1.25rem / 20px | 500 | 1.3 | normal |
| `h4` | 1rem / 16px | 1.125rem / 18px | 500 | 1.3 | normal |
| `body` | 1rem / 16px | 1rem / 16px | 400 | 1.5 | normal |
| `body-small` | 0.875rem / 14px | 0.875rem / 14px | 400 | 1.5 | normal |
| `caption` | 0.75rem / 12px | 0.75rem / 12px | 400 | 1.4 | 0.01em |
| `label` | 0.8125rem / 13px | 0.8125rem / 13px | 500 | 1.3 | 0.01em |
| `numeric` | `font-variant-numeric: tabular-nums` | matches context | 500 | matches context | normal |

**Rules:**
- Any money, percentage, or table of numbers uses `numeric` (tabular figures), so digits align in columns.
  Big result figures are 24–34px at weight 500.
- Body text max line length: **75 characters** (use `max-width` on the text container, not on the page).
- Headings use `$text-primary` (Ink). Body text may use `$text-primary` or `$text-secondary`; never
  `$text-tertiary` for anything the user must read to complete a task.

---

## 5. Spacing and layout

**Spacing scale** (4px base unit — use these tokens, never a raw pixel value):

```scss
$space-1: 0.25rem;  // 4px
$space-2: 0.5rem;   // 8px
$space-3: 0.75rem;  // 12px
$space-4: 1rem;     // 16px
$space-5: 1.5rem;   // 24px
$space-6: 2rem;     // 32px
$space-8: 3rem;     // 48px
$space-10: 4rem;    // 64px
```

- Container max-width: `1140px` on `xl` and above, with Bootstrap's standard 12-column grid otherwise.
- Breakpoints follow Bootstrap 5 defaults (`sm` 576, `md` 768, `lg` 992, `xl` 1200), tested in DevTools from
  375px (iPhone 6) up through `xl`.
- **Standard two-pane layout** (e.g. inputs + live results): two columns side by side from `lg` up; below
  `lg`, stacks to a single column with the secondary pane collapsible.
- **Safe areas:** account for notches/home indicators —
  `padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px);` on the
  root layout, and on any element fixed to the top or bottom of the viewport.

---

## 6. Shape and depth

| Token | Value | Use |
|---|---|---|
| `$radius-sm` | 16px | Inputs, icon buttons |
| `$radius-md` | 28px | Cards, panels |
| `$radius-lg` | 36px | Feature cards, the results chart card, modals |
| `$radius-pill` | 999px | Every button, chip, nav pill and badge; toggle switches |

**Borders:** `1px solid $border` for interactive elements (inputs, outline buttons). Cards are separated by
shadow, not a border (see §2.5). A feature card carries a 1px white edge.

**Shadows** (soft, tinted with a cool ink, so they stay light on Mist):

```scss
$shadow-sm: 0 1px 2px rgba(29, 29, 36, 0.05), 0 8px 24px rgba(60, 64, 90, 0.06);
$shadow-md: 0 20px 40px rgba(60, 64, 90, 0.08);
$shadow-lg: 0 24px 48px rgba(60, 64, 90, 0.12);
```

Use `$shadow-sm` on every white card at rest, `$shadow-md` on the main form card and on hover/focus-within,
`$shadow-lg` for modals only.

---

## 7. Iconography

**Icon set: [Lucide](https://lucide.dev)** (ISC licence, free, open-source). Credit in the README and
presentation.

- Sizes: 16px (inline with body text), 20px (buttons, form fields), 24px (standalone/nav).
- Stroke weight: 1.6–1.8px with round caps (the Calm look), the same for every icon. Icons are ink.
- Icon colour follows the same contrast rule as text (§2.2): only Ink, Slate or Berry for a meaningful
  standalone icon; tinted icons (Pink, Blush, Periwinkle) are decorative-only and always paired with a text label.
- A button with an icon and no visible text label must have an `aria-label`.

---

## 8. Components

For every component: states are `default / hover / focus / active / disabled / loading / error` unless noted.
Touch targets are **44×44px minimum** on all interactive elements.

### Buttons

| Variant | Fill | Text | Bootstrap base |
|---|---|---|---|
| Primary | `$primary` | White | `.btn-primary` (override `$primary` in Bootstrap map) |
| Secondary | Transparent, `$border` outline | `$text-primary` | `.btn-outline-secondary` |
| Tertiary / text | Transparent | `$primary` | `.btn-link` (no underline until hover) |
| Destructive | `$danger` | White | `.btn-danger` |

Rule: **one filled (primary or destructive) button per view.** Every other action is secondary or tertiary.
All buttons are pill-shaped (`$radius-pill`), weight 500. A primary button may lead with a 32–34px
`$accent-fill-1` (pink) disc holding an ink arrow. Primary hover moves to `$primary-hover`, other fills
darken ~10%; focus adds a 2px `$focus-ring` (ink) outline with a 2px `$bg-page` offset; disabled drops
opacity to 0.5 and removes hover/focus states.

### Inputs, selects, sliders

- Label above the field (`label` type style), never a placeholder used as the only label.
- Border `$border`, radius `$radius-sm`, focus ring 2px `$primary` with 2px offset.
- Sliders show a live numeric readout with units next to the track, updated as the user drags.
- Helper text below the field in `caption` style and `$text-secondary`; error text replaces it in `$danger`
  with an icon, stating what is wrong and how to fix it (e.g. "Enter an amount above $0", not "Invalid").

### Multi-step flow / stepper

- Desktop: horizontal row of step labels, current step in `$primary`, completed steps in `$text-secondary`
  with a checkmark, upcoming steps in `$text-tertiary`.
- Mobile (<`md`): condense to "Step 2 of 4" text plus a thin progress bar in `$primary` on `$border`.
- Back/Next buttons anchor to the bottom of the step card; Next is the one primary button on the screen.
- *Moving to the numbered step track (`.step-track`) with a blush halo on the current step; see
  `docs/design-system/components/Stepper/`. Until that PR, the current stepper stays as described above.*

### Cards and summary tiles

- Background `$bg-surface` (White) on a Mist page, **`$shadow-sm` required** at rest (see §2.5 — colour alone
  does not separate these two surfaces), `$radius-md`. On hover/focus-within (e.g. a clickable summary tile),
  step up to `$shadow-md`. The one highlighted card on a screen is a feature card: `$accent-fill-3`
  (Periwinkle), `$radius-lg`, 1px white edge. A hero/lead statement (the single most important sentence on a
  results-style page) sits above any chart, in `h2` or `display` size, with no card chrome around it.

### Tables

- Horizontal scroll inside the table's own `overflow-x: auto` container — the page itself never scrolls
  sideways. Sticky header row on scroll where the table exceeds one screen height.

### Charts and grid/matrix visuals

- Chart.js charts sit in a responsive container (`position: relative; width: 100%`), never a fixed pixel
  width. Legends required whenever more than one series is shown.
- Any heatmap or matrix view is **DOM- or SVG-rendered, not canvas**, with one `data-cy` per cell (§14) and a
  `title`/`aria-label` per cell stating its value in words.

### Explanation / reason blocks

Each item in a list of checks or conditions (e.g. a set of pass/fail tests) renders its own short reason
inline — never a single generic message covering several failed items at once.

### Badges and chips

- Status badges use the semantic fills (§2.7): `$success-fill` / `$warning-fill` / `$danger-fill` /
  `$info-fill` backgrounds with the matching text colour, `$radius-pill`, `caption` size.
- A version/freshness badge (e.g. showing which data or ruleset produced a result) uses `$accent-fill-2`
  (Blush) background with `$text-primary` text (12.6:1).

### Alerts, toasts, modals, banners

- Inline alerts use the semantic fill/text pairs from §2.7, `$radius-md`, an icon, and a close control if
  dismissible.
- Toasts appear top-right on desktop, full-width top on mobile, auto-dismiss after 5s unless it's an error.
- Modals use `$bg-surface-raised` (white), `$radius-lg`, `$shadow-lg`, and trap focus while open.
- A persistent notice/disclaimer banner (if the app needs one) sits in the page footer or header, `caption`
  size, `$text-secondary`, no background fill — it should read as ambient, not alarming.

### Loading, empty, error states

- Loading: skeleton blocks in `$surface-disabled` with a subtle shimmer, matching the shape of the real
  content (not a generic spinner for a whole page).
- Empty: an icon, one sentence explaining why it's empty, and — where relevant — a primary action to resolve
  it.
- Error: states what went wrong and what to do next, in plain language, using the `$danger` alert style.

### Illustrations

- Decorative SVG only (`CrossingScene` on the home page, after the Calm home board; `HeroScene` stays as the
  design-system reference): fills use the Calm palette through CSS custom
  properties (a fallback hex inside `var()` is allowed so the scene still renders if a token is missing); one
  `role="img"` and `aria-label` on the whole scene, nothing focusable.
- Ambient looping motion is allowed here as an exception to the §9 durations, using `transform`, `opacity` and
  palette fills only. It
  stops under `prefers-reduced-motion: reduce`, pauses when off-screen or in a background tab, and never
  carries information. `data-cy="hero-scene"`.

### Navigation / top bar

- Sticky top bar, `$bg-page` or translucent blur variant, `$border-subtle` bottom border on scroll only.
- Active nav item in `$primary`; inactive items in `$text-secondary`.
- *Moving to three floating white pills (status, logo and links, account) on `$bg-page`; see
  `docs/design-system/components/Navbar/`. Until that PR, the current bar stays as described above.*

---

## 9. Motion

- Durations: 150ms for micro-interactions (hover, focus), 200–250ms for larger transitions (panel open,
  route change).
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` (standard "ease-out" feel) for entrances;
  `cubic-bezier(0.4, 0, 1, 1)` for exits.
- Only animate `opacity` and `transform` for performance.
- Respect `prefers-reduced-motion: reduce` — wrap transitions in a media query and fall back to an instant
  state change.

---

## 10. Content and tone

- Plain, calm, precise language. Short sentences over long ones.
- Numbers: thousands separator, no unnecessary decimal places for whole currency amounts (e.g. `S$120,000`,
  not `S$120,000.00`) unless precision matters for the specific value shown.
- Currency: always prefixed `S$`.
- Dates: `D Month YYYY` (e.g. `21 Sep 2026`), matching British/Singapore English conventions.

---

## 11. Accessibility

- Every interactive element has a visible focus ring (2px `$primary`, 2px offset) — never `outline: none`
  without a replacement.
- Keyboard order follows visual/reading order; test every new screen with Tab alone before merging.
- Sliders, steppers, and any custom control need `aria-label` or `aria-labelledby`, and sliders need
  `aria-valuenow`/`aria-valuemin`/`aria-valuemax`.
- Any chart or heatmap needs an `aria-label` summarising what it shows, since screen readers cannot read a
  canvas or SVG's visual content on their own.
- Minimum touch target 44×44px (§8); minimum text size 14px outside of `caption`/badge contexts.

---

## 12. Responsiveness rules

- Mobile-first CSS: write the base (no media query) styles for 375px, then layer up with `min-width` media
  queries — never `max-width` as the default pattern.
- Allowed per breakpoint: column count changes, spacing scale step changes, font-size scale changes (§4),
  showing/hiding secondary panels.
- Never: fixed pixel widths on containers, horizontal scroll on the page itself (only inside tables/wide
  content per §8), interactions that only work on hover (every hover state needs a tap-equivalent).

---

## 13. Code conventions (Vue/SCSS)

- All tokens live in `client/src/styles/_tokens.scss`. No hard-coded hex values, font sizes, or pixel
  spacing anywhere else in the codebase — if a value isn't a token yet, add it to `_tokens.scss` first.
- Bootstrap is customised through `client/src/styles/_bootstrap-overrides.scss` (imported before Bootstrap's
  own SCSS). Prefer Bootstrap utility classes (`d-flex`, `gap-3`, `mt-4`, etc.) over custom CSS wherever one
  exists.
- Small custom styles Bootstrap can't cover live in `client/src/styles/_components.scss`, using BEM class
  names (`.stepper__item--active`).
- No inline `style=""` attributes. Scoped `<style>` blocks in `.vue` files are only for layout that is truly
  one-off to that component — anything reusable becomes a token or a shared class.
- Folder structure: shared/reusable components in `client/src/components/`; one-off page layout lives in the
  relevant `client/src/views/*.vue`.
- To add a new token or component: open a PR against `_tokens.scss` (or the relevant file) and add/update
  its entry in `StyleGuide.vue` in the same PR, so the living style guide never drifts from reality.

---

## 14. Testing hooks

**Convention:** `data-cy="<area>-<element>-<action>"`, kebab-case, stable — never derived from visible text
or CSS classes (so copy changes and restyles don't break tests).

Examples covering the main flows:

```
nav-plan-link              nav-sources-link           nav-login-link
plan-step-1-panel          plan-step-next             plan-step-back
stepper-step-1 … step-4
results-breakeven-sentence results-loading             results-error
heatmap                    heatmap-cell-r0-c3          heatmap-legend
login-email-input          login-password-input        login-submit-button
disclaimer-banner          ruleset-badge
```

**Rule:** any grid/matrix visual (heatmap or similar) must be DOM- or SVG-rendered with a `data-cy` on every
individual cell — a canvas-rendered chart cannot be asserted on by Cypress.

---

## 15. Library credits

| Library / asset | Licence | Used for |
|---|---|---|
| Plus Jakarta Sans | SIL Open Font License | All text |
| Lucide | ISC | Icons |
| Bootstrap 5 | MIT | Grid, base components |
| Chart.js | MIT | Charts |

Credit each again in a code comment where first imported, and in the presentation slides, per the module
requirement.

---

## 16. Governance

- **Owner:** seat 4 (frontend core + styling).
- **Changing a token value:** PR against this file + `_tokens.scss`, reviewed by seat 4 and seat 5 (visual
  regressions affect Cypress). Update `StyleGuide.vue` in the same PR.
- **Adding a new component pattern:** add it to §8 with its states and `data-cy` convention before using it
  in a real screen, so later screens stay consistent.
- **Changelog:**
  - `1.0` (2026-09-28): initial rulebook — palette contrast audit, derived grey scale and semantic colours,
    type scale, component inventory.
  - `1.1` (2026-09-28): resolved the Meteor/Milky Way separation question — decided to keep Milky Way as the
    page background and require border + shadow on every card (§2.5, §8) rather than change the palette.
    Checked white as an alternative background; it does not improve the separation (1.11 vs 1.06), so it
    would not have helped.
  - `1.2` (2026-10-29): moved to the Calm direction from the design handoff. Mist, ink, pink, blush and
    periwinkle replace Galaxy/Planetary (§2, §3); Plus Jakarta Sans at weight 500 replaces Hanken Grotesk
    and Inter (§4); radii are 16/28/36px with soft card shadows (§6); cards are separated by shadow and no
    longer need a border (§2.5, §8); buttons are pills (§8). Navbar and stepper keep their layout until
    the pill-nav and step-track PR. Chart.js series colours still need to move to ink and pink. Brand
    book and component previews: `docs/design-system/`.

---

## Open questions for the team

1. ~~Success and warning text under 4.5:1~~ **Resolved (#82 review):** `$success` `#2C7756` and `$warning` `#8E621D` pass AA on Mist, white, periwinkle and their own fills.
2. **Semantic colours (§2.7) were not specified by the team and are proposed here** — confirm they read
   correctly to everyone (colour-blindness varies person to person) before they're used for anything safety-
   or correctness-critical, such as a failed-eligibility banner.
3. **Dark mode is included as a stub idea only (§2.8)** and is not built — confirm this is out of scope for
   the grading, since it isn't a module requirement.

---

## Changes, 4 Nov 2026 (D45)

- **White page on every route** (`$bg-app`) and borders on white boxes: §2.5.
- **One colour per path** (`--path-bto` indigo, `--path-resale` / `--path-resale-bar`): §3.
- **Section headings:** every section on Results and the Dashboard uses `.section-head`,
  `.section-head__title` (h2 size, left-aligned) and `.section-head__sub` (one line).
- **Rounding:** headlines and summaries round to the nearest S$1,000 (`formatMoneyRounded` in
  `utils/format.js`); breakdowns that must add up (How you'd pay, cost and grant tables) are exact (`formatMoney`).
