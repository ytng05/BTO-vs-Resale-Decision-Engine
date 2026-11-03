// Allowed values for the plan forms (Situation, Path A, Path B).
//
// Town and flat type values must match the data.gov.sg resale dataset
// (d_8b84c4ee58e3cfc0ece0d773c8ca6abc) character for character, because seat 3
// looks prices up by these strings. Check them against server/src/engine/evaluate.contract.js
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

// 3-, 4- and 5-room only, on both paths (D27). The API returns 400 for any other flat type.
export const FLAT_TYPES = [
  { value: '3 ROOM', label: '3-room' },
  { value: '4 ROOM', label: '4-room' },
  { value: '5 ROOM', label: '5-room' },
];

// Same list for BTO (kept as its own name so the forms and validation read clearly).
export const BTO_FLAT_TYPES = FLAT_TYPES;

export const CLASSIFICATIONS = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'PLUS', label: 'Plus' },
  { value: 'PRIME', label: 'Prime' },
];

export const CITIZENSHIPS = [
  { value: 'SC', label: 'Singapore Citizen' },
  { value: 'PR', label: 'Permanent Resident' },
];

// The contract models exactly two buyers, at least one a Singapore Citizen
// (singles and PR + PR households are not modelled yet; API_CONTRACT.md, "Where each input comes from").
export const REQUIRED_APPLICANTS = 2;
export const MAX_APPLICANTS = 2;

// Where the buyers will live relative to their parents (RequestChoice.livingArrangement).
// Resale only (D15): the Proximity Housing Grant is declared, not measured.
export const LIVING_ARRANGEMENTS = [
  { value: 'NONE', label: 'Neither' },
  { value: 'WITH', label: 'Live with my parents' },
  { value: 'NEAR', label: 'Live near my parents' },
];

// Resale remaining-lease bands (RequestChoice.leaseBand). The route uses each band's lower bound
// as remainingLeaseYears (D16). Values must match what the server expects.
export const LEASE_BANDS = [
  { value: '90-99', label: '90 to 99 years' },
  { value: '80-89', label: '80 to 89 years' },
  { value: '70-79', label: '70 to 79 years' },
  { value: '60-69', label: '60 to 69 years' },
  { value: '50-59', label: '50 to 59 years' },
];

// Official source for the "rent while waiting" guide shown beside that input.
export const RENT_GUIDE_URL = 'https://data.gov.sg/collections/156/view'; // HDB: Median Rent by Town and Flat Type

// Shape of one buyer in store.profile.applicants. Matches Profile.applicants in evaluate.contract.js.
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

export function toTitleCase(s) {
  return s
    .toLowerCase()
    .replace(/(^|[\s/])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase());
}
// "What matters most" picks the results teaser (PreviewView) has an engine figure for: keys year, cash at purchase,
// loan amount. The others (near my parents, more space, good resale value) point to the full comparison instead.
export const PREVIEW_WISHES = ['moveby', 'cash', 'monthly'];

// The year a BTO's keys come: the application (1 January) plus HDB's waiting time for the launch, in whole years
// (D7). Used by the Your BTO card ("keys around 2031") and the scene's bubble ("Keys in 2031"), so they agree.
export function btoKeysYear(applicationYear, waitMonths) {
  return typeof waitMonths === 'number' && Number.isInteger(applicationYear) ? applicationYear + Math.floor(waitMonths / 12) : null;
}
