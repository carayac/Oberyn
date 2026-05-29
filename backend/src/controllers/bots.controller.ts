import type { Request, Response } from "express";
import { botsService } from "../services/bots.service.js";
import { created, ok } from "../utils/apiResponse.js";
export const botsController = {
  list: async (req: Request, res: Response) => res.json(ok(await botsService.list(req.params.projectId))),
  create: async (req: Request, res: Response) => res.status(201).json(created(await botsService.create(req.params.projectId, req.body))),
};

