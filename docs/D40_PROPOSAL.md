# D40 proposal: a verdict that holds without the exact BTO price

**Status:** decided by seat 1, 2026-10-31 (D40 in DECISIONS.md): the flip price on Results, the "estimated from" labels and the slider mark. Placement on Results is open to seats 4 and 5 (question 1 below).

## The problem in one paragraph

Every BTO project in our seed is from a launch that has closed (Jul 2025 to Jun 2026). We use them as estimates
of what a BTO in that town costs and how long it takes, not as flats the user can apply for. HDB publishes prices
and waits only on launch day, and there is no source for upcoming launches (no data.gov.sg dataset or API; HDB's
previews give towns and flat counts, no prices). So the BTO price behind our verdict is always an estimate: the
**midpoint** of a past launch's range (D26), and that range is as wide as the grants we compare (Tampines Bliss
4-room: $481k to $600k). Results gives one verdict at the midpoint. The user can't tell whether it would flip at
the price they actually get.

## The proposal

**Tell the user the BTO price at which the verdict flips, and whether HDB's range crosses it.**

> BTO leaves you with the higher net financial position at the end of 2039 as long as your 4-room costs
> **under $585,000** (in today's prices). HDB's range for this launch was $481,000 to $600,000, so this
> holds for most of the range but not the most expensive units. This is not a price forecast.

*(Figures illustrative, not engine output.)*

One sentence, three outcomes:

| Where the flip price falls | What Results says |
|---|---|
| Above HDB's maximum | "BTO comes out ahead at any price in HDB's range for this launch." |
| Below HDB's minimum | "Resale comes out ahead even at the cheapest price in HDB's range." |
| Inside the range | "BTO comes out ahead below $X; above that, resale does." |

### Why this is the right thing to add

1. **It uses the number we don't know as the input, not the output.** We can't give the user their price, but we
   can give them a number to check on launch day. That also makes the answer useful for launches that haven't
   happened yet: the user only needs to know whether the real price lands above or below it.
2. **It answers D26's stated limitation (2)** (the range is as wide as the grant difference) on Results, not
   just through the Dashboard slider.
3. **It fits Results' job under D35** ("Which path, and when?"). It's a verdict, not detail.
4. **No new rules or data.** It reruns `evaluate()` with a different `choice.btoPriceCents`, like the heatmap
   reruns it with different growth rates.

### How it works

- **Bisect on `choiceA.btoPriceCents`** (today's price, as D31 defines it), holding everything else at the
  user's assumptions, for the price where net position A − B = 0. About 17 halvings, so ~34 `evaluate()` calls.
  The heatmap already makes about 108, so `/api/compare` slows by roughly a third at most.
- **Search bracket:** half HDB's minimum to 1.5 × HDB's maximum for the flat type. A flip outside the bracket is
  reported as "at any price from $X to $Y".
- **The margin should fall steadily as the price rises:** a higher price means a bigger loan and more stamp duty,
  cash and CPF used. Market value at keys comes from resale comparables (D33) and doesn't move. Plus/Prime
  clawback is on the resale value, not the price paid. **To prove with a property test before relying on it**
  (the margin never rises as the price rises), since bisection assumes a single crossing.
- **Today's prices, on purpose.** D31 grows the launch price to the application date, so the flip price is on the
  same footing as HDB's published range and the Dashboard slider. The sentence says "in today's prices".

**Contract (additive, v2.2):** a new `btoPriceBreakEven` on the `/api/compare` response:

```
btoPriceBreakEven: {
  priceCents: number | null,        // null when one path wins across the whole bracket
  aheadBelow: 'A' | 'B' | null,     // which path is ahead at prices below priceCents
  acrossHdbRange: 'A' | 'B' | 'SPLIT', // the verdict over HDB's min..max for this flat type
  bracketCents: { min, max }
}
```

plus the sentence, built server-side like `breakEvenSentence()` so the wording rules live in one place.

### Also proposed (small)

**Label launches as estimates.** Results and the Plan step say "Sembawang Portico". Change to "Estimated from
Sembawang Portico (June 2026 launch)" so no one reads it as a flat they can apply for. Wording only; D38's fields
are unchanged.

## How it compares with what's already built

| Existing feature (decision) | What it varies | What the user learns | Relation to this proposal |
|---|---|---|---|
| **Break-even sentence + heatmap** on Results (D33, D35; `solvers/breakEven.js`) | Price growth × income growth | Whether the verdict survives different market and income conditions | **Different axis, same method.** It varies assumptions about the future; this varies the one input we know is uncertain today. Reuses the same bisection pattern. They answer different questions, so the heatmap stays as is |
| **BTO price slider** on the Dashboard (D26) | BTO price, one value at a time | The result at a price the user picks | **The slider explores; the flip price summarises.** Today the user has to drag the slider to find where the verdict changes. Optional follow-up: mark the flip price on the slider track |
| **"Prices the comparison used"** on Results (D26, D33; `ResultsView.vue`) | Nothing; reports the midpoint and HDB's range | Which price the verdict is based on | **Extended, not replaced.** It says what price was used; the new sentence says whether that matters |
| **Timing panel** on Results (D35, #70; `solvers/timingOptimiser.js`) | Application year | The best year to apply | **Independent.** The flip price is for the chosen year. Not proposed: a flip price per candidate year (~34 runs × 6 years); revisit if asked |
| **Why-the-gap panel** (D34; `explainGap.js`) | Nothing; explains the midpoint result | Which lines make up the margin | **Unchanged.** Still explains the midpoint result. The flip price is roughly where the gap's lines sum to zero |
| **Launch price grown to the application year** (D31) | — | — | **Already covers "future launches cost more".** I suggested projecting prices forward; D31 already does, so it's not in this proposal |
| **BTO town list = seeded towns** (D26) | — | — | **Unchanged.** A town with no recent launch still has no BTO price. This proposal doesn't invent prices for towns we have no launch for |

## Not proposed now

- **Wait-time flip point** ("BTO stays ahead if keys come within N months"). Harder than price: D33 sets the
  horizon at later keys + 10, so changing the wait moves the horizon, and the margin isn't monotonic in the
  wait. It needs a fixed horizon during the search. Worth its own proposal.
- **Estimated entries for upcoming launches** (town and flat types from HDB's preview, price from the town's last
  launch). Changes D26's "no recent launch, no price". Only worth it if users ask for towns we don't have.
- **Ballot risk** (BTO isn't certain; failing the ballot costs another year of rent). Needs application rates
  per launch. A v2 idea.

## Who does what (if agreed)

- **Seat 1:** the solver (bisection on price) and its hand-worked check: one case worked by hand at the flip price,
  where the two net positions should agree to the cent within the bisection tolerance. Property test for
  the steady fall in margin.
- **Seat 3:** confirm the bracket uses the seed's range for the flat type; the label wording for launches.
- **Seats 4 + 5:** where the sentence sits on Results (next to the price-used line or under the break-even sentence),
  and the optional slider marker on the Dashboard.

## Questions for the team

1. Agree the flip price goes on **Results** (verdict), not only the Dashboard?
2. ~~Wording~~ Decided: "under" the flip price rounded down to the $1,000, with "Prices are in today's terms".
3. ~~Time~~ Measured: about 58 ms against 758 ms for the heatmap (E2 against E1), so about 8% more per `/api/compare`; it stays in the same request.
4. Agree to rename launches as "Estimated from …"?
