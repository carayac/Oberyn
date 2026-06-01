import { useAuth } from "@clerk/react";
import { useEffect, useState } from "react";
import { apiClient } from "../lib/api/client";
import type { ConnectionMethod, Integration } from "../types/integration";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type CreateIntegrationInput = {
  name: string;
  provider: string;
  serviceType: string;
  connectionMethod: ConnectionMethod;
};

export type DetectionFileInput = {
  name: string;
  content: string;
};

export type IntegrationFinding = {
  id: string;
  name: string;
  provider: string;
  serviceType: string;
  suggestedMethod: "sdk" | "gateway" | "manual" | "detected";
  confidence: number;
  evidence: string[];
  riskSignals: string[];
};

export type DetectionResult = {
  findings: IntegrationFinding[];
  integrations: Integration[];
  scannedFiles: Array<{ name: string; type: string; bytes: number }>;
  repository?: { source: string; scannedFiles: number } | null;
};

export function useIntegrations(projectId?: string | null, organizationId?: string | null) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function getAuthToken() {
    if (!isLoaded || !isSignedIn) return null;
    return getToken();
  }

  async function loadIntegrations() {
    if (!projectId || !organizationId) {
      setIntegrations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const response = await apiClient.get<ApiResponse<Integration[]>>(`/projects/${projectId}/integrations`, token, organizationId);
      setIntegrations(response.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las integraciones.");
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoaded) return;
    void loadIntegrations();
  }, [isLoaded, isSignedIn, projectId, organizationId]);

  async function createIntegration(input: CreateIntegrationInput) {
    if (!projectId || !organizationId) throw new Error("Selecciona un proyecto antes de agregar integraciones.");

    const token = await getAuthToken();
    const response = await apiClient.post<ApiResponse<Integration>>(`/projects/${projectId}/integrations`, input, token, organizationId);
    setIntegrations((current) => [response.data, ...current]);
    return response.data;
  }

  async function analyzeIntegrations(files: DetectionFileInput[] = [], repositoryUrl = "") {
    if (!projectId || !organizationId) throw new Error("Selecciona un proyecto antes de detectar integraciones.");

    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const response = await apiClient.post<ApiResponse<DetectionResult>>(`/projects/${projectId}/integrations/detect`, { files, repositoryUrl, commit: false }, token, organizationId);
      return response.data;
    } catch (detectError) {
      setError(detectError instanceof Error ? detectError.message : "No se pudieron detectar integraciones.");
      throw detectError;
    } finally {
      setLoading(false);
    }
  }

  async function confirmDetectedIntegrations(selectedFindingIds: string[], files: DetectionFileInput[] = [], repositoryUrl = "") {
    if (!projectId || !organizationId) throw new Error("Selecciona un proyecto antes de detectar integraciones.");

    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const response = await apiClient.post<ApiResponse<DetectionResult>>(
        `/projects/${projectId}/integrations/detect`,
        { files, repositoryUrl, selectedFindingIds, commit: true },
        token,
        organizationId,
      );
      setIntegrations(response.data.integrations);
      return response.data;
    } catch (detectError) {
      setError(detectError instanceof Error ? detectError.message : "No se pudieron crear las integraciones detectadas.");
      throw detectError;
    } finally {
      setLoading(false);
    }
  }

  async function detectIntegrations() {
    const analysis = await analyzeIntegrations();
    const result = await confirmDetectedIntegrations(analysis.findings.map((finding) => finding.id));
    return result.integrations;
  }

  return {
    integrations,
    isLoading,
    error,
    reloadIntegrations: loadIntegrations,
    createIntegration,
    analyzeIntegrations,
    confirmDetectedIntegrations,
    detectIntegrations,
  };
}
