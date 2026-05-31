import { Router } from "express";
import { evidenceController } from "../controllers/evidence.controller.js";
import { requireProjectAccess } from "../middlewares/requireProjectAccess.js";
import { asyncHandler } from "../utils/asyncHandler.js";
export const evidenceRoutes = Router({ mergeParams: true });
evidenceRoutes.use(requireProjectAccess);
evidenceRoutes.get("/:eventId", asyncHandler(evidenceController.getByEventId));
evidenceRoutes.post("/:eventId/share", asyncHandler(evidenceController.share));
evidenceRoutes.post("/:eventId/verify", asyncHandler(evidenceController.verify));

