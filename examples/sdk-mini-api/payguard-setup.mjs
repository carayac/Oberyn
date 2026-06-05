import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^(['"])(.*)\1$/, "$2");
    if (!process.env[key]) process.env[key] = value;
  }
}

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, "..", "..");

loadEnvFile(resolve(repoRoot, "backend/.env"));
loadEnvFile(join(currentDir, ".env"));
loadEnvFile(resolve(currentDir, "..", ".env"));
loadEnvFile(resolve(repoRoot, ".env"));

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Set ${name} before running npm run payguard:setup.`);
  return value;
}

function optionalEnv(name, fallback) {
  const value = process.env[name]?.trim();
  return value || fallback;
}

function requiredPositiveNumber(name) {
  const value = Number(requiredEnv(name));
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number.`);
  return value;
}

const legacyDemoAgentNames = ["PayOps Analyst", "Treasury Copilot", "Blocked Payout Bot"];
const legacyDemoWalletAddress = "GDEMOAPPROVEDPAYGUARDWALLET000000000000000000000000";
const legacyDemoWalletName = "Proveedor verificado demo";

function assertNoLegacyDemoValue(...values) {
  const text = values.join(" ");
  if (
    legacyDemoAgentNames.some((name) => text.includes(name)) ||
    text.includes(legacyDemoWalletAddress) ||
    text.includes(legacyDemoWalletName)
  ) {
    throw new Error("PayGuard setup refuses legacy demo values. Use a real agent name and a real Stellar wallet.");
  }
}

function assertStellarPublicKeyFormat(value) {
  if (!/^G[A-Z2-7]{55}$/.test(value)) {
    throw new Error("OBERYN_PAYGUARD_RECIPIENT_WALLET must be a Stellar public key that starts with G.");
  }
}

const supabaseUrl = requiredEnv("SUPABASE_URL");
const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const sdkKey = requiredEnv("OBERYN_SDK_KEY");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function resolveProjectId() {
  const { data, error } = await supabase.from("sdk_keys").select("project_id,status").eq("public_key", sdkKey).eq("status", "active").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("OBERYN_SDK_KEY does not match an active SDK key in Supabase.");
  return String(data.project_id);
}

async function upsertAgent(projectId) {
  const name = requiredEnv("OBERYN_PAYGUARD_AGENT_NAME");
  const maxAmount = requiredPositiveNumber("OBERYN_PAYGUARD_AGENT_MAX_AMOUNT");
  const riskLevel = optionalEnv("OBERYN_PAYGUARD_AGENT_RISK_LEVEL", "low").toLowerCase();
  if (!["low", "medium", "high"].includes(riskLevel)) throw new Error("OBERYN_PAYGUARD_AGENT_RISK_LEVEL must be low, medium, or high.");
  const status = optionalEnv("OBERYN_PAYGUARD_AGENT_STATUS", "active").toLowerCase();
  if (!["active", "paused", "blocked"].includes(status)) throw new Error("OBERYN_PAYGUARD_AGENT_STATUS must be active, paused, or blocked.");
  assertNoLegacyDemoValue(name);

  const row = {
    project_id: projectId,
    name,
    status,
    risk_level: riskLevel,
    max_amount: maxAmount,
    can_create_payment_request: true,
    can_approve_payment: false,
    can_execute_payment: false,
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: existingError } = await supabase.from("payment_agents").select("id").eq("project_id", projectId).eq("name", name).maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    const { data, error } = await supabase.from("payment_agents").update(row).eq("id", String(existing.id)).select("*").single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase.from("payment_agents").insert(row).select("*").single();
  if (error) throw error;
  return data;
}

async function upsertWallet(projectId) {
  const recipientName = requiredEnv("OBERYN_PAYGUARD_RECIPIENT_NAME");
  const walletAddress = requiredEnv("OBERYN_PAYGUARD_RECIPIENT_WALLET");
  const token = requiredEnv("OBERYN_PAYGUARD_TOKEN").toUpperCase();
  assertNoLegacyDemoValue(recipientName, walletAddress, token);
  assertStellarPublicKeyFormat(walletAddress);

  const row = {
    project_id: projectId,
    recipient_name: recipientName,
    wallet_address: walletAddress,
    token,
    is_verified: true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("trusted_wallets")
    .upsert(row, { onConflict: "project_id,wallet_address" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function main() {
  const projectId = await resolveProjectId();
  const [agent, wallet] = await Promise.all([upsertAgent(projectId), upsertWallet(projectId)]);

  console.log("\nPayGuard real project data configured");
  console.log({
    projectId,
    agentId: agent.id,
    agentName: agent.name,
    agentMaxAmount: Number(agent.max_amount),
    recipientName: wallet.recipient_name,
    recipientWallet: wallet.wallet_address,
    token: wallet.token,
  });
}

main().catch((error) => {
  console.error("\nPayGuard setup failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
