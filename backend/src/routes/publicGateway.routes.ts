import { Router } from "express";
import { gatewayController } from "../controllers/gateway.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const publicGatewayRoutes = Router();

publicGatewayRoutes.all("/:projectId/*", asyncHandler(gatewayController.proxy));
