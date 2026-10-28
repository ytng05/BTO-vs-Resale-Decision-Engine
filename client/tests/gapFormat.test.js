import { describe, expect, it } from 'vitest';
import { mockCompare } from '../src/api/mock/mockData.js';
import { gapRows, gapTotal, grantsText, hiddenLineCount } from '../src/utils/gapFormat.js';

const GAP = {
  horizonYear: 2033,
  marginCents: 300_000,
  lines: [
    { id: 'MARKET_VALUE', label: 'Flat value', amountCents: 500_000 },
    { id: 'LOAN_OWED', label: 'Loan owed', amountCents: 0 },
    { id: 'RENOVATION', label: 'Renovation', amountCents: -300_000 },
    { id: 'BSD', label: 'Stamp duty', amountCents: 100_000 },
    { id: 'AGENT', label: 'Agent fees', amountCents: -300_000 },
  ],
  totalGrants: { aCents: 3_000_000, bCents: 13_000_000 },
};

describe('gapRows', () => {
  it('hides zero lines and sorts the rest by size, keeping the server order on ties', () => {
    expect(gapRows(GAP).map((r) => r.id)).toEqual(['MARKET_VALUE', 'RENOVATION', 'AGENT', 'BSD']);
  });
  it('says which path each line favours in words', () => {
    const rows = gapRows(GAP);
    expect(rows[0]).toMatchObject({ favours: 'A', absCents: 500_000, sideText: 'Favours BTO' });
    expect(rows[1]).toMatchObject({ favours: 'B', absCents: 300_000, sideText: 'Favours resale' });
  });
  it('uses the labels it is given', () => {
    expect(gapRows(GAP, { labelA: 'Path A', labelB: 'Path B' })[1].sideText).toBe('Favours Path B');
  });
  it('copes with a missing or empty breakdown', () => {
    expect(gapRows(null)).toEqual([]);
    expect(gapRows({})).toEqual([]);
  });
});

describe('hiddenLineCount', () => {
  it('counts the lines that are exactly zero', () => {
    expect(hiddenLineCount(GAP)).toBe(1);
    expect(hiddenLineCount(null)).toBe(0);
  });
});

describe('gapTotal', () => {
  it('names the path ahead and how far (net financial position, never "profit")', () => {
    const t = gapTotal(GAP);
    expect(t.favours).toBe('A');
    expect(t.text).toBe('BTO ends S$3,000 ahead');
    expect(gapTotal({ marginCents: -250_000 }).text).toBe('resale ends S$2,500 ahead');
  });
  it('handles a tie and a missing margin', () => {
    expect(gapTotal({ marginCents: 0 })).toMatchObject({ favours: null, absCents: 0 });
    expect(gapTotal({}).text).toBe('');
  });
});

describe('grantsText', () => {
  it('reports each path\'s grants', () => {
    expect(grantsText(GAP)).toBe('Grants received: BTO S$30,000, resale S$130,000.');
  });
  it('is empty when the totals are missing', () => {
    expect(grantsText({})).toBe('');
  });
});

describe('mockCompare gapBreakdown', () => {
  const mock = mockCompare();
  const gap = mock.gapBreakdown;

  it('matches the contract: 11 lines in the fixed order', () => {
    expect(gap.lines.map((l) => l.id)).toEqual([
      'MARKET_VALUE', 'LOAN_OWED', 'CPF_PRINCIPAL', 'CPF_INTEREST', 'CLAWBACK',
      'RENT_WHILE_WAITING', 'RENOVATION', 'BSD', 'LEGAL', 'AGENT', 'CASH_PURCHASE',
    ]);
    expect(gap.horizonYear).toBe(mock.horizonYear);
  });
  it('lines sum exactly to the margin, which is outcomeA minus outcomeB', () => {
    expect(gap.marginCents).toBe(mock.outcomeA.netPositionCents - mock.outcomeB.netPositionCents);
    expect(gap.lines.reduce((sum, l) => sum + l.amountCents, 0)).toBe(gap.marginCents);
  });
  it('reports each outcome\'s total grants', () => {
    expect(gap.totalGrants).toEqual({ aCents: mock.outcomeA.totalGrantsCents, bCents: mock.outcomeB.totalGrantsCents });
  });
});
