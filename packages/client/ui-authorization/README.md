---
description: "Generic authorization directory and prompts in the public Models footer."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-authorization

English | [中文](README.zh.md)

## Summary

Browser consumer of the [Web authorization companion](../../credentials/web-authorization/README.md). It registers at `settings.models.footer` and displays registered methods, progress, notices, text, secret and select prompts. It contains no provider login protocol or credential storage.

## Table of Contents

- [Contract](#contract)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

## Contract

The browser plugin requires Remote, locale and slots, and mounts the generated authorization Remote contribution. The host must supply `webAuthorization` backed by the existing `authorization` service. This is an opt-in plugin; it does not change shipped profiles or existing API-key editors.

| Config | Default | Meaning |
|---|---|---|
| `pollMs` | `1000` | Observation interval; integer milliseconds from 250 to 10000. |

The footer owns a transient attempt capability. Answers include both attempt and prompt identity. Input stays in the keyed prompt component and clears on submission, prompt replacement or unmount. Closing the footer clears state and timers and requests cancellation of its exact attempt. A lost unload request falls back to the host lease. A reload starts without a handle; a short disconnect retains the in-memory handle. Raw transport errors and credential values are never display state.

Settlement reports the authorization service outcome. It does not imply provider configuration, change `keyConfigured`, delete credentials or revoke issuer access.

## Dev Note

No invariant companion is published: the controller is the sole owner of transient observation state. Controller tests cover ambiguous begin replies, expired capabilities, stale polls and disposal races. Component tests cover prompt replacement, secret clearing, select answers and user-output snapshots.

## Model Experience

None, as this package changes browser presentation only.

#### KV Cache effect

None. Authorization state does not enter model context.

## Known Limitations and Deferred Work

- The browser bundle builds and component/Cordis tests pass; a deployed browser session and real OAuth have not been exercised. Host restart loses attempts. Cancellation preserves the service semantics for providers that ignore abort.
