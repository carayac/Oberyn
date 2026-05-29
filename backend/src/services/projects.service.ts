import { slugify } from "../utils/slugify.js";
const now = () => new Date().toISOString();
export const projectsService = {
  list: async () => [{ id: "project_1", organizationId: "org_1", name: "Copiloto Operativo", slug: "copiloto-operativo", projectType: "ai_agent", environment: "sandbox", connectionMode: "sdk", status: "active", createdAt: now(), updatedAt: now() }],
  create: async (payload: { name?: string }) => ({ id: "project_new", organizationId: "org_1", name: payload.name ?? "Nuevo proyecto", slug: slugify(payload.name ?? "nuevo-proyecto"), projectType: "ai_agent", environment: "sandbox", connectionMode: "manual", status: "pending", createdAt: now(), updatedAt: now() }),
  getById: async (projectId: string) => ({ id: projectId, organizationId: "org_1", name: "Copiloto Operativo", slug: "copiloto-operativo", projectType: "ai_agent", environment: "sandbox", connectionMode: "sdk", status: "active", createdAt: now(), updatedAt: now() }),
  update: async (projectId: string, payload: Record<string, unknown>) => ({ id: projectId, ...payload, updatedAt: now() }),
  remove: async (projectId: string) => ({ id: projectId, deleted: true }),
};

