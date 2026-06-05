export const routes = {
  dashboard: "/dashboard",
  organizations: "/organizations",
  projects: "/projects",
};

export const getProjectRoute = (projectId: string) => `/projects/${projectId}`;
export const getProjectIntegrationsRoute = (projectId: string) => `/projects/${projectId}/integrations`;
export const getProjectRulesRoute = (projectId: string) => `/projects/${projectId}/rules`;
export const getProjectApprovalsRoute = (projectId: string) => `/projects/${projectId}/approvals`;
export const getProjectPayGuardRoute = (projectId: string) => `/projects/${projectId}/payguard`;
export const getProjectAuditRoute = (projectId: string) => `/projects/${projectId}/audit`;
export const getEvidenceRoute = (projectId: string, eventId: string) => `/projects/${projectId}/evidence/${eventId}`;
export const getProjectExceptionsRoute = (projectId: string) => `/projects/${projectId}/exceptions`;
export const getProjectGatewayRoute = (projectId: string) => `/projects/${projectId}/gateway`;
export const getProjectSDKRoute = (projectId: string) => `/projects/${projectId}/sdk`;

