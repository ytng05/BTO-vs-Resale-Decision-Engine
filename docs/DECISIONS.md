# Open decisions (settle in week 1, record the answer here)

| # | Decision | Why it matters | Owner | Answer |
|---|---|---|---|---|
| D1 | What does "break-even" equalise, and at what common horizon? (net financial position at year T? cash out? equity after sale?) | Everything downstream. In two variables it is a frontier curve, not a point | seats 1 + 2 | |
| D2 | CPF accrued interest: compounded monthly or annually? | Sources conflict. Check CPF Board's own worked example | seat 1 | Computed monthly at the OA rate, compounded annually (CPF Board answer, verified by seat 2) |
| D3 | Exact EHG tier table and whether the income ceiling is inclusive | Boundary tests | seat 2 | |
| D4 | PHG amounts: living with vs near parents. Family Grant ceiling after 24 Aug 2026 | The "$230,000" headline depends on it | seat 2 | |
| D5 | BTO withdrawal dates (booking, agreement for lease, key collection) | When each CPF outflow starts accruing | seat 1 | |
| D6 | Standard/Plus/Prime scope: MOP, clawback base, buyer restrictions | Affects net proceeds on the BTO path | seats 1 + 2 + 3 | |
| D7 | BTO wait time and ballot success as inputs | Not guaranteed | seat 1 | |
| D8 | Comparable flats: how the user picks BTO vs resale of like-for-like | Avoid comparing different estates unfairly | seats 1 + 4 | |
| D9 | Which policy rules stay "held constant" in projections | State the assumption in the UI | seat 2 | |
| D10 | data.gov.sg: API key registered? base URL and header confirmed? | Rate limits now apply | seat 3 | |
| D11 | Heatmap: DOM/SVG (chosen) vs canvas | Cypress cannot assert on canvas | seats 4 + 5 | DOM grid (scaffold) |
| D12 | CPF accrued interest: partial months and the stub period before sale | Sets the interest owed on sale | seat 1 | Full calendar months only; the withdrawal month and the sale month are both excluded (`EXCLUDE_BOTH`). Stub after the last December credit is simple interest at oaRate ÷ 12 per full month on the balance carried forward. A sale in June 2036 gives a 5-month stub (Jan–May). Instalments paid during the stub earn simple interest from the month after payment to the last full month before sale (Feb 2036 instalment: Mar–May, 3 months). Rounding: full precision within the year, rounded to the nearest cent (halves up) only at each credit, meaning each annual December credit and once on the stub total at sale, never monthly. Stated assumption, pending CPF Board confirmation |

Out of scope by decision: Executive Condominiums.
