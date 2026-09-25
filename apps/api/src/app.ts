import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { checkDatabaseConnection } from './db/prisma.js';
import { getSocketServer } from './websocket/socket-server.js';
import { AppError } from './utils/errors.js';
import { simulationRoutes } from './routes/simulation.routes.js';
import { roomRoutes } from './routes/rooms.routes.js';
import { deviceRoutes } from './routes/devices.routes.js';
import { savingsRoutes } from './routes/savings.routes.js';
import { dashboardRoutes } from './routes/dashboard.routes.js';
import { aiRoutes } from './routes/ai.routes.js';
import { energyRoutes } from './routes/energy.routes.js';
import { calibrationRoutes } from './routes/calibration.routes.js';
import { settingsRoutes } from './routes/settings.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: false,
  });

  // Plugins
  await app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  await app.register(sensible);

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.name,
        message: error.message,
        details: error.details,
      });
    }

    if (error.validation) {
      return reply.status(400).send({
        error: 'ValidationError',
        message: 'Invalid request payload',
        details: error.validation,
      });
    }

    return reply.status(500).send({
      error: 'InternalServerError',
      message: error.message || 'An unexpected error occurred',
    });
  });

  // Health check routes
  app.get('/', async () => {
    return {
      status: 'ok',
      service: 'intellisave-api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
  });

  app.get('/api/health', async () => {
    const dbConnected = await checkDatabaseConnection();
    const wsConnected = getSocketServer() !== null;

    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: {
        database: {
          connected: dbConnected,
          provider: 'postgresql',
          status: dbConnected ? 'connected' : 'offline (in-memory mode active)',
        },
        websocket: {
          ready: wsConnected,
          status: wsConnected ? 'operational' : 'initializing',
        },
      },
    };
  });

  // Register API domain routes
  await app.register(simulationRoutes, { prefix: '/api/simulation' });
  await app.register(roomRoutes, { prefix: '/api/rooms' });
  await app.register(deviceRoutes, { prefix: '/api/devices' });
  await app.register(savingsRoutes, { prefix: '/api/savings' });
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await app.register(aiRoutes, { prefix: '/api/ai' });
  await app.register(energyRoutes, { prefix: '/api/energy' });
  await app.register(calibrationRoutes, { prefix: '/api/calibration' });
  await app.register(settingsRoutes, { prefix: '/api/settings' });

  return app;
}
