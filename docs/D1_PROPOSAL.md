# D1 proposal: what "better off" means

**Status:** proposal from seat 1, for team agreement. Nothing in the contract changes until we agree this.
**Please don't build further on** `holdingPeriodYears`, `salePriceCents` or the other sale fields until this is settled.

## The proposal in one paragraph

Compare both paths **at the same calendar year** (the horizon year), not after the same number of years each.
Don't model a sale. At the horizon year, measure each path's **net position**: what the flat is worth, minus
the loan still owed, minus the CPF the household would owe back to its own OA (principal plus accrued interest),
minus all the cash spent on housing to get there.
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
                          − CPF refund obligation at the horizon year (principal + accrued interest)
                          − cumulative housing cash spent from the start year to the horizon year
```

- **Why the CPF refund obligation, and why it's fair.** Every dollar of the household's **own OA savings** used for
  housing lowers their OA by that dollar plus the interest it would have earned, which is exactly the refund
  obligation on those savings. So the measure ranks the two paths the same way as "total wealth including the CPF OA
  balance": the two differ only by the OA balance the household would have had without buying, which is the same on
  both paths. Using the obligation means no CPF contribution model is needed, and it comes straight from
  `computeAccruedInterest()`. *Corrected 2026-10-11 (seat 2 on #49, ytng on #47): this holds for OA savings only, not
  for grants, which were never in that OA; see "Amendment: grants" below.*
- **Housing cash spent, not "cash accumulated".** D19 defers a savings model. Income and other spending are the
  same on both paths, so they cancel out. Counting only housing cash out (upfront cash, the cash part of
  instalments, the cash-paid part of stamp duty and fees, rent while waiting) gives the same comparison without
  modelling savings.
- **CPF-paid costs are not cash spent.** Stamp duty and legal fees can be paid from the CPF OA. That part is a CPF
  withdrawal: it attracts accrued interest and shows up in the CPF refund obligation, so it must not also be
  counted as housing cash spent.
- **Which instalments are paid in cash (open).** "The cash part of instalments" needs a rule for splitting each
  monthly instalment between CPF and cash; doing it exactly would need a CPF contribution model. Options:
  (a) instalments come from CPF while the OA balance lasts, then cash; (b) the user enters a monthly cash top-up.
  To decide with the team.

## Market value

- **BTO: value at keys is market value, not the purchase price.** A BTO bought below market is worth market value
  once the keys are collected; that gain is BTO's main advantage, and growing value from the subsidised purchase
  price would erase it. Value at keys = resale value for that town and flat type with a near-new lease (seat 3's
  resale data), then grown at `annualPriceGrowth` to the horizon year.
- **Resale:** value starts from the purchase price.
- **Towns with no near-new resale stock** (e.g. Tengah, where BTOs are new): need a fallback, either the nearest
  comparable town or a stated assumption. Seat 3 to propose which.

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
makes BTO win on a technicality. It's user-specific, so it's an input: **`assumptions.monthlyHousingCostWhileWaitingCents`**, with a prominent slider.

**Default: 0 (living with parents).** Many couples do this while waiting, and any rent figure we pick would be
contestable. Note that zero **leans towards BTO**, because it removes BTO's main cost; that's why the slider must be
prominent and shown on the results page. Beside the slider, show what a typical room or flat rental costs, with a
source, so users can set their own figure.

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
| `Outcome` | `salePriceCents`, `outstandingLoanAtSaleCents`, sale-side `transactionCostsCents` | `marketValueAtHorizonCents`, `outstandingLoanAtHorizonCents`, `housingCashSpentCents` (with a breakdown), `netPositionCents` (same name, new meaning). `cpfRefundPrincipalCents` and `cpfAccruedInterestCents` stay, measured at the horizon year |
| API response | `holdingPeriodYears` | `horizonYear` |
| DECISIONS | | D1 answered; D13 updated; D7 in months |

`computeAccruedInterest()` feeds the headline figure directly: it's called with the horizon date instead of a
sale date, and its result is the CPF refund obligation in the measure.

## What each seat needs to do once agreed

- **Seat 2:** grants at the application year (D13 change); confirm the clawback-on-value approach.
- **Seat 3:** expose `estimatedWaitMonths` and `launchDate` from the BTO seed to the route; provide near-new resale
  values per town and flat type for BTO market value at keys, and propose the fallback for towns with no resale stock.
- **Seat 4:** store/form: `keyCollectionYear`, `horizonYear` (replaces "compare after N years"), waiting-cost slider
  (default 0) with a sourced rental guide beside it.
- **Seat 5:** results page reads the new Outcome fields; show the waiting cost and the lease-decay caveat.

## Decisions needed from the team

- [ ] Same calendar year (horizon year) instead of same holding period
- [ ] Measure: net position with the CPF refund obligation (ranks the same as total wealth)
- [ ] `keyCollectionYear`, with grants tested at the application year
- [ ] Rent while waiting as an input, default 0 (living with parents), prominent slider with a sourced rental guide
- [ ] Instalment split between CPF and cash: (a) CPF first while the OA lasts, or (b) user-entered cash top-up
- [ ] BTO market value at keys from near-new resale comparables, with a fallback for towns like Tengah
- [ ] Lease decay: limitation note now, value adjustment later
- [ ] Plus/Prime: deduct the clawback rate from market value
- [ ] D5: dates of BTO withdrawals (agreement for lease vs key collection)

## For seat 2

- **ABSD:** out of scope for Singapore citizens on a first property (0%). A PR+PR household does pay ABSD on a
  first property: please confirm the rate against IRAS and say whether PR+PR stays in scope.

## Amendment: grants (seat 2 on #49, 2026-10-11)

"Why the CPF refund obligation" above holds for the household's own OA, not for grants. A grant was never in the OA
they'd have had without buying, and on sale its refund (with accrued interest) goes back into their own OA (CPF:
refund on sale), not to the government. Subtracting it as a debt with no matching asset made every grant lower net
position by its accrued interest (E1's $125,000 of grants: about $9,700 lower; E2's $30,000: about $4,200 lower).

The measure now counts only the refund of the household's own OA savings; the grant refund is reported as
information (ytng on #47, as contract reviewer):

```
net position at horizon =   market value − outstanding loan
                          − CPF savings refund (own OA used + accrued interest)
                          − clawback − cumulative housing cash spent
```

Contract: `cpfSavingsRefundPrincipalCents` and `cpfSavingsAccruedInterestCents` are in net position;
`grantRefundPrincipalCents` and `grantRefundAccruedInterestCents` are information only; the yearly
`cpfSavingsObligationEndCents` is the savings refund at each 31 Dec. The savings refund is its own D12 run and is
canonical; grant interest is the combined run's interest less it, so the parts add up to one combined run to the cent.
`cpfRefundPrincipalCents`, `cpfAccruedInterestCents` and the yearly `cpfObligationEndCents` stay as combined totals,
deprecated, until the client stops reading them.

This is seat 2's option (a), the wealth view: the whole refund returns to the household's CPF, and their own OA used
(plus the interest it would have earned) is the cost. Option (b), leaving CPF out on both sides, was not taken: it
would make anything paid from the OA free and drop the CPF interest cost. Grants left over after the price go to
SA/RA and MediSave (#46) and are still not counted.

