export type Bucket = 'daily' | 'weekly' | 'monthly'

export const KNOWN_AGENTS = [
  'claude',
  'codex',
  'opencode',
  'amp',
  'droid',
  'codebuff',
  'hermes',
  'pi',
  'goose',
  'kilo',
  'copilot',
  'gemini',
  'kimi',
  'qwen',
  'openclaw',
] as const
export type KnownAgent = (typeof KNOWN_AGENTS)[number]

export type UsageRow = {
  period: string
  agent: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
  totalCost: number
  modelsUsed: string[]
}

export type UsageMeta = {
  agent: string
  since: string | null
  until: string | null
  fetchedAt: string
  fromCache: boolean
  sourceVersion: string
}

export type UsageResponse = {
  bucket: Bucket
  rows: UsageRow[]
  meta: UsageMeta
}

export type TotalSlot = {
  tokens: number
  cost: number
  deltaPct: number | null
}

export type TotalsResponse = {
  today: TotalSlot
  week: TotalSlot
  month: TotalSlot
  allTime: TotalSlot
  meta: {
    agent: string
    fetchedAt: string
    fromCache: boolean
  }
}

export type DistributionSlice = {
  agent: string
  tokens: number
  cost: number
  pct: number
  modelsUsed: string[]
}

export type DistributionResponse = {
  slices: DistributionSlice[]
  totalTokens: number
  totalCost: number
  meta: {
    since: string | null
    until: string | null
    fetchedAt: string
    fromCache: boolean
    failedAgents: string[]
  }
}

export type AgentsResponse = {
  agents: string[]
  meta: { fetchedAt: string; fromCache: boolean }
}

export type ApiError = { error: string; detail?: string }
