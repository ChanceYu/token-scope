import { describe, it, expect } from 'vitest'
import { ymd, weekRange, monthRange, previousPeriod, deltaPct } from '@/lib/date'

describe('ymd', () => {
  it('formats Date as YYYY-MM-DD', () => {
    expect(ymd(new Date('2026-06-12T14:30:00Z'))).toBe('2026-06-12')
  })
})

describe('weekRange', () => {
  it('returns since=monday until=today for a Thursday', () => {
    const thu = new Date('2026-06-11T12:00:00Z') // Thursday
    const r = weekRange(thu)
    expect(r.since).toBe('2026-06-08') // Monday
    expect(r.until).toBe('2026-06-11')
  })

  it('returns since=monday on monday itself', () => {
    const mon = new Date('2026-06-08T12:00:00Z')
    const r = weekRange(mon)
    expect(r.since).toBe('2026-06-08')
    expect(r.until).toBe('2026-06-08')
  })
})

describe('monthRange', () => {
  it('returns since=first-of-month until=today', () => {
    const now = new Date('2026-06-12T12:00:00Z')
    const r = monthRange(now)
    expect(r.since).toBe('2026-06-01')
    expect(r.until).toBe('2026-06-12')
  })
})

describe('previousPeriod', () => {
  it('returns matched-length period ending day before since', () => {
    // since=2026-06-08 until=2026-06-14 (7 days)
    // prev: 2026-06-01 → 2026-06-07
    const r = previousPeriod('2026-06-08', '2026-06-14')
    expect(r.since).toBe('2026-06-01')
    expect(r.until).toBe('2026-06-07')
  })

  it('handles single-day period', () => {
    const r = previousPeriod('2026-06-12', '2026-06-12')
    expect(r.since).toBe('2026-06-11')
    expect(r.until).toBe('2026-06-11')
  })
})

describe('deltaPct', () => {
  it('returns null when previous is 0 and current is non-zero', () => {
    expect(deltaPct(100, 0)).toBeNull()
  })
  it('returns 0 when both are 0', () => {
    expect(deltaPct(0, 0)).toBe(0)
  })
  it('returns positive percent when growing', () => {
    expect(deltaPct(150, 100)).toBeCloseTo(50)
  })
  it('returns negative percent when shrinking', () => {
    expect(deltaPct(80, 100)).toBeCloseTo(-20)
  })
})
