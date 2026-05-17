import test from 'node:test';
import assert from 'node:assert/strict';
import { getExposedFunction } from '../test-helper.js';

const parseBase64DataUrl = getExposedFunction('api/publish-project.js', 'parseBase64DataUrl');

test('parseBase64DataUrl', async (t) => {
  await t.test('returns null for non-string input', () => {
    assert.equal(parseBase64DataUrl(null), null);
    assert.equal(parseBase64DataUrl(123), null);
    assert.equal(parseBase64DataUrl({}), null);
  });

  await t.test('returns null if does not start with data:', () => {
    assert.equal(parseBase64DataUrl('http://example.com/image.png'), null);
    assert.equal(parseBase64DataUrl('data/image/png;base64,...'), null);
  });

  await t.test('returns null if missing comma', () => {
    assert.equal(parseBase64DataUrl('data:image/png;base64'), null);
  });

  await t.test('returns null if missing meta part', () => {
    assert.equal(parseBase64DataUrl('data:,data-part'), null);
  });

  await t.test('returns null for non-image mime types', () => {
    assert.equal(parseBase64DataUrl('data:text/plain;base64,aGVsbG8='), null);
    assert.equal(parseBase64DataUrl('data:application/json;base64,e30='), null);
  });

  await t.test('returns null if not base64', () => {
    assert.equal(parseBase64DataUrl('data:image/png,not-base64-data'), null);
    assert.equal(parseBase64DataUrl('data:image/png;charset=utf-8,not-base64-data'), null);
  });

  await t.test('parses valid image base64 data url correctly', () => {
    const validSrc = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const result = parseBase64DataUrl(validSrc);
    assert.ok(result);
    assert.equal(result.mime, 'image/png');
    assert.ok(Buffer.isBuffer(result.buffer));
    assert.equal(result.buffer.toString('base64'), 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
  });

  await t.test('handles whitespace in base64 data safely', () => {
    const srcWithSpaces = 'data:image/png;base64,iVBORw0KGgoAAA\r\nANSUhEUgAAAAEAAAAB\nCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const result = parseBase64DataUrl(srcWithSpaces);
    assert.ok(result);
    assert.equal(result.mime, 'image/png');
    assert.ok(Buffer.isBuffer(result.buffer));
    // Spaces should be stripped during Buffer creation or internally.
    assert.equal(result.buffer.toString('base64'), 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
  });

  await t.test('handles metadata with extra parameters', () => {
      const srcWithExtraMeta = 'data:image/jpeg;charset=utf-8;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBD...';
      const result = parseBase64DataUrl(srcWithExtraMeta);
      assert.ok(result);
      assert.equal(result.mime, 'image/jpeg');
      assert.ok(Buffer.isBuffer(result.buffer));
  });
});
