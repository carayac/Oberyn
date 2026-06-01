import { supabaseAdmin } from "../config/supabase.js";
import type { Flow } from "../types/flow.types.js";

function toFlow(row: Record<string, unknown>): Flow {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    name: String(row.name),
    description: row.description ? String(row.description) : undefined,
    botId: row.bot_id ? String(row.bot_id) : null,
    actionKey: row.action_key ? String(row.action_key) : null,
    serviceId: row.service_id ? String(row.service_id) : null,
    environment: String(row.environment),
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
        bot_id: payload.botId ?? payload.bot_id ?? null,
        action_key: payload.actionKey ?? payload.action_key ?? null,
        service_id: payload.serviceId ?? payload.service_id ?? null,
        environment: String(payload.environment ?? "sandbox"),
        status: String(payload.status ?? "pending"),
      })
      .select("*")
      .single();

    if (error) throw error;
    return toFlow(data);
  },
};
