'use client'
import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
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

const BAR_COLOR = 'oklch(0.74 0.130 255)'
const PEAK_COLOR = 'oklch(0.79 0.135 75)'

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function formatTokens(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return String(Math.round(n))
}

function formatShortDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  if (!y || !m || !d) return key
  return `${MONTH_LABELS[m - 1]} ${d}`
}

type Props = {
  rows: UsageRow[]
  since?: string | null
  until?: string | null
}

type HoverState = {
  key: string
  value: number
  x: number
  y: number
}

type ActivityDay = {
  key: string
  value: number
  height: number
  opacity: number
  isPeak: boolean
}

export function ActivityHeatmap({ rows, since, until }: Props) {
  const [hover, setHover] = React.useState<HoverState | null>(null)
  const [portalReady, setPortalReady] = React.useState(false)
  React.useEffect(() => {
    setPortalReady(true)
  }, [])

  const data = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) {
      map.set(r.period, (map.get(r.period) ?? 0) + r.totalTokens)
    }

    const dates = Array.from(map.keys()).sort()
    const minStr = since ?? dates[0] ?? null
    const maxStr = until ?? dates[dates.length - 1] ?? null

    if (!minStr || !maxStr) {
      return {
        days: [] as ActivityDay[],
        stats: {
          activeDays: 0,
          average: 0,
          peak: null as ActivityDay | null,
        },
      }
    }

    const start = parseDate(minStr)
    const end = parseDate(maxStr)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return {
        days: [] as ActivityDay[],
        stats: {
          activeDays: 0,
          average: 0,
          peak: null as ActivityDay | null,
        },
      }
    }

    const rawDays: { key: string; value: number }[] = []
    const cur = new Date(start)
    while (cur <= end) {
      const key = dateKey(cur)
      rawDays.push({ key, value: map.get(key) ?? 0 })
      cur.setDate(cur.getDate() + 1)
    }

    const max = Math.max(...rawDays.map((d) => d.value), 0)
    const days = rawDays.map((day): ActivityDay => {
      const ratio = max > 0 ? day.value / max : 0
      return {
        ...day,
        height: day.value > 0 ? Math.max(8, ratio * 100) : 2,
        opacity: day.value > 0 ? 0.3 + ratio * 0.58 : 0.12,
        isPeak: max > 0 && day.value === max,
      }
    })

    const activeDays = days.filter((day) => day.value > 0).length
    const total = days.reduce((sum, day) => sum + day.value, 0)
    const peak = days.reduce<ActivityDay | null>(
      (best, day) => (!best || day.value > best.value ? day : best),
      null,
    )

    return {
      days,
      stats: {
        activeDays,
        average: days.length > 0 ? Math.round(total / days.length) : 0,
        peak: peak && peak.value > 0 ? peak : null,
      },
    }
  }, [rows, since, until])

  const chartWidth = data.days.length > 120 ? data.days.length * 7 : undefined
  const firstDay = data.days[0]?.key
  const lastDay = data.days[data.days.length - 1]?.key

  return (
    <section className="surface-grid relative flex h-full flex-col rounded-lg border border-border/80 bg-card/55 p-4">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-foreground/90">
            Usage Activity
          </h3>
          <p className="mt-1 text-[10px] text-muted-foreground">Daily token usage</p>
        </div>
        <div className="rounded-md border border-primary/15 bg-background/20 px-2 py-1 text-right tabular-nums">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Peak</div>
          <div className="text-sm font-medium text-foreground">
            {data.stats.peak ? formatTokens(data.stats.peak.value) : '0'}
          </div>
        </div>
      </header>

      {data.days.length === 0 ? (
        <div className="flex min-h-56 flex-1 items-center justify-center text-xs text-muted-foreground">
          no activity in range
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 pb-1">
            <div className="h-40 overflow-x-auto overflow-y-hidden rounded-md border border-primary/15 bg-background/20">
              <div
                className="flex h-full min-w-full items-end gap-[3px] px-2 pb-3 pt-3"
                style={chartWidth ? { width: chartWidth } : undefined}
              >
                {data.days.map((day) => (
                  <button
                    key={day.key}
                    type="button"
                    aria-label={`${day.key}: ${day.value.toLocaleString('en-US')} tokens`}
                    className={cn(
                      'group relative flex h-full min-w-[4px] flex-1 cursor-default items-end rounded-sm outline-none',
                      'focus-visible:ring-1 focus-visible:ring-primary/80',
                    )}
                    onMouseEnter={(e) => {
                      const r = e.currentTarget.getBoundingClientRect()
                      setHover({
                        key: day.key,
                        value: day.value,
                        x: r.left + r.width / 2,
                        y: r.top + r.height - (r.height * day.height) / 100,
                      })
                    }}
                    onMouseLeave={() => setHover(null)}
                    onFocus={(e) => {
                      const r = e.currentTarget.getBoundingClientRect()
                      setHover({
                        key: day.key,
                        value: day.value,
                        x: r.left + r.width / 2,
                        y: r.top + r.height - (r.height * day.height) / 100,
                      })
                    }}
                    onBlur={() => setHover(null)}
                  >
                    <span
                      className="block w-full rounded-t-[3px] border border-white/5 transition-[height,filter,opacity] duration-150 group-hover:brightness-125"
                      style={{
                        height: `${day.height}%`,
                        opacity: day.opacity,
                        backgroundColor: day.isPeak ? PEAK_COLOR : BAR_COLOR,
                        boxShadow:
                          day.value > 0
                            ? `0 0 14px ${day.isPeak ? 'oklch(0.79 0.135 75 / 0.22)' : 'oklch(0.74 0.130 255 / 0.16)'}`
                            : 'none',
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-1 flex justify-between px-1 text-[10px] uppercase tracking-wider text-muted-foreground/75">
              <span>{firstDay ? formatShortDate(firstDay) : ''}</span>
              <span>{lastDay ? formatShortDate(lastDay) : ''}</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-primary/15 pt-3">
            <Stat
              label="Peak Day"
              value={data.stats.peak ? formatShortDate(data.stats.peak.key) : '-'}
              detail={data.stats.peak ? formatTokens(data.stats.peak.value) : '0'}
            />
            <Stat label="Avg Daily" value={formatTokens(data.stats.average)} detail="tokens" />
            <Stat
              label="Active Days"
              value={String(data.stats.activeDays)}
              detail={`of ${data.days.length}`}
            />
          </div>
        </>
      )}

      {hover &&
        portalReady &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full -mt-2 rounded-md border border-border bg-popover/95 px-2.5 py-1.5 text-[11px] text-foreground shadow-lg shadow-black/40 backdrop-blur-md"
            style={{ left: hover.x, top: hover.y }}
          >
            <div className="font-mono text-foreground">{hover.key}</div>
            <div className="tabular-nums text-muted-foreground">
              {hover.value.toLocaleString('en-US')} tokens
            </div>
          </div>,
          document.body,
        )}
    </section>
  )
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-w-0 rounded-md border border-primary/15 bg-background/20 px-2.5 py-2">
      <div className="truncate text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 min-w-0 tabular-nums">
        <div className="truncate text-sm font-medium leading-4 text-foreground">{value}</div>
        <div className="mt-0.5 truncate text-[10px] leading-3 text-muted-foreground">{detail}</div>
      </div>
    </div>
  )
}
