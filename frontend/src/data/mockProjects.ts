import type { Project } from "../types/project";

export const mockProjects: Project[] = [
  { id: "project_1", organizationId: "org_1", name: "Copiloto Operativo", slug: "copiloto-operativo", description: "Proyecto demo", projectType: "ai_agent", environment: "sandbox", connectionMode: "sdk", status: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

