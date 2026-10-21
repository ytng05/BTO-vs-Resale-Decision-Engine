// Data side of /scenarios/compare. OWNER: Yu Qing.
//
// Kaashvi's page only calls these two functions.
//
// Contract:
//   loadComparePair(idA, idB) -> Promise<[scenarioA, scenarioB]>
//     Rejects with an Error whose .code is 'NOT_FOUND' when either scenario
//     does not exist (deleted, or not owned by this user). Any other error
//     (e.g. a 401 when logged out) is rethrown unchanged for the page to handle.
//   openScenarioInResults(scenario) -> Promise<void>
//     Loads scenario.inputs into the plan store. The page then routes to /results.
//
// Scenario shape:
//   { id, name, savedAt, rulesetVersion, horizonYear,
//     pathA: { label, netPosition: number | null, reason?: 'NOT_FUNDABLE' | 'NO_RESULT', loanShortfall?: number },
//     pathB: { ...same as pathA },
//     inputs: { profile, choiceA, choiceB, assumptions } }
//   Money is in DOLLARS here (the API's cents divided by 100 once, below).
//   netPosition is null only together with a reason:
//     NOT_FUNDABLE  cash plus retained OA can't cover the signing payment (CASH_SHORTFALL_AT_PURCHASE)
//     NO_RESULT     nothing saved, a mock result, or a result saved under an older contract shape
//   loanShortfall is set when the loan is over the MSR/LTV limit: the net position is still real,
//   so the card shows it with "short by $X" rather than hiding it.
//
// Ids starting with "mock-" come from MOCK_SCENARIOS, so the page and its Cypress spec work on the
// mock build. Every other id is a real saved scenario (GET /api/scenarios/:id, docs/API_CONTRACT.md).
import { getScenario } from './client.js'
import { useScenarioStore } from '../stores/scenario.js'

export const MOCK_SCENARIOS = {
  'mock-a': {
    id: 'mock-a',
    name: 'BTO Tampines 2027',
    savedAt: '2026-10-12T09:30:00+08:00',
    rulesetVersion: '2026-08-24',
    horizonYear: 2036,
    pathA: { label: 'BTO', netPosition: 412000 },
    pathB: { label: 'Resale', netPosition: 398000 },
    inputs: {},
  },
  'mock-b': {
    id: 'mock-b',
    name: 'Resale Bedok 2028',
    savedAt: '2026-10-13T20:15:00+08:00',
    rulesetVersion: '2026-08-24',
    horizonYear: 2037,
    pathA: { label: 'BTO', netPosition: 371000 },
    pathB: { label: 'Resale', netPosition: 399000 },
    inputs: {},
  },
}

function notFound(id) {
  const err = new Error(`Scenario ${id} was not found. It may have been deleted.`)
  err.code = 'NOT_FOUND'
  return err
}

const LABELS = { BTO: 'BTO', RESALE: 'Resale' }
// WARNINGS.CASH_SHORTFALL_AT_PURCHASE in server/src/engine/evaluate.contract.js
const CASH_SHORTFALL_AT_PURCHASE = 'CASH_SHORTFALL_AT_PURCHASE'

// The current result shape: horizon-based measure (common horizonYear, D1) with an integer-cents
// netPositionCents and a warnings list. Results saved under older contract versions lack one of these,
// or used a field that no longer means the same thing, so they are not read at all.
function isCurrentShape(result, outcome) {
  return (
    typeof result.horizonYear === 'number' &&
    Number.isInteger(outcome?.netPositionCents) &&
    Array.isArray(outcome?.warnings)
  )
}

// One path's figure from the result saved with the scenario (#58 saves the whole /api/compare response).
function pathFigure(choice, result, outcomeKey) {
  const label = LABELS[choice?.path] ?? choice?.path ?? ''
  // No result, or a mock one saved before /api/compare was live: nothing real to show.
  if (!result || result.mock) return { label, netPosition: null, reason: 'NO_RESULT' }
  const outcome = result[outcomeKey]
  if (!isCurrentShape(result, outcome)) return { label, netPosition: null, reason: 'NO_RESULT' }
  if (outcome.warnings.includes(CASH_SHORTFALL_AT_PURCHASE)) return { label, netPosition: null, reason: 'NOT_FUNDABLE' }

  const figure = { label, netPosition: outcome.netPositionCents / 100 } // API money is cents (D14)
  const shortfallCents = outcome.affordability?.shortfallCents
  if (outcome.affordability?.withinLimit === false && Number.isInteger(shortfallCents)) {
    figure.loanShortfall = shortfallCents / 100
  }
  return figure
}

/** Pure: one saved scenario from GET /api/scenarios/:id -> the compare page's shape. */
export function toCompareScenario(saved) {
  const { result } = saved
  const resultHorizon = typeof result?.horizonYear === 'number' && !result.mock ? result.horizonYear : null
  return {
    id: saved.id,
    name: saved.name,
    savedAt: saved.createdAt,
    rulesetVersion: saved.rulesetVersion, // shown per card; the page flags when the two differ
    horizonYear: resultHorizon ?? saved.assumptions?.horizonYear ?? null,
    pathA: pathFigure(saved.choiceA, result, 'outcomeA'),
    pathB: pathFigure(saved.choiceB, result, 'outcomeB'),
    inputs: { profile: saved.profile, choiceA: saved.choiceA, choiceB: saved.choiceB, assumptions: saved.assumptions },
  }
}

async function loadOne(id) {
  if (String(id).startsWith('mock-')) {
    const mock = MOCK_SCENARIOS[id]
    if (!mock) throw notFound(id)
    return mock
  }
  try {
    const { scenario } = await getScenario(id)
    return toCompareScenario(scenario)
  } catch (err) {
    // The server answers 404 both for a deleted scenario and for someone else's (#28).
    if (err?.response?.status === 404) throw notFound(id)
    throw err
  }
}

export async function loadComparePair(idA, idB) {
  return Promise.all([loadOne(idA), loadOne(idB)])
}

export async function openScenarioInResults(scenario) {
  // Same refill as My scenarios' Open (#58): saved parts laid over the blank scenario.
  useScenarioStore().loadSaved(scenario.inputs)
}