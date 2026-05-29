import type { ApprovalRequest } from "../types/approval";
export const mockApprovals: ApprovalRequest[] = [{ id: "approval_1", projectId: "project_1", actionName: "update_customer_record", riskLevel: "high", status: "pending_approval", reason: "Acción sensible", requestedAt: new Date().toISOString() }];

