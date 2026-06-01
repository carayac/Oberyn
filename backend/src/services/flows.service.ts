const now = () => new Date().toISOString();
export const flowsService = {
  list: async (projectId: string) => [{ id: "flow_1", projectId, name: "Alta de cliente", environment: "sandbox", status: "pending", createdAt: now(), updatedAt: now() }],
  create: async (projectId: string, payload: Record<string, unknown>) => ({ id: "flow_new", projectId, status: "pending", ...payload, createdAt: now(), updatedAt: now() }),
};

