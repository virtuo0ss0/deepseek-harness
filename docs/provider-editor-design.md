# Web authorization companion design

English | [中文](provider-editor-design.zh.md)

## Conclusion and evidence

Do not introduce a Provider Editor API. Models already has public card/footer slots; the remaining useful extension is a generic Web consumer of the existing authorization service. The accepted, dated Phase 1 investigation is preserved in this document’s Git history, including repository pins, Discussions #1491, #208 and #5740, and the inspected implementations. This document records the narrower implementation on the feature branch; it does not claim that the package has shipped.

[Discussion #4626](https://github.com/deepseek-ai/deepseek-harness/discussions/4626) demonstrates the generic flow-directory, polling, notice, prompt and cancellation interaction. Its old apiproxy transport is not the current Gateway. The implementation reuses those concepts and the existing authorization service, not the earlier transport or key-based attempt addressing. [dsh-codex-connect](https://github.com/franksong2702/dsh-codex-connect) and [pi2dsh](https://github.com/weijiafu14/pi2dsh) provide provider integrations, not evidence of a supported equivalent generic consumer on this baseline. The research record contains the exact inspected source references and compatibility limits.

Additional source review found [account-authorization](https://github.com/lxy271713/dsh-account-authorization), which expects target metadata absent from this baseline and refuses text/secret prompts, and [Codex Web Bridge](https://github.com/Gluking81/dsh-openai-codex-web-bridge), which targets an older alpha and custom HTTP routes. Neither establishes equivalent current-Remote, lifecycle and external-install guarantees. These are source observations, not runtime certification of those projects.

## Current architecture and missing consumer

The authorization service owns registered flows, per-credential locks, execution and credential-write settlement. Providers own OAuth callbacks, PKCE, grants and credential writes. Models owns API-key configuration and exposes public presentation slots. Remote/Gateway supplies typed host methods, browser descriptors and connection transport. Stock composition does not connect these pieces into a generic Web authorization driver.

The feature adds two opt-in packages: [host companion](../packages/credentials/web-authorization/README.md) and [browser consumer](../packages/client/ui-authorization/README.md). The browser contributes only to settings.models.footer. It does not use private Models editor internals or monkey-patch existing providers. No core change is necessary. Composition must provide exactly one existing authorization service, a credential provider, Gateway, and the two companion plugins. Shipped profiles are unchanged; these are ordinary Cordis plugins, not a new CLI-installable bundle.

## Minimal public transport

| Method | Input | Output |
|---|---|---|
| list | none | registered key, label, methods and in-flight flag |
| begin | client-generated random attempt capability, key, method | projected attempt view |
| status | attempt capability | view; renews a running lease |
| answer | attempt capability, prompt identity, transient answer | no credential payload |
| cancel | attempt capability | no credential payload |

Views contain an attempt identity, running/authorized/cancelled/failed status, bounded notices, and at most one text/secret/select prompt. Generated validators check required fields and types and strip unknown object fields. The manager validates UUID capabilities, flow selection, answer size, select membership and prompt identity. Repeating begin with the same retained capability and selection recovers an ambiguous response. The directory never exposes other clients' attempt identities.

## Security and credentials

Tokens, grants, PKCE verifiers and credential-store contents remain in existing host owners. Secret prompt input must transiently pass through the browser, but it never enters the controller snapshot or a status response. Prompt components clear input on submission, replacement and unmount. Provider notices are contractually non-secret; field allowlisting cannot detect a provider placing a secret inside allowed human-readable text. Installed host plugins and scripts in the same browser origin remain trusted. Deployment must preserve Gateway authentication and appropriate transport protection.

The host retains at most 32 attempts and 16 notices per attempt. Each serialized attempt view is at most 32768 UTF-8 bytes. Links permit HTTPS or loopback HTTP without embedded credentials. Capabilities stay in browser memory, not URLs, storage or logs. Errors expose generic reason codes rather than provider exceptions. Cancellation aborts only the selected attempt controller, never authorization.cancel(key). There is no local deletion or issuer-revocation operation.

## Lifecycle and races

Cordis owns the host manager, Remote contribution, dictionaries and footer registration. The declaration-scoped controller clears timers and UI state when the footer disappears; its teardown requests cancellation for its exact capability. Host disposal aborts owned requests, withdraws pending prompts and awaits settlement. Provider disposal follows the existing authorization lifecycle. A prompt-specific signal withdraws only that prompt and is not treated as human decline.

Browser actions and polls carry generation checks so late replies cannot restore older UI state. A short disconnect retains the in-memory handle. Reload loses it and the bounded host lease cancels the abandoned attempt; unload delivery is not required. Terminal views expire without renewal. A provider that ignores abort may still commit later under existing service semantics: cancellation is not rollback. Concurrent prompts fail explicitly; sequential prompts are supported.

## Compatibility and verification

API-key editors, credential references, provider configuration and keyConfigured retain their existing meanings. Authorization success means the service observed its credential commit, not that a model route was configured. Neither package adds tools, model-visible state, account pooling, quotas or provider OAuth logic.

Tests cover the synthetic flow, the registered pi-ai DeepSeek API-key flow with dummy credentials, prompt correlation, stale cancellation, provider disposal, notices, settlement, reload expiry, browser races, prompt rendering and declaration replacement. A separate plain-Node artifact smoke exercises generated Gateway validation. The host smoke also passed outside the checkout after packing and installing 23 local DSH/framework packages against the inspected baseline. No real credentials were used. Full live-browser installation is a separate acceptance limit; component and artifact tests do not certify real OAuth or a deployed browser session.

## Recommendation and stop conditions

Keep the MVP as two opt-in plugins and retain the existing service and Models slots. Complete the branch's remaining validation before considering default composition. Do not build a Provider Editor replacement. If a maintained generic consumer demonstrates equivalent current transport, security, lifecycle and external-install guarantees, prefer contributing these tests and compatibility fixes to it. The next candidate architectural investigation is shared model-row drafts from Discussion #6199, only after validating an actual consumer need.

The [continuation checkpoint](../work/web-authorization-continuation.md) records exact commands, outstanding checks and resume instructions.
