import assert from 'node:assert/strict';
import { getResearchPool, withResearchUser } from '../utils/research-db.mjs';

const postHandler = (await import('../api/research/logs.post.mjs')).default;
const listHandler = (await import('../api/research/logs.get.mjs')).default;
const patchHandler = (await import('../api/research/logs/[id].patch.mjs')).default;
const deleteHandler = (await import('../api/research/logs/[id].delete.mjs')).default;
const completeHandler = (await import('../api/research/actions/[id]/complete.post.mjs')).default;

const pool = getResearchPool();
const entryId = `route-positive-${Date.now()}`;
const actionId = `route-action-${Date.now()}`;
const event = (userId, body, id = entryId) => ({
  _body: body,
  context: { auth: { userId }, params: { id } },
});

try {
  const createdA = await postHandler(event('user-a', {
    id: entryId,
    title: 'User A entry',
    eventType: 'notice',
    source: 'integration',
    url: 'https://example.test/a',
    thesis: 'A thesis',
    risk: 'A risk',
  }));
  const createdB = await postHandler(event('user-b', {
    id: entryId,
    title: 'User B entry',
    eventType: 'notice',
    source: 'integration',
    url: 'https://example.test/b',
    thesis: 'B thesis',
    risk: 'B risk',
  }));
  assert.equal(createdA.title, 'User A entry');
  assert.equal(createdB.title, 'User B entry');

  const rowsA = await listHandler({ context: { auth: { userId: 'user-a' } } });
  const rowsB = await listHandler({ context: { auth: { userId: 'user-b' } } });
  assert.deepEqual(rowsA.filter((row) => row.id === entryId).map((row) => row.title), ['User A entry']);
  assert.deepEqual(rowsB.filter((row) => row.id === entryId).map((row) => row.title), ['User B entry']);

  const patchedB = await patchHandler(event('user-b', { thesis: 'B thesis updated' }));
  assert.equal(patchedB.thesis, 'B thesis updated');
  await assert.rejects(
    patchHandler(event('user-c', { thesis: 'should not reach user B' })),
    (error) => error.statusCode === 404,
  );

  const completedA = await completeHandler(event('user-a', {}, actionId));
  const completedB = await completeHandler(event('user-b', {}, actionId));
  assert.equal(completedA.id, actionId);
  assert.equal(completedB.id, actionId);
  assert.ok(completedA.completedAt);
  assert.ok(completedB.completedAt);

  await deleteHandler(event('user-b', {}));
  await deleteHandler(event('user-a', {}));
  const remainingA = await listHandler({ context: { auth: { userId: 'user-a' } } });
  const remainingB = await listHandler({ context: { auth: { userId: 'user-b' } } });
  assert.equal(remainingA.some((row) => row.id === entryId), false);
  assert.equal(remainingB.some((row) => row.id === entryId), false);
} finally {
  await withResearchUser(pool, 'user-a', (client) =>
    client.query('DELETE FROM action_state WHERE user_id = $1 AND action_id = $2', ['user-a', actionId]),
  );
  await withResearchUser(pool, 'user-b', (client) =>
    client.query('DELETE FROM action_state WHERE user_id = $1 AND action_id = $2', ['user-b', actionId]),
  );
  await pool.end();
}

console.log('research-route positive isolation: PASS');
