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
| GET | `/api/data/resale-price?town=&flatType=` | seat 3 | price basis from data.gov.sg (cached) | stub |
| GET | `/api/data/rpi` | seat 3 | Resale Price Index series (cached) | stub |
| GET | `/api/data/bto-projects` | seat 3 | seeded BTO projects | stub |
| GET | `/api/data/distance?from=&to=` | seat 3 | OneMap distance for the PHG test | not needed: PHG is declared (D15) |

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

Response:
```json
{
  "totalGrantsCents": 13000000,
  "grants": [
    { "id": "EHG", "amountCents": 3000000, "tests": [{ "id": "EHG_INCOME_BAND", "passed": true, "reason": "..." }] },
    { "id": "FAMILY", "amountCents": 8000000, "tests": [{ "id": "FAMILY_AMOUNT", "passed": true, "reason": "..." }] },
    { "id": "PHG", "amountCents": 2000000, "tests": [{ "id": "PHG_AMOUNT", "passed": true, "reason": "..." }] }
  ],
  "rulesetVersion": "string",
  "rulesetStatus": "VERIFIED",
  "assessmentDate": "2026-01-01"
}
```

## POST /api/compare

Request: `CompareRequest` = `{ profile, choiceA, choiceB, assumptions }` (typedefs in `engine/evaluate.contract.js`; the choices are `RequestChoice`, not the engine `Choice`). The client does not send an as-of date; the server sets `evaluationStartYear`.
Choice (request): `{ path: "BTO"|"RESALE", applicationYear, town, flatType, classification?, btoProjectId?, btoWaitMonths?, livingArrangement?, leaseBand?, renovationCents? }`. `applicationYear` is the BTO application year or the resale purchase year. `btoProjectId` (BTO) picks a project from `GET /api/data/bto-projects`, and so its wait; `btoWaitMonths` is an optional override; `leaseBand` and `livingArrangement` are resale only. Contract v2 (D1): both paths are measured at `assumptions.horizonYear`, with no sale.

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
  "choiceA": { "path": "BTO", "applicationYear": 2027, "town": "TAMPINES", "flatType": "4 ROOM", "classification": "STANDARD", "btoProjectId": "<id from /api/data/bto-projects>", "btoWaitMonths": 48, "renovationCents": 3000000 },
  "choiceB": { "path": "RESALE", "applicationYear": 2027, "town": "TAMPINES", "flatType": "4 ROOM", "classification": null, "leaseBand": "80-89", "livingArrangement": "NEAR", "renovationCents": 2000000 },
  "assumptions": { "annualPriceGrowth": 0.024, "annualIncomeGrowth": 0.03, "horizonYear": 2041, "monthlyHousingCostWhileWaitingCents": 0 }
}
```
`btoProjectId`, `btoWaitMonths`, `horizonYear` and `monthlyHousingCostWhileWaitingCents` are optional (route fills the wait and the defaults). Illustrative values only.

### Where each input comes from

All money is integer cents. The client converts dollars to cents when it sends the request (D14).

| Input | Source | Notes |
|---|---|---|
| `profile.applicants[].age`, `citizenship`, `firstTimer` | Form | Exactly two applicants, at least one SC (singles and PR+PR not modelled yet). Validated in the form (seat 4) AND in every route that takes a profile (`400 VALIDATION_ERROR`) |
| `profile.applicants[].monthlyIncomeCents`, `cpfOaBalanceCents` | Form | Entered in dollars, converted by the client |
| `choice.path`, `applicationYear`, `town`, `flatType`, `classification` | Form | `classification` is BTO only. BTO keys = application (1 Jan) + wait, to the month |
| `choice.renovationCents` | Form | Per path, spent at keys; default 0 |
| `profile.constraints.moveInByYear` | Form | Optional "must move in by" year; later keys warn `MOVE_IN_DEADLINE_MISSED` |
| `choice.livingArrangement` | Form | Resale only. Declared by the user, not measured (D15) |
| `choice.leaseBand` → `remainingLeaseYears` | Form (resale), server (BTO) | Resale: the route uses the band's lower bound. BTO: 99 (D16) |
| `choice.btoProjectId` → `btoWaitMonths` | Form (project), server lookup, form override | Chosen project's `estimatedWaitMonths`; else the median of the town's seeded projects; else ruleset `btoWaiting.defaultMonths` (48, an assumption; warns `BTO_WAIT_ASSUMED`) (D7) |
| `choice.marketValueAtKeysCents` | Server lookup | BTO: near-new resale comparables for the town and flat type at keys (fallback town for towns with no resale stock, e.g. Tengah); resale: the purchase price. Never sent by the client |
| `choice.purchasePriceCents` | Server lookup | Median from cached data.gov.sg transactions for town, flat type and lease band; seeded launch price for BTO. Never sent by the client |
| `assumptions.annualPriceGrowth`, `annualIncomeGrowth` | Form (sliders) | Growth as decimals (0.03) |
| `assumptions.horizonYear` | Form, default | Must be ≥ the later key year (400 otherwise). Default: later key year + 10 |
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
  "outcomeA": {}, "outcomeB": {}
}
```
`outcomeA/B` are `Outcome` objects (see `evaluate.contract.js`, v2: timeline, affordability, `costBreakdown`, `yearlyCashFlow`, net position at the horizon). `marginCents` is the difference in net position at `horizonYear`, in cents. Errors: `400 VALIDATION_ERROR` for an out-of-scope household or a `horizonYear` before either path's keys.

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

## POST /api/cpf/accrued-interest
Request: `{ withdrawals: [{ date: "YYYY-MM-DD", amountCents, kind? }], asOfDate: "YYYY-MM-DD" }`. `kind` is free text (e.g. `LUMP_SUM`, `INSTALMENT`, `GRANT`, `STAMP_DUTY`).
Response: `{ principalCents, accruedInterestCents, totalCents, asOfDate, oaRate, accruedInterestCompounding, rulesetVersion, rulesetStatus }`.
Errors: `400 VALIDATION_ERROR` (bad date or amount, or a withdrawal dated after `asOfDate`); `503 RULESET_UNAVAILABLE` (ruleset has no verified OA rate or ANNUAL compounding).
Will be called internally by `/api/compare`; exposed on its own so the CPF calculation can be checked against hand-worked cases.

## POST /api/stamp-duty
Request: `{ priceCents }` (positive integer). Response: `{ bsdCents, dutiableValueCents, rulesetVersion, rulesetStatus }`.
Errors: `400 VALIDATION_ERROR`; `503 RULESET_UNAVAILABLE` (no BSD tiers in the ruleset).

