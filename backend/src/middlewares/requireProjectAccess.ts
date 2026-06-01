import type { NextFunction, Request, Response } from "express";
import { projectsService } from "../services/projects.service.js";

export async function requireProjectAccess(req: Request, res: Response, next: NextFunction) {
  const projectId = req.params.projectId;
  if (!projectId) {
    return res.status(400).json({ success: false, error: { message: "projectId route parameter is required" } });
  }

  try {
    const project = await projectsService.getById(projectId, res.locals.organizationId);
    if (!project) {
      return res.status(403).json({ success: false, error: { message: "No tienes acceso a este proyecto." } });
    }

    res.locals.projectId = project.id;
    res.locals.project = project;
    return next();
  } catch (error) {
    return next(error);
  }
}
