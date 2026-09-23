# Web authorization continuation

## Completed

- Work remains only in the real writable fork checkout on `feat/web-authorization`; no push, publication or PR.
- Implemented two opt-in packages: `packages/credentials/web-authorization` (host attempt manager and generated Remote methods) and `packages/client/ui-authorization` (generic Models footer consumer).
- Existing authorization service owns flow execution, locks and credential writes. No Provider Editor API, OAuth engine, credential store or core runtime changes.
- Host projects bounded flow/status/notice/prompt data. Browser answers correlate attempt and prompt identity. Cancellation aborts the exact attempt controller. API-key references and `keyConfigured` semantics are unchanged.
- Browser supports text, secret and select prompts, including empty-string option IDs. Prompt input clears on submit/replacement/unmount. Scope disposal removes state/timers and requests cancellation; host lease handles lost unload requests and reload.
- Updated bilingual package/design/subsystem documentation, package maps, generated catalogs and the implemented Agent Note. Documentation generator mappings classify the new service; they do not add a core runtime extension point.
- Installed-package Loader smoke exercised the documented three-row opt-in composition: existing authorization service, host companion and browser plugin host entry. Existing deployments must reuse their authorization owner rather than mount a second one.

## Architecture decisions

- Public `settings.models.footer`, current generated Remote/Gateway; stock profiles unchanged.
- Browser keeps only its random capability in memory. Reload abandons it; brief reconnect retains it. Directory never exposes other clients' handles.
- Secret answers are transient, never snapshot/status/error payloads. Provider notices must honor the existing non-secret text contract.
- Bounded host state: 32 retained attempts, 16 notices, 32768 UTF-8 bytes per complete view, 2048-byte display fields, 16384-byte answers.
- Prompt withdrawal is not human decline. Sequential prompts supported; concurrent prompts explicitly fail.
- Cancellation is not credential deletion, rollback or issuer revocation. A provider ignoring abort may still commit later under existing service semantics.

## Verification

- Existing authorization tests: 30 passed (two files).
- New host/controller/component/lifecycle tests: 17 passed (five files). After the final empty-ID select fix, both component tests passed again with the existing user-output snapshot.
- Full host and client TypeScript programs passed. Focused UI TypeScript and bundle build passed after the final code changes.
- Full `pnpm run build` passed on the permitted host retry: 242 client artifacts. Default sandbox Vite configuration loading failed with Access denied; identical host retry passed.
- Repository-wide `pnpm run lint:contracts-ready` passed. Focused typed lint passed after the last select fix. Public JSDoc, whitespace and required catalog checks passed.
- `pnpm run doc-sync`: 40 passed, one failed. The sole failure is the unchanged `scripts/project-doc-site.spec.ts` symlink fixture: Windows EPERM creating a temporary file symlink, including outside the sandbox. Documentation build, doc typecheck, links, pairing, catalogs and documentation-standard tests all passed. Earlier `test:docs` failures were corrected and its component gates passed in this final aggregate.
- Built artifact smoke passed: generated required-field/type validation, unknown-field stripping, prompt identity, value-free settlement and service disposal.
- External package proof passed: 23 local DSH/framework tarballs installed outside the repository against the inspected 0.1.6-alpha.1 baseline, with file overrides rather than workspace links. Final companion tarballs were refreshed and both host smoke and Loader composition passed again. No real credentials were used.

## Evidence and reproduction

- `../web-authorization-final-build-retry.log`: full successful build.
- `../web-authorization-milestone-tests.log`: 17 tests; `../web-authorization-select-tests.log`: final component coverage.
- `../web-authorization-lint-final.log` and `../web-authorization-select-lint.log`: successful lint commands.
- `../web-authorization-doc-sync-final.log`: exact 40/41 documentation result.
- `packages/credentials/web-authorization/tests/built-smoke.mjs`: committed artifact-only test, run with plain Node after a host build.
- `../web-authorization-external-consumer/{smoke.mjs,composition.mjs,package.json,pnpm-workspace.yaml}`: installed external consumer and both passing smoke scripts. Run `node smoke.mjs` and `node composition.mjs` there.
- `../pack-web-authorization.ps1`: initial transitive tarball pack helper. Initial 23 tarballs are in `../web-authorization-packed`; refreshed two companion tarballs are in `../../web-authorization-packed-final`. Consumer overrides name their exact paths. Installation used `pnpm install --ignore-scripts --offline` with the host package store.
- Original Phase 1 research remains in the design file's Git history and the unchanged external copy `../provider-editor-phase1-research.md`. Maintained design: `docs/provider-editor-design.md`.

## Current files and next step

Final milestone contains the two companion packages, their tests/docs, `docs/provider-editor-design*`, credentials subsystem/config/capability catalogs and pairs, package maps, generated extension catalogs, generator classification maps, the implemented Agent Note and this checkpoint. No unfinished production implementation remains; review `git status --short` and `git log --oneline` before further work.

Recommended next step: a manual deployed Web smoke using a synthetic flow, then optional real provider authorization with user-supplied credentials. This run did not launch a deployed browser session or perform real OAuth; source component/Cordis tests and installed host-package tests do not establish those guarantees. Re-run the unrelated symlink fixture on a host that permits symlinks. Do not publish or push without a new instruction.
