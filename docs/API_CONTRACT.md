# API contract (DRAFT 1: agree in week 1, then change only by PR)

All routes are under `/api`. Errors always use `{ "error": { "code": "...", "message": "..." } }`.
Field names match `server/src/engine/evaluate.contract.js`; `client/src/stores/scenario.js` must use the same names. All money is integer cents.
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
| POST | `/api/timing` | seat 1 | FEATURE 1: optimal timing search | stub |
| POST | `/api/strategy` | seat 1 | FEATURE 2: ranked top 3 strategies | stub |
| POST | `/api/backtest` | seat 1 + 3 | FEATURE 3 (later): historical range | off (`FEATURE_BACKTEST`) |
| GET | `/api/data/resale-price?town=&flatType=` | seat 3 | price basis from data.gov.sg (cached) | stub |
| GET | `/api/data/rpi` | seat 3 | Resale Price Index series (cached) | stub |
| GET | `/api/data/bto-projects` | seat 3 | seeded BTO projects | stub |
| GET | `/api/data/distance?from=&to=` | seat 3 | OneMap distance for the PHG test | not needed: PHG is declared (D15) |
| GET | `/api/data/distance?from=&to=` | seat 3 | Distance service | not needed: PHG near arrangement is declared by the user (D15) |

### GET /api/ruleset

Response: `{ version, status, effectiveDate, verifiedOn, verifiedBy, rules }`. `rules` is the active versioned ruleset object; fields not yet verified remain null or empty and must be presented as unverified.

## POST /api/grants

Request: `{ profile, choice, assessmentDate? }` using `Profile` and `Choice` from `server/src/engine/evaluate.contract.js`. Money is integer cents; applicants use `monthlyIncomeCents` and `cpfOaBalanceCents`. The route converts these to dollars only for `evaluateGrants()`. `choice` may also include `livingArrangement?: "WITH"|"NEAR"|"NONE"` and `remainingLeaseYears?: number`. If omitted, `assessmentDate` defaults to `${choice.purchaseYear}-01-01` (D13).

Example request:
```json
{
  "profile": {
    "applicants": [
      { "age": 35, "citizenship": "SC", "firstTimer": true, "monthlyIncomeCents": 350000, "cpfOaBalanceCents": 0 },
      { "age": 34, "citizenship": "SC", "firstTimer": true, "monthlyIncomeCents": 350000, "cpfOaBalanceCents": 0 }
    ]
  },
  "choice": {
    "path": "RESALE",
    "purchaseYear": 2026,
    "town": "TODO",
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

Request: `{ profile, choiceA, choiceB, assumptions }` (`Profile`, `Choice` and `Assumptions` in `engine/evaluate.contract.js`). The client does not send an as-of date; the server sets `evaluationStartYear`.
Choice (request): `{ path: "BTO"|"RESALE", purchaseYear, town, flatType, classification?, livingArrangement?, leaseBand?, btoWaitYears? }`. `leaseBand` is resale only (e.g. `"80-89"`); `btoWaitYears` is an optional override.

### Where each input comes from

All money is integer cents. The client converts dollars to cents when it sends the request (D14).

| Input | Source | Notes |
|---|---|---|
| `profile.applicants[].age`, `citizenship`, `firstTimer` | Form | |
| `profile.applicants[].monthlyIncomeCents`, `cpfOaBalanceCents` | Form | Entered in dollars, converted by the client |
| `choice.path`, `purchaseYear`, `town`, `flatType`, `classification` | Form | `classification` is BTO only |
| `choice.livingArrangement` | Form | Resale only. Declared by the user, not measured (D15) |
| `choice.leaseBand` → `remainingLeaseYears` | Form (resale), server (BTO) | Resale: the route uses the band's lower bound. BTO: 99 (D16) |
| `choice.btoWaitYears` | Server lookup, form override | From seeded BTO project data (D7) |
| `choice.purchasePriceCents` | Server lookup | Median from cached data.gov.sg transactions for town, flat type and lease band; seeded launch price for BTO. Never sent by the client |
| `assumptions.annualPriceGrowth`, `annualIncomeGrowth`, `holdingPeriodYears` | Form | Growth as decimals (0.03) |
| `assumptions.loanTenureYears`, `loanType` | Default | Optional in the request; the server fills defaults and echoes them |
| `assumptions.evaluationStartYear` | Server | Never sent by the client |
| `cashSavings`, `monthlySavings` | Form | Not read by `evaluate()` yet. Open: use for an affordability check, or drop |

Response (one call returns the WHOLE grid, never one request per cell):
```json
{
  "rulesetVersion": "string",
  "holdingPeriodYears": 10,
  "breakEvenSentence": "string",
  "grid": [[{ "priceGrowth": 0.03, "incomeGrowth": 0.02, "winner": "A|B|TIE", "marginCents": 0 }]],
  "frontier": [{ "priceGrowth": 0.03, "incomeGrowth": 0.02 }],
  "outcomeA": {}, "outcomeB": {}
}
```
`outcomeA/B` are `Outcome` objects (see `evaluate.contract.js`). `marginCents` is the difference in net financial position after `holdingPeriodYears`, in cents. `holdingPeriodYears` echoes the horizon used, so the page can say "after N years".

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
