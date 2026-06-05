# Oberyn

AI governance, runtime protection, human approvals, and audit trails for apps that use agents, LLMs, and external APIs.

Oberyn gives AI-powered systems a control plane: it detects providers, evaluates risk, blocks dangerous actions, requests human approval when needed, and records auditable evidence.

## Features

- Detect integrations such as OpenAI, Anthropic, DeepSeek, Supabase, Stripe, and custom APIs.
- Protect prompts, tool calls, and HTTP requests before execution.
- Infer risk and decisions without hardcoding `decision` or `riskLevel`.
- Require human approval for high-risk actions.
- Govern AI-generated payment requests with PayGuard before funds move.
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
- PayGuard payment governance and Trustless Work escrow status
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
/api/projects/:projectId/payguard
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
- payment_agents
- trusted_wallets
- payment_requests
- payment_approvals
- payment_audit_logs
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
TRUSTLESS_WORK_MODE=mock
TRUSTLESS_WORK_API_KEY=
TRUSTLESS_WORK_BASE_URL=https://dev.api.trustlesswork.com
TRUSTLESS_WORK_NETWORK=testnet
TRUSTLESS_WORK_SIGNER_PUBLIC_KEY=
TRUSTLESS_WORK_SIGNER_SECRET_KEY=
TRUSTLESS_WORK_APPROVER_PUBLIC_KEY=
TRUSTLESS_WORK_PLATFORM_ADDRESS=
TRUSTLESS_WORK_RELEASE_SIGNER_PUBLIC_KEY=
TRUSTLESS_WORK_DISPUTE_RESOLVER_PUBLIC_KEY=
TRUSTLESS_WORK_USDC_ISSUER=
TRUSTLESS_WORK_PLATFORM_FEE=0
```

Apply the schema in Supabase SQL editor:

```txt
database/schema.sql
```

For an existing Supabase project, run migrations in order and include:

```txt
database/migrations/006_payguard.sql
database/migrations/007_remove_payguard_demo_seed.sql
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

## PayGuard

PayGuard lets AI agents create payment requests while keeping execution behind policy checks, audit logs, and human approval.

Technical guide: `docs/payguard.md`.

Core rule:

```txt
The agent proposes. The human approves. Oberyn executes on-chain.
```

How to test locally:

1. Start the app with `npm run dev`.
2. Apply `database/migrations/006_payguard.sql` and `database/migrations/007_remove_payguard_demo_seed.sql` in the connected Supabase project.
3. Open a project and go to `Project > PayGuard`.
4. Use `Configuracion PayGuard` to create a real payment agent and register a real verified Stellar wallet.
5. Create a payment request with that real verified wallet and token.
6. Amounts up to 1000 units of the configured token become `pending_approval`; amounts over 1000 become `requires_multi_approval`; blocked agents or unverified wallets become `blocked`.
7. Approve a pending request, then run `Crear escrow`, `Fund`, and `Release` only when Trustless Work is configured in `live`.
8. Review the audit panel for `PAYMENT_REQUEST_CREATED`, `POLICY_EVALUATED`, `HUMAN_APPROVED`, `ESCROW_CREATED`, `ESCROW_FUNDED`, and `PAYMENT_RELEASED`.

Agents can also create payment requests through the SDK:

```ts
const payguard = await oberyn.payguard.config();
const agent = payguard.agents.find((item) => item.status === "active");
const wallet = payguard.trustedWallets[0];

const request = await oberyn.payguard.requestPayment({
  agentId: agent!.id,
  recipientName: wallet!.recipientName,
  recipientWallet: wallet!.walletAddress,
  amount: Number(process.env.PAYGUARD_AMOUNT),
  token: wallet!.token,
  reason: process.env.PAYGUARD_REASON!,
  riskLevel: "medium"
});
```

The SDK only creates the request. It does not expose escrow creation, funding, or release methods to the agent.

Mock mode:

- `TRUSTLESS_WORK_MODE=mock` is the default.
- If Trustless Work API key, Stellar role public keys, signer secret, or USDC issuer are missing, PayGuard stays in mock mode.
- Mock mode reports that Trustless Work is not ready and blocks escrow/fund/release operations instead of simulating contract IDs or transaction hashes.
- The frontend shows a `Trustless Work Mock Mode` badge and disables on-chain actions.

Production connection:

- Store `TRUSTLESS_WORK_API_KEY` only in `backend/.env`.
- Configure `TRUSTLESS_WORK_MODE=live`.
- Configure the Stellar signer and role public keys used by Trustless Work: signer, approver, platform address, release signer, dispute resolver, and USDC issuer.
- Apply `database/migrations/006_payguard.sql` and `database/migrations/007_remove_payguard_demo_seed.sql`.
- Configure verified recipient wallets for the project.
- Decide whether Oberyn signs Trustless Work XDR server-side after human approval or whether a wallet-signing step should be added for non-custodial customer signing.

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
