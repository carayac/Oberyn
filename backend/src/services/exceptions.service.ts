import { supabaseAdmin } from "../config/supabase.js";

function toException(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    exceptionType: String(row.exception_type),
    name: String(row.name),
    description: row.description ? String(row.description) : "",
    actionKey: row.action_key ? String(row.action_key) : "",
    environment: String(row.environment ?? "sandbox"),
    skipReview: Boolean(row.skip_review),
    skipApproval: Boolean(row.skip_approval),
    auditLevel: String(row.audit_level ?? "standard"),
    status: String(row.status ?? "active"),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export const exceptionsService = {
  list: async (projectId: string, type?: string) => {
    let query = supabaseAdmin.from("exceptions").select("*").eq("project_id", projectId).order("updated_at", { ascending: false });
    if (type) query = query.eq("exception_type", type);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(toException);
  },

  create: async (projectId: string, payload: Record<string, unknown>) => {
    const { data, error } = await supabaseAdmin
      .from("exceptions")
      .insert({
        project_id: projectId,
        exception_type: String(payload.exceptionType ?? payload.exception_type ?? "prompt"),
        name: String(payload.name ?? "Nueva excepcion"),
        description: payload.description ? String(payload.description) : null,
        action_key: payload.actionKey ? String(payload.actionKey) : null,
        environment: String(payload.environment ?? "production"),
        skip_review: payload.skipReview === undefined ? true : Boolean(payload.skipReview),
        skip_approval: payload.skipApproval === undefined ? true : Boolean(payload.skipApproval),
        audit_level: String(payload.auditLevel ?? "minimal"),
        status: String(payload.status ?? "active"),
      })
      .select("*")
      .single();
    if (error) throw error;
    return toException(data);
  },

  update: async (projectId: string, exceptionId: string, payload: Record<string, unknown>) => {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.name !== undefined) update.name = payload.name;
    if (payload.description !== undefined) update.description = payload.description;
    if (payload.actionKey !== undefined) update.action_key = payload.actionKey;
    if (payload.environment !== undefined) update.environment = payload.environment;
    if (payload.skipReview !== undefined) update.skip_review = payload.skipReview;
    if (payload.skipApproval !== undefined) update.skip_approval = payload.skipApproval;
    if (payload.auditLevel !== undefined) update.audit_level = payload.auditLevel;
    if (payload.status !== undefined) update.status = payload.status;

    const { data, error } = await supabaseAdmin.from("exceptions").update(update).eq("project_id", projectId).eq("id", exceptionId).select("*").single();
    if (error) throw error;
    return toException(data);
  },
};
