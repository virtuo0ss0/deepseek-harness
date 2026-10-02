/** Public polling configuration shared by the Host and browser entries. */
import Schema from '@deepseek-ai/schemastery'

/** Browser observation cadence; keep the Host lease above expected reconnect gaps. */
export interface Config {
  /** Interval in milliseconds between browser status observations. */
  pollMs: number
}

/** Validate both Loader options and the public page-bootstrap payload. */
export const Config: Schema<Partial<Config>, Config> = Schema.object({
  pollMs: Schema.number().step(1).min(250).max(10000).default(1000),
})

/** Page-global key carrying only the public polling interval. */
export const AUTHORIZATION_CONFIG_GLOBAL = '__DSH_WEB_AUTHORIZATION_CONFIG__'
