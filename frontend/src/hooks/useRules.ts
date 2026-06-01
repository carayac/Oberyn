import { useAuth } from "@clerk/react";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../lib/api/client";
import type { Rule } from "../types/rule";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type RuleInput = {
  name: string;
  description?: string;
  category: string;
  severity: string;
  conditionType: string;
  actionResult: string;
  scope: string;
  isActive?: boolean;
};

export function useRules(projectId?: string | null, organizationId?: string | null) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    if (!isLoaded || !projectId) return;
    if (!isSignedIn) {
      setRules([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await apiClient.get<ApiResponse<Rule[]>>(`/projects/${projectId}/rules`, token, organizationId);
      setRules(response.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las reglas.");
      setRules([]);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn, organizationId, projectId]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  async function createRule(input: RuleInput) {
    if (!projectId) throw new Error("Selecciona un proyecto.");
    const token = await getToken();
    const response = await apiClient.post<ApiResponse<Rule>>(`/projects/${projectId}/rules`, input, token, organizationId);
    setRules((current) => [response.data, ...current]);
    return response.data;
  }

  async function updateRule(ruleId: string, input: Partial<RuleInput>) {
    if (!projectId) throw new Error("Selecciona un proyecto.");
    const token = await getToken();
    const response = await apiClient.patch<ApiResponse<Rule>>(`/projects/${projectId}/rules/${ruleId}`, input, token, organizationId);
    setRules((current) => current.map((rule) => (rule.id === ruleId ? response.data : rule)));
    return response.data;
  }

  async function deleteRule(ruleId: string) {
    if (!projectId) throw new Error("Selecciona un proyecto.");
    const token = await getToken();
    const response = await apiClient.delete<ApiResponse<{ id: string; deleted: boolean }>>(`/projects/${projectId}/rules/${ruleId}`, token, organizationId);
    setRules((current) => current.filter((rule) => rule.id !== ruleId));
    return response.data;
  }

  return { rules, isLoading, error, reloadRules: loadRules, createRule, updateRule, deleteRule };
}
