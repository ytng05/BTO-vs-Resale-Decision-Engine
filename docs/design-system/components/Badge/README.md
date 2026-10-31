# Badge

Small pill labels for status and data freshness.

- `.badge-version` – `accent-soft` (blush) with `text-primary`, `caption`, `radius-pill`: which data or ruleset produced a result (12.6:1).
- `.badge-status--success` – `success-fill` with `success` text. Other statuses follow the same pattern with `warning`/`danger`/`info` on their `*-fill`.
- `.badge.text-bg-light.border` – the ruleset badge as `RulesetBadge.vue` renders it today, with "- not yet verified" for a template ruleset.
- Badges carry a word, never colour alone.

The consumer supplies the text and `data-cy="ruleset-badge"` where it shows the ruleset.
