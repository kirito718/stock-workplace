import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { requireVerifiedUserId } from './runtime.mjs';

assert.throws(
  () => requireVerifiedUserId({ context: {} }),
  (error) => error.statusCode === 401 && /authentication is required/.test(error.message),
);
assert.equal(
  requireVerifiedUserId({ context: { auth: { userId: 'user-a' } } }),
  'user-a',
);
assert.equal(
  requireVerifiedUserId({ context: { auth: { sub: 'user-b' } } }),
  'user-b',
);

const routes = [
  '../api/research/logs.get.mjs',
  '../api/research/logs.post.mjs',
  '../api/research/logs/[id].patch.mjs',
  '../api/research/logs/[id].delete.mjs',
  '../api/research/actions/[id]/complete.post.mjs',
];
for (const route of routes) {
  const source = await readFile(new URL(route, import.meta.url), 'utf8');
  assert.match(source, /withResearchUser\(event/);
  assert.doesNotMatch(source, /body\.user_?id|body\.userId/);
}

const eventWithJson = (body) => {
  const payload = JSON.stringify(body);
  const req = Readable.from([payload]);
  req.headers = {
    'content-type': 'application/json',
    'content-length': String(Buffer.byteLength(payload)),
  };
  return {
    context: { auth: { userId: 'verified-user' }, params: { id: 'entry-a' } },
    node: { req },
  };
};

const listHandler = (await import('../api/research/logs.get.mjs')).default;
await assert.rejects(
  listHandler({ context: {} }),
  (error) => error.statusCode === 401,
);

const postHandler = (await import('../api/research/logs.post.mjs')).default;
await assert.rejects(
  postHandler({ context: {} }),
  (error) => error.statusCode === 401,
);
await assert.rejects(
  postHandler(eventWithJson({
    id: 'entry-a',
    title: 'A',
    eventType: 'notice',
    source: 'test',
    url: 'https://example.test/a',
    user_id: 'attacker',
  })),
  (error) => error.statusCode === 400,
);

const patchHandler = (await import('../api/research/logs/[id].patch.mjs')).default;
await assert.rejects(
  patchHandler({ context: {} }),
  (error) => error.statusCode === 401,
);
await assert.rejects(
  patchHandler(eventWithJson({ thesis: 'updated', userId: 'attacker' })),
  (error) => error.statusCode === 400,
);

const deleteHandler = (await import('../api/research/logs/[id].delete.mjs')).default;
await assert.rejects(
  deleteHandler({ context: { params: { id: 'entry-a' } } }),
  (error) => error.statusCode === 401,
);

const completeHandler = (await import('../api/research/actions/[id]/complete.post.mjs')).default;
await assert.rejects(
  completeHandler({ context: { params: { id: 'action-a' } } }),
  (error) => error.statusCode === 401,
);

console.log('research-route auth contract: PASS');
