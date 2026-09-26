# Web authorization companion

English | [中文](provider-editor-design.zh.md)

## Architecture

Two opt-in packages connect the existing authorization service to the public Models footer: [host companion](../packages/credentials/web-authorization/README.md) and [browser consumer](../packages/client/ui-authorization/README.md). The base profile already supplies authorization; deployments reuse that owner. No core API change, Provider Editor replacement, provider-specific OAuth engine or credential store is added. The [compatibility audit](../work/web-authorization-compatibility-audit.md) records the comparison with the 0.1.7-rc.1 baseline.

The upstream DeepSeek account UI and account-controller are provider-specific, not generic registered-flow consumers. Its Platform flow requires private initialization by the account service. Registration alone does not promise that a flow is independently usable here; the companion does not reproduce that initialization or override the account UI.

## Public transport

| Method | Input | Result |
|---|---|---|
| list | none | registered flow metadata, methods and busy flag |
| begin | random attempt capability, key, method | projected attempt state |
| status | attempt capability | projected state and renewal of a running lease |
| answer | attempt capability, prompt identity, transient answer | no credential payload |
| cancel | exact attempt capability | withdrawal request, no credential payload |

The host projects bounded notices and text/secret/select prompts. The browser keeps its random capability only in memory. Repeated begin with the same retained capability and selection recovers ambiguous responses. Sequential prompts have distinct identities. Provider errors and settlement expose no credential payloads. Existing API-key configuration and keyConfigured retain their meanings; authorization success does not configure a model route.

## Security and lifecycle

Providers and authorization own protocols, callbacks, PKCE, credential commits and locks. Credentials never enter browser snapshots or status responses. Secret human input exists transiently in the prompt component and request; it clears on submission or replacement. Provider notice text must honor the service's non-secret contract. Gateway authentication and transport protection remain deployment responsibilities; same-origin scripts and installed host plugins remain trusted.

The manager limits retained views and active attempts to 32 each, notices to 16, and each complete serialized view to 32768 UTF-8 bytes. It validates prompt identity, offered choices and answer size. Browser generation checks discard stale responses. Declaration-owned registration removes controllers, timers, locale registrations and Remote contributions on disposal. A brief reconnect retains the in-memory handle; reload loses it and the lease withdraws the abandoned attempt.

An admitted session.commit may outlive cancellation and lease expiry. The host removes expired browser views but retains ownership of unsettled work until authorization settles. Disposal waits for that work, and active-attempt capacity remains bounded even after view expiry. Cancellation never means rollback, credential deletion or issuer revocation. Direct-writing providers still own their cancellation ordering.

## Verification and next step

Synthetic flows test the shared interaction protocol without real credentials; an existing pi-ai catalog API-key flow tests Loader/Gateway composition and unchanged API-key references. A blocked credential-write barrier tests cancellation, provider removal and disposal after lease expiry. Generated Remote validation and packed external installation exercise the public package exports separately from source tests.

The [tracked checkpoint](../work/web-authorization-continuation.md) records executed checks and outstanding work. A deployed browser smoke remains a separate acceptance step. No real OAuth, package publication or PR is part of this port. If a maintained generic consumer provides equivalent lifecycle and security guarantees, contribute to it rather than maintain a duplicate.
