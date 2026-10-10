// SEAT 1. Progress-pitch demo: calls the running API and prints each result next to the hand-worked figure.
//   1. Start the server:   npm start -w server        (or: cd server && npm start)
//   2. In another terminal: npm run demo -w server     (optional: pass a base URL, default http://localhost:3000)
// Hand-worked figures come from the fixtures in src/engine/fixtures (worked in the seat 1 spreadsheets).
import { readFileSync } from 'node:fs';

const BASE = process.argv[2] ?? `http://localhost:${process.env.PORT || 3000}`;
const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`../src/engine/fixtures/${name}`, import.meta.url), 'utf8'));

const dollars = (cents) =>
  (cents / 100).toLocaleString('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 2 });

// Month n of a case (1 = purchase month) as 'YYYY-MM-01'.
function monthDate({ startYear, startMonth }, n) {
  const index = startYear * 12 + (startMonth - 1) + (n - 1);
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}-01`;
}

function withdrawalsFor(i) {
  const list = [{ date: monthDate(i, 1), amountCents: i.lumpSumCents, kind: 'LUMP_SUM' }];
  for (let n = 1; i.monthlyInstalmentCents > 0 && n <= i.saleMonth; n += 1) {
    list.push({ date: monthDate(i, n), amountCents: i.monthlyInstalmentCents, kind: 'INSTALMENT' });
  }
  if (i.grantCents > 0) list.push({ date: monthDate(i, i.grantMonth), amountCents: i.grantCents, kind: 'GRANT' });
  return list;
}

async function post(path, body) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    console.error(`\nCould not reach ${BASE}. Start the server first: npm start -w server\n`);
    process.exit(1);
  }
  return { status: res.status, body: await res.json() };
}

const line = (label, handWorked, api) => {
  const match = handWorked === api ? 'MATCH' : 'DIFFERENT';
  console.log(`  ${label.padEnd(22)} hand-worked ${dollars(handWorked).padStart(15)}   API ${dollars(api).padStart(15)}   ${match}`);
};

// 1. CPF accrued interest: Case 3 (lump sum + monthly instalments + grant, sale in June 2036).
const cpfCase = fixture('accrued-interest.json').cases.find((c) => c.id === 'grant-and-mid-year-sale');
const i = cpfCase.inputs;
const withdrawals = withdrawalsFor(i);
console.log(`\nCPF accrued interest: ${cpfCase.description}`);
console.log(`  ${withdrawals.length} CPF withdrawals, ${withdrawals[0].date} to ${monthDate(i, i.saleMonth)}`);
const cpf = await post('/api/cpf/accrued-interest', { withdrawals, asOfDate: monthDate(i, i.saleMonth) });
if (cpf.status !== 200) {
  console.log(`  API returned ${cpf.status}: ${cpf.body.error?.message}`);
} else {
  line('CPF principal used', cpfCase.expected.principalCents, cpf.body.principalCents);
  line('Accrued interest', cpfCase.expected.accruedInterestCents, cpf.body.accruedInterestCents);
  line('Total refund to CPF', cpfCase.expected.totalRefundCents, cpf.body.totalCents);
  console.log(`  ruleset ${cpf.body.rulesetVersion} (${cpf.body.rulesetStatus}), OA rate ${cpf.body.oaRate * 100}%, ${cpf.body.accruedInterestCompounding} compounding`);
}

// 2. Buyer's stamp duty: a typical resale price and a price with cents.
console.log("\nBuyer's stamp duty");
for (const id of ['bsd-typical-resale', 'bsd-non-whole-dollar']) {
  const c = fixture('buyer-stamp-duty.json').cases.find((x) => x.id === id);
  const bsd = await post('/api/stamp-duty', { priceCents: c.priceCents });
  if (bsd.status !== 200) console.log(`  API returned ${bsd.status}: ${bsd.body.error?.message}`);
  else line(`Price ${dollars(c.priceCents)}`, c.expectedBsdCents, bsd.body.bsdCents);
}
console.log('');
