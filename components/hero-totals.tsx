'use client'
import * as React from 'react'
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  totalTokens: number
  deltaPct: number | null
  comparisonLabel?: string
  loading?: boolean
}

function formatBig(n: number): string {
  return n.toLocaleString('en-US')
}

export function HeroTotals({ totalTokens, deltaPct, comparisonLabel, loading }: Props) {
  const positive = (deltaPct ?? 0) >= 0
  const Arrow = positive ? ArrowUpIcon : ArrowDownIcon
  const deltaClass = positive ? 'text-primary' : 'text-destructive'

  return (
    <section className="surface-grid relative rounded-xl border border-border/80 bg-card/55">
      {/* Subtle blueprint grid backdrop */}
      <span
        aria-hidden
        className="bg-grid bg-grid-fade pointer-events-none absolute inset-0 text-primary/10"
      />

      {/* Corner brackets */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-3 size-5 border-l-2 border-t-2 border-primary/60"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-3 top-3 size-5 border-r-2 border-t-2 border-primary/60"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-3 left-3 size-5 border-b-2 border-l-2 border-primary/60"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-3 right-3 size-5 border-b-2 border-r-2 border-primary/60"
      />

      {/* Faint ASCII dot decorations on the sides */}
      <span
        aria-hidden
        className="ascii-noise pointer-events-none absolute inset-y-6 left-6 w-1/3 text-primary"
      />
      <span
        aria-hidden
        className="ascii-noise pointer-events-none absolute inset-y-6 right-6 w-1/3 text-primary"
      />

      {/* Subtle horizontal scanline on the right (like terminal output line) */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-10 top-1/2 hidden h-px w-1/4 bg-gradient-to-r from-transparent via-primary/40 to-transparent md:block"
      />

      <div className="relative z-10 flex flex-col items-center justify-center gap-3 px-6 py-10 sm:py-14">
        <div className="text-[10px] font-medium uppercase tracking-[0.35em] text-muted-foreground">
          ▸ TOTAL USAGE (TOKENS)
        </div>

        <div
          className={cn(
            'text-center font-mono text-5xl font-bold tracking-tight tabular-nums text-primary sm:text-6xl md:text-7xl lg:text-[5.5rem]',
            loading && 'opacity-60',
          )}
        >
          {formatBig(totalTokens)}
        </div>

        {(deltaPct != null || comparisonLabel) && (
          <div className="flex items-center gap-2 text-xs tabular-nums">
            {deltaPct != null && (
              <span className={cn('inline-flex items-center gap-1', deltaClass)}>
                <Arrow className="size-3" />
                <span className="font-semibold">{Math.abs(deltaPct).toFixed(1)}%</span>
              </span>
            )}
            {comparisonLabel && (
              <span className="text-muted-foreground">
                vs <span className="text-foreground/70">{comparisonLabel}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
