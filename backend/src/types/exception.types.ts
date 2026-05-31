export type Exception = { id: string; projectId: string; exceptionType: string; name: string; description?: string; botId?: string | null; flowId?: string | null; integrationId?: string | null; actionKey?: string | null; environment: string; skipReview: boolean; skipApproval: boolean; auditLevel: string; status: string; createdAt: string; updatedAt: string };

