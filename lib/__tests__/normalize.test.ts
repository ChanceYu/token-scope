import { describe, it, expect } from 'vitest'
import { normalize, parseAgents } from '@/lib/normalize'
import dailyAll from './fixtures/daily-all.json'
import dailyClaude from './fixtures/daily-claude.json'
import weeklyAll from './fixtures/weekly-all.json'
import monthlyAll from './fixtures/monthly-all.json'

describe('normalize', () => {
  it('returns [] for null/undefined/non-object', () => {
    expect(normalize(null, 'daily', 'all')).toEqual([])
    expect(normalize(undefined, 'daily', 'all')).toEqual([])
    expect(normalize('hi', 'daily', 'all')).toEqual([])
  })

  it('returns [] when bucket key missing', () => {
    expect(normalize({ foo: [] }, 'daily', 'all')).toEqual([])
  })

  it('normalizes daily-all fixture', () => {
    const rows = normalize(dailyAll, 'daily', 'all')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      period: '2026-06-10',
      agent: 'all',
      inputTokens: 100,
      outputTokens: 50,
      cacheReadTokens: 1000,
      totalTokens: 1150,
      totalCost: 0.12,
    })
    expect(rows[0].modelsUsed).toEqual(['claude-opus-4-7'])
  })

  it('preserves agent name when row.agent is specific', () => {
    const rows = normalize(dailyClaude, 'daily', 'claude')
    expect(rows[0].agent).toBe('claude')
  })

  it('falls back to queryAgent when row.agent missing', () => {
    const raw = { daily: [{ period: '2026-06-10', inputTokens: 1, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, totalTokens: 1, totalCost: 0 }] }
    expect(normalize(raw, 'daily', 'gemini')[0].agent).toBe('gemini')
  })

  it('handles weekly bucket', () => {
    const rows = normalize(weeklyAll, 'weekly', 'all')
    expect(rows[0].period).toBe('2026-W23')
  })

  it('handles monthly bucket', () => {
    const rows = normalize(monthlyAll, 'monthly', 'all')
    expect(rows[0].period).toBe('2026-06')
  })
})

describe('parseAgents', () => {
  it('returns deduped sorted list from metadata.agents', () => {
    const agents = parseAgents(dailyAll)
    expect(agents).toEqual(['claude', 'codex', 'gemini'])
  })

  it('returns [] when raw lacks daily/weekly/monthly', () => {
    expect(parseAgents({})).toEqual([])
    expect(parseAgents(null)).toEqual([])
  })
})
