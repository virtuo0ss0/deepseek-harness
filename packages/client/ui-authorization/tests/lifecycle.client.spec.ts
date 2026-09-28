/** Source-only Cordis ownership test; generated descriptors have a separate built smoke. */
import { Context } from '@deepseek-ai/cordis'
import { afterEach, expect, it, vi } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/src/client/registry.ts'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots'
import type { FooterInjected } from '../src/client/AuthorizationFooter.tsx'
import type { Operations } from '../src/client/controller.ts'
import * as Companion from '../src/client/index.ts'
import { AUTHORIZATION_CONFIG_GLOBAL } from '../src/config.ts'

vi.mock('@deepseek-ai/dsh-web-authorization/remote', () => ({ default: {} }))
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

async function flush() { for (let turn = 0; turn < 8; turn++) await Promise.resolve() }

it('recreates controllers with the footer declaration and unmounts Remote on plugin disposal', async () => {
  const ctx = new Context()
  const unmount = vi.fn(async () => {})
  const list = vi.fn<Operations['list']>(async () => ({ ok: true, value: [] }))
  const operations: Operations = {
    list,
    begin: async ({ attemptId }) => ({ ok: true, value: { attemptId, status: 'running', notices: [] } }),
    status: async () => { throw new Error('No status expected') },
    answer: async () => ({ ok: true, value: undefined }),
    cancel: vi.fn<Operations['cancel']>(async () => ({ ok: true, value: undefined })),
  }
  try {
    await ctx.plugin(SlotRegistry)
    ctx.provide('locale', new LocaleRuntime(ctx))
    ctx.provide('remote', { $mount: async () => unmount, webAuthorization: operations })
    ctx.provide('remote.webAuthorization', operations)
    vi.stubGlobal(AUTHORIZATION_CONFIG_GLOBAL, { pollMs: 250 })
    vi.useFakeTimers()
    const plugin = ctx.plugin(Companion)
    await plugin
    const declare = () => ctx.slots.register({ name: 'root', children: {
      'settings.models.footer': { kind: 'list', scope: 'root' },
    } }, (() => null) as never)
    const remove = declare()
    expect(ctx.slots.entries('settings.models.footer')).toHaveLength(1)
    // Injection products are erased in the registry's storage interface.
    const injected = (entry: StoredEntry) => entry.inject!() as FooterInjected & Record<string, unknown>
    const first = injected(ctx.slots.entries('settings.models.footer')[0]!)
    first.open()
    await first.refresh()
    await flush()
    expect(list).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(249)
    expect(list).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(list).toHaveBeenCalledTimes(2)
    remove()
    expect(first.hooks.snapshot.getSnapshot()).toEqual({ flows: [], busy: false, error: false })
    const removeAgain = declare()
    const second = injected(ctx.slots.entries('settings.models.footer')[0]!)
    expect(second.hooks.snapshot).not.toBe(first.hooks.snapshot)
    await plugin.dispose()
    expect(unmount).toHaveBeenCalledOnce()
    expect(ctx.slots.entries('settings.models.footer')).toHaveLength(0)
    removeAgain()
  } finally { await ctx.fiber.dispose() }
})

it('starts without Host bootstrap and rejects malformed supplied data before mounting Remote', async () => {
  const ctx = new Context()
  const mount = vi.fn(async () => vi.fn())
  try {
    await ctx.plugin(SlotRegistry)
    ctx.provide('locale', new LocaleRuntime(ctx))
    ctx.provide('remote', { $mount: mount })
    const operations: Operations = {
      list: async () => ({ ok: true, value: [] }),
      begin: async ({ attemptId }) => ({ ok: true, value: { attemptId, status: 'running', notices: [] } }),
      status: async attemptId => ({ ok: true, value: { attemptId, status: 'running', notices: [] } }),
      answer: async () => ({ ok: true, value: undefined }),
      cancel: async () => ({ ok: true, value: undefined }),
    }
    ctx.provide('remote.webAuthorization', operations)
    vi.stubGlobal(AUTHORIZATION_CONFIG_GLOBAL, { pollMs: '250' })
    await expect(Companion.apply(ctx)).rejects.toThrow()
    expect(mount).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
    const dispose = await Companion.apply(ctx)
    expect(mount).toHaveBeenCalledOnce()
    await dispose()
  } finally { await ctx.fiber.dispose() }
})
