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
  if (!organizationId) throw new Error("Crea una organización antes de crear proyectos.");

  const { data, error } = await supabaseAdmin.from("organizations").select("id").eq("id", organizationId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("La organización seleccionada no existe.");

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

function countByProject(rows: Array<Record<string, unknown>> | null, projectIds: string[]) {
  const counts = Object.fromEntries(projectIds.map((projectId) => [projectId, 0]));
  for (const row of rows ?? []) {
    const projectId = String(row.project_id);
    counts[projectId] = (counts[projectId] ?? 0) + 1;
  }
  return counts;
}

async function getProjectsCounts(projectIds: string[]) {
  if (!projectIds.length) return {};

  const [integrations, rules, bots, flows, approvals] = await Promise.all([
    supabaseAdmin.from("integrations").select("project_id").in("project_id", projectIds),
    supabaseAdmin.from("rules").select("project_id").in("project_id", projectIds).eq("is_active", true),
    supabaseAdmin.from("bots").select("project_id").in("project_id", projectIds),
    supabaseAdmin.from("flows").select("project_id").in("project_id", projectIds),
    supabaseAdmin.from("approval_requests").select("project_id").in("project_id", projectIds).eq("status", "pending_approval"),
  ]);

  for (const result of [integrations, rules, bots, flows, approvals]) {
    if (result.error) throw result.error;
  }

  const integrationsByProject = countByProject(integrations.data, projectIds);
  const rulesByProject = countByProject(rules.data, projectIds);
  const botsByProject = countByProject(bots.data, projectIds);
  const flowsByProject = countByProject(flows.data, projectIds);
  const approvalsByProject = countByProject(approvals.data, projectIds);

  return Object.fromEntries(
    projectIds.map((projectId) => [
      projectId,
      {
        integrationsCount: integrationsByProject[projectId] ?? 0,
        rulesCount: rulesByProject[projectId] ?? 0,
        botsCount: botsByProject[projectId] ?? 0,
        flowsCount: flowsByProject[projectId] ?? 0,
        pendingApprovalsCount: approvalsByProject[projectId] ?? 0,
      },
    ]),
  );
}

async function findProjectBySlug(organizationId: string, slug: string) {
  const { data, error } = await supabaseAdmin.from("projects").select("*").eq("organization_id", organizationId).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? toProject(data, await getProjectCounts(String(data.id))) : null;
}

export const projectsService = {
  listAllForUser: async (ownerUserId: string) => {
    const { data: organizations, error: organizationsError } = await supabaseAdmin.from("organizations").select("id").eq("owner_user_id", ownerUserId);
    if (organizationsError) throw organizationsError;

    const organizationIds = (organizations ?? []).map((row) => String(row.id));
    if (!organizationIds.length) return [];

    const { data, error } = await supabaseAdmin.from("projects").select("*").in("organization_id", organizationIds).order("updated_at", { ascending: false });
    if (error) throw error;

    const rows = data ?? [];
    const countsByProject = await getProjectsCounts(rows.map((row) => String(row.id)));
    return rows.map((row) => toProject(row, countsByProject[String(row.id)]));
  },

  list: async (organizationId?: string) => {
    const resolvedOrganizationId = await ensureOrganization(organizationId);
    const { data, error } = await supabaseAdmin.from("projects").select("*").eq("organization_id", resolvedOrganizationId).order("updated_at", { ascending: false });
    if (error) throw error;

    const rows = data ?? [];
    const countsByProject = await getProjectsCounts(rows.map((row) => String(row.id)));
    const projects = rows.map((row) => toProject(row, countsByProject[String(row.id)]));
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

  getById: async (projectId: string, organizationId?: string) => {
    let query = supabaseAdmin.from("projects").select("*").eq("id", projectId);
    if (organizationId) query = query.eq("organization_id", organizationId);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data ? toProject(data, await getProjectCounts(projectId)) : null;
  },

  update: async (projectId: string, payload: Record<string, unknown>, organizationId?: string) => {
    const updates: Record<string, unknown> = {};
    if (typeof payload.name === "string" && payload.name.trim()) updates.name = payload.name.trim();
    if (typeof payload.slug === "string" && payload.slug.trim()) updates.slug = slugify(payload.slug);
    if (typeof payload.description === "string") updates.description = payload.description.trim() || null;
    if (typeof payload.projectType === "string") updates.project_type = payload.projectType;
    if (typeof payload.environment === "string") updates.environment = payload.environment === "development" ? "sandbox" : payload.environment;
    if (typeof payload.connectionMode === "string") updates.connection_mode = payload.connectionMode === "mixed" ? "detected" : payload.connectionMode;
    if (typeof payload.status === "string") updates.status = payload.status;
    if (!Object.keys(updates).length) return projectsService.getById(projectId, organizationId);

    let query = supabaseAdmin.from("projects").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", projectId);
    if (organizationId) query = query.eq("organization_id", organizationId);
    const { data, error } = await query.select("*").single();
    if (error) throw error;
    return toProject(data, await getProjectCounts(projectId));
  },

  remove: async (projectId: string, organizationId?: string) => {
    let query = supabaseAdmin.from("projects").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", projectId);
    if (organizationId) query = query.eq("organization_id", organizationId);
    const { error } = await query;
    if (error) throw error;
    return { id: projectId, archived: true };
  },
};
