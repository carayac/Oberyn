# Oberyn SDK Technical Guide

Last updated: 2026-05-31

## Purpose

The Oberyn SDK connects an application to a project in Oberyn and streams runtime activity into the dashboard. It is designed for application-side instrumentation, not admin access.

The SDK sends events to:

```txt
POST /api/sdk/events
POST /api/sdk/events/batch
POST /api/sdk/heartbeat
```

Authentication uses a project public key in `x-oberyn-key`. This key identifies the project and can only submit SDK telemetry.

Preferred mode uses the `sdk_keys` table created by `database/migrations/002_sdk_ingestion.sql`.

If that table is not migrated yet, the backend can issue a temporary signed public key derived from the project ID. This keeps local development working, but production should use the `sdk_keys` table so keys can be rotated and disabled.

## Install

```bash
npm install oberyn
```

## Initialize

```ts
import { createOberyn } from "oberyn";

export const oberyn = createOberyn({
  apiKey: "ob_pk_...",
  endpoint: "http://localhost:4000/api/sdk/events",
  service: {
    name: "mi-aplicacion",
    provider: "custom",
    type: "app"
  },
  environment: "production",
  captureFetch: true
});
```

## Capture A Manual Event

```ts
oberyn.capture({
  eventType: "business_action",
  actionName: "consultar_cliente",
  decision: "approved",
  riskLevel: "low",
  service: { name: "CRM", provider: "custom", type: "crm" },
  metadata: { module: "support" }
});
```

## Protect A Critical Action

```ts
await oberyn.protect("crear_reembolso", async () => {
  return stripe.refunds.create({ payment_intent: paymentIntentId });
}, {
  riskLevel: "high",
  service: { name: "Stripe", provider: "stripe", type: "payments" },
  payload: { paymentIntentId }
});
```

High-risk events create approval requests automatically.

## What Oberyn Detects

- External APIs called through `fetch` when `captureFetch` is enabled.
- Services and integrations from event metadata.
- Flows by `actionName`.
- Audit events with event hashes.
- Approval requests for high-risk or approval-required events.
- Project activity status.

## Event Shape

```ts
type OberynEvent = {
  eventType?: string;
  actionName: string;
  decision?: "approved" | "blocked" | "requires_approval";
  riskLevel?: "low" | "medium" | "high" | "critical";
  reason?: string;
  service?: {
    name?: string;
    provider?: string;
    type?: string;
    method?: "sdk" | "gateway" | "manual" | "detected";
  };
  metadata?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};
```

## Security

- Do not send provider API keys, passwords, cookies, or authorization headers.
- The SDK strips common sensitive payload keys before capturing `fetch` payload previews.
- Public SDK keys should be rotated if exposed outside the intended application.
- Admin dashboard APIs still use Clerk; SDK ingest APIs use `x-oberyn-key`.

## Maintenance Rule

Every code change that affects SDK initialization, event shape, authentication, batching, fetch capture, approval creation, or audit ingestion must update this document in the same change.
