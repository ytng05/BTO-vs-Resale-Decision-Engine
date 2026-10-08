# Ruleset Research Notes (Seat 2)

Research notes supplied for 6 Oct 2026. Values below are unverified candidates, not active policy.

**Every item starts unchecked. Open the cited source, confirm the value, then change ☐ to ✅ and add initials. Only confirmed (✅) items may be transcribed into the ruleset. Resolve every ⚠️ conflict or source gap first.**

Latest rule change reported in these notes: 24 Aug 2026 (NDR 2026 income ceilings). Suggested `effectiveDate`: `2026-08-24` (unverified; confirm before use).

## State machine notes (from research)

- EHG covers Singapore Citizen AND Singapore PR first-timers (CPF Board guide).
- For resale, household must qualify for CPF Housing Grant for Resale Flats (Family Grant) BEFORE EHG can apply (togetherforbetter.gov.sg).

## Grants: EHG

✅ `grants.ehg.tiers` (families): monthly household income / grant schedule reported as: <=1,500 -> 120,000; 1,501-2,000 -> 110,000; 2,001-2,500 -> 105,000; 2,501-3,000 -> 95,000; 3,001-3,500 -> 90,000; 3,501-4,000 -> 80,000; 4,001-4,500 -> 70,000; 4,501-5,000 -> 65,000; 5,001-5,500 -> 55,000; 5,501-6,000 -> 50,000; 6,001-6,500 -> 40,000; 6,501-7,000 -> 30,000; 7,001-7,500 -> 25,000; 7,501-8,000 -> 20,000; 8,001-8,500 -> 10,000; 8,501-9,000 -> 5,000; >9,000 -> not eligible. Source reported: HDB PDF, "EHG amount for first-timer households", p. 1: <https://www.hdb.gov.sg/-/media/buying-a-flat/flat-grant-and-loan-eligibility/couples-and-families/enhanced-cpf-housing-grant/EHG-amount-Families.pdf>. (checked vs official source 2026-10-06: Claude + Har)
✅ `grants.eligibilityCombinations.firstTimerWithSecondTimer` (EHG portion): separate schedule reported using half of household income: <=750 -> 60,000; 751-1,000 -> 55,000; 1,001-1,250 -> 52,500; 1,251-1,500 -> 47,500; 1,501-1,750 -> 45,000; 1,751-2,000 -> 40,000; 2,001-2,250 -> 35,000; 2,251-2,500 -> 32,500; 2,501-2,750 -> 27,500; 2,751-3,000 -> 25,000; 3,001-3,250 -> 20,000; 3,251-3,500 -> 15,000; 3,501-3,750 -> 12,500; 3,751-4,000 -> 10,000; 4,001-4,250 -> 5,000; 4,251-4,500 -> 2,500. FT+ST EHG income ceiling is 4,500 (source: CPF Board guide). Same HDB PDF, p. 2. (checked vs official source 2026-10-06: Claude + Har)
✅ `grants.ehg.incomeCeiling.family`: 9,000. Applies to households with at least two first-timers. Source reported: CPF Board, [A guide to Enhanced CPF Housing and Proximity Housing Grants](https://www.cpf.gov.sg/member/infohub/educational-resources/a-guide-to-enhanced-cpf-housing-and-proximity-grant). (checked vs official source 2026-10-06: Claude + Har)
✅ `grants.ehg.incomeCeiling.single`: 4,500 (reported as 9,000 if buying with other singles or with parents). Same CPF Board guide. (checked vs official source 2026-10-06: Claude + Har)
✅ `grants.ehg.employmentMonthsRequired`: 12 months continuous employment, and still employed at flat application; buyer or spouse. Same CPF Board guide. (checked vs official source 2026-10-06: Claude + Har)
✅ `grants.ehg.incomeAveragingMonths`: 12. Source: <https://www.madeforfamilies.gov.sg/support-measures/housing/housing-schemes-and-grants>. (checked vs official source 2026-10-06: Claude + Har)
✅ `grants.ehg.leaseMustCoverToAge`: 95 (youngest core applicant/occupier; otherwise grant pro-rated). Source: CPF Board guide above. ⚠️ Find and confirm HDB's pro-rating formula. (checked vs official source 2026-10-06: Claude + Har)
☐ `grants.ehg.minRemainingLeaseYearsResale`: 20. Source reported: MND EHG Annex A (2019), <https://www.mnd.gov.sg/api/media/02e7adfd-b11e-45b2-a290-4b130a0f45e9>. ⚠️ Reconfirm on current HDB page.
☐ Confirm with HDB whether NDR 2026 changed EHG tiers; notes report secondary sources saying no.

## Grants: CPF Housing Grant (Family Grant), Resale

✅ `grants.familyGrant.incomeCeiling`: 16,000 for HFE applications from 24 Aug 2026. Source: <https://www.mynicehome.gov.sg/get-started/hdb-grants-guide/> (updated 23 Aug 2026). (checked: Claude + Har)
✅ `grants.familyGrant.amounts` (SC+SC): 2-4 room: 80,000; 5-room+: 50,000. Source reported: HDB KEO letter, 15 Feb 2023, <https://www.hdb.gov.sg/business/estate-agents-and-salespersons/letters-to-keos/Increased-CPF-Housing-Grant-for-resale-flat-buyers>. (checked vs official source 2026-10-06: Claude + Har)
✅ `grants.familyGrant.amounts` (SC+PR): 2-4 room: 70,000. Source: <https://www.togetherforbetter.gov.sg/lifestage/youngadults/>. (checked vs official source 2026-10-06: Claude + Har)
☐ `grants.familyGrant.amounts` (SC+PR): 5-room+: 40,000. ⚠️ Not yet confirmed.
☐ `grants.familyGrant.amounts` (first-timer + second-timer): 2-4 room: 40,000; 5-room+: 25,000 ("Half-Housing Grant"). ⚠️ Secondary sources only; confirm on HDB.
✅ `grants.familyGrant.amounts` (PR+PR): not eligible for Family Grant; an applicant must be SC with at least one other SC/SPR. Source: <https://www.mynicehome.gov.sg/get-started/hdb-grants-guide/> (checked: Claude + Har)

## Grants: Proximity Housing Grant (Resale)

✅ `grants.proximityHousingGrant.amounts.livingWithParentsOrChild`: families 30,000; singles 15,000. Source: CPF Board guide above. (checked vs official source 2026-10-06: Claude + Har)
✅ `grants.proximityHousingGrant.amounts.livingNear`: families 20,000; singles 10,000. Source: CPF Board guide above. (checked vs official source 2026-10-06: Claude + Har)
✅ `grants.proximityHousingGrant.nearDistanceKm`: 4. Source: CPF Board guide above. Proximity must be kept throughout MOP. (checked vs official source 2026-10-06: Claude + Har)
☐ Confirm and document PHG conditions reported in the CPF Board guide: no income ceiling, one-time-only grant, and proximity maintained during MOP. These conditions currently have no dedicated fields in the ruleset template; determine an appropriate schema field before encoding them.

## Citizenship Combinations

☐ `grants.eligibilityCombinations.citizenship.SC_SC`: "Full grants" is reported, but the exact eligibility and grant treatment needs confirmation from HDB.
☐ `grants.eligibilityCombinations.citizenship.SC_PR`: lower Family Grant is reported (see Family Grant notes); confirm EHG and PHG eligibility with HDB.
✅ `grants.eligibilityCombinations.citizenship.PR_PR`: not eligible for Family Grant; an applicant must be SC with at least one other SC/SPR. Source: <https://www.mynicehome.gov.sg/get-started/hdb-grants-guide/> (checked: Claude + Har)

## CPF

✅ `cpf.oaInterestRate`: 0.025 for 1 Oct–31 Dec 2026; reviewed quarterly. Source: <https://www.cpf.gov.sg/member/infohub/news/news-releases/government-extends-4-per-cent-interest-rate-floor-on-special-medisave-and-retirement-account-monies-until-31-december-2027> (checked vs official source 2026-10-07: Claude + Har)
✅ `cpf.accruedInterestCompounding`: "computed monthly at OA rate, compounded yearly". Source: CPF Board official answer <https://ask.gov.sg/cpf/questions/cm0f52kzh01d1pz7aq4i1wz4y>. NOTE: team prompt assumed monthly compounding, which is WRONG. Seat 1 must update engine/cpf.
☐ `cpf.partialMonthTreatment`: `EXCLUDE_BOTH`. ASSUMPTION (seat 1, pending CPF query). Note: CPF's general interest rule (withdrawals stop earning from the month they occur; refunds earn from the next month, source <https://www.cpf.gov.sg/service/article/how-is-my-cpf-interest-computed-and-credited-into-my-accounts>) suggests `INCLUDE_BOTH` may be correct under the "would have earned" definition.

## Loans (Confirm with Seat 1)

✅ `loans.ltv`: HDB loan 75%; bank loan 75%; bank LTV drops to 55% if tenure exceeds 25 years for HDB flats or extends past borrower age 65. Sources: <https://www.moneysense.gov.sg/buying-a-property-how-much-can-you-afford/>; HDB KEO Aug 2024 (HDB loan 75%): <https://www.hdb.gov.sg/business/estate-agents-and-salespersons/letters-to-keos/Measures-to-Cool-the-HDB-Resale-Market-and-Provide-Greater-Support-for-First-time-Home-Buyers>. (checked vs official source 2026-10-06: Claude + Har)
✅ `loans.msrPercent`: 30. Source: <https://www.moneysense.gov.sg/buying-a-property-how-much-can-you-afford/>. (checked vs official source 2026-10-06: Claude + Har)
✅ `loans.tdsrPercent`: 55. Applies to bank loans only; N.A. for HDB loans (MoneySense comparison table). Seat 1: apply TDSR only when loan type is bank. Source: <https://www.moneysense.gov.sg/buying-a-property-how-much-can-you-afford/>. (checked vs official source 2026-10-06: Claude + Har)
✅ `loans.hdbConcessionaryRate`: 0.026 (OA rate + 0.1%, for 1 Oct–31 Dec 2026). Source: <https://www.cpf.gov.sg/member/infohub/news/news-releases/government-extends-4-per-cent-interest-rate-floor-on-special-medisave-and-retirement-account-monies-until-31-december-2027> (checked vs official source 2026-10-07: Claude + Har)
✅ `loans.maxTenureYears`: HDB loan 25; bank loan 30 (HDB flats). Source: <https://www.moneysense.gov.sg/buying-a-property-how-much-can-you-afford/>. (checked vs official source 2026-10-06: Claude + Har)

## Transaction Costs

✅ `transactionCosts.buyerStampDutyTiers`: 1% first 180k; 2% next 180k; 3% next 640k; 4% next 500k; 5% next 1.5m; 6% remainder. Source: <https://www.mof.gov.sg/news-resources/newsroom/buyer-s-stamp-duty-bsd-rates-to-be-raised-for-higher-value-properties/> (effective 15 Feb 2023). (checked vs official source 2026-10-06: Claude + Har)
☐ `transactionCosts.legalFees`: project assumption, not a verified policy fact. Label as an assumption in `SOURCES.md` if adopted.
☐ `transactionCosts.agentFees`: variable project assumption, not a policy fact. Label as an assumption in `SOURCES.md` if adopted.

## Flat Classifications (BTOs Launched from Oct 2024)

✅ `classifications.STANDARD.mopYears`: 5. Source: <https://www.hdb.gov.sg/residential/buying-a-flat/conditions-after-buying> (checked vs official source 2026-10-07: Claude + Har)
✅ `classifications.PLUS.mopYears`: 10. Same HDB conditions-after-buying source (checked vs official source 2026-10-07: Claude + Har)
✅ `classifications.PRIME.mopYears`: 10. Same HDB conditions-after-buying source (checked vs official source 2026-10-07: Claude + Har)
✅ `classifications.STANDARD.subsidyRecoveryRate`: 0 (not applicable). Source: <https://www.hdb.gov.sg/residential/buying-a-flat/conditions-after-buying> (checked vs official source 2026-10-07: Claude + Har)
☐ `classifications.PLUS.subsidyRecoveryRate` and `classifications.PRIME.subsidyRecoveryRate`: keep null in the ruleset. Set per project on BTO seed record, e.g. Feb 2026: Tampines Nova (Plus) 6%, Redhill Peaks (Prime) 12%. Not applicable to resale Plus/Prime flats. Source: <https://www.hdb.gov.sg/about-us/news-and-publications/press-releases/hdb-launches-9012-flats-in-february-2026-bto-and-sbf-exercises>.
☐ `classifications.STANDARD.resaleBuyerIncomeCeiling`, `classifications.PLUS.resaleBuyerIncomeCeiling`, `classifications.PRIME.resaleBuyerIncomeCeiling`: reported as none for Standard and previously 14,000 for Plus and Prime. ⚠️ Possible change to 16,000 after 24 Aug 2026; confirm with HDB.

## Slide / Narrative Check

☐ The statement "$230,000 on resale" is reported as EHG 120k + Family Grant 80k + PHG 30k. The notes say this applies only to SC+SC first-timers with income <= $1,500 buying a 2-4 room resale flat and living with parents. Keep this phrased as "up to" with conditions, and do not present it as verified until each component and eligibility condition is confirmed.
