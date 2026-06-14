'use client'
import * as React from 'react'
import { CalendarIcon, ChevronDownIcon, RefreshCwIcon, TerminalIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ymd, ymdHms } from '@/lib/date'
import { cn } from '@/lib/utils'

export type FilterPreset = 'today' | '7d' | '30d' | 'all' | 'custom'

export type FilterState = {
  preset: FilterPreset
  since: string | null
  until: string | null
  agent: string
}

const PRESETS: { value: Exclude<FilterPreset, 'custom'>; label: string }[] = [
  { value: 'today', label: '1D' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: 'all', label: 'ALL' },
]

type Props = {
  agents: string[]
  filter: FilterState
  onFilterChange: (s: FilterState) => void
  onRefresh: () => void
  isRefreshing?: boolean
  lastFetchedAt?: string | null
}

function applyPreset(p: Exclude<FilterPreset, 'custom'>, current: FilterState): FilterState {
  const now = new Date()
  if (p === 'today') {
    const d = ymd(now)
    return { ...current, preset: 'today', since: d, until: d }
  }
  if (p === '7d') {
    const since = ymd(new Date(now.getTime() - 6 * 86400_000))
    return { ...current, preset: '7d', since, until: ymd(now) }
  }
  if (p === '30d') {
    const since = ymd(new Date(now.getTime() - 29 * 86400_000))
    return { ...current, preset: '30d', since, until: ymd(now) }
  }
  return { ...current, preset: 'all', since: null, until: null }
}

function formatDateLabel(s: FilterState): string {
  if (s.preset === 'all' || (!s.since && !s.until)) return 'All time'
  if (!s.since || !s.until) return 'Pick range'
  if (s.since === s.until) return s.since
  return `${s.since}  →  ${s.until}`
}

function ChipButton({
  active,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer',
        active
          ? 'border-primary/60 bg-primary/15 text-foreground text-glow-soft'
          : 'border-border bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-foreground',
        className,
      )}
    />
  )
}

export function Header({
  agents,
  filter,
  onFilterChange,
  onRefresh,
  isRefreshing,
  lastFetchedAt,
}: Props) {
  // The currently-committed range, derived from props. Acts as the baseline
  // we revert to whenever the user closes the picker without confirming.
  const committedRange = React.useMemo<DateRange | undefined>(
    () =>
      filter.preset === 'custom' && filter.since && filter.until
        ? { from: new Date(filter.since), to: new Date(filter.until) }
        : undefined,
    [filter.preset, filter.since, filter.until],
  )

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(committedRange)
  const [hoveredDate, setHoveredDate] = React.useState<Date | undefined>(undefined)
  const [agentOpen, setAgentOpen] = React.useState(false)
  const [dateOpen, setDateOpen] = React.useState(false)

  const dateRangeComplete = Boolean(dateRange?.from && dateRange?.to)

  // Hover preview: after the user has clicked the first endpoint but not yet
  // the second, hovering paints a lighter "phantom" range from the picked
  // endpoint to the hovered cell.
  //
  // react-day-picker v10 fills both `from` and `to` to the clicked date on
  // the first click in range mode, so a from==to selection still counts as
  // "still picking" and keeps the preview active. The preview turns off
  // only once a real two-endpoint range exists, or when the cursor sits on
  // the already-picked day.
  const previewModifiers = React.useMemo(() => {
    const from = dateRange?.from
    const to = dateRange?.to
    if (!from || !hoveredDate) return undefined
    const hasCompleteRange = !!(to && to.getTime() !== from.getTime())
    if (hasCompleteRange) return undefined
    const fromTime = from.getTime()
    const hoverTime = hoveredDate.getTime()
    if (fromTime === hoverTime) return undefined
    const [start, end] = fromTime < hoverTime ? [from, hoveredDate] : [hoveredDate, from]
    return {
      previewStart: start,
      previewEnd: end,
      previewMiddle: { after: start, before: end },
    }
  }, [dateRange?.from, dateRange?.to, hoveredDate])

  const handleDateConfirm = () => {
    if (!dateRange?.from || !dateRange?.to) return
    onFilterChange({
      ...filter,
      preset: 'custom',
      since: ymd(dateRange.from),
      until: ymd(dateRange.to),
    })
    setDateOpen(false)
  }

  const handleDateCancel = () => {
    setDateRange(committedRange)
    setDateOpen(false)
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-md border border-primary/40 bg-primary/10 text-primary text-glow">
            <TerminalIcon className="size-4" strokeWidth={2.25} />
          </div>
          <span className="text-sm font-semibold tracking-wide text-foreground text-glow-soft">
            TokenScope
          </span>
        </div>

        <div className="mx-2 hidden h-6 w-px bg-border/60 sm:block" />

        {/* Agent select */}
        <Popover open={agentOpen} onOpenChange={(o) => setAgentOpen(o)}>
          <PopoverTrigger className="inline-flex h-8 min-w-[160px] cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-card/40 px-3 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="grid size-4 place-items-center rounded-sm border border-current/60 text-current">
                <span className="block size-1.5 bg-current" />
              </span>
              <span className="uppercase tracking-wider">
                {filter.agent === 'all' ? 'Select Agent' : filter.agent}
              </span>
            </span>
            <ChevronDownIcon className="size-3.5 opacity-70" />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-56 border-border bg-popover/95 backdrop-blur-md"
          >
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => {
                  onFilterChange({ ...filter, agent: 'all' })
                  setAgentOpen(false)
                }}
                className={cn(
                  'rounded-sm px-2 py-1.5 text-left text-xs uppercase tracking-wider transition-colors cursor-pointer',
                  filter.agent === 'all'
                    ? 'bg-primary/15 text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                all agents
              </button>
              {agents.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    onFilterChange({ ...filter, agent: a })
                    setAgentOpen(false)
                  }}
                  className={cn(
                    'rounded-sm px-2 py-1.5 text-left text-xs uppercase tracking-wider transition-colors cursor-pointer',
                    filter.agent === a
                      ? 'bg-primary/15 text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Time presets */}
        <div className="inline-flex h-8 items-center rounded-md border border-border bg-card/40 p-0.5">
          {PRESETS.map((p) => {
            const active = filter.preset === p.value
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => onFilterChange(applyPreset(p.value, filter))}
                className={cn(
                  'h-7 cursor-pointer rounded-sm px-3 text-xs font-medium uppercase tracking-wider transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        {/* Date range picker */}
        <Popover
          open={dateOpen}
          onOpenChange={(o) => {
            // Opening or closing without an explicit Confirm always re-syncs
            // the local draft to the committed range, discarding edits. The
            // hover preview is also reset so the next session starts fresh.
            setDateRange(committedRange)
            setHoveredDate(undefined)
            setDateOpen(o)
          }}
        >
          <PopoverTrigger
            className={cn(
              'inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border px-3 text-xs uppercase tracking-wider transition-colors',
              filter.preset === 'custom'
                ? 'border-primary/60 bg-primary/15 text-foreground'
                : 'border-border bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            <CalendarIcon className="size-3.5" />
            <span className="font-medium">{formatDateLabel(filter)}</span>
            <ChevronDownIcon className="size-3.5 opacity-70" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto border-border bg-popover/95 p-0">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(r) => setDateRange(r)}
              onDayMouseEnter={(d) => setHoveredDate(d)}
              onDayMouseLeave={() => setHoveredDate(undefined)}
              modifiers={previewModifiers}
            />
            <div className="flex items-center justify-end gap-2 border-t border-border px-3 py-2">
              <button
                type="button"
                onClick={handleDateCancel}
                className="inline-flex h-7 cursor-pointer items-center rounded-md border border-border bg-card/40 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDateConfirm}
                disabled={!dateRangeComplete}
                className={cn(
                  'inline-flex h-7 items-center rounded-md px-3 text-xs font-medium uppercase tracking-wider transition-colors',
                  dateRangeComplete
                    ? 'cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'cursor-not-allowed bg-muted text-muted-foreground/60',
                )}
              >
                Confirm
              </button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="ml-auto flex items-center gap-3">
          {lastFetchedAt && (
            <span className="hidden text-[10px] uppercase tracking-wider text-muted-foreground sm:inline-flex sm:items-center sm:gap-1">
              <span>Last:</span>
              <span className="font-mono tabular-nums text-foreground/70 normal-case">
                {ymdHms(lastFetchedAt)}
              </span>
            </span>
          )}

          {/* Manual refresh */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-border bg-card/40 px-3 text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCwIcon className={cn('size-3.5', isRefreshing && 'animate-spin')} />
            <span className="font-medium normal-case">Refresh</span>
          </button>
        </div>
      </div>
    </header>
  )
}
