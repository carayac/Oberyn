const now = () => new Date().toISOString();
export const manualServicesService = {
  list: async (projectId: string) => [{ id: "manual_service_1", projectId, name: "CRM interno", provider: "custom", status: "manual", activityStatus: "no_activity", note: "Registrado manualmente", createdAt: now(), updatedAt: now() }],
  create: async (projectId: string, payload: Record<string, unknown>) => ({ id: "manual_service_new", projectId, status: "manual", activityStatus: "no_activity", ...payload, createdAt: now(), updatedAt: now() }),
  update: async (projectId: string, serviceId: string, payload: Record<string, unknown>) => ({ id: serviceId, projectId, ...payload, updatedAt: now() }),
};

