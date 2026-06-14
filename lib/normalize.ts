import type { Bucket, UsageRow } from './types'

/**
 * Usage exports can contain two slightly different row shapes:
 *  - `--all` (no agent arg):  { period, agent, totalCost, modelsUsed: string[], ... }
 *  - agent-scoped: { date, costUSD, models: { [name]: {...} }, ... }
 *
 * Token fields (`inputTokens`, `outputTokens`, `cacheCreationTokens`,
 * `cacheReadTokens`, `totalTokens`) are identical in both shapes. We normalise
 * the divergent ones so downstream code never has to care which source produced
 * the data.
 */
type RawRow = {
  period?: string
  date?: string
  agent?: string
  inputTokens?: number
  outputTokens?: number
  cacheCreationTokens?: number
  cacheReadTokens?: number
  totalTokens?: number
  totalCost?: number
  costUSD?: number
  modelsUsed?: string[]
  models?: string[] | Record<string, unknown>
  metadata?: { agents?: string[] }
}

function pickRows(raw: unknown, bucket: Bucket): RawRow[] {
  if (!raw || typeof raw !== 'object') return []
  const obj = raw as Record<string, unknown>
  const v = obj[bucket]
  return Array.isArray(v) ? (v as RawRow[]) : []
}

function pickModels(r: RawRow): string[] {
  if (Array.isArray(r.modelsUsed)) return r.modelsUsed
  if (Array.isArray(r.models)) return r.models
  if (r.models && typeof r.models === 'object') return Object.keys(r.models)
  return []
}

export function normalize(raw: unknown, bucket: Bucket, queryAgent: string): UsageRow[] {
  return pickRows(raw, bucket).map((r) => ({
    period: r.period ?? r.date ?? '',
    agent: r.agent ?? queryAgent,
    inputTokens: r.inputTokens ?? 0,
    outputTokens: r.outputTokens ?? 0,
    cacheCreationTokens: r.cacheCreationTokens ?? 0,
    cacheReadTokens: r.cacheReadTokens ?? 0,
    totalTokens: r.totalTokens ?? 0,
    totalCost: r.totalCost ?? r.costUSD ?? 0,
    modelsUsed: pickModels(r),
  }))
}

export function parseAgents(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return []
  const buckets: Bucket[] = ['daily', 'weekly', 'monthly']
  const set = new Set<string>()
  for (const b of buckets) {
    const rows = pickRows(raw, b)
    for (const r of rows) {
      const ag = r.metadata?.agents
      if (Array.isArray(ag)) ag.forEach((a) => set.add(a))
    }
  }
  return [...set].sort()
}
