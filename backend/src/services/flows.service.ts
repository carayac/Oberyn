import { supabaseAdmin } from "../config/supabase.js";

function toFlow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    name: String(row.name),
    description: row.description ? String(row.description) : "",
    actionKey: row.action_key ? String(row.action_key) : "",
    environment: String(row.environment ?? "sandbox"),
    status: String(row.status),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export const flowsService = {
  list: async (projectId: string) => {
    const { data, error } = await supabaseAdmin.from("flows").select("*").eq("project_id", projectId).order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toFlow);
  },

  create: async (projectId: string, payload: Record<string, unknown>) => {
    const { data, error } = await supabaseAdmin
      .from("flows")
      .insert({
        project_id: projectId,
        name: String(payload.name ?? "Nuevo flujo"),
        description: payload.description ? String(payload.description) : null,
        action_key: payload.actionKey ? String(payload.actionKey) : null,
        environment: String(payload.environment ?? "production"),
        status: String(payload.status ?? "active"),
      })
      .select("*")
      .single();
    if (error) throw error;
    return toFlow(data);
  },
};
