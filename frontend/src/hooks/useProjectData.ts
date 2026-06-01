import { useAuth } from "@clerk/react";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../lib/api/client";
import { useOrganizations } from "./useOrganizations";

type ApiResponse<T> = { success: boolean; data: T };

export type RuleItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: string;
  conditionType: string;
  actionResult: string;
  isActive: boolean;
};

export type ExceptionItem = {
  id: string;
  exceptionType: string;
  name: string;
  description: string;
  actionKey: string;
  environment: string;
  skipReview: boolean;
  skipApproval: boolean;
  auditLevel: string;
  status: string;
  updatedAt: string;
};

export type BotItem = {
  id: string;
  name: string;
  identifier: string;
  role: string;
  description: string;
  status: string;
};

export type FlowItem = {
  id: string;
  name: string;
  description: string;
  actionKey: string;
  environment: string;
  status: string;
};

export function useProjectData(projectId?: string) {
  const { activeOrganization } = useOrganizations();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [bots, setBots] = useState<BotItem[]>([]);
  const [flows, setFlows] = useState<FlowItem[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId || !activeOrganization?.id || !isLoaded || !isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const [rulesResponse, exceptionsResponse, botsResponse, flowsResponse] = await Promise.all([
        apiClient.get<ApiResponse<RuleItem[]>>(`/projects/${projectId}/rules`, token, activeOrganization.id),
        apiClient.get<ApiResponse<ExceptionItem[]>>(`/projects/${projectId}/exceptions`, token, activeOrganization.id),
        apiClient.get<ApiResponse<BotItem[]>>(`/projects/${projectId}/bots`, token, activeOrganization.id),
        apiClient.get<ApiResponse<FlowItem[]>>(`/projects/${projectId}/flows`, token, activeOrganization.id),
      ]);
      setRules(rulesResponse.data);
      setExceptions(exceptionsResponse.data);
      setBots(botsResponse.data);
      setFlows(flowsResponse.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la informacion del proyecto.");
    } finally {
      setLoading(false);
    }
  }, [activeOrganization?.id, getToken, isLoaded, isSignedIn, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createRule(input: Partial<RuleItem>) {
    if (!projectId || !activeOrganization?.id) return;
    const token = await getToken();
    await apiClient.post<ApiResponse<RuleItem>>(`/projects/${projectId}/rules`, input, token, activeOrganization.id);
    await load();
  }

  async function updateRule(ruleId: string, input: Partial<RuleItem>) {
    if (!projectId || !activeOrganization?.id) return;
    const token = await getToken();
    await apiClient.patch<ApiResponse<RuleItem>>(`/projects/${projectId}/rules/${ruleId}`, input, token, activeOrganization.id);
    await load();
  }

  async function createException(input: Partial<ExceptionItem>) {
    if (!projectId || !activeOrganization?.id) return;
    const token = await getToken();
    await apiClient.post<ApiResponse<ExceptionItem>>(`/projects/${projectId}/exceptions`, input, token, activeOrganization.id);
    await load();
  }

  async function createBot(input: Partial<BotItem>) {
    if (!projectId || !activeOrganization?.id) return;
    const token = await getToken();
    await apiClient.post<ApiResponse<BotItem>>(`/projects/${projectId}/bots`, input, token, activeOrganization.id);
    await load();
  }

  async function createFlow(input: Partial<FlowItem>) {
    if (!projectId || !activeOrganization?.id) return;
    const token = await getToken();
    await apiClient.post<ApiResponse<FlowItem>>(`/projects/${projectId}/flows`, input, token, activeOrganization.id);
    await load();
  }

  return { rules, exceptions, bots, flows, isLoading, error, reload: load, createRule, updateRule, createException, createBot, createFlow };
}
