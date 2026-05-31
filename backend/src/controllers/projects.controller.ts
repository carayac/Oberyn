import type { Request, Response } from "express";
import { projectsService } from "../services/projects.service.js";
import { created, ok } from "../utils/apiResponse.js";
export const projectsController = {
  list: async (req: Request, res: Response) => res.json(ok(await projectsService.list(res.locals.organizationId ?? req.header("x-organization-id")))),
  create: async (req: Request, res: Response) => res.status(201).json(created(await projectsService.create({ ...req.body, organizationId: res.locals.organizationId ?? req.header("x-organization-id") }))),
  getById: async (req: Request, res: Response) => res.json(ok(await projectsService.getById(req.params.projectId))),
  update: async (req: Request, res: Response) => res.json(ok(await projectsService.update(req.params.projectId, req.body))),
  remove: async (req: Request, res: Response) => res.json(ok(await projectsService.remove(req.params.projectId))),
};
