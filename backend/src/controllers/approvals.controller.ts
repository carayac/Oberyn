import type { Request, Response } from "express";
import { approvalsService } from "../services/approvals.service.js";
import { ok } from "../utils/apiResponse.js";
export const approvalsController = {
  list: async (req: Request, res: Response) => res.json(ok(await approvalsService.list(req.params.projectId))),
  approve: async (req: Request, res: Response) => res.json(ok(await approvalsService.approve(req.params.projectId, req.params.approvalId))),
  reject: async (req: Request, res: Response) => res.json(ok(await approvalsService.reject(req.params.projectId, req.params.approvalId))),
  requestContext: async (req: Request, res: Response) => res.json(ok(await approvalsService.requestContext(req.params.projectId, req.params.approvalId, req.body))),
  createPermanentRule: async (req: Request, res: Response) => res.json(ok(await approvalsService.createPermanentRule(req.params.projectId, req.params.approvalId))),
};

