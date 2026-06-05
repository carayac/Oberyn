import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import { Keypair } from "@stellar/stellar-sdk";
import { createClient } from "@supabase/supabase-js";

type PayguardService = typeof import("../src/services/payguard.service.js").payguardService;

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
  throw new Error("PayGuard config service test requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and OBERYN_SDK_KEY.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

describe("PayGuard configuration service", () => {
  const runId = randomUUID();
  const agentName = `PayGuard Config Agent ${runId}`;
  const recipientName = `PayGuard Config Wallet ${runId}`;
  const walletAddress = Keypair.random().publicKey();
  const token = `C${runId.replace(/-/g, "").slice(0, 5).toUpperCase()}`;
  let projectId = "";
  let agentId = "";
  let payguardService: PayguardService;

  before(async () => {
    const { data: keyRow, error: keyError } = await supabase.from("sdk_keys").select("project_id").eq("public_key", sdkKey).eq("status", "active").maybeSingle();
    if (keyError) throw keyError;
    if (!keyRow) throw new Error("OBERYN_SDK_KEY does not match an active SDK key.");
    projectId = String(keyRow.project_id);

    ({ payguardService } = await import("../src/services/payguard.service.js"));
  });

  after(async () => {
    await supabase.from("trusted_wallets").delete().eq("project_id", projectId).eq("wallet_address", walletAddress);
    if (agentId) await supabase.from("payment_agents").delete().eq("id", agentId);
  });

  it("creates a real payment agent row", async () => {
    const agent = await payguardService.createAgent(projectId, {
      name: agentName,
      maxAmount: 250,
      riskLevel: "medium",
      status: "active",
      canCreatePaymentRequest: true,
    });

    agentId = agent.id;
    assert.equal(agent.projectId, projectId);
    assert.equal(agent.name, agentName);
    assert.equal(agent.maxAmount, 250);
    assert.equal(agent.canCreatePaymentRequest, true);
  });

  it("upserts a real verified trusted wallet row", async () => {
    const wallet = await payguardService.upsertTrustedWallet(projectId, {
      recipientName,
      walletAddress,
      token,
      isVerified: true,
    });

    assert.equal(wallet.projectId, projectId);
    assert.equal(wallet.recipientName, recipientName);
    assert.equal(wallet.walletAddress, walletAddress);
    assert.equal(wallet.token, token);
    assert.equal(wallet.isVerified, true);
  });
});
