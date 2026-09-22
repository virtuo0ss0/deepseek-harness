/** Remote companion for provider-owned authorization flows. Credentials never enter this service. */
import { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-authorization'
import type { AuthorizationEntry } from '@deepseek-ai/dsh-authorization/types'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { WebAuthorizationAttempts } from './attempts.ts'
import type { AttemptId, AttemptView, BeginRequest, Config, PromptId } from './types.ts'

export type * from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    webAuthorization: WebAuthorizationService
  }
}

/** Current Gateway transport; attempt state belongs to the service's Cordis scope. */
export class WebAuthorizationService extends TypertRemoteService {
  static inject = ['authorization']
  static Config: Schema<Config> = Schema.object({ leaseMs: Schema.number().step(1).min(1000).max(3600000).default(60000) })
  private readonly attempts: WebAuthorizationAttempts

  constructor(ctx: Context, config: Config) {
    super(ctx, 'webAuthorization')
    this.attempts = new WebAuthorizationAttempts(ctx.authorization, config)
    ctx.effect(() => () => this.attempts.dispose(), 'web-authorization: attempts')
  }

  /**
   * Read the authorization directory.
   * @returns all registered flows, without other clients' attempt identities.
   */
  @Remote
  list(): AuthorizationEntry[] { return this.attempts.list() }

  /**
   * Begin or recover an owned attempt.
   * @param request - random client capability and registered flow selection.
   * @returns initial state.
   */
  @Remote
  begin(request: BeginRequest): AttemptView { return this.attempts.begin(request) }

  /**
   * Observe current state and renew a live lease.
   * @param attemptId - private capability.
   * @returns redacted current state.
   */
  @Remote
  status(attemptId: AttemptId): AttemptView { return this.attempts.status(attemptId) }

  /**
   * Answer a currently pending question; the answer is not echoed.
   * @param attemptId - private capability.
   * @param promptId - current question identity.
   * @param answer - transient input, never retained in a response.
   */
  @Remote
  answer(attemptId: AttemptId, promptId: PromptId, answer: string): void {
    this.attempts.answer(attemptId, promptId, answer)
  }

  /**
   * Withdraw only the identified attempt.
   * @param attemptId - exact attempt to withdraw; cannot address a newer attempt by key.
   */
  @Remote
  cancel(attemptId: AttemptId): void { this.attempts.cancel(attemptId) }
}

export default WebAuthorizationService
