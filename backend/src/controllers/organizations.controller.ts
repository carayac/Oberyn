import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { organizationsService } from "../services/organizations.service.js";
import { created, ok } from "../utils/apiResponse.js";

export const organizationsController = {
  list: async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    res.json(ok(await organizationsService.list(String(userId))));
  },
  create: async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    res.status(201).json(created(await organizationsService.create(req.body, String(userId))));
  },
  getById: async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    res.json(ok(await organizationsService.getById(req.params.organizationId, String(userId))));
  },
};
