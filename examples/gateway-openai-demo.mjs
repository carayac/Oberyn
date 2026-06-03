import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
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

const projectId = process.env.OBERYN_PROJECT_ID;
const gatewayToken = process.env.OBERYN_GATEWAY_TOKEN;
const providerKey = process.env.PROVIDER_API_KEY;
const approvalId = process.env.OBERYN_APPROVAL_ID;

if (!projectId || !gatewayToken || !providerKey) {
  throw new Error("Set OBERYN_PROJECT_ID, OBERYN_GATEWAY_TOKEN and PROVIDER_API_KEY.");
}

const response = await fetch(`http://localhost:4000/api/gateway/${projectId}/v1/chat/completions`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${gatewayToken}`,
    "x-oberyn-upstream-authorization": `Bearer ${providerKey}`,
    ...(approvalId ? { "x-oberyn-approval-id": approvalId } : {}),
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: process.env.OPENAI_MODEL ?? "gpt-4o",
    messages: [{ role: "user", content: "Responde con una frase corta para probar Oberyn Gateway." }],
  }),
});

console.log("Oberyn decision:", response.headers.get("x-oberyn-decision"));
console.log("Oberyn risk:", response.headers.get("x-oberyn-risk-level"));
console.log("HTTP status:", response.status);
console.log(await response.text());
