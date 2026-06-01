import { supabaseAdmin } from "../config/supabase.js";

function toRule(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    name: String(row.name),
    description: row.description ? String(row.description) : "",
    category: String(row.category),
    severity: String(row.severity),
    conditionType: String(row.condition_type),
    actionResult: String(row.action_result),
    scope: String(row.scope ?? "project"),
    isActive: Boolean(row.is_active),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export const rulesService = {
  list: async (projectId: string) => {
    const { data, error } = await supabaseAdmin.from("rules").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toRule);
  },

  create: async (projectId: string, payload: Record<string, unknown>) => {
    const { data, error } = await supabaseAdmin
      .from("rules")
      .insert({
        project_id: projectId,
        name: String(payload.name ?? "Nueva regla"),
        description: payload.description ? String(payload.description) : null,
        category: String(payload.category ?? "action"),
        severity: String(payload.severity ?? "medium"),
        condition_type: String(payload.conditionType ?? payload.condition_type ?? "medium"),
        action_result: String(payload.actionResult ?? payload.action_result ?? "require_approval"),
        scope: String(payload.scope ?? "project"),
        is_active: payload.isActive === undefined ? true : Boolean(payload.isActive),
      })
      .select("*")
      .single();
    if (error) throw error;
    return toRule(data);
  },

  update: async (projectId: string, ruleId: string, payload: Record<string, unknown>) => {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.name !== undefined) update.name = payload.name;
    if (payload.description !== undefined) update.description = payload.description;
    if (payload.category !== undefined) update.category = payload.category;
    if (payload.severity !== undefined) update.severity = payload.severity;
    if (payload.conditionType !== undefined) update.condition_type = payload.conditionType;
    if (payload.actionResult !== undefined) update.action_result = payload.actionResult;
    if (payload.scope !== undefined) update.scope = payload.scope;
    if (payload.isActive !== undefined) update.is_active = payload.isActive;

    const { data, error } = await supabaseAdmin.from("rules").update(update).eq("project_id", projectId).eq("id", ruleId).select("*").single();
    if (error) throw error;
    return toRule(data);
  },
};
