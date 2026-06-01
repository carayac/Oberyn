import { supabaseAdmin } from "../config/supabase.js";
import { slugify } from "../utils/slugify.js";

function toBot(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    name: String(row.name),
    identifier: String(row.identifier),
    role: String(row.role),
    description: row.description ? String(row.description) : "",
    status: String(row.status),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export const botsService = {
  list: async (projectId: string) => {
    const { data, error } = await supabaseAdmin.from("bots").select("*").eq("project_id", projectId).order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toBot);
  },

  create: async (projectId: string, payload: Record<string, unknown>) => {
    const name = String(payload.name ?? "Nuevo bot");
    const { data, error } = await supabaseAdmin
      .from("bots")
      .insert({
        project_id: projectId,
        name,
        identifier: String(payload.identifier ?? slugify(name)),
        role: String(payload.role ?? "agent"),
        description: payload.description ? String(payload.description) : null,
        status: String(payload.status ?? "active"),
      })
      .select("*")
      .single();
    if (error) throw error;
    return toBot(data);
  },
};
