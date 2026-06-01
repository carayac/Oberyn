# Oberyn Gateway Technical Guide

Last updated: 2026-06-01

## Purpose

The Oberyn Gateway is the proxy-based integration path. Applications route outbound traffic to models, APIs, and internal services through Oberyn so each request can be inspected, controlled, audited, and then forwarded to the real provider.

The Gateway does not store provider API keys. The calling application sends provider credentials per request through upstream headers, and Oberyn redacts sensitive data before storing audit metadata.

## Admin Endpoints

```txt
GET /api/projects/:projectId/gateway/config
PATCH /api/projects/:projectId/gateway/config
POST /api/projects/:projectId/gateway/test
```

These endpoints require Clerk authentication and `x-organization-id`.

## Runtime Endpoint

```txt
ANY /api/gateway/:projectId/*
```

Runtime requests require the project Gateway token in `Authorization: Bearer <token>` or `x-oberyn-gateway-token`.

Provider credentials are forwarded with one of these request headers:

```txt
x-oberyn-upstream-authorization: Bearer <provider_api_key>
x-provider-authorization: Bearer <provider_api_key>
x-upstream-authorization: Bearer <provider_api_key>
```

For providers that use `x-api-key`, send:

```txt
x-oberyn-upstream-api-key: <provider_api_key>
```

If a request returns `requires_approval`, approve it in Oberyn and retry the same request with:

```txt
x-oberyn-approval-id: <approval_id>
```

## Database

Gateway configuration uses:

```txt
database/migrations/003_gateway_configs.sql
```

Production should use the persisted `gateway_configs` table so tokens, settings, and activity can be managed per project.

## Runtime Behavior

For every proxied request, the Gateway:

1. Validates the project Gateway token.
2. Detects the likely service or provider from route and payload.
3. Creates or updates the project integration record.
4. Evaluates project rules and sensitive-data policy.
5. Blocks or requires approval before forwarding when rules demand it.
6. Allows approved retries when `x-oberyn-approval-id` matches an approved request.
7. Enforces per-project Gateway rate limits.
8. For approved requests, forwards the request to the configured upstream base URL.
9. Streams SSE responses when the provider returns `text/event-stream`.
10. Supports JSON and raw binary/multipart bodies for Gateway traffic.
11. Returns the upstream provider response to the caller.
12. Records an audit event with status, duration, risk, decision, service, route, and redacted payload preview.

Gateway responses include:

```txt
x-oberyn-decision
x-oberyn-risk-level
x-oberyn-rate-limit
x-oberyn-rate-limit-remaining
x-oberyn-rate-limit-reset
```

## Example Request

```bash
curl -X POST http://localhost:4000/api/gateway/<project-id>/v1/chat/completions \
  -H "Authorization: Bearer gw_..." \
  -H "x-oberyn-approval-id: APPROVAL_ID_SI_APLICA" \
  -H "x-oberyn-upstream-authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Hola"}]}'
```

## Audit Event Shape

```json
{
  "eventType": "gateway_request",
  "actionName": "POST /v1/chat/completions",
  "decision": "approved",
  "riskLevel": "medium",
  "service": {
    "name": "OpenAI",
    "provider": "openai",
    "type": "llm",
    "method": "gateway"
  },
  "metadata": {
    "method": "POST",
    "status": 200,
    "durationMs": 431
  }
}
```

## Security

- The Gateway must never store provider API keys in audit metadata.
- Authorization headers, cookies, tokens, passwords, and secrets must be redacted before storage.
- Gateway traffic is scoped by project.
- Admin configuration stays behind Clerk authentication.
- If `blockSensitiveData` is enabled, requests with detected secrets or sensitive data are blocked before they reach the provider.
- Use `allowedUpstreamHosts` and `blockedUpstreamHosts` to constrain which hosts a project can call.

## Local Real-Project Test

```bash
set OBERYN_PROJECT_ID=<project-id>
set OBERYN_GATEWAY_TOKEN=gw_...
set PROVIDER_API_KEY=<provider-key>
node examples/gateway-openai-demo.mjs
```

## Current Implementation Status

The Gateway persists configuration, forwards approved traffic to the upstream provider, supports approved retries, streams SSE responses, handles JSON and raw bodies, enforces rate limits, constrains upstream hosts, detects services from traffic, applies project rules, blocks sensitive payloads when enabled, creates approval requests when required, writes `audit_events`, updates project activity, and exposes admin controls in the Gateway project page.

## Maintenance Rule

Every code change that affects gateway config, proxy behavior, redaction, event ingestion, policy decisions, approvals, forwarding, or audit output must update this document in the same change.
