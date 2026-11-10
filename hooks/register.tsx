import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionRateLimit } from 'claude-code'

import type { Limit, Meta, Repo } from '../types'

const repo = atom({ plugin: 'status-band', key: 'repo' } as const, null as Repo | null)
const limits = atom({ plugin: 'status-band', key: 'limits' } as const, [] as Limit[])
const meta = atom({ plugin: 'status-band', key: 'meta' } as const, { model: null, effort: null, usd: null } as Meta)

const BAR_WIDTH = 10
const REFRESH_MS = 15_000

// Only the windows the account reports are drawn, in this order; an unknown kind goes last under its own name.
const LABELS: Record<string, string> = { five_hour: '5h', seven_day: 'Week', spend_limit: 'Spend' }
const ORDER = ['five_hour', 'seven_day', 'spend_limit']

const labelFor = (kind: string): string => LABELS[kind] ?? kind
const rankOf = (kind: string): number => {
  const i = ORDER.indexOf(kind)
  return i === -1 ? ORDER.length : i
}

const shortPath = (cwd: string): string =>
  cwd.split('/').filter(Boolean).slice(-2).join('/') || '/'

const toLimits = (rows: readonly SessionRateLimit[]): Limit[] =>
  rows.map(r => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt }))

const sameLimits = (a: Limit[], b: Limit[]): boolean =>
  a.length === b.length &&
  a.every((x, i) => {
    const y = b[i]
    return y !== undefined && x.kind === y.kind && x.percentUsed === y.percentUsed && x.resetsAt === y.resetsAt
  })

const colorFor = (pct: number): 'success' | 'warning' | 'error' =>
  pct >= 90 ? 'error' : pct >= 70 ? 'warning' : 'success'

const bar = (pct: number): { filled: string; empty: string } => {
  const n = Math.max(0, Math.min(BAR_WIDTH, Math.round((pct / 100) * BAR_WIDTH)))
  return { filled: '█'.repeat(n), empty: '░'.repeat(BAR_WIDTH - n) }
}

const resetsIn = (resetsAt: string | undefined, now: number): string | null => {
  if (!resetsAt) return null
  const ms = Date.parse(resetsAt) - now
  if (!Number.isFinite(ms) || ms <= 0) return null
  const minutes = Math.floor(ms / 60_000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

async function refreshRepo($: EngineInterface, cwd: string): Promise<void> {
  const result = await $.process
    .run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], { cwd, timeoutMs: 5_000 })
    .catch(() => null)
  const branch = result && result.exitCode === 0 ? result.stdout.trim() || null : null
  const next: Repo = { path: shortPath(cwd), branch }
  const prev = await read($, repo)
  if (prev && prev.path === next.path && prev.branch === next.branch) return
  await update($, repo, () => next)
}

async function refreshLimits($: EngineInterface, rows: readonly SessionRateLimit[]): Promise<void> {
  const next = toLimits(rows)
  const prev = await read($, limits)
  if (sameLimits(prev, next)) return
  await update($, limits, () => next)
}

const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max']

// The effort as a short word: a level as given, a number (an API value) as is, anything else dropped.
const asEffort = (v: unknown): string | null => {
  if (typeof v === 'string' && EFFORTS.includes(v)) return v
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return null
}

// The session's effort setting, before the first request says what is actually sent.
async function settingEffort($: EngineInterface): Promise<string | null> {
  const v = await $.settings.read({ key: 'effortLevel' }).catch(() => undefined)
  return asEffort(v)
}

async function refreshMeta(
  $: EngineInterface,
  usd: number | null | undefined,
  effort?: string | null,
): Promise<void> {
  const model = await $.session.model().catch(() => null)
  const prev = await read($, meta)
  const next: Meta = { model, effort: effort === undefined ? prev.effort : effort, usd: usd ?? prev.usd }
  if (prev.model === next.model && prev.effort === next.effort && prev.usd === next.usd) return
  await update($, meta, () => next)
}

const fmtUsd = (usd: number): string => (usd < 10 ? `$${usd.toFixed(2)}` : `$${usd.toFixed(1)}`)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)

    await refreshRepo($, started.cwd)
    const usage = await $.session.usage().catch(() => null)
    if (usage) await refreshLimits($, usage.rateLimits)
    await refreshMeta($, usage?.cost?.usd ?? null, await settingEffort($))

    $.clock.every(REFRESH_MS, () => {
      void (async () => {
        const cwd = await $.session.cwd()
        await refreshRepo($, cwd)
        await refreshMeta($, undefined)
      })()
    })

    return started
  })

  on('session.measure', async ($, e, next) => {
    await refreshLimits($, e.rateLimits)
    await refreshMeta($, e.cost?.usd ?? null)
    return next(e)
  })

  // Each model request of the main loop says which effort it is sent with; the band shows the latest.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) {
      const effort = asEffort(e.effort)
      if (effort !== null) await refreshMeta($, undefined, effort).catch(() => undefined)
    }
    return yield* next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const [r, rows, m, now] = await Promise.all([read($, repo), read($, limits), read($, meta), $.clock.now()])
    const { Box, Text } = $.ui.resolve(e)

    const sorted = [...rows].sort((a, b) => rankOf(a.kind) - rankOf(b.kind))

    const limit = (l: Limit) => {
      const pct = Math.round(l.percentUsed)
      const color = colorFor(l.percentUsed)
      const { filled, empty } = bar(l.percentUsed)
      const reset = resetsIn(l.resetsAt, now)
      return (
        <Box gap={1}>
          <Text weight="semibold">{labelFor(l.kind)}</Text>
          <Box>
            <Text color={color}>{filled}</Text>
            <Text dimColor>{empty}</Text>
          </Box>
          <Text color={color} tabular>
            {pct}%
          </Text>
          {reset ? <Text dimColor>↻ {reset}</Text> : null}
        </Box>
      )
    }

    const limitParts =
      sorted.length === 0
        ? [
            <Text color="success">│</Text>,
            <Box gap={1}>
              <Text dimColor>limits</Text>
              <Text dimColor>–</Text>
            </Box>,
          ]
        : sorted.flatMap(l => [<Text color="success">│</Text>, limit(l)])

    return (
      <Box gap={2} borderStyle="round" borderColor="success" paddingX={1} alignSelf="flex-start">
        <Box gap={1}>
          <Text color={r?.branch ? 'success' : 'inactive'}>●</Text>
          <Text dimColor>{r?.path ?? '…'}</Text>
          {r?.branch ? (
            <Text color="success">{r.branch}</Text>
          ) : (
            <Text dimColor>no git</Text>
          )}
        </Box>
        {limitParts}
        <Text color="success">│</Text>
        <Box gap={1}>
          {m.model ? <Text color="claude">{m.model}</Text> : null}
          {m.effort ? <Text dimColor>{m.effort}</Text> : null}
          {m.usd !== null ? <Text dimColor>{fmtUsd(m.usd)}</Text> : null}
        </Box>
      </Box>
    )
  })
}
