const now = () => new Date().toISOString();
export const integrationsService = {
  list: async (projectId: string) => [{ id: "integration_1", projectId, name: "OpenAI", provider: "openai", serviceType: "llm", connectionMethod: "gateway", status: "protected", coverage: 80, lastActivityAt: null, createdAt: now(), updatedAt: now() }],
  create: async (projectId: string, payload: Record<string, unknown>) => ({ id: "integration_new", projectId, status: "manual", coverage: 0, ...payload, createdAt: now(), updatedAt: now() }),
  getById: async (projectId: string, integrationId: string) => ({ id: integrationId, projectId, name: "OpenAI", provider: "openai", serviceType: "llm", connectionMethod: "gateway", status: "protected", coverage: 80, lastActivityAt: null, createdAt: now(), updatedAt: now() }),
  update: async (projectId: string, integrationId: string, payload: Record<string, unknown>) => ({ id: integrationId, projectId, ...payload, updatedAt: now() }),
};

