# Web authorization continuation

## Completed

- Real writable checkout of `virtuo0ss0/deepseek-harness`; local `feat/web-authorization` tracks the same origin branch.
- Frozen-lockfile dependency installation completed with Node 24.13.0 and pnpm 11.19.0 (repository specifies pnpm 11.7.0).
- `pnpm run test packages/credentials/authorization/tests`: 2 files, 30 tests passed. Saved Vitest results confirm this after interruption.
- Root/package instructions, architecture, authorization service, and Remote/Gateway documentation inspected.
- Host companion package `packages/credentials/web-authorization`: generated-Remote service declaration plus bounded attempt manager, browser-safe types, README pair, and eight passing state-machine tests.
- Current Gateway/Loader integration passes with the registered pi-ai DeepSeek API-key flow using dummy credentials; companion disposal aborts an active flow. Generated host Remote artifacts build successfully.
- Browser consumer `packages/client/ui-authorization` implements the public footer directory, keyed text/secret/select prompts, locale-owned copy and scope-owned polling. Five controller and two component tests pass, including an owner-local output snapshot. Browser-safe UUID generation uses the repository utility for HTTP LAN compatibility.

## Architecture decisions

- Consume existing `dsh-authorization` through a reusable companion using current Remote/Gateway and the public `settings.models.footer` slot.
- No Provider Editor API, provider-specific OAuth, credential store, or reinterpretation of API-key readiness.
- Host retains credentials; project only allowlisted flow, notice, prompt, and settlement fields. Correlate attempt and prompt identities; preserve service locks and Cordis disposal.
- No core changes justified or made. Two opt-in packages use generated Remote descriptors; stock profiles remain unchanged.

## Next step

Next milestone: test generated-wire validation and actual browser Cordis/Remote mount-dispose behavior, provide a tested opt-in composition, then pack/install externally against the pinned baseline. Finish documentation and relevant repository gates. Do not redo completed host/controller/component coverage. The accepted design is in `docs/provider-editor-design.md`.

### Resume audit, 2026-09-22

- The browser milestone is committed. The next milestone adds the passing Cordis declaration-lifecycle test and `tests/built-smoke.mjs`, public JSDoc and test compiler-face fixes.
- Generated-wire smoke passed through built Gateway: required-field/type rejection, unknown-field stripping, prompt correlation, host-only grant settlement and service disposal.
- External smoke passed from `../web-authorization-external-consumer`: 23 local tarballs installed outside the checkout with pnpm overrides; no workspace links. Pack helper `../pack-web-authorization.ps1`, tarballs `../web-authorization-packed`, install log `../web-authorization-external-install.log`. Full deployed browser/real OAuth not tested.
- Repository host and client compiler programs passed. Full `pnpm run build` passed on the authorized retry; `../web-authorization-final-build-retry.log` records 242 client artifacts. Default build reached Vite then hit the known sandbox denial.
- Typed lint was corrected without removing race checks: helper methods re-read scope state after awaits. All 17 focused tests and focused typed lint pass (`../web-authorization-milestone-tests.log`, `../web-authorization-focused-lint.log`). Remaining work: documentation/catalog verification and opt-in composition guidance. Do not rerun the passing full build absent relevant changes.
- Saved earlier failures: `../web-authorization-lint.log`; `../web-authorization-doc-sync.log` (31 passed/10 failed); `../web-authorization-doc-tests.log`. Docs build needs sandbox retry; site fixture has a Windows symlink failure. Documentation updates and pairing sidecars are in progress. Original research remains in Git history and an unchanged external copy at `../provider-editor-phase1-research.md`; maintained design now describes the implementation and limitations. Generated catalog work is pending verification, not a core runtime change.

## Verification

- Passing: dependency installation; 30 authorization tests.
- Passing: eight new attempt-manager tests; focused host TypeScript build; staged-config lint of the new package after style fixes; whitespace check. New tests first failed for the missing implementation, then for a fixture teardown call (fixed to dispose owned Cordis fibers).
- Passing: full baseline `pnpm run build` (host and client compilation, bundles, Web frontend, 240 recorded client artifacts). Initial sandbox run failed at Vite config loading with filesystem Access denied; unchanged escalated retry passed. Logs outside the checkout: `../web-authorization-baseline-build.log` and `../web-authorization-baseline-build-retry.log`.
- An earlier mistaken `pnpm run test -- packages/credentials/authorization/tests` selected the broad suite; it was stopped. Unrelated workflow and Windows symlink tests failed during that partial run. This is not an exhaustive baseline test result. The corrected focused command above passed.
- Passing: combined host/controller run (14 tests), component/controller run (7 tests), focused browser TypeScript build and staged-config lint. After replacing UUID generation, controller tests passed again (5). Focused browser tsdown build produced both host stub and browser factory. The bare `pnpm exec tsdown` shim was unavailable; direct `node node_modules/tsdown/dist/run.mjs --config packages/client/ui-authorization/tsdown.config.ts` passed.
- Full post-change typecheck/lint/build, generated-wire validation, actual browser composition and external-package smoke remain unfinished. Source Gateway tests do not certify generated schema enforcement.

## Files and blockers

- Current files: `packages/client/ui-authorization/**`, `packages/credentials/web-authorization/tests/composition.spec.ts`, host manifest, `tsconfig.client.json`, `tsconfig.base.json`, `pnpm-lock.yaml`, this checkpoint and design. Next work targets package composition/built tests; the proposed Agent Note still needs final implementation details and a bilingual pair.
- Confirmed generated residue from the interrupted broad test run was removed.
- Initial checkpoint committed locally. Git author was unset; configured repository-local verified GitHub username and no-reply address.
- Additional discovery: `lxy271713/dsh-account-authorization` requires missing `target` metadata and refuses text/secret prompts; `Gluking81/dsh-openai-codex-web-bridge` targets 0.1.2-alpha.1 and custom HTTP routes. Neither establishes an equivalent current-Remote implementation. Source review, not runtime compatibility certification.
- No commits pushed, PR created, or package published. No current execution blocker.
- Frozen install passed after the new workspace importers/dependencies were added. Lock changes are limited to these packages. Sandbox install aborts due to the inaccessible host store; the authorized escalated identical install succeeds. No pending install mismatch.
- Decisions to retain: cancel uses only the attempt controller; prompt withdrawal is not human decline; unknown/late actions reject; expired handles disappear; secret answers are never retained; full attempt view is bounded in UTF-8 bytes. Browser reload intentionally abandons the handle and relies on lease expiry. Concurrent prompts fail explicitly.
