export type Project = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string | null;
  projectType: string;
  environment: string;
  connectionMode: string;
  status: string;
  integrationsCount: number;
  rulesCount: number;
  botsCount: number;
  flowsCount: number;
  pendingApprovalsCount: number;
  allowedActionsCount?: number;
  blockedActionsCount?: number;
  lastActivityAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateProjectInput = {
  organizationId?: string;
  name?: string;
  slug?: string;
  description?: string;
  projectType?: string;
  environment?: string;
  connectionMode?: string;
};
