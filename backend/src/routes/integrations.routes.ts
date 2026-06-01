import { Router } from "express";
import { integrationsController } from "../controllers/integrations.controller.js";
import { requireProjectAccess } from "../middlewares/requireProjectAccess.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const integrationsRoutes = Router({ mergeParams: true });
integrationsRoutes.use(requireProjectAccess);
integrationsRoutes.get("/", asyncHandler(integrationsController.list));
integrationsRoutes.post("/", asyncHandler(integrationsController.create));
integrationsRoutes.post("/detect", asyncHandler(integrationsController.detect));
integrationsRoutes.get("/:integrationId", asyncHandler(integrationsController.getById));
integrationsRoutes.patch("/:integrationId", asyncHandler(integrationsController.update));

