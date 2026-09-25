import './config/env.js';
import { buildApp } from './app.js';
import { env } from './config/env.js';
import { initSocketServer } from './websocket/socket-server.js';
import { simulationEngine } from './modules/simulation/simulation-engine.js';
import { checkDatabaseConnection } from './db/prisma.js';
import { logger } from './utils/logger.js';

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.API_PORT, host: env.API_HOST });
    logger.info(`🚀 IntelliSave API running on http://localhost:${env.API_PORT}`);

    // Initialize Socket.IO
    initSocketServer(app.server);
    logger.info(`⚡ Realtime Gateway attached to HTTP server`);

    // Start Simulation Engine
    simulationEngine.start();

    // Check DB status non-blocking
    checkDatabaseConnection().then((connected) => {
      if (connected) {
        logger.info(`📦 PostgreSQL database connected successfully`);
      } else {
        logger.warn(`⚠️ PostgreSQL offline — running in high-performance in-memory simulation mode`);
      }
    });

    // Graceful shutdown handling
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
    for (const signal of signals) {
      process.on(signal, async () => {
        logger.info(`Shutting down due to ${signal}...`);
        simulationEngine.stop();
        await app.close();
        process.exit(0);
      });
    }
  } catch (err) {
    logger.error(`Fatal startup error:`, err);
    process.exit(1);
  }
}

start();
