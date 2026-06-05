# PayGuard Technical Guide

PayGuard lets AI agents propose payments without giving them direct control over funds. The runtime path is:

```txt
SDK / Dashboard
  -> PayGuard policy engine
  -> Supabase PayGuard tables
  -> Human approval
  -> Trustless Work escrow operations, only when live credentials are configured
```

No demo agents, demo wallets, or fallback stores are used. PayGuard reads and writes the real project rows in Supabase.

## Data Model

Apply migrations in numeric order:

```txt
database/migrations/006_payguard.sql
database/migrations/007_remove_payguard_demo_seed.sql
database/migrations/008_require_real_payguard_tokens.sql
```

Tables:

- `payment_agents`: agents allowed to propose payment requests.
- `trusted_wallets`: verified recipient wallets and token metadata.
- `payment_requests`: proposed payments and lifecycle status.
- `payment_approvals`: human decisions.
- `payment_audit_logs`: append-only PayGuard action history.

The backend uses the Supabase service role. The frontend never writes directly to Supabase.

## Dashboard API

Authenticated routes:

```txt
GET  /api/projects/:projectId/payguard
POST /api/projects/:projectId/payguard/agents
POST /api/projects/:projectId/payguard/wallets
POST /api/projects/:projectId/payguard/requests
POST /api/projects/:projectId/payguard/requests/:paymentRequestId/approve
POST /api/projects/:projectId/payguard/requests/:paymentRequestId/reject
POST /api/projects/:projectId/payguard/requests/:paymentRequestId/block
POST /api/projects/:projectId/payguard/requests/:paymentRequestId/create-escrow
POST /api/projects/:projectId/payguard/requests/:paymentRequestId/fund
POST /api/projects/:projectId/payguard/requests/:paymentRequestId/release
GET  /api/projects/:projectId/payguard/escrows/:escrowId/status
```

Agent payload:

```json
{
  "name": "Treasury agent name from your app",
  "riskLevel": "low",
  "maxAmount": 100,
  "status": "active",
  "canCreatePaymentRequest": true
}
```

Wallet payload:

```json
{
  "recipientName": "Recipient legal or operational name",
  "walletAddress": "G...",
  "token": "TOKEN_SYMBOL",
  "isVerified": true
}
```

Wallets are validated as Stellar public keys. Legacy demo values are rejected and purged if found.

## SDK API

Public SDK routes:

```txt
POST /api/sdk/payguard/config
POST /api/sdk/payguard/payment-requests
POST /api/sdk/v1/payguard/config
POST /api/sdk/v1/payguard/payment-requests
```

SDK calls use `x-oberyn-key` or `Authorization: Bearer <ob_pk_...>`.

The SDK can only:

- read active PayGuard agents and verified wallets for its project;
- create payment requests.

The SDK cannot create escrow, fund escrow, or release funds.

## Policy

The policy engine blocks:

- blocked or paused agents;
- agents without `can_create_payment_request`;
- unverified destination wallets;
- invalid or non-positive amounts;
- amounts above the agent limit.

Valid payments require human approval. Amounts above `1000` units of the configured token require multi-approval.

## Trustless Work

Trustless Work is used only after human approval. The integration follows the REST model documented by Trustless Work:

- Testnet base URL: `https://dev.api.trustlesswork.com`
- Mainnet base URL: `https://api.trustlesswork.com`
- Single-release escrow deploy endpoint: `/deployer/single-release`
- Most state-changing endpoints return unsigned XDR that must be signed and submitted through `/helper/send-transaction`

References:

- https://docs.trustlesswork.com/trustless-work/api-rest/introduction
- https://docs.trustlesswork.com/trustless-work/api-rest/deploy
- https://docs.trustlesswork.com/trustless-work/api-rest/helpers/send-transaction
- https://developers.stellar.org/docs/build/guides/transactions/create-account

Backend environment required for live escrow execution:

```env
TRUSTLESS_WORK_MODE=live
TRUSTLESS_WORK_API_KEY=
TRUSTLESS_WORK_BASE_URL=https://dev.api.trustlesswork.com
TRUSTLESS_WORK_NETWORK=testnet
TRUSTLESS_WORK_SIGNER_PUBLIC_KEY=
TRUSTLESS_WORK_SIGNER_SECRET_KEY=
TRUSTLESS_WORK_PLATFORM_ADDRESS=
TRUSTLESS_WORK_RELEASE_SIGNER_PUBLIC_KEY=
TRUSTLESS_WORK_DISPUTE_RESOLVER_PUBLIC_KEY=
TRUSTLESS_WORK_USDC_ISSUER=
TRUSTLESS_WORK_PLATFORM_FEE=0
```

If any live credential is missing, PayGuard still supports real request creation and approval, but on-chain actions are blocked. It does not simulate contract IDs or transaction hashes.

## Local Test Flow

Start backend and frontend:

```powershell
npm run dev
```

Configure PayGuard from the dashboard:

```txt
Project > PayGuard > Configuracion PayGuard
```

Or use the mini project:

```powershell
cd examples/sdk-mini-api
npm run payguard:setup
npm run payguard:config
npm run payguard:test
```

`payguard:setup` resolves the real project from `OBERYN_SDK_KEY` and writes the agent/wallet values from `.env`.

## Automated Tests

Run:

```powershell
npm --prefix backend run test:payments
npm --prefix backend run typecheck
npm --prefix frontend run typecheck
```

`test:payments` includes:

- PayGuard policy unit tests.
- Integration test that starts the Express app on a random local port.
- Real Supabase insert/read/create-payment-request flow.
- Cleanup of generated payment request, audit logs, wallet, and agent.

Expected result:

```txt
tests 9
pass 9
fail 0
skipped 0
```
