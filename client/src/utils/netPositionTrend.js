// "Net position over time" on Results: each path's net position at the end of every year, worked out the same way
// as the engine's netPositionCents (D1, the measure note in evaluate.contract.js), so the last year IS the verdict's
// figure. Pure functions, unit-tested against the real engine in tests/netPositionTrend.engine.test.js.
//   year's net = flat value − loan still owed − CPF savings to put back (+ interest) − clawback − cash spent so far
// - CPF: cpfSavingsObligationEndCents (own OA money + interest), not the deprecated cpfObligationEndCents, which also
//   counts the grant refund; grants are not a debt (D1).
// - Cash: a running total of housingCashOutCents (rent while waiting, cash instalments, cash fees). The rows run from
//   evaluationStartYear, as housingCashSpentCents does, so the totals agree at the horizon.
// - Clawback (Plus/Prime): the engine takes a flat share of the flat's value at the horizon; the same share of each
//   year's value. The row has no clawback field, so the share comes from the horizon figures.
// Money is integer cents in, cents out.

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

// [{ year, netCents }] for one Outcome; netCents is null for a row with a missing figure.
export function netPositionByYear(outcome) {
  const rows = outcome?.yearlyCashFlow ?? [];
  const clawback = outcome?.clawbackCents ?? 0;
  const valueAtHorizon = outcome?.marketValueAtHorizonCents;
  const clawbackOf = (value) => (clawback && isNum(valueAtHorizon) && valueAtHorizon > 0
    ? Math.round((value * clawback) / valueAtHorizon)
    : 0);
  let cashSoFar = 0;
  return rows.map((row) => {
    const { year, marketValueEndCents: value, loanBalanceEndCents: loan, cpfSavingsObligationEndCents: cpf } = row;
    cashSoFar += isNum(row.housingCashOutCents) ? row.housingCashOutCents : 0;
    if (![value, loan, cpf].every(isNum)) return { year, netCents: null };
    return { year, netCents: value - loan - cpf - clawbackOf(value) - cashSoFar };
  });
}

// Both paths by year, in dollars for the chart: [{ year, bto, resale }]. Keyed by year so the two line up even if
// one series is shorter.
export function trendRows(outcomeA, outcomeB) {
  const dollars = (cents) => (isNum(cents) ? cents / 100 : null);
  const byYear = new Map();
  for (const r of netPositionByYear(outcomeA)) byYear.set(r.year, { year: r.year, bto: dollars(r.netCents), resale: null });
  for (const r of netPositionByYear(outcomeB)) {
    byYear.set(r.year, { ...(byYear.get(r.year) ?? { year: r.year, bto: null }), resale: dollars(r.netCents) });
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year);
}
