# Oberyn SDK Technical Guide

Last updated: 2026-06-01

## Purpose

The Oberyn SDK protects prompts and critical actions from inside the customer's own code. Provider credentials stay in the customer's infrastructure; Oberyn receives prompt/action context, evaluates project rules, returns a decision, and records audit evidence.

The SDK organizes Oberyn runtime protection into one package:

- Prompt protection: prompt/API inspection, local PII masking, risk scoring, and audit.
- Action control: tool-call/action guardrails, approvals, dry-run support, and audit.
- `capture` / `track`: telemetry for lower-risk events and activity discovery.

## Runtime Endpoints

```txt
POST /api/sdk/evaluate
POST /api/sdk/audit
POST /api/sdk/events
POST /api/sdk/events/batch
POST /api/sdk/heartbeat
```

Authentication uses a project public key in `x-oberyn-key`. This key identifies the project and can submit SDK events only.

Preferred mode uses the `sdk_keys` table created by `database/migrations/002_sdk_ingestion.sql`. If that table is missing in local development, the backend can issue a signed fallback key, but production should use persisted keys so they can be rotated and disabled.

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
  captureFetch: true,
  failMode: "closed",
  approvalMode: "poll",
  approvalTimeoutMs: 120000
});
```

## Protect A Prompt

```ts
const answer = await oberyn.shield.protect({
  prompt: userInput,
  provider: "openai",
  model: "gpt-4o",
  sessionId,
  metadata: { userRole: "support" }
}, async (safePrompt) => {
  return openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: safePrompt }]
  });
});
```

`shield.protect` masks common sensitive data locally before sending prompt context to Oberyn, evaluates the prompt through `/api/sdk/evaluate`, blocks or escalates when project rules require it, and records the model-call result through `/api/sdk/audit`.

## Protect A Critical Action

```ts
import { OberynApprovalRequiredError, OberynBlockedError } from "oberyn";

try {
  const refund = await oberyn.protect("crear_reembolso", async () => {
    return stripe.refunds.create({ payment_intent: paymentIntentId });
  }, {
    riskLevel: "high",
    service: { name: "Stripe", provider: "stripe", type: "payments" },
    payload: { paymentIntentId }
  });
} catch (error) {
  if (error instanceof OberynBlockedError) {
    // The action was blocked before execution.
  }

  if (error instanceof OberynApprovalRequiredError) {
    // Oberyn created an approval request and the action was not executed.
  }
}
```

`protect` calls `/api/sdk/evaluate` first. If Oberyn returns:

- `approved`: the SDK executes the function and records `/api/sdk/audit`.
- `blocked`: the SDK throws `OberynBlockedError` and does not execute the function.
- `requires_approval`: the SDK throws `OberynApprovalRequiredError`, creates an approval request, and does not execute the function.

If `approvalMode` is `"poll"`, `protect` waits for the approval request to be approved in Oberyn. When it is approved, the SDK continues and executes the function. If it is rejected or times out, the function is not executed.

## Guard A Tool Call

```ts
const result = await oberyn.proof.guard({
  name: "payment.refund",
  category: "payments",
  target: "stripe",
  riskLevel: "critical",
  actor: { id: user.id, role: "support_manager" },
  arguments: { paymentIntentId, amount }
}, async () => {
  return stripe.refunds.create({ payment_intent: paymentIntentId, amount });
}, {
  dryRun: async () => ({ estimatedRefund: amount, currency: "usd" })
});
```

`proof.guard` is an alias over the core `protect` flow with a tool-call event shape. If the decision is `requires_approval` and `approvalMode` is `"poll"`, the SDK waits until the approval is resolved before running the real action.

## Check Approval Status

```ts
const status = await oberyn.approvalStatus({
  decisionId: decision.id,
  approvalId: decision.approvalId
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

## Gateway Helper

The SDK can build a Gateway URL/header pair, but the Gateway token is separate from the SDK public key.

```ts
const gateway = oberyn.gateway("/v1/chat/completions");

await fetch(gateway.url, {
  method: "POST",
  headers: {
    ...gateway.headers,
    "content-type": "application/json",
    "x-oberyn-upstream-authorization": `Bearer ${process.env.OPENAI_API_KEY}`
  },
  body: JSON.stringify({ model: "gpt-4o", messages })
});
```

## What Oberyn Detects

- Critical actions wrapped with `protect` or `guard`.
- Prompts inspected through `shield.inspect` or `shield.protect`.
- Tool calls wrapped with `proof.guard` or `guardTool`.
- External APIs called through `fetch` when `captureFetch` is enabled.
- Services and integrations from event metadata.
- Flows by `actionName`.
- Audit events with event hashes.
- Approval requests when rules require them.
- Approval polling for long-running backend jobs.
- Sensitive payloads when protection is enabled.
- Local masking for common emails, phone numbers, long numeric identifiers, API keys, tokens, passwords, and secrets before prompt context is sent.
- Project activity status.

## Security

- Do not send provider API keys, passwords, cookies, or authorization headers in SDK payloads.
- The SDK strips common sensitive payload keys before capturing `fetch` payload previews.
- Public SDK keys should be rotated if exposed outside the intended application.
- Admin dashboard APIs still use Clerk; SDK runtime APIs use `x-oberyn-key`.
- The SDK key is not a Gateway token. Gateway traffic must use the project Gateway token.

## Maintenance Rule

## Local Real-Project Test

```bash
set OBERYN_SDK_KEY=ob_pk_...
node examples/sdk-guard-demo.mjs
```

Every code change that affects SDK initialization, event shape, authentication, batching, fetch capture, decision evaluation, approval creation, polling, or audit ingestion must update this document in the same change.

