# Conventions

## Selectors (Cypress)
`data-cy="<area>-<element>-<action>"`, kebab-case, never based on text or styling.
Examples: `plan-step-next`, `plan-step-back`, `stepper-step-2`, `results-breakeven-sentence`,
`heatmap-cell-r0-c3`, `disclaimer-banner`, `ruleset-badge`, `login-email-input`, `login-submit-button`.

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
