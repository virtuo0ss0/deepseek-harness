/** Real Web browser, Remote/Gateway and synthetic authorization flow acceptance. */
import { randomUUID } from 'node:crypto'
import type { Page, WebSocketRoute } from 'playwright'
import { expect, it, vi } from 'vitest'
import { authorizationWebFixture, HOST_MARKER, LEASE_MS, PRIMARY_KEY, SECONDARY_KEY } from './web-authorization-fixture.ts'
import { newEnglishPage, saveFailureShot } from './support.ts'

it('lists the synthetic directory in the deployed Models footer', async () => {
  const fixture = await authorizationWebFixture()
  try {
    expect(fixture.scaffold.ctx.loader.resolve(fixture.hostEntry).fiber?.state).toBe(2)
    expect(fixture.scaffold.ctx.loader.resolve(fixture.uiEntry).fiber?.state).toBe(2)
    expect(fixture.scaffold.ctx.clientModules.graph().entries.some(
      row => row.id === '@deepseek-ai/dsh-client-ui-authorization',
    )).toBe(true)
    expect(await fixture.page.evaluate(() => (
      globalThis as { __DSH_WEB_AUTHORIZATION_CONFIG__?: unknown }
    ).__DSH_WEB_AUTHORIZATION_CONFIG__)).toEqual({ pollMs: 250 })
    const directoryResponse = fixture.page.waitForResponse(response =>
      new URL(response.url()).pathname === '/api/webAuthorization/list' && response.status() === 200,
    )
    await fixture.openModels()
    const response = await directoryResponse
    expect(JSON.stringify(await response.json())).toContain('Synthetic primary')
    const footer = fixture.page.getByRole('region', { name: 'Provider authorization' })
    await footer.getByText('Synthetic primary').waitFor()
    await footer.getByText('Synthetic secondary').waitFor()
    expect(await footer.getByRole('button', { name: 'Interactive' }).count()).toBe(2)
    expect(fixture.clientErrors).toEqual([])
    expect(fixture.scaffold.ctx.authorization.describe(PRIMARY_KEY)?.inFlight).toBe(false)
    expect(fixture.scaffold.ctx.authorization.describe(SECONDARY_KEY)?.inFlight).toBe(false)
  } catch (error) {
    await saveFailureShot(fixture.page, 'web-authorization-directory').catch(() => {})
    throw error
  } finally { await fixture.close() }
})

it('completes an interaction with bounded notices and transient text, secret and select answers', async () => {
  const fixture = await authorizationWebFixture()
  const secret = 'dummy-secret-smoke'
  const authorizationResponses: string[] = []
  fixture.page.on('response', (response) => {
    if (new URL(response.url()).pathname.startsWith('/api/webAuthorization/')) {
      void response.text().then((body) => { authorizationResponses.push(body) })
    }
  })
  try {
    await fixture.openModels()
    const footer = fixture.page.getByRole('region', { name: 'Provider authorization' })
    await footer.getByText('Synthetic primary').waitFor()
    await footer.getByRole('button', { name: 'Interactive' }).first().click()
    await footer.getByLabel('Synthetic name').waitFor()
    expect(fixture.runs.primary).toBe(1)
    expect(await footer.getByText(/^Progress \d+$/u).count()).toBe(16)
    expect(await footer.getByText('Progress 19').isVisible()).toBe(true)
    expect(await footer.getByText('Progress 0').count()).toBe(0)
    await footer.getByLabel('Synthetic name').fill('Ada')
    await footer.getByRole('button', { name: 'Submit' }).click()
    const secretInput = footer.getByLabel('Synthetic secret')
    await secretInput.waitFor()
    expect(await secretInput.getAttribute('type')).toBe('password')
    expect(await secretInput.getAttribute('autocomplete')).toBe('off')
    await secretInput.fill(secret)
    await footer.getByRole('button', { name: 'Submit' }).click()
    await footer.getByLabel('Synthetic choice').waitFor()
    expect(await footer.locator('input').evaluateAll(inputs => inputs.map(
      input => (input as HTMLInputElement).value,
    ))).not.toContain(secret)
    await footer.getByLabel('Synthetic choice').selectOption({ label: 'Empty identifier' })
    await footer.getByRole('button', { name: 'Submit' }).click()
    await footer.getByText('Authorization completed').waitFor()
    expect(fixture.answers).toEqual({ text: 'Ada', secretMatched: true, selection: '' })
    expect(await fixture.scaffold.ctx.credentials.readRecord(PRIMARY_KEY)).toEqual({
      kind: 'grant', payload: { marker: HOST_MARKER },
    })
    await expect.poll(() => fixture.scaffold.ctx.authorization.describe(PRIMARY_KEY)?.inFlight).toBe(false)
    expect(await footer.getByText(/^Progress \d+$/u).count()).toBe(0)
    expect(await footer.locator('form').count()).toBe(0)
    expect(await fixture.page.evaluate(() => JSON.stringify({
      local: Object.entries(localStorage), session: Object.entries(sessionStorage),
    }))).not.toContain(secret)
    expect(authorizationResponses.join('\n')).not.toContain(secret)
    expect(authorizationResponses.join('\n')).not.toContain(HOST_MARKER)
    await footer.getByRole('button', { name: 'Done' }).click()
    expect(await footer.textContent()).not.toContain(secret)
    expect(fixture.clientErrors).toEqual([])
  } catch (error) {
    await saveFailureShot(fixture.page, 'web-authorization-interaction').catch(() => {})
    throw error
  } finally { await fixture.close() }
}, 90_000)

type AttemptReply = { result: { ok: true; value: { attemptId: string; prompt?: { promptId: string } } } }

/** Capture only allowlisted attempt and prompt identities from real browser responses. */
function observeAttempts(page: Page): Map<string, string> {
  const prompts = new Map<string, string>()
  page.on('response', (response) => {
    if (!/^\/api\/webAuthorization\/(begin|status)$/u.test(new URL(response.url()).pathname)) return
    void response.json().then((body: AttemptReply) => {
      if (body.result.ok && body.result.value.prompt) {
        prompts.set(body.result.value.attemptId, body.result.value.prompt.promptId)
      }
    }).catch(() => {})
  })
  return prompts
}

/** The normal begin stays UI-driven; the response supplies only its test capability. */
async function beginWaiting(page: Page, label: string): Promise<string> {
  const response = page.waitForResponse(reply => new URL(reply.url()).pathname === '/api/webAuthorization/begin')
  const row = page.getByRole('region', { name: 'Provider authorization' })
    .locator('ul').first().getByRole('listitem').filter({ hasText: label })
  await row.getByRole('button', { name: 'Wait' }).click()
  const body = await (await response).json() as AttemptReply
  expect(body.result.ok).toBe(true)
  await page.getByLabel(`Waiting ${label.split(' ')[1]}`).waitFor()
  return body.result.value.attemptId
}

it('cancels only the owned attempt and rejects stale cancellation and prompt identities', async () => {
  const fixture = await authorizationWebFixture()
  let second: Page | undefined
  try {
    second = await fixture.newPage()
    const firstPrompts = observeAttempts(fixture.page)
    const secondPrompts = observeAttempts(second)
    await Promise.all([fixture.openModels(), fixture.openModels(second)])
    const oldId = await beginWaiting(fixture.page, 'Synthetic primary')
    const secondId = await beginWaiting(second, 'Synthetic secondary')
    await expect.poll(() => firstPrompts.get(oldId)).toBeTypeOf('string')
    await expect.poll(() => secondPrompts.get(secondId)).toBeTypeOf('string')
    const oldPromptId = firstPrompts.get(oldId)!
    const oldCancel = fixture.page.waitForResponse(reply =>
      new URL(reply.url()).pathname === '/api/webAuthorization/cancel')
    await fixture.page.getByRole('region', { name: 'Provider authorization' })
      .getByRole('button', { name: 'Cancel authorization' }).click()
    const cancelEnvelope = (await oldCancel).request().postDataJSON() as {
      type: string
      method: string
      payload: { args: { attemptId: string } }
    }
    expect(cancelEnvelope.payload.args.attemptId).toBe(oldId)
    await expect.poll(() => fixture.scaffold.ctx.authorization.describe(PRIMARY_KEY)?.inFlight).toBe(false)
    expect(fixture.scaffold.ctx.authorization.describe(SECONDARY_KEY)?.inFlight).toBe(true)
    expect(await second.getByLabel('Waiting secondary').isVisible()).toBe(true)
    const firstFooter = fixture.page.getByRole('region', { name: 'Provider authorization' })
    await firstFooter.getByRole('button', { name: 'Done' }).click()
    await firstFooter.getByRole('button', { name: 'Refresh' }).click()
    await expect.poll(() => firstFooter.getByRole('button', { name: 'Wait' }).first().isEnabled()).toBe(true)
    const replacementId = await beginWaiting(fixture.page, 'Synthetic primary')
    expect(replacementId).not.toBe(oldId)
    await expect.poll(() => firstPrompts.get(replacementId)).toBeTypeOf('string')
    expect(firstPrompts.get(replacementId)).not.toBe(oldPromptId)
    const replay = async (method: 'cancel' | 'answer', args: Record<string, unknown>) => {
      const response = await fixture.scaffold.hostFetch(`/api/webAuthorization/${method}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...cancelEnvelope, rpcId: randomUUID(), method: `webAuthorization/${method}`, payload: { args } }),
      })
      return response.json() as Promise<{ result: { ok: boolean; error?: { details?: { reason?: string } } } }>
    }
    expect((await replay('cancel', { attemptId: oldId })).result).toMatchObject({
      ok: false, error: { details: { reason: 'stale-attempt' } },
    })
    expect((await replay('answer', { attemptId: replacementId, promptId: oldPromptId, answer: 'stale' })).result)
      .toMatchObject({ ok: false, error: { details: { reason: 'stale-prompt' } } })
    expect(fixture.scaffold.ctx.authorization.describe(PRIMARY_KEY)?.inFlight).toBe(true)
    expect(fixture.scaffold.ctx.authorization.describe(SECONDARY_KEY)?.inFlight).toBe(true)
    expect(await firstFooter.getByLabel('Waiting primary').isVisible()).toBe(true)
    expect(await second.getByLabel('Waiting secondary').isVisible()).toBe(true)
  } catch (error) {
    await saveFailureShot(fixture.page, 'web-authorization-owned-cancellation').catch(() => {})
    throw error
  } finally { await fixture.close() }
}, 90_000)

it('keeps the same prompt and attempt through a brief HTTP and WebSocket interruption', async () => {
  const fixture = await authorizationWebFixture()
  const page = await newEnglishPage(fixture.browser)
  const sockets: { client: WebSocketRoute; server: WebSocketRoute }[] = []
  let navigationCount = 0
  let failedPolls = 0
  let recoveredPolls = 0
  let maxInFlight = 0
  let inFlight = 0
  try {
    await page.routeWebSocket('**/api/remote.mux', (client) => {
      const server = client.connectToServer()
      sockets.push({ client, server })
      client.onMessage((message) => { server.send(message) })
      server.onMessage((message) => { client.send(message) })
    })
    const prompts = observeAttempts(page)
    await page.goto(fixture.scaffold.authenticatedUrl, { waitUntil: 'load' })
    await fixture.openModels(page)
    const id = await beginWaiting(page, 'Synthetic primary')
    await expect.poll(() => prompts.get(id)).toBeTypeOf('string')
    const promptId = prompts.get(id)
    await expect.poll(() => sockets.length).toBeGreaterThan(0)
    page.on('framenavigated', () => { navigationCount++ })
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/webAuthorization/status') {
        inFlight++
        maxInFlight = Math.max(inFlight, maxInFlight)
      }
    })
    const finish = (request: { url(): string }) => {
      if (new URL(request.url()).pathname === '/api/webAuthorization/status') inFlight--
    }
    page.on('requestfinished', finish)
    page.on('requestfailed', (request) => {
      if (new URL(request.url()).pathname === '/api/webAuthorization/status') failedPolls++
      finish(request)
    })
    const statusPath = '**/api/webAuthorization/status'
    await page.route(statusPath, route => route.abort('internetdisconnected'))
    const active = sockets.at(-1)!
    await Promise.all([
      active.client.close({ code: 1012, reason: 'test connection loss' }),
      active.server.close({ code: 1012, reason: 'test connection loss' }),
    ])
    await expect.poll(() => failedPolls, { timeout: 5_000 }).toBeGreaterThan(0)
    await page.unroute(statusPath)
    page.on('response', (response) => {
      if (new URL(response.url()).pathname !== '/api/webAuthorization/status') return
      void response.json().then((body: AttemptReply) => {
        if (body.result.ok && body.result.value.attemptId === id
          && body.result.value.prompt?.promptId === promptId) recoveredPolls++
      }).catch(() => {})
    })
    await expect.poll(() => recoveredPolls, { timeout: 10_000 }).toBeGreaterThan(0)
    expect(await page.getByLabel('Waiting primary').isVisible()).toBe(true)
    await page.getByLabel('Waiting primary').fill('after reconnect')
    await page.getByRole('region', { name: 'Provider authorization' }).getByRole('button', { name: 'Submit' }).click()
    await page.getByText('Authorization completed').waitFor()
    expect(fixture.runs.primary).toBe(1)
    expect(navigationCount).toBe(0)
    expect(maxInFlight).toBeLessThanOrEqual(1)
  } catch (error) {
    await saveFailureShot(page, 'web-authorization-reconnect').catch(() => {})
    throw error
  } finally { await fixture.close() }
}, 90_000)

it('forgets a reloaded page capability and expires its abandoned browser lease', async () => {
  const fixture = await authorizationWebFixture()
  try {
    const prompts = observeAttempts(fixture.page)
    await fixture.openModels()
    const oldId = await beginWaiting(fixture.page, 'Synthetic primary')
    await expect.poll(() => prompts.get(oldId)).toBeTypeOf('string')
    await fixture.page.route('**/api/webAuthorization/cancel', (route) => {
      const envelope = route.request().postDataJSON() as { payload?: { args?: { attemptId?: string } } }
      if (envelope.payload?.args?.attemptId === oldId) {
        void route.abort('internetdisconnected')
      } else void route.continue()
    })
    await fixture.page.reload({ waitUntil: 'load' })
    await fixture.openModels()
    const footer = fixture.page.getByRole('region', { name: 'Provider authorization' })
    expect(await footer.getByRole('button', { name: 'Cancel authorization' }).count()).toBe(0)
    expect(await footer.locator('form').count()).toBe(0)
    expect(await fixture.page.evaluate(() => JSON.stringify({
      local: Object.entries(localStorage), session: Object.entries(sessionStorage),
    }))).not.toContain(oldId)
    // describe() observes the host lock without extending the browser lease.
    await expect.poll(() => fixture.scaffold.ctx.authorization.describe(PRIMARY_KEY)?.inFlight,
      { timeout: LEASE_MS + 8_000 }).toBe(false)
    const expired = await fixture.scaffold.hostFetch('/api/webAuthorization/status', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: randomUUID(),
        method: 'webAuthorization/status', payload: { args: { attemptId: oldId } } }),
    })
    expect(await expired.json()).toMatchObject({ result: { ok: false,
      error: { details: { reason: 'unknown-attempt' } } } })
    await footer.getByRole('button', { name: 'Refresh' }).click()
    const replacementId = await beginWaiting(fixture.page, 'Synthetic primary')
    expect(replacementId).not.toBe(oldId)
    expect(fixture.runs.primary).toBe(2)
  } catch (error) {
    await saveFailureShot(fixture.page, 'web-authorization-reload-lease').catch(() => {})
    throw error
  } finally { await fixture.close() }
}, 90_000)

it.each(['panel', 'browser', 'ui plugin', 'provider'] as const)(
  'cleans owned authorization state on %s disposal', async (source) => {
    const fixture = await authorizationWebFixture()
    try {
      await fixture.openModels()
      const footer = fixture.page.getByRole('region', { name: 'Provider authorization' })
      await beginWaiting(fixture.page, 'Synthetic primary')
      expect(fixture.scaffold.ctx.authorization.describe(PRIMARY_KEY)?.inFlight).toBe(true)
      if (source === 'panel') {
        await fixture.page.getByRole('dialog', { name: 'Settings' })
          .getByRole('button', { name: 'Close' }).click()
        await expect.poll(() => fixture.scaffold.ctx.authorization.describe(PRIMARY_KEY)?.inFlight,
          { timeout: LEASE_MS + 8_000 }).toBe(false)
        await fixture.openModels()
        expect(await footer.getByRole('button', { name: 'Cancel authorization' }).count()).toBe(0)
        expect(await footer.getByLabel('Waiting primary').count()).toBe(0)
      } else if (source === 'browser') {
        await fixture.page.context().close()
        await expect.poll(() => fixture.scaffold.ctx.authorization.describe(PRIMARY_KEY)?.inFlight,
          { timeout: LEASE_MS + 8_000 }).toBe(false)
      } else if (source === 'ui plugin') {
        let statusRequests = 0
        fixture.page.on('request', (request) => {
          if (new URL(request.url()).pathname === '/api/webAuthorization/status') statusRequests++
        })
        fixture.scaffold.ctx.loader.remove(fixture.uiEntry)
        await expect.poll(() => footer.count()).toBe(0)
        await expect.poll(() => fixture.scaffold.ctx.authorization.describe(PRIMARY_KEY)?.inFlight,
          { timeout: LEASE_MS + 8_000 }).toBe(false)
        const baseline = statusRequests
        // Allow a request already in flight, then assert the unmounted timer stays silent.
        await fixture.page.waitForTimeout(750)
        expect(statusRequests).toBeLessThanOrEqual(baseline + 1)
        await fixture.scaffold.ctx.loader.create({
          name: '@deepseek-ai/dsh-client-ui-authorization', config: { pollMs: 250 },
        })
        await fixture.scaffold.ctx.loader.await()
        await expect.poll(() => footer.count()).toBe(1)
        expect(await footer.getByLabel('Waiting primary').count()).toBe(0)
      } else {
        await fixture.provider.dispose()
        await expect.poll(() => fixture.scaffold.ctx.authorization.describe(PRIMARY_KEY)).toBeUndefined()
        await footer.getByRole('button', { name: 'Refresh' }).click()
        await expect.poll(() => footer.locator('ul').first().getByRole('listitem')
          .filter({ hasText: 'Synthetic primary' }).count()).toBe(0)
        expect(await footer.getByLabel('Waiting primary').count()).toBe(0)
      }
    } catch (error) {
      if (!fixture.page.isClosed()) await saveFailureShot(fixture.page, `web-authorization-disposal-${source}`).catch(() => {})
      throw error
    } finally { await fixture.close() }
  }, 90_000,
)

it.each(['companion', 'scaffold'] as const)(
  'waits for an admitted credential write on %s disposal after browser lease expiry', async (source) => {
    const fixture = await authorizationWebFixture()
    const admitted = Promise.withResolvers<undefined>()
    const release = Promise.withResolvers<undefined>()
    const credentials = fixture.scaffold.ctx.credentials
    const original = credentials.modifyRecord.bind(credentials)
    let persistedMarker: string | undefined
    let writeCompleted = false
    let writeError: string | undefined
    let scaffoldDisposalStarted = false
    const spy = vi.spyOn(credentials, 'modifyRecord').mockImplementation(async (key, mutate) => {
      try {
        // Admission is inside the real provider's exclusive mutation, not at
        // the call site. The provider must own this operation during teardown.
        const result = await original(key, async (current) => {
          const next = await mutate(current)
          admitted.resolve(undefined)
          await release.promise
          return next
        })
        writeCompleted = true
        const stored = await credentials.readRecord(key)
        if (stored?.kind === 'grant') persistedMarker = (stored.payload as { marker?: string }).marker
        return result
      } catch (error) {
        writeError = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
        throw error
      }
    })
    try {
      await fixture.openModels()
      const beginResponse = fixture.page.waitForResponse(response =>
        new URL(response.url()).pathname === '/api/webAuthorization/begin')
      await fixture.page.getByRole('region', { name: 'Provider authorization' })
        .locator('ul').first().getByRole('listitem').filter({ hasText: 'Synthetic primary' })
        .getByRole('button', { name: 'Admitted write' }).click()
      const beginBody = await (await beginResponse).json() as AttemptReply
      const id = beginBody.result.value.attemptId
      await admitted.promise
      expect(fixture.scaffold.ctx.authorization.describe(PRIMARY_KEY)?.inFlight).toBe(true)
      await fixture.page.context().close()
      // No status request is made while the browser lease runs out.
      await new Promise<void>(resolve => setTimeout(resolve, LEASE_MS + 750))
      const expired = await fixture.scaffold.hostFetch('/api/webAuthorization/status', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'client-request', rpcId: randomUUID(),
          method: 'webAuthorization/status', payload: { args: { attemptId: id } } }),
      })
      expect(await expired.json()).toMatchObject({ result: { ok: false,
        error: { details: { reason: 'unknown-attempt' } } } })
      expect(fixture.scaffold.ctx.authorization.describe(PRIMARY_KEY)?.inFlight).toBe(true)
      let disposed = false
      let disposal: Promise<void>
      if (source === 'companion') {
        const fiber = fixture.scaffold.ctx.loader.resolve(fixture.hostEntry).fiber!
        fixture.scaffold.ctx.loader.remove(fixture.hostEntry)
        await expect.poll(() => fiber.inertia !== undefined).toBe(true)
        disposal = fiber.inertia!.then(() => { disposed = true })
      } else {
        scaffoldDisposalStarted = true
        disposal = fixture.scaffold.close().then(() => { disposed = true })
      }
      await new Promise<void>(resolve => setImmediate(resolve))
      expect(disposed).toBe(false)
      release.resolve(undefined)
      await disposal
      expect(disposed).toBe(true)
      expect({ writeCompleted, writeError, persistedMarker }).toEqual({
        writeCompleted: true, writeError: undefined, persistedMarker: HOST_MARKER,
      })
      if (source === 'companion') {
        expect(await credentials.readRecord(PRIMARY_KEY)).toEqual({
          kind: 'grant', payload: { marker: HOST_MARKER },
        })
      }
    } finally {
      release.resolve(undefined)
      spy.mockRestore()
      if (scaffoldDisposalStarted) await fixture.browser.close()
      else await fixture.close()
    }
  }, 90_000,
)

it('cancels a browser commit queued before provider admission during root disposal', async () => {
  const fixture = await authorizationWebFixture()
  const credentials = fixture.scaffold.ctx.credentials
  const original = credentials.modifyRecord.bind(credentials)
  const blockerEntered = Promise.withResolvers<undefined>()
  const release = Promise.withResolvers<undefined>()
  const queued = Promise.withResolvers<undefined>()
  let primaryMutationEntered = false
  let scaffoldDisposalStarted = false
  const blocker = original(SECONDARY_KEY, async () => {
    blockerEntered.resolve(undefined)
    await release.promise
    return undefined
  })
  await blockerEntered.promise
  const spy = vi.spyOn(credentials, 'modifyRecord').mockImplementation((key, mutate) => {
    const operation = original(key, async (current) => {
      if (key === PRIMARY_KEY) primaryMutationEntered = true
      return mutate(current)
    })
    if (key === PRIMARY_KEY) queued.resolve(undefined)
    return operation
  })
  try {
    await fixture.openModels()
    await fixture.page.getByRole('region', { name: 'Provider authorization' })
      .locator('ul').first().getByRole('listitem').filter({ hasText: 'Synthetic primary' })
      .getByRole('button', { name: 'Admitted write' }).click()
    await queued.promise
    await fixture.page.context().close()
    scaffoldDisposalStarted = true
    const disposing = fixture.scaffold.close()
    await new Promise<void>(resolve => setImmediate(resolve))
    release.resolve(undefined)
    await blocker
    await disposing
    expect(primaryMutationEntered).toBe(false)
    expect(await credentials.readRecord(PRIMARY_KEY)).toBeUndefined()
  } finally {
    release.resolve(undefined)
    await blocker
    spy.mockRestore()
    if (scaffoldDisposalStarted) await fixture.browser.close()
    else await fixture.close()
  }
}, 90_000)
