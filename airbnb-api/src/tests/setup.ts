import dotenv from 'dotenv';

// Load .env before any tests run
// Without this, process.env.JWT_REFRESH_SECRET is undefined
// and token signing uses the wrong secret
dotenv.config();

// Tell Jest: when any file imports from '../config/database',
// give them our fake prisma instead of the real one
// The getter syntax ensures prismaMock is resolved lazily
// (after imports are ready) rather than immediately
jest.mock('../config/database', () => {
  const { prismaMock } = require('./mocks/prisma.mock');
  return {
    get prisma() {
      return prismaMock;
    },
  };
});

// Mock email service globally — prevents real HTTP calls to Resend
// Every test file gets this mock automatically
jest.mock('../config/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}));