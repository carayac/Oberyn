const now = () => new Date().toISOString();
export const approvalsService = {
  list: async (projectId: string) => [{ id: "approval_1", projectId, actionName: "update_customer_record", riskLevel: "high", status: "pending_approval", requestedAt: now() }],
  approve: async (projectId: string, approvalId: string) => ({ id: approvalId, projectId, status: "approved", resolvedAt: now() }),
  reject: async (projectId: string, approvalId: string) => ({ id: approvalId, projectId, status: "rejected", resolvedAt: now() }),
};

