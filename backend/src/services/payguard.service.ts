import crypto from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";
import { payguardPolicyEngine } from "./payguardPolicyEngine.service.js";
import { trustlessWorkAdapter } from "./trustlessWorkAdapter.service.js";
import type {
  PayGuardSummary,
  PaymentActorType,
  PaymentAgent,
  PaymentAgentStatus,
  PaymentApproval,
  PaymentAuditAction,
  PaymentAuditLog,
  PaymentRequest,
  PaymentRequestStatus,
  PaymentRiskLevel,
  TrustedWallet,
} from "../types/payguard.types.js";

type CreatePaymentRequestInput = {
  agentId?: string;
  recipientName?: string;
  recipientWallet?: string;
  amount?: number | string;
  token?: string;
  reason?: string;
  riskLevel?: string;
};

const mockStores = new Map<string, PayGuardSummary>();
const mockTrustedWallet = "GDEMOAPPROVEDPAYGUARDWALLET000000000000000000000000";
const systemActorId = "oberyn-payguard";

function now() {
  return new Date().toISOString();
}

function normalizeRisk(value: unknown): PaymentRiskLevel {
  const risk = typeof value === "string" ? value.toLowerCase() : "";
  if (risk === "high" || risk === "medium" || risk === "low") return risk;
  return "low";
}

function normalizeAgentStatus(value: unknown): PaymentAgentStatus {
  const status = typeof value === "string" ? value.toLowerCase() : "";
  if (status === "blocked" || status === "paused" || status === "active") return status;
  return "active";
}

function normalizeRequestStatus(value: unknown): PaymentRequestStatus {
  const status = typeof value === "string" ? value.toLowerCase() : "";
  if (
    [
      "draft",
      "pending_approval",
      "requires_multi_approval",
      "approved",
      "rejected",
      "blocked",
      "escrow_created",
      "funded",
      "released",
      "failed",
    ].includes(status)
  ) {
    return status as PaymentRequestStatus;
  }
  return "pending_approval";
}

function normalizeAction(value: unknown): PaymentAuditAction {
  const action = typeof value === "string" ? value : "";
  if (
    [
      "PAYMENT_REQUEST_CREATED",
      "POLICY_EVALUATED",
      "HUMAN_APPROVED",
      "HUMAN_REJECTED",
      "PAYMENT_BLOCKED",
      "ESCROW_CREATED",
      "ESCROW_FUNDED",
      "PAYMENT_RELEASED",
      "PAYMENT_FAILED",
    ].includes(action)
  ) {
    return action as PaymentAuditAction;
  }
  return "POLICY_EVALUATED";
}

function policyArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function isPayGuardTableMissing(error: unknown) {
  const detail = error as { code?: string; message?: string; details?: string };
  const text = `${detail?.message ?? ""} ${detail?.details ?? ""}`;
  return detail?.code === "42P01" || detail?.code === "PGRST205" || /payment_agents|payment_requests|payment_audit_logs|payment_approvals|trusted_wallets|schema cache|does not exist/i.test(text);
}

function actionHash(input: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function toPaymentAgent(row: Record<string, unknown>): PaymentAgent {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    name: String(row.name),
    status: normalizeAgentStatus(row.status),
    riskLevel: normalizeRisk(row.risk_level),
    maxAmount: Number(row.max_amount ?? 0),
    canCreatePaymentRequest: Boolean(row.can_create_payment_request),
    canApprovePayment: Boolean(row.can_approve_payment),
    canExecutePayment: Boolean(row.can_execute_payment),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function toTrustedWallet(row: Record<string, unknown>): TrustedWallet {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    recipientName: String(row.recipient_name),
    walletAddress: String(row.wallet_address),
    isVerified: Boolean(row.is_verified),
    token: String(row.token ?? "USDC"),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function toPaymentRequest(row: Record<string, unknown>): PaymentRequest {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    agentId: String(row.agent_id),
    recipientName: String(row.recipient_name),
    recipientWallet: String(row.recipient_wallet),
    amount: Number(row.amount ?? 0),
    token: String(row.token ?? "USDC"),
    reason: String(row.reason ?? ""),
    riskLevel: normalizeRisk(row.risk_level),
    status: normalizeRequestStatus(row.status),
    policyApplied: policyArray(row.policy_applied),
    auditHash: String(row.audit_hash ?? ""),
    escrowId: row.escrow_id ? String(row.escrow_id) : null,
    txHash: row.tx_hash ? String(row.tx_hash) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function toPaymentApproval(row: Record<string, unknown>): PaymentApproval {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    paymentRequestId: String(row.payment_request_id),
    actorId: String(row.actor_id),
    status: String(row.status) === "rejected" ? "rejected" : "approved",
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function toPaymentAuditLog(row: Record<string, unknown>): PaymentAuditLog {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    paymentRequestId: String(row.payment_request_id),
    agentId: String(row.agent_id),
    action: normalizeAction(row.action),
    previousStatus: row.previous_status ? normalizeRequestStatus(row.previous_status) : null,
    newStatus: normalizeRequestStatus(row.new_status),
    actorType: String(row.actor_type) === "human" || String(row.actor_type) === "agent" ? (String(row.actor_type) as PaymentActorType) : "system",
    actorId: String(row.actor_id),
    timestamp: new Date(String(row.timestamp)).toISOString(),
    actionHash: String(row.action_hash),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function defaultAgents(projectId: string): PaymentAgent[] {
  const timestamp = now();
  return [
    {
      id: crypto.randomUUID(),
      projectId,
      name: "PayOps Analyst",
      status: "active",
      riskLevel: "low",
      maxAmount: 100,
      canCreatePaymentRequest: true,
      canApprovePayment: false,
      canExecutePayment: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: crypto.randomUUID(),
      projectId,
      name: "Treasury Copilot",
      status: "active",
      riskLevel: "medium",
      maxAmount: 2500,
      canCreatePaymentRequest: true,
      canApprovePayment: false,
      canExecutePayment: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: crypto.randomUUID(),
      projectId,
      name: "Blocked Payout Bot",
      status: "blocked",
      riskLevel: "high",
      maxAmount: 0,
      canCreatePaymentRequest: false,
      canApprovePayment: false,
      canExecutePayment: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}

function defaultWallets(projectId: string): TrustedWallet[] {
  const timestamp = now();
  return [
    {
      id: crypto.randomUUID(),
      projectId,
      recipientName: "Proveedor verificado demo",
      walletAddress: mockTrustedWallet,
      isVerified: true,
      token: "USDC",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}

function agentRow(agent: PaymentAgent) {
  return {
    id: agent.id,
    project_id: agent.projectId,
    name: agent.name,
    status: agent.status,
    risk_level: agent.riskLevel,
    max_amount: agent.maxAmount,
    can_create_payment_request: agent.canCreatePaymentRequest,
    can_approve_payment: agent.canApprovePayment,
    can_execute_payment: agent.canExecutePayment,
    created_at: agent.createdAt,
    updated_at: agent.updatedAt,
  };
}

function walletRow(wallet: TrustedWallet) {
  return {
    id: wallet.id,
    project_id: wallet.projectId,
    recipient_name: wallet.recipientName,
    wallet_address: wallet.walletAddress,
    is_verified: wallet.isVerified,
    token: wallet.token,
    created_at: wallet.createdAt,
    updated_at: wallet.updatedAt,
  };
}

function requestRow(request: PaymentRequest) {
  return {
    id: request.id,
    project_id: request.projectId,
    agent_id: request.agentId,
    recipient_name: request.recipientName,
    recipient_wallet: request.recipientWallet,
    amount: request.amount,
    token: request.token,
    reason: request.reason,
    risk_level: request.riskLevel,
    status: request.status,
    policy_applied: request.policyApplied,
    audit_hash: request.auditHash,
    escrow_id: request.escrowId ?? null,
    tx_hash: request.txHash ?? null,
    created_at: request.createdAt,
    updated_at: request.updatedAt,
  };
}

function auditRow(log: PaymentAuditLog) {
  return {
    id: log.id,
    project_id: log.projectId,
    payment_request_id: log.paymentRequestId,
    agent_id: log.agentId,
    action: log.action,
    previous_status: log.previousStatus ?? null,
    new_status: log.newStatus,
    actor_type: log.actorType,
    actor_id: log.actorId,
    timestamp: log.timestamp,
    action_hash: log.actionHash,
    metadata: log.metadata,
  };
}

function createAuditLog(input: {
  projectId: string;
  paymentRequestId: string;
  agentId: string;
  action: PaymentAuditAction;
  previousStatus?: PaymentRequestStatus | null;
  newStatus: PaymentRequestStatus;
  actorType: PaymentActorType;
  actorId: string;
  metadata?: Record<string, unknown>;
}): PaymentAuditLog {
  const timestamp = now();
  const metadata = input.metadata ?? {};
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    paymentRequestId: input.paymentRequestId,
    agentId: input.agentId,
    action: input.action,
    previousStatus: input.previousStatus ?? null,
    newStatus: input.newStatus,
    actorType: input.actorType,
    actorId: input.actorId,
    timestamp,
    actionHash: actionHash({
      paymentRequestId: input.paymentRequestId,
      agentId: input.agentId,
      action: input.action,
      previousStatus: input.previousStatus ?? null,
      newStatus: input.newStatus,
      actorType: input.actorType,
      actorId: input.actorId,
      timestamp,
      metadata,
    }),
    metadata,
  };
}

function normalizeCreateInput(payload: CreatePaymentRequestInput) {
  const amount = typeof payload.amount === "string" ? Number(payload.amount) : Number(payload.amount ?? 0);
  return {
    agentId: String(payload.agentId ?? "").trim(),
    recipientName: String(payload.recipientName ?? "").trim(),
    recipientWallet: String(payload.recipientWallet ?? "").trim(),
    amount: Number.isFinite(amount) ? amount : 0,
    token: String(payload.token ?? "USDC").trim().toUpperCase() || "USDC",
    reason: String(payload.reason ?? "").trim(),
    riskLevel: normalizeRisk(payload.riskLevel),
  };
}

function ensureMockStore(projectId: string): PayGuardSummary {
  const existing = mockStores.get(projectId);
  if (existing) return existing;

  const store: PayGuardSummary = {
    agents: defaultAgents(projectId),
    trustedWallets: defaultWallets(projectId),
    requests: [],
    approvals: [],
    auditLogs: [],
    trustlessWork: trustlessWorkAdapter.integrationStatus(),
  };
  mockStores.set(projectId, store);
  return store;
}

async function ensureSeedData(projectId: string) {
  const { count: agentsCount, error: agentsError } = await supabaseAdmin.from("payment_agents").select("id", { count: "exact", head: true }).eq("project_id", projectId);
  if (agentsError) throw agentsError;
  if ((agentsCount ?? 0) === 0) {
    const { error } = await supabaseAdmin.from("payment_agents").insert(defaultAgents(projectId).map(agentRow));
    if (error) throw error;
  }

  const { count: walletsCount, error: walletsError } = await supabaseAdmin.from("trusted_wallets").select("id", { count: "exact", head: true }).eq("project_id", projectId);
  if (walletsError) throw walletsError;
  if ((walletsCount ?? 0) === 0) {
    const { error } = await supabaseAdmin.from("trusted_wallets").insert(defaultWallets(projectId).map(walletRow));
    if (error) throw error;
  }
}

async function readSummaryFromDb(projectId: string): Promise<PayGuardSummary> {
  await ensureSeedData(projectId);
  const [agentsResult, walletsResult, requestsResult, approvalsResult, logsResult] = await Promise.all([
    supabaseAdmin.from("payment_agents").select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
    supabaseAdmin.from("trusted_wallets").select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
    supabaseAdmin.from("payment_requests").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(100),
    supabaseAdmin.from("payment_approvals").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(100),
    supabaseAdmin.from("payment_audit_logs").select("*").eq("project_id", projectId).order("timestamp", { ascending: false }).limit(200),
  ]);

  if (agentsResult.error) throw agentsResult.error;
  if (walletsResult.error) throw walletsResult.error;
  if (requestsResult.error) throw requestsResult.error;
  if (approvalsResult.error) throw approvalsResult.error;
  if (logsResult.error) throw logsResult.error;

  return {
    agents: (agentsResult.data ?? []).map(toPaymentAgent),
    trustedWallets: (walletsResult.data ?? []).map(toTrustedWallet),
    requests: (requestsResult.data ?? []).map(toPaymentRequest),
    approvals: (approvalsResult.data ?? []).map(toPaymentApproval),
    auditLogs: (logsResult.data ?? []).map(toPaymentAuditLog),
    trustlessWork: trustlessWorkAdapter.integrationStatus(),
  };
}

async function insertAuditLogs(logs: PaymentAuditLog[]) {
  if (!logs.length) return;
  const { error } = await supabaseAdmin.from("payment_audit_logs").insert(logs.map(auditRow));
  if (error) throw error;
}

async function getRequestFromDb(projectId: string, paymentRequestId: string) {
  const { data, error } = await supabaseAdmin.from("payment_requests").select("*").eq("project_id", projectId).eq("id", paymentRequestId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("La solicitud de pago no existe.");
  return toPaymentRequest(data);
}

async function updateRequestInDb(projectId: string, paymentRequestId: string, patch: Partial<Pick<PaymentRequest, "status" | "escrowId" | "txHash">>) {
  const updatePayload: Record<string, unknown> = { updated_at: now() };
  if (patch.status) updatePayload.status = patch.status;
  if ("escrowId" in patch) updatePayload.escrow_id = patch.escrowId ?? null;
  if ("txHash" in patch) updatePayload.tx_hash = patch.txHash ?? null;

  const { data, error } = await supabaseAdmin.from("payment_requests").update(updatePayload).eq("project_id", projectId).eq("id", paymentRequestId).select("*").single();
  if (error) throw error;
  return toPaymentRequest(data);
}

async function createRequestDb(projectId: string, payload: CreatePaymentRequestInput) {
  await ensureSeedData(projectId);
  const input = normalizeCreateInput(payload);
  if (!input.agentId) throw new Error("Selecciona un agente de pago.");
  if (!input.recipientName) throw new Error("Indica el nombre del destinatario.");
  if (!input.recipientWallet) throw new Error("Indica la wallet destino.");
  if (!input.reason) throw new Error("Indica el motivo del pago.");

  const { data: agentRowData, error: agentError } = await supabaseAdmin.from("payment_agents").select("*").eq("project_id", projectId).eq("id", input.agentId).maybeSingle();
  if (agentError) throw agentError;
  if (!agentRowData) throw new Error("El agente de pago no existe.");
  const agent = toPaymentAgent(agentRowData);

  const { data: wallet, error: walletError } = await supabaseAdmin
    .from("trusted_wallets")
    .select("*")
    .eq("project_id", projectId)
    .eq("wallet_address", input.recipientWallet)
    .eq("is_verified", true)
    .maybeSingle();
  if (walletError) throw walletError;

  const policy = payguardPolicyEngine.evaluatePaymentRequest({
    agent,
    amount: input.amount,
    requestedRiskLevel: input.riskLevel,
    isWalletVerified: Boolean(wallet),
  });
  const timestamp = now();
  const requestId = crypto.randomUUID();
  const auditHash = actionHash({
    projectId,
    requestId,
    agentId: agent.id,
    recipientWallet: input.recipientWallet,
    amount: input.amount,
    token: input.token,
    policyApplied: policy.policyApplied,
    createdAt: timestamp,
  });
  const request: PaymentRequest = {
    id: requestId,
    projectId,
    agentId: agent.id,
    recipientName: input.recipientName,
    recipientWallet: input.recipientWallet,
    amount: input.amount,
    token: input.token,
    reason: input.reason,
    riskLevel: policy.riskLevel,
    status: policy.status,
    policyApplied: policy.policyApplied,
    auditHash,
    escrowId: null,
    txHash: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const { data, error } = await supabaseAdmin.from("payment_requests").insert(requestRow(request)).select("*").single();
  if (error) throw error;

  const logs = [
    createAuditLog({
      projectId,
      paymentRequestId: request.id,
      agentId: agent.id,
      action: "PAYMENT_REQUEST_CREATED",
      newStatus: request.status,
      actorType: "agent",
      actorId: agent.id,
      metadata: { amount: request.amount, token: request.token, recipientName: request.recipientName },
    }),
    createAuditLog({
      projectId,
      paymentRequestId: request.id,
      agentId: agent.id,
      action: "POLICY_EVALUATED",
      previousStatus: request.status,
      newStatus: request.status,
      actorType: "system",
      actorId: systemActorId,
      metadata: { policyApplied: policy.policyApplied, reasons: policy.reasons },
    }),
  ];

  if (request.status === "blocked") {
    logs.push(
      createAuditLog({
        projectId,
        paymentRequestId: request.id,
        agentId: agent.id,
        action: "PAYMENT_BLOCKED",
        previousStatus: request.status,
        newStatus: "blocked",
        actorType: "system",
        actorId: systemActorId,
        metadata: { reasons: policy.reasons },
      }),
    );
  }

  await insertAuditLogs(logs);
  return toPaymentRequest(data);
}

function assertCanApprove(request: PaymentRequest) {
  if (request.status === "blocked") throw new Error("No se puede aprobar una solicitud bloqueada.");
  if (request.status === "approved") throw new Error("La solicitud ya fue aprobada.");
  if (request.status === "rejected") throw new Error("No se puede aprobar una solicitud rechazada.");
  if (request.status === "escrow_created" || request.status === "funded" || request.status === "released") {
    throw new Error("No se puede aprobar una solicitud que ya avanzo al ciclo de escrow.");
  }
  if (request.status === "failed") throw new Error("No se puede aprobar una solicitud fallida.");
}

async function approveDb(projectId: string, paymentRequestId: string, actorId: string) {
  const request = await getRequestFromDb(projectId, paymentRequestId);
  assertCanApprove(request);

  const { data: existingActorApproval, error: existingError } = await supabaseAdmin
    .from("payment_approvals")
    .select("*")
    .eq("project_id", projectId)
    .eq("payment_request_id", paymentRequestId)
    .eq("actor_id", actorId)
    .eq("status", "approved")
    .maybeSingle();
  if (existingError) throw existingError;
  if (existingActorApproval) throw new Error("Este humano ya aprobo la solicitud.");

  const { count, error: countError } = await supabaseAdmin
    .from("payment_approvals")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("payment_request_id", paymentRequestId)
    .eq("status", "approved");
  if (countError) throw countError;

  const approvalId = crypto.randomUUID();
  const { error: approvalError } = await supabaseAdmin.from("payment_approvals").insert({
    id: approvalId,
    project_id: projectId,
    payment_request_id: paymentRequestId,
    actor_id: actorId,
    status: "approved",
    created_at: now(),
  });
  if (approvalError) throw approvalError;

  const approvalCount = (count ?? 0) + 1;
  const requiredApprovals = request.status === "requires_multi_approval" ? 2 : 1;
  const nextStatus: PaymentRequestStatus = approvalCount >= requiredApprovals ? "approved" : "requires_multi_approval";
  const updated = await updateRequestInDb(projectId, paymentRequestId, { status: nextStatus });
  await insertAuditLogs([
    createAuditLog({
      projectId,
      paymentRequestId,
      agentId: request.agentId,
      action: "HUMAN_APPROVED",
      previousStatus: request.status,
      newStatus: nextStatus,
      actorType: "human",
      actorId,
      metadata: { approvalCount, requiredApprovals },
    }),
  ]);
  return updated;
}

function assertCanRejectOrBlock(request: PaymentRequest, action: "reject" | "block") {
  if (request.status === "released") throw new Error("No se puede cambiar una solicitud ya liberada.");
  if (request.status === "funded") throw new Error("No se puede cambiar una solicitud con escrow fondeado.");
  if (request.status === "rejected" && action === "reject") throw new Error("La solicitud ya fue rechazada.");
  if (request.status === "blocked" && action === "block") throw new Error("La solicitud ya esta bloqueada.");
}

async function rejectDb(projectId: string, paymentRequestId: string, actorId: string) {
  const request = await getRequestFromDb(projectId, paymentRequestId);
  assertCanRejectOrBlock(request, "reject");

  const { error: approvalError } = await supabaseAdmin.from("payment_approvals").insert({
    id: crypto.randomUUID(),
    project_id: projectId,
    payment_request_id: paymentRequestId,
    actor_id: actorId,
    status: "rejected",
    created_at: now(),
  });
  if (approvalError) throw approvalError;

  const updated = await updateRequestInDb(projectId, paymentRequestId, { status: "rejected" });
  await insertAuditLogs([
    createAuditLog({
      projectId,
      paymentRequestId,
      agentId: request.agentId,
      action: "HUMAN_REJECTED",
      previousStatus: request.status,
      newStatus: "rejected",
      actorType: "human",
      actorId,
      metadata: {},
    }),
  ]);
  return updated;
}

async function blockDb(projectId: string, paymentRequestId: string, actorId: string) {
  const request = await getRequestFromDb(projectId, paymentRequestId);
  assertCanRejectOrBlock(request, "block");

  const updated = await updateRequestInDb(projectId, paymentRequestId, { status: "blocked" });
  await insertAuditLogs([
    createAuditLog({
      projectId,
      paymentRequestId,
      agentId: request.agentId,
      action: "PAYMENT_BLOCKED",
      previousStatus: request.status,
      newStatus: "blocked",
      actorType: "human",
      actorId,
      metadata: { reason: "Bloqueado manualmente por un humano." },
    }),
  ]);
  return updated;
}

async function markFailedDb(projectId: string, request: PaymentRequest, error: unknown) {
  const message = error instanceof Error ? error.message : "La operacion con Trustless Work fallo.";
  const updated = await updateRequestInDb(projectId, request.id, { status: "failed" });
  await insertAuditLogs([
    createAuditLog({
      projectId,
      paymentRequestId: request.id,
      agentId: request.agentId,
      action: "PAYMENT_FAILED",
      previousStatus: request.status,
      newStatus: "failed",
      actorType: "system",
      actorId: systemActorId,
      metadata: { message },
    }),
  ]);
  return updated;
}

async function createEscrowDb(projectId: string, paymentRequestId: string, actorId: string) {
  const request = await getRequestFromDb(projectId, paymentRequestId);
  if (request.status !== "approved") throw new Error("Solo una solicitud aprobada puede crear escrow.");
  if (request.escrowId) throw new Error("La solicitud ya tiene escrow.");

  try {
    const result = await trustlessWorkAdapter.createEscrowFromPaymentRequest(request);
    const updated = await updateRequestInDb(projectId, paymentRequestId, { status: "escrow_created", escrowId: result.escrowId ?? null, txHash: result.txHash ?? request.txHash ?? null });
    await insertAuditLogs([
      createAuditLog({
        projectId,
        paymentRequestId,
        agentId: request.agentId,
        action: "ESCROW_CREATED",
        previousStatus: request.status,
        newStatus: "escrow_created",
        actorType: "system",
        actorId: systemActorId,
        metadata: { triggeredBy: actorId, escrowId: result.escrowId, txHash: result.txHash, trustlessWork: result.raw },
      }),
    ]);
    return updated;
  } catch (error) {
    await markFailedDb(projectId, request, error);
    throw error;
  }
}

async function fundEscrowDb(projectId: string, paymentRequestId: string, actorId: string) {
  const request = await getRequestFromDb(projectId, paymentRequestId);
  if (!request.escrowId) throw new Error("No se puede fondear sin escrow.");
  if (request.status !== "escrow_created") throw new Error("Solo un escrow creado puede fondearse.");

  try {
    const result = await trustlessWorkAdapter.fundEscrow(request);
    const updated = await updateRequestInDb(projectId, paymentRequestId, { status: "funded", txHash: result.txHash ?? request.txHash ?? null });
    await insertAuditLogs([
      createAuditLog({
        projectId,
        paymentRequestId,
        agentId: request.agentId,
        action: "ESCROW_FUNDED",
        previousStatus: request.status,
        newStatus: "funded",
        actorType: "system",
        actorId: systemActorId,
        metadata: { triggeredBy: actorId, escrowId: request.escrowId, txHash: result.txHash, trustlessWork: result.raw },
      }),
    ]);
    return updated;
  } catch (error) {
    await markFailedDb(projectId, request, error);
    throw error;
  }
}

async function releaseEscrowDb(projectId: string, paymentRequestId: string, actorId: string) {
  const request = await getRequestFromDb(projectId, paymentRequestId);
  if (request.status === "released") throw new Error("No se permite doble release.");
  if (!request.escrowId) throw new Error("No se puede liberar sin escrow.");
  if (request.status !== "funded") throw new Error("Solo un escrow fondeado puede liberarse.");

  try {
    const result = await trustlessWorkAdapter.releaseEscrow(request);
    const updated = await updateRequestInDb(projectId, paymentRequestId, { status: "released", txHash: result.txHash ?? request.txHash ?? null });
    await insertAuditLogs([
      createAuditLog({
        projectId,
        paymentRequestId,
        agentId: request.agentId,
        action: "PAYMENT_RELEASED",
        previousStatus: request.status,
        newStatus: "released",
        actorType: "system",
        actorId: systemActorId,
        metadata: { triggeredBy: actorId, escrowId: request.escrowId, txHash: result.txHash, trustlessWork: result.raw },
      }),
    ]);
    return updated;
  } catch (error) {
    await markFailedDb(projectId, request, error);
    throw error;
  }
}

function mockCreateRequest(projectId: string, payload: CreatePaymentRequestInput) {
  const store = ensureMockStore(projectId);
  const input = normalizeCreateInput(payload);
  const agent = store.agents.find((item) => item.id === input.agentId);
  if (!agent) throw new Error("El agente de pago no existe.");
  if (!input.recipientName || !input.recipientWallet || !input.reason) throw new Error("Completa destinatario, wallet y motivo.");

  const wallet = store.trustedWallets.find((item) => item.walletAddress === input.recipientWallet && item.isVerified);
  const policy = payguardPolicyEngine.evaluatePaymentRequest({ agent, amount: input.amount, requestedRiskLevel: input.riskLevel, isWalletVerified: Boolean(wallet) });
  const timestamp = now();
  const request: PaymentRequest = {
    id: crypto.randomUUID(),
    projectId,
    agentId: agent.id,
    recipientName: input.recipientName,
    recipientWallet: input.recipientWallet,
    amount: input.amount,
    token: input.token,
    reason: input.reason,
    riskLevel: policy.riskLevel,
    status: policy.status,
    policyApplied: policy.policyApplied,
    auditHash: actionHash({ projectId, agentId: agent.id, input, policy, timestamp }),
    escrowId: null,
    txHash: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  store.requests.unshift(request);
  store.auditLogs.unshift(
    createAuditLog({ projectId, paymentRequestId: request.id, agentId: agent.id, action: "POLICY_EVALUATED", previousStatus: request.status, newStatus: request.status, actorType: "system", actorId: systemActorId, metadata: { policyApplied: policy.policyApplied, reasons: policy.reasons } }),
  );
  if (request.status === "blocked") {
    store.auditLogs.unshift(createAuditLog({ projectId, paymentRequestId: request.id, agentId: agent.id, action: "PAYMENT_BLOCKED", previousStatus: request.status, newStatus: "blocked", actorType: "system", actorId: systemActorId, metadata: { reasons: policy.reasons } }));
  }
  store.auditLogs.unshift(createAuditLog({ projectId, paymentRequestId: request.id, agentId: agent.id, action: "PAYMENT_REQUEST_CREATED", newStatus: request.status, actorType: "agent", actorId: agent.id, metadata: { amount: request.amount, token: request.token } }));
  return request;
}

function mutateMockRequest(projectId: string, paymentRequestId: string, mutator: (request: PaymentRequest, store: PayGuardSummary) => PaymentRequest) {
  const store = ensureMockStore(projectId);
  const request = store.requests.find((item) => item.id === paymentRequestId);
  if (!request) throw new Error("La solicitud de pago no existe.");
  return mutator(request, store);
}

function withPayGuardFallback<T>(operation: () => Promise<T>, fallback: () => T) {
  return operation().catch((error) => {
    if (isPayGuardTableMissing(error)) return fallback();
    throw error;
  });
}

export const payguardService = {
  summary: async (projectId: string) => withPayGuardFallback(() => readSummaryFromDb(projectId), () => ensureMockStore(projectId)),

  createPaymentRequest: async (projectId: string, payload: CreatePaymentRequestInput) =>
    withPayGuardFallback(() => createRequestDb(projectId, payload), () => mockCreateRequest(projectId, payload)),

  approve: async (projectId: string, paymentRequestId: string, actorId: string) =>
    withPayGuardFallback(() => approveDb(projectId, paymentRequestId, actorId), () =>
      mutateMockRequest(projectId, paymentRequestId, (request, store) => {
        assertCanApprove(request);
        if (store.approvals.some((approval) => approval.paymentRequestId === paymentRequestId && approval.actorId === actorId && approval.status === "approved")) {
          throw new Error("Este humano ya aprobo la solicitud.");
        }
        const approvalCount = store.approvals.filter((approval) => approval.paymentRequestId === paymentRequestId && approval.status === "approved").length + 1;
        const requiredApprovals = request.status === "requires_multi_approval" ? 2 : 1;
        const previousStatus = request.status;
        request.status = approvalCount >= requiredApprovals ? "approved" : "requires_multi_approval";
        request.updatedAt = now();
        store.approvals.unshift({ id: crypto.randomUUID(), projectId, paymentRequestId, actorId, status: "approved", createdAt: now() });
        store.auditLogs.unshift(createAuditLog({ projectId, paymentRequestId, agentId: request.agentId, action: "HUMAN_APPROVED", previousStatus, newStatus: request.status, actorType: "human", actorId, metadata: { approvalCount, requiredApprovals } }));
        return request;
      }),
    ),

  reject: async (projectId: string, paymentRequestId: string, actorId: string) =>
    withPayGuardFallback(() => rejectDb(projectId, paymentRequestId, actorId), () =>
      mutateMockRequest(projectId, paymentRequestId, (request, store) => {
        assertCanRejectOrBlock(request, "reject");
        const previousStatus = request.status;
        request.status = "rejected";
        request.updatedAt = now();
        store.approvals.unshift({ id: crypto.randomUUID(), projectId, paymentRequestId, actorId, status: "rejected", createdAt: now() });
        store.auditLogs.unshift(createAuditLog({ projectId, paymentRequestId, agentId: request.agentId, action: "HUMAN_REJECTED", previousStatus, newStatus: "rejected", actorType: "human", actorId, metadata: {} }));
        return request;
      }),
    ),

  block: async (projectId: string, paymentRequestId: string, actorId: string) =>
    withPayGuardFallback(() => blockDb(projectId, paymentRequestId, actorId), () =>
      mutateMockRequest(projectId, paymentRequestId, (request, store) => {
        assertCanRejectOrBlock(request, "block");
        const previousStatus = request.status;
        request.status = "blocked";
        request.updatedAt = now();
        store.auditLogs.unshift(createAuditLog({ projectId, paymentRequestId, agentId: request.agentId, action: "PAYMENT_BLOCKED", previousStatus, newStatus: "blocked", actorType: "human", actorId, metadata: { reason: "Bloqueado manualmente por un humano." } }));
        return request;
      }),
    ),

  createEscrow: async (projectId: string, paymentRequestId: string, actorId: string) =>
    withPayGuardFallback(() => createEscrowDb(projectId, paymentRequestId, actorId), () =>
      mutateMockRequest(projectId, paymentRequestId, (request, store) => {
        if (request.status !== "approved") throw new Error("Solo una solicitud aprobada puede crear escrow.");
        if (request.escrowId) throw new Error("La solicitud ya tiene escrow.");
        const previousStatus = request.status;
        const result = trustlessWorkAdapter.integrationStatus();
        const fragment = actionHash({ paymentRequestId, at: Date.now() }).slice(0, 24);
        request.status = "escrow_created";
        request.escrowId = `mock_escrow_${fragment}`;
        request.txHash = `mock_tx_${fragment}`;
        request.updatedAt = now();
        store.auditLogs.unshift(createAuditLog({ projectId, paymentRequestId, agentId: request.agentId, action: "ESCROW_CREATED", previousStatus, newStatus: "escrow_created", actorType: "system", actorId: systemActorId, metadata: { triggeredBy: actorId, trustlessWork: result } }));
        return request;
      }),
    ),

  fundEscrow: async (projectId: string, paymentRequestId: string, actorId: string) =>
    withPayGuardFallback(() => fundEscrowDb(projectId, paymentRequestId, actorId), () =>
      mutateMockRequest(projectId, paymentRequestId, (request, store) => {
        if (!request.escrowId) throw new Error("No se puede fondear sin escrow.");
        if (request.status !== "escrow_created") throw new Error("Solo un escrow creado puede fondearse.");
        const previousStatus = request.status;
        request.status = "funded";
        request.txHash = `mock_tx_${actionHash({ paymentRequestId, action: "fund", at: Date.now() }).slice(0, 24)}`;
        request.updatedAt = now();
        store.auditLogs.unshift(createAuditLog({ projectId, paymentRequestId, agentId: request.agentId, action: "ESCROW_FUNDED", previousStatus, newStatus: "funded", actorType: "system", actorId: systemActorId, metadata: { triggeredBy: actorId, escrowId: request.escrowId } }));
        return request;
      }),
    ),

  releaseEscrow: async (projectId: string, paymentRequestId: string, actorId: string) =>
    withPayGuardFallback(() => releaseEscrowDb(projectId, paymentRequestId, actorId), () =>
      mutateMockRequest(projectId, paymentRequestId, (request, store) => {
        if (request.status === "released") throw new Error("No se permite doble release.");
        if (!request.escrowId) throw new Error("No se puede liberar sin escrow.");
        if (request.status !== "funded") throw new Error("Solo un escrow fondeado puede liberarse.");
        const previousStatus = request.status;
        request.status = "released";
        request.txHash = `mock_tx_${actionHash({ paymentRequestId, action: "release", at: Date.now() }).slice(0, 24)}`;
        request.updatedAt = now();
        store.auditLogs.unshift(createAuditLog({ projectId, paymentRequestId, agentId: request.agentId, action: "PAYMENT_RELEASED", previousStatus, newStatus: "released", actorType: "system", actorId: systemActorId, metadata: { triggeredBy: actorId, escrowId: request.escrowId } }));
        return request;
      }),
    ),

  getEscrowStatus: async (escrowId: string) => trustlessWorkAdapter.getEscrowStatus(escrowId),
};
