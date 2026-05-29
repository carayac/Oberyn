import { Router } from "express";
import { organizationsController } from "../controllers/organizations.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const organizationsRoutes = Router();
organizationsRoutes.get("/", asyncHandler(organizationsController.list));
organizationsRoutes.post("/", asyncHandler(organizationsController.create));
organizationsRoutes.get("/:organizationId", asyncHandler(organizationsController.getById));

