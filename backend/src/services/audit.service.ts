const now = () => new Date().toISOString();
export const auditService = {
  list: async (projectId: string) => [{ id: "event_1", projectId, eventType: "decision", actionName: "tool_call", decision: "approved", riskLevel: "medium", eventHash: "hash_placeholder", merkleRoot: null, stellarTxHash: null, stellarNetwork: null, anchoredAt: null, metadata: {}, createdAt: now() }],
  getById: async (projectId: string, eventId: string) => ({ id: eventId, projectId, eventType: "decision", actionName: "tool_call", decision: "approved", riskLevel: "medium", eventHash: "hash_placeholder", metadata: {}, createdAt: now() }),
};

