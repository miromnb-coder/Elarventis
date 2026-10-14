# Auth and company accounts final QA — 14.10.2026

## Implemented

- Middleware sends unauthenticated protected pages to login and returns 401 for workspace APIs only when the gate is enabled. Login, signup, recovery, callback and auth API remain reachable without a session after gate activation. With the gate disabled, these app/auth paths stay closed.
- Server calls Supabase `getUser()` for identity. Session tokens are used only for server-side authorized REST calls. The company selector checks active membership and the database RLS provides tenant boundaries.
- Authentication API validates required inputs, enforces same-origin POST, uses cookie-based Supabase SSR auth, blocks password change/logout without a server-verified user, returns generic account recovery responses, and uses fixed same-origin callback destinations. No caller-supplied return URL is accepted.
- Role changes and removals use existing database RPCs. UI and API independently require owner/admin; RPC enforces last-owner, self-promotion and admin limitations. The company selector checks active membership.
- New forward-only migration `20261014082801_company_invitations.sql` is prepared but NOT APPLIED. It defines guarded invitation creation, acceptance and revocation, checks verified recipient email and expiry, and restores removed membership only through authenticated acceptance. It requires review and approval before application.

## Tests performed

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript, ESLint, production build | Pass | Local commands |
| Existing unit tests | 27 pass | `npm test` |
| Live Rivora login appearance | Inspected | Public browser |
| Elarventis login, signup, confirmation, reset, logout | Not tested end-to-end | No test accounts or active gate |
| Owner/admin/analyst/viewer, removed user, two tenants | Not tested end-to-end | No approved seeded tenant fixture |
| Invitation email delivery and acceptance | Not active | Migration unapplied; no delivery integration |
| Viewports 375, 430, 768, 1024, 1440 | Not browser-tested | Chromium download unavailable |

## Activation gates

1. Reconcile remote migration history: the reported applied foundation version is `20261014074833` while the repository foundation file is named `20261013120000_foundation.sql`. Do not re-run or edit the foundation.
2. Review and explicitly approve the separate invitation migration before applying it. Validate existing pending invitations, SQL/RLS security, and tenant isolation in the target project.
3. Configure Supabase Auth redirect allowlist and email sender; test actual confirmation, recovery and invite delivery. An invite mail flow is not implemented yet, so do not enable its UI.
4. Run two-tenant/role/removed-member tests using synthetic accounts and verify cookies, revocation and session expiry on the live integration.
5. Review the published site at all five viewport widths and keyboard access. Keep `ELARVENTIS_MVP_ENABLED=disabled` until these checks pass.

The public contact draft is browser-local and does not send mail. No customer data was introduced and the deterministic audit engine was not modified.
