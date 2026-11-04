import { describe, expect, it } from 'vitest';
import { previewPanel } from '../src/utils/previewPanel.js';

// What the results teaser's panel says (D43): one path fits better, a split, or about the same.
const row = (key, verdict, reason = verdict ? 'clear-gap' : 'within-threshold') => ({ key, verdict, reason });

describe('previewPanel', () => {
  it('names the path that wins every pick with a winner', () => {
    expect(previewPanel([row('monthly', 'resale'), row('cash', 'resale')])).toEqual({
      outcome: 'resale', title: 'Resale fits you better', sub: 'Ahead on both your priorities', summary: null,
    });
    expect(previewPanel([row('cash', 'bto')])).toMatchObject({ outcome: 'bto', title: 'BTO fits you better', sub: 'Ahead on your priority' });
    expect(previewPanel([row('cash', 'bto'), row('monthly', 'bto'), row('moveby', 'bto', 'earlier-keys')]).sub).toBe('Ahead on all 3 of your priorities');
  });

  it("doesn't count a tie against the winner", () => {
    expect(previewPanel([row('moveby', 'resale', 'only-one-makes-date'), row('cash', null)])).toMatchObject({
      outcome: 'resale', sub: 'Ahead on 1 of your 2 priorities',
    });
  });

  it('on a split, says each wins on something, one sentence per path, BTO first', () => {
    expect(previewPanel([row('moveby', 'resale', 'earlier-keys'), row('cash', 'bto')])).toEqual({
      outcome: 'split',
      title: 'BTO and resale each win on something',
      sub: 'Based on what matters to you',
      summary: 'BTO keeps more cash in hand. Resale gets you the keys sooner.',
    });
  });

  it('joins two wins for one path, and names the move-in year when only one path makes it', () => {
    const panel = previewPanel([row('cash', 'bto'), row('monthly', 'bto'), row('moveby', 'resale', 'only-one-makes-date')], { moveInBy: 2029 });
    expect(panel.summary).toBe('BTO keeps more cash in hand and needs a smaller loan. Resale gets you the keys by your 2029.');
  });

  it('says they come out about the same when nothing has a winner', () => {
    expect(previewPanel([row('cash', null), row('monthly', null)])).toEqual({
      outcome: 'even', title: 'BTO and resale come out about the same', sub: null, summary: null,
    });
  });
});
