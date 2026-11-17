import { defineEventHandler, readBody, createError } from 'h3';
import { mapResearchRow, withResearchUser } from '../../utils/research-db.mjs';

const fields = ['id', 'code', 'title', 'eventType', 'source', 'url', 'thesis', 'risk', 'followUpDate'];
const invalid = (message = 'INVALID_REQUEST') => createError({ statusCode: 400, statusMessage: message, data: { code: message } });

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (!body || typeof body !== 'object' || typeof body.id !== 'string' || typeof body.title !== 'string' || typeof body.eventType !== 'string' || typeof body.source !== 'string' || typeof body.url !== 'string') {
    throw invalid();
  }
  const unknown = Object.keys(body).filter((key) => !fields.includes(key));
  if (unknown.length) throw invalid();
  const row = await withResearchUser(event, async (client, userId) => {
    const inserted = await client.query(
      'INSERT INTO research_entries (user_id, id, code, title, event_type, source, url, thesis, risk, follow_up_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (user_id, id) DO NOTHING RETURNING id, code, title, event_type, source, url, thesis, risk, follow_up_date, created_at, updated_at',
      [userId, body.id, body.code ?? null, body.title, body.eventType, body.source, body.url, body.thesis ?? '', body.risk ?? '', body.followUpDate ?? null],
    );
    if (inserted.rows[0]) return inserted.rows[0];
    return (await client.query('SELECT id, code, title, event_type, source, url, thesis, risk, follow_up_date, created_at, updated_at FROM research_entries WHERE user_id = $1 AND id = $2', [userId, body.id])).rows[0];
  });
  return mapResearchRow(row);
});
