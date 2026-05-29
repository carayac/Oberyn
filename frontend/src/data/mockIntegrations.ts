import type { Integration } from "../types/integration";

export const mockIntegrations: Integration[] = [
  { id: "integration_1", projectId: "project_1", name: "OpenAI", provider: "openai", serviceType: "llm", connectionMethod: "gateway", status: "protected", coverage: 80, lastActivityAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "integration_2", projectId: "project_1", name: "CRM interno", provider: "custom", serviceType: "crm", connectionMethod: "manual", status: "no_activity", coverage: 0, lastActivityAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

