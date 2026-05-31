import type { AuditEvent } from "../types/audit";
export const mockAuditEvents: AuditEvent[] = [{ id: "event_1", projectId: "project_1", eventType: "decision", actionName: "tool_call", decision: "approved", riskLevel: "medium", eventHash: "hash_placeholder", createdAt: new Date().toISOString() }];

