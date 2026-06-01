alter table organizations enable row level security;
alter table projects enable row level security;
alter table integrations enable row level security;
alter table bots enable row level security;
alter table flows enable row level security;
alter table rules enable row level security;
alter table approval_requests enable row level security;
alter table audit_events enable row level security;
alter table exceptions enable row level security;
alter table manual_services enable row level security;
alter table project_api_keys enable row level security;
alter table policy_decisions enable row level security;
alter table sdk_events enable row level security;
alter table gateway_events enable row level security;

-- Oberyn routes sensitive reads and writes through the backend, using Clerk
-- session validation and the Supabase service role where appropriate.
-- Frontend code should not access sensitive Supabase tables directly.

create policy "Backend service role can manage organizations" on organizations
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Backend service role can manage projects" on projects
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Backend service role can manage integrations" on integrations
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Backend service role can manage bots" on bots
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Backend service role can manage flows" on flows
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Backend service role can manage rules" on rules
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Backend service role can manage approvals" on approval_requests
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Backend service role can manage audit events" on audit_events
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Backend service role can manage exceptions" on exceptions
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Backend service role can manage manual services" on manual_services
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Backend service role can manage project api keys" on project_api_keys
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Backend service role can manage policy decisions" on policy_decisions
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Backend service role can manage sdk events" on sdk_events
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Backend service role can manage gateway events" on gateway_events
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
