# Conventions

## Selectors (Cypress)
`data-cy="<area>-<element>-<action>"`, kebab-case, never based on text or styling.
Examples: `plan-step-next`, `plan-step-back`, `stepper-step-2`, `results-breakeven-sentence`,
`heatmap-cell-r0-c3`, `disclaimer-banner`, `nav-ruleset-status`, `login-email-input`, `login-submit-button`.
(`ruleset-badge` is now only on the scenario compare cards, from `RulesetBadge.vue`, kept on purpose for that.)

### Selectors in use (keep in sync; the Cypress specs depend on them)
Rename one only in the same PR that updates the specs. `{n}` = buyer 1/2, `{prefix}` = `patha`/`pathb`, `{i}` = row index.

| Screen | Selectors |
|---|---|
| App shell | `skip-link` (first Tab stop, to `#main`), `not-found`, `not-found-home-link`, `not-found-plan-link` (any unknown address) |
| Navbar | `nav-bar`, `nav-brand-home`, `nav-plan-link`, `nav-sources-link`, `nav-login-link`, `nav-scenarios-link`, `nav-account-toggle`, `nav-logout-button`, `nav-toggler-toggle` |
| Home | `home-title`, `home-start-button`, `home-example-button`, `home-example-link`, `home-example-confirm` (+ `-yes`, `-no`), `home-steps`, `home-step-{n}`, `home-get`, `home-costs`, `home-cost-{n}`, `home-faq`, `home-faq-{n}`, `home-sources-link`, `home-cta-button`, `disclaimer-banner`, `hero-scene`, `hero-scene-meet` |
| Stepper / plan | `stepper`, `stepper-step-{i}`, `stepper-mobile-label`, `stepper-mobile-track`, `plan-form`, `plan-step-{1-4}-panel` (1 What matters most, 2 About you, 3 Your BTO, 4 Resale flat; D38), `plan-step-next`, `plan-step-back`, `plan-step-skip` (step 1 only), `plan-step-errors`, `bto-step-art`, `bto-step-summary`, `bto-step-keys`, `plan-page-title` (visually hidden h1) |
| What matters most (step 1) | `wishes-form`, `wish-{key}`, `wish-{key}-input` (`{key}` = `parents`, `moveby`, `monthly`, `cash`, `space`, `value`) |
| Situation | `situation-form`, `situation-intro`, `situation-buyer-{n}`, `situation-buyer-{n}-age-input`, `-citizenship-select`, `-first-timer-switch`, `-income-input`, `-cpf-input`, `situation-applicants-error`, `situation-cash-savings-input`, `situation-move-in-by-input` (only when `moveby` was picked), `situation-ehg-hint`, `situation-ehg-loading`, `situation-buyer-{n}-age-error`, `situation-buyer-{n}-citizenship-error`, `situation-buyer-{n}-income-error`, `situation-buyer-{n}-cpf-error` |
| Path A / B | `{prefix}-form`, `{prefix}-town-select`, `{prefix}-project` with launch chips `{prefix}-project-{id}` (+ `-input`) and `{prefix}-projects-error`, `{prefix}-flat-type` with chips `{prefix}-flat-type-{type}` (+ `-input`; `{type}` = `3-room`, `4-room`, `5-room`), `{prefix}-lease-band` with chips `{prefix}-lease-band-{band}` (+ `-input`; e.g. `80-89`), `{prefix}-living` with chips `{prefix}-living-{arrangement}` (+ `-input`; `none`, `with`, `near`), `{prefix}-price-basis`, `{prefix}-asking-price-input`, `{prefix}-asking-price-help`, `{prefix}-asking-price-cov`, `{prefix}-projects-loading`, `{prefix}-projects-retry` |
| Scenes | `estate-scene`, `estate-wish-{key}`, `bto-scene`, `bto-scene-keys`, `bto-scene-parents` |
| Results | `results-breakeven-sentence`, `results-gap-sentence`, `results-ruleset-version`, `results-mock-notice`, `results-loading`, `results-error`, `results-retry-button`, `results-empty`, `results-start-plan-button`, `results-edit-button`, `results-dashboard-button`, `results-cashflow-trend`, `results-cashflow-dashboard-link`, `results-patha-card` / `results-pathb-card` (+ `-net-position`, `-grants-total`, `-cpf-refund`, `-clawback`, `-eligibility`, `-eligibility-item-{i}`, `-eligibility-status-{i}`, `-eligibility-reason-{i}`, `-eligibility-source-{i}`, `-eligibility-grant-{id}`, `-eligibility-grant-status-{id}`, `-eligibility-why-not-{id}`, `-eligibility-why-not-source-{id}`, `-eligibility-more-{id}`), `results-section-chart`, `results-section-heatmap`, `results-section-timing`, `results-print-button`, `results-print-header` (print only), `results-next-steps`, `results-next-step-{id}` (`hfe`, `grants`, `afford`, `resale`, `conditions`) |
| Heatmap | `heatmap`, `heatmap-legend`, `heatmap-cell-r{r}-c{c}`, `heatmap-button-r{r}-c{c}`, `heatmap-user-marker`, `heatmap-selected-detail`, `heatmap-outside-note` |
| RPI chart | `results-rpi-card`, `results-rpi-era-filter`, `results-rpi-era-{value}`, `results-rpi-growth`, `results-rpi-loading`, `results-rpi-error`, `results-rpi-retry-button`, `results-rpi-mock-notice` |
| Timing | `results-timing-card`, `results-timing-loading`, `results-timing-error`, `results-timing-retry-button`, `results-timing-headline`, `results-timing-list`, `results-timing-row-{year}`, `results-timing-best-{year}`, `results-timing-skipped`, `results-timing-skipped-{year}`, `results-timing-explanation`, `results-timing-mock-notice` |
| Gap breakdown | `results-gap-card`, `results-gap-list`, `results-gap-line-{id}`, `results-gap-none`, `results-gap-total`, `results-gap-hidden`, `results-gap-note`, `results-gap-grants` |
| Save scenario | `results-save`, `results-save-button`, `results-save-form`, `results-save-name-input`, `results-save-submit`, `results-save-cancel`, `results-save-success`, `results-save-error`, `results-save-login-link`, `results-save-scenarios-link` |
| Dashboard | `dashboard-headline`, `dashboard-subtitle`, `dashboard-summary-{key}` (+ `-net`, `-price`, `-grants`, `-keys`, `-affordability`), `dashboard-whatif`, `dashboard-whatif-reset`, `dashboard-whatif-more`, `dashboard-whatif-more-count`, `{id}-slider`, `{id}-value`, `dashboard-grants`, `dashboard-grant-{id}`, `dashboard-costs`, `dashboard-cost-{id}`, `dashboard-cashflow`, `dashboard-warnings`, `dashboard-loading`, `dashboard-error`, `dashboard-empty`, `dashboard-mock-notice`, `dashboard-ruleset-version`, `dashboard-edit-button`, `dashboard-results-button`, `dashboard-phg-map`, `phg-parents-postal-input`, `phg-flat-postal-input`, `phg-show-button`, `phg-map-error`, `phg-distance`, `phg-check-note`, `phg-map-canvas`, `dashboard-overview`, `dashboard-cash-cover` / `dashboard-cash-cover-{key}` (+ `-status`), `dashboard-tile-savings`, `dashboard-tile-grants`, `dashboard-tile-housing-cash`, `dashboard-tile-keys`, `dashboard-grants-jump`, `dashboard-section-{key}` (cashflow, grants, costs, rpi, map, size), `dashboard-sections-toggle`, `dashboard-size-price` (+ `-{row}-bto` / `-{row}-resale` for rows `source`, `area`, `price-range`, `price`, `per-sqm`, `lease`), `dashboard-size-price-loading`, `dashboard-size-price-error`, `dashboard-size-price-retry` |
| Login | `login-view`, `login-title`, `login-prepare`, `login-choice-login`, `login-choice-register`, `login-choice-guest`, `login-bubble-{id}`, `login-back-button`, `login-form`, `login-name-input`, `login-email-input`, `login-password-input`, `login-name-error`, `login-email-error`, `login-password-error`, `login-submit-button`, `login-error` |
| My scenarios | `scenarios-view`, `scenarios-list`, `scenarios-row-{id}`, `scenarios-row-name`, `scenarios-open-button`, `scenarios-delete-button`, `scenarios-delete-confirm`, `scenarios-delete-cancel`, `scenarios-empty`, `scenarios-loading`, `scenarios-error`, `scenarios-retry-button`, `scenarios-logged-out`, `scenarios-login-link`, `scenarios-start-plan-button`, `scenarios-compare-mode-button`, `scenarios-compare-checkbox`, `scenarios-compare-hint` |
| Compare | `compare-view`, `compare-card-a` / `compare-card-b`, `compare-card-name`, `compare-card-meta`, `compare-card-ruleset-badge`, `compare-path-pathA` / `-pathB`, `compare-ahead-badge`, `compare-card-tie`, `compare-open-results-button`, `compare-headline-sentence`, `compare-horizon-note`, `compare-loading`, `compare-error`, `compare-retry-button`, `compare-not-found`, `compare-invalid`, `compare-logged-out`, `compare-login-link`, `compare-back-link`, `compare-pick-link`, `compare-repick-link` |
| Sources | `sources-title`, `sources-ruleset-version`, `sources-template-badge`, `sources-rules-table`, `sources-assumptions`, `sources-datasets`, `sources-source-link`, `sources-expand-all`, `sources-search-input`, `sources-search-clear`, `sources-no-match`, `sources-rules-hint`, `sources-show-all-topics`, `sources-search-status` |


## Git
- `main` is always deployable. Work on `feature/<seat>-<short-name>` branches and merge by pull request with one review.
- Seats 1 and 2 review each other's maths.
- No secrets in git (`.env` is ignored). Keep `.env.example` current.

## Code
- Engine functions are pure and deterministic: no I/O, no `Date.now()`, no `Math.random()` (pass the as-of date in; seed any randomness).
- Policy figures live only in the versioned ruleset JSON, each with a source and date. Never hard-code them.
- No hard-coded colours, font sizes or pixel spacing outside `client/src/styles`.
- Credit every third-party library in a code comment where it is used and in the README credits list.
- Say "net financial position after N years", "historical range", "backtest". Never "profit", "probability of winning", or "Monte Carlo" for a historical replay.

## Feature order
1. Base app works end to end (engine core, rules, data, stepper, results, tests).
2. FEATURE 1 timing optimiser, FEATURE 2 strategy search.
3. Only then FEATURE 3 backtest (`FEATURE_BACKTEST=true`). Freeze new features around week 10 or 11.
