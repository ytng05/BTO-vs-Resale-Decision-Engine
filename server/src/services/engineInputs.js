// SEAT 1. Turns a POST /api/compare or /api/timing request (CompareRequest in engine/evaluate.contract.js)
// into the engine's Profile / Choice / Assumptions. All lookups happen here, so the engine stays pure:
// BTO price, wait and clawback rate from seat 3's project seed (D7, D18, D26); resale price and BTO market
// value from data.gov.sg medians (D16, D33); loan, fee and horizon defaults (D17, D22, D33).
// Money is integer cents throughout (D14).
import { btoTowns, findBtoProjects, getBtoProject } from './btoProjects.js';
import { getResalePriceBasis, NEARBY_TOWNS, TOWNS, SUPPORTED_FLAT_TYPES } from './datagov/resalePrice.js';

// D33 defaults. Estimates, not policy, so not in the ruleset (D17); echoed in the response.
export const FEE_DEFAULTS = {
  RESALE: { legalFeesCents: 250000, agentFeesCents: 500000 },
  BTO: { legalFeesCents: 200000, agentFeesCents: 0 },
};
export const DEFAULT_LOAN_TENURE_YEARS = 25;
export const DEFAULT_LOAN_TYPE = 'HDB';
export const PRICE_WINDOW_MONTHS = 12;
export const NEAR_NEW_MIN_LEASE_YEARS = 90;
// D41: fewer near-new sales than this in the BTO town, and its nearby towns' are pooled in.
export const MIN_NEAR_NEW_SALES = 5;
export const HORIZON_YEARS_AFTER_KEYS = 10;
// Heatmap axes (D33, agreed on #45): price growth −2% to +6% a year (prices can fall), income growth 0% to 5%,
// in 1-point steps. stepsCovering() widens an axis so the user's own rate always falls inside it.
export const PRICE_GROWTH_STEPS = [-0.02, -0.01, 0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06];
export const INCOME_GROWTH_STEPS = [0, 0.01, 0.02, 0.03, 0.04, 0.05];
export const MAX_YEARS_AHEAD = 20;

/**
 * steps, extended in 1-point steps until value lies between the first and last step. Works in whole
 * percentage points so added steps are exact (0.07, not 0.07000000000000001).
 */
export function stepsCovering(steps, value) {
  const points = steps.map((s) => Math.round(s * 100));
  const lowest = Math.floor(value * 100 + 1e-9);
  const highest = Math.ceil(value * 100 - 1e-9);
  for (let p = points[0] - 1; p >= lowest; p -= 1) points.unshift(p);
  for (let p = points.at(-1) + 1; p <= highest; p += 1) points.push(p);
  return points.map((p) => p / 100);
}

/** A request the engine can't take: the route answers 400 VALIDATION_ERROR with this message. */
export class InputError extends Error {}
/** data.gov.sg unreachable with nothing cached: the route answers 503 DATA_UNAVAILABLE. */
export class DataUnavailableError extends Error {}

const isCents = (n) => Number.isSafeInteger(n) && n >= 0;
const isYear = (n) => Number.isInteger(n);
const fail = (message) => { throw new InputError(message); };

/** Profile checks (D21). The engine checks scope too; these give the client field-level messages. */
export function validateProfile(profile) {
  if (!profile || typeof profile !== 'object') fail('profile is required.');
  const { applicants, cashSavingsCents, constraints } = profile;
  if (!Array.isArray(applicants) || applicants.length !== 2) fail('profile.applicants must list exactly two buyers (D21).');
  applicants.forEach((a, i) => {
    const at = `profile.applicants[${i}]`;
    if (!Number.isInteger(a?.age) || a.age < 21 || a.age > 100) fail(`${at}.age must be a whole number of years from 21.`);
    if (a.citizenship !== 'SC' && a.citizenship !== 'PR') fail(`${at}.citizenship must be 'SC' or 'PR'.`);
    if (typeof a.firstTimer !== 'boolean') fail(`${at}.firstTimer must be true or false.`);
    if (!isCents(a.monthlyIncomeCents)) fail(`${at}.monthlyIncomeCents must be a non-negative integer number of cents.`);
    if (!isCents(a.cpfOaBalanceCents)) fail(`${at}.cpfOaBalanceCents must be a non-negative integer number of cents.`);
  });
  if (!applicants.some((a) => a.citizenship === 'SC')) fail('At least one buyer must be a Singapore Citizen (D21).');
  if (!isCents(cashSavingsCents)) fail('profile.cashSavingsCents must be a non-negative integer number of cents.');
  const moveIn = constraints?.moveInByYear;
  if (moveIn !== undefined && moveIn !== null && !isYear(moveIn)) fail('profile.constraints.moveInByYear must be a year.');
}

/** '80-89' -> { minLeaseYears: 80, maxLeaseYears: 89 } (D16). */
export function parseLeaseBand(band) {
  const m = /^(\d{2})-(\d{2})$/.exec(String(band ?? ''));
  const min = m && Number(m[1]);
  const max = m && Number(m[2]);
  if (!m || max < min || min < 20 || max > 99) fail("leaseBand must look like '80-89' (D16).");
  return { minLeaseYears: min, maxLeaseYears: max };
}

/** A resale median, with the lease filter it used and, if that band had no sales, the whole town instead. */
async function resaleMedian({ town, flatType, minLeaseYears, maxLeaseYears, getResale, what }) {
  const fetchBasis = async (lease) => {
    try {
      return await getResale({ town, flatType, months: PRICE_WINDOW_MONTHS, ...lease });
    } catch (err) {
      throw new DataUnavailableError(`Resale prices for ${town} ${flatType} are unavailable right now (${err.message}).`);
    }
  };
  let basis = await fetchBasis({ minLeaseYears, maxLeaseYears });
  let fellBackToAllLeases = false;
  if (!basis.count && (minLeaseYears !== undefined || maxLeaseYears !== undefined)) {
    basis = await fetchBasis({});
    fellBackToAllLeases = true;
  }
  if (!basis.count) {
    fail(`No ${flatType} resale transactions in ${town} in the last ${PRICE_WINDOW_MONTHS} months to set ${what}.`);
  }
  return {
    cents: basis.medianPriceCents,
    data: {
      source: basis.source?.name,
      window: basis.window,
      transactions: basis.count,
      leaseFilter: fellBackToAllLeases ? null : (basis.leaseFilter ?? null),
      fellBackToAllLeases,
      lowSample: Boolean(basis.lowSample),
      stale: Boolean(basis.stale),
      fetchedAt: basis.fetchedAt,
    },
  };
}

/**
 * The BTO flat's market value at keys (D33, D41): the median of near-new sales (90+ years left) of the flat type,
 * in the town if it has at least MIN_NEAR_NEW_SALES, else pooled with its nearby towns (NEARBY_TOWNS). Never the
 * whole town's median: old leases sell far lower, which would understate every BTO. Too few even pooled -> 400.
 */
async function btoMarketValue({ town, flatType, getResale }) {
  const nearNew = { minLeaseYears: NEAR_NEW_MIN_LEASE_YEARS };
  const fetchBasis = async (where) => {
    try {
      return await getResale({ ...where, flatType, months: PRICE_WINDOW_MONTHS, ...nearNew });
    } catch (err) {
      throw new DataUnavailableError(`Resale prices for ${where.town ?? where.towns.join(', ')} ${flatType} are unavailable right now (${err.message}).`);
    }
  };
  // A BTO town with no resale stock yet (e.g. Tengah) is not a dataset town, so it is never asked for.
  let towns = TOWNS.includes(town) ? [town] : [];
  let basis = towns.length ? await fetchBasis({ town }) : { count: 0 };
  if ((basis.count ?? 0) < MIN_NEAR_NEW_SALES) {
    towns = [town, ...(NEARBY_TOWNS[town] ?? [])].filter((t) => TOWNS.includes(t));
    if (towns.length) basis = await fetchBasis({ towns });
  }
  if ((basis.count ?? 0) < MIN_NEAR_NEW_SALES) {
    const searched = [town, ...(NEARBY_TOWNS[town] ?? [])].join(', ');
    fail(`Too few near-new ${flatType} resale sales in ${searched} in the last ${PRICE_WINDOW_MONTHS} months to set the BTO flat's market value (D41).`);
  }
  return {
    cents: basis.medianPriceCents,
    data: {
      source: basis.source?.name,
      window: basis.window,
      transactions: basis.count,
      leaseFilter: basis.leaseFilter ?? nearNew,
      fellBackToAllLeases: false,
      towns, // which towns' sales set the value
      fellBackToNearbyTowns: towns.length !== 1 || towns[0] !== town,
      lowSample: Boolean(basis.lowSample),
      stale: Boolean(basis.stale),
      fetchedAt: basis.fetchedAt,
    },
  };
}

/** The project a BTO choice uses (D7, D26): the one picked, else the town's newest offering the flat type. */
function pickProject(req) {
  if (req.btoProjectId !== undefined && req.btoProjectId !== null) {
    const project = getBtoProject(req.btoProjectId);
    if (!project) fail(`btoProjectId '${req.btoProjectId}' is not a seeded BTO project.`);
    if (project.town !== req.town) fail(`BTO project '${project.id}' is in ${project.town}, not ${req.town}.`);
    const flat = project.flats.find((f) => f.flatType === req.flatType);
    if (!flat) fail(`BTO project '${project.id}' has no ${req.flatType} flats.`);
    return { project, flat };
  }
  const [project] = findBtoProjects({ town: req.town, flatType: req.flatType, classification: req.classification ?? undefined });
  if (!project) fail(`No recent BTO launch in ${req.town} offers ${req.classification ? `${req.classification} ` : ''}${req.flatType} flats.`);
  return { project, flat: project.flats[0] };
}

/**
 * One RequestChoice -> the engine Choice, plus what the route echoes back.
 * @returns {Promise<{ choice: object, keyYear: number, btoProject: object|null, resolved: object }>}
 */
export async function resolveChoice(req, { startYear, assumptions = {}, ruleset, getResale = getResalePriceBasis, label = 'choice' }) {
  if (!req || typeof req !== 'object') fail(`${label} is required.`);
  const { path, applicationYear, town, flatType } = req;
  if (path !== 'BTO' && path !== 'RESALE') fail(`${label}.path must be 'BTO' or 'RESALE'.`);
  if (!isYear(applicationYear) || applicationYear < startYear || applicationYear > startYear + MAX_YEARS_AHEAD) {
    fail(`${label}.applicationYear must be a year from ${startYear} to ${startYear + MAX_YEARS_AHEAD}.`);
  }
  // BTO towns come from the project seed (a launch can be in a town with no resale data); resale towns from data.gov.sg.
  if (path === 'BTO' && !btoTowns().includes(town)) {
    fail(`${label}.town: No recent BTO launch in ${town}. BTO towns: ${btoTowns().join(', ')}.`);
  }
  if (path === 'RESALE' && !TOWNS.includes(town)) fail(`${label}.town must be an HDB town, e.g. TAMPINES.`);
  if (!SUPPORTED_FLAT_TYPES.includes(flatType)) fail(`${label}.flatType must be one of ${SUPPORTED_FLAT_TYPES.join(', ')} (D27).`);
  const renovationCents = req.renovationCents ?? 0;
  if (!isCents(renovationCents)) fail(`${label}.renovationCents must be a non-negative integer number of cents.`);

  // Fees: the request's own figure applies to both paths; otherwise this path's default (D17, D33).
  const fees = {
    legalFeesCents: assumptions.legalFeesCents ?? FEE_DEFAULTS[path].legalFeesCents,
    agentFeesCents: assumptions.agentFeesCents ?? FEE_DEFAULTS[path].agentFeesCents,
  };

  if (path === 'RESALE') {
    const lease = parseLeaseBand(req.leaseBand);
    const living = req.livingArrangement ?? 'NONE';
    if (!['WITH', 'NEAR', 'NONE'].includes(living)) fail(`${label}.livingArrangement must be 'WITH', 'NEAR' or 'NONE'.`);
    const price = await resaleMedian({ town, flatType, ...lease, getResale, what: 'the resale price' });
    const choice = {
      path, applicationYear, town, flatType, classification: null,
      purchasePriceCents: price.cents,
      marketValueAtKeysCents: price.cents,
      remainingLeaseYears: lease.minLeaseYears,
      livingArrangement: living,
      renovationCents,
      ...fees,
    };
    return {
      choice,
      keyYear: applicationYear,
      btoProject: null,
      resolved: { purchasePriceCents: price.cents, marketValueAtKeysCents: price.cents, remainingLeaseYears: lease.minLeaseYears, ...fees, priceData: price.data },
    };
  }

  // BTO
  const { project, flat } = pickProject(req);
  if (req.classification && req.classification !== project.classification) {
    fail(`${label}.classification is ${req.classification} but project '${project.id}' is ${project.classification}.`);
  }
  let purchasePriceCents = Math.round((flat.priceMinCents + flat.priceMaxCents) / 2); // midpoint by default (D26)
  if (req.btoPriceCents !== undefined && req.btoPriceCents !== null) {
    if (!isCents(req.btoPriceCents) || req.btoPriceCents < flat.priceMinCents || req.btoPriceCents > flat.priceMaxCents) {
      fail(`${label}.btoPriceCents must lie within ${project.name}'s ${flatType} range, ${flat.priceMinCents} to ${flat.priceMaxCents} cents (D26).`);
    }
    purchasePriceCents = req.btoPriceCents;
  }
  let btoWaitMonths = req.btoWaitMonths ?? project.waitMonths;
  let btoWaitAssumed = false;
  if (btoWaitMonths === null || btoWaitMonths === undefined) {
    btoWaitMonths = ruleset.btoWaiting.defaultMonths; // D7 fallback, flagged
    btoWaitAssumed = true;
  }
  if (!Number.isInteger(btoWaitMonths) || btoWaitMonths < 0 || btoWaitMonths > 120) {
    fail(`${label}.btoWaitMonths must be a whole number of months from 0 to 120.`);
  }
  const value = await btoMarketValue({ town, flatType, getResale });
  const choice = {
    path, applicationYear, town, flatType,
    classification: project.classification,
    purchasePriceCents,
    marketValueAtKeysCents: value.cents,
    remainingLeaseYears: 99, // D16
    btoWaitMonths,
    ...(btoWaitAssumed ? { btoWaitAssumed } : {}),
    subsidyRecoveryRate: project.subsidyRecoveryRate, // D18
    renovationCents,
    ...fees,
  };
  return {
    choice,
    keyYear: applicationYear + Math.floor(btoWaitMonths / 12), // keys = 1 Jan of application + wait (D22)
    btoProject: {
      id: project.id, name: project.name, launch: project.launch, waitMonths: project.waitMonths,
      priceMinCents: flat.priceMinCents, priceMaxCents: flat.priceMaxCents, sourceUrl: project.sourceUrl,
    },
    resolved: {
      purchasePriceCents, marketValueAtKeysCents: value.cents, remainingLeaseYears: 99, btoWaitMonths, btoWaitAssumed,
      subsidyRecoveryRate: project.subsidyRecoveryRate, ...fees, marketValueData: value.data,
    },
  };
}

/** RequestAssumptions -> engine Assumptions (D22, D33). keyYears: each path's key year, for the default horizon. */
export function resolveAssumptions(req, { startYear, keyYears }) {
  if (!req || typeof req !== 'object') fail('assumptions is required.');
  for (const k of ['annualPriceGrowth', 'annualIncomeGrowth']) {
    if (typeof req[k] !== 'number' || !Number.isFinite(req[k]) || req[k] < -0.2 || req[k] > 0.2) {
      fail(`assumptions.${k} must be a decimal growth rate between -0.2 and 0.2, e.g. 0.03.`);
    }
  }
  const horizonYear = req.horizonYear ?? Math.max(...keyYears) + HORIZON_YEARS_AFTER_KEYS;
  if (!isYear(horizonYear)) fail('assumptions.horizonYear must be a year.');
  const late = keyYears.find((y) => y > horizonYear);
  if (late !== undefined) fail(`assumptions.horizonYear (${horizonYear}) is before a path's keys (${late}); both paths must have keys by then (D22).`);
  const rent = req.monthlyHousingCostWhileWaitingCents ?? 0;
  if (!isCents(rent)) fail('assumptions.monthlyHousingCostWhileWaitingCents must be a non-negative integer number of cents.');
  const loanTenureYears = req.loanTenureYears ?? DEFAULT_LOAN_TENURE_YEARS;
  if (!Number.isInteger(loanTenureYears) || loanTenureYears < 5 || loanTenureYears > 35) fail('assumptions.loanTenureYears must be a whole number of years from 5 to 35.');
  for (const k of ['legalFeesCents', 'agentFeesCents']) {
    if (req[k] !== undefined && req[k] !== null && !isCents(req[k])) fail(`assumptions.${k} must be a non-negative integer number of cents.`);
  }
  return {
    annualPriceGrowth: req.annualPriceGrowth,
    annualIncomeGrowth: req.annualIncomeGrowth,
    horizonYear,
    monthlyHousingCostWhileWaitingCents: rent,
    loanTenureYears,
    loanType: req.loanType ?? DEFAULT_LOAN_TYPE,
    evaluationStartYear: startYear,
  };
}
