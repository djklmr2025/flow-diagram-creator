import test from 'node:test';
import assert from 'node:assert/strict';
import { extForMime } from '../publish-project.js';

test('extForMime mappings', async (t) => {
  await t.test('maps valid image mimes correctly', () => {
    assert.equal(extForMime('image/png'), 'png');
    assert.equal(extForMime('image/jpeg'), 'jpg');
    assert.equal(extForMime('image/jpg'), 'jpg');
    assert.equal(extForMime('image/webp'), 'webp');
    assert.equal(extForMime('image/gif'), 'gif');
  });

  await t.test('handles uppercase mimes', () => {
    assert.equal(extForMime('IMAGE/PNG'), 'png');
    assert.equal(extForMime('Image/Jpeg'), 'jpg');
  });

  await t.test('handles whitespace around mime', () => {
    assert.equal(extForMime(' image/png '), 'png');
  });

  await t.test('returns empty string for invalid mimes', () => {
    assert.equal(extForMime('application/json'), '');
    assert.equal(extForMime('image/bmp'), '');
    assert.equal(extForMime('text/plain'), '');
    assert.equal(extForMime('random-string'), '');
  });

  await t.test('handles null, undefined, and empty string', () => {
    assert.equal(extForMime(null), '');
    assert.equal(extForMime(undefined), '');
    assert.equal(extForMime(''), '');
  });
});
