---
description: "Web Remote interaction over registered authorization flows, with private attempt identities and bounded transient state."
kind: "package-reference"
---

# @deepseek-ai/dsh-web-authorization

English | [中文](README.zh.md)

## Summary

Host companion for `dsh-authorization`. It exposes a generic flow directory and transient conversations through current Remote/Gateway. Providers own login protocols, callbacks and credential writes. The companion never reads credential values. Its browser consumer belongs in the public Models footer; it does not replace the Models editor.

## Table of Contents

- [Contract](#contract)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

## Contract

The plugin requires `authorization`; the application must compose that service with a credential provider. It supplies `webAuthorization` with generated `list`, `begin`, `status`, `answer` and `cancel` Remote methods. Gateway owns transport trust and wire validation. The companion validates action identity and projects provider notices and prompts field by field.

Install both companion packages alongside the existing Harness packages. In a Web composition that already supplies credentials and Gateway, mount these `cordis.yml` rows once. If authorization is already mounted, retain its existing owner and omit the first row. These are ordinary plugins, not a `dsh plugin add` bundle. The installed-package Loader smoke exercised these rows; it did not launch a browser.

```yaml
- name: '@deepseek-ai/dsh-authorization'
- name: '@deepseek-ai/dsh-web-authorization'
  config:
    leaseMs: 60000
- name: '@deepseek-ai/dsh-client-ui-authorization'
  config:
    pollMs: 1000
```

| Config | Default | Meaning |
|---|---|---|
| `leaseMs` | `60000` | Grace period without observation; integer milliseconds from 1000 to 3600000. |

A caller generates a random UUID capability before beginning. The same retained capability and selection recover an ambiguous begin response. The directory exposes no capabilities. Only the holder can observe, answer or cancel that attempt. Capabilities belong in browser memory, never URLs or logs. This is a single trusted Harness host boundary, not isolation from installed host plugins or other scripts in the same browser origin.

Each answer must match the current prompt identity. Select answers must be offered values; text and secret answers are transient. Prompts contain no answer echoes. Settlement carries only `authorized`, `cancelled` or `failed`, never raw provider exceptions. Secret prompts still require the browser to send human input to the host; masking is not encryption.

Status observations renew live leases. Browser reload loses the capability; the host cancels the abandoned attempt on expiry. Short disconnections can resume observation using the retained in-memory capability. Terminal views expire without renewal. Scope disposal aborts owned attempts, rejects pending prompts, removes timers and waits for authorization settlement.

The host retains at most 32 attempts and 16 notices per attempt. Complete serialized attempt views are limited to 32768 UTF-8 bytes; text fields to 2048 bytes and submitted answers to 16384 bytes. Oversized choice prompts fail rather than changing provider identifiers. Links permit HTTPS and loopback HTTP without embedded user credentials. Concurrent prompts fail; sequential text, secret and select prompts are supported.

## Dev Note

No invariant companion is published: attempts and their projected views are updated by one owner, with no independent runtime observation to reconcile. State-machine tests cover stale actions, bounded notices, prompt withdrawal, disposal, lease expiry and unchanged API-key references.

## Model Experience

None, as this package registers no tool, prompt or session event.

#### KV Cache effect

None. Authorization interaction does not enter model context.

## Known Limitations and Deferred Work

- Keyless Loader/Gateway and external tarball smoke tests pass on the inspected baseline. A deployed browser session and real OAuth remain untested. Host restart loses attempts; providers ignoring abort may still commit later. Cancellation promises neither rollback nor issuer revocation. No credential deletion or API-key readiness reinterpretation is provided.
