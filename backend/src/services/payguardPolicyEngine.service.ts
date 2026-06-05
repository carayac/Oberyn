import type { PaymentAgent, PaymentRequestStatus, PaymentRiskLevel } from "../types/payguard.types.js";

type PolicyInput = {
  agent: PaymentAgent;
  amount: number;
  requestedRiskLevel?: PaymentRiskLevel;
  isWalletVerified: boolean;
};

export type PayGuardPolicyResult = {
  status: Extract<PaymentRequestStatus, "pending_approval" | "requires_multi_approval" | "blocked">;
  riskLevel: PaymentRiskLevel;
  policyApplied: string[];
  reasons: string[];
};

const riskRank: Record<PaymentRiskLevel, number> = { low: 1, medium: 2, high: 3 };

function maxRisk(...risks: PaymentRiskLevel[]) {
  return risks.reduce((current, next) => (riskRank[next] > riskRank[current] ? next : current), "low" as PaymentRiskLevel);
}

function amountRisk(amount: number): PaymentRiskLevel {
  if (amount > 1000) return "high";
  if (amount > 100) return "medium";
  return "low";
}

export const payguardPolicyEngine = {
  evaluatePaymentRequest: ({ agent, amount, requestedRiskLevel = "low", isWalletVerified }: PolicyInput): PayGuardPolicyResult => {
    const policyApplied: string[] = [];
    const reasons: string[] = [];
    const computedRisk = maxRisk(requestedRiskLevel, amountRisk(amount), agent.riskLevel);

    if (agent.status === "blocked") {
      policyApplied.push("agent_blocked");
      reasons.push("El agente esta bloqueado y no puede iniciar pagos.");
      return { status: "blocked", riskLevel: computedRisk, policyApplied, reasons };
    }

    if (agent.status === "paused") {
      policyApplied.push("agent_paused");
      reasons.push("El agente esta pausado hasta que un humano lo reactive.");
      return { status: "blocked", riskLevel: computedRisk, policyApplied, reasons };
    }

    if (!agent.canCreatePaymentRequest) {
      policyApplied.push("agent_cannot_create_payment_request");
      reasons.push("El agente no tiene permiso para crear solicitudes de pago.");
      return { status: "blocked", riskLevel: computedRisk, policyApplied, reasons };
    }

    if (!isWalletVerified) {
      policyApplied.push("wallet_not_verified");
      reasons.push("La wallet destino no esta en la lista de wallets verificadas.");
      return { status: "blocked", riskLevel: computedRisk, policyApplied, reasons };
    }

    if (amount <= 0) {
      policyApplied.push("invalid_amount");
      reasons.push("El monto debe ser mayor que cero.");
      return { status: "blocked", riskLevel: computedRisk, policyApplied, reasons };
    }

    if (amount > agent.maxAmount) {
      policyApplied.push("amount_exceeds_agent_limit");
      reasons.push("El monto supera el limite permitido para este agente.");
      return { status: "blocked", riskLevel: "high", policyApplied, reasons };
    }

    if (amount > 1000) {
      policyApplied.push("amount_requires_multi_approval");
      reasons.push("Pagos mayores a 1000 USDC requieren aprobacion multiple.");
      return { status: "requires_multi_approval", riskLevel: "high", policyApplied, reasons };
    }

    if (amount > 100) {
      policyApplied.push("amount_requires_human_approval");
      reasons.push("Pagos mayores a 100 USDC requieren aprobacion humana.");
      return { status: "pending_approval", riskLevel: maxRisk(computedRisk, "medium"), policyApplied, reasons };
    }

    policyApplied.push("amount_requires_standard_approval");
    reasons.push("Todo pago creado por un agente requiere aprobacion humana antes de tocar fondos.");
    return { status: "pending_approval", riskLevel: computedRisk, policyApplied, reasons };
  },
};
