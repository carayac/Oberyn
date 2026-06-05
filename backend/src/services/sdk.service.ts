import crypto from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";
import { containsSensitiveData, decisionService, normalizeDecision, normalizeRisk } from "./decision.service.js";
import { payguardService } from "./payguard.service.js";

type SdkEventInput = {
  eventType?: string;
  actionName?: string;
  decision?: string;
  riskLevel?: string;
  reason?: string;
  traceparent?: string;
  service?: {
    name?: string;
    provider?: string;
    type?: string;
    method?: string;
  };
  metadata?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

type SdkKeyRow = {
  id: string;
  project_id: string;
  public_key: string;
  status: string;
};

const riskRank: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const defaultRules = [
  {
    name: "Requerir aprobación para acciones críticas",
    category: "approval",
    severity: "high",
    condition_type: "risk_level",
    action_result: "require_approval",
    scope: "project",
  },
  {
    name: "Auditoría mínima obligatoria",
    category: "audit",
    severity: "medium",
    condition_type: "all_actions",
    action_result: "audit",
    scope: "project",
  },
];

function now() {
  return new Date().toISOString();
}

function createPublicKey() {
  return `ob_pk_${crypto.randomBytes(24).toString("hex")}`;
}

function getSigningSecret() {
  return process.env.OBERYN_SDK_FALLBACK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CLERK_SECRET_KEY || "oberyn-local-development-secret";
}

function signProjectId(projectId: string) {
  return crypto.createHmac("sha256", getSigningSecret()).update(projectId).digest("hex").slice(0, 24);
}

function createFallbackPublicKey(projectId: string) {
  return `ob_pk_${projectId}_${signProjectId(projectId)}`;
}

function isMissingSdkKeysTable(error: unknown) {
  const details = error as { code?: string; message?: string };
  return details?.code === "PGRST205" || details?.code === "42P01" || /sdk_keys|schema cache|does not exist/i.test(details?.message ?? "");
}

async function ensureProjectExists(projectId: string) {
  const { data, error } = await supabaseAdmin.from("projects").select("id").eq("id", projectId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("El proyecto asociado a la clave SDK no existe.");
}

function parseFallbackPublicKey(publicKey: string) {
  if (!publicKey.startsWith("ob_pk_")) return null;
  const body = publicKey.slice("ob_pk_".length);
  const splitIndex = body.lastIndexOf("_");
  if (splitIndex <= 0) return null;

  const projectId = body.slice(0, splitIndex);
  const signature = body.slice(splitIndex + 1);
  const expected = signProjectId(projectId);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  return projectId;
}

function normalizeText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function payloadText(value: unknown) {
  try {
    return JSON.stringify(value ?? {}).slice(0, 60_000);
  } catch {
    return "";
  }
}

function metadataText(metadata?: Record<string, unknown>) {
  const method = typeof metadata?.method === "string" ? metadata.method : "";
  const url = typeof metadata?.url === "string" ? metadata.url : "";
  const status = typeof metadata?.status === "number" ? String(metadata.status) : "";
  return `${method} ${url} ${status}`;
}

function amountFromPayload(payload?: Record<string, unknown>) {
  if (!payload) return 0;
  for (const key of ["amount", "total", "value", "price", "paymentAmount", "refundAmount"]) {
    const value = payload[key];
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function inferEventRisk(event: SdkEventInput) {
  if (event.riskLevel) return normalizeRisk(event.riskLevel);
  const actionName = normalizeText(event.actionName, "unknown_action");
  const text = `${actionName} ${event.eventType ?? ""} ${metadataText(event.metadata)} ${event.service?.provider ?? ""} ${event.service?.type ?? ""}`;
  const payload = event.payload ?? {};
  const amount = amountFromPayload(payload);

  if (containsSensitiveData(payload) || /api[_-]?key|secret|password|token|authorization|cookie|private.?key/i.test(payloadText(payload))) return "critical";
  if (/delete|drop|truncate|destroy|admin|root|permission|credential|secret|password|token|api[_-]?key|private.?key/i.test(text)) return "critical";
  if (amount >= 10_000) return "critical";
  if (/refund|transfer|payout|payment|charge|withdraw|export|send.?email|invite|impersonate/i.test(text)) return "high";
  if (amount >= 1_000) return "high";
  if (/post|put|patch|create|update|write|modify|publish|upload/i.test(text)) return "medium";
  return "low";
}

function inferEventDecision(event: SdkEventInput) {
  if (event.decision) return normalizeDecision(event.decision);
  const status = typeof event.metadata?.status === "number" ? event.metadata.status : undefined;
  if (typeof status === "number" && status >= 400) return "blocked";
  if (event.reason) return "blocked";
  return "approved";
}

function eventHash(projectId: string, event: SdkEventInput) {
  return crypto.createHash("sha256").update(JSON.stringify({ projectId, event, receivedAt: now() })).digest("hex");
}

function inferService(event: SdkEventInput) {
  const metadata = event.metadata ?? {};
  const url = typeof metadata.url === "string" ? metadata.url : "";
  let host = "";
  try {
    host = url ? new URL(url).hostname : "";
  } catch {
    host = "";
  }

  const provider = normalizeText(event.service?.provider, host || "custom").toLowerCase();
  const name = normalizeText(event.service?.name, provider === "custom" ? "Servicio detectado" : provider);
  const serviceType = normalizeText(event.service?.type, event.eventType === "http_request" ? "api" : "application");
  const connectionMethod = normalizeText(event.service?.method, "sdk");

  return { provider, name, serviceType, connectionMethod };
}

async function ensureSdkKey(projectId: string) {
  const { data: existing, error: existingError } = await supabaseAdmin.from("sdk_keys").select("*").eq("project_id", projectId).eq("status", "active").order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (existingError && isMissingSdkKeysTable(existingError)) {
    return { id: "fallback", project_id: projectId, public_key: createFallbackPublicKey(projectId), status: "active" } as SdkKeyRow;
  }
  if (existingError) throw existingError;
  if (existing) return existing as SdkKeyRow;

  const { data, error } = await supabaseAdmin
    .from("sdk_keys")
    .insert({ project_id: projectId, name: "Default SDK key", public_key: createPublicKey(), status: "active" })
    .select("*")
    .single();
  if (error && isMissingSdkKeysTable(error)) {
    return { id: "fallback", project_id: projectId, public_key: createFallbackPublicKey(projectId), status: "active" } as SdkKeyRow;
  }
  if (error) throw error;
  return data as SdkKeyRow;
}

async function resolveSdkKey(publicKey: string) {
  if (!publicKey) throw new Error("Falta x-oberyn-key para enviar eventos del SDK.");

  const { data, error } = await supabaseAdmin.from("sdk_keys").select("*").eq("public_key", publicKey).eq("status", "active").maybeSingle();
  if (error && isMissingSdkKeysTable(error)) {
    const projectId = parseFallbackPublicKey(publicKey);
    if (!projectId) throw new Error("La clave del SDK no es válida. Aplica la migración sdk_keys o vuelve a copiar la clave desde la página SDK.");
    await ensureProjectExists(projectId);
    return { id: "fallback", project_id: projectId, public_key: publicKey, status: "active" } as SdkKeyRow;
  }
  if (error) throw error;
  if (!data) throw new Error("La clave del SDK no es válida o está inactiva.");

  await supabaseAdmin.from("sdk_keys").update({ last_used_at: now(), updated_at: now() }).eq("id", String(data.id));
  return data as SdkKeyRow;
}

async function ensureDefaultRules(projectId: string) {
  const { count, error: countError } = await supabaseAdmin.from("rules").select("id", { count: "exact", head: true }).eq("project_id", projectId);
  if (countError) throw countError;
  if ((count ?? 0) > 0) return;

  const { error } = await supabaseAdmin.from("rules").insert(defaultRules.map((rule) => ({ ...rule, project_id: projectId, is_active: true })));
  if (error) throw error;
}

async function findOrCreateIntegration(projectId: string, event: SdkEventInput) {
  const service = inferService(event);
  const baseQuery = supabaseAdmin.from("integrations").select("*").eq("project_id", projectId).eq("provider", service.provider);
  const { data: existing, error: existingError } =
    service.provider === "custom"
      ? await baseQuery.eq("name", service.name).limit(1).maybeSingle()
      : await baseQuery.order("last_activity_at", { ascending: false, nullsFirst: false }).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("integrations")
      .update({ status: "protected", coverage: Math.max(Number(existing.coverage ?? 0), 80), last_activity_at: now(), updated_at: now() })
      .eq("id", String(existing.id))
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabaseAdmin
    .from("integrations")
    .insert({
      project_id: projectId,
      name: service.name,
      provider: service.provider,
      service_type: service.serviceType,
      connection_method: service.connectionMethod === "gateway" ? "gateway" : "sdk",
      status: "protected",
      coverage: 80,
      last_activity_at: now(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function ensureFlow(projectId: string, integrationId: string, event: SdkEventInput) {
  const actionName = normalizeText(event.actionName, "unknown_action");
  const { data: existing, error: existingError } = await supabaseAdmin.from("flows").select("*").eq("project_id", projectId).eq("action_key", actionName).limit(1).maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  const { data, error } = await supabaseAdmin
    .from("flows")
    .insert({
      project_id: projectId,
      name: actionName.replace(/[_-]+/g, " "),
      action_key: actionName,
      service_id: integrationId,
      environment: normalizeText(event.metadata?.environment, "sandbox"),
      status: "active",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function ingestResolvedEvent(projectId: string, event: SdkEventInput) {
  await ensureDefaultRules(projectId);
  const integration = await findOrCreateIntegration(projectId, event);
  await ensureFlow(projectId, String(integration.id), event);

  const actionName = normalizeText(event.actionName, "unknown_action");
  const decision = inferEventDecision(event);
  const riskLevel = inferEventRisk(event);
  const metadata = {
    ...(event.metadata ?? {}),
    oberynBackendInference: {
      inferred: !event.decision || !event.riskLevel,
      decision,
      riskLevel,
    },
    payloadPreview: event.payload ?? undefined,
    traceparent: event.traceparent ?? undefined,
    sdkReceivedAt: now(),
  };

  const { data: auditEvent, error: auditError } = await supabaseAdmin
    .from("audit_events")
    .insert({
      project_id: projectId,
      integration_id: String(integration.id),
      event_type: normalizeText(event.eventType, "sdk_event"),
      action_name: actionName,
      decision,
      risk_level: riskLevel,
      event_hash: eventHash(projectId, event),
      metadata,
      created_at: now(),
    })
    .select("*")
    .single();
  if (auditError) throw auditError;

  if (decision === "requires_approval" || riskRank[riskLevel] >= riskRank.high) {
    const { error: approvalError } = await supabaseAdmin.from("approval_requests").insert({
      project_id: projectId,
      integration_id: String(integration.id),
      action_name: actionName,
      risk_level: riskLevel,
      status: "pending_approval",
      reason: event.reason ?? (riskRank[riskLevel] >= riskRank.high ? "Acción de alto riesgo detectada por SDK." : "Aprobación requerida por política."),
      payload_preview: event.payload ?? {},
      requested_at: now(),
    });
    if (approvalError) throw approvalError;
  }

  await supabaseAdmin.from("projects").update({ status: "active", updated_at: now() }).eq("id", projectId);
  return auditEvent;
}

function sdkDecisionInput(projectId: string, payload: SdkEventInput) {
  return {
    projectId,
    source: "sdk" as const,
    eventType: payload.eventType ?? "sdk_guard",
    actionName: normalizeText(payload.actionName, "unknown_action"),
    riskLevel: payload.riskLevel ?? inferEventRisk(payload),
    service: payload.service,
    metadata: payload.metadata,
    payload: payload.payload,
    blockSensitiveData: true,
  };
}

export const sdkService = {
  getConfig: async (projectId: string) => {
    const key = await ensureSdkKey(projectId);
    return {
      projectId,
      publicKey: key.public_key,
      endpoint: "/api/sdk/events",
      evaluateEndpoint: "/api/sdk/evaluate",
      auditEndpoint: "/api/sdk/audit",
      packageName: "oberyn",
      environment: "sandbox",
      protectsCriticalActions: true,
      storesClientSecrets: false,
    };
  },

  testEvent: async (projectId: string, payload: Record<string, unknown>) => {
    const event = await ingestResolvedEvent(projectId, {
      eventType: "test_event",
      actionName: "sdk_test_event",
      decision: "approved",
      riskLevel: "low",
      service: { name: "SDK Test", provider: "oberyn", type: "test", method: "sdk" },
      metadata: payload,
    });
    return { projectId, accepted: true, eventId: String(event.id) };
  },

  evaluate: async (publicKey: string, payload: SdkEventInput) => {
    const key = await resolveSdkKey(publicKey);
    const projectId = String(key.project_id);
    await ensureDefaultRules(projectId);
    const integration = await findOrCreateIntegration(projectId, payload);
    await ensureFlow(projectId, String(integration.id), payload);

    const input = sdkDecisionInput(projectId, payload);
    const decision = await decisionService.evaluate(input);
    const auditEvent = await decisionService.recordAudit(input, decision, { integrationId: String(integration.id), eventType: "sdk_decision" });
    const approval = await decisionService.createApprovalIfNeeded(input, decision, { integrationId: String(integration.id) });

    await supabaseAdmin.from("projects").update({ status: "active", updated_at: now() }).eq("id", projectId);
    return {
      id: decision.id,
      decision: decision.decision,
      reason: decision.reason,
      riskLevel: decision.riskLevel,
      matchedRules: decision.matchedRules,
      sensitiveDataDetected: decision.sensitiveDataDetected,
      approvalId: approval ? String(approval.id) : null,
      auditEventId: String(auditEvent.id),
      audit: { recorded: true },
    };
  },

  audit: async (publicKey: string, payload: SdkEventInput & { decisionId?: string; status?: string; response?: unknown; error?: string }) => {
    const key = await resolveSdkKey(publicKey);
    const projectId = String(key.project_id);
    const integration = await findOrCreateIntegration(projectId, payload);
    await ensureFlow(projectId, String(integration.id), payload);

    const status = normalizeText(payload.status, "completed");
    const decision = {
      id: payload.decisionId ?? crypto.randomUUID(),
      projectId,
      decision: normalizeDecision(status === "failed" ? "blocked" : payload.decision),
      riskLevel: normalizeRisk(payload.riskLevel),
      reason: payload.reason ?? (status === "failed" ? "La acción falló durante la ejecución." : "Resultado de ejecución registrado."),
      matchedRules: [],
      sensitiveDataDetected: false,
      createdAt: now(),
    };
    const auditEvent = await decisionService.recordAudit(sdkDecisionInput(projectId, payload), decision, {
      integrationId: String(integration.id),
      eventType: "sdk_execution",
      extraMetadata: {
        executionStatus: status,
        responsePreview: payload.response,
        executionError: payload.error,
      },
    });

    await supabaseAdmin.from("projects").update({ status: "active", updated_at: now() }).eq("id", projectId);
    return { recorded: true, projectId, eventId: String(auditEvent.id), decisionId: decision.id };
  },

  approvalStatus: async (publicKey: string, payload: { decisionId?: string; approvalId?: string }) => {
    const key = await resolveSdkKey(publicKey);
    const projectId = String(key.project_id);
    const decisionId = normalizeText(payload.decisionId, "");
    const approvalId = normalizeText(payload.approvalId, "");

    if (!decisionId && !approvalId) throw new Error("Indica decisionId o approvalId para consultar la aprobación.");

    const query = supabaseAdmin.from("approval_requests").select("*").eq("project_id", projectId);
    const { data, error } = approvalId
      ? await query.eq("id", approvalId).maybeSingle()
      : await query.contains("payload_preview", { decisionId }).order("requested_at", { ascending: false }).limit(1).maybeSingle();

    if (error) throw error;
    if (!data) return { projectId, decisionId, approvalId: approvalId || null, status: "not_found", approved: false, rejected: false };

    return {
      projectId,
      decisionId: String(((data.payload_preview as Record<string, unknown>) ?? {}).decisionId ?? decisionId),
      approvalId: String(data.id),
      status: String(data.status),
      approved: String(data.status) === "approved",
      rejected: String(data.status) === "rejected",
      reason: data.reason ? String(data.reason) : null,
      resolvedAt: data.resolved_at ? new Date(String(data.resolved_at)).toISOString() : null,
    };
  },

  payguardConfig: async (publicKey: string) => {
    const key = await resolveSdkKey(publicKey);
    const summary = await payguardService.summary(String(key.project_id));
    return {
      projectId: String(key.project_id),
      agents: summary.agents
        .filter((agent) => agent.canCreatePaymentRequest)
        .map((agent) => ({
          id: agent.id,
          name: agent.name,
          status: agent.status,
          riskLevel: agent.riskLevel,
          maxAmount: agent.maxAmount,
          canCreatePaymentRequest: agent.canCreatePaymentRequest,
          canApprovePayment: agent.canApprovePayment,
          canExecutePayment: agent.canExecutePayment,
        })),
      trustedWallets: summary.trustedWallets
        .filter((wallet) => wallet.isVerified)
        .map((wallet) => ({
          id: wallet.id,
          recipientName: wallet.recipientName,
          walletAddress: wallet.walletAddress,
          token: wallet.token,
          isVerified: wallet.isVerified,
        })),
      trustlessWork: summary.trustlessWork,
    };
  },

  createPayGuardPaymentRequest: async (publicKey: string, payload: Record<string, unknown>) => {
    const key = await resolveSdkKey(publicKey);
    return payguardService.createPaymentRequest(String(key.project_id), payload);
  },

  ingestEvent: async (publicKey: string, payload: SdkEventInput) => {
    const key = await resolveSdkKey(publicKey);
    const event = await ingestResolvedEvent(String(key.project_id), payload);
    return { accepted: true, projectId: String(key.project_id), eventId: String(event.id) };
  },

  ingestBatch: async (publicKey: string, payload: { events?: SdkEventInput[] }) => {
    const key = await resolveSdkKey(publicKey);
    const events = Array.isArray(payload.events) ? payload.events.slice(0, 50) : [];
    const inserted = [];

    for (const event of events) {
      inserted.push(await ingestResolvedEvent(String(key.project_id), event));
    }

    return { accepted: true, projectId: String(key.project_id), count: inserted.length };
  },

  heartbeat: async (publicKey: string, payload: SdkEventInput) => {
    const key = await resolveSdkKey(publicKey);
    await ensureDefaultRules(String(key.project_id));
    await supabaseAdmin.from("projects").update({ status: "active", updated_at: now() }).eq("id", String(key.project_id));
    return { accepted: true, projectId: String(key.project_id), receivedAt: now(), metadata: payload.metadata ?? {} };
  },
};
