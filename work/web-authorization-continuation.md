# Web authorization v017 continuation

## Completed

- New branch `feat/web-authorization-v017` starts at upstream 0.1.7-rc.1. Audit and source-port milestones are committed and pushed to the fork. Historical `feat/web-authorization` and its six commits remain untouched.
- [Compatibility audit](web-authorization-compatibility-audit.md) accepted: generic consumer gap remains; no core API change is needed.
- Ported the two opt-in companion packages, preserving bounded unary Remote polling, random attempt identity, prompt correlation, reload expiry and public Models footer registration.
- Adapted package versions and workspace ranges. Regenerated the lockfile from current manifests: no external package versions added or removed; two importers added and peer contexts recalculated.
- Added ownership of active attempts independently from expiring browser views. Disposal waits for admitted credential writes after lease expiry; active work remains capacity-bounded.
- Source Loader fixture uses supported builtin registration. Installed-package composition uses ordinary public package resolution without replacing Loader internals. Browser fixtures match current framework hooks.
- Current generators regenerated aliases, Cordis/config/capability catalogs, client slot and inspect catalogs, and the bundled composition skill's plugin-package reference. Updated bilingual package maps and [design](../docs/provider-editor-design.md).

## Architecture decisions

- Reuse authorization already mounted in upstream's base profile. Stock profiles and API-key configuration remain unchanged; keyConfigured keeps its existing meaning.
- Existing host owners retain provider protocols, PKCE and credential writes. Browser state contains only allowlisted metadata, notices, prompts and outcomes.
- New session.commit admission semantics remain authoritative; cancellation is neither rollback nor issuer revocation. Disposal retains ownership until admitted writes settle.
- DeepSeek Platform registration requires account-service initialization. Its owning account UI remains responsible; this companion does not duplicate it.

## Verification

- Frozen baseline install and 34 existing authorization tests passed.
- Lease-expiry/disposal regression failed against the historical manager (10 passed, one failed), then passed with the ownership fix.
- Final focused run: 54 passed across seven files: 34 existing authorization tests and 20 companion tests (11 host state, one Loader/Gateway catalog, eight browser).
- Focused package and repository host/client typechecks passed. Repository lint, source-port commit hooks and push typecheck passed.
- Full build passed: 265 client artifacts and three public values. Initial sandbox Web bundling hit ancestor-directory access denial; the same command passed with host access and exact process-scoped Git trust.
- Generated Gateway artifact smoke passed: strict arguments, prompt correlation, credential-free settlement and scope disposal.
- Package dependency, client module, package metadata and invariant checks passed.
- Packed 25 current local packages and installed in a separate consumer outside the checkout, using the populated host offline store with install scripts disabled. Generated Gateway smoke and installed Loader composition passed. The latter mounts authorization, host companion and browser host entry through public exports. This does not prove a deployed browser session.
- Full GUI run: 519 files passed, seven failed; 7604 tests passed, nine failed, one skipped. Five targeted retries (two HTTP bridge cases, grammar loading, packed preview licenses and home directory listing) passed with normal host access. Remaining failures: three unchanged account-formatting assertions expect comma grouping but this runtime defaults to en-DE (dot grouping); one unchanged file-open fixture cannot create a Windows symlink. Relevant source/test directories have no changes from baseline. The full GUI aggregate is not green.
- Documentation aggregate: 40 gates passed and two failed. Regenerated the missing plugin-package reference and its focused verification passed. Remaining gate failure is the unchanged documentation-site symlink fixture (EPERM); that lane passed 150 tests and failed one. Documentation build, typecheck, translation pairing, links and all other catalog checks passed. Do not describe the full aggregate as green.

## Next step

- Port and verification are complete. This checkpoint accompanies the final verification milestone; no production port work remains.
- Next acceptance step is a deployed browser smoke with the opt-in packages enabled and a synthetic flow, including reconnect, reload, cancellation and disposal. No real OAuth has been run or authorized for this milestone.
- Resolve or account for the unrelated locale and Windows symlink validation limits before claiming an entirely green repository run. No package publication, PR or upstream modification.

## Files and evidence

Verification milestone files: packages/credentials/web-authorization/tests/external-composition.mjs, packages/preset/agent-preset/skills/cordis-composition-reference/references/packages.md, and this checkpoint. All production source and documentation changes are in the preceding source-port milestone.

External proof: ../web-authorization-v017-packed contains 25 tarballs; ../web-authorization-v017-external-consumer contains the installed consumer, smoke.mjs and composition.mjs. Run both Node scripts from that consumer directory. The repository's external-composition.mjs is the reproducible Loader fixture.

Logs outside checkout: ../web-authorization-v017-final-tests.log, -lint.log, -client-typecheck-retry.log, -build-host.log, -package-checks.log, -pack.log, -external-install.log, -gui.log, -gui-retry.log and -doc-sync.log share the web-authorization-v017 prefix. Earlier baseline, regression-before and source-port commit/push logs remain alongside them. The initial combined tests ran before dependency linking finished; the linked rerun is the final 54-test result.

Environment: host commands on this sandbox-created worktree may need an exact command-scoped safe.directory value. Pre-push needs ../web-authorization-push-bin on PATH to find pnpm. Do not bypass hooks. The current host pnpm store supports the offline external install. Deployed browser behavior and real OAuth remain untested.
