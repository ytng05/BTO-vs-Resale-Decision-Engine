# UI.md — Design system and UI rulebook

> Version 1.0 · Owner: seat 4 (frontend core + styling) · Last updated: 2026-09-28
> Propose changes by pull request against this file. A change to a token value needs sign-off from seat 4
> and seat 5 (since it affects Cypress screenshots/visual state), and should update `StyleGuide.vue` in the
> same PR.

This file is the single source of truth for how the app looks. If a screen disagrees with this file, the
screen is wrong, not the file — raise a PR to change the rule instead of improvising in a component.

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
- Results links on to the Dashboard ("What's this made of?"); the Dashboard links back to Results.
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

### 2.1 Brand palette (given)

| Name | Hex | Role |
|---|---|---|
| Planetary | `#334EAC` | Primary action colour |
| Universe | `#7096D1` | Supporting tint / large-scale accent |
| Venus | `#BAD6EB` | Supporting tint, subtle fills |
| Sky | `#D0E3FF` | Supporting tint, subtle fills |
| Meteor | `#F7F2EB` | Elevated surface (cards, panels) |
| Milky Way | `#FFF9F0` | **Main page background** |
| Galaxy | `#081F5C` | Primary text / strong accent |

### 2.2 Verified contrast on Milky Way (`#FFF9F0`)

All ratios below are measured, not estimated (WCAG 2.1 relative-luminance formula). AA for normal text needs
**4.5:1**; AA for large text (≥24px, or ≥19px bold) needs **3.0:1**.

| Colour | Hex | Ratio on Milky Way | Normal text | Large text / icons |
|---|---|---|---|---|
| Galaxy | `#081F5C` | 14.74 | ✅ PASS | ✅ PASS |
| Planetary | `#334EAC` | 7.10 | ✅ PASS | ✅ PASS |
| Universe | `#7096D1` | 2.88 | ❌ fail | ❌ fail |
| Venus | `#BAD6EB` | 1.44 | ❌ fail | ❌ fail |
| Sky | `#D0E3FF` | 1.24 | ❌ fail | ❌ fail |
| Meteor | `#F7F2EB` | 1.06 | ❌ fail | ❌ fail |
| White | `#FFFFFF` | 1.05 | ❌ fail | ❌ fail |

**Rule:** only **Galaxy** and **Planetary** may be used as text or icon colour directly on Milky Way or
Meteor. Universe, Venus, Sky, Meteor and White are **fill/background colours only** at their given
lightness — never body text, never a small icon's only colour.

**Button fills checked separately** (white text on a solid colour fill):

| Fill | White text ratio | Verdict |
|---|---|---|
| Planetary | 7.43 | ✅ PASS |
| Galaxy | 15.43 | ✅ PASS |
| Universe | 3.01 | ❌ fail — do not use Universe as a filled button with white text |

**Galaxy text on tinted fills** (for chips/badges built on Venus or Sky):

| Fill | Galaxy text ratio | Verdict |
|---|---|---|
| Venus | 10.22 | ✅ PASS |
| Sky | 11.84 | ✅ PASS |

### 2.3 Derived token: Universe-text

Universe fails AA for text at its given lightness (ratio 2.88). For the rare case where an Universe-family
colour is needed as small text or an icon (e.g. a link in the Universe family, a secondary icon tint), use
the darkened variant below instead of the base Universe swatch:

| Token | Hex | Contrast on Milky Way |
|---|---|---|
| `$universe` (fills, large decorative use only) | `#7096D1` | 2.88 — fails for text |
| `$universe-text` (links/icons/small text) | `#54709C` | 4.81 ✅ PASS |

### 2.4 Derived neutral (grey) scale

No grey scale was given, so one is derived by blending Galaxy toward Milky Way, keeping the whole scale in
the same desaturated blue family rather than a neutral that would clash:

| Token | Hex | Use | Contrast on Milky Way |
|---|---|---|---|
| `$text-primary` | `#081F5C` (Galaxy) | Headings, primary body text | 14.74 — PASS |
| `$text-secondary` | `#536088` | Secondary/supporting text, labels | 5.19 — PASS |
| `$text-tertiary` | `#8188A0` | Placeholder text, timestamps, disabled text | 2.9 — fails AA; **large/decorative only, never body copy** |
| `$border` | `#D3D2D5` | Input borders, dividers between sections | — (not text) |
| `$border-subtle` | `#E6E3E1` | Card borders on Meteor, faint dividers | — (not text) |
| `$surface-disabled` | `#F3EEE9` | Disabled input/button backgrounds | — (not text) |

### 2.5 Surfaces

| Token | Hex | Use |
|---|---|---|
| `$bg-page` | `#FFF9F0` (Milky Way) | Main page background, body |
| `$bg-surface` | `#F7F2EB` (Meteor) | Cards, panels, elevated content sitting on the page |
| `$bg-surface-raised` | `#FFFFFF` | Modals, popovers — the most "lifted" surface |

**Decided trade-off:** Meteor vs Milky Way measures a contrast ratio of only **1.06** (nearly identical
lightness) — checked against white as an alternative background too, which doesn't improve this (Meteor vs
White is 1.11, no better). The team has decided to keep Milky Way as the page background and solve card
separation structurally instead of by colour: **every card MUST have both `1px solid $border-subtle` and
`$shadow-sm` (§6) at rest** — this is not optional styling, it is the mechanism that makes a card readable as
a surface at all on this background. This is also the Apple-like pattern (hairline + soft shadow, not a big
colour jump), so it fits the design direction. Never ship a card with only a colour change and no border or
shadow.

### 2.6 Primary action and tints

| Token | Hex | Use |
|---|---|---|
| `$primary` | `#334EAC` (Planetary) | Primary buttons, links, focus rings, active nav |
| `$primary-hover` | `#2A3F8D` (Planetary darkened ~15%) | Primary button hover/active |
| `$accent-fill-1` | `#7096D1` (Universe) | Large decorative fills, chart series, progress bars — not text |
| `$accent-fill-2` | `#BAD6EB` (Venus) | Subtle background tint, selected-row background, chip fill |
| `$accent-fill-3` | `#D0E3FF` (Sky) | Lightest tint — hover background on list rows, info banner fill |

### 2.7 Semantic colours

None were given, so these are proposed to match the palette's desaturated, non-neon mood, and are checked
against Milky Way and against each other for distinguishability:

| Token | Hex | Use | Contrast on Milky Way (text use) |
|---|---|---|---|
| `$success` | `#2E7D5B` | Positive status, success banners/badges | 5.3 — PASS |
| `$success-fill` | `#E3F0E9` | Success banner background | — |
| `$warning` | `#9A6B1F` | Caution status, "not yet verified" badges | 5.6 — PASS |
| `$warning-fill` | `#FBF0DD` | Warning banner background | — |
| `$danger` | `#B3372C` | Errors, failed validation, destructive actions | 5.2 — PASS |
| `$danger-fill` | `#FAE6E3` | Error banner background | — |
| `$info` | `#334EAC` (= `$primary`) | Informational banners | 7.10 — PASS |
| `$info-fill` | `#E8EDFA` | Info banner background | — |

**Rule:** semantic colours are reserved for status communication only (validation, alerts, badges). Never use
`$danger` for a merely "important" button, and never use `$success` decoratively.

### 2.8 Dark mode (optional, not required for this project)

Not required for IS216 grading, but tokens are structured so it's possible later: a `[data-theme="dark"]`
block would remap `$bg-page` to a dark desaturated navy near Galaxy, `$text-primary` to Milky Way, and keep
Planetary as the accent (it already passes AA on dark backgrounds — check before shipping if attempted).

---

## 3. Data-visualisation colour

For charts and any grid/matrix visual (e.g. a heatmap), build from the brand blues plus semantic colours,
never from arbitrary chart-library defaults:

- **Categorical series (Chart.js line/bar):** `$primary` (Planetary), `$accent-fill-1` (Universe), `$success`,
  `$warning`, in that order, so the first two series read clearly against Milky Way.
- **Diverging scale (e.g. a two-sided comparison or heatmap):** `$primary` (Planetary) at one end,
  `$warning` (`#9A6B1F`) at the other end — chosen because blue/amber is distinguishable under the common
  forms of colour-blindness, unlike blue/red or green/red. Use `$border` (`#D3D2D5`) as the neutral midpoint
  for a "tie" or "no difference" value.
- **Never colour-only.** Every chart needs a legend or inline label; every heatmap cell needs a text
  tooltip/`title`/`aria-label` stating its value and meaning, not just a fill colour. A matrix or heatmap
  must be DOM- or SVG-rendered (not canvas) so both accessibility and Cypress can read it — see §14.

---

## 4. Typography

| Role | Font |
|---|---|
| Headings (h1–h4, display) | **Hanken Grotesk** |
| Body, labels, UI text, numbers | **Inter** |

Both are open-source under the SIL Open Font License (OFL). Load via Google Fonts or Fontsource with
`font-display: swap`. Credit line for the presentation/README: *"Hanken Grotesk and Inter by their respective
foundries, licensed under the SIL Open Font License."* Confirm the exact current licence text on the font's
Google Fonts or Fontsource page before submission.

```scss
$font-heading: 'Hanken Grotesk', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
$font-body:    'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
```

**Rule:** Hanken Grotesk is a display/heading face. Never use it below `body-small` size (it loses
legibility at small sizes) — body copy, labels, and captions are always Inter.

### Type scale

| Token | Font | Size (mobile) | Size (desktop, ≥lg) | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|---|---|
| `display` | Hanken Grotesk | 2rem / 32px | 2.75rem / 44px | 600 | 1.1 | -0.01em |
| `h1` | Hanken Grotesk | 1.5rem / 24px | 2rem / 32px | 600 | 1.2 | -0.01em |
| `h2` | Hanken Grotesk | 1.25rem / 20px | 1.5rem / 24px | 600 | 1.25 | normal |
| `h3` | Hanken Grotesk | 1.125rem / 18px | 1.25rem / 20px | 600 | 1.3 | normal |
| `h4` | Hanken Grotesk | 1rem / 16px | 1.125rem / 18px | 600 | 1.3 | normal |
| `body` | Inter | 1rem / 16px | 1rem / 16px | 400 | 1.5 | normal |
| `body-small` | Inter | 0.875rem / 14px | 0.875rem / 14px | 400 | 1.5 | normal |
| `caption` | Inter | 0.75rem / 12px | 0.75rem / 12px | 400 | 1.4 | 0.01em |
| `label` | Inter | 0.8125rem / 13px | 0.8125rem / 13px | 500 | 1.3 | 0.01em |
| `numeric` | Inter, `font-variant-numeric: tabular-nums` | matches context | matches context | 500 | matches context | normal |

**Rules:**
- Any money, percentage, or table of numbers uses `numeric` (tabular figures), so digits align in columns.
- Body text max line length: **75 characters** (use `max-width` on the text container, not on the page).
- Headings use `$text-primary` (Galaxy). Body text may use `$text-primary` or `$text-secondary`; never
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
| `$radius-sm` | 6px | Inputs, chips, small buttons |
| `$radius-md` | 12px | Cards, panels |
| `$radius-lg` | 20px | Modals, hero sections |
| `$radius-pill` | 999px | Pills, toggle switches |

**Borders:** `1px solid $border` for interactive elements (inputs, buttons with outline variant);
`1px solid $border-subtle` for separating cards from the Milky Way background (see §2.5's note on why this
is needed).

**Shadows** (calibrated for a warm-white background — pure grey shadows look muddy on Milky Way, so these
use a warm, low-opacity Galaxy tint instead of black):

```scss
$shadow-sm: 0 1px 2px rgba(8, 31, 92, 0.06);
$shadow-md: 0 4px 12px rgba(8, 31, 92, 0.08);
$shadow-lg: 0 12px 32px rgba(8, 31, 92, 0.12);
```

Use `$shadow-sm` for cards at rest, `$shadow-md` on hover/focus, `$shadow-lg` for modals only. Optional: a
restrained `backdrop-filter: blur(12px)` with a translucent Milky Way fill may be used for a sticky top bar
only — nowhere else.

---

## 7. Iconography

**Icon set: [Lucide](https://lucide.dev)** (ISC licence, free, open-source). Credit in the README and
presentation.

- Sizes: 16px (inline with body text), 20px (buttons, form fields), 24px (standalone/nav).
- Stroke weight: use Lucide's default (2px at 24px size) — don't override per-icon.
- Icon colour follows the same contrast rule as text (§2.2): only Galaxy or Planetary for a meaningful
  standalone icon; tinted icons (Universe/Venus/Sky) are decorative-only and always paired with a text label.
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
Hover darkens the fill ~10%; focus adds a 2px `$primary` outline with 2px offset; disabled drops opacity to
0.5 and removes hover/focus states.

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

### Cards and summary tiles

- Background `$bg-surface` (Meteor) on a Milky Way page, **`$border-subtle` AND `$shadow-sm` both required**
  at rest (see §2.5 — colour alone does not separate these two surfaces), `$radius-md`. On hover/focus-within
  (e.g. a clickable summary tile), step up to `$shadow-md`. A hero/lead statement (the single most important
  sentence on a results-style page) sits above any chart, in `h2` or `display` size, with no card chrome
  around it.

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
  (Venus) background with `$text-primary` text.

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

### Navigation / top bar

- Sticky top bar, `$bg-page` or translucent blur variant, `$border-subtle` bottom border on scroll only.
- Active nav item in `$primary`; inactive items in `$text-secondary`.

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
| Hanken Grotesk | SIL Open Font License | Headings |
| Inter | SIL Open Font License | Body text |
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

---

## Open questions for the team

1. **Universe cannot be used as text or a filled button with white text** at its given lightness (ratios
   2.88 and 3.01). A darkened `$universe-text` token (§2.3) is provided for the rare case text is needed in
   that hue — confirm the team is fine reserving plain Universe for large fills/charts only.
2. **Semantic colours (§2.7) were not specified by the team and are proposed here** — confirm they read
   correctly to everyone (colour-blindness varies person to person) before they're used for anything safety-
   or correctness-critical, such as a failed-eligibility banner.
3. **Dark mode is included as a stub idea only (§2.8)** and is not built — confirm this is out of scope for
   the grading, since it isn't a module requirement.
