# Stage 57 — DEMO database security gate

This checklist is **not** proof that the database migration has been executed. Never apply SQL blindly.

## Pre-deployment
1. Confirm that the workspace remains on the Free plan and check remaining Cloud/Run credits.
2. Confirm the current auth strategy and whether users can authenticate to Supabase.
3. Verify the proposed SQL in `supabase/migrations/20261102000000_stage56_demo_storage_rls.sql`.
4. Ensure no existing tables/policies conflict; migration must be reviewed for idempotence.
5. Confirm that `anon` and `authenticated` have no INSERT/UPDATE/DELETE permissions; only authenticated owner-scoped SELECT is allowed.
6. Check that `public` schema permissions, inherited roles and default grants do not expose unintended access.
7. The future trusted writer must authenticate owner identity, validate Rita Risk veto and revision/idempotency, and never expose a service-role secret in the browser.

## Tests (required before storing data)
- Anonymous SELECT/INSERT denied.
- User A reads own rows, cannot read user B rows.
- User A cannot INSERT, UPDATE or DELETE even their own rows from the browser.
- Server-side writer fails closed when heartbeat stale, risk veto, quote stale, or snapshot invalid.
- Duplicate event keys and position revisions are rejected.
- No live brokerage keys, exchange orders or real balances.
- Confirm backup/recovery expectations, retention and budget/usage monitoring.

## Current status
- Lovable Cloud PostgreSQL enabled.
- Public application tables absent as of stage-57 inspection.
- Stage-56 SQL exists in GitHub, **not yet applied**.
- This stage creates review documentation only; no data or billing changes.
