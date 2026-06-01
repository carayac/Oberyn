import { Router } from "express";
import { rulesController } from "../controllers/rules.controller.js";
import { requireProjectAccess } from "../middlewares/requireProjectAccess.js";
import { asyncHandler } from "../utils/asyncHandler.js";
export const rulesRoutes = Router({ mergeParams: true });
rulesRoutes.use(requireProjectAccess);
rulesRoutes.get("/", asyncHandler(rulesController.list));
rulesRoutes.post("/", asyncHandler(rulesController.create));
rulesRoutes.patch("/:ruleId", asyncHandler(rulesController.update));
rulesRoutes.delete("/:ruleId", asyncHandler(rulesController.remove));

