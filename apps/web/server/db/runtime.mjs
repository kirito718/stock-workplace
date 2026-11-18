import pg from 'pg';

const { Pool } = pg;

export function createDbPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('DATABASE_URL is required');
  return new Pool({ connectionString, max: 10 });
}

export function requireVerifiedUserId(event) {
  const userId = event?.context?.auth?.userId ?? event?.context?.auth?.sub;
  if (typeof userId !== 'string' || userId.trim() === '') {
    const error = new Error('Verified authentication is required');
    error.statusCode = 401;
    throw error;
  }
  return userId;
}

export async function withUserTransaction(pool, userId, work) {
  if (typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('A verified user id is required');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const appRole = process.env.DB_APP_ROLE;
    if (appRole) {
      if (!/^[a-z_][a-z0-9_]*$/i.test(appRole)) throw new Error('Invalid DB_APP_ROLE');
      await client.query(`SET LOCAL ROLE "${appRole}"`);
    }
    await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
