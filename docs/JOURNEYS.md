# User journeys

Five households, each with a different question and a different route through the app (pages as in D35:
Plan → Results → Dashboard, plus Sources, My scenarios and compare). Each has fixed inputs, so the demo is
repeatable and every journey ends differently. Each is also a recorded Cypress spec in `cypress/journeys/`, as a
backup for the live demo and evidence for the report.

| # | Household | Their question | Ends with | Presenter |
|---|---|---|---|---|
| 1 | First-time couple | "BTO or resale?" | BTO well ahead; a what-if barely moves it | Cadence |
| 2 | Couple who want to live near their parents | "Is resale worth it for the grants?" | Resale ahead, until they skip the rent | Haritha |
| 3 | Couple who must move in by 2032 | "When should we apply?" | Apply now; 2031 misses the deadline | Cadence or Haritha |
| 4 | Returning user | "Which of my two options is better?" | Side-by-side comparison of two saved scenarios | Yu Qing or Kaashvi |
| 5 | SC + PR couple with little cash | "Can we afford this at all?" | Both paths over the loan limit, said plainly | Yee Teng |

Figures below are from the live engine on 2026-10-29 (ruleset 2026-08-24). Resale prices are the median of the
last 12 months of data.gov.sg sales, so the dollar amounts drift week to week; who ends ahead should not.
Re-run the journeys before presenting and read the figures off the screen, not this page.

## Running them

```bash
VITE_USE_MOCK=false npm run build && npm start   # terminal 1: a LIVE build (journeys need the real engine)
npm run journeys                                  # terminal 2: all five, each recorded to cypress/videos/
npm run journeys -- --spec cypress/journeys/j2-near-parents.cy.js   # just one
```
PowerShell: `$env:VITE_USE_MOCK='false'; npm run build; npm start`. Journey 4 also needs the server's
`MONGODB_URI` pointing at a **test** database. Set `CYPRESS_JOURNEY_PAUSE=0` to drop the pauses between steps
(they are there so a recording can be followed by eye). The specs check who ends ahead, not exact dollar amounts.

## 1. First-time couple: "BTO or resale?"

**Plan:** two Singapore Citizens, ages 29 and 30, first-timers; monthly income S$4,200 and S$3,800; CPF OA
S$90,000 and S$80,000; cash S$60,000; flat prices +3% a year, income +2% a year.
**Path A:** BTO, 2027, Sengkang, 4-room, Standard, Fernvale Plains. **Path B:** resale, 2027, Sengkang, 4-room,
80 to 89 years of lease, neither living with nor near parents.

| Step | What the audience sees |
|---|---|
| Results | The break-even sentence: BTO is ahead under every price and income growth tested. By 2039, BTO ends about S$303,500 ahead. |
| "Why the gap" | The largest line is the downpayment and instalments paid in cash; grants are stated beside the lines. |
| Heatmap | "You" marks their own assumptions; every square is BTO. |
| Dashboard | Both paths within the loan limit; price, cash, CPF and loan for each. |
| What-if | Flat prices at 1% a year: BTO still ends about S$290,000 ahead. The answer is robust. |

## 2. Living near parents: "Is resale worth it for the grants?"

**Plan:** two Singapore Citizens, ages 31 and 32; S$3,300 and S$3,000 a month; CPF OA S$75,000 and S$65,000; cash
S$80,000; prices +3%, income +2%; **rent while waiting S$2,800 a month**.
**Path A:** BTO, 2027, Jurong East, 4-room, Standard, Teban Heights (a 4-year wait). **Path B:** resale, 2027,
Jurong East, 4-room, 80 to 89 years, **live near my parents**.

| Step | What the audience sees |
|---|---|
| Results | Resale is ahead under every combination tested; by 2041 resale ends about S$97,000 ahead. |
| "Why the gap" | Rent while waiting costs the BTO path about S$134,400 over four years. |
| Dashboard grants | Resale gets S$140,000 (Enhanced CPF Housing Grant S$40,000, Family S$80,000, Proximity S$20,000) against BTO's S$40,000; each check has its reason and an official link. |
| PHG map | The parents' home and the 4 km circle. |
| What-if | Rent while waiting to S$0 (living with parents until keys): BTO ends about S$37,000 ahead instead. |
| Sources | Every rule with its official source and the ruleset date. |

## 3. Move-in deadline: "When should we apply?"

**Plan:** two Singapore Citizens, ages 28 and 29; S$3,600 and S$3,400 a month; CPF OA S$70,000 and S$60,000; cash
S$60,000; prices +3%, **income +3%**; **must move in by 2032**.
**Path A:** BTO, Sengkang, 4-room, Standard, Fernvale Plains. **Path B:** resale, Sengkang, 4-room, 80 to 89 years.

| Step | What the audience sees |
|---|---|
| Timing panel (Results) | Each application year from this year ranked by net position; the best is this year. |
| Why | Grants shrink as their income rises: S$30,000 this year, S$25,000 in 2027–28, S$20,000 from 2029. |
| Skipped | 2031: the keys would arrive after their move-in deadline. |

## 4. Returning user: "Which of my two options is better?"

Needs a database and #60 (compare mode on My scenarios).
**Plan:** journey 1's couple, with **compare in 2040** set on the plan, so both scenarios share one horizon and can
be ranked. Save it as "Sengkang, compared in 2040"; then plan again with Path A Tampines Bliss (BTO, Tampines,
4-room, Standard) and Path B Tampines resale, 4-room, 80 to 89 years, and save it as "Tampines, compared in 2040".

| Step | What the audience sees |
|---|---|
| Log in, save twice | Each save confirmed by name. |
| My scenarios | Both listed with date and ruleset; "Compare two" picks them. |
| Compare page | Side by side: both say BTO, and the Sengkang scenario's BTO ends higher (about S$525,500 against S$473,500 in 2040). |
| Open full results | Either scenario back on Results with its inputs. |

## 5. Can they afford it?

**Plan:** a Singapore Citizen aged 26 and a Permanent Resident aged 27; S$2,600 and S$2,300 a month; CPF OA
S$12,000 and S$9,000; **cash S$8,000**; prices +3%, income +2%.
**Path A:** BTO, 2027, Yishun, 4-room, Standard, Chencharu Grove. **Path B:** resale, 2027, Yishun, 4-room, 80 to 89
years.

| Step | What the audience sees |
|---|---|
| Plan, step 1 | Two PRs are stopped: at least one buyer must be a Singapore Citizen. With SC + PR they continue. |
| Results | BTO ends about S$185,000 ahead by 2039, but see the next step. |
| Dashboard | Both paths over the loan limit (BTO short by about S$37,600, resale about S$149,200) and short of cash at purchase (BTO needs about S$25,500 in cash, resale S$148,300); the warnings say so. Grants reflect SC + PR: Family Grant S$70,000 rather than S$80,000. |

Open items that change this journey: the warnings read as codes until the UI shows `warningMessages`; Results does
not yet show affordability (the shared path card in D35 fixes that).
