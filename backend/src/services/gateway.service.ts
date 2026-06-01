import crypto from "node:crypto";
import type { Request } from "express";
import { supabaseAdmin } from "../config/supabase.js";

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

function now() {
  return new Date().toISOString();
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

function toConfig(row: Record<string, unknown>, extras: Omit<GatewayConfig, "projectId" | "upstreamBaseUrl" | "gatewayEndpoint" | "gatewayToken" | "environment" | "inspectPrompts" | "blockSensitiveData" | "auditEnabled" | "applyProjectRules" | "status" | "storesClientSecrets" | "lastRequestAt">): GatewayConfig {
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

function inferProvider(targetPath: string, body: unknown) {
  const text = `${targetPath} ${JSON.stringify(body ?? {})}`.toLowerCase();
  if (text.includes("anthropic")) return { name: "Anthropic", provider: "anthropic", serviceType: "llm" };
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

  proxy: async (req: Request) => {
    const started = Date.now();
    const projectId = req.params.projectId;
    const config = await ensureConfig(projectId);
    const token = extractGatewayToken(req);
    if (token !== config.gatewayToken) return { status: 401, body: { success: false, error: { message: "Gateway token invalido." } } };

    const path = `/${req.params[0] ?? ""}`;
    const service = inferProvider(path, req.body);
    const integration = await findOrCreateGatewayIntegration(projectId, service);
    const sensitive = config.blockSensitiveData && containsSensitiveData(req.body);
    const decision = sensitive ? "blocked" : "approved";
    const riskLevel = sensitive ? "critical" : req.method === "GET" ? "low" : "medium";
    const status = sensitive ? 422 : 202;
    const durationMs = Date.now() - started;

    if (config.auditEnabled) {
      await auditGatewayRequest({
        projectId,
        integrationId: String(integration.id),
        path,
        method: req.method,
        body: req.body,
        decision,
        riskLevel,
        durationMs,
        status,
        serviceName: service.name,
      });
    }

    await supabaseAdmin.from("gateway_configs").update({ last_request_at: now(), status: "operative", updated_at: now() }).eq("project_id", projectId);
    await supabaseAdmin.from("projects").update({ status: "active", updated_at: now() }).eq("id", projectId);

    if (sensitive) {
      return { status, body: { success: false, decision, riskLevel, error: { message: "Gateway bloqueo datos sensibles antes de salir." } } };
    }

    return {
      status,
      body: {
        success: true,
        decision,
        riskLevel,
        proxied: true,
        upstreamBaseUrl: config.upstreamBaseUrl,
        upstreamPath: path,
        service,
        message: "Solicitud inspeccionada y auditada por Gateway.",
      },
    };
  },
};
