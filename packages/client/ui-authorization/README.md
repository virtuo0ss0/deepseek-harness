---
description: "Complete registered authorization methods in Models settings with transient browser prompts."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-authorization

English | [中文](README.zh.md)

## Summary

Choose a registered authorization method in Models settings, follow its notices and answer text, secret or select prompts. The [Host companion](../../credentials/web-authorization/README.md) runs the flow while credentials stay on the Host. The footer contains no provider login protocol or credential store and leaves existing API-key editors unchanged.

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

Mount this opt-in browser consumer with the [Host companion](../../credentials/web-authorization/README.md#use-this-package) in an existing Web composition. Remote, locale, slots and the public `settings.models.footer` declaration must be available. Shipped profiles do not enable the companions automatically.

| Field | Default | Meaning |
|---|---|---|
| `pollMs` | `1000` | Observation interval; integer milliseconds from 250 to 10000. |

The [configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-client-ui-authorization) owns the accepted fields. Keep the Host lease above expected reconnect gaps and this interval.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The [Host entry](src/index.ts) publishes only validated `pollMs` through the Webserver's structured page bootstrap. Browser entries receive no Host Loader config argument. Missing page data uses the schema default; malformed supplied data prevents mounting. Host configuration changes take effect after page reload; a plugin mounted later in an open page uses that page's value.

The [browser entry](src/client/index.ts) mounts the generated authorization Remote contribution and registers one controller per footer declaration lifetime. Sequential polling retains an in-memory attempt across brief disconnects and ignores late responses from prior controller generations. Closing the footer or disposing its plugin clears state and timers and requests cancellation of the exact owned attempt. A lost unload request falls back to the Host lease. Reload starts without a capability.

Answers carry both attempt and prompt identity. Input stays in the keyed prompt component and clears on submission, prompt replacement or unmount. Answers are absent from controller snapshots and browser storage. Clearing UI references does not guarantee JavaScript heap erasure. Raw transport errors and credential values are never display state.

Settlement reports the authorization service outcome. It does not imply provider configuration, reinterpret `keyConfigured`, delete credentials or revoke issuer access. No invariant companion is published: the controller is the sole owner of transient observation state.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Host companion](../../credentials/web-authorization/README.md) — mounting, leases and bounded state.
- [Authorization service](../../credentials/authorization/README.md) — registered flows and durable writes.
- [Slots reference](../../../docs/subsystems/slots.md) — declaration ownership and disposal.
- [Web Client architecture](../../../docs/subsystems/web-client.md) — browser boot and generated Remote communication.

-----

<a id="model-experience"></a>
## Model Experience

None, as this package changes browser presentation only.

#### KV Cache effect

None. Authorization state does not enter model context.

## Known Limitations and Deferred Work

The footer owns a transient conversation, not provider initialization or credential management.

- Host restart loses attempts. Cancellation preserves admitted writes and never implies rollback.
- Flows requiring private provider initialization must use their owning UI.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

The [Host companion's Dev Note](../../credentials/web-authorization/README.md#dev-note) records the completed 0.2.0-rc.2 focused, upstream integration, deployed-browser and fresh packed Gateway/Loader checks.

The current port also completed real `llm-pi-ai/openai-codex` OAuth through this generic consumer with human login and consent. The matching settlement was `authorized`, with configured, writable grant metadata. Prompts and active attempts cleared; manual page reload and grant persistence across graceful Host restart passed without another login. Cleanup deleted only the isolated test credential, confirmed it unconfigured, and gracefully stopped the isolated Host.

The historical 0.1.7-based OAuth acceptance remains a separate result. Model inference, token refresh and issuer-side revocation were not tested.

The complete shutdown guarantee requires PR-A's patched AuthorizationService, which unmodified upstream 0.2.0-rc.2 does not include. Installed Gateway/Loader verification remains distinct from deployed-browser acceptance.

</details>
