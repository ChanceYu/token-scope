'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DistributionResponse } from '@/lib/types'

const COLORS = [
  '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ec4899',
  '#06b6d4', '#a3e635', '#f43f5e', '#a78bfa', '#facc15',
]

export function AgentDistribution({ data }: { data: DistributionResponse | undefined }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-foreground">By Agent</CardTitle>
      </CardHeader>
      <CardContent>
        {!data || data.slices.length === 0 ? (
          <div className="py-4 text-sm text-muted-foreground">no data</div>
        ) : (
          <div className="space-y-2.5">
            {data.slices.map((s, i) => (
              <div key={s.agent} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <span className="font-medium">{s.agent}</span>
                  </div>
                  <span className="tabular-nums text-muted-foreground">
                    {s.pct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, s.pct)}%`,
                      background: COLORS[i % COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
