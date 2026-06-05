create table if not exists payment_agents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'blocked')),
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high')),
  max_amount numeric not null default 0,
  can_create_payment_request boolean not null default true,
  can_approve_payment boolean not null default false,
  can_execute_payment boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists trusted_wallets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  recipient_name text not null,
  wallet_address text not null,
  is_verified boolean not null default false,
  token text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, wallet_address)
);

create table if not exists payment_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  agent_id uuid not null references payment_agents(id) on delete restrict,
  recipient_name text not null,
  recipient_wallet text not null,
  amount numeric not null,
  token text not null,
  reason text not null,
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high')),
  status text not null default 'pending_approval' check (
    status in ('draft', 'pending_approval', 'requires_multi_approval', 'approved', 'rejected', 'blocked', 'escrow_created', 'funded', 'released', 'failed')
  ),
  policy_applied jsonb not null default '[]'::jsonb,
  audit_hash text not null,
  escrow_id text,
  tx_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payment_approvals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  payment_request_id uuid not null references payment_requests(id) on delete cascade,
  actor_id text not null,
  status text not null check (status in ('approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists payment_audit_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  payment_request_id uuid not null references payment_requests(id) on delete cascade,
  agent_id uuid not null references payment_agents(id) on delete restrict,
  action text not null,
  previous_status text,
  new_status text not null,
  actor_type text not null check (actor_type in ('agent', 'human', 'system')),
  actor_id text not null,
  timestamp timestamptz not null default now(),
  action_hash text not null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_payment_agents_project_id on payment_agents(project_id);
create index if not exists idx_trusted_wallets_project_id on trusted_wallets(project_id);
create index if not exists idx_trusted_wallets_wallet_address on trusted_wallets(project_id, wallet_address);
create index if not exists idx_payment_requests_project_id on payment_requests(project_id);
create index if not exists idx_payment_requests_status on payment_requests(project_id, status);
create index if not exists idx_payment_approvals_request_id on payment_approvals(payment_request_id);
create index if not exists idx_payment_audit_logs_project_id on payment_audit_logs(project_id);
create index if not exists idx_payment_audit_logs_request_id on payment_audit_logs(payment_request_id);

alter table payment_agents enable row level security;
alter table trusted_wallets enable row level security;
alter table payment_requests enable row level security;
alter table payment_approvals enable row level security;
alter table payment_audit_logs enable row level security;

create policy "Backend service role can manage payment agents" on payment_agents
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Backend service role can manage trusted wallets" on trusted_wallets
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Backend service role can manage payment requests" on payment_requests
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Backend service role can manage payment approvals" on payment_approvals
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Backend service role can manage payment audit logs" on payment_audit_logs
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
