import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import jwt from '@fastify/jwt';
import { config } from '@/utils/config';
import { logger } from '@/utils/logger';
import { databaseClient } from '@/services/database/client';
import { authRoutes } from '@/routes/auth';
import path from 'path';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
  trustProxy: true,
});

// Register plugins
async function registerPlugins() {
  // Security
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  await fastify.register(cors, {
    origin: config.app.isDevelopment ? true : ['http://localhost:3000'],
    credentials: true,
  });

  // JWT
  await fastify.register(jwt, {
    secret: config.auth.jwtSecret,
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.window,
    skipOnError: true,
  });

  // File upload
  await fastify.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
      files: 10,
    },
  });

  // Static files
  if (config.storage.type === 'local') {
    await fastify.register(staticFiles, {
      root: path.join(process.cwd(), config.storage.uploadDir),
      prefix: '/uploads/',
    });
  }
}

// Register routes
async function registerRoutes() {
  // Health check
  fastify.get('/health', async (request, reply) => {
    const dbStats = databaseClient.getPoolStats();
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStats,
      memory: process.memoryUsage(),
    };
  });

  // API routes
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  
  // TODO: Register other routes
  // await fastify.register(userRoutes, { prefix: '/api/users' });
  // await fastify.register(documentRoutes, { prefix: '/api/documents' });
  // await fastify.register(flashcardRoutes, { prefix: '/api/flashcards' });
  // await fastify.register(annotationRoutes, { prefix: '/api/annotations' });
  // await fastify.register(progressRoutes, { prefix: '/api/progress' });
  // await fastify.register(syncRoutes, { prefix: '/api/sync' });
  // await fastify.register(aiRoutes, { prefix: '/api/ai' });
}

// Error handling
fastify.setErrorHandler(async (error, request, reply) => {
  fastify.log.error(error);

  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: error.validation,
    });
  }

  if (error.statusCode) {
    return reply.status(error.statusCode).send({
      error: error.name || 'Error',
      message: error.message,
    });
  }

  return reply.status(500).send({
    error: 'Internal Server Error',
    message: config.app.isDevelopment ? error.message : 'Something went wrong',
  });
});

// Not found handler
fastify.setNotFoundHandler(async (request, reply) => {
  return reply.status(404).send({
    error: 'Not Found',
    message: `Route ${request.method} ${request.url} not found`,
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    await fastify.close();
    await databaseClient.close();
    logger.info('Server shut down successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
async function start() {
  try {
    // Test database connection
    const isDbConnected = await databaseClient.testConnection();
    if (!isDbConnected) {
      throw new Error('Database connection failed');
    }

    // Register plugins and routes
    await registerPlugins();
    await registerRoutes();

    // Start listening
    const address = await fastify.listen({
      port: config.app.port,
      host: '0.0.0.0',
    });

    logger.info(`Server listening on ${address}`);
    logger.info(`Environment: ${config.app.env}`);
    logger.info('Server started successfully');
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  start();
}

export { fastify };