import express from "express";
import helmet from "helmet";
import { corsMiddleware } from "./config/cors.js";
import { clerkRequestMiddleware } from "./config/clerk.js";
import { apiRoutes } from "./routes/index.js";
import { publicGatewayRoutes } from "./routes/publicGateway.routes.js";
import { publicSdkRoutes } from "./routes/publicSdk.routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";

export const app = express();

app.use(helmet());
app.use(corsMiddleware);
app.use(express.json({ limit: "1mb" }));
app.use("/sdk/v1", publicSdkRoutes);
app.use("/gateway/v1", publicGatewayRoutes);
app.use(clerkRequestMiddleware);
app.use("/api", apiRoutes);
app.use(errorHandler);
