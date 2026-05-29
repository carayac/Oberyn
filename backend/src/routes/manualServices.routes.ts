import { Router } from "express";
import { manualServicesController } from "../controllers/manualServices.controller.js";
import { requireProjectAccess } from "../middlewares/requireProjectAccess.js";
import { asyncHandler } from "../utils/asyncHandler.js";
export const manualServicesRoutes = Router({ mergeParams: true });
manualServicesRoutes.use(requireProjectAccess);
manualServicesRoutes.get("/", asyncHandler(manualServicesController.list));
manualServicesRoutes.post("/", asyncHandler(manualServicesController.create));
manualServicesRoutes.patch("/:serviceId", asyncHandler(manualServicesController.update));

