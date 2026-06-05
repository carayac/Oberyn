import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createOberyn } from "oberyn";

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
loadEnvFile(join(currentDir, ".env"));
loadEnvFile(resolve(currentDir, "..", ".env"));
loadEnvFile(resolve(currentDir, "..", "..", ".env"));

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Set ${name} in examples/sdk-mini-api/.env or examples/.env before running this PayGuard test.`);
  return value;
}

function optionalEnv(name) {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function envNumber(name) {
  const rawValue = requiredEnv(name);
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number.`);
  return value;
}

function shortValue(value) {
  if (!value) return "";
  return value.length > 22 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value;
}

const oberyn = createOberyn({
  apiKey: requiredEnv("OBERYN_SDK_KEY"),
  endpoint: process.env.OBERYN_SDK_ENDPOINT ?? "http://localhost:4000/api/sdk/events",
  service: {
    name: process.env.OBERYN_SERVICE_NAME ?? "sdk-mini-api-payguard-test",
    provider: "custom",
    type: "test-runner",
  },
  environment: process.env.NODE_ENV ?? "development",
});

async function loadPayGuardConfig() {
  const config = await oberyn.payguard.config();
  return {
    ...config,
    agents: config.agents.filter((agent) => agent.canCreatePaymentRequest),
    trustedWallets: config.trustedWallets.filter((wallet) => wallet.isVerified),
  };
}

function printConfig(config) {
  console.log("\nPayGuard real config");
  console.log({
    projectId: config.projectId,
    agents: config.agents.length,
    verifiedWallets: config.trustedWallets.length,
    trustlessWorkMode: config.trustlessWork.mode,
    canSubmitTransactions: config.trustlessWork.canSubmitTransactions,
  });

  console.log("\nAgents");
  for (const agent of config.agents) {
    console.log({
      id: agent.id,
      name: agent.name,
      status: agent.status,
      riskLevel: agent.riskLevel,
      maxAmount: agent.maxAmount,
    });
  }

  console.log("\nVerified wallets");
  for (const wallet of config.trustedWallets) {
    console.log({
      recipientName: wallet.recipientName,
      walletAddress: wallet.walletAddress,
      token: wallet.token,
    });
  }
}

async function showConfig() {
  const config = await loadPayGuardConfig();
  printConfig(config);
  if (!config.agents.length || !config.trustedWallets.length) {
    console.log("\nThis project has no real PayGuard agent and/or verified wallet configured yet.");
    console.log("Create them in Supabase payment_agents and trusted_wallets for this project, then rerun npm run payguard:config.");
    return;
  }

  console.log("\nThe create test can auto-select the first real agent and verified wallet, or you can pin OBERYN_PAYGUARD_AGENT_ID and OBERYN_PAYGUARD_RECIPIENT_WALLET.");
}

async function createPaymentRequest() {
  const config = await loadPayGuardConfig();
  if (!config.agents.length) throw new Error("No real PayGuard payment agents exist for this project. Add a payment_agents row before running npm run payguard:test.");
  if (!config.trustedWallets.length) throw new Error("No verified PayGuard wallets exist for this project. Add a trusted_wallets row before running npm run payguard:test.");

  const agentId = optionalEnv("OBERYN_PAYGUARD_AGENT_ID") ?? config.agents[0].id;
  const recipientWallet = optionalEnv("OBERYN_PAYGUARD_RECIPIENT_WALLET") ?? config.trustedWallets[0].walletAddress;
  const amount = envNumber("OBERYN_PAYGUARD_AMOUNT");
  const reason = requiredEnv("OBERYN_PAYGUARD_REASON");

  const agent = config.agents.find((item) => item.id === agentId);
  if (!agent) throw new Error("OBERYN_PAYGUARD_AGENT_ID is not an active PayGuard agent that can create payment requests for this project.");

  const wallet = config.trustedWallets.find((item) => item.walletAddress === recipientWallet);
  if (!wallet) throw new Error("OBERYN_PAYGUARD_RECIPIENT_WALLET is not a verified PayGuard wallet for this project.");

  const token = optionalEnv("OBERYN_PAYGUARD_TOKEN") ?? wallet.token;
  if (!token) throw new Error("Set OBERYN_PAYGUARD_TOKEN or configure a token on the selected trusted wallet.");

  const riskLevel = optionalEnv("OBERYN_PAYGUARD_RISK_LEVEL");
  const payload = {
    agentId: agent.id,
    recipientName: optionalEnv("OBERYN_PAYGUARD_RECIPIENT_NAME") ?? wallet.recipientName,
    recipientWallet: wallet.walletAddress,
    amount,
    token,
    reason,
    ...(riskLevel ? { riskLevel } : {}),
  };

  const paymentRequest = await oberyn.payguard.requestPayment(payload);
  console.log("\nPayGuard payment request created against the real dashboard project");
  console.log({
    projectId: config.projectId,
    requestId: paymentRequest.id,
    status: paymentRequest.status,
    riskLevel: paymentRequest.riskLevel,
    amount: `${paymentRequest.amount} ${paymentRequest.token}`,
    agent: agent.name,
    recipientName: paymentRequest.recipientName,
    recipientWallet: shortValue(paymentRequest.recipientWallet),
    policyApplied: paymentRequest.policyApplied,
    auditHash: shortValue(paymentRequest.auditHash),
    trustlessWorkMode: config.trustlessWork.mode,
  });
}

async function main() {
  const command = process.argv[2] ?? "config";
  if (command === "config") {
    await showConfig();
    return;
  }

  if (command === "create") {
    await createPaymentRequest();
    return;
  }

  throw new Error(`Unknown command "${command}". Use "config" or "create".`);
}

main()
  .catch((error) => {
    console.error("\nPayGuard smoke test failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await oberyn.stop().catch(() => undefined);
  });
