import type { Organization } from "../types/organization";

export const mockOrganizations: Organization[] = [
  { id: "org_1", clerkOrgId: "clerk_org_1", name: "Acme AI", slug: "acme-ai", region: "us", status: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];
