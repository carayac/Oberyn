export type PaymentAgentStatus = "active" | "paused" | "blocked";
export type PaymentRiskLevel = "low" | "medium" | "high";

export type PaymentRequestStatus =
  | "draft"
  | "pending_approval"
  | "requires_multi_approval"
  | "approved"
  | "rejected"
  | "blocked"
  | "escrow_created"
  | "funded"
  | "released"
  | "failed";

export type PaymentAuditAction =
  | "PAYMENT_REQUEST_CREATED"
  | "POLICY_EVALUATED"
  | "HUMAN_APPROVED"
  | "HUMAN_REJECTED"
  | "PAYMENT_BLOCKED"
  | "ESCROW_CREATED"
  | "ESCROW_FUNDED"
  | "PAYMENT_RELEASED"
  | "PAYMENT_FAILED";

export type PaymentActorType = "agent" | "human" | "system";

export type PaymentAgent = {
  id: string;
  projectId: string;
  name: string;
  status: PaymentAgentStatus;
  riskLevel: PaymentRiskLevel;
  maxAmount: number;
  canCreatePaymentRequest: boolean;
  canApprovePayment: boolean;
  canExecutePayment: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TrustedWallet = {
  id: string;
  projectId: string;
  recipientName: string;
  walletAddress: string;
  isVerified: boolean;
  token: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentRequest = {
  id: string;
  projectId: string;
  agentId: string;
  recipientName: string;
  recipientWallet: string;
  amount: number;
  token: string;
  reason: string;
  riskLevel: PaymentRiskLevel;
  status: PaymentRequestStatus;
  policyApplied: string[];
  auditHash: string;
  escrowId?: string | null;
  txHash?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentApproval = {
  id: string;
  projectId: string;
  paymentRequestId: string;
  actorId: string;
  status: "approved" | "rejected";
  createdAt: string;
};

export type PaymentAuditLog = {
  id: string;
  projectId: string;
  paymentRequestId: string;
  agentId: string;
  action: PaymentAuditAction;
  previousStatus?: PaymentRequestStatus | null;
  newStatus: PaymentRequestStatus;
  actorType: PaymentActorType;
  actorId: string;
  timestamp: string;
  actionHash: string;
  metadata: Record<string, unknown>;
};

export type TrustlessWorkIntegrationStatus = {
  mode: "mock" | "live";
  isMockMode: boolean;
  configured: boolean;
  canSubmitTransactions: boolean;
  baseUrl: string;
  network: string;
  message: string;
  docsUrl: string;
};

export type PayGuardSummary = {
  agents: PaymentAgent[];
  trustedWallets: TrustedWallet[];
  requests: PaymentRequest[];
  approvals: PaymentApproval[];
  auditLogs: PaymentAuditLog[];
  trustlessWork: TrustlessWorkIntegrationStatus;
};

export type CreatePaymentRequestPayload = {
  agentId: string;
  recipientName: string;
  recipientWallet: string;
  amount: number;
  token: string;
  reason: string;
  riskLevel: PaymentRiskLevel;
};
