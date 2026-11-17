import { defineEventHandler, getRouterParam } from 'h3';
import { withResearchUser } from '../../../../utils/research-db.mjs';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const row = await withResearchUser(event, (client, userId) =>
    client.query(
      'INSERT INTO action_state (user_id, action_id, completed_at) VALUES ($1, $2, NOW()) ON CONFLICT (user_id, action_id) DO UPDATE SET completed_at = EXCLUDED.completed_at RETURNING action_id, completed_at',
      [userId, id],
    ).then((result) => result.rows[0]),
  );
  return { id: row.action_id, completedAt: row.completed_at };
});
