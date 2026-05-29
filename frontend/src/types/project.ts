import type { Status } from "../lib/constants/statuses";

export type Project = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  projectType: string;
  environment: string;
  connectionMode: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
};

