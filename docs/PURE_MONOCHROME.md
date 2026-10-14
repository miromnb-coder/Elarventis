# Pure Monochrome — visual release notes (2026-10-14)

Scope: marketing homepage, login/registration/recovery, active-account app shell, cards, tables, status styles, workspace settings, public synthetic /demo.

Principles:
- Neutral-only black, white and greys. No coral/peach accent.
- Consistent accessible focus styling; status is conveyed by text and border treatment, not colour alone.
- Purely presentational changes to authenticated app pages; auth, audit and API logic unchanged.
- /demo is isolated: local React state, hardcoded fictional sample data, no fetch or Supabase calls, no mutation, no genuine customer or user data.
- Production gate ELARVENTIS_MVP_ENABLED must remain disabled until live auth/tenant-isolation/RLS/Storage/full-audit workflow tests and separate launch checks pass.
- Review visual rendering on widths 375, 430, 768, 1024, and 1440 before final release.

Changes intended for independent review in a feature-branch PR; no database migrations, environment variables, or secrets modified.
