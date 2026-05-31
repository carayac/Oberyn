import type { Rule } from "../types/rule";
export const mockRules: Rule[] = [{ id: "rule_1", projectId: "project_1", name: "Revisión para acciones críticas", category: "approval", severity: "high", conditionType: "risk_level", actionResult: "require_approval", scope: "project", isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];

