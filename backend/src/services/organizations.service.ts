import { clerkClient } from "../config/clerkClient.js";
import { supabaseAdmin } from "../config/supabase.js";
import type { CreateOrganizationInput, Organization } from "../types/organization.types.js";
import { slugify } from "../utils/slugify.js";

function toOrganization(row: Record<string, unknown>): Organization {
  return {
    id: String(row.id),
    clerkOrgId: String(row.clerk_org_id),
    name: String(row.name),
    slug: String(row.slug),
    organizationType: row.organization_type as string | null,
    description: row.description as string | null,
    region: String(row.region),
    website: row.website as string | null,
    ownerUserId: row.owner_user_id as string | null,
    status: String(row.status ?? "active"),
    settings: (row.settings as Record<string, unknown>) ?? {},
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

async function createClerkOrganization(name: string, slug: string, ownerUserId: string) {
  const localOrganizationId = `local_${slug}_${Date.now()}`;
  if (!clerkClient) return localOrganizationId;

  try {
    const organization = await clerkClient.organizations.createOrganization({
      name,
      slug,
      createdBy: ownerUserId,
    });

    return organization.id;
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 403) return localOrganizationId;
    throw error;
  }
}

async function findOrganizationBySlug(slug: string) {
  const { data, error } = await supabaseAdmin.from("organizations").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? toOrganization(data) : null;
}

async function createOwnedSlug(baseSlug: string, ownerUserId: string) {
  const ownerSuffix = ownerUserId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toLowerCase() || "user";
  let candidate = `${baseSlug}-${ownerSuffix}`;

  for (let index = 2; index < 20; index += 1) {
    const existing = await findOrganizationBySlug(candidate);
    if (!existing) return candidate;
    if (existing.ownerUserId === ownerUserId) return candidate;
    candidate = `${baseSlug}-${ownerSuffix}-${index}`;
  }

  return `${baseSlug}-${ownerSuffix}-${Date.now()}`;
}

export const organizationsService = {
  list: async (ownerUserId: string) => {
    const { data, error } = await supabaseAdmin.from("organizations").select("*").eq("owner_user_id", ownerUserId).order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toOrganization);
  },

  create: async (payload: CreateOrganizationInput, ownerUserId: string) => {
    const name = payload.name?.trim();
    if (!name) throw new Error("El nombre de la organización es obligatorio.");

    const requestedSlug = slugify(payload.slug?.trim() || name);
    const existingOrganization = await findOrganizationBySlug(requestedSlug);

    if (existingOrganization?.ownerUserId === ownerUserId) {
      return existingOrganization;
    }

    const slug = existingOrganization ? await createOwnedSlug(requestedSlug, ownerUserId) : requestedSlug;
    const clerkOrgId = await createClerkOrganization(name, slug, ownerUserId);
    const { data, error } = await supabaseAdmin
      .from("organizations")
      .insert({
        clerk_org_id: clerkOrgId,
        name,
        slug,
        organization_type: payload.organizationType || "empresa",
        description: payload.description?.trim() || null,
        region: payload.region || "global",
        website: payload.website?.trim() || null,
        owner_user_id: ownerUserId,
        status: "active",
        settings: {},
        metadata: {},
      })
      .select("*")
      .single();

    if (error?.code === "23505") {
      const existing = await findOrganizationBySlug(slug);
      if (existing?.ownerUserId === ownerUserId) return existing;
    }

    if (error) throw error;
    return toOrganization(data);
  },

  getById: async (organizationId: string, ownerUserId: string) => {
    const { data, error } = await supabaseAdmin.from("organizations").select("*").eq("id", organizationId).eq("owner_user_id", ownerUserId).maybeSingle();
    if (error) throw error;
    return data ? toOrganization(data) : null;
  },
};
