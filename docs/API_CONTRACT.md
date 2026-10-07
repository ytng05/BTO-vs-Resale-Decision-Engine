# API contract (DRAFT 1: agree in week 1, then change only by PR)

All routes are under `/api`. Errors always use `{ "error": { "code": "...", "message": "..." } }`.
Field names match `server/src/engine/types.js` and `client/src/stores/scenario.js`.
Unimplemented routes currently return `501 NOT_IMPLEMENTED` with an `owner`.

| Method | Path | Owner | Purpose | Status |
|---|---|---|---|---|
| GET | `/api/health` | seat 3 | liveness and feature flags | working |
| GET | `/api/ruleset` | seat 2 | ruleset version, status, effective date | working (template) |
| POST | `/api/auth/register` | seat 3 | create user (bcryptjs hash) | stub |
| POST | `/api/auth/login` | seat 3 | returns JWT | stub |
| GET/POST | `/api/scenarios` | seat 3 | list / save (auth required) | stub |
| GET/DELETE | `/api/scenarios/:id` | seat 3 | load / delete | stub |
| POST | `/api/compare` | seat 1 | break-even surface for path A vs B | stub |
| POST | `/api/timing` | seat 1 | FEATURE 1: optimal timing search | stub |
| POST | `/api/strategy` | seat 1 | FEATURE 2: ranked top 3 strategies | stub |
| POST | `/api/backtest` | seat 1 + 3 | FEATURE 3 (later): historical range | off (`FEATURE_BACKTEST`) |
| GET | `/api/data/resale-price?town=&flatType=` | seat 3 | price basis from data.gov.sg (cached) | stub |
| GET | `/api/data/rpi` | seat 3 | Resale Price Index series (cached) | stub |
| GET | `/api/data/bto-projects` | seat 3 | seeded BTO projects | working |
| GET | `/api/data/distance?from=&to=` | seat 3 | OneMap distance for the PHG test | stub |

## POST /api/compare

Request: `{ profile, choiceA, choiceB, assumptions }` (types in `engine/types.js`).
Choice: `{ path: "BTO"|"RESALE", purchaseYear, town, flatType, classification?: "STANDARD"|"PLUS"|"PRIME" }`.

Response (one call returns the WHOLE grid, never one request per cell):
```json
{
  "rulesetVersion": "string",
  "breakEvenSentence": "string",
  "grid": [[{ "priceGrowth": 0.03, "incomeGrowth": 0.02, "winner": "A|B|TIE", "margin": 0 }]],
  "frontier": [{ "priceGrowth": 0.03, "incomeGrowth": 0.02 }],
  "outcomeA": {}, "outcomeB": {}
}
```
`outcomeA/B` are `Outcome` objects (see types.js). `margin` is the difference in net financial position at the common horizon.

## POST /api/timing
Request: `{ profile, choiceBase, candidateYears, assumptions }`
Response: `{ rulesetVersion, best: { year, outcome }, all: [{ year, outcome }], explanation: ["string"] }`

## POST /api/strategy
Request: `{ profile, constraints, assumptions }`
Response: `{ rulesetVersion, top: [{ choice, outcome, reasons: ["string"] }] }` (max 3, ranked)

## POST /api/backtest (later)
Request: `{ profile, choiceA, choiceB, assumptionsBase, windowYears }`
Response: `{ rulesetVersion, range: { min, median, max }, windows: [], caveats: ["string"] }`

## Wording rules (guardrails)
"net financial position after N years" (never "profit"), "historical range" (never "probability"),
never present the break-even as a prediction, and always show the ruleset version.

## GET /api/data/bto-projects
Query (all optional): `town`, `classification` (STANDARD|PLUS|PRIME), `flatType` (e.g. `4 ROOM`).
Response: `{ count, projects: [BtoProject] }`, sorted by town then name.
Errors: 400 BAD_REQUEST (bad classification), 503 DB_UNAVAILABLE (no database).

