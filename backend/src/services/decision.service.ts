import crypto from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";

export type DecisionStatus = "approved" | "blocked" | "requires_approval";
export type DecisionRisk = "low" | "medium" | "high" | "critical";

export type DecisionServiceInput = {
  projectId: string;
  source: "sdk" | "gateway" | "api";
  eventType?: string;
  actionName?: string;
  riskLevel?: string;
  service?: {
    name?: string;
    provider?: string;
    type?: string;
    method?: string;
  };
  method?: string;
  path?: string;
  metadata?: Record<string, unknown>;
  payload?: unknown;
  blockSensitiveData?: boolean;
  ignoreProjectRules?: boolean;
};

export type DecisionResult = {
  id: string;
  projectId: string;
  decision: DecisionStatus;
  riskLevel: DecisionRisk;
  reason: string;
  matchedRules: Array<{
    id: string;
    name: string;
    action: DecisionStatus | "audit";
    reason: string;
  }>;
  sensitiveDataDetected: boolean;
  createdAt: string;
};

const riskRank: Record<DecisionRisk, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const sensitivePattern = /(sk-[a-z0-9]|api[_-]?key|secret|password|token|ssn|credit.?card|tarjeta|contrase(?:ñ|n)a|authorization|cookie)/i;

function now() {
  return new Date().toISOString();
}

export function normalizeRisk(value: unknown): DecisionRisk {
  const risk = typeof value === "string" ? value.toLowerCase() : "";
  return risk === "critical" || risk === "high" || risk === "medium" || risk === "low" ? risk : "low";
}

function normalizeAction(value: unknown): DecisionStatus | "audit" {
  const action = typeof value === "string" ? value.toLowerCase() : "";
  if (["block", "blocked", "deny", "denied"].includes(action)) return "blocked";
  if (["require_approval", "requires_approval", "approval", "pending_approval"].includes(action)) return "requires_approval";
  if (["audit", "log"].includes(action)) return "audit";
  return "approved";
}

export function normalizeDecision(value: unknown): DecisionStatus {
  const decision = typeof value === "string" ? value.toLowerCase() : "";
  if (["block", "blocked", "deny", "denied", "rejected", "bloqueada"].includes(decision)) return "blocked";
  if (["require_approval", "requires_approval", "pending_approval", "approval", "aprobacion"].includes(decision)) return "requires_approval";
  return "approved";
}

export function redact(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map(redact);

  const blockedKeys = ["authorization", "cookie", "password", "secret", "token", "apikey", "api_key", "key", "credential"];
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 60)
      .map(([key, item]) => [key, blockedKeys.some((blockedKey) => key.toLowerCase().includes(blockedKey)) ? "[REDACTED]" : redact(item)]),
  );
}

export function containsSensitiveData(value: unknown) {
  if (value == null) return false;
  return sensitivePattern.test(JSON.stringify(value).slice(0, 80_000));
}

export function eventHash(input: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify({ input, at: now() })).digest("hex");
}

function textIncludes(haystack: unknown, needle: string) {
  if (!needle) return false;
  return String(haystack ?? "").toLowerCase().includes(needle.toLowerCase());
}

function actionAlias(actionName: string) {
  return actionName.replace(/[_-]+/g, " ").trim().toLowerCase();
}

function matchesRule(rule: Record<string, unknown>, input: DecisionServiceInput, riskLevel: DecisionRisk, sensitiveDataDetected: boolean) {
  const conditionType = String(rule.condition_type ?? "custom").toLowerCase();
  const ruleText = `${rule.name ?? ""} ${rule.description ?? ""} ${rule.scope ?? ""}`.toLowerCase();
  const actionName = String(input.actionName ?? input.method ?? "unknown_action");
  const serviceProvider = String(input.service?.provider ?? "").toLowerCase();
  const serviceType = String(input.service?.type ?? "").toLowerCase();
  const eventType = String(input.eventType ?? "").toLowerCase();
  const method = String(input.method ?? "").toLowerCase();

  if (conditionType === "all_actions") return true;
  if (conditionType === "risk_level") return riskRank[riskLevel] >= riskRank[normalizeRisk(rule.severity)];
  if (conditionType === "sensitive_data") return sensitiveDataDetected;
  if (conditionType === "action_name") return textIncludes(ruleText, actionName) || textIncludes(ruleText, actionAlias(actionName));
  if (conditionType === "service_provider" || conditionType === "provider") return Boolean(serviceProvider && textIncludes(ruleText, serviceProvider));
  if (conditionType === "service_type") return Boolean(serviceType && textIncludes(ruleText, serviceType));
  if (conditionType === "event_type") return Boolean(eventType && textIncludes(ruleText, eventType));
  if (conditionType === "http_method" || conditionType === "method") return Boolean(method && textIncludes(ruleText, method));

  return [actionName, serviceProvider, serviceType, eventType, method].some((value) => value && textIncludes(ruleText, value));
}

function decideFromMatches(matches: Array<Record<string, unknown>>, sensitiveDataDetected: boolean): DecisionStatus {
  if (sensitiveDataDetected) return "blocked";
  const actions = matches.map((rule) => normalizeAction(rule.action_result));
  if (actions.includes("blocked")) return "blocked";
  if (actions.includes("requires_approval")) return "requires_approval";
  return "approved";
}

function reasonFor(decision: DecisionStatus, matchedRules: DecisionResult["matchedRules"], sensitiveDataDetected: boolean) {
  if (sensitiveDataDetected) return "Datos sensibles detectados antes de ejecutar la acción.";
  if (matchedRules.length) {
    const blockingRule = matchedRules.find((rule) => rule.action === "blocked" || rule.action === "requires_approval") ?? matchedRules[0];
    return `Regla aplicada: ${blockingRule.name}.`;
  }
  if (decision === "approved") return "Sin reglas bloqueantes para esta acción.";
  return "Decisión generada por las reglas del proyecto.";
}

export const decisionService = {
  evaluate: async (input: DecisionServiceInput): Promise<DecisionResult> => {
    const riskLevel = normalizeRisk(input.riskLevel);
    const sensitiveDataDetected = Boolean(input.blockSensitiveData && containsSensitiveData(input.payload));
    const { data, error } = input.ignoreProjectRules
      ? { data: [] as Array<Record<string, unknown>>, error: null }
      : await supabaseAdmin.from("rules").select("*").eq("project_id", input.projectId).eq("is_active", true);
    if (error) throw error;

    const matches = (data ?? []).filter((rule) => matchesRule(rule, input, riskLevel, sensitiveDataDetected));
    const decision = decideFromMatches(matches, sensitiveDataDetected);
    const matchedRules = matches.map((rule) => ({
      id: String(rule.id),
      name: String(rule.name),
      action: normalizeAction(rule.action_result),
      reason: String(rule.description ?? rule.condition_type ?? "Regla activa"),
    }));

    return {
      id: crypto.randomUUID(),
      projectId: input.projectId,
      decision,
      riskLevel: sensitiveDataDetected ? "critical" : riskLevel,
      reason: reasonFor(decision, matchedRules, sensitiveDataDetected),
      matchedRules,
      sensitiveDataDetected,
      createdAt: now(),
    };
  },

  recordAudit: async (input: DecisionServiceInput, decision: DecisionResult, params: { integrationId?: string; eventType?: string; status?: number; durationMs?: number; extraMetadata?: Record<string, unknown> } = {}) => {
    const { data, error } = await supabaseAdmin
      .from("audit_events")
      .insert({
        project_id: input.projectId,
        integration_id: params.integrationId ?? null,
        event_type: params.eventType ?? input.eventType ?? `${input.source}_decision`,
        action_name: input.actionName ?? `${input.method ?? "ACTION"} ${input.path ?? ""}`.trim(),
        decision: decision.decision,
        risk_level: decision.riskLevel,
        event_hash: eventHash({ input, decision }),
        metadata: {
          source: input.source,
          decisionId: decision.id,
          reason: decision.reason,
          matchedRules: decision.matchedRules,
          sensitiveDataDetected: decision.sensitiveDataDetected,
          method: input.method,
          path: input.path,
          status: params.status,
          durationMs: params.durationMs,
          serviceName: input.service?.name,
          serviceProvider: input.service?.provider,
          payloadPreview: redact(input.payload),
          ...(input.metadata ?? {}),
          ...(params.extraMetadata ?? {}),
        },
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  createApprovalIfNeeded: async (input: DecisionServiceInput, decision: DecisionResult, params: { integrationId?: string } = {}) => {
    if (decision.decision !== "requires_approval") return null;

    const { data, error } = await supabaseAdmin
      .from("approval_requests")
      .insert({
        project_id: input.projectId,
        integration_id: params.integrationId ?? null,
        action_name: input.actionName ?? `${input.method ?? "ACTION"} ${input.path ?? ""}`.trim(),
        risk_level: decision.riskLevel,
        status: "pending_approval",
        reason: decision.reason,
        payload_preview: {
          decisionId: decision.id,
          source: input.source,
          service: input.service,
          payload: redact(input.payload),
          metadata: redact(input.metadata),
        },
        requested_at: now(),
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
};
