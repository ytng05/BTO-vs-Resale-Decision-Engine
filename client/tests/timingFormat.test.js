import { describe, expect, it } from 'vitest';
import { keysYearOf, skipReasonText, timingHeadline, timingRows } from '../src/utils/timingFormat.js';

const outcome = (netPositionCents, keyCollectionDate = '2031-05-01') => ({
  netPositionCents,
  timeline: { keyCollectionDate },
});

const RESULT = {
  horizonYear: 2040,
  best: { year: 2029, outcome: outcome(16_400_000, '2033-05-01') },
  all: [
    { year: 2029, outcome: outcome(16_400_000, '2033-05-01') },
    { year: 2027, outcome: outcome(15_000_000, '2031-05-01') },
    { year: 2028, outcome: outcome(15_700_000, '2032-05-01') },
  ],
  skipped: [{ year: 2026, reason: 'MOVE_IN_DEADLINE_MISSED' }],
};

describe('keysYearOf', () => {
  it('reads the year from the key collection date', () => {
    expect(keysYearOf(outcome(0, '2033-05-01'))).toBe(2033);
  });
  it('returns null when the timeline is missing or malformed', () => {
    expect(keysYearOf({})).toBeNull();
    expect(keysYearOf(outcome(0, 'soon'))).toBeNull();
  });
});

describe('skipReasonText', () => {
  it('explains the two server reasons', () => {
    expect(skipReasonText('MOVE_IN_DEADLINE_MISSED')).toMatch(/move-in deadline/);
    expect(skipReasonText('CASH_SHORTFALL_AT_PURCHASE')).toMatch(/cash/);
  });
  it('falls back to a generic line for an unknown code', () => {
    expect(skipReasonText('SOMETHING_NEW')).toMatch(/could not be compared/);
  });
});

describe('timingRows', () => {
  it('sorts earliest year first and keeps cents', () => {
    expect(timingRows(RESULT).map((r) => r.year)).toEqual([2027, 2028, 2029]);
    expect(timingRows(RESULT)[0].netPositionCents).toBe(15_000_000);
  });
  it('marks only the best year and gives how far each other year is behind it', () => {
    const rows = timingRows(RESULT);
    expect(rows.filter((r) => r.isBest).map((r) => r.year)).toEqual([2029]);
    expect(rows[0].behindBestCents).toBe(1_400_000);
    expect(rows[2].behindBestCents).toBe(0);
  });
  it('passes the keys year through and copes with an empty result', () => {
    expect(timingRows(RESULT)[2].keysYear).toBe(2033);
    expect(timingRows({ all: [], best: null })).toEqual([]);
    expect(timingRows(null)).toEqual([]);
  });
  it('has no behind-best figure when nothing is best', () => {
    const rows = timingRows({ all: RESULT.all, best: null });
    expect(rows.every((r) => r.behindBestCents === null && !r.isBest)).toBe(true);
  });
});

describe('timingHeadline', () => {
  it('names the best year, the horizon and the net position (never "profit")', () => {
    const text = timingHeadline(RESULT);
    expect(text).toContain('2029');
    expect(text).toContain('by 2040');
    expect(text).toContain('net position');
    expect(text).toContain('164,000');
    expect(text.toLowerCase()).not.toContain('profit');
  });
  it('says what to try when every year was skipped', () => {
    expect(timingHeadline({ best: null, all: [], skipped: [] })).toMatch(/None of the years checked/);
  });
});
