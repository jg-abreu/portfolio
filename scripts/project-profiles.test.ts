import assert from 'node:assert/strict';
import test from 'node:test';
import { parseProfiles } from '../src/lib/project-profiles.ts';

test('parses one profile per line and ignores blank lines', () => {
  assert.deepEqual(parseProfiles(' LeetCode | https://leetcode.com/u/jg-abreu/ \n\nCodeforces|https://codeforces.com/profile/jg-abreu'), [
    { label: 'LeetCode', url: 'https://leetcode.com/u/jg-abreu/' },
    { label: 'Codeforces', url: 'https://codeforces.com/profile/jg-abreu' },
  ]);
  assert.deepEqual(parseProfiles(''), []);
});

test('rejects unsafe, malformed or too many profiles', () => {
  for (const invalid of ['Site | http://insecure.example', 'no separator here', '| https://example.com',
    'Site | javascript:alert(1)', `${'x'.repeat(41)} | https://example.com`,
    Array.from({ length: 7 }, (_, i) => `P${i} | https://example.com/${i}`).join('\n')])
    assert.equal(parseProfiles(invalid), null);
});
