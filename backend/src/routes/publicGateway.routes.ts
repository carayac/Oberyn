import { Router } from "express";
import { gatewayController } from "../controllers/gateway.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isUuid } from "../utils/ids.js";

export const publicGatewayRoutes = Router();

publicGatewayRoutes.all("/:projectId/*", (req, res, next) => {
  if (isUuid(req.params.projectId)) return next();

  return res.status(400).json({
    success: false,
    error: {
      message: "La URL del Gateway debe incluir el UUID real del proyecto. Usa /api/gateway/:projectId/v1/chat/completions, no /api/gateway/v1 ni /api/gateway/PROJECT_ID.",
    },
  });
}, asyncHandler(gatewayController.proxy));
