import { useAuth } from "@clerk/react";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../lib/api/client";
import type { ApprovalRequest } from "../types/approval";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export function useApprovals(projectId?: string | null, organizationId?: string | null) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadApprovals = useCallback(async () => {
    if (!isLoaded || !projectId) return;
    if (!isSignedIn) {
      setApprovals([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await apiClient.get<ApiResponse<ApprovalRequest[]>>(`/projects/${projectId}/approvals`, token, organizationId);
      setApprovals(response.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las aprobaciones.");
      setApprovals([]);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn, organizationId, projectId]);

  useEffect(() => {
    void loadApprovals();
  }, [loadApprovals]);

  async function postAction<T>(approvalId: string, action: string, body?: unknown) {
    if (!projectId) throw new Error("Selecciona un proyecto.");
    const token = await getToken();
    const response = await apiClient.post<ApiResponse<T>>(`/projects/${projectId}/approvals/${approvalId}/${action}`, body ?? {}, token, organizationId);
    await loadApprovals();
    return response.data;
  }

  return {
    approvals,
    isLoading,
    error,
    reloadApprovals: loadApprovals,
    approve: (approvalId: string) => postAction<ApprovalRequest>(approvalId, "approve"),
    reject: (approvalId: string) => postAction<ApprovalRequest>(approvalId, "reject"),
    requestContext: (approvalId: string, message: string) => postAction<ApprovalRequest>(approvalId, "request-context", { message }),
    createPermanentRule: (approvalId: string) => postAction<{ approval: ApprovalRequest; rule: unknown }>(approvalId, "create-rule"),
  };
}
