import { supabaseAdmin } from "../config/supabase.js";
import type { CreateProjectInput, Project } from "../types/project.types.js";
import { slugify } from "../utils/slugify.js";

function toProject(row: Record<string, unknown>, counts: Partial<Project> = {}): Project {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    name: String(row.name),
    slug: String(row.slug),
    description: row.description as string | null,
    projectType: String(row.project_type),
    environment: String(row.environment),
    connectionMode: String(row.connection_mode),
    status: String(row.status),
    integrationsCount: counts.integrationsCount ?? 0,
    rulesCount: counts.rulesCount ?? 0,
    botsCount: counts.botsCount ?? 0,
    flowsCount: counts.flowsCount ?? 0,
    pendingApprovalsCount: counts.pendingApprovalsCount ?? 0,
    lastActivityAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

async function ensureOrganization(organizationId?: string) {
  if (!organizationId) throw new Error("Crea una organizacion antes de crear proyectos.");

  const { data, error } = await supabaseAdmin.from("organizations").select("id").eq("id", organizationId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("La organizacion seleccionada no existe.");

  return organizationId;
}

async function countRows(table: string, column: string, value: string, extra?: (query: ReturnType<typeof supabaseAdmin.from>) => unknown) {
  let query = supabaseAdmin.from(table).select("id", { count: "exact", head: true }).eq(column, value);
  if (extra) query = extra(query as never) as typeof query;
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function getProjectCounts(projectId: string) {
  const [integrationsCount, rulesCount, botsCount, flowsCount, pendingApprovalsCount] = await Promise.all([
    countRows("integrations", "project_id", projectId),
    countRows("rules", "project_id", projectId, (query) => (query as never as { eq: (column: string, value: boolean) => unknown }).eq("is_active", true)),
    countRows("bots", "project_id", projectId),
    countRows("flows", "project_id", projectId),
    countRows("approval_requests", "project_id", projectId, (query) => (query as never as { eq: (column: string, value: string) => unknown }).eq("status", "pending_approval")),
  ]);

  return { integrationsCount, rulesCount, botsCount, flowsCount, pendingApprovalsCount };
}

async function findProjectBySlug(organizationId: string, slug: string) {
  const { data, error } = await supabaseAdmin.from("projects").select("*").eq("organization_id", organizationId).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? toProject(data, await getProjectCounts(String(data.id))) : null;
}

export const projectsService = {
  list: async (organizationId?: string) => {
    const resolvedOrganizationId = await ensureOrganization(organizationId);
    const { data, error } = await supabaseAdmin.from("projects").select("*").eq("organization_id", resolvedOrganizationId).order("updated_at", { ascending: false });
    if (error) throw error;

    const projects = await Promise.all((data ?? []).map(async (row) => toProject(row, await getProjectCounts(String(row.id)))));
    return projects;
  },

  create: async (payload: CreateProjectInput) => {
    const organizationId = await ensureOrganization(payload.organizationId);
    const name = payload.name?.trim() || "Nuevo proyecto";
    const slug = slugify(payload.slug?.trim() || name);
    const connectionMode = payload.connectionMode === "mixed" ? "detected" : payload.connectionMode || "sdk";
    const existingProject = await findProjectBySlug(organizationId, slug);

    if (existingProject) return existingProject;

    const { data, error } = await supabaseAdmin
      .from("projects")
      .insert({
        organization_id: organizationId,
        name,
        slug,
        description: payload.description?.trim() || null,
        project_type: payload.projectType || "custom",
        environment: payload.environment || "sandbox",
        connection_mode: connectionMode,
        status: "pending",
      })
      .select("*")
      .single();

    if (error?.code === "23505") {
      const existing = await findProjectBySlug(organizationId, slug);
      if (existing) return existing;
    }

    if (error) throw error;
    return toProject(data);
  },

  getById: async (projectId: string) => {
    const { data, error } = await supabaseAdmin.from("projects").select("*").eq("id", projectId).maybeSingle();
    if (error) throw error;
    return data ? toProject(data, await getProjectCounts(projectId)) : null;
  },

  update: async (projectId: string, payload: Record<string, unknown>) => {
    const status = typeof payload.status === "string" ? payload.status : undefined;
    if (!status) return projectsService.getById(projectId);

    const { data, error } = await supabaseAdmin.from("projects").update({ status, updated_at: new Date().toISOString() }).eq("id", projectId).select("*").single();
    if (error) throw error;
    return toProject(data, await getProjectCounts(projectId));
  },

  remove: async (projectId: string) => {
    const { error } = await supabaseAdmin.from("projects").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", projectId);
    if (error) throw error;
    return { id: projectId, archived: true };
  },
};
