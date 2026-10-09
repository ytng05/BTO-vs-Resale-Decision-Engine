# D1 proposal: what "better off" means

**Status:** proposal from seat 1, for team agreement. Nothing in the contract changes until we agree this.
**Please don't build further on** `holdingPeriodYears`, `salePriceCents` or the other sale fields until this is settled.

## The proposal in one paragraph

Compare both paths **at the same calendar year** (the horizon year), not after the same number of years each.
Don't model a sale. At the horizon year, measure each path's **net position**: what the flat is worth, minus
the loan still owed, plus the household's CPF OA balance, minus all the cash spent on housing to get there.
The path with the higher net position at the horizon year is better under those assumptions.

## Why

1. **Same calendar year.** If each path is measured after the same holding period, a later purchase gets extra
   years of growth and looks better for reasons unrelated to the decision. "Which is better" normally means
   "which leaves me better off at the same point in time".
2. **No sale.** Measuring at a date rather than at a sale removes sale costs, the MOP-before-sale question and
   the refund cap from the comparison. Both paths are measured the same way on the same date.
3. **Honest framing.** "Net position at the horizon year" fits a flat people live in better than "profit", and
   matches our wording rules.

## The measure

```
net position at horizon =   market value of the flat at the horizon year
                          − outstanding loan at the horizon year
                          + CPF OA balance at the horizon year
                          − cumulative housing cash spent from the start year to the horizon year
```

- **CPF OA balance, not "minus CPF refund owed".** The accrued-interest refund goes back into the household's own
  OA, so it isn't money lost. Counting the OA balance treats CPF as the household's money on both paths, and
  CPF used for housing is then roughly neutral. What's left is the real trade-off: price, grants, loan interest, rent.
  *Alternative:* subtract the refund owed and call the result "money outside CPF". Pick one; use it for both paths.
- **Housing cash spent, not "cash accumulated".** D19 defers a savings model. Income and other spending are the
  same on both paths, so they cancel out. Counting only housing cash out (upfront cash, the cash part of
  instalments, the cash-paid part of stamp duty and fees, rent while waiting) gives the same comparison without
  modelling savings.
- **CPF-paid costs are not cash spent.** Stamp duty and legal fees can be paid from the CPF OA. That part is a CPF
  withdrawal: it attracts accrued interest and shows up through the OA balance, so it must not also be counted
  as housing cash spent.

## Years

- **`purchaseYear` becomes `keyCollectionYear`.** Keys are when CPF is drawn, the loan starts and interest starts
  accruing: everything the engine models.
- **Application year = key collection − BTO wait.** Seat 3's seed data already has `launchDate` and
  `estimatedWaitMonths` per project, so `btoWaitYears` (D7) should become **`btoWaitMonths`** to match.
  For resale, application and keys are the same year.
- **BTO withdrawals happen before keys (D5, now urgent).** BTO downpayment and stamp duty are paid at signing the
  agreement for lease, years before key collection; resale pays everything at completion. The CPF ledger needs a
  date for each BTO withdrawal, so D5 has to be answered alongside D1.
- **Grants are tested at the application year (changes D13).** Income ceilings are checked at application, and
  income grows during the wait. D13's assessment date moves from 1 Jan of the purchase year to 1 Jan of the
  application year. **Seat 2: this changes what `evaluate()` passes to `evaluateGrants()`.**

## Rent while waiting

The BTO path's main cost is paying to live somewhere for 3–5 years while the resale buyer has keys. Leaving it out
makes BTO win on a technicality. It's user-specific (it's 0 if living with parents), so it's an input:
**`assumptions.monthlyHousingCostWhileWaitingCents`**, with a default and a visible slider. It's one of the
assumptions that moves the answer most, so the results page should show it.

## Known biases to decide on

1. **Lease decay.** One `annualPriceGrowth` for a new 99-year BTO and a 60-year-old resale flat overstates the older
   flat's value over long horizons. Options: (a) adjust value by remaining lease, (b) state it as a limitation in the
   UI. Proposal: **(b) now, (a) if time allows.**
2. **Plus/Prime clawback.** With no sale, the clawback never triggers, but it still reduces what the flat is worth
   to the owner. Proposal: **deduct `subsidyRecoveryRate` × market value** from a Plus/Prime flat's value (D18 rate).

## Contract changes if agreed

| Where | Remove | Add / rename |
|---|---|---|
| `Choice` | | `purchaseYear` → `keyCollectionYear`; `btoWaitYears` → `btoWaitMonths` |
| `Assumptions` | `holdingPeriodYears` | `horizonYear`; `monthlyHousingCostWhileWaitingCents` |
| `Outcome` | `salePriceCents`, `outstandingLoanAtSaleCents`, sale-side `transactionCostsCents`, `cpfRefundPrincipalCents`, `cpfAccruedInterestCents` | `marketValueAtHorizonCents`, `outstandingLoanAtHorizonCents`, `cpfOaBalanceAtHorizonCents`, `housingCashSpentCents` (with a breakdown), `netPositionCents` (same name, new meaning) |
| API response | `holdingPeriodYears` | `horizonYear` |
| DECISIONS | | D1 answered; D13 updated; D7 in months |

`computeAccruedInterest()` is unaffected: it's called with the horizon date instead of a sale date.

## What each seat needs to do once agreed

- **Seat 2:** grants at the application year (D13 change); confirm the clawback-on-value approach.
- **Seat 3:** expose `estimatedWaitMonths` and `launchDate` from the BTO seed to the route.
- **Seat 4:** store/form: `keyCollectionYear`, `horizonYear` (replaces "compare after N years"), waiting-cost input.
- **Seat 5:** results page reads the new Outcome fields; show the waiting cost and the lease-decay caveat.

## Decisions needed from the team

- [ ] Same calendar year (horizon year) instead of same holding period
- [ ] Measure: total wealth (with CPF OA balance) or "money outside CPF"
- [ ] `keyCollectionYear`, with grants tested at the application year
- [ ] Rent while waiting as an input, with a default of: ___
- [ ] Lease decay: limitation note now, value adjustment later
- [ ] Plus/Prime: deduct the clawback rate from market value
- [ ] D5: dates of BTO withdrawals (agreement for lease vs key collection)

## For seat 2

- **ABSD:** out of scope for Singapore citizens on a first property (0%). A PR+PR household does pay ABSD on a
  first property: please confirm the rate against IRAS and say whether PR+PR stays in scope.
