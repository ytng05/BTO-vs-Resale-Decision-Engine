// SEAT 3. BTO seed data: real projects from two HDB sales exercises (July 2025, October 2025).
//
// Where the numbers come from (HDB's own launch tables, "Annex A" of each launch press release)
//   - October 2025 (10 projects): https://www.hdb.gov.sg/-/media/hdb-pulse/news/2025/october-2025-bto-sales-exercise/Annex-ABTO-sales-exercise-Oct-2025.pdf
//     Towns: HDB's launch release, https://www.hdb.gov.sg/hdb-pulse/news/2025/october-2025-bto-sales-exercise
//   - July 2025 (8 projects): https://www.hdb.gov.sg/-/media/hdb-pulse/news/2025/hdb-launches-10209-flats-in-the-july-2025-bto-and-sbf-sales-exercises/Annex-A-20250723.pdf
//   Units, floor areas, prices and waiting times were checked against these tables on 11 Oct 2026
//   (verified: true). The tables don't name towns: October towns are from HDB's release above; July
//   towns are from each project's location (e.g. Bangkit Breeze is in Bukit Panjang).
//   Prices are HDB's indicative prices for a 99-year lease, before grants.

// Field notes
//   town            data.gov.sg spelling (same strings as the resale data and the Plan form)
//   classification  STANDARD | PLUS | PRIME
//   launch          sales exercise month, YYYY-MM
//   waitMonths      HDB's estimated waiting time in months (median flat selection to median completion)
//   flats[].flatType  data.gov.sg spelling; 2-room Flexi -> '2 ROOM' (FLEXI TYPE 1 = the smaller size, TYPE 2 = the larger); 3Gen -> 'MULTI-GENERATION'
//   flats[].floorAreaSqm  [min, max] HDB's estimated floor area in m², including the aircon ledge (min = max when one size)
//   flats[].priceRange    [min, max] indicative launch price in S$ before grants (the API returns cents)
//   Community Care Apartments are left out: they are for seniors, not the couples this app is for.
//   excludedUnits counts them, so flats[].units + excludedUnits = totalUnits.

const OCT_2025 = 'https://www.hdb.gov.sg/-/media/hdb-pulse/news/2025/october-2025-bto-sales-exercise/Annex-ABTO-sales-exercise-Oct-2025.pdf';
const JUL_2025 = 'https://www.hdb.gov.sg/-/media/hdb-pulse/news/2025/hdb-launches-10209-flats-in-the-july-2025-bto-and-sbf-sales-exercises/Annex-A-20250723.pdf';

const flexi1 = (units, area, min, max) => ({ flatType: '2 ROOM', variant: 'FLEXI TYPE 1', units, floorAreaSqm: [area, area], priceRange: [min, max] });
const flexi2 = (units, area, min, max) => ({ flatType: '2 ROOM', variant: 'FLEXI TYPE 2', units, floorAreaSqm: [area, area], priceRange: [min, max] });
const flat = (flatType, units, area, min, max) => ({
  flatType, units, floorAreaSqm: Array.isArray(area) ? area : [area, area], priceRange: [min, max],
});

export const BTO_PROJECTS = [
  // ---- October 2025 ----
  {
    id: 'oak-ville-amk', name: 'Oak Ville @ AMK', town: 'ANG MO KIO', classification: 'PLUS',
    launch: '2025-10', waitMonths: 49, totalUnits: 1425, sourceUrl: OCT_2025, verified: true,
    flats: [flexi1(88, 40, 194000, 244000), flexi2(346, 49, 230000, 300000),
      flat('3 ROOM', 129, 67, 340000, 434000), flat('4 ROOM', 862, 90, 514000, 650000)],
  },
  {
    id: 'ping-yi-court', name: 'Ping Yi Court', town: 'BEDOK', classification: 'STANDARD',
    launch: '2025-10', waitMonths: 33, totalUnits: 862, sourceUrl: OCT_2025, verified: true,
    flats: [flexi1(54, 40, 201000, 231000), flexi2(140, 48, 223000, 286000),
      flat('3 ROOM', 84, 69, 353000, 448000), flat('4 ROOM', 294, 93, 498000, 624000),
      flat('5 ROOM', 262, 113, 715000, 857000), flat('MULTI-GENERATION', 28, 121, 782000, 874000)],
  },
  {
    id: 'bishan-terraces', name: 'Bishan Terraces', town: 'BISHAN', classification: 'PRIME',
    launch: '2025-10', waitMonths: 47, totalUnits: 538, sourceUrl: OCT_2025, verified: true,
    flats: [flexi1(37, 40, 229000, 292000), flexi2(98, 49, 288000, 364000),
      flat('3 ROOM', 109, 67, 408000, 516000), flat('4 ROOM', 294, 90, 543000, 735000)],
  },
  {
    id: 'berlayar-residences', name: 'Berlayar Residences', town: 'BUKIT MERAH', classification: 'PRIME',
    launch: '2025-10', waitMonths: 56, totalUnits: 880, sourceUrl: OCT_2025, verified: true,
    flats: [flexi1(86, 40, 218000, 306000), flexi2(240, 48, 267000, 369000),
      flat('3 ROOM', 86, 67, 420000, 562000), flat('4 ROOM', 468, 90, 578000, 788000)],
  },
  {
    id: 'redhill-peaks', name: 'Redhill Peaks', town: 'BUKIT MERAH', classification: 'PRIME',
    launch: '2025-10', waitMonths: 53, totalUnits: 1021, sourceUrl: OCT_2025, verified: true,
    flats: [flexi1(78, 40, 183000, 283000), flexi2(333, 49, 229000, 359000),
      flat('4 ROOM', 610, 90, 541000, 778000)],
  },
  {
    id: 'teban-heights', name: 'Teban Heights', town: 'JURONG EAST', classification: 'STANDARD',
    launch: '2025-10', waitMonths: 48, totalUnits: 638, sourceUrl: OCT_2025, verified: true,
    flats: [flexi1(36, 40, 145000, 186000), flexi2(107, 49, 176000, 232000),
      flat('3 ROOM', 107, 69, 254000, 373000), flat('4 ROOM', 210, 94, 397000, 539000),
      flat('5 ROOM', 142, 114, 576000, 740000), flat('MULTI-GENERATION', 36, 121, 613000, 738000)],
  },
  {
    id: 'fernvale-plains', name: 'Fernvale Plains', town: 'SENGKANG', classification: 'STANDARD',
    launch: '2025-10', waitMonths: 32, totalUnits: 1037, sourceUrl: OCT_2025, verified: true,
    excludedUnits: 207, // Community Care Apartments, left out (see notes at the top)
    flats: [flexi1(25, 41, 162000, 204000), flexi2(75, 49, 195000, 244000),
      flat('4 ROOM', 368, 94, 344000, 472000), flat('5 ROOM', 362, 113, 466000, 617000)],
  },
  {
    id: 'mount-pleasant-crest', name: 'Mount Pleasant Crest', town: 'TOA PAYOH', classification: 'PRIME',
    launch: '2025-10', waitMonths: 59, totalUnits: 1348, sourceUrl: OCT_2025, verified: true,
    flats: [flexi1(152, 40, 209000, 297000), flexi2(389, 48, 250000, 373000),
      flat('3 ROOM', 98, 67, 411000, 552000), flat('4 ROOM', 709, 89, 558000, 787000)],
  },
  {
    id: 'chencharu-grove', name: 'Chencharu Grove', town: 'YISHUN', classification: 'STANDARD',
    launch: '2025-10', waitMonths: 31, totalUnits: 826, sourceUrl: OCT_2025, verified: true,
    flats: [flexi1(56, 40, 154000, 192000), flexi2(177, 48, 182000, 226000),
      flat('3 ROOM', 81, 69, 295000, 362000), flat('4 ROOM', 276, 93, 358000, 439000),
      flat('5 ROOM', 236, 113, 510000, 597000)],
  },
  {
    id: 'yishun-glade', name: 'Yishun Glade', town: 'YISHUN', classification: 'STANDARD',
    launch: '2025-10', waitMonths: 31, totalUnits: 569, sourceUrl: OCT_2025, verified: true,
    flats: [flexi1(238, 38, 132000, 166000), flexi2(168, 48, 168000, 217000),
      flat('4 ROOM', 163, 93, 343000, 415000)],
  },

  // ---- July 2025 ----
  {
    id: 'alexandra-peaks', name: 'Alexandra Peaks', town: 'BUKIT MERAH', classification: 'PRIME',
    launch: '2025-07', waitMonths: 56, totalUnits: 498, sourceUrl: JUL_2025, verified: true,
    flats: [flat('3 ROOM', 76, 66, 403000, 511000), flat('4 ROOM', 422, 89, 560000, 771000)],
  },
  {
    id: 'alexandra-vista', name: 'Alexandra Vista', town: 'BUKIT MERAH', classification: 'PRIME',
    launch: '2025-07', waitMonths: 47, totalUnits: 609, sourceUrl: JUL_2025, verified: true,
    flats: [flexi1(62, 40, 205000, 294000), flexi2(186, 48, 266000, 355000),
      flat('3 ROOM', 93, 67, 420000, 518000), flat('4 ROOM', 268, 90, 547000, 775000)],
  },
  {
    id: 'bangkit-breeze', name: 'Bangkit Breeze', town: 'BUKIT PANJANG', classification: 'STANDARD',
    launch: '2025-07', waitMonths: 35, totalUnits: 643, sourceUrl: JUL_2025, verified: true,
    flats: [flexi1(24, 41, 149000, 201000), flexi2(96, 49, 180000, 236000),
      flat('3 ROOM', 96, 69, 289000, 367000), flat('4 ROOM', 239, 94, 362000, 458000),
      flat('5 ROOM', 188, 114, 518000, 599000)],
  },
  {
    id: 'clementi-emerald', name: 'Clementi Emerald', town: 'CLEMENTI', classification: 'PRIME',
    launch: '2025-07', waitMonths: 34, totalUnits: 753, sourceUrl: JUL_2025, verified: true,
    flats: [flexi1(66, 41, 214000, 289000), flexi2(156, 49, 261000, 351000),
      flat('3 ROOM', 111, 67, 388000, 512000), flat('4 ROOM', 420, 90, 562000, 780000)],
  },
  {
    id: 'sembawang-beacon', name: 'Sembawang Beacon', town: 'SEMBAWANG', classification: 'STANDARD',
    launch: '2025-07', waitMonths: 36, totalUnits: 775, sourceUrl: JUL_2025, verified: true,
    flats: [flexi1(32, 40, 148000, 173000), flexi2(136, 48, 167000, 207000),
      flat('3 ROOM', 84, 69, 267000, 323000), flat('4 ROOM', 286, 94, 328000, 413000),
      flat('5 ROOM', 203, 114, 487000, 586000), flat('MULTI-GENERATION', 34, 120, 497000, 585000)],
  },
  {
    id: 'simei-symphony', name: 'Simei Symphony', town: 'TAMPINES', classification: 'STANDARD',
    launch: '2025-07', waitMonths: 42, totalUnits: 380, sourceUrl: JUL_2025, verified: true,
    flats: [flexi1(40, 40, 193000, 234000), flexi2(100, 48, 223000, 280000),
      flat('4 ROOM', 140, 93, 529000, 625000), flat('5 ROOM', 100, 113, 658000, 763000)],
  },
  {
    id: 'toa-payoh-ascent', name: 'Toa Payoh Ascent', town: 'TOA PAYOH', classification: 'PRIME',
    launch: '2025-07', waitMonths: 41, totalUnits: 741, sourceUrl: JUL_2025, verified: true,
    flats: [flexi1(39, 38, 212000, 272000), flexi2(156, 48, 258000, 354000),
      flat('3 ROOM', 78, 66, 406000, 514000), flat('4 ROOM', 468, 89, 583000, 777000)],
  },
  {
    id: 'woodlands-north-grove', name: 'Woodlands North Grove', town: 'WOODLANDS', classification: 'STANDARD',
    launch: '2025-07', waitMonths: 55, totalUnits: 1148, sourceUrl: JUL_2025, verified: true,
    flats: [flexi1(64, 40, 160000, 210000), flexi2(164, 48, 184000, 250000),
      flat('3 ROOM', 88, 69, 305000, 389000), flat('4 ROOM', 420, [93, 96], 388000, 544000),
      flat('5 ROOM', 412, [113, 116], 517000, 714000)],
  },
];