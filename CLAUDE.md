# CLAUDE.md

Guidance for Claude Code when working in this repository. Project overview lives in [README.md](./README.md); this file captures conventions and gotchas Claude must follow.

## Stack

- Node 22+, pnpm 10+, TypeScript 6
- Next.js 16 (Turbopack dev) + React 19
- Vitest for tests, ESLint + Prettier
- Tailwind v4 + shadcn/ui
- External CLI dep: `ccusage` (per-agent token usage source)

## Common commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | `refresh-cache` then Next dev on `http://127.0.0.1:3300` |
| `pnpm build` | `refresh-cache` then `next build` |
| `pnpm start` | Production server on 3300 (preheat triggered by `instrumentation.ts`) |
| `pnpm refresh-cache` | Standalone ccusage collection; writes `.cache/usage-snapshot.json` |
| `pnpm test` / `pnpm test:watch` | Vitest |
| `pnpm lint` | ESLint |

## Project conventions

- **Port 3300, host `127.0.0.1`** — not 3000, not 0.0.0.0. Don't change without explicit ask.
- **Single API endpoint** (`/api/data`) returns the entire snapshot. Filtering / bucketing / aggregation happens in the browser (`hooks/use-usage.ts`, `lib/aggregate.ts`). Do **not** add per-filter API routes.
- **Per-agent fan-out** — `lib/usage-source.ts:fetchAll` runs one `ccusage <agent> daily --json --offline` per `KNOWN_AGENTS` entry in parallel via `Promise.allSettled`. Each row carries its real agent name; nothing should be tagged `"all"` after normalisation. Failures land in `failedAgents` (surfaced in `DetailsTable`).
- **`KNOWN_AGENTS` in `lib/types.ts`** is the canonical agent list and must match the subcommands `ccusage --help` advertises. Add to both places when extending.
- **`normalize.ts` supports two ccusage payload shapes** — the aggregate `daily` shape (`period`, `agent`, `totalCost`, `modelsUsed[]`) and the per-agent shape (`date`, `costUSD`, `models: {…}`). Keep that contract when touching the parser; tests in `lib/__tests__/normalize.test.ts` enforce it.
- **Disk cache** at `.cache/usage-snapshot.json` is auto-managed by `lib/disk-cache.ts` and gated off during Vitest. Don't hand-edit. To force a fresh snapshot, delete it and run `pnpm refresh-cache`.
- **Preheat gating** — `instrumentation.ts` skips preheat during `phase-production-build` and Vitest. Don't shell out to live ccusage from tests.
- **Data-pipeline changes need live verification.** Unit tests mock `execFile`; they pass even when real ccusage output diverges. After touching `lib/usage-source.ts`, `lib/normalize.ts`, `lib/aggregate.ts`, or `lib/disk-cache.ts`:
  1. `pnpm test`
  2. `pnpm refresh-cache` — check the printed agent count, row count, and inspect `.cache/usage-snapshot.json`
  3. If UI is involved, also `pnpm dev` and hit `/api/data`

## Git commit conventions

Use **Conventional Commits** with a lowercase, imperative subject.

```
<type>(<scope>): <subject>

<optional body — WHY, not WHAT; the diff shows the WHAT>
```

**Types:**

| Type | Use for |
| --- | --- |
| `feat` | New user-facing functionality |
| `fix` | Bug fix |
| `refactor` | Internal restructure, no behaviour change |
| `perf` | Performance improvement |
| `docs` | README, CLAUDE.md, code comments |
| `test` | Adding or fixing tests |
| `chore` | Tooling, deps, config (`package.json`, lockfile, eslint, prettier) |
| `build` | Build pipeline (`next.config.mjs`, `tsconfig.json`, scripts/) |

**Scopes** (optional but encouraged): `data`, `cache`, `api`, `ui`, `cli`, `header`, `table`, `chart`, `deps`, etc.

**Subject rules:**

- Lowercase. Imperative mood (`add`, not `added` / `adds`). No trailing period.
- ≤ 72 characters.
- Describe the change, not the symptom — "fix per-agent fan-out" beats "agent column shows all".

**Body rules** (include when the change isn't self-explanatory):

- Hard wrap at ~72 chars.
- Explain WHY and the trade-off. Reference issues / PRs (`Closes #12`).
- Skip the body for one-line obvious changes.

**Examples:**

```
feat(data): fan out per-agent ccusage calls

Replace the single `ccusage daily` aggregate call (which tagged every row
`agent: "all"`) with a parallel per-agent fan-out via Promise.allSettled.
Restores per-agent breakdown in the dashboard; failures land in
failedAgents instead of poisoning the snapshot.
```

```
build: add refresh-cache script and prepend to dev/build

Runs the full collection pipeline standalone via jiti, so the dashboard
never boots cold. Promotes jiti to a direct devDep.
```

```
fix(cache): handle empty ccusage payload without 500
```

```
docs: add screenshot and architecture section to README
```

**Trailers:**

- **Do NOT add `Co-Authored-By: Claude` trailers.** This is a single-author project — keep history clean unless explicitly told otherwise.
- No emoji in commit messages.

**Multi-change commits:**

- Prefer one commit per logical change. If multiple changes are genuinely bundled, list them as bullets in the body.
- Never bundle unrelated drive-by fixes — call them out and split.
