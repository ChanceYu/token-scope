'use client'
import useSWR from 'swr'
import { aggregateByAgent } from '@/lib/aggregate'
import type { DistributionSlice, UsageRow } from '@/lib/types'

/**
 * Single-source dashboard data hook. /api/data returns the whole snapshot
 * (every known agent × daily granularity, all time); the page filters/aggs
 * the rows in memory rather than firing per-filter requests.
 */
export type DataSnapshot = {
  fetchedAt: string
  agents: string[]
  rows: UsageRow[]
  failedAgents: string[]
  refreshing: boolean
  sourceError?: string
}

const fetcher = async (url: string): Promise<DataSnapshot> => {
  const r = await fetch(url)
  if (!r.ok) {
    const body = (await r.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? r.statusText)
  }
  return r.json()
}

// keepPreviousData makes auto-refresh and refresh-button presses feel seamless
// — the prior snapshot stays on screen while the next request is in flight.
const SWR_OPTS = {
  keepPreviousData: true,
  refreshInterval: (data?: DataSnapshot) => (data?.refreshing ? 1000 : 0),
} as const

export function useData(refreshKey: number) {
  const url = refreshKey > 0 ? `/api/data?refresh=1&_k=${refreshKey}` : '/api/data'
  return useSWR<DataSnapshot>(url, fetcher, SWR_OPTS)
}

export function filterRows(
  rows: UsageRow[],
  agent: string,
  since: string | null,
  until: string | null,
): UsageRow[] {
  return rows.filter((r) => {
    if (agent !== 'all' && r.agent !== agent) return false
    if (since && r.period < since) return false
    if (until && r.period > until) return false
    return true
  })
}

export function rowsInDateRange(
  rows: UsageRow[],
  since: string | null,
  until: string | null,
): UsageRow[] {
  if (!since && !until) return rows
  return rows.filter((r) => {
    if (since && r.period < since) return false
    if (until && r.period > until) return false
    return true
  })
}

/**
 * Per-agent slices for the Agent Breakdown distribution. Always computed
 * over the date-range slice, ignoring the agent filter — the breakdown
 * card should show the whole pie even when a single agent is selected.
 */
export function computeSlices(rows: UsageRow[]): DistributionSlice[] {
  const agg = aggregateByAgent(rows)
  const totalTokens = agg.reduce((s, a) => s + a.tokens, 0)
  return agg
    .filter((a) => a.tokens > 0)
    .map((a) => ({
      agent: a.agent,
      tokens: a.tokens,
      cost: a.cost,
      pct: totalTokens > 0 ? (a.tokens / totalTokens) * 100 : 0,
      modelsUsed: a.modelsUsed,
    }))
    .sort((a, b) => b.tokens - a.tokens)
}
