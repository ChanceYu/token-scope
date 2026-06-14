'use client'
import * as React from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BucketPicker } from '@/components/bucket-picker'
import { aggregateByPeriod, rebucket } from '@/lib/aggregate'
import type { Bucket, UsageRow } from '@/lib/types'

const INPUT_COLOR = 'oklch(0.74 0.130 255)' /* blue — chart-1 */
const OUTPUT_COLOR = 'oklch(0.79 0.135 75)' /* amber — chart-2 */
const GRID_COLOR = 'oklch(0.32 0.040 270)'
const CURSOR_COLOR = 'oklch(0.72 0.130 255)'

const TICK_STYLE = {
  fontSize: 10,
  fill: 'oklch(0.58 0.050 268)',
  fontFamily: 'inherit',
} as const

function formatAxisTokens(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(0) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K'
  return String(Math.round(n))
}

function formatPeriodTick(p: string): string {
  // 'YYYY-MM-DD' → 'MMM dd'
  const parts = p.split('-')
  if (parts.length !== 3) return p
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const m = Number(parts[1]) - 1
  if (m < 0 || m > 11) return p
  return `${months[m]} ${parts[2]}`
}

function ChartCard({
  title,
  bucket,
  onBucketChange,
  children,
}: {
  title: string
  bucket: Bucket
  onBucketChange: (b: Bucket) => void
  children: React.ReactNode
}) {
  return (
    <section className="surface-grid flex h-full flex-col rounded-lg border border-border/80 bg-card/55 p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-foreground/90">
          {title}
        </h3>
        <BucketPicker value={bucket} onChange={onBucketChange} />
      </header>
      {children}
    </section>
  )
}

function TerminalTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string; dataKey: string }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-md border border-border bg-popover/95 px-3 py-2 text-[11px] text-foreground shadow-md backdrop-blur-sm">
      <div className="mb-1 text-muted-foreground">{label}</div>
      <div className="space-y-0.5">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2 tabular-nums">
            <span
              className="inline-block size-2 rounded-full"
              style={{ background: p.color }}
            />
            <span className="capitalize text-muted-foreground">{p.name}</span>
            <span className="ml-auto font-semibold">
              {Number(p.value).toLocaleString('en-US')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TrendChart({ rows }: { rows: UsageRow[] }) {
  const [bucket, setBucket] = React.useState<Bucket>('daily')
  const data = React.useMemo(
    () => aggregateByPeriod(rebucket(rows, bucket)),
    [rows, bucket],
  )

  return (
    <ChartCard title="Token Usage Trend" bucket={bucket} onBucketChange={setBucket}>
      <div className="mb-2 flex items-center gap-4 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: INPUT_COLOR }} />
          Input Tokens
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: OUTPUT_COLOR }} />
          Output Tokens
        </span>
      </div>
      <div className="h-56 min-h-56 flex-1">
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
            <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
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
                tickFormatter={formatAxisTokens}
                width={42}
              />
              <Tooltip
                content={<TerminalTooltip />}
                cursor={{ stroke: CURSOR_COLOR, strokeDasharray: '2 3', strokeOpacity: 0.5 }}
              />
              <Line
                type="monotone"
                name="input"
                dataKey="input"
                stroke={INPUT_COLOR}
                strokeWidth={1.75}
                dot={{ r: 3, stroke: INPUT_COLOR, fill: 'oklch(0.20 0.025 270)', strokeWidth: 1.5 }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                name="output"
                dataKey="output"
                stroke={OUTPUT_COLOR}
                strokeWidth={1.75}
                dot={{ r: 3, stroke: OUTPUT_COLOR, fill: 'oklch(0.20 0.025 270)', strokeWidth: 1.5 }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  )
}
