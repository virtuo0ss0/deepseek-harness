/** Owns transient Web interactions; the authorization service owns flow execution and locks. */
import { randomUUID } from 'node:crypto'
import type { AuthorizationService, AuthorizationPrompt } from '@deepseek-ai/dsh-authorization'
import type { AuthorizationEntry, AuthorizationNotice } from '@deepseek-ai/dsh-authorization/types'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import type { AttemptId, AttemptView, BeginRequest, Config, PromptId, PromptView } from './types.ts'

interface Pending {
  view: PromptView
  resolve: (answer: string) => void
  reject: (error: Error) => void
  detach: () => void
}

interface Attempt {
  request: BeginRequest
  controller: AbortController
  view: AttemptView
  pending: Pending | undefined
  timer: ReturnType<typeof setTimeout> | undefined
  done: Promise<void>
}

// Security bounds apply to the complete serialized view, including wrappers.
const MAX_VIEW_BYTES = 32768
const MAX_ATTEMPTS = 32
const MAX_NOTICES = 16
const MAX_FIELD_BYTES = 2048
const MAX_ANSWER_BYTES = 16384
const UUID = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i

function refusal(code: string): RemoteError {
  return new RemoteError('authorization/rejected', 'Authorization action is unavailable.', { reason: code })
}

function bounded(text: string): string {
  let result = ''
  let bytes = 0
  for (const char of text) {
    bytes += Buffer.byteLength(char)
    if (bytes > MAX_FIELD_BYTES) break
    result += char
  }
  return result
}

function noticeView(notice: AuthorizationNotice): AuthorizationNotice {
  const view: AuthorizationNotice = { message: bounded(notice.message) }
  if (notice.code !== undefined) view.code = bounded(notice.code)
  if (notice.url !== undefined && Buffer.byteLength(notice.url) <= MAX_FIELD_BYTES) {
    try {
      const url = new URL(notice.url)
      if (!url.username && !url.password && (url.protocol === 'https:'
        || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
        view.url = url.href
      }
    } catch (_error) { /* Invalid provider links are omitted from the browser projection. */ }
  }
  return view
}

function promptView(prompt: AuthorizationPrompt): PromptView {
  const common = { promptId: randomUUID() as PromptId, message: bounded(prompt.message) }
  if (prompt.kind === 'select') {
    if (prompt.options.length === 0 || prompt.options.length > 64) throw refusal('prompt-too-large')
    return {
      ...common, kind: 'select', options: prompt.options.map(option => ({
        id: option.id, label: bounded(option.label),
        ...(option.description === undefined ? {} : { description: bounded(option.description) }),
      })),
    }
  }
  return { ...common, kind: prompt.kind,
    ...(prompt.placeholder === undefined ? {} : { placeholder: bounded(prompt.placeholder) }) }
}

/** One companion scope owns its attempt capabilities, prompts and expiry timers. */
export class WebAuthorizationAttempts {
  private readonly attempts = new Map<AttemptId, Attempt>()
  private disposed = false

  constructor(private readonly authorization: Pick<AuthorizationService, 'list' | 'begin'>, private readonly config: Config) {
    if (!Number.isSafeInteger(config.leaseMs) || config.leaseMs < 1000 || config.leaseMs > 3600000) {
      throw new Error('leaseMs must be an integer between 1000 and 3600000')
    }
  }

  /** @returns registered metadata, without credential state or attempt capabilities. */
  list(): AuthorizationEntry[] {
    this.assertActive()
    return this.authorization.list().map(flow => ({
      key: flow.key, label: bounded(flow.label), inFlight: flow.inFlight,
      methods: flow.methods.map(method => ({ id: method.id, label: bounded(method.label) })),
    }))
  }

  /**
   * Start a flow or recover the same retained request; another key owner is never joined.
   * @param request - browser-created random capability and registered method.
   * @returns the initial allowlisted state.
   */
  begin(request: BeginRequest): AttemptView {
    this.assertActive()
    if (!UUID.test(request.attemptId)) throw refusal('invalid-attempt')
    const existing = this.attempts.get(request.attemptId)
    if (existing) {
      if (existing.request.key !== request.key || existing.request.method !== request.method) throw refusal('conflict')
      return this.status(request.attemptId)
    }
    const flow = this.authorization.list().find(entry => entry.key === request.key)
    if (!flow || !flow.methods.some(method => method.id === request.method)) throw refusal('unknown-flow')
    if (flow.inFlight) throw refusal('busy')
    if (this.attempts.size >= MAX_ATTEMPTS) throw refusal('capacity')
    const attempt: Attempt = {
      request: { ...request }, controller: new AbortController(), pending: undefined, timer: undefined,
      view: { attemptId: request.attemptId, status: 'running', notices: [] }, done: Promise.resolve(),
    }
    this.attempts.set(request.attemptId, attempt)
    this.renew(attempt)
    attempt.done = this.authorization.begin({
      key: request.key, method: request.method, signal: attempt.controller.signal,
      interaction: {
        notify: (notice) => {
          if (!this.running(attempt)) return
          attempt.view.notices.push(noticeView(notice))
          this.bound(attempt)
        },
        prompt: async (prompt) => {
          if (!this.running(attempt) || prompt.signal?.aborted) throw refusal('withdrawn')
          if (attempt.pending) throw refusal('concurrent-prompt')
          const view = promptView(prompt)
          // Reject an oversized prompt whole: truncating choice ids changes the provider protocol.
          if (Buffer.byteLength(JSON.stringify({ ...attempt.view, notices: [], prompt: view })) > MAX_VIEW_BYTES) {
            throw refusal('prompt-too-large')
          }
          return await new Promise<string>((resolve, reject) => {
            const withdraw = (): void => this.clearPrompt(attempt, refusal('withdrawn'))
            attempt.pending = { view, resolve, reject, detach: () => prompt.signal?.removeEventListener('abort', withdraw) }
            attempt.view.prompt = view
            this.bound(attempt)
            prompt.signal?.addEventListener('abort', withdraw, { once: true })
          })
        },
      },
    }).then((outcome) => { this.settle(attempt, outcome.status) }, () => { this.settle(attempt, 'failed') })
    return this.snapshot(attempt)
  }

  /** @param id - retained browser capability. @returns state; observing a running attempt renews its lease. */
  status(id: AttemptId): AttemptView {
    const attempt = this.get(id)
    if (this.running(attempt)) this.renew(attempt)
    return this.snapshot(attempt)
  }

  /**
   * Consume exactly one pending prompt. Answers are never retained in snapshots or error details.
   * @param id - attempt capability.
   * @param promptId - identity of the currently visible prompt.
   * @param answer - transient text or offered choice id.
   */
  answer(id: AttemptId, promptId: PromptId, answer: string): void {
    const attempt = this.get(id)
    const pending = attempt.pending
    if (!this.running(attempt) || !pending || pending.view.promptId !== promptId) throw refusal('stale-prompt')
    if (Buffer.byteLength(answer) > MAX_ANSWER_BYTES) throw refusal('answer-too-large')
    if (pending.view.kind === 'select' && !pending.view.options.some(option => option.id === answer)) throw refusal('invalid-choice')
    pending.detach()
    attempt.pending = undefined
    delete attempt.view.prompt
    this.renew(attempt)
    pending.resolve(answer)
  }

  /** @param id - capability of the attempt to withdraw; never cancels by credential key. */
  cancel(id: AttemptId): void {
    const attempt = this.get(id)
    if (!this.running(attempt)) throw refusal('stale-attempt')
    this.withdraw(attempt)
  }

  /** Abort owned work, reject prompts, remove timers and await service settlement. */
  async dispose(): Promise<void> {
    this.disposed = true
    const attempts = [...this.attempts.values()]
    this.attempts.clear()
    for (const attempt of attempts) {
      clearTimeout(attempt.timer)
      this.withdraw(attempt)
    }
    await Promise.all(attempts.map(attempt => attempt.done))
  }

  private assertActive(): void { if (this.disposed) throw refusal('disposed') }

  private get(id: AttemptId): Attempt {
    this.assertActive()
    const attempt = this.attempts.get(id)
    if (!attempt) throw refusal('unknown-attempt')
    return attempt
  }

  private running(attempt: Attempt): boolean {
    return !this.disposed && this.attempts.get(attempt.request.attemptId) === attempt
      && attempt.view.status === 'running' && !attempt.controller.signal.aborted
  }

  private snapshot(attempt: Attempt): AttemptView { return structuredClone(attempt.view) }

  private bound(attempt: Attempt): void {
    while (attempt.view.notices.length > MAX_NOTICES || Buffer.byteLength(JSON.stringify(attempt.view)) > MAX_VIEW_BYTES) {
      attempt.view.notices.shift()
    }
  }

  private clearPrompt(attempt: Attempt, error: Error): void {
    const pending = attempt.pending
    attempt.pending = undefined
    delete attempt.view.prompt
    pending?.detach()
    pending?.reject(error)
  }

  private withdraw(attempt: Attempt): void {
    attempt.controller.abort()
    this.clearPrompt(attempt, refusal('withdrawn'))
  }

  private settle(attempt: Attempt, status: AttemptView['status']): void {
    this.clearPrompt(attempt, refusal('settled'))
    attempt.view = { attemptId: attempt.request.attemptId, status, notices: [] }
    if (this.attempts.get(attempt.request.attemptId) === attempt) this.renew(attempt)
  }

  private renew(attempt: Attempt): void {
    clearTimeout(attempt.timer)
    attempt.timer = setTimeout(() => {
      this.attempts.delete(attempt.request.attemptId)
      this.withdraw(attempt)
    }, this.config.leaseMs)
    attempt.timer.unref()
  }
}
