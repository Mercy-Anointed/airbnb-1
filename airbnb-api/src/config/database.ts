import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { env } from './env';
import { logger } from './logger';

neonConfig.webSocketConstructor = ws;

const createPrismaClient = () => {
  const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL });

  return new PrismaClient({
    adapter,
    log: env.IS_PRODUCTION
      ? [{ emit: 'event', level: 'error' }]
      : [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ],
    errorFormat: env.IS_PRODUCTION ? 'minimal' : 'pretty',
    transactionOptions: {
      maxWait: 10000,
      timeout: 20000,
    },
  });
};

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? createPrismaClient();

if (!env.IS_PRODUCTION) {
  global.__prisma = prisma;
}

if (!env.IS_PRODUCTION) {
  (prisma as any).$on('query', (e: any) => {
    if (e.duration > 200) {
      logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
    }
  });
}

// ─── Neon Connection Resilience ───────────────────────────────────────────────
// Neon is a serverless Postgres — its WebSocket connections go idle
// after a period of inactivity and drop silently.
// This is a development-only issue — in production on a persistent
// server with connection pooling (PgBouncer etc.) this doesn't happen.
// We catch the error and log a warning instead of crashing the process.
(prisma as any).$on('error', (e: any) => {
  if (e.message?.includes('Connection') || e.message?.includes('socket')) {
    logger.warn('Neon connection dropped — will reconnect on next request');
  } else {
    logger.error('Prisma error:', e);
  }
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
