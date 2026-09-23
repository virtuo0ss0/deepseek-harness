import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import AuthorizationService, { type AuthorizationSession } from '@deepseek-ai/dsh-authorization'
import LocalCredentials from '@deepseek-ai/dsh-credentials-local'
import { credentialKey, credentialRef } from '@deepseek-ai/dsh-credentials'
import { afterEach, expect, it, vi } from 'vitest'
import { WebAuthorizationAttempts } from '../src/attempts.ts'
import type { AttemptId } from '../src/types.ts'

const key = credentialKey('synthetic', 'independent')
const cleanup: Array<() => Promise<void>> = []
afterEach(async () => {
  while (cleanup.length) await cleanup.pop()!()
  vi.useRealTimers()
})

async function fixture(run: (session: AuthorizationSession) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-web-auth-'))
  const ctx = new Context()
  const credentials = ctx.plugin(LocalCredentials, { path: join(dir, 'credentials.yaml'), watch: false })
  await credentials
  const authorization = ctx.plugin(AuthorizationService)
  await authorization
  const flow = ctx.authorization.registerFlow({ key, label: 'Independent', methods: [{ id: 'test', label: 'Test' }], run })
  const attempts = new WebAuthorizationAttempts(ctx.authorization, { leaseMs: 1000 })
  cleanup.push(async () => {
    await attempts.dispose()
    flow()
    await authorization.dispose()
    await credentials.dispose()
    await rm(dir, { recursive: true, force: true })
  })
  const start = () => attempts.begin({ attemptId: randomUUID() as AttemptId, key, method: 'test' })
  return { ctx, attempts, start, flow }
}

it('lists metadata and begins one locked attempt without disclosing another client handle', async () => {
  const f = await fixture(async (s) => { await s.prompt({ kind: 'text', message: 'Name' }) })
  expect(f.attempts.list()).toEqual([{ key, label: 'Independent', methods: [{ id: 'test', label: 'Test' }], inFlight: false }])
  const first = f.start()
  expect(first.status).toBe('running')
  expect(f.attempts.list()[0]?.inFlight).toBe(true)
  expect(JSON.stringify(f.attempts.list())).not.toContain(first.attemptId)
  expect(() => f.start()).toThrow()
  expect(f.attempts.begin({ attemptId: first.attemptId, key, method: 'test' })).toEqual(first)
  expect(() => f.attempts.begin({ attemptId: first.attemptId, key, method: 'different' })).toThrow()
})

it('bounds notices, projects fields, rejects unsafe links and returns detached snapshots', async () => {
  const f = await fixture(async (s) => {
    for (let i = 0; i < 80; i++) s.notify({ message: '界'.repeat(4000), url: 'javascript:alert(1)', ...{ token: 'hidden' } })
    await s.prompt({ kind: 'text', message: 'Name' })
  })
  const view = f.start()
  expect(Buffer.byteLength(JSON.stringify(view))).toBeLessThanOrEqual(32768)
  expect(JSON.stringify(view)).not.toMatch(/javascript|hidden|token/)
  view.notices.length = 0
  expect(f.attempts.status(view.attemptId).notices.length).toBeGreaterThan(0)
})

it('correlates text, secret and select answers, then settles without retaining answers or grants', async () => {
  const supplied: string[] = []
  const f = await fixture(async (s) => {
    supplied.push(await s.prompt({ kind: 'text', message: 'Name' }))
    supplied.push(await s.prompt({ kind: 'secret', message: 'Secret' }))
    supplied.push(await s.prompt({ kind: 'select', message: 'Choose', options: [{ id: 'one', label: 'One' }] }))
    await f.ctx.credentials.modifyRecord(key, async () => ({ kind: 'grant', payload: { access: 'host-only' } }))
  })
  let view = f.start()
  const oldPrompt = view.prompt!.promptId
  for (const answer of ['typed-name', 'typed-secret', 'one']) {
    await vi.waitFor(() => { expect(f.attempts.status(view.attemptId).prompt).toBeDefined() })
    view = f.attempts.status(view.attemptId)
    if (answer === 'one') expect(() => { f.attempts.answer(view.attemptId, view.prompt!.promptId, 'invalid') }).toThrow()
    f.attempts.answer(view.attemptId, view.prompt!.promptId, answer)
    expect(() => { f.attempts.answer(view.attemptId, view.prompt!.promptId, answer) }).toThrow()
  }
  await vi.waitFor(() => { expect(f.attempts.status(view.attemptId).status).toBe('authorized') })
  expect(supplied).toEqual(['typed-name', 'typed-secret', 'one'])
  const final = f.attempts.status(view.attemptId)
  expect(final.prompt).toBeUndefined()
  expect(JSON.stringify(final)).not.toMatch(/typed-name|typed-secret|host-only|payload/)
  expect(() => { f.attempts.answer(view.attemptId, oldPrompt, 'stale') }).toThrow()
})

it('never lets stale cancellation reach a newer attempt for the same key', async () => {
  const f = await fixture(async (s) => { await s.prompt({ kind: 'secret', message: 'Secret' }) })
  const first = f.start()
  f.attempts.cancel(first.attemptId)
  await vi.waitFor(() => { expect(f.attempts.status(first.attemptId).status).toBe('cancelled') })
  const second = f.start()
  expect(() => { f.attempts.cancel(first.attemptId) }).toThrow()
  expect(() => { f.attempts.answer(second.attemptId, first.prompt!.promptId, 'old') }).toThrow()
  expect(f.attempts.status(second.attemptId).status).toBe('running')
  expect(f.ctx.authorization.describe(key)?.inFlight).toBe(true)
})

it('withdraws a losing callback prompt without classifying later failure as human decline', async () => {
  const withdrawal = new AbortController()
  const f = await fixture(async (s) => {
    try { await s.prompt({ kind: 'text', message: 'Fallback', signal: withdrawal.signal }) }
    catch { throw new Error('raw provider exception containing a token') }
  })
  const first = f.start()
  withdrawal.abort()
  await vi.waitFor(() => { expect(f.attempts.status(first.attemptId).status).toBe('failed') })
  expect(JSON.stringify(f.attempts.status(first.attemptId))).not.toContain('token')
})

it('settles provider removal, rejects late prompts and cleans retained views on disposal', async () => {
  let session!: AuthorizationSession
  const f = await fixture(async (s) => { session = s; await new Promise(() => {}) })
  const view = f.start()
  f.flow()
  await vi.waitFor(() => { expect(f.attempts.status(view.attemptId).status).toBe('cancelled') })
  await expect(session.prompt({ kind: 'secret', message: 'late' })).rejects.toThrow()
  session.notify({ message: 'late' })
  expect(f.attempts.status(view.attemptId).notices).toEqual([])
  await f.attempts.dispose()
  expect(() => f.attempts.status(view.attemptId)).toThrow()
  expect(() => f.start()).toThrow()
})

it('retains an owned attempt across brief reconnect, but expires abandoned reload state', async () => {
  const f = await fixture(async (s) => { await s.prompt({ kind: 'text', message: 'Name' }) })
  vi.useFakeTimers()
  const view = f.start()
  await vi.advanceTimersByTimeAsync(800)
  expect(f.attempts.status(view.attemptId).prompt?.promptId).toBe(view.prompt?.promptId)
  await vi.advanceTimersByTimeAsync(800)
  expect(f.ctx.authorization.describe(key)?.inFlight).toBe(true)
  await vi.advanceTimersByTimeAsync(300)
  expect(() => f.attempts.status(view.attemptId)).toThrow()
  expect(f.ctx.authorization.describe(key)?.inFlight).toBe(false)
  expect(vi.getTimerCount()).toBe(0)
})

it('leaves existing API-key references and readiness unchanged', async () => {
  const f = await fixture(async () => { throw new Error('failed') })
  const ref = credentialRef('EXISTING_PROVIDER_KEY')
  await f.ctx.credentials.set(ref, 'existing-key')
  const before = await f.ctx.credentials.describe(ref)
  const attempt = f.start()
  await vi.waitFor(() => { expect(f.attempts.status(attempt.attemptId).status).toBe('failed') })
  expect(await f.ctx.credentials.describe(ref)).toEqual(before)
  expect(await f.ctx.credentials.resolve(ref)).toEqual(expect.objectContaining({ value: 'existing-key' }))
})
