import { supabaseAdmin } from "../config/supabase.js";
import type { AuditEvent } from "../types/audit.types.js";

function toAuditEvent(row: Record<string, unknown>): AuditEvent {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    botId: row.bot_id ? String(row.bot_id) : null,
    integrationId: row.integration_id ? String(row.integration_id) : null,
    eventType: String(row.event_type),
    actionName: String(row.action_name),
    decision: String(row.decision),
    riskLevel: String(row.risk_level),
    eventHash: row.event_hash ? String(row.event_hash) : null,
    merkleRoot: row.merkle_root ? String(row.merkle_root) : null,
    stellarTxHash: row.stellar_tx_hash ? String(row.stellar_tx_hash) : null,
    stellarNetwork: row.stellar_network ? String(row.stellar_network) : null,
    anchoredAt: row.anchored_at ? new Date(String(row.anchored_at)).toISOString() : null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export const auditService = {
  list: async (projectId: string) => {
    const { data, error } = await supabaseAdmin.from("audit_events").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return (data ?? []).map(toAuditEvent);
  },

  getById: async (projectId: string, eventId: string) => {
    const { data, error } = await supabaseAdmin.from("audit_events").select("*").eq("project_id", projectId).eq("id", eventId).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("El evento de auditoría no existe.");
    return toAuditEvent(data);
  },
};
