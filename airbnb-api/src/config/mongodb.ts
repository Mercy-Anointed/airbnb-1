import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from './logger';
import { ChatMessage, Conversation } from '../modules/chat/chat.model';

// ─── Connect ──────────────────────────────────────────────────────────────────
// Separate from your PostgreSQL connection — MongoDB runs alongside it
// Both databases are active at the same time
// PostgreSQL handles users/bookings/properties
// MongoDB handles chat messages
export const connectMongoDB = async (): Promise<void> => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    await Promise.all([
      Conversation.syncIndexes(),
      ChatMessage.syncIndexes(),
    ]);
    logger.info('MongoDB connected');
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    // Don't crash the server if MongoDB fails
    // Chat is important but not critical like bookings
    // In production you'd want alerting here
  }
};

// ─── Disconnect ───────────────────────────────────────────────────────────────
export const disconnectMongoDB = async (): Promise<void> => {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
};
