// SEAT 3. BTO seed data: real projects from four HDB sales exercises (Jul 2025, Oct 2025, Feb 2026, Jun 2026).
//
// Where the numbers come from (HDB's own launch tables, "Annex A" of each launch press release)
//   - June 2026 (7 projects): see JUN_2026 below. Towns: HDB's release
//     https://www.hdb.gov.sg/hdb-pulse/news/2026/hdb-launches-6952-flats-across-7-projects-in-june-2026-bto-sales-exercise
//     names Ang Mo Kio, Bishan, Bukit Merah, Sembawang and Woodlands.
//   - February 2026 (6 projects): see FEB_2026 below. Towns: Bukit Merah, Sembawang, Tampines, Toa Payoh.
//   - October 2025 (10 projects): https://www.hdb.gov.sg/-/media/hdb-pulse/news/2025/october-2025-bto-sales-exercise/Annex-ABTO-sales-exercise-Oct-2025.pdf
//     Towns: HDB's launch release, https://www.hdb.gov.sg/hdb-pulse/news/2025/october-2025-bto-sales-exercise
//   - July 2025 (8 projects): https://www.hdb.gov.sg/-/media/hdb-pulse/news/2025/hdb-launches-10209-flats-in-the-july-2025-bto-and-sbf-sales-exercises/Annex-A-20250723.pdf
//   Units, floor areas, prices and waiting times were checked against these tables on 11 Oct 2026
//   (verified: true). The Annex tables don't name towns, so each town comes from the towns HDB's
//   release lists for that launch plus the project's location (e.g. Bangkit Breeze is in Bukit Panjang,
//   Kebun Baru is in Ang Mo Kio, Lakeview is in Bishan).
//   Prices are HDB's indicative prices for a 99-year lease, before grants.

// Field notes
//   town            data.gov.sg spelling (same strings as the resale data and the Plan form)
//   classification  STANDARD | PLUS | PRIME
//   launch          sales exercise month, YYYY-MM
//   waitMonths      HDB's estimated waiting time in months (median flat selection to median completion)
//   flats[].flatType  data.gov.sg spelling; 2-room Flexi -> '2 ROOM' (FLEXI TYPE 1 = the smaller size, TYPE 2 = the larger); 3Gen -> 'MULTI-GENERATION'
//   flats[].floorAreaSqm  [min, max] HDB's estimated floor area in m², including the aircon ledge (min = max when one size)
//   flats[].priceRange    [min, max] indicative launch price in S$ before grants (the API returns cents)
//   subsidyRecoveryRate  Plus/Prime clawback at first resale as a fraction (0.12 = 12%); 0 for Standard (D18)
//   sourceAccessed  the date these figures were taken from their sources (YYYY-MM-DD)
//   priceBasis      'BEFORE_GRANTS' on every project: HDB's launch tables are before grants, and the engine
//                   subtracts grants itself. The service refuses any other basis, so grants are never
//                   subtracted twice (D26).
//   The seed keeps every flat type HDB listed (so totals match HDB's tables); the service only serves
//   3-, 4- and 5-room (D27). 2-room Flexi and 3Gen are kept here but never returned.
//   Community Care Apartments are left out: they are for seniors, not the couples this app is for.
//   excludedUnits counts them, so flats[].units + excludedUnits = totalUnits.

const JUN_2026 = 'https://www.hdb.gov.sg/-/media/hdb-pulse/news/2026/20260617-HDB-Launches-6952-Flats-Across-7-Projects-in-June-2026-BTO-Sales-Exercise/Annex-A.pdf';
const FEB_2026 = 'https://www.hdb.gov.sg/-/media/hdb-pulse/news/2026/hdb-launches-9012-flats-in-february-2026-bto-and-sbf-exercises/Annex-A.pdf';
// Subsidy recovery (D18): the share of the resale price a Plus or Prime flat repays to HDB at its first sale
// (Standard = 0). HDB announces it in each launch's release; HDB's release pages do not render outside a
// browser, so each rate below is taken from news reports that quote the release, two reports agreeing per
// launch where available. Check against HDB's launch page (homes.hdb.gov.sg) before relying on a figure.
const SRR_JUL_2025 = 'https://www.edgeprop.sg/property-news/hdb-launches-2601-prime-bto-flats-july-2025-exercise-10209-bto-and-sbf-flats-launched-0';
const SRR_OCT_2025 = 'https://www.asiaone.com/singapore/over-9000-hdb-flats-10-projects-sale-oct-bto-sales-exercise-berlayar-mount-pleasant';
const SRR_FEB_2026 = 'https://sg.news.yahoo.com/over-9-000-flats-launched-064118217.html';
const SRR_JUN_2026 = 'https://mothership.sg/2026/06/june-2026-bto-exercise-6952-flats-launched/';

const OCT_2025 = 'https://www.hdb.gov.sg/-/media/hdb-pulse/news/2025/october-2025-bto-sales-exercise/Annex-ABTO-sales-exercise-Oct-2025.pdf';
const JUL_2025 = 'https://www.hdb.gov.sg/-/media/hdb-pulse/news/2025/hdb-launches-10209-flats-in-the-july-2025-bto-and-sbf-sales-exercises/Annex-A-20250723.pdf';

const flexi1 = (units, area, min, max) => ({ flatType: '2 ROOM', variant: 'FLEXI TYPE 1', units, floorAreaSqm: [area, area], priceRange: [min, max] });
const flexi2 = (units, area, min, max) => ({ flatType: '2 ROOM', variant: 'FLEXI TYPE 2', units, floorAreaSqm: [area, area], priceRange: [min, max] });
const flat = (flatType, units, area, min, max) => ({
  flatType, units, floorAreaSqm: Array.isArray(area) ? area : [area, area], priceRange: [min, max],
});

export const BTO_PROJECTS = [
  // ---- June 2026 ----
  {
    id: 'sembawang-portico', name: 'Sembawang Portico', town: 'SEMBAWANG', classification: 'STANDARD',
    launch: '2026-06', waitMonths: 31, totalUnits: 875, sourceUrl: JUN_2026, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0, sourceAccessed: '2026-10-11',
    flats: [flexi1(50, 40, 142000, 184000), flexi2(150, 48, 157000, 225000),
      flat('3 ROOM', 100, 69, 250000, 344000), flat('4 ROOM', 300, 93, 320000, 437000),
      flat('5 ROOM', 275, 113, 465000, 579000)],
  },
  {
    id: 'sembawang-brook', name: 'Sembawang Brook', town: 'SEMBAWANG', classification: 'STANDARD',
    launch: '2026-06', waitMonths: 33, totalUnits: 1160, sourceUrl: JUN_2026, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0, sourceAccessed: '2026-10-11',
    flats: [flexi1(58, 40, 139000, 187000), flexi2(203, 48, 164000, 218000),
      flat('3 ROOM', 87, 69, 257000, 333000), flat('4 ROOM', 464, 93, 302000, 428000),
      flat('5 ROOM', 319, 113, 420000, 571000), flat('MULTI-GENERATION', 29, 120, 468000, 567000)],
  },
  {
    id: 'woodgrove-acres', name: 'Woodgrove Acres', town: 'WOODLANDS', classification: 'STANDARD',
    launch: '2026-06', waitMonths: 42, totalUnits: 656, sourceUrl: JUN_2026, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0, sourceAccessed: '2026-10-11',
    flats: [flexi1(31, 40, 137000, 170000), flexi2(126, 48, 164000, 211000),
      flat('3 ROOM', 80, 69, 260000, 325000), flat('4 ROOM', 162, 93, 353000, 437000),
      flat('5 ROOM', 257, 113, 472000, 582000)],
  },
  {
    id: 'kebun-baru-ridge', name: 'Kebun Baru Ridge', town: 'ANG MO KIO', classification: 'PLUS',
    launch: '2026-06', waitMonths: 37, totalUnits: 485, sourceUrl: JUN_2026, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0.08, subsidyRecoveryRateSource: SRR_JUN_2026, sourceAccessed: '2026-10-11',
    flats: [flat('3 ROOM', 95, 66, 380000, 492000), flat('4 ROOM', 390, 89, 543000, 693000)],
  },
  {
    id: 'kebun-baru-breeze', name: 'Kebun Baru Breeze', town: 'ANG MO KIO', classification: 'PLUS',
    launch: '2026-06', waitMonths: 52, totalUnits: 579, sourceUrl: JUN_2026, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0.08, subsidyRecoveryRateSource: SRR_JUN_2026, sourceAccessed: '2026-10-11',
    flats: [flexi1(261, 38, 191000, 275000), flexi2(116, 48, 255000, 349000),
      flat('4 ROOM', 202, 90, 547000, 746000)],
  },
  {
    id: 'lakeview-cascadia', name: 'Lakeview Cascadia', town: 'BISHAN', classification: 'PRIME',
    launch: '2026-06', waitMonths: 51, totalUnits: 1221, sourceUrl: JUN_2026, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0.1, subsidyRecoveryRateSource: SRR_JUN_2026, sourceAccessed: '2026-10-11',
    flats: [flexi1(118, 40, 216000, 287000), flexi2(358, 49, 257000, 361000),
      flat('4 ROOM', 745, 90, 534000, 742000)],
  },
  {
    id: 'berlayar-rise', name: 'Berlayar Rise', town: 'BUKIT MERAH', classification: 'PRIME',
    // HDB gives "49/54": 49 months for the earlier blocks, 54 for the later ones. We use the earlier figure.
    launch: '2026-06', waitMonths: 49, totalUnits: 1976, sourceUrl: JUN_2026, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0.14, subsidyRecoveryRateSource: SRR_JUN_2026, sourceAccessed: '2026-10-11',
    flats: [flexi1(172, 40, 247000, 341000), flexi2(644, 48, 296000, 406000),
      flat('3 ROOM', 172, 67, 435000, 591000), flat('4 ROOM', 988, 90, 592000, 810000)],
  },

  // ---- February 2026 ----
  {
    id: 'sembawang-voyage', name: 'Sembawang Voyage', town: 'SEMBAWANG', classification: 'STANDARD',
    launch: '2026-02', waitMonths: 44, totalUnits: 1173, sourceUrl: FEB_2026, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0, sourceAccessed: '2026-10-11',
    flats: [flexi1(81, 40, 150000, 187000), flexi2(210, 48, 175000, 228000),
      flat('4 ROOM', 454, 93, 304000, 422000), flat('5 ROOM', 428, 113, 439000, 582000)],
  },
  {
    id: 'sembawang-deck', name: 'Sembawang Deck', town: 'SEMBAWANG', classification: 'STANDARD',
    launch: '2026-02', waitMonths: 33, totalUnits: 777, sourceUrl: FEB_2026, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0, sourceAccessed: '2026-10-11',
    flats: [flexi1(42, 40, 158000, 190000), flexi2(146, 48, 175000, 237000),
      flat('3 ROOM', 84, 69, 261000, 343000), flat('4 ROOM', 271, 93, 338000, 426000),
      flat('5 ROOM', 234, 113, 479000, 585000)],
  },
  {
    id: 'tampines-bliss', name: 'Tampines Bliss', town: 'TAMPINES', classification: 'STANDARD',
    launch: '2026-02', waitMonths: 23, totalUnits: 284, sourceUrl: FEB_2026, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0, sourceAccessed: '2026-10-11',
    flats: [flat('3 ROOM', 80, 69, 363000, 444000), flat('4 ROOM', 204, 94, 481000, 600000)],
  },
  {
    id: 'tampines-nova', name: 'Tampines Nova', town: 'TAMPINES', classification: 'PLUS',
    launch: '2026-02', waitMonths: 32, totalUnits: 255, sourceUrl: FEB_2026, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0.06, subsidyRecoveryRateSource: SRR_FEB_2026, sourceAccessed: '2026-10-11',
    flats: [flexi1(24, 40, 197000, 235000), flexi2(98, 48, 214000, 292000),
      flat('4 ROOM', 133, 93, 459000, 602000)],
  },
  {
    id: 'kim-keat-crest', name: 'Kim Keat Crest', town: 'TOA PAYOH', classification: 'PLUS',
    launch: '2026-02', waitMonths: 37, totalUnits: 1151, sourceUrl: FEB_2026, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0.06, subsidyRecoveryRateSource: SRR_FEB_2026, sourceAccessed: '2026-10-11',
    flats: [flexi1(58, 40, 203000, 253000), flexi2(219, 48, 229000, 304000),
      flat('3 ROOM', 87, 67, 356000, 450000), flat('4 ROOM', 787, 89, 455000, 624000)],
  },
  {
    // A later phase of Redhill Peaks; the October 2025 phase is 'redhill-peaks' below.
    id: 'redhill-peaks-2026-02', name: 'Redhill Peaks', town: 'BUKIT MERAH', classification: 'PRIME',
    launch: '2026-02', waitMonths: 55, totalUnits: 1052, sourceUrl: FEB_2026, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0.12, subsidyRecoveryRateSource: SRR_FEB_2026, sourceAccessed: '2026-10-11',
    flats: [flexi1(92, 40, 215000, 295000), flexi2(276, 49, 257000, 373000),
      flat('3 ROOM', 91, 67, 385000, 537000), flat('4 ROOM', 593, 90, 563000, 783000)],
  },

  // ---- October 2025 ----
  {
    id: 'oak-ville-amk', name: 'Oak Ville @ AMK', town: 'ANG MO KIO', classification: 'PLUS',
    launch: '2025-10', waitMonths: 49, totalUnits: 1425, sourceUrl: OCT_2025, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0.07, subsidyRecoveryRateSource: SRR_OCT_2025, sourceAccessed: '2026-10-11',
    flats: [flexi1(88, 40, 194000, 244000), flexi2(346, 49, 230000, 300000),
      flat('3 ROOM', 129, 67, 340000, 434000), flat('4 ROOM', 862, 90, 514000, 650000)],
  },
  {
    id: 'ping-yi-court', name: 'Ping Yi Court', town: 'BEDOK', classification: 'STANDARD',
    launch: '2025-10', waitMonths: 33, totalUnits: 862, sourceUrl: OCT_2025, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0, sourceAccessed: '2026-10-11',
    flats: [flexi1(54, 40, 201000, 231000), flexi2(140, 48, 223000, 286000),
      flat('3 ROOM', 84, 69, 353000, 448000), flat('4 ROOM', 294, 93, 498000, 624000),
      flat('5 ROOM', 262, 113, 715000, 857000), flat('MULTI-GENERATION', 28, 121, 782000, 874000)],
  },
  {
    id: 'bishan-terraces', name: 'Bishan Terraces', town: 'BISHAN', classification: 'PRIME',
    launch: '2025-10', waitMonths: 47, totalUnits: 538, sourceUrl: OCT_2025, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0.1, subsidyRecoveryRateSource: SRR_OCT_2025, sourceAccessed: '2026-10-11',
    flats: [flexi1(37, 40, 229000, 292000), flexi2(98, 49, 288000, 364000),
      flat('3 ROOM', 109, 67, 408000, 516000), flat('4 ROOM', 294, 90, 543000, 735000)],
  },
  {
    id: 'berlayar-residences', name: 'Berlayar Residences', town: 'BUKIT MERAH', classification: 'PRIME',
    launch: '2025-10', waitMonths: 56, totalUnits: 880, sourceUrl: OCT_2025, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0.14, subsidyRecoveryRateSource: SRR_OCT_2025, sourceAccessed: '2026-10-11',
    flats: [flexi1(86, 40, 218000, 306000), flexi2(240, 48, 267000, 369000),
      flat('3 ROOM', 86, 67, 420000, 562000), flat('4 ROOM', 468, 90, 578000, 788000)],
  },
  {
    id: 'redhill-peaks', name: 'Redhill Peaks', town: 'BUKIT MERAH', classification: 'PRIME',
    launch: '2025-10', waitMonths: 53, totalUnits: 1021, sourceUrl: OCT_2025, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0.12, subsidyRecoveryRateSource: SRR_OCT_2025, sourceAccessed: '2026-10-11',
    flats: [flexi1(78, 40, 183000, 283000), flexi2(333, 49, 229000, 359000),
      flat('4 ROOM', 610, 90, 541000, 778000)],
  },
  {
    id: 'teban-heights', name: 'Teban Heights', town: 'JURONG EAST', classification: 'STANDARD',
    launch: '2025-10', waitMonths: 48, totalUnits: 638, sourceUrl: OCT_2025, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0, sourceAccessed: '2026-10-11',
    flats: [flexi1(36, 40, 145000, 186000), flexi2(107, 49, 176000, 232000),
      flat('3 ROOM', 107, 69, 254000, 373000), flat('4 ROOM', 210, 94, 397000, 539000),
      flat('5 ROOM', 142, 114, 576000, 740000), flat('MULTI-GENERATION', 36, 121, 613000, 738000)],
  },
  {
    id: 'fernvale-plains', name: 'Fernvale Plains', town: 'SENGKANG', classification: 'STANDARD',
    launch: '2025-10', waitMonths: 32, totalUnits: 1037, sourceUrl: OCT_2025, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0, sourceAccessed: '2026-10-11',
    excludedUnits: 207, // Community Care Apartments, left out (see notes at the top)
    flats: [flexi1(25, 41, 162000, 204000), flexi2(75, 49, 195000, 244000),
      flat('4 ROOM', 368, 94, 344000, 472000), flat('5 ROOM', 362, 113, 466000, 617000)],
  },
  {
    id: 'mount-pleasant-crest', name: 'Mount Pleasant Crest', town: 'TOA PAYOH', classification: 'PRIME',
    launch: '2025-10', waitMonths: 59, totalUnits: 1348, sourceUrl: OCT_2025, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0.12, subsidyRecoveryRateSource: SRR_OCT_2025, sourceAccessed: '2026-10-11',
    flats: [flexi1(152, 40, 209000, 297000), flexi2(389, 48, 250000, 373000),
      flat('3 ROOM', 98, 67, 411000, 552000), flat('4 ROOM', 709, 89, 558000, 787000)],
  },
  {
    id: 'chencharu-grove', name: 'Chencharu Grove', town: 'YISHUN', classification: 'STANDARD',
    launch: '2025-10', waitMonths: 31, totalUnits: 826, sourceUrl: OCT_2025, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0, sourceAccessed: '2026-10-11',
    flats: [flexi1(56, 40, 154000, 192000), flexi2(177, 48, 182000, 226000),
      flat('3 ROOM', 81, 69, 295000, 362000), flat('4 ROOM', 276, 93, 358000, 439000),
      flat('5 ROOM', 236, 113, 510000, 597000)],
  },
  {
    id: 'yishun-glade', name: 'Yishun Glade', town: 'YISHUN', classification: 'STANDARD',
    launch: '2025-10', waitMonths: 31, totalUnits: 569, sourceUrl: OCT_2025, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0, sourceAccessed: '2026-10-11',
    flats: [flexi1(238, 38, 132000, 166000), flexi2(168, 48, 168000, 217000),
      flat('4 ROOM', 163, 93, 343000, 415000)],
  },

  // ---- July 2025 ----
  {
    id: 'alexandra-peaks', name: 'Alexandra Peaks', town: 'BUKIT MERAH', classification: 'PRIME',
    launch: '2025-07', waitMonths: 56, totalUnits: 498, sourceUrl: JUL_2025, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0.11, subsidyRecoveryRateSource: SRR_JUL_2025, sourceAccessed: '2026-10-11',
    flats: [flat('3 ROOM', 76, 66, 403000, 511000), flat('4 ROOM', 422, 89, 560000, 771000)],
  },
  {
    id: 'alexandra-vista', name: 'Alexandra Vista', town: 'BUKIT MERAH', classification: 'PRIME',
    launch: '2025-07', waitMonths: 47, totalUnits: 609, sourceUrl: JUL_2025, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0.11, subsidyRecoveryRateSource: SRR_JUL_2025, sourceAccessed: '2026-10-11',
    flats: [flexi1(62, 40, 205000, 294000), flexi2(186, 48, 266000, 355000),
      flat('3 ROOM', 93, 67, 420000, 518000), flat('4 ROOM', 268, 90, 547000, 775000)],
  },
  {
    id: 'bangkit-breeze', name: 'Bangkit Breeze', town: 'BUKIT PANJANG', classification: 'STANDARD',
    launch: '2025-07', waitMonths: 35, totalUnits: 643, sourceUrl: JUL_2025, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0, sourceAccessed: '2026-10-11',
    flats: [flexi1(24, 41, 149000, 201000), flexi2(96, 49, 180000, 236000),
      flat('3 ROOM', 96, 69, 289000, 367000), flat('4 ROOM', 239, 94, 362000, 458000),
      flat('5 ROOM', 188, 114, 518000, 599000)],
  },
  {
    id: 'clementi-emerald', name: 'Clementi Emerald', town: 'CLEMENTI', classification: 'PRIME',
    launch: '2025-07', waitMonths: 34, totalUnits: 753, sourceUrl: JUL_2025, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0.12, subsidyRecoveryRateSource: SRR_JUL_2025, sourceAccessed: '2026-10-11',
    flats: [flexi1(66, 41, 214000, 289000), flexi2(156, 49, 261000, 351000),
      flat('3 ROOM', 111, 67, 388000, 512000), flat('4 ROOM', 420, 90, 562000, 780000)],
  },
  {
    id: 'sembawang-beacon', name: 'Sembawang Beacon', town: 'SEMBAWANG', classification: 'STANDARD',
    launch: '2025-07', waitMonths: 36, totalUnits: 775, sourceUrl: JUL_2025, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0, sourceAccessed: '2026-10-11',
    flats: [flexi1(32, 40, 148000, 173000), flexi2(136, 48, 167000, 207000),
      flat('3 ROOM', 84, 69, 267000, 323000), flat('4 ROOM', 286, 94, 328000, 413000),
      flat('5 ROOM', 203, 114, 487000, 586000), flat('MULTI-GENERATION', 34, 120, 497000, 585000)],
  },
  {
    id: 'simei-symphony', name: 'Simei Symphony', town: 'TAMPINES', classification: 'STANDARD',
    launch: '2025-07', waitMonths: 42, totalUnits: 380, sourceUrl: JUL_2025, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0, sourceAccessed: '2026-10-11',
    flats: [flexi1(40, 40, 193000, 234000), flexi2(100, 48, 223000, 280000),
      flat('4 ROOM', 140, 93, 529000, 625000), flat('5 ROOM', 100, 113, 658000, 763000)],
  },
  {
    id: 'toa-payoh-ascent', name: 'Toa Payoh Ascent', town: 'TOA PAYOH', classification: 'PRIME',
    launch: '2025-07', waitMonths: 41, totalUnits: 741, sourceUrl: JUL_2025, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0.11, subsidyRecoveryRateSource: SRR_JUL_2025, sourceAccessed: '2026-10-11',
    flats: [flexi1(39, 38, 212000, 272000), flexi2(156, 48, 258000, 354000),
      flat('3 ROOM', 78, 66, 406000, 514000), flat('4 ROOM', 468, 89, 583000, 777000)],
  },
  {
    id: 'woodlands-north-grove', name: 'Woodlands North Grove', town: 'WOODLANDS', classification: 'STANDARD',
    launch: '2025-07', waitMonths: 55, totalUnits: 1148, sourceUrl: JUL_2025, verified: true, priceBasis: 'BEFORE_GRANTS',
    subsidyRecoveryRate: 0, sourceAccessed: '2026-10-11',
    flats: [flexi1(64, 40, 160000, 210000), flexi2(164, 48, 184000, 250000),
      flat('3 ROOM', 88, 69, 305000, 389000), flat('4 ROOM', 420, [93, 96], 388000, 544000),
      flat('5 ROOM', 412, [113, 116], 517000, 714000)],
  },
];