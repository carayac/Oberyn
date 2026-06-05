import type { Request, Response } from "express";
import { organizationsService } from "../services/organizations.service.js";
import { created, ok } from "../utils/apiResponse.js";

function getRequestUserId(res: Response) {
  return String(res.locals.userId);
}

export const organizationsController = {
  list: async (req: Request, res: Response) => {
    res.json(ok(await organizationsService.list(getRequestUserId(res))));
  },
  create: async (req: Request, res: Response) => {
    res.status(201).json(created(await organizationsService.create(req.body, getRequestUserId(res))));
  },
  getById: async (req: Request, res: Response) => {
    res.json(ok(await organizationsService.getById(req.params.organizationId, getRequestUserId(res))));
  },
};
