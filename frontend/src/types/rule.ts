export type Rule = {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  category: string;
  severity: string;
  conditionType: string;
  actionResult: string;
  scope: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

