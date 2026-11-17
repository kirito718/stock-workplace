import { createDbPool, requireVerifiedUserId, withUserTransaction } from '../db/runtime.mjs';

let pool;
export function getResearchPool() {
  pool ||= createDbPool();
  return pool;
}

export function requireResearchUser(event) {
  return requireVerifiedUserId(event);
}

export function mapResearchRow(row) {
  return {
    id: row.id,
    code: row.code ?? null,
    title: row.title,
    eventType: row.event_type,
    source: row.source,
    url: row.url,
    thesis: row.thesis,
    risk: row.risk,
    followUpDate: row.follow_up_date ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function withResearchUser(event, work) {
  const userId = requireResearchUser(event);
  return withUserTransaction(getResearchPool(), userId, (client) => work(client, userId));
}
