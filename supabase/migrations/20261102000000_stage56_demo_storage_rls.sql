-- Stage 56: review-only proposal. NOT applied to Lovable Cloud.
-- DEMO-only server-owned storage. No real trading credentials or exchange orders.
begin;

create table if not exists public.demo_position_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  position_key text not null,
  revision bigint not null check (revision >= 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  recorded_at timestamptz not null default now(),
  unique (owner_id, position_key, revision)
);

create index if not exists demo_position_snapshots_owner_latest
  on public.demo_position_snapshots (owner_id, position_key, revision desc);

create table if not exists public.demo_risk_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  event_type text not null check (event_type in ('PAUSA', 'VETO', 'HEARTBEAT', 'QUOTE_STALE', 'SNAPSHOT_REJECTED')),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  occurred_at timestamptz not null default now(),
  unique (owner_id, event_key)
);

create index if not exists demo_risk_events_owner_time
  on public.demo_risk_events (owner_id, occurred_at desc);

alter table public.demo_position_snapshots enable row level security;
alter table public.demo_position_snapshots force row level security;
alter table public.demo_risk_events enable row level security;
alter table public.demo_risk_events force row level security;

-- Signed-in users may read only their own DEMO data.
create policy "demo_snapshots_owner_read" on public.demo_position_snapshots
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "demo_risk_events_owner_read" on public.demo_risk_events
  for select to authenticated using ((select auth.uid()) = owner_id);

-- Deliberately NO insert/update/delete policies for authenticated/anon.
-- Future writes must be through a separately reviewed trusted server,
-- with ownership, revision, idempotency and Rita Risk checks enforced.
revoke all on public.demo_position_snapshots from anon;
revoke all on public.demo_risk_events from anon;
grant select on public.demo_position_snapshots to authenticated;
grant select on public.demo_risk_events to authenticated;
revoke insert, update, delete on public.demo_position_snapshots from authenticated;
revoke insert, update, delete on public.demo_risk_events from authenticated;

commit;
