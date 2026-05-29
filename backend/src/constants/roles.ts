export const roles = ["owner", "admin", "developer", "auditor", "viewer"] as const;
export type Role = (typeof roles)[number];

