# Web authorization continuation

## Completed

- Real writable checkout of `virtuo0ss0/deepseek-harness`; local `feat/web-authorization` tracks the same origin branch.
- Frozen-lockfile dependency installation completed with Node 24.13.0 and pnpm 11.19.0 (repository specifies pnpm 11.7.0).
- `pnpm run test packages/credentials/authorization/tests`: 2 files, 30 tests passed. Saved Vitest results confirm this after interruption.
- Root/package instructions, architecture, authorization service, and Remote/Gateway documentation inspected.
- Host companion package `packages/credentials/web-authorization`: generated-Remote service declaration plus bounded attempt manager, browser-safe types, README pair, and eight passing state-machine tests.

## Architecture decisions

- Consume existing `dsh-authorization` through a reusable companion using current Remote/Gateway and the public `settings.models.footer` slot.
- No Provider Editor API, provider-specific OAuth, credential store, or reinterpretation of API-key readiness.
- Host retains credentials; project only allowlisted flow, notice, prompt, and settlement fields. Correlate attempt and prompt identities; preserve service locks and Cordis disposal.
- No core changes justified or made. Transport details remain to be designed and tested.

## Next step

Generate and test the host Remote artifacts and real Gateway dispatch, add catalog-flow coverage, then build the browser consumer, opt-in composition and external-package validation. The accepted Phase 1 design is in `docs/provider-editor-design.md`.

## Verification

- Passing: dependency installation; 30 authorization tests.
- Passing: eight new attempt-manager tests; focused host TypeScript build; staged-config lint of the new package after style fixes; whitespace check. New tests first failed for the missing implementation, then for a fixture teardown call (fixed to dispose owned Cordis fibers).
- Passing: full baseline `pnpm run build` (host and client compilation, bundles, Web frontend, 240 recorded client artifacts). Initial sandbox run failed at Vite config loading with filesystem Access denied; unchanged escalated retry passed. Logs outside the checkout: `../web-authorization-baseline-build.log` and `../web-authorization-baseline-build-retry.log`.
- An earlier mistaken `pnpm run test -- packages/credentials/authorization/tests` selected the broad suite; it was stopped. Unrelated workflow and Windows symlink tests failed during that partial run. This is not an exhaustive baseline test result. The corrected focused command above passed.
- Full post-change typecheck/lint/build, real Gateway/Loader integration, UI tests and external-package smoke remain unfinished. New state-machine tests do not yet establish wire validation or browser compatibility.

## Files and blockers

- Current files: `packages/credentials/web-authorization/{src,tests,README*,package.json,tsconfig.json}`, `tsconfig.host.json`, `tsconfig.base.json`, `pnpm-lock.yaml`, this checkpoint and `.agents/notes/proposed/architecture/2026-09-16-web-authorization-companion.md`.
- Confirmed generated residue from the interrupted broad test run was removed.
- Initial checkpoint committed locally. Git author was unset; configured repository-local verified GitHub username and no-reply address.
- Additional discovery: `lxy271713/dsh-account-authorization` requires missing `target` metadata and refuses text/secret prompts; `Gluking81/dsh-openai-codex-web-bridge` targets 0.1.2-alpha.1 and custom HTTP routes. Neither establishes an equivalent current-Remote implementation. Source review, not runtime compatibility certification.
- No commits pushed, PR created, or package published. No current execution blocker.
- Package install needed an online metadata refresh; unrelated dependency changes were removed from the lockfile, retaining only the new workspace importer. Run frozen install before the next build so installed dependencies match that restored lockfile.
- Decisions to retain: cancel uses only the attempt controller; prompt withdrawal is not human decline; unknown/late actions reject; expired handles disappear; secret answers are never retained; full attempt view is bounded in UTF-8 bytes. Browser reload intentionally abandons the handle and relies on lease expiry. Concurrent prompts fail explicitly.
