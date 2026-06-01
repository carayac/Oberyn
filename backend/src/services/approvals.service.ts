import { supabaseAdmin } from "../config/supabase.js";
import type { ApprovalRequest } from "../types/approval.types.js";

function toApprovalRequest(row: Record<string, unknown>): ApprovalRequest {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    botId: row.bot_id ? String(row.bot_id) : null,
    integrationId: row.integration_id ? String(row.integration_id) : null,
    actionName: String(row.action_name),
    riskLevel: String(row.risk_level),
    status: String(row.status),
    reason: row.reason ? String(row.reason) : undefined,
    payloadPreview: (row.payload_preview as Record<string, unknown>) ?? {},
    requestedAt: new Date(String(row.requested_at)).toISOString(),
    resolvedAt: row.resolved_at ? new Date(String(row.resolved_at)).toISOString() : null,
  };
}

async function updateApprovalStatus(projectId: string, approvalId: string, status: "approved" | "rejected") {
  const { data, error } = await supabaseAdmin
    .from("approval_requests")
    .update({ status, resolved_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("id", approvalId)
    .select("*")
    .single();

  if (error) throw error;
  return toApprovalRequest(data);
}

async function getApproval(projectId: string, approvalId: string) {
  const { data, error } = await supabaseAdmin.from("approval_requests").select("*").eq("project_id", projectId).eq("id", approvalId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("La solicitud de aprobacion no existe.");
  return data;
}

export const approvalsService = {
  list: async (projectId: string) => {
    const { data, error } = await supabaseAdmin.from("approval_requests").select("*").eq("project_id", projectId).order("requested_at", { ascending: false }).limit(100);
    if (error) throw error;
    return (data ?? []).map(toApprovalRequest);
  },

  approve: async (projectId: string, approvalId: string) => updateApprovalStatus(projectId, approvalId, "approved"),

  reject: async (projectId: string, approvalId: string) => updateApprovalStatus(projectId, approvalId, "rejected"),

  requestContext: async (projectId: string, approvalId: string, payload: Record<string, unknown>) => {
    const approval = await getApproval(projectId, approvalId);
    const message = typeof payload.message === "string" && payload.message.trim() ? payload.message.trim() : "Se solicito contexto adicional antes de aprobar.";
    const nextPreview = { ...((approval.payload_preview as Record<string, unknown>) ?? {}), contextRequest: message, contextRequestedAt: new Date().toISOString() };

    const { data, error } = await supabaseAdmin
      .from("approval_requests")
      .update({ status: "context_requested", reason: message, payload_preview: nextPreview })
      .eq("project_id", projectId)
      .eq("id", approvalId)
      .select("*")
      .single();

    if (error) throw error;
    return toApprovalRequest(data);
  },

  createPermanentRule: async (projectId: string, approvalId: string) => {
    const approval = await getApproval(projectId, approvalId);
    const riskLevel = String(approval.risk_level);
    const actionName = String(approval.action_name);

    const { data: rule, error: ruleError } = await supabaseAdmin
      .from("rules")
      .insert({
        project_id: projectId,
        name: `Requerir aprobacion para ${actionName}`,
        description: `Creada desde solicitud ${approvalId.slice(0, 8)}. ${approval.reason ?? "Accion sensible requiere revision humana."}`,
        category: "approval",
        severity: riskLevel === "critical" ? "critical" : riskLevel === "high" ? "high" : "medium",
        condition_type: "action_name",
        action_result: "require_approval",
        scope: "Todas las areas",
        is_active: true,
      })
      .select("*")
      .single();
    if (ruleError) throw ruleError;

    const { data, error } = await supabaseAdmin
      .from("approval_requests")
      .update({
        payload_preview: { ...((approval.payload_preview as Record<string, unknown>) ?? {}), permanentRuleId: String(rule.id), permanentRuleCreatedAt: new Date().toISOString() },
      })
      .eq("project_id", projectId)
      .eq("id", approvalId)
      .select("*")
      .single();
    if (error) throw error;

    return { approval: toApprovalRequest(data), rule };
  },
};
