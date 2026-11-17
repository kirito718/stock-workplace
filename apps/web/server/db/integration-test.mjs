import assert from 'node:assert/strict';
import { createDbPool, withUserTransaction } from './runtime.mjs';

const pool = createDbPool();
const admin = await pool.connect();
try {
  await admin.query("DO $$ BEGIN CREATE ROLE touyantai_app NOLOGIN NOSUPERUSER NOBYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$");
  await admin.query('GRANT USAGE ON SCHEMA public TO touyantai_app');
  await admin.query('GRANT SELECT, INSERT, UPDATE, DELETE ON research_entries, action_state TO touyantai_app');
  await admin.query('BEGIN');
  await admin.query("SELECT set_config('app.user_id', $1, true)", ['user-a']);
  await admin.query("INSERT INTO research_entries (user_id, id, title, event_type, source, url) VALUES ('user-a', 'entry-a', 'A', 'notice', 'test', 'https://example.test/a')");
  await admin.query('COMMIT');
} finally {
  admin.release();
}

const visibleToA = await withUserTransaction(pool, 'user-a', async (client) =>
  (await client.query('SELECT id FROM research_entries ORDER BY id')).rows,
);
const visibleToB = await withUserTransaction(pool, 'user-b', async (client) =>
  (await client.query('SELECT id FROM research_entries ORDER BY id')).rows,
);
assert.deepEqual(visibleToA.map((row) => row.id), ['entry-a']);
assert.deepEqual(visibleToB, []);

await assert.rejects(
  withUserTransaction(pool, '', async () => []),
  /verified user id is required/,
);
await pool.end();
console.log('research-log isolation: PASS');
