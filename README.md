# BTO vs resale break-even decision engine

IS216 Web Application Development 2, group project (SMU).

Every first-time buyer in Singapore faces the same fork: take a BTO now and wait, or keep saving and buy resale later.
This app does not forecast prices. For a household's own plan it follows a BTO path and a resale path year by year and
says which ends ahead, by how much and why. It solves for the assumptions at which the two paths are equal and shows them
as a decision surface (heatmap), searches for the best year to apply, and checks every grant with its reason and its
official source. Policy rules are versioned and dated, and every result names the ruleset that produced it.

> Illustrative projection, not financial advice. Policy figures come from the versioned ruleset and are only as good as
> the sources recorded in `docs/SOURCES.md`.

## Scope
- HDB BTO (Standard / Plus / Prime) versus HDB resale. Executive Condominiums are out of scope.
- Built: (1) break-even comparison of the two paths, with the heatmap and the financial dashboard, (2) optimal timing search,
  plus saved scenarios, side-by-side comparison of two saved scenarios, and the Sources page.
- Future work, behind feature flags that are off: a ranked strategy recommendation over the full space (dropped after the
  prof's feedback; `FEATURE_STRATEGY_SEARCH`) and a historical backtest, or "risk-based verdict" (`FEATURE_BACKTEST`).

## Tech stack
Vue 3 (Composition API), Pinia, Vue Router, Bootstrap 5 (SCSS), Chart.js | Node.js, Express, MongoDB/Mongoose, JWT + bcryptjs | Vitest, Cypress.
External data: data.gov.sg (resale transactions, Resale Price Index, price range of flats offered) and OneMap (geocoding and
distance for the dashboard's PHG map). Whether the household lives with or near its parents is declared by the user; the map
lets them check that answer but never changes it (D15).

## Repository layout
```
server/src/engine/     pure calculation engine (seats 1 and 2): cpf, loan, costs, rules, solvers
server/src/config/     env, feature flags, versioned ruleset JSON (rules live here, not in code)
server/src/routes/     Express routes (contract in docs/API_CONTRACT.md)
server/src/services/   data.gov.sg client (seat 3)
server/src/models/     Mongoose schemas
client/src/            Vue app: views, components, Pinia store, API client with mock mode
cypress/e2e/           end-to-end tests
docs/                  API contract, open decisions, conventions, edge cases, source log, AI usage log
```

| Seat | Owns |
|---|---|
| 1 Financial engine | `engine/cpf`, `engine/loan`, `engine/costs`, `engine/index.js`, `engine/solvers` |
| 2 Rules engine + narrative | `engine/rules`, `config/rulesets`, `docs/SOURCES.md`, sources page, slides |
| 3 Backend and data | `routes`, `models`, `services`, `seeds`, auth, deployment |
| 4 Frontend core + styling | `client/src` shell, stepper, forms, theme (`client/src/styles`) |
| 5 Results, visualisation, testing | results components, heatmap, `cypress/`, CI, test docs |

## Getting started
Requires Node 20+ (developed on 22).

```bash
git clone <repo-url> && cd bto-resale-breakeven
npm install
cp .env.example .env        # optional: add MONGODB_URI, API keys
npm run dev                 # API on :3000, Vue dev server on :5173, live data (VITE_USE_MOCK=true npm run dev for mock data)
```

Run as a single app on one port (this is how it is submitted and graded):
```bash
npm run build               # builds the Vue app to client/dist
npm start                   # http://localhost:3000 serves the UI and the API
```
With no `MONGODB_URI` the server still starts (health, ruleset and stubs work). Database-backed features need it.

## Testing
```bash
npm test          # Vitest, server + client (no database needed)
npm run lint      # ESLint: unused variables, undefined names, Vue template errors
```
Real-database tests (`server/tests/db.test.js`) run only when `MONGODB_URI_TEST` points at a throwaway database whose
name contains `test`. CI starts one automatically. Never point it at the app database.

End-to-end (Cypress), two terminals:
```bash
VITE_USE_MOCK=true npm run build && npm start     # terminal 1  (PowerShell: $env:VITE_USE_MOCK='true'; npm run build; npm start)
npm run test:e2e                                  # terminal 2  (or npm run cy:open to watch it run)
```
| Spec | Covers |
|---|---|
| `smoke.cy.js` | home page, hero scene, step validation, full journey, register → save → reload (needs a database) |
| `home.cy.js` | the two ways in, See an example, the four steps, costs people forget, FAQ, reduced motion, phone width |
| `login.cy.js` | Start planning → login page: the three choices, the create-account and log-in forms, Back, planning without an account, and going on to the plan |
| `buyers.cy.js` | the About you step: one question per screen, two buyers, PR + PR blocked, per-buyer validation, money and age input, answers kept when going back |
| `error-summary.cy.js` | the error summary on Your BTO and Resale flat: every problem listed, each linking to its field |
| `preview.cy.js` | the check-your-answers page between the plan and Results; Change and Edit go back with answers kept |
| `results.cy.js` | results content, heatmap (labelled in words, not colour alone), BTO launch and price, phone width, Back keeps inputs |
| `results-verdict.cy.js` | who comes out ahead in plain words, the side-by-side table, net position bars, the hover chart, "too close to call" |
| `results-grants.cy.js` | each grant once with one status and every check's reason and official source; the best application year |
| `results-print.cy.js` | what to do next (official links) and print or save as PDF |
| `feedback-clarity.cy.js` | fixes from user testing: prices shown as figures, how to read the heatmap, the BTO price on the plan |
| `glossary.cy.js` | plain-English terms open by tap or keyboard, stay on screen at 375px, and link to the glossary on Sources |
| `dashboard.cy.js` | financial dashboard: headline, grant reasons, warnings, the flats side by side, what-if sliders and the flip price |
| `dashboard-overview.cy.js` | the cash rings, the four tiles and the jump to the grants table |
| `dashboard-sections.cy.js` | dashboard sections open and close, one at a time or all at once |
| `scenarios.cy.js` | save, list, open and delete a scenario (needs a database) |
| `scenario-compare.cy.js` | side-by-side compare page (mock scenarios), including phone width |
| `sources.cy.js` | ruleset version and badge, expand/collapse all, topic chips, search, safe https source links, assumptions and datasets |
| `responsive.cy.js` | every page at 375 / 768 / 1280 px upright and phone (667×375) and tablet (1024×768) on their side: no sideways scrolling, and pinned bars leave at least half the height |
| `a11y-basics.cy.js` | skip link, a page title per page, focus moves to the new page, new pages start at the top, 404 page |


Demo user journeys (five households, one per presenter) live in `cypress/journeys/` and run against a **live**
build: `VITE_USE_MOCK=false npm run build && npm start`, then `npm run journeys` (each recorded to `cypress/videos/`).
Inputs, steps and what each shows: `docs/JOURNEYS.md`.

Specs marked "needs a database" register real users: run them locally only with the server's `MONGODB_URI` pointing at
a **test** database. If Cypress fails to start with `bad option: --smoke-test`, run `Remove-Item Env:ELECTRON_RUN_AS_NODE`
(PowerShell) in that terminal first. Selectors use `data-cy` attributes (see `docs/CONVENTIONS.md`). Engine test
expectations must come from hand-worked examples in official material, recorded in `docs/SOURCES.md`.


## Test accounts
Use the demo account on the live site, or register your own (any email; no verification):
- Email: `demo@btoresale.test`
- Password: `DemoBTO2026!`

It already has one saved scenario under **My scenarios**. Demo data only; it holds nothing personal.

## Deployment
**Live app: https://<your-url>.onrender.com** (first page: `/`, the home page)

Hosted on Render (free web service) with MongoDB Atlas. One Express server serves both the API (`/api/*`)
and the built Vue app, so there is one URL.

- **Build command:** `npm ci --include=dev && npm run build` (Vite is a dev dependency, so dev deps are included)
- **Start command:** `npm start`
- **Health check:** `/api/health`
- **Auto-deploy:** every merge to `main` redeploys within about 3 minutes; a failed build keeps the previous version live.
- **Free plan:** the service sleeps after 15 minutes idle, so the first visit afterwards takes about a minute.

**Environment variables** (set in Render, never committed; see `.env.example`):

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` (the server refuses to start with a missing or short `JWT_SECRET`) |
| `NODE_VERSION` | `22` (same as CI) |
| `MONGODB_URI` | Atlas connection string for a dedicated app user, database `bto_resale` |
| `JWT_SECRET` | 32+ random characters, different from any local `.env` |
| `DATAGOV_API_KEY` | data.gov.sg API key |
| `ONEMAP_EMAIL`, `ONEMAP_PASSWORD` | OneMap account (for the PHG distance endpoints) |
| `FEATURE_TIMING_OPTIMISER`, `FEATURE_STRATEGY_SEARCH`, `FEATURE_BACKTEST` | feature flags |
| `CYPRESS_INSTALL_BINARY` | `0` (skips the Cypress download during the build) |

Atlas **Network Access** allows `0.0.0.0/0`, because Render's free plan has no fixed outbound IP; access is
protected by the database user's password instead.

**Cache pre-warm:** after a deploy, run `npm run refresh-data` from a machine whose `.env` points at the same
Atlas database. It fetches the resale prices and RPI from data.gov.sg into the cache, so the first visitor does not
wait, and prints a `[warm] ... data as of ...` line per town (the visible daily refresh).


## Rulesets and rule volatility
All policy rules live in `server/src/config/rulesets/`, versioned and date-stamped. Rules moved in Aug 2024, Oct 2024,
Aug 2025 and Aug 2026. Every saved scenario records the ruleset version that produced it, and the UI shows it.
The active ruleset is the dated `2026-08-24` snapshot. `ruleset.template.json` remains an empty template for future research.

## AI / LLM declaration
- The initial repository scaffold (folder structure, Express and Vue boilerplate, configuration, function stubs with contracts, mock data, test skeletons, documentation templates) was generated with Claude (Anthropic).
- With TA approval, GitHub Copilot generated the grants eligibility logic and grant tests. The team reviewed the
  generated logic; policy values are read from the checked-in ruleset; use is recorded in `docs/AI_USAGE_LOG.md`.
- TODO (whole team, before submission): summarise each seat's AI use from docs/AI_USAGE_LOG.md.

## Libraries and credits
Vue, Pinia, Vue Router (MIT), Bootstrap (MIT), Chart.js (MIT), Axios (MIT), Express (MIT), Mongoose (MIT),
jsonwebtoken (MIT), bcryptjs (MIT/BSD), dotenv (BSD-2), Vitest (MIT), Supertest (MIT), Cypress (MIT), concurrently (MIT), Vite (MIT), Sass (MIT), Leaflet (BSD-2-Clause). Map tiles: OneMap (Singapore Land Authority).
Font: Plus Jakarta Sans (SIL OFL 1.1, Google Fonts).
Credit each library again in code comments where it is used, and in the presentation.
Data: data.gov.sg (Singapore Open Data Licence). Confirm licence wording before submission.
Login page icons (`client/public/icons/`):
[login.png](https://www.flaticon.com/free-icon/login_5087579) and [createaccount.png](https://www.flaticon.com/free-icon/create-account_6799093): icons by Graphix Dxinerz from [Flaticon](https://www.flaticon.com) (free licence with attribution);
[arrow.png](https://www.iconpacks.net/free-icon/arrow-next-2825.html): IconPacks (iconpacks.net), free licence.