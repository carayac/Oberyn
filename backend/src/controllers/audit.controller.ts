import type { Request, Response } from "express";
import { auditService } from "../services/audit.service.js";
import { evidenceService } from "../services/evidence.service.js";
import { ok } from "../utils/apiResponse.js";
export const auditController = {
  list: async (req: Request, res: Response) => res.json(ok(await auditService.list(req.params.projectId))),
  getById: async (req: Request, res: Response) => res.json(ok(await auditService.getById(req.params.projectId, req.params.eventId))),
  listAnchors: async (req: Request, res: Response) => res.json(ok(await evidenceService.listAnchorBatches(req.params.projectId))),
  runAnchorBatch: async (req: Request, res: Response) => {
    const limit = typeof req.body?.limit === "number" ? req.body.limit : undefined;
    return res.json(ok(await evidenceService.runAnchorBatch(req.params.projectId, limit)));
  },
};
