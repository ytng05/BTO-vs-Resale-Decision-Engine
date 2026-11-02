The look of the BTO vs resale break-even decision engine: soft, friendly and reassuring for a big money decision. Greyish-white pages, floating white cards, near-black ink type, flat animated HDB scenes and one blush pink for warmth. Built on Vue 3 and Bootstrap 5. If a screen disagrees with these rules, the screen is wrong.

## Principles

- **Easy first.** One question per screen, lots of air, nothing shouting. The decision is stressful; the interface shouldn't be.
- **One primary action per screen.** One ink `primary` pill per view; everything else is a plain text link or a white pill.
- **Whitespace is a layout tool.** Separate sections with `space-6` and `space-8`, never by cramming.
- **Every state is designed.** Loading, empty and error exist for every data view.
- **Colour carries meaning.** Pink is warmth and the resale path; semantic colours are for status only.
- **Tokens over values.** No raw hex, font size or pixel spacing in a component.
- **Mobile first.** Build and check 375px first, then layer up with `min-width` queries.
- **Every interactive element is testable.** Add `data-cy="<area>-<element>-<action>"` (kebab-case, never derived from visible text) when you add the element.

## Content and tone

- Warm and plain, written to one person: "Welcome back, Cadence!", "How are you feeling about your next home?", "Which BTO are you eyeing?". Short sentences.
- Sentence case everywhere, including buttons and nav ("Next", "See results", "Save to dashboard").
- Currency always `S$`, thousands separators, no decimals on whole amounts: `S$120,000`.
- Dates as `D Month YYYY`: `21 Sep 2026`. Durations in plain words: "About 5 minutes", "About 14 months to go".
- Errors say what is wrong and how to fix it: "Enter an amount of S$0 or more", never "Invalid".
- Results are projections. Ship the disclaimer with every result: "Illustrative projection, not financial advice. Results depend on the assumptions and the ruleset version shown."
- No emoji.

## Colour

Two colour families on a neutral ground: ink and pink, plus a periwinkle mist for the one card that matters.

- Page: `bg-page` (mist). Cards: `bg-surface` (white) with `shadow-sm` – the shadow, not a border, separates them. The single highlighted card on a screen: `bg-feature` (periwinkle) with a 1px white edge.
- Text: `text-primary` (ink) for headings and body, `text-secondary` (slate) for supporting text and labels. `text-tertiary` fails AA – placeholders and decoration only.
- **Action is ink.** `primary` fills the main pill button with `on-primary` (white) text; a small `accent` (pink) disc with an ink arrow or play mark sits at its leading edge. Hover goes to `primary-hover`.
- **Pink is warmth, not text.** `accent` (pink) and `accent-soft` (blush) are fills only: selected chips, step pills, badges, progress, the resale card. The only pink allowed as text or a thin mark is `color-berry`.
- Links and the active step are ink. In the navbar, links are ink on white and the current page sits on an `accent-soft` (blush) pill.
- Status: `success`, `warning`, `danger`, `info` on their `*-fill`, for status only. Success and warning text on their own fills sit just under 4.5:1, so keep that text 14px semibold or larger.

### Data visualisation

- BTO / path A is `data-bto` (ink); resale / path B is `data-resale` (pink); a tie or break-even year is `data-level` (berry); unplayed or neutral marks are `border`.
- Pink is only 1.9:1 on white, so resale never relies on colour: it sits below the baseline (timeline bars), uses a dotted line (line charts) or carries a label.
- Every chart has a legend or inline labels; every heatmap cell has a `title`/`aria-label` stating its value in words. Heatmaps and timelines are DOM or SVG, never canvas.

## Typography

- One family: **Plus Jakarta Sans** (`font-sans`) for everything, from Google Fonts with `font-display: swap`. It stands in for the Satoshi / General Sans look of the reference.
- Headings at weight 500 – never bold – with tight tracking: `display` -0.025em, `h1` -0.02em, `h2` -0.015em. Body 400, labels and buttons 500.
- Sizes are mobile-first. From lg: `display` 48px, `h1` 36px, `h2` 24px, `h3` 20px, `h4` 18px.
- Money and numbers use `numeric` (tabular figures). Big result figures are 24–34px at weight 500.
- Body text runs at most 75 characters a line (`.text-measure`). Minimum text size is 13px for captions, 14px otherwise.

## Spacing, layout and shape

- 4px base: `space-1` 4 · `space-2` 8 · `space-3` 12 · `space-4` 16 · `space-5` 24 · `space-6` 32 · `space-8` 48 · `space-10` 64. Bootstrap's `m-*`/`p-*`/`gap-*` utilities 1–7 map to `space-1`, `space-2`, `space-4`, `space-5`, `space-6`, `space-8`, `space-10`.
- Page content max 1240px; Bootstrap 5 breakpoints (sm 576, md 768, lg 992, xl 1200). Two-pane screens sit side by side from lg and stack below it.
- Header: three floating white pills on the page – a status pill, the logo and links, an account pill – each with `shadow-ledge`. No bar background. See `Navbar`.
- Radii: `radius-pill` for every button, chip, nav pill and badge; `radius-sm` for inputs and icon buttons; `radius-md` for cards; `radius-lg` for feature cards, the results chart card and modals.
- Shadows: `shadow-sm` on every white card at rest, `shadow-md` on the main form card and on hover, `shadow-lg` for modals.
- Respect safe areas: `env(safe-area-inset-top/bottom)` on the root layout and anything fixed to the viewport.

## Motion

- Scenes follow `HeroScene`: small flat residents walking with swinging legs (0.6–0.7s), floors stacking and windows lighting up in 10–20s loops, clouds drifting in 25–40s, a cyclist or a cat's tail as a small extra. One scene per screen, never competing scenes in the same card.
- UI transitions: 150ms for hover and focus, 200–250ms for panels and route changes; ease-out `cubic-bezier(0.4, 0, 0.2, 1)` in, ease-in `cubic-bezier(0.4, 0, 1, 1)` out.
- Animate only `opacity`, `transform` and SVG stroke or fill. Everything must look complete at rest. Under `prefers-reduced-motion: reduce`, everything holds still.

## States and accessibility

- Focus ring: 2px `focus-ring` (ink) with a 2px `bg-page` offset on every interactive element; never `outline: none` without it.
- Touch targets at least 44×44px.
- Loading: skeleton blocks in `surface-disabled` shaped like the real content, no page spinner.
- Empty: a small flat scene, one sentence on why, and a primary action where relevant.
- Error: what went wrong and what to do next, in the `danger` alert style.
- Sliders show a live readout with units and carry `aria-valuenow`/`min`/`max`; icon-only buttons carry an `aria-label`.

## Iconography

- **Lucide**-style outline icons, 1.6–1.8px stroke, round caps, ink only, at 20px in buttons and fields and 24px standalone.
- Inside primary buttons, the leading icon sits in a 32–34px `accent` disc.
- No logo in the repository: the product name is set in plain type ("BTO vs resale", weight 600).

## Illustration

- Flat vector in the `HeroScene` style: filled shapes with rounded corners, no outlines except on people. Only palette colours – white, `bg-feature`, `accent-soft`, `accent`, `color-pink-deep` and ink – with no gradients.
- Subjects are everyday HDB moments: white blocks with an accent roof bar and windows that light up pink, a crane stacking floors for a BTO, rain trees, residents walking along chart lines towards their flats, cyclists, a void-deck cat, an estate going from day to dusk.
- People: ink legs, a pink, blush or ink top, a white face with an ink outline and ink hair. BTO walkers wear ink, resale walkers wear pink, matching the chart lines.
- Scenes sit inside a `bg-feature` or white card, never behind text. See `HeroScene` and the Plan, Results and Dashboard screens in the Calm mock-up.

## Using the components

The app is Bootstrap 5 customised through variables, plus a small set of BEM classes. Prefer a Bootstrap class or utility to custom CSS; reach for these when Bootstrap has none: `.pill-nav`, `.step-track`, `.divider-label`, `.btn-wide`, `.chip-group` / `.chip`, `.floor-picker` / `.lift-panel` / `.lift-button`, `.stepper`, `.stepper-mobile`, `.app-navbar`, `.hero-statement`, `.badge-version`, `.badge-status--success`, `.disclaimer`, `.skeleton`, `.heatmap__*`, `.dash-card--bto` / `--resale`, `.compare-card--winner`, `.compare-path`, `.compare-bar`, `.text-numeric`, `.text-measure`. Load `components/bundle.css` (the compiled app stylesheet) after the tokens. No inline `style=""` attributes in product code.

Credits: Plus Jakarta Sans by Tokotype (SIL Open Font License); Lucide (ISC); Bootstrap 5 and Chart.js (MIT).

## Not synced

From `ytng05/BTO-vs-Resale-Decision-Engine`, default branch, uploaded as a zip on 29 Oct 2026 (no commit sha in the archive).

- **Changed here, not yet in code:** on 29 Oct 2026 the system moved to the Calm direction – the mist, ink, pink and periwinkle palette, Plus Jakarta Sans at weight 500, larger radii (16 / 28 / 36px) and soft card shadows, pill buttons, plus the Chip, FloorPicker and HeroScene components. `bundle.css` was recompiled from patched copies of `_tokens.scss`, `_bootstrap-overrides.scss` and `_components.scss`; the repository still uses the original Galaxy and Planetary palette with Hanken Grotesk and Inter until the team applies these changes and updates UI.md.
- **Not in tokens:** `body-max-line-length` (75ch) and the motion durations and easings (kept in `bundle.css` and listed under Motion). The desktop heading sizes are in each style's note.
- **No dark theme**, **no font files** (Plus Jakarta Sans loads from Google Fonts) and **no logos or icons** in the repository.
- **Components:** static renditions of the Vue components, styled by the compiled `bundle.css`. Bootstrap classes in it hold compiled colour values, so a token edit on this page won't recolour them.
- **Not included:** PathOutcomeCard, GapBreakdownPanel, ScenarioCompareCard, EligibilityList, CompareBar, WhatIfPanel, SaveScenarioPanel, TimingOptimiserPanel, SituationForm, PathForm and the charts (CashFlowChart, CashFlowOverTimeChart, HistoricalRpiChart).
