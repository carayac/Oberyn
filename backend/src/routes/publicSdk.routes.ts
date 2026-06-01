import { Router } from "express";
import { sdkController } from "../controllers/sdk.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const publicSdkRoutes = Router();

publicSdkRoutes.post("/events", asyncHandler(sdkController.ingestEvent));
publicSdkRoutes.post("/events/batch", asyncHandler(sdkController.ingestBatch));
publicSdkRoutes.post("/heartbeat", asyncHandler(sdkController.heartbeat));
