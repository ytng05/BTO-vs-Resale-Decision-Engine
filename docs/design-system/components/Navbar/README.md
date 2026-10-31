# Navbar

The top navigation as three floating pills: a status pill on the left, the logo and links in the centre, and an account pill on the right.

- `header.pill-nav` – a flex row, items centred, space between the three pills. It sits on `bg-page` with no bar of its own.
- `.pill-nav__pill` – white, `radius-pill`, at least 56px tall, with a tactile ledge: `shadow-ledge` (a 3px ink-tinted edge under a soft blur).
- **Status** (`.pill-nav__status`): a 12px `success` dot that pulses gently, then one short line about data freshness, e.g. "Ruleset up to date · 24 Aug 2026". Use it for trust signals only, never marketing. Hidden below lg.
- **Centre** (`nav.pill-nav__pill`): `.pill-nav__logo`, a 44px ink circle with a white line-drawn block mark linking home, then `.pill-nav__links` – 16px weight-500 ink links in pill hit areas. Hover tints `surface-disabled`; the current page carries `aria-current="page"` and an `accent-soft` (blush) pill. Below md the links hide and `.pill-nav__menu` (a 44px icon button) takes over.
- **End** (`.pill-nav__end`): an icon and a short label for the signed-in area ("My scenarios · 2") or "Log in". Below md only the icon shows; the label stays for screen readers.
- Focus: a 2px `focus-ring` with a 2px offset on every link and button. The dot's pulse stops under `prefers-reduced-motion`.

The consumer supplies the routes, the freshness line, the account label and `data-cy` hooks (`nav-plan-link`, `nav-sources-link`, `nav-login-link`, `nav-account-toggle`, `nav-toggler-toggle`). This replaces the earlier `.app-navbar` bar; that class still exists in `bundle.css` for the current app.
