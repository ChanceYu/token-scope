import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Disk-backed cache for the dashboard usage snapshot.
 *
 * The entire dataset (all known agents × daily granularity, all time) lives in
 * a single JSON file at <project>/.cache/usage-snapshot.json. The page subscribes to
 * it once and derives every chart, table and total by filtering in memory —
 * date-range and agent switches no longer hit the server collector.
 *
 * Reads are synchronous on purpose: the caller dedupes concurrent requests via
 * an in-flight promise map, and an `await` here would yield in the middle of
 * that critical section.
 *
 * Disabled inside Vitest runs (process.env.VITEST is set automatically) so
 * unit tests don't read stale files from a previous run.
 */

const DISABLED = !!process.env.VITEST || process.env.TOKEN_SCOPE_DISK_CACHE === 'off'

function cacheFile(): string {
  const dir = process.env.TOKEN_SCOPE_CACHE_DIR
    ? path.resolve(process.env.TOKEN_SCOPE_CACHE_DIR)
    : '.cache'
  return path.join(dir, 'usage-snapshot.json')
}

export function readSync<T = unknown>(): T | null {
  if (DISABLED) return null
  try {
    const text = readFileSync(cacheFile(), 'utf-8')
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export function write<T = unknown>(data: T): void {
  if (DISABLED) return
  try {
    const file = cacheFile()
    mkdirSync(path.dirname(file), { recursive: true })
    const tmp = `${file}.${process.pid}.tmp`
    writeFileSync(tmp, JSON.stringify(data))
    renameSync(tmp, file)
  } catch {
    // swallow — losing a cache write is non-fatal
  }
}

export function clear(): void {
  if (DISABLED) return
  try {
    unlinkSync(cacheFile())
  } catch {
    // ignore
  }
}

export function getCacheFile(): string {
  return cacheFile()
}

export function isDisabled(): boolean {
  return DISABLED
}
