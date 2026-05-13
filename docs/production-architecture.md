# Production Architecture

This app should run as separate deployable services:

- `airbnb-client`: Next.js frontend served from Vercel or a Node runtime.
- `airbnb-api`: Express API running on container instances behind a load balancer.
- PostgreSQL: primary system of record for users, listings, bookings, payments, and reviews.
- MongoDB: chat conversations and messages, with messages stored in their own indexed collection.
- Redis: cache, rate-limit state, and future queue/pub-sub coordination.
- Cloudinary: property image storage and transformations.

## Critical Runtime Rules

- Run the API with more than one replica only after WebSocket fan-out is backed by Redis pub/sub or a managed realtime service.
- Use managed Postgres pooling such as Neon pooling or PgBouncer. Do not connect every API replica directly without pooling.
- Keep payment verification server-side. Browser callbacks are only user experience; Paystack and Flutterwave webhooks are the authority.
- Keep pending booking holds short. `BOOKING_HOLD_MINUTES` defaults to 15 and the expiry job cancels stale unpaid holds.
- Configure MongoDB indexes on startup with `Conversation.syncIndexes()` and `ChatMessage.syncIndexes()`.

## Required Environment Variables

- `DATABASE_URL`
- `MONGODB_URI`
- `REDIS_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `RESEND_API_KEY`
- `CLIENT_URL`
- `APP_URL`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_WEBHOOK_SECRET`
- `FLUTTERWAVE_SECRET_KEY`
- `FLUTTERWAVE_WEBHOOK_SECRET`
- `BOOKING_HOLD_MINUTES`

## Webhook URLs

- Paystack: `/api/v1/bookings/webhooks/paystack`
- Flutterwave: `/api/v1/bookings/webhooks/flutterwave`

## Operational Checks

- Health: `/health`
- Metrics: `/metrics`
- API build: `npm run build`
- Chat migration: `npm run chat:migrate`
- Simple load smoke test: `npm run load:test -- http://localhost:5000/health 500 50`

## Next Scaling Step

When API replicas scale horizontally, replace the in-memory WebSocket registry with Redis-backed fan-out:

- each API instance keeps local sockets only;
- messages publish to Redis by recipient user ID;
- every API instance subscribes and delivers to local sockets for that user.

That keeps chat fast without forcing sticky sessions.
