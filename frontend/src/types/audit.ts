export type AuditEvent = {
  id: string;
  projectId: string;
  eventType: string;
  actionName: string;
  decision: string;
  riskLevel: string;
  eventHash?: string | null;
  merkleRoot?: string | null;
  stellarTxHash?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

