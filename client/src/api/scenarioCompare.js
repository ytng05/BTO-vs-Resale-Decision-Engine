// Data side of /scenarios/compare. OWNER: Yu Qing.
//
// Kaashvi's page only calls these two functions. Until Yu Qing's versions
// land, they return mock scenarios in the agreed shape so the page can be
// built and tested.
//
// Contract:
//   loadComparePair(idA, idB) -> Promise<[scenarioA, scenarioB]>
//     Rejects with an Error whose .code is 'NOT_FOUND' when either scenario
//     does not exist (deleted, or not owned by this user).
//   openScenarioInResults(scenario) -> Promise<void>
//     Loads scenario.inputs into the plan store. The page then routes to /results.

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

// TODO(Yu Qing): replace with GET /api/scenarios/:id for both ids, mapped to the shape above.
export async function loadComparePair(idA, idB) {
  await new Promise((r) => setTimeout(r, 300))
  const a = MOCK_SCENARIOS[idA]
  const b = MOCK_SCENARIOS[idB]
  if (!a) throw notFound(idA)
  if (!b) throw notFound(idB)
  return [a, b]
}

// TODO(Yu Qing): load scenario.inputs into the plan store, the same way My scenarios does (#58).
export async function openScenarioInResults(scenario) {
  void scenario
}