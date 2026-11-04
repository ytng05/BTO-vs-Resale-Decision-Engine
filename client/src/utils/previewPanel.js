// What the results teaser's panel says, from the rows (one per pick, each with seat 1's verdict: utils/previewFit.js).
// Pure, so every case is unit-tested; PreviewView only renders it.
//
// rows: [{ key: 'moveby' | 'cash' | 'monthly', verdict: 'bto' | 'resale' | null, reason }]
// outcome: 'bto' or 'resale' when that path wins every pick that has a winner (ties don't count against it);
// 'split' when each path wins something; 'even' when nothing has a winner.

const NAME = { bto: 'BTO', resale: 'Resale' };

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
    return { outcome, title: `${NAME[outcome]} fits you better`, sub, summary: null };
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
  return { outcome, title: 'BTO and resale come out about the same', sub: null, summary: null };
}
