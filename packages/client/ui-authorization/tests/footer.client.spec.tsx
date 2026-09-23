// @vitest-environment jsdom
/** Generic prompt presentation and component-owned input disposal. */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { AttemptId, PromptId } from '@deepseek-ai/dsh-web-authorization/types'
import { AuthorizationFooter, type FooterProps } from '../src/client/AuthorizationFooter.tsx'
import type { State } from '../src/client/controller.ts'
import { en } from '../src/client/locales.ts'

afterEach(cleanup)

const unusedHook = (): never => { throw new Error('Footer must not consume unrelated global state') }
const standard = {
  usePanelInfo: unusedHook, useSessions: unusedHook, useSessionPendingInteraction: unusedHook,
  useWorkspaces: unusedHook, useResource: unusedHook,
}

it('masks and clears secret input when prompt identity changes, and disposes observation', () => {
  const store = createSnapshotStore<State>({ flows: [], busy: false, error: false, attempt: {
    attemptId: 'attempt' as AttemptId, status: 'running', notices: [{ message: '<script>not markup</script>' }],
    prompt: { promptId: 'first' as PromptId, kind: 'secret', message: 'Private code' },
  } })
  const close = vi.fn()
  const answer = vi.fn(async () => {})
  const props: FooterProps = {
    ...standard,
    useSnapshot: bindSnapshotSelector(store), open: () => close,
    refresh: async () => {}, begin: async () => {}, answer,
    cancel: async () => {}, dismiss: () => {}, t: key => en[key],
  }
  const rendered = render(<AuthorizationFooter {...props} />)
  const input = screen.getByLabelText<HTMLInputElement>('Private code')
  expect(input.type).toBe('password')
  fireEvent.change(input, { target: { value: 'never-retain' } })
  expect(rendered.container.querySelector('script')).toBeNull()
  act(() => { store.update((state) => {
    state.attempt!.prompt = { promptId: 'second' as PromptId, kind: 'text', message: 'Next code' }
  }) })
  expect(screen.getByLabelText<HTMLInputElement>('Next code').value).toBe('')
  expect(JSON.stringify(store.getSnapshot())).not.toContain('never-retain')
  fireEvent.change(screen.getByLabelText('Next code'), { target: { value: 'public-answer' } })
  fireEvent.click(screen.getByText(en.submit))
  expect(answer).toHaveBeenCalledWith('second', 'public-answer')
  expect(screen.getByLabelText<HTMLInputElement>('Next code').value).toBe('')
  rendered.unmount()
  expect(close).toHaveBeenCalledOnce()
})

it('renders select choices and safe link attributes with a stable user-output snapshot', () => {
  const store = createSnapshotStore<State>({ flows: [], busy: false, error: false, label: 'Example', attempt: {
    attemptId: 'attempt' as AttemptId, status: 'running', notices: [{ message: 'Continue in browser', url: 'https://example.com/authorize', code: 'ABCD' }],
    prompt: { promptId: 'choice' as PromptId, kind: 'select', message: 'Choose environment',
      options: [{ id: '', label: 'Test' }] },
  } })
  const answer = vi.fn(async () => {})
  const props: FooterProps = {
    ...standard,
    useSnapshot: bindSnapshotSelector(store), open: () => () => {}, refresh: async () => {},
    begin: async () => {}, answer, cancel: async () => {}, dismiss: () => {}, t: key => en[key],
  }
  const rendered = render(<AuthorizationFooter {...props} />)
  expect(rendered.container.textContent).toMatchSnapshot()
  const link = screen.getByRole('link')
  expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  expect(link.getAttribute('referrerpolicy')).toBe('no-referrer')
  fireEvent.change(screen.getByLabelText('Choose environment'), { target: { value: '0' } })
  fireEvent.click(screen.getByText(en.submit))
  expect(answer).toHaveBeenCalledWith('choice', '')
})
