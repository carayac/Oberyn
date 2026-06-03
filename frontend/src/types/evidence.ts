export type StellarAnchorBatch = {
  id: string;
  project_id: string;
  root_hash: string;
  event_count: number;
  status: string;
  network: string;
  tx_hash?: string | null;
  ledger?: number | null;
  explorer_url?: string | null;
  error_message?: string | null;
  confirmed_at?: string | null;
  created_at: string;
};

export type AnchorBatchResult = {
  status: string;
  projectId: string;
  batchId?: string;
  rootHash?: string;
  anchoredEvents: number;
  txHash?: string;
  ledger?: number;
  explorerUrl?: string;
  network?: string;
  sourcePublicKey?: string;
  message?: string;
};

export type EvidenceProof = {
  projectId: string;
  eventId: string;
  eventType: string;
  actionName: string;
  decision: string;
  riskLevel: string;
  metadata?: Record<string, unknown>;
  eventHash: string;
  merkleRoot?: string | null;
  stellarTxHash?: string | null;
  stellarNetwork?: string | null;
  ledger?: number | null;
  explorerUrl?: string | null;
  batchId?: string | null;
  batchStatus?: string | null;
  batchPosition?: number | null;
  anchoredAt?: string | null;
  createdAt: string;
  sensitiveDataStoredOnChain: boolean;
};

export type EvidenceVerification = {
  projectId: string;
  eventId: string;
  verified: boolean;
  checkedAt: string;
  eventHash: string;
  recalculatedEventHash: string;
  merkleRoot?: string | null;
  stellarTxHash?: string | null;
  stellarNetwork?: string | null;
  batchId?: string | null;
  batchPosition?: number | null;
  sensitiveDataStoredOnChain: boolean;
};
