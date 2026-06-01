# Oberyn Gateway Technical Guide

Last updated: 2026-05-31

## Purpose

The Oberyn Gateway is the proxy-based integration path. Instead of adding instrumentation calls throughout an application, traffic to model providers, APIs, and internal services can be routed through a controlled gateway layer.

The backend exposes project gateway configuration at:

```txt
GET /api/projects/:projectId/gateway/config
PATCH /api/projects/:projectId/gateway/config
POST /api/projects/:projectId/gateway/test
```

These admin endpoints require Clerk authentication and `x-organization-id`.

Runtime gateway traffic is sent to:

```txt
ANY /api/gateway/:projectId/*
```

Runtime requests require the project Gateway token in `Authorization: Bearer <token>` or `x-oberyn-gateway-token`.

## Database

Gateway configuration uses:

```txt
database/migrations/003_gateway_configs.sql
```

Apply this migration to persist Gateway settings. If the table is not present yet, the backend can return a signed temporary config for local development, but production should use the table.

## Recommended Flow

1. Create or select a project.
2. Open the Gateway page for the project.
3. Retrieve the gateway endpoint/configuration.
4. Route outbound AI/API traffic through the gateway URL.
5. The gateway should emit audit events, detect services, apply policies, and create approval requests when risk requires it.

## Target Runtime Behavior

For every proxied request, the gateway should record:

- Project ID.
- Upstream provider/service.
- Action name or route.
- HTTP method and response status.
- Risk level.
- Decision: `approved`, `blocked`, or `requires_approval`.
- Event hash and optional Stellar anchoring metadata.
- Sanitized payload preview.

## Example Target Event

```json
{
  "eventType": "gateway_request",
  "actionName": "POST api.openai.com/v1/chat/completions",
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

- The gateway must never store provider API keys in audit metadata.
- Authorization headers, cookies, tokens, passwords, and secrets must be redacted before storage.
- Gateway traffic should be scoped by project.
- Admin configuration should remain behind Clerk authentication.

## Current Implementation Status

The Gateway module persists configuration, detects services from traffic, blocks sensitive payloads when enabled, writes `audit_events`, updates project activity, and exposes admin controls in the Gateway project page.

## Maintenance Rule

Every code change that affects gateway config, proxy behavior, redaction, event ingestion, policy decisions, approvals, or audit output must update this document in the same change.
