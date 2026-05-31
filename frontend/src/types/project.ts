export type Project = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  projectType: string;
  environment: string;
  connectionMode: string;
  status: "active" | "inactive" | "pending_setup" | "no_activity" | "paused" | "requires_configuration" | "archived";
  riskProfile?: "low" | "medium" | "high" | "critical";
  defaultPolicyMode?: "strict" | "balanced" | "flexible";
  auditEnabled?: boolean;
  stellarAnchorEnabled?: boolean;
  protectedServicesCount?: number;
  integrationsCount?: number;
  rulesCount?: number;
  botsCount?: number;
  flowsCount?: number;
  pendingApprovalsCount?: number;
  allowedActionsCount?: number;
  blockedActionsCount?: number;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateProjectInput = {
  name: string;
  slug: string;
  description?: string;
  projectType: string;
  environment: string;
  connectionMode: string;
  riskProfile: "low" | "medium" | "high" | "critical";
  defaultPolicyMode: "strict" | "balanced" | "flexible";
};
