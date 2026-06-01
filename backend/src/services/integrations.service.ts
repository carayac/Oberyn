import { supabaseAdmin } from "../config/supabase.js";

function toIntegration(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    name: String(row.name),
    provider: String(row.provider),
    serviceType: String(row.service_type),
    connectionMethod: String(row.connection_method),
    status: String(row.status),
    coverage: Number(row.coverage ?? 0),
    lastActivityAt: row.last_activity_at ? new Date(String(row.last_activity_at)).toISOString() : null,
    firstDetectedAt: row.first_detected_at ? new Date(String(row.first_detected_at)).toISOString() : null,
    lastDetectedVia: row.last_detected_via ? String(row.last_detected_via) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export const integrationsService = {
  list: async (projectId: string) => {
    const { data, error } = await supabaseAdmin
      .from("integrations")
      .select("*")
      .eq("project_id", projectId)
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toIntegration);
  },

  create: async (projectId: string, payload: Record<string, unknown>) => {
    const provider = String(payload.provider ?? payload.name ?? "manual").trim().toLowerCase();
    const { data, error } = await supabaseAdmin
      .from("integrations")
      .insert({
        project_id: projectId,
        name: String(payload.name ?? provider),
        provider,
        service_type: String(payload.serviceType ?? "api"),
        connection_method: String(payload.connectionMethod ?? "manual"),
        status: "manual",
        coverage: 0,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toIntegration(data);
  },

  getById: async (projectId: string, integrationId: string) => {
    const { data, error } = await supabaseAdmin.from("integrations").select("*").eq("project_id", projectId).eq("id", integrationId).single();
    if (error) throw error;
    return toIntegration(data);
  },

  update: async (projectId: string, integrationId: string, payload: Record<string, unknown>) => {
    const { data, error } = await supabaseAdmin
      .from("integrations")
      .update({
        name: payload.name,
        provider: payload.provider,
        service_type: payload.serviceType,
        connection_method: payload.connectionMethod,
        status: payload.status,
        coverage: payload.coverage,
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", projectId)
      .eq("id", integrationId)
      .select("*")
      .single();
    if (error) throw error;
    return toIntegration(data);
  },
};
