export type ConnectionMethod = "sdk" | "gateway" | "manual" | "detected";

export type Integration = {
  id: string;
  projectId: string;
  name: string;
  provider: string;
  serviceType: string;
  connectionMethod: ConnectionMethod;
  status: string;
  coverage: number;
  lastActivityAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

