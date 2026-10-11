# API contract (DRAFT 1: agree in week 1, then change only by PR)

All routes are under `/api`. Errors always use `{ "error": { "code": "...", "message": "..." } }`.
Field names match `server/src/engine/evaluate.contract.js`. The request shape is `CompareRequest` in that file. All money in the API is integer cents. `client/src/stores/scenario.js` uses the request names, except money: the store keeps dollars (`monthlyIncome`, `cpfOaBalance`) and converts to `monthlyIncomeCents` / `cpfOaBalanceCents` when sending (D14).
Unimplemented routes currently return `501 NOT_IMPLEMENTED` with an `owner`.

| Method | Path | Owner | Purpose | Status |
|---|---|---|---|---|
| GET | `/api/health` | seat 3 | liveness and feature flags | working |
| GET | `/api/ruleset` | seat 2 | ruleset version, status, effective date | working (dated snapshot) |
| POST | `/api/grants` | seat 2 | evaluate EHG, Family Grant, PHG, and eligibility explanations | working |
| POST | `/api/auth/register` | seat 3 | create user (bcryptjs hash) | stub |
| POST | `/api/auth/login` | seat 3 | returns JWT | stub |
| GET/POST | `/api/scenarios` | seat 3 | list / save (auth required) | stub |
| GET/DELETE | `/api/scenarios/:id` | seat 3 | load / delete | stub |
| POST | `/api/compare` | seat 1 | break-even surface for path A vs B | stub |
| POST | `/api/cpf/accrued-interest` | seat 1 | CPF refund owed at a date: principal + accrued interest (D2, D12) | working (needs verified CPF rate in ruleset) |
| POST | `/api/stamp-duty` | seat 1 | buyer's stamp duty on a price (D20) | working |
| POST | `/api/timing` | seat 1 | FEATURE 1: optimal timing search | stub |
| POST | `/api/strategy` | seat 1 | FEATURE 2: ranked top 3 strategies | stub |
| POST | `/api/backtest` | seat 1 + 3 | FEATURE 3 (later): historical range | off (`FEATURE_BACKTEST`) |
| GET | `/api/data/resale-price?town=&flatType=` | seat 3 | resale price basis from data.gov.sg (cents, cached daily) | working |
| GET | `/api/data/rpi` | seat 3 | Resale Price Index series (cached daily) | working |
| GET | `/api/data/bto-projects` | seat 3 | seeded BTO projects (31, from HDB launch tables) + BTO town list | working |
| GET | `/api/data/bto-projects/:id` | seat 3 | one seeded BTO project | working |
| GET | `/api/data/geocode?postal=` | seat 3 | OneMap: postal code to a map point, for the display-only PHG map (D15) | working |
| GET | `/api/data/town-point?town=` | seat 3 | OneMap: an approximate point for a town, for the PHG map (D15) | working |
| GET | `/api/data/distance?from=&to=` | seat 3 | OneMap straight-line km between two postal codes; display only, never used for PHG eligibility (D15) | working |

### GET /api/ruleset

Response: `{ version, status, effectiveDate, verifiedOn, verifiedBy, rules }`. `rules` is the active versioned ruleset object; fields not yet verified remain null or empty and must be presented as unverified.

## POST /api/grants

Request: `{ profile, choice, assessmentDate? }` using `Profile` and `Choice` from `server/src/engine/evaluate.contract.js`. Money is integer cents; applicants use `monthlyIncomeCents` and `cpfOaBalanceCents`. The route converts these to dollars only for `evaluateGrants()`. `profile.cashSavingsCents` (D19) is accepted but not read by this route. `choice` may also include `livingArrangement?: "WITH"|"NEAR"|"NONE"` and `remainingLeaseYears?: number`. If omitted, `assessmentDate` defaults to `${choice.purchaseYear}-01-01` (D13).

Example request:
```json
{
  "profile": {
    "applicants": [
      { "age": 35, "citizenship": "SC", "firstTimer": true, "monthlyIncomeCents": 350000, "cpfOaBalanceCents": 0 },
      { "age": 34, "citizenship": "SC", "firstTimer": true, "monthlyIncomeCents": 350000, "cpfOaBalanceCents": 0 }
    ],
    "cashSavingsCents": 0
  },
  "choice": {
    "path": "RESALE",
    "purchaseYear": 2026,
    "town": "ANG MO KIO",
    "flatType": "4 ROOM",
    "livingArrangement": "NEAR",
    "remainingLeaseYears": 80
  }
}
```

Response (each `tests[]` entry is `{ id, passed, reason, sourceUrl }`; `sourceUrl` is the official page for that check, read from `grants.checkSources` in the ruleset):
```json
{
  "totalGrantsCents": 13000000,
  "grants": [
    { "id": "EHG", "amountCents": 3000000, "tests": [{ "id": "EHG_INCOME_BAND", "passed": true, "reason": "...", "sourceUrl": "https://..." }] },
    { "id": "FAMILY", "amountCents": 8000000, "tests": [{ "id": "FAMILY_AMOUNT", "passed": true, "reason": "...", "sourceUrl": "https://..." }] },
    { "id": "PHG", "amountCents": 2000000, "tests": [{ "id": "PHG_AMOUNT", "passed": true, "reason": "...", "sourceUrl": "https://..." }] }
  ],
  "rulesetVersion": "string",
  "rulesetStatus": "VERIFIED",
  "assessmentDate": "2026-01-01"
}
```

## POST /api/compare

Request: `CompareRequest` = `{ profile, choiceA, choiceB, assumptions }` (typedefs in `engine/evaluate.contract.js`; the choices are `RequestChoice`, not the engine `Choice`). The client does not send an as-of date; the server sets `evaluationStartYear`.
Choice (request): `{ path: "BTO"|"RESALE", applicationYear, town, flatType, classification?, btoProjectId?, btoPriceCents?, btoWaitMonths?, livingArrangement?, leaseBand?, renovationCents? }`. `applicationYear` is the BTO application year or the resale purchase year. `flatType` is `3 ROOM`, `4 ROOM` or `5 ROOM` on both paths (D27). `btoProjectId` (BTO) picks a project from `GET /api/data/bto-projects`, and so its price range and wait; `btoPriceCents` (v2.1) is the price slider, inside that range, default the midpoint (D26); `btoWaitMonths` is an optional override; `leaseBand` and `livingArrangement` are resale only. Contract v2 (D1): both paths are measured at `assumptions.horizonYear`, with no sale.

### Request example (v2)

```json
{
  "profile": {
    "applicants": [
      { "age": 28, "citizenship": "SC", "firstTimer": true, "monthlyIncomeCents": 450000, "cpfOaBalanceCents": 3000000 },
      { "age": 29, "citizenship": "PR", "firstTimer": true, "monthlyIncomeCents": 400000, "cpfOaBalanceCents": 2500000 }
    ],
    "cashSavingsCents": 4000000,
    "constraints": { "moveInByYear": 2031 }
  },
  "choiceA": { "path": "BTO", "applicationYear": 2027, "town": "TAMPINES", "flatType": "4 ROOM", "classification": "STANDARD", "btoProjectId": "tampines-bliss", "btoPriceCents": 54050000, "renovationCents": 3000000 },
  "choiceB": { "path": "RESALE", "applicationYear": 2027, "town": "TAMPINES", "flatType": "4 ROOM", "classification": null, "leaseBand": "80-89", "livingArrangement": "NEAR", "renovationCents": 2000000 },
  "assumptions": { "annualPriceGrowth": 0.024, "annualIncomeGrowth": 0.03, "horizonYear": 2041, "monthlyHousingCostWhileWaitingCents": 0 }
}
```
`btoProjectId`, `btoPriceCents`, `btoWaitMonths`, `horizonYear` and `monthlyHousingCostWhileWaitingCents` are optional (route fills the wait and the defaults). Illustrative values only.

### Where each input comes from

All money is integer cents. The client converts dollars to cents when it sends the request (D14).

| Input | Source | Notes |
|---|---|---|
| `profile.applicants[].age`, `citizenship`, `firstTimer` | Form | Exactly two applicants, at least one SC (singles and PR+PR not modelled yet). Validated in the form (seat 4) AND in every route that takes a profile (`400 VALIDATION_ERROR`) |
| `profile.applicants[].monthlyIncomeCents`, `cpfOaBalanceCents` | Form | Entered in dollars, converted by the client |
| `choice.path`, `applicationYear`, `town`, `flatType`, `classification` | Form | `classification` is BTO only. BTO keys = application (1 Jan) + wait, to the month. `flatType`: 3, 4 or 5 ROOM on both paths (D27); others return 400. BTO towns: the `towns` list from `/api/data/bto-projects` (no recent launch, no BTO price) |
| `choice.renovationCents` | Form | Per path, spent at keys; default 0 |
| `profile.constraints.moveInByYear` | Form | Optional "must move in by" year; later keys warn `MOVE_IN_DEADLINE_MISSED` |
| `choice.livingArrangement` | Form | Resale only. Declared by the user, not measured (D15) |
| `choice.leaseBand` → `remainingLeaseYears` | Form (resale), server (BTO) | Resale: the route uses the band's lower bound. BTO: 99 (D16) |
| `choice.btoProjectId` → `btoWaitMonths` | Form (project), server lookup, form override | Chosen project's `waitMonths` (HDB's estimate, counted from flat selection, so keys are a few months early: stated limitation, D26); if no project is chosen, the town's newest project offering the flat type; else ruleset `btoWaiting.defaultMonths` (48, an assumption; warns `BTO_WAIT_ASSUMED`) (D7) |
| `choice.btoPriceCents` → `purchasePriceCents` (BTO) | Form (slider), server default | v2.1. Within the project's `[priceMinCents, priceMaxCents]` for the flat type, else `400 VALIDATION_ERROR`; default the midpoint. Seed prices must be `priceBasis: 'BEFORE_GRANTS'`; the route refuses any other basis so grants are never subtracted twice (D26) |
| `choice.marketValueAtKeysCents` | Server lookup | BTO: near-new resale comparables for the town and flat type at keys (fallback town for towns with no resale stock, e.g. Tengah); resale: the purchase price. Never sent by the client |
| `choice.purchasePriceCents` | Server lookup | Resale: median from cached data.gov.sg transactions for town, flat type and lease band. BTO: `btoPriceCents` or the midpoint of the project's range, before grants (D26). Never sent by the client. Echoed as `Outcome.purchasePriceCents` |
| `assumptions.annualPriceGrowth`, `annualIncomeGrowth` | Form (sliders) | Growth as decimals (0.03) |
| `assumptions.horizonYear` | Form, default | Horizon date = 31 Dec of this year; both paths' keys must be on or before it (400 otherwise). Default: later key year + 10 |
| `assumptions.monthlyHousingCostWhileWaitingCents` | Form (slider) | Rent until keys, both paths. Default 0 (living with parents); show a sourced rental guide beside the slider |
| `assumptions.loanTenureYears`, `loanType` | Default | Optional in the request; the server fills defaults and echoes them |
| `assumptions.legalFeesCents`, `agentFeesCents` | Default, form override | Estimates, not policy. Server defaults owned by seat 1 (D17) |
| `choice.subsidyRecoveryRate` | Server lookup | BTO Plus/Prime only, from the BTO seed record (D18). Never sent by the client |
| `assumptions.evaluationStartYear` | Server | Never sent by the client |
| `profile.cashSavingsCents` | Form | Household total. Entered in dollars (`cashSavings` in the store), converted by the client (D14). Checked against cash required at purchase (D19) |
| `monthlySavings` | Not collected | Deferred (D19): remove from the form and store |

Response (one call returns the WHOLE grid, never one request per cell):
```json
{
  "rulesetVersion": "string",
  "horizonYear": 2041,
  "breakEvenSentence": "string",
  "grid": [[{ "annualPriceGrowth": 0.03, "annualIncomeGrowth": 0.02, "winner": "A|B|TIE", "marginCents": 0 }]],
  "frontier": [{ "annualPriceGrowth": 0.03, "annualIncomeGrowth": 0.02 }],
  "outcomeA": {}, "outcomeB": {},
  "btoProjectA": { "id": "tampines-bliss", "name": "Tampines Bliss", "launch": "2026-02", "waitMonths": 23, "priceMinCents": 48100000, "priceMaxCents": 60000000, "sourceUrl": "string" },
  "btoProjectB": null
}
```
`btoProjectA/B` (v2.1) is the BTO project the route used for that choice (`null` for resale), so the dashboard can show "priced at $540,500, HDB range $481,000–$600,000" and bound the price slider (D26). `outcomeA/B` are `Outcome` objects (see `evaluate.contract.js`, v2: timeline, affordability, `costBreakdown`, `yearlyCashFlow`, net position at the horizon). `marginCents` is the difference in net position at `horizonYear`, in cents. Errors: `400 VALIDATION_ERROR` for an out-of-scope household or a `horizonYear` before either path's keys.

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

## Data routes (seat 3)
All `/api/data` routes are cached in MongoDB (`ResaleCache`, one model; in memory when there is no database). An entry is fresh for one day; after that the next request refreshes it and the server logs `[cache] refreshed …`. If data.gov.sg or OneMap is down, the last good copy is returned with `stale: true` instead of an error. `npm run warm -w server` (alias `npm run refresh-data`) pre-fills the cache and prints one line per refresh; add `--force` to refresh fresh entries too. Money is integer cents (D14). Towns are checked against the 26 HDB towns; flat types are `3 ROOM`, `4 ROOM`, `5 ROOM` (D27).

### GET /api/data/bto-projects
Query (all optional): `town`, `flatType` (3/4/5 ROOM), `classification` (STANDARD|PLUS|PRIME).
Response:
```json
{
  "count": 1,
  "projects": [{
    "id": "tampines-bliss", "name": "Tampines Bliss", "town": "TAMPINES", "classification": "STANDARD",
    "launch": "2026-02", "waitMonths": 23, "priceBasis": "BEFORE_GRANTS", "totalUnits": 284, "subsidyRecoveryRate": 0,
    "priceMinCents": 48100000, "priceMaxCents": 60000000,
    "flats": [{ "flatType": "4 ROOM", "units": 204, "floorAreaSqm": { "min": 94, "max": 94 }, "priceMinCents": 48100000, "priceMaxCents": 60000000 }],
    "sourceUrl": "https://www.hdb.gov.sg/...Annex-A.pdf", "sourceAccessed": "2026-10-11", "verified": true
  }],
  "towns": ["ANG MO KIO", "BEDOK", "..."],
  "dataAsOf": "2026-06",
  "source": "HDB BTO launch tables (Annex A of each launch press release); see sourceUrl per project"
}
```
`priceMinCents` / `priceMaxCents` at the top level (the `btoProjectA/B` shape) appear when one `flatType` is asked for; `flats[]` always lists every 3-5 room type returned. `waitMonths` is HDB's estimate from flat selection (D26 limitation); `null` if HDB had not announced it. `subsidyRecoveryRate` is the Plus/Prime clawback at first resale as a fraction (0.12 = 12%), 0 for Standard (D18). Prices are before grants (`priceBasis`); a project with any other basis is never returned. `towns` = towns with a seeded launch, for the Path A town list. Sorted newest launch first.
Errors: 400 BAD_REQUEST (unknown town, flat type outside 3-5 ROOM, bad classification).

### GET /api/data/bto-projects/:id
Response: one project in the shape above (all 3-5 room flats). Errors: 404 NOT_FOUND.

### GET /api/data/resale-price
Query: `town` (required, e.g. TAMPINES), `flatType` (required: 3 ROOM, 4 ROOM or 5 ROOM), `months` (1-60, default 12).
Response: `{ town, flatType, window: { from, to, months }, count, medianPriceCents, p25PriceCents, p75PriceCents, medianPricePerSqmCents, medianFloorAreaSqm, medianRemainingLeaseYears, lowSample, source, cached, stale, fetchedAt }`. `fetchedAt` is the "data as of" time; `lowSample` is true under 20 sales.
Errors: 400 BAD_REQUEST, 404 NO_DATA, 502 UPSTREAM_ERROR, 503 UPSTREAM_RATE_LIMITED.

### GET /api/data/rpi
Query (optional): `from`, `to` as `YYYY-Qn`, inclusive.
Response: `{ base, latest: { quarter, index }, historicalAnnualGrowth: { 5y, 10y, 20y }, count, series: [{ quarter, index }], source, cached, stale, fetchedAt }`
`historicalAnnualGrowth` is always measured back from the latest quarter (fraction, 0.03 = 3%). Historical only, not a forecast.
Errors: 400 BAD_REQUEST, 502 UPSTREAM_ERROR, 503 UPSTREAM_RATE_LIMITED.

### GET /api/data/geocode, /api/data/town-point, /api/data/distance (display-only PHG map, D15)
- `geocode?postal=460123` -> `{ lat, lng, address, postal, cached, fetchedAt, source }`
- `town-point?town=TAMPINES` -> `{ town, lat, lng, label, approximate: true, cached, fetchedAt, source }` (OneMap's first search hit for the town name; for centring the map only)
- `distance?from=460123&to=529510` -> `{ from: { lat, lng, address, postal }, to: { … }, km, cached, fetchedAt, source }`

The map shows the parents' postal code and the chosen town with a 4 km circle. None of these decide PHG eligibility: `livingArrangement` is declared by the user (D15). OneMap results stay fresh for 30 days.
Errors: 400 BAD_REQUEST (not a 6-digit postal code / unknown town), 404 NOT_FOUND, 502 UPSTREAM_ERROR, 503 ONEMAP_NOT_CONFIGURED (no `ONEMAP_EMAIL` / `ONEMAP_PASSWORD` in `.env`).

## POST /api/cpf/accrued-interest
Request: `{ withdrawals: [{ date: "YYYY-MM-DD", amountCents, kind? }], asOfDate: "YYYY-MM-DD" }`. `kind` is free text (e.g. `LUMP_SUM`, `INSTALMENT`, `GRANT`, `STAMP_DUTY`).
Response: `{ principalCents, accruedInterestCents, totalCents, asOfDate, oaRate, accruedInterestCompounding, rulesetVersion, rulesetStatus }`.
Errors: `400 VALIDATION_ERROR` (bad date or amount, or a withdrawal dated after `asOfDate`); `503 RULESET_UNAVAILABLE` (ruleset has no verified OA rate or ANNUAL compounding).
Will be called internally by `/api/compare`; exposed on its own so the CPF calculation can be checked against hand-worked cases.

## POST /api/stamp-duty
Request: `{ priceCents }` (positive integer). Response: `{ bsdCents, dutiableValueCents, rulesetVersion, rulesetStatus }`.

Errors: `400 VALIDATION_ERROR`; `503 RULESET_UNAVAILABLE` (no BSD tiers in the ruleset).

## POST /api/auth/register, POST /api/auth/login (DRAFT — seat 4's expected shape; seat 3 to confirm/adjust when building the route)
Request (both): `{ name?, email, password }` (`name` register only; `password` plaintext over HTTPS, hashed server-side with bcryptjs).
Response (both): `{ token, user: { id, name, email } }`. `token` is a JWT the client sends as `Authorization: Bearer <token>` on `/api/scenarios*`.
Errors: `400 VALIDATION_ERROR` (bad email / password too short / name missing on register), `409 EMAIL_TAKEN` (register, email already registered), `401 INVALID_CREDENTIALS` (login).
Client: `client/src/stores/auth.js` persists `{ token, user }` to `localStorage` under `hdb-app:auth` and restores it on app load; `router/index.js` guards `/plan` and `/results` with `meta: { requiresAuth: true }`.