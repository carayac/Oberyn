import { supabaseAdmin } from "../config/supabase.js";
import type { Rule } from "../types/rule.types.js";

function toRule(row: Record<string, unknown>): Rule {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    name: String(row.name),
    description: row.description ? String(row.description) : undefined,
    category: String(row.category),
    severity: String(row.severity),
    conditionType: String(row.condition_type),
    actionResult: String(row.action_result),
    scope: String(row.scope),
    isActive: Boolean(row.is_active),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function toRuleInsert(projectId: string, payload: Record<string, unknown>) {
  return {
    project_id: projectId,
    name: String(payload.name ?? "Nueva regla"),
    description: payload.description ? String(payload.description) : null,
    category: String(payload.category ?? "custom"),
    severity: String(payload.severity ?? "medium"),
    condition_type: String(payload.conditionType ?? payload.condition_type ?? "custom"),
    action_result: String(payload.actionResult ?? payload.action_result ?? "require_approval"),
    scope: String(payload.scope ?? "project"),
    is_active: typeof payload.isActive === "boolean" ? payload.isActive : typeof payload.is_active === "boolean" ? payload.is_active : true,
  };
}

export const rulesService = {
  list: async (projectId: string) => {
    const { data, error } = await supabaseAdmin.from("rules").select("*").eq("project_id", projectId).order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toRule);
  },

  create: async (projectId: string, payload: Record<string, unknown>) => {
    const { data, error } = await supabaseAdmin.from("rules").insert(toRuleInsert(projectId, payload)).select("*").single();
    if (error) throw error;
    return toRule(data);
  },

  update: async (projectId: string, ruleId: string, payload: Record<string, unknown>) => {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof payload.name === "string") updates.name = payload.name;
    if (typeof payload.description === "string") updates.description = payload.description;
    if (typeof payload.category === "string") updates.category = payload.category;
    if (typeof payload.severity === "string") updates.severity = payload.severity;
    if (typeof payload.conditionType === "string") updates.condition_type = payload.conditionType;
    if (typeof payload.condition_type === "string") updates.condition_type = payload.condition_type;
    if (typeof payload.actionResult === "string") updates.action_result = payload.actionResult;
    if (typeof payload.action_result === "string") updates.action_result = payload.action_result;
    if (typeof payload.scope === "string") updates.scope = payload.scope;
    if (typeof payload.isActive === "boolean") updates.is_active = payload.isActive;
    if (typeof payload.is_active === "boolean") updates.is_active = payload.is_active;

    const { data, error } = await supabaseAdmin.from("rules").update(updates).eq("project_id", projectId).eq("id", ruleId).select("*").single();
    if (error) throw error;
    return toRule(data);
  },

  remove: async (projectId: string, ruleId: string) => {
    const { error } = await supabaseAdmin.from("rules").delete().eq("project_id", projectId).eq("id", ruleId);
    if (error) throw error;
    return { id: ruleId, deleted: true };
  },
};
