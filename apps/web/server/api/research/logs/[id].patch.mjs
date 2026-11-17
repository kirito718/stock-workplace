import { defineEventHandler, readBody, getRouterParam, createError } from 'h3';
import { mapResearchRow, withResearchUser } from '../../../utils/research-db.mjs';

const allowed = ['thesis', 'risk', 'followUpDate'];
const invalid = () => createError({ statusCode: 400, statusMessage: 'INVALID_REQUEST', data: { code: 'INVALID_REQUEST' } });

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (!body || typeof body !== 'object' || Object.keys(body).some((key) => !allowed.includes(key))) throw invalid();
  const id = getRouterParam(event, 'id');
  const row = await withResearchUser(event, (client, userId) =>
    client.query(
      'UPDATE research_entries SET thesis = COALESCE($3, thesis), risk = COALESCE($4, risk), follow_up_date = $5, updated_at = NOW() WHERE user_id = $1 AND id = $2 RETURNING id, code, title, event_type, source, url, thesis, risk, follow_up_date, created_at, updated_at',
      [userId, id, body.thesis ?? null, body.risk ?? null, body.followUpDate ?? null],
    ).then((result) => result.rows[0]),
  );
  if (!row) throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND', data: { code: 'NOT_FOUND' } });
  return mapResearchRow(row);
});
