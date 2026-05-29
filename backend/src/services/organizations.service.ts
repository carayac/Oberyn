import { slugify } from "../utils/slugify.js";
const now = () => new Date().toISOString();
export const organizationsService = {
  list: async () => [{ id: "org_1", clerkOrgId: "clerk_org_1", name: "Acme AI", slug: "acme-ai", region: "us", createdAt: now(), updatedAt: now() }],
  create: async (payload: { name?: string; region?: string }) => ({ id: "org_new", clerkOrgId: "pending", name: payload.name ?? "Nueva organización", slug: slugify(payload.name ?? "nueva-organizacion"), region: payload.region ?? "us", createdAt: now(), updatedAt: now() }),
  getById: async (organizationId: string) => ({ id: organizationId, clerkOrgId: "clerk_org_1", name: "Acme AI", slug: "acme-ai", region: "us", createdAt: now(), updatedAt: now() }),
};

