export type Repo = { path: string; branch: string | null }
export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Meta = { model: string | null; usd: number | null }

declare module 'claude-code' {
  interface PluginState {
    'status-band': { repo: Repo | null; limits: Limit[]; meta: Meta }
  }
}
