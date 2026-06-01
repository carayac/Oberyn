const now = () => new Date().toISOString();
export const rulesService = {
  list: async (projectId: string) => [{ id: "rule_1", projectId, name: "Revisión para acciones críticas", category: "approval", severity: "high", conditionType: "risk_level", actionResult: "require_approval", scope: "project", isActive: true, createdAt: now(), updatedAt: now() }],
  create: async (projectId: string, payload: Record<string, unknown>) => ({ id: "rule_new", projectId, isActive: true, ...payload, createdAt: now(), updatedAt: now() }),
  update: async (projectId: string, ruleId: string, payload: Record<string, unknown>) => ({ id: ruleId, projectId, ...payload, updatedAt: now() }),
};

