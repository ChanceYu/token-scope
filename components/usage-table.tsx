'use client'
import * as React from 'react'
import { SparkBars } from '@/components/sparkline'
import { aggregateByAgent, aggregateByPeriod } from '@/lib/aggregate'
import { cn } from '@/lib/utils'
import type { DistributionSlice, UsageRow } from '@/lib/types'

type BreakdownRow = {
  agent: string
  tokens: number
  cost: number
  modelsUsed: string[]
  series: number[]
}

/* Soft multi-hue palette (Tokyo Night-inspired) — same lightness so columns sit visually balanced */
const AGENT_COLORS = [
  'oklch(0.74 0.130 255)', // blue
  'oklch(0.79 0.135 75)',  // amber
  'oklch(0.79 0.150 145)', // sage
  'oklch(0.74 0.155 295)', // purple
  'oklch(0.81 0.130 220)', // cyan
  'oklch(0.74 0.145 15)',  // coral
  'oklch(0.77 0.130 175)', // teal
  'oklch(0.76 0.140 320)', // magenta
  'oklch(0.78 0.130 45)',  // peach
]

function agentColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AGENT_COLORS[h % AGENT_COLORS.length]
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function fmtCost(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function compact(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(Math.round(n))
}

const TH_CLASS =
  'sticky top-0 z-10 bg-card/80 px-3 py-3 text-left text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground backdrop-blur-md align-middle'
const TH_RIGHT = `${TH_CLASS} text-right`
const TD_CLASS = 'h-11 px-3 align-middle text-foreground'
const TD_RIGHT = `${TD_CLASS} text-right tabular-nums`

type Props = {
  rows: UsageRow[]
  slices?: DistributionSlice[]
}

export function UsageTable({ rows, slices }: Props) {
  const periods = React.useMemo(
    () => aggregateByPeriod(rows).map((p) => p.period),
    [rows],
  )

  const breakdown = React.useMemo<BreakdownRow[]>(() => {
    // When we have a multi-agent distribution (filter.agent === 'all'),
    // prefer it — distribution is authoritative for per-agent splits.
    if (slices && slices.length > 1) {
      return slices
        .map((s) => ({
          agent: s.agent,
          tokens: s.tokens,
          cost: s.cost,
          modelsUsed: s.modelsUsed,
          series: [] as number[],
        }))
        .sort((a, b) => b.tokens - a.tokens)
    }
    const agg = aggregateByAgent(rows)
    const periodIdx = new Map(periods.map((p, i) => [p, i]))
    return agg.map((a) => {
      const arr = new Array(periods.length).fill(0)
      for (const s of a.series) {
        const i = periodIdx.get(s.period)
        if (i != null) arr[i] = s.total
      }
      return {
        agent: a.agent,
        tokens: a.tokens,
        cost: a.cost,
        modelsUsed: a.modelsUsed,
        series: arr,
      }
    })
  }, [slices, rows, periods])

  const totalTokens = breakdown.reduce((s, r) => s + r.tokens, 0)
  const totalCost = breakdown.reduce((s, r) => s + r.cost, 0)
  const totalAvgPerDay = periods.length > 0 ? totalTokens / periods.length : 0

  return (
    <section className="rounded-lg border border-primary/15 bg-card/55">
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-foreground/90">
          Agent Breakdown
        </h3>
      </header>

      <div className="overflow-x-auto">
        {breakdown.length === 0 ? (
          <div className="px-4 pb-6 pt-2 text-xs text-muted-foreground">no rows</div>
        ) : (
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className={cn(TH_CLASS, 'pl-4')}>Agent</th>
                <th className={TH_RIGHT}>Tokens</th>
                <th className={TH_RIGHT}>% Tokens</th>
                <th className={TH_RIGHT}>Cost (USD)</th>
                <th className={TH_RIGHT}>% Cost</th>
                <th className={TH_RIGHT}>Avg / Day</th>
                <th className={cn(TH_RIGHT, 'pr-4')}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((b) => {
                const pctTokens = totalTokens > 0 ? (b.tokens / totalTokens) * 100 : 0
                const pctCost = totalCost > 0 ? (b.cost / totalCost) * 100 : 0
                const avgPerDay = periods.length > 0 ? b.tokens / periods.length : 0
                const color = agentColor(b.agent)
                return (
                  <tr
                    key={b.agent}
                    className="transition-colors hover:bg-primary/5 [&>td]:border-b [&>td]:border-primary/[0.06]"
                  >
                    <td className={cn(TD_CLASS, 'pl-4 font-medium')}>{b.agent}</td>
                    <td className={TD_RIGHT}>{fmt(b.tokens)}</td>
                    <td className={cn(TD_RIGHT, 'text-primary')}>{pctTokens.toFixed(1)}%</td>
                    <td className={TD_RIGHT}>${fmtCost(b.cost)}</td>
                    <td className={cn(TD_RIGHT, 'text-primary')}>{pctCost.toFixed(1)}%</td>
                    <td className={cn(TD_RIGHT, 'text-muted-foreground')}>
                      {compact(avgPerDay)}
                    </td>
                    <td className={cn(TD_RIGHT, 'pr-4')}>
                      <div className="flex justify-end">
                        {b.series.length > 0 ? (
                          <SparkBars values={b.series} color={color} width={110} height={24} />
                        ) : (
                          <div className="flex h-6 w-[110px] items-end gap-px">
                            {/* visual stand-in proportional to share of total */}
                            <div
                              className="h-full"
                              style={{
                                width: `${Math.max(2, pctTokens)}%`,
                                background: `color-mix(in oklch, ${color} 60%, transparent)`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              <tr className="bg-card/60 [&>td]:border-t [&>td]:border-primary/[0.06]">
                <td className={cn(TD_CLASS, 'pl-4 text-xs font-semibold uppercase tracking-wider text-primary')}>
                  Total
                </td>
                <td className={cn(TD_RIGHT, 'font-semibold text-primary')}>
                  {fmt(totalTokens)}
                </td>
                <td className={cn(TD_RIGHT, 'font-semibold text-primary')}>100%</td>
                <td className={cn(TD_RIGHT, 'font-semibold text-primary')}>
                  ${fmtCost(totalCost)}
                </td>
                <td className={cn(TD_RIGHT, 'font-semibold text-primary')}>100%</td>
                <td className={cn(TD_RIGHT, 'font-semibold text-primary')}>
                  {compact(totalAvgPerDay)}
                </td>
                <td className={cn(TD_RIGHT, 'pr-4')} />
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
