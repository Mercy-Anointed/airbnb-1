import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'), // ← add here
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  REDIS_TLS: z.string().optional(),
  CACHE_TTL_SHORT: z.string().default('300'),
  CACHE_TTL_MEDIUM: z.string().default('600'),
  CACHE_TTL_LONG: z.string().default('86400'),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  APP_URL: z.string().default('http://localhost:5000'),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  GOOGLE_CALLBACK_URL: z.string().min(1, 'GOOGLE_CALLBACK_URL is required'),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().optional(),
  FLUTTERWAVE_SECRET_KEY: z.string().optional(),
  FLUTTERWAVE_WEBHOOK_SECRET: z.string().optional(),
  BOOKING_HOLD_MINUTES: z.string().default('15'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Missing or invalid environment variables:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = {
  ...parsed.data,
  PORT: Number(parsed.data.PORT),
  IS_PRODUCTION: parsed.data.NODE_ENV === 'production',
  IS_TEST: parsed.data.NODE_ENV === 'test',
  MONGODB_URI: parsed.data.MONGODB_URI, // ← add here
  CACHE_TTL: {
    SHORT: Number(parsed.data.CACHE_TTL_SHORT),
    MEDIUM: Number(parsed.data.CACHE_TTL_MEDIUM),
    LONG: Number(parsed.data.CACHE_TTL_LONG),
  },
  JWT_ACCESS_SECRET: parsed.data.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: parsed.data.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: parsed.data.JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: parsed.data.JWT_REFRESH_EXPIRES_IN,
  RESEND_API_KEY: parsed.data.RESEND_API_KEY,
  APP_URL: parsed.data.APP_URL,
  CLIENT_URL: parsed.data.CLIENT_URL,
  GOOGLE_CLIENT_ID: parsed.data.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: parsed.data.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: parsed.data.GOOGLE_CALLBACK_URL,
  PAYSTACK_SECRET_KEY: parsed.data.PAYSTACK_SECRET_KEY,
  PAYSTACK_WEBHOOK_SECRET: parsed.data.PAYSTACK_WEBHOOK_SECRET,
  FLUTTERWAVE_SECRET_KEY: parsed.data.FLUTTERWAVE_SECRET_KEY,
  FLUTTERWAVE_WEBHOOK_SECRET: parsed.data.FLUTTERWAVE_WEBHOOK_SECRET,
  BOOKING_HOLD_MINUTES: Number(parsed.data.BOOKING_HOLD_MINUTES),
};

export type Env = typeof env;
