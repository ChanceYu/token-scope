import type { Bucket, UsageRow } from './types'

/**
 * Re-bucket daily rows into weekly (ISO, Monday-start) or monthly buckets on
 * the client. Lets a single daily fetch power Daily/Weekly/Monthly switches in
 * the trend & cost charts without extra server-side collection work.
 */
function bucketKey(period: string, bucket: Bucket): string {
  if (bucket === 'monthly') {
    return period.length >= 7 ? `${period.slice(0, 7)}-01` : period
  }
  if (bucket === 'weekly') {
    const [y, m, d] = period.split('-').map(Number)
    if (!y || !m || !d) return period
    const date = new Date(y, m - 1, d)
    const dow = date.getDay() // 0=Sun..6=Sat
    const monOffset = dow === 0 ? -6 : 1 - dow
    date.setDate(date.getDate() + monOffset)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  return period
}

export function rebucket(rows: UsageRow[], bucket: Bucket): UsageRow[] {
  if (bucket === 'daily') return rows
  const map = new Map<string, UsageRow & { _models: Set<string> }>()
  for (const r of rows) {
    if (!r.period) continue
    const key = bucketKey(r.period, bucket)
    const cur = map.get(key) ?? {
      period: key,
      agent: r.agent,
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      modelsUsed: [] as string[],
      _models: new Set<string>(),
    }
    cur.inputTokens += r.inputTokens
    cur.outputTokens += r.outputTokens
    cur.cacheCreationTokens += r.cacheCreationTokens
    cur.cacheReadTokens += r.cacheReadTokens
    cur.totalTokens += r.totalTokens
    cur.totalCost += r.totalCost
    for (const m of r.modelsUsed) cur._models.add(m)
    map.set(key, cur)
  }
  return Array.from(map.values())
    .map(({ _models, ...rest }) => ({ ...rest, modelsUsed: [..._models].sort() }))
    .sort((a, b) => (a.period < b.period ? -1 : 1))
}

export type AggregatedRow = {
  period: string
  input: number
  output: number
  cache: number
  cost: number
  total: number
  agents: string[]
}

export function aggregateByPeriod(rows: UsageRow[]): AggregatedRow[] {
  const map = new Map<string, AggregatedRow & { _agents: Set<string> }>()
  for (const r of rows) {
    const e = map.get(r.period) ?? {
      period: r.period,
      input: 0,
      output: 0,
      cache: 0,
      cost: 0,
      total: 0,
      agents: [],
      _agents: new Set<string>(),
    }
    e.input += r.inputTokens
    e.output += r.outputTokens
    e.cache += r.cacheCreationTokens + r.cacheReadTokens
    e.cost += r.totalCost
    e.total += r.totalTokens
    e._agents.add(r.agent)
    map.set(r.period, e)
  }
  return Array.from(map.values())
    .map(({ _agents, ...rest }) => ({ ...rest, agents: Array.from(_agents) }))
    .sort((a, b) => (a.period < b.period ? -1 : 1))
}

export type AgentAggregate = {
  agent: string
  tokens: number
  input: number
  output: number
  cache: number
  cost: number
  modelsUsed: string[]
  series: { period: string; total: number }[]
}

export function aggregateByAgent(rows: UsageRow[]): AgentAggregate[] {
  const map = new Map<
    string,
    AgentAggregate & { _models: Set<string>; _periods: Map<string, number> }
  >()
  for (const r of rows) {
    const e = map.get(r.agent) ?? {
      agent: r.agent,
      tokens: 0,
      input: 0,
      output: 0,
      cache: 0,
      cost: 0,
      modelsUsed: [],
      series: [],
      _models: new Set<string>(),
      _periods: new Map<string, number>(),
    }
    e.tokens += r.totalTokens
    e.input += r.inputTokens
    e.output += r.outputTokens
    e.cache += r.cacheCreationTokens + r.cacheReadTokens
    e.cost += r.totalCost
    for (const m of r.modelsUsed) e._models.add(m)
    e._periods.set(r.period, (e._periods.get(r.period) ?? 0) + r.totalTokens)
    map.set(r.agent, e)
  }
  return Array.from(map.values())
    .map(({ _models, _periods, ...rest }) => ({
      ...rest,
      modelsUsed: Array.from(_models),
      series: Array.from(_periods.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([period, total]) => ({ period, total })),
    }))
    .sort((a, b) => b.tokens - a.tokens)
}
