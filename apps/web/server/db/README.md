# Research log persistence boundary

This directory contains the first PostgreSQL migration for canonical research logs and action state. It is intentionally migration-only: no fake in-memory database and no claim that production persistence is connected yet.

## Apply / rollback

Run the up migration in a PostgreSQL transaction, after authenticating the application connection. Before each query, set the verified identity for the transaction:

```sql
BEGIN;
SELECT set_config('app.user_id', '<verified-auth-sub>', true);
-- execute migrations/001_research_log.sql
COMMIT;
```

Rollback is `migrations/001_research_log.down.sql`. Never interpolate `user_id` into SQL; use a parameterized `set_config` call from the auth middleware.

## Boundary guarantees

- Primary keys are scoped by `(user_id, id)` and `(user_id, action_id)`.
- Row-level security denies cross-user reads/writes when `app.user_id` is unset or different.
- The migration does not create an anonymous fallback or demo rows.
- Nitro CRUD routes must set `app.user_id` from verified auth claims before using these tables.
