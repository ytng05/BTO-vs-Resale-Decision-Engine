// Allowed values for the plan forms (Situation, Path A, Path B).
//
// Town and flat type values must match the data.gov.sg resale dataset
// (d_8b84c4ee58e3cfc0ece0d773c8ca6abc) character for character, because seat 3
// looks prices up by these strings. Check them against server/src/engine/types.js
// and the live dataset before merging.

export const TOWNS = [
  'ANG MO KIO',
  'BEDOK',
  'BISHAN',
  'BUKIT BATOK',
  'BUKIT MERAH',
  'BUKIT PANJANG',
  'BUKIT TIMAH',
  'CENTRAL AREA',
  'CHOA CHU KANG',
  'CLEMENTI',
  'GEYLANG',
  'HOUGANG',
  'JURONG EAST',
  'JURONG WEST',
  'KALLANG/WHAMPOA',
  'MARINE PARADE',
  'PASIR RIS',
  'PUNGGOL',
  'QUEENSTOWN',
  'SEMBAWANG',
  'SENGKANG',
  'SERANGOON',
  'TAMPINES',
  'TOA PAYOH',
  'WOODLANDS',
  'YISHUN',
].map((value) => ({ value, label: toTitleCase(value) }));

export const FLAT_TYPES = [
  { value: '2 ROOM', label: '2-room' },
  { value: '3 ROOM', label: '3-room' },
  { value: '4 ROOM', label: '4-room' },
  { value: '5 ROOM', label: '5-room' },
  { value: 'EXECUTIVE', label: 'Executive' },
];

// New BTO launches do not offer Executive flats.
export const BTO_FLAT_TYPES = FLAT_TYPES.filter((t) => t.value !== 'EXECUTIVE');

export const CLASSIFICATIONS = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'PLUS', label: 'Plus' },
  { value: 'PRIME', label: 'Prime' },
];

export const CITIZENSHIPS = [
  { value: 'SC', label: 'Singapore Citizen' },
  { value: 'PR', label: 'Permanent Resident' },
];

export const MAX_APPLICANTS = 2;

// Where the buyers will live relative to their parents (Choice.livingArrangement in
// server/src/engine/types.js). Used for the Proximity Housing Grant on resale.
export const LIVING_ARRANGEMENTS = [
  { value: 'NONE', label: 'Neither' },
  { value: 'WITH', label: 'Live with my parents' },
  { value: 'NEAR', label: 'Live near my parents' },
];

// Resale remaining-lease bands (Choice.leaseBand in evaluate.contract.js). The route uses each
// band's lower bound as remainingLeaseYears (D16). Values must match what the server expects.
export const LEASE_BANDS = [
  { value: '90-99', label: '90 to 99 years' },
  { value: '80-89', label: '80 to 89 years' },
  { value: '70-79', label: '70 to 79 years' },
  { value: '60-69', label: '60 to 69 years' },
  { value: '50-59', label: '50 to 59 years' },
];

// Shape of one buyer in store.profile.applicants. Matches Person in server/src/engine/types.js.
let nextApplicantId = 1;

export function blankApplicant() {
  return {
    id: `applicant-${nextApplicantId++}`,
    age: null,
    // Defaults to the most common case (Singapore Citizen, first-timer) so a typical buyer
    // only has to fill in numbers, not toggle every field. Still fully editable per buyer.
    citizenship: 'SC',
    firstTimer: true,
    monthlyIncome: null,
    cpfOaBalance: null,
  };
}

function toTitleCase(s) {
  return s
    .toLowerCase()
    .replace(/(^|[\s/])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase());
}