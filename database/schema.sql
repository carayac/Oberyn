create extension if not exists "pgcrypto";

create table organizations (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text unique not null,
  name text not null,
  slug text unique not null,
  organization_type text,
  description text,
  region text not null default 'us',
  website text,
  owner_user_id text,
  status text not null default 'active',
  settings jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  project_type text not null,
  environment text not null default 'sandbox',
  connection_mode text not null check (connection_mode in ('sdk', 'gateway', 'manual', 'detected')),
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table integrations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  provider text not null,
  service_type text not null,
  connection_method text not null check (connection_method in ('sdk', 'gateway', 'manual', 'detected')),
  status text not null default 'pending',
  coverage numeric not null default 0,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table bots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  identifier text not null,
  role text not null,
  description text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, identifier)
);

create table flows (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  description text,
  bot_id uuid references bots(id) on delete set null,
  action_key text,
  service_id uuid references integrations(id) on delete set null,
  environment text not null default 'sandbox',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table rules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  description text,
  category text not null,
  severity text not null,
  condition_type text not null,
  action_result text not null,
  scope text not null default 'project',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table approval_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  bot_id uuid references bots(id) on delete set null,
  integration_id uuid references integrations(id) on delete set null,
  action_name text not null,
  risk_level text not null,
  status text not null default 'pending_approval',
  reason text,
  payload_preview jsonb not null default '{}'::jsonb,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table payment_agents (
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

create table trusted_wallets (
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

create table payment_requests (
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

create table payment_approvals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  payment_request_id uuid not null references payment_requests(id) on delete cascade,
  actor_id text not null,
  status text not null check (status in ('approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table payment_audit_logs (
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

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  bot_id uuid references bots(id) on delete set null,
  integration_id uuid references integrations(id) on delete set null,
  event_type text not null,
  action_name text not null,
  decision text not null,
  risk_level text not null,
  event_hash text,
  merkle_root text,
  stellar_tx_hash text,
  stellar_network text,
  anchored_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table exceptions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  exception_type text not null,
  name text not null,
  description text,
  bot_id uuid references bots(id) on delete set null,
  flow_id uuid references flows(id) on delete set null,
  integration_id uuid references integrations(id) on delete set null,
  action_key text,
  environment text not null default 'sandbox',
  skip_review boolean not null default false,
  skip_approval boolean not null default false,
  audit_level text not null default 'standard',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table manual_services (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  provider text not null,
  status text not null default 'manual',
  activity_status text not null default 'no_activity',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sdk_keys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null default 'Default SDK key',
  public_key text unique not null,
  status text not null default 'active',
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table gateway_configs (
  project_id uuid primary key references projects(id) on delete cascade,
  upstream_base_url text not null default 'https://api.openai.com',
  gateway_token text not null,
  environment text not null default 'production',
  inspect_prompts boolean not null default true,
  block_sensitive_data boolean not null default true,
  audit_enabled boolean not null default true,
  apply_project_rules boolean not null default true,
  rate_limit_per_minute integer not null default 120,
  allowed_upstream_hosts text[] not null default '{}'::text[],
  blocked_upstream_hosts text[] not null default '{}'::text[],
  status text not null default 'operative',
  last_request_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_projects_organization_id on projects(organization_id);
create index idx_integrations_project_id on integrations(project_id);
create index idx_bots_project_id on bots(project_id);
create index idx_flows_project_id on flows(project_id);
create index idx_rules_project_id on rules(project_id);
create index idx_approval_requests_project_id on approval_requests(project_id);
create index idx_payment_agents_project_id on payment_agents(project_id);
create index idx_trusted_wallets_project_id on trusted_wallets(project_id);
create index idx_trusted_wallets_wallet_address on trusted_wallets(project_id, wallet_address);
create index idx_payment_requests_project_id on payment_requests(project_id);
create index idx_payment_requests_status on payment_requests(project_id, status);
create index idx_payment_approvals_request_id on payment_approvals(payment_request_id);
create index idx_payment_audit_logs_project_id on payment_audit_logs(project_id);
create index idx_payment_audit_logs_request_id on payment_audit_logs(payment_request_id);
create index idx_audit_events_project_id on audit_events(project_id);
create index idx_exceptions_project_id on exceptions(project_id);
create index idx_manual_services_project_id on manual_services(project_id);
create index idx_sdk_keys_project_id on sdk_keys(project_id);
create index idx_sdk_keys_public_key on sdk_keys(public_key);
create index idx_gateway_configs_status on gateway_configs(status);
