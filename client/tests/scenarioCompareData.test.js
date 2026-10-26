// Data side of /scenarios/compare: loadComparePair, toCompareScenario and openScenarioInResults.
// getScenario is faked, so no server or network is needed.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../src/api/client.js', () => ({ getScenario: vi.fn() }))

import { getScenario } from '../src/api/client.js'
import { loadComparePair, openScenarioInResults, toCompareScenario } from '../src/api/scenarioCompare.js'
import { formatMoney } from '../src/utils/format.js'
import { useScenarioStore } from '../src/stores/scenario.js'

// One outcome in the current contract shape (integer cents, warnings list, affordability).
const outcome = (netPositionCents, extra = {}) => ({
  netPositionCents,
  warnings: [],
  affordability: { withinLimit: true, shortfallCents: 0 },
  ...extra,
})

// A saved scenario as GET /api/scenarios/:id returns it (#28), with a real (non-mock) result.
const saved = (overrides = {}) => ({
  id: '64b000000000000000000001',
  name: 'Tampines BTO vs Bedok resale',
  createdAt: '2026-10-12T01:30:00.000Z',
  rulesetVersion: '2026-08-24',
  profile: { applicants: [{ age: 30 }, { age: 29 }], cashSavings: 20000 },
  choiceA: { path: 'BTO', town: 'TAMPINES', flatType: '4 ROOM' },
  choiceB: { path: 'RESALE', town: 'BEDOK', flatType: '4 ROOM', leaseBand: '80-89' },
  assumptions: { annualPriceGrowth: 0.03, horizonYear: 2040 },
  result: { horizonYear: 2038, outcomeA: outcome(41_200_050), outcomeB: outcome(39_800_000) },
  ...overrides,
})
const withOutcomes = (outcomeA, outcomeB) => saved({ result: { horizonYear: 2038, outcomeA, outcomeB } })

const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), { response: { status } })

beforeEach(() => {
  vi.mocked(getScenario).mockReset()
})

describe('toCompareScenario', () => {
  it('maps a saved scenario to the agreed shape, cents to dollars', () => {
    expect(toCompareScenario(saved())).toEqual({
      id: '64b000000000000000000001',
      name: 'Tampines BTO vs Bedok resale',
      savedAt: '2026-10-12T01:30:00.000Z',
      rulesetVersion: '2026-08-24',
      horizonYear: 2038,
      pathA: { label: 'BTO', netPosition: 412000.5 },
      pathB: { label: 'Resale', netPosition: 398000 },
      inputs: {
        profile: saved().profile,
        choiceA: saved().choiceA,
        choiceB: saved().choiceB,
        assumptions: saved().assumptions,
      },
    })
  })

  it('shows the right dollars on the card: cents are divided by 100 exactly once', () => {
    // Guards a silent factor-of-100 error: 41,200,000 cents must display as S$412,000.
    const s = toCompareScenario(withOutcomes(outcome(41_200_000), outcome(-500_000)))
    expect(formatMoney(s.pathA.netPosition)).toBe('S$412,000')
    expect(formatMoney(s.pathB.netPosition)).toBe('−S$5,000')
  })

  it('says NO_RESULT when nothing was saved with the scenario', () => {
    const s = toCompareScenario(saved({ result: undefined }))
    expect(s.pathA).toEqual({ label: 'BTO', netPosition: null, reason: 'NO_RESULT' })
    expect(s.pathB).toEqual({ label: 'Resale', netPosition: null, reason: 'NO_RESULT' })
    expect(s.horizonYear).toBe(2040) // falls back to the saved assumption
  })

  it('treats a mock result as no result', () => {
    const s = toCompareScenario(saved({ result: { ...saved().result, mock: true } }))
    expect(s.pathA).toEqual({ label: 'BTO', netPosition: null, reason: 'NO_RESULT' })
    expect(s.horizonYear).toBe(2040) // a mock horizon is not used either
  })

  it('keeps the net position and flags cashShortfall when cash plus retained OA cannot cover the signing payment', () => {
    const s = toCompareScenario(withOutcomes(outcome(41_200_000), outcome(39_800_000, { warnings: ['CASH_SHORTFALL_AT_PURCHASE'] })))
    expect(s.pathA).not.toHaveProperty('cashShortfall')
    expect(s.pathB).toEqual({ label: 'Resale', netPosition: 398000, cashShortfall: true })
  })

  it('keeps the net position when only the loan is over the limit, and reports the shortfall in dollars', () => {
    const overLimit = outcome(39_800_000, {
      warnings: ['LOAN_ABOVE_LIMIT'],
      affordability: { withinLimit: false, shortfallCents: 2_500_000 },
    })
    const s = toCompareScenario(withOutcomes(outcome(41_200_000), overLimit))
    expect(s.pathB).toEqual({ label: 'Resale', netPosition: 398000, loanShortfall: 25000 })
    expect(s.pathA).not.toHaveProperty('loanShortfall')
  })

  it.each([
    ['no netPositionCents (saved before the net-position change)', { netFinancialPosition: 185000, warnings: [] }],
    ['netPositionCents that is not whole cents', { netPositionCents: 4120.5, warnings: [] }],
    ['no warnings list', { netPositionCents: 41_200_000 }],
  ])('treats an older result shape as NO_RESULT: %s', (_label, oldOutcome) => {
    const s = toCompareScenario(withOutcomes(oldOutcome, outcome(39_800_000)))
    expect(s.pathA).toEqual({ label: 'BTO', netPosition: null, reason: 'NO_RESULT' })
    expect(s.pathB.netPosition).toBe(398000)
  })

  it('treats a result with no horizonYear (the old sale-based measure) as NO_RESULT for both paths', () => {
    const s = toCompareScenario(saved({ result: { outcomeA: outcome(41_200_000), outcomeB: outcome(39_800_000) } }))
    expect(s.pathA.reason).toBe('NO_RESULT')
    expect(s.pathB.reason).toBe('NO_RESULT')
    expect(s.horizonYear).toBe(2040)
  })

  it('labels each path from its own choice, whichever way round', () => {
    const s = toCompareScenario(saved({ choiceA: { path: 'RESALE' }, choiceB: { path: 'BTO' } }))
    expect([s.pathA.label, s.pathB.label]).toEqual(['Resale', 'BTO'])
  })
})

describe('loadComparePair', () => {
  it('loads both real scenarios and returns them in order', async () => {
    vi.mocked(getScenario).mockImplementation(async (id) => ({ scenario: saved({ id, name: `name-${id}` }) }))
    const [a, b] = await loadComparePair('id-a', 'id-b')
    expect(getScenario).toHaveBeenCalledTimes(2)
    expect([a.id, b.id]).toEqual(['id-a', 'id-b'])
    expect(a.name).toBe('name-id-a')
  })

  it('rejects with NOT_FOUND when either scenario is deleted or not this user’s (server 404)', async () => {
    vi.mocked(getScenario).mockImplementation(async (id) => {
      if (id === 'gone') throw httpError(404)
      return { scenario: saved({ id }) }
    })
    await expect(loadComparePair('id-a', 'gone')).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(loadComparePair('gone', 'id-b')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('passes a 401 through unchanged, so the page can show its logged-out state', async () => {
    vi.mocked(getScenario).mockRejectedValue(httpError(401))
    await expect(loadComparePair('id-a', 'id-b')).rejects.toMatchObject({ response: { status: 401 } })
  })

  it('serves mock- ids without calling the API, and NOT_FOUND for an unknown mock id', async () => {
    const [a, b] = await loadComparePair('mock-a', 'mock-b')
    expect([a.name, b.name]).toEqual(['BTO Tampines 2027', 'Resale Bedok 2028'])
    expect(getScenario).not.toHaveBeenCalled()
    await expect(loadComparePair('mock-a', 'mock-deleted')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('openScenarioInResults', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('loads the saved inputs into the plan store', async () => {
    await openScenarioInResults(toCompareScenario(saved()))
    const store = useScenarioStore()
    expect(store.choiceA.town).toBe('TAMPINES')
    expect(store.choiceB.leaseBand).toBe('80-89')
    expect(store.profile.cashSavings).toBe(20000)
    expect(store.profile.applicants.map((a) => a.age)).toEqual([30, 29])
  })
})
