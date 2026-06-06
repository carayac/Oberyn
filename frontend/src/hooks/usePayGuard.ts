import { useAuth } from "@clerk/react";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../lib/api/client";
import type { CreatePaymentAgentPayload, CreatePaymentRequestPayload, PayGuardSummary, PaymentAgent, PaymentRequest, TrustedWallet, UpsertTrustedWalletPayload } from "../types/payguard";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

const emptyPayGuardSummary: PayGuardSummary = {
  agents: [],
  trustedWallets: [],
  requests: [],
  approvals: [],
  auditLogs: [],
  trustlessWork: {
    mode: "mock",
    isMockMode: true,
    configured: false,
    canSubmitTransactions: false,
    baseUrl: "",
    network: "testnet",
    message: "Trustless Work Mock Mode",
    docsUrl: "https://docs.trustlesswork.com/trustless-work/api-rest/introduction",
  },
};

export function usePayGuard(projectId?: string | null, organizationId?: string | null) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [summary, setSummary] = useState<PayGuardSummary>(emptyPayGuardSummary);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPayGuard = useCallback(async () => {
    if (!isLoaded || !projectId) return;
    if (!isSignedIn) {
      setSummary(emptyPayGuardSummary);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await apiClient.get<ApiResponse<PayGuardSummary>>(`/projects/${projectId}/payguard`, token, organizationId);
      setSummary(response.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar PayGuard.");
      setSummary(emptyPayGuardSummary);
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn, organizationId, projectId]);

  useEffect(() => {
    void loadPayGuard();
  }, [loadPayGuard]);

  async function postPaymentAction(path: string, body?: unknown) {
    if (!projectId) throw new Error("Selecciona un proyecto.");
    const token = await getToken();
    const response = await apiClient.post<ApiResponse<PaymentRequest>>(`/projects/${projectId}/payguard${path}`, body ?? {}, token, organizationId);
    await loadPayGuard();
    return response.data;
  }

  async function postPayGuardConfig<T>(path: string, body: unknown) {
    if (!projectId) throw new Error("Selecciona un proyecto.");
    const token = await getToken();
    const response = await apiClient.post<ApiResponse<T>>(`/projects/${projectId}/payguard${path}`, body, token, organizationId);
    await loadPayGuard();
    return response.data;
  }

  return {
    ...summary,
    isLoading,
    error,
    reloadPayGuard: loadPayGuard,
    createAgent: (payload: CreatePaymentAgentPayload) => postPayGuardConfig<PaymentAgent>("/agents", payload),
    upsertTrustedWallet: (payload: UpsertTrustedWalletPayload) => postPayGuardConfig<TrustedWallet>("/wallets", payload),
    createPaymentRequest: (payload: CreatePaymentRequestPayload) => postPaymentAction("/requests", payload),
    approve: (paymentRequestId: string) => postPaymentAction(`/requests/${paymentRequestId}/approve`),
    approveAndPay: (paymentRequestId: string) => postPaymentAction(`/requests/${paymentRequestId}/approve-and-pay`),
    reject: (paymentRequestId: string) => postPaymentAction(`/requests/${paymentRequestId}/reject`),
    block: (paymentRequestId: string) => postPaymentAction(`/requests/${paymentRequestId}/block`),
    createEscrow: (paymentRequestId: string) => postPaymentAction(`/requests/${paymentRequestId}/create-escrow`),
    fundEscrow: (paymentRequestId: string) => postPaymentAction(`/requests/${paymentRequestId}/fund`),
    releaseEscrow: (paymentRequestId: string) => postPaymentAction(`/requests/${paymentRequestId}/release`),
  };
}
