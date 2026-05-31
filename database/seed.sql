insert into organizations (id, clerk_org_id, name, slug, region)
values ('00000000-0000-0000-0000-000000000001', 'clerk_org_demo', 'Acme AI', 'acme-ai', 'us')
on conflict (id) do nothing;

insert into projects (id, organization_id, name, slug, description, project_type, environment, connection_mode, status)
values ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Copiloto Operativo', 'copiloto-operativo', 'Proyecto demo para estructura base.', 'ai_agent', 'sandbox', 'sdk', 'active')
on conflict (id) do nothing;

insert into integrations (id, project_id, name, provider, service_type, connection_method, status, coverage)
values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'OpenAI', 'openai', 'llm', 'gateway', 'protected', 80),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000101', 'CRM interno', 'custom', 'crm', 'manual', 'no_activity', 0)
on conflict (id) do nothing;

insert into bots (id, project_id, name, identifier, role, status)
values ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000101', 'Assistant Bot', 'assistant-bot', 'support_agent', 'active')
on conflict (id) do nothing;

insert into rules (id, project_id, name, category, severity, condition_type, action_result, scope)
values ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000101', 'Revisión para acciones críticas', 'approval', 'high', 'risk_level', 'require_approval', 'project')
on conflict (id) do nothing;

insert into manual_services (id, project_id, name, provider, status, activity_status, note)
values ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000101', 'CRM interno', 'custom', 'manual', 'no_activity', 'Manual / Sin actividad hasta recibir tráfico por SDK o Gateway.')
on conflict (id) do nothing;

