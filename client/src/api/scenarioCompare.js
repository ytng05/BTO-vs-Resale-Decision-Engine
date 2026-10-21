// Data side of /scenarios/compare. OWNER: Yu Qing.
//
// The compare page only calls these two functions.
//
// Contract:
//   loadComparePair(idA, idB) -> Promise<[scenarioA, scenarioB]> in the compare shape below.
//     Rejects with an Error whose .code is 'NOT_FOUND' when either scenario
//     does not exist (deleted, or not owned by this user).
//   openScenarioInResults(scenario) -> Promise<void>
//     Loads the saved scenario into the plan store (same as Open on My scenarios, #58).
//     The page then routes to /results.
//
// Compare shape (what ScenarioCompareCard reads):
//   {
//     id, name,
//     savedAt,          // ISO date string (from the saved scenario's createdAt)
//     rulesetVersion,   // e.g. '2026-08-24'
//     horizonYear,      // e.g. 2036, or null if no result was saved
//     pathA: { label, netPosition },  // netPosition is in DOLLARS, or null if no result was saved
//     pathB: { label, netPosition },
//     inputs,           // the saved plan inputs
//     saved,            // the original saved scenario from the API (used by openScenarioInResults)
//   }
// The API stores money in cents (result.outcomeA.netPositionCents); toCompareScenario() divides by 100.
//
// Mock mode (VITE_USE_MOCK=true): mock-a and mock-b below, used by cypress/e2e compare tests.

import { getScenario } from './client.js'
import { useScenarioStore } from '../stores/scenario.js'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

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

// Cents (API) -> dollars (compare shape). A missing figure stays null: "no result saved".
function centsToDollars(cents) {
  return typeof cents === 'number' ? cents / 100 : null
}

// Saved scenario from GET /api/scenarios/:id -> compare shape.
export function toCompareScenario(saved) {
  const result = saved.result ?? {}
  return {
    id: saved.id ?? saved._id,
    name: saved.name,
    savedAt: saved.createdAt,
    rulesetVersion: saved.rulesetVersion ?? result.rulesetVersion ?? null,
    horizonYear: result.horizonYear ?? null,
    pathA: {
      label: result.outcomeA?.label ?? 'BTO',
      netPosition: centsToDollars(result.outcomeA?.netPositionCents),
    },
    pathB: {
      label: result.outcomeB?.label ?? 'Resale',
      netPosition: centsToDollars(result.outcomeB?.netPositionCents),
    },
    inputs: saved.inputs,
    saved,
  }
}

async function fetchOne(id) {
  try {
    const { scenario } = await getScenario(id)
    return toCompareScenario(scenario)
  } catch (e) {
    const status = e?.response?.status
    // 404: deleted or not this user's. 400: malformed id (e.g. a hand-edited link). Both mean "not found".
    if (status === 404 || status === 400) throw notFound(id)
    throw e // 401 and network errors go to the page as-is
  }
}

async function loadMockPair(idA, idB) {
  await new Promise((r) => setTimeout(r, 300))
  const a = MOCK_SCENARIOS[idA]
  const b = MOCK_SCENARIOS[idB]
  if (!a) throw notFound(idA)
  if (!b) throw notFound(idB)
  return [a, b]
}

export async function loadComparePair(idA, idB) {
  if (USE_MOCK) return loadMockPair(idA, idB)
  return Promise.all([fetchOne(idA), fetchOne(idB)])
}

export async function openScenarioInResults(scenario) {
  // Mock scenarios have no saved plan behind them, so Results keeps the current plan.
  if (USE_MOCK || !scenario?.saved) return
  useScenarioStore().loadSaved(scenario.saved)
}