# Navbar

The top navigation as three floating slots: the logo and name on the left, the links in the centre, and an account pill on the right. The ruleset warning is not here: `DisclaimerBanner` shows it on every page when the ruleset isn't verified.

- `header.pill-nav` – in the app, a sticky three-column grid (`1fr auto 1fr`, in `AppNavbar.vue`), so the links stay in the middle. The static rendition is a flex row, since `bundle.css` only has the shared styles.
- `.pill-nav__pill` – white, `radius-pill`, at least 56px tall, with a tactile ledge: `shadow-ledge` (a 3px ink-tinted edge under a soft blur).
- **Start**: `.pill-nav__logo`, a 44px ink circle with a white line-drawn block mark, then the name (`.pill-nav__brand`), together linking home.
- **Centre** (`nav.pill-nav__pill`): `.pill-nav__links` – 16px weight-500 ink links in pill hit areas. Hover tints `surface-disabled`; the current page carries `aria-current="page"` and an `accent-soft` (blush) pill. Below md the links hide and `.pill-nav__menu` (a 44px icon button) takes over.
- **End** (`.pill-nav__end`): an icon and a short label for the signed-in area ("My scenarios · 2") or "Log in". Below md only the icon shows; the label stays for screen readers.
- Focus: a 2px `focus-ring` with a 2px offset on every link and button.

The consumer supplies the routes, the account label and `data-cy` hooks (`nav-plan-link`, `nav-sources-link`, `nav-login-link`, `nav-account-toggle`, `nav-toggler-toggle`). This replaces the earlier `.app-navbar` bar; that class still exists in `bundle.css` for the current app.
