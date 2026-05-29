const now = () => new Date().toISOString();
export const botsService = {
  list: async (projectId: string) => [{ id: "bot_1", projectId, name: "Assistant Bot", identifier: "assistant-bot", role: "support_agent", status: "active", createdAt: now(), updatedAt: now() }],
  create: async (projectId: string, payload: Record<string, unknown>) => ({ id: "bot_new", projectId, status: "pending", ...payload, createdAt: now(), updatedAt: now() }),
};

