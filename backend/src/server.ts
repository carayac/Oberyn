import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

const server = app.listen(env.PORT, () => {
  logger.info(`Oberyn API listening on port ${env.PORT}`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    logger.error(`Port ${env.PORT} is already in use. Stop the existing backend process or start this one with a different PORT.`);
    process.exitCode = 1;
    return;
  }

  throw error;
});

