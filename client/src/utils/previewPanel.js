// What the results teaser's panel says, from the rows (one per pick, each with seat 1's verdict: utils/previewFit.js).
// Pure, so every case is unit-tested; PreviewView only renders it.
//
// rows: [{ key: 'moveby' | 'cash' | 'monthly', verdict: 'bto' | 'resale' | null, tie: 'same' | 'neutral' | null, reason }]
// outcome: 'bto' or 'resale' when that path wins every pick that has a winner (ties don't count against it);
// 'split' when each path wins something; 'even' when every pick is a real tie; 'none' when nothing has a winner and
// at least one pick had no fair comparison (D43: no verdict, so it never says "about the same").
//
// The panel only speaks for the picks. Results adds up everything, so it can name a different path: every panel that
// could read as the overall answer says so (summary).

const NAME = { bto: 'BTO', resale: 'Resale' };

// Why there's no comparison. The only "can't buy" signal is the new-flat income ceiling (D36, utils/previewFit.js);
// Results and the Dashboard open with a banner that explains it.
const NO_COMPARISON = {
  'bto-ineligible': "BTO isn't open to you on these answers: your household income, projected to the year you apply, would be above the ceiling for a new flat. The full comparison explains this.",
  'resale-ineligible': "Resale isn't open to you on these answers. The full comparison explains this.",
  'both-ineligible': 'Neither path is open to you on these answers. The full comparison explains this.',
};

// How a win reads in the split summary: "BTO keeps more cash in hand."
function winPhrase(row, moveInBy) {
  if (row.key === 'cash') return 'keeps more cash in hand';
  if (row.key === 'monthly') return 'needs a smaller loan';
  return row.reason === 'only-one-makes-date' && moveInBy ? `gets you the keys by your ${moveInBy}` : 'gets you the keys sooner';
}

export function previewPanel(rows, { moveInBy = null } = {}) {
  const winners = rows.filter((row) => row.verdict);
  const paths = new Set(winners.map((row) => row.verdict));
  let outcome = 'even';
  if (paths.size === 1) [outcome] = paths;
  else if (paths.size) outcome = 'split';

  if (outcome === 'bto' || outcome === 'resale') {
    const n = rows.length;
    let sub;
    if (winners.length < n) sub = `Ahead on ${winners.length} of your ${n} priorities`;
    else if (n === 1) sub = 'Ahead on your priority';
    else sub = n === 2 ? 'Ahead on both your priorities' : `Ahead on all ${n} of your priorities`;
    const other = outcome === 'bto' ? 'resale' : 'BTO';
    return {
      outcome,
      title: `${NAME[outcome]} fits you better`,
      sub,
      summary: `The full comparison adds up everything over time, so ${other} can still end ahead.`,
    };
  }
  if (outcome === 'split') {
    // One sentence per path, BTO first: "BTO keeps more cash in hand. Resale gets you the keys sooner."
    const summary = ['bto', 'resale']
      .map((path) => {
        const phrases = winners.filter((row) => row.verdict === path).map((row) => winPhrase(row, moveInBy));
        return `${NAME[path]} ${phrases.slice(0, -1).join(', ')}${phrases.length > 1 ? ' and ' : ''}${phrases.at(-1)}.`;
      })
      .join(' ');
    return { outcome, title: 'BTO and resale each win on something', sub: 'Based on what matters to you', summary };
  }
  if (rows.some((row) => row.tie === 'neutral')) {
    const summary = rows.map((row) => NO_COMPARISON[row.reason]).find(Boolean) ?? 'Some of the figures are missing, so see the full comparison.';
    return { outcome: 'none', title: "We can't compare these here", sub: null, summary };
  }
  return {
    outcome,
    title: `BTO and resale come out about the same on ${rows.length === 1 ? 'your priority' : 'your priorities'}`,
    sub: null,
    summary: 'The full comparison adds up everything over time, so one path can still end ahead.',
  };
}
