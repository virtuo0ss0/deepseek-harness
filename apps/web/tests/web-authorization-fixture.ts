/** Synthetic authorization flows for the built Web browser acceptance lane. */
import { fileURLToPath } from 'node:url'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { credentialKey } from '@deepseek-ai/dsh-credentials'
import type { AuthorizationSession } from '@deepseek-ai/dsh-authorization'
import { launchWebScaffold, type WebScaffold } from './scaffold.ts'
import { newEnglishPage, openSettings } from './support.ts'

/** Only fixture-owned keys are writable by these flows. */
export const PRIMARY_KEY = credentialKey('web-authorization-smoke', 'primary')
export const SECONDARY_KEY = credentialKey('web-authorization-smoke', 'secondary')
export const HOST_MARKER = 'host-only-web-authorization-smoke'
export const LEASE_MS = 15_000

const INSTALL_ANCHORS = [
  fileURLToPath(new URL('../../../packages/credentials/web-authorization/package.json', import.meta.url)),
  fileURLToPath(new URL('../../../packages/client/ui-authorization/package.json', import.meta.url)),
]

export interface AuthorizationWebFixture {
  scaffold: WebScaffold
  browser: Browser
  page: Page
  hostEntry: string
  uiEntry: string
  runs: { primary: number; secondary: number }
  answers: { text?: string; secretMatched: boolean; selection?: string }
  clientErrors: string[]
  provider: Awaited<ReturnType<WebScaffold['ctx']['plugin']>>
  openModels(page?: Page): Promise<void>
  newPage(): Promise<Page>
  close(): Promise<void>
}

/** Mount public companions and scope-owned synthetic flows around the shipped Web tree. */
export async function authorizationWebFixture(): Promise<AuthorizationWebFixture> {
  const scaffold = await launchWebScaffold({ extraInstallAnchors: INSTALL_ANCHORS })
  let browser: Browser | undefined
  let closed = false
  try {
    const runs = { primary: 0, secondary: 0 }
    const answers: AuthorizationWebFixture['answers'] = { secretMatched: false }
    const provider = await scaffold.ctx.plugin({ inject: ['authorization'], apply(ctx) {
      for (const [key, which] of [[PRIMARY_KEY, 'primary'], [SECONDARY_KEY, 'secondary']] as const) {
        ctx.effect(() => ctx.authorization.registerFlow({
          key, label: `Synthetic ${which}`,
          methods: [
            { id: 'interactive', label: 'Interactive' },
            { id: 'wait', label: 'Wait' },
            { id: 'admitted', label: 'Admitted write' },
          ],
          async run(session: AuthorizationSession) {
            runs[which]++
            if (session.method === 'wait') {
              await session.prompt({ kind: 'text', message: `Waiting ${which}` })
              await session.commit({ kind: 'grant', payload: { marker: HOST_MARKER } })
              return
            }
            if (session.method === 'admitted') {
              session.notify({ message: 'Admitting a host write' })
              await session.commit({ kind: 'grant', payload: { marker: HOST_MARKER } })
              return
            }
            for (let index = 0; index < 20; index++) session.notify({ message: `Progress ${index}` })
            answers.text = await session.prompt({ kind: 'text', message: 'Synthetic name' })
            answers.secretMatched = (await session.prompt({ kind: 'secret', message: 'Synthetic secret' })) === 'dummy-secret-smoke'
            answers.selection = await session.prompt({ kind: 'select', message: 'Synthetic choice', options: [
              { id: '', label: 'Empty identifier' }, { id: 'other', label: 'Other choice' },
            ] })
            await session.commit({ kind: 'grant', payload: { marker: HOST_MARKER } })
          },
        }))
      }
    } })
    const hostEntry = await scaffold.ctx.loader.create({
      name: '@deepseek-ai/dsh-web-authorization', config: { leaseMs: LEASE_MS },
    })
    const uiEntry = await scaffold.ctx.loader.create({
      name: '@deepseek-ai/dsh-client-ui-authorization', config: { pollMs: 250 },
    })
    await scaffold.ctx.loader.await()
    browser = await chromium.launch()
    const page = await newEnglishPage(browser)
    const clientErrors: string[] = []
    page.on('console', (message) => { if (message.type() === 'error') clientErrors.push(message.text()) })
    page.on('pageerror', (error) => { clientErrors.push(error.message) })
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
    return {
      scaffold, browser, page, hostEntry, uiEntry, runs, answers, clientErrors, provider,
      async openModels(target = page) {
        await openSettings(target, 'en')
        const dialog = target.getByRole('dialog', { name: 'Settings' })
        await dialog.getByRole('button', { name: 'Models', exact: true }).click()
        const footer = dialog.getByRole('region', { name: 'Provider authorization' })
        await footer.waitFor({ timeout: 20_000 })
      },
      async newPage() {
        const other = await newEnglishPage(browser!)
        await other.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
        return other
      },
      async close() {
        if (closed) return
        closed = true
        try { await browser?.close() } finally {
          try { await provider.dispose() } finally { await scaffold.close() }
        }
      },
    }
  } catch (error) {
    await browser?.close()
    await scaffold.close()
    throw error
  }
}
