import crypto from "node:crypto";
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

function hashFragment(input: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 24);
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
    throw new Error(`Trustless Work rechazo la operacion ${path}: ${response.status} ${detail}`.trim());
  }

  return (await response.json()) as T;
}

async function getJson<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${env.TRUSTLESS_WORK_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, { headers: headers() });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Trustless Work rechazo la consulta ${path}: ${response.status} ${detail}`.trim());
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

function mockResult(paymentRequest: PaymentRequest, action: string): TrustlessWorkOperationResult {
  const fragment = hashFragment({ action, paymentRequestId: paymentRequest.id, at: Date.now() });
  return {
    escrowId: paymentRequest.escrowId ?? `mock_escrow_${fragment}`,
    txHash: `mock_tx_${fragment}`,
    status: "SUCCESS",
    raw: { mock: true, action, network: env.TRUSTLESS_WORK_NETWORK },
  };
}

function deployPayload(paymentRequest: PaymentRequest) {
  const approver = env.TRUSTLESS_WORK_APPROVER_PUBLIC_KEY || env.TRUSTLESS_WORK_SIGNER_PUBLIC_KEY;

  return {
    signer: env.TRUSTLESS_WORK_SIGNER_PUBLIC_KEY,
    engagementId: paymentRequest.id,
    title: `Oberyn PayGuard ${paymentRequest.id.slice(0, 8)}`,
    description: paymentRequest.reason,
    roles: {
      approver,
      serviceProvider: paymentRequest.recipientWallet,
      platformAddress: env.TRUSTLESS_WORK_PLATFORM_ADDRESS,
      releaseSigner: env.TRUSTLESS_WORK_RELEASE_SIGNER_PUBLIC_KEY,
      disputeResolver: env.TRUSTLESS_WORK_DISPUTE_RESOLVER_PUBLIC_KEY,
      receiver: paymentRequest.recipientWallet,
    },
    amount: paymentRequest.amount,
    platformFee: env.TRUSTLESS_WORK_PLATFORM_FEE,
    milestones: [{ description: paymentRequest.reason.slice(0, 160) || "PayGuard approved payment" }],
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
    if (shouldUseMockMode()) return mockResult(paymentRequest, "create_escrow");

    const { submitted } = await executeUnsignedEndpoint("/deployer/single-release", deployPayload(paymentRequest));
    const escrowId = escrowIdFrom(submitted);
    if (!escrowId) throw new Error("Trustless Work no devolvio contractId despues de crear el escrow.");

    return { escrowId, txHash: txHashFrom(submitted), status: submitted.status ?? "SUCCESS", raw: submitted as Record<string, unknown> };
  },

  fundEscrow: async (paymentRequest: PaymentRequest): Promise<TrustlessWorkOperationResult> => {
    if (shouldUseMockMode()) return mockResult(paymentRequest, "fund_escrow");
    if (!paymentRequest.escrowId) throw new Error("No existe escrow para fondear.");

    const { submitted } = await executeUnsignedEndpoint("/escrow/single-release/fund-escrow", {
      contractId: paymentRequest.escrowId,
      signer: env.TRUSTLESS_WORK_SIGNER_PUBLIC_KEY,
      amount: String(paymentRequest.amount),
    });

    return { escrowId: paymentRequest.escrowId, txHash: txHashFrom(submitted), status: submitted.status ?? "SUCCESS", raw: submitted as Record<string, unknown> };
  },

  releaseEscrow: async (paymentRequest: PaymentRequest): Promise<TrustlessWorkOperationResult> => {
    if (shouldUseMockMode()) return mockResult(paymentRequest, "release_escrow");
    if (!paymentRequest.escrowId) throw new Error("No existe escrow para liberar.");

    const { submitted } = await executeUnsignedEndpoint("/escrow/single-release/release-funds", {
      contractId: paymentRequest.escrowId,
      releaseSigner: env.TRUSTLESS_WORK_RELEASE_SIGNER_PUBLIC_KEY,
    });

    return { escrowId: paymentRequest.escrowId, txHash: txHashFrom(submitted), status: submitted.status ?? "SUCCESS", raw: submitted as Record<string, unknown> };
  },

  getEscrowStatus: async (escrowId: string) => {
    if (shouldUseMockMode()) {
      return {
        escrowId,
        status: "mock_active",
        network: env.TRUSTLESS_WORK_NETWORK,
        mock: true,
      };
    }

    return getJson<Record<string, unknown>>("/escrow/single-release/get-escrow", {
      contractId: escrowId,
      signer: env.TRUSTLESS_WORK_SIGNER_PUBLIC_KEY,
    });
  },
};
