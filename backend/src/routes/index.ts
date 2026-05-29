import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireOrganization } from "../middlewares/requireOrganization.js";
import { approvalsRoutes } from "./approvals.routes.js";
import { auditRoutes } from "./audit.routes.js";
import { botsRoutes } from "./bots.routes.js";
import { evidenceRoutes } from "./evidence.routes.js";
import { exceptionsRoutes } from "./exceptions.routes.js";
import { flowsRoutes } from "./flows.routes.js";
import { gatewayRoutes } from "./gateway.routes.js";
import { healthRoutes } from "./health.routes.js";
import { integrationsRoutes } from "./integrations.routes.js";
import { manualServicesRoutes } from "./manualServices.routes.js";
import { organizationsRoutes } from "./organizations.routes.js";
import { projectsRoutes } from "./projects.routes.js";
import { rulesRoutes } from "./rules.routes.js";
import { sdkRoutes } from "./sdk.routes.js";

export const apiRoutes = Router();

apiRoutes.use("/health", healthRoutes);
apiRoutes.use(requireAuth);
apiRoutes.use("/organizations", organizationsRoutes);
apiRoutes.use(requireOrganization);
apiRoutes.use("/projects", projectsRoutes);
apiRoutes.use("/projects/:projectId/integrations", integrationsRoutes);
apiRoutes.use("/projects/:projectId/bots", botsRoutes);
apiRoutes.use("/projects/:projectId/flows", flowsRoutes);
apiRoutes.use("/projects/:projectId/rules", rulesRoutes);
apiRoutes.use("/projects/:projectId/approvals", approvalsRoutes);
apiRoutes.use("/projects/:projectId/audit", auditRoutes);
apiRoutes.use("/projects/:projectId/evidence", evidenceRoutes);
apiRoutes.use("/projects/:projectId/exceptions", exceptionsRoutes);
apiRoutes.use("/projects/:projectId/gateway", gatewayRoutes);
apiRoutes.use("/projects/:projectId/sdk", sdkRoutes);
apiRoutes.use("/projects/:projectId/manual-services", manualServicesRoutes);

