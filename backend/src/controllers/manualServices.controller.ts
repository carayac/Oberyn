import type { Request, Response } from "express";
import { manualServicesService } from "../services/manualServices.service.js";
import { created, ok } from "../utils/apiResponse.js";
export const manualServicesController = {
  list: async (req: Request, res: Response) => res.json(ok(await manualServicesService.list(req.params.projectId))),
  create: async (req: Request, res: Response) => res.status(201).json(created(await manualServicesService.create(req.params.projectId, req.body))),
  update: async (req: Request, res: Response) => res.json(ok(await manualServicesService.update(req.params.projectId, req.params.serviceId, req.body))),
};

