import crypto from "node:crypto";
import type { Request } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { decisionService } from "./decision.service.js";
import type { DecisionResult } from "./decision.service.js";

type GatewayConfig = {
  projectId: string;
  upstreamBaseUrl: string;
  gatewayEndpoint: string;
  gatewayToken: string;
  environment: string;
  inspectPrompts: boolean;
  blockSensitiveData: boolean;
  auditEnabled: boolean;
  applyProjectRules: boolean;
  rateLimitPerMinute: number;
  allowedUpstreamHosts: string[];
  blockedUpstreamHosts: string[];
  status: string;
  storesClientSecrets: boolean;
  lastRequestAt?: string | null;
  detectedServices: Array<{ id: string; name: string; provider: string; serviceType: string; status: string; coverage: number }>;
  lastRequest?: Record<string, unknown> | null;
  metrics: {
    latencyMs: number;
    processedToday: number;
    activeRules: number;
  };
};

type GatewayProxyResult = {
  status: number;
  decision?: string;
  riskLevel?: string;
  contentType?: string;
  body?: unknown;
  stream?: ReadableStream<Uint8Array> | null;
  headers?: Record<string, string>;
};

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function now() {
  return new Date().toISOString();
}

function rateLimitWindowMs() {
  return 60_000;
}

function checkRateLimit(projectId: string, token: string, limit: number) {
  const safeLimit = Math.max(1, limit || Number(process.env.OBERYN_GATEWAY_RATE_LIMIT_PER_MINUTE ?? 120));
  const key = `${projectId}:${crypto.createHash("sha256").update(token).digest("hex").slice(0, 16)}`;
  const currentTime = Date.now();
  const current = rateLimitBuckets.get(key);

  if (!current || current.resetAt <= currentTime) {
    const bucket = { count: 1, resetAt: currentTime + rateLimitWindowMs() };
    rateLimitBuckets.set(key, bucket);
    return { allowed: true, limit: safeLimit, remaining: safeLimit - 1, resetAt: bucket.resetAt };
  }

  current.count += 1;
  return {
    allowed: current.count <= safeLimit,
    limit: safeLimit,
    remaining: Math.max(0, safeLimit - current.count),
    resetAt: current.resetAt,
  };
}

function getSigningSecret() {
  return process.env.OBERYN_GATEWAY_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CLERK_SECRET_KEY || "oberyn-local-gateway-secret";
}

function createGatewayToken(projectId: string) {
  return `gw_${projectId}_${crypto.createHmac("sha256", getSigningSecret()).update(projectId).digest("hex").slice(0, 24)}`;
}

function isMissingGatewayTable(error: unknown) {
  const details = error as { code?: string; message?: string };
  return details?.code === "PGRST205" || details?.code === "42P01" || /gateway_configs|schema cache|does not exist/i.test(details?.message ?? "");
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function toConfig(row: Record<string, unknown>, extras: Omit<GatewayConfig, "projectId" | "upstreamBaseUrl" | "gatewayEndpoint" | "gatewayToken" | "environment" | "inspectPrompts" | "blockSensitiveData" | "auditEnabled" | "applyProjectRules" | "rateLimitPerMinute" | "allowedUpstreamHosts" | "blockedUpstreamHosts" | "status" | "storesClientSecrets" | "lastRequestAt">): GatewayConfig {
  const projectId = String(row.project_id);
  return {
    projectId,
    upstreamBaseUrl: String(row.upstream_base_url ?? "https://api.openai.com"),
    gatewayEndpoint: `/api/gateway/${projectId}/v1/chat/completions`,
    gatewayToken: String(row.gateway_token ?? createGatewayToken(projectId)),
    environment: String(row.environment ?? "production"),
    inspectPrompts: Boolean(row.inspect_prompts ?? true),
    blockSensitiveData: Boolean(row.block_sensitive_data ?? true),
    auditEnabled: Boolean(row.audit_enabled ?? true),
    applyProjectRules: Boolean(row.apply_project_rules ?? true),
    rateLimitPerMinute: Number(row.rate_limit_per_minute ?? 120),
    allowedUpstreamHosts: asStringArray(row.allowed_upstream_hosts),
    blockedUpstreamHosts: asStringArray(row.blocked_upstream_hosts),
    status: String(row.status ?? "operative"),
    storesClientSecrets: false,
    lastRequestAt: row.last_request_at ? new Date(String(row.last_request_at)).toISOString() : null,
    ...extras,
  };
}

async function getExtras(projectId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [integrations, lastAudit, processedToday, activeRules] = await Promise.all([
    supabaseAdmin.from("integrations").select("*").eq("project_id", projectId).eq("connection_method", "gateway").order("updated_at", { ascending: false }).limit(8),
    supabaseAdmin.from("audit_events").select("*").eq("project_id", projectId).eq("event_type", "gateway_request").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabaseAdmin.from("audit_events").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("event_type", "gateway_request").gte("created_at", today.toISOString()),
    supabaseAdmin.from("rules").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("is_active", true),
  ]);

  if (integrations.error) throw integrations.error;
  if (lastAudit.error) throw lastAudit.error;
  if (processedToday.error) throw processedToday.error;
  if (activeRules.error) throw activeRules.error;

  return {
    detectedServices: (integrations.data ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      provider: String(row.provider),
      serviceType: String(row.service_type),
      status: String(row.status),
      coverage: Number(row.coverage ?? 0),
    })),
    lastRequest: lastAudit.data
      ? {
          service: (lastAudit.data.metadata as Record<string, unknown>)?.serviceName ?? "Gateway",
          model: (lastAudit.data.metadata as Record<string, unknown>)?.model ?? "N/A",
          method: (lastAudit.data.metadata as Record<string, unknown>)?.method ?? lastAudit.data.action_name,
          decision: lastAudit.data.decision,
          createdAt: lastAudit.data.created_at,
        }
      : null,
    metrics: {
      latencyMs: Number((lastAudit.data?.metadata as Record<string, unknown> | undefined)?.durationMs ?? 0),
      processedToday: processedToday.count ?? 0,
      activeRules: activeRules.count ?? 0,
    },
  };
}

async function ensureConfig(projectId: string) {
  const extras = await getExtras(projectId);
  const { data, error } = await supabaseAdmin.from("gateway_configs").select("*").eq("project_id", projectId).maybeSingle();

  if (error && isMissingGatewayTable(error)) {
    return toConfig(
      {
        project_id: projectId,
        upstream_base_url: "https://api.openai.com",
        gateway_token: createGatewayToken(projectId),
        environment: "production",
        inspect_prompts: true,
        block_sensitive_data: true,
        audit_enabled: true,
        apply_project_rules: true,
        rate_limit_per_minute: 120,
        allowed_upstream_hosts: [],
        blocked_upstream_hosts: [],
        status: "operative",
      },
      extras,
    );
  }
  if (error) throw error;
  if (data) return toConfig(data, extras);

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("gateway_configs")
    .insert({ project_id: projectId, gateway_token: createGatewayToken(projectId), upstream_base_url: "https://api.openai.com" })
    .select("*")
    .single();

  if (insertError && isMissingGatewayTable(insertError)) {
    return toConfig({ project_id: projectId, gateway_token: createGatewayToken(projectId), upstream_base_url: "https://api.openai.com" }, extras);
  }
  if (insertError) throw insertError;
  return toConfig(inserted, extras);
}

function redact(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 10).map(redact);
  const blocked = ["authorization", "cookie", "password", "secret", "token", "apikey", "api_key", "key"];
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 40)
      .map(([key, item]) => [key, blocked.some((blockedKey) => key.toLowerCase().includes(blockedKey)) ? "[REDACTED]" : redact(item)]),
  );
}

function containsSensitiveData(value: unknown) {
  const text = JSON.stringify(value ?? {}).toLowerCase();
  return /(sk-[a-z0-9]|api[_-]?key|secret|password|token|ssn|credit.?card|tarjeta|contrase)/i.test(text);
}

function extractPromptText(body: unknown) {
  const payload = body as Record<string, unknown>;
  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  const messageText = messages
    .map((message) => {
      const content = (message as Record<string, unknown>)?.content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) return content.map((item) => JSON.stringify(item)).join(" ");
      return "";
    })
    .filter(Boolean)
    .join("\n");

  const prompt = typeof payload?.prompt === "string" ? payload.prompt : "";
  const input = typeof payload?.input === "string" ? payload.input : "";
  return [messageText, prompt, input].filter(Boolean).join("\n");
}

function detectPromptThreats(body: unknown) {
  const text = extractPromptText(body);
  if (!text) return { text, score: 0, matches: [] as string[] };

  const checks = [
    { name: "ignore_previous_instructions", pattern: /ignore (all )?(previous|prior|above) instructions/i, score: 35 },
    { name: "system_prompt_extraction", pattern: /system prompt|developer message|hidden instructions/i, score: 30 },
    { name: "jailbreak", pattern: /jailbreak|DAN|developer mode|roleplay/i, score: 25 },
    { name: "secret_exfiltration", pattern: /api[_-]?key|secret|password|token|authorization|cookie/i, score: 35 },
    { name: "policy_bypass", pattern: /bypass|disable safety|continue anyway|sin restricciones|omite las reglas/i, score: 25 },
  ];

  const matches = checks.filter((check) => check.pattern.test(text));
  return {
    text,
    score: Math.min(100, matches.reduce((total, match) => total + match.score, 0)),
    matches: matches.map((match) => match.name),
  };
}

function blockedDecisionFrom(decision: DecisionResult, reason: string, matchedRules: DecisionResult["matchedRules"]): DecisionResult {
  return {
    ...decision,
    decision: "blocked",
    riskLevel: "critical",
    reason,
    matchedRules: [...decision.matchedRules, ...matchedRules],
    createdAt: now(),
  };
}

function inferProvider(targetPath: string, body: unknown) {
  const text = `${targetPath} ${JSON.stringify(body ?? {})}`.toLowerCase();
  if (text.includes("deepseek")) return { name: "DeepSeek", provider: "deepseek", serviceType: "llm" };
  if (text.includes("anthropic")) return { name: "Anthropic", provider: "anthropic", serviceType: "llm" };
  if (text.includes("gemini") || text.includes("google")) return { name: "Google Gemini", provider: "google", serviceType: "llm" };
  if (text.includes("mistral")) return { name: "Mistral", provider: "mistral", serviceType: "llm" };
  if (text.includes("cohere")) return { name: "Cohere", provider: "cohere", serviceType: "llm" };
  if (text.includes("stripe")) return { name: "Stripe", provider: "stripe", serviceType: "payments" };
  if (text.includes("slack")) return { name: "Slack", provider: "slack", serviceType: "messaging" };
  if (text.includes("openai") || text.includes("chat/completions") || text.includes("gpt")) return { name: "OpenAI", provider: "openai", serviceType: "llm" };
  return { name: "API interna", provider: "custom", serviceType: "api" };
}

async function findOrCreateGatewayIntegration(projectId: string, service: { name: string; provider: string; serviceType: string }) {
  const { data: existing, error: existingError } = await supabaseAdmin.from("integrations").select("*").eq("project_id", projectId).eq("provider", service.provider).eq("connection_method", "gateway").limit(1).maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    const { data, error } = await supabaseAdmin.from("integrations").update({ status: "protected", coverage: 90, last_activity_at: now(), updated_at: now() }).eq("id", String(existing.id)).select("*").single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabaseAdmin
    .from("integrations")
    .insert({ project_id: projectId, name: service.name, provider: service.provider, service_type: service.serviceType, connection_method: "gateway", status: "protected", coverage: 90, last_activity_at: now() })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function auditGatewayRequest(params: {
  projectId: string;
  integrationId: string;
  path: string;
  method: string;
  body: unknown;
  decision: string;
  riskLevel: string;
  durationMs: number;
  status: number;
  serviceName: string;
}) {
  const { error } = await supabaseAdmin.from("audit_events").insert({
    project_id: params.projectId,
    integration_id: params.integrationId,
    event_type: "gateway_request",
    action_name: `${params.method} ${params.path}`,
    decision: params.decision,
    risk_level: params.riskLevel,
    event_hash: crypto.createHash("sha256").update(JSON.stringify({ ...params, at: now() })).digest("hex"),
    metadata: {
      path: params.path,
      method: params.method,
      status: params.status,
      durationMs: params.durationMs,
      serviceName: params.serviceName,
      payloadPreview: redact(params.body),
    },
  });
  if (error) throw error;
}

function extractGatewayToken(req: Request) {
  const headerToken = req.header("x-oberyn-gateway-token");
  const authorization = req.header("authorization");
  if (headerToken) return headerToken;
  if (authorization?.startsWith("Bearer ")) return authorization.slice("Bearer ".length);
  return "";
}

function buildUpstreamHeaders(req: Request) {
  const headers = new Headers();
  const passthrough = [
    "content-type",
    "accept",
    "accept-encoding",
    "anthropic-version",
    "anthropic-beta",
    "openai-organization",
    "openai-project",
    "openai-beta",
    "idempotency-key",
    "user-agent",
  ];

  for (const name of passthrough) {
    const value = req.header(name);
    if (value) headers.set(name, value);
  }

  const upstreamAuthorization = req.header("x-oberyn-upstream-authorization") ?? req.header("x-provider-authorization") ?? req.header("x-upstream-authorization");
  if (upstreamAuthorization) headers.set("authorization", upstreamAuthorization);

  const upstreamApiKey = req.header("x-oberyn-upstream-api-key") ?? req.header("x-provider-api-key") ?? req.header("x-upstream-api-key");
  if (upstreamApiKey) headers.set("x-api-key", upstreamApiKey);

  return headers;
}

function getUpstreamBaseUrl(req: Request, config: GatewayConfig) {
  const override = req.header("x-oberyn-upstream-base-url");
  if (!override) return config.upstreamBaseUrl;

  try {
    const url = new URL(override);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Invalid protocol");
    return url.origin;
  } catch {
    throw new Error("x-oberyn-upstream-base-url no es una URL valida.");
  }
}

function buildUpstreamBody(req: Request): BodyInit | undefined {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  if (Buffer.isBuffer(req.body)) return req.body as unknown as BodyInit;
  if (typeof req.body === "string") return req.body;
  return JSON.stringify(req.body ?? {});
}

async function readUpstreamBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? "application/json";
  const text = await response.text();
  if (contentType.includes("application/json")) {
    try {
      return { contentType, body: text ? JSON.parse(text) : null };
    } catch {
      return { contentType: "text/plain", body: text };
    }
  }
  return { contentType, body: text };
}

function isStreamResponse(req: Request, response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  const accept = req.header("accept") ?? "";
  return contentType.includes("text/event-stream") || accept.includes("text/event-stream") || req.header("x-oberyn-stream") === "true";
}

function isHostAllowed(config: GatewayConfig, upstreamUrl: string) {
  const host = new URL(upstreamUrl).hostname.toLowerCase();
  const allowed = config.allowedUpstreamHosts.map((item) => item.toLowerCase()).filter(Boolean);
  const blocked = config.blockedUpstreamHosts.map((item) => item.toLowerCase()).filter(Boolean);
  if (blocked.some((item) => host === item || host.endsWith(`.${item}`))) return false;
  if (!allowed.length) return true;
  return allowed.some((item) => host === item || host.endsWith(`.${item}`));
}

async function getApprovedGatewayOverride(projectId: string, approvalId: string | undefined, input: { actionName: string; service?: unknown }) {
  if (!approvalId) return null;
  const { data, error } = await supabaseAdmin.from("approval_requests").select("*").eq("project_id", projectId).eq("id", approvalId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("La aprobación indicada no existe para este proyecto.");
  if (String(data.status) !== "approved") throw new Error("La aprobación indicada todavía no está aprobada.");

  const preview = (data.payload_preview as Record<string, unknown>) ?? {};
  const originalAction = String(data.action_name ?? "");
  if (originalAction && originalAction !== input.actionName) throw new Error("La aprobación no corresponde a esta acción.");

  return {
    approvalId,
    payloadPreview: preview,
    service: input.service,
  };
}

function approvedDecisionFrom(decision: DecisionResult, approvalId: string): DecisionResult {
  return {
    ...decision,
    id: crypto.randomUUID(),
    decision: "approved",
    reason: `Acción aprobada manualmente. approvalId=${approvalId}`,
    matchedRules: [
      ...decision.matchedRules,
      { id: approvalId, name: "Aprobación humana", action: "approved", reason: "Solicitud aprobada desde Oberyn." },
    ],
    createdAt: now(),
  };
}

export const gatewayService = {
  getConfig: async (projectId: string) => ensureConfig(projectId),

  updateConfig: async (projectId: string, payload: Record<string, unknown>) => {
    const updates = {
      upstream_base_url: typeof payload.upstreamBaseUrl === "string" ? payload.upstreamBaseUrl : undefined,
      environment: typeof payload.environment === "string" ? payload.environment : undefined,
      inspect_prompts: typeof payload.inspectPrompts === "boolean" ? payload.inspectPrompts : undefined,
      block_sensitive_data: typeof payload.blockSensitiveData === "boolean" ? payload.blockSensitiveData : undefined,
      audit_enabled: typeof payload.auditEnabled === "boolean" ? payload.auditEnabled : undefined,
      apply_project_rules: typeof payload.applyProjectRules === "boolean" ? payload.applyProjectRules : undefined,
      rate_limit_per_minute: typeof payload.rateLimitPerMinute === "number" ? Math.max(1, Math.min(10_000, Math.round(payload.rateLimitPerMinute))) : undefined,
      allowed_upstream_hosts: Array.isArray(payload.allowedUpstreamHosts) ? payload.allowedUpstreamHosts.map(String).filter(Boolean) : undefined,
      blocked_upstream_hosts: Array.isArray(payload.blockedUpstreamHosts) ? payload.blockedUpstreamHosts.map(String).filter(Boolean) : undefined,
      updated_at: now(),
    };
    const clean = Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined));

    const { error } = await supabaseAdmin.from("gateway_configs").upsert({ project_id: projectId, gateway_token: createGatewayToken(projectId), ...clean }, { onConflict: "project_id" });
    if (error && !isMissingGatewayTable(error)) throw error;
    return ensureConfig(projectId);
  },

  test: async (projectId: string) => {
    const config = await ensureConfig(projectId);
    const service = await findOrCreateGatewayIntegration(projectId, { name: "OpenAI", provider: "openai", serviceType: "llm" });
    await auditGatewayRequest({
      projectId,
      integrationId: String(service.id),
      path: "/v1/chat/completions",
      method: "POST",
      body: { model: "gpt-4o", messages: [{ role: "user", content: "ping" }] },
      decision: "approved",
      riskLevel: "low",
      durationMs: 124,
      status: 200,
      serviceName: "OpenAI API",
    });
    return { projectId, ok: true, message: "Gateway operativo. Solicitud de prueba auditada.", config };
  },

  proxy: async (req: Request): Promise<GatewayProxyResult> => {
    const started = Date.now();
    const projectId = req.params.projectId;
    const config = await ensureConfig(projectId);
    const token = extractGatewayToken(req);
    if (token !== config.gatewayToken) return { status: 401, body: { success: false, error: { message: "Gateway token inválido." } } };

    const rateLimit = checkRateLimit(projectId, token, config.rateLimitPerMinute);
    const rateHeaders = {
      "x-oberyn-rate-limit": String(rateLimit.limit),
      "x-oberyn-rate-limit-remaining": String(rateLimit.remaining),
      "x-oberyn-rate-limit-reset": new Date(rateLimit.resetAt).toISOString(),
    };
    if (!rateLimit.allowed) {
      return { status: 429, headers: rateHeaders, body: { success: false, error: { message: "Límite de solicitudes del Gateway excedido. Intenta de nuevo en unos segundos." } } };
    }

    const path = `/${req.params[0] ?? ""}`;
    const upstreamBaseUrl = getUpstreamBaseUrl(req, config);
    const promptThreat = config.inspectPrompts ? detectPromptThreats(req.body) : { text: "", score: 0, matches: [] as string[] };
    const service = inferProvider(`${upstreamBaseUrl} ${path}`, req.body);
    const integration = await findOrCreateGatewayIntegration(projectId, service);
    const input = {
      projectId,
      source: "gateway" as const,
      eventType: "gateway_request",
      actionName: `${req.method.toUpperCase()} ${path}`,
      riskLevel: promptThreat.score >= 75 ? "critical" : promptThreat.score >= 50 ? "high" : req.method === "GET" ? "low" : "medium",
      service: { ...service, method: "gateway" },
      method: req.method.toUpperCase(),
      path,
      metadata: {
        upstreamBaseUrl,
        configuredUpstreamBaseUrl: config.upstreamBaseUrl,
        model: (req.body as Record<string, unknown> | undefined)?.model,
        promptThreatScore: promptThreat.score,
        promptThreatMatches: promptThreat.matches,
      },
      payload: req.body,
      blockSensitiveData: config.blockSensitiveData,
      ignoreProjectRules: !config.applyProjectRules,
    };
    let decision = await decisionService.evaluate(input);
    if (config.inspectPrompts && promptThreat.score >= 50) {
      decision = blockedDecisionFrom(decision, "Prompt malicioso detectado por Oberyn Gateway antes de contactar el proveedor.", [
        {
          id: "gateway-prompt-inspection",
          name: "Inspeccion de prompts del Gateway",
          action: "blocked",
          reason: `Patrones detectados: ${promptThreat.matches.join(", ")}`,
        },
      ]);
    }
    const approvalOverride = await getApprovedGatewayOverride(projectId, req.header("x-oberyn-approval-id") ?? undefined, { actionName: input.actionName, service: input.service });
    if (approvalOverride && decision.decision === "requires_approval") {
      decision = approvedDecisionFrom(decision, approvalOverride.approvalId);
    }

    if (decision.decision === "blocked" || decision.decision === "requires_approval") {
      const status = decision.decision === "blocked" ? 422 : 409;
      const auditEvent = config.auditEnabled ? await decisionService.recordAudit(input, decision, { integrationId: String(integration.id), eventType: "gateway_request", status, durationMs: Date.now() - started }) : null;
      const approval = await decisionService.createApprovalIfNeeded(input, decision, { integrationId: String(integration.id) });
      await supabaseAdmin.from("gateway_configs").update({ last_request_at: now(), status: "operative", updated_at: now() }).eq("project_id", projectId);
      await supabaseAdmin.from("projects").update({ status: "active", updated_at: now() }).eq("id", projectId);

      return {
        status,
        headers: rateHeaders,
        decision: decision.decision,
        riskLevel: decision.riskLevel,
        body: {
          success: false,
          decision: decision.decision,
          riskLevel: decision.riskLevel,
          reason: decision.reason,
          approvalId: approval ? String(approval.id) : null,
          auditEventId: auditEvent ? String(auditEvent.id) : null,
          error: { message: decision.reason },
        },
      };
    }

    const upstreamUrl = `${upstreamBaseUrl.replace(/\/$/, "")}${path}`;
    if (!isHostAllowed(config, upstreamUrl)) {
      return { status: 403, headers: rateHeaders, body: { success: false, error: { message: "El host upstream no está permitido para este proyecto." } } };
    }

    let upstreamStatus = 502;
    let responseBody: unknown = { success: false, error: { message: "No se pudo contactar el proveedor externo." } };
    let contentType = "application/json";
    let responseStream: ReadableStream<Uint8Array> | null = null;
    const responseHeaders: Record<string, string> = { ...rateHeaders };

    try {
      const upstreamResponse = await fetch(upstreamUrl, {
        method: req.method,
        headers: buildUpstreamHeaders(req),
        body: buildUpstreamBody(req),
      });
      upstreamStatus = upstreamResponse.status;
      contentType = upstreamResponse.headers.get("content-type") ?? contentType;
      if (isStreamResponse(req, upstreamResponse)) {
        responseStream = upstreamResponse.body;
      } else {
        const upstreamPayload = await readUpstreamBody(upstreamResponse);
        contentType = upstreamPayload.contentType;
        responseBody = upstreamPayload.body;
      }
    } catch (error) {
      responseBody = { success: false, error: { message: error instanceof Error ? error.message : "Error conectando con el proveedor externo." } };
    }

    const durationMs = Date.now() - started;
    if (config.auditEnabled) {
      await decisionService.recordAudit(input, decision, {
        integrationId: String(integration.id),
        eventType: "gateway_request",
        status: upstreamStatus,
        durationMs,
        extraMetadata: { upstreamUrl, upstreamStatus, approvalId: approvalOverride?.approvalId ?? null, streamed: Boolean(responseStream) },
      });
    }

    await supabaseAdmin.from("gateway_configs").update({ last_request_at: now(), status: "operative", updated_at: now() }).eq("project_id", projectId);
    await supabaseAdmin.from("projects").update({ status: "active", updated_at: now() }).eq("id", projectId);

    return {
      status: upstreamStatus,
      headers: responseHeaders,
      decision: decision.decision,
      riskLevel: decision.riskLevel,
      contentType,
      stream: responseStream,
      body: responseBody,
    };
  },
};
