'use client'
import * as React from 'react'
import { buttonVariants } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { CalendarIcon, ChevronDownIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { ymd } from '@/lib/date'
import { cn } from '@/lib/utils'

export type FilterState = {
  preset: 'today' | '7d' | '30d' | 'all' | 'custom'
  since: string | null
  until: string | null
  agent: string
}

type Props = {
  agents: string[]
  value: FilterState
  onChange: (s: FilterState) => void
}

export function FilterBar({ agents, value, onChange }: Props) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    value.preset === 'custom' && value.since && value.until
      ? { from: new Date(value.since), to: new Date(value.until) }
      : undefined,
  )

  const applyPreset = (p: FilterState['preset']) => {
    const now = new Date()
    if (p === 'today') {
      const d = ymd(now)
      onChange({ ...value, preset: 'today', since: d, until: d })
    } else if (p === '7d') {
      const since = ymd(new Date(now.getTime() - 6 * 86400_000))
      onChange({ ...value, preset: '7d', since, until: ymd(now) })
    } else if (p === '30d') {
      const since = ymd(new Date(now.getTime() - 29 * 86400_000))
      onChange({ ...value, preset: '30d', since, until: ymd(now) })
    } else if (p === 'all') {
      onChange({ ...value, preset: 'all', since: null, until: null })
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-6 py-3">
      <div className="inline-flex rounded-lg bg-muted p-0.5">
        {(
          [
            ['today', '1D'],
            ['7d', '7D'],
            ['30d', '30D'],
            ['all', 'ALL'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => applyPreset(key)}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium transition-colors',
              value.preset === key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Popover>
        <PopoverTrigger
          className={buttonVariants({
            size: 'sm',
            variant: value.preset === 'custom' ? 'default' : 'ghost',
            className: 'gap-2 text-xs',
          })}
        >
          <CalendarIcon className="size-3.5" />
          {value.preset === 'custom' && value.since && value.until
            ? `${value.since} → ${value.until}`
            : 'Custom'}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={(r) => {
              setDateRange(r)
              if (r?.from && r?.to) {
                onChange({
                  ...value,
                  preset: 'custom',
                  since: ymd(r.from),
                  until: ymd(r.to),
                })
              }
            }}
          />
        </PopoverContent>
      </Popover>

      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Agent</span>
        <Popover>
          <PopoverTrigger
            className={buttonVariants({
              size: 'sm',
              variant: 'outline',
              className: 'min-w-28 justify-between gap-2 text-xs',
            })}
          >
            <span>{value.agent}</span>
            <ChevronDownIcon className="size-3.5 opacity-60" />
          </PopoverTrigger>
          <PopoverContent className="w-48 p-0" align="end">
            <Command>
              <CommandInput placeholder="search agent..." />
              <CommandList>
                <CommandGroup>
                  <CommandItem onSelect={() => onChange({ ...value, agent: 'all' })}>
                    all
                  </CommandItem>
                  {agents.map((a) => (
                    <CommandItem
                      key={a}
                      onSelect={() => onChange({ ...value, agent: a })}
                    >
                      {a}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
