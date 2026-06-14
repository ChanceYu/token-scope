'use client'
import * as React from 'react'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BoxIcon,
  CodeXmlIcon,
  DollarSignIcon,
  DatabaseIcon,
  MessageSquareCodeIcon,
} from 'lucide-react'
import { Sparkline } from '@/components/sparkline'
import { cn } from '@/lib/utils'
import type { UsageRow } from '@/lib/types'

type StatItem = {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  formatted: string
  unit?: string
  deltaPct: number | null
  deltaInverted?: boolean
  series: number[]
}

function compactNumber(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function compactCost(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function trendDelta(series: number[]): number | null {
  if (series.length < 2) return null
  const mid = Math.floor(series.length / 2)
  const earlier = series.slice(0, mid)
  const later = series.slice(mid)
  if (!earlier.length || !later.length) return null
  const sumE = earlier.reduce((a, b) => a + b, 0) / earlier.length
  const sumL = later.reduce((a, b) => a + b, 0) / later.length
  if (sumE === 0) return sumL === 0 ? 0 : null
  return ((sumL - sumE) / sumE) * 100
}

function computeStats(rows: UsageRow[]): StatItem[] {
  const byPeriod = new Map<
    string,
    { total: number; input: number; output: number; cache: number; cost: number }
  >()

  for (const r of rows) {
    const cur = byPeriod.get(r.period) ?? {
      total: 0,
      input: 0,
      output: 0,
      cache: 0,
      cost: 0,
    }
    cur.total += r.totalTokens
    cur.input += r.inputTokens
    cur.output += r.outputTokens
    cur.cache += r.cacheCreationTokens + r.cacheReadTokens
    cur.cost += r.totalCost
    byPeriod.set(r.period, cur)
  }

  const periods = Array.from(byPeriod.keys()).sort()
  const totalSeries = periods.map((p) => byPeriod.get(p)!.total)
  const inputSeries = periods.map((p) => byPeriod.get(p)!.input)
  const outputSeries = periods.map((p) => byPeriod.get(p)!.output)
  const cacheSeries = periods.map((p) => byPeriod.get(p)!.cache)
  const costSeries = periods.map((p) => byPeriod.get(p)!.cost)

  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

  return [
    {
      key: 'total',
      label: 'Total Tokens',
      icon: BoxIcon,
      formatted: compactNumber(sum(totalSeries)),
      deltaPct: trendDelta(totalSeries),
      series: totalSeries,
    },
    {
      key: 'input',
      label: 'Input Tokens',
      icon: MessageSquareCodeIcon,
      formatted: compactNumber(sum(inputSeries)),
      deltaPct: trendDelta(inputSeries),
      series: inputSeries,
    },
    {
      key: 'output',
      label: 'Output Tokens',
      icon: CodeXmlIcon,
      formatted: compactNumber(sum(outputSeries)),
      deltaPct: trendDelta(outputSeries),
      series: outputSeries,
    },
    {
      key: 'cache',
      label: 'Cache Tokens',
      icon: DatabaseIcon,
      formatted: compactNumber(sum(cacheSeries)),
      deltaPct: trendDelta(cacheSeries),
      series: cacheSeries,
    },
    {
      key: 'cost',
      label: 'Total Cost (USD)',
      icon: DollarSignIcon,
      formatted: compactCost(sum(costSeries)),
      deltaPct: trendDelta(costSeries),
      series: costSeries,
    },
  ]
}

function StatCell({ item }: { item: StatItem }) {
  const Icon = item.icon
  const isPositive = (item.deltaPct ?? 0) >= 0
  const goodDirection = item.deltaInverted ? !isPositive : isPositive
  const Arrow = isPositive ? ArrowUpIcon : ArrowDownIcon
  const deltaColor = goodDirection ? 'text-primary' : 'text-destructive'

  return (
    <div className="surface-grid group flex flex-col gap-3 rounded-lg border border-border/80 bg-card/55 p-4 transition-colors hover:border-primary/40">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="grid size-5 place-items-center rounded-sm border border-border/80 text-current">
          <Icon className="size-3" strokeWidth={2} />
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em]">
          {item.label}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-glow-soft text-2xl font-semibold tabular-nums text-foreground">
          {item.formatted}
        </span>
        {item.unit && (
          <span className="text-xs text-muted-foreground">{item.unit}</span>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        {item.deltaPct != null ? (
          <span className={cn('inline-flex items-center gap-0.5 text-xs tabular-nums', deltaColor)}>
            <Arrow className="size-3" />
            <span className="font-semibold">{Math.abs(item.deltaPct).toFixed(1)}%</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
        <div className={cn('shrink-0', goodDirection ? 'text-primary/80' : 'text-destructive/80')}>
          <Sparkline values={item.series} width={92} height={26} />
        </div>
      </div>
    </div>
  )
}

type TotalsCardsProps = {
  rows: UsageRow[]
  loading?: boolean
}

export function TotalsCards({ rows, loading }: TotalsCardsProps) {
  const items = React.useMemo(() => computeStats(rows), [rows])

  if (loading && rows.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="surface-grid h-[112px] animate-pulse rounded-lg border border-border/80 bg-card/35"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {items.map((item) => (
        <StatCell key={item.key} item={item} />
      ))}
    </div>
  )
}
