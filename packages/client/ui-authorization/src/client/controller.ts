/** Browser-owned transient handles and polling; answers never enter snapshot state. */
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import { randomUUID } from '@deepseek-ai/dsh-util-crypto'
import type { AuthorizationEntry } from '@deepseek-ai/dsh-authorization/types'
import type { AttemptId, AttemptView, BeginRequest, PromptId } from '@deepseek-ai/dsh-web-authorization/types'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'

/** Only the generated authorization namespace is passed to the controller. */
export interface Operations {
  list(): Promise<RemoteResult<AuthorizationEntry[]>>
  begin(request: BeginRequest): Promise<RemoteResult<AttemptView>>
  status(attemptId: AttemptId): Promise<RemoteResult<AttemptView>>
  answer(attemptId: AttemptId, promptId: PromptId, answer: string): Promise<RemoteResult<void>>
  cancel(attemptId: AttemptId): Promise<RemoteResult<void>>
}

/** Browser display state excludes credentials, input values and raw Remote errors. */
export interface State {
  flows: AuthorizationEntry[]
  attempt?: AttemptView
  label?: string
  busy: boolean
  error: boolean
}

/** Scope-owned controller; losing the scope loses the attempt capability. */
export class AuthorizationController {
  /** Allowlisted display state consumed through the renderer's selector hook. */
  readonly store: SnapshotStore<State> = createSnapshotStore<State>({ flows: [], busy: false, error: false })
  private timer: ReturnType<typeof setTimeout> | undefined
  private active = false
  private disposed = false
  private generation = 0
  private polling = false
  private id: AttemptId | undefined

  constructor(private readonly remote: Operations, private readonly pollMs: number) {
    if (!Number.isSafeInteger(pollMs) || pollMs < 250 || pollMs > 10000) throw new Error('Invalid authorization polling interval')
  }

  /**
   * Activate observation while the footer is rendered.
   * @returns cleanup that abandons the exact attempt.
   */
  open(): () => void {
    if (this.disposed) return () => {}
    this.active = true
    void this.refresh()
    return () =>{  this.close() }
  }

  /** Fetch metadata and owned state, discarding replies older than the last user action. */
  async refresh(): Promise<void> {
    if (!this.isOpen() || this.polling) return
    this.polling = true
    clearTimeout(this.timer)
    const generation = this.generation
    const id = this.id
    try {
      const [flows, status] = await Promise.all([this.remote.list(), id ? this.remote.status(id) : undefined])
      if (!this.isCurrent(generation)) return
      this.store.update((state) => {
        if (flows.ok) state.flows = flows.value
        state.error = !flows.ok || (status !== undefined && !status.ok)
        if (status?.ok) state.attempt = status.value
        else if (status && status.error.code === 'authorization/rejected'
          && status.error.details.reason === 'unknown-attempt') {
          delete state.attempt
          delete state.label
          this.id = undefined
        }
      })
    } catch (_error) {
      // Foreign transport adapters may reject; never render their raw diagnostics.
      if (this.isCurrent(generation)) this.store.update((state) => { state.error = true })
    } finally {
      this.polling = false
      if (this.isOpen()) this.timer = setTimeout(() => { void this.refresh() }, this.pollMs)
    }
  }

  /**
   * Start an attempt with a fresh browser capability.
   * @param flow - registered selection.
   * @param method - selected registered method.
   */
  async begin(flow: AuthorizationEntry, method: string): Promise<void> {
    if (!this.active || this.disposed || this.id || this.store.getSnapshot().busy) return
    const id = randomUUID() as AttemptId
    this.id = id
    const generation = ++this.generation
    this.store.update((state) => { state.busy = true; state.error = false; state.label = flow.label })
    try {
      const result = await this.remote.begin({ attemptId: id, key: flow.key, method })
      if (!this.isCurrent(generation)) return
      this.store.update((state) => {
        if (result.ok) state.attempt = result.value
        else state.error = true
      })
      // A failed reply can be ambiguous. Observe the known capability before offering another start.
    } catch (_error) {
      if (generation === this.generation) this.store.update((state) => { state.error = true })
    } finally {
      if (generation === this.generation) {
        this.store.update((state) => { state.busy = false })
        void this.refresh()
      }
    }
  }

  /**
   * Submit a transient answer for the current attempt.
   * @param promptId - visible question identity.
   * @param answer - transient input, never stored.
   */
  async answer(promptId: PromptId, answer: string): Promise<void> {
    const id = this.id
    if (!id || !this.active || this.store.getSnapshot().busy) return
    await this.mutate(() => this.remote.answer(id, promptId, answer))
  }

  /** Cancel only the handle this controller owns. */
  async cancel(): Promise<void> {
    const id = this.id
    if (!id || !this.active || this.store.getSnapshot().busy) return
    await this.mutate(() => this.remote.cancel(id))
  }

  /** Dismiss a terminal result without implying credential deletion or issuer revocation. */
  dismiss(): void {
    if (this.store.getSnapshot().attempt?.status === 'running') return
    this.id = undefined
    ++this.generation
    this.store.update((state) => { delete state.attempt; delete state.label; state.error = false })
  }

  /** Remove UI state and timers. Remote unmount owns pending carrier cancellation. */
  dispose(): void { this.close(); this.disposed = true }

  private isOpen(): boolean { return this.active && !this.disposed }

  private isCurrent(generation: number): boolean { return generation === this.generation && this.isOpen() }

  private close(): void {
    this.active = false
    ++this.generation
    clearTimeout(this.timer)
    const id = this.id
    this.id = undefined
    this.store.set({ flows: [], busy: false, error: false })
    if (id) void this.remote.cancel(id).catch(() => { /* Lease expiry handles a lost unload request. */ })
  }

  private async mutate(operation: () => Promise<RemoteResult<void>>): Promise<void> {
    const generation = ++this.generation
    this.store.update((state) => {
      state.busy = true
      state.error = false
      if (state.attempt) delete state.attempt.prompt
    })
    try {
      const result = await operation()
      if (generation === this.generation && !result.ok) this.store.update((state) => { state.error = true })
    } catch (_error) {
      if (generation === this.generation) this.store.update((state) => { state.error = true })
    } finally {
      if (generation === this.generation) {
        this.store.update((state) => { state.busy = false })
        void this.refresh()
      }
    }
  }
}
