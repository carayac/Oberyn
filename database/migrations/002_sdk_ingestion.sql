create table if not exists sdk_keys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null default 'Default SDK key',
  public_key text unique not null,
  status text not null default 'active',
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sdk_keys_project_id on sdk_keys(project_id);
create index if not exists idx_sdk_keys_public_key on sdk_keys(public_key);
