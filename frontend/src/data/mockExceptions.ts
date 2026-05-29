import type { Exception } from "../types/exception";
export const mockExceptions: Exception[] = [{ id: "exception_1", projectId: "project_1", exceptionType: "service", name: "Servicio manual sin actividad", environment: "sandbox", skipReview: false, skipApproval: false, auditLevel: "standard", status: "manual", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];

