import { defineEventHandler, getRouterParam, createError } from 'h3';
import { withResearchUser } from '../../../utils/research-db.mjs';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const result = await withResearchUser(event, (client, userId) =>
    client.query('DELETE FROM research_entries WHERE user_id = $1 AND id = $2', [userId, id]),
  );
  if (!result.rowCount) throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND', data: { code: 'NOT_FOUND' } });
  return { id, deleted: true };
});
