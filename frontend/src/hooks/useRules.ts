import { useAuth } from "@clerk/react";
import { useCallback, useEffect, useState } from "react";
import { mockRules } from "../data/mockRules";
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

const hasClerkKey = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

function usePreviewRules(projectId?: string | null) {
  const [rules, setRules] = useState<Rule[]>(() => mockRules.filter((rule) => !projectId || rule.projectId === projectId));

  useEffect(() => {
    setRules(mockRules.filter((rule) => !projectId || rule.projectId === projectId));
  }, [projectId]);

  async function createRule(input: RuleInput) {
    const rule: Rule = {
      id: `rule_preview_${Date.now()}`,
      projectId: projectId ?? "project_preview",
      ...input,
      isActive: input.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRules((current) => [rule, ...current]);
    return rule;
  }

  async function updateRule(ruleId: string, input: Partial<RuleInput>) {
    let updated: Rule | null = null;
    setRules((current) =>
      current.map((rule) => {
        if (rule.id !== ruleId) return rule;
        updated = { ...rule, ...input, updatedAt: new Date().toISOString() };
        return updated;
      }),
    );
    return updated;
  }

  async function deleteRule(ruleId: string) {
    setRules((current) => current.filter((rule) => rule.id !== ruleId));
    return { id: ruleId, deleted: true };
  }

  return { rules, isLoading: false, error: null as string | null, reloadRules: async () => undefined, createRule, updateRule, deleteRule };
}

function useClerkRules(projectId?: string | null, organizationId?: string | null) {
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

export function useRules(projectId?: string | null, organizationId?: string | null) {
  return hasClerkKey ? useClerkRules(projectId, organizationId) : usePreviewRules(projectId);
}
