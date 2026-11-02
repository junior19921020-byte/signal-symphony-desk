# Stage 60 — safe DEMO database integration contract

## Current verified facts
- Lovable Cloud PostgreSQL enabled.
- public.demo_position_snapshots and public.demo_risk_events created, empty.
- RLS enabled + forced on both.
- authenticated SELECT scoped by auth.uid() = owner_id.
- anon SELECT denied; authenticated INSERT/UPDATE/DELETE denied.
- No auth users were present at last inspection.
- No application Supabase client found at conventional src/integrations/supabase/client.ts; app uses TanStack Start.

## Integration requirements (NOT yet implemented)
1. Identify actual TanStack Start route structure and existing session/auth provider before editing code.
2. Decide whether to enable Supabase Auth, and create isolated test identities only with approval.
3. Read-only application integration must use end-user session and publishable/anon key, never service_role.
4. No service_role, database password, brokerage credentials or exchange secrets in client bundles, localStorage, or git.
5. Never infer owner_id from untrusted browser input for privileged writes.
6. Trusted server write endpoint requires authenticated owner, Rita Risk veto, fresh heartbeat, quote freshness, snapshot revision/idempotency, schema validation, and audit trail; fail closed on any missing signal.
7. Keep existing local DEMO behavior as fallback until real two-user isolation tests pass. Do not represent fallback as server-side SL/TP protection.
8. Review Lovable Free Cloud usage before enabling background workloads or recurring jobs.

## Acceptance tests
- Anonymous user cannot read either table.
- Signed-in A can read A's data but not B's; signed-in B cannot read A's.
- Neither A nor B can INSERT, UPDATE, DELETE via browser.
- Server writer rejects stale heartbeat, risk veto, stale quotes, invalid snapshot and duplicate revisions.
- No real broker integration, no real funds, no background trading enabled.
- Explicit operator approval required before first persistent write or deployment.

**Status:** integration contract only. This file does not connect the app or deploy a writer.
