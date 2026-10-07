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

// Shape of one buyer in store.profile.applicants.
// TODO: confirm these field names against server/src/engine/types.js.
export function blankApplicant() {
  return {
    age: null,
    citizenship: 'SC',
    firstTimer: true,
    monthlyIncome: null,
    cpfOA: null,
  };
}

function toTitleCase(s) {
  return s
    .toLowerCase()
    .replace(/(^|[\s/])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase());
}