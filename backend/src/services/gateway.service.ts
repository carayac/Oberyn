export const gatewayService = {
  getConfig: async (projectId: string) => ({ projectId, mode: "gateway", endpoint: `/gateway/${projectId}`, status: "requires_configuration", storesClientSecrets: false }),
  test: async (projectId: string) => ({ projectId, ok: true, message: "Gateway placeholder test accepted" }),
};

