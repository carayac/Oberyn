import { createOberyn, OberynApprovalRequiredError, OberynBlockedError } from "oberyn";

const oberyn = createOberyn({
  apiKey: process.env.OBERYN_SDK_KEY,
  endpoint: process.env.OBERYN_SDK_ENDPOINT ?? "http://localhost:4000/api/sdk/events",
  service: { name: "real-project-demo", provider: "custom", type: "app" },
  environment: process.env.NODE_ENV ?? "development",
  approvalMode: "poll",
  approvalTimeoutMs: 120_000,
});

async function dangerousAction() {
  return { status: "sent", at: new Date().toISOString() };
}

try {
  const result = await oberyn.protect("send_sensitive_email", dangerousAction, {
    payload: { to: "cliente@example.com", subject: "Cuenta actualizada" },
    metadata: { channel: "email", template: "account_update" },
  });

  console.log("Action executed:", result);
} catch (error) {
  if (error instanceof OberynApprovalRequiredError) {
    console.error("Approval required:", error.decision.approvalId);
  } else if (error instanceof OberynBlockedError) {
    console.error("Blocked:", error.decision.reason);
  } else {
    console.error(error);
  }
} finally {
  await oberyn.stop();
}
