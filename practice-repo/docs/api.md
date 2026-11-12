# API notes

Base URL: `http://localhost:3000`

All `/api/habits` endpoints require `Authorization: Bearer <jwt>`. The token is
issued by `/api/auth/dev-login` and expires after 15 minutes.

## Auth

### `POST /api/auth/dev-login`

```json
{ "email": "sam@example.com" }
```

Returns a JWT for the user.

## Habits

### `GET /api/habits`

Returns all habits for the authenticated user.

### `POST /api/habits`

```json
{ "name": "Read 20 pages", "cadence": "daily" }
```

### `GET /api/habits/:id`

Returns one habit and its completion dates.

### `POST /api/habits/:id/complete`

Marks the habit complete for today and returns the updated streak.

```json
{
  "habit": { "id": "...", "name": "Read 20 pages" },
  "date": "2026-11-12",
  "streak": 4
}
```
