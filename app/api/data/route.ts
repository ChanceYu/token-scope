import { NextResponse } from 'next/server'
import { loadData } from '@/lib/usage-source'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const refresh = url.searchParams.get('refresh') === '1'

  try {
    const snap = await loadData({ refresh })
    return NextResponse.json({
      fetchedAt: new Date(snap.fetchedAt).toISOString(),
      agents: snap.agents,
      rows: snap.rows,
      failedAgents: snap.failedAgents,
      refreshing: snap.refreshing,
      sourceError: snap.sourceError,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('timed out')) return NextResponse.json({ error: msg }, { status: 504 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
