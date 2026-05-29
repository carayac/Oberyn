export const statuses = ["active", "inactive", "pending", "protected", "detected", "manual", "no_activity", "requires_configuration", "blocked", "approved", "rejected", "pending_approval"] as const;
export type Status = (typeof statuses)[number];

