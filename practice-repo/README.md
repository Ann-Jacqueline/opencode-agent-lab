# Habit Loop

A small habit-tracking API used as the practice target for **Agent Lab's Onboarding Scout capstone**.

Habit Loop is deliberately imperfect. It is a realistic snapshot of a service that grew quickly: the core request path is sound, but the documentation has drifted and the development auth shortcut is still in place.

## Stack

- Node.js 20+ and TypeScript
- Express
- SQLite via `better-sqlite3`
- Zod for request validation
- `tsx` for local development and tests

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

The API listens on `http://localhost:3000` by default.

## Development auth

The API currently reads a user id from the `x-user-id` header. This is a development
placeholder, not production authentication. The `/api/auth/dev-login` endpoint returns
a fake token so you can try the flow, but the routes do not verify it.

```bash
curl -X POST http://localhost:3000/api/auth/dev-login \
  -H 'content-type: application/json' \
  -d '{"email":"sam@example.com"}'

curl http://localhost:3000/api/habits \
  -H 'x-user-id: <userId>'
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the API with `tsx watch` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled API |
| `npm test` | Run the Node test suite through `tsx` |
| `npm run typecheck` | Type-check without emitting |

## Layout

```text
src/
├── index.ts          entry point and shutdown handling
├── app.ts            Express app and middleware
├── config.ts         environment configuration
├── routes/           HTTP handlers and validation
├── services/         business logic
├── db/               SQLite client and schema
├── middleware/       request authentication
└── lib/              date helpers
tests/                Node test files
docs/                 architecture and API notes
```

## Known rough edges

- Streak caching is an in-memory `Map` with a 60-second TTL. It is not shared between processes.
- Date keys use the server's local timezone.
- The development auth path trusts a header without verifying a session.
- The docs in `docs/` describe the intended production architecture, not everything that is implemented yet.

These are intentional for the onboarding exercise. The agent should distinguish
what the code does from what the docs claim.
