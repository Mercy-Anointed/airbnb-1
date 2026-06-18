import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { cache } from './config/redis';
import { prisma } from './config/database';
import { errorMiddleware } from './middleware/error.middleware';
import propertyRoutes from './modules/properties/property.routes'
import userRoutes from './modules/users/user.routes'
import bookingRoutes from './modules/bookings/booking.routes'
import reviewRoutes from './modules/reviews/review.routes'
import cookieParser from 'cookie-parser';
import authRoutes from './modules/auth/auth.routes'
import { globalLimiter } from './middleware/rate-limit.middleware';
import { logger, morganStream } from './config/logger';
import { swaggerSpec } from './config/swagger';
import swaggerUi from 'swagger-ui-express';
import propertyImageRoutes from './modules/properties/property-image.routes';
import passport from 'passport';
import { wsManager } from './config/websocket';
import { connectMongoDB, disconnectMongoDB } from './config/mongodb';
import chatRoutes from './modules/chat/chat.routes';
import { startBookingHoldExpiryJob, stopBookingHoldExpiryJob } from './jobs/booking-hold-expiry.job';
import { getMetrics, observabilityMiddleware } from './middleware/observability.middleware';

const app = express();

const allowedOrigins = [
  ...(process.env.ALLOWED_ORIGINS?.split(',') ?? []),
  env.CLIENT_URL,
  env.APP_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    logger.warn(`Blocked CORS origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
// credentials: true allows cookies (refresh token) to be sent cross-origin
// origin: '*' + credentials: true is blocked by browsers — must list origins
// In production, ALLOWED_ORIGINS env var holds comma-separated allowed domains
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(passport.initialize());
app.use(observabilityMiddleware);

// ─── Request Parsing ──────────────────────────────────────────────────────────
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    (req as Request & { rawBody?: string }).rawBody = buf.toString('utf8');
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use(morgan(env.IS_PRODUCTION ? 'combined' : 'dev', {
  stream: morganStream
}));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', async (_req: Request, res: Response) => {
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

app.use(globalLimiter); // 

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/properties', propertyRoutes);
app.use('/api/v1/properties/:propertyId/images', propertyImageRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/chat', chatRoutes);

// ─── API Documentation ────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar {display:none}',
  customSiteTitle: 'Airbnb API Docs',
}));

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorMiddleware);


// ─── Server Startup ───────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('Database connected');

    await connectMongoDB();

    // try {
    //   await cache.connect();
    // } catch (redisError) {
    //   if (env.IS_PRODUCTION) {
    //     logger.error('Redis connection failed in production. Shutting down.');
    //     process.exit(1);
    //   }
    //   logger.warn('Redis unavailable — continuing without cache [development only]');
    // }

    try {
      await cache.connect();
    } catch (redisError) {
      logger.warn(' Redis unavailable — continuing without cache');
    }

    const server = app.listen(env.PORT, () => {
      logger.info(`Airbnb API running on port ${env.PORT} [${env.NODE_ENV}]`);
    });

    wsManager.initialize(server);
    logger.info('WebSocket server ready');
    startBookingHoldExpiryJob();

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
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
