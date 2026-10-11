// SEAT 3. ~20 BTO projects seeded BY HAND from HDB launch material. Do not invent data.
// Each record needs: name, town, classification, mopYears, subsidyRecoveryRate, sourceName, sourceAccessed.
// Run with `npm run seed -w server`

// export const btoProjects = [
//   // {
//   //   name: '...', town: '...', classification: 'STANDARD',
//   //   mopYears: null, subsidyRecoveryRate: 0,
//   //   sourceName: 'HDB BTO launch, <month year>', sourceUrl: '...', sourceAccessed: '2026-09-21',
//   // },
// ];

const FEB_2026_SOURCE = {
  sourceName: 'HDB BTO launch, February 2026',
  sourceUrl:
    'https://www.hdb.gov.sg/hdb-pulse/news/2026/hdb-launches-9012-flats-in-february-2026-bto-and-sbf-exercises',
  sourceAccessed: '2026-10-07',
};

export const btoProjects = [
  // ---------- Standard ----------
  {
    name: 'Sembawang Voyage',
    town: 'SEMBAWANG',
    classification: 'STANDARD',
    mopYears: 5,
    subsidyRecoveryRate: 0,
    launchDate: '2026-02-04',
    estimatedWaitMonths: 44,
    // estimated waiting time: 44 months
    flats: [
      { flatType: '2 ROOM', indicativePriceLow: 150000, indicativePriceHigh: 228000 },
      { flatType: '4 ROOM', indicativePriceLow: 304000, indicativePriceHigh: 422000 },
      { flatType: '5 ROOM', indicativePriceLow: 439000, indicativePriceHigh: 582000 },
    ],
    ...FEB_2026_SOURCE,
  },
  {
    name: 'Sembawang Deck',
    town: 'SEMBAWANG',
    classification: 'STANDARD',
    mopYears: 5,
    subsidyRecoveryRate: 0,
    launchDate: '2026-02-04',
    estimatedWaitMonths: 33,
    // estimated waiting time: 33 months. Prices include floor finishes, internal doors, sanitary fittings.
    flats: [
      { flatType: '2 ROOM', indicativePriceLow: 158000, indicativePriceHigh: 237000 },
      { flatType: '3 ROOM', indicativePriceLow: 261000, indicativePriceHigh: 343000 },
      { flatType: '4 ROOM', indicativePriceLow: 338000, indicativePriceHigh: 426000 },
      { flatType: '5 ROOM', indicativePriceLow: 479000, indicativePriceHigh: 585000 },
    ],
    ...FEB_2026_SOURCE,
  },
  {
    name: 'Tampines Bliss',
    town: 'TAMPINES',
    classification: 'STANDARD',
    mopYears: 5,
    subsidyRecoveryRate: 0,
    launchDate: '2026-02-04',
    estimatedWaitMonths: 23,
    // estimated waiting time: 23 months. Prices include floor finishes, internal doors, sanitary fittings.
    flats: [
      { flatType: '3 ROOM', indicativePriceLow: 363000, indicativePriceHigh: 444000 },
      { flatType: '4 ROOM', indicativePriceLow: 481000, indicativePriceHigh: 600000 },
    ],
    ...FEB_2026_SOURCE,
  },

  // ---------- Plus ----------
  {
    name: 'Tampines Nova',
    town: 'TAMPINES',
    classification: 'PLUS',
    mopYears: 10,
    subsidyRecoveryRate: 0.06,
    launchDate: '2026-02-04',
    estimatedWaitMonths: 32,
    // estimated waiting time: 32 months. Prices include floor finishes, internal doors, sanitary fittings.
    flats: [
      { flatType: '2 ROOM', indicativePriceLow: 197000, indicativePriceHigh: 292000 },
      { flatType: '4 ROOM', indicativePriceLow: 459000, indicativePriceHigh: 602000 },
    ],
    ...FEB_2026_SOURCE,
  },
  {
    name: 'Kim Keat Crest',
    town: 'TOA PAYOH',
    classification: 'PLUS',
    mopYears: 10,
    subsidyRecoveryRate: 0.06,
    launchDate: '2026-02-04',
    estimatedWaitMonths: 37,
    // estimated waiting time: 37 months
    flats: [
      { flatType: '2 ROOM', indicativePriceLow: 203000, indicativePriceHigh: 304000 },
      { flatType: '3 ROOM', indicativePriceLow: 356000, indicativePriceHigh: 450000 },
      { flatType: '4 ROOM', indicativePriceLow: 455000, indicativePriceHigh: 624000 },
    ],
    ...FEB_2026_SOURCE,
  },

  // ---------- Prime ----------
  {
    name: 'Redhill Peaks',
    town: 'BUKIT MERAH',
    classification: 'PRIME',
    mopYears: 10,
    subsidyRecoveryRate: 0.12,
    launchDate: '2026-02-04',
    estimatedWaitMonths: 55,
    // estimated waiting time: 55 months. This is the 2nd parcel (1,052 units); the 1st was launched Oct 2025.
    flats: [
      { flatType: '2 ROOM', indicativePriceLow: 215000, indicativePriceHigh: 373000 },
      { flatType: '3 ROOM', indicativePriceLow: 385000, indicativePriceHigh: 537000 },
      { flatType: '4 ROOM', indicativePriceLow: 563000, indicativePriceHigh: 783000 },
    ],
    ...FEB_2026_SOURCE,
  },
];