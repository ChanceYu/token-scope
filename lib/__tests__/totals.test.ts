import { describe, it, expect } from 'vitest'
import { buildTotals } from '@/lib/totals'
import type { UsageRow } from '@/lib/types'

function row(period: string, totalTokens: number, totalCost: number): UsageRow {
  return {
    period,
    agent: 'all',
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    totalTokens,
    totalCost,
    modelsUsed: [],
  }
}

describe('buildTotals', () => {
  const now = new Date('2026-06-12T12:00:00Z') // Friday, week of 2026-06-08

  it('sums today only when single-day data', () => {
    const t = buildTotals([row('2026-06-12', 1000, 1.5)], 'all', now)
    expect(t.today.tokens).toBe(1000)
    expect(t.today.cost).toBeCloseTo(1.5)
  })

  it('sums week from Monday onwards', () => {
    const rows = [
      row('2026-06-07', 100, 0.1),   // Sunday — outside
      row('2026-06-08', 200, 0.2),   // Mon
      row('2026-06-10', 300, 0.3),   // Wed
      row('2026-06-12', 400, 0.4),   // Fri (today)
    ]
    const t = buildTotals(rows, 'all', now)
    expect(t.week.tokens).toBe(900)
    expect(t.week.cost).toBeCloseTo(0.9)
  })

  it('sums month from 1st onwards', () => {
    const rows = [
      row('2026-05-31', 500, 0.5),   // outside
      row('2026-06-01', 100, 0.1),
      row('2026-06-12', 200, 0.2),
    ]
    const t = buildTotals(rows, 'all', now)
    expect(t.month.tokens).toBe(300)
  })

  it('sums allTime over all rows', () => {
    const rows = [row('2024-01-01', 10, 0.01), row('2026-06-12', 20, 0.02)]
    const t = buildTotals(rows, 'all', now)
    expect(t.allTime.tokens).toBe(30)
    expect(t.allTime.deltaPct).toBeNull()
  })

  it('deltaPct compares against previous same-length window', () => {
    const rows = [
      row('2026-06-11', 50, 0),  // yesterday (prev today)
      row('2026-06-12', 100, 0), // today
    ]
    const t = buildTotals(rows, 'all', now)
    expect(t.today.tokens).toBe(100)
    expect(t.today.deltaPct).toBeCloseTo(100) // 50 → 100 = +100%
  })

  it('deltaPct is null when previous window has 0 and current is non-zero', () => {
    const t = buildTotals([row('2026-06-12', 100, 0)], 'all', now)
    expect(t.today.deltaPct).toBeNull()
  })

  it('handles empty rows', () => {
    const t = buildTotals([], 'all', now)
    expect(t.today.tokens).toBe(0)
    expect(t.week.tokens).toBe(0)
    expect(t.month.tokens).toBe(0)
    expect(t.allTime.tokens).toBe(0)
  })

  it('writes agent into meta', () => {
    const t = buildTotals([], 'claude', now)
    expect(t.meta.agent).toBe('claude')
  })
})
