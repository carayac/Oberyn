import { useAuth } from "@clerk/react";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../lib/api/client";
import type { ApprovalRequest } from "../types/approval";
import type { AuditEvent } from "../types/audit";
import type { Flow } from "../types/flow";
import type { Integration } from "../types/integration";
import type { Rule } from "../types/rule";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type DashboardData = {
  approvals: ApprovalRequest[];
  auditEvents: AuditEvent[];
  flows: Flow[];
  integrations: Integration[];
  rules: Rule[];
};

const emptyDashboardData: DashboardData = {
  approvals: [],
  auditEvents: [],
  flows: [],
  integrations: [],
  rules: [],
};

const hasClerkKey = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

function usePreviewDashboardData(_projectId?: string | null) {
  return {
    ...emptyDashboardData,
    isLoading: false,
    error: null as string | null,
    reloadDashboardData: async () => undefined,
  };
}

function useClerkDashboardData(projectId?: string | null, organizationId?: string | null) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [data, setData] = useState<DashboardData>(emptyDashboardData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!isLoaded || !projectId) {
      setData(emptyDashboardData);
      setIsLoading(false);
      return;
    }

    if (!isSignedIn) {
      setData(emptyDashboardData);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const [integrations, rules, approvals, auditEvents, flows] = await Promise.all([
        apiClient.get<ApiResponse<Integration[]>>(`/projects/${projectId}/integrations`, token, organizationId),
        apiClient.get<ApiResponse<Rule[]>>(`/projects/${projectId}/rules`, token, organizationId),
        apiClient.get<ApiResponse<ApprovalRequest[]>>(`/projects/${projectId}/approvals`, token, organizationId),
        apiClient.get<ApiResponse<AuditEvent[]>>(`/projects/${projectId}/audit`, token, organizationId),
        apiClient.get<ApiResponse<Flow[]>>(`/projects/${projectId}/flows`, token, organizationId),
      ]);

      setData({
        integrations: integrations.data,
        rules: rules.data,
        approvals: approvals.data,
        auditEvents: auditEvents.data,
        flows: flows.data,
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la informacion del dashboard.");
      setData(emptyDashboardData);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn, organizationId, projectId]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  return {
    ...data,
    isLoading,
    error,
    reloadDashboardData: loadDashboardData,
  };
}

export function useDashboardData(projectId?: string | null, organizationId?: string | null) {
  return hasClerkKey ? useClerkDashboardData(projectId, organizationId) : usePreviewDashboardData(projectId);
}
