# Provider setup and editor extension: Phase 1 investigation

## Phase 2 implementation record

The accepted Phase 1 assessment below is retained as dated research. Work now targets `virtuo0ss0/deepseek-harness`, branch `feat/web-authorization`. A real checkout is available; frozen dependency installation, 30 authorization tests, and the full repository build passed. Vite required the permitted host retry after a sandbox filesystem denial. The earlier checkout limitation in the research baseline no longer applies.

The MVP consumes all registered authorization flows through current Remote/Gateway and contributes a directory to `settings.models.footer`. It adds no Provider Editor API, OAuth engine, record store, record deletion, or model-readiness interpretation. No core modification is currently justified.

Additional source review found [DSH Account Authorization](https://github.com/lxy271713/dsh-account-authorization) and [DSH Codex Web Bridge](https://github.com/Gluking81/dsh-openai-codex-web-bridge). The former uses Remote but filters on `target.kind === 'llm-provider'`, absent from this baseline, and refuses required text/secret prompts; its cancellation also calls the service's key-based cancel. The latter documents an older alpha dependency and owns HTTP routes instead of current Remote transport. Neither establishes the requested equivalent lifecycle, prompt coverage, and current external-package guarantees. These observations are source review, not a runtime certification of either project.

Attempt cancellation must abort only the controller supplied to that attempt's `authorization.begin`, never call key-based cancellation after looking up an old attempt. Prompt withdrawal rejects as withdrawal rather than human decline. Browser recovery may observe only an attempt it owns; the flow directory never exposes other clients' attempt capabilities. A bounded host lease cancels abandoned attempts after browser reload or loss, while brief reconnects can retain the in-memory attempt handle. Prompt answers are transient and never appear in status, error details, or retained snapshots.

Implementation and verification progress is recorded in [the tracked checkpoint](../work/web-authorization-continuation.md).

## Summary

**Recommendation: do not implement a new Provider Editor extension API.** Current master already exposes documented, public Models-page card and footer slots, and both `dsh-codex-connect` and `pi2dsh` use them. The original broad claim that provider setup requires private Models-page access is obsolete. Full replacement of the built-in editor remains unsupported, but ordinary authentication controls do not require that replacement.

**A narrower gap remains:** stock Web composition does not mount the authorization service or expose a generic browser driver for its existing host-side flows. Discussion #4626 addresses that gap on a fork. The next useful project is to adapt and validate that work on current Remote infrastructure, with explicit record-to-provider association and credential-state refresh. It is not another OAuth implementation, credential vault, or provider registry.

This is a source-reviewed architecture assessment, not a runtime compatibility certification. No provider was installed, no login attempted, and no production code changed.

## Scope and evidence baseline

Checked 2026-09-15. Upstream `deepseek-ai/deepseek-harness` and writable fork `virtuo0ss0/deepseek-harness` both reported master commit `0d1f50007f9bca3f52b06e1c3074fa14d5fb0720` (2026-09-15 03:16:06 UTC). The relevant Models package reports `0.1.6-alpha.1`. The upstream head was checked again before writing and was unchanged. These are repository observations, not a claim about the latest npm release.

The requested fork branch `feat/provider-editor-extension` returned “Branch not found.” Shell Git cloning failed because this environment could not connect to GitHub; repository files, the complete non-truncated tree, branch state, and PR metadata were instead read through the GitHub connector. No local checkout or branch was fabricated, and no remote branch was created. This document is a local deliverable intended for `docs/provider-editor-design.md`; applying it to that branch remains a later repository operation.

Primary evidence is current source and package exports. Discussions establish requests and reported experience; author-reported test results are not presented as tests run here. The attached research is background only. In particular, “no OAuth infrastructure,” “only flat API-key storage,” “no Models extension slots,” and “discovery cannot handle Anthropic Messages” do not describe current source. Unrelated contractual/legal claims in the attachment were not adopted.

## Table of contents

- [Current architecture](#current-architecture)
- [What remains missing](#what-remains-missing)
- [Private internals and existing workarounds](#private-internals-and-existing-workarounds)
- [Comparison with existing solutions](#comparison-with-existing-solutions)
- [What #4626 already solves](#what-4626-already-solves)
- [Smallest useful API](#smallest-useful-api)
- [Browser and host security boundary](#browser-and-host-security-boundary)
- [Cordis lifecycle and HMR](#cordis-lifecycle-and-hmr)
- [Compatibility and recommended MVP](#compatibility-and-recommended-mvp)
- [Risks and stop conditions](#risks-and-stop-conditions)
- [Verification limits](#verification-limits)

## Current architecture

### Provider directory, settings, and Models UI

The LLM directory declares a provider route, display name, settings namespace, and settings path. Models joins that directory with redacted settings and credential-reference descriptions. A model route without a configurable-provider declaration can appear in model pickers without receiving a Models settings row. The directory currently carries no authorization-flow key. See [LlmConfigurableProvider](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/llm/llm/src/types.ts#L232) and the [Models store](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/client/ui-settings-models/src/client/store.ts).

The built-in `ProviderEditor` selects a curated layout only for `llm-deepseek` and `llm-pi-ai`. Unknown namespaces receive a hint and cannot submit through that editor; this is not a general schema-generated editor. Existing edits use revision-fenced path mutations, preserve fields the form does not own, and write API keys separately through write-only credential operations. See [layout selection and form](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/client/ui-settings-models/src/client/ProviderEditor.tsx) and [operations](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/client/ui-settings-models/src/client/operations.ts).

Two public extension slots already exist:

| Slot | Dispatch | Owner data | Reach |
|---|---|---|---|
| `settings.models.provider-card` | Keyed by `settingsNs` | `provider`, `configured`, `keyConfigured` | Saved provider cards, first-run setup cards, and add drafts with a directory entry |
| `settings.models.footer` | Ordered list | No business data | After provider rows and add controls |

The card slot adds content beside the existing editor; it does not replace it. A new hand-declared draft has no directory entry and therefore no card-slot dispatch until saved. The owner type is publicly exported from `@deepseek-ai/dsh-client-ui-settings-models/client`. See [slot declarations](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/client/ui-settings-models/src/client/slot-contract.ts), [public exports and runtime declaration](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/client/ui-settings-models/src/client/index.ts), and [render sites](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/client/ui-settings-models/src/client/ModelsSection.tsx#L344).

This is implemented behavior, not just a proposal: source tests exercise registration, disposal, and rendering in the saved, first-run, and add-draft cases. See [registration tests](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/client/ui-settings-models/tests/apply.client.spec.ts#L165) and [render tests](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/client/ui-settings-models/tests/components.client.spec.tsx#L371). Tests were inspected, not executed here.

### Authorization and credentials

`dsh-authorization` already owns flow registration, method selection, notices, text/secret/select prompts, one active attempt per credential key, cancellation, and settlement. A flow must commit its record during the attempt; mere existence of an old credential does not prove successful reauthorization. `AuthorizationEntry.inFlight` describes an attempt, not whether a usable credential exists. See [service](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/credentials/authorization/src/index.ts) and [types](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/credentials/authorization/src/types.ts).

`llm-pi-ai` supplies a DSH-backed pi-ai credential store and registers catalog login flows when `authorization` is present, through `ctx.inject(['authorization'], ...)`. Login and refresh use host-side credential records. The local credential provider stores both reference entries and structured records in its managed document; a new OAuth JSON store is not required. See [adapter activation](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/llm/llm-pi-ai/src/index.ts#L213), [login translation](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/llm/llm-pi-ai/src/login.ts), [record adapter](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/llm/llm-pi-ai/src/auth.ts), and [local storage](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/credentials/credentials-local/src/index.ts).

### Browser transport and composition

Current browser calls use generated Remote contributions, `TypertRemoteService`, and `ctx.remote.$mount()`. The stock Remote assembly selects settings, credentials, LLM, and other controllers, but no authorization controller. The credentials controller exposes reference `describe/set/unset`, not grant-record login, status, or deletion. Neither the base nor Web bundle patch mounts `dsh-authorization`. See [Remote assembly](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/api/remotes/src/client/index.ts), [credentials controller](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/api/settings-controller/src/credentials.ts), [base composition](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/bundle/base/cordis.patch.yml), and [Web composition](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/bundle/web-app/cordis.patch.yml).

The old settings namespace whitelist claim is also stale for current master: `SettingsController.describe()` projects registered namespaces, and writes validate the namespace then delegate to the settings provider. No built-in-provider allowlist appears in that controller. See [current settings controller](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/api/settings-controller/src/index.ts).

## What remains missing

| Requirement | Current result | Architectural consequence |
|---|---|---|
| Add third-party setup UI within Models | Solved by card/footer slots | No new editor slot needed |
| Register a host login flow | Solved by `registerFlow` | Reuse it |
| Persist/refresh structured grants | Available through credentials and pi-ai adapter | No new credential abstraction needed |
| Generic stock Web login consumer | Missing controller, client driver, and default composition | Port/integrate #4626 rather than duplicate its design |
| Associate any flow with any provider row | No generic mapping; flow key and settings address are different identities | Do not infer arbitrary plugins' credential keys from route names |
| Reflect grant state in stock row status | `keyConfigured` reports API-key references only | Do not interpret it as OAuth readiness |
| Replace the complete built-in editor | No public replacement selector or replacement owner API | Requires a Models-owner change only if a concrete use case proves necessary |
| Use parent editor draft, read-only state, or close callback | Card owner does not include these | A plugin currently owns its own form/state and queries public services |
| Multiple independent additions for the same settings namespace | Keyed slot selects one occupant | A family owner can aggregate; independent contributions need a separate design |

The last row has an important qualification: the current slot implementation allows different priorities to shadow the same cell, while an identical key and priority is rejected. Shadowing is not simultaneous rendering. This can affect two plugins both claiming `llm-pi-ai`; it does not mean no coexistence mechanism exists. See [SlotCore registration rules](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/client/ui-slots/src/index.ts).

Models refresh listens to `settings/document-updated`, `credentials/reference-updated`, `llm/adapters-updated`, and connection resets. Stock event forwarding does not include `credentials/record-updated` or `authorization/settled`. A grant-only update therefore has no direct subscription in the Models join. A companion can maintain its own status stream/poller; changing the stock badge requires an explicit owner change. See [Models invalidation wiring](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/client/ui-settings-models/src/client/index.ts) and [forwarded events](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/api/remotes/src/remote-events.ts).

## Private internals and existing workarounds

### What the requested plugins actually depend on

**No current private Models-page dependency was found in the inspected authentication integrations of either requested plugin.** It would be inaccurate to claim they are forced to monkey-patch `ProviderEditor` today.

- **dsh-codex-connect:** its client uses a type-only import of the public Models entry and registers `settings.models.footer`; its account card and configuration dialog are its own components. It separately registers plugin configuration UI. Its own host authentication routes and client account store implement status, login URL handling, polling, cancellation, callback submission, sign-out, and account operations. These duplicate parts of a generic authentication consumer, not Models internals. Multi-account and quota behavior is additional product scope, not automatically removable by a generic driver. See [client registration](https://github.com/franksong2702/dsh-codex-connect/blob/78c8f71e35755e90e0437371b4365c778c05f955/src/client/index.tsx#L73), [host routes](https://github.com/franksong2702/dsh-codex-connect/blob/78c8f71e35755e90e0437371b4365c778c05f955/src/auth-routes.ts), and [account store](https://github.com/franksong2702/dsh-codex-connect/blob/78c8f71e35755e90e0437371b4365c778c05f955/src/client/account-store.ts).
- **pi2dsh:** its client registers both the `llm-pi-ai` card extension and a footer directory. It implements a shared poller and question UI over `/pi2dsh/login-state` and `/pi2dsh/login-action`. Its host conditionally projects flows into `ctx.authorization` under `pi2dsh/<id>`, while retaining its own Pi-format store, a DSH commit-witness record, and a sign-out mirror. The separate key scope is exactly why matching only `<settingsNs>/<route>` is not universal. See [client controls and registration](https://github.com/weijiafu14/pi2dsh/blob/8f3ed03825d9780a412c1c2956a6c41a092434c3/src/client.ts) and [flow projection](https://github.com/weijiafu14/pi2dsh/blob/8f3ed03825d9780a412c1c2956a6c41a092434c3/src/runtime.ts#L3908).
- **pi2dsh has other private/duplicated dependencies, but they are not editor dependencies:** `FileCredentialStore` accesses the vendored credential store's `credentials` map through a structural cast; `model-bridge.ts` mirrors DSH's private `classifyPiAiError` behavior. These concern Pi storage compatibility and model error translation. See [store adapter](https://github.com/weijiafu14/pi2dsh/blob/8f3ed03825d9780a412c1c2956a6c41a092434c3/src/oauth-bridge.ts#L44) and [error translation](https://github.com/weijiafu14/pi2dsh/blob/8f3ed03825d9780a412c1c2956a6c41a092434c3/src/model-bridge.ts#L531).

### What is private if someone insists on replacing the editor

`ProviderEditor`, `ProviderEditorProps`, `layoutOf`, draft handling, and `pathOps` are not exported by the Models `/client` entry. `ModelsSettingsStore` is likewise not a public runtime export. The `ModelsSectionInjected` type exposes implementation-oriented dependencies, but does not supply an external plugin with that component's live controller. Public `ModelsOperations` types do not amount to exporting the factory `createModelsOperations`. Copying these implementations or reaching through the selected `settings.section` entry would couple a plugin to internal editor state and orchestration.

The package declares a `./src/*` export pattern but its publish file list ships `lib` bundles and declarations, not source files. A source checkout import is not a reliable installed-package dependency. See [entry exports](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/client/ui-settings-models/src/client/index.ts) and [package manifest](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/client/ui-settings-models/package.json).

### Concrete additional workarounds discovered

- `xxww0098/dsh-plugin-oauth-subs` unwraps `Symbol.for('cordis.original')`, constructs an object over the original Connection, and replaces its `ctx` to bind RPC registration to another scope. This is an actual tracing/transport workaround, not a Models editor requirement. It also owns authentication state and a loopback model proxy. See [rpcFrom](https://github.com/xxww0098/dsh-plugin-oauth-subs/blob/6d2db1cc6522e152c4b0409d54780caba3667c72/src/index.ts).
- `jinbaozi/deepseek-harness-plugins` retains a version-specific pi-ai fork transformation: expose OAuth-only catalog routes, resolve/refresh credentials, and add a command by transforming built adapter output. Its recorded base is `0.1.0-rc.6`; it is historical compatibility evidence, not proof those transformations are needed on current master. See [patch record](https://github.com/jinbaozi/deepseek-harness-plugins/blob/c9c3b5053f88e260a0667d94ae22ff0dbd180740/packages/dsh-llm-pi-ai-oauth/patches/dsh-llm-pi-ai-oauth.patch).
- `NOirBRight/dsh-llm-providers-ui` provides a shared external provider directory, detail components, and its own settings page with `settings.provider.item`. Its navigation icon adapter uses DOM observation because the settings section has no icon field. That styling workaround does not establish a missing provider-auth API. See [directory](https://github.com/NOirBRight/dsh-llm-providers-ui/blob/dcbd467e0a8bdbcc07d6da81ad1714baeb0a6643/src/client/directory.ts), [page registration](https://github.com/NOirBRight/dsh-llm-providers-ui/blob/dcbd467e0a8bdbcc07d6da81ad1714baeb0a6643/src/client/index.ts), and [icon adapter](https://github.com/NOirBRight/dsh-llm-providers-ui/blob/dcbd467e0a8bdbcc07d6da81ad1714baeb0a6643/src/client/nav-icon.ts).

## Comparison with existing solutions

| Work | What it establishes | What it does not establish |
|---|---|---|
| [#1491](https://github.com/deepseek-ai/deepseek-harness/discussions/1491) | Original request for an inline provider editor; reply identifies existing authorization service | Current absence of all Models extension points |
| [#208](https://github.com/deepseek-ai/deepseek-harness/discussions/208) | Primary-model Codex request and community routes | Current need to write another Codex transport |
| [#5740](https://github.com/deepseek-ai/deepseek-harness/discussions/5740) | Report that adding a blank Codex profile does not initiate login | A current-master runtime test |
| [#4626](https://github.com/deepseek-ai/deepseek-harness/discussions/4626) | Generic Web driver over existing authorization flows, implemented on a fork | An upstream merge or a universal provider-editor replacement |
| dsh-codex-connect | Public Models footer integration and its own rich account UI | Generic driver for every registered DSH flow |
| pi2dsh | Public card/footer integration, host flow registration, Pi compatibility | Elimination of its own browser login protocol or store bridging |
| dsh-llm-providers-ui | Reusable community provider presentation framework | Integration into the stock Models editor or a stock authorization driver |
| [#6199](https://github.com/deepseek-ai/deepseek-harness/discussions/6199) | Newer request for model-row controls and shared model data; author reports using the card slot successfully | Need for another card-level setup slot |

#6199 is a distinct, narrower UI extension request. It is a candidate for later work if the shared authorization consumer is already being maintained elsewhere; it should not be silently included in an authentication MVP.

## What #4626 already solves

The linked [mastaan66 fork PR #2](https://github.com/mastaan66/deepseek-harness/pull/2) is **merged in that fork**, with head `66e9b36c5d70abbeb3b5c7d17b66dd402c2d388e` and merge commit `f192c2d2802e8617385a486dc824c32e52e4f040`. This does not mean merged upstream. Current upstream has neither its `SignInControl.tsx` nor the old `packages/host/apiproxy` implementation.

Source changes provide five operations: `list`, `begin`, `cancel`, `status`, and `answer`. The initiating call waits for settlement, progress is polled, prompts carry answer correlation IDs, and credentials are committed host-side. Models associates rows with flows using the record address and displays generic method buttons, notices, prompts, and cancellation. The fork also adds the authorization service to base composition. These are the mechanisms to reuse. See [host implementation](https://github.com/mastaan66/deepseek-harness/blob/66e9b36c5d70abbeb3b5c7d17b66dd402c2d388e/packages/host/apiproxy/src/api-proxy.ts) and [client control](https://github.com/mastaan66/deepseek-harness/blob/66e9b36c5d70abbeb3b5c7d17b66dd402c2d388e/packages/client/ui-settings-models/src/client/SignInControl.tsx).

Do not copy the old transport integration mechanically. Current Gateway supports independent Remote streams over its mux; the old rationale that mux consumption is owned only by sessions no longer describes current transport. Current prompt-withdrawal semantics also distinguish a human decline from cancellation of a losing prompt in a callback race. Port those semantics deliberately. The fork's provider counts and coverage figures are historical author reports, not a current catalog count or locally reproduced verification.

The fork explicitly excludes issuer revocation, durable attempts, and push delivery. Its row association is a convention, not an open mapping API for adapters such as pi2dsh. Neither this fork nor the current community presentation framework proves a complete supported stock solution for arbitrary provider setup.

## Smallest useful API

### For the requested editor proposal: zero new public methods or slots

Use the existing card slot for provider-local controls and the footer for flows without a row. Inject a plugin-owned controller and redacted state through the ordinary slot registration. Read/update configuration through public settings services and preserve revision checks. Retain the built-in API-key editor unchanged.

A full replacement API with `namespace`, `schema`, `operations`, draft internals, and parent callbacks would expose substantially more than authentication needs. Do not stabilize it without a demonstrated consumer requirement.

### For the remaining authentication gap: a small shared consumer

The smallest credible follow-up is a host/browser companion for the existing authorization service. Reuse #4626's five-operation semantics, updated for current Remote generation, plus a deliberately separate local-forget operation if sign-out is in scope. The following is **proposed behavior**, not an existing API or implementation plan authorization:

| Operation | Necessary information |
|---|---|
| List | Flow key, label, offered methods, in-flight state, value-free record presence/writability |
| Begin | Flow key, method, caller lifetime; report settlement |
| Status | Attempt identity, bounded notices, pending prompt, outcome |
| Answer | Attempt identity and prompt identity, one answer |
| Cancel | Attempt identity; cannot cancel a later attempt for the same key |
| Forget, optional | Explicit record key; forget locally, do not label this issuer revocation |

The consumer must distinguish an attempt identity from a credential key so stale clients cannot answer or cancel a newer attempt. Status and answer access must be associated with the initiating trusted client. Preserve the service's one-attempt-per-key rule rather than creating a competing lock manager.

For an initial shared flow directory in the footer, **no provider-to-flow mapping API is needed**. To attach arbitrary flows to rows, the smallest additional declaration is an optional provider setup binding consisting of `settingsNs`, `settingsPath`, and `flowKey`, owned by the adapter/companion and disposed with it. Do not derive `pi2dsh/<id>` from `llm-pi-ai/<route>`, overwrite credentials under another scope, or expose credential payloads. An external companion can own this binding registry first; core should adopt it only if multiple independent consumers need it.

A read-only property or refresh callback on the existing card owner is a possible later convenience, not a prerequisite: plugins can read settings writability and refresh their own status. Global settings writability also differs from per-record credential writability. The host must enforce the relevant permission regardless of UI props.

### Plugin versus core change

- Public slot registration, host flow composition, its transport controller, status UI, and a footer flow directory can be packaged as a companion plugin/bundle. A core change is not inherently required.
- Shipping that consumer by default requires a stock composition change.
- Making the stock badge represent grant state, enabling independent same-family simultaneous card contributions, or replacing the built-in editor requires changes to the Models owner and possibly its published types.
- Strict Remote artifact generation and package mounting must be validated from an actual published external package before claiming the companion works entirely out of tree. Source launch success alone is insufficient.

## Browser and host security boundary

The host owns OAuth protocol execution, PKCE verifier, callback handling, token exchange, refresh, persistence, and credential deletion. Browser components receive only allowlisted status, links, device codes, prompts, and action results. Do not return access/refresh tokens, grants, raw provider exceptions, or credential-store contents. Host plugins are trusted code; a UI slot is not a sandbox between installed plugins.

“Tokens stay host-side” does not mean no sensitive input ever enters the browser. Existing API-key entry and secret/manual-code prompts necessarily carry user input browser-to-host. Keep those inputs transient, masked where applicable, excluded from logs and session/model messages, and absent from subsequent status replies. A `secret` prompt tag controls presentation, not encryption or server-side authorization.

Use the Gateway/Connection trust mechanism or equivalent enforced checks for custom routes. Same-origin URLs or a loopback bind alone do not provide a complete authorization policy. Restrict mutation and attempt access server-side, validate wire IDs and URL schemes, reject unsafe link targets, bound notice retention, and clear prompt material at settlement. See [Gateway behavior](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/api/gateway/README.md).

A present record is not proof of a current valid subscription or working model route. Report “credential stored” separately from provider verification errors. Local `deleteRecord` is not issuer revocation. Do not silently import another CLI's rotating refresh token. Retain the existing store and locking model; do not claim encryption at rest or portable POSIX permission guarantees on Windows.

## Cordis lifecycle and HMR

Existing `ctx.slots.inject()` waits for the declaration, registers for each declaration lifetime, tears down on collapse, and re-registers after it returns. Registrations belong to the calling fiber. Avoid importing React page components, mutating entries, or keeping controller state on global singletons solely to survive reload. See [SlotRegistry](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/client/ui-renderer/src/client/registry.ts).

Use scoped `ctx.inject(['authorization', 'credentials'], ...)` for provider flow bindings. Dispose Remote contributions, pending prompts, pollers, callback listeners, timers, and per-attempt state with their owners. The authorization service withdraws a flow's active attempt when its registration is removed.

Cancellation currently settles even when a provider ignores its abort signal; the orphaned provider may still write a credential later. Do not promise transactional rollback on cancel. A browser driver must ignore late updates, release pending prompts, and re-read record state. A prompt's own abort must not be reclassified as human refusal: a callback may have won while the flow continues. See [authorization attempt implementation](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/credentials/authorization/src/index.ts).

For published integration, validate both load orders, host/client reload, declaration collapse/reappearance, unplugging a provider mid-login, reconnect, duplicate slot ownership, and two browser callers. Default module HMR is disabled in the base bundle, so plugin lifecycle support should not be described as automatic production module reload.

## Compatibility and recommended MVP

Existing API-key providers require no migration. Preserve write-only key entry, reference precedence, `apiKeyEnv` behavior, revision fencing, and narrow deletion ownership. A blank pi-ai key must continue allowing native authentication such as ambient cloud credentials. Do not hide API-key entry based merely on an OAuth method existing; some providers support both.

Compatibility is version-specific. dsh-codex-connect declares tested DSH versions through `0.1.5-rc.2`; that is not evidence it was tested against the inspected `0.1.6-alpha.1` source. pi2dsh explicitly bridges several API generations. Public does not mean semver-stable in this developer-preview repository. See [connect compatibility data](https://github.com/franksong2702/dsh-codex-connect/blob/78c8f71e35755e90e0437371b4365c778c05f955/src/compatibility.ts).

**Recommended MVP, if a later phase is authorized:**

1. Reuse/adapt #4626's generic flow driver to current Remote infrastructure.
2. Package it as a companion that composes the existing authorization service and renders one footer flow directory. Reuse one already registered catalog flow plus a synthetic non-pi flow for coverage; add no provider-specific OAuth implementation.
3. Validate value-free status, correlated prompts, cancel/reload behavior, local record deletion if included, and ordinary API-key regressions using keyless tests.
4. Validate an external packed install against a pinned DSH version. Only then consider default composition and optional row bindings.
5. Do not add a replacement editor, new token store, account pooling, quota framework, or model-row redesign to this MVP.

## Risks and stop conditions

Do not proceed with the originally proposed editor API. Its main purpose is already covered and its extra draft/close/validation promises would enlarge the maintained client API without demonstrated need.

Before starting the narrower follow-up, check whether #4626 has a maintained current-Remote successor or an existing companion can be adopted. If it already satisfies the lifecycle, security, and external-package tests, contribute compatibility/docs rather than make a parallel framework. The slot introduction commit mentions a first `llm-pi-ai-oauth` companion consumer, but that name alone does not establish a supported current package; the inspected current tree contains no such first-party package.

The residual risks are same-family slot shadowing, ambiguous record-to-route mappings, grants stored without an activated model route, stale credential indicators, browser reconnection during authentication, and pre-stable package/generator changes. None is solved merely by renaming a slot to `provider-editor`.

If shared Web authorization is already covered by maintained work, the next candidate is the independently requested model-row/shared-draft extension in #6199. Validate an actual consumer first; do not infer a need for a second complete Models page.

## Verification limits

Completed: current upstream/fork head checks; complete upstream tree inspection; source reads for Models slots, exports, editor, settings/credentials controllers, authorization, pi-ai login/store integration, composition, and Gateway; inspection of relevant source tests; all four requested Discussions; fork PR status and implementation; requested plugins' current source; additional implementation discovery.

Not run: repository build, `test:docs`, `doc-sync`, plugin runtime tests, packed installs, browser interaction, or real OAuth. The Git clone failed under the environment's network restriction, so there is no installed repository dependency graph to run those checks against. Source inspection supports the architectural conclusion but does not certify end-to-end behavior.

The requested document is the only deliverable. No production code, remote repository writes, PR, publication, or push occurred. Stop after this Phase 1 report.
