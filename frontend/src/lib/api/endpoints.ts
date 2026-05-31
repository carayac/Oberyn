export const endpoints = {
  health: "/health",
  organizations: "/organizations",
  projects: "/projects",
  project: (projectId: string) => `/projects/${projectId}`,
  integrations: (projectId: string) => `/projects/${projectId}/integrations`,
  rules: (projectId: string) => `/projects/${projectId}/rules`,
  approvals: (projectId: string) => `/projects/${projectId}/approvals`,
  audit: (projectId: string) => `/projects/${projectId}/audit`,
  evidence: (projectId: string, eventId: string) => `/projects/${projectId}/evidence/${eventId}`,
  exceptions: (projectId: string) => `/projects/${projectId}/exceptions`,
  bots: (projectId: string) => `/projects/${projectId}/bots`,
  flows: (projectId: string) => `/projects/${projectId}/flows`,
  gatewayConfig: (projectId: string) => `/projects/${projectId}/gateway/config`,
  sdkConfig: (projectId: string) => `/projects/${projectId}/sdk/config`,
  manualServices: (projectId: string) => `/projects/${projectId}/manual-services`,
};

