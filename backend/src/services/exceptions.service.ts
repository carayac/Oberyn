const now = () => new Date().toISOString();
export const exceptionsService = {
  list: async (projectId: string) => [{ id: "exception_1", projectId, exceptionType: "service", name: "Servicio manual sin actividad", environment: "sandbox", skipReview: false, skipApproval: false, auditLevel: "standard", status: "manual", createdAt: now(), updatedAt: now() }],
  create: async (projectId: string, payload: Record<string, unknown>) => ({ id: "exception_new", projectId, status: "pending", ...payload, createdAt: now(), updatedAt: now() }),
  update: async (projectId: string, exceptionId: string, payload: Record<string, unknown>) => ({ id: exceptionId, projectId, ...payload, updatedAt: now() }),
};

