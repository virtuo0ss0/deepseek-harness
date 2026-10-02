---
description: "Complete registered authorization flows through Web prompts while credentials stay on the Host."
kind: "package-reference"
---

# @deepseek-ai/dsh-web-authorization

English | [中文](README.zh.md)

## Summary

Let users complete registered authorization flows from the browser through the [Models footer consumer](../../client/ui-authorization/README.md). Providers retain their login protocols, callbacks and credential writes. The browser receives bounded notices, prompts and outcomes; the companion never reads credential values. Existing API-key editors remain available.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Choose this companion when a registered flow can run through generic notices and text, secret or select prompts. Flows requiring private provider initialization, including the DeepSeek Platform account flow, use their owning account UI.

### Minimal configuration

A Web composition must already supply a credential provider, `authorization` and Gateway. Retain the existing authorization owner from the base profile and mount both companions once. These packages are ordinary plugins, not a `dsh plugin add` bundle.

```yaml
- name: '@deepseek-ai/dsh-web-authorization'
  config:
    leaseMs: 60000
- name: '@deepseek-ai/dsh-client-ui-authorization'
  config:
    pollMs: 1000
```

| Field | Default | Meaning |
|---|---|---|
| `leaseMs` | `60000` | Grace period without observation; integer milliseconds from 1000 to 3600000. |

The [configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-web-authorization) owns the accepted fields. Keep the lease above expected reconnect gaps and the browser polling interval.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The companion projects registered flows through generated Remote/Gateway methods. Gateway owns transport trust and wire validation. The authorization service owns flow execution and per-key locks; providers own credentials and protocols. [The service](src/index.ts) exposes the transport; [the attempt manager](src/attempts.ts) owns transient interactions.

A caller generates a random UUID capability before beginning. The same retained capability and selection recover an ambiguous begin response. The directory exposes no capabilities. Only the holder can observe, answer or cancel that attempt. Capabilities belong in browser memory, never URLs or logs. Installed Host plugins and same-origin browser scripts remain trusted.

Each answer must match the current prompt identity. Select answers must be offered values; text and secret answers are transient and never echoed. Settlement carries only `authorized`, `cancelled` or `failed`, never raw provider exceptions. Providers must keep notices and prompt metadata free of credentials. Secret masking does not encrypt the browser-to-Host request.

Status observations renew live leases. Reload loses the capability; expiry withdraws abandoned work. Brief disconnects retain the in-memory capability. Terminal views expire without renewal. Scope disposal rejects pending prompts, removes timers and awaits authorization settlement, including admitted writes after view expiry. Admission occurs inside the credential provider mutation callback; cancellation after admission does not roll back persistence.

The Host retains at most 32 attempts and 16 notices per attempt. Complete serialized attempt views are limited to 32768 UTF-8 bytes; text fields to 2048 bytes and submitted answers to 16384 bytes. Oversized choice prompts fail rather than changing identifiers. Links permit HTTPS and loopback HTTP without embedded user credentials. Concurrent prompts fail; sequential prompts are supported.

No invariant companion is published: attempts and projected views are updated by one owner, without an independent observation to reconcile.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Authorization service](../authorization/README.md) — registration, admission and shutdown settlement.
- [Browser consumer](../../client/ui-authorization/README.md) — public Models footer and polling configuration.
- [Credentials reference](../../../docs/subsystems/credentials.md) — credential and authorization APIs.
- [API Gateway](../../../docs/api-gateway.md) — generated Remote transport.

-----

<a id="model-experience"></a>
## Model Experience

None, as this package registers no tool, prompt or session event.

#### KV Cache effect

None. Authorization interaction does not enter model context.

## Known Limitations and Deferred Work

The companion transports interactions; provider readiness and credential management remain with their owners.

- Host restart loses attempts. Providers writing through a credential adapter directly retain responsibility for their cancellation ordering.
- Cancellation promises neither rollback nor issuer revocation. The companion does not delete credentials or reinterpret API-key readiness.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

The current 0.2.0-rc.2 port passed 94/94 focused tests, 442/442 relevant upstream integration tests and 12/12 deployed-browser E2E scenarios without skips. Fresh packed installation and both plain-Node Gateway/Loader checks passed. Installed Gateway/Loader checks verify package composition; deployed-browser scenarios verify browser behavior.

Real `llm-pi-ai/openai-codex` OAuth on the current 0.2.0-rc.2 port completed through the generic Web companion with human login and consent. The matching settlement reported `authorized`; `describeRecord()` confirmed `configured: true`, `kind: grant`, and `writable: true`.

The prompt and active attempt cleared, and the human confirmed a successful page reload with no retained interaction. The grant survived a graceful Host restart without another login. Cleanup deleted only the isolated test credential, confirmed `configured: false` through `describeRecord()`, and gracefully stopped the isolated Host; ports 3080/1455 were free.

Model inference, token refresh and issuer-side revocation were not tested. Verification used credential descriptors without inspecting payloads.

Real OpenAI Codex OAuth (`llm-pi-ai/openai-codex`) also succeeded independently on the historical `feat/web-authorization-v017` implementation based on 0.1.7-rc.1. Metadata confirmed persistence after page reload and graceful Host restart; that isolated credential was then deleted.

The complete shutdown guarantee requires the patched AuthorizationService from PR-A (`eee38bf001c41f62be109d01dab5687ab8744eef`). Unmodified upstream 0.2.0-rc.2 does not include that fix; a version range alone does not establish the guarantee.

</details>
