import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'status-band',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 9 },
    view: {},
  },
} as const

const NOW = Date.UTC(2026, 10, 2, 8, 30)

const usage = (rateLimits: unknown[]) => ({
  startedAt: NOW - 60_000,
  context: { window: 200_000, tokens: 12_000, percent: 6 },
  rateLimits,
  cost: { usd: 2.52 },
})

const FIVE = { kind: 'five_hour', percentUsed: 20, resetsAt: new Date(NOW + 3 * 3600_000).toISOString() }
const WEEK = { kind: 'seven_day', percentUsed: 12, resetsAt: new Date(NOW + 6 * 86400_000).toISOString() }

test('both windows reported: 5h and Week segments', async ($, on) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.now', () => ({ value: NOW }))
  on('session.usage', () => ({ value: usage([FIVE, WEEK]) as never }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /^5h$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Week$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^20%$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^12%$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /limits/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('only the weekly window reported: no 5h segment', async ($, on) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.now', () => ({ value: NOW }))
  on('session.usage', () => ({ value: usage([WEEK]) as never }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /^Week$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^5h$/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /^–$/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('no reading yet: a dim placeholder', async ($, on) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.now', () => ({ value: NOW }))
  on('session.usage', () => ({ value: usage([]) as never }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /^limits$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^Week$/ })).toBeUndefined()
  await ui.unmount()
})
