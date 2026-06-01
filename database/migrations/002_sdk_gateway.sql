create table if not exists project_api_keys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default array['sdk:evaluate', 'sdk:audit', 'gateway:proxy'],
  status text not null default 'active' check (status in ('active', 'revoked')),
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists policy_decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  api_key_id uuid references project_api_keys(id) on delete set null,
  source text not null check (source in ('sdk', 'gateway')),
  subject text,
  action_name text not null,
  service text not null,
  risk_level text not null default 'low',
  decision text not null check (decision in ('allow', 'block', 'requires_approval')),
  reason text not null,
  matched_rules jsonb not null default '[]'::jsonb,
  payload_preview jsonb not null default '{}'::jsonb,
  request_hash text,
  created_at timestamptz not null default now()
);

create table if not exists sdk_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  decision_id uuid references policy_decisions(id) on delete set null,
  api_key_id uuid references project_api_keys(id) on delete set null,
  subject text,
  action_name text not null,
  service text not null,
  risk_level text not null default 'low',
  decision text not null,
  execution_status text not null default 'not_executed',
  latency_ms integer,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists gateway_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  decision_id uuid references policy_decisions(id) on delete set null,
  api_key_id uuid references project_api_keys(id) on delete set null,
  provider text not null,
  upstream_path text not null,
  method text not null,
  decision text not null,
  status_code integer,
  latency_ms integer,
  request_body jsonb not null default '{}'::jsonb,
  response_body jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

alter table integrations add column if not exists first_detected_at timestamptz;
alter table integrations add column if not exists last_detected_via text;
alter table sdk_events add column if not exists subject text;
alter table sdk_events add column if not exists request_payload jsonb not null default '{}'::jsonb;
alter table sdk_events add column if not exists response_payload jsonb not null default '{}'::jsonb;
alter table sdk_events add column if not exists error_message text;
alter table gateway_events add column if not exists upstream_path text;
update gateway_events set upstream_path = coalesce(upstream_path, upstream_url, '/') where upstream_path is null;
alter table gateway_events alter column upstream_path set not null;
alter table gateway_events add column if not exists request_body jsonb not null default '{}'::jsonb;
alter table gateway_events add column if not exists response_body jsonb not null default '{}'::jsonb;
alter table gateway_events add column if not exists error_message text;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'gateway_events' and column_name = 'upstream_url'
  ) then
    alter table gateway_events alter column upstream_url drop not null;
  end if;
end $$;

create index if not exists idx_project_api_keys_project_id on project_api_keys(project_id);
create index if not exists idx_policy_decisions_project_id on policy_decisions(project_id);
create index if not exists idx_sdk_events_project_id on sdk_events(project_id);
create index if not exists idx_gateway_events_project_id on gateway_events(project_id);

alter table project_api_keys enable row level security;
alter table policy_decisions enable row level security;
alter table sdk_events enable row level security;
alter table gateway_events enable row level security;

drop policy if exists "Backend service role can manage project api keys" on project_api_keys;
create policy "Backend service role can manage project api keys" on project_api_keys
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Backend service role can manage policy decisions" on policy_decisions;
create policy "Backend service role can manage policy decisions" on policy_decisions
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Backend service role can manage sdk events" on sdk_events;
create policy "Backend service role can manage sdk events" on sdk_events
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Backend service role can manage gateway events" on gateway_events;
create policy "Backend service role can manage gateway events" on gateway_events
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
