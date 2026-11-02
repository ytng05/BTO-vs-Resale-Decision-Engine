// Engine-backed routes. Handlers call the pure engine functions in ../engine and return the shapes
// in docs/API_CONTRACT.md. One request returns the WHOLE result (e.g. the whole heatmap grid),
// not one request per cell.
import { Router } from 'express';
import { features } from '../config/features.js';
import { notImplemented } from '../middleware/notImplemented.js';
import { loadRuleset } from '../engine/rules/loadRuleset.js';
import { computeAccruedInterest } from '../engine/cpf/accruedInterest.js';
import { computeBuyerStampDuty } from '../engine/costs/transactionCosts.js';
import { evaluate } from '../engine/index.js';
import { explainGap } from '../engine/explainGap.js';
import { solveBreakEven } from '../engine/solvers/breakEven.js';
import { solveBtoPriceBreakEven } from '../engine/solvers/btoPriceBreakEven.js';
import { optimiseTiming } from '../engine/solvers/timingOptimiser.js';
import { getResalePriceBasis } from '../services/datagov/resalePrice.js';
import {
  validateProfile, resolveChoice, resolveAssumptions, InputError, DataUnavailableError,
  PRICE_GROWTH_STEPS, INCOME_GROWTH_STEPS, MAX_YEARS_AHEAD, stepsCovering,
} from '../services/engineInputs.js';
import { warningMessagesFor } from '../services/warningMessages.js';

const router = Router();

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isCents = (n) => Number.isSafeInteger(n) && n >= 0;
const badRequest = (res, message) =>
  res.status(400).json({ error: { code: 'VALIDATION_ERROR', message } });

// Seat 1. CPF accrued interest owed back to the OA at a given date (D2, D12). Money in integer cents.
// Body: { withdrawals: [{ date: 'YYYY-MM-DD', amountCents, kind? }], asOfDate: 'YYYY-MM-DD' }
router.post('/cpf/accrued-interest', (req, res) => {
  const { withdrawals, asOfDate } = req.body ?? {};
  if (!Array.isArray(withdrawals)) return badRequest(res, 'withdrawals must be an array.');
  if (typeof asOfDate !== 'string' || !ISO_DATE.test(asOfDate)) {
    return badRequest(res, "asOfDate must be a date in 'YYYY-MM-DD' format.");
  }
  for (const [i, w] of withdrawals.entries()) {
    if (typeof w?.date !== 'string' || !ISO_DATE.test(w.date)) {
      return badRequest(res, `withdrawals[${i}].date must be a date in 'YYYY-MM-DD' format.`);
    }
    if (!isCents(w.amountCents)) {
      return badRequest(res, `withdrawals[${i}].amountCents must be a non-negative integer number of cents.`);
    }
  }

  const { ruleset, version, status } = loadRuleset();
  const cpf = ruleset.cpf ?? {};
  if (typeof cpf.oaInterestRate !== 'number' || cpf.accruedInterestCompounding !== 'ANNUAL') {
    return res.status(503).json({
      error: {
        code: 'RULESET_UNAVAILABLE',
        message: `Ruleset ${version} has no verified CPF OA rate and ANNUAL compounding yet.`,
      },
    });
  }

  const ledger = withdrawals.map(({ date, amountCents, kind = 'WITHDRAWAL' }) => ({ date, amountCents, kind }));
  let result;
  try {
    result = computeAccruedInterest(ledger, asOfDate, ruleset);
  } catch (err) {
    // The engine rejects inputs it can't model (e.g. a withdrawal dated after asOfDate).
    return badRequest(res, err.message);
  }

  return res.json({
    ...result,
    asOfDate,
    oaRate: cpf.oaInterestRate,
    accruedInterestCompounding: cpf.accruedInterestCompounding,
    rulesetVersion: version,
    rulesetStatus: status,
  });
});

// Seat 1. Buyer's stamp duty on a purchase price (D20: marginal bands, floored to the dollar, $1 minimum).
// Body: { priceCents }
router.post('/stamp-duty', (req, res) => {
  const { priceCents } = req.body ?? {};
  if (!Number.isSafeInteger(priceCents) || priceCents <= 0) {
    return badRequest(res, 'priceCents must be a positive integer number of cents.');
  }

  const { ruleset, version, status } = loadRuleset();
  if (!Array.isArray(ruleset.transactionCosts?.buyerStampDutyTiers)) {
    return res.status(503).json({
      error: { code: 'RULESET_UNAVAILABLE', message: `Ruleset ${version} has no buyer's stamp duty tiers.` },
    });
  }

  return res.json({
    bsdCents: computeBuyerStampDuty(priceCents, ruleset),
    dutiableValueCents: priceCents,
    rulesetVersion: version,
    rulesetStatus: status,
  });
});

// The evaluation start year is the server's calendar year: the client never sends it (CompareRequest).
const currentYear = () => new Date().getFullYear();

// Engine and input errors -> 400; data.gov.sg down with nothing cached -> 503; anything else -> 500.
// evaluate() and the solvers throw RangeError for requests they can't model (scope, horizon, years).
function sendError(res, next, err) {
  if (err instanceof InputError || err instanceof RangeError) return badRequest(res, err.message);
  if (err instanceof DataUnavailableError) {
    return res.status(503).json({ error: { code: 'DATA_UNAVAILABLE', message: err.message } });
  }
  return next(err);
}

const pct = (g) => `${Math.round(g * 1000) / 10}%`;
const dollars = (cents) => `$${Math.round(Math.abs(cents) / 100).toLocaleString('en-SG')}`;
const pathName = (label, choice) => `Path ${label} (${choice.path === 'BTO' ? 'BTO' : 'resale'})`;

/**
 * One plain sentence for the heatmap (wording rules in API_CONTRACT.md: net financial position, never a
 * prediction). userRow is solveBreakEven() run on one row at the user's EXACT income growth (seat 5 on #61),
 * so the sentence is about their own rate, not the nearest grid row.
 */
export function breakEvenSentence({ grid, frontier }, userRow, { horizonYear, annualIncomeGrowth, nameA, nameB }) {
  const cells = grid.flat();
  const name = (w) => (w === 'A' ? nameA : nameB);
  const end = `at the end of ${horizonYear}`;
  const row = userRow.grid[0];
  if (userRow.frontier.length === 0 && frontier.length > 0) {
    // The break-even line exists, but not at the user's income growth: one path wins across their row.
    const winners = new Set(row.map((c) => c.winner).filter((w) => w !== 'TIE'));
    const prices = `price growth of ${pct(row[0].annualPriceGrowth)} to ${pct(row.at(-1).annualPriceGrowth)} a year`;
    const lead = winners.size === 1
      ? `With income growing ${pct(annualIncomeGrowth)} a year, ${name([...winners][0])} leaves the household with the higher net financial position ${end} at every ${prices} tested.`
      : `With income growing ${pct(annualIncomeGrowth)} a year, the two paths are level ${end} across ${prices}.`;
    return `${lead} The break-even line on the heatmap lies at other income growth rates. This is not a price forecast.`;
  }
  if (userRow.frontier.length === 0) {
    // No break-even line anywhere tested.
    const winners = new Set(cells.map((c) => c.winner));
    const range = `price growth of ${pct(cells[0].annualPriceGrowth)} to ${pct(cells.at(-1).annualPriceGrowth)} and income growth of ${pct(cells[0].annualIncomeGrowth)} to ${pct(cells.at(-1).annualIncomeGrowth)} a year`;
    if (winners.size === 1 && !winners.has('TIE')) {
      return `Under every combination tested (${range}), ${name([...winners][0])} leaves the household with the higher net financial position ${end}. This is not a price forecast.`;
    }
    return `Under the combinations tested (${range}), the two paths are level ${end}. This is not a price forecast.`;
  }
  const point = userRow.frontier[0];
  const above = row.find((c) => c.annualPriceGrowth > point.annualPriceGrowth && c.winner !== 'TIE')?.winner;
  const below = [...row].reverse().find((c) => c.annualPriceGrowth < point.annualPriceGrowth && c.winner !== 'TIE')?.winner;
  const sides = above && below && above !== below
    ? ` Above that, ${name(above)} comes out ahead; below it, ${name(below)} does.`
    : '';
  return `The two paths leave the household with the same net financial position ${end} along a break-even line. With income growing ${pct(annualIncomeGrowth)} a year, they are level at about ${pct(point.annualPriceGrowth)} price growth a year.${sides} This is not a price forecast.`;
}

// Seat 1. POST /api/compare: the whole break-even grid in one call, plus both paths' outcomes at the
// user's own growth rates (API_CONTRACT.md, D1).
router.post('/compare', async (req, res, next) => {
  try {
    const { profile, choiceA, choiceB, assumptions } = req.body ?? {};
    validateProfile(profile);
    const { ruleset, version } = loadRuleset();
    const startYear = currentYear();
    const opts = { startYear, assumptions: assumptions ?? {}, ruleset, getResale: getResalePriceBasis };
    const a = await resolveChoice(choiceA, { ...opts, label: 'choiceA' });
    const b = await resolveChoice(choiceB, { ...opts, label: 'choiceB' });
    const engineAssumptions = resolveAssumptions(assumptions, { startYear, keyYears: [a.keyYear, b.keyYear] });

    const outcomeA = evaluate(profile, a.choice, engineAssumptions, ruleset);
    const outcomeB = evaluate(profile, b.choice, engineAssumptions, ruleset);
    // Axes always include the user's own rates (D33), so their point is on the heatmap.
    const priceGrowthSteps = stepsCovering(PRICE_GROWTH_STEPS, engineAssumptions.annualPriceGrowth);
    const incomeGrowthSteps = stepsCovering(INCOME_GROWTH_STEPS, engineAssumptions.annualIncomeGrowth);
    const pair = { profile, choiceA: a.choice, choiceB: b.choice, assumptionsBase: engineAssumptions, ruleset };
    const surface = solveBreakEven({ ...pair, priceGrowthSteps, incomeGrowthSteps });
    // The sentence bisects at the user's exact income growth: reuse the grid row when it is one, else solve one more row.
    const userIncome = engineAssumptions.annualIncomeGrowth;
    const rowIndex = incomeGrowthSteps.indexOf(userIncome);
    const userRow = rowIndex >= 0
      ? { grid: [surface.grid[rowIndex]], frontier: surface.frontier.filter((p) => p.annualIncomeGrowth === userIncome) }
      : solveBreakEven({ ...pair, priceGrowthSteps, incomeGrowthSteps: [userIncome] });

    // D40: the BTO price at which the verdict flips, when path A is a BTO launch.
    const btoPriceBreakEven = a.choice.path === 'BTO' && a.btoProject
      ? solveBtoPriceBreakEven({
        profile, choiceA: a.choice, choiceB: b.choice, assumptions: engineAssumptions, ruleset,
        hdbRangeCents: { min: a.btoProject.priceMinCents, max: a.btoProject.priceMaxCents },
      })
      : null;

    return res.json({
      rulesetVersion: version,
      horizonYear: engineAssumptions.horizonYear,
      breakEvenSentence: breakEvenSentence(surface, userRow, {
        horizonYear: engineAssumptions.horizonYear,
        annualIncomeGrowth: engineAssumptions.annualIncomeGrowth,
        nameA: pathName('A', a.choice),
        nameB: pathName('B', b.choice),
      }),
      grid: surface.grid,
      frontier: surface.frontier,
      outcomeA,
      outcomeB,
      // Why one path ends ahead, line by line (D34). Both outcomes share one horizon, so this never throws.
      gapBreakdown: explainGap(outcomeA, outcomeB),
      // Plain-English text for the warning codes in either outcome.
      warningMessages: warningMessagesFor([...outcomeA.warnings, ...outcomeB.warnings]),
      btoProjectA: a.btoProject,
      btoProjectB: b.btoProject,
      btoPriceBreakEven,
      btoPriceSentence: btoPriceBreakEven && btoPriceSentence(btoPriceBreakEven, {
        horizonYear: engineAssumptions.horizonYear, flatType: a.choice.flatType, projectName: a.btoProject.name,
      }),
      assumptions: engineAssumptions, // with the server's defaults filled in (D17, D22)
      resolvedA: a.resolved,
      resolvedB: b.resolved,
    });
  } catch (err) {
    return sendError(res, next, err);
  }
});

/**
 * D40: one sentence on the BTO price at which the verdict flips, against HDB's range for the launch. Path A is
 * the BTO path. Prices are today's (D31), so they read against HDB's published range. "Under" a price rounded
 * DOWN to the $1,000, so the sentence never claims more than the solver found.
 */
export function btoPriceSentence(be, { horizonYear, flatType, projectName }) {
  const under = (cents) => dollars(Math.floor(cents / 100_000) * 100_000);
  const flat = String(flatType ?? '').toLowerCase().replace(' room', '-room');
  const end = `at the end of ${horizonYear}`;
  const hdb = `HDB's range for ${projectName} (${dollars(be.hdbRangeCents.min)} to ${dollars(be.hdbRangeCents.max)})`;
  const note = "Prices are in today's terms. This is not a price forecast.";
  if (be.atHdbMax !== 'B') {
    // BTO ahead, or level, even at HDB's maximum.
    const further = be.priceCents === null ? '' : `, and up to about ${under(be.priceCents)}`;
    return `BTO leaves the household with at least as high a net financial position as resale ${end} at any price in ${hdb}${further}. ${note}`;
  }
  if (be.atHdbMin === 'B') {
    // Resale ahead even at HDB's minimum.
    const needed = be.priceCents === null ? '' : ` The ${flat} would need to cost under ${under(be.priceCents)} for BTO to come out ahead.`;
    return `Resale leaves the household with the higher net financial position ${end} even at the cheapest price in ${hdb}.${needed} ${note}`;
  }
  return `BTO leaves the household with the higher net financial position ${end} as long as the ${flat} costs under ${under(be.priceCents)}; above that, resale does. That is inside ${hdb}. ${note}`;
}

/** Plain-language lines for the timing result (wording rules: "under these assumptions", never a forecast). */
export function timingExplanation({ best, all, skipped }, { horizonYear }) {
  const lines = [];
  const reasons = {
    MOVE_IN_DEADLINE_MISSED: 'keys come after the move-in year',
    CASH_SHORTFALL_AT_PURCHASE: "the cash needed at purchase is more than today's savings",
    INCOME_CEILING_BREACHED_AT_PURCHASE: 'household income would be above the new-flat ceiling',
  };
  if (!best) {
    lines.push('No application year in the range works under these assumptions.');
  } else {
    lines.push(`Under these assumptions, applying in ${best.year} gives the highest net financial position at the end of ${horizonYear}: ${best.outcome.netPositionCents < 0 ? '−' : ''}${dollars(best.outcome.netPositionCents)}.`);
    const runnerUp = all.filter((e) => e !== best).sort((x, y) => y.outcome.netPositionCents - x.outcome.netPositionCents)[0];
    if (runnerUp) {
      lines.push(`The next best year, ${runnerUp.year}, is ${dollars(best.outcome.netPositionCents - runnerUp.outcome.netPositionCents)} lower.`);
    }
    const grants = all.map((e) => e.outcome.totalGrantsCents);
    if (new Set(grants).size > 1) {
      lines.push(`Grants change with the year you apply, because income is projected forward: ${all.map((e) => `${dollars(e.outcome.totalGrantsCents)} in ${e.year}`).join(', ')}.`);
    }
  }
  if (skipped.length) {
    lines.push(`Not ranked: ${skipped.map((s) => `${s.year} (${reasons[s.reason] ?? s.reason})`).join(', ')}.`);
  }
  lines.push('This is not a price forecast.');
  return lines;
}

// Seat 1. POST /api/timing: the best application year for one path (FEATURE 1). Request
// { profile, choiceBase, candidateYears?, assumptions }; candidateYears defaults to this year and the next 5.
const timing = async (req, res, next) => {
  try {
    const { profile, choiceBase, assumptions } = req.body ?? {};
    validateProfile(profile);
    const { ruleset, version } = loadRuleset();
    const startYear = currentYear();
    const candidateYears = req.body?.candidateYears ?? Array.from({ length: 6 }, (_, i) => startYear + i);
    if (!Array.isArray(candidateYears) || candidateYears.length === 0 || candidateYears.length > 21 || !candidateYears.every(Number.isInteger)) {
      return badRequest(res, 'candidateYears must list from 1 to 21 whole years.');
    }
    const outOfRange = candidateYears.find((y) => y < startYear || y > startYear + MAX_YEARS_AHEAD);
    if (outOfRange !== undefined) {
      return badRequest(res, `candidateYears must be years from ${startYear} to ${startYear + MAX_YEARS_AHEAD}; ${outOfRange} is not.`);
    }
    // Prices are today's (D31), so one lookup serves every year; the year itself is validated per candidate.
    const base = await resolveChoice(
      { ...choiceBase, applicationYear: candidateYears[0] },
      { startYear, assumptions: assumptions ?? {}, ruleset, getResale: getResalePriceBasis, label: 'choiceBase' },
    );
    const lastKeyYear = base.keyYear - candidateYears[0] + Math.max(...candidateYears);
    const engineAssumptions = resolveAssumptions(assumptions, { startYear, keyYears: [lastKeyYear] });
    const result = optimiseTiming({ profile, choiceBase: base.choice, candidateYears, assumptions: engineAssumptions, ruleset });

    return res.json({
      rulesetVersion: version,
      horizonYear: engineAssumptions.horizonYear,
      best: result.best,
      all: result.all,
      skipped: result.skipped,
      explanation: timingExplanation(result, { horizonYear: engineAssumptions.horizonYear }),
      // Plain-English text for the warning codes in any ranked year, and for the skip reasons.
      warningMessages: warningMessagesFor([
        ...result.all.flatMap((e) => e.outcome.warnings),
        ...result.skipped.map((s) => s.reason),
      ]),
      btoProject: base.btoProject,
      assumptions: engineAssumptions,
      resolved: base.resolved,
    });
  } catch (err) {
    return sendError(res, next, err);
  }
};
router.post('/timing', features.timingOptimiser ? timing : disabled('Timing optimiser'));
router.post(
  '/strategy',
  features.strategySearch ? notImplemented('seat 1', 'Strategy recommendation') : disabled('Strategy recommendation'),
);
// Later. Off by default (FEATURE_BACKTEST=false).
router.post(
  '/backtest',
  features.backtest ? notImplemented('seat 1 + seat 3', 'Backtest') : disabled('Backtest'),
);

function disabled(feature) {
  return (req, res) =>
    res.status(501).json({ error: { code: 'FEATURE_DISABLED', message: `${feature} is switched off` } });
}

export default router;
