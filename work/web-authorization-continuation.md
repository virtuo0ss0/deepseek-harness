# Web authorization v017 continuation

## Completed

- Created a separate real checkout from upstream master at release 0.1.7-rc.1 on `feat/web-authorization-v017`; origin remains the writable fork.
- Historical `feat/web-authorization` and its six commits remain unchanged.
- Source compatibility audit completed: generic consumer gap remains. See [audit](web-authorization-compatibility-audit.md).

## Decisions

- Preserve two opt-in packages, current generated unary Remote/Gateway and public Models footer.
- Existing authorization service owns locks, protocols and writes. Respect the new admitted-commit cancellation semantics.
- New DeepSeek account UI is provider-specific; do not duplicate it or pretend its private-initialization flow is generically startable.
- Port source/tests intentionally, use current package version/ranges, regenerate catalogs and lockfile. No core runtime change planned.

## Next step and files

- Finish pinned dependency installation, execute current authorization baseline tests, then commit/push this audit milestone.
- Next port source/tests for `packages/credentials/web-authorization` and `packages/client/ui-authorization`; add admitted-commit race coverage before broader verification.
- Current edited files: this checkpoint and `work/web-authorization-compatibility-audit.md` only.

## Validation and blockers

- Git/source audit completed; runtime checks pending.
- Default sandbox dependency downloads failed with EACCES; identical frozen install is running with permitted host access. Log: `../web-authorization-v017-install.log`.
- No browser or OAuth testing, publication, PR or upstream modification authorized or performed. Push only new-branch milestones to the fork.
