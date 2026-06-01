import { useAuth } from "@clerk/react";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../lib/api/client";
import { useOrganizations } from "./useOrganizations";

type ApiResponse<T> = { success: boolean; data: T };

export type ProjectApiKey = {
  id: string;
  projectId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: string;
  lastUsedAt?: string | null;
  createdAt: string;
};

export type SdkConfig = {
  projectId: string;
  packageName: string;
  publicEvaluateEndpoint: string;
  publicAuditEndpoint: string;
  protectsCriticalActions: boolean;
  storesClientSecrets: boolean;
  apiKeys: ProjectApiKey[];
};

export type GatewayConfig = {
  projectId: string;
  mode: string;
  endpoint: string;
  providers: string[];
  status: string;
  storesClientSecrets: boolean;
  apiKeys: ProjectApiKey[];
  examples: {
    openaiBaseUrl: string;
    authHeader: string;
  };
};

export function useProjectSecurity(projectId?: string) {
  const { activeOrganization } = useOrganizations();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [sdkConfig, setSdkConfig] = useState<SdkConfig | null>(null);
  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfig | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isMutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return null;
    return getToken();
  }, [getToken, isLoaded, isSignedIn]);

  const load = useCallback(async () => {
    if (!projectId || !activeOrganization?.id || !isLoaded) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const [sdkResponse, gatewayResponse] = await Promise.all([
        apiClient.get<ApiResponse<SdkConfig>>(`/projects/${projectId}/sdk/config`, token, activeOrganization.id),
        apiClient.get<ApiResponse<GatewayConfig>>(`/projects/${projectId}/gateway/config`, token, activeOrganization.id),
      ]);
      setSdkConfig(sdkResponse.data);
      setGatewayConfig(gatewayResponse.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la configuracion.");
    } finally {
      setLoading(false);
    }
  }, [activeOrganization?.id, getAuthToken, isLoaded, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createKey(name = "Produccion") {
    if (!projectId || !activeOrganization?.id) return;
    setMutating(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const response = await apiClient.post<ApiResponse<{ key: string; apiKey: ProjectApiKey }>>(
        `/projects/${projectId}/sdk/keys`,
        { name },
        token,
        activeOrganization.id,
      );
      setSecretKey(response.data.key);
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear la llave.");
    } finally {
      setMutating(false);
    }
  }

  async function revokeKey(keyId: string) {
    if (!projectId || !activeOrganization?.id) return;
    setMutating(true);
    setError(null);
    try {
      const token = await getAuthToken();
      await apiClient.delete<ApiResponse<ProjectApiKey>>(`/projects/${projectId}/sdk/keys/${keyId}`, token, activeOrganization.id);
      await load();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "No se pudo revocar la llave.");
    } finally {
      setMutating(false);
    }
  }

  async function runSdkTest() {
    if (!projectId || !activeOrganization?.id) return null;
    const token = await getAuthToken();
    const response = await apiClient.post<ApiResponse<unknown>>(
      `/projects/${projectId}/sdk/test-event`,
      {
        bot: "bot-soporte",
        action: "send_email",
        service: "gmail",
        risk: "medium",
        payload: { to: "cliente@demo.com", subject: "Seguimiento" },
      },
      token,
      activeOrganization.id,
    );
    return response.data;
  }

  async function runGatewayTest() {
    if (!projectId || !activeOrganization?.id) return null;
    const token = await getAuthToken();
    const response = await apiClient.post<ApiResponse<unknown>>(`/projects/${projectId}/gateway/test`, {}, token, activeOrganization.id);
    return response.data;
  }

  return {
    sdkConfig,
    gatewayConfig,
    secretKey,
    isLoading,
    isMutating,
    error,
    reload: load,
    createKey,
    revokeKey,
    runSdkTest,
    runGatewayTest,
  };
}
