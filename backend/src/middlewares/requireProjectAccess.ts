import type { NextFunction, Request, Response } from "express";

export function requireProjectAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.params.projectId) {
    return res.status(400).json({ success: false, error: { message: "projectId route parameter is required" } });
  }
  res.locals.projectId = req.params.projectId;
  return next();
}

