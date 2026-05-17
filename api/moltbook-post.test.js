import test from 'node:test';
import assert from 'node:assert';
import { sanitizeUrl } from './moltbook-post.js';

test('sanitizeUrl tests', async (t) => {
  await t.test('returns empty string for null or undefined', () => {
    assert.strictEqual(sanitizeUrl(null), '');
    assert.strictEqual(sanitizeUrl(undefined), '');
  });

  await t.test('returns empty string for empty or whitespace-only inputs', () => {
    assert.strictEqual(sanitizeUrl(''), '');
    assert.strictEqual(sanitizeUrl('   '), '');
    assert.strictEqual(sanitizeUrl('\n\t'), '');
  });

  await t.test('trims whitespace from valid URLs', () => {
    assert.strictEqual(sanitizeUrl('  https://example.com  '), 'https://example.com/');
    assert.strictEqual(sanitizeUrl('\nhttp://test.org\t'), 'http://test.org/');
  });

  await t.test('returns valid HTTP and HTTPS URLs', () => {
    assert.strictEqual(sanitizeUrl('https://example.com'), 'https://example.com/');
    assert.strictEqual(sanitizeUrl('http://example.com/path?query=1#hash'), 'http://example.com/path?query=1#hash');
  });

  await t.test('rejects non-HTTP protocols', () => {
    assert.strictEqual(sanitizeUrl('javascript:alert(1)'), '');
    assert.strictEqual(sanitizeUrl('data:text/html,<h1>Hello</h1>'), '');
    assert.strictEqual(sanitizeUrl('ftp://example.com'), '');
    assert.strictEqual(sanitizeUrl('file:///etc/passwd'), '');
    assert.strictEqual(sanitizeUrl('ws://example.com/socket'), '');
  });

  await t.test('rejects invalid URL formats', () => {
    assert.strictEqual(sanitizeUrl('not a url'), '');
    assert.strictEqual(sanitizeUrl('http://'), ''); // Node's URL constructor throws on this
    assert.strictEqual(sanitizeUrl('://missing.protocol'), '');
  });
});
