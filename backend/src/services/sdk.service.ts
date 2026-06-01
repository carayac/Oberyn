import { supabaseAdmin } from "../config/supabase.js";
import { oberynSecurityService, type RiskLevel } from "./oberynSecurity.service.js";

type SdkPayload = {
  bot?: string;
  action?: string;
  service?: string;
  risk?: RiskLevel;
  payload?: unknown;
};

function normalizePayload(payload: SdkPayload) {
  return {
    subject: payload.bot ?? "external-client",
    actionName: payload.action ?? "unknown_action",
    service: payload.service ?? "unknown",
    riskLevel: payload.risk ?? "low",
    payload: payload.payload ?? {},
  };
}

async function recordSdkEvent(input: {
  projectId: string;
  apiKeyId?: string | null;
  subject?: string;
  actionName: string;
  service: string;
  riskLevel?: string;
  decisionId?: string;
  decision: string;
  executionStatus: string;
  requestPayload?: unknown;
  responsePayload?: unknown;
  errorMessage?: string | null;
}) {
  const { error } = await supabaseAdmin.from("sdk_events").insert({
    project_id: input.projectId,
    api_key_id: input.apiKeyId ?? null,
    subject: input.subject ?? null,
    action_name: input.actionName,
    service: input.service,
    risk_level: input.riskLevel ?? "low",
    decision_id: input.decisionId ?? null,
    decision: input.decision,
    execution_status: input.executionStatus,
    request_payload: oberynSecurityService.stablePreview(input.requestPayload),
    response_payload: oberynSecurityService.stablePreview(input.responsePayload),
    error_message: input.errorMessage ?? null,
  });
  if (error) throw error;
}

export const sdkService = {
  getConfig: async (projectId: string) => {
    const apiKeys = await oberynSecurityService.listProjectKeys(projectId);
    return {
      projectId,
      packageName: "@oberyn/sdk",
      publicEvaluateEndpoint: "/sdk/v1/evaluate",
      publicAuditEndpoint: "/sdk/v1/audit",
      protectsCriticalActions: true,
      storesClientSecrets: false,
      apiKeys,
      example: {
        install: "npm install @oberyn/sdk",
        guard: "await oberyn.guard({ bot, action, service, risk, payload, execute })",
      },
    };
  },

  createKey: async (projectId: string, payload: { name?: string }) => oberynSecurityService.createProjectKey(projectId, payload.name),

  revokeKey: async (projectId: string, keyId: string) => oberynSecurityService.revokeProjectKey(projectId, keyId),

  testEvent: async (projectId: string, payload: SdkPayload) => {
    const normalized = normalizePayload(payload);
    const decision = await oberynSecurityService.evaluate({ projectId, source: "sdk", ...normalized });
    await recordSdkEvent({
      projectId,
      ...normalized,
      decisionId: decision.id,
      decision: decision.decision,
      executionStatus: decision.decision === "allow" ? "simulated" : "not_executed",
      requestPayload: normalized.payload,
      responsePayload: decision,
    });
    return decision;
  },

  evaluateWithKey: async (rawKey: string | undefined, payload: SdkPayload) => {
    const verified = await oberynSecurityService.verifyProjectKey(rawKey, "sdk:evaluate");
    const normalized = normalizePayload(payload);
    const decision = await oberynSecurityService.evaluate({
      projectId: verified.projectId,
      apiKeyId: verified.id,
      source: "sdk",
      ...normalized,
    });
    await recordSdkEvent({
      projectId: verified.projectId,
      apiKeyId: verified.id,
      ...normalized,
      decisionId: decision.id,
      decision: decision.decision,
      executionStatus: "not_executed",
      requestPayload: normalized.payload,
      responsePayload: decision,
    });
    return { projectId: verified.projectId, projectName: verified.projectName, ...decision };
  },

  auditWithKey: async (rawKey: string | undefined, payload: SdkPayload & { status?: string; response?: unknown; error?: string }) => {
    const verified = await oberynSecurityService.verifyProjectKey(rawKey, "sdk:audit");
    const normalized = normalizePayload(payload);
    await recordSdkEvent({
      projectId: verified.projectId,
      apiKeyId: verified.id,
      ...normalized,
      decision: payload.status === "failed" ? "error" : "recorded",
      executionStatus: payload.status ?? "completed",
      requestPayload: normalized.payload,
      responsePayload: payload.response,
      errorMessage: payload.error ?? null,
    });
    return { recorded: true };
  },
};
