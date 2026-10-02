/** Public Host configuration reaches pages without exposing authorization state. */
import { Context } from '@deepseek-ai/cordis'
import type { IndexInjection } from '@deepseek-ai/dsh-host-webserver'
import { expect, it } from 'vitest'
import * as HostPlugin from '../src/index.ts'
import { AUTHORIZATION_CONFIG_GLOBAL } from '../src/config.ts'

function collect(ctx: Context): IndexInjection[] {
  const rows: IndexInjection[] = []
  ctx.emit('webserver/index-inject', rows)
  return rows
}

it('validates the configured interval and provides the default', () => {
  expect(HostPlugin.Config({})).toEqual({ pollMs: 1000 })
  expect(HostPlugin.Config({ pollMs: 250 })).toEqual({ pollMs: 250 })
  expect(HostPlugin.Config({ pollMs: 10000 })).toEqual({ pollMs: 10000 })
  for (const pollMs of [249, 10001, 250.5, Number.NaN, Number.POSITIVE_INFINITY, '250']) {
    expect(HostPlugin.Config['~standard'].validate({ pollMs })).toHaveProperty('issues')
  }
})

it('publishes only the cadence and removes its contribution with the scope', async () => {
  const ctx = new Context()
  try {
    const first = ctx.plugin(HostPlugin, { pollMs: 250 })
    await first
    const row = { kind: 'global', name: AUTHORIZATION_CONFIG_GLOBAL, value: { pollMs: 250 } }
    expect(collect(ctx)).toEqual([row])
    await first.dispose()
    expect(collect(ctx)).toEqual([])
    const second = ctx.plugin(HostPlugin, { pollMs: 10000 })
    await second
    expect(collect(ctx)).toEqual([{ ...row, value: { pollMs: 10000 } }])
    await second.dispose()
    expect(collect(ctx)).toEqual([])
  } finally { await ctx.fiber.dispose() }
})
