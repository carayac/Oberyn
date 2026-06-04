# Oberyn

AI governance, runtime protection, human approvals, and audit trails for apps that use agents, LLMs, and external APIs.

Oberyn gives AI-powered systems a control plane: it detects providers, evaluates risk, blocks dangerous actions, requests human approval when needed, and records auditable evidence.

## Features

- Detect integrations such as OpenAI, Anthropic, DeepSeek, Supabase, Stripe, and custom APIs.
- Protect prompts, tool calls, and HTTP requests before execution.
- Infer risk and decisions without hardcoding `decision` or `riskLevel`.
- Require human approval for high-risk actions.
- Track integrations, flows, approvals, and audit events.
- Record hashed audit evidence with optional Stellar anchoring.
- Test real provider traffic through the SDK mini project.

## Repository Structure

```txt
.
+-- backend/              Express API, Clerk auth, Supabase services
+-- frontend/             React + Vite dashboard
+-- src/                  Oberyn SDK source
+-- dist/                 Built SDK package output
+-- database/             Supabase/Postgres schema
+-- docs/                 Technical docs rendered by the app
+-- examples/
|   +-- sdk-mini-api/      SDK demo with DeepSeek + JSONPlaceholder
+-- scripts/              Local development helpers
+-- vercel.json           Vercel Services config
```

## Architecture

```txt
Your app / agent / backend
  -> Oberyn SDK
  -> Oberyn API backend
  -> Supabase
  -> Oberyn dashboard
```

Runtime flow:

1. Your app describes an action with `actionName`, prompt, URL, payload, actor, or metadata.
2. The SDK enriches the event and sends it to Oberyn.
3. Oberyn detects provider/service, infers risk, evaluates project rules, and returns a decision.
4. If approved, the app executes the action.
5. If blocked, the action does not run.
6. If approval is required, the SDK can wait until a human approves or rejects.
7. Oberyn records integrations, flows, approvals, and audit events.

## SDK

Install from npm:

```bash
npm i oberyn
```

Initialize:

```ts
import { createOberyn } from "oberyn";

const oberyn = createOberyn({
  apiKey: process.env.OBERYN_SDK_KEY!,
  endpoint: process.env.OBERYN_SDK_ENDPOINT!,
  environment: "production",
  approvalMode: "poll"
});
```

Protect an external API call:

```ts
const result = await oberyn.api.request(
  "https://api.deepseek.com/chat/completions",
  {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: "Explain Oberyn in one sentence." }]
    })
  },
  {
    actionName: "deepseek.chat.completions.create"
  }
);
```

Protect a critical tool call:

```ts
const refund = await oberyn.proof.guard(
  {
    name: "billing.refund.create",
    category: "payments",
    target: "stripe",
    arguments: { paymentIntentId, amount },
    actor: { id: user.id, role: user.role }
  },
  () => stripe.refunds.create({ payment_intent: paymentIntentId, amount })
);
```

## Dashboard

The frontend includes project-level views for:

- Main dashboard and recent activity
- Integrations
- Flows
- Human approvals
- Rules
- Audit events
- SDK setup
- Technical docs

## Backend API

Important routes:

```txt
/api/projects
/api/projects/:projectId/integrations
/api/projects/:projectId/flows
/api/projects/:projectId/rules
/api/projects/:projectId/approvals
/api/projects/:projectId/audit
/api/projects/:projectId/sdk/config
/api/sdk/events
/api/sdk/evaluate
/api/sdk/audit
/api/sdk/approval-status
```

## Database

The schema includes:

- organizations
- projects
- integrations
- flows
- rules
- approval_requests
- audit_events
- sdk_keys
- gateway_configs

See [database/schema.sql](database/schema.sql).

## Quickstart

### Prerequisites

- Node.js 22 recommended
- npm
- Supabase project or local Postgres
- Clerk application

### Install dependencies

```bash
npm --prefix backend install
npm --prefix frontend install
```

### Configure backend

Create `backend/.env`:

```env
PORT=4000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
OBERYN_SDK_FALLBACK_SECRET=change-me
```

Apply the schema in Supabase SQL editor:

```txt
database/schema.sql
```

### Configure frontend

Create `frontend/.env`:

```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_API_BASE_URL=http://localhost:4000/api
```

### Run locally

```bash
npm run dev
```

Local URLs:

```txt
Frontend: http://localhost:5173
Backend:  http://localhost:4000
```

## SDK Mini Project

The mini project demonstrates:

- Prompt inspection
- DeepSeek calls protected by Oberyn
- Malicious prompt blocking
- Human approval before execution
- JSONPlaceholder GET/POST requests
- Final audit event with `record`

Configure `examples/.env`:

```env
OBERYN_SDK_KEY=ob_pk_your_project_public_key
OBERYN_SDK_ENDPOINT=http://localhost:4000/api/sdk/events
OBERYN_APPROVAL_MODE=throw
OBERYN_RUN_APPROVAL_DEMO=0

DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-chat
```

Run:

```bash
cd examples/sdk-mini-api
npm install
npm start
```

To test human approval:

```env
OBERYN_APPROVAL_MODE=poll
OBERYN_RUN_APPROVAL_DEMO=1
```

Then approve the pending request in:

```txt
Project > Approvals
```

## Deployment

Recommended production split:

```txt
Frontend: Vercel
Backend:  Render, Railway, Fly.io, or another Node host
Database: Supabase
```

Frontend production env:

```env
VITE_API_BASE_URL=https://your-backend.example.com/api
```

This repo also includes `vercel.json` for Vercel Services:

```json
{
  "experimentalServices": {
    "frontend": {
      "root": "frontend",
      "routePrefix": "/",
      "framework": "vite"
    },
    "backend": {
      "root": "backend",
      "routePrefix": "/_/backend",
      "framework": "express",
      "entrypoint": "src/server.ts"
    }
  }
}
```

For that setup:

```env
VITE_API_BASE_URL=/_/backend/api
```

## Documentation

SDK docs live in:

```txt
docs/sdk.md
```

The dashboard renders them at:

```txt
/docs/sdk
```

## Roadmap

- Oberyn Local Agent for Codex, Claude Code, Cursor, VS Code, and terminal workflows
- Browser companion for ChatGPT, Claude, Gemini, and other web AI tools
- Enterprise connectors for compliance logs and SaaS audit trails
- More granular rule builder
- Cost and token analytics by provider/model
- Gateway runtime in a future version
- Expanded Stellar evidence and verification UI

## Security Notes

- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in the frontend.
- Do not send provider API keys in `metadata` or `payload`.
- `OBERYN_SDK_KEY` identifies a project and sends runtime events; it is not a provider secret.
- Provider secrets such as `DEEPSEEK_API_KEY` stay in your application.

## Contributing

Issues, ideas, and pull requests are welcome. Keep changes focused, include verification steps, and update docs when SDK behavior, event shapes, approvals, integrations, or deployment configuration changes.

## License

License information has not been finalized yet.
