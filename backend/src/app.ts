import express from "express";
import helmet from "helmet";
import { corsMiddleware } from "./config/cors.js";
import { apiRoutes } from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";

export const app = express();

app.use(helmet());
app.use(corsMiddleware);
app.use(
  "/api/gateway",
  express.raw({
    type: ["application/octet-stream", "multipart/form-data", "image/*", "audio/*", "video/*", "application/pdf"],
    limit: "25mb",
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use("/api", apiRoutes);
app.use(errorHandler);

