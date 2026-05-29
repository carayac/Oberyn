const now = () => new Date().toISOString();
export const evidenceService = {
  getByEventId: async (projectId: string, eventId: string) => ({ projectId, eventId, eventHash: "hash_placeholder", merkleRoot: null, stellarTxHash: null, createdAt: now(), sensitiveDataStoredOnChain: false }),
  share: async (projectId: string, eventId: string) => ({ projectId, eventId, shareUrl: "https://example.com/evidence/placeholder", expiresAt: now() }),
  verify: async (projectId: string, eventId: string) => ({ projectId, eventId, verified: true, checkedAt: now() }),
};

