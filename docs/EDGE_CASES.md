# Edge cases to test (from planning discussions). Verify each against primary sources.

## CPF accrued interest (seat 1)
- Compounding convention (monthly vs annual): record the decision in DECISIONS.md D2.
- Each instalment accrues from its own date; grants accrue from the credit date.
- Partial months (D12: withdrawal and sale months excluded; simple-interest stub on the obligation carried into it, including a sale before the first December credit), and BTO vs resale withdrawal timing.
- Refund capped when sale proceeds cannot cover the loan plus the refund.
- Subsidy clawback (Plus/Prime) is separate from CPF accrued interest; both come out of proceeds.

## Cash required at purchase (seat 1)
- BTO cash is paid in stages (booking fee, downpayment and stamp duty at signing the agreement for lease, the rest at key collection); resale pays at completion. Each stage needs its own date for the cash check and for the CPF ledger (D5; see docs/D1_PROPOSAL.md). Per seat 2: with an HDB loan the downpayment is split between signing the agreement for lease and key collection (15% at keys); with a bank loan, 20% at signing, of which at least 5% in cash.
- Cash shortfall: prunes only for a purchase in evaluationStartYear; later purchase years warn only (D19).
- Minimum cash downpayment (confirmed by seat 2): HDB loan 0% (the 25% downpayment can be fully CPF OA); bank loan 5% at the maximum LTV, 10% at the reduced LTV. Read from `loans.minCashDownpaymentPercent` (`{ hdbLoan, bankLoan: { atMaxLtv, atReducedLtv } }`), added to the ruleset in #13.
- Cash over valuation (COV) on resale must be paid in cash. We price at the median and assume COV = 0 (price = valuation); state this in the UI (D20).

## Grant eligibility (seat 2)
- EHG income tiers, 12-month averaging, boundary at the ceiling.
- First-timer per person; first-timer with second-timer; SC+SC, SC+PR, PR+PR.
- Lease must cover the youngest buyer to 95 (pro-rating); buyers age and lease shortens when waiting.
- 12 months' employment condition.
- Family Grant and PHG: resale only. PHG amount depends on living with vs near.
- Rules have effective dates; projections need a stated assumption.

## Search features (seat 1)
- Timing: EHG steps make the objective non-monotonic; report "under these assumptions".
- Strategy: prune early; reasons come from engine outputs, not generated text.
- Backtest (later): overlapping windows, today's rules on old prices, BTO price assumption.
