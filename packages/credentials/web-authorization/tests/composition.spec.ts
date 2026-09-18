/** Loader composition through current Gateway, with an installed catalog's keyless login flow. */
import { randomUUID } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import Authorization from '@deepseek-ai/dsh-authorization'
import Credentials from '@deepseek-ai/dsh-credentials-local'
import { credentialKey, credentialRef } from '@deepseek-ai/dsh-credentials'
import Llm from '@deepseek-ai/dsh-llm'
import * as PiAi from '@deepseek-ai/dsh-llm-pi-ai'
import Gateway from '@deepseek-ai/dsh-api-gateway'
import Registry from '@deepseek-ai/dsh-typert-registry'
import { expect, it, vi } from 'vitest'
import Companion from '../src/index.ts'
import type { AttemptId, AttemptView } from '../src/types.ts'

it('loads the companion, drives a real catalog flow through Gateway, and disposes an active flow', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-web-auth-loader-'))
  const ctx = new Context()
  try {
    const credentialPath = join(dir, 'credentials.yaml')
    const rows = [
      { id: 'registry', name: 'registry' },
      { id: 'gateway', name: 'gateway' },
      { id: 'credentials', name: 'credentials', config: { path: credentialPath, watch: false } },
      { id: 'authorization', name: 'authorization' },
      { id: 'llm', name: 'llm' },
      { id: 'pi', name: 'pi' },
      { id: 'companion', name: 'companion', config: { leaseMs: 60000 } },
    ]
    const configPath = join(dir, 'cordis.yml')
    await writeFile(configPath, JSON.stringify(rows))
    await ctx.plugin(Loader)
    ctx.loader.builtins.include = Include
    const modules = new Map<string, unknown>([
      ['registry', Registry], ['gateway', Gateway], ['credentials', Credentials],
      ['authorization', Authorization], ['llm', Llm], ['pi', PiAi], ['companion', Companion],
    ])
    ctx.loader.internal = {
      version: 'v2',
      async import(specifier: string): Promise<unknown> {
        if (!modules.has(specifier)) throw new Error('Unexpected test module')
        return modules.get(specifier)
      },
    } as unknown as NonNullable<typeof ctx.loader.internal>
    await ctx.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(configPath).href } })
    await ctx.loader.await()
    const invoke = (method: string, args: Record<string, unknown> = {}): Promise<unknown> =>
      ctx.typertGateway.invoke({ namespace: 'webAuthorization', method, args })
    const key = credentialKey('llm-pi-ai', 'deepseek')
    expect(await invoke('list')).toContainEqual(expect.objectContaining({ key, methods: [{ id: 'api-key', label: 'DeepSeek API key' }] }))
    const ref = credentialRef('UNCHANGED_EXISTING_API_KEY')
    await ctx.credentials.set(ref, 'original-key')
    const attemptId = randomUUID() as AttemptId
    await invoke('begin', { request: { attemptId, key, method: 'api-key' } })
    let view!: AttemptView
    await vi.waitFor(async () => {
      view = await invoke('status', { attemptId }) as AttemptView
      expect(view.prompt?.kind).toBe('secret')
    })
    await invoke('answer', { attemptId, promptId: view.prompt!.promptId, answer: 'dummy-catalog-key' })
    await vi.waitFor(async () => {
      expect(await invoke('status', { attemptId })).toEqual({ attemptId, status: 'authorized', notices: [] })
    })
    expect(await ctx.credentials.readRecord(key)).toEqual({ kind: 'api-key', key: 'dummy-catalog-key' })
    expect(await ctx.credentials.resolve(ref)).toEqual(expect.objectContaining({ value: 'original-key' }))
    expect(ctx.llm.listProviders()).toEqual([])

    const second = randomUUID() as AttemptId
    await invoke('begin', { request: { attemptId: second, key, method: 'api-key' } })
    const companion = ctx.webAuthorization
    const entry = [...ctx.loader.entries()].find(candidate => candidate.options.id === 'companion')
    expect(entry?.fiber).toBeDefined()
    await entry!.fiber!.dispose()
    await vi.waitFor(() => expect(ctx.authorization.describe(key)?.inFlight).toBe(false))
    expect(() => companion.status(second)).toThrow()
  } finally {
    await ctx.fiber.dispose()
    await rm(dir, { recursive: true, force: true })
  }
})
