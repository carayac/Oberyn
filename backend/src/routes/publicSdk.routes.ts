import { Router } from "express";
import { sdkController } from "../controllers/sdk.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const publicSdkRoutes = Router();

publicSdkRoutes.post("/events", asyncHandler(sdkController.ingestEvent));
publicSdkRoutes.post("/events/batch", asyncHandler(sdkController.ingestBatch));
publicSdkRoutes.post("/heartbeat", asyncHandler(sdkController.heartbeat));
publicSdkRoutes.post("/evaluate", asyncHandler(sdkController.evaluate));
publicSdkRoutes.post("/audit", asyncHandler(sdkController.audit));
publicSdkRoutes.post("/approval-status", asyncHandler(sdkController.approvalStatus));
publicSdkRoutes.post("/v1/evaluate", asyncHandler(sdkController.evaluate));
publicSdkRoutes.post("/v1/audit", asyncHandler(sdkController.audit));
publicSdkRoutes.post("/v1/approval-status", asyncHandler(sdkController.approvalStatus));
