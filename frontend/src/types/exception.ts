export type Exception = {
  id: string;
  projectId: string;
  exceptionType: string;
  name: string;
  description?: string;
  environment: string;
  skipReview: boolean;
  skipApproval: boolean;
  auditLevel: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

