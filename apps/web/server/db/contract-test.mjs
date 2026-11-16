import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const up = await readFile(new URL('./migrations/001_research_log.sql', import.meta.url), 'utf8');
const down = await readFile(new URL('./migrations/001_research_log.down.sql', import.meta.url), 'utf8');

assert.match(up, /PRIMARY KEY \(user_id, id\)/);
assert.match(up, /PRIMARY KEY \(user_id, action_id\)/);
assert.match(up, /ENABLE ROW LEVEL SECURITY/);
assert.match(up, /current_setting\('app\.user_id', true\)/);
assert.match(up, /WITH CHECK \(user_id = current_setting/);
assert.match(down, /DROP TABLE IF EXISTS action_state/);
assert.match(down, /DROP TABLE IF EXISTS research_entries/);
assert.doesNotMatch(up, /INSERT INTO/);
console.log('research-log contract: PASS');
