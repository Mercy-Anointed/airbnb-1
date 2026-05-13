import rateLimiter, { rateLimit } from 'express-rate-limit'
import { Request, Response } from 'express';

// ─── Response format ──────────────────────────────────────────────────────────
// Matches our ApiResponse format so frontend handles it consistently
const rateLimitHandler = (req: Request, res: Response) => {
    res.status(429).json({
        success: false,
        message: "Too many requests - please try again later",
        retryAfter: res.getHeader('Retry-After')
    })
}

// ─── Global Rate Limiter ──────────────────────────────────────────────────────
// Applied to ALL routes — general protection
// 100 requests per 15 minutes per IP
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,  // Return rate limit info in headers
    legacyHeaders: false,  // Disable X-RateLimit headers
    message: 'Too many request for this IP',
    skip:(req) => {
          // Skip rate limiting for health checks
          return req.path === '/health';
    }

});
// ─── Auth Rate Limiter ────────────────────────────────────────────────────────
// Strict limits on login — prevents brute force
// 5 attempts per 15 minutes per IP
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, //15 minutes
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
      // Skip successful requests — only count failures
  // This way legitimate users don't get locked out
  skipSuccessfulRequests: true,
});

// ─── Register Rate Limiter ────────────────────────────────────────────────────
// 10 registrations per hour per IP
// Prevents mass fake account creation
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hr
    max: 10,
    standardHeaders: true, 
    legacyHeaders: false,
    handler: rateLimitHandler,

});
// ─── API Rate Limiter ─────────────────────────────────────────────────────────
// Applied to general API endpoints
// 100 requests per 15 minutes
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler
})

// ─── Booking Rate Limiter ─────────────────────────────────────────────────────
// 10 booking attempts per hour
// Prevents booking spam
export const bookingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler
})
