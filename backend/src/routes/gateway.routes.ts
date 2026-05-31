import { Router } from "express";
import { gatewayController } from "../controllers/gateway.controller.js";
import { requireProjectAccess } from "../middlewares/requireProjectAccess.js";
import { asyncHandler } from "../utils/asyncHandler.js";
export const gatewayRoutes = Router({ mergeParams: true });
gatewayRoutes.use(requireProjectAccess);
gatewayRoutes.get("/config", asyncHandler(gatewayController.getConfig));
gatewayRoutes.post("/test", asyncHandler(gatewayController.test));

