'use client'
import * as React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BucketPicker } from '@/components/bucket-picker'
import { aggregateByPeriod, rebucket } from '@/lib/aggregate'
import type { Bucket, UsageRow } from '@/lib/types'

const COST_COLOR = 'oklch(0.74 0.130 255)' /* primary blue */
const GRID_COLOR = 'oklch(0.32 0.040 270)'

const TICK_STYLE = {
  fontSize: 10,
  fill: 'oklch(0.58 0.050 268)',
  fontFamily: 'inherit',
} as const

function formatAxisCost(n: number): string {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K'
  return '$' + Math.round(n)
}

function formatPeriodTick(p: string): string {
  const parts = p.split('-')
  if (parts.length !== 3) return p
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const m = Number(parts[1]) - 1
  if (m < 0 || m > 11) return p
  return `${months[m]} ${parts[2]}`
}

function CostTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string; dataKey: string }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  const v = Number(payload[0].value)
  return (
    <div className="rounded-md border border-border bg-popover/95 px-3 py-2 text-[11px] text-foreground shadow-md backdrop-blur-sm">
      <div className="mb-1 text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2 tabular-nums">
        <span className="size-2 rounded-full" style={{ background: COST_COLOR }} />
        <span className="text-muted-foreground">Cost</span>
        <span className="ml-auto font-semibold">
          ${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </span>
      </div>
    </div>
  )
}

export function CostChart({ rows }: { rows: UsageRow[] }) {
  const [bucket, setBucket] = React.useState<Bucket>('daily')
  const data = React.useMemo(
    () => aggregateByPeriod(rebucket(rows, bucket)),
    [rows, bucket],
  )

  return (
    <section className="surface-grid flex h-full flex-col rounded-lg border border-border/80 bg-card/55 p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-foreground/90">
          Cost Trend (USD)
        </h3>
        <BucketPicker value={bucket} onChange={setBucket} />
      </header>
      <div className="h-56 min-h-56 flex-1 pt-6">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            no data
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            initialDimension={{ width: 1, height: 1 }}
          >
            <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="costAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COST_COLOR} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={COST_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke={GRID_COLOR}
                strokeDasharray="2 4"
                vertical={false}
              />
              <XAxis
                dataKey="period"
                tick={TICK_STYLE}
                tickLine={false}
                axisLine={{ stroke: GRID_COLOR }}
                tickFormatter={formatPeriodTick}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                tick={TICK_STYLE}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatAxisCost}
                width={48}
              />
              <Tooltip
                content={<CostTooltip />}
                cursor={{ stroke: COST_COLOR, strokeDasharray: '2 3', strokeOpacity: 0.5 }}
              />
              <Area
                type="monotone"
                dataKey="cost"
                stroke={COST_COLOR}
                strokeWidth={2}
                fill="url(#costAreaGrad)"
                dot={{ r: 3, stroke: COST_COLOR, fill: 'oklch(0.20 0.025 270)', strokeWidth: 1.5 }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
