import { Router } from "express";
import { flowsController } from "../controllers/flows.controller.js";
import { requireProjectAccess } from "../middlewares/requireProjectAccess.js";
import { asyncHandler } from "../utils/asyncHandler.js";
export const flowsRoutes = Router({ mergeParams: true });
flowsRoutes.use(requireProjectAccess);
flowsRoutes.get("/", asyncHandler(flowsController.list));
flowsRoutes.post("/", asyncHandler(flowsController.create));

