# Web authorization compatibility audit

## Scope and decision

Inspected upstream master at the 0.1.7-rc.1 release in a new worktree on `feat/web-authorization-v017`. The historical `feat/web-authorization` branch is unchanged. The generic browser authorization consumer remains absent, so the source port may proceed. No production source has been ported at this audit checkpoint.

## Current upstream evidence

| Area | Current behavior and port consequence |
|---|---|
| `packages/credentials/authorization/src/index.ts` | Registration, flow directory, interaction prompts and per-key locking remain. New `AuthorizationSession.commit(record)` refuses late writes after cancellation; once admitted, cancellation and provider disposal wait for persistence and settlement. Preserve this authority and test cancellation during an admitted commit. |
| `packages/credentials/deepseek-account-platform/src/index.ts` | New provider-specific Platform PKCE implementation registers a flow but requires its own private attempt initialized through `startSignIn`. It is not a generic registered-flow driver. Do not reproduce its protocols or assume every registered flow is independently startable. |
| `packages/api/account-controller/src/index.ts` and `packages/client/ui-settings-account/src/client/index.ts` | New authenticated account operations and streamed account UI are DeepSeek-specific. They provide neither arbitrary flow listing nor generic text/secret/select prompts. They do not replace the companion. |
| `packages/typert/protocol/src/{index,types}.ts` | Existing unary Remote decorators remain. New invocation context, peer lifetime, bidirectional stream handles and binary/owned-value support do not require rewriting a bounded unary interaction protocol. Peer identity is connection-owned, not a durable browser attempt identity; retain random capabilities and reconnect leases. |
| `packages/api/gateway/src/client/index.ts` | `$mount` remains an owned, reversible contribution registration. Stream supervision is available but does not replace attempt correlation, prompt correlation or reload expiry. Regenerate codecs and Remote artifacts with this baseline's generators. |
| `packages/client/ui-settings-models/src/client/slot-contract.ts` | `settings.models.footer` remains a public root list. A new `settings.models.sign-in` slot serves the account onboarding choice; it is not a Provider Editor API or generic flow directory. Keep the footer integration. |
| `packages/client/ui-slots/src/index.ts` | Declaration-scoped `slots.inject` remains the lifecycle mechanism. Preserve disposal on declaration removal and restoration after redeclaration, with current source tests. |
| Package manifests and `packages/AGENTS.md` | DSH dependencies now use `workspace:*`, vendor/native dependencies `workspace:~`; package version is 0.1.7-rc.1. Preserve explicit public exports and browser-only development dependencies. |
| `scripts/gen-cordis-catalog.ts`, `scripts/gen-doc-graphs.ts` | Both changed substantially. Port only service/type classification intent; regenerate all catalogs from current source. Do not copy old generated metadata, lockfile or documentation tables. |

Searches covered current package manifests, browser sources, authorization begin/list/register consumers, Remote assembly and Models slots. Registered generic catalog flows still come from `llm-pi-ai`; its login adapter retains the interaction protocol, with its model factory now imported locally. Current authorization consumers found are the service itself, pi-ai registration and the DeepSeek Platform owner; no equivalent generic Web consumer was found.

## Port boundaries

Use two opt-in companion packages, existing authorization execution and credential writes, bounded allowlisted browser views, correlated attempt/prompt operations, and declaration-owned UI lifetime. No core runtime change, Provider Editor, provider-specific protocol, credential store or stock-profile activation is planned. Use `session.commit` in synthetic regression flows where cancellation ordering is tested; existing third-party adapters retain responsibility for their direct writes.

## Verification still required

Current authorization and companion tests, admitted-commit cancellation and disposal, typechecks, lint/contracts, full build, generated Remote validation, Loader/Gateway composition, and fresh installed tarballs against this baseline. No real OAuth. Installation of current pinned dependencies is in progress; audit evidence is source inspection, not yet runtime compatibility evidence.
