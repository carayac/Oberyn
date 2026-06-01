export const sdkService = {
  getConfig: async (projectId: string) => ({ projectId, packageName: "@oberyn/sdk", environment: "sandbox", protectsCriticalActions: true, storesClientSecrets: false }),
  testEvent: async (projectId: string, payload: Record<string, unknown>) => ({ projectId, accepted: true, payloadPreview: payload }),
};

