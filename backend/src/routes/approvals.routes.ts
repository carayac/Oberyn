import { Router } from "express";
import { approvalsController } from "../controllers/approvals.controller.js";
import { requireProjectAccess } from "../middlewares/requireProjectAccess.js";
import { asyncHandler } from "../utils/asyncHandler.js";
export const approvalsRoutes = Router({ mergeParams: true });
approvalsRoutes.use(requireProjectAccess);
approvalsRoutes.get("/", asyncHandler(approvalsController.list));
approvalsRoutes.post("/:approvalId/approve", asyncHandler(approvalsController.approve));
approvalsRoutes.post("/:approvalId/reject", asyncHandler(approvalsController.reject));
approvalsRoutes.post("/:approvalId/request-context", asyncHandler(approvalsController.requestContext));
approvalsRoutes.post("/:approvalId/create-rule", asyncHandler(approvalsController.createPermanentRule));

