import { supabaseAdmin } from "../config/supabase.js";
import { oberynSecurityService } from "./oberynSecurity.service.js";

const providerTargets: Record<string, string> = {
  openai: "https://api.openai.com",
  anthropic: "https://api.anthropic.com",
};

function providerFromPath(provider?: string) {
  const normalized = String(provider ?? "").toLowerCase();
  if (!providerTargets[normalized]) {
    const error = new Error("Gateway provider is not supported yet. Use openai or anthropic.");
    (error as { status?: number }).status = 400;
    throw error;
  }
  return normalized;
}

function extractPromptPayload(body: unknown) {
  if (!body || typeof body !== "object") return body;
  const payload = body as Record<string, unknown>;
  return {
    model: payload.model,
    messages: payload.messages,
    prompt: payload.prompt,
    input: payload.input,
  };
}

async function recordGatewayEvent(input: {
  projectId: string;
  apiKeyId?: string | null;
  provider: string;
  upstreamPath: string;
  method: string;
  decisionId?: string;
  decision: string;
  statusCode?: number | null;
  latencyMs?: number | null;
  requestBody?: unknown;
  responseBody?: unknown;
  errorMessage?: string | null;
}) {
  const { error } = await supabaseAdmin.from("gateway_events").insert({
    project_id: input.projectId,
    api_key_id: input.apiKeyId ?? null,
    provider: input.provider,
    upstream_path: input.upstreamPath,
    method: input.method,
    decision_id: input.decisionId ?? null,
    decision: input.decision,
    status_code: input.statusCode ?? null,
    latency_ms: input.latencyMs ?? null,
    request_body: oberynSecurityService.stablePreview(input.requestBody),
    response_body: oberynSecurityService.stablePreview(input.responseBody),
    error_message: input.errorMessage ?? null,
  });
  if (error) throw error;
}

export const gatewayService = {
  getConfig: async (projectId: string) => {
    const apiKeys = await oberynSecurityService.listProjectKeys(projectId);
    return {
      projectId,
      mode: "gateway",
      endpoint: "http://localhost:4000/gateway/v1/:provider/*",
      providers: Object.keys(providerTargets),
      status: apiKeys.some((key) => key.status === "active") ? "ready" : "requires_project_key",
      storesClientSecrets: false,
      apiKeys,
      examples: {
        openaiBaseUrl: "http://localhost:4000/gateway/v1/openai/v1",
        authHeader: "x-oberyn-key: oberyn_live_xxx",
      },
    };
  },

  test: async (projectId: string) => {
    const decision = await oberynSecurityService.evaluate({
      projectId,
      source: "gateway",
      subject: "gateway-test",
      actionName: "chat.completions.create",
      service: "openai",
      riskLevel: "medium",
      payload: { messages: [{ role: "user", content: "Test prompt from Oberyn Gateway" }] },
    });
    await recordGatewayEvent({
      projectId,
      provider: "openai",
      upstreamPath: "/v1/chat/completions",
      method: "POST",
      decisionId: decision.id,
      decision: decision.decision,
      requestBody: { test: true },
      responseBody: decision,
    });
    return decision;
  },

  proxy: async (input: {
    rawKey?: string;
    provider?: string;
    upstreamPath: string;
    method: string;
    headers: Record<string, string | string[] | undefined>;
    body?: unknown;
  }) => {
    const verified = await oberynSecurityService.verifyProjectKey(input.rawKey, "gateway:proxy");
    const provider = providerFromPath(input.provider);
    const decision = await oberynSecurityService.evaluate({
      projectId: verified.projectId,
      apiKeyId: verified.id,
      source: "gateway",
      subject: "gateway-client",
      actionName: `${provider}.${input.upstreamPath.replace(/^\/+/, "") || "root"}`,
      service: provider,
      riskLevel: "medium",
      payload: extractPromptPayload(input.body),
    });

    if (decision.decision !== "allow") {
      await recordGatewayEvent({
        projectId: verified.projectId,
        apiKeyId: verified.id,
        provider,
        upstreamPath: input.upstreamPath,
        method: input.method,
        decisionId: decision.id,
        decision: decision.decision,
        statusCode: decision.decision === "block" ? 403 : 409,
        requestBody: input.body,
        responseBody: decision,
      });
      return { blocked: true, status: decision.decision === "block" ? 403 : 409, body: decision };
    }

    const upstreamUrl = `${providerTargets[provider]}${input.upstreamPath}`;
    const startedAt = Date.now();
    const upstreamHeaders = new Headers();
    for (const [name, value] of Object.entries(input.headers)) {
      if (!value || name.toLowerCase().startsWith("x-oberyn")) continue;
      if (["host", "connection", "content-length"].includes(name.toLowerCase())) continue;
      upstreamHeaders.set(name, Array.isArray(value) ? value.join(",") : value);
    }

    const upstreamResponse = await fetch(upstreamUrl, {
      method: input.method,
      headers: upstreamHeaders,
      body: input.method === "GET" || input.method === "HEAD" ? undefined : JSON.stringify(input.body ?? {}),
    });
    const text = await upstreamResponse.text();
    const contentType = upstreamResponse.headers.get("content-type") ?? "application/json";
    const responseBody = contentType.includes("application/json")
      ? (() => {
          try {
            return JSON.parse(text || "{}");
          } catch {
            return { raw: text };
          }
        })()
      : text;

    await recordGatewayEvent({
      projectId: verified.projectId,
      apiKeyId: verified.id,
      provider,
      upstreamPath: input.upstreamPath,
      method: input.method,
      decisionId: decision.id,
      decision: decision.decision,
      statusCode: upstreamResponse.status,
      latencyMs: Date.now() - startedAt,
      requestBody: input.body,
      responseBody,
    });

    return { blocked: false, status: upstreamResponse.status, contentType, body: responseBody };
  },
};
