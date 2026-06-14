import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearCache, loadData } from '@/lib/usage-source'

const execFileMock = vi.hoisted(() => vi.fn())

vi.mock('node:child_process', () => ({
  execFile: execFileMock,
}))

describe('loadData cold start', () => {
  beforeEach(() => {
    clearCache()
    execFileMock.mockReset()
  })

  it('marks an empty cold snapshot as refreshing', async () => {
    process.env.TOKEN_SCOPE_COLD_START_WAIT_MS = '1'

    const snap = await loadData()

    expect(snap.rows).toEqual([])
    expect(snap.refreshing).toBe(true)
  })

  it('fans out per-agent ccusage calls and preserves agent identity per row', async () => {
    // Per-agent subcommands return rows without an `agent` field; `normalize`
    // fills it from the queryAgent argument. Mock varies its payload by which
    // agent is in the argv to mirror real ccusage behaviour: codex+claude
    // produce data, everyone else is empty, and gemini blows up.
    execFileMock.mockImplementation((_file, args: string[], _opts, cb) => {
      const agent = args[0]
      if (agent === 'codex') {
        cb(
          null,
          JSON.stringify({
            daily: [
              {
                date: '2026-06-14',
                inputTokens: 10,
                outputTokens: 20,
                cacheCreationTokens: 3,
                cacheReadTokens: 4,
                totalTokens: 37,
                costUSD: 0.05,
                models: { 'gpt-5': {} },
              },
            ],
          }),
          '',
        )
        return
      }
      if (agent === 'claude') {
        cb(
          null,
          JSON.stringify({
            daily: [
              {
                date: '2026-06-14',
                inputTokens: 5,
                outputTokens: 8,
                cacheCreationTokens: 0,
                cacheReadTokens: 100,
                totalTokens: 113,
                costUSD: 0.02,
                models: { 'claude-opus-4-7': {} },
              },
            ],
          }),
          '',
        )
        return
      }
      if (agent === 'gemini') {
        cb(new Error('boom'), '', 'gemini exploded')
        return
      }
      cb(null, JSON.stringify({ daily: [] }), '')
    })

    const snap = await loadData({ refresh: true })

    expect(execFileMock).toHaveBeenCalled()
    expect(snap.agents).toEqual(['claude', 'codex'])
    expect(snap.failedAgents).toEqual(['gemini'])
    expect(snap.rows).toHaveLength(2)
    expect(snap.rows.map((r) => r.agent).sort()).toEqual(['claude', 'codex'])
    const codexRow = snap.rows.find((r) => r.agent === 'codex')!
    expect(codexRow).toMatchObject({
      period: '2026-06-14',
      agent: 'codex',
      inputTokens: 10,
      outputTokens: 20,
      cacheCreationTokens: 3,
      cacheReadTokens: 4,
      totalTokens: 37,
      totalCost: 0.05,
      modelsUsed: ['gpt-5'],
    })
    expect(snap.refreshing).toBe(false)
  })
})
