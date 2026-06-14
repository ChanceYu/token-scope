/**
 * One-shot ccusage collection.
 *
 * Runs the same code path as the live server's preheat (per-agent
 * ccusage daily fan-out → normalise → write disk cache) so the dashboard
 * boots against a warm snapshot. Invoked before `dev`/`build` via
 * package.json scripts; safe to run standalone (`pnpm refresh-cache`).
 */
import { loadData } from '../lib/usage-source'

async function main(): Promise<void> {
  const t0 = Date.now()
  console.log('[refresh-cache] collecting per-agent usage via ccusage…')
  try {
    const snap = await loadData({ refresh: true })
    const ms = Date.now() - t0
    const agentList = snap.agents.length > 0 ? snap.agents.join(', ') : '<none>'
    console.log(
      `[refresh-cache] done in ${ms}ms — ${snap.agents.length} agents (${agentList}), ${snap.rows.length} rows → .cache/usage-snapshot.json`,
    )
    if (snap.failedAgents.length > 0) {
      console.warn(`[refresh-cache] failed agents: ${snap.failedAgents.join(', ')}`)
    }
    if (snap.sourceError) {
      console.warn(`[refresh-cache] source warning: ${snap.sourceError}`)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[refresh-cache] failed: ${msg}`)
    process.exit(1)
  }
}

void main()
