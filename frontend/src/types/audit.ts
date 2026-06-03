export type AuditEvent = {
  id: string;
  projectId: string;
  botId?: string | null;
  integrationId?: string | null;
  eventType: string;
  actionName: string;
  decision: string;
  riskLevel: string;
  eventHash?: string | null;
  merkleRoot?: string | null;
  stellarTxHash?: string | null;
  stellarNetwork?: string | null;
  anchoredAt?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

