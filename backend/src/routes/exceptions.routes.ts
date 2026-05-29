import { Router } from "express";
import { exceptionsController } from "../controllers/exceptions.controller.js";
import { requireProjectAccess } from "../middlewares/requireProjectAccess.js";
import { asyncHandler } from "../utils/asyncHandler.js";
export const exceptionsRoutes = Router({ mergeParams: true });
exceptionsRoutes.use(requireProjectAccess);
exceptionsRoutes.get("/", asyncHandler(exceptionsController.list));
exceptionsRoutes.post("/", asyncHandler(exceptionsController.create));
exceptionsRoutes.patch("/:exceptionId", asyncHandler(exceptionsController.update));

