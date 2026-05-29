import { Router } from "express";
import { projectsController } from "../controllers/projects.controller.js";
import { requireProjectAccess } from "../middlewares/requireProjectAccess.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const projectsRoutes = Router();
projectsRoutes.get("/", asyncHandler(projectsController.list));
projectsRoutes.post("/", asyncHandler(projectsController.create));
projectsRoutes.get("/:projectId", requireProjectAccess, asyncHandler(projectsController.getById));
projectsRoutes.patch("/:projectId", requireProjectAccess, asyncHandler(projectsController.update));
projectsRoutes.delete("/:projectId", requireProjectAccess, asyncHandler(projectsController.remove));

