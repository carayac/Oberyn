import type { Request, Response } from "express";
import { evidenceService } from "../services/evidence.service.js";
import { ok } from "../utils/apiResponse.js";
export const evidenceController = {
  getByEventId: async (req: Request, res: Response) => res.json(ok(await evidenceService.getByEventId(req.params.projectId, req.params.eventId))),
  share: async (req: Request, res: Response) => res.json(ok(await evidenceService.share(req.params.projectId, req.params.eventId))),
  verify: async (req: Request, res: Response) => res.json(ok(await evidenceService.verify(req.params.projectId, req.params.eventId))),
};

