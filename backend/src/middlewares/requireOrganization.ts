import type { NextFunction, Request, Response } from "express";

export function requireOrganization(req: Request, res: Response, next: NextFunction) {
  const organizationId = req.header("x-organization-id");
  if (!organizationId) {
    return res.status(400).json({ success: false, error: { message: "x-organization-id header is required" } });
  }
  res.locals.organizationId = organizationId;
  return next();
}

