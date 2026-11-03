// The Dashboard's summary pieces (version E): the verdict bars, the cash card, "Side by side" and "How each purchase
// is paid". Pure functions, unit-tested in tests/dashboardSummary.test.js. Outcome money is integer cents
// (API_CONTRACT.md); formatMoney() takes dollars. Summaries round to S$1,000; "How each purchase is paid" is exact.
// Wording follows the guardrails: net position (D1), never "profit"; nothing here is a prediction.
import { formatMoney } from './format.js';
import { monthYear } from './dashboardFormat.js';
import { verdict } from './resultsVerdict.js';

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const k = (cents) => formatMoney(Math.round(cents / 100 / 1000) * 1000); // nearest S$1,000
const exact = (cents) => formatMoney(cents / 100);
const pathName = (side) => (side === 'a' ? 'BTO' : 'Resale');

// Bar widths (0-100) for two amounts, both from S$0; an amount at or below S$0 has no bar.
export function bars(aCents, bCents) {
  const top = Math.max(isNum(aCents) ? aCents : 0, isNum(bCents) ? bCents : 0);
  const w = (v) => (isNum(v) && v > 0 && top > 0 ? Math.round((v / top) * 1000) / 10 : 0);
  return { a: w(aCents), b: w(bCents) };
}

// The cash card: how much of each path's cash up front the savings entered today cover.
// Returns { anyShort, rows: [{ side, needCents, coveredPct, shortCents, text }] } or null without savings.
export function cashCard(outcomeA, outcomeB, cashSavingsDollars) {
  if (!isNum(cashSavingsDollars)) return null;
  const have = Math.round(cashSavingsDollars * 100);
  const rows = [['a', outcomeA], ['b', outcomeB]].map(([side, o]) => {
    const need = isNum(o?.cashRequiredAtPurchaseCents) ? o.cashRequiredAtPurchaseCents : 0;
    const shortCents = Math.max(0, need - have);
    const coveredPct = need <= 0 ? 100 : Math.min(100, Math.floor((Math.min(have, need) / need) * 100));
    const text = need <= 0 ? 'No cash needed up front'
      : shortCents > 0 ? `${k(have)} of ${k(need)} covered` : `Covered, ${k(have - need)} to spare`;
    return { side, needCents: need, coveredPct, shortCents, text, shortText: shortCents > 0 ? `${k(shortCents)} short` : 'Covered' };
  });
  return { anyShort: rows.some((r) => r.shortCents > 0), bothShort: rows.every((r) => r.shortCents > 0), rows };
}

// "Side by side": a row per figure; `favours` 'a' | 'b' | null and a sentence saying which path is ahead.
// Grants are never favoured: they are already inside each net position (D1). Net position uses the Results page's
// rule (verdict() in resultsVerdict.js, D42): within 2% of the larger figure neither path is called ahead.
export function sideBySide(outcomeA, outcomeB, horizonYear) {
  const A = outcomeA ?? {};
  const B = outcomeB ?? {};
  const money = (id, label, hint, a, b, better, verb) => {
    if (!isNum(a) && !isNum(b)) return null;
    const gap = isNum(a) && isNum(b) ? a - b : null;
    const same = gap === null || Math.round(Math.abs(gap) / 100 / 1000) === 0;
    let favours = null;
    if (!same && better) favours = (better === 'higher' ? gap > 0 : gap < 0) ? 'a' : 'b';
    const diff = same ? 'About the same'
      : favours ? `${pathName(favours)} ${verb} ${k(Math.abs(gap))}`
        : `${k(Math.abs(gap))} more with ${gap > 0 ? 'BTO' : 'resale'}`;
    return { id, label, hint, a: isNum(a) ? k(a) : '—', b: isNum(b) ? k(b) : '—', favours, diff };
  };
  const keysA = A.timeline?.keyCollectionDate;
  const keysB = B.timeline?.keyCollectionDate;
  const months = (iso) => (typeof iso === 'string' ? Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1 : null);
  const ma = months(keysA);
  const mb = months(keysB);
  let keys = null;
  if (ma !== null && mb !== null) {
    const d = Math.abs(ma - mb);
    const y = Math.floor(d / 12);
    const m = d % 12;
    const span = [y && `${y} year${y === 1 ? '' : 's'}`, m && `${m} month${m === 1 ? '' : 's'}`].filter(Boolean).join(' ');
    keys = { id: 'keys', label: 'You get the keys', hint: 'BTO: estimated from a recent launch', a: monthYear(keysA), b: monthYear(keysB),
      favours: d === 0 ? null : ma < mb ? 'a' : 'b', diff: d === 0 ? 'Same month' : `${ma < mb ? 'BTO' : 'Resale'} ${span} sooner` };
  }
  const net = money('net', horizonYear ? `Net position in ${horizonYear}` : 'Net position', 'What this path leaves you with, after costs', A.netPositionCents, B.netPositionCents, 'higher', 'ahead by');
  const v = verdict(A, B, horizonYear);
  if (net && v.close && v.winner !== 'level') {
    net.favours = null;
    net.diff = `Too close to call (${k(v.gapCents)} apart)`;
  }
  return [
    net,
    money('cash', 'Cash needed up front', 'After grants, CPF and the loan', A.cashRequiredAtPurchaseCents, B.cashRequiredAtPurchaseCents, 'lower', 'needs less by'),
    money('spent', horizonYear ? `Cash spent on housing by ${horizonYear}` : 'Cash spent on housing', 'Rent, renovation, fees and loan payments', A.housingCashSpentCents, B.housingCashSpentCents, 'lower', 'spends less by'),
    money('grants', 'Grants you may get', 'Already counted in the net positions', A.totalGrantsCents, B.totalGrantsCents, null, ''),
    keys,
  ].filter(Boolean);
}

/**
 * "How each purchase is paid", exact to the dollar, from the price down to the cash: price − grants − CPF − loan
 * + stamp duty, fees and other costs (the remainder, so the card adds up to the cash needed). `covCents` is the
 * resale price above the valuation (D39), paid in cash and already inside the cash needed.
 *
 * No double count: cpfUsedAtPurchaseCents is the buyers' own OA only (the engine's payOa); grants are separate GRANT
 * ledger entries. That OA figure also includes any stamp duty and legal fees paid from CPF, so the remainder is exactly
 * stamp duty + legal + agent fees (tested on E1-E3 in dashboardSummary.engine.test.js). The grants line is the grants
 * used on this flat (grantRefundPrincipalCents), not the total: a grant can be capped by the CPF usage limit (D37) or
 * be more than the price needs; the part not used on the flat is unusedGrantsCents.
 */
export function purchaseCard(outcome, { covCents = 0 } = {}) {
  const o = outcome ?? {};
  const price = o.purchasePriceCents ?? 0;
  const totalGrants = o.totalGrantsCents ?? 0;
  const grants = isNum(o.grantRefundPrincipalCents) ? o.grantRefundPrincipalCents : totalGrants; // older server or mock: the total
  const cpf = o.cpfUsedAtPurchaseCents ?? 0;
  const loan = o.loanPrincipalCents ?? 0;
  const cash = o.cashRequiredAtPurchaseCents ?? 0;
  // Without a price (an older server or the mock), the remainder would be meaningless: the card leaves both out.
  const hasPrice = isNum(o.purchasePriceCents) && o.purchasePriceCents > 0;
  const other = hasPrice ? cash - (price - grants - cpf - loan) : 0;
  const funded = Math.max(1, loan + grants + cpf + cash);
  const pct = (v) => Math.round((Math.max(0, v) / funded) * 100);
  return {
    hasPrice, priceCents: price, grantsCents: grants, unusedGrantsCents: Math.max(0, totalGrants - grants), cpfCents: cpf, loanCents: loan, otherCents: other, cashCents: cash,
    covCents: covCents > 0 ? covCents : 0,
    shares: { loan: pct(loan), aid: pct(grants + cpf), cash: Math.max(0, 100 - pct(loan) - pct(grants + cpf)) },
    lines: {
      unusedGrants: totalGrants - grants > 0 ? `${exact(totalGrants - grants)} of your grants isn't used on this flat` : '',
      price: exact(price), grants: `−${exact(grants)}`, cpf: `−${exact(cpf)}`, loan: `−${exact(loan)}`,
      other: `${other < 0 ? '−' : '+'}${exact(Math.abs(other))}`, cash: exact(cash),
    },
  };
}

// "S$167,000 more than BTO" for one card's figure against the other's; '' when about the same.
export function versus(mine, theirs, otherName) {
  if (!isNum(mine) || !isNum(theirs) || Math.round(Math.abs(mine - theirs) / 100 / 1000) === 0) return '';
  return `${k(Math.abs(mine - theirs))} ${mine > theirs ? 'more' : 'less'} than ${otherName}`;
}

// The line under both cards: which path needs more cash up front, and the main reason.
export function cashSentence(cardA, cardB) {
  const gap = cardB.cashCents - cardA.cashCents; // > 0: resale needs more
  if (Math.round(Math.abs(gap) / 100 / 1000) === 0) return 'Both paths need about the same cash up front.';
  const [more, mc, oc] = gap > 0 ? ['Resale', cardB, cardA] : ['BTO', cardA, cardB];
  const parts = [`${more} needs ${k(Math.abs(gap))} more cash up front`];
  if (mc.grantsCents - oc.grantsCents >= 100_000) parts.push(`even with ${k(mc.grantsCents - oc.grantsCents)} more in grants`);
  if (mc.priceCents - oc.priceCents >= 100_000) parts.push(`because its price is ${k(mc.priceCents - oc.priceCents)} higher`);
  return `${parts.join(', ')}.`;
}

// What the what-if sliders changed from the saved plan, in words: ["flat price growth 3% → 4.5% a year"].
export function whatIfChanges(now, plan) {
  if (!now || !plan) return [];
  const pct = (v) => `${Math.round(v * 1000) / 10}%`;
  const money = (v) => formatMoney(v);
  const defs = [
    ['annualPriceGrowth', 'flat price growth', (v) => `${pct(v)} a year`, pct],
    ['annualIncomeGrowth', 'income growth', (v) => `${pct(v)} a year`, pct],
    ['applicationYear', 'apply / buy in', String, String],
    ['horizonYear', 'compare in', String, String],
    ['monthlyHousingCostWhileWaiting', 'rent while waiting', (v) => `${money(v)} a month`, money],
    ['renovationA', 'BTO renovation', money, money],
    ['renovationB', 'resale renovation', money, money],
    ['btoPrice', 'BTO price', money, money],
    ['resalePrice', 'resale price', money, money],
  ];
  return defs
    .filter(([key]) => now[key] !== null && now[key] !== undefined && plan[key] !== null && plan[key] !== undefined && now[key] !== plan[key])
    .map(([key, label, to, from]) => `${label} ${from(plan[key])} → ${to(now[key])}`);
}

/**
 * Where the answer flips on the flat price growth slider, from /api/compare's break-even line (`frontier`) and grid,
 * at the user's income growth (the nearest row tested if theirs isn't one). Returns null when the paths don't flip
 * inside [minPct, maxPct], else { atPct, winnerAbove: 'BTO' | 'Resale', approx }.
 */
export function priceFlip(result, incomeGrowth, minPct = -2, maxPct = 8) {
  const frontier = Array.isArray(result?.frontier) ? result.frontier : [];
  const cells = Array.isArray(result?.grid) ? result.grid.flat() : [];
  if (!frontier.length || !isNum(incomeGrowth)) return null;
  const incomes = [...new Set(frontier.map((p) => p.annualIncomeGrowth))];
  const nearest = incomes.reduce((best, g) => (Math.abs(g - incomeGrowth) < Math.abs(best - incomeGrowth) ? g : best), incomes[0]);
  const point = frontier.filter((p) => p.annualIncomeGrowth === nearest).sort((x, y) => x.annualPriceGrowth - y.annualPriceGrowth)[0];
  if (!point) return null;
  const atPct = Math.round(point.annualPriceGrowth * 1000) / 10;
  if (atPct <= minPct || atPct >= maxPct) return null;
  const above = cells
    .filter((c) => c.annualIncomeGrowth === nearest && c.annualPriceGrowth > point.annualPriceGrowth && (c.winner === 'A' || c.winner === 'B'))
    .sort((x, y) => x.annualPriceGrowth - y.annualPriceGrowth)[0];
  if (!above) return null;
  return { atPct, winnerAbove: above.winner === 'A' ? 'BTO' : 'Resale', approx: Math.abs(nearest - incomeGrowth) > 1e-9 };
}

// Warnings said in a card already (the lease-to-95 note in the resale card, "Loan short by…" under each housing
// loan, the cash card's shortfall), so the notes don't repeat them.
const SAID_ELSEWHERE = new Set(['LEASE_BELOW_95_PRORATION', 'LOAN_ABOVE_LIMIT', 'CASH_SHORTFALL_AT_PURCHASE']);
// Warnings that overturn the answer: HDB would not sell this BTO flat that year (D36).
const BLOCKING = new Set(['INCOME_CEILING_BREACHED_AT_PURCHASE']);

/**
 * The Dashboard's warnings, sorted: `blocking` (shown as a red banner) and `notes` ("Before you trust these numbers"),
 * one note per code with the paths it applies to ("Both paths" when it is on both). `messages` is /api/compare's
 * warningMessages ({ CODE: sentence }); a code without a sentence shows as the code.
 */
export function groupWarnings(outcomeA, outcomeB, messages = {}) {
  const code = (w) => (typeof w === 'string' ? w : w?.code);
  const byCode = new Map();
  [['BTO', outcomeA], ['Resale', outcomeB]].forEach(([path, o]) => {
    (o?.warnings ?? []).forEach((w) => {
      const c = code(w);
      if (!c) return;
      if (!byCode.has(c)) byCode.set(c, { code: c, paths: [], text: messages?.[c] ?? (typeof w === 'object' ? w?.message : null) ?? c });
      if (!byCode.get(c).paths.includes(path)) byCode.get(c).paths.push(path);
    });
  });
  const all = [...byCode.values()].map((x) => ({ ...x, label: x.paths.length === 2 ? 'Both paths' : x.paths[0] }));
  return {
    blocking: all.filter((x) => BLOCKING.has(x.code)),
    notes: all.filter((x) => !BLOCKING.has(x.code) && !SAID_ELSEWHERE.has(x.code)),
  };
}
