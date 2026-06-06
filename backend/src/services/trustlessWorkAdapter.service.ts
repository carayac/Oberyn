import { Keypair, Networks, TransactionBuilder } from "@stellar/stellar-sdk";
import { env } from "../config/env.js";
import type { PaymentRequest, TrustlessWorkIntegrationStatus } from "../types/payguard.types.js";

type TrustlessWorkOperationResult = {
  escrowId?: string;
  txHash?: string;
  status: string;
  raw: Record<string, unknown>;
};

type UnsignedXdrResponse = {
  status?: string;
  unsignedTransaction?: string;
  unsignedXdr?: string;
  xdr?: string;
};

type SendTransactionResponse = {
  status?: string;
  message?: string;
  contractId?: string;
  txHash?: string;
  hash?: string;
  transactionHash?: string;
  escrow?: {
    contractId?: string;
  };
};

const docsUrl = "https://docs.trustlesswork.com/trustless-work/api-rest/introduction";

function trustlessErrorMessage(detail: string) {
  if (!detail) return "";

  try {
    const parsed = JSON.parse(detail) as {
      error?: string;
      message?: string | string[];
      details?: unknown;
    };
    const parts = [
      Array.isArray(parsed.message) ? parsed.message.join("; ") : parsed.message,
      parsed.error,
      parsed.details ? JSON.stringify(parsed.details) : undefined,
    ].filter(Boolean);
    return parts.join(" | ") || detail;
  } catch {
    return detail;
  }
}

function isConfiguredForLive() {
  return Boolean(
    env.TRUSTLESS_WORK_API_KEY &&
      env.TRUSTLESS_WORK_BASE_URL &&
      env.TRUSTLESS_WORK_SIGNER_PUBLIC_KEY &&
      env.TRUSTLESS_WORK_SIGNER_SECRET_KEY &&
      env.TRUSTLESS_WORK_PLATFORM_ADDRESS &&
      env.TRUSTLESS_WORK_RELEASE_SIGNER_PUBLIC_KEY &&
      env.TRUSTLESS_WORK_DISPUTE_RESOLVER_PUBLIC_KEY &&
      env.TRUSTLESS_WORK_USDC_ISSUER,
  );
}

function shouldUseMockMode() {
  return env.TRUSTLESS_WORK_MODE.toLowerCase() !== "live" || !isConfiguredForLive();
}

function assertLiveMode(operation: string) {
  if (!shouldUseMockMode()) return;
  throw new Error(`Trustless Work no esta en modo live para ${operation}. Configura TRUSTLESS_WORK_MODE=live y las credenciales/roles Stellar requeridos antes de ejecutar operaciones reales.`);
}

function networkPassphrase() {
  return env.TRUSTLESS_WORK_NETWORK === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;
}

function headers() {
  return {
    "Content-Type": "application/json",
    "x-api-key": env.TRUSTLESS_WORK_API_KEY,
    Authorization: `Bearer ${env.TRUSTLESS_WORK_API_KEY}`,
  };
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${env.TRUSTLESS_WORK_BASE_URL}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const message = trustlessErrorMessage(detail);

    throw new Error(`Trustless Work rechazó la operación ${path}: ${response.status}. ${message}`.trim());
  }

  return (await response.json()) as T;
}

async function getJson<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${env.TRUSTLESS_WORK_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, { headers: headers() });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const message = trustlessErrorMessage(detail);

    throw new Error(`Trustless Work rechazó la consulta ${path}: ${response.status}. ${message}`.trim());
  }

  return (await response.json()) as T;
}

function extractUnsignedXdr(response: UnsignedXdrResponse) {
  return response.unsignedTransaction ?? response.unsignedXdr ?? response.xdr ?? "";
}

function signUnsignedXdr(unsignedXdr: string) {
  const transaction = TransactionBuilder.fromXDR(unsignedXdr, networkPassphrase()) as {
    sign: (keypair: Keypair) => void;
    toXDR: () => string;
  };
  transaction.sign(Keypair.fromSecret(env.TRUSTLESS_WORK_SIGNER_SECRET_KEY));
  return transaction.toXDR();
}

async function executeUnsignedEndpoint(path: string, body: unknown) {
  const unsignedResponse = await postJson<UnsignedXdrResponse>(path, body);
  const unsignedXdr = extractUnsignedXdr(unsignedResponse);
  if (!unsignedXdr) throw new Error("Trustless Work no devolvio un XDR para firmar.");

  const signedXdr = signUnsignedXdr(unsignedXdr);
  const submitted = await postJson<SendTransactionResponse>("/helper/send-transaction", { signedXdr });
  return { unsignedResponse, submitted };
}

function txHashFrom(response: SendTransactionResponse) {
  return response.txHash ?? response.hash ?? response.transactionHash ?? undefined;
}

function escrowIdFrom(response: SendTransactionResponse) {
  return response.contractId ?? response.escrow?.contractId ?? undefined;
}

function deployPayload(paymentRequest: PaymentRequest) {
  const approver = env.TRUSTLESS_WORK_APPROVER_PUBLIC_KEY || env.TRUSTLESS_WORK_SIGNER_PUBLIC_KEY;
  const amount = Number(paymentRequest.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("El monto del escrow debe ser un número mayor a 0.");

  return {
    signer: env.TRUSTLESS_WORK_SIGNER_PUBLIC_KEY,
    engagementId: paymentRequest.id,
    title: `Oberyn PayGuard ${paymentRequest.id.slice(0, 8)}`,
    description: paymentRequest.reason,
    roles: {
      approver,
      serviceProvider: env.TRUSTLESS_WORK_SIGNER_PUBLIC_KEY,
      platformAddress: env.TRUSTLESS_WORK_PLATFORM_ADDRESS,
      releaseSigner: env.TRUSTLESS_WORK_RELEASE_SIGNER_PUBLIC_KEY,
      disputeResolver: env.TRUSTLESS_WORK_DISPUTE_RESOLVER_PUBLIC_KEY,
      receiver: paymentRequest.recipientWallet,
    },
    amount,
    platformFee: env.TRUSTLESS_WORK_PLATFORM_FEE,
    milestones: [{ description: paymentRequest.reason.slice(0, 160) }],
    trustline: {
      symbol: paymentRequest.token,
      address: env.TRUSTLESS_WORK_USDC_ISSUER,
    },
  };
}

export const trustlessWorkAdapter = {
  integrationStatus: (): TrustlessWorkIntegrationStatus => {
    const configured = isConfiguredForLive();
    const isMockMode = shouldUseMockMode();
    return {
      mode: isMockMode ? "mock" : "live",
      isMockMode,
      configured,
      canSubmitTransactions: !isMockMode,
      baseUrl: env.TRUSTLESS_WORK_BASE_URL,
      network: env.TRUSTLESS_WORK_NETWORK,
      docsUrl,
      message: isMockMode
        ? "Trustless Work Mock Mode: faltan credenciales, roles Stellar o TRUSTLESS_WORK_MODE=live."
        : "Trustless Work live mode: las operaciones se firman desde el backend despues de aprobacion humana.",
    };
  },

  createEscrowFromPaymentRequest: async (paymentRequest: PaymentRequest): Promise<TrustlessWorkOperationResult> => {
    assertLiveMode("create_escrow");

    const { submitted } = await executeUnsignedEndpoint("/deployer/single-release", deployPayload(paymentRequest));
    const escrowId = escrowIdFrom(submitted);
    if (!escrowId) throw new Error("Trustless Work no devolvio contractId despues de crear el escrow.");

    return { escrowId, txHash: txHashFrom(submitted), status: submitted.status ?? "SUCCESS", raw: submitted as Record<string, unknown> };
  },

  fundEscrow: async (paymentRequest: PaymentRequest): Promise<TrustlessWorkOperationResult> => {
    assertLiveMode("fund_escrow");
    if (!paymentRequest.escrowId) throw new Error("No existe escrow para fondear.");
    const amount = Number(paymentRequest.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("El monto para fondear debe ser un número mayor a 0.");

    const { submitted } = await executeUnsignedEndpoint("/escrow/single-release/fund-escrow", {
      contractId: paymentRequest.escrowId,
      signer: env.TRUSTLESS_WORK_SIGNER_PUBLIC_KEY,
      amount,
    });

    return { escrowId: paymentRequest.escrowId, txHash: txHashFrom(submitted), status: submitted.status ?? "SUCCESS", raw: submitted as Record<string, unknown> };
  },

  completeMilestone: async (paymentRequest: PaymentRequest): Promise<TrustlessWorkOperationResult> => {
    assertLiveMode("complete_milestone");
    if (!paymentRequest.escrowId) throw new Error("No existe escrow para completar.");

    let submitted: SendTransactionResponse;
    try {
      ({ submitted } = await executeUnsignedEndpoint("/escrow/single-release/change-milestone-status", {
        contractId: paymentRequest.escrowId,
        milestoneIndex: "0",
        newEvidence: `Oberyn PayGuard aprobó y fondeó la solicitud ${paymentRequest.id}. Motivo: ${paymentRequest.reason}`.slice(0, 280),
        newStatus: "Completed",
        serviceProvider: env.TRUSTLESS_WORK_SIGNER_PUBLIC_KEY,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.toLowerCase().includes("only the service provider")) {
        throw new Error("Este escrow fue creado con un serviceProvider que Oberyn no puede firmar. Crea una solicitud nueva para generar un escrow con los roles corregidos.");
      }
      throw error;
    }

    return { escrowId: paymentRequest.escrowId, txHash: txHashFrom(submitted), status: submitted.status ?? "SUCCESS", raw: submitted as Record<string, unknown> };
  },

  approveMilestone: async (paymentRequest: PaymentRequest): Promise<TrustlessWorkOperationResult> => {
    assertLiveMode("approve_milestone");
    if (!paymentRequest.escrowId) throw new Error("No existe escrow para aprobar.");

    const { submitted } = await executeUnsignedEndpoint("/escrow/single-release/approve-milestone", {
      contractId: paymentRequest.escrowId,
      milestoneIndex: "0",
      approver: env.TRUSTLESS_WORK_APPROVER_PUBLIC_KEY || env.TRUSTLESS_WORK_SIGNER_PUBLIC_KEY,
    });

    return { escrowId: paymentRequest.escrowId, txHash: txHashFrom(submitted), status: submitted.status ?? "SUCCESS", raw: submitted as Record<string, unknown> };
  },

  releaseEscrow: async (paymentRequest: PaymentRequest): Promise<TrustlessWorkOperationResult> => {
    assertLiveMode("release_escrow");
    if (!paymentRequest.escrowId) throw new Error("No existe escrow para liberar.");

    const completed = await trustlessWorkAdapter.completeMilestone(paymentRequest);
    const approved = await trustlessWorkAdapter.approveMilestone(paymentRequest);

    const { submitted } = await executeUnsignedEndpoint("/escrow/single-release/release-funds", {
      contractId: paymentRequest.escrowId,
      releaseSigner: env.TRUSTLESS_WORK_RELEASE_SIGNER_PUBLIC_KEY,
    });

    return {
      escrowId: paymentRequest.escrowId,
      txHash: txHashFrom(submitted),
      status: submitted.status ?? "SUCCESS",
      raw: {
        milestoneCompleted: completed.raw,
        milestoneApproved: approved.raw,
        released: submitted,
      },
    };
  },

  getEscrowStatus: async (escrowId: string) => {
    assertLiveMode("get_escrow_status");

    return getJson<Record<string, unknown>>("/escrow/single-release/get-escrow", {
      contractId: escrowId,
      signer: env.TRUSTLESS_WORK_SIGNER_PUBLIC_KEY,
    });
  },
};
