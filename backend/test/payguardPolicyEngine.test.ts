import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { payguardPolicyEngine } from "../src/services/payguardPolicyEngine.service.js";
import type { PaymentAgent } from "../src/types/payguard.types.js";

function agent(patch: Partial<PaymentAgent> = {}): PaymentAgent {
  const timestamp = new Date().toISOString();
  return {
    id: "agent-test",
    projectId: "project-test",
    name: "Policy Test Agent",
    status: "active",
    riskLevel: "low",
    maxAmount: 1000,
    canCreatePaymentRequest: true,
    canApprovePayment: false,
    canExecutePayment: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...patch,
  };
}

describe("PayGuard policy engine", () => {
  it("blocks agents that cannot create payment requests", () => {
    const result = payguardPolicyEngine.evaluatePaymentRequest({
      agent: agent({ canCreatePaymentRequest: false }),
      amount: 10,
      requestedRiskLevel: "low",
      isWalletVerified: true,
    });

    assert.equal(result.status, "blocked");
    assert.ok(result.policyApplied.includes("agent_cannot_create_payment_request"));
  });

  it("blocks unverified destination wallets", () => {
    const result = payguardPolicyEngine.evaluatePaymentRequest({
      agent: agent(),
      amount: 10,
      requestedRiskLevel: "low",
      isWalletVerified: false,
    });

    assert.equal(result.status, "blocked");
    assert.ok(result.policyApplied.includes("wallet_not_verified"));
  });

  it("requires human approval for a valid standard payment", () => {
    const result = payguardPolicyEngine.evaluatePaymentRequest({
      agent: agent(),
      amount: 75,
      requestedRiskLevel: "low",
      isWalletVerified: true,
    });

    assert.equal(result.status, "pending_approval");
    assert.equal(result.riskLevel, "low");
  });

  it("requires multi approval for amounts above the multi approval threshold", () => {
    const result = payguardPolicyEngine.evaluatePaymentRequest({
      agent: agent({ maxAmount: 5000 }),
      amount: 1500,
      requestedRiskLevel: "medium",
      isWalletVerified: true,
    });

    assert.equal(result.status, "requires_multi_approval");
    assert.equal(result.riskLevel, "high");
  });

  it("blocks amounts above the agent limit", () => {
    const result = payguardPolicyEngine.evaluatePaymentRequest({
      agent: agent({ maxAmount: 50 }),
      amount: 75,
      requestedRiskLevel: "low",
      isWalletVerified: true,
    });

    assert.equal(result.status, "blocked");
    assert.ok(result.policyApplied.includes("amount_exceeds_agent_limit"));
  });
});
