/** Generic footer UI: provider text is rendered as text and input is local to a keyed prompt. */
import { useEffect, useState } from 'react'
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings-models/client'
import type { AuthorizationEntry } from '@deepseek-ai/dsh-authorization/types'
import type { PromptId, PromptView } from '@deepseek-ai/dsh-web-authorization/types'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { State } from './controller.ts'
import type { CopyKey } from './locales.ts'

/** Plain callbacks and framework-bound observable input for the footer. */
export interface FooterInjected {
  hooks: { snapshot: SnapshotStore<State> }
  open: () => () => void
  refresh: () => Promise<void>
  begin: (flow: AuthorizationEntry, method: string) => Promise<void>
  answer: (promptId: PromptId, answer: string) => Promise<void>
  cancel: () => Promise<void>
  dismiss: () => void
  t: (key: CopyKey) => string
}

export type FooterProps = PropsRuntime<'settings.models.footer'> & InjectFace<FooterInjected>

function Prompt({ prompt, answer, t }: {
  prompt: PromptView
  answer: FooterInjected['answer']
  t: FooterInjected['t']
}) {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  return <form onSubmit={(event) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    const input = value
    setValue('')
    void answer(prompt.promptId, input)
  }}>
    <label>
      <span>{prompt.message}</span>
      {prompt.kind === 'select'
        ? <select value={value} onChange={event => setValue(event.target.value)} required disabled={submitting}>
          <option value="" disabled>{prompt.message}</option>
          {prompt.options.map(option => <option key={option.id} value={option.id}>{option.label}{option.description ? ` — ${option.description}` : ''}</option>)}
        </select>
        : <Input type={prompt.kind === 'secret' ? 'password' : 'text'} value={value}
          autoComplete="off" spellCheck={false} placeholder={prompt.placeholder}
          onChange={event => setValue(event.target.value)} disabled={submitting} />}
    </label>
    <Button type="submit" disabled={submitting}>{t('submit')}</Button>
  </form>
}

/** @param props - slot runtime and injected callbacks. @returns the generic authorization directory. */
export function AuthorizationFooter(props: FooterProps) {
  const state = props.useSnapshot(snapshot => snapshot)
  useEffect(() => props.open(), [props.open])
  const attempt = state.attempt
  return <section aria-label={props.t('title')}>
    <h3>{props.t('title')}</h3>
    <p>{props.t('intro')}</p>
    <p>{props.t('reload')}</p>
    {state.error && <p role="alert">{props.t('error')}</p>}
    <Button onClick={() => { void props.refresh() }}>{props.t('refresh')}</Button>
    {!state.flows.length && <p>{props.t('empty')}</p>}
    <ul>{state.flows.map(flow => <li key={flow.key}>
      <span>{flow.label}</span>
      {flow.methods.map(method => <Button key={method.id} disabled={flow.inFlight || state.busy || state.label !== undefined}
        onClick={() => { void props.begin(flow, method.id) }}>{method.label}</Button>)}
    </li>)}</ul>
    {state.label && <h4>{state.label}</h4>}
    {state.busy && <p role="status">{props.t('busy')}</p>}
    {attempt && <>
      <p role="status">{props.t(attempt.status)}</p>
      <ul>{attempt.notices.map((notice, index) => <li key={index}>
        <span>{notice.message}</span>
        {notice.url && <a href={notice.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{props.t('openLink')}</a>}
        {notice.code && <p>{props.t('code')}: <code>{notice.code}</code></p>}
      </li>)}</ul>
      {attempt.prompt && !state.busy && <Prompt key={attempt.prompt.promptId} prompt={attempt.prompt} answer={props.answer} t={props.t} />}
      {attempt.status === 'running'
        ? <Button disabled={state.busy} onClick={() => { void props.cancel() }}>{props.t('cancel')}</Button>
        : <Button onClick={props.dismiss}>{props.t('dismiss')}</Button>}
    </>}
  </section>
}
