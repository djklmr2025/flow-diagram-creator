import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeId } from './project.js';

test('sanitizeId - general cases', async (t) => {
  await t.test('returns empty string for falsy input', () => {
    assert.equal(sanitizeId(), '');
    assert.equal(sanitizeId(null), '');
    assert.equal(sanitizeId(undefined), '');
    assert.equal(sanitizeId(''), '');
  });

  await t.test('trims whitespace', () => {
    assert.equal(sanitizeId('  foo  '), 'foo');
    assert.equal(sanitizeId('\tbar\n'), 'bar');
  });

  await t.test('removes leading slashes', () => {
    assert.equal(sanitizeId('/foo'), 'foo');
    assert.equal(sanitizeId('///bar'), 'bar');
  });

  await t.test('replaces backslashes with forward slashes', () => {
    assert.equal(sanitizeId('foo\\bar'), 'foo/bar');
    assert.equal(sanitizeId('a\\\\b\\c'), 'a/b/c');
  });

  await t.test('removes trailing .json extension (case-insensitive)', () => {
    assert.equal(sanitizeId('foo.json'), 'foo');
    assert.equal(sanitizeId('bar.JSON'), 'bar');
    assert.equal(sanitizeId('baz.JsOn'), 'baz');
    assert.equal(sanitizeId('qux.json.json'), ''); // Because .json removal leaves qux.json which has a dot and gets rejected by /^[a-zA-Z0-9/_-]+$/
  });

  await t.test('returns empty string for invalid characters', () => {
    assert.equal(sanitizeId('foo!bar'), '');
    assert.equal(sanitizeId('foo@bar'), '');
    assert.equal(sanitizeId('foo bar'), '');
    assert.equal(sanitizeId('foo<bar'), '');
  });

  await t.test('returns empty string for path traversal (..)', () => {
    assert.equal(sanitizeId('foo/../bar'), '');
    assert.equal(sanitizeId('..'), '');
    assert.equal(sanitizeId('../foo'), '');
  });

  await t.test('accepts valid characters (alphanumeric, slash, underscore, hyphen)', () => {
    assert.equal(sanitizeId('foo/bar-baz_qux123'), 'foo/bar-baz_qux123');
  });
});
