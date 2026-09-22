/** Artifact-only smoke. Run after build:lib:host; never imported by source Vitest. */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { Context } from '@deepseek-ai/cordis'
import Registry from '@deepseek-ai/dsh-typert-registry'
import Gateway from '@deepseek-ai/dsh-api-gateway'
import Credentials from '@deepseek-ai/dsh-credentials-local'
import Authorization from '@deepseek-ai/dsh-authorization'
import { credentialKey } from '@deepseek-ai/dsh-credentials'
import Companion from '@deepseek-ai/dsh-web-authorization'
import { TYPERT } from '@deepseek-ai/dsh-web-authorization/typert'

const dir = await mkdtemp(join(tmpdir(), 'dsh-built-web-auth-'))
const ctx = new Context()
try {
  await ctx.plugin(Registry)
  ctx.typert.register(TYPERT)
  await ctx.plugin(Gateway)
  await ctx.plugin(Credentials, { path: join(dir, 'credentials.yaml'), watch: false })
  await ctx.plugin(Authorization)
  const owner = ctx.plugin(Companion, { leaseMs: 60000 })
  await owner
  const key = credentialKey('synthetic', 'built')
  ctx.authorization.registerFlow({ key, label: 'Built flow', methods: [{ id: 'login', label: 'Login' }], async run(session) {
    session.notify({ message: 'Continue' })
    await session.prompt({ kind: 'secret', message: 'Secret' })
    await ctx.credentials.modifyRecord(key, async () => ({ kind: 'grant', payload: { token: 'host-only-token' } }))
  } })
  const invoke = (method, args = {}) => ctx.typertGateway.invoke({ namespace: 'webAuthorization', method, args })
  assert.equal((await invoke('list'))[0].key, key)
  await assert.rejects(invoke('begin', { request: { attemptId: 1, key, method: 'login' } }))
  await assert.rejects(invoke('begin', { request: { attemptId: randomUUID(), key } }))
  const attemptId = randomUUID()
  let view = await invoke('begin', { request: { attemptId, key, method: 'login', unexpected: 'discard-this' } })
  assert.doesNotMatch(JSON.stringify(view), /discard-this|unexpected/)
  assert.equal(view.prompt.kind, 'secret')
  await assert.rejects(invoke('answer', { attemptId, promptId: randomUUID(), answer: 'stale' }))
  await invoke('answer', { attemptId, promptId: view.prompt.promptId, answer: 'transient-answer' })
  for (let retry = 0; retry < 100; retry++) {
    view = await invoke('status', { attemptId })
    if (view.status !== 'running') break
    await delay(10)
  }
  assert.equal(view.status, 'authorized')
  assert.doesNotMatch(JSON.stringify(view), /host-only-token|transient-answer|payload/)
  await owner.dispose()
  await assert.rejects(invoke('list'))
  console.log('Built authorization Gateway smoke passed: strict args, correlated prompts, settlement, disposal.')
} finally {
  await ctx.fiber.dispose()
  await rm(dir, { recursive: true, force: true })
}
