# Web authorization v017 continuation

## Completed

- New branch `feat/web-authorization-v017` starts at upstream 0.1.7-rc.1. The audit milestone is committed and pushed to the fork. Historical `feat/web-authorization` and its six commits remain untouched.
- [Compatibility audit](web-authorization-compatibility-audit.md) accepted: generic consumer gap remains; no core API change is needed.
- Ported the two companion packages intentionally, preserving bounded unary Remote polling, random attempt identity, prompt correlation, reload expiry and public Models footer registration.
- Adapted 0.1.7-rc.1 package versions and workspace ranges. Regenerated the lockfile from current manifests: no external package versions added or removed; two workspace importers added and peer contexts recalculated.
- Added ownership of active attempts independently from expiring browser views. Host disposal waits for admitted credential writes after lease expiry. Active work remains capacity-bounded.
- Source Loader fixture now uses supported builtin registration instead of replacing its internal module loader. Updated browser fixtures for current framework hooks and removed assertions to unknown.
- Regenerated aliases, Cordis/config/capability catalogs, client slot and inspect catalogs with current generators. Updated bilingual package maps and [design](../docs/provider-editor-design.md).

## Architecture decisions

- Opt-in only; reuse authorization already mounted in upstream's base profile. Stock profiles and API-key configuration remain unchanged.
- Keep provider protocols, PKCE and credential writes on existing host owners. Browser state contains only allowlisted metadata, notices, prompts and outcomes.
- New session.commit admission semantics remain authoritative; cancellation does not mean rollback or issuer revocation.
- DeepSeek Platform registration requires account-service initialization. Its owning account UI remains responsible; this companion does not duplicate it.

## Verification

- Frozen baseline installation and 34 current authorization tests passed. The audit push's host build and client typecheck passed.
- A new lease-expiry/disposal regression failed on the historical manager (10 passed, 1 failed), then passed with the ownership fix.
- Companion source tests: 20 passed across five files (11 host state tests, one Loader/Gateway catalog test, eight browser tests).
- Focused package typechecks passed. Repository host typecheck passed; repository client typecheck passed after adapting test fixtures for new framework hooks.
- Repository lint passed; final fixture edits still need staged lint. Documentation quick checks: 19/20 passed, with only translation pairing failing; corrected diagram parity and locale links, awaiting final aggregate.
- Generated Remote host bundle produced with current generator. Artifact smoke is pending full build because the focused bundle build left dependency artifacts absent.

## Next step

- Commit and push the coherent source-port milestone with this checkpoint.
- Run full build, generated Remote artifact smoke, current-package external installation and Loader smoke, documentation aggregate and package/contracts checks.
- Finalize checkpoint with exact results and push the verification milestone. No real OAuth, publication, PR or upstream changes.

## Files and evidence

Current work: packages/credentials/web-authorization, packages/client/ui-authorization, their package/tsconfig registration, current generated catalogs and documentation pairs, generator classifications, package maps and this checkpoint. No changes belong to the historical branch.

Logs outside checkout: ../web-authorization-v017-{install,audit-push,baseline-tests,regression-before,focused-tests,client-tests,host-typecheck,client-typecheck,typechecks,client-typecheck-retry,lint,doc-quick,generators,final-tests}.log. The first combined companion run started before new dependency linking finished: host/controller tests passed, two browser imports failed, and the subsequent linked browser run passed all eight tests.

Environment: host commands on this sandbox-created worktree may need an exact command-scoped safe.directory value. The pre-push shell needs ../web-authorization-push-bin on PATH to find pnpm. Do not bypass hooks. The earlier unrelated Windows documentation symlink limitation may recur; report the actual current result. Full deployed browser and real OAuth remain untested.
