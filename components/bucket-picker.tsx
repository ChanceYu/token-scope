'use client'
import * as React from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { Bucket } from '@/lib/types'

const OPTIONS: { value: Bucket; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export function BucketPicker({
  value,
  onChange,
}: {
  value: Bucket
  onChange: (b: Bucket) => void
}) {
  const [open, setOpen] = React.useState(false)
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0]
  return (
    <Popover open={open} onOpenChange={(o) => setOpen(o)}>
      <PopoverTrigger
        className="inline-flex h-6 cursor-pointer items-center gap-1 rounded-md border border-border bg-card/40 px-2 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        {current.label}
        <ChevronDownIcon className="size-3" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-32 border-border bg-popover/95">
        <div className="flex flex-col gap-0.5">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={cn(
                'rounded-sm px-2 py-1.5 text-left text-xs uppercase tracking-wider transition-colors cursor-pointer',
                value === opt.value
                  ? 'bg-primary/15 text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
