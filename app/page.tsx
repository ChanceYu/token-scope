'use client'
import * as React from 'react'
import { Toaster, toast } from 'sonner'
import { Header, type FilterState } from '@/components/header'
import { HeroTotals } from '@/components/hero-totals'
import { TotalsCards } from '@/components/totals-cards'
import { ActivityHeatmap } from '@/components/activity-heatmap'
import { TrendChart } from '@/components/trend-chart'
import { CostChart } from '@/components/cost-chart'
import { UsageTable } from '@/components/usage-table'
import { DetailsTable } from '@/components/details-table'
import { previousPeriod, ymd } from '@/lib/date'
import { subDays } from 'date-fns'
import { computeSlices, filterRows, rowsInDateRange, useData } from '@/hooks/use-usage'
import type { UsageRow } from '@/lib/types'

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function initialFilter(): FilterState {
  const now = new Date()
  // 30D = today + 29 prior days. date-fns keeps this calendar-day based.
  return {
    preset: '30d',
    since: ymd(subDays(now, 29)),
    until: ymd(now),
    agent: 'all',
  }
}

function trendDelta(series: number[]): number | null {
  if (series.length < 2) return null
  const mid = Math.floor(series.length / 2)
  const earlier = series.slice(0, mid)
  const later = series.slice(mid)
  if (!earlier.length || !later.length) return null
  const avgE = earlier.reduce((a, b) => a + b, 0) / earlier.length
  const avgL = later.reduce((a, b) => a + b, 0) / later.length
  if (avgE === 0) return avgL === 0 ? 0 : null
  return ((avgL - avgE) / avgE) * 100
}

function formatRangeLabel(since: string | null, until: string | null): string {
  if (!since || !until) return 'all time'
  const [ys, ms, ds] = since.split('-').map(Number)
  const [yu, mu, du] = until.split('-').map(Number)
  if (!ys || !yu) return `${since} - ${until}`
  const left = `${MONTH_LABELS[ms - 1]} ${ds}`
  const right = `${MONTH_LABELS[mu - 1]} ${du}, ${yu}`
  if (ys === yu) return `${left} - ${right}`
  return `${MONTH_LABELS[ms - 1]} ${ds}, ${ys} - ${right}`
}

function dailyTotalSeries(rows: UsageRow[]): number[] {
  const byPeriod = new Map<string, number>()
  for (const r of rows) {
    byPeriod.set(r.period, (byPeriod.get(r.period) ?? 0) + r.totalTokens)
  }
  return Array.from(byPeriod.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, v]) => v)
}

export default function Page() {
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [filter, setFilter] = React.useState<FilterState>(initialFilter)

  const data = useData(refreshKey)
  const allRows = data.data?.rows ?? []
  const allAgents = data.data?.agents ?? []
  const failedAgents = data.data?.failedAgents
  const sourceError = data.data?.sourceError

  React.useEffect(() => {
    if (data.error) toast.error(`data: ${data.error.message}`)
  }, [data.error])

  React.useEffect(() => {
    if (sourceError) toast.error(`data source: ${sourceError}`)
  }, [sourceError])

  // Filtered rows feed totals, charts, and the details table — they all
  // respect the agent + date-range filter.
  const filteredRows = React.useMemo(
    () => filterRows(allRows, filter.agent, filter.since, filter.until),
    [allRows, filter.agent, filter.since, filter.until],
  )

  // Distribution slices always cover the whole pie for the active date
  // range, regardless of the agent filter — so "Agent Breakdown" stays
  // useful even when a single agent is selected.
  const slices = React.useMemo(
    () =>
      filter.agent === 'all'
        ? computeSlices(rowsInDateRange(allRows, filter.since, filter.until))
        : undefined,
    [allRows, filter.agent, filter.since, filter.until],
  )

  const isLoading = data.isLoading || data.isValidating || Boolean(data.data?.refreshing)
  const lastFetchedAt = data.data?.fetchedAt ?? null

  const dailySeries = React.useMemo(() => dailyTotalSeries(filteredRows), [filteredRows])
  const totalTokens = dailySeries.reduce((a, b) => a + b, 0)
  // No prior window to compare against when the user is viewing "ALL"
  // (or any range without explicit since/until) — hide the indicator.
  const hasRange = Boolean(filter.since && filter.until)
  const delta = hasRange ? trendDelta(dailySeries) : null

  const comparisonLabel = React.useMemo(() => {
    if (!filter.since || !filter.until) return ''
    // A single-day window (1D preset, or any custom from===to) has no useful
    // "vs prior period" framing — collapse the comparison row.
    if (filter.since === filter.until) return ''
    const prev = previousPeriod(filter.since, filter.until)
    return formatRangeLabel(prev.since, prev.until)
  }, [filter.since, filter.until])

  return (
    <div className="relative flex min-h-screen flex-col">
      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: 'oklch(0.25 0.035 270)',
            border: '1px solid oklch(0.32 0.040 270)',
            color: 'oklch(0.85 0.055 265)',
            fontFamily: 'var(--font-geist-mono)',
          },
        }}
      />

      <Header
        agents={allAgents}
        filter={filter}
        onFilterChange={setFilter}
        onRefresh={() => setRefreshKey((k) => k + 1)}
        isRefreshing={isLoading}
        lastFetchedAt={lastFetchedAt}
      />

      <main className="mx-auto w-full max-w-[1600px] flex-1 space-y-3 px-3 pb-12 pt-3 sm:px-6">
        <HeroTotals
          totalTokens={totalTokens}
          deltaPct={delta}
          comparisonLabel={comparisonLabel}
          loading={isLoading && filteredRows.length === 0}
        />

        <TotalsCards rows={filteredRows} loading={isLoading} />

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <TrendChart rows={filteredRows} />
          <CostChart rows={filteredRows} />
          <ActivityHeatmap rows={filteredRows} since={filter.since} until={filter.until} />
        </div>

        <UsageTable rows={filteredRows} slices={slices} />

        <DetailsTable
          rows={filteredRows}
          loading={isLoading}
          failedAgents={failedAgents}
          sourceError={sourceError}
        />
      </main>
    </div>
  )
}
