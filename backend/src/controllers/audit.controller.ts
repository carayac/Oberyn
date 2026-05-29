import type { Request, Response } from "express";
import { auditService } from "../services/audit.service.js";
import { ok } from "../utils/apiResponse.js";
export const auditController = {
  list: async (req: Request, res: Response) => res.json(ok(await auditService.list(req.params.projectId))),
  getById: async (req: Request, res: Response) => res.json(ok(await auditService.getById(req.params.projectId, req.params.eventId))),
};

