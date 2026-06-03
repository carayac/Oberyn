create table if not exists stellar_anchor_batches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  root_hash text not null,
  event_count integer not null default 0,
  status text not null default 'pending',
  network text not null default 'testnet',
  tx_hash text,
  ledger bigint,
  operation text not null default 'manage_data',
  source_public_key text,
  explorer_url text,
  error_message text,
  submitted_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stellar_anchor_batch_events (
  batch_id uuid not null references stellar_anchor_batches(id) on delete cascade,
  audit_event_id uuid not null references audit_events(id) on delete cascade,
  event_hash text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  primary key (batch_id, audit_event_id)
);

create table if not exists stellar_anchor_attempts (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references stellar_anchor_batches(id) on delete cascade,
  status text not null,
  tx_hash text,
  ledger bigint,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_stellar_anchor_batches_project_id on stellar_anchor_batches(project_id);
create index if not exists idx_stellar_anchor_batches_status on stellar_anchor_batches(status);
create index if not exists idx_stellar_anchor_batch_events_event_id on stellar_anchor_batch_events(audit_event_id);
create index if not exists idx_audit_events_anchor_status on audit_events(project_id, anchored_at, stellar_tx_hash);
