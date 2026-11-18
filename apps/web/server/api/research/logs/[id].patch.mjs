import { defineEventHandler, readBody, getRouterParam, createError } from 'h3';
import { mapResearchRow, requireResearchUser, withResearchUser } from '../../../utils/research-db.mjs';

const allowed = ['thesis', 'risk', 'followUpDate'];
const invalid = () => createError({ statusCode: 400, statusMessage: 'INVALID_REQUEST', data: { code: 'INVALID_REQUEST' } });
const validText = (value) => value === null || typeof value === 'string';
const validDate = (value) => validText(value) && (value === null || /^\d{4}-\d{2}-\d{2}$/.test(value));

export default defineEventHandler(async (event) => {
  requireResearchUser(event);
  const body = event._body ?? await readBody(event);
  if (!body || typeof body !== 'object' || Object.keys(body).some((key) => !allowed.includes(key)) || !Object.keys(body).length) throw invalid();
  if (Object.prototype.hasOwnProperty.call(body, 'thesis') && !validText(body.thesis)) throw invalid();
  if (Object.prototype.hasOwnProperty.call(body, 'risk') && !validText(body.risk)) throw invalid();
  if (Object.prototype.hasOwnProperty.call(body, 'followUpDate') && !validDate(body.followUpDate)) throw invalid();
  const id = getRouterParam(event, 'id');
  const row = await withResearchUser(event, async (client, userId) => {
    const updates = [];
    const values = [userId, id];
    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        values.push(body[field]);
        updates.push(`${field === 'followUpDate' ? 'follow_up_date' : field} = $${values.length}`);
      }
    }
    updates.push('updated_at = NOW()');
    const result = await client.query(
      `UPDATE research_entries SET ${updates.join(', ')} WHERE user_id = $1 AND id = $2 RETURNING id, code, title, event_type, source, url, thesis, risk, follow_up_date, created_at, updated_at`,
      values,
    );
    return result.rows[0];
  });
  if (!row) throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND', data: { code: 'NOT_FOUND' } });
  return mapResearchRow(row);
});
