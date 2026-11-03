// The glossary quotes figures from the ruleset ($120,000, 4 km, 75%...). This reads the newest ruleset file and
// checks each figure the glossary states, so a ruleset update that changes one fails here instead of leaving the
// glossary contradicting Results and Sources. Fix the wording in constants/glossary.js when it does.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GLOSSARY, GLOSSARY_BY_ID } from '../src/constants/glossary.js';

const dir = fileURLToPath(new URL('../../server/src/config/rulesets/', import.meta.url));
// ruleset-YYYY-MM-DD.json: the newest by name is the one in use.
const newest = readdirSync(dir).filter((f) => /^ruleset-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().at(-1);
const rules = JSON.parse(readFileSync(`${dir}${newest}`, 'utf8'));

const money = (dollars) => `$${dollars.toLocaleString('en-US')}`;
const text = (id) => GLOSSARY_BY_ID[id].definition;

describe(`glossary figures match ${newest}`, () => {
  it('EHG: the top grant and the family income ceiling', () => {
    const top = Math.max(...rules.grants.ehg.tiers.map((t) => t.grantAmount).filter(Number.isFinite)); // last tier: 'not eligible'
    expect(text('ehg')).toContain(money(top));
    expect(text('ehg')).toContain(money(rules.grants.ehg.incomeCeiling.family));
  });

  it('Family Grant: the income ceiling', () => {
    expect(text('family-grant')).toContain(money(rules.grants.familyGrant.incomeCeiling));
  });

  it('PHG: the "near" distance', () => {
    expect(text('phg')).toContain(`${rules.grants.proximityHousingGrant.nearDistanceKm} km`);
  });

  it('MOP: Standard, and Plus and Prime (one figure for both)', () => {
    const { STANDARD, PLUS, PRIME } = rules.classifications;
    expect(PLUS.mopYears).toBe(PRIME.mopYears); // the glossary gives one figure for both
    expect(text('mop')).toContain(`${STANDARD.mopYears} years for a Standard flat`);
    expect(text('mop')).toContain(`${PLUS.mopYears} years for Plus and Prime`);
  });

  it('LTV: the HDB loan limit and the age the lease must last to', () => {
    const hdb = rules.loans.ltv.hdbLoan;
    expect(text('ltv')).toContain(`${hdb.maxPercent}%`);
    expect(text('ltv')).toContain(`is ${hdb.leaseMustCoverYoungestToAge}`);
  });

  it('OA: the floor interest rate', () => {
    expect(text('oa')).toContain(`${Math.round(rules.cpf.oaInterestRate * 1000) / 10}%`);
  });

  it('every entry has a term and a definition, and ids are unique', () => {
    expect(new Set(GLOSSARY.map((g) => g.id)).size).toBe(GLOSSARY.length);
    GLOSSARY.forEach((g) => { expect(g.term).toBeTruthy(); expect(g.definition).toBeTruthy(); });
  });
});
