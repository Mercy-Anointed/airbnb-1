import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import passport from 'passport';

import { env } from './config/env';
import { logger, morganStream } from './config/logger';
import { errorMiddleware } from './middleware/error.middleware';
import { globalLimiter } from './middleware/rate-limit.middleware';
import { observabilityMiddleware, getMetrics } from './middleware/observability.middleware';

import { prisma } from './config/database';
import { cache } from './config/redis';
import { connectMongoDB, disconnectMongoDB } from './config/mongodb';

import propertyRoutes from './modules/properties/property.routes';
import userRoutes from './modules/users/user.routes';
import bookingRoutes from './modules/bookings/booking.routes';
import reviewRoutes from './modules/reviews/review.routes';
import authRoutes from './modules/auth/auth.routes';
import chatRoutes from './modules/chat/chat.routes';
import propertyImageRoutes from './modules/properties/property-image.routes';

import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

import { wsManager } from './config/websocket';
import { startBookingHoldExpiryJob, stopBookingHoldExpiryJob } from './jobs/booking-hold-expiry.job';

const app = express();

/* =========================================================
   TRUST PROXY (Render sits behind a reverse proxy — required
   for express-rate-limit / X-Forwarded-For to work correctly)
========================================================= */

app.set('trust proxy', 1);

/* =========================================================
   CORS FIX (IMPORTANT PART)
========================================================= */

const rawOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? [];

const allowedOrigins = [
  ...rawOrigins,
  env.CLIENT_URL,
  env.APP_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]
  .filter(Boolean)
  .map(o => o.trim().replace(/\/$/, '')); // remove trailing slash

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // allow server-to-server or mobile apps
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.trim().replace(/\/$/, '');

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    logger.warn(`❌ Blocked CORS origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

/* =========================================================
   SECURITY MIDDLEWARE
========================================================= */

app.use(helmet());

app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

app.use(passport.initialize());
app.use(observabilityMiddleware);

/* =========================================================
   BODY PARSING
========================================================= */

app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    (req as Request & { rawBody?: string }).rawBody = buf.toString();
  },
}));

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* =========================================================
   LOGGING
========================================================= */

app.use(morgan(env.IS_PRODUCTION ? 'combined' : 'dev', {
  stream: morganStream,
}));

/* =========================================================
   HEALTH & METRICS
========================================================= */

app.get('/health', (_req: Request, res: Response) => {
  const wsStats = wsManager.getStats();

  res.json({
    status: 'ok',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    websocket: wsStats,
  });
});

app.get('/metrics', (_req: Request, res: Response) => {
  res.type('text/plain').send(getMetrics());
});

/* =========================================================
   RATE LIMIT
========================================================= */

app.use(globalLimiter);

/* =========================================================
   ROUTES
========================================================= */

app.use('/api/v1/properties', propertyRoutes);
app.use('/api/v1/properties/:propertyId/images', propertyImageRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/chat', chatRoutes);

/* =========================================================
   DOCS
========================================================= */

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar {display:none}',
  customSiteTitle: 'Airbnb API Docs',
}));

/* =========================================================
   404
========================================================= */

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(errorMiddleware);

/* =========================================================
   SERVER START
========================================================= */

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('Database connected');

    await connectMongoDB();

    try {
      await cache.connect();
    } catch {
      logger.warn('Redis unavailable — continuing without cache');
    }

    const server = app.listen(env.PORT, () => {
      logger.info(`API running on port ${env.PORT} [${env.NODE_ENV}]`);
    });

    wsManager.initialize(server);
    startBookingHoldExpiryJob();

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

/* =========================================================
   GRACEFUL SHUTDOWN
========================================================= */

const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down...`);

  await prisma.$disconnect();
  await disconnectMongoDB();
  await cache.disconnect();
  stopBookingHoldExpiryJob();

  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();

export default app;
