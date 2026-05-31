alter table organizations add column if not exists organization_type text;
alter table organizations add column if not exists description text;
alter table organizations add column if not exists website text;
alter table organizations add column if not exists owner_user_id text;
alter table organizations add column if not exists status text not null default 'active';
alter table organizations add column if not exists settings jsonb not null default '{}'::jsonb;
alter table organizations add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_organizations_owner_user_id on organizations(owner_user_id);
