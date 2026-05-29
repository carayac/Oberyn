import type { Request, Response } from "express";
import { organizationsService } from "../services/organizations.service.js";
import { created, ok } from "../utils/apiResponse.js";
export const organizationsController = {
  list: async (_req: Request, res: Response) => res.json(ok(await organizationsService.list())),
  create: async (req: Request, res: Response) => res.status(201).json(created(await organizationsService.create(req.body))),
  getById: async (req: Request, res: Response) => res.json(ok(await organizationsService.getById(req.params.organizationId))),
};

