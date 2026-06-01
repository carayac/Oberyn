import type { Request, Response } from "express";
import { rulesService } from "../services/rules.service.js";
import { created, ok } from "../utils/apiResponse.js";
export const rulesController = {
  list: async (req: Request, res: Response) => res.json(ok(await rulesService.list(req.params.projectId))),
  create: async (req: Request, res: Response) => res.status(201).json(created(await rulesService.create(req.params.projectId, req.body))),
  update: async (req: Request, res: Response) => res.json(ok(await rulesService.update(req.params.projectId, req.params.ruleId, req.body))),
  remove: async (req: Request, res: Response) => res.json(ok(await rulesService.remove(req.params.projectId, req.params.ruleId))),
};

