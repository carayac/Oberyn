import type { Request, Response } from "express";
import { exceptionsService } from "../services/exceptions.service.js";
import { created, ok } from "../utils/apiResponse.js";
export const exceptionsController = {
  list: async (req: Request, res: Response) => res.json(ok(await exceptionsService.list(req.params.projectId))),
  create: async (req: Request, res: Response) => res.status(201).json(created(await exceptionsService.create(req.params.projectId, req.body))),
  update: async (req: Request, res: Response) => res.json(ok(await exceptionsService.update(req.params.projectId, req.params.exceptionId, req.body))),
};

