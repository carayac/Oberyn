export type UserRole = "owner" | "admin" | "developer" | "auditor" | "viewer";

export type OberynUser = {
  id: string;
  clerkUserId: string;
  email: string;
  name?: string;
  role: UserRole;
};

