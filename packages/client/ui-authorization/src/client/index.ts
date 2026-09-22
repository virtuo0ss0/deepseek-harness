/** Mount generated current-Remote descriptors and the public Models footer consumer. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-gateway/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import remote from '@deepseek-ai/dsh-web-authorization/remote'
import { AuthorizationController } from './controller.ts'
import { AuthorizationFooter, type FooterInjected } from './AuthorizationFooter.tsx'
import { en, zh, type CopyKey } from './locales.ts'
import type { Config } from '../index.ts'

export type { FooterInjected, FooterProps } from './AuthorizationFooter.tsx'
export type { CopyKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'authorization': CopyKey }
}

export const inject = ['remote', 'slots', 'locale']

/**
 * Mount the Remote contribution and register a controller for each footer declaration lifetime.
 * @param ctx - browser context with Remote, locale and slots.
 * @param config - validated polling cadence.
 * @returns teardown for UI registrations, controllers and Remote calls.
 */
export async function apply(ctx: Context, config: Config): Promise<() => Promise<void>> {
  const unmount = await ctx.remote.$mount(remote)
  const ui = ctx.inject(['remote.webAuthorization', 'slots', 'locale'], (scope) => {
    scope.effect(() => scope.locale.register('authorization', { en, zh }), 'authorization: dictionaries')
    const t = scope.locale.bind('authorization') as FooterInjected['t']
    scope.slots.inject('settings.models.footer', function* () {
      const controller = new AuthorizationController(scope.remote.webAuthorization, config.pollMs)
      yield () =>{  controller.dispose() }
      const injected: FooterInjected = {
        hooks: { snapshot: controller.store }, t,
        open: () => controller.open(), refresh: () => controller.refresh(),
        begin: (flow, method) => controller.begin(flow, method),
        answer: (id, answer) => controller.answer(id, answer),
        cancel: () => controller.cancel(), dismiss: () =>{  controller.dismiss() },
      }
      yield scope.slots.register({ name: 'settings.models.footer', id: 'authorization', locale: 'authorization', inject: () => injected }, AuthorizationFooter)
    })
  })
  try { await ui }
  catch (error) { await ui.dispose(); await unmount(); throw error }
  return async () => { await ui.dispose(); await unmount() }
}
