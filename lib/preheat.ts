import { loadData } from './usage-source'

const REFRESH_INTERVAL_MS = 10 * 60 * 1000

let started = false
let timer: NodeJS.Timeout | null = null

/**
 * Warm the usage cache on server startup and keep it fresh on a fixed
 * cadence. Behaviour:
 *  - On boot: one forced refresh, so the first dashboard load doesn't pay
 *    a cold read and we don't serve a stale disk snapshot from a previous run.
 *  - Every 10 minutes thereafter: another forced refresh in the background.
 *  - Manual refresh from the UI shares the same `loadData({ refresh: true })`
 *    code path, so all three triggers stay consistent.
 *
 * `timer.unref()` lets the process exit cleanly when nothing else holds it
 * alive (e.g. during graceful shutdown).
 *
 * Idempotent — safe to call multiple times; only the first call does work.
 */
export function preheat(): void {
  if (started) return
  started = true
  void run()
}

async function run(): Promise<void> {
  await refresh()
  timer = setInterval(() => void refresh(), REFRESH_INTERVAL_MS)
  timer.unref?.()
}

async function refresh(): Promise<void> {
  const t0 = Date.now()
  try {
    const snap = await loadData({ refresh: true })
    console.info(
      `[token-scope] refresh done in ${Date.now() - t0}ms (${snap.agents.length} agents, ${snap.rows.length} rows)`,
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn(`[token-scope] refresh failed: ${msg}`)
  }
}
