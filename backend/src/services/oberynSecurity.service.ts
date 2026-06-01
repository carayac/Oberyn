import { createHash, randomBytes } from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type PolicyDecision = "allow" | "block" | "requires_approval";

export type ProjectApiKey = {
  id: string;
  projectId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: string;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
};

export type VerifiedProjectKey = ProjectApiKey & {
  organizationId: string;
  projectName: string;
};

export type DecisionInput = {
  projectId: string;
  apiKeyId?: string | null;
  source: "sdk" | "gateway";
  subject?: string;
  actionName: string;
  service: string;
  riskLevel?: RiskLevel | string;
  payload?: unknown;
};

const sensitivePatterns = [
  { id: "secret-key", label: "Posible API key o secreto", pattern: /(sk-[a-zA-Z0-9_-]{20,}|sb_secret_[a-zA-Z0-9_-]+|api[_-]?key\s*[:=])/i },
  { id: "credit-card", label: "Posible tarjeta de credito", pattern: /\b(?:\d[ -]*?){13,19}\b/ },
  { id: "password", label: "Posible contraseña", pattern: /(password|contraseña|passwd)\s*[:=]/i },
];

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function stablePreview(value: unknown) {
  if (value === undefined || value === null) return {};
  const raw = typeof value === "string" ? value : JSON.stringify(value);
  if (!raw) return {};
  return { text: raw.slice(0, 4000), truncated: raw.length > 4000 };
}

function asText(value: unknown) {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return "";
  return JSON.stringify(value);
}

function normalizeRisk(risk?: string): RiskLevel {
  if (risk === "critical" || risk === "high" || risk === "medium" || risk === "low") return risk;
  return "low";
}

function toApiKey(row: Record<string, unknown>): ProjectApiKey {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    name: String(row.name),
    keyPrefix: String(row.key_prefix),
    scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : [],
    status: String(row.status),
    lastUsedAt: row.last_used_at ? new Date(String(row.last_used_at)).toISOString() : null,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)).toISOString() : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

async function ensureDetectedIntegration(projectId: string, service: string, method: "sdk" | "gateway") {
  const normalizedService = service.trim().toLowerCase() || "unknown";
  const { data: existing, error: readError } = await supabaseAdmin
    .from("integrations")
    .select("*")
    .eq("project_id", projectId)
    .eq("provider", normalizedService)
    .maybeSingle();
  if (readError) throw readError;

  if (existing) {
    await supabaseAdmin
      .from("integrations")
      .update({
        connection_method: method,
        status: "active",
        coverage: 100,
        last_activity_at: new Date().toISOString(),
        last_detected_via: method,
      })
      .eq("id", existing.id);
    return existing.id as string;
  }

  const { data, error } = await supabaseAdmin
    .from("integrations")
    .insert({
      project_id: projectId,
      name: normalizedService,
      provider: normalizedService,
      service_type: normalizedService.includes("openai") || normalizedService.includes("anthropic") ? "llm" : "api",
      connection_method: method,
      status: "active",
      coverage: 100,
      last_activity_at: new Date().toISOString(),
      first_detected_at: new Date().toISOString(),
      last_detected_via: method,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function writeAudit(projectId: string, input: DecisionInput, decision: PolicyDecision, reason: string, metadata: Record<string, unknown>) {
  const { error } = await supabaseAdmin.from("audit_events").insert({
    project_id: projectId,
    event_type: input.source === "gateway" ? "gateway.policy_decision" : "sdk.policy_decision",
    action_name: input.actionName,
    decision,
    risk_level: normalizeRisk(input.riskLevel),
    event_hash: hashValue(JSON.stringify({ input, decision, at: Date.now() })),
    metadata,
  });
  if (error) throw error;
}

export const oberynSecurityService = {
  hashValue,
  stablePreview,

  createProjectKey: async (projectId: string, name = "Default SDK key") => {
    const rawKey = `oberyn_live_${randomBytes(24).toString("base64url")}`;
    const keyPrefix = rawKey.slice(0, 18);
    const { data, error } = await supabaseAdmin
      .from("project_api_keys")
      .insert({
        project_id: projectId,
        name,
        key_prefix: keyPrefix,
        key_hash: hashValue(rawKey),
      })
      .select("*")
      .single();
    if (error) throw error;
    return { key: rawKey, apiKey: toApiKey(data) };
  },

  listProjectKeys: async (projectId: string) => {
    const { data, error } = await supabaseAdmin.from("project_api_keys").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toApiKey);
  },

  revokeProjectKey: async (projectId: string, keyId: string) => {
    const { data, error } = await supabaseAdmin
      .from("project_api_keys")
      .update({ status: "revoked" })
      .eq("project_id", projectId)
      .eq("id", keyId)
      .select("*")
      .single();
    if (error) throw error;
    return toApiKey(data);
  },

  verifyProjectKey: async (rawKey?: string | null, requiredScope?: string): Promise<VerifiedProjectKey> => {
    const key = rawKey?.replace(/^Bearer\s+/i, "").trim();
    if (!key) {
      const error = new Error("Missing Oberyn project key.");
      (error as { status?: number }).status = 401;
      throw error;
    }

    const { data, error } = await supabaseAdmin.from("project_api_keys").select("*, projects(id, organization_id, name)").eq("key_hash", hashValue(key)).maybeSingle();
    if (error) throw error;
    if (!data || data.status !== "active") {
      const authError = new Error("Invalid or revoked Oberyn project key.");
      (authError as { status?: number }).status = 401;
      throw authError;
    }

    const apiKey = toApiKey(data);
    if (requiredScope && !apiKey.scopes.includes(requiredScope)) {
      const scopeError = new Error(`Project key does not include scope ${requiredScope}.`);
      (scopeError as { status?: number }).status = 403;
      throw scopeError;
    }

    await supabaseAdmin.from("project_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", apiKey.id);
    const project = data.projects as { organization_id?: string; name?: string } | null;
    return { ...apiKey, organizationId: String(project?.organization_id ?? ""), projectName: String(project?.name ?? "") };
  },

  evaluate: async (input: DecisionInput) => {
    const risk = normalizeRisk(input.riskLevel);
    const payloadText = asText(input.payload);
    const matchedRules: Array<{ id: string; reason: string; action: PolicyDecision }> = [];
    let decision: PolicyDecision = "allow";
    let reason = "Action allowed by default project policy.";

    for (const sensitivePattern of sensitivePatterns) {
      if (sensitivePattern.pattern.test(payloadText)) {
        matchedRules.push({ id: sensitivePattern.id, reason: sensitivePattern.label, action: "block" });
        decision = "block";
        reason = sensitivePattern.label;
      }
    }

    if (decision === "allow" && (risk === "high" || risk === "critical")) {
      decision = risk === "critical" ? "block" : "requires_approval";
      reason = risk === "critical" ? "Critical risk actions are blocked until an explicit rule is configured." : "High risk action requires human approval.";
    }

    const { data: rules, error: rulesError } = await supabaseAdmin.from("rules").select("*").eq("project_id", input.projectId).eq("is_active", true);
    if (rulesError) throw rulesError;

    for (const rule of rules ?? []) {
      const category = String(rule.category ?? "").toLowerCase();
      const conditionType = String(rule.condition_type ?? "").toLowerCase();
      const result = String(rule.action_result ?? "").toLowerCase();
      const severity = String(rule.severity ?? "").toLowerCase();
      const matches =
        category === input.service.toLowerCase() ||
        conditionType === input.actionName.toLowerCase() ||
        conditionType === risk ||
        payloadText.toLowerCase().includes(conditionType);

      if (!matches) continue;

      const action: PolicyDecision = result.includes("block") ? "block" : result.includes("approval") || severity === "high" ? "requires_approval" : "allow";
      matchedRules.push({ id: String(rule.id), reason: String(rule.name ?? "Project rule matched"), action });
      if (action === "block" || (action === "requires_approval" && decision !== "block")) {
        decision = action;
        reason = String(rule.name ?? reason);
      }
    }

    await ensureDetectedIntegration(input.projectId, input.service, input.source);

    const { data: createdDecision, error } = await supabaseAdmin
      .from("policy_decisions")
      .insert({
        project_id: input.projectId,
        api_key_id: input.apiKeyId ?? null,
        source: input.source,
        subject: input.subject ?? null,
        action_name: input.actionName,
        service: input.service,
        risk_level: risk,
        decision,
        reason,
        matched_rules: matchedRules,
        payload_preview: stablePreview(input.payload),
        request_hash: hashValue(payloadText),
      })
      .select("*")
      .single();
    if (error) throw error;

    if (decision === "requires_approval") {
      await supabaseAdmin.from("approval_requests").insert({
        project_id: input.projectId,
        action_name: input.actionName,
        risk_level: risk,
        status: "pending_approval",
        reason,
        payload_preview: stablePreview(input.payload),
      });
    }

    await writeAudit(input.projectId, input, decision, reason, { decisionId: createdDecision.id, matchedRules, service: input.service });

    return {
      id: createdDecision.id as string,
      decision,
      reason,
      riskLevel: risk,
      matchedRules,
      audit: { recorded: true },
    };
  },
};
