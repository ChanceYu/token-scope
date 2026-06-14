'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'
import type { UsageRow } from '@/lib/types'

type Props = {
  rows: UsageRow[]
  loading?: boolean
  failedAgents?: string[]
  sourceError?: string
}

function fmtInt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function fmtCost(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

// The sticky header uses a small uppercase font, so it needs more vertical
// padding than the Total row to feel visually balanced with the bottom cap.
const TH_BASE =
  'sticky top-0 z-10 bg-card/80 px-3 py-3 text-left text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground backdrop-blur-md align-middle'
const TH_RIGHT = `${TH_BASE} text-right`
const TD_BASE = 'h-11 px-3 align-top text-foreground'
const TD_RIGHT = `${TD_BASE} text-right tabular-nums whitespace-nowrap`

export function DetailsTable({ rows, loading, failedAgents, sourceError }: Props) {
  // Sort newest period first; within the same period, largest tokens first.
  const sorted = React.useMemo(() => {
    const copy = rows.slice()
    copy.sort((a, b) => {
      if (a.period === b.period) return b.totalTokens - a.totalTokens
      return a.period < b.period ? 1 : -1
    })
    return copy
  }, [rows])

  const totals = React.useMemo(() => {
    let input = 0, output = 0, cacheC = 0, cacheR = 0, total = 0, cost = 0
    for (const r of rows) {
      input += r.inputTokens
      output += r.outputTokens
      cacheC += r.cacheCreationTokens
      cacheR += r.cacheReadTokens
      total += r.totalTokens
      cost += r.totalCost
    }
    return { input, output, cacheC, cacheR, total, cost }
  }, [rows])

  return (
    <section className="rounded-lg border border-primary/15 bg-card/55">
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-foreground/90">
            Usage Details
          </h3>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {rows.length.toLocaleString('en-US')} rows
          </span>
        </div>
        {failedAgents && failedAgents.length > 0 && (
          <span className="text-[10px] uppercase tracking-wider text-destructive">
            failed: {failedAgents.join(', ')}
          </span>
        )}
      </header>

      {sourceError && rows.length === 0 ? (
        <div className="px-4 pb-6 pt-2 text-xs text-destructive">
          data source failed: {sourceError}
        </div>
      ) : loading && rows.length === 0 ? (
        <div className="px-4 pb-6 pt-2 text-xs text-muted-foreground">loading…</div>
      ) : sorted.length === 0 ? (
        <div className="px-4 pb-6 pt-2 text-xs text-muted-foreground">no rows in range</div>
      ) : (
        <div className="max-h-[28rem] overflow-auto">
          <table className="w-full min-w-[960px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className={cn(TH_BASE, 'pl-4')}>Date</th>
                <th className={TH_BASE}>Agent</th>
                <th className={TH_BASE}>Models</th>
                <th className={TH_RIGHT}>Input</th>
                <th className={TH_RIGHT}>Output</th>
                <th className={TH_RIGHT}>Cache Create</th>
                <th className={TH_RIGHT}>Cache Read</th>
                <th className={TH_RIGHT}>Total Tokens</th>
                <th className={cn(TH_RIGHT, 'pr-4')}>Cost (USD)</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, idx) => (
                <tr
                  key={`${r.period}|${r.agent}|${idx}`}
                  className="transition-colors hover:bg-primary/5 [&>td]:border-b [&>td]:border-primary/[0.06]"
                >
                  <td className={cn(TD_BASE, 'pl-4 whitespace-nowrap text-muted-foreground')}>
                    {r.period}
                  </td>
                  <td className={cn(TD_BASE, 'font-medium whitespace-nowrap')}>{r.agent}</td>
                  <td className={cn(TD_BASE, 'min-w-[180px] text-muted-foreground')}>
                    {r.modelsUsed.length === 0 ? (
                      <span className="text-muted-foreground/60">—</span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {r.modelsUsed.map((m) => (
                          <span key={m} className="font-mono text-[11px]">
                            {m}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className={TD_RIGHT}>{fmtInt(r.inputTokens)}</td>
                  <td className={TD_RIGHT}>{fmtInt(r.outputTokens)}</td>
                  <td className={TD_RIGHT}>{fmtInt(r.cacheCreationTokens)}</td>
                  <td className={TD_RIGHT}>{fmtInt(r.cacheReadTokens)}</td>
                  <td className={cn(TD_RIGHT, 'font-semibold')}>{fmtInt(r.totalTokens)}</td>
                  <td className={cn(TD_RIGHT, 'pr-4')}>${fmtCost(r.totalCost)}</td>
                </tr>
              ))}
              <tr className="sticky bottom-0 bg-card/95 backdrop-blur-md [&>td]:h-auto [&>td]:border-t [&>td]:border-primary/[0.06] [&>td]:py-3 [&>td]:align-middle">
                <td className={cn(TD_BASE, 'pl-4 text-xs font-semibold uppercase tracking-wider text-primary')}>
                  Total
                </td>
                <td className={cn(TD_BASE, 'text-muted-foreground')} />
                <td className={cn(TD_BASE, 'text-muted-foreground')} />
                <td className={cn(TD_RIGHT, 'font-semibold text-primary')}>{fmtInt(totals.input)}</td>
                <td className={cn(TD_RIGHT, 'font-semibold text-primary')}>{fmtInt(totals.output)}</td>
                <td className={cn(TD_RIGHT, 'font-semibold text-primary')}>{fmtInt(totals.cacheC)}</td>
                <td className={cn(TD_RIGHT, 'font-semibold text-primary')}>{fmtInt(totals.cacheR)}</td>
                <td className={cn(TD_RIGHT, 'font-semibold text-primary')}>{fmtInt(totals.total)}</td>
                <td className={cn(TD_RIGHT, 'pr-4 font-semibold text-primary')}>${fmtCost(totals.cost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
