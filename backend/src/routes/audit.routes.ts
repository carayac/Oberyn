import { Router } from "express";
import { auditController } from "../controllers/audit.controller.js";
import { requireProjectAccess } from "../middlewares/requireProjectAccess.js";
import { asyncHandler } from "../utils/asyncHandler.js";
export const auditRoutes = Router({ mergeParams: true });
auditRoutes.use(requireProjectAccess);
auditRoutes.get("/", asyncHandler(auditController.list));
auditRoutes.get("/:eventId", asyncHandler(auditController.getById));

