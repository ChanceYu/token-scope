import { execFile } from 'node:child_process'
import { TOKEN_SCOPE_CACHE_TTL_MS } from './constants'
import { KNOWN_AGENTS, type UsageRow } from './types'
import { normalize } from './normalize'
import * as diskCache from './disk-cache'

/**
 * Full dashboard dataset: every known agent, daily granularity, all time.
 * The page filters and aggregates this in memory; the server never slices it
 * per request.
 */
export type DataSnapshot = {
  fetchedAt: number
  agents: string[]
  rows: UsageRow[]
  failedAgents: string[]
  refreshing: boolean
  sourceError?: string
}

let mem: DataSnapshot | null = null
let inflight: Promise<DataSnapshot> | null = null

export function clearCache(): void {
  mem = null
  inflight = null
}

export function getCachedSnapshot(): DataSnapshot | null {
  return mem
}

function emptySnapshot(refreshing = false, sourceError?: string): DataSnapshot {
  return {
    fetchedAt: Date.now(),
    agents: [],
    rows: [],
    failedAgents: [],
    refreshing,
    sourceError,
  }
}

function snapshotWithStatus(snap: DataSnapshot, refreshing: boolean): DataSnapshot {
  return {
    ...snap,
    refreshing,
  }
}

function coldStartWaitMs(): number {
  return Number(process.env.TOKEN_SCOPE_COLD_START_WAIT_MS ?? 1500)
}

async function waitForColdStart(promise: Promise<DataSnapshot>): Promise<DataSnapshot | null> {
  const wait = coldStartWaitMs()
  if (wait <= 0) return null
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), wait)
        timer.unref?.()
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * Return the dataset, fetching/refreshing as needed.
 *
 * Cache cooperation:
 *  - Memory cache wins on the hot path (sync return).
 *  - Disk cache fills the cold start without live collection.
 *  - Stale entries are returned immediately; a background refresh repopulates
 *    so the *next* caller gets fresh data without anyone waiting now.
 *  - `refresh: true` bypasses both caches and waits for live collection.
 *  - Concurrent live calls coalesce through the `inflight` promise so only
 *    one collection run executes at a time.
 */
export async function loadData(opts: { refresh?: boolean } = {}): Promise<DataSnapshot> {
  const now = Date.now()

  if (opts.refresh) {
    return snapshotWithStatus(await doFetch(), false)
  }

  if (mem) {
    const age = now - mem.fetchedAt
    if (age < TOKEN_SCOPE_CACHE_TTL_MS) return snapshotWithStatus(mem, false)
    if (!inflight)
      void doFetch().catch(() => {
        /* non-fatal */
      })
    return snapshotWithStatus(mem, true)
  }

  const disk = diskCache.readSync<DataSnapshot>()
  if (disk && Array.isArray(disk.rows)) {
    mem = snapshotWithStatus(disk, false)
    const age = now - disk.fetchedAt
    if (age < TOKEN_SCOPE_CACHE_TTL_MS) return snapshotWithStatus(mem, false)
    if (!inflight)
      void doFetch().catch(() => {
        /* non-fatal */
      })
    return snapshotWithStatus(mem, true)
  }

  if (inflight) return emptySnapshot(true)

  const promise = doFetch()
  try {
    const snap = await waitForColdStart(promise)
    if (snap) return snapshotWithStatus(snap, false)
    return emptySnapshot(true)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return emptySnapshot(false, msg)
  }
}

function doFetch(): Promise<DataSnapshot> {
  if (inflight) return inflight
  const promise = fetchAll().then(
    (snap) => {
      mem = snap
      diskCache.write(snap)
      if (inflight === promise) inflight = null
      return snap
    },
    (e) => {
      if (inflight === promise) inflight = null
      throw e
    },
  )
  inflight = promise
  return promise
}

async function fetchAll(): Promise<DataSnapshot> {
  // ccusage's top-level `daily` aggregates every agent into rows tagged
  // `agent: "all"`, which collapses the per-agent breakdown the dashboard
  // depends on. Fan out one subcommand per known agent instead — each
  // returns rows scoped to that single agent, and `normalize` fills the
  // `agent` field from the queryAgent argument.
  const results = await Promise.allSettled(
    KNOWN_AGENTS.map(async (agent) => {
      const raw = JSON.parse(await runCcusageDaily(agent))
      return normalize(raw, 'daily', agent).filter((r) => r.period)
    }),
  )

  const rows: UsageRow[] = []
  const agentsWithData = new Set<string>()
  const failedAgents: string[] = []

  results.forEach((r, i) => {
    const agent = KNOWN_AGENTS[i]
    if (r.status === 'fulfilled') {
      if (r.value.length > 0) {
        rows.push(...r.value)
        agentsWithData.add(agent)
      }
    } else {
      failedAgents.push(agent)
    }
  })

  return {
    fetchedAt: Date.now(),
    agents: [...agentsWithData].sort(),
    rows,
    failedAgents,
    refreshing: false,
  }
}

function ccusageCommand(): { file: string; args: string[] } {
  if (process.env.TOKEN_SCOPE_CCUSAGE_BIN) {
    return { file: process.env.TOKEN_SCOPE_CCUSAGE_BIN, args: [] }
  }
  return {
    file: 'ccusage',
    args: [],
  }
}

function ccusageTimeoutMs(): number {
  return Number(process.env.TOKEN_SCOPE_CCUSAGE_TIMEOUT_MS ?? 60_000)
}

function runCcusageDaily(agent: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const command = ccusageCommand()
    const pathDelimiter = process.platform === 'win32' ? ';' : ':'
    execFile(
      command.file,
      [...command.args, agent, 'daily', '--json', '--offline'],
      {
        env: {
          ...process.env,
          NO_COLOR: '1',
          PATH: ['node_modules/.bin', process.env.PATH].filter(Boolean).join(pathDelimiter),
        },
        maxBuffer: 64 * 1024 * 1024,
        timeout: ccusageTimeoutMs(),
      },
      (error, stdout, stderr) => {
        if (error) {
          const detail = stderr ? `: ${stderr.trim()}` : ''
          reject(new Error(`ccusage ${agent} daily failed${detail}`))
          return
        }
        resolve(stdout)
      },
    )
  })
}
