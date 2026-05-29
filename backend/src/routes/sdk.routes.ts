import { Router } from "express";
import { sdkController } from "../controllers/sdk.controller.js";
import { requireProjectAccess } from "../middlewares/requireProjectAccess.js";
import { asyncHandler } from "../utils/asyncHandler.js";
export const sdkRoutes = Router({ mergeParams: true });
sdkRoutes.use(requireProjectAccess);
sdkRoutes.get("/config", asyncHandler(sdkController.getConfig));
sdkRoutes.post("/test-event", asyncHandler(sdkController.testEvent));

