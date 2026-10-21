// Pure helpers for the side-by-side scenario view (/scenarios/compare).
// Kept free of Vue so they can be unit-tested with Vitest.
//
// Scenario shape (built by toCompareScenario() in api/scenarioCompare.js):
// {
//   id, name, savedAt, rulesetVersion, horizonYear,
//   pathA: { label: 'BTO',    netPosition: number | null },
//   pathB: { label: 'Resale', netPosition: number | null },
//   inputs: { ... }
// }
// netPosition is in DOLLARS (the API stores cents; the mapper divides by 100).
// netPosition is null when no result was saved for that path. It does NOT mean
// "not fundable": evaluate() still returns a figure when the loan is capped (it only warns).

import { formatMoney } from './format.js'

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
 * @returns {{ key, name, label, netPosition, tie } | null}
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

/** True when the two scenarios are measured at different horizon years. */
export function horizonsDiffer(scenarioA, scenarioB) {
  return (
    scenarioA?.horizonYear != null &&
    scenarioB?.horizonYear != null &&
    scenarioA.horizonYear !== scenarioB.horizonYear
  )
}

/** True when the two scenarios were calculated under different ruleset versions. */
export function rulesetsDiffer(scenarioA, scenarioB) {
  return (
    scenarioA?.rulesetVersion != null &&
    scenarioB?.rulesetVersion != null &&
    scenarioA.rulesetVersion !== scenarioB.rulesetVersion
  )
}

/**
 * One-line headline comparing the two scenarios' own best paths.
 * D1 only compares net positions at a common horizon year under one ruleset, so when
 * either differs no winner is named and no dollar gap is shown.
 * @returns {{ text: string, winner: 'A' | 'B' | 'tie' | null }}
 */
export function compareHeadline(scenarioA, scenarioB) {
  const horizon = horizonsDiffer(scenarioA, scenarioB)
  const ruleset = rulesetsDiffer(scenarioA, scenarioB)
  if (horizon || ruleset) {
    const why =
      horizon && ruleset
        ? 'different horizon years and rulesets'
        : horizon
          ? 'different horizon years'
          : 'different rulesets'
    return {
      text: `These scenarios use ${why}, so they can't be compared directly.`,
      winner: null,
    }
  }

  const bestA = bestPath(scenarioA)
  const bestB = bestPath(scenarioB)

  if (!bestA && !bestB) {
    return { text: 'Neither scenario has a saved result to compare.', winner: null }
  }
  if (!bestA) {
    return { text: 'Only Scenario B has a saved result; Scenario A has none to compare.', winner: null }
  }
  if (!bestB) {
    return { text: 'Only Scenario A has a saved result; Scenario B has none to compare.', winner: null }
  }

  const diff = Math.round(bestA.netPosition) - Math.round(bestB.netPosition)
  if (diff === 0) {
    return { text: 'Both scenarios end level on their own best paths.', winner: 'tie' }
  }

  const [winLetter, win, loseLetter] = diff > 0 ? ['A', bestA, 'B'] : ['B', bestB, 'A']
  return {
    text: `Scenario ${winLetter} (${win.name}: ${win.label}) ends ${formatMoney(Math.abs(diff))} ahead of Scenario ${loseLetter}.`,
    winner: winLetter,
  }
}

export { PATH_KEYS, PATH_NAMES }