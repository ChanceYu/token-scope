import type { TotalSlot, TotalsResponse, UsageRow } from './types'
import { deltaPct, monthRange, previousPeriod, weekRange, ymd } from './date'

function inRange(period: string, since: string, until: string): boolean {
  return period >= since && period <= until
}

function sumRange(rows: UsageRow[], since: string, until: string) {
  let tokens = 0, cost = 0
  for (const r of rows) {
    if (inRange(r.period, since, until)) {
      tokens += r.totalTokens
      cost += r.totalCost
    }
  }
  return { tokens, cost }
}

function slot(rows: UsageRow[], since: string, until: string): TotalSlot {
  const cur = sumRange(rows, since, until)
  const prev = previousPeriod(since, until)
  const prevSum = sumRange(rows, prev.since, prev.until)
  return {
    tokens: cur.tokens,
    cost: cur.cost,
    deltaPct: deltaPct(cur.tokens, prevSum.tokens),
  }
}

export function buildTotals(rows: UsageRow[], agent: string, now: Date = new Date()): TotalsResponse {
  const today = ymd(now)
  const w = weekRange(now)
  const m = monthRange(now)
  let allTokens = 0, allCost = 0
  for (const r of rows) {
    allTokens += r.totalTokens
    allCost += r.totalCost
  }
  return {
    today: slot(rows, today, today),
    week: slot(rows, w.since, w.until),
    month: slot(rows, m.since, m.until),
    allTime: { tokens: allTokens, cost: allCost, deltaPct: null },
    meta: { agent, fetchedAt: '', fromCache: false },
  }
}
