/** Browser-safe, value-free views of one authorization conversation. */
import type { Branded } from '@deepseek-ai/dsh-brand'
import type { CredentialKey } from '@deepseek-ai/dsh-credentials/types'
import type { AuthorizationNotice, AuthorizationPromptOption } from '@deepseek-ai/dsh-authorization/types'
import type {} from '@deepseek-ai/dsh-typert-protocol'

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    'authorization/rejected': { reason: string }
  }
}

/** Random browser-owned capability, never published in the flow directory. */
export type AttemptId = Branded<'WebAuthorizationAttemptId'>
/** Host-issued identity of one question within one attempt. */
export type PromptId = Branded<'WebAuthorizationPromptId'>

/** Start identity is retained in memory for recovery after an ambiguous reply. */
export interface BeginRequest {
  attemptId: AttemptId
  key: CredentialKey
  method: string
}

/** Prompt data excludes signals, callbacks, and answers. */
export type PromptView = { promptId: PromptId } & (
  { kind: 'text' | 'secret'; message: string; placeholder?: string }
  | { kind: 'select'; message: string; options: AuthorizationPromptOption[] }
)

/** A detached snapshot. Failure never includes a provider exception. */
export interface AttemptView {
  attemptId: AttemptId
  status: 'running' | 'authorized' | 'cancelled' | 'failed'
  notices: AuthorizationNotice[]
  prompt?: PromptView
}

/** Deployment-specific grace period for browser loss and terminal retention. */
export interface Config {
  /** Abandoned attempts expire after this many milliseconds without observation. */
  leaseMs: number
}
