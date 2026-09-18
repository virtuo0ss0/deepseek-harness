/** Host loader entry and validation for the generic authorization footer. */
import Schema from '@deepseek-ai/schemastery'

/** Browser observation cadence; configure the host lease above the expected reconnect gap. */
export interface Config { pollMs: number }
export const Config: Schema<Config> = Schema.object({ pollMs: Schema.number().step(1).min(250).max(10000).default(1000) })
export const name = 'ui-authorization'
/** Host half only validates configuration; browser behavior lives in the client entry. */
export function apply(): void {}
