# Agent Note: Web authorization companion

Status: proposed

## Problem

Registered authorization flows lack a generic stock browser consumer on this baseline. Provider-specific panels duplicate interaction transport despite existing authorization and Models footer extensions.

## Proposal

Use current generated Remote methods over an attempt-owned interaction manager, then a generic Models footer browser consumer. Keep credentials and OAuth execution in their existing owners. Cancel using the attempt's request signal, never the credential key: a delayed cancel must not reach a newer attempt. Use random browser capabilities and host prompt identities, with no persistent browser storage. A bounded observation lease releases abandoned attempts after reload without requiring an unload request to arrive.

## Alternatives considered

**Provider Editor API:** existing public slots already support this consumer; replacing an editor adds no required capability.

**Old apiproxy transport:** Discussion #4626 demonstrates interaction semantics but predates current Remote/Gateway. Reusing its key-based attempt addressing would retain stale cancellation hazards.

**Existing consumers:** account-authorization depends on unavailable model-target metadata and refuses required text/secret prompts; the Codex Web bridge documents an older alpha and custom HTTP routes. Neither establishes the requested equivalent on this baseline.

## Acceptance criteria

Verify real Gateway and Loader composition, synthetic and catalog flows, API-key preservation, prompt/attempt correlation, provider and consumer disposal, reconnect and reload expiry, browser output, generated packaging, lint, typecheck and a packed external installation.

## Risks

Lease expiry intentionally loses reload continuity and can interrupt a slow reconnection. Host plugins and same-origin scripts remain trusted. A provider that ignores abort may still commit later under existing authorization semantics. Sequential prompts are supported; concurrent prompts fail explicitly. Current state-machine tests do not yet establish production browser or external-package compatibility.
