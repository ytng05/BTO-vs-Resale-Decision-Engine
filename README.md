# BTO vs resale break-even decision engine

IS216 Web Application Development 2, group project (SMU).

Every first-time buyer in Singapore faces the same fork: take a BTO now and wait, or keep saving and buy resale later.
This app does not forecast prices. It solves for the assumptions at which the two paths are equal and shows the result
as a decision surface (heatmap), plus an optimal-timing search and a ranked strategy recommendation.
A historical backtest ("risk-based verdict") is planned for later, once the first two features work.

> Illustrative projection, not financial advice. Policy figures come from the versioned ruleset and are only as good as
> the sources recorded in `docs/SOURCES.md`.

## Scope
- HDB BTO (Standard / Plus / Prime) versus HDB resale. Executive Condominiums are out of scope.
- Features, in build order: (1) base break-even comparison, (2) optimal timing search, (3) strategy recommendation over the full space, (4) later: risk-based verdict (historical backtest).

## Tech stack
Vue 3 (Composition API), Pinia, Vue Router, Bootstrap 5 (SCSS), Chart.js | Node.js, Express, MongoDB/Mongoose, JWT + bcryptjs | Vitest, Cypress.
External data: data.gov.sg (resale transactions, Resale Price Index, price range of flats offered) and OneMap (distance for the Proximity Housing Grant test).

## Repository layout
```
server/src/engine/     pure calculation engine (seats 1 and 2): cpf, loan, costs, rules, solvers
server/src/config/     env, feature flags, versioned ruleset JSON (rules live here, not in code)
server/src/routes/     Express routes (contract in docs/API_CONTRACT.md)
server/src/services/   data.gov.sg and OneMap clients (seat 3)
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
npm test                    # Vitest: server (API scaffold + engine todos) and client (store)
VITE_USE_MOCK=true npm run build && npm start     # terminal 1
npm run test:e2e                                  # terminal 2: Cypress smoke test (or npm run cy:open)
```
Selectors use `data-cy` attributes (see `docs/CONVENTIONS.md`). Engine test expectations must come from hand-worked
examples in official material, recorded in `docs/SOURCES.md`.

## Test accounts
TODO: list demo credentials here once auth is implemented.

## Deployment
TODO (seat 3): hosting choice, environment variables, cache pre-warm on deploy, URL of the first page.

## Rulesets and rule volatility
All policy rules live in `server/src/config/rulesets/`, versioned and date-stamped. Rules moved in Aug 2024, Oct 2024,
Aug 2025 and Aug 2026. Every saved scenario records the ruleset version that produced it, and the UI shows it.
The shipped ruleset is a TEMPLATE with empty values to be filled from primary sources.

## AI / LLM declaration
Required by the module. Keep `docs/AI_USAGE_LOG.md` up to date and summarise it here before submission.
- The initial repository scaffold (folder structure, Express and Vue boilerplate, configuration, function stubs with
  contracts, mock data, test skeletons, documentation templates) was generated with Claude (Anthropic).
- With TA approval, GitHub Copilot generated the grants eligibility logic and grant tests. The team reviewed the
  generated logic; policy values are read
  from the checked-in ruleset; use is recorded in `docs/AI_USAGE_LOG.md`.
- The remaining calculation engine, solvers and endpoints are implemented by the team. Other AI-assisted work is listed in
  `docs/AI_USAGE_LOG.md`.

## Libraries and credits
Vue, Pinia, Vue Router (MIT), Bootstrap (MIT), Chart.js (MIT), Axios (MIT), Express (MIT), Mongoose (MIT),
jsonwebtoken (MIT), bcryptjs (MIT/BSD), dotenv (BSD-2), Vitest (MIT), Supertest (MIT), Cypress (MIT), concurrently (MIT), Vite (MIT), Sass (MIT).
Credit each library again in code comments where it is used, and in the presentation.
Data: data.gov.sg (Singapore Open Data Licence), OneMap (SLA). Confirm licence wording before submission.
