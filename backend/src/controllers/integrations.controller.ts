import type { Request, Response } from "express";
import { integrationsService } from "../services/integrations.service.js";
import { created, ok } from "../utils/apiResponse.js";
export const integrationsController = {
  list: async (req: Request, res: Response) => res.json(ok(await integrationsService.list(req.params.projectId))),
  create: async (req: Request, res: Response) => res.status(201).json(created(await integrationsService.create(req.params.projectId, req.body))),
  getById: async (req: Request, res: Response) => res.json(ok(await integrationsService.getById(req.params.projectId, req.params.integrationId))),
  update: async (req: Request, res: Response) => res.json(ok(await integrationsService.update(req.params.projectId, req.params.integrationId, req.body))),
};

