-- Stage 58: READ-ONLY preflight. Safe to run before applying DEMO schema.
-- Do not mistake a successful preflight for RLS cross-user validation.
select current_database() as database_name,
       (select count(*) from information_schema.tables where table_schema = 'public') as public_tables,
       (select count(*) from pg_policies where schemaname = 'public') as public_policies,
       (select count(*) from auth.users) as registered_users;

-- Confirm whether either DEMO table already exists.
select to_regclass('public.demo_position_snapshots') as demo_position_snapshots,
       to_regclass('public.demo_risk_events') as demo_risk_events;

-- Inspect existing table-level grants (if the tables exist).
select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('demo_position_snapshots', 'demo_risk_events')
order by table_name, grantee, privilege_type;

-- Actual isolation tests REQUIRE two test auth users and controlled sessions.
-- No user creation, schema writes, inserts, or financial actions in this preflight.
