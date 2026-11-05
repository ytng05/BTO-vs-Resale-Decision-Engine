import { describe, expect, it } from 'vitest'
import {
  aheadPathKey,
  bestPath,
  compareHeadline,
  horizonsDiffer,
  rulesetsDiffer,
} from '../src/utils/scenarioCompare'
import { useComparePicker } from '../src/composables/useComparePicker'

const make = (a, b, horizonYear = 2036, rulesetVersion = '2026-08-24') => ({
  horizonYear,
  rulesetVersion,
  pathA: { label: 'BTO', netPosition: a },
  pathB: { label: 'Resale', netPosition: b },
})

describe('aheadPathKey', () => {
  it('flags the higher path', () => {
    expect(aheadPathKey(make(412000, 398000))).toBe('pathA')
    expect(aheadPathKey(make(371000, 399000))).toBe('pathB')
  })
  it('reports a tie', () => {
    expect(aheadPathKey(make(400000, 400000))).toBe('tie')
  })
  it('picks the only path with a figure', () => {
    expect(aheadPathKey(make(null, 300000))).toBe('pathB')
  })
  it('returns null when neither path has a figure', () => {
    expect(aheadPathKey(make(null, null))).toBeNull()
  })
})

describe('bestPath', () => {
  it('returns the higher path with its name and label', () => {
    expect(bestPath(make(412000, 398000))).toMatchObject({ name: 'Path A', label: 'BTO', netPosition: 412000 })
  })
})

describe('compareHeadline', () => {
  it('compares each scenario’s own best path at a common horizon', () => {
    // A's best: BTO 412,000. B's best: Resale 399,000. Gap 13,000.
    const h = compareHeadline(make(412000, 398000), make(371000, 399000))
    expect(h.winner).toBe('A')
    expect(h.text).toBe('Scenario A (BTO) ends S$13,000 ahead of Scenario B.')
  })
  it('names Scenario B when B wins', () => {
    const h = compareHeadline(make(300000, 310000), make(330000, 320000))
    expect(h.winner).toBe('B')
    expect(h.text).toBe('Scenario B (BTO) ends S$20,000 ahead of Scenario A.')
  })
  it('handles a level result', () => {
    expect(compareHeadline(make(400000, 1), make(2, 400000)).winner).toBe('tie')
  })
  it('names no winner when only one scenario has a figure', () => {
    const h = compareHeadline(make(null, null), make(1, 2))
    expect(h.winner).toBeNull()
    expect(h.text).toContain('cannot be compared')
    expect(compareHeadline(make(null, null), make(null, null)).winner).toBeNull()
  })
  it('names no winner and no dollar gap when horizon years differ (D1)', () => {
    const h = compareHeadline(make(412000, 398000, 2036), make(371000, 399000, 2037))
    expect(h.winner).toBeNull()
    expect(h.text).toContain("can't be compared directly")
    expect(h.text).toContain('different horizon years')
    expect(h.text).not.toContain('S$')
  })
  it('names no winner when ruleset versions differ', () => {
    const h = compareHeadline(
      make(412000, 398000, 2036, '2026-08-24'),
      make(371000, 399000, 2036, '2025-08-01'),
    )
    expect(h.winner).toBeNull()
    expect(h.text).toContain('different rulesets')
  })
  it('mentions both when horizon and ruleset differ', () => {
    const h = compareHeadline(make(1, 2, 2036, '2026-08-24'), make(1, 2, 2037, '2025-08-01'))
    expect(h.text).toContain('different horizon years and rulesets')
  })
})

describe('horizonsDiffer', () => {
  it('is true only when horizon years differ', () => {
    expect(horizonsDiffer(make(1, 2, 2036), make(1, 2, 2037))).toBe(true)
    expect(horizonsDiffer(make(1, 2, 2036), make(1, 2, 2036))).toBe(false)
  })
})

describe('rulesetsDiffer', () => {
  it('is true only when ruleset versions differ', () => {
    expect(rulesetsDiffer(make(1, 2, 2036, '2026-08-24'), make(1, 2, 2036, '2025-08-01'))).toBe(true)
    expect(rulesetsDiffer(make(1, 2), make(1, 2))).toBe(false)
  })
})

describe('useComparePicker', () => {
  it('allows at most two and builds the compare route in pick order', () => {
    const p = useComparePicker()
    p.toggle('x')
    p.toggle('y')
    p.toggle('z') // blocked
    expect(p.selected.value).toEqual(['x', 'y'])
    expect(p.isDisabled('z')).toBe(true)
    expect(p.compareRoute.value).toEqual({ path: '/scenarios/compare', query: { a: 'x', b: 'y' } })
  })
  it('unticking frees a slot', () => {
    const p = useComparePicker()
    p.toggle('x')
    p.toggle('y')
    p.toggle('x')
    expect(p.selected.value).toEqual(['y'])
    expect(p.canCompare.value).toBe(false)
    expect(p.compareRoute.value).toBeNull()
  })
})