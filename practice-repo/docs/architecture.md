# Architecture

Habit Loop is a TypeScript/Express API with a SQLite database. This document
describes the intended production architecture. Some parts are not implemented
yet; the code is the source of truth.

## Runtime

- `src/index.ts` starts the HTTP server and handles shutdown.
- `src/app.ts` wires middleware and mounts the routers.
- `src/routes/*` handle HTTP concerns and request validation.
- `src/services/*` contain business logic.
- `src/db/client.ts` owns the SQLite connection and applies `schema.sql`.

## Request path

A typical request to `POST /api/habits/:id/complete`:

1. Express parses the JSON body in `src/app.ts`.
2. `src/routes/habits.ts` calls `requireUser`.
3. The route delegates to `completeHabit` in `src/services/habits.ts`.
4. `completeHabit` writes a completion and asks the streak service for the new streak.
5. `src/services/streak.ts` reads the completion history and calculates the streak.

## Caching

Streak calculations are cached in Redis for 60 seconds. The cache key is
`streak:<userId>:<habitId>:<date>`. Redis keeps the hot path fast and lets
multiple API instances share the cache after a deploy.

## Authentication

Requests are authenticated with JWTs. The client sends
`Authorization: Bearer <token>`. `src/middleware/auth.ts` verifies the token
with `SESSION_SECRET` and places the `sub` claim on `req.userId`. Tokens expire
after 15 minutes.

## Background jobs

A worker process recalculates streaks every night at 02:00 UTC and warms the
Redis cache. The worker is deployed separately from the API.

## Rate limiting

The API uses a token bucket per user, with a default of 100 requests per minute.
The limiter runs in front of the Express app at the edge.

## Observability

Structured request logs are emitted for every route. Errors are captured by the
edge platform. There is no in-process metrics endpoint yet.
