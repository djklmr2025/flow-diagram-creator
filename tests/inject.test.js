import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSession } from '../api/inject.js';

test('sanitizeSession', async (t) => {
  await t.test('returns valid session strings unchanged', () => {
    assert.equal(sanitizeSession('valid-session_123'), 'valid-session_123');
    assert.equal(sanitizeSession('valid/session'), 'valid/session');
  });

  await t.test('trims whitespace', () => {
    assert.equal(sanitizeSession('  spaced-session  '), 'spaced-session');
  });

  await t.test('strips leading and trailing slashes', () => {
    assert.equal(sanitizeSession('/session/'), 'session');
    assert.equal(sanitizeSession('///session///'), 'session');
  });

  await t.test('replaces backslashes with forward slashes', () => {
    assert.equal(sanitizeSession('\\session\\path\\'), 'session/path');
    assert.equal(sanitizeSession('\\\\session\\\\path\\\\'), 'session/path');
  });

  await t.test('handles empty, null, and undefined inputs', () => {
    assert.equal(sanitizeSession(''), '');
    assert.equal(sanitizeSession(null), '');
    assert.equal(sanitizeSession(undefined), '');
  });

  await t.test('rejects strings with invalid characters', () => {
    assert.equal(sanitizeSession('invalid!session'), '');
    assert.equal(sanitizeSession('invalid@session'), '');
    assert.equal(sanitizeSession('invalid#session'), '');
    assert.equal(sanitizeSession('invalid session'), '');
  });

  await t.test('rejects strings containing ".." for directory traversal protection', () => {
    assert.equal(sanitizeSession('valid/../session'), '');
    assert.equal(sanitizeSession('..'), '');
  });

  await t.test('rejects strings exceeding the length limit (120 chars)', () => {
    const longSession = 'a'.repeat(121);
    assert.equal(sanitizeSession(longSession), '');

    const validLongSession = 'a'.repeat(120);
    assert.equal(sanitizeSession(validLongSession), validLongSession);
  });
});
