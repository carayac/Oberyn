import type { Role } from "../constants/roles.js";

const rank: Record<Role, number> = { owner: 5, admin: 4, developer: 3, auditor: 2, viewer: 1 };

export const permissionsService = {
  hasMinimumRole(role: Role, required: Role) {
    return rank[role] >= rank[required];
  },
};

