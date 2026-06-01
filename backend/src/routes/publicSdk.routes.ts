import { Router } from "express";
import { sdkController } from "../controllers/sdk.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const publicSdkRoutes = Router();

publicSdkRoutes.post("/evaluate", asyncHandler(sdkController.evaluate));
publicSdkRoutes.post("/audit", asyncHandler(sdkController.audit));
