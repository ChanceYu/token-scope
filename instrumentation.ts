/**
 * Next.js instrumentation entry point — runs once when the server boots.
 *
 * Used to warm the usage cache so the first page load can reuse a local
 * snapshot. Build phase is skipped so `next build` stays fast.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.NEXT_PHASE === 'phase-production-build') return
  if (process.env.VITEST) return
  if (process.env.TOKEN_SCOPE_PREHEAT === 'off') return

  const { preheat } = await import('./lib/preheat')
  preheat()
}
