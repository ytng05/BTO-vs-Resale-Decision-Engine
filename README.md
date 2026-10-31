# BTO vs resale break-even decision engine

IS216 Web Application Development 2, group project (SMU).

Every first-time buyer in Singapore faces the same fork: take a BTO now and wait, or keep saving and buy resale later.
This app does not forecast prices. It solves for the assumptions at which the two paths are equal and shows the result
as a decision surface (heatmap), plus an optimal-timing search. A ranked strategy recommendation is future work (dropped after the prof's feedback).
A historical backtest ("risk-based verdict") is planned for later, once the first two features work.

> Illustrative projection, not financial advice. Policy figures come from the versioned ruleset and are only as good as
> the sources recorded in `docs/SOURCES.md`.

## Scope
- HDB BTO (Standard / Plus / Prime) versus HDB resale. Executive Condominiums are out of scope.
- Features, in build order: (1) base break-even comparison, (2) optimal timing search, (3) later: risk-based verdict (historical backtest). Future work: strategy recommendation over the full space.

## Tech stack
Vue 3 (Composition API), Pinia, Vue Router, Bootstrap 5 (SCSS), Chart.js | Node.js, Express, MongoDB/Mongoose, JWT + bcryptjs | Vitest, Cypress.
External data: data.gov.sg (resale transactions, Resale Price Index, price range of flats offered). PHG “near” status is declared by the user; no distance service is called.

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
npm run dev                 # API on :3000, Vue dev server on :5173 (mock data on by default)
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
| `smoke.cy.js` | home page, step validation, full journey, register → save → reload (needs a database) |
| `buyers.cy.js` | two buyers, PR + PR blocked, per-buyer validation, answers kept when going back |
| `results.cy.js` | results content, heatmap, phone width, Back keeps inputs |
| `dashboard.cy.js` | financial dashboard |
| `scenarios.cy.js` | save, list, open and delete a scenario (needs a database) |
| `scenario-compare.cy.js` | side-by-side compare page (mock scenarios) |
| `responsive.cy.js` | every page at 375 / 768 / 1280 px with no sideways scrolling |
| `sources.cy.js` | ruleset version and badge, expand/collapse all, safe https source links, assumptions and datasets |


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
jsonwebtoken (MIT), bcryptjs (MIT/BSD), dotenv (BSD-2), Vitest (MIT), Supertest (MIT), Cypress (MIT), concurrently (MIT), Vite (MIT), Sass (MIT).
Font: Plus Jakarta Sans (SIL OFL 1.1, Google Fonts).
Credit each library again in code comments where it is used, and in the presentation.
Data: data.gov.sg (Singapore Open Data Licence). Confirm licence wording before submission.
