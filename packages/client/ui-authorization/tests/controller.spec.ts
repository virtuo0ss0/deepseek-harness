/** Browser state races over a scripted current-Remote namespace. */
import { afterEach, expect, it, vi } from 'vitest'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import type { AuthorizationEntry } from '@deepseek-ai/dsh-authorization/types'
import type { CredentialKey } from '@deepseek-ai/dsh-credentials/types'
import type { AttemptView, PromptId } from '@deepseek-ai/dsh-web-authorization/types'
import { AuthorizationController, type Operations } from '../src/client/controller.ts'

const flow: AuthorizationEntry = { key: 'test/flow' as CredentialKey, label: 'Example', methods: [{ id: 'login', label: 'Login' }], inFlight: false }
const controllers: AuthorizationController[] = []
afterEach(() => { controllers.splice(0).forEach(controller => controller.dispose()); vi.useRealTimers() })

function setup() {
  let view: AttemptView | undefined
  const remote = {
    list: vi.fn<Operations['list']>(async () => ({ ok: true, value: [flow] })),
    begin: vi.fn<Operations['begin']>(async ({ attemptId }) => {
      view = { attemptId, status: 'running', notices: [] }
      return { ok: true, value: structuredClone(view) }
    }),
    status: vi.fn<Operations['status']>(async () => view
      ? { ok: true, value: structuredClone(view) }
      : { ok: false, error: new RemoteError('authorization/rejected', 'Unavailable', { reason: 'unknown-attempt' }) }),
    answer: vi.fn<Operations['answer']>(async () => ({ ok: true, value: undefined })),
    cancel: vi.fn<Operations['cancel']>(async () => ({ ok: true, value: undefined })),
  }
  const controller = new AuthorizationController(remote, 250)
  controllers.push(controller)
  return { controller, remote, setView: (next: AttemptView | undefined) => { view = next } }
}

async function flush() { for (let turn = 0; turn < 8; turn++) await Promise.resolve() }

it('lists, begins, projects notices and prompts, and sends correlated transient answers', async () => {
  const { controller, remote, setView } = setup()
  controller.open()
  await flush()
  expect(controller.store.getSnapshot().flows).toEqual([flow])
  await controller.begin(flow, 'login')
  await flush()
  const id = remote.begin.mock.calls[0]![0].attemptId
  const promptId = 'prompt-one' as PromptId
  setView({ attemptId: id, status: 'running', notices: [{ message: 'Continue' }], prompt: { promptId, kind: 'secret', message: 'Code' } })
  await controller.refresh()
  expect(controller.store.getSnapshot().attempt?.prompt?.promptId).toBe(promptId)
  await controller.answer(promptId, 'private-answer')
  expect(remote.answer).toHaveBeenCalledWith(id, promptId, 'private-answer')
  expect(JSON.stringify(controller.store.getSnapshot())).not.toContain('private-answer')
  await flush()
  setView({ attemptId: id, status: 'authorized', notices: [] })
  await controller.refresh()
  controller.dismiss()
  expect(controller.store.getSnapshot().attempt).toBeUndefined()
})

it('recovers a lost begin reply using the same capability without starting again', async () => {
  const { controller, remote, setView } = setup()
  controller.open()
  await flush()
  remote.begin.mockImplementationOnce(async ({ attemptId }) => {
    setView({ attemptId, status: 'running', notices: [] })
    throw new Error('transport lost with sensitive diagnostics')
  })
  await controller.begin(flow, 'login')
  await flush()
  expect(controller.store.getSnapshot().attempt?.status).toBe('running')
  await controller.begin(flow, 'login')
  expect(remote.begin).toHaveBeenCalledTimes(1)
  expect(JSON.stringify(controller.store.getSnapshot())).not.toContain('sensitive')
})

it('clears expired handles and lets a reconnect start a distinct attempt', async () => {
  const { controller, remote, setView } = setup()
  controller.open()
  await flush()
  await controller.begin(flow, 'login')
  await flush()
  setView(undefined)
  await controller.refresh()
  expect(controller.store.getSnapshot().label).toBeUndefined()
  await controller.begin(flow, 'login')
  expect(remote.begin.mock.calls[0]![0].attemptId).not.toBe(remote.begin.mock.calls[1]![0].attemptId)
})

it('ignores an old poll after cancellation and clears timers and UI on scope disposal', async () => {
  vi.useFakeTimers()
  const { controller, remote } = setup()
  const close = controller.open()
  await flush()
  await controller.begin(flow, 'login')
  await flush()
  const id = remote.begin.mock.calls[0]![0].attemptId
  let resolve!: (value: Awaited<ReturnType<Operations['status']>>) => void
  remote.status.mockImplementationOnce(() => new Promise((done) => { resolve = done }))
  const pending = controller.refresh()
  await controller.cancel()
  expect(remote.cancel).toHaveBeenCalledWith(id)
  close()
  resolve({ ok: true, value: { attemptId: id, status: 'running', notices: [{ message: 'Late notice' }] } })
  await pending
  expect(controller.store.getSnapshot()).toEqual({ flows: [], busy: false, error: false })
  expect(vi.getTimerCount()).toBe(0)
  controller.dispose()
  controller.open()
  await flush()
  expect(vi.getTimerCount()).toBe(0)
})

it('cancels the pending begin capability on unload and ignores its eventual response', async () => {
  const { controller, remote } = setup()
  controller.open()
  await flush()
  let resolve!: (value: Awaited<ReturnType<Operations['begin']>>) => void
  remote.begin.mockImplementationOnce(() => new Promise((done) => { resolve = done }))
  const pending = controller.begin(flow, 'login')
  const id = remote.begin.mock.calls[0]![0].attemptId
  controller.dispose()
  expect(remote.cancel).toHaveBeenCalledWith(id)
  resolve({ ok: true, value: { attemptId: id, status: 'running', notices: [] } })
  await pending
  expect(controller.store.getSnapshot()).toEqual({ flows: [], busy: false, error: false })
})
