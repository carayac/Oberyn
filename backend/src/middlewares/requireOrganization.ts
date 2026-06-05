import type { NextFunction, Request, Response } from "express";
import { organizationsService } from "../services/organizations.service.js";

export async function requireOrganization(req: Request, res: Response, next: NextFunction) {
  const organizationId = req.header("x-organization-id");
  if (!organizationId) {
    return res.status(400).json({ success: false, error: { message: "x-organization-id header is required" } });
  }

  const userId = res.locals.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: { message: "Authentication required" } });
  }

  try {
    const organization = await organizationsService.getById(organizationId, userId);
    if (!organization) {
      return res.status(403).json({ success: false, error: { message: "No tienes acceso a esta organización." } });
    }

    res.locals.organizationId = organization.id;
    res.locals.organization = organization;
    return next();
  } catch (error) {
    return next(error);
  }
}
