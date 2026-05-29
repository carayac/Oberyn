export type ClerkRole = "owner" | "admin" | "developer" | "auditor" | "viewer";

const roleRank: Record<ClerkRole, number> = { owner: 5, admin: 4, developer: 3, auditor: 2, viewer: 1 };

export function hasMinimumRole(role: ClerkRole, required: ClerkRole) {
  return roleRank[role] >= roleRank[required];
}

