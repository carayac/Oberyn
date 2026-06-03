import { useAuth } from "@clerk/react";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../lib/api/client";
import type { Flow } from "../types/flow";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type FlowInput = {
  name: string;
  description?: string;
  actionKey?: string | null;
  environment?: string;
  status?: string;
};

export function useFlows(projectId?: string | null, organizationId?: string | null) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFlows = useCallback(async () => {
    if (!isLoaded || !projectId) return;
    if (!isSignedIn) {
      setFlows([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await apiClient.get<ApiResponse<Flow[]>>(`/projects/${projectId}/flows`, token, organizationId);
      setFlows(response.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los flujos.");
      setFlows([]);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn, organizationId, projectId]);

  useEffect(() => {
    void loadFlows();
  }, [loadFlows]);

  async function createFlow(input: FlowInput) {
    if (!projectId) throw new Error("Selecciona un proyecto.");
    const token = await getToken();
    const response = await apiClient.post<ApiResponse<Flow>>(`/projects/${projectId}/flows`, input, token, organizationId);
    setFlows((current) => [response.data, ...current]);
    return response.data;
  }

  return { flows, isLoading, error, reloadFlows: loadFlows, createFlow };
}
