import { defineEventHandler } from 'h3';
import { mapResearchRow, withResearchUser } from '../../utils/research-db.mjs';

export default defineEventHandler(async (event) => {
  const result = await withResearchUser(event, (client) =>
    client.query(
      'SELECT id, code, title, event_type, source, url, thesis, risk, follow_up_date, created_at, updated_at FROM research_entries ORDER BY created_at DESC',
    ),
  );
  return result.rows.map(mapResearchRow);
});
