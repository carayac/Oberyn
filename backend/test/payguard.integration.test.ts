import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import { Keypair } from "@stellar/stellar-sdk";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path: string) {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [key, ...rest] = trimmed.split("=");
    const value = rest.join("=").trim().replace(/^(['"])(.*)\1$/, "$2");
    if (!process.env[key.trim()]) process.env[key.trim()] = value;
  }
}

const repoRoot = resolve("..");
loadEnv(resolve(repoRoot, "backend/.env"));
loadEnv(resolve(repoRoot, "examples/.env"));
loadEnv(resolve(repoRoot, "examples/sdk-mini-api/.env"));

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sdkKey = process.env.OBERYN_SDK_KEY;

if (!supabaseUrl || !serviceRoleKey || !sdkKey) {
  throw new Error("PayGuard integration test requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and OBERYN_SDK_KEY.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

describe("PayGuard SDK integration", () => {
  const runId = randomUUID();
  const agentName = `PayGuard Integration Agent ${runId}`;
  const recipientName = `PayGuard Integration Wallet ${runId}`;
  const walletAddress = Keypair.random().publicKey();
  const token = `T${runId.replace(/-/g, "").slice(0, 5).toUpperCase()}`;
  const amount = 10;
  let projectId = "";
  let agentId = "";
  let paymentRequestId = "";
  let baseUrl = "";
  let server: ReturnType<typeof createServer> | null = null;

  before(async () => {
    const { app } = await import("../src/app.js");
    server = createServer(app);

    await new Promise<void>((resolveListen) => {
      server?.listen(0, "127.0.0.1", resolveListen);
    });

    const address = server.address();
    assert.equal(typeof address, "object");
    assert.ok(address);
    baseUrl = `http://127.0.0.1:${address.port}`;

    const { data: keyRow, error: keyError } = await supabase.from("sdk_keys").select("project_id").eq("public_key", sdkKey).eq("status", "active").maybeSingle();
    if (keyError) throw keyError;
    if (!keyRow) throw new Error("OBERYN_SDK_KEY does not match an active SDK key.");
    projectId = String(keyRow.project_id);

    const { data: agent, error: agentError } = await supabase
      .from("payment_agents")
      .insert({
        project_id: projectId,
        name: agentName,
        status: "active",
        risk_level: "low",
        max_amount: 100,
        can_create_payment_request: true,
        can_approve_payment: false,
        can_execute_payment: false,
      })
      .select("*")
      .single();
    if (agentError) throw agentError;
    agentId = String(agent.id);

    const { error: walletError } = await supabase.from("trusted_wallets").insert({
      project_id: projectId,
      recipient_name: recipientName,
      wallet_address: walletAddress,
      token,
      is_verified: true,
    });
    if (walletError) throw walletError;
  });

  after(async () => {
    if (paymentRequestId) {
      await supabase.from("payment_audit_logs").delete().eq("payment_request_id", paymentRequestId);
      await supabase.from("payment_approvals").delete().eq("payment_request_id", paymentRequestId);
      await supabase.from("payment_requests").delete().eq("id", paymentRequestId);
    }

    if (walletAddress) await supabase.from("trusted_wallets").delete().eq("project_id", projectId).eq("wallet_address", walletAddress);
    if (agentId) await supabase.from("payment_agents").delete().eq("id", agentId);

    await new Promise<void>((resolveClose) => server?.close(() => resolveClose()));
  });

  it("reads real PayGuard config for the SDK key", async () => {
    const response = await fetch(`${baseUrl}/api/sdk/payguard/config`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-oberyn-key": sdkKey,
      },
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.success, true);
    assert.equal(payload.data.projectId, projectId);
    assert.ok(payload.data.agents.some((agent: { id: string }) => agent.id === agentId));
    assert.ok(payload.data.trustedWallets.some((wallet: { walletAddress: string }) => wallet.walletAddress === walletAddress));
  });

  it("creates a real PayGuard payment request through the SDK route", async () => {
    const response = await fetch(`${baseUrl}/api/sdk/payguard/payment-requests`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-oberyn-key": sdkKey,
      },
      body: JSON.stringify({
        agentId,
        recipientName,
        recipientWallet: walletAddress,
        amount,
        token,
        reason: `Integration payment ${runId}`,
        riskLevel: "low",
      }),
    });

    assert.equal(response.status, 201);
    const payload = await response.json();
    assert.equal(payload.success, true);
    assert.equal(payload.data.projectId, projectId);
    assert.equal(payload.data.agentId, agentId);
    assert.equal(payload.data.recipientWallet, walletAddress);
    assert.equal(payload.data.token, token);
    assert.equal(payload.data.status, "pending_approval");
    assert.ok(payload.data.auditHash);

    paymentRequestId = payload.data.id;
  });
});
