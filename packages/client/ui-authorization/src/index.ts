/** Host loader entry and page bootstrap for the generic authorization footer. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { type Config, AUTHORIZATION_CONFIG_GLOBAL } from './config.ts'

export { Config } from './config.ts'
export const name = 'ui-authorization'
/**
 * Publish the public polling cadence before browser plugins activate.
 * @param ctx - Host scope collecting page initialization data.
 * @param config - validated Loader configuration.
 */
export function apply(ctx: Context, config: Config): void {
  ctx.on('webserver/index-inject', (table) => {
    table.push({ kind: 'global', name: AUTHORIZATION_CONFIG_GLOBAL, value: { pollMs: config.pollMs } })
  })
}
