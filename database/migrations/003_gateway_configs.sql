create table if not exists gateway_configs (
  project_id uuid primary key references projects(id) on delete cascade,
  upstream_base_url text not null default 'https://api.openai.com',
  gateway_token text not null,
  environment text not null default 'production',
  inspect_prompts boolean not null default true,
  block_sensitive_data boolean not null default true,
  audit_enabled boolean not null default true,
  apply_project_rules boolean not null default true,
  status text not null default 'operative',
  last_request_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gateway_configs_status on gateway_configs(status);
