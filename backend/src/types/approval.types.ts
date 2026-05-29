export type ApprovalRequest = { id: string; projectId: string; botId?: string | null; integrationId?: string | null; actionName: string; riskLevel: string; status: string; reason?: string; payloadPreview?: Record<string, unknown>; requestedAt: string; resolvedAt?: string | null };

