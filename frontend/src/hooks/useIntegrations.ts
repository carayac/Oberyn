import { useAuth } from "@clerk/react";
import { useEffect, useState } from "react";
import { mockIntegrations } from "../data/mockIntegrations";
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

const hasClerkKey = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

const previewDetectedIntegrations: Integration[] = [
  {
    id: "integration_detected_openai",
    projectId: "project_1",
    name: "OpenAI",
    provider: "openai",
    serviceType: "llm",
    connectionMethod: "detected",
    status: "detected",
    coverage: 30,
    lastActivityAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "integration_detected_supabase",
    projectId: "project_1",
    name: "Supabase",
    provider: "supabase",
    serviceType: "database",
    connectionMethod: "detected",
    status: "detected",
    coverage: 25,
    lastActivityAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "integration_detected_stripe",
    projectId: "project_1",
    name: "Stripe",
    provider: "stripe",
    serviceType: "payments",
    connectionMethod: "detected",
    status: "detected",
    coverage: 20,
    lastActivityAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const previewFindings: IntegrationFinding[] = [
  {
    id: "openai:llm",
    name: "OpenAI",
    provider: "openai",
    serviceType: "llm",
    suggestedMethod: "gateway",
    confidence: 0.94,
    evidence: ["package.json: dependencia detectada", ".env.example: variable de entorno detectada"],
    riskSignals: ["Modelo generativo", "Salida externa", "Prompt y datos sensibles"],
  },
  {
    id: "supabase:database",
    name: "Supabase",
    provider: "supabase",
    serviceType: "database",
    suggestedMethod: "sdk",
    confidence: 0.88,
    evidence: [".env.example: variable de entorno detectada", "src/lib/supabase.ts: uso en codigo detectado"],
    riskSignals: ["Base de datos", "Datos de usuarios", "Operaciones persistentes"],
  },
  {
    id: "stripe:payments",
    name: "Stripe",
    provider: "stripe",
    serviceType: "payments",
    suggestedMethod: "sdk",
    confidence: 0.76,
    evidence: ["package.json: dependencia detectada"],
    riskSignals: ["Pagos", "Acciones irreversibles", "Datos financieros"],
  },
];

function usePreviewIntegrations(projectId?: string | null) {
  const [integrations, setIntegrations] = useState<Integration[]>(() => mockIntegrations.filter((integration) => !projectId || integration.projectId === projectId));
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIntegrations(mockIntegrations.filter((integration) => !projectId || integration.projectId === projectId));
  }, [projectId]);

  async function createIntegration(input: CreateIntegrationInput) {
    if (!projectId) throw new Error("Selecciona un proyecto antes de agregar integraciones.");

    const integration: Integration = {
      id: `integration_preview_${Date.now()}`,
      projectId,
      name: input.name,
      provider: input.provider,
      serviceType: input.serviceType,
      connectionMethod: input.connectionMethod,
      status: input.connectionMethod === "detected" ? "detected" : "manual",
      coverage: input.connectionMethod === "manual" ? 0 : 30,
      lastActivityAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIntegrations((current) => [integration, ...current]);
    return integration;
  }

  async function analyzeIntegrations(files: DetectionFileInput[] = [], repositoryUrl = "") {
    if (!projectId) throw new Error("Selecciona un proyecto antes de detectar integraciones.");
    setLoading(true);
    setError(null);

    try {
      const findings = files.length > 0 ? previewFindings : previewFindings.slice(0, 2);
      return {
        findings,
        integrations: [],
        scannedFiles: files.map((file) => ({ name: file.name, type: file.name.includes(".env") ? "env" : "config", bytes: file.content.length })),
        repository: repositoryUrl.trim() ? { source: repositoryUrl.trim().replace(/^https:\/\/github\.com\//, ""), scannedFiles: files.length || 6 } : null,
      };
    } finally {
      setLoading(false);
    }
  }

  async function confirmDetectedIntegrations(selectedFindingIds: string[], files: DetectionFileInput[] = [], repositoryUrl = "") {
    if (!projectId) throw new Error("Selecciona un proyecto antes de detectar integraciones.");
    setLoading(true);
    setError(null);

    try {
      const selectedFindings = previewFindings.filter((finding) => selectedFindingIds.includes(finding.id));
      const detected = selectedFindings.map((finding, index) => ({
        ...previewDetectedIntegrations[index % previewDetectedIntegrations.length],
        id: `integration_detected_${finding.provider}_${Date.now()}`,
        projectId,
        name: finding.name,
        provider: finding.provider,
        serviceType: finding.serviceType,
        coverage: Math.round(finding.confidence * 100),
      }));
      setIntegrations((current) => {
        const existingKeys = new Set(current.map((integration) => `${integration.provider}:${integration.serviceType}`));
        const nextDetected = detected.filter((integration) => !existingKeys.has(`${integration.provider}:${integration.serviceType}`));
        return [...nextDetected, ...current];
      });
      return {
        findings: selectedFindings,
        integrations: detected,
        scannedFiles: files.map((file) => ({ name: file.name, type: file.name.includes(".env") ? "env" : "config", bytes: file.content.length })),
        repository: repositoryUrl.trim() ? { source: repositoryUrl.trim().replace(/^https:\/\/github\.com\//, ""), scannedFiles: files.length || 6 } : null,
      };
    } finally {
      setLoading(false);
    }
  }

  async function detectIntegrations() {
    const result = await confirmDetectedIntegrations(previewFindings.map((finding) => finding.id));
    return result.integrations;
  }

  return {
    integrations,
    isLoading,
    error,
    reloadIntegrations: async () => undefined,
    createIntegration,
    analyzeIntegrations,
    confirmDetectedIntegrations,
    detectIntegrations,
  };
}

function useClerkIntegrations(projectId?: string | null, organizationId?: string | null) {
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

export function useIntegrations(projectId?: string | null, organizationId?: string | null) {
  return hasClerkKey ? useClerkIntegrations(projectId, organizationId) : usePreviewIntegrations(projectId);
}
