# BTO vs resale break-even decision engine

IS216 Web Application Development 2, group project (SMU).

Every first-time buyer in Singapore faces the same fork: take a BTO now and wait, or keep saving and buy resale later.
This app does not forecast prices. For a household's own plan it follows a BTO path and a resale path year by year and
says which ends ahead, by how much and why. It solves for the assumptions at which the two paths are equal and shows them
as a decision surface (heatmap), searches for the best year to apply, and checks every grant with its reason and its
official source. Policy rules are versioned and dated, and every result names the ruleset that produced it.

- **Live app (first page):** https://bto-vs-resale-decision-engine.onrender.com
- **Git repository:** https://github.com/ytng05/BTO-vs-Resale-Decision-Engine

The live app is on a free plan: if it has been idle, the first visit can take about a minute to wake it.

> Illustrative projection, not financial advice. Policy figures come from the versioned ruleset and are only as good as
> the sources recorded in `docs/SOURCES.md`.

## Scope
- HDB BTO (Standard / Plus / Prime) versus HDB resale. Executive Condominiums are out of scope.
- Built: a break-even comparison of the two paths with the heatmap and the financial dashboard (headline, quick
  scenarios, an at-a-glance comparison and pop-up details); the timing optimiser (best year to apply); a four-step plan
  that survives a refresh, and a check-your-answers page; plain-English results with each grant's reason and official
  source, a "Why" list, a "How sure is this answer?" pop-up and a net position over time chart; saved scenarios that
  update in place, with a side-by-side comparison of two of them; optional accounts (planning works without one); and
  the Sources page with its glossary.
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

## Set up and run
Requires Node 20+ (developed on 22) and npm.

**1. Get the files.** Unzip the submitted folder and open a terminal in it, or clone the repository:
```bash
git clone https://github.com/ytng05/BTO-vs-Resale-Decision-Engine.git
cd BTO-vs-Resale-Decision-Engine
```

**2. Install.**
```bash
npm install
```

**3. Configure (optional).** The app runs without a `.env`, with the limits in the table below. To add a database or map:
```bash
cp .env.example .env     # then fill in the values; the comments in the file explain each one
```

| Without this value | What happens |
|---|---|
| `MONGODB_URI` | Log in, register and saved scenarios return "database not connected". Plan, Results, Dashboard and Sources still work. Any MongoDB works: a free Atlas cluster or a local `mongod`. |
| `ONEMAP_EMAIL`, `ONEMAP_PASSWORD` | The Dashboard's map says it is unavailable. Everything else still works. |
| `DATAGOV_API_KEY` | Resale data still loads, at data.gov.sg's lower rate limit without a key. |
| `JWT_SECRET` | Fine locally (a development value is used, with a warning). Required when `NODE_ENV=production`. |

To see login, saved scenarios and the map without configuring anything, use the live app.

**4. Run it as one app on one port** (this is how it is submitted and graded):
```bash
npm run build     # builds the Vue app to client/dist
npm start         # http://localhost:3000 serves the home page and the API
```
Set `PORT` to use another port. For development with hot reload, use `npm run dev` instead: the API on :3000 and the Vue
dev server on http://localhost:5173, with live data (`VITE_USE_MOCK=true npm run dev` for mock data).

## Testing
**Unit tests and lint** (no database needed):
```bash
npm test          # Vitest, server + client
npm run lint      # ESLint: unused variables, undefined names, Vue template errors
```
**Database tests** (`server/tests/db.test.js`) are skipped unless `MONGODB_URI_TEST` points at a throwaway database whose
name contains `test`. They delete everything in it, so never point them at the app database:
```bash
MONGODB_URI_TEST=mongodb://127.0.0.1:27017/bto_test npm test
```

**End-to-end tests (Cypress).** You need a throwaway MongoDB, because some specs register users and save scenarios. Start one
with `mongod`, or `docker run --rm -p 27017:27017 mongo:7`, or use a separate free Atlas database. Then, in two terminals:
```bash
# Terminal 1: build with mock data and start the app on the test database
VITE_USE_MOCK=true npm run build
MONGODB_URI=mongodb://127.0.0.1:27017/bto_e2e npm start

# Terminal 2: run every spec (or npm run cy:open to watch them run)
npm run test:e2e
```
In PowerShell, set each variable first: `$env:VITE_USE_MOCK='true'` and `$env:MONGODB_URI='...'`. Expected result: every spec
passes, with no failures. Run `npm run build` again afterwards, or `npm start` keeps serving mock data.

If Cypress fails to start with `bad option` or `Cannot find module`, the terminal has inherited an Electron setting (common in
VS Code). Clear it in that terminal: `unset ELECTRON_RUN_AS_NODE` (PowerShell: `Remove-Item Env:ELECTRON_RUN_AS_NODE`).

Test cases, by spec file in `cypress/e2e/`:

| Spec | Covers |
|---|---|
| `smoke.cy.js` | home page, hero scene, step validation, full journey, register → save → reload (needs a database) |
| `home.cy.js` | the two ways in, See an example, the four steps, costs people forget, FAQ, reduced motion, phone width |
| `login.cy.js` | Start planning → login page: the three choices, the create-account and log-in forms, Back, planning without an account, and going on to the plan |
| `scenarios-filter.cy.js` | My scenarios filter bar: search, town / flat type / path-ahead dropdowns, price range, count, Clear filters, no matches (stubbed list) |
| `buyers.cy.js` | the About you step: one question per screen, two buyers, PR + PR blocked, per-buyer validation, money and age input, answers kept when going back |
| `error-summary.cy.js` | the error summary on Your BTO and Resale flat: every problem listed, each linking to its field |
| `preview.cy.js` | the check-your-answers page between the plan and Results; Change and Edit go back with answers kept |
| `results.cy.js` | results content, heatmap (labelled in words, not colour alone), the note when a saved plan's rates are outside the grid (needs a database), BTO launch and price, phone width, Back keeps inputs |
| `results-verdict.cy.js` | who comes out ahead in plain words, a path named as ahead only when the headline does, no side-by-side table (it lives on the Dashboard), three plain lines per path with the full breakdown, why the leader is ahead and the cash check, net position bars, the net position over time chart (both paths for the year under the pointer or the arrow keys, its last year equal to each path card), back to top, and "too close to call" |
| `results-grants.cy.js` | each grant once with one status and every check's reason and official source; the best application year |
| `results-print.cy.js` | what to do next (official links) and print or save as PDF, which opens the chart and the heatmap first |
| `feedback-clarity.cy.js` | fixes from user testing: prices shown as figures, how to read the heatmap, the BTO price on the plan |
| `glossary.cy.js` | plain-English terms open by tap or keyboard, stay on screen at 375px, and link to the glossary on Sources |
| `dashboard.cy.js` | financial dashboard: who ends ahead and the ruleset version, a reason for every grant check, warnings in plain sentences, how each net position adds up and the costs, the two flats side by side (size, price, price per m²), the comparison year, the BTO and resale price sliders, and the flip price (D40) |
| `dashboard-overview.cy.js` | both net positions, how each purchase is paid, a tile per comparison, and the grants table opening in a pop-up from its Explore card |
| `dashboard-sections.cy.js` | the Dashboard layout and pop-ups: it leads with the answer and the tiles, a detail pop-up closes with the button, Escape or a click outside, each tile says which path it favours (never on grants), what changed since your inputs, quick scenarios and quick picks, year steppers, and the grant checks and costs added to the printed page |
| `scenarios.cy.js` | save, list, open and delete a scenario (needs a database) |
| `scenario-compare.cy.js` | side-by-side compare page (mock scenarios), including phone width; logged out or with an expired login it shows the log-in prompt without calling the API; picking two saved scenarios on My scenarios (needs a database) |
| `sources.cy.js` | ruleset version and badge, expand/collapse all, topic chips, search, safe https source links, assumptions and datasets |
| `responsive.cy.js` | every page at 375 / 390 / 768 / 1180 / 1280 px upright and phone (667×375) and tablet (1024×768) on their side: no sideways scrolling, pinned bars leave at least half the height, a logged-in navbar fits, and stepper labels, dashboard tile figures and flat names are not cut off |
| `a11y-basics.cy.js` | skip link, a page title per page, focus moves to the new page, new pages start at the top, 404 page |
| `plan-refresh.cy.js` | refreshing Results, the Dashboard or a plan step keeps the plan (sessionStorage only), an older stored copy is dropped, and logout and Start planning after a save clear it (the last two need a database) |
| `plan-navigation.cy.js` | moving between plan steps: Change opens the right About you screen and returns to the results, the screen is checked first, the stepper links to the steps reached so far, and it cannot jump forward from a screen with a problem |


Demo user journeys (five households, one per presenter) live in `cypress/journeys/` and run against a **live**
build: `VITE_USE_MOCK=false npm run build && npm start`, then `npm run journeys` (each recorded to `cypress/videos/`).
Inputs, steps and what each shows: `docs/JOURNEYS.md`.

Specs marked "needs a database" register real users, so run them only against a **test** database. Selectors use `data-cy`
attributes (see `docs/CONVENTIONS.md`). Engine test expectations must come from hand-worked examples in official material,
recorded in `docs/SOURCES.md`.

## Test accounts
Use the demo account on the live site, or register your own (any email; no verification):
- Email: `demo@btoresale.test`
- Password: `DemoBTO2026!`

It already has one saved scenario under **My scenarios**. Demo data only; it holds nothing personal.

## Deployment
**Live app: https://bto-vs-resale-decision-engine.onrender.com/** (first page: `/`, the home page)

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
| `FEATURE_TIMING_OPTIMISER` | `true` |
| `FEATURE_STRATEGY_SEARCH`, `FEATURE_BACKTEST` | `false` (future work; the routes are not built) |
| `CYPRESS_INSTALL_BINARY` | `0` (skips the Cypress download during the build) |

Atlas **Network Access** allows `0.0.0.0/0`, because Render's free plan has no fixed outbound IP; access is
protected by the database user's password instead.

**Cache pre-warm:** after a deploy, run `npm run refresh-data` from a machine whose `.env` points at the same
Atlas database. It fetches the resale prices and RPI from data.gov.sg into the cache, so the first visitor does not
wait, and prints a `[warm] ... data as of ...` line per town (the visible daily refresh).


## Known limitations
- **A plan in progress lasts as long as the tab.** It is kept in the browser's `sessionStorage`, so refreshing keeps it,
  and logging out or starting a new plan clears it (it holds incomes and CPF balances). Closing the tab usually clears it
  too, but a browser that restores the session, or reopens a closed tab, can bring it back. Log in and save a scenario to
  keep it longer; My scenarios opens it again. If the browser blocks storage, a refresh loses it.
- **An expired login keeps the plan in that tab.** When a save finds the login has expired, the app signs out but keeps the
  plan, so it can still be saved after logging in again. On a shared computer, whoever logs in next in that tab would see it:
  use Log out, which clears it.
- **Short leases and grants.** HDB pro-rates the Enhanced CPF Housing Grant, the Family Grant and the Proximity Housing Grant
  when the remaining lease does not cover the youngest buyer to age 95. The app does not apply that formula yet: it keeps the
  full amount, and Sources notes that the real grants may be lower.

## Rulesets and rule volatility
All policy rules live in `server/src/config/rulesets/`, versioned and date-stamped. Rules moved in Aug 2024, Oct 2024,
Aug 2025 and Aug 2026. Every saved scenario records the ruleset version that produced it, and the UI shows it.
The active ruleset is the dated `2026-08-24` snapshot. `ruleset.template.json` remains an empty template for future research.

## AI / LLM declaration
We used Claude and Claude Code (Anthropic) and GitHub Copilot. Every use is logged, with its files and reviewer, in
`docs/AI_USAGE_LOG.md`. We relied on them for these parts:

- **Scaffold:** the initial repository (folder structure, Express and Vue boilerplate, configuration, stubs with contracts, mock
  data, test skeletons, documentation templates) was generated with Claude.
- **Calculation engine:** seat 1 wrote `evaluate()`, the CPF, loan and stamp duty modules, the solvers and the gap breakdown, and
  hand-worked the expected figures. Claude Code wrote step outlines for that code, the contracts and stubs, and blank worksheets.
  It also rechecked the hand-worked figures with independent scripts, transcribed them into fixtures, wrote property tests,
  reviewed the code and pasted seat 1's code in. It made a few small engine edits at seat 1's request, each logged.
- **Grants and policy rules:** with TA approval, GitHub Copilot generated the grants eligibility logic and grant tests, which the
  team reviewed. Policy values are read from the checked-in ruleset. Claude helped check research against official sources, and
  Copilot transcribed the checked values into the ruleset.
- **Server:** Claude Code wrote `POST /api/compare` and `POST /api/timing` (route code, not engine logic), other route code such
  as the scenario update route and the BTO market-value lookup, and the plain-English warning messages. Claude also helped test
  and debug authentication and saved scenarios.
- **Plan form logic:** Claude Code wrote the plan flow's form logic (`WishesForm`, `SituationForm`, `PathForm`, store defaults and
  step validation, #84). A reviewer flagged it and the TA confirmed that work was acceptable. Later changes to the form and its
  navigation were also written by Claude Code, with seat 1's approval.
- **User interface:** most of the Vue pages, components and styling were written by Claude Code or GitHub Copilot from the team's
  designs, including Results, the Dashboard, Sources, My scenarios, Login, the charts and the glossary. `HeroScene.vue` is
  AI-generated. The side-by-side compare page was written by a team member and reviewed by Claude.
- **Tests and tooling:** most Cypress specs and non-engine unit tests, the ESLint configuration, CI and the responsive checks.
- **Documents:** drafts of decision records, contract notes, this README and the project proposal, from the team's decisions.

The team made the product and modelling decisions and reviewed the AI's work. Expected values in engine tests are hand-worked,
not AI-generated.

## Libraries and credits
**Client:** Vue, Pinia, Vue Router, Bootstrap, Chart.js, Axios (all MIT), Leaflet (BSD-2-Clause).
**Server:** Express, Mongoose, jsonwebtoken, bcryptjs (all MIT), dotenv (BSD-2-Clause).
**Build and test:** Vite, @vitejs/plugin-vue, Sass, Vitest, Supertest, Cypress, ESLint, @eslint/js, eslint-plugin-vue, globals,
concurrently (all MIT).
**Font:** Plus Jakarta Sans (SIL OFL 1.1, Google Fonts). **Icons:** Lucide (ISC), inlined as SVG paths.
**External data:** data.gov.sg (Singapore Open Data Licence), and OneMap for geocoding and map tiles (Singapore Land Authority).
