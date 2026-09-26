/** Installed-package Loader smoke; run from an external consumer with the packed dependencies installed. */
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import Registry from '@deepseek-ai/dsh-typert-registry'
import Credentials from '@deepseek-ai/dsh-credentials-local'
import { TYPERT } from '@deepseek-ai/dsh-web-authorization/typert'

const dir = await mkdtemp(join(process.cwd(), '.web-auth-composition-'))
const ctx = new Context()
try {
  await ctx.plugin(Registry)
  ctx.typert.register(TYPERT)
  await ctx.plugin(Credentials, { path: join(dir, 'credentials.yml'), watch: false })
  await ctx.plugin(Loader)
  ctx.loader.builtins.include = Include
  const config = [
    { name: '@deepseek-ai/dsh-authorization' },
    { name: '@deepseek-ai/dsh-web-authorization', config: { leaseMs: 60000 } },
    { name: '@deepseek-ai/dsh-client-ui-authorization', config: { pollMs: 1000 } },
  ]
  const file = join(dir, 'cordis.yml')
  await writeFile(file, JSON.stringify(config))
  await ctx.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(file).href } })
  await ctx.loader.await()
  assert.deepEqual(ctx.webAuthorization.list(), [])
  assert.equal([...ctx.loader.entries()].filter(entry => entry.options.name === '@deepseek-ai/dsh-client-ui-authorization').length, 1)
  console.log('Installed public plugin composition passed: authorization, host companion, browser host entry.')
} finally {
  await ctx.fiber.dispose()
  await rm(dir, { recursive: true, force: true })
}
