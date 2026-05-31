import type { Request, Response } from "express";
import { flowsService } from "../services/flows.service.js";
import { created, ok } from "../utils/apiResponse.js";
export const flowsController = {
  list: async (req: Request, res: Response) => res.json(ok(await flowsService.list(req.params.projectId))),
  create: async (req: Request, res: Response) => res.status(201).json(created(await flowsService.create(req.params.projectId, req.body))),
};

