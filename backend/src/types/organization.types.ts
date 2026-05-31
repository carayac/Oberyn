export type Organization = {
  id: string;
  clerkOrgId: string;
  name: string;
  slug: string;
  organizationType?: string | null;
  description?: string | null;
  region: string;
  website?: string | null;
  ownerUserId?: string | null;
  status: string;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CreateOrganizationInput = {
  name?: string;
  slug?: string;
  organizationType?: string;
  description?: string;
  region?: string;
  website?: string;
};
