import { useAuth } from "@clerk/react";
import { useCallback, useEffect, useRef, useState } from "react";
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

const DASHBOARD_REFRESH_MS = 15_000;

export function useDashboardData(projectId?: string | null, organizationId?: string | null) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [data, setData] = useState<DashboardData>(emptyDashboardData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const previousProjectIdRef = useRef<string | null | undefined>(projectId);

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

    if (previousProjectIdRef.current !== projectId) {
      hasLoadedRef.current = false;
      previousProjectIdRef.current = projectId;
    }

    setIsLoading(!hasLoadedRef.current);
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
      if (!hasLoadedRef.current) {
        setData(emptyDashboardData);
      }
    } finally {
      hasLoadedRef.current = true;
      setIsLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn, organizationId, projectId]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !projectId) return undefined;

    const refreshId = window.setInterval(() => {
      void loadDashboardData();
    }, DASHBOARD_REFRESH_MS);

    return () => window.clearInterval(refreshId);
  }, [isLoaded, isSignedIn, loadDashboardData, projectId]);

  return {
    ...data,
    isLoading,
    error,
    reloadDashboardData: loadDashboardData,
  };
}
