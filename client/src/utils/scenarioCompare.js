// Pure helpers for the side-by-side scenario view (/scenarios/compare).
// Kept free of Vue so they can be unit-tested with Vitest.
//
// Scenario shape (agreed with Yu Qing):
// {
//   id, name, savedAt, rulesetVersion, horizonYear,
//   pathA: { label: 'BTO',    netPosition: number | null },
//   pathB: { label: 'Resale', netPosition: number | null },
//   inputs: { ... }
// }
// netPosition is null when the engine could not produce a figure for that
// path (for example the loan is over the limit and the path is not fundable).

const PATH_KEYS = ['pathA', 'pathB']
const PATH_NAMES = { pathA: 'Path A', pathB: 'Path B' }

function hasNumber(path) {
  return path != null && typeof path.netPosition === 'number' && Number.isFinite(path.netPosition)
}

/**
 * Which path is ahead inside one scenario.
 * @returns {'pathA' | 'pathB' | 'tie' | null} null when neither path has a figure.
 */
export function aheadPathKey(scenario) {
  const a = scenario?.pathA
  const b = scenario?.pathB
  const aOk = hasNumber(a)
  const bOk = hasNumber(b)
  if (!aOk && !bOk) return null
  if (aOk && !bOk) return 'pathA'
  if (!aOk && bOk) return 'pathB'
  if (Math.round(a.netPosition) === Math.round(b.netPosition)) return 'tie'
  return a.netPosition > b.netPosition ? 'pathA' : 'pathB'
}

/**
 * The scenario's own best path.
 * @returns {{ key, name, label, netPosition } | null}
 */
export function bestPath(scenario) {
  const key = aheadPathKey(scenario)
  if (key === null) return null
  const pick = key === 'tie' ? 'pathA' : key
  const path = scenario[pick]
  return {
    key: pick,
    name: PATH_NAMES[pick],
    label: path.label,
    netPosition: path.netPosition,
    tie: key === 'tie',
  }
}

/** Format a dollar figure as S$13,000 (whole dollars, minus sign for negatives). */
export function formatSGD(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  const rounded = Math.round(value)
  const abs = Math.abs(rounded).toLocaleString('en-SG')
  return rounded < 0 ? `−S$${abs}` : `S$${abs}`
}

/** Format an ISO date as 12 Oct 2026. */
export function formatSavedDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * One-line headline comparing the two scenarios' own best paths.
 * @returns {{ text: string, winner: 'A' | 'B' | 'tie' | null }}
 */
export function compareHeadline(scenarioA, scenarioB) {
  const bestA = bestPath(scenarioA)
  const bestB = bestPath(scenarioB)

  if (!bestA && !bestB) {
    return { text: 'Neither scenario has a net position to compare.', winner: null }
  }
  if (!bestA) {
    return { text: 'Only Scenario B has a net position; Scenario A has no fundable path.', winner: 'B' }
  }
  if (!bestB) {
    return { text: 'Only Scenario A has a net position; Scenario B has no fundable path.', winner: 'A' }
  }

  const diff = Math.round(bestA.netPosition) - Math.round(bestB.netPosition)
  if (diff === 0) {
    return { text: 'Both scenarios end level on their own best paths.', winner: 'tie' }
  }

  const [winLetter, win, loseLetter] = diff > 0 ? ['A', bestA, 'B'] : ['B', bestB, 'A']
  return {
    text: `Scenario ${winLetter} (${win.name}: ${win.label}) ends ${formatSGD(Math.abs(diff))} ahead of Scenario ${loseLetter}.`,
    winner: winLetter,
  }
}

/** True when the two scenarios are measured at different horizon years. */
export function horizonsDiffer(scenarioA, scenarioB) {
  return (
    scenarioA?.horizonYear != null &&
    scenarioB?.horizonYear != null &&
    scenarioA.horizonYear !== scenarioB.horizonYear
  )
}

export { PATH_KEYS, PATH_NAMES }