alter table gateway_configs
  add column if not exists rate_limit_per_minute integer not null default 120,
  add column if not exists allowed_upstream_hosts text[] not null default '{}'::text[],
  add column if not exists blocked_upstream_hosts text[] not null default '{}'::text[];

create index if not exists idx_approval_requests_status on approval_requests(status);
create index if not exists idx_audit_events_event_type on audit_events(event_type);
